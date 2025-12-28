/* tslint:disable */
/* eslint-disable */
/**
 * List available robots in the DH database
 */
export function listDhDatabase(): string[];
/**
 * Create a robot from a URDF string
 */
export function createRobot(urdf_content: string): Robot;
/**
 * Compute inverse kinematics using numerical method (Damped Least Squares)
 *
 * # Arguments
 * * `dh_params` - DH parameters for the robot
 * * `target_pose` - Target end-effector pose
 * * `seed` - Initial joint configuration (optional, uses zeros if not provided)
 * * `joint_limits` - Joint limits for the robot
 * * `max_iterations` - Maximum solver iterations (default: 100)
 * * `tolerance` - Position tolerance in meters (default: 1e-4)
 *
 * # Returns
 * IK solution or error
 */
export function inverseKinematicsDh(dh_params: DhParam[], target_pose: Pose, seed?: Float64Array | null, joint_limits?: JointLimits | null, max_iterations?: number | null, tolerance?: number | null): IkResult;
/**
 * Batch forward kinematics with Float32 input/output for WebGL/InstancedMesh compatibility
 *
 * Same as batchForwardKinematics but uses Float32Array for zero-copy with GPU buffers.
 */
export function batchForwardKinematicsF32(dh_params: DhParam[], joint_angles_flat: Float32Array, robot_count: number, joint_count: number): Float32Array;
/**
 * Compute forward kinematics for visualization (returns all link poses)
 *
 * # Returns
 * Array of poses for each link (useful for rendering robot in 3D)
 */
export function forwardKinematicsChainDh(dh_params: DhParam[], joint_angles: Float64Array): Pose[];
/**
 * Batch forward kinematics for multiple robots (GPU instancing optimization)
 *
 * Computes forward kinematics for multiple robot instances in parallel,
 * returning all link transformation matrices in a single flat array.
 *
 * # Arguments
 * * `dh_params` - DH parameters for the robot (shared by all instances)
 * * `joint_angles_flat` - Flat array of joint angles: [robot1_j1, robot1_j2, ..., robot2_j1, ...]
 * * `robot_count` - Number of robot instances
 * * `joint_count` - Number of joints per robot
 *
 * # Returns
 * Flat array of 4x4 transformation matrices (column-major, compatible with Three.js):
 * Format: [robot1_link1_mat4, robot1_link2_mat4, ..., robot2_link1_mat4, ...]
 * Each robot has (joint_count + 1) links (including base)
 * Total size: robot_count * (joint_count + 1) * 16
 *
 * # Example (JavaScript)
 * ```js
 * const robotCount = 500;
 * const jointCount = 6;
 * const jointAngles = new Float32Array(robotCount * jointCount);
 * // ... fill joint angles ...
 * const transforms = batchForwardKinematics(dhParams, jointAngles, robotCount, jointCount);
 * // transforms.length = 500 * 7 * 16 = 56000
 * ```
 */
export function batchForwardKinematics(dh_params: DhParam[], joint_angles_flat: Float64Array, robot_count: number, joint_count: number): Float64Array;
/**
 * Compute forward kinematics from DH parameters
 *
 * # Arguments
 * * `dh_params` - Array of DH parameters [a, alpha, d, theta] for each joint
 * * `joint_angles` - Current joint angles in radians
 *
 * # Returns
 * End-effector pose (position + orientation)
 */
export function forwardKinematicsDh(dh_params: DhParam[], joint_angles: Float64Array): Pose;
/**
 * Batch FK returning only end-effector poses (for scenarios where link transforms aren't needed)
 *
 * More efficient when you only need the final pose of each robot.
 *
 * # Returns
 * Flat array of 4x4 matrices for end-effector only:
 * Format: [robot1_ee_mat4, robot2_ee_mat4, ...]
 * Total size: robot_count * 16
 */
export function batchForwardKinematicsEndEffector(dh_params: DhParam[], joint_angles_flat: Float32Array, robot_count: number, joint_count: number): Float32Array;
/**
 * Create a simple trajectory from waypoints using default limits
 */
export function createSimpleTrajectory(waypoints: Float64Array, dof: number, max_velocity: number, max_acceleration: number): WasmTrajectory;
/**
 * Get list of all supported robot names from the default database
 */
export function listSupportedRobots(): string[];
/**
 * Check if the library is initialized
 */
export function is_ready(): boolean;
/**
 * Get the library version
 */
export function version(): string;
/**
 * Initialize panic hook for better error messages in browser console
 */
export function init(): void;
/**
 * Get a precision cable configuration (2π limit with auto-unwind)
 * For applications requiring minimal cable stress
 */
export function cablePresetPrecision(): CableConfig;
/**
 * Get a heavy-duty cable configuration (2π limit, 1 full rotation / 360°)
 * For thick, stiff cables that cannot twist much
 */
export function cablePresetHeavyDuty(): CableConfig;
/**
 * Get a standard cable configuration (4π limit, 2 full rotations / 720°)
 */
export function cablePresetStandard(): CableConfig;
/**
 * Get a light cable configuration (8π limit, 4 full rotations / 1440°)
 * For thin, flexible cables
 */
export function cablePresetLight(): CableConfig;
/**
 * Compute path length from flat array
 */
export function computePathLength(path_flat: Float64Array, dof: number): number;
/**
 * Compute path smoothness from flat array (sum of squared accelerations)
 */
export function computePathSmoothness(path_flat: Float64Array, dof: number): number;
/**
 * Interpolate between waypoints with specified resolution
 * Input/output as flat array: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
 */
export function interpolatePathFlat(path_flat: Float64Array, resolution: number): Float64Array;
/**
 * Cable constraint mode
 */
export enum CableMode {
  /**
   * No cable tracking (default)
   */
  Disabled = 0,
  /**
   * Track cable twist without constraining planning
   */
  TrackOnly = 1,
  /**
   * Constrain planning to respect cable limits
   */
  Constrained = 2,
}
/**
 * Collision handling mode
 */
export enum CollisionMode {
  /**
   * No collision checking (fastest)
   */
  Disabled = 0,
  /**
   * Verify path is collision-free
   */
  Verify = 1,
  /**
   * Plan around obstacles
   */
  Avoid = 2,
  /**
   * Adaptive replanning
   */
  Adaptive = 3,
}
/**
 * Motion style for path generation
 */
export enum MotionStyle {
  /**
   * Automatic selection based on constraints
   */
  Auto = 0,
  /**
   * Joint-space interpolation (fastest)
   */
  Joint = 1,
  /**
   * Cartesian linear motion
   */
  Linear = 2,
  /**
   * Spline interpolation
   */
  Spline = 3,
}
/**
 * Smoothness level
 */
export enum Smoothness {
  /**
   * No smoothing
   */
  None = 0,
  /**
   * Standard smoothness
   */
  Standard = 1,
  /**
   * High smoothness
   */
  High = 2,
  /**
   * Very high smoothness (slowest)
   */
  VeryHigh = 3,
}
/**
 * BiRRT planner configuration
 */
export class BiRRTConfig {
  free(): void;
  /**
   * Create with custom parameters
   */
  static withParams(max_iterations: number, goal_bias: number, max_extension: number): BiRRTConfig;
  /**
   * Set goal bias
   */
  withGoalBias(goal_bias: number): BiRRTConfig;
  /**
   * Set max extension
   */
  withMaxExtension(max_extension: number): BiRRTConfig;
  /**
   * Set max iterations
   */
  withMaxIterations(max_iterations: number): BiRRTConfig;
  /**
   * Set connection threshold
   */
  withConnectionThreshold(threshold: number): BiRRTConfig;
  constructor();
  /**
   * Maximum iterations
   */
  max_iterations: number;
  /**
   * Goal bias probability (0.0 - 1.0)
   */
  goal_bias: number;
  /**
   * Maximum extension distance per step
   */
  max_extension: number;
  /**
   * Connection distance threshold
   */
  connect_threshold: number;
  /**
   * Step size for collision checking
   */
  step_size: number;
}
/**
 * BiRRT Planner for WASM
 *
 * Single-threaded bidirectional RRT planner optimized for browser execution.
 * Provides excellent performance for point-to-point motion planning.
 */
export class BiRRTPlanner {
  free(): void;
  /**
   * Plan with collision checking callback
   *
   * The callback receives joint configuration and returns true if valid (no collision)
   */
  planWithCollisionCheck(start: Float64Array, goal: Float64Array, collision_checker: Function): PlanningResult;
  /**
   * Create a new BiRRT planner
   */
  constructor(joint_limits: JointLimits, config?: BiRRTConfig | null);
  /**
   * Plan a path from start to goal (joint limits only, no collision checking)
   */
  plan(start: Float64Array, goal: Float64Array): PlanningResult;
}
/**
 * Cable configuration for cable-aware motion planning
 *
 * Configure cable twist limits and warning thresholds.
 * Used with `WasmMotion.cableAwareWith(config)`.
 */
export class CableConfig {
  free(): void;
  /**
   * Check if a twist value is within limits
   */
  isTwistValid(twist: number): boolean;
  /**
   * Check if twist is in warning zone
   */
  isTwistWarning(twist: number): boolean;
  /**
   * Enable/disable auto-unwind strategy
   */
  withAutoUnwind(enabled: boolean): CableConfig;
  /**
   * Set initial twist (radians)
   */
  withInitialTwist(twist: number): CableConfig;
  /**
   * Set maximum twist rate (radians per meter)
   */
  withMaxTwistRate(rate: number): CableConfig;
  /**
   * Set maximum total twist (radians)
   */
  withMaxTotalTwist(max_twist: number): CableConfig;
  /**
   * Set warning threshold (fraction of max_total_twist, 0.0-1.0)
   */
  withWarningThreshold(threshold: number): CableConfig;
  /**
   * Create default cable configuration
   * - max_total_twist: 4*PI (2 full rotations / 720°)
   * - max_twist_rate: PI rad/m
   * - enable_auto_unwind: true
   * - warning_threshold: 0.75
   */
  constructor();
  readonly initialTwist: number;
  readonly maxTwistRate: number;
  readonly maxTotalTwist: number;
  readonly warningThreshold: number;
  readonly autoUnwindEnabled: boolean;
}
/**
 * DH Parameter for a single joint
 */
export class DhParam {
  free(): void;
  constructor(a: number, alpha: number, d: number, theta: number);
  /**
   * Link length (a)
   */
  a: number;
  /**
   * Link twist (alpha) in radians
   */
  alpha: number;
  /**
   * Link offset (d)
   */
  d: number;
  /**
   * Joint angle offset (theta) in radians
   */
  theta: number;
}
/**
 * Result of edge validation
 */
export class EdgeValidationResult {
  private constructor();
  free(): void;
  /**
   * Get a specific interpolated point by index
   */
  getPoint(index: number): Float64Array;
  /**
   * Number of interpolated points
   */
  readonly numPoints: number;
  /**
   * Get interpolated points as flat array (if caching enabled)
   */
  readonly interpolatedPoints: Float64Array;
  /**
   * Whether the edge is valid
   */
  readonly valid: boolean;
}
/**
 * IK result (single solution)
 */
export class IkResult {
  private constructor();
  free(): void;
  readonly iterations: number;
  readonly errorMessage: string | undefined;
  /**
   * Whether analytical IK was used (vs numerical)
   */
  readonly isAnalytical: boolean;
  readonly positionError: number | undefined;
  readonly error: number | undefined;
  readonly message: string | undefined;
  readonly success: boolean;
  readonly solution: Float64Array | undefined;
}
/**
 * Joint limits configuration
 */
export class JointLimits {
  free(): void;
  constructor(lower: Float64Array, upper: Float64Array);
  /**
   * Clamp joint values to limits
   */
  clamp(joints: Float64Array): Float64Array;
  /**
   * Check if joint values are within limits
   */
  isValid(joints: Float64Array): boolean;
  /**
   * Number of joints
   */
  readonly dof: number;
  readonly lower: Float64Array;
  readonly upper: Float64Array;
}
/**
 * Kinematic limits (velocity, acceleration, jerk)
 */
