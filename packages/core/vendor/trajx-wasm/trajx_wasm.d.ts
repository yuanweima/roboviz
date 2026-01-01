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
 * Batch interpolate multiple edges at once
 *
 * Optimized for GPU batch processing - interpolates all edges and returns
 * a flat array ready for batch FK computation.
 *
 * # Arguments
 * * `edges_flat` - Flattened edges: [s1_0, s1_1, ..., e1_0, e1_1, ..., s2_0, ...]
 * * `dof` - Degrees of freedom (number of joints)
 * * `num_samples` - Samples per edge
 *
 * # Returns
 * All interpolated points as flat array, organized by edge then by sample
 */
export function interpolateEdgesBatch(edges_flat: Float64Array, dof: number, num_samples: number): Float64Array;
/**
 * Check if all samples in a batch result are collision-free
 *
 * Helper to process results from batch FK + collision checking.
 *
 * # Arguments
 * * `collision_results` - Flat array of collision results (true = collision, false = free)
 * * `samples_per_edge` - Number of samples checked per edge
 *
 * # Returns
 * Array of edge results (true = collision-free for entire edge)
 */
export function aggregateBatchResults(collision_results: Array<any>, samples_per_edge: number): Array<any>;
/**
 * Generate TypeScript code for creating a batch edge checker function
 *
 * This generates a JavaScript function that can be used with `GpuPlanningContext.planPath()`.
 * Users copy this template and customize it for their collision detection setup.
 *
 * # Example
 * ```typescript
 * // Get the template code
 * const template = generateBatchCheckerTemplate(config);
 * console.log(template);
 *
 * // Output:
 * // function checkEdgesBatch(edges) {
 * //   return edges.map(([startJoints, endJoints]) => {
 * //     for (let t = 0; t <= 1; t += 0.25) {
 * //       const joints = startJoints.map((s, i) => s + t * (endJoints[i] - s));
 * //       const poses = robot.getLinkTransforms(joints);
 * //       if (robotCollision.isSelfCollidingFast(poses)) return false;
 * //       if (!robotCollision.isConfigCollisionFree(env, poses)) return false;
 * //     }
 * //     return true;
 * //   });
 * // }
 * ```
 */
export function generateBatchCheckerTemplate(config?: BatchCollisionCheckerConfig | null): string;
/**
 * Helper function to create a GPU planning pipeline
 *
 * Returns a JavaScript object with all necessary components for GPU planning.
 *
 * # Example
 * ```typescript
 * const pipeline = await createGpuPlanningPipeline(robot, urdfContent);
 * console.log(`Ready: ${pipeline.robotCollision.totalGeometries} geometries`);
 *
 * const result = pipeline.planner.planPath(start, goal, pipeline.checkEdges);
 * ```
 */
export function createGpuPlanningPipeline(robot: Robot, config?: GpuPlanningContextConfig | null): any;
/**
 * Helper to interpolate joint configurations
 *
 * Creates intermediate joint configurations between start and end.
 * Useful for implementing custom batch collision checkers.
 *
 * # Arguments
 * * `start` - Start joint configuration
 * * `end` - End joint configuration
 * * `num_samples` - Number of samples (including start and end)
 *
 * # Returns
 * Flattened array of all joint configurations: [s0, s1, ..., sn, m0_0, m0_1, ..., e0, e1, ..., en]
 */
export function interpolateEdge(start: Float64Array, end: Float64Array, num_samples: number): Float64Array;
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
 * Batch forward kinematics with Float32 input/output for WebGL/InstancedMesh compatibility
 *
 * Same as batchForwardKinematics but uses Float32Array for zero-copy with GPU buffers.
 */
export function batchForwardKinematicsF32(dh_params: DhParam[], joint_angles_flat: Float32Array, robot_count: number, joint_count: number): Float32Array;
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
 * Compute forward kinematics for visualization (returns all link poses)
 *
 * # Returns
 * Array of poses for each link (useful for rendering robot in 3D)
 */
export function forwardKinematicsChainDh(dh_params: DhParam[], joint_angles: Float64Array): Pose[];
/**
 * Create a simple trajectory from waypoints using default limits
 */
export function createSimpleTrajectory(waypoints: Float64Array, dof: number, max_velocity: number, max_acceleration: number): WasmTrajectory;
/**
 * Get list of all supported robot names from the default database
 */
export function listSupportedRobots(): string[];
/**
 * Create RobotContext with custom config (convenience function)
 *
 * ```typescript
 * const config = RobotContextConfig.fast();
 * const ctx = createRobotContextWithConfig(urdfContent, config);
 * ```
 */
export function createRobotContextWithConfig(urdf_content: string, config: RobotContextConfig): RobotContext;
/**
 * Create RobotContext from URDF (convenience function)
 *
 * ```typescript
 * const ctx = createRobotContext(urdfContent);
 * ```
 */
export function createRobotContext(urdf_content: string): RobotContext;
/**
 * Run a performance comparison between GPU and CPU collision detection
 *
 * Tests sphere-sphere collision detection with the specified number of pairs.
 *
 * # Arguments
 * * `num_pairs` - Number of collision pairs to test
 *
 * # Returns
 * GpuVsCpuComparison with timing results
 */
export function benchmarkGpuVsCpu(num_pairs: number): Promise<GpuVsCpuComparison>;
/**
 * Helper: Create a JavaScript collision checker function for GPU planning
 *
 * Generates a template function that can be customized for your collision setup.
 *
 * # Example
 * ```typescript
 * const checkerCode = getGpuCollisionCheckerTemplate(5);
 * console.log(checkerCode);
 * // Copy and customize the template for your use case
 * ```
 */
export function getGpuCollisionCheckerTemplate(samples_per_edge: number): string;
/**
 * Run a comprehensive GPU benchmark with multiple batch sizes
 *
 * Tests GPU collision detection at various batch sizes to find optimal performance.
 *
 * # Arguments
 * * `sizes` - Array of batch sizes to test
 *
 * # Returns
 * Array of GpuVsCpuComparison results
 */
export function benchmarkGpuBatchSizes(sizes: Uint32Array): Promise<Array<any>>;
/**
 * Check if WebGPU is available for integrated planning
 */
export function isIntegratedGpuPlanningAvailable(): Promise<boolean>;
/**
 * Check if the library is initialized
 */
export function is_ready(): boolean;
/**
 * Initialize panic hook for better error messages in browser console
 */
export function init(): void;
/**
 * Get the library version
 */
export function version(): string;
/**
 * Check if WebGPU is available in the current browser
 */
export function isWebGpuAvailable(): Promise<boolean>;
/**
 * Get a standard cable configuration (4π limit, 2 full rotations / 720°)
 */
export function cablePresetStandard(): CableConfig;
/**
 * Get a heavy-duty cable configuration (2π limit, 1 full rotation / 360°)
 * For thick, stiff cables that cannot twist much
 */
export function cablePresetHeavyDuty(): CableConfig;
/**
 * Get a precision cable configuration (2π limit with auto-unwind)
 * For applications requiring minimal cable stress
 */
export function cablePresetPrecision(): CableConfig;
/**
 * Get a light cable configuration (8π limit, 4 full rotations / 1440°)
 * For thin, flexible cables
 */
export function cablePresetLight(): CableConfig;
/**
 * Compute path smoothness from flat array (sum of squared accelerations)
 */
export function computePathSmoothness(path_flat: Float64Array, dof: number): number;
/**
 * Compute path length from flat array
 */
export function computePathLength(path_flat: Float64Array, dof: number): number;
/**
 * Interpolate between waypoints with specified resolution
 * Input/output as flat array: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
 */
export function interpolatePathFlat(path_flat: Float64Array, resolution: number): Float64Array;
/**
 * Check edges between waypoints for collisions (interpolated checking)
 *
 * @param path_flat - Flat array of waypoints
 * @param dof - Degrees of freedom
 * @param collision_checker - Function(config: number[]) => boolean (true = valid)
 * @param step_size - Step size for interpolation
 */
export function checkPathEdgesCollision(path_flat: Float64Array, dof: number, collision_checker: Function, step_size: number): PathCollisionResult;
/**
 * Check a path for collisions
 *
 * @param path_flat - Flat array of waypoints
 * @param dof - Degrees of freedom
 * @param collision_checker - Function(config: number[]) => boolean (true = valid)
 * @param stop_at_first - Stop checking after first collision
 */
export function checkPathCollision(path_flat: Float64Array, dof: number, collision_checker: Function, stop_at_first: boolean): PathCollisionResult;
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
  /**
   * GPU-accelerated batch planning with Lazy-PRM
   * Uses batch collision checking optimized for GPU/WebGPU
   */
  GpuBatch = 4,
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
 * Async GPU planning result that returns a Promise
 *
 * This allows integration with async JavaScript code and WebGPU.
 */
export class AsyncGpuPlanningContext {
  free(): void;
  /**
   * Build the roadmap (synchronous, but exposed for consistency)
   */
  buildRoadmap(): void;
  /**
   * Plan a path with Promise-based result handling
   *
   * This method wraps the synchronous planning in a Promise for easier
   * integration with async JavaScript code. The collision checker callback
   * is still invoked synchronously during planning.
   *
   * Note: For truly async collision checking (e.g., WebGPU compute shaders
   * that return Promises), use `GpuPlanningContext.planPath()` with a
   * synchronous wrapper callback that blocks on the Promise. WebGPU dispatch
   * is typically fast enough that sync callbacks work well in practice.
   *
   * # Arguments
   * * `start` - Start joint configuration
   * * `goal` - Goal joint configuration
   * * `check_edges` - Collision checker callback: (edges: [start[], end[]][]) => boolean[]
   *
   * # Returns
   * Promise<GpuPlanningResult>
   *
   * # Example
   * ```typescript
   * const asyncPlanner = new AsyncGpuPlanningContext(robot);
   * asyncPlanner.buildRoadmap();
   *
   * // Collision checker (called synchronously during planning)
   * function checkEdges(edges) {
   *     return edges.map(([start, end]) => isEdgeFree(start, end));
   * }
   *
   * // await for Promise-based result
   * const result = await asyncPlanner.planPathAsync(start, goal, checkEdges);
   * if (result.success) {
   *     console.log(`Found path with ${result.waypointCount} waypoints`);
   * }
   * ```
   */
  planPathAsync(start: Float64Array, goal: Float64Array, check_edges: Function): Promise<any>;
  /**
   * Check if roadmap is built
   */
  isRoadmapBuilt(): boolean;
  /**
   * Reset edge validation cache
   */
  resetValidations(): void;
  /**
   * Create an async GPU planning context
   *
   * This wraps GpuPlanningContext to provide Promise-based methods.
   */
  constructor(robot: Robot, config?: GpuPlanningContextConfig | null);
  /**
   * Get edge count
   */
  readonly edgeCount: number;
  /**
   * Get node count
   */
  readonly nodeCount: number;
}
/**
 * Batch collision checker for efficient multi-configuration checking
 */
export class BatchCollisionChecker {
  free(): void;
  /**
   * Check multiple configurations for environment collision
   *
   * @param configs_flat - Flat array of configurations [c1_j1, c1_j2, ..., c2_j1, c2_j2, ...]
   * @param dof - Degrees of freedom (number of joints)
   * @param collision_checker - Function(config: number[]) => boolean (true = valid)
   */
  checkBatch(configs_flat: Float64Array, dof: number, collision_checker: Function): BatchCollisionResult;
  /**
   * Create a new batch collision checker
   */
  constructor(env: CollisionEnvironment);
}
/**
 * Configuration for creating a batch collision checker
 */
export class BatchCollisionCheckerConfig {
  free(): void;
  /**
   * Set safety margin
   */
  withSafetyMargin(margin: number): BatchCollisionCheckerConfig;
  /**
   * Set whether to check self-collision
   */
  withSelfCollision(enabled: boolean): BatchCollisionCheckerConfig;
  /**
   * Set samples per edge
   */
  withSamplesPerEdge(n: number): BatchCollisionCheckerConfig;
  constructor();
  /**
   * Fast preset: fewer samples for quicker checking
   */
  static fast(): BatchCollisionCheckerConfig;
  /**
   * Accurate preset: more samples for thorough checking
   */
  static accurate(): BatchCollisionCheckerConfig;
  /**
   * Number of samples per edge (5 = start + 3 intermediate + end)
   */
  samples_per_edge: number;
  /**
   * Whether to include self-collision checking
   */
  check_self_collision: boolean;
  /**
   * Safety margin in meters
   */
  safety_margin: number;
}
/**
 * Result of batch collision checking
 */
