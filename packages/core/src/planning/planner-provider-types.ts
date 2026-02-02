/**
 * Planner Provider Types
 *
 * Unified async interface for motion planning providers.
 * Supports local WASM, remote backend, and custom implementations.
 *
 * All methods are async to support remote planners. Local WASM adapters
 * wrap synchronous calls in Promise.resolve().
 */

import type {
  PlanningRequest,
  PlanningResult,
  PipelineStage,
  PipelineProgressCallback,
  CollisionChecker,
} from './types';
import type {
  LinearMotionRequest,
  LinearMotionResult,
  PathPlanningRequest,
  PathPlanningResult,
} from '../kinematics/types';

// ============================================================================
// Planner Capabilities
// ============================================================================

/**
 * Describes what capabilities a planner provider supports.
 */
export interface PlannerCapabilities {
  /** Whether full pipeline planning (BiRRT, RRT*, PRM) is available */
  hasPathPlanning: boolean;
  /** Whether Cartesian linear motion planning is available */
  hasLinearMotion: boolean;
  /** Whether cable-aware planning is available */
  hasCablePlanning: boolean;
  /** Whether collision checking is available */
  hasCollisionChecking: boolean;
  /** Whether the planner runs locally (sync) or remotely (async with latency) */
  isLocal: boolean;
}

// ============================================================================
// Planner Provider Interface
// ============================================================================

/**
 * Unified async planner interface — the contract for all planning sources.
 *
 * Implementations:
 * - WasmPlannerAdapter: wraps local MotionPlanningManager
 * - RemotePlannerAdapter: sends JSON-RPC calls to backend
 * - Custom: user-provided implementation
 */
export interface IPlannerProvider {
  /** Provider type identifier */
  readonly type: 'wasm' | 'remote' | 'custom';

  /** Robot identifier */
  readonly robotId: string;

  /** Capabilities of this provider */
  readonly capabilities: PlannerCapabilities;

  /**
   * Plan a path using the full pipeline (validation → planning → post-processing → trajectory)
   */
  plan(
    request: PlanningRequest,
    collisionChecker?: CollisionChecker,
    onProgress?: PipelineProgressCallback
  ): Promise<PlanningResult>;

  /**
   * Plan a Cartesian linear motion
   */
  planLinearMotion(request: LinearMotionRequest): Promise<LinearMotionResult>;

  /**
   * Legacy path planning interface
   */
  planPath(request: PathPlanningRequest): Promise<PathPlanningResult>;

  /**
   * Check collision at a joint configuration
   * @returns true if configuration is collision-free
   */
  checkCollision(joints: number[]): Promise<boolean>;

  /**
   * Get current pipeline stage (for local planners)
   */
  getCurrentStage(): PipelineStage;

  /**
   * Abort current planning operation
   */
  abort(): void;

  /**
   * Dispose/cleanup resources
   */
  dispose(): void;
}

// ============================================================================
// Planner Context Value
// ============================================================================

/**
 * State exposed by the PlannerContext to consumer hooks and components
 */
export interface PlannerContextValue {
  /** The planner provider (null if not available) */
  planner: IPlannerProvider | null;

  /** Whether the planner is ready to use */
  ready: boolean;

  /** Whether the planner is currently initializing */
  loading: boolean;

  /** Initialization error */
  error: Error | null;

  /** Register a planner provider */
  registerPlanner(planner: IPlannerProvider): void;

  /** Unregister the current planner */
  unregisterPlanner(): void;
}
