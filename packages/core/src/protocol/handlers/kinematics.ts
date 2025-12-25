/**
 * RoboViz Kinematics Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for kinematics.* namespace
 * Provides FK/IK computation and motion planning through the protocol layer.
 */

import type { MethodHandler } from '../handler';
import type { Pose } from '../../types';
import type {
  IkResult,
  MultiIkResult,
  FkResult,
  FkChainResult,
  WorkspaceAnalysis,
  ReachabilityResult,
  RobotSolverConfig,
  IkSolverConfig,
  DhParam,
  JointLimits,
} from '../../kinematics/types';
import { getKinematicsManager } from '../../kinematics/kinematics-manager';

// ============================================================================
// Initialization Handlers
// ============================================================================

/**
 * kinematics.init - Initialize the WASM module
 */
export const kinematicsInit: MethodHandler<
  Record<string, never>,
  { success: boolean; availableRobots: string[] }
> = async () => {
  const manager = getKinematicsManager();
  await manager.initialize();
  return {
    success: true,
    availableRobots: manager.getAvailableRobots(),
  };
};

/**
 * kinematics.isReady - Check if WASM is initialized
 */
export const kinematicsIsReady: MethodHandler<
  Record<string, never>,
  { ready: boolean }
> = () => {
  const manager = getKinematicsManager();
  return { ready: manager.isInitialized() };
};

/**
 * kinematics.listAvailableRobots - List available robot models
 */
export const kinematicsListAvailableRobots: MethodHandler<
  Record<string, never>,
  { robots: string[] }
> = () => {
  const manager = getKinematicsManager();
  if (!manager.isInitialized()) {
    throw new Error('Kinematics not initialized');
  }
  return { robots: manager.getAvailableRobots() };
};

// ============================================================================
// Solver Management Handlers
// ============================================================================

/**
 * kinematics.createSolver - Create a solver from database
 */
export const kinematicsCreateSolver: MethodHandler<
  { robotId: string; robotName: string },
  { success: boolean; dof: number; supportsAnalyticalIk: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  if (!manager.isInitialized()) {
    throw new Error('Kinematics not initialized');
  }

  const solver = manager.createSolverFromDatabase(params.robotId, params.robotName);
  return {
    success: true,
    dof: solver.dof,
    supportsAnalyticalIk: solver.supportsAnalyticalIk(),
  };
};

/**
 * kinematics.createSolverWithConfig - Create a solver with custom configuration
 */
export const kinematicsCreateSolverWithConfig: MethodHandler<
  RobotSolverConfig,
  { success: boolean; dof: number; supportsAnalyticalIk: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  if (!manager.isInitialized()) {
    throw new Error('Kinematics not initialized');
  }

  const solver = manager.createSolver(params);
  return {
    success: true,
    dof: solver.dof,
    supportsAnalyticalIk: solver.supportsAnalyticalIk(),
  };
};

/**
 * kinematics.disposeSolver - Dispose a solver
 */
export const kinematicsDisposeSolver: MethodHandler<
  { robotId: string },
  { success: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  const disposed = manager.disposeSolver(params.robotId);
  return { success: disposed };
};

/**
 * kinematics.listSolvers - List all solver IDs
 */
export const kinematicsListSolvers: MethodHandler<
  Record<string, never>,
  { solvers: string[] }
> = () => {
  const manager = getKinematicsManager();
  return { solvers: manager.listSolvers() };
};

/**
 * kinematics.hasSolver - Check if solver exists
 */
export const kinematicsHasSolver: MethodHandler<
  { robotId: string },
  { exists: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  return { exists: manager.hasSolver(params.robotId) };
};

// ============================================================================
// Forward Kinematics Handlers
// ============================================================================

/**
 * kinematics.fk - Compute forward kinematics
 */
export const kinematicsFk: MethodHandler<
  { robotId: string; jointAngles: number[] },
  FkResult
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return solver.forwardKinematics(params.jointAngles);
};

/**
 * kinematics.fkChain - Compute forward kinematics for all links
 */
export const kinematicsFkChain: MethodHandler<
  { robotId: string; jointAngles: number[] },
  FkChainResult
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return solver.forwardKinematicsChain(params.jointAngles);
};

// ============================================================================
// Inverse Kinematics Handlers
// ============================================================================

/**
 * kinematics.ik - Compute inverse kinematics (single solution)
 */
export const kinematicsIk: MethodHandler<
  { robotId: string; targetPose: Pose; seed?: number[] },
  IkResult
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return solver.inverseKinematics(params.targetPose, params.seed);
};

/**
 * kinematics.ikAll - Compute all inverse kinematics solutions
 */
export const kinematicsIkAll: MethodHandler<
  { robotId: string; targetPose: Pose; seed?: number[] },
  MultiIkResult
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return solver.inverseKinematicsAll(params.targetPose, params.seed);
};

/**
 * kinematics.configureIk - Configure IK solver parameters
 */
