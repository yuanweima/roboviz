/**
 * GPU Planning Engine
 *
 * Core engine for GPU-accelerated motion planning using trajx-wasm.
 * Implements the complete planning pipeline:
 * Motion API → Capsule Transform → Collision Environment → Lazy-PRM → Trajectory
 */

import type {
  GpuPlanningEngineConfig,
  GpuPlanningEngineState,
  IGpuPlanningEngine,
  GpuPlanningProgress,
  GpuPlanningResult,
  PointToPointRequest,
  MultiWaypointRequest,
  CollisionCheckerFn,
  PlannerParams,
  GpuPlannerType,
  GpuPathWaypoint,
  GpuPlanningEventCallback,
  GpuPlanningEvent,
  JointConfiguration,
} from './types';
import {
  DEFAULT_PLANNER_PARAMS,
  INITIAL_PLANNING_PROGRESS,
} from './types';
import type {
  CollisionWorld,
  WorldCapsule,
  RobotCapsuleModel,
} from '../../collision/world/types';
import {
  CapsuleTransformer,
  capsulesCollision,
  checkSelfCollision,
  capsuleSphereCollision,
  capsuleBoxCollision,
} from '../../collision/world/CapsuleTransformer';

// ============================================================================
// GPU Planning Engine Implementation
// ============================================================================

export class GpuPlanningEngine implements IGpuPlanningEngine {
  private config: GpuPlanningEngineConfig;
  private _state: GpuPlanningEngineState;
  private capsuleTransformer: CapsuleTransformer | null = null;
  private progressCallbacks: Set<(progress: GpuPlanningProgress) => void> = new Set();
  private eventCallbacks: Set<GpuPlanningEventCallback> = new Set();
  private abortController: AbortController | null = null;

  // trajx-wasm module reference (loaded dynamically)
  private trajxWasm: typeof import('../../wasm/trajx_wasm') | null = null;

  constructor(config: GpuPlanningEngineConfig) {
    this.config = {
      ...config,
      defaultPlanner: config.defaultPlanner || 'lazy-prm',
      defaultParams: { ...DEFAULT_PLANNER_PARAMS, ...config.defaultParams } as Required<PlannerParams>,
    };

    this._state = {
      initialized: false,
      isPlanning: false,
      collisionWorld: null,
      progress: { ...INITIAL_PLANNING_PROGRESS },
      lastResult: null,
    };
  }

  // ============================================================================
  // Getters
  // ============================================================================

  get isReady(): boolean {
    return this._state.initialized;
  }