export class KinematicLimits {
  free(): void;
  constructor(max_velocity: Float64Array, max_acceleration: Float64Array, max_jerk: Float64Array);
  /**
   * Create uniform limits for all joints
   */
  static uniform(dof: number, velocity: number, acceleration: number, jerk: number): KinematicLimits;
  readonly maxJerk: Float64Array;
  readonly maxVelocity: Float64Array;
  readonly maxAcceleration: Float64Array;
}
/**
 * Motion constraints
 */
export class MotionConstraints {
  free(): void;
  constructor();
  readonly smoothness: Smoothness;
  readonly speed_scale: number;
  readonly dwell_ms: bigint | undefined;
  readonly collision: CollisionMode;
}
/**
 * Motion validation statistics
 */
export class MotionValidationStats {
  free(): void;
  constructor();
  /**
   * Total number of configurations checked
   */
  configs_checked: number;
  /**
   * Number of valid configurations
   */
  valid_configs: number;
  /**
   * Number of invalid configurations
   */
  invalid_configs: number;
  /**
   * Total validation time in milliseconds
   */
  total_time_ms: number;
  /**
   * Get validity ratio
   */
  readonly validityRatio: number;
}
/**
 * Multi-solution IK result
 */
export class MultiIkResult {
  private constructor();
  free(): void;
  /**
   * Get a specific solution by index
   */
  getSolution(index: number): Float64Array | undefined;
  /**
   * Get position error for a specific solution
   */
  getPositionError(index: number): number | undefined;
  /**
   * Get all solutions as flat array
   * Format: [dof, n_solutions, sol1_j1, sol1_j2, ..., sol2_j1, sol2_j2, ...]
   */
  getSolutionsFlat(): Float64Array;
  readonly errorMessage: string | undefined;
  /**
   * Whether analytical IK was used
   */
  readonly isAnalytical: boolean;
  /**
   * Number of solutions found
   */
  readonly solutionCount: number;
  /**
   * Get all position errors
   */
  readonly positionErrors: Float64Array;
  readonly success: boolean;
}
/**
 * PRM configuration
 */
export class PRMConfig {
  free(): void;
  /**
   * Set number of neighbors
   */
  withKNeighbors(k_neighbors: number): PRMConfig;
  /**
   * Set number of samples
   */
  withNumSamples(num_samples: number): PRMConfig;
  /**
   * Set max connection distance
   */
  withMaxConnectionDistance(distance: number): PRMConfig;
  constructor();
  /**
   * Number of samples for roadmap construction
   */
  num_samples: number;
  /**
   * Number of neighbors to connect
   */
  k_neighbors: number;
  /**
   * Maximum connection distance
   */
  max_connection_distance: number;
  /**
   * Step size for collision checking
   */
  step_size: number;
}
/**
 * Probabilistic Roadmap (PRM) Planner for WASM
 *
 * Pre-builds a roadmap of the configuration space for fast multi-query planning.
 * Good for environments where multiple queries will be made.
 */
export class PRMPlanner {
  free(): void;
  /**
   * Build the roadmap (joint limits only)
   */
  buildRoadmap(): number;
  /**
   * Clear the roadmap
   */
  clearRoadmap(): void;
  /**
   * Query with collision checking for start/goal connections
   */
  queryWithCollisionCheck(start: Float64Array, goal: Float64Array, collision_checker: Function): PlanningResult;
  /**
   * Build the roadmap with collision checking
   */
  buildRoadmapWithCollisionCheck(collision_checker: Function): number;
  /**
   * Create a new PRM planner
   */
  constructor(joint_limits: JointLimits, config?: PRMConfig | null);
  /**
   * Query the roadmap for a path
   */
  query(start: Float64Array, goal: Float64Array): PlanningResult;
  /**
   * Get roadmap size
   */
  readonly roadmapSize: number;
  /**
   * Check if roadmap is built
   */
  readonly isRoadmapBuilt: boolean;
}
/**
 * Path smoother for post-processing planned paths
 */
export class PathOptimizer {
  free(): void;
  /**
   * Smooth a path with collision checking
   */
  shortcutWithCollisionCheck(path_flat: Float64Array, joint_limits: JointLimits, collision_checker: Function): Float64Array;
  constructor(shortcut_attempts?: number | null);
  /**
   * Smooth a path using shortcutting
   *
   * Attempts to remove unnecessary waypoints by connecting non-adjacent points.
   */
  shortcut(path_flat: Float64Array, joint_limits: JointLimits): Float64Array;
}
/**
 * Planning result
 */
export class PlanningResult {
  private constructor();
  free(): void;
  /**
   * Get a specific waypoint
   */
  getWaypoint(index: number): Float64Array | undefined;
  /**
   * Get path as flat array for efficient transfer
   * Format: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
   */
  getPathFlat(): Float64Array;
  readonly pathLength: number;
  readonly nodesExplored: number;
  /**
   * Get number of waypoints
   */
  readonly waypointCount: number;
  readonly planningTimeMs: number;
  readonly error: string | undefined;
  readonly success: boolean;
  /**
   * Get path as flat array (getter version for property access)
   * Format: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
   */
  readonly pathFlat: Float64Array;
}
/**
 * 6-DOF Pose (position + orientation)
 */
export class Pose {
  free(): void;
  /**
   * Get as 4x4 transformation matrix (column-major)
   */
  toMatrix4(): Float64Array;
  /**
   * Get position as [x, y, z]
   */
  getPositionArray(): Float64Array;
  /**
   * Create pose from position and Euler angles
   */
  static fromPositionEuler(x: number, y: number, z: number, roll: number, pitch: number, yaw: number): Pose;
  /**
   * Get orientation as [qx, qy, qz, qw]
   */
  getOrientationArray(): Float64Array;
  constructor(position: Position, orientation: Quaternion);
  /**
   * Identity pose (origin, no rotation)
   */
  static identity(): Pose;
  readonly orientation: Quaternion;
  readonly position: Position;
}
/**
 * 3D Position (x, y, z)
 */
export class Position {
  free(): void;
  /**
   * Create from array [x, y, z]
   */
  static fromArray(arr: Float64Array): Position;
  constructor(x: number, y: number, z: number);
  /**
   * Convert to array [x, y, z]
   */
  toArray(): Float64Array;
  x: number;
  y: number;
  z: number;
}
/**
 * Quaternion orientation (x, y, z, w)
 */
export class Quaternion {
  free(): void;
  /**
   * Create from Euler angles (roll, pitch, yaw) in radians
   */
  static fromEuler(roll: number, pitch: number, yaw: number): Quaternion;
  constructor(x: number, y: number, z: number, w: number);
  /**
   * Identity quaternion (no rotation)
   */
  static identity(): Quaternion;
  /**
   * Convert to array [x, y, z, w]
   */
  toArray(): Float64Array;
  /**
   * Convert to Euler angles [roll, pitch, yaw] in radians
   */
  toEuler(): Float64Array;
  x: number;
  y: number;
  z: number;
  w: number;
}
/**
 * RRT* configuration
 */
export class RRTStarConfig {
  free(): void;
  /**
   * Set goal bias
   */
  withGoalBias(goal_bias: number): RRTStarConfig;
  /**
   * Set goal radius
   */
  withGoalRadius(goal_radius: number): RRTStarConfig;
  /**
   * Set max extension
   */
  withMaxExtension(max_extension: number): RRTStarConfig;
  /**
   * Set rewire factor
   */
  withRewireFactor(rewire_factor: number): RRTStarConfig;
  /**
   * Set max iterations
   */
  withMaxIterations(max_iterations: number): RRTStarConfig;
  constructor();
  /**
   * Maximum iterations
   */
  max_iterations: number;
  /**
   * Goal bias probability (0.0 - 1.0)
   */
  goal_bias: number;
  /**
   * Maximum extension distance per step
   */
  max_extension: number;
  /**
   * Goal radius for determining when goal is reached
   */
  goal_radius: number;
  /**
   * Step size for collision checking
   */
  step_size: number;
  /**
   * Rewire radius multiplier (gamma)
   */
  rewire_factor: number;
}
/**
 * RRT* Planner for WASM
 *
 * Optimal path planner that iteratively improves path cost.
 * Provides asymptotically optimal paths but is slower than BiRRT.
 */
export class RRTStarPlanner {
  free(): void;
  /**
   * Plan with collision checking callback
   */
  planWithCollisionCheck(start: Float64Array, goal: Float64Array, collision_checker: Function): PlanningResult;
  /**
   * Create a new RRT* planner
   */
  constructor(joint_limits: JointLimits, config?: RRTStarConfig | null);
  /**
   * Plan a path from start to goal (joint limits only)
   */
  plan(start: Float64Array, goal: Float64Array): PlanningResult;
}
/**
 * Robot wrapper using trajx_core::Robot
 *
 * This is the primary robot class providing full functionality:
 * - URDF parsing from string
 * - Forward and inverse kinematics
 * - Analytical IK for 6-DOF spherical wrist robots (auto-matched from DH database)
 * - All IK solutions (inverseKinematicsAll)
 * - Workspace analysis (manipulability, singularity detection)
 * - Link transforms for visualization
 * - Jacobian computation
 *
 * DH parameters are automatically loaded from database if the URDF robot name
 * matches a known robot. Use `loadDhParamsFromDatabase()` to manually specify
 * which database entry to use.
 */
