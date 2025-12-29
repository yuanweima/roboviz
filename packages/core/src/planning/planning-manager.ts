/**
 * Motion Planning Manager
 *
 * Manages motion planning using trajx-wasm with GPU-accelerated planners.
 * Provides a complete pipeline from planning to trajectory generation.
 */

import type {
  PlanningRequest,
  PlanningResult,
  PathWaypoint,
  PathMetrics,
  PipelineProgress,
  PipelineProgressCallback,
  CollisionChecker,
  BiRRTConfig,
  RRTStarConfig,
  PRMConfig,
  TaskSpaceRRTConfig,
  PipelineConfig,
  TrajectoryGeneratorConfig,
  PipelineStage,
} from './types';
import {
  DEFAULT_BIRRT_CONFIG,
  DEFAULT_RRT_STAR_CONFIG,
  DEFAULT_PRM_CONFIG,
  DEFAULT_TASK_SPACE_RRT_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
} from './types';

// ============================================================================
// trajx-wasm Type Interfaces
// ============================================================================

interface TrajxBiRRTPlanner {
  plan(start: Float64Array, goal: Float64Array): TrajxPlanResult;
  planWithCollisionCheck(
    start: Float64Array,
    goal: Float64Array,
    checker: (joints: Float64Array) => boolean
  ): TrajxPlanResult;
  free(): void;
}

interface TrajxRRTStarPlanner {
  plan(start: Float64Array, goal: Float64Array): TrajxPlanResult;
  planWithCollisionCheck(
    start: Float64Array,
    goal: Float64Array,
    checker: (joints: Float64Array) => boolean
  ): TrajxPlanResult;
  free(): void;
}

interface TrajxPRMPlanner {
  plan(start: Float64Array, goal: Float64Array): TrajxPlanResult;
  planWithCollisionCheck(
    start: Float64Array,
    goal: Float64Array,
    checker: (joints: Float64Array) => boolean
  ): TrajxPlanResult;
  query(start: Float64Array, goal: Float64Array): TrajxPlanResult;
  queryWithCollisionCheck(
    start: Float64Array,
    goal: Float64Array,
    checker: (joints: Float64Array) => boolean
  ): TrajxPlanResult;
  buildRoadmap(): number;
  buildRoadmapWithCollisionCheck(checker: (joints: Float64Array) => boolean): number;
  free(): void;
}

interface TrajxTaskSpaceRRTPlanner {
  plan(start: number[], targetPose: TrajxPose): TrajxPlanResult;
  planWithCollisionCheck(
    start: number[],
    targetPose: TrajxPose,
    checker: (joints: Float64Array) => boolean
  ): TrajxPlanResult;
  setWorkspaceBounds(bounds: Float64Array): void;
  free(): void;
}

interface TrajxPlanResult {
  readonly success: boolean;
  readonly waypointCount: number;
  readonly errorMessage?: string;
  readonly pathLength: number;
  readonly nodesExplored: number;
  getPathFlat(): Float64Array;
  getWaypoint(index: number): Float64Array;
  free(): void;
}

interface TrajxPipelineConfig {
  withShortcutIterations(n: number): TrajxPipelineConfig;
  withSmoothIterations(n: number): TrajxPipelineConfig;
  withSmoothingFactor(f: number): TrajxPipelineConfig;
  withMetrics(enabled: boolean): TrajxPipelineConfig;
}

interface TrajxPlanningPipeline {
  process(pathFlat: Float64Array, dof: number): TrajxPipelineResult;
  processWithCollisionCheck(
    pathFlat: Float64Array,
    dof: number,
    checker: (joints: Float64Array) => boolean
  ): TrajxPipelineResult;
  free(): void;
}

interface TrajxPathMetrics {
  readonly pathLength: number;
  readonly smoothness: number;
  readonly improvementRatio: number;
}

interface TrajxPipelineResult {
  readonly success: boolean;
  readonly waypointCount: number;
  readonly originalWaypointCount: number;
  readonly metrics?: TrajxPathMetrics;
  getPathFlat(): Float64Array;
  free(): void;
}

interface TrajxTrajectoryConfig {
  withTimeStep(dt: number): TrajxTrajectoryConfig;
  withJerkLimits(jerk: Float64Array): TrajxTrajectoryConfig;
}

