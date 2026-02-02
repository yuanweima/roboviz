/**
 * Solver Provider Types
 *
 * Unified async interface for robot kinematics solvers.
 * Supports local WASM, remote backend, and custom implementations.
 *
 * All methods are async to support remote solvers. Local WASM adapters
 * wrap synchronous calls in Promise.resolve().
 */

import type { Pose } from '../types';
import type {
  FkResult,
  FkChainResult,
  IkResult,
  MultiIkResult,
  WorkspaceAnalysis,
} from './types';

// ============================================================================
// Solver Capabilities
// ============================================================================

/**
 * Describes what capabilities a solver provider supports.
 * Consumers check these to decide whether to show multi-IK UI, etc.
 */
export interface SolverCapabilities {
  /** Whether forward kinematics is available */
  hasFK: boolean;
  /** Whether inverse kinematics is available */
  hasIK: boolean;
  /** Whether multi-solution IK is available (analytical IK) */
  hasMultiIK: boolean;
  /** Whether TCP-based IK is available (requires tool attachment) */
  hasTcpIK: boolean;
  /** Whether workspace analysis (manipulability, singularity) is available */
  hasWorkspaceAnalysis: boolean;
  /** Whether analytical IK is used (vs numerical) */
  isAnalytical: boolean;
  /** Whether the solver runs locally (sync) or remotely (async with latency) */
  isLocal: boolean;
}

// ============================================================================
// Solver Provider Interface
// ============================================================================

/**
 * Unified async solver interface — the contract for all solver sources.
 *
 * Implementations:
 * - WasmSolverAdapter: wraps local trajx-wasm UrdfRobotSolver
 * - RemoteSolverAdapter: sends JSON-RPC calls to backend
 * - Custom: user-provided implementation
 *
 * @example Local WASM
 * ```typescript
 * const adapter = new WasmSolverAdapter(urdfSolver);
 * const fk = await adapter.forwardKinematics(joints);
 * ```
 *
 * @example Remote backend
 * ```typescript
 * const adapter = new RemoteSolverAdapter({ robotId, dispatcher });
 * await adapter.initialize();
 * const ik = await adapter.inverseKinematics(targetPose);
 * ```
 */
export interface ISolverProvider {
  /** Provider type identifier */
  readonly type: 'wasm' | 'remote' | 'custom';

  /** Robot identifier */
  readonly robotId: string;

  /** Degrees of freedom */
  readonly dof: number;

  /** Robot name from configuration or URDF */
  readonly name: string;

  /** Joint names (from URDF, if available) */
  readonly jointNames: string[];

  /** Link names (from URDF, if available) */
  readonly linkNames: string[];

  /** Joint limits (null if not available) */
  readonly jointLimits: { lower: number[]; upper: number[] } | null;

  /** Capabilities of this provider */
  readonly capabilities: SolverCapabilities;

  // --- Core kinematics methods (all async) ---

  /**
   * Compute forward kinematics
   * @param jointAngles - Joint angles in radians
   */
  forwardKinematics(jointAngles: number[]): Promise<FkResult>;

  /**
   * Compute forward kinematics to TCP (with tool offset)
   * @param jointAngles - Joint angles in radians
   */
  forwardKinematicsTcp(jointAngles: number[]): Promise<FkResult>;

  /**
   * Compute FK for all links in the chain
   * @param jointAngles - Joint angles in radians
   */
  forwardKinematicsChain(jointAngles: number[]): Promise<FkChainResult>;

  /**
   * Compute inverse kinematics (single best solution)
   * @param targetPose - Target end-effector pose
   * @param seed - Optional seed joint configuration
   */
  inverseKinematics(targetPose: Pose, seed?: number[]): Promise<IkResult>;

  /**
   * Compute inverse kinematics for TCP position
   * @param targetPose - Target TCP pose
   * @param seed - Optional seed joint configuration
   */
  inverseKinematicsTcp(targetPose: Pose, seed?: number[]): Promise<IkResult>;

  /**
   * Compute all IK solutions (up to 8 for 6-DOF robots with analytical IK)
   * @param targetPose - Target end-effector pose
   * @param seed - Optional seed joint configuration
   */
  inverseKinematicsAll(targetPose: Pose, seed?: number[]): Promise<MultiIkResult>;

  /**
   * Check if joint configuration is valid (within limits)
   * @param joints - Joint angles in radians
   */
  isValidConfig(joints: number[]): Promise<boolean>;

  /**
   * Analyze workspace at given configuration
   * @param jointAngles - Joint angles in radians
   */
  analyzeWorkspace(jointAngles: number[]): Promise<WorkspaceAnalysis>;

  // --- Tool management ---

  /**
   * Attach a tool with the given offset
   */
  attachTool(toolPose: Pose): Promise<void>;

  /**
   * Detach the current tool
   */
  detachTool(): Promise<void>;

  /**
   * Check if tool is attached (synchronous for UI convenience)
   */
  hasTool(): boolean;

  /**
   * Dispose/cleanup resources
   */
  dispose(): void;
}

// ============================================================================
// Solver Context Value
// ============================================================================

/**
 * State exposed by the SolverContext to consumer hooks and components
 */
export interface SolverContextValue {
  /** The solver provider (null if not available) */
  solver: ISolverProvider | null;

  /** Whether the solver is ready to use */
  ready: boolean;

  /** Whether the solver is currently initializing */
  loading: boolean;

  /** Initialization error */
  error: Error | null;

  /** Register a solver provider */
  registerSolver(solver: ISolverProvider): void;

  /** Unregister the current solver */
  unregisterSolver(): void;
}
