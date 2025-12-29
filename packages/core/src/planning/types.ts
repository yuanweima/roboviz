/**
 * Motion Planning Types
 *
 * Type definitions for GPU-accelerated motion planning pipeline.
 */

import type { Vector3, Pose } from '../types';

// ============================================================================
// Planning Configuration Types
// ============================================================================

/**
 * BiRRT planner configuration
 */
export interface BiRRTConfig {
  /** Maximum iterations (default: 5000) */
  maxIterations: number;
  /** Goal bias probability 0-1 (default: 0.1) */
  goalBias: number;
  /** Maximum extension distance per step (default: 0.2) */
  maxExtension: number;
  /** Connection distance threshold (default: 0.1) */
  connectThreshold: number;
  /** Step size for collision checking (default: 0.05) */
  stepSize: number;
}

/**
 * RRT* planner configuration
 */
export interface RRTStarConfig {
  /** Maximum iterations (default: 5000) */
  maxIterations: number;
  /** Goal bias probability (default: 0.1) */
  goalBias: number;
  /** Maximum extension distance (default: 0.2) */
  maxExtension: number;
  /** Goal radius for success (default: 0.05) */
  goalRadius: number;
  /** Rewire radius multiplier (default: 1.5) */
  rewireFactor: number;
  /** Step size for collision checking */
  stepSize: number;
}

/**
 * PRM planner configuration
 */
export interface PRMConfig {
  /** Number of samples for roadmap (default: 1000) */
  numSamples: number;
  /** Number of neighbors to connect (default: 10) */
  kNeighbors: number;
  /** Maximum connection distance (default: 0.5) */
  maxConnectionDistance: number;
  /** Step size for collision checking */
  stepSize: number;
}

/**
 * Task-space RRT configuration
 */
export interface TaskSpaceRRTConfig {
  /** Maximum iterations */
  maxIterations: number;
  /** Step size in Cartesian space (meters) */
  stepSize: number;
  /** Goal bias probability */
  goalBias: number;
  /** Position tolerance (meters) */
  positionTolerance: number;
  /** Orientation tolerance (radians) */
  orientationTolerance: number;
}

/**
 * Pipeline post-processing configuration
 */
export interface PipelineConfig {
  /** Enable path post-processing */
  enablePostProcessing: boolean;
  /** Maximum shortcut iterations */
  shortcutIterations: number;
  /** Maximum smoothing iterations */
  smoothIterations: number;
  /** Smoothing factor 0-1 */
  smoothingFactor: number;
  /** Calculate path quality metrics */
  calculateMetrics: boolean;
}

/**
 * Trajectory generation configuration
 */
export interface TrajectoryGeneratorConfig {
  /** Maximum velocity per joint (rad/s) */
  maxVelocity: number[];
  /** Maximum acceleration per joint (rad/s^2) */
  maxAcceleration: number[];
  /** Maximum jerk per joint (rad/s^3) - optional */
  maxJerk?: number[];
  /** Time step for trajectory sampling (seconds) */
  timeStep: number;
}

// ============================================================================
// Planner Type Selection
// ============================================================================

export type PlannerType = 'birrt' | 'rrt-star' | 'prm' | 'task-space-rrt';

export interface PlannerSelection {
  type: PlannerType;
  config: BiRRTConfig | RRTStarConfig | PRMConfig | TaskSpaceRRTConfig;
}

// ============================================================================
// Collision Types
// ============================================================================

/**
 * Collision checker callback type
 * Returns true if configuration is VALID (no collision)
 */
export type CollisionChecker = (joints: number[]) => boolean;

/**
 * Obstacle definition for planning
 */
export interface PlanningObstacle {
  id: string;
  name: string;
  type: 'box' | 'sphere' | 'cylinder' | 'mesh';
  position: [number, number, number];
  /** For box: [width, height, depth], for sphere: [radius], for cylinder: [radius, height] */
  dimensions: number[];
  /** Rotation as quaternion [x, y, z, w] */
  rotation?: [number, number, number, number];
  /** Whether to include in collision checking */
  enabled: boolean;
  /** Visual color */
  color?: string;
}

// ============================================================================
// Planning Request/Result Types
// ============================================================================

/**
 * Motion planning request
 */
export interface PlanningRequest {
  /** Start joint configuration (radians) */
  startJoints: number[];
  /** Goal - either joint configuration or Cartesian pose */
  goal: GoalSpecification;
  /** Joint limits [lower[], upper[]] */
  jointLimits: {
    lower: number[];
    upper: number[];
  };
  /** Planner selection */
  planner: PlannerSelection;
  /** Pipeline configuration */
  pipeline?: PipelineConfig;
  /** Trajectory generation configuration */
  trajectory?: TrajectoryGeneratorConfig;
  /** Maximum planning time (ms) */
  maxPlanningTime?: number;
  /** Validate start and goal configurations */
  validateEndpoints?: boolean;
}

export type GoalSpecification =
  | { type: 'joints'; joints: number[] }
  | { type: 'pose'; pose: Pose; seed?: number[] };

/**
 * Path waypoint
 */
export interface PathWaypoint {
  joints: number[];
  /** Time from start (seconds) - only present after trajectory generation */
  time?: number;
  /** Velocity at waypoint */
  velocity?: number[];
  /** Acceleration at waypoint */
  acceleration?: number[];
}

/**
 * Path quality metrics
 */