export class Robot {
  private constructor();
  free(): void;
  /**
   * Get link names
   */
  linkNames(): string[];
  /**
   * List all tool names in the library
   */
  listTools(): any[];
  /**
   * Attach a tool with the given offset
   */
  attachTool(tool_pose: Pose): void;
  /**
   * Detach the current tool
   */
  detachTool(): void;
  /**
   * Create a robot from a URDF string
   *
   * # Arguments
   * * `urdf_content` - The URDF XML content as a string
   *
   * # Example
   * ```js
   * const urdf = `<?xml version="1.0"?>
   * <robot name="my_robot">
   *   <link name="base_link"/>
   *   <link name="link1"/>
   *   <joint name="joint1" type="revolute">
   *     <parent link="base_link"/>
   *     <child link="link1"/>
   *     <origin xyz="0 0 1" rpy="0 0 0"/>
   *     <axis xyz="0 0 1"/>
   *     <limit lower="-3.14" upper="3.14" velocity="1.0" effort="100"/>
   *   </joint>
   * </robot>`;
   * const robot = Robot.fromString(urdf);
   * ```
   */
  static fromString(urdf_content: string): Robot;
  /**
   * Get joint names
   */
  jointNames(): string[];
  /**
   * Check if a target pose is reachable
   *
   * Attempts IK and returns whether a solution exists within joint limits.
   */
  isReachable(target_pose: Pose): boolean;
  /**
   * Activate a tool from the library
   *
   * # Arguments
   * * `tool_name` - Name of the tool to activate
   * * `tcp_name` - Optional TCP name to activate (null for tool's default TCP)
   */
  activateTool(tool_name: string, tcp_name?: string | null): void;
  /**
   * Check if DH parameters are loaded (from database match)
   *
   * Returns true if the robot has DH parameters from the database,
   * which enables analytical IK and DH-based FK.
   */
  hasDhParams(): boolean;
  /**
   * Manually set DH parameters for this robot
   *
   * Use this when the URDF name doesn't match the DH database entry.
   * After calling this, analytical IK will be enabled for 6-DOF robots.
   *
   * # Arguments
   * * `dh_params` - Array of DH parameters (7 rows for 6-DOF: base + 6 joints)
   */
  setDhParams(dh_params: DhParam[]): void;
  /**
   * Set the active TCP on the currently active tool
   */
  setActiveTcp(tcp_name: string): void;
  /**
   * Check if robot is using DH-based FK (vs URDF-based)
   *
   * When true, forward kinematics uses DH parameters for consistency
   * with analytical IK. When false, uses URDF geometry (better for visualization).
   */
  usesDhForFk(): boolean;
  /**
   * Add a TCP point to an existing tool
   *
   * # Arguments
   * * `tool_name` - Name of the tool to add TCP to
   * * `tcp_name` - Name of the TCP point (e.g., "camera", "welder")
   * * `offset` - Transform from tool base to TCP
   */
  addTcpToTool(tool_name: string, tcp_name: string, offset: Pose): void;
  /**
   * Deactivate the current tool
   */
  deactivateTool(): void;
  /**
   * Get the current tool offset (flange to TCP transform)
   *
   * Returns the currently active tool offset, or null if no tool is attached.
   */
  getToolOffset(): Pose | undefined;
  /**
   * Check if joint configuration is within limits
   */
  isValidConfig(joints: Float64Array): boolean;
  /**
   * Get joint limits as [lower..., upper...]
   */
  getJointLimits(): JointLimits;
  /**
   * Get the default standoff (working distance) for a TCP
   */
  getTcpStandoff(tool_name: string, tcp_name: string): number;
  /**
   * Analyze workspace properties at the given joint configuration
   *
   * Returns manipulability, singularity status, and joint limit margins.
   */
  analyzeWorkspace(joint_angles: Float64Array): WorkspaceAnalysis;
  /**
   * Compute forward kinematics (end-effector pose)
   */
  forwardKinematics(joint_angles: Float64Array): Pose;
  /**
   * Compute inverse kinematics
   *
   * Uses analytical IK when available (6-DOF spherical wrist robots),
   * otherwise falls back to numerical IK (Damped Least Squares).
   */
  inverseKinematics(target_pose: Pose, seed?: Float64Array | null): IkResult;
  /**
   * Get the active TCP name on the currently active tool
   */
  getActiveTcpName(): string | undefined;
  /**
   * Get current joint positions
   */
  getJointPositions(): Float64Array;
  /**
   * Get link transforms as a map (for visualization with link names)
   *
   * Returns an object mapping link names to their poses.
   * This is more convenient than forwardKinematicsChain when you need to
   * match transforms to specific link meshes.
   */
  getLinkTransforms(joint_angles: Float64Array): any;
  /**
   * Get velocity limits (if available)
   */
  getVelocityLimits(): Float64Array | undefined;
  /**
   * Check if the robot is near a singularity at the given configuration
   *
   * Returns true if the minimum singular value of the Jacobian is below threshold.
   */
  isNearSingularity(joint_angles: Float64Array, threshold?: number | null): boolean;
  /**
   * Set current joint positions
   */
  setJointPositions(positions: Float64Array): void;
  /**
   * Get the name of the currently active tool
   */
  getActiveToolName(): string | undefined;
  /**
   * Add a TCP with standoff (working distance) configuration
   *
   * # Arguments
   * * `tool_name` - Name of the tool
   * * `tcp_name` - Name of the TCP point
   * * `offset` - Transform from tool base to TCP
   * * `standoff` - Default working distance in meters
   */
  addTcpWithStandoff(tool_name: string, tcp_name: string, offset: Pose, standoff: number): void;
  /**
   * Compute manipulability at the given configuration
   *
   * Returns sqrt(det(J * J^T)), which is zero at singularities.
   */
  computeManipulability(joint_angles: Float64Array): number;
  /**
   * Compute forward kinematics including tool offset (TCP pose)
   *
   * This method returns the pose of the Tool Center Point (TCP) if a tool is attached,
   * otherwise returns the end-effector pose.
   */
  forwardKinematicsTcp(joint_angles: Float64Array): Pose;
  /**
   * Compute inverse kinematics and return ALL solutions
   *
   * For 6-DOF spherical wrist robots, returns all analytical solutions (up to 8).
   * For other robots, returns a single numerical solution.
   *
   * Solutions are verified with forward kinematics and sorted by distance to seed.
   */
  inverseKinematicsAll(target_pose: Pose, seed?: Float64Array | null): MultiIkResult;
  /**
   * Compute inverse kinematics for TCP (Tool Center Point) position
   *
   * This method automatically accounts for the attached tool offset.
   * If a tool is attached via `attachTool()`, this will solve for the
   * joint angles that place the TCP at the target pose, not the flange.
   *
   * If no tool is attached, this behaves identically to `inverseKinematics()`.
   *
   * # Arguments
   * * `target_pose` - Target TCP pose in world frame
   * * `seed` - Optional seed joint angles for numerical solver
   *
   * # Returns
   * IkResult with joint angles that achieve the target TCP pose
   */
  inverseKinematicsTcp(target_pose: Pose, seed?: Float64Array | null): IkResult;
  /**
   * Check if robot supports analytical IK
   *
   * Analytical IK is supported for 6-DOF robots with spherical wrist
   * configurations (e.g., Fanuc, UR, ABB, KUKA, Yaskawa, Staubli).
   */
  supportsAnalyticalIk(): boolean;
  /**
   * Compute the Jacobian matrix at the given configuration
   */
  computeJacobian(joint_angles: Float64Array): Float64Array;
  /**
   * Get acceleration limits (if available)
   */
  getAccelerationLimits(): Float64Array | undefined;
  /**
   * Compute forward kinematics for all links (for visualization)
   *
   * Returns poses for all links in order of link_names.
   */
  forwardKinematicsChain(joint_angles: Float64Array): Pose[];
  /**
   * Forward kinematics to a specific named TCP
   *
   * Computes FK using a specific tool/TCP combination without changing
   * the active tool selection.
   */
  forwardKinematicsNamedTcp(joint_angles: Float64Array, tool_name: string, tcp_name?: string | null): Pose;
  /**
   * Inverse kinematics to reach a target with a specific named TCP
   *
   * Solves IK for a specific tool/TCP combination without changing
   * the active tool selection.
   */
  inverseKinematicsNamedTcp(target_pose: Pose, tool_name: string, tcp_name?: string | null, seed?: Float64Array | null): IkResult;
  /**
   * Load DH parameters from database by robot name
   *
   * Use this when the URDF robot name doesn't match the database entry name.
   * For example, if your URDF has name="my_fanuc" but database has "fanuc_m20ia".
   *
   * # Arguments
   * * `db_robot_name` - Name of the robot in the DH database
   *
   * # Returns
   * true if parameters were loaded successfully
   */
  loadDhParamsFromDatabase(db_robot_name: string): boolean;
  /**
   * Add a named tool to the tool library
   *
   * The tool can have multiple TCPs. After adding, activate it with `activateTool()`.
   *
   * # Arguments
   * * `name` - Tool name (e.g., "welding_torch", "camera_gripper")
   * * `flange_offset` - Transform from flange to tool base frame
   */
  addTool(name: string, flange_offset: Pose): void;
  /**
   * Check if tool is attached
   */
  hasTool(): boolean;
  /**
   * List all TCP names for a specific tool
   */
  listTcps(tool_name: string): any[];
  /**
   * Get degrees of freedom
   */
  readonly dof: number;
  /**
   * Get robot name
   */
  readonly name: string;
}
/**
 * Task-space planning result
 */
export class TaskSpacePlanningResult {
  private constructor();
  free(): void;
  /**
   * Get joint configuration at index
   */
  getJoints(index: number): Float64Array | undefined;
  /**
   * Get all joint configurations as flat array
   * Format: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
   */
  getJointPathFlat(): Float64Array;
  /**
   * Get a specific pose
   */
  getPose(index: number): Pose | undefined;
  readonly iterations: number;
  /**
   * Get path length (sum of joint distances)
   */
  readonly pathLength: number;
  readonly errorMessage: string | undefined;
  /**
   * Get number of waypoints
   */
  readonly waypointCount: number;
  readonly planningTimeMs: number;
  readonly error: string | undefined;
  readonly success: boolean;
  readonly treeSize: number;
}
/**
 * Configuration for task-space RRT planner
 */
export class TaskSpaceRRTConfig {
  free(): void;
  /**
   * Create with custom parameters
   */
  static withParams(max_iterations: number, step_size: number, goal_bias: number): TaskSpaceRRTConfig;
  /**
   * Set goal tolerance
   */
  withGoalTolerance(position: number, orientation: number): TaskSpaceRRTConfig;
  constructor();
  goalBias: number;
  stepSize: number;
  maxIterations: number;
  positionTolerance: number;
  orientationTolerance: number;
}
/**
 * Task-space RRT planner for WASM
 *
 * Plans paths in Cartesian space, using IK to convert to joint space.
 */
export class TaskSpaceRRTPlanner {
  free(): void;
  /**
   * Plan a path from start joints to goal pose
   *
   * This is the main planning method that takes start joint configuration
   * and goal end-effector pose.
   */
  plan(start_joints: Float64Array, goal_pose: Pose): TaskSpacePlanningResult;
  /**
   * Set workspace bounds for sampling
   * Accepts array: [min_x, min_y, min_z, max_x, max_y, max_z]
   */
  setWorkspaceBounds(bounds: Float64Array): void;
  /**
   * Create a new task-space RRT planner from a Robot instance
   *
   * Takes ownership of the robot.
   */
  constructor(robot: Robot, config?: TaskSpaceRRTConfig | null);
}
/**
 * Configuration for trajectory generation
 */
export class TrajectoryConfig {
  free(): void;
  /**
   * Set time step for trajectory sampling
   */
  withTimeStep(time_step: number): TrajectoryConfig;
  /**
   * Set jerk limits for S-curve profile
   */
  withJerkLimits(jerk_max: Float64Array): TrajectoryConfig;
  /**
   * Create new configuration with velocity and acceleration limits
   */
  constructor(velocity_max: Float64Array, acceleration_max: Float64Array);
  /**
   * Get velocity limits
   */
  readonly velocityMax: Float64Array;
  /**
   * Get acceleration limits
   */
  readonly accelerationMax: Float64Array;
  /**
   * Get time step
   */
  readonly timeStep: number;
}
/**
 * Trajectory generator for time-parameterizing paths
 */
export class TrajectoryGenerator {
  free(): void;
  /**
   * Generate a time-parameterized trajectory from a path
   *
   * # Arguments
   * * `path_flat` - Flat path array [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
   *
   * # Returns
   * Time-parameterized trajectory with positions, velocities, and accelerations
   */
  generateFromPath(path_flat: Float64Array): WasmTrajectory;
  /**
   * Generate trajectory from array of waypoints
   *
   * Each waypoint is an array of joint positions.
   */
  generateFromWaypoints(waypoints: Float64Array, dof: number): WasmTrajectory;
  /**
   * Create a new trajectory generator
   */
  constructor(config: TrajectoryConfig);
}
/**
 * Configuration space for motion validation
 */
export class WasmConfigurationSpace {
  free(): void;
  /**
   * Interpolate between two configurations
   */
  interpolate(start: Float64Array, end: Float64Array, t: number): Float64Array;
  /**
   * Check if a configuration is within bounds
   */
  isWithinBounds(config: Float64Array): boolean;
  /**
   * Create from JointLimits
   */
  static fromJointLimits(limits: JointLimits): WasmConfigurationSpace;
  /**
   * Create a new configuration space
   *
   * @param dimensions - Number of joints/DOF
   * @param lower_bounds - Lower joint limits
   * @param upper_bounds - Upper joint limits
   */
  constructor(dimensions: number, lower_bounds: Float64Array, upper_bounds: Float64Array);
  /**
   * Compute distance between two configurations (Euclidean)
   */
  distance(a: Float64Array, b: Float64Array): number;
  /**
   * Get the number of dimensions
   */
  readonly dimensions: number;
  /**
   * Get lower bounds
   */
  readonly lowerBounds: Float64Array;
  /**
   * Get upper bounds
   */
  readonly upperBounds: Float64Array;
}
/**
 * DH Database wrapper for accessing known robot parameters
 */
