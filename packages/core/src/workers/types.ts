/**
 * Worker Types for GPU Instancing + RL
 *
 * Defines shared types between main thread and worker.
 */

// ============================================================================
// Message Types
// ============================================================================

export type FKWorkerMessageType =
  | 'init'
  | 'update-joints'
  | 'compute-fk'
  | 'fk-result'
  | 'error'
  | 'ready';

// ============================================================================
// Shared Buffer Layout
// ============================================================================

/**
 * SharedArrayBuffer layout for zero-copy communication.
 *
 * Layout:
 * - Control flags: 4 bytes (Uint32)
 *   - [0]: Ready flag (0 = processing, 1 = ready for read, 2 = ready for write)
 *   - [1]: Robot count
 *   - [2]: Joint count
 *   - [3]: Reserved
 *
 * - Joint angles: robotCount * jointCount * 4 bytes (Float32)
 * - Rewards: robotCount * 4 bytes (Float32)
 * - Transforms: robotCount * linkCount * 16 * 4 bytes (Float32) - Mat4 per link
 */
export interface SharedBufferLayout {
  /** Total buffer size in bytes */
  totalSize: number;
  /** Offset to control flags */
  controlOffset: number;
  /** Offset to joint angles data */
  jointAnglesOffset: number;
  /** Offset to rewards data */
  rewardsOffset: number;
  /** Offset to transform matrices */
  transformsOffset: number;
  /** Number of robots */
  robotCount: number;
  /** Number of joints per robot */
  jointCount: number;
  /** Number of links per robot */
  linkCount: number;
}

export function calculateBufferLayout(
  robotCount: number,
  jointCount: number,
  linkCount: number
): SharedBufferLayout {
  const controlSize = 4 * 4; // 4 Uint32
  const jointAnglesSize = robotCount * jointCount * 4; // Float32
  const rewardsSize = robotCount * 4; // Float32
  const transformsSize = robotCount * linkCount * 16 * 4; // Mat4 per link

  return {
    totalSize: controlSize + jointAnglesSize + rewardsSize + transformsSize,
    controlOffset: 0,
    jointAnglesOffset: controlSize,
    rewardsOffset: controlSize + jointAnglesSize,
    transformsOffset: controlSize + jointAnglesSize + rewardsSize,
    robotCount,
    jointCount,
    linkCount,
  };
}

// ============================================================================
// Control Flags
// ============================================================================

export const CONTROL_FLAG = {
  PROCESSING: 0,
  READY_FOR_READ: 1,
  READY_FOR_WRITE: 2,
} as const;

// ============================================================================
// Messages from Main Thread to Worker
// ============================================================================

export interface InitMessage {
  type: 'init';
  /** URDF content or path */
  urdfData: string;
  /** Robot count */
  robotCount: number;
  /** SharedArrayBuffer for zero-copy (optional) */
  sharedBuffer?: SharedArrayBuffer;
  /** Buffer layout info */
  layout?: SharedBufferLayout;
}

export interface UpdateJointsMessage {
  type: 'update-joints';
  /** Joint angles: Float32Array[robotCount * jointCount] */
  jointAngles: Float32Array;
  /** Use SharedArrayBuffer mode */
  useSharedBuffer?: boolean;
}

export interface ComputeFKMessage {
  type: 'compute-fk';
  /** Robot indices to compute (optional, all if not specified) */
  robotIndices?: number[];
}

export type MainToWorkerMessage = InitMessage | UpdateJointsMessage | ComputeFKMessage;

// ============================================================================
// Messages from Worker to Main Thread
// ============================================================================

export interface ReadyMessage {
  type: 'ready';
  /** Joint count detected from URDF */
  jointCount: number;
  /** Link count detected from URDF */
  linkCount: number;
  /** Joint names in order */
  jointNames: string[];
}

export interface FKResultMessage {
  type: 'fk-result';
  /**
   * Transform matrices: Float32Array[robotCount * linkCount * 16]
   * Each 16 floats = one Mat4 in column-major order
   */
  transforms: Float32Array;
  /** Computation time in ms */
  computeTimeMs: number;
}

export interface ErrorMessage {
  type: 'error';
  error: string;
}

export type WorkerToMainMessage = ReadyMessage | FKResultMessage | ErrorMessage;

// ============================================================================
// Shared Buffer Views
// ============================================================================

export interface SharedBufferViews {
  control: Uint32Array;
  jointAngles: Float32Array;
  rewards: Float32Array;
  transforms: Float32Array;
}

export function createBufferViews(
  buffer: SharedArrayBuffer,
  layout: SharedBufferLayout
): SharedBufferViews {
  return {
    control: new Uint32Array(buffer, layout.controlOffset, 4),
    jointAngles: new Float32Array(
      buffer,
      layout.jointAnglesOffset,
      layout.robotCount * layout.jointCount
    ),
    rewards: new Float32Array(buffer, layout.rewardsOffset, layout.robotCount),
    transforms: new Float32Array(
      buffer,
      layout.transformsOffset,
      layout.robotCount * layout.linkCount * 16
    ),
  };
}
