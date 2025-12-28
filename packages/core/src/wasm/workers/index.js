/**
 * Trajx FK Worker - Factory and High-Level API
 *
 * Provides easy-to-use factory functions for creating FK Workers
 * with Promise-based APIs and SharedArrayBuffer support.
 */

// Worker script URL (relative to this module)
// @vite-ignore - Worker URL is resolved at runtime
const WORKER_SCRIPT_URL = new URL(/* @vite-ignore */ './fk-worker.js', import.meta.url);

/**
 * Calculate required SharedArrayBuffer size
 * @param {number} robotCount - Number of robot instances
 * @param {number} jointCount - Number of joints per robot
 * @returns {number} Required buffer size in bytes
 */
export function calculateSharedBufferSize(robotCount, jointCount) {
    const linkCount = jointCount + 1;
    const controlSize = 4 * 4; // 4 Int32s
    const jointAnglesSize = robotCount * jointCount * 4; // Float32
    const transformsSize = robotCount * linkCount * 16 * 4; // Float32
    return controlSize + jointAnglesSize + transformsSize;
}

/**
 * Create a properly sized SharedArrayBuffer for FK computation
 * @param {number} robotCount - Number of robot instances
 * @param {number} jointCount - Number of joints per robot
 * @returns {SharedArrayBuffer}
 */
export function createSharedBuffer(robotCount, jointCount) {
    const size = calculateSharedBufferSize(robotCount, jointCount);
    return new SharedArrayBuffer(size);
}

/**
 * Check if SharedArrayBuffer is available
 * @returns {boolean}
 */
export function isSharedArrayBufferAvailable() {
    return typeof SharedArrayBuffer !== 'undefined' &&
           typeof Atomics !== 'undefined' &&
           crossOriginIsolated === true;
}

/**
 * Create a new FK Worker instance
 *
 * @param {Object} config - Worker configuration
 * @param {string} [config.robotName] - Robot name from built-in database
 * @param {Array} [config.dhParams] - Direct DH parameters
 * @param {number} config.robotCount - Number of robot instances
 * @param {boolean} [config.useSharedBuffer=false] - Enable SharedArrayBuffer
 * @param {string} [config.wasmUrl] - Custom WASM URL
 * @returns {Promise<Object>} FKWorkerInstance
 */
