/**
 * useRobotKinematics Hook
 *
 * High-level kinematics hook providing a unified Z-up API for robotics applications.
 * Internally wraps the hybrid solver and handles coordinate conversions.
 *
 * @example
 * ```tsx
 * function RobotController({ urdfContent }: Props) {
 *   const {
 *     ready,
 *     fk,
 *     ik,
 *     attachTcp,
 *   } = useRobotKinematics({
 *     robotId: 'main-robot',
 *     urdfContent,
 *   });
 *
 *   // All coordinates are Z-up (robotics standard)
 *   const tcpOffset: Pose3D = {
 *     position: [0, 0, 0.15],  // 15cm along tool Z-axis
 *     quaternion: [0, 0, 0, 1],
 *   };
 *
 *   useEffect(() => {
 *     if (ready) {
 *       attachTcp(tcpOffset);
 *     }
 *   }, [ready]);
 *
 *   // FK returns Z-up pose
 *   const pose = fk([0, 0, 0, 0, 0, 0]);
 *   console.log('TCP height:', pose?.position[2]); // Z is up
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useHybridSolver, type UseHybridSolverOptions } from '../kinematics/useTrajx';
import { CoordinateTransform } from './transform';
import { computeWorkspaceAnalysis } from '../kinematics/solver-interface';
import type {
  Position3D,
  Quaternion,
  Pose3D,
  TCPOffset,
  JointAngles,
} from './types';
import type { IkResult, MultiIkResult, FkChainResult, WorkspaceAnalysis } from '../kinematics/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for useRobotKinematics hook
 */
export interface UseRobotKinematicsOptions {
  /** Unique robot identifier */
  robotId: string;
  /** URDF content (XML string) */
  urdfContent: string | null;
  /** Force specific DH database robot name for analytical IK */
  dhRobotName?: string;
  /** Auto-create solver when URDF is available */
  autoCreate?: boolean;
}

/**
 * FK result in Z-up coordinates
 */
export interface FkResult3D {
  /** End-effector or TCP pose in Z-up coordinates */
  pose: Pose3D;
  /** Whether tool offset was applied */
  toolApplied: boolean;
}

/**
 * FK chain result in Z-up coordinates
 */
export interface FkChainResult3D {
  /** All link poses from base to end-effector */
  poses: Pose3D[];
  /** Link names if available */
  linkNames?: string[];
}

/**
 * IK result with Z-up input verification
 */
export interface IkResult3D extends IkResult {
  /** Original target pose (Z-up) that was solved for */
  targetPose: Pose3D;
}

/**
 * Multi-IK result with all solutions
 */
export interface MultiIkResult3D extends MultiIkResult {
  /** Original target pose (Z-up) that was solved for */
  targetPose: Pose3D;
}

/**
 * Return type for useRobotKinematics hook
 */
export interface UseRobotKinematicsReturn {
  // State
  /** Whether solver is ready */
  ready: boolean;
  /** Error if initialization failed */
  error: Error | null;
  /** Joint names from URDF */
  jointNames: string[];
  /** Joint limits [lower, upper] for each joint */
  jointLimits: { lower: number[]; upper: number[] } | null;
  /** Degrees of freedom */
  dof: number;
  /** Whether analytical IK is available */
  hasAnalyticalIk: boolean;

  // Forward Kinematics (Z-up output)
  /** Compute FK for flange pose */
  fk: (joints: JointAngles) => FkResult3D | null;
  /** Compute FK for TCP pose (requires attached tool) */
  fkTcp: (joints: JointAngles) => FkResult3D | null;
  /** Compute FK chain for all links */
  fkChain: (joints: JointAngles) => FkChainResult3D | null;

  // Inverse Kinematics (Z-up input)
  /** Solve IK for flange pose */
  ik: (targetPose: Pose3D, seed?: JointAngles) => IkResult3D | null;
  /** Solve IK for TCP pose (requires attached tool) */
  ikTcp: (targetTcpPose: Pose3D, seed?: JointAngles) => IkResult3D | null;
  /** Get all IK solutions (analytical if available) */
  ikAll: (targetPose: Pose3D, seed?: JointAngles) => MultiIkResult3D | null;

  // Workspace Analysis
  /** Analyze workspace properties at joint configuration */
  analyzeWorkspace: (joints: JointAngles) => WorkspaceAnalysis | null;

  // Tool Management (Z-up coordinates)
  /** Attach TCP offset (in flange-local Z-up frame) */
  attachTcp: (offset: TCPOffset) => void;
  /** Detach current tool */
  detachTcp: () => void;
  /** Check if tool is attached */
  hasTool: () => boolean;

