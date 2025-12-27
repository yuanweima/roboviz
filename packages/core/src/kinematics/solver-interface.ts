/**
 * Solver Interface Definitions
 *
 * Unified interface types and type guards for robot kinematics solvers.
 * Provides type-safe access to capabilities that may vary between solver implementations.
 *
 * Two solver types exist:
 * - RobotSolver: DH-parameter based solver with analytical IK
 * - UrdfRobotSolver: URDF-based solver with numerical IK (may have DH loaded)
 */

import type { Pose } from '../types';
import type {
  FkResult,
  IkResult,
  MultiIkResult,
  WorkspaceAnalysis,
} from './types';

// ============================================================================
// Base Solver Interface
// ============================================================================

/**
 * Base interface that all solvers implement
 *
 * These methods are guaranteed to be available on both RobotSolver and UrdfRobotSolver
 */
export interface IBaseSolver {
  /** Unique identifier for this solver instance */
  readonly robotId: string;

  /** Degrees of freedom */
  readonly dof: number;

  /** Robot name from configuration or URDF */
  readonly name: string;

  /**
   * Compute forward kinematics
   * @param jointAngles - Joint angles in radians
   * @returns End-effector pose result
   */
  forwardKinematics(jointAngles: number[]): FkResult;

  /**
   * Compute inverse kinematics (single solution)
   * @param targetPose - Target end-effector pose
   * @param seed - Optional seed joint configuration
   * @returns IK result with single solution
   */
  inverseKinematics(targetPose: Pose, seed?: number[]): IkResult;

  /**
   * Check if joint configuration is valid (within limits)
   * @param joints - Joint angles in radians
   */
  isValidConfig(joints: number[]): boolean;

  /**
   * Check if tool is attached
   */
  hasTool(): boolean;

  /**
   * Attach a tool with the given offset
   */
  attachTool(toolPose: Pose): void;

  /**
   * Detach the current tool
   */
  detachTool(): void;
}

// ============================================================================
// Extended Solver Interface
// ============================================================================

/**
 * Extended interface for solvers with multi-solution IK and workspace analysis
 *
 * These capabilities are available when:
 * - Using RobotSolver (DH-based)
 * - Using UrdfRobotSolver with DH params loaded via loadDhParamsFromDatabase()
 */
export interface IExtendedSolver extends IBaseSolver {
  /**
   * Compute inverse kinematics with all solutions (up to 8 for 6-DOF robots)
   * @param targetPose - Target end-effector pose
   * @param seed - Optional seed joint configuration
   * @returns Multi-solution IK result
   */
  inverseKinematicsAll(targetPose: Pose, seed?: number[]): MultiIkResult;

  /**
   * Analyze workspace properties at current configuration
   * @param jointAngles - Joint angles in radians
   * @returns Workspace analysis with manipulability, singularity info, etc.
   */
  analyzeWorkspace(jointAngles: number[]): WorkspaceAnalysis;

  /**
   * Check if near singularity
   * @param jointAngles - Joint angles in radians
   * @param threshold - Optional threshold for singularity detection
   */
  isNearSingularity(jointAngles: number[], threshold?: number): boolean;

  /**
   * Compute manipulability measure
   * @param jointAngles - Joint angles in radians
   * @returns Manipulability value (higher = better)
   */
  computeManipulability(jointAngles: number[]): number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a solver supports multi-solution IK
 *
 * @example
 * ```typescript
 * if (hasMultiIk(solver)) {
 *   const result = solver.inverseKinematicsAll(targetPose);
 *   console.log(`Found ${result.solutionCount} solutions`);
 * }
 * ```
 */
export function hasMultiIk(solver: IBaseSolver): solver is IExtendedSolver {
  return (
    'inverseKinematicsAll' in solver &&
    typeof (solver as IExtendedSolver).inverseKinematicsAll === 'function'
  );
}

/**
 * Type guard to check if a solver supports workspace analysis
 *
 * @example
 * ```typescript
 * if (hasWorkspaceAnalysis(solver)) {
 *   const analysis = solver.analyzeWorkspace(joints);
 *   if (analysis.isNearSingular) {
 *     console.warn('Near singularity!');
 *   }
 * }
 * ```
 */
export function hasWorkspaceAnalysis(solver: IBaseSolver): solver is IExtendedSolver {
  return (
    'analyzeWorkspace' in solver &&
    typeof (solver as IExtendedSolver).analyzeWorkspace === 'function'
  );
}

/**
 * Type guard to check if a solver has full extended capabilities
 *
 * This is a convenience function that checks for both multiIk and workspace analysis
 */
export function isExtendedSolver(solver: IBaseSolver): solver is IExtendedSolver {
  return hasMultiIk(solver) && hasWorkspaceAnalysis(solver);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compute multi-solution IK with fallback for basic solvers
 *
 * If the solver doesn't support multi-solution IK, falls back to single IK
 * and wraps the result in MultiIkResult format.
 *
 * @param solver - Any solver implementing IBaseSolver
 * @param targetPose - Target end-effector pose
 * @param seed - Optional seed joint configuration
 * @returns MultiIkResult (single solution wrapped if necessary)
 */
export function computeIkAll(
  solver: IBaseSolver,
  targetPose: Pose,
  seed?: number[]
): MultiIkResult {
  // Use native multi-IK if available
  if (hasMultiIk(solver)) {
    return solver.inverseKinematicsAll(targetPose, seed);
  }

  // Fallback: use single IK and wrap in MultiIkResult format
  const result = solver.inverseKinematics(targetPose, seed);
  if (result.success && result.solution) {
    return {
      success: true,
      solutionCount: 1,
      solutions: [result.solution],
      positionErrors: [result.positionError || 0],
      isAnalytical: false,
      errorMessage: undefined,
    };
  }

  return {
    success: false,
    solutionCount: 0,
    solutions: [],
    positionErrors: [],
    isAnalytical: false,
    errorMessage: result.errorMessage || 'No solution',
  };
}

/**
 * Analyze workspace with fallback for basic solvers
 *
 * If the solver doesn't support workspace analysis, returns a default analysis.
 *
 * @param solver - Any solver implementing IBaseSolver
 * @param jointAngles - Joint angles in radians
 * @returns WorkspaceAnalysis (default values if not supported)
 */
export function computeWorkspaceAnalysis(
  solver: IBaseSolver,
  jointAngles: number[]
): WorkspaceAnalysis {
  // Use native workspace analysis if available
  if (hasWorkspaceAnalysis(solver)) {
    return solver.analyzeWorkspace(jointAngles);
  }

  // Fallback: return default analysis
  return {
    isValid: true,
    manipulability: 0.5,
    conditionNumber: 1,
    isNearSingular: false,
    minSingularValue: 0.1,
    jointLimitMargins: jointAngles.map(() => 0.5),
  };
}