export async function createFKWorker(config) {
    const { robotName, dhParams, robotCount, useSharedBuffer = false, wasmUrl } = config;

    if (!robotName && !dhParams) {
        throw new Error('Either robotName or dhParams must be provided');
    }
    if (!robotCount || robotCount < 1) {
        throw new Error('robotCount must be a positive integer');
    }

    // Create the worker
    const worker = new Worker(WORKER_SCRIPT_URL, { type: 'module' });

    // Wait for worker to load
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worker load timeout')), 10000);
        worker.onmessage = (e) => {
            if (e.data.type === 'loaded') {
                clearTimeout(timeout);
                resolve();
            }
        };
        worker.onerror = (e) => {
            clearTimeout(timeout);
            reject(new Error(`Worker error: ${e.message}`));
        };
    });

    // Prepare SharedArrayBuffer if requested
    let sharedBuffer = null;
    if (useSharedBuffer) {
        if (!isSharedArrayBufferAvailable()) {
            console.warn('SharedArrayBuffer not available. Falling back to message passing.');
        } else {
            // We need to know jointCount to create the buffer
            // For now, estimate from dhParams or use a default
            const estimatedJointCount = dhParams ? dhParams.length : 6;
            sharedBuffer = createSharedBuffer(robotCount, estimatedJointCount);
        }
    }

    // Initialize the worker
    const initMessage = {
        type: 'init',
        robotName,
        dhParams,
        robotCount,
        sharedBuffer,
        wasmUrl
    };

    const readyInfo = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worker init timeout')), 30000);
        worker.onmessage = (e) => {
            if (e.data.type === 'ready') {
                clearTimeout(timeout);
                resolve(e.data);
            } else if (e.data.type === 'error') {
                clearTimeout(timeout);
                reject(new Error(e.data.message));
            }
        };
        worker.postMessage(initMessage);
    });

    const { jointCount, linkCount } = readyInfo;

    // If SharedArrayBuffer was created with wrong size, recreate it
    // This can happen when using robotName (estimated jointCount) or when
    // dhParams length differs from actual jointCount
    const estimatedJointCount = dhParams ? dhParams.length : 6;
    if (sharedBuffer && estimatedJointCount !== jointCount) {
        sharedBuffer = createSharedBuffer(robotCount, jointCount);
        // Reinitialize with correct buffer
        await new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.type === 'config-updated') resolve();
                else if (e.data.type === 'error') reject(new Error(e.data.message));
            };
            worker.postMessage({ type: 'update-config', sharedBuffer });
        });
    }

    // Create buffer views if SharedArrayBuffer is enabled
    let bufferViews = null;
    if (sharedBuffer) {
        const controlSize = 16;
        const jointAnglesSize = robotCount * jointCount * 4;
        bufferViews = {
            controlFlags: new Int32Array(sharedBuffer, 0, 4),
            jointAngles: new Float32Array(sharedBuffer, controlSize, robotCount * jointCount),
            transforms: new Float32Array(sharedBuffer, controlSize + jointAnglesSize, robotCount * linkCount * 16)
        };
    }

    // Pending promise resolvers for async operations
    let pendingCompute = null;
    let pendingConfig = null;

    // Setup message handler
    worker.onmessage = (e) => {
        const { type, ...data } = e.data;

        switch (type) {
            case 'fk-result':
            case 'fk-result-shared':
                if (pendingCompute) {
                    pendingCompute.resolve(data);
                    pendingCompute = null;
                }
                break;

            case 'config-updated':
                if (pendingConfig) {
                    pendingConfig.resolve(data);
                    pendingConfig = null;
                }
                break;

            case 'error':
                const error = new Error(data.message);
                if (pendingCompute) {
                    pendingCompute.reject(error);
                    pendingCompute = null;
                }
                if (pendingConfig) {
                    pendingConfig.reject(error);
                    pendingConfig = null;
                }
                break;
        }
    };

    // Create the instance object
    const instance = {
        worker,
        jointCount,
        linkCount,
        robotCount,
        useSharedBuffer: !!sharedBuffer,
        sharedBuffer,

        /**
         * Compute batch FK (Promise-based)
         * @param {Float32Array} jointAngles
         * @returns {Promise<{transforms: Float32Array, computeTimeMs: number}>}
         */
        computeFK(jointAngles) {
            return new Promise((resolve, reject) => {
                if (pendingCompute) {
                    reject(new Error('Previous computation still pending'));
                    return;
                }

                pendingCompute = { resolve, reject };
                worker.postMessage(
                    { type: 'compute-fk', jointAngles },
                    [jointAngles.buffer]
                );
            });
        },

        /**
         * Compute batch FK using SharedArrayBuffer
         * @returns {Promise<{computeTimeMs: number}>}
         */
        computeFKShared() {
            return new Promise((resolve, reject) => {
                if (!sharedBuffer) {
                    reject(new Error('SharedArrayBuffer not enabled'));
                    return;
                }
                if (pendingCompute) {
                    reject(new Error('Previous computation still pending'));
                    return;
                }

                // Set ready flag to signal worker
                Atomics.store(bufferViews.controlFlags, 0, 1);
                Atomics.notify(bufferViews.controlFlags, 0);

                pendingCompute = { resolve, reject };
                worker.postMessage({ type: 'compute-fk-shared' });
            });
        },

        /**
         * Update worker configuration
         * @param {Object} newConfig
         * @returns {Promise<void>}
         */
        updateConfig(newConfig) {
            return new Promise((resolve, reject) => {
                if (pendingConfig) {
                    reject(new Error('Previous config update still pending'));
                    return;
                }

                pendingConfig = { resolve, reject };
                worker.postMessage({ type: 'update-config', ...newConfig });
            });
        },

        /**
         * Terminate the worker
         */
        terminate() {
            worker.postMessage({ type: 'terminate' });
            worker.terminate();
        },

        /**
         * Get SharedArrayBuffer views for direct manipulation
         * @returns {Object|null}
         */
        getBufferViews() {
            return bufferViews;
        }
    };

    return instance;
}

/**
 * List all supported robot names from the built-in DH database
 * @returns {Promise<string[]>}
 */
export async function listSupportedRobots() {
    // Create a temporary worker just to query the database
    const worker = new Worker(WORKER_SCRIPT_URL, { type: 'module' });

    return new Promise((resolve, reject) => {
        let loaded = false;

        worker.onmessage = async (e) => {
            if (e.data.type === 'loaded' && !loaded) {
                loaded = true;
                // Initialize with minimal config to get robot list
                worker.postMessage({
                    type: 'init',
                    dhParams: [{ a: 0, alpha: 0, d: 0.1, theta: 0 }],
                    robotCount: 1
                });
            } else if (e.data.type === 'ready') {
                resolve(e.data.supportedRobots);
                worker.terminate();
            } else if (e.data.type === 'error') {
                reject(new Error(e.data.message));
                worker.terminate();
            }
        };

        worker.onerror = (e) => {
            reject(new Error(`Worker error: ${e.message}`));
            worker.terminate();
        };

        setTimeout(() => {
            reject(new Error('Timeout querying supported robots'));
            worker.terminate();
        }, 10000);
    });
}

// Default export
export default { createFKWorker, listSupportedRobots, isSharedArrayBufferAvailable, calculateSharedBufferSize, createSharedBuffer };