interface TrajxTrajectoryGenerator {
  generateFromPath(pathFlat: Float64Array): TrajxTrajectory;
  generateFromWaypoints(waypoints: Float64Array, dof: number): TrajxTrajectory;
  free(): void;
}

interface TrajxTrajectory {
  readonly duration: number;
  readonly numPoints: number;
  readonly dof: number;
  getTimes(): Float64Array;
  getPositionsFlat(): Float64Array;
  getVelocitiesFlat(): Float64Array;
  getAccelerationsFlat(): Float64Array;
  sample(time: number): TrajxTrajectoryPoint | undefined;
  getPoint(index: number): TrajxTrajectoryPoint | undefined;
  free(): void;
}

interface TrajxTrajectoryPoint {
  readonly time: number;
  readonly positions: Float64Array;
  readonly velocities: Float64Array;
  readonly accelerations: Float64Array;
}

interface TrajxJointLimits {
  free(): void;
}

interface TrajxPose {
  getPositionArray(): number[];
  getOrientationArray(): number[];
}

interface TrajxRobot {
  readonly dof: number;
  inverseKinematics(pose: TrajxPose, seed?: number[]): { success: boolean; solution?: number[] };
}

// WASM Config classes
interface TrajxBiRRTConfig {
  withMaxIterations(n: number): TrajxBiRRTConfig;
  withGoalBias(bias: number): TrajxBiRRTConfig;
  withMaxExtension(ext: number): TrajxBiRRTConfig;
  withConnectionThreshold(threshold: number): TrajxBiRRTConfig;
  free(): void;
}

interface TrajxRRTStarConfig {
  withMaxIterations(n: number): TrajxRRTStarConfig;
  withGoalBias(bias: number): TrajxRRTStarConfig;
  withMaxExtension(ext: number): TrajxRRTStarConfig;
  withGoalRadius(radius: number): TrajxRRTStarConfig;
  withRewireFactor(factor: number): TrajxRRTStarConfig;
  free(): void;
}

interface TrajxPRMConfig {
  withNumSamples(n: number): TrajxPRMConfig;
  withKNeighbors(k: number): TrajxPRMConfig;
  withMaxConnectionDistance(dist: number): TrajxPRMConfig;
  free(): void;
}

interface TrajxModule {
  BiRRTPlanner: new (limits: TrajxJointLimits, config?: TrajxBiRRTConfig | null) => TrajxBiRRTPlanner;
  RRTStarPlanner: new (limits: TrajxJointLimits, config?: TrajxRRTStarConfig | null) => TrajxRRTStarPlanner;
  PRMPlanner: new (limits: TrajxJointLimits, config?: TrajxPRMConfig | null) => TrajxPRMPlanner;
  TaskSpaceRRTPlanner: new (robot: TrajxRobot, config?: Partial<TaskSpaceRRTConfig>) => TrajxTaskSpaceRRTPlanner;
  JointLimits: new (lower: Float64Array, upper: Float64Array) => TrajxJointLimits;
  BiRRTConfig: new () => TrajxBiRRTConfig;
  RRTStarConfig: new () => TrajxRRTStarConfig;
  PRMConfig: new () => TrajxPRMConfig;
  WasmPipelineConfig: new () => TrajxPipelineConfig;
  WasmPlanningPipeline: new (limits: TrajxJointLimits, config: TrajxPipelineConfig) => TrajxPlanningPipeline;
  TrajectoryConfig: new (maxVel: Float64Array, maxAcc: Float64Array) => TrajxTrajectoryConfig;
  TrajectoryGenerator: new (config: TrajxTrajectoryConfig) => TrajxTrajectoryGenerator;
  Pose: {
    fromPositionQuaternion(
      x: number, y: number, z: number,
      qw: number, qx: number, qy: number, qz: number
    ): TrajxPose;
    fromPositionEuler(
      x: number, y: number, z: number,
      roll: number, pitch: number, yaw: number
    ): TrajxPose;
  };
}

// ============================================================================
// Planning Manager
// ============================================================================

/**
 * Motion Planning Manager
 *
 * Singleton that manages the complete motion planning pipeline:
 * 1. Validation
 * 2. Path planning (BiRRT, RRT*, PRM, Task-Space RRT)
 * 3. Post-processing (shortcutting, smoothing)
 * 4. Trajectory generation
 */
export class MotionPlanningManager {
  private trajx: TrajxModule | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  // Current planning state
  private currentStage: PipelineStage = 'idle';
  private abortController: AbortController | null = null;

