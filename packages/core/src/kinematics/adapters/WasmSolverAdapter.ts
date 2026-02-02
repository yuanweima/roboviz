/**
 * WASM Solver Adapter
 *
 * Wraps the existing UrdfRobotSolver (from kinematics-manager.ts) behind
 * the ISolverProvider async interface. All synchronous WASM calls are
 * wrapped in Promise.resolve() for interface compatibility.
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
import type { UrdfRobotSolver } from '../kinematics-manager';

export class WasmSolverAdapter implements ISolverProvider {
  readonly type = 'wasm' as const;
  private _solver: UrdfRobotSolver;

  constructor(urdfSolver: UrdfRobotSolver) {
    this._solver = urdfSolver;
  }

  get robotId(): string {
    return this._solver.robotId;
  }

  get dof(): number {
    return this._solver.dof;
  }

  get name(): string {
    return this._solver.name;
  }

  get jointNames(): string[] {
    return this._solver.jointNames;
  }

  get linkNames(): string[] {
    return this._solver.linkNames;
  }

  get jointLimits(): { lower: number[]; upper: number[] } | null {
    try {
      return this._solver.getJointLimits();
    } catch {
      return null;
    }
  }

  get capabilities(): SolverCapabilities {
    return {
      hasFK: true,
      hasIK: true,
      hasMultiIK: this._solver.supportsAnalyticalIk(),
      hasTcpIK: true,
      hasWorkspaceAnalysis: true,
      isAnalytical: this._solver.supportsAnalyticalIk(),
      isLocal: true,
    };
  }

  /** Access the underlying UrdfRobotSolver for advanced usage */
  get underlyingSolver(): UrdfRobotSolver {
    return this._solver;
  }

  async forwardKinematics(jointAngles: number[]): Promise<FkResult> {
    return this._solver.forwardKinematics(jointAngles);
  }

  async forwardKinematicsTcp(jointAngles: number[]): Promise<FkResult> {
    return this._solver.forwardKinematicsTcp(jointAngles);
  }

  async forwardKinematicsChain(jointAngles: number[]): Promise<FkChainResult> {
    return this._solver.forwardKinematicsChain(jointAngles);
  }

  async inverseKinematics(targetPose: Pose, seed?: number[]): Promise<IkResult> {
    return this._solver.inverseKinematics(targetPose, seed);
  }

  async inverseKinematicsTcp(targetPose: Pose, seed?: number[]): Promise<IkResult> {
    return this._solver.inverseKinematicsTcp(targetPose, seed);
  }

  async inverseKinematicsAll(targetPose: Pose, seed?: number[]): Promise<MultiIkResult> {
    return this._solver.inverseKinematicsAll(targetPose, seed);
  }

  async isValidConfig(joints: number[]): Promise<boolean> {
    return this._solver.isValidConfig(joints);
  }

  async analyzeWorkspace(jointAngles: number[]): Promise<WorkspaceAnalysis> {
    return this._solver.analyzeWorkspace(jointAngles);
  }

  async attachTool(toolPose: Pose): Promise<void> {
    this._solver.attachTool(toolPose);
  }

  async detachTool(): Promise<void> {
    this._solver.detachTool();
  }

  hasTool(): boolean {
    return this._solver.hasTool();
  }

  dispose(): void {
    // Solver lifecycle is managed by KinematicsManager, not this adapter
  }
}
