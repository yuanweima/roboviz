/**
 * Remote Planner Adapter
 *
 * Sends JSON-RPC requests to a backend service for motion planning.
 * Uses the existing Dispatcher and planning.* protocol namespace.
 *
 * @example
 * ```typescript
 * const dispatcher = createDispatcher();
 * dispatcher.setTransport(createWebSocketTransport({ url: 'ws://backend:8765' }));
 *
 * const adapter = new RemotePlannerAdapter({ robotId: 'main', dispatcher });
 * const result = await adapter.plan(request);
 * ```
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
import type { Dispatcher } from '../../protocol/dispatcher';

// ============================================================================
// Configuration
// ============================================================================

export interface RemotePlannerConfig {
  /** Robot identifier on the backend */
  robotId: string;

  /** JSON-RPC dispatcher with transport configured */
  dispatcher: Dispatcher;

  /** Override capabilities (useful if backend capabilities are known ahead of time) */
  capabilities?: Partial<PlannerCapabilities>;
}

// ============================================================================
// Adapter Implementation
// ============================================================================

export class RemotePlannerAdapter implements IPlannerProvider {
  readonly type = 'remote' as const;

  private _dispatcher: Dispatcher;
  private _robotId: string;
  private _capabilities: PlannerCapabilities;
  private _currentStage: PipelineStage = 'idle';
  private _aborted = false;

  constructor(config: RemotePlannerConfig) {
    this._dispatcher = config.dispatcher;
    this._robotId = config.robotId;
    this._capabilities = {
      hasPathPlanning: true,
      hasLinearMotion: true,
      hasCablePlanning: false,
      hasCollisionChecking: true,
      isLocal: false,
      ...config.capabilities,
    };
  }

  get robotId(): string {
    return this._robotId;
  }

  get capabilities(): PlannerCapabilities {
    return this._capabilities;
  }

  async plan(
    request: PlanningRequest,
    _collisionChecker?: CollisionChecker,
    onProgress?: PipelineProgressCallback
  ): Promise<PlanningResult> {
    this._aborted = false;
    this._currentStage = 'planning';

    if (onProgress) {
      onProgress({ stage: 'planning', progress: 0, message: 'Sending request to backend...' });
    }

    try {
      const result = await this._dispatcher.request<PlanningResult>('planning.plan', {
        robotId: this._robotId,
        request,
      });

      if (this._aborted) {
        return {
          success: false,
          error: 'Planning aborted',
          path: [],
          planningTimeMs: 0,
          totalTimeMs: 0,
          collisionChecked: false,
        };
      }

      this._currentStage = 'complete';
      if (onProgress) {
        onProgress({ stage: 'complete', progress: 1, message: 'Planning complete' });
      }

      return result;
    } catch (err) {
      this._currentStage = 'error';
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        path: [],
        planningTimeMs: 0,
        totalTimeMs: 0,
        collisionChecked: false,
      };
    }
  }

  async planLinearMotion(request: LinearMotionRequest): Promise<LinearMotionResult> {
    try {
      return await this._dispatcher.request<LinearMotionResult>('planning.planLinearMotion', {
        robotId: this._robotId,
        request,
      });
    } catch (err) {
      return {
        success: false,
        path: [],
        cartesianPath: [],
        pathLength: 0,
        planningTimeMs: 0,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async planPath(request: PathPlanningRequest): Promise<PathPlanningResult> {
    try {
      return await this._dispatcher.request<PathPlanningResult>('planning.planPath', {
        robotId: this._robotId,
        request,
      });
    } catch (err) {
      return {
        success: false,
        path: [],
        waypointCount: 0,
        pathLength: 0,
        nodesExplored: 0,
        planningTimeMs: 0,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async checkCollision(joints: number[]): Promise<boolean> {
    try {
      const result = await this._dispatcher.request<{ collisionFree: boolean }>(
        'planning.checkCollision',
        { robotId: this._robotId, joints }
      );
      return result.collisionFree;
    } catch {
      return false; // Assume collision on error
    }
  }

  getCurrentStage(): PipelineStage {
    return this._currentStage;
  }

  abort(): void {
    this._aborted = true;
    this._currentStage = 'idle';
    // Fire-and-forget abort request to backend
    this._dispatcher.request('planning.abort', { robotId: this._robotId }).catch(() => {});
  }

  dispose(): void {
    this._currentStage = 'idle';
  }
}
