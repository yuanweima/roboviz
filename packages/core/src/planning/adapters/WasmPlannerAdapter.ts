/**
 * WASM Planner Adapter
 *
 * Wraps the existing MotionPlanningManager behind the IPlannerProvider
 * async interface. The manager already returns Promises, so this adapter
 * is a thin passthrough that adds capability metadata.
 */

import type {
  PlanningRequest,
  PlanningResult,
  PipelineStage,
  PipelineProgressCallback,
  CollisionChecker,
} from '../types';
import type {
  LinearMotionRequest,
  LinearMotionResult,
  PathPlanningRequest,
  PathPlanningResult,
} from '../../kinematics/types';
import type { IPlannerProvider, PlannerCapabilities } from '../planner-provider-types';
import type { MotionPlanningManager } from '../planning-manager';

export class WasmPlannerAdapter implements IPlannerProvider {
  readonly type = 'wasm' as const;
  private _manager: MotionPlanningManager;
  private _robotId: string;

  constructor(manager: MotionPlanningManager, robotId: string) {
    this._manager = manager;
    this._robotId = robotId;
  }

  get robotId(): string {
    return this._robotId;
  }

  get capabilities(): PlannerCapabilities {
    return {
      hasPathPlanning: true,
      hasLinearMotion: false, // MotionPlanningManager doesn't have linear motion yet
      hasCablePlanning: false,
      hasCollisionChecking: true,
      isLocal: true,
    };
  }

  async plan(
    request: PlanningRequest,
    collisionChecker?: CollisionChecker,
    onProgress?: PipelineProgressCallback
  ): Promise<PlanningResult> {
    return this._manager.plan(request, collisionChecker, onProgress);
  }

  async planLinearMotion(_request: LinearMotionRequest): Promise<LinearMotionResult> {
    return {
      success: false,
      path: [],
      cartesianPath: [],
      pathLength: 0,
      planningTimeMs: 0,
      errorMessage: 'Linear motion planning is not supported by the WASM planner adapter',
    };
  }

  async planPath(_request: PathPlanningRequest): Promise<PathPlanningResult> {
    // Delegate to the full pipeline with default config
    const result = await this._manager.plan({
      startJoints: _request.startJoints,
      goal: { type: 'joints', joints: _request.goalJoints },
      jointLimits: { lower: [], upper: [] },
      planner: {
        type: 'birrt',
        config: {
          maxIterations: _request.config?.maxIterations ?? 5000,
          goalBias: _request.config?.goalBias ?? 0.1,
          maxExtension: _request.config?.stepSize ?? 0.2,
          connectThreshold: 0.1,
          stepSize: _request.config?.stepSize ?? 0.05,
        },
      },
    });

    return {
      success: result.success,
      path: result.path.map((wp) => wp.joints),
      waypointCount: result.path.length,
      pathLength: result.metrics?.pathLength ?? 0,
      nodesExplored: result.nodesExplored ?? 0,
      planningTimeMs: result.planningTimeMs,
      errorMessage: result.error,
    };
  }

  async checkCollision(_joints: number[]): Promise<boolean> {
    // The WASM planner uses inline collision checking during planning,
    // not standalone checks. Return true (collision-free) as fallback.
    return true;
  }

  getCurrentStage(): PipelineStage {
    return this._manager.getCurrentStage();
  }

  abort(): void {
    this._manager.abort();
  }

  dispose(): void {
    // Manager lifecycle is managed externally, not by this adapter
  }
}