export class WasmDhDatabase {
  free(): void;
  /**
   * List all available robots in the database
   */
  listRobots(): string[];
  /**
   * Get DH parameters for a robot by name
   */
  getDhParams(name: string): DhParam[];
  /**
   * Create database with hardcoded default robot configurations
   */
  static withDefaults(): WasmDhDatabase;
  /**
   * Get joint limits for a robot by name
   */
  getJointLimits(name: string): JointLimits;
  /**
   * Create a new empty database
   */
  constructor();
  /**
   * Lookup robot config by name
   */
  lookup(name: string): WasmRobotConfig | undefined;
  /**
   * Check if database is empty
   */
  isEmpty(): boolean;
  /**
   * Get number of robots in database
   */
  readonly len: number;
}
/**
 * Discrete motion validator
 *
 * Validates motion by discretizing the path into small steps and checking
 * each intermediate configuration for validity.
 */
export class WasmDiscreteMotionValidator {
  free(): void;
  /**
   * Enable or disable caching
   */
  setCaching(enabled: boolean): void;
  /**
   * Create with caching enabled for dense path generation
   */
  static withCaching(space: WasmConfigurationSpace, max_step_size: number): WasmDiscreteMotionValidator;
  /**
   * Validate an edge and return interpolated points if caching is enabled
   */
  validateEdge(start: Float64Array, end: Float64Array): EdgeValidationResult;
  /**
   * Validate an entire path
   */
  validatePath(path: Float64Array, dof: number): boolean;
  /**
   * Check if a configuration is valid (within bounds)
   */
  isConfigValid(config: Float64Array): boolean;
  /**
   * Validate motion between two configurations (bounds only)
   *
   * Returns true if all intermediate configurations are within bounds.
   */
  validateMotion(start: Float64Array, end: Float64Array): boolean;
  /**
   * Create with default step size (0.1 radians ~ 5.7 degrees)
   */
  static withDefaultStep(space: WasmConfigurationSpace): WasmDiscreteMotionValidator;
  /**
   * Validate an edge with collision checking
   */
  validateEdgeWithCollisionCheck(start: Float64Array, end: Float64Array, collision_checker: Function): EdgeValidationResult;
  /**
   * Validate an entire path with collision checking
   */
  validatePathWithCollisionCheck(path: Float64Array, dof: number, collision_checker: Function): boolean;
  /**
   * Validate motion with JavaScript collision checker callback
   *
   * @param start - Start configuration
   * @param end - End configuration
   * @param collision_checker - Function(config: number[]) => boolean (true = valid)
   */
  validateMotionWithCollisionCheck(start: Float64Array, end: Float64Array, collision_checker: Function): boolean;
  /**
   * Create a new discrete motion validator
   *
   * @param space - Configuration space (will be cloned, original remains valid)
   * @param max_step_size - Maximum step size for discretization (radians)
   */
  constructor(space: WasmConfigurationSpace, max_step_size: number);
  /**
   * Get max step size
   */
  readonly maxStepSize: number;
  /**
   * Check if caching is enabled
   */
  readonly isCachingEnabled: boolean;
}
/**
 * Motion builder for fluent API
 */
export class WasmMotion {
  private constructor();
  free(): void;
  /**
   * Enable cable-aware planning with standard preset (4π limit)
   *
   * This enables cable twist tracking and constrains the path planner
   * to respect cable twist limits during motion planning.
   *
   * # Example
   * ```typescript
   * const result = WasmMotion.to(goal)
   *     .cableAware()
   *     .run(robot);
   * console.log(result.cableTwist);
   * ```
   */
  cableAware(): WasmMotion;
  /**
   * Track cable twist without constraining the planner
   *
   * This only tracks twist during motion without modifying the planned path.
   * Useful for monitoring cable state when twist constraints are soft.
   */
  cableTrack(): WasmMotion;
  /**
   * Set very high smoothness
   */
  verySmooth(): WasmMotion;
  /**
   * Enable cable-aware planning with custom configuration
   *
   * # Example
   * ```typescript
   * const config = new CableConfig().withMaxTotalTwist(2 * Math.PI);
   * const result = WasmMotion.to(goal)
   *     .cableAwareWith(config)
   *     .run(robot);
   * ```
   */
  cableAwareWith(config: CableConfig): WasmMotion;
  /**
   * Set initial cable twist for this motion (for multi-segment tracking)
   *
   * Use this when planning multiple motions in sequence to maintain
   * accumulated twist state between motions.
   */
  withCableTwist(twist: number): WasmMotion;
  /**
   * Create a motion to the target joint positions
   */
  static to(target: Float64Array): WasmMotion;
  /**
   * Execute the motion on the robot
   */
  run(robot: Robot): WasmMotionResult;
  /**
   * Set fast speed (1.0)
   */
  fast(): WasmMotion;
  /**
   * Set the start position (default: robot's current position)
   */
  from(start: Float64Array): WasmMotion;
  /**
   * Plan the motion without executing (returns trajectory)
   */
  plan(robot: Robot): WasmMotionResult;
  /**
   * Enable collision avoidance
   */
  safe(): WasmMotion;
  /**
   * Set slow speed (0.3)
   */
  slow(): WasmMotion;
  /**
   * Use joint interpolation (fastest)
   */
  joint(): WasmMotion;
  /**
   * Set speed scale (0.01 - 1.0)
   */
  speed(scale: number): WasmMotion;
  /**
   * Use linear Cartesian interpolation
   */
  linear(): WasmMotion;
  /**
   * Set smoothness level
   */
  smooth(): WasmMotion;
  /**
   * Use spline interpolation
   */
  spline(): WasmMotion;
  /**
   * Precision mode (slow + very smooth)
   */
  precise(): WasmMotion;
  /**
   * Enable adaptive replanning
   */
  adaptive(): WasmMotion;
  /**
   * Add dwell time at end (milliseconds)
   */
  dwellMs(ms: bigint): WasmMotion;
  /**
   * Verify collision-free (fail if collision detected)
   */
  verified(): WasmMotion;
  /**
   * Use linear Cartesian interpolation at specified TCP speed (mm/s)
   */
  linearAt(tcp_speed_mms: number): WasmMotion;
}
/**
 * Motion execution result
 */
export class WasmMotionResult {
  private constructor();
  free(): void;
  /**
   * Get time at a specific index
   */
  getTimeAt(index: number): number | undefined;
  /**
   * Get trajectory as flat array [t0, j0_0..j0_n, t1, j1_0..j1_n, ...]
   */
  getTrajectory(): Float64Array;
  /**
   * Get joint positions at a specific index
   */
  getPositionsAt(index: number): Float64Array | undefined;
  /**
   * Get number of trajectory points
   */
  readonly numPoints: number;
  /**
   * Get cable twist at end of motion (if cable-aware)
   */
  readonly cableTwist: number | undefined;
  readonly pathLength: number;
  /**
   * Check if motion entered cable warning zone
   */
  readonly cableWarning: boolean;
  /**
   * Check if motion exceeded cable limit
   */
  readonly cableExceeded: boolean;
  readonly collisionFree: boolean;
  /**
   * Get maximum cable twist during motion
   */
  readonly cableMaxTwist: number | undefined;
  readonly planningTimeMs: number;
  /**
   * Check if cable tracking was enabled for this motion
   */
  readonly hasCableTracking: boolean;
  readonly trajectoryDuration: number;
  readonly dof: number;
  readonly executed: boolean;
}
/**
 * Path builder for multi-waypoint motions
 */
export class WasmPath {
  private constructor();
  free(): void;
  /**
   * Execute the path on the robot
   */
  run(robot: Robot): WasmMotionResult;
  /**
   * Set the start position
   */
  from(start: Float64Array): WasmPath;
  /**
   * Enable collision avoidance
   */
  safe(): WasmPath;
  /**
   * Use joint interpolation
   */
  joint(): WasmPath;
  /**
   * Set speed scale
   */
  speed(scale: number): WasmPath;
  /**
   * Use linear Cartesian interpolation
   */
  linear(): WasmPath;
  /**
   * Set smoothness
   */
  smooth(): WasmPath;
  /**
   * Create a path through the given waypoints
   * waypoints: flattened array [wp1_j0, wp1_j1, ..., wp2_j0, wp2_j1, ...]
   * dof: degrees of freedom (to parse the flat array)
   */
  static through(waypoints_flat: Float64Array, dof: number): WasmPath;
}
/**
 * Path quality metrics
 */
export class WasmPathMetrics {
  free(): void;
  constructor();
  /**
   * Get improvement ratio (path length reduction)
   */
  readonly improvementRatio: number;
  /**
   * Get waypoint reduction ratio
   */
  readonly waypointReductionRatio: number;
  /**
   * Number of waypoints in the path
   */
  waypoint_count: number;
  /**
   * Total path length in configuration space
   */
  path_length: number;
  /**
   * Path smoothness (sum of squared accelerations)
   */
  smoothness: number;
  /**
   * Original waypoint count (before optimization)
   */
  original_waypoint_count: number;
  /**
   * Original path length (before optimization)
   */
  original_path_length: number;
}
/**
 * Configuration for the planning pipeline
 */
export class WasmPipelineConfig {
  free(): void;
  /**
   * Create with custom parameters
   */
  static withParams(shortcut_iterations: number, smooth_iterations: number, smoothing_factor: number): WasmPipelineConfig;
  /**
   * Enable or disable metrics calculation
   */
  withMetrics(enable: boolean): WasmPipelineConfig;
  /**
   * Enable or disable post-processing
   */
  withPostProcessing(enable: boolean): WasmPipelineConfig;
  /**
   * Set smoothing factor
   */
  withSmoothingFactor(factor: number): WasmPipelineConfig;
  /**
   * Set smooth iterations
   */
  withSmoothIterations(iterations: number): WasmPipelineConfig;
  /**
   * Set shortcut iterations
   */
  withShortcutIterations(iterations: number): WasmPipelineConfig;
  constructor();
  /**
   * Enable path post-processing (shortcutting + smoothing)
   */
  enable_post_processing: boolean;
  /**
   * Maximum iterations for shortcutting
   */
  shortcut_iterations: number;
  /**
   * Maximum iterations for smoothing
   */
  smooth_iterations: number;
  /**
   * Smoothing factor (0.0 to 1.0)
   */
  smoothing_factor: number;
  /**
   * Enable path quality metrics calculation
   */
  calculate_metrics: boolean;
}
/**
 * Pipeline processing result
 */
export class WasmPipelineResult {
  private constructor();
  free(): void;
  /**
   * Get a specific waypoint by index
   */
  getWaypoint(index: number): Float64Array;
  /**
   * Get number of waypoints
   */
  readonly numWaypoints: number;
  /**
   * Check if path was post-processed
   */
  readonly postProcessed: boolean;
  /**
   * Get processing time in milliseconds
   */
  readonly processingTimeMs: number;
  /**
   * Get DOF
   */
  readonly dof: number;
  /**
   * Get the optimized path as flat array
   */
  readonly path: Float64Array;
  /**
   * Get path metrics
   */
  readonly metrics: WasmPathMetrics;
}
/**
 * Planning pipeline for path optimization
 *
 * Provides shortcutting and smoothing operations on planned paths.
 */
