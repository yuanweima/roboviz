/**
 * Trajx FK Worker - TypeScript Type Definitions
 *
 * Pre-bundled Web Worker for high-performance batch forward kinematics.
 * Optimized for RL visualization with GPU instancing (500+ robot instances).
 */

// ============================================================================
// DH Parameter Types
// ============================================================================

/**
 * Denavit-Hartenberg parameter for a single joint
 */
export interface DhParam {
    /** Link length (meters) */
    a: number;
    /** Link twist (radians) */
    alpha: number;
    /** Link offset (meters) */
    d: number;
    /** Joint angle offset (radians) */
    theta: number;
}

// ============================================================================
// Message Protocol Types
// ============================================================================

/**
 * Initialize the FK Worker
 */
export interface InitMessage {
    type: 'init';
    /** Robot name to lookup from built-in DH database */
    robotName?: string;
    /** Direct DH parameters (alternative to robotName) */
    dhParams?: DhParam[];
    /** Number of robot instances to compute */
    robotCount: number;
    /** Optional SharedArrayBuffer for zero-copy communication */
    sharedBuffer?: SharedArrayBuffer;
    /** Custom WASM URL (optional, for bundler compatibility) */
    wasmUrl?: string;
}

/**
 * Request batch FK computation with provided joint angles
 */
export interface ComputeFKMessage {
    type: 'compute-fk';
    /** Joint angles: Float32Array[robotCount * jointCount] */
    jointAngles: Float32Array;
}

/**
 * Request batch FK computation using SharedArrayBuffer
 */
export interface ComputeFKSharedMessage {
    type: 'compute-fk-shared';
}

/**
 * Update worker configuration
 */
export interface UpdateConfigMessage {
    type: 'update-config';
    /** New robot count (optional) */
    robotCount?: number;
    /** New DH parameters (optional) */
    dhParams?: DhParam[];
    /** New robot name to lookup (optional) */
    robotName?: string;
}

/**
 * Terminate the worker
 */
export interface TerminateMessage {
    type: 'terminate';
}

/**
 * All possible messages from main thread to worker
 */
export type FKWorkerMessage =
    | InitMessage
    | ComputeFKMessage
    | ComputeFKSharedMessage
    | UpdateConfigMessage
    | TerminateMessage;

// ============================================================================
// Response Types
// ============================================================================

/**
 * Worker script loaded (before WASM init)
 */
export interface LoadedResponse {
    type: 'loaded';
}

/**
 * Worker initialized and ready
 */
export interface ReadyResponse {
    type: 'ready';
    /** Number of joints per robot */
    jointCount: number;
    /** Number of links per robot (jointCount + 1) */
    linkCount: number;
    /** Configured robot count */
    robotCount: number;
    /** Available robot names in DH database */
    supportedRobots: string[];
}

/**
 * FK computation result (non-shared mode)
 */
export interface FKResultResponse {
    type: 'fk-result';
    /**
     * Transform matrices: Float32Array[robotCount * linkCount * 16]
     *
     * Each 4x4 matrix is in column-major order (Three.js compatible).
     * Layout: [robot0_link0_mat4, robot0_link1_mat4, ..., robot1_link0_mat4, ...]
     */
    transforms: Float32Array;
    /** Computation time in milliseconds */
    computeTimeMs: number;
}

/**
 * FK computation result (shared buffer mode)
 */
export interface FKResultSharedResponse {
    type: 'fk-result-shared';
    /** Computation time in milliseconds */
    computeTimeMs: number;
}

/**
 * Configuration updated
 */
export interface ConfigUpdatedResponse {
    type: 'config-updated';
    jointCount: number;
    linkCount: number;
    robotCount: number;
}

/**
 * Error occurred
 */
export interface ErrorResponse {
    type: 'error';
    message: string;
    stack?: string;
}

/**
 * All possible responses from worker to main thread
 */
export type FKWorkerResponse =
    | LoadedResponse
    | ReadyResponse
    | FKResultResponse
    | FKResultSharedResponse
    | ConfigUpdatedResponse
    | ErrorResponse;

// ============================================================================
// SharedArrayBuffer Layout
// ============================================================================