  /**
   * Initialize the WASM module
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Dynamic import to avoid loading WASM at module load time
      const trajxModule = await import('trajx-wasm') as unknown as TrajxModule & {
        default?: () => Promise<void>;
        init?: () => void;
      };

      // Initialize WASM binary
      if (typeof trajxModule.default === 'function') {
        await trajxModule.default();
      }

      // Set up panic hooks
      if (typeof trajxModule.init === 'function') {
        try {
          trajxModule.init();
        } catch {
          // Ignore panic hook errors
        }
      }

      this.trajx = trajxModule as unknown as TrajxModule;
      this.initialized = true;
    } catch (error) {
      this.initPromise = null;
      throw new Error(`Failed to initialize trajx-wasm: ${(error as Error).message}`);
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current pipeline stage
   */
  getCurrentStage(): PipelineStage {
    return this.currentStage;
  }

  /**
   * Abort current planning operation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.currentStage = 'idle';
  }

  /**
   * Plan a motion path
   */
  async plan(
    request: PlanningRequest,
    collisionChecker?: CollisionChecker,
    onProgress?: PipelineProgressCallback
  ): Promise<PlanningResult> {
    if (!this.trajx) {
      throw new Error('Planning manager not initialized');
    }

    // Set up abort controller
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const startTime = performance.now();
    let planningTimeMs = 0;
    let postProcessingTimeMs = 0;
    let trajectoryTimeMs = 0;

    try {
      // === Stage 1: Validation ===
      this.currentStage = 'validating';
      this.emitProgress(onProgress, 'validating', 0, 'Validating request...');

      if (signal.aborted) throw new Error('Planning aborted');

      // Validate request
      const validationError = this.validateRequest(request);
      if (validationError) {
        return this.errorResult(validationError, startTime);
      }

      // Validate endpoints if requested
      if (request.validateEndpoints && collisionChecker) {
        if (!collisionChecker(request.startJoints)) {
          return this.errorResult('Start configuration is in collision', startTime);
        }

        if (request.goal.type === 'joints') {
          if (!collisionChecker(request.goal.joints)) {
            return this.errorResult('Goal configuration is in collision', startTime);
          }
        }
      }

      this.emitProgress(onProgress, 'validating', 1, 'Validation complete');

      // === Stage 2: Planning ===
      this.currentStage = 'planning';
      this.emitProgress(onProgress, 'planning', 0, 'Planning path...');

      if (signal.aborted) throw new Error('Planning aborted');

      const planStartTime = performance.now();
      const planResult = await this.executePlanning(request, collisionChecker);
      planningTimeMs = performance.now() - planStartTime;

      if (!planResult.success) {
        return this.errorResult(planResult.error || 'Planning failed', startTime);
      }

      this.emitProgress(onProgress, 'planning', 1, `Found path with ${planResult.path.length} waypoints`);

      // === Stage 3: Post-processing ===
      let processedPath = planResult.path;
      let metrics: PathMetrics | undefined;

      const pipelineConfig = request.pipeline || DEFAULT_PIPELINE_CONFIG;

      if (pipelineConfig.enablePostProcessing) {
        this.currentStage = 'post-processing';
        this.emitProgress(onProgress, 'post-processing', 0, 'Optimizing path...');

        if (signal.aborted) throw new Error('Planning aborted');

        const ppStartTime = performance.now();
        const ppResult = this.postProcessPath(
          planResult.path,
          request.jointLimits,
          pipelineConfig,
          collisionChecker
        );
        postProcessingTimeMs = performance.now() - ppStartTime;

        processedPath = ppResult.path;
        metrics = ppResult.metrics;

        this.emitProgress(
          onProgress,
          'post-processing',
          1,
          `Optimized: ${planResult.path.length} -> ${processedPath.length} waypoints`
        );
      }

      // === Stage 4: Trajectory Generation ===
      if (request.trajectory) {
        this.currentStage = 'trajectory-generation';
        this.emitProgress(onProgress, 'trajectory-generation', 0, 'Generating trajectory...');

        if (signal.aborted) throw new Error('Planning aborted');

        const trajStartTime = performance.now();
        processedPath = this.generateTrajectory(processedPath, request.trajectory);
        trajectoryTimeMs = performance.now() - trajStartTime;

        this.emitProgress(onProgress, 'trajectory-generation', 1, 'Trajectory generated');
      }

      // === Complete ===
      this.currentStage = 'complete';
      const totalTimeMs = performance.now() - startTime;

      this.emitProgress(onProgress, 'complete', 1, `Planning complete in ${totalTimeMs.toFixed(0)}ms`);

      return {
        success: true,
        path: processedPath,
        metrics,
        planningTimeMs,
        postProcessingTimeMs,
        trajectoryTimeMs,
        totalTimeMs,
        nodesExplored: planResult.nodesExplored,
        collisionChecked: !!collisionChecker,
      };
    } catch (error) {
      this.currentStage = 'error';
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitProgress(onProgress, 'error', 0, errorMessage);
      return this.errorResult(errorMessage, startTime);
    } finally {
      this.abortController = null;
      if (this.currentStage !== 'error') {
        this.currentStage = 'idle';
      }
    }
  }

