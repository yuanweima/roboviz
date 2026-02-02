/**
 * Remote Solver Adapter
 *
 * Sends JSON-RPC requests to a backend service for IK/FK computation.
 * Uses the existing Dispatcher and kinematics.* protocol namespace.
 *
 * @example
 * ```typescript
 * const dispatcher = createDispatcher();
 * dispatcher.setTransport(createWebSocketTransport({ url: 'ws://backend:8765' }));
 *
 * const adapter = new RemoteSolverAdapter({ robotId: 'main', dispatcher });
 * await adapter.initialize();
 *
 * const fk = await adapter.forwardKinematics([0, 0, 0, 0, 0, 0]);
 * ```
 */

import type { Pose } from '../../types';
import type {
  FkResult,
  FkChainResult,
  IkResult,
  MultiIkResult,
  WorkspaceAnalysis,
} from '../types';
import type { ISolverProvider, SolverCapabilities } from '../solver-provider-types';
import type { Dispatcher } from '../../protocol/dispatcher';

// ============================================================================
// Configuration
// ============================================================================

export interface RemoteSolverConfig {
  /** Robot identifier on the backend */
  robotId: string;

  /** JSON-RPC dispatcher with transport configured */
  dispatcher: Dispatcher;

  /** Override capabilities (useful if backend capabilities are known ahead of time) */
  capabilities?: Partial<SolverCapabilities>;
}

// ============================================================================
// Remote Robot Info (returned by kinematics.getRobotInfo)
// ============================================================================

interface RemoteRobotInfo {
  dof: number;
  name: string;
  jointNames: string[];
  linkNames: string[];
  jointLimits: { lower: number[]; upper: number[] } | null;
  capabilities?: Partial<SolverCapabilities>;
}

// ============================================================================
// Adapter Implementation
// ============================================================================

export class RemoteSolverAdapter implements ISolverProvider {
  readonly type = 'remote' as const;

  private _dispatcher: Dispatcher;
  private _robotId: string;
  private _dof = 0;
  private _name = '';
  private _jointNames: string[] = [];
  private _linkNames: string[] = [];
  private _jointLimits: { lower: number[]; upper: number[] } | null = null;
  private _capabilities: SolverCapabilities;
  private _hasTool = false;
  private _initialized = false;

  constructor(config: RemoteSolverConfig) {
    this._dispatcher = config.dispatcher;
    this._robotId = config.robotId;
    this._capabilities = {
      hasFK: true,
      hasIK: true,
      hasMultiIK: false,
      hasTcpIK: true,
      hasWorkspaceAnalysis: true,
      isAnalytical: false,
      isLocal: false,
      ...config.capabilities,
    };
  }

  /**
   * Initialize by querying the remote backend for robot metadata.
   * Must be called before using any solver methods.
   */
  async initialize(): Promise<void> {
    try {
      const info = await this._dispatcher.request<RemoteRobotInfo>(
        'kinematics.getRobotInfo',
        { robotId: this._robotId }
      );

      this._dof = info.dof;
      this._name = info.name;
      this._jointNames = info.jointNames || [];
      this._linkNames = info.linkNames || [];
      this._jointLimits = info.jointLimits || null;

      if (info.capabilities) {
        this._capabilities = { ...this._capabilities, ...info.capabilities };
      }

      this._initialized = true;
    } catch (err) {
      throw new Error(
        `[RemoteSolverAdapter] Failed to initialize for robot "${this._robotId}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  get robotId(): string { return this._robotId; }
  get dof(): number { return this._dof; }
  get name(): string { return this._name; }
  get jointNames(): string[] { return this._jointNames; }
  get linkNames(): string[] { return this._linkNames; }
  get jointLimits(): { lower: number[]; upper: number[] } | null { return this._jointLimits; }
  get capabilities(): SolverCapabilities { return this._capabilities; }

  // --- Kinematics Methods ---

  async forwardKinematics(jointAngles: number[]): Promise<FkResult> {
    return this._dispatcher.request<FkResult>('kinematics.fk', {
      robotId: this._robotId,
      jointAngles,
    });
  }

  async forwardKinematicsTcp(jointAngles: number[]): Promise<FkResult> {
    return this._dispatcher.request<FkResult>('kinematics.fkTcp', {
      robotId: this._robotId,
      jointAngles,
    });
  }

  async forwardKinematicsChain(jointAngles: number[]): Promise<FkChainResult> {
    return this._dispatcher.request<FkChainResult>('kinematics.fkChain', {
      robotId: this._robotId,
      jointAngles,
    });
  }

  async inverseKinematics(targetPose: Pose, seed?: number[]): Promise<IkResult> {
    return this._dispatcher.request<IkResult>('kinematics.ik', {
      robotId: this._robotId,
      targetPose,
      seed,
    });
  }

  async inverseKinematicsTcp(targetPose: Pose, seed?: number[]): Promise<IkResult> {
    return this._dispatcher.request<IkResult>('kinematics.ikTcp', {
      robotId: this._robotId,
      targetPose,
      seed,
    });
  }

  async inverseKinematicsAll(targetPose: Pose, seed?: number[]): Promise<MultiIkResult> {
    return this._dispatcher.request<MultiIkResult>('kinematics.ikAll', {
      robotId: this._robotId,
      targetPose,
      seed,
    });
  }

  async isValidConfig(joints: number[]): Promise<boolean> {
    const result = await this._dispatcher.request<{ valid: boolean }>(
      'kinematics.isValidConfig',
      { robotId: this._robotId, joints }
    );
    return result.valid;
  }

  async analyzeWorkspace(jointAngles: number[]): Promise<WorkspaceAnalysis> {
    return this._dispatcher.request<WorkspaceAnalysis>(
      'kinematics.analyzeWorkspace',
      { robotId: this._robotId, jointAngles }
    );
  }

  // --- Tool Management ---

  async attachTool(toolPose: Pose): Promise<void> {
    await this._dispatcher.request('kinematics.attachTool', {
      robotId: this._robotId,
      toolPose,
    });
    this._hasTool = true;
  }

  async detachTool(): Promise<void> {
    await this._dispatcher.request('kinematics.detachTool', {
      robotId: this._robotId,
    });
    this._hasTool = false;
  }

  hasTool(): boolean {
    return this._hasTool;
  }

  dispose(): void {
    // Remote solver lifecycle is managed by the backend
    this._initialized = false;
  }
}
