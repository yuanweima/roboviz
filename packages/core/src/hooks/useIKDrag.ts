/**
 * useIKDrag Hook
 *
 * Provides interactive end-effector dragging with real-time IK solving.
 * This hook enables users to drag a 3D gizmo/handle and have the robot
 * follow using inverse kinematics.
 *
 * Features:
 * - Real-time IK as the user drags
 * - Debounced updates for performance
 * - Reachability feedback
 * - Multiple solution selection
 * - Singularity avoidance
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRobotSolver } from '../kinematics/useTrajx';
import type { Pose, Vector3, Quaternion } from '../types';
import type { IkResult, MultiIkResult, WorkspaceAnalysis } from '../kinematics/types';

// ============================================================================
// Types
// ============================================================================

export interface UseIKDragOptions {
  /** Robot ID for kinematics solver */
  robotId: string;
  /** Robot name for solver creation */
  robotName: string;
  /** Initial joint configuration (used as seed) */
  initialJoints: number[];
  /** Debounce delay in ms (default: 16 = 60fps) */
  debounceMs?: number;
  /** Get all solutions instead of just one */
  getAllSolutions?: boolean;
  /** Callback when IK is computed */
  onIKComputed?: (result: IKDragResult) => void;
  /** Callback when joints should be applied to robot */
  onJointsChange?: (joints: number[]) => void;
  /** Callback when dragging starts */
  onDragStart?: () => void;
  /** Callback when dragging ends */
  onDragEnd?: (finalJoints: number[] | null) => void;
}

export interface IKDragResult {
  /** Whether IK succeeded */
  success: boolean;
  /** Current joint solution */
  joints: number[] | null;
  /** All solutions (if getAllSolutions is true) */
  allSolutions: number[][] | null;
  /** Position error (meters) */
  positionError: number | null;
  /** Workspace analysis */
  workspace: WorkspaceAnalysis | null;
  /** Whether currently near singularity */
  isNearSingular: boolean;
  /** Current target pose */
  targetPose: Pose | null;
  /** Error message if failed */
  errorMessage: string | null;
}

export interface UseIKDragReturn {
  /** Whether solver is ready */
  ready: boolean;
  /** Whether currently dragging */
  isDragging: boolean;
  /** Current IK result */
  result: IKDragResult;
  /** Current joint solution */
  currentJoints: number[] | null;
  /** Start dragging (call when drag starts) */
  startDrag: () => void;
  /** Update target pose during drag */
  updateTarget: (pose: Pose) => void;
  /** Update target position only (keeps current orientation) */
  updatePosition: (position: Vector3) => void;
  /** Update target orientation only (keeps current position) */
  updateOrientation: (orientation: Quaternion) => void;
  /** End dragging (call when drag ends) */
  endDrag: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Select a specific solution (when getAllSolutions is true) */
  selectSolution: (index: number) => void;
  /** Get current end-effector pose from FK */
  getCurrentPose: () => Pose | null;
}

// ============================================================================
// Default values
// ============================================================================