  /**
   * Execute the planning algorithm
   */
  private async executePlanning(
    request: PlanningRequest,
    collisionChecker?: CollisionChecker
  ): Promise<{ success: boolean; path: PathWaypoint[]; error?: string; nodesExplored?: number }> {
    if (!this.trajx) {
      return { success: false, path: [], error: 'Not initialized' };
    }

    const { planner, startJoints, goal, jointLimits } = request;
    const dof = startJoints.length;

    // Create joint limits
    const limits = new this.trajx.JointLimits(
      new Float64Array(jointLimits.lower),
      new Float64Array(jointLimits.upper)
    );

    try {
      let result: TrajxPlanResult;
      let goalJoints: number[];

      // Handle goal specification
      if (goal.type === 'pose') {
        // Task-space goal requires IK or task-space planner
        if (planner.type === 'task-space-rrt') {
          return this.executeTaskSpacePlanning(request, collisionChecker);
        } else {
          // Use IK to convert pose to joints - would need robot instance
          return { success: false, path: [], error: 'Pose goals require task-space-rrt planner or robot instance for IK' };
        }
      } else {
        goalJoints = goal.joints;
      }

      // Convert to Float64Array for WASM
      const startArray = new Float64Array(startJoints);
      const goalArray = new Float64Array(goalJoints);

      // Wrap collision checker for trajx
      const trajxChecker = collisionChecker
        ? (joints: Float64Array) => collisionChecker(Array.from(joints))
        : undefined;

      switch (planner.type) {
        case 'birrt': {
          const userConfig = { ...DEFAULT_BIRRT_CONFIG, ...planner.config } as BiRRTConfig;
          // Create WASM config object using builder pattern
          // Note: Each withXxx() call consumes the previous object and returns a new one
          // The config is consumed by the Planner constructor, so we don't call free() on it
          const wasmConfig = new this.trajx.BiRRTConfig()
            .withMaxIterations(userConfig.maxIterations)
            .withGoalBias(userConfig.goalBias)
            .withMaxExtension(userConfig.maxExtension);
          const birrt = new this.trajx.BiRRTPlanner(limits, wasmConfig);

          try {
            result = trajxChecker
              ? birrt.planWithCollisionCheck(startArray, goalArray, trajxChecker)
              : birrt.plan(startArray, goalArray);
          } finally {
            birrt.free();
          }
          break;
        }

        case 'rrt-star': {
          const userConfig = { ...DEFAULT_RRT_STAR_CONFIG, ...planner.config } as RRTStarConfig;
          // Create WASM config object using builder pattern
          // Note: Each withXxx() call consumes the previous object and returns a new one
          // The config is consumed by the Planner constructor, so we don't call free() on it
          const wasmConfig = new this.trajx.RRTStarConfig()
            .withMaxIterations(userConfig.maxIterations)
            .withGoalBias(userConfig.goalBias)
            .withMaxExtension(userConfig.maxExtension)
            .withGoalRadius(userConfig.goalRadius)
            .withRewireFactor(userConfig.rewireFactor);
          const rrtStar = new this.trajx.RRTStarPlanner(limits, wasmConfig);

          try {
            result = trajxChecker
              ? rrtStar.planWithCollisionCheck(startArray, goalArray, trajxChecker)
              : rrtStar.plan(startArray, goalArray);
          } finally {
            rrtStar.free();
          }
          break;
        }

        case 'prm': {
          const userConfig = { ...DEFAULT_PRM_CONFIG, ...planner.config } as PRMConfig;
          // Create WASM config object using builder pattern
          // Note: Each withXxx() call consumes the previous object and returns a new one
          // The config is consumed by the Planner constructor, so we don't call free() on it
          const wasmConfig = new this.trajx.PRMConfig()
            .withNumSamples(userConfig.numSamples)
            .withKNeighbors(userConfig.kNeighbors)
            .withMaxConnectionDistance(userConfig.maxConnectionDistance);
          const prm = new this.trajx.PRMPlanner(limits, wasmConfig);

          try {
            // PRM requires building the roadmap first, then querying
            if (trajxChecker) {
              prm.buildRoadmapWithCollisionCheck(trajxChecker);
              result = prm.queryWithCollisionCheck(startArray, goalArray, trajxChecker);
            } else {
              prm.buildRoadmap();
              result = prm.query(startArray, goalArray);
            }
          } finally {
            prm.free();
          }
          break;
        }

        case 'task-space-rrt': {
          // Task-space RRT requires a robot instance for IK
          // This is handled separately in executeTaskSpacePlanning()
          return {
            success: false,
            path: [],
            error: 'Task-space RRT requires a robot instance. Use planWithRobot() method instead.',
          };
        }

        default:
          return { success: false, path: [], error: `Unknown planner type: ${planner.type}` };
      }

      if (!result.success) {
        return { success: false, path: [], error: result.errorMessage || 'Planning failed' };
      }

      // Convert result to PathWaypoint[]
      const path = this.flatArrayToWaypoints(result.getPathFlat(), dof);

      return {
        success: true,
        path,
        nodesExplored: result.nodesExplored,
      };
    } finally {
      limits.free();
    }
  }