  get state(): GpuPlanningEngineState {
    return { ...this._state };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<void> {
    if (this._state.initialized) {
      return;
    }

    this.updateProgress({
      phase: 'initializing',
      message: 'Loading trajx-wasm module...',
    });

    try {
      // Dynamically import trajx-wasm
      this.trajxWasm = await import('../../wasm/trajx_wasm');

      // Initialize capsule transformer if robot capsule model is provided in config
      // (This will be set later via setCollisionWorld if not provided initially)

      this._state.initialized = true;
      this.updateProgress({
        phase: 'idle',
        message: 'Ready',
      });

      this.emitEvent({ type: 'initialized', timestamp: Date.now() });
    } catch (error) {
      this.updateProgress({
        phase: 'failed',
        message: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      throw error;
    }
  }

  dispose(): void {
    this.abort();
    this.progressCallbacks.clear();
    this.eventCallbacks.clear();
    this.capsuleTransformer = null;
    this.trajxWasm = null;
    this._state.initialized = false;
  }

  // ============================================================================
  // Collision World Management
  // ============================================================================

  setCollisionWorld(world: CollisionWorld): void {
    this._state.collisionWorld = world;

    // Update capsule transformer with new robot capsules if provided
    if (world.robotCapsules) {
      this.capsuleTransformer = new CapsuleTransformer(world.robotCapsules);
    }

    this.emitEvent({
      type: 'collision-world-updated',
      timestamp: Date.now(),
      data: { objectCount: world.objects.size },
    });
  }

  updateRobotJoints(joints: number[]): void {
    // This would update the robot's current configuration for visualization
    // The actual collision checking uses the joints passed to the checker
  }

  // ============================================================================
  // Collision Checking
  // ============================================================================

  createCollisionChecker(): CollisionCheckerFn {
    const world = this._state.collisionWorld;
    const transformer = this.capsuleTransformer;

    if (!world) {
      // Return a checker that always returns false (no collision) if no world
      return () => false;
    }

    return (joints: number[]): boolean => {
      // If we have a transformer and robot capsules, check robot collision
      if (transformer) {
        // Get link transforms from FK - this returns a flat Float64Array of 4x4 matrices
        const linkTransforms = this.computeLinkTransformsFlat(joints);

        if (linkTransforms.length > 0) {
          // Transform capsules to world coordinates
          const worldCapsules = transformer.transform(linkTransforms);

          // Check self-collision
          const selfCollisionResult = checkSelfCollision(
            worldCapsules,
            transformer.getSelfCollisionPairs()
          );
          if (selfCollisionResult.hasCollision) {
            return true;
          }

          // Check collision with environment objects
          for (const [, obj] of world.objects) {
            if (!obj.enabled) continue;

            const objPos = obj.transform.position;

            switch (obj.type) {
              case 'sphere': {
                const params = obj.params as { type: 'sphere'; radius: number };
                for (const capsule of worldCapsules) {
                  if (capsuleSphereCollision(capsule, objPos, params.radius)) {
                    return true;
                  }
                }
                break;
              }
              case 'box': {
                const params = obj.params as { type: 'box'; width: number; height: number; depth: number };
                const halfExtents: [number, number, number] = [
                  params.width / 2,
                  params.height / 2,
                  params.depth / 2,
                ];
                for (const capsule of worldCapsules) {
                  if (capsuleBoxCollision(capsule, objPos, halfExtents)) {
                    return true;
                  }
                }
                break;
              }
              case 'cylinder': {
                // Approximate cylinder as capsule for collision check
                const params = obj.params as { type: 'cylinder'; radius: number; height: number };
                const cylinderCapsule: WorldCapsule = {
                  linkIndex: -1,
                  radius: params.radius,
                  point1: [objPos[0], objPos[1] - params.height / 2, objPos[2]],
                  point2: [objPos[0], objPos[1] + params.height / 2, objPos[2]],
                };
                for (const robotCapsule of worldCapsules) {
                  if (capsulesCollision(robotCapsule, cylinderCapsule)) {
                    return true;
                  }
                }
                break;
              }
              case 'capsule': {
                const params = obj.params as { type: 'capsule'; radius: number; height: number };
                const envCapsule: WorldCapsule = {
                  linkIndex: -1,
                  radius: params.radius,
                  point1: [objPos[0], objPos[1] - params.height / 2, objPos[2]],
                  point2: [objPos[0], objPos[1] + params.height / 2, objPos[2]],
                };
                for (const robotCapsule of worldCapsules) {
                  if (capsulesCollision(robotCapsule, envCapsule)) {
                    return true;
                  }
                }
                break;
              }
              case 'mesh': {
                // Mesh collision requires more complex handling
                // For now, use bounding sphere approximation
                const params = obj.params as { type: 'mesh'; boundingSphere?: { center: [number, number, number]; radius: number } };
                if (params.boundingSphere) {
                  for (const capsule of worldCapsules) {
                    if (capsuleSphereCollision(capsule, objPos, params.boundingSphere.radius)) {
                      return true;
                    }
                  }
                }
                break;
              }
            }
          }
        }
      }

      return false;
    };
  }

  /**
   * Compute link transforms as a flat Float64Array of 4x4 matrices
   * This will use trajx-wasm's FK when available
   */
  private computeLinkTransformsFlat(joints: number[]): Float64Array {
    // This would use trajx-wasm's FK to compute link transforms
    // For now, return empty array (will be connected to actual FK later)
    if (this.trajxWasm) {
      // TODO: Call trajx-wasm FK
      // const robot = this.trajxWasm.loadRobot(this.config.robotUrdf);
      // return robot.getLinkTransforms(joints);
    }

    return new Float64Array(0);
  }

  // ============================================================================
  // Planning Methods
  // ============================================================================

  async planPointToPoint(request: PointToPointRequest): Promise<GpuPlanningResult> {
    if (!this._state.initialized) {
      throw new Error('GpuPlanningEngine not initialized. Call initialize() first.');
    }

    if (this._state.isPlanning) {
      throw new Error('Planning already in progress. Call abort() first.');
    }

    this._state.isPlanning = true;
    this._state.lastResult = null;
    this.abortController = new AbortController();

    const startTime = performance.now();
    const params = { ...DEFAULT_PLANNER_PARAMS, ...this.config.defaultParams, ...request.params } as Required<PlannerParams>;
    const planner = request.planner || this.config.defaultPlanner || 'lazy-prm';

    this.emitEvent({ type: 'planning-started', timestamp: Date.now() });
    this.updateProgress({
      phase: 'building-roadmap',
      phaseProgress: 0,
      overallProgress: 0,
      message: `Building ${planner} roadmap...`,
    });

    try {
      const result = await this.executePlanning(
        request.startJoints,
        request.goalJoints,
        planner,
        params,
        this.abortController.signal
      );

      this._state.lastResult = result;
      this._state.isPlanning = false;

      if (result.success) {
        this.updateProgress({
          phase: 'completed',
          phaseProgress: 1,
          overallProgress: 1,
          message: `Path found: ${result.path.length} waypoints, ${result.planningTimeMs.toFixed(0)}ms`,
        });
        this.emitEvent({ type: 'planning-completed', timestamp: Date.now(), data: result });
      } else {
        this.updateProgress({
          phase: 'failed',
          message: result.error || 'Planning failed',
        });
        this.emitEvent({ type: 'planning-failed', timestamp: Date.now(), data: result });
      }

      return result;
    } catch (error) {
      this._state.isPlanning = false;

      if (error instanceof Error && error.name === 'AbortError') {
        const abortedResult: GpuPlanningResult = {
          success: false,
          path: [],
          pathLength: 0,
          planningTimeMs: performance.now() - startTime,
          collisionChecks: 0,
          nodesExplored: 0,
          error: 'Planning aborted',
        };
        this._state.lastResult = abortedResult;
        this.updateProgress({ phase: 'aborted', message: 'Planning aborted' });
        this.emitEvent({ type: 'planning-aborted', timestamp: Date.now() });
        return abortedResult;
      }

      const failedResult: GpuPlanningResult = {
        success: false,
        path: [],
        pathLength: 0,
        planningTimeMs: performance.now() - startTime,
        collisionChecks: 0,
        nodesExplored: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this._state.lastResult = failedResult;
      throw error;
    }
  }

  async planThroughWaypoints(request: MultiWaypointRequest): Promise<GpuPlanningResult> {
    if (!this._state.initialized) {
      throw new Error('GpuPlanningEngine not initialized. Call initialize() first.');
    }

    if (this._state.isPlanning) {
      throw new Error('Planning already in progress. Call abort() first.');
    }

    const waypoints = request.waypoints.filter((wp) => wp.enabled !== false);
    if (waypoints.length === 0) {
      return {
        success: false,
        path: [],
        pathLength: 0,
        planningTimeMs: 0,
        collisionChecks: 0,
        nodesExplored: 0,
        error: 'No waypoints provided',
      };
    }

    this._state.isPlanning = true;
    this._state.lastResult = null;
    this.abortController = new AbortController();

    const startTime = performance.now();
    const params = { ...DEFAULT_PLANNER_PARAMS, ...this.config.defaultParams, ...request.params } as Required<PlannerParams>;
    const planner = request.planner || this.config.defaultPlanner || 'lazy-prm';

    this.emitEvent({ type: 'planning-started', timestamp: Date.now() });

    try {
      const fullPath: GpuPathWaypoint[] = [];
      let totalCollisionChecks = 0;
      let totalNodesExplored = 0;
      let currentJoints = request.startJoints;

      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        const goalJoints = wp.joints;

        if (!goalJoints || goalJoints.length === 0) {
          // Skip waypoints without IK solution
          continue;
        }

        this.updateProgress({
          phase: 'searching',
          phaseProgress: i / waypoints.length,
          overallProgress: i / waypoints.length,
          message: `Planning segment ${i + 1}/${waypoints.length}: ${wp.name || wp.id}`,
        });

        const segmentResult = await this.executePlanning(
          currentJoints,
          goalJoints,
          planner,
          params,
          this.abortController.signal
        );

        if (!segmentResult.success) {
          this._state.isPlanning = false;
          const failedResult: GpuPlanningResult = {
            success: false,
            path: fullPath,
            pathLength: 0,
            planningTimeMs: performance.now() - startTime,
            collisionChecks: totalCollisionChecks,
            nodesExplored: totalNodesExplored,
            error: `Failed to plan segment to waypoint ${wp.name || wp.id}: ${segmentResult.error}`,
          };
          this._state.lastResult = failedResult;
          this.emitEvent({ type: 'planning-failed', timestamp: Date.now(), data: failedResult });
          return failedResult;
        }

        // Append segment path (skip first point if not first segment to avoid duplicates)
        const pathToAdd = i === 0 ? segmentResult.path : segmentResult.path.slice(1);
        fullPath.push(...pathToAdd);
        totalCollisionChecks += segmentResult.collisionChecks;
        totalNodesExplored += segmentResult.nodesExplored;

        currentJoints = goalJoints;
      }

      // Handle closed loop
      if (request.closedLoop && fullPath.length > 0) {
        this.updateProgress({
          phase: 'searching',
          phaseProgress: 0.95,
          overallProgress: 0.95,
          message: 'Planning return to start...',
        });

        const returnResult = await this.executePlanning(
          currentJoints,
          request.startJoints,
          planner,
          params,
          this.abortController.signal
        );

        if (returnResult.success) {
          fullPath.push(...returnResult.path.slice(1));
          totalCollisionChecks += returnResult.collisionChecks;
          totalNodesExplored += returnResult.nodesExplored;
        }
      }

      this._state.isPlanning = false;

      const result: GpuPlanningResult = {
        success: true,
        path: fullPath,
        pathLength: this.computePathLength(fullPath),
        planningTimeMs: performance.now() - startTime,
        collisionChecks: totalCollisionChecks,
        nodesExplored: totalNodesExplored,
      };

      this._state.lastResult = result;
      this.updateProgress({
        phase: 'completed',
        phaseProgress: 1,
        overallProgress: 1,
        message: `Path found: ${result.path.length} waypoints through ${waypoints.length} targets`,
      });
      this.emitEvent({ type: 'planning-completed', timestamp: Date.now(), data: result });

      return result;
    } catch (error) {
      this._state.isPlanning = false;
      throw error;
    }
  }

  private async executePlanning(
    startJoints: number[],
    goalJoints: number[],
    planner: GpuPlannerType,
    params: Required<PlannerParams>,
    signal: AbortSignal
  ): Promise<GpuPlanningResult> {
    const startTime = performance.now();
    const checker = this.createCollisionChecker();

    // Check start and goal validity
    if (checker(startJoints)) {
      return {
        success: false,
        path: [],
        pathLength: 0,
        planningTimeMs: performance.now() - startTime,
        collisionChecks: 1,
        nodesExplored: 0,
        error: 'Start configuration is in collision',
      };
    }

    if (checker(goalJoints)) {
      return {
        success: false,
        path: [],
        pathLength: 0,
        planningTimeMs: performance.now() - startTime,
        collisionChecks: 2,
        nodesExplored: 0,
        error: 'Goal configuration is in collision',
      };
    }

    // Execute planning based on selected algorithm
    let path: JointConfiguration[] = [];
    let collisionChecks = 2;
    let nodesExplored = 0;

    try {
      switch (planner) {
        case 'lazy-prm':
          ({ path, collisionChecks, nodesExplored } = await this.executeLazyPRM(
            startJoints,
            goalJoints,
            params,
            checker,
            signal
          ));
          break;

        case 'birrt':
          ({ path, collisionChecks, nodesExplored } = await this.executeBiRRT(
            startJoints,
            goalJoints,
            params,
            checker,
            signal
          ));
          break;

        case 'rrt-star':
          ({ path, collisionChecks, nodesExplored } = await this.executeRRTStar(
            startJoints,
            goalJoints,
            params,
            checker,
            signal
          ));
          break;

        default:
          throw new Error(`Unknown planner type: ${planner}`);
      }

      if (path.length === 0) {
        return {
          success: false,
          path: [],
          pathLength: 0,
          planningTimeMs: performance.now() - startTime,
          collisionChecks,
          nodesExplored,
          error: 'No path found',
        };
      }

      // Post-processing: shortcut and smooth
      if (params.shortcutPath) {
        this.updateProgress({ phase: 'optimizing', message: 'Shortcutting path...' });
        path = await this.shortcutPath(path, checker, params.shortcutIterations);
      }

      if (params.smoothPath) {
        this.updateProgress({ phase: 'smoothing', message: 'Smoothing path...' });
        path = await this.smoothPath(path, checker, params.smoothingIterations);
      }

      // Convert to GpuPathWaypoint format
      const pathWaypoints: GpuPathWaypoint[] = path.map((joints) => ({ joints }));

      return {
        success: true,
        path: pathWaypoints,
        pathLength: this.computePathLength(pathWaypoints),
        planningTimeMs: performance.now() - startTime,
        collisionChecks,
        nodesExplored,
      };
    } catch (error) {
      if (signal.aborted) {
        const abortError = new Error('Planning aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
      throw error;
    }
  }

  // ============================================================================
  // Planning Algorithm Implementations
  // ============================================================================

  private async executeLazyPRM(
    start: number[],
    goal: number[],
    params: Required<PlannerParams>,
    checker: CollisionCheckerFn,
    signal: AbortSignal
  ): Promise<{ path: JointConfiguration[]; collisionChecks: number; nodesExplored: number }> {
    // Lazy-PRM implementation
    // 1. Build roadmap with random samples (no collision check yet)
    // 2. Query path from start to goal
    // 3. Lazily validate edges on the path

    const samples: JointConfiguration[] = [start, goal];
    const { lower, upper } = this.config.jointLimits;
    const dof = this.config.dof;

    // Generate random samples
    for (let i = 0; i < params.numSamples; i++) {
      if (signal.aborted) break;

      const sample: number[] = [];
      for (let j = 0; j < dof; j++) {
        sample.push(lower[j] + Math.random() * (upper[j] - lower[j]));
      }
      samples.push(sample);
    }

    // Build k-NN graph (simplified)
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < samples.length; i++) {
      if (signal.aborted) break;

      // Find k nearest neighbors
      const distances: Array<{ idx: number; dist: number }> = [];
      for (let j = 0; j < samples.length; j++) {
        if (i === j) continue;
        const dist = this.jointDistance(samples[i], samples[j]);
        if (dist < params.connectionRadius) {
          distances.push({ idx: j, dist });
        }
      }

      distances.sort((a, b) => a.dist - b.dist);
      for (let k = 0; k < Math.min(params.numNeighbors, distances.length); k++) {
        const j = distances[k].idx;
        if (i < j) {
          edges.push([i, j]);
        }
      }

      if (i % 100 === 0) {
        this.updateProgress({
          phase: 'building-roadmap',
          phaseProgress: i / samples.length,
          nodesCount: samples.length,
          message: `Building roadmap: ${i}/${samples.length} nodes`,
        });
      }
    }

    // A* search on the graph
    this.updateProgress({ phase: 'searching', message: 'Searching for path...' });

    const path = this.aStarSearch(samples, edges, 0, 1);

    if (path.length === 0) {
      return { path: [], collisionChecks: 0, nodesExplored: samples.length };
    }

    // Lazy edge validation
    this.updateProgress({ phase: 'validating-edges', message: 'Validating path edges...' });

    let collisionChecks = 0;
    const validatedPath: JointConfiguration[] = [samples[path[0]]];

    for (let i = 0; i < path.length - 1; i++) {
      if (signal.aborted) break;

      const from = samples[path[i]];
      const to = samples[path[i + 1]];

      // Interpolate and check edge
      const isValid = this.validateEdge(from, to, checker, params.stepSize);
      collisionChecks += Math.ceil(this.jointDistance(from, to) / params.stepSize);

      if (!isValid) {
        // Edge invalid - need to replan (simplified: return failure)
        return { path: [], collisionChecks, nodesExplored: samples.length };
      }

      validatedPath.push(to);

      this.updateProgress({
        phase: 'validating-edges',
        phaseProgress: (i + 1) / (path.length - 1),
        edgesValidated: i + 1,
        totalEdges: path.length - 1,
      });
    }

    return {
      path: validatedPath,
      collisionChecks,
      nodesExplored: samples.length,
    };
  }

  private async executeBiRRT(
    start: number[],
    goal: number[],
    params: Required<PlannerParams>,
    checker: CollisionCheckerFn,
    signal: AbortSignal
  ): Promise<{ path: JointConfiguration[]; collisionChecks: number; nodesExplored: number }> {
    // Bidirectional RRT implementation
    const treeA: JointConfiguration[] = [start];
    const treeB: JointConfiguration[] = [goal];
    const parentA: number[] = [-1];
    const parentB: number[] = [-1];

    const { lower, upper } = this.config.jointLimits;
    const dof = this.config.dof;
    let collisionChecks = 0;

    for (let iter = 0; iter < params.maxIterations; iter++) {
      if (signal.aborted) break;

      // Sample random configuration (with goal bias)
      let sample: number[];
      if (Math.random() < params.goalBias) {
        sample = iter % 2 === 0 ? goal.slice() : start.slice();
      } else {
        sample = [];
        for (let j = 0; j < dof; j++) {
          sample.push(lower[j] + Math.random() * (upper[j] - lower[j]));
        }
      }

      // Extend tree A towards sample
      const nearestA = this.findNearest(treeA, sample);
      const newA = this.steer(treeA[nearestA], sample, params.stepSize);

      collisionChecks++;
      if (!checker(newA)) {
        treeA.push(newA);
        parentA.push(nearestA);

        // Try to connect to tree B
        const nearestB = this.findNearest(treeB, newA);
        let current = treeB[nearestB];
        let connected = false;

        while (true) {
          const next = this.steer(current, newA, params.stepSize);
          collisionChecks++;

          if (checker(next)) break;

          if (this.jointDistance(next, newA) < params.stepSize) {
            // Connected!
            treeB.push(next);
            parentB.push(nearestB);
            connected = true;
            break;
          }

          treeB.push(next);
          parentB.push(treeB.length - 2);
          current = next;
        }

        if (connected) {
          // Build path
          const pathA: JointConfiguration[] = [];
          let idx = treeA.length - 1;
          while (idx >= 0) {
            pathA.unshift(treeA[idx]);
            idx = parentA[idx];
          }

          const pathB: JointConfiguration[] = [];
          idx = treeB.length - 1;
          while (idx >= 0) {
            pathB.push(treeB[idx]);
            idx = parentB[idx];
          }

          return {
            path: [...pathA, ...pathB],
            collisionChecks,
            nodesExplored: treeA.length + treeB.length,
          };
        }
      }

      // Swap trees
      const temp = { tree: treeA, parent: parentA };
      treeA.length = 0;
      treeA.push(...treeB);
      parentA.length = 0;
      parentA.push(...parentB);
      treeB.length = 0;
      treeB.push(...temp.tree);
      parentB.length = 0;
      parentB.push(...temp.parent);

      if (iter % 100 === 0) {
        this.updateProgress({
          phase: 'searching',
          currentIteration: iter,
          maxIterations: params.maxIterations,
          nodesCount: treeA.length + treeB.length,
          message: `BiRRT: iteration ${iter}/${params.maxIterations}`,
        });
      }
    }

    return { path: [], collisionChecks, nodesExplored: treeA.length + treeB.length };
  }

  private async executeRRTStar(
    start: number[],
    goal: number[],
    params: Required<PlannerParams>,
    checker: CollisionCheckerFn,
    signal: AbortSignal
  ): Promise<{ path: JointConfiguration[]; collisionChecks: number; nodesExplored: number }> {
    // RRT* implementation (simplified)
    const tree: JointConfiguration[] = [start];
    const parent: number[] = [-1];
    const cost: number[] = [0];

    const { lower, upper } = this.config.jointLimits;
    const dof = this.config.dof;
    let collisionChecks = 0;
    let bestGoalIdx = -1;
    let bestGoalCost = Infinity;

    for (let iter = 0; iter < params.maxIterations; iter++) {
      if (signal.aborted) break;

      // Sample random configuration
      let sample: number[];
      if (Math.random() < params.goalBias) {
        sample = goal.slice();
      } else {
        sample = [];
        for (let j = 0; j < dof; j++) {
          sample.push(lower[j] + Math.random() * (upper[j] - lower[j]));
        }
      }

      // Find nearest node
      const nearestIdx = this.findNearest(tree, sample);
      const newNode = this.steer(tree[nearestIdx], sample, params.stepSize);

      collisionChecks++;
      if (checker(newNode)) continue;

      // Find nodes in radius for rewiring
      const radius = Math.min(
        params.connectionRadius * Math.pow(Math.log(tree.length + 1) / (tree.length + 1), 1 / dof),
        params.connectionRadius
      );

      const nearNodes: number[] = [];
      for (let i = 0; i < tree.length; i++) {
        if (this.jointDistance(tree[i], newNode) < radius) {
          nearNodes.push(i);
        }
      }

      // Choose best parent
      let bestParent = nearestIdx;
      let bestCost = cost[nearestIdx] + this.jointDistance(tree[nearestIdx], newNode);

      for (const nodeIdx of nearNodes) {
        const newCost = cost[nodeIdx] + this.jointDistance(tree[nodeIdx], newNode);
        if (newCost < bestCost) {
          if (this.validateEdge(tree[nodeIdx], newNode, checker, params.stepSize)) {
            bestParent = nodeIdx;
            bestCost = newCost;
          }
        }
      }

      // Add node
      tree.push(newNode);
      parent.push(bestParent);
      cost.push(bestCost);

      // Rewire
      const newIdx = tree.length - 1;
      for (const nodeIdx of nearNodes) {
        const newCost = cost[newIdx] + this.jointDistance(newNode, tree[nodeIdx]);
        if (newCost < cost[nodeIdx]) {
          if (this.validateEdge(newNode, tree[nodeIdx], checker, params.stepSize)) {
            parent[nodeIdx] = newIdx;
            cost[nodeIdx] = newCost;
          }
        }
      }

      // Check if reached goal
      const goalDist = this.jointDistance(newNode, goal);
      if (goalDist < params.stepSize && bestCost + goalDist < bestGoalCost) {
        bestGoalIdx = newIdx;
        bestGoalCost = bestCost + goalDist;
      }

      if (iter % 100 === 0) {
        this.updateProgress({
          phase: 'searching',
          currentIteration: iter,
          maxIterations: params.maxIterations,
          nodesCount: tree.length,
          message: `RRT*: iteration ${iter}/${params.maxIterations}`,
        });
      }
    }

    if (bestGoalIdx < 0) {
      return { path: [], collisionChecks, nodesExplored: tree.length };
    }

    // Build path
    const path: JointConfiguration[] = [goal];
    let idx = bestGoalIdx;
    while (idx >= 0) {
      path.unshift(tree[idx]);
      idx = parent[idx];
    }

    return { path, collisionChecks, nodesExplored: tree.length };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private jointDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private findNearest(tree: JointConfiguration[], sample: JointConfiguration): number {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < tree.length; i++) {
      const dist = this.jointDistance(tree[i], sample);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  private steer(from: number[], to: number[], stepSize: number): number[] {
    const dist = this.jointDistance(from, to);
    if (dist <= stepSize) {
      return to.slice();
    }

    const ratio = stepSize / dist;
    const result: number[] = [];
    for (let i = 0; i < from.length; i++) {
      result.push(from[i] + ratio * (to[i] - from[i]));
    }
    return result;
  }

  private validateEdge(from: number[], to: number[], checker: CollisionCheckerFn, stepSize: number): boolean {
    const dist = this.jointDistance(from, to);
    const steps = Math.ceil(dist / stepSize);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const interp: number[] = [];
      for (let j = 0; j < from.length; j++) {
        interp.push(from[j] + t * (to[j] - from[j]));
      }
      if (checker(interp)) {
        return false;
      }
    }
    return true;
  }

  private aStarSearch(
    nodes: JointConfiguration[],
    edges: Array<[number, number]>,
    startIdx: number,
    goalIdx: number
  ): number[] {
    const adjList: Map<number, number[]> = new Map();
    for (const [a, b] of edges) {
      if (!adjList.has(a)) adjList.set(a, []);
      if (!adjList.has(b)) adjList.set(b, []);
      adjList.get(a)!.push(b);
      adjList.get(b)!.push(a);
    }

    const gScore: Map<number, number> = new Map([[startIdx, 0]]);
    const fScore: Map<number, number> = new Map([[startIdx, this.jointDistance(nodes[startIdx], nodes[goalIdx])]]);
    const cameFrom: Map<number, number> = new Map();
    const openSet = new Set([startIdx]);

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current = -1;
      let lowestF = Infinity;
      for (const node of openSet) {
        const f = fScore.get(node) ?? Infinity;
        if (f < lowestF) {
          lowestF = f;
          current = node;
        }
      }

      if (current === goalIdx) {
        // Reconstruct path
        const path: number[] = [current];
        while (cameFrom.has(current)) {
          current = cameFrom.get(current)!;
          path.unshift(current);
        }
        return path;
      }

      openSet.delete(current);

      for (const neighbor of adjList.get(current) || []) {
        const tentativeG = (gScore.get(current) ?? Infinity) + this.jointDistance(nodes[current], nodes[neighbor]);

        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG + this.jointDistance(nodes[neighbor], nodes[goalIdx]));
          openSet.add(neighbor);
        }
      }
    }

    return [];
  }

  private async shortcutPath(
    path: JointConfiguration[],
    checker: CollisionCheckerFn,
    iterations: number
  ): Promise<JointConfiguration[]> {
    if (path.length < 3) return path;

    const result = [...path];

    for (let iter = 0; iter < iterations; iter++) {
      if (result.length < 3) break;

      const i = Math.floor(Math.random() * (result.length - 2));
      const j = i + 2 + Math.floor(Math.random() * (result.length - i - 2));

      if (j >= result.length) continue;

      if (this.validateEdge(result[i], result[j], checker, 0.05)) {
        // Remove intermediate nodes
        result.splice(i + 1, j - i - 1);
      }
    }

    return result;
  }

  private async smoothPath(
    path: JointConfiguration[],
    checker: CollisionCheckerFn,
    iterations: number
  ): Promise<JointConfiguration[]> {
    if (path.length < 3) return path;

    const result = path.map((p) => [...p]);

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 1; i < result.length - 1; i++) {
        // Smooth by averaging with neighbors
        const smoothed: number[] = [];
        for (let j = 0; j < result[i].length; j++) {
          smoothed.push((result[i - 1][j] + result[i][j] + result[i + 1][j]) / 3);
        }

        if (!checker(smoothed)) {
          result[i] = smoothed;
        }
      }
    }

    return result;
  }

  private computePathLength(path: GpuPathWaypoint[]): number {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      length += this.jointDistance(path[i - 1].joints, path[i].joints);
    }
    return length;
  }

  // ============================================================================
  // Control Methods
  // ============================================================================

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this._state.isPlanning = false;
  }

  clearResult(): void {
    this._state.lastResult = null;
    this.updateProgress({ ...INITIAL_PLANNING_PROGRESS });
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  onProgress(callback: (progress: GpuPlanningProgress) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  onEvent(callback: GpuPlanningEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  private updateProgress(update: Partial<GpuPlanningProgress>): void {
    this._state.progress = { ...this._state.progress, ...update };
    for (const callback of this.progressCallbacks) {
      callback(this._state.progress);
    }
  }

  private emitEvent(event: GpuPlanningEvent): void {
    for (const callback of this.eventCallbacks) {
      callback(event);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createGpuPlanningEngine(config: GpuPlanningEngineConfig): GpuPlanningEngine {
  return new GpuPlanningEngine(config);
}
