/**
 * useWorkpointIK Hook
 *
 * Unified hook for workpoint-based IK with ghost preview and workspace analysis.
 * Handles IK solver lifecycle, workpoint position updates, and ghost status computation.
 *
 * All coordinates use Z-up convention (robotics standard).
 *
 * This hook eliminates the need to manually:
 * - Initialize and manage IK solvers
 * - Subscribe to workpoint store changes
 * - Compute IK for workpoint positions
 * - Map IK results to ghost status and workspace analysis
 *
 * @example Basic usage with workpoint ID
 * ```tsx
 * function MyScene({ selectedWorkpointId }) {
 *   const { ghostJoints, ghostStatus, workspace } = useWorkpointIK({
 *     robotId: 'main-robot',
 *     urdfContent,
 *     workpointId: selectedWorkpointId,
 *   });
 *
 *   console.log('Manipulability:', workspace?.manipulability);
 *
 *   return (
 *     <>
 *       <Robot urdfPath={URDF_PATH} />
 *       {ghostJoints && (
 *         <GhostRobot jointAngles={ghostJoints} status={ghostStatus} />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useHybridSolver } from '../kinematics/useTrajx';
import {
  useIKComputation,
  type IKSolver,
} from '../kinematics/useIKComputation';
import { computeWorkspaceAnalysis } from '../kinematics/solver-interface';
import { useWorkpointStore } from '../workpoint/store/workpointStore';
import type { Workpoint } from '../workpoint/types/workpoint';
import type { Pose3D, TCPOffset } from '../coordinates/types';
import type { WorkspaceAnalysis } from '../kinematics/types';
import {
  type GhostStatus,
  type UnifiedIKResult,
  type StatusThresholds,
} from '../kinematics/unified-types';

// =============================================================================
// Types
// =============================================================================

export interface UseWorkpointIKOptions {
  /**
   * Robot ID for the IK solver.
   * Must match the robot being visualized.
   */
  robotId: string;

  /**
   * URDF content for the robot.
   * Pass null to disable IK computation.
   */
  urdfContent: string | null;

  /**
   * Workpoint ID to compute IK for.
   * When null, no IK is computed and ghost is hidden.
   */
  workpointId: string | null;

  /**
   * Whether to use the workpoint store's selectedWorkpointId.
   * When true, workpointId prop is ignored.
   * @default false
   */
  useStoreSelection?: boolean;

  /**
   * Seed joints for IK computation.
   * When provided, IK will prefer solutions close to these joints.
   */
  seedJoints?: number[];

  /**
   * Tool TCP offset from flange (Z-up).
   * When provided, IK targets the TCP position instead of flange.
   */
  toolOffset?: TCPOffset;

  /**
   * Debounce delay for IK computation (ms).
   * Prevents excessive computation during rapid updates.
   * @default 16
   */
  debounceMs?: number;

  /**
   * Custom thresholds for status computation.
   */
  statusThresholds?: Partial<StatusThresholds>;

  /**
   * Enable/disable the hook.
   * @default true
   */
  enabled?: boolean;

  /**
   * Optional custom workpoint store.
   * If not provided, uses the default global store.
   */
  workpointStore?: typeof useWorkpointStore;
}

export interface UseWorkpointIKReturn {
  /** Whether IK solver is ready */
  ready: boolean;

  /** Whether IK is currently being computed */
  computing: boolean;

  /** The unified IK result (includes workspace analysis) */
  result: UnifiedIKResult | null;

  /** Joint angles for ghost robot (convenience accessor) */
  ghostJoints: number[] | null;

  /** Status for ghost robot (convenience accessor) */
  ghostStatus: GhostStatus;

  /** Workspace analysis (convenience accessor) */
  workspace: WorkspaceAnalysis | null;

  /** Whether near singularity (convenience accessor) */
  isNearSingular: boolean;

  /** The target workpoint (if found) */
  workpoint: Workpoint | null;

  /** Target pose derived from workpoint (Z-up) */
  targetPose: Pose3D | null;

  /** Error from solver initialization */
  solverError: Error | null;

  /** Manually trigger IK recomputation */
  recompute: () => void;

