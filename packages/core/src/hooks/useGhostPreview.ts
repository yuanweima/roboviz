/**
 * useGhostPreview Hook
 *
 * Provides ghost robot preview functionality with two input modes:
 * 1. Pose-based (Cartesian) - with automatic IK computation and workspace analysis
 * 2. Joint-based (direct) - for gamepad/keyboard joint mode control
 *
 * All coordinates use Z-up convention (robotics standard).
 *
 * Features:
 * - Full workspace analysis (manipulability, singularity detection)
 * - Returns UnifiedIKResult for consistent status computation
 * - Standoff distance support for approach motions
 * - Dual input modes (pose/joints)
 *
 * @example Pose-based mode (clicking workpoints, IK preview)
 * ```tsx
 * function WorkpointPreview({ solver }) {
 *   const { jointAngles, status, workspace, setTargetPose } = useGhostPreview({
 *     solver,
 *     enabled: true,
 *   });
 *
 *   // Access workspace analysis
 *   console.log('Manipulability:', workspace?.manipulability);
 *   console.log('Near singular:', workspace?.isNearSingular);
 *
 *   if (!jointAngles) return null;
 *   return <GhostRobot jointAngles={jointAngles} status={status} />;
 * }
 * ```
 *
 * @example Joint-based mode (gamepad joint control)
 * ```tsx
 * function GamepadGhost({ gamepadJoints }) {
 *   const { jointAngles, setTargetJoints } = useGhostPreview({
 *     solver,
 *     enabled: true,
 *   });
 *
 *   useEffect(() => {
 *     setTargetJoints(gamepadJoints);
 *   }, [gamepadJoints, setTargetJoints]);
 *
 *   if (!jointAngles) return null;
 *   return <GhostRobot jointAngles={jointAngles} status="valid" />;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { Pose3D, JointAngles } from '../coordinates/types';
import type { WorkspaceAnalysis } from '../kinematics/types';
import {
  type GhostStatus,
  type UnifiedIKResult,
  type StatusThresholds,
} from '../kinematics/unified-types';
import {
  useIKComputation,
  type IKSolver,
} from '../kinematics/useIKComputation';

// =============================================================================
// Types
// =============================================================================

/**
 * Ghost input mode
 * - 'pose': Cartesian mode - set target pose, IK computes joints
 * - 'joints': Joint mode - set joints directly, no IK needed
 */
export type GhostInputMode = 'pose' | 'joints';

/**
 * Options for useGhostPreview hook
 */
export interface UseGhostPreviewOptions {
  /**
   * IK solver with workspace analysis capability.
   * Pass null when solver is not ready.
   */
  solver: IKSolver | null;

  /**
   * Current joint angles (for IK seed).
   */
  currentJoints?: JointAngles;

  /**
   * Whether ghost preview is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Standoff distance in meters (approach offset along tool Z-axis).
   * @default 0.005 (5mm)
   */
  standoffDistance?: number;

  /**
   * IK debounce delay in ms.
   * @default 16
   */
  debounceMs?: number;

  /**
   * Custom status thresholds for workspace analysis.
   */
  statusThresholds?: Partial<StatusThresholds>;

  /**
   * Callback when IK solution changes.
   */
  onSolutionChange?: (result: UnifiedIKResult | null) => void;
}

/**
 * Return type for useGhostPreview hook
 */
export interface UseGhostPreviewResult {
  // === Output ===
  /** Ghost joint angles (IK solution for target or direct joints) */
  jointAngles: JointAngles | null;

  /** Ghost preview status */
  status: GhostStatus;

  /** Workspace analysis (manipulability, singularity info) */
  workspace: WorkspaceAnalysis | null;

  /** Whether near singularity */
  isNearSingular: boolean;

  /** Full IK result (only in pose mode) */
  ikResult: UnifiedIKResult | null;

  // === Input State ===
  /** Current input mode */
  inputMode: GhostInputMode;

  /** Current target pose (only valid in 'pose' mode) */
  targetPose: Pose3D | null;

  /** Current target joints (only valid in 'joints' mode) */
  targetJoints: JointAngles | null;

  // === Actions ===
  /** Set target pose for ghost preview (Z-up) - switches to pose mode */
  setTargetPose: (pose: Pose3D | null) => void;

  /** Set target joints directly - switches to joints mode */
  setTargetJoints: (joints: JointAngles | null) => void;

  /** Clear ghost preview */
  clear: () => void;

  /** Apply current ghost to robot (returns the current joint angles) */
  applyToRobot: () => JointAngles | null;

