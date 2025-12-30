/**
 * useIKComputation Hook
 *
 * Core IK computation hook with workspace analysis.
 * This is the unified foundation for all IK-related hooks in the codebase.
 *
 * Features:
 * - Accepts any solver implementing IKSolver interface
 * - Returns UnifiedIKResult with full workspace analysis
 * - Built-in debouncing for performance
 * - Consistent status computation
 *
 * Used by:
 * - useGhostPreview (pose mode)
 * - usePoseIK
 * - useWorkpointIK
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Pose3D } from '../coordinates/types';
import type { WorkspaceAnalysis } from './types';
import {
  type UnifiedIKResult,
  type StatusThresholds,
  type GhostStatus,
  createUnifiedIKResult,
} from './unified-types';

// =============================================================================
// Types
// =============================================================================

/**
 * IK result from solver (minimal interface)
 */
export interface IKSolverResult {
  success: boolean;
  solution?: number[];
  positionError?: number;
  errorMessage?: string;
}

/**
 * IK solver interface - any object that can compute IK
 */
export interface IKSolver {
  /**
   * Compute inverse kinematics for a target pose
   * @param pose Target pose in Z-up coordinates
   * @param seed Optional seed joints for solution preference
   */
  ikTcp: (pose: Pose3D, seed?: number[]) => IKSolverResult | null;

  /**
   * Analyze workspace at given joint configuration
   * @param joints Joint angles in radians
   */
  analyzeWorkspace: (joints: number[]) => WorkspaceAnalysis | null;
}

/**
 * Options for useIKComputation
 */
export interface UseIKComputationOptions {
  /**
   * IK solver instance.
   * Pass null when solver is not ready.
   */
  solver: IKSolver | null;

  /**
   * Target pose for IK computation (Z-up).
   * Pass null when no target is set.
   */
  targetPose: Pose3D | null;

  /**
   * Seed joints for IK computation.
   * Used to prefer solutions close to current configuration.
   */
  seedJoints?: number[];

  /**
   * Enable/disable IK computation.
   * @default true
   */
  enabled?: boolean;

  /**
   * Debounce delay in milliseconds.
   * @default 16
   */
  debounceMs?: number;

  /**
   * Custom thresholds for status computation.
   */
  statusThresholds?: Partial<StatusThresholds>;
}

/**
 * Return type for useIKComputation
 */
export interface UseIKComputationReturn {
  /**
   * Full IK result with workspace analysis.
   * null when no computation has been performed.
   */
  result: UnifiedIKResult | null;

  /**
   * Whether IK is currently being computed.
   */
  computing: boolean;

  /**
   * Manually trigger IK recomputation.
   */
  recompute: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Core IK computation hook with workspace analysis.
 *
 * This hook provides the unified IK computation logic used by all other
 * IK-related hooks in the codebase. It ensures consistent:
 * - Debouncing behavior
 * - Workspace analysis
 * - Status computation
 * - Result format
 *
 * @example Basic usage
 * ```tsx
 * const { result, computing } = useIKComputation({
 *   solver: {
 *     ikTcp: hybridSolver.ikTcp,
 *     analyzeWorkspace: hybridSolver.urdfSolver?.analyzeWorkspace ?? (() => null),
 *   },
 *   targetPose: { position: [0.5, 0, 0.3], quaternion: [0, 0, 0, 1] },
 * });
 *
 * if (result?.success) {
 *   console.log('Solution:', result.joints);
 *   console.log('Status:', result.status);
 *   console.log('Manipulability:', result.workspace?.manipulability);
 * }
 * ```
 *
 * @example With debouncing for real-time updates
 * ```tsx
 * const { result } = useIKComputation({
 *   solver,
 *   targetPose: dragPosition,
 *   debounceMs: 8, // Faster updates for dragging
 * });
 * ```
 */
export function useIKComputation(options: UseIKComputationOptions): UseIKComputationReturn {
  const {
    solver,
    targetPose,
    seedJoints,
    enabled = true,
    debounceMs = 16,
    statusThresholds,
  } = options;

  // State
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<UnifiedIKResult | null>(null);

  // Refs for debouncing
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const computeIdRef = useRef(0);

  // Compute IK
  const compute = useCallback(() => {
    if (!solver || !targetPose || !enabled) {
      setResult(null);
      return;
    }

    const computeId = ++computeIdRef.current;
    setComputing(true);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Check if this computation is still current
      if (computeId !== computeIdRef.current) return;

      try {
        const ikResult = solver.ikTcp(targetPose, seedJoints);

        if (!ikResult) {
          setResult(
            createUnifiedIKResult(
              false,
              null,
              null,
              null,
              'IK computation failed',
              statusThresholds
            )
          );
        } else if (ikResult.success && ikResult.solution) {
          // Analyze workspace at solution
          const workspace = solver.analyzeWorkspace(ikResult.solution);

          setResult(
            createUnifiedIKResult(
              true,
              ikResult.solution,
              ikResult.positionError ?? null,
              workspace,
              undefined,
              statusThresholds
            )
          );
        } else {
          setResult(
            createUnifiedIKResult(
              false,
              null,
              null,
              null,
              ikResult.errorMessage ?? 'No IK solution found',
              statusThresholds
            )
          );
        }
      } catch (e) {
        setResult(
          createUnifiedIKResult(
            false,
            null,
            null,
            null,
            e instanceof Error ? e.message : 'IK computation error',
            statusThresholds
          )
        );
      } finally {
        if (computeId === computeIdRef.current) {
          setComputing(false);
        }
      }
    }, debounceMs);
  }, [solver, targetPose, enabled, seedJoints, debounceMs, statusThresholds]);

  // Recompute when dependencies change
  useEffect(() => {
    if (solver && enabled) {
      compute();
    }
  }, [solver, enabled, targetPose, compute]);

  // Clear result when disabled or no target
  useEffect(() => {
    if (!enabled || !targetPose) {
      setResult(null);
    }
  }, [enabled, targetPose]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    result,
    computing,
    recompute: compute,
  };
}

export default useIKComputation;