  /** Whether analytical IK is available */
  hasAnalyticalIk: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for computing IK based on workpoint position with workspace analysis.
 *
 * Provides a unified interface for:
 * - Automatic IK solver initialization
 * - Workpoint position tracking
 * - IK computation with debouncing
 * - Ghost status and workspace analysis
 */
export function useWorkpointIK(options: UseWorkpointIKOptions): UseWorkpointIKReturn {
  const {
    robotId,
    urdfContent,
    workpointId: propWorkpointId,
    useStoreSelection = false,
    seedJoints,
    toolOffset,
    debounceMs = 16,
    statusThresholds,
    enabled = true,
    workpointStore = useWorkpointStore,
  } = options;

  // Get workpoint from store
  const storeSelectedId = workpointStore((s) => s.selectedWorkpointId);
  const effectiveWorkpointId = useStoreSelection ? storeSelectedId : propWorkpointId;

  const workpoint = workpointStore((s) =>
    effectiveWorkpointId ? s.workpoints.get(effectiveWorkpointId) : undefined
  );

  // Initialize hybrid solver (Z-up since scene is Z-up)
  const {
    ready: solverReady,
    error: solverError,
    ik,
    ikTcp,
    attachTool,
    detachTool,
    hasTool,
    hasAnalyticalIk,
    urdfSolver,
    dhSolver,
  } = useHybridSolver({
    robotId,
    urdfContent,
    coordinateSystem: 'Z-up',
    autoCreate: true,
  });

  // Handle tool attachment
  const toolAttachedRef = useRef(false);
  useEffect(() => {
    if (!solverReady) return;

    if (toolOffset && !toolAttachedRef.current) {
      // Convert TCPOffset to Pose format for attachTool
      attachTool({
        position: { x: toolOffset.position[0], y: toolOffset.position[1], z: toolOffset.position[2] },
        orientation: { x: toolOffset.quaternion[0], y: toolOffset.quaternion[1], z: toolOffset.quaternion[2], w: toolOffset.quaternion[3] },
      });
      toolAttachedRef.current = true;
    } else if (!toolOffset && toolAttachedRef.current) {
      detachTool();
      toolAttachedRef.current = false;
    }
  }, [solverReady, toolOffset, attachTool, detachTool]);

  // Reset tool state when solver changes
  useEffect(() => {
    toolAttachedRef.current = false;
  }, [urdfSolver]);

  // Compute target pose from workpoint (Z-up Pose3D format)
  const targetPose = useMemo((): Pose3D | null => {
    if (!workpoint) return null;

    // Workpoint position is [x, y, z] tuple, quaternion is [x, y, z, w]
    return {
      position: workpoint.position,
      quaternion: workpoint.quaternion,
    };
  }, [workpoint]);

  // Create IKSolver adapter for useIKComputation
  const ikSolver: IKSolver | null = useMemo(() => {
    if (!solverReady) return null;

    const solver = dhSolver || urdfSolver;

    return {
      ikTcp: (pose: Pose3D, seed?: number[]) => {
        // Convert Pose3D to Pose format
        const poseObj = {
          position: { x: pose.position[0], y: pose.position[1], z: pose.position[2] },
          orientation: { x: pose.quaternion[0], y: pose.quaternion[1], z: pose.quaternion[2], w: pose.quaternion[3] },
        };

        // Use ikTcp if tool attached, otherwise use ik
        const ikFunc = hasTool() ? ikTcp : ik;
        const result = ikFunc(poseObj, seed);

        if (!result) return null;
        return {
          success: result.success,
          solution: result.solution,
          positionError: result.positionError,
          errorMessage: result.errorMessage,
        };
      },
      analyzeWorkspace: (joints: number[]) => {
        if (!solver) return null;
        return computeWorkspaceAnalysis(solver, joints);
      },
    };
  }, [solverReady, dhSolver, urdfSolver, hasTool, ikTcp, ik]);

  // Use core IK computation hook
  const { result, computing, recompute } = useIKComputation({
    solver: ikSolver,
    targetPose,
    seedJoints,
    enabled: enabled && solverReady && !!effectiveWorkpointId,
    debounceMs,
    statusThresholds,
  });

  // Convenience accessors
  const ghostJoints = result?.joints ?? null;
  const ghostStatus: GhostStatus = result?.status ?? 'neutral';
  const workspace = result?.workspace ?? null;
  const isNearSingular = result?.isNearSingular ?? false;

  return {
    ready: solverReady,
    computing,
    result,
    ghostJoints,
    ghostStatus,
    workspace,
    isNearSingular,
    workpoint: workpoint ?? null,
    targetPose,
    solverError,
    recompute,
    hasAnalyticalIk,
  };
}

export default useWorkpointIK;
