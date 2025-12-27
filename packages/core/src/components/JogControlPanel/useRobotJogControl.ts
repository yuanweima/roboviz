/**
 * useRobotJogControl Hook
 *
 * Core hook for industrial robot jog control with bidirectional
 * joint-space and Cartesian-space synchronization.
 *
 * Features:
 * - Bidirectional sync: Joint changes update Cartesian, and vice versa
 * - Step-based jogging with configurable step sizes
 * - Long-press continuous motion support
 * - Multi-solution IK with configuration selection
 * - Safety indicators (joint limits, singularity)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTrajx } from '../../kinematics/useTrajx';
import { getKinematicsManager } from '../../kinematics/kinematics-manager';
import type { Pose } from '../../types';
import type { MultiIkResult, WorkspaceAnalysis, FkResult, IkResult } from '../../kinematics/types';

// ============================================================================
// Types
// ============================================================================

export type JogMode = 'joint' | 'cartesian' | 'tool';
export type JogAxis = 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz';
export type StepSize = 0.1 | 1 | 10;

export interface JogControlState {
  // Current state (source of truth)
  currentJoints: number[];
  currentPose: Pose;

  // Control settings
  mode: JogMode;
  stepJoint: StepSize;      // degrees
  stepCartesian: StepSize;  // mm for position, degrees for rotation
  speed: number;            // 1-100%

  // IK state
  ikSolutions: number[][];
  selectedConfig: number;
  isAnalytical: boolean;
  ikError: string | null;

  // Safety state
  jointLimitWarnings: boolean[];  // true if near limit
  isNearSingular: boolean;
  manipulability: number;
  isReachable: boolean;

  // Solver state
  solverReady: boolean;
  isComputing: boolean;
}

export interface JogControlActions {
  // Jog operations
  jogJoint: (jointIndex: number, direction: 1 | -1) => void;
  jogCartesian: (axis: JogAxis, direction: 1 | -1) => void;

  // Direct value setting
  setJointValue: (jointIndex: number, value: number) => void;
  setCartesianValue: (axis: JogAxis, value: number) => void;
  setJoints: (joints: number[]) => void;
  setPose: (pose: Pose) => void;

  // Settings
  setMode: (mode: JogMode) => void;
  setStepJoint: (step: StepSize) => void;
  setStepCartesian: (step: StepSize) => void;
  setSpeed: (speed: number) => void;
  setSelectedConfig: (config: number) => void;

  // Continuous jog (for long-press)
  startContinuousJog: (type: 'joint' | 'cartesian', index: number | JogAxis, direction: 1 | -1) => void;
  stopContinuousJog: () => void;
}

export interface UseRobotJogControlOptions {
  robotId: string;
  robotName: string;
  initialJoints?: number[];
  jointLimits?: { lower: number[]; upper: number[] };
  jointLimitMargin?: number;  // degrees from limit to trigger warning
  onJointsChange?: (joints: number[]) => void;
  onPoseChange?: (pose: Pose) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_JOINTS = [0, 0, 0, 0, 0, 0];
const DEFAULT_POSE: Pose = {
  position: { x: 0.4, y: 0.3, z: 0.2 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const MM_TO_M = 0.001;

// ============================================================================
// Helper Functions
// ============================================================================

function eulerToQuaternion(roll: number, pitch: number, yaw: number): { x: number; y: number; z: number; w: number } {
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}

function quaternionToEuler(q: { x: number; y: number; z: number; w: number }): { roll: number; pitch: number; yaw: number } {
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

function applyCartesianDelta(pose: Pose, axis: JogAxis, deltaMm: number): Pose {
  const newPose = {
    position: { ...pose.position },
    orientation: { ...pose.orientation },
  };

  const deltaM = deltaMm * MM_TO_M;
  const deltaRad = deltaMm * DEG_TO_RAD; // For rotation, deltaMm is actually degrees

  switch (axis) {
    case 'x':
      newPose.position.x += deltaM;
      break;
    case 'y':
      newPose.position.y += deltaM;
      break;
    case 'z':
      newPose.position.z += deltaM;
      break;
    case 'rx':
    case 'ry':
    case 'rz': {
      const euler = quaternionToEuler(pose.orientation);
      if (axis === 'rx') euler.roll += deltaRad;
      if (axis === 'ry') euler.pitch += deltaRad;
      if (axis === 'rz') euler.yaw += deltaRad;
      newPose.orientation = eulerToQuaternion(euler.roll, euler.pitch, euler.yaw);
      break;
    }
  }

  return newPose;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRobotJogControl(options: UseRobotJogControlOptions): [JogControlState, JogControlActions] {
  const {
    robotId,
    robotName,
    initialJoints = DEFAULT_JOINTS,
    jointLimits,
    jointLimitMargin = 5, // degrees
    onJointsChange,
    onPoseChange,
  } = options;

  // Use trajx for WASM initialization
  const { ready: wasmReady, createSolver, solverVersion } = useTrajx();

  // Track solver state
  const [solverReady, setSolverReady] = useState(false);

  // Get any available solver (DH-based preferred for analytical IK, then URDF)
  // Priority: DH solver (for analytical IK) > URDF solver (numerical only)
  const solver = useMemo(() => {
    if (!wasmReady) return null;
    const manager = getKinematicsManager();

    // Check DH solver first (created by useHybridSolver with -dh suffix)
    // This provides analytical IK with up to 8 solutions
    const dhSolverHybrid = manager.getSolver(`${robotId}-dh`);
    if (dhSolverHybrid) return dhSolverHybrid;

    // Check DH solver with exact robotId
    const dhSolver = manager.getSolver(robotId);
    if (dhSolver) return dhSolver;

    // Fallback to URDF solver (numerical IK only)
    const urdfSolver = manager.getUrdfSolver(robotId);
    if (urdfSolver) return urdfSolver;

    // If no solver exists and robotName is provided, try to create DH solver
    // (for backwards compatibility)
    if (robotName && robotName !== robotId) {
      try {
        return manager.createSolverFromDatabase(robotId, robotName);
      } catch {
        return null;
      }
    }

    return null;
  }, [wasmReady, robotId, robotName, createSolver, solverVersion]);

  // Update solverReady when solver changes
  useEffect(() => {
    setSolverReady(solver !== null);
  }, [solver]);

  // Create wrapper functions for FK/IK
  const fk = useCallback((joints: number[]): FkResult | null => {
    if (!solver) return null;
    return solver.forwardKinematics(joints);
  }, [solver]);

  // Note: ikAll is only available on DH-based solver (RobotSolver)
  // URDF solver only has single IK
  const ikAll = useCallback((pose: Pose, seed?: number[]): MultiIkResult | null => {
    if (!solver) return null;

    // Check if solver supports multi-solution IK at runtime
    // Both RobotSolver and UrdfRobotSolver may have this method
    const solverAny = solver as { inverseKinematicsAll?: (pose: Pose, seed?: number[]) => MultiIkResult; inverseKinematics: (pose: Pose, seed?: number[]) => IkResult };

    if (typeof solverAny.inverseKinematicsAll === 'function') {
      return solverAny.inverseKinematicsAll(pose, seed);
    }

    // Fallback for solvers without multi-IK: use single IK and wrap in MultiIkResult format
    const result = solverAny.inverseKinematics(pose, seed);
    if (result && result.success && result.solution) {
      return {
        success: true,
        solutionCount: 1,
        solutions: [result.solution],
        positionErrors: [result.positionError || 0],
        isAnalytical: false, // Fallback uses numerical IK
        errorMessage: undefined,
      };
    }
    return {
      success: false,
      solutionCount: 0,
      solutions: [],
      positionErrors: [],
      isAnalytical: false,
      errorMessage: result?.errorMessage || 'No solution',
    };
  }, [solver]);

  // analyzeWorkspace is only available on DH-based solver
  const analyzeWorkspace = useCallback((joints: number[]): WorkspaceAnalysis | null => {
    if (!solver) return null;

    // Check if solver supports workspace analysis at runtime
    const solverAny = solver as { analyzeWorkspace?: (joints: number[]) => WorkspaceAnalysis };

    if (typeof solverAny.analyzeWorkspace === 'function') {
      return solverAny.analyzeWorkspace(joints);
    }
    // Return default analysis for solvers without workspace analysis
    return {
      isValid: true,
      manipulability: 0.5,
      conditionNumber: 1,
      isNearSingular: false,
      minSingularValue: 0.1,
      jointLimitMargins: joints.map(() => 0.5),
    };
  }, [solver]);

  // State
  const [currentJoints, setCurrentJoints] = useState<number[]>(initialJoints);
  const [currentPose, setCurrentPose] = useState<Pose>(DEFAULT_POSE);
  const [mode, setMode] = useState<JogMode>('joint');
  const [stepJoint, setStepJoint] = useState<StepSize>(1);
  const [stepCartesian, setStepCartesian] = useState<StepSize>(1);
  const [speed, setSpeed] = useState(50);
  const [ikSolutions, setIkSolutions] = useState<number[][]>([]);
  const [selectedConfig, setSelectedConfig] = useState(0);
  const [isAnalytical, setIsAnalytical] = useState(false);
  const [ikError, setIkError] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  // Safety state
  const [jointLimitWarnings, setJointLimitWarnings] = useState<boolean[]>([]);
  const [isNearSingular, setIsNearSingular] = useState(false);
  const [manipulability, setManipulability] = useState(0);
  const [isReachable, setIsReachable] = useState(true);

  // Continuous jog refs
  const jogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jogRequestRef = useRef<number | null>(null);

  // Initialize pose from joints when solver is ready
  useEffect(() => {
    if (solverReady && fk) {
      const result = fk(currentJoints);
      if (result) {
        setCurrentPose(result.pose);
      }
    }
  }, [solverReady, fk]); // Only on solver ready, not on every joint change

  // Check joint limits
  const checkJointLimits = useCallback((joints: number[]) => {
    if (!jointLimits) {
      return joints.map(() => false);
    }
    const marginRad = jointLimitMargin * DEG_TO_RAD;
    return joints.map((j, i) => {
      const lower = jointLimits.lower[i];
      const upper = jointLimits.upper[i];
      return j <= lower + marginRad || j >= upper - marginRad;
    });
  }, [jointLimits, jointLimitMargin]);

  // Update from joint space (joint -> cartesian)
  const updateFromJoints = useCallback((joints: number[]) => {
    setCurrentJoints(joints);
    onJointsChange?.(joints);

    // Check limits
    setJointLimitWarnings(checkJointLimits(joints));

    if (solverReady && fk) {
      const result = fk(joints);
      if (result) {
        setCurrentPose(result.pose);
        onPoseChange?.(result.pose);
      }
    }

    // Analyze workspace
    if (solverReady && analyzeWorkspace) {
      const analysis = analyzeWorkspace(joints);
      if (analysis) {
        setIsNearSingular(analysis.isNearSingular);
        setManipulability(analysis.manipulability);
      }
    }
  }, [solverReady, fk, analyzeWorkspace, checkJointLimits, onJointsChange, onPoseChange]);

  // Update from Cartesian space (cartesian -> joint)
  const updateFromPose = useCallback((pose: Pose) => {
    if (!solverReady || !ikAll) {
      setIkError('Solver not ready');
      return;
    }

    setIsComputing(true);
    const result = ikAll(pose, currentJoints);
    setIsComputing(false);

    if (result && result.success && result.solutions.length > 0) {
      setIkSolutions(result.solutions);
      setIsAnalytical(result.isAnalytical);
      setIkError(null);
      setIsReachable(true);

      // Find the solution closest to current joints to maintain continuity
      // This is critical for smooth Cartesian jogging
      let bestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < result.solutions.length; i++) {
        const sol = result.solutions[i];
        let distance = 0;
        for (let j = 0; j < sol.length; j++) {
          const diff = sol[j] - currentJoints[j];
          distance += diff * diff;
        }
        if (distance < minDistance) {
          minDistance = distance;
          bestIndex = i;
        }
      }

      setSelectedConfig(bestIndex);
      const newJoints = result.solutions[bestIndex];
      setCurrentJoints(newJoints);
      setCurrentPose(pose);
      setJointLimitWarnings(checkJointLimits(newJoints));

      onJointsChange?.(newJoints);
      onPoseChange?.(pose);

      // Analyze workspace
      if (analyzeWorkspace) {
        const analysis = analyzeWorkspace(newJoints);
        if (analysis) {
          setIsNearSingular(analysis.isNearSingular);
          setManipulability(analysis.manipulability);
        }
      }
    } else {
      setIkError(result?.errorMessage || 'No IK solution');
      setIsReachable(false);
      // Keep the requested pose for display but don't update joints
      setCurrentPose(pose);
      onPoseChange?.(pose);
    }
  }, [solverReady, ikAll, analyzeWorkspace, currentJoints, checkJointLimits, onJointsChange, onPoseChange]);

  // Jog joint
  const jogJoint = useCallback((jointIndex: number, direction: 1 | -1) => {
    const deltaRad = direction * stepJoint * DEG_TO_RAD;
    const newJoints = [...currentJoints];
    newJoints[jointIndex] += deltaRad;

    // Clamp to limits if available
    if (jointLimits) {
      newJoints[jointIndex] = Math.max(
        jointLimits.lower[jointIndex],
        Math.min(jointLimits.upper[jointIndex], newJoints[jointIndex])
      );
    }

    updateFromJoints(newJoints);
  }, [currentJoints, stepJoint, jointLimits, updateFromJoints]);

  // Jog Cartesian
  const jogCartesian = useCallback((axis: JogAxis, direction: 1 | -1) => {
    const delta = direction * stepCartesian;
    const newPose = applyCartesianDelta(currentPose, axis, delta);
    updateFromPose(newPose);
  }, [currentPose, stepCartesian, updateFromPose]);

  // Set single joint value
  const setJointValue = useCallback((jointIndex: number, value: number) => {
    const newJoints = [...currentJoints];
    newJoints[jointIndex] = value;
    updateFromJoints(newJoints);
  }, [currentJoints, updateFromJoints]);

  // Set Cartesian value
  const setCartesianValue = useCallback((axis: JogAxis, value: number) => {
    const newPose = { ...currentPose };

    switch (axis) {
      case 'x':
        newPose.position = { ...newPose.position, x: value };
        break;
      case 'y':
        newPose.position = { ...newPose.position, y: value };
        break;
      case 'z':
        newPose.position = { ...newPose.position, z: value };
        break;
      case 'rx':
      case 'ry':
      case 'rz': {
        const euler = quaternionToEuler(currentPose.orientation);
        if (axis === 'rx') euler.roll = value;
        if (axis === 'ry') euler.pitch = value;
        if (axis === 'rz') euler.yaw = value;
        newPose.orientation = eulerToQuaternion(euler.roll, euler.pitch, euler.yaw);
        break;
      }
    }

    updateFromPose(newPose);
  }, [currentPose, updateFromPose]);

  // Set all joints
  const setJoints = useCallback((joints: number[]) => {
    updateFromJoints(joints);
  }, [updateFromJoints]);

  // Set pose
  const setPose = useCallback((pose: Pose) => {
    updateFromPose(pose);
  }, [updateFromPose]);

  // Handle config selection
  const handleSetSelectedConfig = useCallback((config: number) => {
    if (config >= 0 && config < ikSolutions.length) {
      setSelectedConfig(config);
      const newJoints = ikSolutions[config];
      setCurrentJoints(newJoints);
      setJointLimitWarnings(checkJointLimits(newJoints));
      onJointsChange?.(newJoints);

      if (analyzeWorkspace) {
        const analysis = analyzeWorkspace(newJoints);
        if (analysis) {
          setIsNearSingular(analysis.isNearSingular);
          setManipulability(analysis.manipulability);
        }
      }
    }
  }, [ikSolutions, checkJointLimits, analyzeWorkspace, onJointsChange]);

  // Continuous jog
  const startContinuousJog = useCallback((
    type: 'joint' | 'cartesian',
    index: number | JogAxis,
    direction: 1 | -1
  ) => {
    // Stop any existing jog
    if (jogIntervalRef.current) {
      clearInterval(jogIntervalRef.current);
    }

    // Calculate interval based on speed (faster = shorter interval)
    const baseInterval = 100; // ms
    const interval = baseInterval * (100 / speed);

    const jogFn = () => {
      if (type === 'joint' && typeof index === 'number') {
        jogJoint(index, direction);
      } else if (type === 'cartesian' && typeof index === 'string') {
        jogCartesian(index as JogAxis, direction);
      }
    };

    // Execute immediately, then repeat
    jogFn();
    jogIntervalRef.current = setInterval(jogFn, interval);
  }, [speed, jogJoint, jogCartesian]);

  const stopContinuousJog = useCallback(() => {
    if (jogIntervalRef.current) {
      clearInterval(jogIntervalRef.current);
      jogIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (jogIntervalRef.current) {
        clearInterval(jogIntervalRef.current);
      }
    };
  }, []);

  // Compose state
  const state: JogControlState = useMemo(() => ({
    currentJoints,
    currentPose,
    mode,
    stepJoint,
    stepCartesian,
    speed,
    ikSolutions,
    selectedConfig,
    isAnalytical,
    ikError,
    jointLimitWarnings,
    isNearSingular,
    manipulability,
    isReachable,
    solverReady,
    isComputing,
  }), [
    currentJoints, currentPose, mode, stepJoint, stepCartesian, speed,
    ikSolutions, selectedConfig, isAnalytical, ikError,
    jointLimitWarnings, isNearSingular, manipulability, isReachable,
    solverReady, isComputing,
  ]);

  // Compose actions
  const actions: JogControlActions = useMemo(() => ({
    jogJoint,
    jogCartesian,
    setJointValue,
    setCartesianValue,
    setJoints,
    setPose,
    setMode,
    setStepJoint,
    setStepCartesian,
    setSpeed,
    setSelectedConfig: handleSetSelectedConfig,
    startContinuousJog,
    stopContinuousJog,
  }), [
    jogJoint, jogCartesian, setJointValue, setCartesianValue,
    setJoints, setPose, handleSetSelectedConfig,
    startContinuousJog, stopContinuousJog,
  ]);

  return [state, actions];
}

export default useRobotJogControl;
