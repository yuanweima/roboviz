/**
 * Unified IK Result Types
 *
 * Provides a standardized result format for all IK operations across the codebase.
 * All IK hooks should return or convert to these types for consistency.
 *
 * This is the SINGLE SOURCE OF TRUTH for:
 * - GhostStatus type
 * - UnifiedIKResult type
 * - Status computation utilities
 */

import type { WorkspaceAnalysis } from './types';

// =============================================================================
// Ghost Status - Single Canonical Definition
// =============================================================================

/**
 * Ghost robot visualization status.
 *
 * This is the single canonical definition used throughout the codebase.
 * All components and hooks should import GhostStatus from this file.
 *
 * - 'valid': Reachable, no collision, good workspace
 * - 'warning': Near limits or singularity
 * - 'error': Unreachable or collision
 * - 'neutral': Default/preview state (no computation done)
 */
export type GhostStatus = 'valid' | 'warning' | 'error' | 'neutral';

/**
 * Color mapping for ghost status visualization.
 */
export const GHOST_STATUS_COLORS: Record<GhostStatus, string> = {
  valid: '#00ff88', // Green - reachable, no collision
  warning: '#ffaa00', // Orange - near limits or singularity
  error: '#ff4444', // Red - unreachable or collision
  neutral: '#88aaff', // Blue - neutral preview
};

// =============================================================================
// Unified IK Result
// =============================================================================

/**
 * Unified IK result for all IK methods.
 *
 * This type provides a consistent interface regardless of which IK hook is used:
 * - useHybridSolver
 * - useUrdfSolver
 * - useWorkpointIK
 * - useIKDrag
 *
 * @example
 * ```tsx
 * const result = useWorkpointIK({ workpointId, urdfContent });
 *
 * if (result.success) {
 *   setGhostJoints(result.joints);
 *   setGhostStatus(result.status);
 * }
 * ```
 */
export interface UnifiedIKResult {
  /** Whether IK computation succeeded */
  success: boolean;

  /** Error message if failed */
  errorMessage?: string;

  /** Joint angles solution (radians) */
  joints: number[] | null;

  /** Position error in meters */
  positionError: number | null;

  /** Orientation error in radians */
  orientationError?: number;

  /** Ghost status for visualization */
  status: GhostStatus;

  /** Workspace analysis (manipulability, singularity info) */
  workspace: WorkspaceAnalysis | null;

  /** Whether near singularity */
  isNearSingular: boolean;
}

/**
 * Extended result with multiple solutions (for analytical IK)
 */
export interface UnifiedMultiIKResult extends UnifiedIKResult {
  /** All available solutions */
  allSolutions: UnifiedIKSolution[];

  /** Index of currently selected solution */
  selectedIndex: number;

  /** Whether analytical IK was used */
  isAnalytical: boolean;
}

/**
 * Single solution in multi-solution result
 */
export interface UnifiedIKSolution {
  /** Joint angles (radians) */
  joints: number[];

  /** Position error in meters */
  positionError: number;

  /** Ghost status for this solution */
  status: GhostStatus;

  /** Workspace analysis for this solution */
  workspace: WorkspaceAnalysis | null;
}

// =============================================================================
// Status Computation Utilities
// =============================================================================

/**
 * Thresholds for computing ghost status from workspace analysis
 */
export interface StatusThresholds {
  /** Position error threshold for warning (meters) */
  positionWarning: number;

  /** Position error threshold for error (meters) */
  positionError: number;

  /** Manipulability threshold for warning */
  manipulabilityWarning: number;

  /** Manipulability threshold for error (near-singular) */
  manipulabilityError: number;
}

/**
 * Default thresholds for status computation
 */
export const DEFAULT_STATUS_THRESHOLDS: StatusThresholds = {
  positionWarning: 0.001, // 1mm
  positionError: 0.01, // 10mm
  manipulabilityWarning: 0.02,
  manipulabilityError: 0.01,
};

/**
 * Compute GhostStatus from workspace analysis and position error.
 *
 * This utility provides consistent status computation across all IK-related
 * components and hooks, eliminating duplicate logic.
 *
 * @param workspace - Workspace analysis result (can be null)
 * @param positionError - Position error in meters (can be null)
 * @param thresholds - Custom thresholds (optional)
 * @returns GhostStatus for visualization
 *
 * @example
 * ```tsx
 * const status = getGhostStatusFromWorkspace(
 *   workspace,
 *   result.positionError,
 *   { positionWarning: 0.002 }
 * );
 * ```
 */
export function getGhostStatusFromWorkspace(
  workspace: WorkspaceAnalysis | null,
  positionError: number | null,
  thresholds: Partial<StatusThresholds> = {}
): GhostStatus {
  const t = { ...DEFAULT_STATUS_THRESHOLDS, ...thresholds };

  // Check position error first
  if (positionError !== null) {
    if (positionError > t.positionError) {
      return 'error';
    }
    if (positionError > t.positionWarning) {
      return 'warning';
    }
  }

  // Check workspace analysis.
  //
  // IMPORTANT: this function is only reached when IK already succeeded, so the
  // pose IS reachable — workspace metrics are informational, never blocking.
  // The engine's WorkspaceAnalysis often leaves `isValid` undefined and reports
  // manipulability=0 / conditionNumber=Infinity / isNearSingular=true for every
  // valid solution, so `!workspace.isValid` (undefined → true) previously flagged
  // every successful solve as 'error'. Only an *explicit* isValid===false, a
  // near-singularity, or low manipulability is worth a 'warning' — never 'error'.
  if (workspace) {
    // The metrics are only meaningful when populated. Some engines report
    // manipulability=0 / conditionNumber=Infinity for every valid solve — that's
    // "no data", not a real singularity, so don't warn on it.
    const metricsUsable =
      Number.isFinite(workspace.conditionNumber) && workspace.manipulability > 0;

    if (workspace.isValid === false) {
      return 'warning';
    }
    if (
      metricsUsable &&
      (workspace.isNearSingular || workspace.manipulability < t.manipulabilityWarning)
    ) {
      return 'warning';
    }
  }

  return 'valid';
}

/**
 * Create a unified IK result from raw IK computation output
 */
export function createUnifiedIKResult(
  success: boolean,
  joints: number[] | null,
  positionError: number | null,
  workspace: WorkspaceAnalysis | null,
  errorMessage?: string,
  thresholds?: Partial<StatusThresholds>
): UnifiedIKResult {
  const status = success
    ? getGhostStatusFromWorkspace(workspace, positionError, thresholds)
    : 'error';

  return {
    success,
    errorMessage,
    joints,
    positionError,
    status,
    workspace,
    isNearSingular: workspace?.isNearSingular ?? false,
  };
}
