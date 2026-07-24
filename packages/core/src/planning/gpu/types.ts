/**
 * GPU Planning Types
 *
 * Type definitions for GPU-accelerated motion planning.
 */

import type { Vector3Tuple, QuaternionTuple } from '../../types';
import type { CollisionWorld, WorldCapsule, BatchCollisionConfig } from '../../collision/world/types';
import type { PlanningWaypoint } from '../waypoint/types';

// Re-export for internal use only (not exported from module index)
export type { Vector3Tuple, QuaternionTuple };

// ============================================================================
// Joint Space Types
// ============================================================================

/** Joint configuration (array of joint values) */
export type JointConfiguration = number[];

/** Joint limits for a robot */
export interface JointLimits {
  lower: number[];
  upper: number[];
  velocity?: number[];
  acceleration?: number[];
}

// ============================================================================
// Planner Types
// ============================================================================

/** Available GPU planning algorithms */
export type GpuPlannerType = 'lazy-prm' | 'birrt' | 'rrt-star' | 'task-space-rrt';

/** Planning algorithm parameters */
export interface PlannerParams {
  /** Maximum planning time in seconds */
  maxPlanningTime?: number;
  /** Maximum iterations */
  maxIterations?: number;
  /** Step size for tree extension */
  stepSize?: number;
  /** Goal bias probability */
  goalBias?: number;
  /** Number of samples for PRM roadmap */
  numSamples?: number;
  /** Number of nearest neighbors for PRM */
  numNeighbors?: number;
  /** Connection radius for PRM */
  connectionRadius?: number;
  /** Enable path smoothing */
  smoothPath?: boolean;
  /** Enable path shortcutting */
  shortcutPath?: boolean;
  /** Number of shortcut iterations */
  shortcutIterations?: number;
  /** Smoothing iterations */
  smoothingIterations?: number;
}

/** Default planner parameters */
export const DEFAULT_PLANNER_PARAMS: Required<PlannerParams> = {
  maxPlanningTime: 10.0,
  maxIterations: 10000,
  stepSize: 0.1,
  goalBias: 0.05,
  numSamples: 500,
  numNeighbors: 10,
  connectionRadius: 1.0,
  smoothPath: true,
  shortcutPath: true,
  shortcutIterations: 50,
  smoothingIterations: 10,
};

// ============================================================================
// Collision Checking Types
// ============================================================================

/** Collision check function signature (trajx-wasm compatible) */
export type CollisionCheckerFn = (joints: number[]) => boolean;

/** Batch collision check result */
export interface BatchCollisionResult {
  /** Configuration indices that are in collision */
  collidingIndices: number[];
  /** Total configurations checked */
  totalChecked: number;
  /** Time taken in milliseconds */
  elapsedMs: number;
}

/** Edge validation result */
export interface EdgeValidationResult {
  /** Edge index */
  edgeIndex: number;
  /** Whether edge is collision-free */
  valid: boolean;
  /** First collision sample index (if invalid) */
  firstCollisionSample?: number;
}

// ============================================================================
// Planning Progress Types
// ============================================================================

/** Planning phase */
export type PlanningPhase =
  | 'idle'
  | 'initializing'
  | 'building-roadmap'
  | 'searching'
  | 'validating-edges'
  | 'optimizing'
  | 'smoothing'
  | 'completed'
  | 'failed'
  | 'aborted';

/** Planning progress information */
export interface GpuPlanningProgress {
  /** Current phase */
  phase: PlanningPhase;
  /** Phase-specific progress (0-1) */
  phaseProgress: number;
  /** Overall progress (0-1) */
  overallProgress: number;
  /** Current iteration */
  currentIteration: number;
  /** Maximum iterations */
  maxIterations: number;
  /** Nodes in search tree/roadmap */
  nodesCount: number;
  /** Edges validated */
  edgesValidated: number;
  /** Total edges to validate */
  totalEdges: number;
  /** Collisions found during search */
  collisionsFound: number;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Status message */
  message: string;
}

/** Initial progress state */
export const INITIAL_PLANNING_PROGRESS: GpuPlanningProgress = {
  phase: 'idle',
  phaseProgress: 0,
  overallProgress: 0,
  currentIteration: 0,
  maxIterations: 0,
  nodesCount: 0,
  edgesValidated: 0,
  totalEdges: 0,
  collisionsFound: 0,
  elapsedMs: 0,
  message: 'Ready',
};

// ============================================================================
// Planning Result Types
// ============================================================================

/** GPU planned path waypoint */
export interface GpuPathWaypoint {
  /** Joint configuration */
  joints: number[];
  /** Optional Cartesian pose (if computed) */
  pose?: {
    position: Vector3Tuple;
    quaternion: QuaternionTuple;
  };
  /** Time from start (seconds) */
  time?: number;
  /** Velocity at this waypoint */
  velocity?: number[];
}

/** Planning result */
export interface GpuPlanningResult {
  /** Whether planning succeeded */
  success: boolean;
  /** Planned path (sequence of joint configurations) */
  path: GpuPathWaypoint[];
  /** Path length in configuration space */
  pathLength: number;
  /** Total planning time in milliseconds */
  planningTimeMs: number;
  /** Number of collision checks performed */
  collisionChecks: number;
  /** Number of nodes explored */
  nodesExplored: number;
  /** Error message (if failed) */
  error?: string;
  /** Detailed statistics */
  statistics?: {
    roadmapBuildTime?: number;
    searchTime?: number;
    validationTime?: number;
    optimizationTime?: number;
    smoothingTime?: number;
  };
}