export interface PathMetrics {
  /** Total path length in configuration space */
  pathLength: number;
  /** Path smoothness (sum of squared accelerations) */
  smoothness: number;
  /** Number of waypoints */
  waypointCount: number;
  /** Original waypoint count (before optimization) */
  originalWaypointCount: number;
  /** Path length improvement ratio */
  improvementRatio: number;
  /** Waypoint reduction ratio */
  waypointReductionRatio: number;
}

/**
 * Planning result
 */
export interface PlanningResult {
  /** Whether planning succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Planned path (joint-space waypoints) */
  path: PathWaypoint[];
  /** Path metrics */
  metrics?: PathMetrics;
  /** Planning time (ms) */
  planningTimeMs: number;
  /** Post-processing time (ms) */
  postProcessingTimeMs?: number;
  /** Trajectory generation time (ms) */
  trajectoryTimeMs?: number;
  /** Total time (ms) */
  totalTimeMs: number;
  /** Number of nodes explored by planner */
  nodesExplored?: number;
  /** Whether path was collision-checked */
  collisionChecked: boolean;
}

/**
 * Planning trajectory point with timing
 */
export interface PlanningTrajectoryPoint {
  time: number;
  positions: number[];
  velocities: number[];
  accelerations: number[];
}

/**
 * Generated planning trajectory
 */
export interface PlanningTrajectory {
  /** Trajectory points */
  points: PlanningTrajectoryPoint[];
  /** Total duration (seconds) */
  duration: number;
  /** Degrees of freedom */
  dof: number;
  /** Sample at specific time */
  sample(time: number): PlanningTrajectoryPoint | undefined;
}

// ============================================================================
// Planning Pipeline Types
// ============================================================================

/**
 * Planning pipeline stage
 */
export type PipelineStage =
  | 'idle'
  | 'validating'
  | 'planning'
  | 'post-processing'
  | 'trajectory-generation'
  | 'complete'
  | 'error';

/**
 * Pipeline progress callback
 */
export interface PipelineProgress {
  stage: PipelineStage;
  progress: number; // 0-1
  message?: string;
  currentTime?: number; // ms elapsed
}

export type PipelineProgressCallback = (progress: PipelineProgress) => void;

// ============================================================================
// Visualization Types
// ============================================================================

/**
 * Path visualization options
 */
export interface PathVisualizationOptions {
  /** Show path line */
  showPath: boolean;
  /** Path line color */
  pathColor: string;
  /** Path line width */
  pathWidth: number;
  /** Show waypoint markers */
  showWaypoints: boolean;
  /** Waypoint marker size */
  waypointSize: number;
  /** Show start/goal markers */
  showEndpoints: boolean;
  /** Animate robot along path */
  animatePath: boolean;
  /** Animation speed multiplier */
  animationSpeed: number;
  /** Show velocity profile */
  showVelocityProfile: boolean;
}

/**
 * Obstacle visualization options
 */
export interface ObstacleVisualizationOptions {
  /** Show obstacles */
  showObstacles: boolean;
  /** Obstacle opacity */
  opacity: number;
  /** Show wireframe */
  wireframe: boolean;
  /** Highlight color for collision */
  collisionColor: string;
}

/**
 * Planning visualization state
 */
export interface PlanningVisualizationState {
  /** Current pipeline stage */
  stage: PipelineStage;
  /** Current path (if any) */
  path: PathWaypoint[] | null;
  /** Path metrics */
  metrics: PathMetrics | null;
  /** Current playback position (0-1) */
  playbackPosition: number;
  /** Is playing animation */
  isPlaying: boolean;
  /** Selected waypoint index */
  selectedWaypointIndex: number | null;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_BIRRT_CONFIG: BiRRTConfig = {
  maxIterations: 5000,
  goalBias: 0.1,
  maxExtension: 0.2,
  connectThreshold: 0.1,
  stepSize: 0.05,
};

export const DEFAULT_RRT_STAR_CONFIG: RRTStarConfig = {
  maxIterations: 5000,
  goalBias: 0.1,
  maxExtension: 0.2,
  goalRadius: 0.05,
  rewireFactor: 1.5,
  stepSize: 0.05,
};

export const DEFAULT_PRM_CONFIG: PRMConfig = {
  numSamples: 1000,
  kNeighbors: 10,
  maxConnectionDistance: 0.5,
  stepSize: 0.05,
};

export const DEFAULT_TASK_SPACE_RRT_CONFIG: TaskSpaceRRTConfig = {
  maxIterations: 3000,
  stepSize: 0.02,
  goalBias: 0.15,
  positionTolerance: 0.001,
  orientationTolerance: 0.01,
};

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  enablePostProcessing: true,
  shortcutIterations: 100,
  smoothIterations: 50,
  smoothingFactor: 0.5,
  calculateMetrics: true,
};

export const DEFAULT_PATH_VISUALIZATION: PathVisualizationOptions = {
  showPath: true,
  pathColor: '#6366f1',
  pathWidth: 2,
  showWaypoints: true,
  waypointSize: 0.01,
  showEndpoints: true,
  animatePath: true,
  animationSpeed: 1.0,
  showVelocityProfile: false,
};

export const DEFAULT_OBSTACLE_VISUALIZATION: ObstacleVisualizationOptions = {
  showObstacles: true,
  opacity: 0.6,
  wireframe: false,
  collisionColor: '#ef4444',
};
