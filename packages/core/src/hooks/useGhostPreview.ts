/**
 * useGhostPreview Hook
 *
 * Provides ghost robot preview functionality with two input modes:
 * 1. Pose-based (Cartesian) - with automatic IK computation
 * 2. Joint-based (direct) - for gamepad/keyboard joint mode control
 *
 * All coordinates use Z-up convention (robotics standard).
 *
 * @example Pose-based mode (clicking workpoints, IK preview)
 * ```tsx
 * function WorkpointPreview({ kinematics, workpoint }) {
 *   const { jointAngles, status, setTargetPose } = useGhostPreview({
 *     kinematics,
 *     enabled: true,
 *   });
 *
 *   useEffect(() => {
 *     if (workpoint) {
 *       setTargetPose({
 *         position: workpoint.position,
 *         quaternion: workpoint.quaternion,
 *       });
 *     } else {
 *       setTargetPose(null);
 *     }
 *   }, [workpoint, setTargetPose]);
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
 *     kinematics,
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

import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import type {
  Pose3D,
  JointAngles,
} from '../coordinates/types';
import type { UseRobotKinematicsReturn } from '../coordinates/useRobotKinematics';

// =============================================================================
// Types
// =============================================================================

/**
 * Ghost robot status for IK preview
 */
export type GhostPreviewStatus = 'valid' | 'warning' | 'error' | 'neutral';

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
  /** Kinematics instance from useRobotKinematics */
  kinematics: UseRobotKinematicsReturn;
  /** Current joint angles (for IK seed) */
  currentJoints?: JointAngles;
  /** Whether ghost preview is enabled */
  enabled?: boolean;
  /** Standoff distance in meters (approach offset along tool Z-axis) */
  standoffDistance?: number;
  /** IK debounce delay in ms */
  debounceMs?: number;
  /** Position error threshold for warning status (meters) */
  warningThreshold?: number;
  /** Callback when IK solution changes */
  onSolutionChange?: (solution: JointAngles | null, status: GhostPreviewStatus) => void;
}

/**
 * Return type for useGhostPreview hook
 */
