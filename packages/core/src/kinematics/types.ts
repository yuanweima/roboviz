/**
 * RoboViz Kinematics Types
 *
 * Type definitions for forward/inverse kinematics and motion planning.
 * Integrates with trajx-wasm for high-performance computation.
 */

import type { Pose, Vector3 } from '../types';

// ============================================================================
// Core Kinematics Types
// ============================================================================

/**
 * DH (Denavit-Hartenberg) parameter for a single joint
 */
export interface DhParam {
  /** Link length (a) in meters */
  a: number;
  /** Link twist (alpha) in radians */
  alpha: number;
  /** Link offset (d) in meters */
  d: number;
  /** Joint angle offset (theta) in radians */
  theta: number;
}

/**
 * Joint limits configuration
 */
export interface JointLimits {
  /** Lower bounds for each joint (radians) */
  lower: number[];
  /** Upper bounds for each joint (radians) */
  upper: number[];
  /** Degrees of freedom */
  dof: number;
}

/**
 * Kinematic limits (velocity, acceleration, jerk)
 */
export interface KinematicLimits {
  /** Maximum velocity for each joint (rad/s) */
  maxVelocity: number[];
  /** Maximum acceleration for each joint (rad/s^2) */
  maxAcceleration: number[];
  /** Maximum jerk for each joint (rad/s^3) */
  maxJerk?: number[];
}

// ============================================================================
// IK Result Types
// ============================================================================

/**
 * Single IK solution result
 */