  /**
   * Execute task-space planning
   */
  private async executeTaskSpacePlanning(
    request: PlanningRequest,
    collisionChecker?: CollisionChecker
  ): Promise<{ success: boolean; path: PathWaypoint[]; error?: string; nodesExplored?: number }> {
    // Task-space planning requires a robot instance
    // This is a placeholder - in practice, you'd pass the robot to the manager
    return {
      success: false,
      path: [],
      error: 'Task-space planning requires robot instance - use planWithRobot() method',
    };
  }

  /**
   * Post-process the path (shortcutting + smoothing)
   */
  private postProcessPath(
    path: PathWaypoint[],
    jointLimits: { lower: number[]; upper: number[] },
    config: PipelineConfig,
    collisionChecker?: CollisionChecker
  ): { path: PathWaypoint[]; metrics?: PathMetrics } {
    if (!this.trajx || path.length < 3) {
      return { path };
    }

    const dof = path[0].joints.length;
    const originalCount = path.length;

    // Create limits
    const limits = new this.trajx.JointLimits(
      new Float64Array(jointLimits.lower),
      new Float64Array(jointLimits.upper)
    );

    try {
      // Create pipeline config
      const pipelineConfig = new this.trajx.WasmPipelineConfig()
        .withShortcutIterations(config.shortcutIterations)
        .withSmoothIterations(config.smoothIterations)
        .withSmoothingFactor(config.smoothingFactor)
        .withMetrics(config.calculateMetrics);

      // Create pipeline
      const pipeline = new this.trajx.WasmPlanningPipeline(limits, pipelineConfig);

      try {
        // Convert path to flat array
        const pathFlat = this.waypointsToFlatArray(path);

        // Process
        const trajxChecker = collisionChecker
          ? (joints: Float64Array) => collisionChecker(Array.from(joints))
          : undefined;

        const result = trajxChecker
          ? pipeline.processWithCollisionCheck(pathFlat, dof, trajxChecker)
          : pipeline.process(pathFlat, dof);

        if (!result.success) {
          return { path };
        }

        // Convert back to waypoints
        const processedPath = this.flatArrayToWaypoints(result.getPathFlat(), dof);

        // Build metrics
        let metrics: PathMetrics | undefined;
        if (config.calculateMetrics && result.metrics) {
          metrics = {
            pathLength: result.metrics.pathLength,
            smoothness: result.metrics.smoothness,
            waypointCount: result.waypointCount,
            originalWaypointCount: originalCount,
            improvementRatio: result.metrics.improvementRatio,
            waypointReductionRatio: 1 - result.waypointCount / originalCount,
          };
        }

        return { path: processedPath, metrics };
      } finally {
        pipeline.free();
      }
    } finally {
      limits.free();
    }
  }