export interface UseGhostPreviewResult {
  /** Ghost joint angles (IK solution for target or direct joints) */
  jointAngles: JointAngles | null;
  /** Ghost preview status */
  status: GhostPreviewStatus;
  /** Current input mode */
  inputMode: GhostInputMode;
  /** Current target pose (only valid in 'pose' mode) */
  targetPose: Pose3D | null;
  /** Current target joints (only valid in 'joints' mode) */
  targetJoints: JointAngles | null;
  /** Set target pose for ghost preview (Z-up) - switches to pose mode */
  setTargetPose: (pose: Pose3D | null) => void;
  /** Set target joints directly - switches to joints mode */
  setTargetJoints: (joints: JointAngles | null) => void;
  /** Clear ghost preview */
  clear: () => void;
  /** Whether IK is currently computing (only in pose mode) */
  isComputing: boolean;
  /** Apply current ghost to robot (returns the current joint angles) */
  applyToRobot: () => JointAngles | null;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DEBOUNCE_MS = 16;
const DEFAULT_WARNING_THRESHOLD = 0.01; // 1cm
const DEFAULT_STANDOFF = 0.005; // 5mm

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useGhostPreview - Ghost robot preview with dual input modes
 *
 * Supports two modes:
 * - Pose mode: Set target pose, IK computes joint angles
 * - Joints mode: Set joints directly, no IK computation
 */
export function useGhostPreview(options: UseGhostPreviewOptions): UseGhostPreviewResult {
  const {
    kinematics,
    currentJoints,
    enabled = true,
    standoffDistance = DEFAULT_STANDOFF,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    warningThreshold = DEFAULT_WARNING_THRESHOLD,
    onSolutionChange,
  } = options;

  const { ready, ikTcp } = kinematics;

  // State - input mode tracking
  const [inputMode, setInputMode] = useState<GhostInputMode>('pose');

  // State - pose mode
  const [targetPose, setTargetPoseInternal] = useState<Pose3D | null>(null);

  // State - joints mode
  const [targetJoints, setTargetJointsInternal] = useState<JointAngles | null>(null);

  // State - output (shared between modes)
  const [jointAngles, setJointAngles] = useState<JointAngles | null>(null);
  const [status, setStatus] = useState<GhostPreviewStatus>('neutral');
  const [isComputing, setIsComputing] = useState(false);

  // Refs
  const currentJointsRef = useRef<JointAngles>(currentJoints || []);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const computeIdRef = useRef(0);
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

  // Set target pose (switches to pose mode)
  const setTargetPose = useCallback((pose: Pose3D | null) => {
    setInputMode('pose');
    setTargetPoseInternal(pose);
    // Clear joints mode state
    setTargetJointsInternal(null);
  }, []);

  // Set target joints directly (switches to joints mode)
  const setTargetJoints = useCallback((joints: JointAngles | null) => {
    setInputMode('joints');
    setTargetJointsInternal(joints);
    // Clear pose mode state
    setTargetPoseInternal(null);

    // In joints mode, directly set joint angles without IK
    if (joints) {
      setJointAngles(joints);
      setStatus('valid');
      setIsComputing(false);
      onSolutionChangeRef.current?.(joints, 'valid');
    } else {
      setJointAngles(null);
      setStatus('neutral');
      onSolutionChangeRef.current?.(null, 'neutral');
    }
  }, []);

  // Clear ghost preview
  const clear = useCallback(() => {
    setTargetPoseInternal(null);
    setTargetJointsInternal(null);
    setJointAngles(null);
    setStatus('neutral');
    setIsComputing(false);
    setInputMode('pose'); // Reset to default mode
  }, []);

  // Apply ghost to robot (returns current joints)
  const applyToRobot = useCallback(() => {
    return jointAngles;
  }, [jointAngles]);

  // IK computation with debounce (only in pose mode)
  useEffect(() => {
    // Skip IK if in joints mode
    if (inputMode === 'joints') {
      return;
    }

    // Clear if disabled or no target
    if (!enabled || !ready || !targetPose) {
      setJointAngles(null);
      setStatus('neutral');
      setIsComputing(false);
      onSolutionChangeRef.current?.(null, 'neutral');
      return;
    }

    // Debounce IK computation
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setIsComputing(true);
    const computeId = ++computeIdRef.current;

    debounceTimeoutRef.current = setTimeout(() => {
      // Check if still current computation
      if (computeId !== computeIdRef.current) return;

      try {
        // Apply standoff if specified
        let targetWithStandoff = targetPose;
        if (standoffDistance > 0) {
          const quat = new THREE.Quaternion(
            targetPose.quaternion[0],
            targetPose.quaternion[1],
            targetPose.quaternion[2],
            targetPose.quaternion[3]
          );
          // Z-axis direction in world frame
          const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
          targetWithStandoff = {
            position: [
              targetPose.position[0] + zAxis.x * standoffDistance,
              targetPose.position[1] + zAxis.y * standoffDistance,
              targetPose.position[2] + zAxis.z * standoffDistance,
            ],
            quaternion: targetPose.quaternion,
          };
        }

        // Compute IK for TCP position
        const result = ikTcp(targetWithStandoff, currentJointsRef.current);

        if (result?.success && result.solution) {
          setJointAngles(result.solution);

          // Determine status based on position error
          const posError = result.positionError || 0;
          const newStatus: GhostPreviewStatus = posError > warningThreshold ? 'warning' : 'valid';
          setStatus(newStatus);
          onSolutionChangeRef.current?.(result.solution, newStatus);
        } else {
          setJointAngles(null);
          setStatus('error');
          onSolutionChangeRef.current?.(null, 'error');
        }
      } catch (e) {
        console.error('[useGhostPreview] IK computation error:', e);
        setJointAngles(null);
        setStatus('error');
        onSolutionChangeRef.current?.(null, 'error');
      } finally {
        setIsComputing(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [enabled, ready, targetPose, inputMode, ikTcp, standoffDistance, debounceMs, warningThreshold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    jointAngles,
    status,
    inputMode,
    targetPose,
    targetJoints,
    setTargetPose,
    setTargetJoints,
    clear,
    isComputing,
    applyToRobot,
  };
}
