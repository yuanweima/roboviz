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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private trajxWasm: any = null;
  // Robot instance for FK computation (using 'any' because Robot has private constructor)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private robot: any = null;

  // NEW: RobotContext for unified GPU planning (replaces GpuPlanningContext + WasmRobotCollisionModel)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private robotContext: any = null;
  // Collision environment for batch checking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private wasmCollisionEnv: any = null;
  // Track if using native GPU planning
  private useNativeGpuPlanning = true;

  // Legacy: Keep for backwards compatibility (deprecated, use robotContext instead)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private gpuPlanningContext: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private robotCollisionModel: any = null;

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
      // Dynamically import trajx-wasm from npm package (NOT local vendor copy)
      // The npm package is properly configured for bundlers to resolve the WASM file
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trajxModule = await import('trajx-wasm') as any;

      // Check if WASM is already initialized (e.g., by KinematicsManager/useTrajx)
      // Note: is_ready() throws if WASM hasn't been loaded yet, so we wrap in try-catch
      let alreadyInitialized = false;
      try {
        if (typeof trajxModule.is_ready === 'function') {
          alreadyInitialized = trajxModule.is_ready();
        }
      } catch {
        // is_ready() throws when wasm module isn't loaded - that's expected
        alreadyInitialized = false;
      }

      if (!alreadyInitialized) {
        // Initialize WASM binary - MUST call default() before using any classes
        if (typeof trajxModule.default === 'function') {
          await trajxModule.default();
        } else {
          throw new Error('trajx-wasm default init function not found');
        }

        // Optional: Initialize panic hooks for better error messages
        if (typeof trajxModule.init === 'function') {
          try {
            trajxModule.init();
          } catch {
            // Ignore panic hook init errors - not critical
          }
        }
      }

      this.trajxWasm = trajxModule;

      // Load robot from URDF for FK computation
      if (this.config.robotUrdf) {
        try {
          this.robot = trajxModule.Robot.fromString(this.config.robotUrdf);

          // Initialize GPU Planning using NEW RobotContext API (recommended)
          this.updateProgress({
            phase: 'initializing',
            message: 'Setting up GPU planning context...',
          });

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const wasm = this.trajxWasm as any;

            // Try NEW RobotContext API first (recommended, auto capsule approximation)
            // Note: This will fail if URDF has mesh (STL) collision geometry that can't be loaded in browser
            let robotContextInitialized = false;
            if (wasm.RobotContext && wasm.RobotContextConfig && wasm.CollisionEnvironment) {
              try {
                // Create RobotContext with GPU-optimized preset
                // Note: RobotContextConfig properties are read-only, use presets instead
                const RobotContextConfig = wasm.RobotContextConfig;
                const config = RobotContextConfig.gpuOptimized();

                const RobotContext = wasm.RobotContext;
                this.robotContext = RobotContext.fromUrdfWithConfig(this.config.robotUrdf, config);

                // Create empty collision environment (will be populated via setCollisionWorld)
                const CollisionEnvironment = wasm.CollisionEnvironment;
                this.wasmCollisionEnv = new CollisionEnvironment();

                this.useNativeGpuPlanning = true;
                robotContextInitialized = true;
                console.log(`[GpuPlanningEngine] RobotContext initialized: ${this.robotContext.name}, DOF: ${this.robotContext.dof}, GPU Compatible: ${this.robotContext.isGpuCompatible}`);
                console.log(`[GpuPlanningEngine] Stats: ${this.robotContext.stats.summary()}`);
              } catch (robotContextError) {
                // RobotContext failed (likely due to STL mesh in URDF), fall through to legacy API
                console.warn('[GpuPlanningEngine] RobotContext failed (URDF may have mesh collision geometry):', robotContextError);
                this.robotContext = null;
              }
            }

            // Fallback to legacy GpuPlanningContext API (uses JS-side capsule model)
            if (!robotContextInitialized && wasm.GpuPlanningContextConfig && wasm.GpuPlanningContext &&
                wasm.CollisionEnvironment && wasm.WasmRobotCollisionModel) {
              // Create GPU planning context config
              const GpuPlanningContextConfig = wasm.GpuPlanningContextConfig;
              const gpuConfig = new GpuPlanningContextConfig();
              const params = this.config.defaultParams || {};
              if (params.numSamples) gpuConfig.num_samples = params.numSamples;
              if (params.numNeighbors) gpuConfig.k_neighbors = params.numNeighbors;

              // Create the GPU planning context
              const GpuPlanningContext = wasm.GpuPlanningContext;
              this.gpuPlanningContext = new GpuPlanningContext(
                this.robot,
                gpuConfig
              );

              // Create empty collision environment (will be populated via setCollisionWorld)
              const CollisionEnvironment = wasm.CollisionEnvironment;
              this.wasmCollisionEnv = new CollisionEnvironment();

              // Robot collision model will be created in setCollisionWorld when robotCapsules are provided
              this.robotCollisionModel = null;

              this.useNativeGpuPlanning = true;
              console.log('[GpuPlanningEngine] Legacy GPU planning context initialized (robot collision model pending)');
            } else if (!robotContextInitialized) {
              // Neither RobotContext nor legacy API available
              console.warn('[GpuPlanningEngine] Native GPU planning types not available, using JS fallback');
              this.useNativeGpuPlanning = false;
            }
          } catch (gpuError) {
            console.warn('[GpuPlanningEngine] Failed to initialize native GPU planning:', gpuError);
            this.useNativeGpuPlanning = false;
          }
        } catch (robotError) {
          console.warn('Failed to load robot from URDF for FK:', robotError);
          // Continue without robot - collision checking will be limited
          this.useNativeGpuPlanning = false;
        }
      }

      // Initialize capsule transformer if robot capsule model is provided in config
      // (This will be set later via setCollisionWorld if not provided initially)

      this._state.initialized = true;
      this.updateProgress({
        phase: 'idle',
        message: this.useNativeGpuPlanning ? 'Ready (GPU batch mode)' : 'Ready (JS fallback)',
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

    // Clean up native GPU planning resources
    // NEW: RobotContext cleanup
    if (this.robotContext) {
      this.robotContext.free();
      this.robotContext = null;
    }
    // Legacy cleanup
    if (this.gpuPlanningContext) {
      this.gpuPlanningContext.free();
      this.gpuPlanningContext = null;
    }
    if (this.robotCollisionModel) {
      this.robotCollisionModel.free();
      this.robotCollisionModel = null;
    }
    if (this.wasmCollisionEnv) {
      this.wasmCollisionEnv.free();
      this.wasmCollisionEnv = null;
    }

    if (this.robot) {
      this.robot.free();
      this.robot = null;
    }
    this.trajxWasm = null;
    this._state.initialized = false;
  }

  // ============================================================================
  // Collision World Management
  // ============================================================================

  /**
   * Build WASM robot collision model from JS-side capsule data
   * This is used when URDF files only have mesh geometries which cannot be loaded in browser
   */
  private buildWasmRobotCollisionModel(robotCapsules: RobotCapsuleModel): void {
    if (!this.trajxWasm) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wasm = this.trajxWasm as any;
      const WasmRobotCollisionModel = wasm.WasmRobotCollisionModel;
      const Position = wasm.Position;
      const Quaternion = wasm.Quaternion;
      const Pose = wasm.Pose;

      // Create empty robot collision model
      const robotName = this.robot?.name || 'robot';
      this.robotCollisionModel = new WasmRobotCollisionModel(robotName);

      // Add capsule geometries for each link
      // Capsule is defined by two endpoints (point1, point2) and radius
      for (const capsule of robotCapsules.capsules) {
        const linkName = capsule.linkName;
        const radius = capsule.radius;

        // Calculate capsule center and length from endpoints
        const p1 = capsule.point1;
        const p2 = capsule.point2;

        // Center position (midpoint of endpoints)
        const centerX = (p1[0] + p2[0]) / 2;
        const centerY = (p1[1] + p2[1]) / 2;
        const centerZ = (p1[2] + p2[2]) / 2;

        // Length (distance between endpoints)
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const dz = p2[2] - p1[2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const halfHeight = length / 2;

        // Calculate orientation quaternion (align cylinder Z-axis with capsule axis)
        // Default cylinder is along Z-axis, we need to rotate it to align with (dx, dy, dz)
        let qw = 1, qx = 0, qy = 0, qz = 0;
        if (length > 1e-6) {
          // Normalize direction
          const nx = dx / length;
          const ny = dy / length;
          const nz = dz / length;

          // Rotation from Z-axis (0, 0, 1) to capsule direction
          // Using quaternion from two vectors formula
          const dot = nz; // (0,0,1) · (nx,ny,nz) = nz
          if (dot > 0.9999) {
            // Already aligned with Z
            qw = 1; qx = 0; qy = 0; qz = 0;
          } else if (dot < -0.9999) {
            // Opposite to Z, rotate 180° around X
            qw = 0; qx = 1; qy = 0; qz = 0;
          } else {
            // Cross product (0,0,1) × (nx,ny,nz) = (-ny, nx, 0)
            const crossX = -ny;
            const crossY = nx;
            const crossZ = 0;
            qw = 1 + dot;
            qx = crossX;
            qy = crossY;
            qz = crossZ;
            // Normalize quaternion
            const qLen = Math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz);
            qw /= qLen; qx /= qLen; qy /= qLen; qz /= qLen;
          }
        }

        // Create Pose object using Position and Quaternion classes
        // Quaternion constructor order is (x, y, z, w)
        const position = new Position(centerX, centerY, centerZ);
        const quaternion = new Quaternion(qx, qy, qz, qw);
        const origin = new Pose(position, quaternion);

        // Add as cylinder geometry (capsule approximation)
        this.robotCollisionModel.addCylinderGeometry(linkName, radius, halfHeight, origin);
      }

      // Set up allowed collision matrix for adjacent links
      // Get link names and allow collisions between parent-child pairs
      const linkNames = robotCapsules.capsules.map(c => c.linkName);
      for (let i = 0; i < linkNames.length - 1; i++) {
        this.robotCollisionModel.allowLinkPair(linkNames[i], linkNames[i + 1]);
      }

      console.log(`[GpuPlanningEngine] Built WASM robot collision model from JS capsules: ${this.robotCollisionModel.totalGeometries} geometries`);
    } catch (error) {
      console.warn('[GpuPlanningEngine] Failed to build WASM robot collision model:', error);
      this.robotCollisionModel = null;
    }
  }

  setCollisionWorld(world: CollisionWorld): void {
    this._state.collisionWorld = world;

    // Update capsule transformer with new robot capsules if provided (for JS fallback)
    if (world.robotCapsules) {
      this.capsuleTransformer = new CapsuleTransformer(world.robotCapsules);
      console.log(`[GpuPlanningEngine] Created capsule transformer with ${world.robotCapsules.capsules.length} capsules`);

      // Build WASM robot collision model from JS-side capsule data
      // Only needed for legacy GpuPlanningContext API (not RobotContext which auto-generates capsules)
      if (this.useNativeGpuPlanning && this.trajxWasm && !this.robotContext && !this.robotCollisionModel) {
        this.buildWasmRobotCollisionModel(world.robotCapsules);
      }
    } else if (!this.robotContext) {
      // Only warn if not using RobotContext (which auto-generates capsules)
      console.warn('[GpuPlanningEngine] No robot capsules provided - JS fallback collision checking will be limited');
    }

    // Sync collision world to WASM environment for native GPU planning
    if (this.useNativeGpuPlanning && this.wasmCollisionEnv && this.trajxWasm) {
      try {
        // Clear existing obstacles
        this.wasmCollisionEnv.clear();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wasm = this.trajxWasm as any;

        let addedCount = 0;

        // Add obstacles from world
        for (const [id, obj] of world.objects) {
          if (!obj.enabled) continue;

          // Skip objects without valid params
          if (!obj.params) {
            console.warn(`[GpuPlanningEngine] Skipping object '${id}' (${obj.type}): missing params`);
            continue;
          }

          const pos = obj.transform.position;
          const Pose = wasm.Pose;

          switch (obj.type) {
            case 'sphere': {
              const params = obj.params as { type: 'sphere'; radius: number };
              if (typeof params.radius !== 'number' || params.radius <= 0) {
                console.warn(`[GpuPlanningEngine] Skipping sphere '${id}': invalid radius`, params.radius);
                continue;
              }
              const position = new Float64Array([pos[0], pos[1], pos[2]]);
              this.wasmCollisionEnv.addSphere(id, params.radius, position);
              addedCount++;
              console.log(`[GpuPlanningEngine] Added sphere '${id}': radius=${params.radius}, pos=[${pos[0].toFixed(3)}, ${pos[1].toFixed(3)}, ${pos[2].toFixed(3)}]`);
              break;
            }
            case 'box': {
              const params = obj.params as { type: 'box'; width: number; height: number; depth: number };
              if (!params.width || !params.height || !params.depth) {
                console.warn(`[GpuPlanningEngine] Skipping box '${id}': invalid dimensions`, params);
                continue;
              }
              // Three.js convention: width=X, height=Y, depth=Z
              // halfExtents order is [x, y, z]
              const halfExtents = new Float64Array([params.width / 2, params.height / 2, params.depth / 2]);
              const pose = Pose.fromPositionEuler(pos[0], pos[1], pos[2], 0, 0, 0);
              this.wasmCollisionEnv.addBox(id, halfExtents, pose);
              addedCount++;
              console.log(`[GpuPlanningEngine] Added box '${id}': halfExtents=[${(params.width/2).toFixed(3)}, ${(params.height/2).toFixed(3)}, ${(params.depth/2).toFixed(3)}], pos=[${pos[0].toFixed(3)}, ${pos[1].toFixed(3)}, ${pos[2].toFixed(3)}]`);
              break;
            }
            case 'cylinder': {
              const params = obj.params as { type: 'cylinder'; radius: number; height: number };
              if (!params.radius || !params.height) {
                console.warn(`[GpuPlanningEngine] Skipping cylinder '${id}': invalid params`, params);
                continue;
              }
              const pose = Pose.fromPositionEuler(pos[0], pos[1], pos[2], 0, 0, 0);
              this.wasmCollisionEnv.addCylinder(id, params.radius, params.height, pose);
              addedCount++;
              console.log(`[GpuPlanningEngine] Added cylinder '${id}': radius=${params.radius}, height=${params.height}`);
              break;
            }
            case 'capsule': {
              const params = obj.params as { type: 'capsule'; radius: number; height: number };
              if (!params.radius || !params.height) {
                console.warn(`[GpuPlanningEngine] Skipping capsule '${id}': invalid params`, params);
                continue;
              }
              // Capsule defined by two endpoints (Z-up, vertical capsule)
              const point1 = new Float64Array([pos[0], pos[1], pos[2] - params.height / 2]);
              const point2 = new Float64Array([pos[0], pos[1], pos[2] + params.height / 2]);
              this.wasmCollisionEnv.addCapsule(id, params.radius, point1, point2);
              addedCount++;
              console.log(`[GpuPlanningEngine] Added capsule '${id}': radius=${params.radius}, height=${params.height}`);
              break;
            }
            // Note: mesh type requires more complex handling
          }
        }

        // Verify obstacles were added
        const obstacleIds = this.wasmCollisionEnv.obstacleIds?.() || [];
        console.log(`[GpuPlanningEngine] Collision environment updated: ${addedCount} obstacles added, verified IDs:`, obstacleIds);
      } catch (syncError) {
        console.warn('Failed to sync collision world to WASM environment:', syncError);
      }
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

          // Check self-collision (with safety margin for robustness)
          // Note: Capsule models are approximations - use negative margin to avoid false positives
          // The self-collision pairs should be carefully defined to only check links that can actually collide
          const selfCollisionResult = checkSelfCollision(
            worldCapsules,
            transformer.getSelfCollisionPairs(),
            -0.05  // Negative margin = allow 50mm overlap tolerance for coarse capsule models
          );
          if (selfCollisionResult.hasCollision) {
            console.warn('[GpuPlanningEngine] Self-collision detected:', selfCollisionResult.collidingPairs);
            return true;
          }

          // Get links to ignore for environment collision (e.g., base link)
          const ignoredLinksForEnv = new Set(transformer.getIgnoredLinksForEnv());

          // Filter capsules for environment collision checking
          const envCheckCapsules = worldCapsules.filter(c => !ignoredLinksForEnv.has(c.linkIndex));

          // Check collision with environment objects
          for (const [objId, obj] of world.objects) {
            if (!obj.enabled) continue;

            const objPos = obj.transform.position;

            switch (obj.type) {
              case 'sphere': {
                const params = obj.params as { type: 'sphere'; radius: number };
                for (const capsule of envCheckCapsules) {
                  // Use negative margin to reduce false positives from coarse capsule approximations
                  if (capsuleSphereCollision(capsule, objPos, params.radius, -0.02)) {
                    console.warn(`[GpuPlanningEngine] Collision with sphere '${objId}' at link ${capsule.linkIndex}`);
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
                for (const capsule of envCheckCapsules) {
                  // Use negative margin to reduce false positives from coarse capsule approximations
                  if (capsuleBoxCollision(capsule, objPos, halfExtents, -0.02)) {
                    console.warn(`[GpuPlanningEngine] Collision with box '${objId}' at link ${capsule.linkIndex}`);
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
                for (const robotCapsule of envCheckCapsules) {
                  // Use negative margin to reduce false positives
                  if (capsulesCollision(robotCapsule, cylinderCapsule, -0.02)) {
                    console.warn(`[GpuPlanningEngine] Collision with cylinder '${objId}' at link ${robotCapsule.linkIndex}`);
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
                for (const robotCapsule of envCheckCapsules) {
                  // Use negative margin to reduce false positives
                  if (capsulesCollision(robotCapsule, envCapsule, -0.02)) {
                    console.warn(`[GpuPlanningEngine] Collision with capsule '${objId}' at link ${robotCapsule.linkIndex}`);
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
                  for (const capsule of envCheckCapsules) {
                    // Use negative margin to reduce false positives
                    if (capsuleSphereCollision(capsule, objPos, params.boundingSphere.radius, -0.02)) {
                      console.warn(`[GpuPlanningEngine] Collision with mesh '${objId}' at link ${capsule.linkIndex}`);
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
   * Uses trajx-wasm's FK to get link poses, then converts to flat matrix array
   */
  private computeLinkTransformsFlat(joints: number[]): Float64Array {
    if (!this.robot) {
      return new Float64Array(0);
    }

    try {
      // Get link poses from FK
      const jointAngles = new Float64Array(joints);
      const poses = this.robot.forwardKinematicsChain(jointAngles);

      if (!poses || poses.length === 0) {
        return new Float64Array(0);
      }

      // Each pose is a 4x4 matrix (16 floats)
      const result = new Float64Array(poses.length * 16);

      for (let i = 0; i < poses.length; i++) {
        const matrix = poses[i].toMatrix4();
        result.set(matrix, i * 16);
      }

      return result;
    } catch (error) {
      console.warn('Failed to compute link transforms:', error);
      return new Float64Array(0);
    }
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

      // Densify path to ensure smooth motion (interpolate with max 0.1 rad step)
      path = this.densifyPath(path, params.stepSize);

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
    // Try NEW RobotContext API first (recommended, with auto capsule approximation)
    if (this.useNativeGpuPlanning && this.robotContext && this.wasmCollisionEnv) {
      try {
        return await this.executeRobotContextLazyPRM(start, goal, params, signal);
      } catch (nativeError) {
        console.warn('RobotContext GPU planning failed, trying legacy API:', nativeError);
        // Fall through to legacy API
      }
    }

    // Try legacy GpuPlanningContext API
    if (this.useNativeGpuPlanning && this.gpuPlanningContext && this.robotCollisionModel && this.wasmCollisionEnv) {
      try {
        return await this.executeNativeGpuLazyPRM(start, goal, params, signal);
      } catch (nativeError) {
        console.warn('Native GPU planning failed, falling back to JS implementation:', nativeError);
        // Fall through to JS implementation
      }
    }

    // Fallback: JS Lazy-PRM implementation
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
    const edgeSet = new Set<string>(); // Track unique edges

    const addEdge = (a: number, b: number) => {
      const [min, max] = a < b ? [a, b] : [b, a];
      const key = `${min}-${max}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([min, max]);
      }
    };

    for (let i = 0; i < samples.length; i++) {
      if (signal.aborted) break;

      // Find k nearest neighbors
      const distances: Array<{ idx: number; dist: number }> = [];
      for (let j = 0; j < samples.length; j++) {
        if (i === j) continue;
        const dist = this.jointDistance(samples[i], samples[j]);
        // For start (0) and goal (1), always consider all neighbors (no radius limit)
        // This ensures start/goal connect to the roadmap
        if (i <= 1 || j <= 1 || dist < params.connectionRadius) {
          distances.push({ idx: j, dist });
        }
      }

      distances.sort((a, b) => a.dist - b.dist);
      for (let k = 0; k < Math.min(params.numNeighbors, distances.length); k++) {
        const j = distances[k].idx;
        addEdge(i, j);
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

  /**
   * Execute Lazy-PRM using native trajx-wasm GpuPlanningContext with batch edge checking.
   * This uses the WASM-based Lazy-PRM which is optimized for GPU/batch collision checking.
   */
  private async executeNativeGpuLazyPRM(
    start: number[],
    goal: number[],
    params: Required<PlannerParams>,
    signal: AbortSignal
  ): Promise<{ path: JointConfiguration[]; collisionChecks: number; nodesExplored: number }> {
    if (!this.gpuPlanningContext || !this.robotCollisionModel || !this.wasmCollisionEnv || !this.robot) {
      throw new Error('Native GPU planning not initialized');
    }

    this.updateProgress({
      phase: 'building-roadmap',
      message: 'Building GPU-accelerated roadmap...',
      phaseProgress: 0,
    });

    // Build roadmap if not already built
    if (!this.gpuPlanningContext.isRoadmapBuilt()) {
      this.gpuPlanningContext.buildRoadmap();
    }

    this.updateProgress({
      phase: 'building-roadmap',
      message: 'Roadmap built',
      phaseProgress: 1,
      nodesCount: this.gpuPlanningContext.nodeCount(),
    });

    // Create batch edge checker using the robot collision model
    // This is the key function that enables batch collision checking
    const samplesPerEdge = 5; // Number of samples along each edge to check
    const batchEdgeChecker = this.robotCollisionModel.createBatchEdgeChecker(
      this.wasmCollisionEnv,
      this.robot,
      samplesPerEdge
    );

    this.updateProgress({
      phase: 'searching',
      message: 'Planning with GPU batch collision checking...',
      phaseProgress: 0,
    });

    // Convert to Float64Array for WASM
    const startConfig = new Float64Array(start);
    const goalConfig = new Float64Array(goal);

    // Plan path using native GPU planning context with batch edge checker
    const result = this.gpuPlanningContext.planPath(startConfig, goalConfig, batchEdgeChecker);

    // Check for abort
    if (signal.aborted) {
      throw new Error('Planning aborted');
    }

    // Extract results
    if (!result.success) {
      const errorMsg = result.error() || 'GPU planning failed';
      this.updateProgress({
        phase: 'failed',
        message: errorMsg,
      });
      return { path: [], collisionChecks: result.collisionChecks, nodesExplored: this.gpuPlanningContext.nodeCount() };
    }

    // Convert path from WASM result
    const pathData = result.path();
    const waypointCount = result.waypointCount;
    const dof = this.config.dof;

    const path: JointConfiguration[] = [];
    for (let i = 0; i < waypointCount; i++) {
      const joints: number[] = [];
      for (let j = 0; j < dof; j++) {
        joints.push(pathData[i * dof + j]);
      }
      path.push(joints);
    }

    this.updateProgress({
      phase: 'completed',
      message: `GPU planning complete: ${path.length} waypoints`,
      phaseProgress: 1,
      nodesCount: this.gpuPlanningContext.nodeCount(),
      edgesValidated: result.edgesValidated,
    });

    return {
      path,
      collisionChecks: result.collisionChecks,
      nodesExplored: this.gpuPlanningContext.nodeCount(),
    };
  }

  /**
   * Execute Lazy-PRM using the NEW RobotContext API with automatic capsule approximation.
   * This is the recommended approach for GPU-accelerated motion planning.
   *
   * RobotContext provides:
   * - Automatic capsule approximation from URDF (no manual capsule model needed)
   * - Unified API for GPU planning
   * - Batch edge checking with ctx.checkEdgesBatch(edges, env, samples)
   */
  private async executeRobotContextLazyPRM(
    start: number[],
    goal: number[],
    params: Required<PlannerParams>,
    signal: AbortSignal
  ): Promise<{ path: JointConfiguration[]; collisionChecks: number; nodesExplored: number }> {
    if (!this.robotContext || !this.wasmCollisionEnv) {
      throw new Error('RobotContext not initialized');
    }

    this.updateProgress({
      phase: 'building-roadmap',
      message: 'Building roadmap with RobotContext API...',
      phaseProgress: 0,
    });

    // Create planner from RobotContext
    const planner = this.robotContext.createPlanner();

    // Build roadmap (fast, no collision checking)
    planner.buildRoadmap();

    const nodeCount = planner.nodeCount;
    const edgeCount = planner.edgeCount;

    this.updateProgress({
      phase: 'building-roadmap',
      message: `Roadmap built: ${nodeCount} nodes, ${edgeCount} edges`,
      phaseProgress: 1,
      nodesCount: nodeCount,
    });

    // Check for abort
    if (signal.aborted) {
      planner.free();
      throw new Error('Planning aborted');
    }

    this.updateProgress({
      phase: 'searching',
      message: 'Planning with RobotContext batch collision checking...',
      phaseProgress: 0,
    });

    // Samples per edge for collision checking
    const samplesPerEdge = 5;

    // Create batch edge checker callback using RobotContext API
    // This is the key function: ctx.checkEdgesBatch(edges, env, samples) returns boolean[]
    const batchEdgeChecker = (edges: Array<[Float64Array, Float64Array]>): boolean[] => {
      // Check for abort during edge checking
      if (signal.aborted) {
        return edges.map(() => false);
      }

      // Use RobotContext's batch edge checking
      return this.robotContext.checkEdgesBatch(edges, this.wasmCollisionEnv, samplesPerEdge);
    };

    // Convert to Float64Array for WASM
    const startConfig = new Float64Array(start);
    const goalConfig = new Float64Array(goal);

    // Query path using the planner with batch edge checker callback
    const result = planner.query(startConfig, goalConfig, batchEdgeChecker);

    // Check for abort
    if (signal.aborted) {
      planner.free();
      throw new Error('Planning aborted');
    }

    // Extract results
    if (!result.success) {
      const errorMsg = result.error || 'RobotContext planning failed';
      this.updateProgress({
        phase: 'failed',
        message: errorMsg,
      });
      planner.free();
      return { path: [], collisionChecks: result.edgesValidated || 0, nodesExplored: nodeCount };
    }

    // Convert path from WASM result
    // result.waypoints is an array of Float64Array
    const waypoints = result.waypoints;
    const waypointCount = result.waypointCount;
    const dof = this.config.dof;

    const path: JointConfiguration[] = [];
    for (let i = 0; i < waypointCount; i++) {
      const wp = waypoints[i];
      const joints: number[] = [];
      for (let j = 0; j < dof; j++) {
        joints.push(wp[j]);
      }
      path.push(joints);
    }

    this.updateProgress({
      phase: 'completed',
      message: `RobotContext planning complete: ${path.length} waypoints in ${result.planningTimeMs?.toFixed(1) || '?'}ms`,
      phaseProgress: 1,
      nodesCount: nodeCount,
      edgesValidated: result.edgesValidated || 0,
    });

    // Clean up planner
    planner.free();

    return {
      path,
      collisionChecks: result.edgesValidated || 0,
      nodesExplored: nodeCount,
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

  /**
   * Densify path by interpolating between waypoints to ensure minimum spacing.
   * This ensures smooth robot motion even if the planner finds a direct path.
   */
  private densifyPath(
    path: JointConfiguration[],
    maxStepSize: number = 0.1 // Maximum step size in joint space (radians)
  ): JointConfiguration[] {
    if (path.length < 2) return path;

    const result: JointConfiguration[] = [path[0]];

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const dist = this.jointDistance(from, to);

      if (dist > maxStepSize) {
        // Need to interpolate
        const numSteps = Math.ceil(dist / maxStepSize);
        for (let step = 1; step < numSteps; step++) {
          const t = step / numSteps;
          const interpolated: number[] = [];
          for (let j = 0; j < from.length; j++) {
            interpolated.push(from[j] + t * (to[j] - from[j]));
          }
          result.push(interpolated);
        }
      }
      result.push(to);
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