  // === Status ===
  /** Whether IK is currently computing (only in pose mode) */
  computing: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DEBOUNCE_MS = 16;
const DEFAULT_STANDOFF = 0.005; // 5mm

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useGhostPreview - Ghost robot preview with dual input modes and workspace analysis
 *
 * Supports two modes:
 * - Pose mode: Set target pose, IK computes joint angles with workspace analysis
 * - Joints mode: Set joints directly, no IK computation
 */
export function useGhostPreview(options: UseGhostPreviewOptions): UseGhostPreviewResult {
  const {
    solver,
    currentJoints,
    enabled = true,
    standoffDistance = DEFAULT_STANDOFF,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    statusThresholds,
    onSolutionChange,
  } = options;

  // State - input mode tracking
  const [inputMode, setInputMode] = useState<GhostInputMode>('pose');

  // State - pose mode
  const [targetPose, setTargetPoseInternal] = useState<Pose3D | null>(null);

  // State - joints mode
  const [targetJoints, setTargetJointsInternal] = useState<JointAngles | null>(null);
  const [directJointAngles, setDirectJointAngles] = useState<JointAngles | null>(null);

  // Refs
  const currentJointsRef = useRef<JointAngles>(currentJoints || []);
  const onSolutionChangeRef = useRef(onSolutionChange);

  // Update refs
  useEffect(() => {
    if (currentJoints) {
      currentJointsRef.current = currentJoints;
    }
  }, [currentJoints]);

  useEffect(() => {
    onSolutionChangeRef.current = onSolutionChange;
  }, [onSolutionChange]);

  // Compute target pose with standoff applied
  const targetWithStandoff = useMemo((): Pose3D | null => {
    if (!targetPose || inputMode !== 'pose') return null;

    if (standoffDistance <= 0) return targetPose;

    const quat = new THREE.Quaternion(
      targetPose.quaternion[0],
      targetPose.quaternion[1],
      targetPose.quaternion[2],
      targetPose.quaternion[3]
    );
    // Z-axis direction in world frame
    const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);

    return {
      position: [
        targetPose.position[0] + zAxis.x * standoffDistance,
        targetPose.position[1] + zAxis.y * standoffDistance,
        targetPose.position[2] + zAxis.z * standoffDistance,
      ],
      quaternion: targetPose.quaternion,
    };
  }, [targetPose, inputMode, standoffDistance]);

  // Use core IK computation hook (only in pose mode)
  const { result: ikResult, computing } = useIKComputation({
    solver,
    targetPose: targetWithStandoff,
    seedJoints: currentJointsRef.current,
    enabled: enabled && inputMode === 'pose',
    debounceMs,
    statusThresholds,
  });

  // Notify on IK result change
  useEffect(() => {
    if (inputMode === 'pose') {
      onSolutionChangeRef.current?.(ikResult);
    }
  }, [ikResult, inputMode]);

  // Set target pose (switches to pose mode)
  const setTargetPose = useCallback((pose: Pose3D | null) => {
    setInputMode('pose');
    setTargetPoseInternal(pose);
    // Clear joints mode state
    setTargetJointsInternal(null);
    setDirectJointAngles(null);
  }, []);

  // Set target joints directly (switches to joints mode)
  const setTargetJoints = useCallback((joints: JointAngles | null) => {
    setInputMode('joints');
    setTargetJointsInternal(joints);
    setDirectJointAngles(joints);
    // Clear pose mode state
    setTargetPoseInternal(null);

    // Notify in joints mode
    if (joints) {
      onSolutionChangeRef.current?.({
        success: true,
        joints,
        positionError: null,
        status: 'valid',
        workspace: null,
        isNearSingular: false,
      });
    } else {
      onSolutionChangeRef.current?.(null);
    }
  }, []);

  // Clear ghost preview
  const clear = useCallback(() => {
    setTargetPoseInternal(null);
    setTargetJointsInternal(null);
    setDirectJointAngles(null);
    setInputMode('pose'); // Reset to default mode
    onSolutionChangeRef.current?.(null);
  }, []);

  // Apply ghost to robot (returns current joints)
  const applyToRobot = useCallback(() => {
    if (inputMode === 'joints') {
      return directJointAngles;
    }
    return ikResult?.joints ?? null;
  }, [inputMode, directJointAngles, ikResult]);

  // Compute output values based on mode
  const jointAngles = inputMode === 'joints' ? directJointAngles : (ikResult?.joints ?? null);
  const status: GhostStatus = inputMode === 'joints' ? (directJointAngles ? 'valid' : 'neutral') : (ikResult?.status ?? 'neutral');
  const workspace = inputMode === 'joints' ? null : (ikResult?.workspace ?? null);
  const isNearSingular = inputMode === 'joints' ? false : (ikResult?.isNearSingular ?? false);

  return {
    // Output
    jointAngles,
    status,
    workspace,
    isNearSingular,
    ikResult: inputMode === 'pose' ? ikResult : null,

    // Input state
    inputMode,
    targetPose,
    targetJoints,

    // Actions
    setTargetPose,
    setTargetJoints,
    clear,
    applyToRobot,

    // Status
    computing: inputMode === 'pose' ? computing : false,
  };
}

export default useGhostPreview;
