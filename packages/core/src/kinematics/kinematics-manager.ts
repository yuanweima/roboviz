/**
 * RoboViz Kinematics Manager
 *
 * Singleton manager for trajx-wasm kinematics solvers.
 * Handles initialization, robot solver instances, and lifecycle management.
 */

import type {
  DhParam,
  JointLimits,
  IkResult,
  MultiIkResult,
  FkResult,
  FkChainResult,
  WorkspaceAnalysis,
  ReachabilityResult,
  RobotSolverConfig,
  IkSolverConfig,
  KinematicsEvent,
  KinematicsEventListener,
} from './types';
import type { Pose, Vector3 } from '../types';

// ============================================================================
// Types for trajx-wasm integration
// ============================================================================

// We define these interface types to avoid directly importing trajx-wasm
// until it's initialized. This allows the module to load without WASM.

interface TrajxPose {
  getPositionArray(): number[];
  getOrientationArray(): number[];
  toMatrix4(): number[];
}

interface TrajxCoreRobot {
  readonly name: string;
  readonly dof: number;
  setJointLimits(limits: unknown): void;
  getJointLimits(): unknown | undefined;
  attachTool(toolPose: unknown): void;
  detachTool(): void;
  hasTool(): boolean;
  configureIkSolver(
    maxIterations?: number,
    positionTolerance?: number,
    orientationTolerance?: number,
    dampingFactor?: number
  ): void;
  forwardKinematics(jointAngles: number[]): TrajxPose;
  forwardKinematicsChain(jointAngles: number[]): TrajxPose[];
  inverseKinematics(targetPose: unknown, seed?: number[]): unknown;
  inverseKinematicsAll(targetPose: unknown, seed?: number[]): unknown;
  analyzeWorkspace(jointAngles: number[]): unknown;
  isReachable(targetPose: unknown): boolean;
  isNearSingularity(jointAngles: number[], threshold?: number): boolean;
  computeManipulability(jointAngles: number[]): number;
  computeJacobian(jointAngles: number[]): number[];
  isValidConfig(joints: number[]): boolean;
  getDhParams(): number[];
  supportsAnalyticalIk(): boolean;
}

interface TrajxUrdfRobot {
  readonly name: string;
  readonly dof: number;
  jointNames(): string[];
  linkNames(): string[];
  getJointLimits(): unknown;
  getVelocityLimits(): number[] | undefined;
  getAccelerationLimits(): number[] | undefined;
  forwardKinematics(jointAngles: number[]): TrajxPose;
  forwardKinematicsChain(jointAngles: number[]): TrajxPose[];
  inverseKinematics(targetPose: unknown, seed?: number[]): unknown;
  inverseKinematicsAll(targetPose: unknown, seed?: number[]): unknown;
  supportsAnalyticalIk(): boolean;
  computeJacobian(jointAngles: number[]): number[];
  setJointPositions(positions: number[]): void;
  getJointPositions(): number[];
  isValidConfig(joints: number[]): boolean;
  attachTool(toolPose: unknown): void;
  detachTool(): void;
  hasTool(): boolean;
  // New unified Robot API
  hasDhParams(): boolean;
  usesDhForFk(): boolean;
  loadDhParamsFromDatabase(dbRobotName: string): boolean;
  getLinkTransforms(jointAngles: number[]): Record<string, TrajxPose>;
  analyzeWorkspace(jointAngles: number[]): unknown;
  isReachable(targetPose: unknown): boolean;
  isNearSingularity(jointAngles: number[], threshold?: number): boolean;
  computeManipulability(jointAngles: number[]): number;
}

interface TrajxModule {
  init(): Promise<void>;
  // Unified Robot API - creates robot from URDF, auto-detects DH params
  createRobot(urdfContent: string): TrajxUrdfRobot;
  // List available robots in DH database
  listDhDatabase(): string[];
  Pose: {
    fromPositionEuler(
      x: number, y: number, z: number,
      roll: number, pitch: number, yaw: number
    ): TrajxPose;
    identity(): TrajxPose;
  };
  JointLimits: new (lower: number[], upper: number[]) => unknown;
  DhParam: new (a: number, alpha: number, d: number, theta: number) => unknown;
}