const DEFAULT_RESULT: IKDragResult = {
  success: false,
  joints: null,
  allSolutions: null,
  positionError: null,
  workspace: null,
  isNearSingular: false,
  targetPose: null,
  errorMessage: null,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useIKDrag(options: UseIKDragOptions): UseIKDragReturn {
  const {
    robotId,
    robotName,
    initialJoints,
    debounceMs = 16,
    getAllSolutions = false,
    onIKComputed,
    onJointsChange,
    onDragStart,
    onDragEnd,
  } = options;

  // Get solver
  const { solver, ready, fk, ik, ikAll, analyzeWorkspace, isNearSingularity } =
    useRobotSolver({
      robotId,
      robotName,
    });

  // State
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<IKDragResult>(DEFAULT_RESULT);
  const [currentJoints, setCurrentJoints] = useState<number[] | null>(null);

  // Refs for debouncing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTargetRef = useRef<Pose | null>(null);
  const seedJointsRef = useRef<number[]>(initialJoints);

  // Update seed when initial joints change
  useEffect(() => {
    seedJointsRef.current = initialJoints;
    if (!isDragging) {
      setCurrentJoints(initialJoints);
    }
  }, [initialJoints, isDragging]);

  // Compute IK for a target pose
  const computeIK = useCallback(
    (targetPose: Pose) => {
      if (!ready || !solver) {
        setResult({
          ...DEFAULT_RESULT,
          targetPose,
          errorMessage: 'Solver not ready',
        });
        return;
      }

      try {
        let ikResult: IkResult | null = null;
        let allSolutions: number[][] | null = null;

        if (getAllSolutions) {
          const multiResult = ikAll(targetPose, seedJointsRef.current);
          if (multiResult && multiResult.success && multiResult.solutions.length > 0) {
            allSolutions = multiResult.solutions;
            ikResult = {
              success: true,
              solution: multiResult.solutions[0],
              positionError: multiResult.positionErrors[0],
            };
          } else {
            ikResult = {
              success: false,
              errorMessage: multiResult?.errorMessage || 'IK failed',
            };
          }
        } else {
          ikResult = ik(targetPose, seedJointsRef.current);
        }

        if (ikResult && ikResult.success && ikResult.solution) {
          // Analyze workspace at solution
          const workspace = analyzeWorkspace(ikResult.solution);
          const nearSingular = isNearSingularity(ikResult.solution);

          const newResult: IKDragResult = {
            success: true,
            joints: ikResult.solution,
            allSolutions,
            positionError: ikResult.positionError || null,
            workspace,
            isNearSingular: nearSingular,
            targetPose,
            errorMessage: null,
          };

          setResult(newResult);
          setCurrentJoints(ikResult.solution);

          // Update seed for next computation (continuity)
          seedJointsRef.current = ikResult.solution;

          // Callbacks
          onIKComputed?.(newResult);
          onJointsChange?.(ikResult.solution);
        } else {
          const newResult: IKDragResult = {
            success: false,
            joints: null,
            allSolutions: null,
            positionError: null,
            workspace: null,
            isNearSingular: false,
            targetPose,
            errorMessage: ikResult?.errorMessage || 'IK failed',
          };

          setResult(newResult);
          onIKComputed?.(newResult);
        }
      } catch (error) {
        const newResult: IKDragResult = {
          success: false,
          joints: null,
          allSolutions: null,
          positionError: null,
          workspace: null,
          isNearSingular: false,
          targetPose,
          errorMessage: (error as Error).message,
        };

        setResult(newResult);
        onIKComputed?.(newResult);
      }
    },
    [
      ready,
      solver,
      getAllSolutions,
      ik,
      ikAll,
      analyzeWorkspace,
      isNearSingularity,
      onIKComputed,
      onJointsChange,
    ]
  );

  // Debounced update
  const debouncedComputeIK = useCallback(
    (targetPose: Pose) => {
      lastTargetRef.current = targetPose;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (lastTargetRef.current) {
          computeIK(lastTargetRef.current);
        }
      }, debounceMs);
    },
    [computeIK, debounceMs]
  );

  // Start dragging
  const startDrag = useCallback(() => {
    setIsDragging(true);
    // Use current joints as seed
    if (currentJoints) {
      seedJointsRef.current = currentJoints;
    }
    onDragStart?.();
  }, [currentJoints, onDragStart]);

  // Update target pose
  const updateTarget = useCallback(
    (pose: Pose) => {
      if (!isDragging) return;
      debouncedComputeIK(pose);
    },
    [isDragging, debouncedComputeIK]
  );

  // Update position only
  const updatePosition = useCallback(
    (position: Vector3) => {
      if (!isDragging) return;

      // Get current orientation
      const currentPose = lastTargetRef.current || {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      };

      debouncedComputeIK({
        position,
        orientation: currentPose.orientation,
      });
    },
    [isDragging, debouncedComputeIK]
  );

  // Update orientation only
  const updateOrientation = useCallback(
    (orientation: Quaternion) => {
      if (!isDragging) return;

      const currentPose = lastTargetRef.current || {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      };

      debouncedComputeIK({
        position: currentPose.position,
        orientation,
      });
    },
    [isDragging, debouncedComputeIK]
  );

  // End dragging
  const endDrag = useCallback(() => {
    setIsDragging(false);

    // Clear debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // Compute final IK if there's a pending target
    if (lastTargetRef.current) {
      computeIK(lastTargetRef.current);
    }

    onDragEnd?.(currentJoints);
  }, [computeIK, currentJoints, onDragEnd]);

  // Reset
  const reset = useCallback(() => {
    setIsDragging(false);
    setResult(DEFAULT_RESULT);
    setCurrentJoints(initialJoints);
    seedJointsRef.current = initialJoints;
    lastTargetRef.current = null;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [initialJoints]);

  // Select a specific solution
  const selectSolution = useCallback(
    (index: number) => {
      if (result.allSolutions && index >= 0 && index < result.allSolutions.length) {
        const selectedJoints = result.allSolutions[index];
        setCurrentJoints(selectedJoints);
        seedJointsRef.current = selectedJoints;

        // Update workspace analysis
        const workspace = analyzeWorkspace(selectedJoints);

        setResult((prev) => ({
          ...prev,
          joints: selectedJoints,
          workspace,
          isNearSingular: isNearSingularity(selectedJoints),
        }));

        onJointsChange?.(selectedJoints);
      }
    },
    [result.allSolutions, analyzeWorkspace, isNearSingularity, onJointsChange]
  );

  // Get current end-effector pose
  const getCurrentPose = useCallback((): Pose | null => {
    if (!ready || !currentJoints) return null;
    const fkResult = fk(currentJoints);
    return fkResult?.pose || null;
  }, [ready, currentJoints, fk]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    ready,
    isDragging,
    result,
    currentJoints,
    startDrag,
    updateTarget,
    updatePosition,
    updateOrientation,
    endDrag,
    reset,
    selectSolution,
    getCurrentPose,
  };
}

export default useIKDrag;
