/**
 * Trajx FK Worker - Pre-bundled Web Worker for Batch Forward Kinematics
 *
 * This worker handles batch FK computation off the main thread,
 * optimized for RL visualization with GPU instancing.
 *
 * Message Protocol:
 *
 * Main → Worker:
 *   { type: 'init', robotName?: string, dhParams?: DhParam[], robotCount: number, useSharedBuffer?: boolean }
 *   { type: 'compute-fk', jointAngles: Float32Array }
 *   { type: 'compute-fk-shared' }  // Read from SharedArrayBuffer
 *   { type: 'update-config', robotCount?: number, dhParams?: DhParam[] }
 *   { type: 'terminate' }
 *
 * Worker → Main:
 *   { type: 'ready', jointCount: number, linkCount: number }
 *   { type: 'fk-result', transforms: Float32Array, computeTimeMs: number }
 *   { type: 'error', message: string }
 */

// Worker state
let wasm = null;
let dhParamsData = null;  // Store raw DH parameter values (not wasm objects)
let robotCount = 0;
let jointCount = 0;
let linkCount = 0;
let isInitialized = false;

// SharedArrayBuffer state
let sharedBuffer = null;
let sharedJointAngles = null;  // Float32Array view for input
let sharedTransforms = null;   // Float32Array view for output
let controlFlags = null;       // Int32Array view for synchronization

// DH Database cache
let dhDatabase = null;

/**
 * Initialize WASM module
 */
async function initWasm(wasmUrl) {
    try {
        // Dynamic import of the WASM module
        const wasmModule = await import(wasmUrl || '../trajx_wasm.js');
        await wasmModule.default();
        wasm = wasmModule;
        dhDatabase = wasm.WasmDhDatabase.withDefaults();
        return true;
    } catch (error) {
        throw new Error(`Failed to initialize WASM: ${error.message}`);
    }
}

/**
 * Create DH parameters from robot name or provided params
 * Stores raw values to avoid wasm-bindgen object consumption issues
 */
function setupDhParams(robotName, providedParams) {
    if (providedParams && providedParams.length > 0) {
        // Use provided DH parameters - store raw values
        dhParamsData = providedParams.map(p => ({
            a: p.a,
            alpha: p.alpha,
            d: p.d,
            theta: p.theta
        }));
        jointCount = dhParamsData.length;
    } else if (robotName) {
        // Lookup from database
        const config = dhDatabase.lookup(robotName);
        if (!config) {
            throw new Error(`Robot '${robotName}' not found in DH database. Available: ${dhDatabase.listRobots().join(', ')}`);
        }
        const wasmParams = config.getDhParams();
        // Extract raw values before wasm objects are consumed
        // Use the actual DH params length as jointCount
        // (some robots have extra rows for flange offset)
        dhParamsData = wasmParams.map(p => ({
            a: p.a,
            alpha: p.alpha,
            d: p.d,
            theta: p.theta
        }));
        jointCount = dhParamsData.length;
    } else {
        throw new Error('Either robotName or dhParams must be provided');
    }

    linkCount = jointCount + 1; // base + each joint
}

/**
 * Setup SharedArrayBuffer for zero-copy communication
 */
function setupSharedBuffer(buffer, count) {
    sharedBuffer = buffer;

    // Layout:
    // [0-3]: Control flags (Int32)
    //   [0]: Ready flag (1 = main thread wrote new data)
    //   [1]: Done flag (1 = worker finished computing)
    //   [2]: Reserved
    //   [3]: Reserved
    // [4...]: Joint angles (Float32) - count * jointCount
    // [...]: Transforms (Float32) - count * linkCount * 16

    const controlSize = 4 * 4; // 4 Int32s
    const jointAnglesSize = count * jointCount * 4; // Float32
    const transformsSize = count * linkCount * 16 * 4; // Float32

    const expectedSize = controlSize + jointAnglesSize + transformsSize;
    if (buffer.byteLength < expectedSize) {
        throw new Error(`SharedArrayBuffer too small. Need ${expectedSize} bytes, got ${buffer.byteLength}`);
    }

    controlFlags = new Int32Array(buffer, 0, 4);
    sharedJointAngles = new Float32Array(buffer, controlSize, count * jointCount);
    sharedTransforms = new Float32Array(buffer, controlSize + jointAnglesSize, count * linkCount * 16);
}

/**
 * Compute batch FK
 */
function computeBatchFK(jointAngles) {
    const startTime = performance.now();

    // Create fresh DH params for each call (wasm-bindgen consumes them)
    const params = dhParamsData.map(p =>
        new wasm.DhParam(p.a, p.alpha, p.d, p.theta)
    );

    const transforms = wasm.batchForwardKinematicsF32(
        params,
        jointAngles,
        robotCount,
        jointCount
    );

    const computeTimeMs = performance.now() - startTime;

    return { transforms, computeTimeMs };
}

/**
 * Handle incoming messages
 */
self.onmessage = async function(e) {
    const { type, ...data } = e.data;

    try {
        switch (type) {
            case 'init': {
                // Initialize WASM if not already done
                if (!wasm) {
                    await initWasm(data.wasmUrl);
                }

                // Setup DH parameters
                setupDhParams(data.robotName, data.dhParams);
                robotCount = data.robotCount || 1;

                // Setup SharedArrayBuffer if provided
                if (data.sharedBuffer) {
                    setupSharedBuffer(data.sharedBuffer, robotCount);
                }

                isInitialized = true;

                self.postMessage({
                    type: 'ready',
                    jointCount,
                    linkCount,
                    robotCount,
                    supportedRobots: dhDatabase.listRobots()
                });
                break;
            }

            case 'compute-fk': {
                if (!isInitialized) {
                    throw new Error('Worker not initialized. Send init message first.');
                }

                const { transforms, computeTimeMs } = computeBatchFK(data.jointAngles);

                // Transfer the ArrayBuffer for zero-copy
                self.postMessage({
                    type: 'fk-result',
                    transforms,
                    computeTimeMs
                }, [transforms.buffer]);
                break;
            }

            case 'compute-fk-shared': {
                if (!isInitialized || !sharedBuffer) {
                    throw new Error('SharedArrayBuffer not configured');
                }

                // Wait for ready flag
                Atomics.wait(controlFlags, 0, 0);

                // Compute FK using shared input buffer
                const { transforms, computeTimeMs } = computeBatchFK(sharedJointAngles);

                // Copy results to shared output buffer
                sharedTransforms.set(transforms);

                // Reset ready flag and set done flag
                Atomics.store(controlFlags, 0, 0);
                Atomics.store(controlFlags, 1, 1);
                Atomics.notify(controlFlags, 1);

                // Also send message with timing info
                self.postMessage({
                    type: 'fk-result-shared',
                    computeTimeMs
                });
                break;
            }

            case 'update-config': {
                if (data.robotCount !== undefined) {
                    robotCount = data.robotCount;
                }
                if (data.dhParams) {
                    // Store raw values, not wasm objects
                    dhParamsData = data.dhParams.map(p => ({
                        a: p.a,
                        alpha: p.alpha,
                        d: p.d,
                        theta: p.theta
                    }));
                    jointCount = dhParamsData.length;
                    linkCount = jointCount + 1;
                }
                if (data.robotName) {
                    setupDhParams(data.robotName, null);
                }

                self.postMessage({
                    type: 'config-updated',
                    jointCount,
                    linkCount,
                    robotCount
                });
                break;
            }

            case 'terminate': {
                self.close();
                break;
            }

            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message,
            stack: error.stack
        });
    }
};

// Signal that worker script is loaded
self.postMessage({ type: 'loaded' });