// ============================================================================
// Robot Solver Wrapper
// ============================================================================

/**
 * Wrapper for trajx-wasm robot solver
 */
export class RobotSolver {
  private robot: TrajxCoreRobot;
  private trajx: TrajxModule;
  private config: RobotSolverConfig;

  constructor(robot: TrajxCoreRobot, trajx: TrajxModule, config: RobotSolverConfig) {
    this.robot = robot;
    this.trajx = trajx;
    this.config = config;
  }

  get robotId(): string {
    return this.config.robotId;
  }

  get dof(): number {
    return this.robot.dof;
  }

  get name(): string {
    return this.robot.name;
  }

  /**
   * Check if analytical IK is available
   */
  supportsAnalyticalIk(): boolean {
    return this.robot.supportsAnalyticalIk();
  }

  /**
   * Compute forward kinematics
   */
  forwardKinematics(jointAngles: number[]): FkResult {
    const pose = this.robot.forwardKinematics(jointAngles);
    return {
      pose: this.trajxPoseToRobovizPose(pose),
      toolApplied: this.robot.hasTool(),
    };
  }

  /**
   * Compute forward kinematics for all links
   */
  forwardKinematicsChain(jointAngles: number[]): FkChainResult {
    const poses = this.robot.forwardKinematicsChain(jointAngles);
    return {
      poses: poses.map((p) => this.trajxPoseToRobovizPose(p)),
    };
  }