  // Validation
  /** Check if joint configuration is within limits */
  isValidConfig: (joints: JointAngles) => boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * High-level kinematics hook with Z-up API
 *
 * This hook provides a unified interface for robot kinematics using Z-up
 * coordinates (robotics standard). It internally handles conversion to/from
 * Three.js Y-up coordinates.
 *
 * Features:
 * - All poses use Z-up coordinate system
 * - Automatic URDF parsing for joint info
 * - Analytical IK when robot is in DH database
 * - TCP offset management
 */
export function useRobotKinematics(options: UseRobotKinematicsOptions): UseRobotKinematicsReturn {
  const { robotId, urdfContent, dhRobotName, autoCreate = true } = options;

  // Use hybrid solver with Z-up coordinate system
  // The hybrid solver already handles Y-up <-> Z-up conversion internally
  const {
    ready,
    error,
    jointNames,
    jointLimits,
    hasAnalyticalIk,
    urdfSolver,
    dhSolver,
    fk: hybridFk,
    fkTcp: hybridFkTcp,
    fkChain: hybridFkChain,
    ik: hybridIk,
    ikTcp: hybridIkTcp,
    ikAll: hybridIkAll,
    attachTool,
    detachTool,
    hasTool,
    isValidConfig,
  } = useHybridSolver({
    robotId,
    urdfContent,
    dhRobotName,
    autoCreate,
    // Use Z-up coordinate system - the hybrid solver will NOT convert internally
    coordinateSystem: 'Z-up',
  });

  const dof = jointNames.length;

  // Wrap FK to return Pose3D type
  const fk = useCallback(
    (joints: JointAngles): FkResult3D | null => {
      const result = hybridFk(joints);
      if (!result) return null;
      return {
        pose: CoordinateTransform.poseFromObject(result.pose),
        toolApplied: result.toolApplied,
      };
    },
    [hybridFk]
  );

  const fkTcp = useCallback(
    (joints: JointAngles): FkResult3D | null => {
      const result = hybridFkTcp(joints);
      if (!result) return null;
      return {
        pose: CoordinateTransform.poseFromObject(result.pose),
        toolApplied: result.toolApplied,
      };
    },
    [hybridFkTcp]
  );

  const fkChain = useCallback(
    (joints: JointAngles): FkChainResult3D | null => {
      const result = hybridFkChain(joints);
      if (!result) return null;
      return {
        poses: result.poses.map((p) => CoordinateTransform.poseFromObject(p)),
        linkNames: result.linkNames,
      };
    },
    [hybridFkChain]
  );

  // Wrap IK to accept Pose3D type
  const ik = useCallback(
    (targetPose: Pose3D, seed?: JointAngles): IkResult3D | null => {
      const poseObj = CoordinateTransform.poseToObject(targetPose);
      const result = hybridIk(poseObj, seed);
      if (!result) return null;
      return {
        ...result,
        targetPose,
      };
    },
    [hybridIk]
  );

  const ikTcp = useCallback(
    (targetTcpPose: Pose3D, seed?: JointAngles): IkResult3D | null => {
      const poseObj = CoordinateTransform.poseToObject(targetTcpPose);
      const result = hybridIkTcp(poseObj, seed);
      if (!result) return null;
      return {
        ...result,
        targetPose: targetTcpPose,
      };
    },
    [hybridIkTcp]
  );

  const ikAll = useCallback(
    (targetPose: Pose3D, seed?: JointAngles): MultiIkResult3D | null => {
      const poseObj = CoordinateTransform.poseToObject(targetPose);
      const result = hybridIkAll(poseObj, seed);
      if (!result) return null;
      return {
        ...result,
        targetPose,
      };
    },
    [hybridIkAll]
  );

  // Wrap tool attachment to accept TCPOffset type
  const attachTcp = useCallback(
    (offset: TCPOffset): void => {
      const poseObj = {
        position: { x: offset.position[0], y: offset.position[1], z: offset.position[2] },
        orientation: { x: offset.quaternion[0], y: offset.quaternion[1], z: offset.quaternion[2], w: offset.quaternion[3] },
      };
      attachTool(poseObj);
    },
    [attachTool]
  );

  // Workspace analysis (use DH solver if available, otherwise URDF solver with fallback)
  const analyzeWorkspace = useCallback(
    (joints: JointAngles): WorkspaceAnalysis | null => {
      const solver = dhSolver || urdfSolver;
      if (!solver) return null;
      return computeWorkspaceAnalysis(solver, joints);
    },
    [dhSolver, urdfSolver]
  );

  return {
    // State
    ready,
    error,
    jointNames,
    jointLimits,
    dof,
    hasAnalyticalIk,

    // FK
    fk,
    fkTcp,
    fkChain,

    // IK
    ik,
    ikTcp,
    ikAll,

    // Workspace Analysis
    analyzeWorkspace,

    // Tool
    attachTcp,
    detachTcp: detachTool,
    hasTool,

    // Validation
    isValidConfig,
  };
}

export default useRobotKinematics;