export class WasmPlanningPipeline {
  free(): void;
  /**
   * Apply only smoothing to a path
   */
  smoothPath(path_flat: Float64Array, dof: number, collision_checker?: Function | null): WasmPipelineResult;
  /**
   * Set step size for collision checking
   */
  setStepSize(step_size: number): void;
  /**
   * Apply only shortcutting to a path
   */
  shortcutPath(path_flat: Float64Array, dof: number, collision_checker?: Function | null): WasmPipelineResult;
  /**
   * Calculate path metrics without optimization
   */
  calculateMetrics(path_flat: Float64Array, dof: number): WasmPathMetrics;
  /**
   * Process a path with collision checking
   *
   * @param path_flat - Flat array of waypoints
   * @param dof - Degrees of freedom
   * @param collision_checker - Function(config: number[]) => boolean (true = valid)
   */
  processWithCollisionCheck(path_flat: Float64Array, dof: number, collision_checker: Function): WasmPipelineResult;
  /**
   * Create a new planning pipeline
   */
  constructor(joint_limits: JointLimits, config?: WasmPipelineConfig | null);
  /**
   * Process a path through the pipeline (bounds checking only)
   *
   * @param path_flat - Flat array of waypoints
   * @param dof - Degrees of freedom
   */
  process(path_flat: Float64Array, dof: number): WasmPipelineResult;
}
/**
 * Robot configuration from the DH database
 */
export class WasmRobotConfig {
  private constructor();
  free(): void;
  /**
   * Get DH parameters
   */
  getDhParams(): DhParam[];
  /**
   * Get jerk limits (if available)
   */
  getJerkLimits(): Float64Array | undefined;
  /**
   * Get joint limits (if available)
   */
  getJointLimits(): JointLimits;
  /**
   * Get velocity limits (if available)
   */
  getVelocityLimits(): Float64Array | undefined;
  /**
   * Get acceleration limits (if available)
   */
  getAccelerationLimits(): Float64Array | undefined;
  /**
   * Robot description
   */
  readonly description: string;
  /**
   * Degrees of freedom
   */
  readonly dof: number;
  /**
   * Robot name
   */
  readonly name: string;
}
/**
 * Sequence builder for chaining motions
 */
export class WasmSequence {
  private constructor();
  free(): void;
  /**
   * Enable cable-aware tracking for the entire sequence
   *
   * This tracks cable twist across all motions in the sequence,
   * accumulating twist from motion to motion.
   */
  cableAware(): WasmSequence;
  /**
   * Enable cable-aware tracking with custom configuration
   */
  cableAwareWith(config: CableConfig): WasmSequence;
  /**
   * Set initial cable twist for the sequence
   */
  withCableTwist(twist: number): WasmSequence;
  /**
   * Execute all motions in sequence
   */
  run(robot: Robot): WasmMotionResult;
  /**
   * Add another motion to the sequence
   */
  then(motion: WasmMotion): WasmSequence;
  /**
   * Start a sequence with the first motion
   */
  static start(motion: WasmMotion): WasmSequence;
}
/**
 * A single TCP (Tool Center Point) definition for WASM
 *
 * Represents a point of interest on a tool with optional standoff distance.
 */
export class WasmTcpPoint {
  free(): void;
  /**
   * Get TCP offset as pose
   */
  getOffset(): Pose;
  /**
   * Set the default standoff distance (mutating version)
   */
  setStandoff(standoff: number): void;
  /**
   * Set the default standoff distance (builder pattern - consumes self)
   * Note: After calling this, the original object becomes invalid in JS
   */
  withStandoff(standoff: number): WasmTcpPoint;
  /**
   * Get approach axis as [x, y, z]
   */
  getApproachAxis(): Float64Array;
  /**
   * Set the approach axis (mutating version)
   */
  setApproachAxis(x: number, y: number, z: number): void;
  /**
   * Validate if a standoff value is within range
   */
  validateStandoff(standoff: number): boolean;
  /**
   * Get standoff range [min, max] or null
   */
  getStandoffRange(): Float64Array | undefined;
  /**
   * Set the standoff range (mutating version)
   */
  setStandoffRange(min: number, max: number): void;
  /**
   * Set the approach axis (builder pattern - consumes self)
   */
  withApproachAxis(x: number, y: number, z: number): WasmTcpPoint;
  /**
   * Set the standoff range (builder pattern - consumes self)
   */
  withStandoffRange(min: number, max: number): WasmTcpPoint;
  /**
   * Create a new TCP point
   *
   * # Arguments
   * * `name` - Human-readable name for this TCP
   * * `position` - Position offset [x, y, z] from tool base frame
   * * `orientation` - Quaternion [x, y, z, w] from tool base frame
   */
  constructor(name: string, position: Float64Array, orientation: Float64Array);
  /**
   * Create a simple TCP point with just position offset
   */
  static simple(name: string, x: number, y: number, z: number): WasmTcpPoint;
  /**
   * Get default standoff
   */
  readonly defaultStandoff: number;
  /**
   * Get TCP name
   */
  readonly name: string;
}
/**
 * A tool attached to the robot's end effector
 *
 * A tool can have multiple TCP (Tool Center Point) definitions for different
 * operations. For example, a vision-welder tool might have a "camera" TCP
 * for inspection and a "welder" TCP for welding.
 */
export class WasmTool {
  free(): void;
  /**
   * Remove a TCP by name
   */
  removeTcp(name: string): boolean;
  /**
   * Add a TCP with full parameters
   */
  addTcpFull(name: string, position: Float64Array, orientation: Float64Array, standoff: number, standoff_min: number, standoff_max: number, approach_axis: Float64Array): void;
  /**
   * Add a simple TCP with just position
   */
  addSimpleTcp(name: string, x: number, y: number, z: number): void;
  /**
   * Get specific TCP offset by name
   */
  getTcpOffset(name: string): Pose;
  /**
   * Set the active TCP
   */
  setActiveTcp(name: string): void;
  /**
   * Create a simple tool with just position offset
   */
  static simplePosition(name: string, x: number, y: number, z: number): WasmTool;
  /**
   * Clear the active TCP (use default)
   */
  clearActiveTcp(): void;
  /**
   * Clear all obstacle exclusions
   */
  clearExclusions(): void;
  /**
   * Exclude an obstacle from collision checking
   */
  excludeObstacle(obstacle_id: string): void;
  /**
   * Include an obstacle back into collision checking
   */
  includeObstacle(obstacle_id: string): void;
  /**
   * Get flange offset as pose
   */
  getFlangeOffset(): Pose;
  /**
   * Set flange offset (from robot flange to tool base frame)
   */
  setFlangeOffset(position: Float64Array, orientation: Float64Array): void;
  /**
   * Validate standoff for active TCP
   */
  validateStandoff(standoff: number): boolean;
  /**
   * Get center of mass
   */
  getCenterOfMass(): Float64Array | undefined;
  /**
   * Set center of mass
   */
  setCenterOfMass(x: number, y: number, z: number): void;
  /**
   * Check if an obstacle is excluded
   */
  isObstacleExcluded(obstacle_id: string): boolean;
  /**
   * Compute standoff pose given a target point and approach direction
   *
   * # Arguments
   * * `target_point` - Target point on workpiece [x, y, z]
   * * `approach_direction` - Direction to approach from [x, y, z]
   * * `standoff_distance` - Distance to maintain from target
   */
  computeStandoffPose(target_point: Float64Array, approach_direction: Float64Array, standoff_distance: number): Pose;
  /**
   * Get active TCP offset as pose (flange to TCP)
   */
  getActiveTcpOffset(): Pose;
  /**
   * Get list of excluded obstacles
   */
  getExcludedObstacles(): string[];
  /**
   * Get active TCP standoff range
   */
  getActiveStandoffRange(): Float64Array | undefined;
  /**
   * Get active TCP default standoff
   */
  getActiveDefaultStandoff(): number;
  /**
   * Create a new empty tool
   */
  constructor(name: string);
  /**
   * Create a simple tool with a single default TCP
   */
  static simple(name: string, position: Float64Array, orientation: Float64Array): WasmTool;
  /**
   * Add a TCP to this tool
   *
   * # Arguments
   * * `name` - TCP name
   * * `position` - Position offset [x, y, z] from tool base
   * * `orientation` - Quaternion [x, y, z, w]
   * * `standoff` - Optional default standoff distance
   */
  addTcp(name: string, position: Float64Array, orientation: Float64Array, standoff?: number | null): void;
  /**
   * Set tool mass
   */
  setMass(mass: number): void;
  /**
   * Get all TCP names
   */
  tcpNames(): string[];
  /**
   * Get tool length (distance from flange to active TCP)
   */
  readonly toolLength: number;
  /**
   * Check if tool has multiple TCPs
   */
  readonly isMultiTcp: boolean;
  /**
   * Check if tool has collision geometries
   */
  readonly hasCollision: boolean;
  /**
   * Get active TCP name (or null)
   */
  readonly activeTcpName: string | undefined;
  /**
   * Get the collision link name for this tool
   */
  readonly collisionLinkName: string;
  /**
   * Get tool mass
   */
  readonly mass: number | undefined;
  /**
   * Get tool name
   */
  readonly name: string;
  /**
   * Get number of TCPs
   */
  readonly tcpCount: number;
}
/**
 * Library for managing multiple tools
 *
 * Allows switching between different tools attached to the robot.
 */
export class WasmToolLibrary {
  free(): void;
  /**
   * Get all tool names
   */
  toolNames(): string[];
  /**
   * Remove a tool from the library
   */
  removeTool(name: string): boolean;
  /**
   * Activate a tool by name
   */
  activateTool(name: string): void;
  /**
   * Set active TCP on active tool
   */
  setActiveTcp(tcp_name: string): void;
  /**
   * Deactivate current tool
   */
  deactivateTool(): void;
  /**
   * Get active tool offset (flange to TCP)
   */
  getActiveToolOffset(): Pose | undefined;
  /**
   * Create a new empty tool library
   */
  constructor();
  /**
   * Activate tool and set TCP in one call
   */
  activate(tool_name: string, tcp_name?: string | null): void;
  /**
   * Add a tool to the library
   */
  addTool(tool: WasmTool): void;
  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean;
  /**
   * Get active tool name
   */
  readonly activeToolName: string | undefined;
  /**
   * Get number of tools
   */
  readonly len: number;
  /**
   * Check if library is empty
   */
  readonly isEmpty: boolean;
}
/**
 * Generated trajectory result
 */
export class WasmTrajectory {
  private constructor();
  free(): void;
  /**
   * Get all positions as flat array [t0_j0, t0_j1, ..., t1_j0, t1_j1, ...]
   */
  getPositionsFlat(): Float64Array;
  /**
   * Get all velocities as flat array
   */
  getVelocitiesFlat(): Float64Array;
  /**
   * Get all accelerations as flat array
   */
  getAccelerationsFlat(): Float64Array;
  /**
   * Sample trajectory at a specific time
   *
   * Uses linear interpolation between trajectory points.
   */
  sample(time: number): WasmTrajectoryPoint | undefined;
  /**
   * Get a specific point by index
   */
  getPoint(index: number): WasmTrajectoryPoint | undefined;
  /**
   * Get all times as array
   */
  getTimes(): Float64Array;
  /**
   * Get number of joints
   */
  readonly numJoints: number;
  /**
   * Get number of points
   */
  readonly numPoints: number;
  /**
   * Get trajectory duration in seconds
   */
  readonly duration: number;
}
/**
 * A single trajectory point with time, position, velocity, and acceleration
 */
export class WasmTrajectoryPoint {
  private constructor();
  free(): void;
  /**
   * Get joint velocities
   */
  readonly velocities: Float64Array;
  /**
   * Get joint accelerations
   */
  readonly accelerations: Float64Array;
  /**
   * Get time in seconds
   */
  readonly time: number;
  /**
   * Get joint positions
   */
  readonly positions: Float64Array;
}
/**
 * Workspace analysis result
 */
