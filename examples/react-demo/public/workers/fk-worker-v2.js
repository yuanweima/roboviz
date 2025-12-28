/**
 * Trajx FK Worker V2 - Optimized for RL Visualization
 *
 * This worker handles the complete FK pipeline:
 * 1. Joint angle computation (simulated RL policy)
 * 2. Batch FK computation (WASM)
 * 3. Matrix combination with positions
 * 4. Output final matrices ready for InstancedMesh
 *
 * Uses SharedArrayBuffer for zero-copy communication.
 *
 * SharedArrayBuffer Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Control (16 bytes = 4 Int32)                                │
 * │   [0]: frame counter (main thread increments)               │
 * │   [1]: worker frame (worker updates after processing)       │
 * │   [2]: reserved                                             │
 * │   [3]: reserved                                             │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Policy States (count * 4 * 4 bytes)                         │
 * │   Per robot: [freq1, freq2, phase1, phase2]                 │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Position Matrices (count * 16 * 4 bytes)                    │
 * │   Pre-computed position + baseRotation per robot            │
 * ├─────────────────────────────────────────────────────────────┤
 * │ Final Matrices (count * meshCount * 16 * 4 bytes)           │
 * │   Output: ready for direct copy to InstancedMesh            │
 * └─────────────────────────────────────────────────────────────┘
 */

// Worker state
let wasm = null;
let dhParamsData = null;
let robotCount = 0;
let jointCount = 0;
let linkCount = 0;
let meshCount = 0;
let isInitialized = false;
let dhDatabase = null;

// SharedArrayBuffer views
let sharedBuffer = null;
let controlFlags = null;      // Int32Array[4]
let policyStates = null;      // Float32Array[count * 4]
let positionMatrices = null;  // Float32Array[count * 16]
let finalMatrices = null;     // Float32Array[count * meshCount * 16]

// Temporary buffers (reused each frame)
let jointAnglesBuffer = null;  // Float32Array[count * jointCount]
let fkTransforms = null;       // Result from WASM

// Performance tracking
let lastComputeTimeMs = 0;

/**
 * Initialize WASM module
 */
async function initWasm(wasmUrl) {
    const wasmModule = await import(wasmUrl || './trajx_wasm.js');
    await wasmModule.default();
    wasm = wasmModule;
    dhDatabase = wasm.WasmDhDatabase.withDefaults();
}

/**
 * Setup DH parameters from robot name
 */
function setupDhParams(robotName, providedParams) {
    if (providedParams && providedParams.length > 0) {
        dhParamsData = providedParams.map(p => ({
            a: p.a, alpha: p.alpha, d: p.d, theta: p.theta
        }));
        jointCount = dhParamsData.length;
    } else if (robotName) {
        const config = dhDatabase.lookup(robotName);
        if (!config) {
            throw new Error(`Robot '${robotName}' not found. Available: ${dhDatabase.listRobots().join(', ')}`);
        }
        const wasmParams = config.getDhParams();
        dhParamsData = wasmParams.map(p => ({
            a: p.a, alpha: p.alpha, d: p.d, theta: p.theta
        }));
        jointCount = dhParamsData.length;
    } else {
        throw new Error('Either robotName or dhParams must be provided');
    }
    linkCount = jointCount + 1;
}

/**
 * Setup SharedArrayBuffer
 */
function setupSharedBuffer(buffer, count, numMeshes) {
    sharedBuffer = buffer;
    robotCount = count;
    meshCount = numMeshes;

    const controlSize = 4 * 4;  // 4 Int32s = 16 bytes
    const policySize = count * 4 * 4;  // count * 4 floats
    const positionSize = count * 16 * 4;  // count * 16 floats (4x4 matrix)
    const finalSize = count * meshCount * 16 * 4;  // count * meshCount * 16 floats

    let offset = 0;
    controlFlags = new Int32Array(buffer, offset, 4);
    offset += controlSize;

    policyStates = new Float32Array(buffer, offset, count * 4);
    offset += policySize;

    positionMatrices = new Float32Array(buffer, offset, count * 16);
    offset += positionSize;

    finalMatrices = new Float32Array(buffer, offset, count * meshCount * 16);

    // Allocate temp buffers
    jointAnglesBuffer = new Float32Array(count * jointCount);
}