  /**
   * Compute inverse kinematics (single solution)
   */
  inverseKinematics(targetPose: Pose, seed?: number[]): IkResult {
    const trajxPose = this.robovizPoseToTrajxPose(targetPose);
    const result = this.robot.inverseKinematics(trajxPose, seed) as {
      success: boolean;
      solution?: number[];
      error?: number;
      positionError?: number;
      iterations?: number;
      errorMessage?: string;
    };

    return {
      success: result.success,
      solution: result.solution,
      error: result.error,
      positionError: result.positionError,
      iterations: result.iterations,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Compute inverse kinematics (all solutions)
   */
  inverseKinematicsAll(targetPose: Pose, seed?: number[]): MultiIkResult {
    const trajxPose = this.robovizPoseToTrajxPose(targetPose);
    const result = this.robot.inverseKinematicsAll(trajxPose, seed) as {
      success: boolean;
      solutionCount: number;
      isAnalytical: boolean;
      positionErrors: number[];
      errorMessage?: string;
      getSolution(index: number): number[] | undefined;
    };

    const solutions: number[][] = [];
    for (let i = 0; i < result.solutionCount; i++) {
      const sol = result.getSolution(i);
      if (sol) {
        solutions.push(Array.from(sol));
      }
    }

    return {
      success: result.success,
      solutionCount: result.solutionCount,
      solutions,
      positionErrors: Array.from(result.positionErrors || []),
      isAnalytical: result.isAnalytical,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Analyze workspace properties
   */
  analyzeWorkspace(jointAngles: number[]): WorkspaceAnalysis {
    const result = this.robot.analyzeWorkspace(jointAngles) as {
      isReachable: boolean;
      manipulability: number;
      conditionNumber: number;
      isNearSingular: boolean;
      minSingularValue: number;
      jointLimitMargins: number[];
    };

    return {
      isValid: result.isReachable,
      manipulability: result.manipulability,
      conditionNumber: result.conditionNumber,
      isNearSingular: result.isNearSingular,
      minSingularValue: result.minSingularValue,
      jointLimitMargins: Array.from(result.jointLimitMargins),
    };
  }

  /**
   * Check if a pose is reachable
   */
  isReachable(targetPose: Pose): ReachabilityResult {
    const trajxPose = this.robovizPoseToTrajxPose(targetPose);

    // Use IK to check reachability
    const ikResult = this.inverseKinematics(targetPose);

    if (ikResult.success && ikResult.solution) {
      return {
        isReachable: true,
        solution: ikResult.solution,
        positionError: ikResult.positionError,
      };
    }

    // Determine reason for failure
    let reason: ReachabilityResult['reason'] = 'no_solution';

    // Check if robot supports basic reachability check
    try {
      const basicReachable = this.robot.isReachable(trajxPose);
      if (!basicReachable) {
        reason = 'out_of_range';
      }
    } catch {
      // Fallback to no_solution
    }

    return {
      isReachable: false,
      reason,
    };
  }

  /**
   * Check if near singularity
   */
  isNearSingularity(jointAngles: number[], threshold?: number): boolean {
    return this.robot.isNearSingularity(jointAngles, threshold);
  }

  /**
   * Compute manipulability measure
   */
  computeManipulability(jointAngles: number[]): number {
    return this.robot.computeManipulability(jointAngles);
  }

  /**
   * Compute Jacobian matrix
   * @returns Flat array: [rows, cols, data...]
   */
  computeJacobian(jointAngles: number[]): { rows: number; cols: number; data: number[] } {
    const flat = this.robot.computeJacobian(jointAngles);
    // Format: [rows, cols, data...]
    const rows = 6; // 6x6 for 6-DOF robot
    const cols = this.dof;
    return {
      rows,
      cols,
      data: Array.from(flat.slice(2)),
    };
  }

  /**
   * Check if joint configuration is valid
   */
  isValidConfig(joints: number[]): boolean {
    return this.robot.isValidConfig(joints);
  }

  /**
   * Attach a tool with the given offset
   */
  attachTool(toolPose: Pose): void {
    const trajxPose = this.robovizPoseToTrajxPose(toolPose);
    this.robot.attachTool(trajxPose);
  }

  /**
   * Detach the current tool
   */
  detachTool(): void {
    this.robot.detachTool();
  }

  /**
   * Check if tool is attached
   */
  hasTool(): boolean {
    return this.robot.hasTool();
  }

  /**
   * Configure IK solver parameters
   */
  configureIkSolver(config: IkSolverConfig): void {
    this.robot.configureIkSolver(
      config.maxIterations,
      config.positionTolerance,
      config.orientationTolerance,
      config.dampingFactor
    );
  }

  /**
   * Get DH parameters
   */
  getDhParams(): DhParam[] {
    const flat = this.robot.getDhParams();
    const nJoints = flat[0];
    const params: DhParam[] = [];

    for (let i = 0; i < nJoints; i++) {
      const offset = 1 + i * 4;
      params.push({
        a: flat[offset],
        alpha: flat[offset + 1],
        d: flat[offset + 2],
        theta: flat[offset + 3],
      });
    }

    return params;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private trajxPoseToRobovizPose(pose: TrajxPose): Pose {
    const pos = pose.getPositionArray();
    const ori = pose.getOrientationArray();

    return {
      position: { x: pos[0], y: pos[1], z: pos[2] },
      orientation: { x: ori[0], y: ori[1], z: ori[2], w: ori[3] },
    };
  }

  private robovizPoseToTrajxPose(pose: Pose): TrajxPose {
    // Convert quaternion to Euler angles for trajx-wasm
    const euler = this.quaternionToEuler(pose.orientation);

    return this.trajx.Pose.fromPositionEuler(
      pose.position.x,
      pose.position.y,
      pose.position.z,
      euler.roll,
      euler.pitch,
      euler.yaw
    );
  }

  private quaternionToEuler(q: { x: number; y: number; z: number; w: number }): {
    roll: number;
    pitch: number;
    yaw: number;
  } {
    // Roll (x-axis rotation)
    const sinrCosp = 2 * (q.w * q.x + q.y * q.z);
    const cosrCosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinrCosp, cosrCosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (q.w * q.y - q.z * q.x);
    let pitch: number;
    if (Math.abs(sinp) >= 1) {
      pitch = Math.sign(sinp) * (Math.PI / 2);
    } else {
      pitch = Math.asin(sinp);
    }

    // Yaw (z-axis rotation)
    const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
    const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(sinyCosp, cosyCosp);

    return { roll, pitch, yaw };
  }
}

// ============================================================================
// URDF Robot Solver Wrapper
// ============================================================================

/**
 * Wrapper for trajx-wasm URDF-based robot solver
 *
 * This solver is created directly from URDF content, extracting kinematics
 * parameters from the URDF file itself. This provides accurate FK/IK based
 * on the actual robot geometry without requiring a separate DH database lookup.
 */
export class UrdfRobotSolver {
  private robot: TrajxUrdfRobot;
  private trajx: TrajxModule;
  private _robotId: string;
  private _jointNames: string[];
  private _linkNames: string[];

  constructor(robot: TrajxUrdfRobot, trajx: TrajxModule, robotId: string) {
    this.robot = robot;
    this.trajx = trajx;
    this._robotId = robotId;
    this._jointNames = robot.jointNames();
    this._linkNames = robot.linkNames();
  }

  get robotId(): string {
    return this._robotId;
  }

  get dof(): number {
    return this.robot.dof;
  }

  get name(): string {
    return this.robot.name;
  }

  get jointNames(): string[] {
    return this._jointNames;
  }

  get linkNames(): string[] {
    return this._linkNames;
  }

  /**
   * Check if analytical IK is available
   */
  supportsAnalyticalIk(): boolean {
    return this.robot.supportsAnalyticalIk();
  }

  /**
   * Get joint limits from URDF
   */
  getJointLimits(): { lower: number[]; upper: number[] } {
    const limits = this.robot.getJointLimits() as { lower: number[]; upper: number[] };
    return {
      lower: Array.from(limits.lower),
      upper: Array.from(limits.upper),
    };
  }

  /**
   * Get velocity limits from URDF (if available)
   */
  getVelocityLimits(): number[] | undefined {
    const limits = this.robot.getVelocityLimits();
    return limits ? Array.from(limits) : undefined;
  }

  /**
   * Get acceleration limits from URDF (if available)
   */
  getAccelerationLimits(): number[] | undefined {
    const limits = this.robot.getAccelerationLimits();
    return limits ? Array.from(limits) : undefined;
  }

  /**
   * Compute forward kinematics
   */
  forwardKinematics(jointAngles: number[]): FkResult {
    const pose = this.robot.forwardKinematics(jointAngles);
    return {
      pose: this.trajxPoseToRobovizPose(pose),
      toolApplied: this.robot.hasTool(),
    };
  }

  /**
   * Compute forward kinematics for all links
   */
  forwardKinematicsChain(jointAngles: number[]): FkChainResult {
    const poses = this.robot.forwardKinematicsChain(jointAngles);
    return {
      poses: poses.map((p) => this.trajxPoseToRobovizPose(p)),
    };
  }

  /**
   * Compute inverse kinematics (single solution)
   */
  inverseKinematics(targetPose: Pose, seed?: number[]): IkResult {
    const trajxPose = this.robovizPoseToTrajxPose(targetPose);
    const result = this.robot.inverseKinematics(trajxPose, seed) as {
      success: boolean;
      solution?: number[];
      error?: number;
      positionError?: number;
      iterations?: number;
      errorMessage?: string;
    };

    return {
      success: result.success,
      solution: result.solution,
      error: result.error,
      positionError: result.positionError,
      iterations: result.iterations,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Check if joint configuration is valid
   */
  isValidConfig(joints: number[]): boolean {
    return this.robot.isValidConfig(joints);
  }

  /**
   * Compute Jacobian matrix
   * @returns Flat array: [rows, cols, data...]
   */
  computeJacobian(jointAngles: number[]): { rows: number; cols: number; data: number[] } {
    const flat = this.robot.computeJacobian(jointAngles);
    const rows = 6;
    const cols = this.dof;
    return {
      rows,
      cols,
      data: Array.from(flat.slice(2)),
    };
  }

  /**
   * Attach a tool with the given offset
   */
  attachTool(toolPose: Pose): void {
    const trajxPose = this.robovizPoseToTrajxPose(toolPose);
    this.robot.attachTool(trajxPose);
  }

  /**
   * Detach the current tool
   */
  detachTool(): void {
    this.robot.detachTool();
  }

  /**
   * Check if tool is attached
   */
  hasTool(): boolean {
    return this.robot.hasTool();
  }

  // ============================================================================
  // New unified Robot API methods
  // ============================================================================

  /**
   * Check if DH parameters are loaded (from database match)
   */
  hasDhParams(): boolean {
    return this.robot.hasDhParams();
  }

  /**
   * Check if robot is using DH-based FK (vs URDF-based)
   */
  usesDhForFk(): boolean {
    return this.robot.usesDhForFk();
  }

  /**
   * Load DH parameters from database by robot name
   * @returns true if parameters were loaded successfully
   */
  loadDhParamsFromDatabase(dbRobotName: string): boolean {
    return this.robot.loadDhParamsFromDatabase(dbRobotName);
  }

  /**
   * Get link transforms as a map (for visualization with link names)
   */
  getLinkTransforms(jointAngles: number[]): Record<string, Pose> {
    const transforms = this.robot.getLinkTransforms(jointAngles);
    const result: Record<string, Pose> = {};
    for (const [name, pose] of Object.entries(transforms)) {
      result[name] = this.trajxPoseToRobovizPose(pose as TrajxPose);
    }
    return result;
  }

  /**
   * Compute inverse kinematics (all solutions)
   */
  inverseKinematicsAll(targetPose: Pose, seed?: number[]): MultiIkResult {
    const trajxPose = this.robovizPoseToTrajxPose(targetPose);
    const result = this.robot.inverseKinematicsAll(trajxPose, seed) as {
      success: boolean;
      solutionCount: number;
      isAnalytical: boolean;
      positionErrors: number[];
      errorMessage?: string;
      getSolution(index: number): number[] | undefined;
    };

    const solutions: number[][] = [];
    for (let i = 0; i < result.solutionCount; i++) {
      const sol = result.getSolution(i);
      if (sol) {
        solutions.push(Array.from(sol));
      }
    }

    return {
      success: result.success,
      solutionCount: result.solutionCount,
      solutions,
      positionErrors: Array.from(result.positionErrors || []),
      isAnalytical: result.isAnalytical,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Analyze workspace properties
   */
  analyzeWorkspace(jointAngles: number[]): WorkspaceAnalysis {
    const result = this.robot.analyzeWorkspace(jointAngles) as {
      isReachable: boolean;
      manipulability: number;
      conditionNumber: number;
      isNearSingular: boolean;
      minSingularValue: number;
      jointLimitMargins: number[];
    };

    return {
      isValid: result.isReachable,
      manipulability: result.manipulability,
      conditionNumber: result.conditionNumber,
      isNearSingular: result.isNearSingular,
      minSingularValue: result.minSingularValue,
      jointLimitMargins: Array.from(result.jointLimitMargins),
    };
  }

  /**
   * Check if a pose is reachable
   */
  isReachable(targetPose: Pose): boolean {
    const trajxPose = this.robovizPoseToTrajxPose(targetPose);
    return this.robot.isReachable(trajxPose);
  }

  /**
   * Check if near singularity
   */
  isNearSingularity(jointAngles: number[], threshold?: number): boolean {
    return this.robot.isNearSingularity(jointAngles, threshold);
  }

  /**
   * Compute manipulability
   */
  computeManipulability(jointAngles: number[]): number {
    return this.robot.computeManipulability(jointAngles);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private trajxPoseToRobovizPose(pose: TrajxPose): Pose {
    const pos = pose.getPositionArray();
    const ori = pose.getOrientationArray();

    return {
      position: { x: pos[0], y: pos[1], z: pos[2] },
      orientation: { x: ori[0], y: ori[1], z: ori[2], w: ori[3] },
    };
  }

  private robovizPoseToTrajxPose(pose: Pose): TrajxPose {
    const euler = this.quaternionToEuler(pose.orientation);

    return this.trajx.Pose.fromPositionEuler(
      pose.position.x,
      pose.position.y,
      pose.position.z,
      euler.roll,
      euler.pitch,
      euler.yaw
    );
  }

  private quaternionToEuler(q: { x: number; y: number; z: number; w: number }): {
    roll: number;
    pitch: number;
    yaw: number;
  } {
    const sinrCosp = 2 * (q.w * q.x + q.y * q.z);
    const cosrCosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    const roll = Math.atan2(sinrCosp, cosrCosp);

    const sinp = 2 * (q.w * q.y - q.z * q.x);
    let pitch: number;
    if (Math.abs(sinp) >= 1) {
      pitch = Math.sign(sinp) * (Math.PI / 2);
    } else {
      pitch = Math.asin(sinp);
    }

    const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
    const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(sinyCosp, cosyCosp);

    return { roll, pitch, yaw };
  }
}

// ============================================================================
// Kinematics Manager
// ============================================================================

/**
 * Kinematics Manager - Singleton
 *
 * Manages trajx-wasm initialization and robot solver instances.
 */
/** Union type for all solver types */
export type AnySolver = RobotSolver | UrdfRobotSolver;

class KinematicsManager {
  private trajx: TrajxModule | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private solvers: Map<string, RobotSolver> = new Map();
  private urdfSolvers: Map<string, UrdfRobotSolver> = new Map();
  private listeners: Set<KinematicsEventListener> = new Set();
  private _solverVersion = 0;

  /**
   * Get the solver version counter.
   * This increments whenever a solver is created or destroyed.
   * Useful as a React dependency to trigger re-renders.
   */
  get solverVersion(): number {
    return this._solverVersion;
  }

  /**
   * Initialize the WASM module
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Dynamic import to avoid loading WASM at module load time
      // trajx-wasm has two init mechanisms:
      // 1. default export (__wbg_init) - loads the WASM binary (REQUIRED FIRST)
      // 2. named export init() - sets up panic hooks (optional, called after WASM loads)
      const trajxModule = await import('trajx-wasm') as unknown as TrajxModule & {
        default?: () => Promise<void>;
        init?: () => void;
      };

      // First: Call the default export to load WASM binary
      // This is the real initialization that loads the .wasm file
      if (typeof trajxModule.default === 'function') {
        await trajxModule.default();
      } else {
        throw new Error('trajx-wasm default init function not found');
      }

      // Second (optional): Call init() to set up panic hooks for better error messages
      if (typeof trajxModule.init === 'function') {
        try {
          trajxModule.init();
        } catch {
          // Ignore panic hook init errors - not critical
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
   * Get available robot names from the DH database
   */
  getAvailableRobots(): string[] {
    if (!this.trajx) {
      throw new Error('Kinematics not initialized');
    }

    return this.trajx.listDhDatabase();
  }

  /**
   * Create a robot solver from database
   * @deprecated Use createSolverFromUrdf() with loadDhParamsFromDatabase() instead.
   * The new unified API requires URDF content for robot creation.
   */
  createSolverFromDatabase(_robotId: string, _robotName: string): RobotSolver {
    throw new Error(
      'createSolverFromDatabase is deprecated. ' +
      'Use createSolverFromUrdf(robotId, urdfContent) instead, then call ' +
      'solver.loadDhParamsFromDatabase(robotName) to enable analytical IK.'
    );
  }

  /**
   * Create a robot solver with custom configuration
   * @deprecated Use createSolverFromUrdf() instead. The new unified API requires URDF content.
   */
  createSolver(_config: RobotSolverConfig): RobotSolver {
    throw new Error(
      'createSolver is deprecated. ' +
      'Use createSolverFromUrdf(robotId, urdfContent) instead.'
    );
  }

  /**
   * Create a robot solver directly from URDF content
   *
   * This is the preferred method when you have URDF content available,
   * as it extracts kinematics parameters directly from the URDF file.
   * No DH database lookup is required.
   *
   * @param robotId - Unique identifier for this solver instance
   * @param urdfContent - URDF XML content as a string
   * @returns UrdfRobotSolver instance
   */
  createSolverFromUrdf(robotId: string, urdfContent: string): UrdfRobotSolver {
    if (!this.trajx) {
      throw new Error('Kinematics not initialized');
    }

    // Check if we already have a solver for this robot
    if (this.urdfSolvers.has(robotId)) {
      return this.urdfSolvers.get(robotId)!;
    }

    // Also check DH-based solvers to prevent conflicts
    if (this.solvers.has(robotId)) {
      throw new Error(`Solver already exists for robotId: ${robotId}. Use a different ID or dispose the existing solver first.`);
    }

    // Create robot from URDF using unified API
    // DH parameters are auto-detected if robot name matches database
    const robot = this.trajx.createRobot(urdfContent);
    const solver = new UrdfRobotSolver(robot, this.trajx, robotId);

    this.urdfSolvers.set(robotId, solver);
    this._solverVersion++;

    this.emit({
      type: 'solver:created',
      robotId,
      timestamp: Date.now(),
      data: {
        source: 'urdf',
        robotName: robot.name,
        dof: robot.dof,
        jointNames: solver.jointNames,
      },
    });

    return solver;
  }

  /**
   * Get a DH-based solver by robot ID
   */
  getSolver(robotId: string): RobotSolver | undefined {
    return this.solvers.get(robotId);
  }

  /**
   * Get a URDF-based solver by robot ID
   */
  getUrdfSolver(robotId: string): UrdfRobotSolver | undefined {
    return this.urdfSolvers.get(robotId);
  }

  /**
   * Get any solver (DH or URDF) by robot ID
   */
  getAnySolver(robotId: string): AnySolver | undefined {
    return this.solvers.get(robotId) || this.urdfSolvers.get(robotId);
  }

  /**
   * Check if a solver exists (DH or URDF)
   */
  hasSolver(robotId: string): boolean {
    return this.solvers.has(robotId) || this.urdfSolvers.has(robotId);
  }

  /**
   * List all solver IDs (both DH and URDF)
   */
  listSolvers(): string[] {
    return [
      ...Array.from(this.solvers.keys()),
      ...Array.from(this.urdfSolvers.keys()),
    ];
  }

  /**
   * Dispose a solver (DH or URDF)
   */
  disposeSolver(robotId: string): boolean {
    // Try DH solver first
    if (this.solvers.has(robotId)) {
      this.solvers.delete(robotId);
      this._solverVersion++; // Increment version for reactivity
      this.emit({
        type: 'solver:disposed',
        robotId,
        timestamp: Date.now(),
      });
      return true;
    }

    // Try URDF solver
    if (this.urdfSolvers.has(robotId)) {
      this.urdfSolvers.delete(robotId);
      this._solverVersion++; // Increment version for reactivity
      this.emit({
        type: 'solver:disposed',
        robotId,
        timestamp: Date.now(),
      });
      return true;
    }

    return false;
  }

  /**
   * Dispose all solvers (both DH and URDF)
   */
  disposeAll(): void {
    for (const robotId of this.solvers.keys()) {
      this.disposeSolver(robotId);
    }
    for (const robotId of this.urdfSolvers.keys()) {
      this.disposeSolver(robotId);
    }
  }

  // ============================================================================
  // Event handling
  // ============================================================================

  /**
   * Add event listener
   */
  addEventListener(listener: KinematicsEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: KinematicsEventListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: KinematicsEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Kinematics event listener error:', e);
      }
    }
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let managerInstance: KinematicsManager | null = null;

/**
 * Get the kinematics manager singleton
 */
export function getKinematicsManager(): KinematicsManager {
  if (!managerInstance) {
    managerInstance = new KinematicsManager();
  }
  return managerInstance;
}

/**
 * Reset the kinematics manager (for testing)
 */
export function resetKinematicsManager(): void {
  if (managerInstance) {
    managerInstance.disposeAll();
  }
  managerInstance = null;
}