export class WorkspaceAnalysis {
  private constructor();
  free(): void;
  readonly isReachable: boolean;
  readonly manipulability: number;
  readonly conditionNumber: number;
  readonly isNearSingular: boolean;
  readonly minSingularValue: number;
  readonly jointLimitMargins: Float64Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_birrtconfig_free: (a: number, b: number) => void;
  readonly __wbg_birrtplanner_free: (a: number, b: number) => void;
  readonly __wbg_dhparam_free: (a: number, b: number) => void;
  readonly __wbg_edgevalidationresult_free: (a: number, b: number) => void;
  readonly __wbg_get_birrtconfig_connect_threshold: (a: number) => number;
  readonly __wbg_get_birrtconfig_goal_bias: (a: number) => number;
  readonly __wbg_get_birrtconfig_max_extension: (a: number) => number;
  readonly __wbg_get_birrtconfig_max_iterations: (a: number) => number;
  readonly __wbg_get_birrtconfig_step_size: (a: number) => number;
  readonly __wbg_get_motionvalidationstats_configs_checked: (a: number) => number;
  readonly __wbg_get_motionvalidationstats_invalid_configs: (a: number) => number;
  readonly __wbg_get_motionvalidationstats_valid_configs: (a: number) => number;
  readonly __wbg_get_prmconfig_k_neighbors: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_max_iterations: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_rewire_factor: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_original_waypoint_count: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_waypoint_count: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_calculate_metrics: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_enable_post_processing: (a: number) => number;
  readonly __wbg_ikresult_free: (a: number, b: number) => void;
  readonly __wbg_jointlimits_free: (a: number, b: number) => void;
  readonly __wbg_kinematiclimits_free: (a: number, b: number) => void;
  readonly __wbg_motionvalidationstats_free: (a: number, b: number) => void;
  readonly __wbg_multiikresult_free: (a: number, b: number) => void;
  readonly __wbg_pathoptimizer_free: (a: number, b: number) => void;
  readonly __wbg_planningresult_free: (a: number, b: number) => void;
  readonly __wbg_pose_free: (a: number, b: number) => void;
  readonly __wbg_prmplanner_free: (a: number, b: number) => void;
  readonly __wbg_robot_free: (a: number, b: number) => void;
  readonly __wbg_rrtstarconfig_free: (a: number, b: number) => void;
  readonly __wbg_rrtstarplanner_free: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_connect_threshold: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_goal_bias: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_max_extension: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_max_iterations: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_step_size: (a: number, b: number) => void;
  readonly __wbg_set_motionvalidationstats_configs_checked: (a: number, b: number) => void;
  readonly __wbg_set_motionvalidationstats_invalid_configs: (a: number, b: number) => void;
  readonly __wbg_set_motionvalidationstats_valid_configs: (a: number, b: number) => void;
  readonly __wbg_set_prmconfig_k_neighbors: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_max_iterations: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_rewire_factor: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_original_waypoint_count: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_waypoint_count: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_calculate_metrics: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_enable_post_processing: (a: number, b: number) => void;
  readonly __wbg_taskspaceplanningresult_free: (a: number, b: number) => void;
  readonly __wbg_taskspacerrtplanner_free: (a: number, b: number) => void;
  readonly __wbg_trajectoryconfig_free: (a: number, b: number) => void;
  readonly __wbg_trajectorygenerator_free: (a: number, b: number) => void;
  readonly __wbg_wasmconfigurationspace_free: (a: number, b: number) => void;
  readonly __wbg_wasmdhdatabase_free: (a: number, b: number) => void;
  readonly __wbg_wasmdiscretemotionvalidator_free: (a: number, b: number) => void;
  readonly __wbg_wasmmotion_free: (a: number, b: number) => void;
  readonly __wbg_wasmmotionresult_free: (a: number, b: number) => void;
  readonly __wbg_wasmpath_free: (a: number, b: number) => void;
  readonly __wbg_wasmpipelineresult_free: (a: number, b: number) => void;
  readonly __wbg_wasmplanningpipeline_free: (a: number, b: number) => void;
  readonly __wbg_wasmrobotconfig_free: (a: number, b: number) => void;
  readonly __wbg_wasmsequence_free: (a: number, b: number) => void;
  readonly __wbg_wasmtcppoint_free: (a: number, b: number) => void;
  readonly __wbg_wasmtool_free: (a: number, b: number) => void;
  readonly __wbg_wasmtoollibrary_free: (a: number, b: number) => void;
  readonly __wbg_wasmtrajectory_free: (a: number, b: number) => void;
  readonly __wbg_wasmtrajectorypoint_free: (a: number, b: number) => void;
  readonly __wbg_workspaceanalysis_free: (a: number, b: number) => void;
  readonly batchForwardKinematics: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly batchForwardKinematicsEndEffector: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly batchForwardKinematicsF32: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly birrtconfig_new: () => number;
  readonly birrtconfig_withConnectionThreshold: (a: number, b: number) => number;
  readonly birrtconfig_withGoalBias: (a: number, b: number) => number;
  readonly birrtconfig_withMaxExtension: (a: number, b: number) => number;
  readonly birrtconfig_withMaxIterations: (a: number, b: number) => number;
  readonly birrtconfig_withParams: (a: number, b: number, c: number) => number;
  readonly birrtplanner_new: (a: number, b: number) => number;
  readonly birrtplanner_plan: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly birrtplanner_planWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly cablePresetHeavyDuty: () => number;
  readonly cablePresetLight: () => number;
  readonly cablePresetPrecision: () => number;
  readonly cablePresetStandard: () => number;
  readonly cableconfig_autoUnwindEnabled: (a: number) => number;
  readonly cableconfig_initialTwist: (a: number) => number;
  readonly cableconfig_isTwistValid: (a: number, b: number) => number;
  readonly cableconfig_isTwistWarning: (a: number, b: number) => number;
  readonly cableconfig_maxTotalTwist: (a: number) => number;
  readonly cableconfig_maxTwistRate: (a: number) => number;
  readonly cableconfig_warningThreshold: (a: number) => number;
  readonly cableconfig_withAutoUnwind: (a: number, b: number) => number;
  readonly cableconfig_withMaxTotalTwist: (a: number, b: number) => number;
  readonly cableconfig_withWarningThreshold: (a: number, b: number) => number;
  readonly computePathLength: (a: number, b: number, c: number) => number;
  readonly computePathSmoothness: (a: number, b: number, c: number) => number;
  readonly createRobot: (a: number, b: number, c: number) => void;
  readonly createSimpleTrajectory: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly dhparam_new: (a: number, b: number, c: number, d: number) => number;
  readonly edgevalidationresult_getPoint: (a: number, b: number, c: number) => void;
  readonly edgevalidationresult_interpolatedPoints: (a: number, b: number) => void;
  readonly edgevalidationresult_numPoints: (a: number) => number;
  readonly edgevalidationresult_valid: (a: number) => number;
  readonly forwardKinematicsChainDh: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly forwardKinematicsDh: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly ikresult_error: (a: number, b: number) => void;
  readonly ikresult_errorMessage: (a: number, b: number) => void;
  readonly ikresult_isAnalytical: (a: number) => number;
  readonly ikresult_iterations: (a: number) => number;
  readonly ikresult_solution: (a: number, b: number) => void;
  readonly ikresult_success: (a: number) => number;
  readonly interpolatePathFlat: (a: number, b: number, c: number, d: number) => void;
  readonly inverseKinematicsDh: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
  readonly is_ready: () => number;
  readonly jointlimits_clamp: (a: number, b: number, c: number, d: number) => void;
  readonly jointlimits_dof: (a: number) => number;
  readonly jointlimits_isValid: (a: number, b: number, c: number) => number;
  readonly jointlimits_lower: (a: number, b: number) => void;
  readonly jointlimits_new: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly jointlimits_upper: (a: number, b: number) => void;
  readonly kinematiclimits_maxAcceleration: (a: number, b: number) => void;
  readonly kinematiclimits_maxJerk: (a: number, b: number) => void;
  readonly kinematiclimits_maxVelocity: (a: number, b: number) => void;
  readonly kinematiclimits_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly kinematiclimits_uniform: (a: number, b: number, c: number, d: number) => number;
  readonly listDhDatabase: (a: number) => void;
  readonly listSupportedRobots: (a: number) => void;
  readonly motionconstraints_collision: (a: number) => number;
  readonly motionconstraints_dwell_ms: (a: number, b: number) => void;
  readonly motionconstraints_new: () => number;
  readonly motionconstraints_smoothness: (a: number) => number;
  readonly motionvalidationstats_new: () => number;
  readonly motionvalidationstats_validityRatio: (a: number) => number;
  readonly multiikresult_errorMessage: (a: number, b: number) => void;
  readonly multiikresult_getPositionError: (a: number, b: number, c: number) => void;
  readonly multiikresult_getSolution: (a: number, b: number, c: number) => void;
  readonly multiikresult_getSolutionsFlat: (a: number, b: number) => void;
  readonly multiikresult_isAnalytical: (a: number) => number;
  readonly multiikresult_positionErrors: (a: number, b: number) => void;
  readonly multiikresult_solutionCount: (a: number) => number;
  readonly multiikresult_success: (a: number) => number;
  readonly pathoptimizer_new: (a: number) => number;
  readonly pathoptimizer_shortcut: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly pathoptimizer_shortcutWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly planningresult_error: (a: number, b: number) => void;
  readonly planningresult_getPathFlat: (a: number, b: number) => void;
  readonly planningresult_getWaypoint: (a: number, b: number, c: number) => void;
  readonly planningresult_nodesExplored: (a: number) => number;
  readonly planningresult_waypointCount: (a: number) => number;
  readonly pose_fromPositionEuler: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly pose_getOrientationArray: (a: number, b: number) => void;
  readonly pose_getPositionArray: (a: number, b: number) => void;
  readonly pose_identity: () => number;
  readonly pose_new: (a: number, b: number) => number;
  readonly pose_orientation: (a: number) => number;
  readonly pose_position: (a: number) => number;
  readonly pose_toMatrix4: (a: number, b: number) => void;
  readonly position_fromArray: (a: number, b: number, c: number) => void;
  readonly position_new: (a: number, b: number, c: number) => number;
  readonly position_toArray: (a: number, b: number) => void;
  readonly prmconfig_new: () => number;
  readonly prmconfig_withKNeighbors: (a: number, b: number) => number;
  readonly prmconfig_withMaxConnectionDistance: (a: number, b: number) => number;
  readonly prmconfig_withNumSamples: (a: number, b: number) => number;
  readonly prmplanner_buildRoadmap: (a: number) => number;
  readonly prmplanner_buildRoadmapWithCollisionCheck: (a: number, b: number) => number;
  readonly prmplanner_clearRoadmap: (a: number) => void;
  readonly prmplanner_isRoadmapBuilt: (a: number) => number;
  readonly prmplanner_new: (a: number, b: number) => number;
  readonly prmplanner_query: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly prmplanner_queryWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly prmplanner_roadmapSize: (a: number) => number;
  readonly quaternion_fromEuler: (a: number, b: number, c: number) => number;
  readonly quaternion_identity: () => number;
  readonly quaternion_toArray: (a: number, b: number) => void;
  readonly quaternion_toEuler: (a: number, b: number) => void;
  readonly robot_activateTool: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly robot_addTcpToTool: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly robot_addTcpWithStandoff: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly robot_addTool: (a: number, b: number, c: number, d: number) => void;
  readonly robot_analyzeWorkspace: (a: number, b: number, c: number, d: number) => void;
  readonly robot_attachTool: (a: number, b: number) => void;
  readonly robot_computeJacobian: (a: number, b: number, c: number, d: number) => void;
  readonly robot_computeManipulability: (a: number, b: number, c: number, d: number) => void;
  readonly robot_deactivateTool: (a: number) => void;
  readonly robot_detachTool: (a: number) => void;
  readonly robot_dof: (a: number) => number;
  readonly robot_forwardKinematics: (a: number, b: number, c: number, d: number) => void;
  readonly robot_forwardKinematicsChain: (a: number, b: number, c: number, d: number) => void;
  readonly robot_forwardKinematicsNamedTcp: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly robot_forwardKinematicsTcp: (a: number, b: number, c: number, d: number) => void;
  readonly robot_getAccelerationLimits: (a: number, b: number) => void;
  readonly robot_getActiveTcpName: (a: number, b: number) => void;
  readonly robot_getActiveToolName: (a: number, b: number) => void;
  readonly robot_getJointLimits: (a: number) => number;
  readonly robot_getJointPositions: (a: number, b: number) => void;
  readonly robot_getLinkTransforms: (a: number, b: number, c: number, d: number) => void;
  readonly robot_getTcpStandoff: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly robot_getToolOffset: (a: number) => number;
  readonly robot_getVelocityLimits: (a: number, b: number) => void;
  readonly robot_hasDhParams: (a: number) => number;
  readonly robot_hasTool: (a: number) => number;
  readonly robot_inverseKinematics: (a: number, b: number, c: number, d: number) => number;
  readonly robot_inverseKinematicsAll: (a: number, b: number, c: number, d: number) => number;
  readonly robot_inverseKinematicsNamedTcp: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly robot_inverseKinematicsTcp: (a: number, b: number, c: number, d: number) => number;
  readonly robot_isNearSingularity: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly robot_isReachable: (a: number, b: number) => number;
  readonly robot_isValidConfig: (a: number, b: number, c: number) => number;
  readonly robot_jointNames: (a: number, b: number) => void;
  readonly robot_linkNames: (a: number, b: number) => void;
  readonly robot_listTcps: (a: number, b: number, c: number, d: number) => void;
  readonly robot_listTools: (a: number, b: number) => void;
  readonly robot_loadDhParamsFromDatabase: (a: number, b: number, c: number) => number;
  readonly robot_name: (a: number, b: number) => void;
  readonly robot_setActiveTcp: (a: number, b: number, c: number, d: number) => void;
  readonly robot_setDhParams: (a: number, b: number, c: number) => void;
  readonly robot_setJointPositions: (a: number, b: number, c: number, d: number) => void;
  readonly robot_supportsAnalyticalIk: (a: number) => number;
  readonly robot_usesDhForFk: (a: number) => number;
  readonly rrtstarconfig_new: () => number;
  readonly rrtstarconfig_withGoalBias: (a: number, b: number) => number;
  readonly rrtstarconfig_withGoalRadius: (a: number, b: number) => number;
  readonly rrtstarconfig_withMaxExtension: (a: number, b: number) => number;
  readonly rrtstarconfig_withMaxIterations: (a: number, b: number) => number;
  readonly rrtstarconfig_withRewireFactor: (a: number, b: number) => number;
  readonly rrtstarplanner_new: (a: number, b: number) => number;
  readonly rrtstarplanner_plan: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly rrtstarplanner_planWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly taskspaceplanningresult_error: (a: number, b: number) => void;
  readonly taskspaceplanningresult_getJointPathFlat: (a: number, b: number) => void;
  readonly taskspaceplanningresult_getJoints: (a: number, b: number, c: number) => void;
  readonly taskspaceplanningresult_getPose: (a: number, b: number) => number;
  readonly taskspaceplanningresult_iterations: (a: number) => number;
  readonly taskspaceplanningresult_pathLength: (a: number) => number;
  readonly taskspaceplanningresult_success: (a: number) => number;
  readonly taskspaceplanningresult_treeSize: (a: number) => number;
  readonly taskspaceplanningresult_waypointCount: (a: number) => number;
  readonly taskspacerrtconfig_new: () => number;
  readonly taskspacerrtconfig_set_goalBias: (a: number, b: number) => void;
  readonly taskspacerrtconfig_set_maxIterations: (a: number, b: number) => void;
  readonly taskspacerrtconfig_set_orientationTolerance: (a: number, b: number) => void;
  readonly taskspacerrtconfig_set_positionTolerance: (a: number, b: number) => void;
  readonly taskspacerrtconfig_set_stepSize: (a: number, b: number) => void;
  readonly taskspacerrtconfig_withGoalTolerance: (a: number, b: number, c: number) => number;
  readonly taskspacerrtconfig_withParams: (a: number, b: number, c: number) => number;
  readonly taskspacerrtplanner_new: (a: number, b: number) => number;
  readonly taskspacerrtplanner_plan: (a: number, b: number, c: number, d: number) => number;
  readonly taskspacerrtplanner_setWorkspaceBounds: (a: number, b: number, c: number) => void;
  readonly trajectoryconfig_accelerationMax: (a: number, b: number) => void;
  readonly trajectoryconfig_new: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly trajectoryconfig_velocityMax: (a: number, b: number) => void;
  readonly trajectoryconfig_withJerkLimits: (a: number, b: number, c: number, d: number) => void;
  readonly trajectoryconfig_withTimeStep: (a: number, b: number, c: number) => void;
  readonly trajectorygenerator_generateFromPath: (a: number, b: number, c: number, d: number) => void;
  readonly trajectorygenerator_generateFromWaypoints: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly trajectorygenerator_new: (a: number) => number;
  readonly version: (a: number) => void;
  readonly wasmconfigurationspace_dimensions: (a: number) => number;
  readonly wasmconfigurationspace_distance: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly wasmconfigurationspace_fromJointLimits: (a: number) => number;
  readonly wasmconfigurationspace_interpolate: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmconfigurationspace_isWithinBounds: (a: number, b: number, c: number) => number;
  readonly wasmconfigurationspace_lowerBounds: (a: number, b: number) => void;
  readonly wasmconfigurationspace_new: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmconfigurationspace_upperBounds: (a: number, b: number) => void;
  readonly wasmdhdatabase_getDhParams: (a: number, b: number, c: number, d: number) => void;
  readonly wasmdhdatabase_getJointLimits: (a: number, b: number, c: number, d: number) => void;
  readonly wasmdhdatabase_isEmpty: (a: number) => number;
  readonly wasmdhdatabase_len: (a: number) => number;
  readonly wasmdhdatabase_listRobots: (a: number, b: number) => void;
  readonly wasmdhdatabase_lookup: (a: number, b: number, c: number) => number;
  readonly wasmdhdatabase_new: () => number;
  readonly wasmdhdatabase_withDefaults: () => number;
  readonly wasmdiscretemotionvalidator_isCachingEnabled: (a: number) => number;
  readonly wasmdiscretemotionvalidator_isConfigValid: (a: number, b: number, c: number) => number;
  readonly wasmdiscretemotionvalidator_new: (a: number, b: number, c: number) => void;
  readonly wasmdiscretemotionvalidator_setCaching: (a: number, b: number) => void;
  readonly wasmdiscretemotionvalidator_validateEdge: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmdiscretemotionvalidator_validateEdgeWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmdiscretemotionvalidator_validateMotion: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmdiscretemotionvalidator_validateMotionWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmdiscretemotionvalidator_validatePath: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasmdiscretemotionvalidator_validatePathWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmdiscretemotionvalidator_withCaching: (a: number, b: number, c: number) => void;
  readonly wasmdiscretemotionvalidator_withDefaultStep: (a: number) => number;
  readonly wasmmotion_adaptive: (a: number) => number;
  readonly wasmmotion_cableAware: (a: number) => number;
  readonly wasmmotion_cableAwareWith: (a: number, b: number) => number;
  readonly wasmmotion_cableTrack: (a: number) => number;
  readonly wasmmotion_dwellMs: (a: number, b: bigint) => number;
  readonly wasmmotion_fast: (a: number) => number;
  readonly wasmmotion_from: (a: number, b: number, c: number) => number;
  readonly wasmmotion_joint: (a: number) => number;
  readonly wasmmotion_linear: (a: number) => number;
  readonly wasmmotion_linearAt: (a: number, b: number) => number;
  readonly wasmmotion_plan: (a: number, b: number, c: number) => void;
  readonly wasmmotion_precise: (a: number) => number;
  readonly wasmmotion_run: (a: number, b: number, c: number) => void;
  readonly wasmmotion_safe: (a: number) => number;
  readonly wasmmotion_slow: (a: number) => number;
  readonly wasmmotion_smooth: (a: number) => number;
  readonly wasmmotion_speed: (a: number, b: number) => number;
  readonly wasmmotion_spline: (a: number) => number;
  readonly wasmmotion_to: (a: number, b: number) => number;
  readonly wasmmotion_verified: (a: number) => number;
  readonly wasmmotion_verySmooth: (a: number) => number;
  readonly wasmmotion_withCableTwist: (a: number, b: number) => number;
  readonly wasmmotionresult_cableExceeded: (a: number) => number;
  readonly wasmmotionresult_cableMaxTwist: (a: number, b: number) => void;
  readonly wasmmotionresult_cableWarning: (a: number) => number;
  readonly wasmmotionresult_collisionFree: (a: number) => number;
  readonly wasmmotionresult_dof: (a: number) => number;
  readonly wasmmotionresult_executed: (a: number) => number;
  readonly wasmmotionresult_getPositionsAt: (a: number, b: number, c: number) => void;
  readonly wasmmotionresult_getTimeAt: (a: number, b: number, c: number) => void;
  readonly wasmmotionresult_getTrajectory: (a: number, b: number) => void;
  readonly wasmmotionresult_hasCableTracking: (a: number) => number;
  readonly wasmmotionresult_numPoints: (a: number) => number;
  readonly wasmmotionresult_pathLength: (a: number) => number;
  readonly wasmmotionresult_planningTimeMs: (a: number) => number;
  readonly wasmmotionresult_trajectoryDuration: (a: number) => number;
  readonly wasmpath_from: (a: number, b: number, c: number) => number;
  readonly wasmpath_joint: (a: number) => number;
  readonly wasmpath_linear: (a: number) => number;
  readonly wasmpath_run: (a: number, b: number, c: number) => void;
  readonly wasmpath_safe: (a: number) => number;
  readonly wasmpath_smooth: (a: number) => number;
  readonly wasmpath_speed: (a: number, b: number) => number;
  readonly wasmpath_through: (a: number, b: number, c: number, d: number) => void;
  readonly wasmpathmetrics_improvementRatio: (a: number) => number;
  readonly wasmpathmetrics_new: () => number;
  readonly wasmpathmetrics_waypointReductionRatio: (a: number) => number;
  readonly wasmpipelineconfig_new: () => number;
  readonly wasmpipelineconfig_withMetrics: (a: number, b: number) => number;
  readonly wasmpipelineconfig_withParams: (a: number, b: number, c: number) => number;
  readonly wasmpipelineconfig_withPostProcessing: (a: number, b: number) => number;
  readonly wasmpipelineconfig_withShortcutIterations: (a: number, b: number) => number;
  readonly wasmpipelineconfig_withSmoothIterations: (a: number, b: number) => number;
  readonly wasmpipelineconfig_withSmoothingFactor: (a: number, b: number) => number;
  readonly wasmpipelineresult_getWaypoint: (a: number, b: number, c: number) => void;
  readonly wasmpipelineresult_path: (a: number, b: number) => void;
  readonly wasmpipelineresult_postProcessed: (a: number) => number;
  readonly wasmplanningpipeline_calculateMetrics: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasmplanningpipeline_new: (a: number, b: number) => number;
  readonly wasmplanningpipeline_process: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasmplanningpipeline_processWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmplanningpipeline_setStepSize: (a: number, b: number) => void;
  readonly wasmplanningpipeline_shortcutPath: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmplanningpipeline_smoothPath: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmrobotconfig_description: (a: number, b: number) => void;
  readonly wasmrobotconfig_dof: (a: number) => number;
  readonly wasmrobotconfig_getAccelerationLimits: (a: number, b: number) => void;
  readonly wasmrobotconfig_getDhParams: (a: number, b: number) => void;
  readonly wasmrobotconfig_getJerkLimits: (a: number, b: number) => void;
  readonly wasmrobotconfig_getJointLimits: (a: number, b: number) => void;
  readonly wasmrobotconfig_getVelocityLimits: (a: number, b: number) => void;
  readonly wasmrobotconfig_name: (a: number, b: number) => void;
  readonly wasmsequence_cableAware: (a: number) => number;
  readonly wasmsequence_cableAwareWith: (a: number, b: number) => number;
  readonly wasmsequence_run: (a: number, b: number, c: number) => void;
  readonly wasmsequence_start: (a: number) => number;
  readonly wasmsequence_then: (a: number, b: number) => number;
  readonly wasmsequence_withCableTwist: (a: number, b: number) => number;
  readonly wasmtcppoint_defaultStandoff: (a: number) => number;
  readonly wasmtcppoint_getApproachAxis: (a: number, b: number) => void;
  readonly wasmtcppoint_getOffset: (a: number) => number;
  readonly wasmtcppoint_getStandoffRange: (a: number, b: number) => void;
  readonly wasmtcppoint_name: (a: number, b: number) => void;
  readonly wasmtcppoint_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmtcppoint_setApproachAxis: (a: number, b: number, c: number, d: number) => void;
  readonly wasmtcppoint_setStandoff: (a: number, b: number) => void;
  readonly wasmtcppoint_setStandoffRange: (a: number, b: number, c: number) => void;
  readonly wasmtcppoint_simple: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly wasmtcppoint_validateStandoff: (a: number, b: number) => number;
  readonly wasmtcppoint_withApproachAxis: (a: number, b: number, c: number, d: number) => number;
  readonly wasmtcppoint_withStandoff: (a: number, b: number) => number;
  readonly wasmtcppoint_withStandoffRange: (a: number, b: number, c: number) => number;
  readonly wasmtool_activeTcpName: (a: number, b: number) => void;
  readonly wasmtool_addSimpleTcp: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmtool_addTcp: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
  readonly wasmtool_addTcpFull: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => void;
  readonly wasmtool_clearActiveTcp: (a: number) => void;
  readonly wasmtool_clearExclusions: (a: number) => void;
  readonly wasmtool_collisionLinkName: (a: number, b: number) => void;
  readonly wasmtool_computeStandoffPose: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmtool_excludeObstacle: (a: number, b: number, c: number) => void;
  readonly wasmtool_getActiveDefaultStandoff: (a: number) => number;
  readonly wasmtool_getActiveStandoffRange: (a: number, b: number) => void;
  readonly wasmtool_getActiveTcpOffset: (a: number) => number;
  readonly wasmtool_getCenterOfMass: (a: number, b: number) => void;
  readonly wasmtool_getExcludedObstacles: (a: number, b: number) => void;
  readonly wasmtool_getFlangeOffset: (a: number) => number;
  readonly wasmtool_getTcpOffset: (a: number, b: number, c: number, d: number) => void;
  readonly wasmtool_hasCollision: (a: number) => number;
  readonly wasmtool_includeObstacle: (a: number, b: number, c: number) => void;
  readonly wasmtool_isMultiTcp: (a: number) => number;
  readonly wasmtool_isObstacleExcluded: (a: number, b: number, c: number) => number;
  readonly wasmtool_name: (a: number, b: number) => void;
  readonly wasmtool_new: (a: number, b: number) => number;
  readonly wasmtool_removeTcp: (a: number, b: number, c: number) => number;
  readonly wasmtool_setActiveTcp: (a: number, b: number, c: number, d: number) => void;
  readonly wasmtool_setCenterOfMass: (a: number, b: number, c: number, d: number) => void;
  readonly wasmtool_setFlangeOffset: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmtool_setMass: (a: number, b: number) => void;
  readonly wasmtool_simple: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmtool_simplePosition: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly wasmtool_tcpCount: (a: number) => number;
  readonly wasmtool_tcpNames: (a: number, b: number) => void;
  readonly wasmtool_toolLength: (a: number) => number;
  readonly wasmtool_validateStandoff: (a: number, b: number) => number;
  readonly wasmtoollibrary_activate: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmtoollibrary_activateTool: (a: number, b: number, c: number, d: number) => void;
  readonly wasmtoollibrary_activeToolName: (a: number, b: number) => void;
  readonly wasmtoollibrary_addTool: (a: number, b: number) => void;
  readonly wasmtoollibrary_deactivateTool: (a: number) => void;
  readonly wasmtoollibrary_getActiveToolOffset: (a: number) => number;
  readonly wasmtoollibrary_hasTool: (a: number, b: number, c: number) => number;
  readonly wasmtoollibrary_len: (a: number) => number;
  readonly wasmtoollibrary_new: () => number;
  readonly wasmtoollibrary_removeTool: (a: number, b: number, c: number) => number;
  readonly wasmtoollibrary_setActiveTcp: (a: number, b: number, c: number, d: number) => void;
  readonly wasmtoollibrary_toolNames: (a: number, b: number) => void;
  readonly wasmtrajectory_duration: (a: number) => number;
  readonly wasmtrajectory_getAccelerationsFlat: (a: number, b: number) => void;
  readonly wasmtrajectory_getPoint: (a: number, b: number) => number;
  readonly wasmtrajectory_getPositionsFlat: (a: number, b: number) => void;
  readonly wasmtrajectory_getTimes: (a: number, b: number) => void;
  readonly wasmtrajectory_getVelocitiesFlat: (a: number, b: number) => void;
  readonly wasmtrajectory_numPoints: (a: number) => number;
  readonly wasmtrajectory_sample: (a: number, b: number) => number;
  readonly wasmtrajectorypoint_accelerations: (a: number, b: number) => void;
  readonly wasmtrajectorypoint_positions: (a: number, b: number) => void;
  readonly wasmtrajectorypoint_velocities: (a: number, b: number) => void;
  readonly workspaceanalysis_isNearSingular: (a: number) => number;
  readonly workspaceanalysis_jointLimitMargins: (a: number, b: number) => void;
  readonly init: () => void;
  readonly wasmpipelineresult_metrics: (a: number) => number;
  readonly ikresult_message: (a: number, b: number) => void;
  readonly taskspaceplanningresult_errorMessage: (a: number, b: number) => void;
  readonly __wbg_set_dhparam_a: (a: number, b: number) => void;
  readonly __wbg_set_dhparam_alpha: (a: number, b: number) => void;
  readonly __wbg_set_dhparam_d: (a: number, b: number) => void;
  readonly __wbg_set_dhparam_theta: (a: number, b: number) => void;
  readonly __wbg_set_motionvalidationstats_total_time_ms: (a: number, b: number) => void;
  readonly __wbg_set_position_x: (a: number, b: number) => void;
  readonly __wbg_set_position_y: (a: number, b: number) => void;
  readonly __wbg_set_position_z: (a: number, b: number) => void;
  readonly __wbg_set_prmconfig_max_connection_distance: (a: number, b: number) => void;
  readonly __wbg_set_prmconfig_num_samples: (a: number, b: number) => void;
  readonly __wbg_set_prmconfig_step_size: (a: number, b: number) => void;
  readonly __wbg_set_quaternion_w: (a: number, b: number) => void;
  readonly __wbg_set_quaternion_x: (a: number, b: number) => void;
  readonly __wbg_set_quaternion_y: (a: number, b: number) => void;
  readonly __wbg_set_quaternion_z: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_goal_bias: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_goal_radius: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_max_extension: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_step_size: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_original_path_length: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_path_length: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_smoothness: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_shortcut_iterations: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_smooth_iterations: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_smoothing_factor: (a: number, b: number) => void;
  readonly cableconfig_withMaxTwistRate: (a: number, b: number) => number;
  readonly ikresult_positionError: (a: number, b: number) => void;
  readonly wasmmotionresult_cableTwist: (a: number, b: number) => void;
  readonly wasmtool_mass: (a: number, b: number) => void;
  readonly robot_fromString: (a: number, b: number, c: number) => void;
  readonly planningresult_success: (a: number) => number;
  readonly workspaceanalysis_isReachable: (a: number) => number;
  readonly quaternion_new: (a: number, b: number, c: number, d: number) => number;
  readonly __wbg_get_dhparam_a: (a: number) => number;
  readonly __wbg_get_dhparam_alpha: (a: number) => number;
  readonly __wbg_get_dhparam_d: (a: number) => number;
  readonly __wbg_get_dhparam_theta: (a: number) => number;
  readonly __wbg_get_motionvalidationstats_total_time_ms: (a: number) => number;
  readonly __wbg_get_position_x: (a: number) => number;
  readonly __wbg_get_position_y: (a: number) => number;
  readonly __wbg_get_position_z: (a: number) => number;
  readonly __wbg_get_prmconfig_max_connection_distance: (a: number) => number;
  readonly __wbg_get_prmconfig_num_samples: (a: number) => number;
  readonly __wbg_get_prmconfig_step_size: (a: number) => number;
  readonly __wbg_get_quaternion_w: (a: number) => number;
  readonly __wbg_get_quaternion_x: (a: number) => number;
  readonly __wbg_get_quaternion_y: (a: number) => number;
  readonly __wbg_get_quaternion_z: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_goal_bias: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_goal_radius: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_max_extension: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_step_size: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_original_path_length: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_path_length: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_smoothness: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_shortcut_iterations: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_smooth_iterations: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_smoothing_factor: (a: number) => number;
  readonly planningresult_pathFlat: (a: number, b: number) => void;
  readonly cableconfig_withInitialTwist: (a: number, b: number) => number;
  readonly cableconfig_new: () => number;
  readonly motionconstraints_speed_scale: (a: number) => number;
  readonly planningresult_pathLength: (a: number) => number;
  readonly planningresult_planningTimeMs: (a: number) => number;
  readonly taskspaceplanningresult_planningTimeMs: (a: number) => number;
  readonly taskspacerrtconfig_goalBias: (a: number) => number;
  readonly taskspacerrtconfig_maxIterations: (a: number) => number;
  readonly taskspacerrtconfig_orientationTolerance: (a: number) => number;
  readonly taskspacerrtconfig_positionTolerance: (a: number) => number;
  readonly taskspacerrtconfig_stepSize: (a: number) => number;
  readonly trajectoryconfig_timeStep: (a: number) => number;
  readonly wasmdiscretemotionvalidator_maxStepSize: (a: number) => number;
  readonly wasmpipelineresult_dof: (a: number) => number;
  readonly wasmpipelineresult_numWaypoints: (a: number) => number;
  readonly wasmpipelineresult_processingTimeMs: (a: number) => number;
  readonly wasmtrajectory_numJoints: (a: number) => number;
  readonly wasmtrajectorypoint_time: (a: number) => number;
  readonly workspaceanalysis_conditionNumber: (a: number) => number;
  readonly workspaceanalysis_manipulability: (a: number) => number;
  readonly workspaceanalysis_minSingularValue: (a: number) => number;
  readonly __wbg_cableconfig_free: (a: number, b: number) => void;
  readonly __wbg_motionconstraints_free: (a: number, b: number) => void;
  readonly __wbg_position_free: (a: number, b: number) => void;
  readonly __wbg_prmconfig_free: (a: number, b: number) => void;
  readonly __wbg_quaternion_free: (a: number, b: number) => void;
  readonly __wbg_taskspacerrtconfig_free: (a: number, b: number) => void;
  readonly __wbg_wasmpathmetrics_free: (a: number, b: number) => void;
  readonly __wbg_wasmpipelineconfig_free: (a: number, b: number) => void;
  readonly wasmtoollibrary_isEmpty: (a: number) => number;
  readonly __wbindgen_export_0: (a: number) => void;
  readonly __wbindgen_export_1: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_2: (a: number, b: number) => number;
  readonly __wbindgen_export_3: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