/**
 * Compute joint angles from policy states (simulated RL)
 */
function computeJointAngles(time) {
    for (let robotIdx = 0; robotIdx < robotCount; robotIdx++) {
        const policyBase = robotIdx * 4;
        const jointBase = robotIdx * jointCount;

        const freq1 = 0.3 + policyStates[policyBase] * 0.2;
        const freq2 = 0.5 + policyStates[policyBase + 1] * 0.3;
        const phase1 = policyStates[policyBase + 2];
        const phase2 = policyStates[policyBase + 3];

        for (let jointIdx = 0; jointIdx < jointCount; jointIdx++) {
            const jointPhase = jointIdx * 0.5;
            const angle = Math.sin(time * freq1 + phase1 + jointPhase) * 0.4 +
                         Math.sin(time * freq2 + phase2 + jointPhase * 1.3) * 0.3;
            jointAnglesBuffer[jointBase + jointIdx] = angle;
        }
    }
}

/**
 * Compute batch FK using WASM
 */
function computeBatchFK() {
    const params = dhParamsData.map(p =>
        new wasm.DhParam(p.a, p.alpha, p.d, p.theta)
    );

    fkTransforms = wasm.batchForwardKinematicsF32(
        params,
        jointAnglesBuffer,
        robotCount,
        jointCount
    );
}

/**
 * 4x4 Matrix multiplication: result = a * b
 * Matrices are in column-major order (Three.js compatible)
 */
function multiplyMatrices(result, resultOffset, a, aOffset, b, bOffset) {
    const a11 = a[aOffset], a21 = a[aOffset+1], a31 = a[aOffset+2], a41 = a[aOffset+3];
    const a12 = a[aOffset+4], a22 = a[aOffset+5], a32 = a[aOffset+6], a42 = a[aOffset+7];
    const a13 = a[aOffset+8], a23 = a[aOffset+9], a33 = a[aOffset+10], a43 = a[aOffset+11];
    const a14 = a[aOffset+12], a24 = a[aOffset+13], a34 = a[aOffset+14], a44 = a[aOffset+15];

    const b11 = b[bOffset], b21 = b[bOffset+1], b31 = b[bOffset+2], b41 = b[bOffset+3];
    const b12 = b[bOffset+4], b22 = b[bOffset+5], b32 = b[bOffset+6], b42 = b[bOffset+7];
    const b13 = b[bOffset+8], b23 = b[bOffset+9], b33 = b[bOffset+10], b43 = b[bOffset+11];
    const b14 = b[bOffset+12], b24 = b[bOffset+13], b34 = b[bOffset+14], b44 = b[bOffset+15];

    result[resultOffset] = a11*b11 + a12*b21 + a13*b31 + a14*b41;
    result[resultOffset+1] = a21*b11 + a22*b21 + a23*b31 + a24*b41;
    result[resultOffset+2] = a31*b11 + a32*b21 + a33*b31 + a34*b41;
    result[resultOffset+3] = a41*b11 + a42*b21 + a43*b31 + a44*b41;

    result[resultOffset+4] = a11*b12 + a12*b22 + a13*b32 + a14*b42;
    result[resultOffset+5] = a21*b12 + a22*b22 + a23*b32 + a24*b42;
    result[resultOffset+6] = a31*b12 + a32*b22 + a33*b32 + a34*b42;
    result[resultOffset+7] = a41*b12 + a42*b22 + a43*b32 + a44*b42;

    result[resultOffset+8] = a11*b13 + a12*b23 + a13*b33 + a14*b43;
    result[resultOffset+9] = a21*b13 + a22*b23 + a23*b33 + a24*b43;
    result[resultOffset+10] = a31*b13 + a32*b23 + a33*b33 + a34*b43;
    result[resultOffset+11] = a41*b13 + a42*b23 + a43*b33 + a44*b43;

    result[resultOffset+12] = a11*b14 + a12*b24 + a13*b34 + a14*b44;
    result[resultOffset+13] = a21*b14 + a22*b24 + a23*b34 + a24*b44;
    result[resultOffset+14] = a31*b14 + a32*b24 + a33*b34 + a34*b44;
    result[resultOffset+15] = a41*b14 + a42*b24 + a43*b34 + a44*b44;
}