export const kinematicsConfigureIk: MethodHandler<
  { robotId: string; config: IkSolverConfig },
  { success: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  solver.configureIkSolver(params.config);
  return { success: true };
};

// ============================================================================
// Workspace Analysis Handlers
// ============================================================================

/**
 * kinematics.analyzeWorkspace - Analyze workspace at configuration
 */
export const kinematicsAnalyzeWorkspace: MethodHandler<
  { robotId: string; jointAngles: number[] },
  WorkspaceAnalysis
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return solver.analyzeWorkspace(params.jointAngles);
};

/**
 * kinematics.isReachable - Check if pose is reachable
 */
export const kinematicsIsReachable: MethodHandler<
  { robotId: string; targetPose: Pose },
  ReachabilityResult
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return solver.isReachable(params.targetPose);
};

/**
 * kinematics.isNearSingularity - Check if near singularity
 */
export const kinematicsIsNearSingularity: MethodHandler<
  { robotId: string; jointAngles: number[]; threshold?: number },
  { isNearSingularity: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return {
    isNearSingularity: solver.isNearSingularity(params.jointAngles, params.threshold),
  };
};

/**
 * kinematics.computeManipulability - Compute manipulability measure
 */
export const kinematicsComputeManipulability: MethodHandler<
  { robotId: string; jointAngles: number[] },
  { manipulability: number }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return {
    manipulability: solver.computeManipulability(params.jointAngles),
  };
};

/**
 * kinematics.computeJacobian - Compute Jacobian matrix
 */
export const kinematicsComputeJacobian: MethodHandler<
  { robotId: string; jointAngles: number[] },
  { rows: number; cols: number; data: number[] }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return solver.computeJacobian(params.jointAngles);
};

// ============================================================================
// Tool Management Handlers
// ============================================================================

/**
 * kinematics.attachTool - Attach tool with offset
 */
export const kinematicsAttachTool: MethodHandler<
  { robotId: string; toolPose: Pose },
  { success: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  solver.attachTool(params.toolPose);
  return { success: true };
};

/**
 * kinematics.detachTool - Detach current tool
 */
export const kinematicsDetachTool: MethodHandler<
  { robotId: string },
  { success: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  solver.detachTool();
  return { success: true };
};

/**
 * kinematics.hasTool - Check if tool is attached
 */
export const kinematicsHasTool: MethodHandler<
  { robotId: string },
  { hasTool: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return { hasTool: solver.hasTool() };
};

// ============================================================================
// Validation Handlers
// ============================================================================

/**
 * kinematics.isValidConfig - Check if joint configuration is valid
 */
export const kinematicsIsValidConfig: MethodHandler<
  { robotId: string; joints: number[] },
  { valid: boolean }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return { valid: solver.isValidConfig(params.joints) };
};

/**
 * kinematics.getDhParams - Get DH parameters
 */
export const kinematicsGetDhParams: MethodHandler<
  { robotId: string },
  { params: DhParam[] }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);
  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  return { params: solver.getDhParams() };
};

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register all kinematics handlers to dispatcher
 */
export function registerKinematicsHandlers(
  register: <TParams, TResult>(method: string, handler: MethodHandler<TParams, TResult>) => void
): void {
  // Initialization
  register('kinematics.init', kinematicsInit);
  register('kinematics.isReady', kinematicsIsReady);
  register('kinematics.listAvailableRobots', kinematicsListAvailableRobots);

  // Solver management
  register('kinematics.createSolver', kinematicsCreateSolver);
  register('kinematics.createSolverWithConfig', kinematicsCreateSolverWithConfig);
  register('kinematics.disposeSolver', kinematicsDisposeSolver);
  register('kinematics.listSolvers', kinematicsListSolvers);
  register('kinematics.hasSolver', kinematicsHasSolver);

  // Forward kinematics
  register('kinematics.fk', kinematicsFk);
  register('kinematics.fkChain', kinematicsFkChain);

  // Inverse kinematics
  register('kinematics.ik', kinematicsIk);
  register('kinematics.ikAll', kinematicsIkAll);
  register('kinematics.configureIk', kinematicsConfigureIk);

  // Workspace analysis
  register('kinematics.analyzeWorkspace', kinematicsAnalyzeWorkspace);
  register('kinematics.isReachable', kinematicsIsReachable);
  register('kinematics.isNearSingularity', kinematicsIsNearSingularity);
  register('kinematics.computeManipulability', kinematicsComputeManipulability);
  register('kinematics.computeJacobian', kinematicsComputeJacobian);

  // Tool management
  register('kinematics.attachTool', kinematicsAttachTool);
  register('kinematics.detachTool', kinematicsDetachTool);
  register('kinematics.hasTool', kinematicsHasTool);

  // Validation
  register('kinematics.isValidConfig', kinematicsIsValidConfig);
  register('kinematics.getDhParams', kinematicsGetDhParams);
}