/**
 * SharedArrayBuffer memory layout for zero-copy FK computation
 *
 * Offsets (in bytes):
 * - [0-15]: Control flags (4 × Int32)
 *     - [0]: Ready flag (set by main when new data available)
 *     - [1]: Done flag (set by worker when computation complete)
 *     - [2-3]: Reserved
 * - [16...]: Joint angles (robotCount × jointCount × Float32)
 * - [...]: Transforms (robotCount × linkCount × 16 × Float32)
 */
export interface SharedBufferLayout {
    /** Total buffer size in bytes */
    byteLength: number;
    /** Offset to control flags */
    controlOffset: 0;
    /** Offset to joint angles data */
    jointAnglesOffset: 16;
    /** Offset to transform output data */
    transformsOffset: number;
}

/**
 * Calculate required SharedArrayBuffer size
 */
export function calculateSharedBufferSize(
    robotCount: number,
    jointCount: number
): number;

/**
 * Create a properly sized SharedArrayBuffer for FK computation
 */
export function createSharedBuffer(
    robotCount: number,
    jointCount: number
): SharedArrayBuffer;

// ============================================================================
// Worker Factory
// ============================================================================

/**
 * Configuration for creating an FK Worker
 */
export interface FKWorkerConfig {
    /** Robot name from built-in database (e.g., 'ur5', 'kuka_iiwa7') */
    robotName?: string;
    /** Direct DH parameters */
    dhParams?: DhParam[];
    /** Number of robot instances */
    robotCount: number;
    /** Enable SharedArrayBuffer for zero-copy (requires cross-origin isolation) */
    useSharedBuffer?: boolean;
    /** Custom WASM URL for bundler compatibility */
    wasmUrl?: string;
}

/**
 * High-level FK Worker wrapper with Promise-based API
 */
export interface FKWorkerInstance {
    /** Underlying Web Worker */
    readonly worker: Worker;
    /** Number of joints per robot */
    readonly jointCount: number;
    /** Number of links per robot */
    readonly linkCount: number;
    /** Configured robot count */
    readonly robotCount: number;
    /** Whether SharedArrayBuffer is enabled */
    readonly useSharedBuffer: boolean;
    /** SharedArrayBuffer (if enabled) */
    readonly sharedBuffer: SharedArrayBuffer | null;

    /**
     * Compute batch FK (Promise-based)
     * @param jointAngles Float32Array[robotCount * jointCount]
     * @returns Transform matrices and timing
     */
    computeFK(jointAngles: Float32Array): Promise<{
        transforms: Float32Array;
        computeTimeMs: number;
    }>;

    /**
     * Compute batch FK using SharedArrayBuffer
     * Write joint angles to sharedBuffer before calling.
     */
    computeFKShared(): Promise<{
        computeTimeMs: number;
    }>;

    /**
     * Update worker configuration
     */
    updateConfig(config: Partial<FKWorkerConfig>): Promise<void>;

    /**
     * Terminate the worker
     */
    terminate(): void;

    /**
     * Get SharedArrayBuffer views for direct manipulation
     * Only available when useSharedBuffer is true.
     */
    getBufferViews(): {
        controlFlags: Int32Array;
        jointAngles: Float32Array;
        transforms: Float32Array;
    } | null;
}

/**
 * Create a new FK Worker instance
 *
 * @example
 * ```typescript
 * // Using built-in robot database
 * const fkWorker = await createFKWorker({
 *     robotName: 'ur5',
 *     robotCount: 500
 * });
 *
 * // Compute FK
 * const { transforms, computeTimeMs } = await fkWorker.computeFK(jointAngles);
 *
 * // Update InstancedMesh
 * for (let i = 0; i < 500; i++) {
 *     for (let link = 0; link < fkWorker.linkCount; link++) {
 *         const offset = (i * fkWorker.linkCount + link) * 16;
 *         matrix.fromArray(transforms, offset);
 *         instancedMesh.setMatrixAt(i * fkWorker.linkCount + link, matrix);
 *     }
 * }
 * instancedMesh.instanceMatrix.needsUpdate = true;
 * ```
 */
export function createFKWorker(config: FKWorkerConfig): Promise<FKWorkerInstance>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * List all supported robot names from the built-in DH database
 */
export function listSupportedRobots(): Promise<string[]>;

/**
 * Check if SharedArrayBuffer is available (requires cross-origin isolation)
 */
export function isSharedArrayBufferAvailable(): boolean;