  /**
   * Generate time-parameterized trajectory
   */
  private generateTrajectory(
    path: PathWaypoint[],
    config: TrajectoryGeneratorConfig
  ): PathWaypoint[] {
    if (!this.trajx || path.length < 2) {
      return path;
    }

    const dof = path[0].joints.length;

    // Create trajectory config
    // Note: withTimeStep consumes the config object (builder pattern)
    let trajConfig = new this.trajx.TrajectoryConfig(
      new Float64Array(config.maxVelocity),
      new Float64Array(config.maxAcceleration)
    ).withTimeStep(config.timeStep);

    if (config.maxJerk) {
      trajConfig = trajConfig.withJerkLimits(new Float64Array(config.maxJerk));
    }

    // Create generator (consumes trajConfig)
    const generator = new this.trajx.TrajectoryGenerator(trajConfig);

    try {
      // Convert path to flat array for generateFromWaypoints
      const pathFlat = this.waypointsToFlatArray(path);

      // Generate trajectory
      const trajectory = generator.generateFromWaypoints(pathFlat, dof);

      try {
        // Get trajectory data using the actual WASM API
        const times = trajectory.getTimes();
        const positionsFlat = trajectory.getPositionsFlat();
        const velocitiesFlat = trajectory.getVelocitiesFlat();
        const accelerationsFlat = trajectory.getAccelerationsFlat();

        const numPoints = times.length;
        const result: PathWaypoint[] = [];

        for (let i = 0; i < numPoints; i++) {
          const offset = i * dof;
          result.push({
            joints: Array.from(positionsFlat.slice(offset, offset + dof)),
            time: times[i],
            velocity: Array.from(velocitiesFlat.slice(offset, offset + dof)),
            acceleration: Array.from(accelerationsFlat.slice(offset, offset + dof)),
          });
        }

        return result;
      } finally {
        trajectory.free();
      }
    } finally {
      generator.free();
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private validateRequest(request: PlanningRequest): string | null {
    const { startJoints, goal, jointLimits } = request;

    if (!startJoints || startJoints.length === 0) {
      return 'Start joints required';
    }

    if (!goal) {
      return 'Goal specification required';
    }

    if (goal.type === 'joints' && goal.joints.length !== startJoints.length) {
      return 'Goal joints must have same DOF as start joints';
    }

    if (!jointLimits || !jointLimits.lower || !jointLimits.upper) {
      return 'Joint limits required';
    }

    if (jointLimits.lower.length !== startJoints.length) {
      return 'Joint limits must match DOF';
    }

    return null;
  }

  private flatArrayToWaypoints(flat: Float64Array, dof: number): PathWaypoint[] {
    const waypoints: PathWaypoint[] = [];
    const numWaypoints = flat.length / dof;

    for (let i = 0; i < numWaypoints; i++) {
      const joints = Array.from(flat.slice(i * dof, (i + 1) * dof));
      waypoints.push({ joints });
    }

    return waypoints;
  }

  private waypointsToFlatArray(waypoints: PathWaypoint[]): Float64Array {
    if (waypoints.length === 0) return new Float64Array(0);

    const dof = waypoints[0].joints.length;
    const flat = new Float64Array(waypoints.length * dof);

    for (let i = 0; i < waypoints.length; i++) {
      for (let j = 0; j < dof; j++) {
        flat[i * dof + j] = waypoints[i].joints[j];
      }
    }

    return flat;
  }

  private errorResult(error: string, startTime: number): PlanningResult {
    return {
      success: false,
      error,
      path: [],
      totalTimeMs: performance.now() - startTime,
      planningTimeMs: 0,
      collisionChecked: false,
    };
  }

  private emitProgress(
    callback: PipelineProgressCallback | undefined,
    stage: PipelineStage,
    progress: number,
    message?: string
  ): void {
    if (callback) {
      callback({
        stage,
        progress,
        message,
        currentTime: performance.now(),
      });
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: MotionPlanningManager | null = null;

/**
 * Get the motion planning manager singleton
 */
export function getMotionPlanningManager(): MotionPlanningManager {
  if (!managerInstance) {
    managerInstance = new MotionPlanningManager();
  }
  return managerInstance;
}

/**
 * Reset the motion planning manager (for testing)
 */
export function resetMotionPlanningManager(): void {
  if (managerInstance) {
    managerInstance.abort();
  }
  managerInstance = null;
}