/**
 * Combine position matrices with FK transforms to produce final matrices
 */
function combineFinalMatrices() {
    for (let meshIdx = 0; meshIdx < meshCount; meshIdx++) {
        const linkIdx = Math.min(meshIdx, linkCount - 1);

        for (let robotIdx = 0; robotIdx < robotCount; robotIdx++) {
            const posOffset = robotIdx * 16;
            const fkOffset = (robotIdx * linkCount + linkIdx) * 16;
            const finalOffset = (meshIdx * robotCount + robotIdx) * 16;

            // finalMatrix = positionMatrix * fkTransform
            multiplyMatrices(finalMatrices, finalOffset, positionMatrices, posOffset, fkTransforms, fkOffset);
        }
    }
}

/**
 * Main computation loop - runs continuously
 */
let isRunning = false;
let currentTime = 0;

function runComputeLoop() {
    if (!isRunning || !isInitialized || !sharedBuffer) {
        return;
    }

    const startTime = performance.now();

    // Read current frame from main thread
    const mainFrame = Atomics.load(controlFlags, 0);
    const workerFrame = Atomics.load(controlFlags, 1);

    // Only compute if main thread has advanced
    if (mainFrame > workerFrame) {
        // Get time from control flags (stored as float bits in slot 2)
        const timeBits = Atomics.load(controlFlags, 2);
        currentTime = new Float32Array(new Int32Array([timeBits]).buffer)[0];

        // 1. Compute joint angles from policy
        computeJointAngles(currentTime);

        // 2. Compute FK
        computeBatchFK();

        // 3. Combine with positions to get final matrices
        combineFinalMatrices();

        // Update worker frame counter
        Atomics.store(controlFlags, 1, mainFrame);

        lastComputeTimeMs = performance.now() - startTime;
    }

    // Schedule next iteration
    setTimeout(runComputeLoop, 0);
}

/**
 * Handle messages
 */
self.onmessage = async function(e) {
    const { type, ...data } = e.data;

    try {
        switch (type) {
            case 'init': {
                if (!wasm) {
                    await initWasm(data.wasmUrl);
                }

                setupDhParams(data.robotName, data.dhParams);
                robotCount = data.robotCount || 1;
                meshCount = data.meshCount || linkCount;

                if (data.sharedBuffer) {
                    setupSharedBuffer(data.sharedBuffer, robotCount, meshCount);
                }

                isInitialized = true;

                self.postMessage({
                    type: 'ready',
                    jointCount,
                    linkCount,
                    meshCount,
                    robotCount
                });
                break;
            }

            case 'start': {
                if (!isInitialized) {
                    throw new Error('Worker not initialized');
                }
                isRunning = true;
                runComputeLoop();
                self.postMessage({ type: 'started' });
                break;
            }

            case 'stop': {
                isRunning = false;
                self.postMessage({ type: 'stopped' });
                break;
            }

            case 'get-stats': {
                self.postMessage({
                    type: 'stats',
                    computeTimeMs: lastComputeTimeMs,
                    isRunning
                });
                break;
            }

            case 'terminate': {
                isRunning = false;
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

self.postMessage({ type: 'loaded' });