export interface IkResult {
  /** Whether a valid solution was found */
  success: boolean;
  /** Joint angles solution (radians) */
  solution?: number[];
  /** Total error (position + orientation) */
  error?: number;
  /** Position error in meters */
  positionError?: number;
  /** Orientation error in radians */
  orientationError?: number;
  /** Number of iterations used */
  iterations?: number;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Multi-solution IK result (for analytical IK)
 */
export interface MultiIkResult {
  /** Whether at least one valid solution was found */
  success: boolean;
  /** Number of solutions found (up to 8 for 6-DOF spherical wrist) */
  solutionCount: number;
  /** All solutions as array of joint angle arrays */
  solutions: number[][];
  /** Position error for each solution */
  positionErrors: number[];
  /** Whether analytical IK was used (vs numerical) */
  isAnalytical: boolean;
  /** Error message if failed */
  errorMessage?: string;
}

// ============================================================================
// FK Result Types
// ============================================================================

/**
 * Forward kinematics result
 */
export interface FkResult {
  /** End-effector pose */
  pose: Pose;
  /** Whether tool offset was applied */
  toolApplied: boolean;
}

/**
 * Forward kinematics chain result (all links)
 */
export interface FkChainResult {
  /** Poses for all links (from base to end-effector) */
  poses: Pose[];
  /** Link names (if available) */
  linkNames?: string[];
}

// ============================================================================
// Workspace Analysis Types
// ============================================================================

/**
 * Workspace analysis result
 */
export interface WorkspaceAnalysis {
  /** Whether the configuration is valid */
  isValid: boolean;
  /** Manipulability index (0 = singular, higher = better) */
  manipulability: number;
  /** Condition number of Jacobian (lower = better, Infinity = singular) */
  conditionNumber: number;
  /** Whether robot is near singularity */
  isNearSingular: boolean;
  /** Minimum singular value */
  minSingularValue: number;
  /** Joint distances to limits (normalized 0-0.5, 0 = at limit) */
  jointLimitMargins: number[];
}

/**
 * Reachability result
 */
export interface ReachabilityResult {
  /** Whether the pose is reachable */
  isReachable: boolean;
  /** Best IK solution if reachable */
  solution?: number[];
  /** Position error of best solution */
  positionError?: number;
  /** Reason for unreachability */
  reason?: 'out_of_range' | 'joint_limits' | 'singularity' | 'no_solution';
}

// ============================================================================
// Motion Planning Types
// ============================================================================

/**
 * Linear motion segment
 */
export interface LinearMotionSegment {
  /** Start pose in Cartesian space */
  startPose: Pose;
  /** End pose in Cartesian space */
  endPose: Pose;
  /** Number of interpolation points */
  resolution: number;
}

/**
 * Linear motion planning request
 */
export interface LinearMotionRequest {
  /** Robot ID */
  robotId: string;
  /** Starting joint configuration */
  startJoints: number[];
  /** Target end-effector pose */
  targetPose: Pose;
  /** Linear interpolation resolution (mm) */
  resolution?: number;
  /** Maximum velocity (m/s) */
  maxVelocity?: number;
  /** Blending radius (m) for cornering */
  blendRadius?: number;
}

/**
 * Linear motion planning result
 */
export interface LinearMotionResult {
  /** Whether planning succeeded */
  success: boolean;
  /** Joint space path (array of joint configurations) */
  path: number[][];
  /** Cartesian path (end-effector poses) */
  cartesianPath: Pose[];
  /** Total path length in Cartesian space (meters) */
  pathLength: number;
  /** Planning time (ms) */
  planningTimeMs: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Unreachable segments (if any) */
  unreachableSegments?: { index: number; pose: Pose; reason: string }[];
}

/**
 * Path planning configuration for BiRRT
 */
export interface PathPlanningConfig {
  /** Maximum iterations */
  maxIterations?: number;
  /** Goal bias probability (0.0 - 1.0) */
  goalBias?: number;
  /** Maximum extension distance per step */
  maxExtension?: number;
  /** Connection distance threshold */
  connectThreshold?: number;
  /** Step size for collision checking */
  stepSize?: number;
}

/**
 * Path planning request
 */
export interface PathPlanningRequest {
  /** Robot ID */
  robotId: string;
  /** Starting joint configuration */
  startJoints: number[];
  /** Goal joint configuration */
  goalJoints: number[];
  /** Planning configuration */
  config?: PathPlanningConfig;
  /** Enable collision checking */
  checkCollisions?: boolean;
}

/**
 * Path planning result
 */
export interface PathPlanningResult {
  /** Whether planning succeeded */
  success: boolean;
  /** Joint space path */
  path: number[][];
  /** Number of waypoints */
  waypointCount: number;
  /** Total path length in joint space */
  pathLength: number;
  /** Number of nodes explored */
  nodesExplored: number;
  /** Planning time (ms) */
  planningTimeMs: number;
  /** Error message if failed */
  errorMessage?: string;
}

// ============================================================================
// Trajectory Types
// ============================================================================

/**
 * Trajectory generation configuration
 */
export interface TrajectoryConfig {
  /** Maximum velocity for each joint (rad/s) */
  maxVelocity: number[];
  /** Maximum acceleration for each joint (rad/s^2) */
  maxAcceleration: number[];
  /** Maximum jerk for each joint (rad/s^3) */
  maxJerk?: number[];
  /** Time step for trajectory points (s) */
  timeStep?: number;
}

/**
 * Trajectory point
 */
export interface TrajectoryPoint {
  /** Time from start (s) */
  time: number;
  /** Joint positions (radians) */
  positions: number[];
  /** Joint velocities (rad/s) */
  velocities: number[];
  /** Joint accelerations (rad/s^2) */
  accelerations: number[];
}

/**
 * Generated trajectory
 */
export interface Trajectory {
  /** Total duration (s) */
  duration: number;
  /** Degrees of freedom */
  dof: number;
  /** Trajectory points */
  points: TrajectoryPoint[];
}

// ============================================================================
// Tool Types
// ============================================================================

/**
 * TCP (Tool Center Point) definition
 */
export interface TcpPoint {
  /** TCP name */
  name: string;
  /** Position offset [x, y, z] from tool base frame */
  position: [number, number, number];
  /** Orientation as quaternion [x, y, z, w] */
  orientation: [number, number, number, number];
  /** Default standoff distance */
  standoff?: number;
  /** Standoff range [min, max] */
  standoffRange?: [number, number];
  /** Approach axis direction [x, y, z] */
  approachAxis?: [number, number, number];
}

/**
 * Tool definition with multiple TCPs
 */
export interface ToolDefinition {
  /** Tool name */
  name: string;
  /** Flange offset (from robot flange to tool base frame) */
  flangeOffset?: {
    position: [number, number, number];
    orientation: [number, number, number, number];
  };
  /** TCP definitions */
  tcps: TcpPoint[];
  /** Active TCP name */
  activeTcp?: string;
  /** Tool mass (kg) */
  mass?: number;
  /** Center of mass [x, y, z] */
  centerOfMass?: [number, number, number];
}

/**
 * Tool attachment configuration
 */
export interface ToolAttachment {
  /** Tool name */
  name: string;
  /** Active TCP name (defaults to first TCP) */
  activeTcp?: string;
  /** Standoff distance override */
  standoff?: number;
}

/**
 * Standoff pose computation request
 */
export interface StandoffPoseRequest {
  /** Target point on workpiece [x, y, z] */
  targetPoint: [number, number, number];
  /** Approach direction [x, y, z] (normalized) */
  approachDirection: [number, number, number];
  /** Standoff distance from target */
  standoffDistance: number;
}

// ============================================================================
// Robot Solver Configuration
// ============================================================================

/**
 * IK solver configuration
 */
export interface IkSolverConfig {
  /** Maximum iterations */
  maxIterations?: number;
  /** Position tolerance (meters) */
  positionTolerance?: number;
  /** Orientation tolerance (radians) */
  orientationTolerance?: number;
  /** Damping factor for DLS method */
  dampingFactor?: number;
  /** Prefer analytical IK when available */
  preferAnalytical?: boolean;
}

/**
 * Robot solver instance configuration
 */
export interface RobotSolverConfig {
  /** Unique robot ID */
  robotId: string;
  /** Robot name (e.g., 'fanuc_m20ia', 'ur5') */
  robotName?: string;
  /** DH parameters (if custom) */
  dhParams?: DhParam[];
  /** URDF content (if using URDF) */
  urdfContent?: string;
  /** Joint limits */
  jointLimits?: JointLimits;
  /** Kinematic limits */
  kinematicLimits?: KinematicLimits;
  /** Tool offset pose */
  toolPose?: Pose;
  /** IK solver configuration */
  ikConfig?: IkSolverConfig;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Kinematics event types
 */
export type KinematicsEventType =
  | 'solver:created'
  | 'solver:disposed'
  | 'ik:computed'
  | 'fk:computed'
  | 'motion:planned'
  | 'trajectory:generated'
  | 'error';

/**
 * Kinematics event
 */
export interface KinematicsEvent {
  type: KinematicsEventType;
  robotId: string;
  timestamp: number;
  data?: unknown;
}

/**
 * Kinematics event listener
 */
export type KinematicsEventListener = (event: KinematicsEvent) => void;