// ============================================================================
// Planning Request Types
// ============================================================================

/** Point-to-point planning request */
export interface PointToPointRequest {
  /** Start joint configuration */
  startJoints: number[];
  /** Goal joint configuration */
  goalJoints: number[];
  /** Planning algorithm */
  planner?: GpuPlannerType;
  /** Algorithm parameters */
  params?: PlannerParams;
}

/** Multi-waypoint planning request */
export interface MultiWaypointRequest {
  /** Start joint configuration */
  startJoints: number[];
  /** Waypoints to visit in order */
  waypoints: PlanningWaypoint[];
  /** Planning algorithm */
  planner?: GpuPlannerType;
  /** Algorithm parameters */
  params?: PlannerParams;
  /** Whether to return to start (closed loop) */
  closedLoop?: boolean;
}

// ============================================================================
// GPU Planning Engine Types
// ============================================================================

/** GPU planning engine configuration */
export interface GpuPlanningEngineConfig {
  /** Robot URDF content or path */
  robotUrdf: string;
  /** Robot degrees of freedom */
  dof: number;
  /** Joint limits */
  jointLimits: JointLimits;
  /** Robot capsule model for collision */
  robotCapsules?: WorldCapsule[];
  /** Self-collision pairs */
  selfCollisionPairs?: Array<[number, number]>;
  /** Batch collision configuration */
  batchConfig?: BatchCollisionConfig;
  /** Default planner type */
  defaultPlanner?: GpuPlannerType;
  /** Default planner parameters */
  defaultParams?: PlannerParams;
}

/** GPU planning engine state */
export interface GpuPlanningEngineState {
  /** Whether engine is initialized */
  initialized: boolean;
  /** Whether currently planning */
  isPlanning: boolean;
  /** Current collision world */
  collisionWorld: CollisionWorld | null;
  /** Current progress */
  progress: GpuPlanningProgress;
  /** Last planning result */
  lastResult: GpuPlanningResult | null;
}

/** GPU planning engine interface */
export interface IGpuPlanningEngine {
  /** Initialize the engine */
  initialize(): Promise<void>;
  /** Dispose resources */
  dispose(): void;
  /** Check if ready */
  readonly isReady: boolean;
  /** Current state */
  readonly state: GpuPlanningEngineState;

  /** Set collision world */
  setCollisionWorld(world: CollisionWorld): void;
  /** Update robot joint positions (for collision checking) */
  updateRobotJoints(joints: number[]): void;

  /** Create collision checker function */
  createCollisionChecker(): CollisionCheckerFn;

  /** Plan point-to-point path */
  planPointToPoint(request: PointToPointRequest): Promise<GpuPlanningResult>;
  /** Plan through multiple waypoints */
  planThroughWaypoints(request: MultiWaypointRequest): Promise<GpuPlanningResult>;

  /** Abort current planning */
  abort(): void;
  /** Clear last result */
  clearResult(): void;

  /** Subscribe to progress updates */
  onProgress(callback: (progress: GpuPlanningProgress) => void): () => void;
}

// ============================================================================
// Hook Types
// ============================================================================

/** useGpuPlanning options */
export interface UseGpuPlanningOptions {
  /** Robot URDF content or path */
  robotUrdf: string;
  /** Robot degrees of freedom */
  dof: number;
  /** Joint limits */
  jointLimits: JointLimits;
  /** Collision world */
  collisionWorld?: CollisionWorld;
  /** Default planner type */
  defaultPlanner?: GpuPlannerType;
  /** Default planner parameters */
  defaultParams?: PlannerParams;
  /** Auto-initialize on mount */
  autoInitialize?: boolean;
}

/** useGpuPlanning return type */
export interface UseGpuPlanningReturn {
  /** Whether engine is ready */
  ready: boolean;
  /** Whether currently planning */
  isPlanning: boolean;
  /** Current progress */
  progress: GpuPlanningProgress;
  /** Last planning result */
  result: GpuPlanningResult | null;
  /** Error message */
  error: string | null;

  /** Initialize the engine */
  initialize: () => Promise<void>;
  /** Plan point-to-point */
  planToGoal: (startJoints: number[], goalJoints: number[], params?: PlannerParams) => Promise<GpuPlanningResult>;
  /** Plan through waypoints */
  planThroughWaypoints: (startJoints: number[], waypoints: PlanningWaypoint[], params?: PlannerParams) => Promise<GpuPlanningResult>;
  /** Abort current planning */
  abort: () => void;
  /** Clear result */
  clearResult: () => void;
  /** Update collision world */
  setCollisionWorld: (world: CollisionWorld) => void;
}

// ============================================================================
// Event Types
// ============================================================================

/** GPU planning event types */
export type GpuPlanningEventType =
  | 'initialized'
  | 'planning-started'
  | 'progress'
  | 'planning-completed'
  | 'planning-failed'
  | 'planning-aborted'
  | 'collision-world-updated';

/** GPU planning event */
export interface GpuPlanningEvent {
  type: GpuPlanningEventType;
  timestamp: number;
  data?: unknown;
}

/** Event callback */
export type GpuPlanningEventCallback = (event: GpuPlanningEvent) => void;
