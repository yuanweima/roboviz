/**
 * usePoseIK Hook
 *
 * Low-level hook for IK computation from a target pose.
 * This is the foundation for useWorkpointIK and other higher-level hooks.
 *
 * Use this hook when you have a direct pose (position + orientation) and
 * need IK computation with ghost status and workspace analysis.
 *
 * All coordinates use Z-up convention (robotics standard).
 *
 * @example Basic usage
 * ```tsx
 * const targetPose: Pose3D = {
 *   position: [0.4, 0.1, 0.3],
 *   quaternion: [0, 0.707, 0, 0.707],
 * };
 *
 * const { ghostJoints, ghostStatus, workspace } = usePoseIK({
 *   robotId: 'main-robot',
 *   urdfContent,
 *   targetPose,
 * });
 *
 * if (ready && ghostJoints) {
 *   console.log('Manipulability:', workspace?.manipulability);
 *   return <GhostRobot jointAngles={ghostJoints} status={ghostStatus} />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useHybridSolver } from '../kinematics/useTrajx';
import {
  useIKComputation,
  type IKSolver,
} from '../kinematics/useIKComputation';
import { computeWorkspaceAnalysis } from '../kinematics/solver-interface';
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

export interface UsePoseIKOptions {
  /**
   * Robot ID for the IK solver.
   */
  robotId: string;

  /**
   * URDF content for the robot.
   * Pass null to disable IK computation.
   */
  urdfContent: string | null;

  /**
   * Target pose for IK computation (Z-up).
   * When null, no IK is computed.
   */
  targetPose: Pose3D | null;

  /**
   * Seed joints for IK computation.
   */
  seedJoints?: number[];

  /**
   * Tool TCP offset from flange (Z-up).
   * When provided, IK targets the TCP position.
   */
  toolOffset?: TCPOffset;

  /**
   * Debounce delay for IK computation (ms).
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
}

export interface UsePoseIKReturn {
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
 * Hook for computing IK from a target pose with workspace analysis.
 *
 * This is a lower-level hook that takes a pose directly.
 * For workpoint-based IK, use useWorkpointIK instead.
 */
export function usePoseIK(options: UsePoseIKOptions): UsePoseIKReturn {
  const {
    robotId,
    urdfContent,
    targetPose,
    seedJoints,
    toolOffset,
    debounceMs = 16,
    statusThresholds,
    enabled = true,
  } = options;

  // Initialize hybrid solver (Z-up since scene is Z-up)
  const {
    ready: solverReady,
    error: solverError,
    ikTcp,
    ik,
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
    enabled: enabled && solverReady,
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
    solverError,
    recompute,
    hasAnalyticalIk,
  };
}

export default usePoseIK;