export class BatchCollisionResult {
  private constructor();
  free(): void;
  /**
   * Get indices of valid configurations
   */
  getValidIndices(): Uint32Array;
  /**
   * Get indices of invalid (colliding) configurations
   */
  getInvalidIndices(): Uint32Array;
  /**
   * Get result for specific index
   */
  isValid(index: number): boolean;
  /**
   * Get number of configurations checked
   */
  readonly numChecked: number;
  /**
   * Get total checking time in ms
   */
  readonly totalTimeMs: number;
  /**
   * Get validity ratio
   */
  readonly validityRatio: number;
  /**
   * Get average time per configuration in ms
   */
  readonly avgTimePerConfig: number;
  /**
   * Get all results as array
   */
  readonly results: Uint8Array;
  /**
   * Get number of valid (collision-free) configurations
   */
  readonly numValid: number;
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
 * This is a thin wrapper around `trajx_planning::planners::core::BiRRTCore`.
 * It provides WASM bindings that allow JavaScript to use the planner with
 * callback-based collision checking.
 *
 * ## Performance
 *
 * Uses KD-Tree acceleration for O(log n) nearest neighbor queries.
 * Typical planning time: 0.07-10 ms for simple 6-DOF queries.
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
   * Plan with dense-path collision checking callback
   *
   * Returns a densely sampled path with all validated intermediate points.
   * The callback receives joint configuration and returns true if valid (no collision).
   */
  planDenseWithCollisionCheck(start: Float64Array, goal: Float64Array, collision_checker: Function): PlanningResult;
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
 * Collision environment for managing obstacles
 *
 * Provides efficient collision checking against a set of obstacles.
 */
export class CollisionEnvironment {
  free(): void;
  /**
   * Add a sphere obstacle
   *
   * # Arguments
   * * `id` - Unique identifier for the obstacle
   * * `radius` - Sphere radius
   * * `position` - Center position [x, y, z]
   */
  addSphere(id: string, radius: number, position: Float64Array): void;
  /**
   * Ignore all collisions involving a specific link
   */
  ignoreLink(link_name: string): void;
  /**
   * Add a cylinder obstacle
   *
   * # Arguments
   * * `id` - Unique identifier for the obstacle
   * * `radius` - Cylinder radius
   * * `half_height` - Half height of the cylinder
   * * `pose` - Pose of the obstacle
   */
  addCylinder(id: string, radius: number, half_height: number, pose: Pose): void;
  /**
   * Get all obstacle IDs
   */
  obstacleIds(): string[];
  /**
   * Unignore all collisions involving a specific link
   */
  unignoreLink(link_name: string): void;
  /**
   * Ignore all collisions with a specific obstacle
   */
  ignoreObstacle(obstacle_id: string): void;
  /**
   * Remove an obstacle by ID
   */
  removeObstacle(id: string): boolean;
  /**
   * Get all obstacle IDs (both simple and composite)
   */
  allObstacleIds(): string[];
  /**
   * Get list of ignored links
   */
  getIgnoredLinks(): string[];
  /**
   * Check if a pose is collision-free (simplified check using a small sphere)
   *
   * # Arguments
   * * `position` - Position to check [x, y, z]
   * * `radius` - Collision radius (default: 0.01)
   */
  isCollisionFree(position: Float64Array, radius?: number | null): boolean;
  /**
   * Check if all obstacles are GPU-compatible
   *
   * Returns true if all obstacles are Sphere, Box, Capsule, or Cylinder.
   * Meshes and other complex shapes are not GPU-compatible.
   */
  isGpuCompatible(): boolean;
  /**
   * Unignore all collisions with a specific obstacle
   */
  unignoreObstacle(obstacle_id: string): void;
  /**
   * Remove any obstacle (simple or composite) by ID
   */
  removeAnyObstacle(id: string): boolean;
  /**
   * Update the pose of an obstacle
   */
  updateObstaclePose(id: string, pose: Pose): void;
  /**
   * Check if a shape at given pose collides with any obstacle
   *
   * # Arguments
   * * `shape_type` - Type of shape: "box", "sphere", "cylinder"
   * * `params` - Shape parameters (depends on type)
   * * `pose` - Pose of the shape
   */
  checkShapeCollision(shape_type: string, params: Float64Array, pose: Pose): boolean;
  /**
   * Get list of ignored obstacles
   */
  getIgnoredObstacles(): string[];
  /**
   * Add a composite obstacle to the environment
   */
  addCompositeObstacle(obstacle: WasmCompositeObstacle): void;
  /**
   * Get all composite obstacle IDs
   */
  compositeObstacleIds(): string[];
  /**
   * Get count of GPU-incompatible obstacles
   *
   * Useful for determining how many obstacles need conversion.
   */
  countGpuIncompatible(): number;
  /**
   * Convert environment obstacles to capsule approximations for GPU collision
   *
   * This creates a new CollisionEnvironment where complex shapes (meshes, boxes,
   * cylinders) are converted to capsule approximations. The resulting environment
   * is optimized for GPU-accelerated collision detection.
   *
   * # Example
   * ```typescript
   * const env = new CollisionEnvironment();
   * env.addBox("table", [0.5, 0.3, 0.02], tablePose);
   *
   * const options = WasmEnvironmentCapsuleOptions.gpuOptimized();
   * const { env: gpuEnv, stats } = env.toCapsuleApproximation(options);
   * console.log(`Converted ${stats.obstaclesConverted} obstacles to ${stats.capsulesGenerated} capsules`);
   * ```
   */
  toCapsuleApproximation(options: WasmEnvironmentCapsuleOptions): WasmEnvironmentCapsuleResult;
  /**
   * Ignore collision between a link and an obstacle
   */
  ignoreLinkObstaclePair(link_name: string, obstacle_id: string): void;
  /**
   * Remove a composite obstacle by ID
   */
  removeCompositeObstacle(id: string): boolean;
  /**
   * Unignore collision between a link and an obstacle
   */
  unignoreLinkObstaclePair(link_name: string, obstacle_id: string): void;
  /**
   * Check if a link-obstacle pair is ignored
   */
  isLinkObstaclePairIgnored(link_name: string, obstacle_id: string): boolean;
  /**
   * Update composite obstacle pose
   */
  updateCompositeObstaclePose(id: string, pose: Pose): void;
  /**
   * Create a new empty collision environment
   */
  constructor();
  /**
   * Clear all obstacles
   */
  clear(): void;
  /**
   * Add a box obstacle
   *
   * # Arguments
   * * `id` - Unique identifier for the obstacle
   * * `half_extents` - Half dimensions [x, y, z]
   * * `pose` - Pose of the obstacle
   */
  addBox(id: string, half_extents: Float64Array, pose: Pose): void;
  /**
   * Clear all ACM settings
   */
  clearAcm(): void;
  /**
   * Get number of obstacles
   */
  readonly numObstacles: number;
  /**
   * Get total number of obstacles (simple + composite)
   */
  readonly totalObstacles: number;
  /**
   * Get number of composite obstacles
   */
  readonly numCompositeObstacles: number;
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
 * Result of a distance query
 */
export class DistanceQueryResult {
  private constructor();
  free(): void;
  /**
   * Get closest point on first object as array
   */
  getPoint1(): Float64Array;
  /**
   * Get closest point on second object as array
   */
  getPoint2(): Float64Array;
  /**
   * Distance between objects (negative if penetrating)
   */
  distance: number;
  /**
   * Closest point on first object
   */
  point1_x: number;
  point1_y: number;
  point1_z: number;
  /**
   * Closest point on second object
   */
  point2_x: number;
  point2_y: number;
  point2_z: number;
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
 * Result of a GPU batch collision check
 */
export class GpuBatchResult {
  private constructor();
  free(): void;
  /**
   * Get distance for pair at index
   */
  getDistance(index: number): number;
  /**
   * Check if pair at index is colliding
   */
  isColliding(index: number): boolean;
  /**
   * Get number of colliding pairs
   */
  readonly collisionCount: number;
  /**
   * Get collision flags as array (1 = colliding, 0 = not colliding)
   */
  readonly collisionFlags: Uint32Array;
  /**
   * Get number of pairs checked
   */
  readonly count: number;
  /**
   * Get signed distances (negative = penetrating)
   */
  readonly distances: Float32Array;
}
/**
 * GPU-accelerated collision context for WASM
 *
 * Provides high-performance batch collision detection using WebGPU.
 * Best suited for checking many collision pairs simultaneously.
 */
export class GpuCollisionContext {
  private constructor();
  free(): void;
  /**
   * Get device information string
   */
  deviceInfo(): string;
  /**
   * Get the GPU batch threshold (minimum pairs for GPU to be faster)
   */
  gpuThreshold(): number;
  /**
   * Check mixed shape collisions in batch (async)
   *
   * This is the most flexible API that supports any combination of shapes.
   *
   * # Arguments
   * * `shape_types1` - Array of shape type indices (0=sphere, 1=box, 2=capsule, 3=cylinder)
   * * `shape_params1` - Flat array of shape parameters (8 floats per shape)
   * * `poses1` - Flat array of [x, y, z, qx, qy, qz, qw] poses
   * * `shape_types2` - Array of shape type indices
   * * `shape_params2` - Flat array of shape parameters
   * * `poses2` - Flat array of poses
   */
  checkMixedAsync(shape_types1: Uint32Array, shape_params1: Float64Array, poses1: Float64Array, shape_types2: Uint32Array, shape_params2: Float64Array, poses2: Float64Array): Promise<GpuBatchResult>;
  /**
   * Check box-box collisions in batch (async)
   *
   * # Arguments
   * * `half_extents1` - Flat array of [hx, hy, hz] half-extents for first boxes
   * * `poses1` - Flat array of [x, y, z, qx, qy, qz, qw] poses for first boxes
   * * `half_extents2` - Flat array of [hx, hy, hz] half-extents for second boxes
   * * `poses2` - Flat array of [x, y, z, qx, qy, qz, qw] poses for second boxes
   */
  checkBoxBoxAsync(half_extents1: Float64Array, poses1: Float64Array, half_extents2: Float64Array, poses2: Float64Array): Promise<GpuBatchResult>;
  /**
   * Get preferred batch size for optimal GPU performance
   */
  preferredBatchSize(): number;
  /**
   * Check sphere-sphere collisions in batch (async)
   *
   * # Arguments
   * * `positions1` - Flat array of [x, y, z] positions for first spheres
   * * `radii1` - Array of radii for first spheres
   * * `positions2` - Flat array of [x, y, z] positions for second spheres
   * * `radii2` - Array of radii for second spheres
   *
   * # Returns
   * Promise resolving to `GpuBatchResult`
   */
  checkSphereSphereAsync(positions1: Float64Array, radii1: Float64Array, positions2: Float64Array, radii2: Float64Array): Promise<GpuBatchResult>;
  /**
   * Initialize GPU collision context
   *
   * Returns a Promise that resolves to a GpuCollisionContext or rejects
   * if WebGPU is not available or initialization fails.
   */
  static init(): Promise<GpuCollisionContext>;
}
/**
 * GPU Planning Context
 *
 * Provides Lazy-PRM planning with batch collision checking callback.
 * The collision checking is delegated to a JavaScript function which
 * can use WebGPU, CPU, or any other collision detection backend.
 */
export class GpuPlanningContext {
  free(): void;
  /**
   * Build the roadmap
   *
   * Call this once after construction. This samples configurations
   * and builds the roadmap graph without collision checking.
   */
  buildRoadmap(): void;
  /**
   * Check if roadmap is built
   */
  isRoadmapBuilt(): boolean;
  /**
   * Reset edge validation cache
   *
   * Call this when the environment changes to invalidate cached results.
   */
  resetValidations(): void;
  /**
   * Plan path with custom collision checker callback
   *
   * For WebGPU integration, provide a JS function that performs
   * batch collision checking on GPU.
   *
   * # Arguments
   * * `start` - Start joint configuration
   * * `goal` - Goal joint configuration
   * * `check_edges` - JS function: (edges: [start[], end[]][]) => boolean[]
   */
  planPathWithChecker(start: Float64Array, goal: Float64Array, check_edges: Function): LazyPrmResult;
  /**
   * Create a new GPU planning context
   *
   * # Arguments
   * * `robot` - The robot for FK computations and joint limits
   * * `config` - Optional planning configuration
   */
  constructor(robot: Robot, config?: GpuPlanningContextConfig | null);
  /**
   * Get planning statistics
   */
  stats(): LazyPrmStats;
  /**
   * Plan a path from start to goal with collision checker callback
   *
   * Uses Lazy-PRM with batch collision checking optimized for GPU.
   *
   * # Arguments
   * * `start` - Start joint configuration
   * * `goal` - Goal joint configuration
   * * `check_edges` - JS function that validates edges in batch
   *   - Input: Array<[start: number[], end: number[]]>
   *   - Output: Array<boolean> (true = collision-free)
   *
   * # Returns
   * GpuPlanningResult with path and statistics
   */
  planPath(start: Float64Array, goal: Float64Array, check_edges: Function): GpuPlanningResult;
  /**
   * Get number of edges in roadmap
   */
  readonly edgeCount: number;
  /**
   * Get number of nodes in roadmap
   */
  readonly nodeCount: number;
}
/**
 * Configuration for GPU planning context
 */
export class GpuPlanningContextConfig {
  free(): void;
  /**
   * Set validation batch size
   */
  withBatchSize(size: number): GpuPlanningContextConfig;
  /**
   * Set k neighbors
   */
  withKNeighbors(k: number): GpuPlanningContextConfig;
  /**
   * Set number of samples
   */
  withNumSamples(n: number): GpuPlanningContextConfig;
  /**
   * Set safety margin in meters
   */
  withSafetyMargin(margin: number): GpuPlanningContextConfig;
  constructor();
  /**
   * Fast preset - fewer samples, faster planning
   */
  static fast(): GpuPlanningContextConfig;
  /**
   * Quality preset - more samples, better paths
   */
  static quality(): GpuPlanningContextConfig;
  /**
   * Balanced preset - good trade-off
   */
  static balanced(): GpuPlanningContextConfig;
  /**
   * Number of roadmap samples
   */
  num_samples: number;
  /**
   * K nearest neighbors
   */
  k_neighbors: number;
  /**
   * Maximum connection distance (radians)
   */
  max_connection_distance: number;
  /**
   * Edge discretization step size (radians)
   */
  edge_step_size: number;
  /**
   * Batch size for collision validation
   */
  validation_batch_size: number;
  /**
   * Safety margin for collision checking (meters)
   */
  safety_margin: number;
}
/**
 * Result of GPU-accelerated path planning
 */
export class GpuPlanningResult {
  private constructor();
  free(): void;
  /**
   * Get summary string for logging
   */
  summary(): string;
  /**
   * Number of GPU batch calls
   */
  readonly gpuBatches: number;
  /**
   * Path length in joint space (radians)
   */
  readonly pathLength: number;
  /**
   * Number of waypoints
   */
  readonly waypointCount: number;
  /**
   * Number of edges validated during planning
   */
  readonly edgesValidated: number;
  /**
   * Total collision checks performed
   */
  readonly collisionChecks: number;
  /**
   * Planning time in milliseconds
   */
  readonly planningTimeMs: number;
  /**
   * Get the path as a flat array [j1, j2, ..., jn, j1, j2, ..., jn, ...]
   */
  readonly path: Float64Array;
  /**
   * Error message if planning failed
   */
  readonly error: string | undefined;
  /**
   * Whether planning succeeded
   */
  readonly success: boolean;
  /**
   * Get path as array of waypoints
   */
  readonly waypoints: Array<any>;
}
/**
 * Performance comparison result
 */
export class GpuVsCpuComparison {
  private constructor();
  free(): void;
  /**
   * Get a summary string
   */
  summary(): string;
  /**
   * Whether GPU was faster than CPU
   */
  readonly gpuFaster: boolean;
  /**
   * CPU time in milliseconds
   */
  readonly cpuTimeMs: number;
  /**
   * GPU time in milliseconds
   */
  readonly gpuTimeMs: number;
  /**
   * Number of collision pairs tested
   */
  readonly collisionPairs: number;
  /**
   * Speedup factor (cpu_time / gpu_time)
   */
  readonly speedup: number;
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
 * Configuration for integrated GPU planning
 */
export class IntegratedGpuPlannerConfig {
  free(): void;
  constructor();
  /**
   * Fast preset - fewer samples, quick planning
   */
  static fast(): IntegratedGpuPlannerConfig;
  /**
   * Quality preset - thorough checking
   */
  static quality(): IntegratedGpuPlannerConfig;
  /**
   * Balanced preset - good tradeoff
   */
  static balanced(): IntegratedGpuPlannerConfig;
  /**
   * CPU-only preset (no GPU)
   */
  static cpuOnly(): IntegratedGpuPlannerConfig;
  /**
   * Get prefer GPU setting
   */
  readonly preferGpu: boolean;
  /**
   * Get k neighbors
   */
  readonly kNeighbors: number;
  /**
   * Get roadmap samples
   */
  readonly roadmapSamples: number;
  /**
   * Get samples per edge
   */
  readonly samplesPerEdge: number;
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
 * Configuration for Lazy-PRM planner
 */
export class LazyPrmConfig {
  free(): void;
  /**
   * Set number of nearest neighbors
   */
  withKNeighbors(k: number): LazyPrmConfig;
  /**
   * Set number of samples
   */
  withNumSamples(num_samples: number): LazyPrmConfig;
  /**
   * Set edge step size for discretization
   */
  withEdgeStepSize(step_size: number): LazyPrmConfig;
  /**
   * Set validation batch size
   */
  withValidationBatchSize(batch_size: number): LazyPrmConfig;
  /**
   * Set maximum connection distance
   */
  withMaxConnectionDistance(distance: number): LazyPrmConfig;
  constructor();
  /**
   * Number of samples in the roadmap
   */
  num_samples: number;
  /**
   * Number of nearest neighbors to connect
   */
  k_neighbors: number;
  /**
   * Maximum connection distance
   */
  max_connection_distance: number;
  /**
   * Step size for edge discretization
   */
  edge_step_size: number;
  /**
   * Batch size for edge validation
   */
  validation_batch_size: number;
}
/**
 * Lazy-PRM planner for WASM
 *
 * Probabilistic Roadmap planner with lazy edge validation, optimized for
 * GPU batch collision checking. Defers collision checks until edges are
 * actually needed, then validates them in batches.
 *
 * # Key Features
 * - Builds roadmap without collision checking (fast)
 * - Validates edges lazily during path search
 * - Batches collision checks for GPU efficiency
 * - Caches validation results for repeated queries
 */
export class LazyPrmPlanner {
  free(): void;
  /**
   * Query with a simple collision checker callback
   *
   * Simplified version that checks each edge individually.
   * Use `query()` for batch collision checking.
   *
   * # Arguments
   * * `start` - Start joint configuration
   * * `goal` - Goal joint configuration
   * * `check_edge` - JS function (start: number[], end: number[]) => boolean
   */
  querySimple(start: Float64Array, goal: Float64Array, check_edge: Function): LazyPrmResult;
  /**
   * Build the roadmap graph
   *
   * This samples configurations and builds edges but does NOT perform
   * any collision checking. Call this once before queries.
   */
  buildRoadmap(): void;
  /**
   * Reset all edge validation states
   *
   * Call this if the environment has changed and cached edge validations
   * are no longer valid.
   */
  resetValidations(): void;
  /**
   * Create a new Lazy-PRM planner
   *
   * # Arguments
   * * `dimension` - Number of joints/DOF
   * * `joint_limits` - Array of [min, max] pairs for each joint
   * * `config` - Optional configuration
   */
  constructor(dimension: number, joint_limits: Float64Array, config?: LazyPrmConfig | null);
  /**
   * Query for a path from start to goal
   *
   * # Arguments
   * * `start` - Start joint configuration
   * * `goal` - Goal joint configuration
   * * `validate_edges` - JS function that takes edges array and returns boolean array
   *   - Input: Array<[start: number[], end: number[]]>
   *   - Output: Array<boolean> (true = collision-free, false = in collision)
   *
   * # Returns
   * LazyPrmResult with path if successful
   */
  query(start: Float64Array, goal: Float64Array, validate_edges: Function): LazyPrmResult;
  /**
   * Get planning statistics
   */
  stats(): LazyPrmStats;
  /**
   * Check if roadmap has been built
   */
  isBuilt(): boolean;
  /**
   * Get number of edges in the roadmap
   */
  readonly edgeCount: number;
  /**
   * Get number of nodes in the roadmap
   */
  readonly nodeCount: number;
}
/**
 * Result of Lazy-PRM planning
 */
export class LazyPrmResult {
  private constructor();
  free(): void;
  /**
   * Number of GPU batch calls made
   */
  readonly gpuBatches: number;
  /**
   * Total path length in joint space
   */
  readonly pathLength: number;
  /**
   * Get number of waypoints in path
   */
  readonly waypointCount: number;
  /**
   * Number of edges validated during planning
   */
  readonly edgesValidated: number;
  /**
   * Planning time in milliseconds
   */
  readonly planningTimeMs: number;
  /**
   * Get the path as a flat array [j1, j2, j3, ..., j1, j2, j3, ...]
   */
  readonly path: Float64Array;
  /**
   * Error message if planning failed
   */
  readonly error: string | undefined;
  /**
   * Whether planning succeeded
   */
  readonly success: boolean;
  /**
   * Get path as array of waypoints
   */
  readonly waypoints: Array<any>;
}
/**
 * Statistics from Lazy-PRM planner
 */
export class LazyPrmStats {
  private constructor();
  free(): void;
  /**
   * Get total checks (states + edges)
   */
  readonly totalChecks: number;
  /**
   * Get average edges per batch (already computed)
   */
  readonly avgEdgesPerBatch: number;
  /**
   * Total configurations checked
   */
  states_checked: number;
  /**
   * Total edges checked
   */
  edges_checked: number;
  /**
   * Number of GPU batch dispatches
   */
  gpu_batches: number;
  /**
   * Average batch size
   */
  avg_batch_size: number;
  /**
   * Time spent in GPU collision checking (ms)
   */
  gpu_time_ms: number;
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
 * Result of path collision checking
 */
export class PathCollisionResult {
  private constructor();
  free(): void;
  /**
   * Get waypoint results
   */
  readonly waypointResults: Uint8Array;
  /**
   * Get number of waypoints checked
   */
  readonly waypointsChecked: number;
  /**
   * Get index of first collision (-1 if no collision)
   */
  readonly firstCollisionIndex: number;
  /**
   * Whether path is valid (collision-free)
   */
  readonly valid: boolean;
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
 *
 * This is a thin wrapper around `trajx_planning::planners::core::RRTStarCore`.
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
   * Uses condition number of the Jacobian matrix for robust singularity detection.
   * The default threshold of 1000.0 is appropriate for industrial applications
   * where only configurations within ~1cm of singularity should trigger warnings.
   *
   * # Arguments
   * * `joint_angles` - Current joint configuration
   * * `threshold` - Optional condition number threshold (default: 1000.0)
   *
   * Returns true if condition number exceeds threshold.
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
 * Unified Robot Context for URDF loading and collision checking
 *
 * Provides a convenient API for:
 * - Loading URDF with automatic collision model creation
 * - GPU-friendly capsule approximation
 * - Quick collision checking
 * - Batch edge validation for planning
 */
export class RobotContext {
  private constructor();
  free(): void;
  /**
   * Create a LazyPRM planner configured for this robot
   *
   * ```typescript
   * const planner = ctx.createPlanner();
   * planner.buildRoadmap();
   * const result = planner.query(start, goal, (edges) => ctx.checkEdgesBatch(edges, env));
   * ```
   */
  createPlanner(): LazyPrmPlanner;
  /**
   * Batch check multiple edges for collision
   *
   * This is the main API for GPU-friendly batch collision checking.
   * Returns an array of booleans, one per edge (true = collision-free).
   *
   * ```typescript
   * const edges = [
   *     [[0,0,0,0,0,0], [1,0,0,0,0,0]],
   *     [[1,0,0,0,0,0], [1,1,0,0,0,0]],
   * ];
   * const results = ctx.checkEdgesBatch(edges, env);
   * // results = [true, false]  // first edge free, second in collision
   * ```
   */
  checkEdgesBatch(edges: Array<any>, env: CollisionEnvironment, samples?: number | null): Array<any>;
  /**
   * Check if collision model is GPU-compatible (only uses capsules/spheres)
   */
  isGpuCompatible(): boolean;
  /**
   * Forward kinematics
   */
  forwardKinematics(joints: Float64Array): Pose;
  /**
   * Get link transforms for visualization
   */
  getLinkTransforms(joints: Float64Array): any;
  /**
   * Create RobotContext from URDF with custom config
   *
   * ```typescript
   * const config = RobotContextConfig.fast();
   * const ctx = RobotContext.fromUrdfWithConfig(urdfContent, config);
   * ```
   */
  static fromUrdfWithConfig(urdf_content: string, config: RobotContextConfig): RobotContext;
  /**
   * Get joint limits as flat array [min1, max1, min2, max2, ...]
   */
  getJointLimitsFlat(): Float64Array;
  /**
   * Check if a single edge is collision-free
   *
   * Samples the edge and checks each sample for collision.
   */
  isEdgeCollisionFree(start: Float64Array, end: Float64Array, env: CollisionEnvironment, samples?: number | null): boolean;
  /**
   * Check if a single configuration is collision-free
   *
   * Returns true if the configuration has no self-collision and no environment collision.
   */
  isConfigCollisionFree(joints: Float64Array, env: CollisionEnvironment): boolean;
  /**
   * Get summary of the robot context
   */
  summary(): string;
  /**
   * Create RobotContext from URDF with default GPU-optimized config
   *
   * This is the simplest way to load a robot:
   * ```typescript
   * const ctx = RobotContext.fromUrdf(urdfContent);
   * ```
   */
  static fromUrdf(urdf_content: string): RobotContext;
  /**
   * Get robot DOF
   */
  readonly dof: number;
  /**
   * Get robot name
   */
  readonly name: string;
  /**
   * Get creation statistics
   */
  readonly stats: RobotContextStats;
}
/**
 * Configuration for RobotContext
 */
export class RobotContextConfig {
  free(): void;
  /**
   * GPU-optimized preset with capsule approximation
   */
  static gpuOptimized(): RobotContextConfig;
  /**
   * Set safety margin in meters
   */
  withSafetyMargin(margin: number): RobotContextConfig;
  /**
   * Set whether to check self-collision
   */
  withSelfCollision(check: boolean): RobotContextConfig;
  /**
   * Set roadmap samples for planning
   */
  withRoadmapSamples(samples: number): RobotContextConfig;
  /**
   * Set samples per edge for collision checking
   */
  withSamplesPerEdge(samples: number): RobotContextConfig;
  constructor();
  /**
   * Fast preset for quick planning
   */
  static fast(): RobotContextConfig;
  /**
   * High-quality preset for thorough collision checking
   */
  static quality(): RobotContextConfig;
  /**
   * CPU-only preset (no capsule approximation)
   */
  static cpuOnly(): RobotContextConfig;
  readonly safetyMargin: number;
  readonly roadmapSamples: number;
  readonly samplesPerEdge: number;
  readonly checkSelfCollision: boolean;
}
/**
 * Statistics from RobotContext creation
 */
export class RobotContextStats {
  private constructor();
  free(): void;
  /**
   * Get a summary string
   */
  summary(): string;
  /**
   * Number of shapes converted to capsules
   */
  shapes_converted: number;
  /**
   * Number of capsules generated
   */
  capsules_generated: number;
  /**
   * Number of shapes unchanged
   */
  shapes_unchanged: number;
  /**
   * Average coverage ratio
   */
  avg_coverage_ratio: number;
  /**
   * Whether capsule approximation was used
   */
  used_capsule_approximation: boolean;
}
/**
 * Robot-environment collision check result
 */
export class RobotEnvironmentCollisionResult {
  private constructor();
  free(): void;
  /**
   * Get collisions as flattened array
   * [link1, obstacle1, link2, obstacle2, ...] represents pairs
   */
  readonly collisions: string[];
  /**
   * Check if any collision was detected
   */
  readonly inCollision: boolean;
  /**
   * Get number of collision pairs
   */
  readonly numCollisions: number;
}
/**
 * Self-collision check result
 */
export class SelfCollisionResult {
  private constructor();
  free(): void;
  /**
   * Check if any self-collision was detected
   */
  readonly inCollision: boolean;
  /**
   * Get colliding link pairs as flattened array
   * [link1, link2, link3, link4, ...] represents pairs (link1, link2), (link3, link4), ...
   */
  readonly collidingPairs: string[];
  /**
   * Get number of colliding pairs
   */
  readonly numCollidingPairs: number;
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
 * Options for capsule approximation
 *
 * Controls how geometries are converted to capsule approximations,
 * which enables GPU-accelerated collision detection.
 */
export class WasmCapsuleApproximationOptions {
  free(): void;
  /**
   * Conservative preset - only converts meshes
   */
  static conservative(): WasmCapsuleApproximationOptions;
  /**
   * GPU optimized preset - converts all geometries to capsules
   */
  static gpuOptimized(): WasmCapsuleApproximationOptions;
  /**
   * Set whether to convert box shapes
   */
  setConvertBoxes(value: boolean): void;
  /**
   * Set whether to convert mesh shapes
   */
  setConvertMeshes(value: boolean): void;
  /**
   * Set radius padding for conservative collision detection
   */
  setRadiusPadding(value: number): void;
  /**
   * Set whether to convert cylinder shapes
   */
  setConvertCylinders(value: boolean): void;
  /**
   * Set maximum capsules per mesh
   */
  setMaxCapsulesPerMesh(value: number): void;
  /**
   * Create default options
   */
  constructor();
}
/**
 * Result of capsule approximation containing both model and stats
 */
export class WasmCapsuleApproximationResult {
  private constructor();
  free(): void;
  /**
   * Get the capsule-approximated model
   */
  readonly model: WasmRobotCollisionModel;
  /**
   * Get the approximation statistics
   */
  readonly stats: WasmCapsuleApproximationStats;
}
/**
 * Statistics about capsule approximation
 */
export class WasmCapsuleApproximationStats {
  private constructor();
  free(): void;
  /**
   * Number of shapes converted
   */
  shapes_converted: number;
  /**
   * Number of capsules generated
   */
  capsules_generated: number;
  /**
   * Number of shapes kept as-is
   */
  shapes_unchanged: number;
  /**
   * Average coverage ratio for mesh conversions
   */
  avg_coverage_ratio: number;
  /**
   * Get number of shapes converted
   */
  readonly shapesConverted: number;
  /**
   * Get number of shapes unchanged
   */
  readonly shapesUnchanged: number;
  /**
   * Get average coverage ratio
   */
  readonly avgCoverageRatio: number;
  /**
   * Get number of capsules generated
   */
  readonly capsulesGenerated: number;
}
/**
 * Composite obstacle with multiple collision parts
 *
 * Useful for complex objects like workpieces, fixtures, or multi-link obstacles.
 * All parts move together when the base pose is updated.
 */
export class WasmCompositeObstacle {
  free(): void;
  /**
   * Add a box part to the composite obstacle
   *
   * # Arguments
   * * `name` - Part name
   * * `half_extents` - Half dimensions [x, y, z]
   * * `position` - Local position relative to base [x, y, z]
   * * `orientation` - Local orientation as quaternion [x, y, z, w]
   */
  addBoxPart(name: string, half_extents: Float64Array, position: Float64Array, orientation: Float64Array): void;
  /**
   * Get the base pose
   */
  getBasePose(): Pose;
  /**
   * Set the base pose of the composite obstacle
   */
  setBasePose(pose: Pose): void;
  /**
   * Add a sphere part to the composite obstacle
   */
  addSpherePart(name: string, radius: number, position: Float64Array): void;
  /**
   * Add a cylinder part to the composite obstacle
   */
  addCylinderPart(name: string, radius: number, half_height: number, position: Float64Array, orientation: Float64Array): void;
  /**
   * Get world pose for a specific part
   */
  getPartWorldPose(part_index: number): Pose | undefined;
  /**
   * Create a new empty composite obstacle
   */
  constructor(id: string);
  /**
   * Create a composite obstacle with a base pose
   */
  static withPose(id: string, pose: Pose): WasmCompositeObstacle;
  /**
   * Get obstacle ID
   */
  readonly id: string;
  /**
   * Get number of parts
   */
  readonly numParts: number;
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
 * Options for converting environment obstacles to capsule approximations
 *
 * Controls how environment obstacles are converted to capsules for GPU-accelerated
 * collision detection.
 */
export class WasmEnvironmentCapsuleOptions {
  free(): void;
  /**
   * Conservative preset - only converts meshes
   */
  static conservative(): WasmEnvironmentCapsuleOptions;
  /**
   * GPU optimized preset - converts all shapes to capsules
   */
  static gpuOptimized(): WasmEnvironmentCapsuleOptions;
  /**
   * Set whether to convert box shapes
   */
  setConvertBoxes(value: boolean): void;
  /**
   * Set whether to convert mesh shapes
   */
  setConvertMeshes(value: boolean): void;
  /**
   * Set radius padding for conservative collision detection
   */
  setRadiusPadding(value: number): void;
  /**
   * Set whether to convert cylinder shapes
   */
  setConvertCylinders(value: boolean): void;
  /**
   * Set maximum capsules per mesh
   */
  setMaxCapsulesPerMesh(value: number): void;
  /**
   * Create default options
   */
  constructor();
}
/**
 * Result of environment capsule approximation
 */
export class WasmEnvironmentCapsuleResult {
  private constructor();
  free(): void;
  /**
   * Get the capsule-approximated environment
   */
  readonly env: CollisionEnvironment;
  /**
   * Get the approximation statistics
   */
  readonly stats: WasmEnvironmentCapsuleStats;
}
/**
 * Statistics about environment capsule approximation
 */
export class WasmEnvironmentCapsuleStats {
  private constructor();
  free(): void;
  /**
   * Number of obstacles converted
   */
  obstacles_converted: number;
  /**
   * Number of capsules generated
   */
  capsules_generated: number;
  /**
   * Number of obstacles kept unchanged
   */
  obstacles_unchanged: number;
  /**
   * Average coverage ratio for mesh conversions
   */
  avg_coverage_ratio: number;
  /**
   * Get average coverage ratio
   */
  readonly avgCoverageRatio: number;
  /**
   * Get number of capsules generated
   */
  readonly capsulesGenerated: number;
  /**
   * Get number of obstacles converted
   */
  readonly obstaclesConverted: number;
  /**
   * Get number of obstacles unchanged
   */
  readonly obstaclesUnchanged: number;
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
   * Execute the motion with collision-aware path planning
   *
   * When CollisionMode::Avoid is set (via .safe()), this method uses BiRRT
   * to plan a collision-free path. Otherwise, it falls back to simple
   * linear interpolation.
   *
   * # Arguments
   * * `robot` - The robot for kinematics
   * * `collision_checker` - JavaScript callback function(jointConfig: number[]) -> boolean
   *   Returns true if the configuration is collision-free
   *
   * # Example
   * ```typescript
   * // Create collision checker callback
   * const checkCollision = (joints: number[]): boolean => {
   *     const poses = robot.getLinkTransforms(joints);
   *     const selfResult = robotCollision.checkSelfCollision(poses);
   *     if (selfResult.inCollision) return false;
   *     const envResult = robotCollision.checkEnvironmentCollision(env, poses);
   *     return !envResult.inCollision;
   * };
   *
   * // Execute with collision avoidance
   * const result = WasmMotion.to(goal)
   *     .safe()  // Enable collision avoidance
   *     .runWithCollision(robot, checkCollision);
   * ```
   */
  runWithCollision(robot: Robot, collision_checker: Function): WasmMotionResult;
  /**
   * Run motion with GPU-accelerated collision planning using Lazy-PRM
   *
   * Uses GpuPlanningContext for batch collision checking, optimized for
   * WebGPU or GPU-accelerated environments.
   *
   * # Arguments
   * * `robot` - The robot to control
   * * `gpu_ctx` - GPU planning context (pre-built roadmap)
   * * `check_edges` - JS callback for batch edge validation:
   *   - Input: Array<[start: number[], end: number[]]>
   *   - Output: Array<boolean> (true = collision-free)
   *
   * # Example
   * ```typescript
   * // Setup GPU planning context
   * const gpuCtx = GpuPlanningContext.createBalanced(robot);
   * gpuCtx.buildRoadmap();
   *
   * // Create batch collision checker
   * const checkEdges = (edges) => {
   *     return edges.map(([start, end]) => {
   *         // Check each edge for collision
   *         const midpoint = start.map((s, i) => (s + end[i]) / 2);
   *         const poses = robot.getLinkTransforms(midpoint);
   *         return robotCollision.isConfigCollisionFree(env, poses);
   *     });
   * };
   *
   * // Plan with GPU-optimized Lazy-PRM
   * const result = WasmMotion.to(goal)
   *     .gpuBatch()  // Enable GPU batch mode
   *     .runWithGpuCollision(robot, gpuCtx, checkEdges);
   * ```
   */
  runWithGpuCollision(robot: Robot, gpu_ctx: GpuPlanningContext, check_edges: Function): WasmMotionResult;
  /**
   * Create a motion to the target joint positions
   */
  static to(target: Float64Array): WasmMotion;
  /**
   * Execute the motion on the robot
   *
   * Note: For collision-aware planning, use `runWithCollision()` which accepts
   * a collision checker callback. This method performs simple linear interpolation
   * or warns if collision mode is set without a collision checker.
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
   * Set collision mode to GPU batch planning
   *
   * Enables Lazy-PRM with batch collision checking, optimized for GPU/WebGPU.
   * Use with `runWithGpuCollision()` method.
   *
   * # Example
   * ```typescript
   * const result = WasmMotion.to(goal)
   *     .gpuBatch()  // Enable GPU batch mode
   *     .runWithGpuCollision(robot, gpuCtx, checkEdges);
   * ```
   */
  gpuBatch(): WasmMotion;
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
 * Simple obstacle shape for WASM (works without collision feature)
 */
export class WasmObstacle {
  private constructor();
  free(): void;
  /**
   * Create a box obstacle
   */
  static createBox(id: string, half_x: number, half_y: number, half_z: number): WasmObstacle;
  /**
   * Set position
   */
  setPosition(x: number, y: number, z: number): void;
  /**
   * Create a sphere obstacle
   */
  static createSphere(id: string, radius: number): WasmObstacle;
  /**
   * Create a cylinder obstacle
   */
  static createCylinder(id: string, radius: number, half_height: number): WasmObstacle;
  /**
   * Set orientation from quaternion
   */
  setOrientation(x: number, y: number, z: number, w: number): void;
  readonly shapeType: string;
  readonly orientation: Float64Array;
  readonly id: string;
  readonly params: Float64Array;
  readonly position: Float64Array;
}
/**
 * Path builder for multi-waypoint motions
 */
export class WasmPath {
  private constructor();
  free(): void;
  /**
   * Execute the path with collision-aware planning
   *
   * Plans collision-free paths between consecutive waypoints using BiRRT.
   *
   * # Arguments
   * * `robot` - The robot for kinematics
   * * `collision_checker` - JS callback: (joints: number[]) => boolean (true = collision-free)
   *
   * # Example
   * ```typescript
   * const path = WasmPath.through([wp1, wp2, wp3], 6)
   *     .safe()  // Enable collision avoidance
   *     .runWithCollision(robot, checkCollision);
   * ```
   */
  runWithCollision(robot: Robot, collision_checker: Function): WasmMotionResult;
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
 * Robot collision model for self-collision and environment collision checking
 *
 * Manages collision geometries for robot links and provides collision detection
 * methods. Includes an Allowed Collision Matrix (ACM) to skip collision checks
 * between adjacent links.
 *
 * ## Example
 *
 * ```typescript
 * // Create from URDF
 * const robotCollision = WasmRobotCollisionModel.fromUrdf(urdfContent);
 *
 * // Get link poses from robot FK
 * const linkPoses = robot.getLinkTransforms(joints);
 *
 * // Check self-collision
 * const selfResult = robotCollision.checkSelfCollision(linkPoses);
 * if (selfResult.inCollision) {
 *     console.log('Self-collision detected:', selfResult.collidingPairs);
 * }
 *
 * // Check environment collision
 * const envResult = robotCollision.checkEnvironmentCollision(env, linkPoses);
 * if (envResult.inCollision) {
 *     console.log('Environment collision detected:', envResult.collisions);
 * }
 * ```
 */
export class WasmRobotCollisionModel {
  free(): void;
  /**
   * Get all link names that have collision geometries
   */
  getLinkNames(): string[];
  /**
   * Allow collision between two links (add to ACM)
   *
   * Collisions between these links will be skipped during self-collision checks.
   */
  allowLinkPair(link1: string, link2: string): void;
  /**
   * Add a box collision geometry to a link
   *
   * # Arguments
   * * `link_name` - Name of the link
   * * `half_extents` - Half dimensions [x, y, z]
   * * `origin` - Pose of the geometry relative to link frame
   */
  addBoxGeometry(link_name: string, half_extents: Float64Array, origin: Pose): void;
  /**
   * Get all allowed link pairs
   *
   * Returns a flattened array: [link1, link2, link3, link4, ...]
   * representing pairs (link1, link2), (link3, link4), ...
   */
  getAllowedPairs(): string[];
  /**
   * Check if model only contains GPU-compatible shapes (Sphere, Capsule)
   */
  isGpuCompatible(): boolean;
  /**
   * Quick check if robot is in self-collision
   *
   * Returns true if any self-collision is detected. This is faster than
   * `checkSelfCollision` when you only need a boolean result.
   */
  isSelfColliding(link_poses: any): boolean;
  /**
   * Add a sphere collision geometry to a link
   */
  addSphereGeometry(link_name: string, radius: number, origin: Pose): void;
  /**
   * Check for self-collision
   *
   * # Arguments
   * * `link_poses` - Object mapping link names to Pose objects
   *
   * # Returns
   * SelfCollisionResult with collision information
   */
  checkSelfCollision(link_poses: any): SelfCollisionResult;
  /**
   * Check if collision between two links is allowed
   */
  isLinkPairAllowed(link1: string, link2: string): boolean;
  /**
   * Add a cylinder collision geometry to a link
   */
  addCylinderGeometry(link_name: string, radius: number, half_height: number, origin: Pose): void;
  /**
   * Check if an edge (two joint configurations) is collision-free
   *
   * Samples points along the edge and checks each for collision.
   * Optimized for planning - returns false on first collision found.
   *
   * # Arguments
   * * `env` - Collision environment
   * * `robot` - Robot for FK
   * * `start` - Start joint configuration
   * * `end` - End joint configuration
   * * `samples` - Number of samples along edge (default: 5)
   */
  isEdgeCollisionFree(env: CollisionEnvironment, robot: Robot, start: Float64Array, end: Float64Array, samples?: number | null): boolean;
  /**
   * Fast boolean self-collision check with early exit
   *
   * Optimized for motion planning where you only need to know IF there's
   * a collision. Returns immediately on first collision found.
   */
  isSelfCollidingFast(link_poses: any): boolean;
  /**
   * Create from URDF with automatic capsule approximation
   *
   * This is optimal for GPU-accelerated collision detection.
   * All geometries are converted to capsules (Sphere and Capsule shapes).
   *
   * # Example
   * ```typescript
   * const options = WasmCapsuleApproximationOptions.gpuOptimized();
   * const { model, stats } = WasmRobotCollisionModel.fromUrdfWithCapsules(urdfContent, options);
   * console.log(`Converted ${stats.shapesConverted} shapes to ${stats.capsulesGenerated} capsules`);
   * ```
   */
  static fromUrdfWithCapsules(urdf_content: string, options: WasmCapsuleApproximationOptions): WasmCapsuleApproximationResult;
  /**
   * Check if configuration is collision-free (no self-collision AND no environment collision)
   *
   * Optimized for motion planning - returns false on first collision found.
   */
  isConfigCollisionFree(env: CollisionEnvironment, link_poses: any): boolean;
  /**
   * Convert existing model to use capsule approximations
   *
   * # Example
   * ```typescript
   * const model = WasmRobotCollisionModel.fromUrdf(urdfContent);
   * const options = WasmCapsuleApproximationOptions.gpuOptimized();
   * const { model: capsuleModel, stats } = model.toCapsuleApproximation(options);
   * ```
   */
  toCapsuleApproximation(options: WasmCapsuleApproximationOptions): WasmCapsuleApproximationResult;
  /**
   * Create a batch edge collision checker function for GPU planning
   *
   * Returns a JavaScript function that can be passed to GPU planning methods
   * like `runWithGpuCollision()` or `LazyPrmPlanner.query()`.
   *
   * The returned function takes an array of edges (pairs of joint configurations)
   * and returns an array of booleans indicating whether each edge is collision-free.
   *
   * # Arguments
   * * `env` - The collision environment
   * * `robot` - The robot (for forward kinematics)
   * * `samples_per_edge` - Number of samples to check along each edge (default: 5)
   *
   * # Example
   * ```typescript
   * const checkEdges = robotCollision.createBatchEdgeChecker(env, robot, 5);
   *
   * // Use with GPU planning
   * const result = WasmMotion.to(goal)
   *     .gpuBatch()
   *     .runWithGpuCollision(robot, gpuCtx, checkEdges);
   *
   * // Or with LazyPrmPlanner directly
   * const planResult = planner.query(start, goal, checkEdges);
   * ```
   */
  createBatchEdgeChecker(env: CollisionEnvironment, robot: Robot, samples_per_edge?: number | null): Function;
  /**
   * Check collision between robot and environment
   *
   * # Arguments
   * * `env` - CollisionEnvironment with obstacles
   * * `link_poses` - Object mapping link names to Pose objects
   *
   * # Returns
   * RobotEnvironmentCollisionResult with collision information
   */
  checkEnvironmentCollision(env: CollisionEnvironment, link_poses: any): RobotEnvironmentCollisionResult;
  /**
   * Quick check if robot is colliding with environment
   *
   * Returns true if any collision with environment is detected.
   */
  isCollidingWithEnvironment(env: CollisionEnvironment, link_poses: any): boolean;
  /**
   * Create an empty robot collision model
   */
  constructor(name: string);
  /**
   * Create a robot collision model from URDF content
   *
   * Automatically builds the Allowed Collision Matrix from the URDF joint tree,
   * excluding collision checks between adjacent links.
   */
  static fromUrdf(urdf_content: string): WasmRobotCollisionModel;
  /**
   * Get total number of collision geometries
   */
  readonly totalGeometries: number;
  /**
   * Get robot name
   */
  readonly name: string;
  /**
   * Get number of allowed pairs in the ACM
   */
  readonly acmSize: number;
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
   * Execute all motions in sequence with collision avoidance
   *
   * Each motion in the sequence that has collision mode enabled will use
   * the BiRRT planner for collision-free path planning.
   *
   * # Arguments
   * * `robot` - The robot for kinematics
   * * `collision_checker` - JS callback: (joints: number[]) => boolean (true = collision-free)
   *
   * # Example
   * ```typescript
   * const seq = WasmSequence.start(motion1.safe())
   *     .then(motion2.safe())
   *     .runWithCollision(robot, checkCollision);
   * ```
   */
  runWithCollision(robot: Robot, collision_checker: Function): WasmMotionResult;
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
  readonly __wbg_asyncgpuplanningcontext_free: (a: number, b: number) => void;
  readonly __wbg_batchcollisionchecker_free: (a: number, b: number) => void;
  readonly __wbg_batchcollisioncheckerconfig_free: (a: number, b: number) => void;
  readonly __wbg_batchcollisionresult_free: (a: number, b: number) => void;
  readonly __wbg_birrtconfig_free: (a: number, b: number) => void;
  readonly __wbg_birrtplanner_free: (a: number, b: number) => void;
  readonly __wbg_collisionenvironment_free: (a: number, b: number) => void;
  readonly __wbg_dhparam_free: (a: number, b: number) => void;
  readonly __wbg_distancequeryresult_free: (a: number, b: number) => void;
  readonly __wbg_edgevalidationresult_free: (a: number, b: number) => void;
  readonly __wbg_get_batchcollisioncheckerconfig_check_self_collision: (a: number) => number;
  readonly __wbg_get_batchcollisioncheckerconfig_safety_margin: (a: number) => number;
  readonly __wbg_get_batchcollisioncheckerconfig_samples_per_edge: (a: number) => number;
  readonly __wbg_get_birrtconfig_connect_threshold: (a: number) => number;
  readonly __wbg_get_birrtconfig_max_extension: (a: number) => number;
  readonly __wbg_get_birrtconfig_max_iterations: (a: number) => number;
  readonly __wbg_get_birrtconfig_step_size: (a: number) => number;
  readonly __wbg_get_distancequeryresult_point2_x: (a: number) => number;
  readonly __wbg_get_distancequeryresult_point2_y: (a: number) => number;
  readonly __wbg_get_distancequeryresult_point2_z: (a: number) => number;
  readonly __wbg_get_gpuplanningcontextconfig_k_neighbors: (a: number) => number;
  readonly __wbg_get_gpuplanningcontextconfig_num_samples: (a: number) => number;
  readonly __wbg_get_lazyprmconfig_k_neighbors: (a: number) => number;
  readonly __wbg_get_lazyprmconfig_num_samples: (a: number) => number;
  readonly __wbg_get_motionvalidationstats_valid_configs: (a: number) => number;
  readonly __wbg_get_robotcontextstats_used_capsule_approximation: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_max_iterations: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_calculate_metrics: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_enable_post_processing: (a: number) => number;
  readonly __wbg_gpubatchresult_free: (a: number, b: number) => void;
  readonly __wbg_gpucollisioncontext_free: (a: number, b: number) => void;
  readonly __wbg_gpuplanningresult_free: (a: number, b: number) => void;
  readonly __wbg_ikresult_free: (a: number, b: number) => void;
  readonly __wbg_integratedgpuplannerconfig_free: (a: number, b: number) => void;
  readonly __wbg_jointlimits_free: (a: number, b: number) => void;
  readonly __wbg_kinematiclimits_free: (a: number, b: number) => void;
  readonly __wbg_lazyprmplanner_free: (a: number, b: number) => void;
  readonly __wbg_lazyprmresult_free: (a: number, b: number) => void;
  readonly __wbg_multiikresult_free: (a: number, b: number) => void;
  readonly __wbg_pathcollisionresult_free: (a: number, b: number) => void;
  readonly __wbg_pathoptimizer_free: (a: number, b: number) => void;
  readonly __wbg_planningresult_free: (a: number, b: number) => void;
  readonly __wbg_prmplanner_free: (a: number, b: number) => void;
  readonly __wbg_robot_free: (a: number, b: number) => void;
  readonly __wbg_robotcontext_free: (a: number, b: number) => void;
  readonly __wbg_robotenvironmentcollisionresult_free: (a: number, b: number) => void;
  readonly __wbg_rrtstarconfig_free: (a: number, b: number) => void;
  readonly __wbg_rrtstarplanner_free: (a: number, b: number) => void;
  readonly __wbg_set_batchcollisioncheckerconfig_check_self_collision: (a: number, b: number) => void;
  readonly __wbg_set_batchcollisioncheckerconfig_safety_margin: (a: number, b: number) => void;
  readonly __wbg_set_batchcollisioncheckerconfig_samples_per_edge: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_connect_threshold: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_max_extension: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_max_iterations: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_step_size: (a: number, b: number) => void;
  readonly __wbg_set_distancequeryresult_point2_x: (a: number, b: number) => void;
  readonly __wbg_set_distancequeryresult_point2_y: (a: number, b: number) => void;
  readonly __wbg_set_distancequeryresult_point2_z: (a: number, b: number) => void;
  readonly __wbg_set_gpuplanningcontextconfig_k_neighbors: (a: number, b: number) => void;
  readonly __wbg_set_gpuplanningcontextconfig_num_samples: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmconfig_k_neighbors: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmconfig_num_samples: (a: number, b: number) => void;
  readonly __wbg_set_motionvalidationstats_valid_configs: (a: number, b: number) => void;
  readonly __wbg_set_robotcontextstats_used_capsule_approximation: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_max_iterations: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_calculate_metrics: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_enable_post_processing: (a: number, b: number) => void;
  readonly __wbg_taskspaceplanningresult_free: (a: number, b: number) => void;
  readonly __wbg_taskspacerrtplanner_free: (a: number, b: number) => void;
  readonly __wbg_trajectoryconfig_free: (a: number, b: number) => void;
  readonly __wbg_trajectorygenerator_free: (a: number, b: number) => void;
  readonly __wbg_wasmcapsuleapproximationresult_free: (a: number, b: number) => void;
  readonly __wbg_wasmcompositeobstacle_free: (a: number, b: number) => void;
  readonly __wbg_wasmconfigurationspace_free: (a: number, b: number) => void;
  readonly __wbg_wasmdhdatabase_free: (a: number, b: number) => void;
  readonly __wbg_wasmdiscretemotionvalidator_free: (a: number, b: number) => void;
  readonly __wbg_wasmenvironmentcapsuleresult_free: (a: number, b: number) => void;
  readonly __wbg_wasmmotion_free: (a: number, b: number) => void;
  readonly __wbg_wasmmotionresult_free: (a: number, b: number) => void;
  readonly __wbg_wasmobstacle_free: (a: number, b: number) => void;
  readonly __wbg_wasmpath_free: (a: number, b: number) => void;
  readonly __wbg_wasmpipelineresult_free: (a: number, b: number) => void;
  readonly __wbg_wasmplanningpipeline_free: (a: number, b: number) => void;
  readonly __wbg_wasmrobotcollisionmodel_free: (a: number, b: number) => void;
  readonly __wbg_wasmrobotconfig_free: (a: number, b: number) => void;
  readonly __wbg_wasmsequence_free: (a: number, b: number) => void;
  readonly __wbg_wasmtcppoint_free: (a: number, b: number) => void;
  readonly __wbg_wasmtool_free: (a: number, b: number) => void;
  readonly __wbg_wasmtoollibrary_free: (a: number, b: number) => void;
  readonly __wbg_wasmtrajectory_free: (a: number, b: number) => void;
  readonly __wbg_wasmtrajectorypoint_free: (a: number, b: number) => void;
  readonly __wbg_workspaceanalysis_free: (a: number, b: number) => void;
  readonly aggregateBatchResults: (a: number, b: number, c: number) => void;
  readonly asyncgpuplanningcontext_buildRoadmap: (a: number) => void;
  readonly asyncgpuplanningcontext_edgeCount: (a: number) => number;
  readonly asyncgpuplanningcontext_isRoadmapBuilt: (a: number) => number;
  readonly asyncgpuplanningcontext_new: (a: number, b: number, c: number) => void;
  readonly asyncgpuplanningcontext_nodeCount: (a: number) => number;
  readonly asyncgpuplanningcontext_planPathAsync: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly asyncgpuplanningcontext_resetValidations: (a: number) => void;
  readonly batchForwardKinematics: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly batchForwardKinematicsEndEffector: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly batchForwardKinematicsF32: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly batchcollisionchecker_checkBatch: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly batchcollisionchecker_new: (a: number) => number;
  readonly batchcollisioncheckerconfig_accurate: () => number;
  readonly batchcollisioncheckerconfig_fast: () => number;
  readonly batchcollisioncheckerconfig_new: () => number;
  readonly batchcollisioncheckerconfig_withSafetyMargin: (a: number, b: number) => number;
  readonly batchcollisioncheckerconfig_withSamplesPerEdge: (a: number, b: number) => number;
  readonly batchcollisioncheckerconfig_withSelfCollision: (a: number, b: number) => number;
  readonly batchcollisionresult_avgTimePerConfig: (a: number) => number;
  readonly batchcollisionresult_getInvalidIndices: (a: number, b: number) => void;
  readonly batchcollisionresult_getValidIndices: (a: number, b: number) => void;
  readonly batchcollisionresult_isValid: (a: number, b: number) => number;
  readonly batchcollisionresult_numChecked: (a: number) => number;
  readonly batchcollisionresult_numValid: (a: number) => number;
  readonly batchcollisionresult_results: (a: number, b: number) => void;
  readonly batchcollisionresult_totalTimeMs: (a: number) => number;
  readonly batchcollisionresult_validityRatio: (a: number) => number;
  readonly benchmarkGpuBatchSizes: (a: number, b: number) => number;
  readonly benchmarkGpuVsCpu: (a: number) => number;
  readonly birrtconfig_new: () => number;
  readonly birrtconfig_withConnectionThreshold: (a: number, b: number) => number;
  readonly birrtconfig_withGoalBias: (a: number, b: number) => number;
  readonly birrtconfig_withMaxExtension: (a: number, b: number) => number;
  readonly birrtconfig_withMaxIterations: (a: number, b: number) => number;
  readonly birrtconfig_withParams: (a: number, b: number, c: number) => number;
  readonly birrtplanner_new: (a: number, b: number) => number;
  readonly birrtplanner_plan: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly birrtplanner_planDenseWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly birrtplanner_planWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly cablePresetHeavyDuty: () => number;
  readonly cablePresetLight: () => number;
  readonly cablePresetPrecision: () => number;
  readonly cablePresetStandard: () => number;
  readonly cableconfig_autoUnwindEnabled: (a: number) => number;
  readonly cableconfig_initialTwist: (a: number) => number;
  readonly cableconfig_isTwistValid: (a: number, b: number) => number;
  readonly cableconfig_isTwistWarning: (a: number, b: number) => number;
  readonly cableconfig_maxTwistRate: (a: number) => number;
  readonly cableconfig_warningThreshold: (a: number) => number;
  readonly cableconfig_withAutoUnwind: (a: number, b: number) => number;
  readonly cableconfig_withMaxTotalTwist: (a: number, b: number) => number;
  readonly cableconfig_withWarningThreshold: (a: number, b: number) => number;
  readonly checkPathCollision: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly checkPathEdgesCollision: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly collisionenvironment_addBox: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly collisionenvironment_addCompositeObstacle: (a: number, b: number) => void;
  readonly collisionenvironment_addCylinder: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly collisionenvironment_addSphere: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly collisionenvironment_allObstacleIds: (a: number, b: number) => void;
  readonly collisionenvironment_checkShapeCollision: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly collisionenvironment_clear: (a: number) => void;
  readonly collisionenvironment_clearAcm: (a: number) => void;
  readonly collisionenvironment_compositeObstacleIds: (a: number, b: number) => void;
  readonly collisionenvironment_countGpuIncompatible: (a: number) => number;
  readonly collisionenvironment_getIgnoredLinks: (a: number, b: number) => void;
  readonly collisionenvironment_getIgnoredObstacles: (a: number, b: number) => void;
  readonly collisionenvironment_ignoreLink: (a: number, b: number, c: number) => void;
  readonly collisionenvironment_ignoreLinkObstaclePair: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly collisionenvironment_ignoreObstacle: (a: number, b: number, c: number) => void;
  readonly collisionenvironment_isCollisionFree: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly collisionenvironment_isGpuCompatible: (a: number) => number;
  readonly collisionenvironment_isLinkObstaclePairIgnored: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly collisionenvironment_new: () => number;
  readonly collisionenvironment_numCompositeObstacles: (a: number) => number;
  readonly collisionenvironment_numObstacles: (a: number) => number;
  readonly collisionenvironment_obstacleIds: (a: number, b: number) => void;
  readonly collisionenvironment_removeAnyObstacle: (a: number, b: number, c: number) => number;
  readonly collisionenvironment_removeCompositeObstacle: (a: number, b: number, c: number) => number;
  readonly collisionenvironment_removeObstacle: (a: number, b: number, c: number) => number;
  readonly collisionenvironment_toCapsuleApproximation: (a: number, b: number, c: number) => void;
  readonly collisionenvironment_totalObstacles: (a: number) => number;
  readonly collisionenvironment_unignoreLink: (a: number, b: number, c: number) => void;
  readonly collisionenvironment_unignoreLinkObstaclePair: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly collisionenvironment_unignoreObstacle: (a: number, b: number, c: number) => void;
  readonly collisionenvironment_updateCompositeObstaclePose: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly collisionenvironment_updateObstaclePose: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly computePathLength: (a: number, b: number, c: number) => number;
  readonly computePathSmoothness: (a: number, b: number, c: number) => number;
  readonly createGpuPlanningPipeline: (a: number, b: number, c: number) => void;
  readonly createRobot: (a: number, b: number, c: number) => void;
  readonly createRobotContext: (a: number, b: number, c: number) => void;
  readonly createRobotContextWithConfig: (a: number, b: number, c: number, d: number) => void;
  readonly createSimpleTrajectory: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly dhparam_new: (a: number, b: number, c: number, d: number) => number;
  readonly distancequeryresult_getPoint1: (a: number, b: number) => void;
  readonly distancequeryresult_getPoint2: (a: number, b: number) => void;
  readonly edgevalidationresult_getPoint: (a: number, b: number, c: number) => void;
  readonly edgevalidationresult_interpolatedPoints: (a: number, b: number) => void;
  readonly edgevalidationresult_numPoints: (a: number) => number;
  readonly edgevalidationresult_valid: (a: number) => number;
  readonly forwardKinematicsChainDh: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly forwardKinematicsDh: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly generateBatchCheckerTemplate: (a: number, b: number) => void;
  readonly getGpuCollisionCheckerTemplate: (a: number, b: number) => void;
  readonly gpubatchresult_collisionCount: (a: number) => number;
  readonly gpubatchresult_collisionFlags: (a: number, b: number) => void;
  readonly gpubatchresult_count: (a: number) => number;
  readonly gpubatchresult_distances: (a: number, b: number) => void;
  readonly gpubatchresult_getDistance: (a: number, b: number) => number;
  readonly gpubatchresult_isColliding: (a: number, b: number) => number;
  readonly gpucollisioncontext_checkBoxBoxAsync: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
  readonly gpucollisioncontext_checkMixedAsync: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number) => number;
  readonly gpucollisioncontext_checkSphereSphereAsync: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
  readonly gpucollisioncontext_deviceInfo: (a: number, b: number) => void;
  readonly gpucollisioncontext_gpuThreshold: (a: number) => number;
  readonly gpucollisioncontext_init: () => number;
  readonly gpucollisioncontext_preferredBatchSize: (a: number) => number;
  readonly gpuplanningcontext_new: (a: number, b: number, c: number) => void;
  readonly gpuplanningcontext_planPath: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly gpuplanningcontext_planPathWithChecker: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly gpuplanningcontext_resetValidations: (a: number) => void;
  readonly gpuplanningcontext_stats: (a: number) => number;
  readonly gpuplanningcontextconfig_balanced: () => number;
  readonly gpuplanningcontextconfig_fast: () => number;
  readonly gpuplanningcontextconfig_quality: () => number;
  readonly gpuplanningcontextconfig_withKNeighbors: (a: number, b: number) => number;
  readonly gpuplanningcontextconfig_withNumSamples: (a: number, b: number) => number;
  readonly gpuplanningresult_collisionChecks: (a: number) => number;
  readonly gpuplanningresult_error: (a: number, b: number) => void;
  readonly gpuplanningresult_path: (a: number, b: number) => void;
  readonly gpuplanningresult_success: (a: number) => number;
  readonly gpuplanningresult_summary: (a: number, b: number) => void;
  readonly gpuplanningresult_waypointCount: (a: number) => number;
  readonly gpuplanningresult_waypoints: (a: number) => number;
  readonly gpuvscpucomparison_gpuFaster: (a: number) => number;
  readonly gpuvscpucomparison_summary: (a: number, b: number) => void;
  readonly ikresult_error: (a: number, b: number) => void;
  readonly ikresult_errorMessage: (a: number, b: number) => void;
  readonly ikresult_isAnalytical: (a: number) => number;
  readonly ikresult_iterations: (a: number) => number;
  readonly ikresult_solution: (a: number, b: number) => void;
  readonly ikresult_success: (a: number) => number;
  readonly integratedgpuplannerconfig_balanced: () => number;
  readonly integratedgpuplannerconfig_cpuOnly: () => number;
  readonly integratedgpuplannerconfig_fast: () => number;
  readonly integratedgpuplannerconfig_preferGpu: (a: number) => number;
  readonly integratedgpuplannerconfig_quality: () => number;
  readonly integratedgpuplannerconfig_samplesPerEdge: (a: number) => number;
  readonly interpolateEdge: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly interpolateEdgesBatch: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly interpolatePathFlat: (a: number, b: number, c: number, d: number) => void;
  readonly inverseKinematicsDh: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
  readonly isIntegratedGpuPlanningAvailable: () => number;
  readonly isWebGpuAvailable: () => number;
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
  readonly lazyprmconfig_new: () => number;
  readonly lazyprmconfig_withEdgeStepSize: (a: number, b: number) => number;
  readonly lazyprmconfig_withKNeighbors: (a: number, b: number) => number;
  readonly lazyprmconfig_withMaxConnectionDistance: (a: number, b: number) => number;
  readonly lazyprmconfig_withNumSamples: (a: number, b: number) => number;
  readonly lazyprmconfig_withValidationBatchSize: (a: number, b: number) => number;
  readonly lazyprmplanner_buildRoadmap: (a: number) => void;
  readonly lazyprmplanner_edgeCount: (a: number) => number;
  readonly lazyprmplanner_isBuilt: (a: number) => number;
  readonly lazyprmplanner_new: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly lazyprmplanner_nodeCount: (a: number) => number;
  readonly lazyprmplanner_query: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly lazyprmplanner_querySimple: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly lazyprmplanner_resetValidations: (a: number) => void;
  readonly lazyprmplanner_stats: (a: number) => number;
  readonly lazyprmresult_error: (a: number, b: number) => void;
  readonly lazyprmresult_path: (a: number, b: number) => void;
  readonly lazyprmresult_success: (a: number) => number;
  readonly lazyprmresult_waypointCount: (a: number) => number;
  readonly lazyprmresult_waypoints: (a: number) => number;
  readonly lazyprmstats_totalChecks: (a: number) => number;
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
  readonly pathcollisionresult_firstCollisionIndex: (a: number) => number;
  readonly pathcollisionresult_valid: (a: number) => number;
  readonly pathcollisionresult_waypointResults: (a: number, b: number) => void;
  readonly pathcollisionresult_waypointsChecked: (a: number) => number;
  readonly pathoptimizer_new: (a: number) => number;
  readonly pathoptimizer_shortcut: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly pathoptimizer_shortcutWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly planningresult_error: (a: number, b: number) => void;
  readonly planningresult_getPathFlat: (a: number, b: number) => void;
  readonly planningresult_getWaypoint: (a: number, b: number, c: number) => void;
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
  readonly robotcontext_checkEdgesBatch: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly robotcontext_createPlanner: (a: number, b: number) => void;
  readonly robotcontext_forwardKinematics: (a: number, b: number, c: number, d: number) => void;
  readonly robotcontext_getJointLimitsFlat: (a: number, b: number) => void;
  readonly robotcontext_getLinkTransforms: (a: number, b: number, c: number, d: number) => void;
  readonly robotcontext_isConfigCollisionFree: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly robotcontext_isEdgeCollisionFree: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly robotcontext_isGpuCompatible: (a: number) => number;
  readonly robotcontext_name: (a: number, b: number) => void;
  readonly robotcontext_stats: (a: number) => number;
  readonly robotcontext_summary: (a: number, b: number) => void;
  readonly robotcontextconfig_cpuOnly: () => number;
  readonly robotcontextconfig_withRoadmapSamples: (a: number, b: number) => number;
  readonly robotcontextconfig_withSamplesPerEdge: (a: number, b: number) => number;
  readonly robotcontextconfig_withSelfCollision: (a: number, b: number) => number;
  readonly robotcontextstats_summary: (a: number, b: number) => void;
  readonly robotenvironmentcollisionresult_collisions: (a: number, b: number) => void;
  readonly robotenvironmentcollisionresult_inCollision: (a: number) => number;
  readonly robotenvironmentcollisionresult_numCollisions: (a: number) => number;
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
  readonly taskspaceplanningresult_pathLength: (a: number) => number;
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
  readonly wasmcapsuleapproximationoptions_conservative: () => number;
  readonly wasmcapsuleapproximationoptions_gpuOptimized: () => number;
  readonly wasmcapsuleapproximationoptions_new: () => number;
  readonly wasmcapsuleapproximationoptions_setConvertBoxes: (a: number, b: number) => void;
  readonly wasmcapsuleapproximationoptions_setConvertCylinders: (a: number, b: number) => void;
  readonly wasmcapsuleapproximationoptions_setConvertMeshes: (a: number, b: number) => void;
  readonly wasmcapsuleapproximationoptions_setMaxCapsulesPerMesh: (a: number, b: number) => void;
  readonly wasmcapsuleapproximationresult_model: (a: number) => number;
  readonly wasmcapsuleapproximationresult_stats: (a: number) => number;
  readonly wasmcompositeobstacle_addBoxPart: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
  readonly wasmcompositeobstacle_addCylinderPart: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => void;
  readonly wasmcompositeobstacle_addSpherePart: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmcompositeobstacle_getBasePose: (a: number) => number;
  readonly wasmcompositeobstacle_getPartWorldPose: (a: number, b: number) => number;
  readonly wasmcompositeobstacle_id: (a: number, b: number) => void;
  readonly wasmcompositeobstacle_new: (a: number, b: number) => number;
  readonly wasmcompositeobstacle_numParts: (a: number) => number;
  readonly wasmcompositeobstacle_setBasePose: (a: number, b: number) => void;
  readonly wasmcompositeobstacle_withPose: (a: number, b: number, c: number) => number;
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
  readonly wasmenvironmentcapsuleoptions_conservative: () => number;
  readonly wasmenvironmentcapsuleoptions_gpuOptimized: () => number;
  readonly wasmenvironmentcapsuleoptions_new: () => number;
  readonly wasmenvironmentcapsuleresult_env: (a: number) => number;
  readonly wasmenvironmentcapsuleresult_stats: (a: number) => number;
  readonly wasmmotion_adaptive: (a: number) => number;
  readonly wasmmotion_cableAware: (a: number) => number;
  readonly wasmmotion_cableAwareWith: (a: number, b: number) => number;
  readonly wasmmotion_cableTrack: (a: number) => number;
  readonly wasmmotion_dwellMs: (a: number, b: bigint) => number;
  readonly wasmmotion_fast: (a: number) => number;
  readonly wasmmotion_from: (a: number, b: number, c: number) => number;
  readonly wasmmotion_gpuBatch: (a: number) => number;
  readonly wasmmotion_joint: (a: number) => number;
  readonly wasmmotion_linear: (a: number) => number;
  readonly wasmmotion_linearAt: (a: number, b: number) => number;
  readonly wasmmotion_plan: (a: number, b: number, c: number) => void;
  readonly wasmmotion_precise: (a: number) => number;
  readonly wasmmotion_run: (a: number, b: number, c: number) => void;
  readonly wasmmotion_runWithCollision: (a: number, b: number, c: number, d: number) => void;
  readonly wasmmotion_runWithGpuCollision: (a: number, b: number, c: number, d: number, e: number) => void;
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
  readonly wasmobstacle_createBox: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly wasmobstacle_createCylinder: (a: number, b: number, c: number, d: number) => number;
  readonly wasmobstacle_createSphere: (a: number, b: number, c: number) => number;
  readonly wasmobstacle_id: (a: number, b: number) => void;
  readonly wasmobstacle_orientation: (a: number, b: number) => void;
  readonly wasmobstacle_params: (a: number, b: number) => void;
  readonly wasmobstacle_position: (a: number, b: number) => void;
  readonly wasmobstacle_setOrientation: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasmobstacle_setPosition: (a: number, b: number, c: number, d: number) => void;
  readonly wasmobstacle_shapeType: (a: number, b: number) => void;
  readonly wasmpath_from: (a: number, b: number, c: number) => number;
  readonly wasmpath_joint: (a: number) => number;
  readonly wasmpath_linear: (a: number) => number;
  readonly wasmpath_run: (a: number, b: number, c: number) => void;
  readonly wasmpath_runWithCollision: (a: number, b: number, c: number, d: number) => void;
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
  readonly wasmpipelineconfig_withSmoothingFactor: (a: number, b: number) => number;
  readonly wasmpipelineresult_getWaypoint: (a: number, b: number, c: number) => void;
  readonly wasmpipelineresult_path: (a: number, b: number) => void;
  readonly wasmplanningpipeline_calculateMetrics: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasmplanningpipeline_new: (a: number, b: number) => number;
  readonly wasmplanningpipeline_process: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasmplanningpipeline_processWithCollisionCheck: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmplanningpipeline_setStepSize: (a: number, b: number) => void;
  readonly wasmplanningpipeline_shortcutPath: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmplanningpipeline_smoothPath: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmrobotcollisionmodel_addBoxGeometry: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmrobotcollisionmodel_addCylinderGeometry: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly wasmrobotcollisionmodel_addSphereGeometry: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly wasmrobotcollisionmodel_allowLinkPair: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasmrobotcollisionmodel_checkEnvironmentCollision: (a: number, b: number, c: number, d: number) => void;
  readonly wasmrobotcollisionmodel_checkSelfCollision: (a: number, b: number, c: number) => void;
  readonly wasmrobotcollisionmodel_createBatchEdgeChecker: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasmrobotcollisionmodel_fromUrdf: (a: number, b: number, c: number) => void;
  readonly wasmrobotcollisionmodel_fromUrdfWithCapsules: (a: number, b: number, c: number, d: number) => void;
  readonly wasmrobotcollisionmodel_getAllowedPairs: (a: number, b: number) => void;
  readonly wasmrobotcollisionmodel_getLinkNames: (a: number, b: number) => void;
  readonly wasmrobotcollisionmodel_isCollidingWithEnvironment: (a: number, b: number, c: number, d: number) => void;
  readonly wasmrobotcollisionmodel_isConfigCollisionFree: (a: number, b: number, c: number, d: number) => void;
  readonly wasmrobotcollisionmodel_isEdgeCollisionFree: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
  readonly wasmrobotcollisionmodel_isGpuCompatible: (a: number) => number;
  readonly wasmrobotcollisionmodel_isLinkPairAllowed: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly wasmrobotcollisionmodel_isSelfColliding: (a: number, b: number, c: number) => void;
  readonly wasmrobotcollisionmodel_isSelfCollidingFast: (a: number, b: number, c: number) => void;
  readonly wasmrobotcollisionmodel_name: (a: number, b: number) => void;
  readonly wasmrobotcollisionmodel_new: (a: number, b: number) => number;
  readonly wasmrobotcollisionmodel_toCapsuleApproximation: (a: number, b: number, c: number) => void;
  readonly wasmrobotcollisionmodel_totalGeometries: (a: number) => number;
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
  readonly wasmsequence_runWithCollision: (a: number, b: number, c: number, d: number) => void;
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
  readonly gpuplanningcontext_edgeCount: (a: number) => number;
  readonly gpuplanningcontext_nodeCount: (a: number) => number;
  readonly selfcollisionresult_numCollidingPairs: (a: number) => number;
  readonly ikresult_message: (a: number, b: number) => void;
  readonly taskspaceplanningresult_errorMessage: (a: number, b: number) => void;
  readonly __wbg_set_birrtconfig_goal_bias: (a: number, b: number) => void;
  readonly __wbg_set_dhparam_a: (a: number, b: number) => void;
  readonly __wbg_set_dhparam_alpha: (a: number, b: number) => void;
  readonly __wbg_set_dhparam_d: (a: number, b: number) => void;
  readonly __wbg_set_dhparam_theta: (a: number, b: number) => void;
  readonly __wbg_set_distancequeryresult_distance: (a: number, b: number) => void;
  readonly __wbg_set_distancequeryresult_point1_x: (a: number, b: number) => void;
  readonly __wbg_set_distancequeryresult_point1_y: (a: number, b: number) => void;
  readonly __wbg_set_distancequeryresult_point1_z: (a: number, b: number) => void;
  readonly __wbg_set_gpuplanningcontextconfig_edge_step_size: (a: number, b: number) => void;
  readonly __wbg_set_gpuplanningcontextconfig_max_connection_distance: (a: number, b: number) => void;
  readonly __wbg_set_gpuplanningcontextconfig_safety_margin: (a: number, b: number) => void;
  readonly __wbg_set_gpuplanningcontextconfig_validation_batch_size: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmconfig_edge_step_size: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmconfig_max_connection_distance: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmconfig_validation_batch_size: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmstats_avg_batch_size: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmstats_edges_checked: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmstats_gpu_batches: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmstats_gpu_time_ms: (a: number, b: number) => void;
  readonly __wbg_set_lazyprmstats_states_checked: (a: number, b: number) => void;
  readonly __wbg_set_motionvalidationstats_configs_checked: (a: number, b: number) => void;
  readonly __wbg_set_motionvalidationstats_invalid_configs: (a: number, b: number) => void;
  readonly __wbg_set_motionvalidationstats_total_time_ms: (a: number, b: number) => void;
  readonly __wbg_set_position_x: (a: number, b: number) => void;
  readonly __wbg_set_position_y: (a: number, b: number) => void;
  readonly __wbg_set_position_z: (a: number, b: number) => void;
  readonly __wbg_set_prmconfig_k_neighbors: (a: number, b: number) => void;
  readonly __wbg_set_prmconfig_max_connection_distance: (a: number, b: number) => void;
  readonly __wbg_set_prmconfig_num_samples: (a: number, b: number) => void;
  readonly __wbg_set_prmconfig_step_size: (a: number, b: number) => void;
  readonly __wbg_set_quaternion_w: (a: number, b: number) => void;
  readonly __wbg_set_quaternion_x: (a: number, b: number) => void;
  readonly __wbg_set_quaternion_y: (a: number, b: number) => void;
  readonly __wbg_set_quaternion_z: (a: number, b: number) => void;
  readonly __wbg_set_robotcontextstats_avg_coverage_ratio: (a: number, b: number) => void;
  readonly __wbg_set_robotcontextstats_capsules_generated: (a: number, b: number) => void;
  readonly __wbg_set_robotcontextstats_shapes_converted: (a: number, b: number) => void;
  readonly __wbg_set_robotcontextstats_shapes_unchanged: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_goal_bias: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_goal_radius: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_max_extension: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_rewire_factor: (a: number, b: number) => void;
  readonly __wbg_set_rrtstarconfig_step_size: (a: number, b: number) => void;
  readonly __wbg_set_wasmcapsuleapproximationstats_avg_coverage_ratio: (a: number, b: number) => void;
  readonly __wbg_set_wasmcapsuleapproximationstats_capsules_generated: (a: number, b: number) => void;
  readonly __wbg_set_wasmcapsuleapproximationstats_shapes_converted: (a: number, b: number) => void;
  readonly __wbg_set_wasmcapsuleapproximationstats_shapes_unchanged: (a: number, b: number) => void;
  readonly __wbg_set_wasmenvironmentcapsulestats_avg_coverage_ratio: (a: number, b: number) => void;
  readonly __wbg_set_wasmenvironmentcapsulestats_capsules_generated: (a: number, b: number) => void;
  readonly __wbg_set_wasmenvironmentcapsulestats_obstacles_converted: (a: number, b: number) => void;
  readonly __wbg_set_wasmenvironmentcapsulestats_obstacles_unchanged: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_original_path_length: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_original_waypoint_count: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_path_length: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_smoothness: (a: number, b: number) => void;
  readonly __wbg_set_wasmpathmetrics_waypoint_count: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_shortcut_iterations: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_smooth_iterations: (a: number, b: number) => void;
  readonly __wbg_set_wasmpipelineconfig_smoothing_factor: (a: number, b: number) => void;
  readonly wasmcapsuleapproximationoptions_setRadiusPadding: (a: number, b: number) => void;
  readonly wasmenvironmentcapsuleoptions_setMaxCapsulesPerMesh: (a: number, b: number) => void;
  readonly wasmenvironmentcapsuleoptions_setRadiusPadding: (a: number, b: number) => void;
  readonly cableconfig_withMaxTwistRate: (a: number, b: number) => number;
  readonly wasmpipelineconfig_withShortcutIterations: (a: number, b: number) => number;
  readonly robotcontextconfig_withSafetyMargin: (a: number, b: number) => number;
  readonly selfcollisionresult_collidingPairs: (a: number, b: number) => void;
  readonly ikresult_positionError: (a: number, b: number) => void;
  readonly wasmmotionresult_cableTwist: (a: number, b: number) => void;
  readonly wasmtool_mass: (a: number, b: number) => void;
  readonly robotcontext_fromUrdf: (a: number, b: number, c: number) => void;
  readonly __wbg_selfcollisionresult_free: (a: number, b: number) => void;
  readonly wasmenvironmentcapsuleoptions_setConvertBoxes: (a: number, b: number) => void;
  readonly wasmenvironmentcapsuleoptions_setConvertCylinders: (a: number, b: number) => void;
  readonly wasmenvironmentcapsuleoptions_setConvertMeshes: (a: number, b: number) => void;
  readonly robot_fromString: (a: number, b: number, c: number) => void;
  readonly gpuplanningcontext_isRoadmapBuilt: (a: number) => number;
  readonly planningresult_success: (a: number) => number;
  readonly robotcontextconfig_checkSelfCollision: (a: number) => number;
  readonly selfcollisionresult_inCollision: (a: number) => number;
  readonly taskspaceplanningresult_success: (a: number) => number;
  readonly wasmpipelineresult_postProcessed: (a: number) => number;
  readonly workspaceanalysis_isReachable: (a: number) => number;
  readonly quaternion_new: (a: number, b: number, c: number, d: number) => number;
  readonly gpuplanningcontextconfig_withBatchSize: (a: number, b: number) => number;
  readonly wasmpipelineconfig_withSmoothIterations: (a: number, b: number) => number;
  readonly gpuplanningcontextconfig_new: () => number;
  readonly integratedgpuplannerconfig_new: () => number;
  readonly robotcontextconfig_fast: () => number;
  readonly robotcontextconfig_gpuOptimized: () => number;
  readonly robotcontextconfig_new: () => number;
  readonly robotcontextconfig_quality: () => number;
  readonly __wbg_get_birrtconfig_goal_bias: (a: number) => number;
  readonly __wbg_get_dhparam_a: (a: number) => number;
  readonly __wbg_get_dhparam_alpha: (a: number) => number;
  readonly __wbg_get_dhparam_d: (a: number) => number;
  readonly __wbg_get_dhparam_theta: (a: number) => number;
  readonly __wbg_get_distancequeryresult_distance: (a: number) => number;
  readonly __wbg_get_distancequeryresult_point1_x: (a: number) => number;
  readonly __wbg_get_distancequeryresult_point1_y: (a: number) => number;
  readonly __wbg_get_distancequeryresult_point1_z: (a: number) => number;
  readonly __wbg_get_gpuplanningcontextconfig_edge_step_size: (a: number) => number;
  readonly __wbg_get_gpuplanningcontextconfig_max_connection_distance: (a: number) => number;
  readonly __wbg_get_gpuplanningcontextconfig_safety_margin: (a: number) => number;
  readonly __wbg_get_gpuplanningcontextconfig_validation_batch_size: (a: number) => number;
  readonly __wbg_get_lazyprmconfig_edge_step_size: (a: number) => number;
  readonly __wbg_get_lazyprmconfig_max_connection_distance: (a: number) => number;
  readonly __wbg_get_lazyprmconfig_validation_batch_size: (a: number) => number;
  readonly __wbg_get_lazyprmstats_avg_batch_size: (a: number) => number;
  readonly __wbg_get_lazyprmstats_edges_checked: (a: number) => number;
  readonly __wbg_get_lazyprmstats_gpu_batches: (a: number) => number;
  readonly __wbg_get_lazyprmstats_gpu_time_ms: (a: number) => number;
  readonly __wbg_get_lazyprmstats_states_checked: (a: number) => number;
  readonly __wbg_get_motionvalidationstats_configs_checked: (a: number) => number;
  readonly __wbg_get_motionvalidationstats_invalid_configs: (a: number) => number;
  readonly __wbg_get_motionvalidationstats_total_time_ms: (a: number) => number;
  readonly __wbg_get_position_x: (a: number) => number;
  readonly __wbg_get_position_y: (a: number) => number;
  readonly __wbg_get_position_z: (a: number) => number;
  readonly __wbg_get_prmconfig_k_neighbors: (a: number) => number;
  readonly __wbg_get_prmconfig_max_connection_distance: (a: number) => number;
  readonly __wbg_get_prmconfig_num_samples: (a: number) => number;
  readonly __wbg_get_prmconfig_step_size: (a: number) => number;
  readonly __wbg_get_quaternion_w: (a: number) => number;
  readonly __wbg_get_quaternion_x: (a: number) => number;
  readonly __wbg_get_quaternion_y: (a: number) => number;
  readonly __wbg_get_quaternion_z: (a: number) => number;
  readonly __wbg_get_robotcontextstats_avg_coverage_ratio: (a: number) => number;
  readonly __wbg_get_robotcontextstats_capsules_generated: (a: number) => number;
  readonly __wbg_get_robotcontextstats_shapes_converted: (a: number) => number;
  readonly __wbg_get_robotcontextstats_shapes_unchanged: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_goal_bias: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_goal_radius: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_max_extension: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_rewire_factor: (a: number) => number;
  readonly __wbg_get_rrtstarconfig_step_size: (a: number) => number;
  readonly __wbg_get_wasmcapsuleapproximationstats_avg_coverage_ratio: (a: number) => number;
  readonly __wbg_get_wasmcapsuleapproximationstats_capsules_generated: (a: number) => number;
  readonly __wbg_get_wasmcapsuleapproximationstats_shapes_converted: (a: number) => number;
  readonly __wbg_get_wasmcapsuleapproximationstats_shapes_unchanged: (a: number) => number;
  readonly __wbg_get_wasmenvironmentcapsulestats_avg_coverage_ratio: (a: number) => number;
  readonly __wbg_get_wasmenvironmentcapsulestats_capsules_generated: (a: number) => number;
  readonly __wbg_get_wasmenvironmentcapsulestats_obstacles_converted: (a: number) => number;
  readonly __wbg_get_wasmenvironmentcapsulestats_obstacles_unchanged: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_original_path_length: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_original_waypoint_count: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_path_length: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_smoothness: (a: number) => number;
  readonly __wbg_get_wasmpathmetrics_waypoint_count: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_shortcut_iterations: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_smooth_iterations: (a: number) => number;
  readonly __wbg_get_wasmpipelineconfig_smoothing_factor: (a: number) => number;
  readonly planningresult_pathFlat: (a: number, b: number) => void;
  readonly cableconfig_withInitialTwist: (a: number, b: number) => number;
  readonly gpuplanningcontextconfig_withSafetyMargin: (a: number, b: number) => number;
  readonly cableconfig_new: () => number;
  readonly cableconfig_maxTotalTwist: (a: number) => number;
  readonly gpuplanningresult_edgesValidated: (a: number) => number;
  readonly gpuplanningresult_gpuBatches: (a: number) => number;
  readonly gpuplanningresult_pathLength: (a: number) => number;
  readonly gpuplanningresult_planningTimeMs: (a: number) => number;
  readonly gpuvscpucomparison_collisionPairs: (a: number) => number;
  readonly gpuvscpucomparison_cpuTimeMs: (a: number) => number;
  readonly gpuvscpucomparison_gpuTimeMs: (a: number) => number;
  readonly gpuvscpucomparison_speedup: (a: number) => number;
  readonly integratedgpuplannerconfig_kNeighbors: (a: number) => number;
  readonly integratedgpuplannerconfig_roadmapSamples: (a: number) => number;
  readonly lazyprmresult_edgesValidated: (a: number) => number;
  readonly lazyprmresult_gpuBatches: (a: number) => number;
  readonly lazyprmresult_pathLength: (a: number) => number;
  readonly lazyprmresult_planningTimeMs: (a: number) => number;
  readonly lazyprmstats_avgEdgesPerBatch: (a: number) => number;
  readonly motionconstraints_speed_scale: (a: number) => number;
  readonly planningresult_nodesExplored: (a: number) => number;
  readonly planningresult_pathLength: (a: number) => number;
  readonly planningresult_planningTimeMs: (a: number) => number;
  readonly robotcontext_dof: (a: number) => number;
  readonly robotcontextconfig_roadmapSamples: (a: number) => number;
  readonly robotcontextconfig_safetyMargin: (a: number) => number;
  readonly robotcontextconfig_samplesPerEdge: (a: number) => number;
  readonly taskspaceplanningresult_iterations: (a: number) => number;
  readonly taskspaceplanningresult_planningTimeMs: (a: number) => number;
  readonly taskspacerrtconfig_goalBias: (a: number) => number;
  readonly taskspacerrtconfig_maxIterations: (a: number) => number;
  readonly taskspacerrtconfig_orientationTolerance: (a: number) => number;
  readonly taskspacerrtconfig_positionTolerance: (a: number) => number;
  readonly taskspacerrtconfig_stepSize: (a: number) => number;
  readonly trajectoryconfig_timeStep: (a: number) => number;
  readonly wasmcapsuleapproximationstats_avgCoverageRatio: (a: number) => number;
  readonly wasmcapsuleapproximationstats_capsulesGenerated: (a: number) => number;
  readonly wasmcapsuleapproximationstats_shapesConverted: (a: number) => number;
  readonly wasmcapsuleapproximationstats_shapesUnchanged: (a: number) => number;
  readonly wasmconfigurationspace_dimensions: (a: number) => number;
  readonly wasmdiscretemotionvalidator_maxStepSize: (a: number) => number;
  readonly wasmenvironmentcapsulestats_avgCoverageRatio: (a: number) => number;
  readonly wasmenvironmentcapsulestats_capsulesGenerated: (a: number) => number;
  readonly wasmenvironmentcapsulestats_obstaclesConverted: (a: number) => number;
  readonly wasmenvironmentcapsulestats_obstaclesUnchanged: (a: number) => number;
  readonly wasmpipelineresult_dof: (a: number) => number;
  readonly wasmpipelineresult_numWaypoints: (a: number) => number;
  readonly wasmpipelineresult_processingTimeMs: (a: number) => number;
  readonly wasmrobotcollisionmodel_acmSize: (a: number) => number;
  readonly wasmtoollibrary_len: (a: number) => number;
  readonly wasmtrajectory_numJoints: (a: number) => number;
  readonly wasmtrajectorypoint_time: (a: number) => number;
  readonly workspaceanalysis_conditionNumber: (a: number) => number;
  readonly workspaceanalysis_manipulability: (a: number) => number;
  readonly workspaceanalysis_minSingularValue: (a: number) => number;
  readonly __wbg_cableconfig_free: (a: number, b: number) => void;
  readonly __wbg_gpuplanningcontextconfig_free: (a: number, b: number) => void;
  readonly __wbg_gpuvscpucomparison_free: (a: number, b: number) => void;
  readonly __wbg_lazyprmconfig_free: (a: number, b: number) => void;
  readonly __wbg_lazyprmstats_free: (a: number, b: number) => void;
  readonly __wbg_motionconstraints_free: (a: number, b: number) => void;
  readonly __wbg_motionvalidationstats_free: (a: number, b: number) => void;
  readonly __wbg_pose_free: (a: number, b: number) => void;
  readonly __wbg_position_free: (a: number, b: number) => void;
  readonly __wbg_prmconfig_free: (a: number, b: number) => void;
  readonly __wbg_quaternion_free: (a: number, b: number) => void;
  readonly __wbg_robotcontextconfig_free: (a: number, b: number) => void;
  readonly __wbg_robotcontextstats_free: (a: number, b: number) => void;
  readonly __wbg_taskspacerrtconfig_free: (a: number, b: number) => void;
  readonly __wbg_wasmcapsuleapproximationoptions_free: (a: number, b: number) => void;
  readonly __wbg_wasmcapsuleapproximationstats_free: (a: number, b: number) => void;
  readonly __wbg_wasmenvironmentcapsuleoptions_free: (a: number, b: number) => void;
  readonly __wbg_wasmenvironmentcapsulestats_free: (a: number, b: number) => void;
  readonly __wbg_wasmpathmetrics_free: (a: number, b: number) => void;
  readonly __wbg_wasmpipelineconfig_free: (a: number, b: number) => void;
  readonly __wbg_gpuplanningcontext_free: (a: number, b: number) => void;
  readonly wasmtoollibrary_isEmpty: (a: number) => number;
  readonly robotcontext_fromUrdfWithConfig: (a: number, b: number, c: number, d: number) => void;
  readonly gpuplanningcontext_buildRoadmap: (a: number) => void;
  readonly __wbindgen_export_0: (a: number, b: number) => number;
  readonly __wbindgen_export_1: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: (a: number) => void;
  readonly __wbindgen_export_3: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_4: WebAssembly.Table;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export_5: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_6: (a: number, b: number, c: number, d: number) => void;
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
