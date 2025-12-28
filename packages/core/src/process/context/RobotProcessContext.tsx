/**
 * RobotProcessContext
 *
 * Unified context that integrates robot kinematics with process workflow.
 * Provides robot state, ghost preview, and trajectory playback to process components.
 *
 * This is the "glue layer" that connects:
 * - ProcessProvider (workflow state)
 * - Robot kinematics (FK/IK)
 * - Ghost preview (IK-based pose preview)
 * - Trajectory playback (interpolation + IK)
 *
 * @example
 * ```tsx
 * function WeldingDemo() {
 *   return (
 *     <ProcessProvider initialProcessId="welding">
 *       <RobotProcessProvider
 *         urdfPath="/robots/fanuc.urdf"
 *         tool={{ position: [0, 0, 0.12], quaternion: [0, 0, 0, 1] }}
 *       >
 *         <Canvas>
 *           <ProcessScene />
 *         </Canvas>
 *         <ProcessWorkspace />
 *       </RobotProcessProvider>
 *     </ProcessProvider>
 *   );
 * }
 * ```
 */

import * as React from 'react';
import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  useRobotWithKinematics,
  type UseRobotWithKinematicsOptions,
  type UseRobotWithKinematicsResult,
  type ToolConfig,
} from '../../hooks/useRobotWithKinematics';
import {
  useGhostPreview,
  type UseGhostPreviewResult,
  type GhostPreviewStatus,
  type GhostInputMode,
} from '../../hooks/useGhostPreview';
import {
  usePoseTrajectoryPlayer,
  type UsePoseTrajectoryPlayerResult,
  type PoseTrajectory,
  type PosePlaybackState,
} from '../../hooks/usePoseTrajectoryPlayer';
import type {
  Pose3D,
  JointAngles,
  TCPOffset,
} from '../../coordinates/types';
import { useProcessContext } from './ProcessProvider';
import type { ProcessStatus, ProcessDefinition, ProcessState } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Robot process state combining robot and workflow state
 */
export interface RobotProcessState {
  // Robot State
  /** Whether robot kinematics is ready */
  robotReady: boolean;
  /** Robot loading state */
  robotLoading: boolean;
  /** Robot error */
  robotError: Error | null;
  /** Degrees of freedom */
  dof: number;
  /** Current joint angles */
  jointAngles: JointAngles;
  /** Current TCP pose (Z-up) */
  tcpPose: Pose3D | null;
  /** Whether tool is attached */
  hasTool: boolean;

  // Ghost Preview
  /** Ghost joint angles (IK solution for target or direct joints) */
  ghostJointAngles: JointAngles | null;
  /** Ghost preview status */
  ghostStatus: GhostPreviewStatus;
  /** Ghost input mode ('pose' for IK-based, 'joints' for direct control) */
  ghostInputMode: GhostInputMode;
  /** Current target pose for ghost (only in pose mode) */
  ghostTargetPose: Pose3D | null;
  /** Current target joints for ghost (only in joints mode) */
  ghostTargetJoints: JointAngles | null;
  /** Whether ghost is computing IK (only in pose mode) */
  ghostIsComputing: boolean;

  // Trajectory Playback
  /** Playback state */
  playbackState: PosePlaybackState;
  /** Whether playing */
  isPlaying: boolean;
  /** Playback position (0-1) */
  playbackPosition: number;
  /** Playback speed */
  playbackSpeed: number;
  /** Loaded trajectory */
  trajectory: PoseTrajectory | null;
  /** Current pose during playback */
  playbackPose: Pose3D | null;
  /** IK error during playback */
  playbackIKError: string | null;

  // Process Workflow (from ProcessContext)
  /** Active process ID */
  processId: string | null;
  /** Full active process definition (for components access) */
  activeProcess: ProcessDefinition | null;
  /** Full process state */
  processState: ProcessState | null;
  /** Process workflow status */
  processStatus: ProcessStatus | null;
  /** Process progress (0-100) */
  processProgress: number;
  /** Process error */
  processError: string | null;
}

/**
 * Robot process actions
 */
export interface RobotProcessActions {
  // Robot Control
  /** Set joint angles */
  setJointAngles: (angles: JointAngles) => void;
  /** Attach a tool */
  attachTool: (tool: ToolConfig | TCPOffset) => void;
  /** Detach current tool */
  detachTool: () => void;

  // Ghost Preview
  /** Set target pose for ghost preview (switches to pose mode, uses IK) */
  setGhostTarget: (pose: Pose3D | null) => void;
  /** Set target joints for ghost preview (switches to joints mode, direct control) */
  setGhostJoints: (joints: JointAngles | null) => void;
  /** Clear ghost preview */
  clearGhost: () => void;
  /** Apply ghost to robot (returns current ghost joints) */
  applyGhostToRobot: () => JointAngles | null;

  // Trajectory Playback
  /** Load a trajectory */
  loadTrajectory: (trajectory: PoseTrajectory) => void;
  /** Clear loaded trajectory */
  clearTrajectory: () => void;
  /** Start/resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Stop and reset playback */
  stop: () => void;
  /** Toggle play/pause */
  togglePlayback: () => void;
  /** Seek to position (0-1) */
  seek: (position: number) => void;
  /** Set playback speed */
  setPlaybackSpeed: (speed: number) => void;
  /** Advance playback (call from useFrame) */
  tick: (deltaSeconds: number) => void;

  // Kinematics
  /** Compute FK for flange pose */
  fkPose: (joints: JointAngles) => Pose3D | null;
  /** Compute FK for TCP pose */
  fkTcpPose: (joints: JointAngles) => Pose3D | null;
  /** Compute IK for TCP pose */
  ikTcp: (target: Pose3D, seed?: JointAngles) => { success: boolean; solution: JointAngles | null };
}

/**
 * Robot process context value
 */
export interface RobotProcessContextValue {
  state: RobotProcessState;
  actions: RobotProcessActions;
}

/**
 * Props for RobotProcessProvider
 */
export interface RobotProcessProviderProps {
  /** Child components */
  children: React.ReactNode;
  /** URDF path (URL) */
  urdfPath?: string;
  /** URDF content (XML string) */
  urdfContent?: string | null;
  /** Robot ID */
  robotId?: string;
  /** DH robot name for analytical IK */
  dhRobotName?: string;
  /** Tool configuration */
  tool?: ToolConfig | TCPOffset;
  /** Initial joint angles */
  initialJoints?: JointAngles;
  /** Standoff distance for ghost preview */
  standoffDistance?: number;
  /** Enable ghost preview */
  enableGhost?: boolean;
  /** Callback when joint angles change */
  onJointAnglesChange?: (angles: JointAngles) => void;
  /** Callback when playback completes */
  onPlaybackComplete?: () => void;
  /** Callback when ready state changes */
  onReady?: (ready: boolean) => void;
}

// =============================================================================
// Context
// =============================================================================

const RobotProcessContext = createContext<RobotProcessContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

export function RobotProcessProvider({
  children,
  urdfPath,
  urdfContent,
  robotId = 'process-robot',
  dhRobotName,
  tool,
  initialJoints,
  standoffDistance = 0.005,
  enableGhost = true,
  onJointAnglesChange,
  onPlaybackComplete,
  onReady,
}: RobotProcessProviderProps): React.JSX.Element {
  // Get process context (optional - can work without it)
  let processContext: ReturnType<typeof useProcessContext> | null = null;
  try {
    processContext = useProcessContext();
  } catch {
    // Not within ProcessProvider - that's OK
  }

  const activeProcess = processContext?.activeProcess;
  const processState = processContext?.processState;

  // Refs for callbacks
  const onJointAnglesChangeRef = useRef(onJointAnglesChange);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onJointAnglesChangeRef.current = onJointAnglesChange;
    onPlaybackCompleteRef.current = onPlaybackComplete;
    onReadyRef.current = onReady;
  }, [onJointAnglesChange, onPlaybackComplete, onReady]);

  // Normalize tool config
  const normalizedTool = useMemo((): TCPOffset | undefined => {
    if (!tool) return undefined;
    if ('position' in tool && Array.isArray(tool.position)) {
      return {
        position: tool.position,
        quaternion: tool.quaternion,
      };
    }
    return tool as TCPOffset;
  }, [tool]);

  // Robot kinematics
  const robot = useRobotWithKinematics({
    robotId,
    urdfPath,
    urdfContent,
    dhRobotName,
    tool: normalizedTool,
    autoAttachTool: true,
    initialJoints,
    onJointChange: (angles) => {
      onJointAnglesChangeRef.current?.(angles);
    },
    onReady: (ready) => {
      onReadyRef.current?.(ready);
    },
  });

  // Ghost preview
  const ghost = useGhostPreview({
    kinematics: {
      ready: robot.ready,
      ikTcp: robot.ikTcp,
    } as any,
    currentJoints: robot.jointAngles,
    enabled: enableGhost,
    standoffDistance,
  });

  // Trajectory player
  const player = usePoseTrajectoryPlayer({
    kinematics: {
      ready: robot.ready,
      ikTcp: robot.ikTcp,
    } as any,
    onComplete: () => {
      onPlaybackCompleteRef.current?.();
    },
    onJointAnglesUpdate: (angles) => {
      robot.setJointAngles(angles);
    },
  });

  // Build state
  const state = useMemo<RobotProcessState>(() => ({
    // Robot State
    robotReady: robot.ready,
    robotLoading: robot.loading,
    robotError: robot.error,
    dof: robot.dof,
    jointAngles: robot.jointAngles,
    tcpPose: robot.tcpPose,
    hasTool: robot.hasTool,

    // Ghost Preview
    ghostJointAngles: ghost.jointAngles,
    ghostStatus: ghost.status,
    ghostInputMode: ghost.inputMode,
    ghostTargetPose: ghost.targetPose,
    ghostTargetJoints: ghost.targetJoints,
    ghostIsComputing: ghost.isComputing,

    // Trajectory Playback
    playbackState: player.state,
    isPlaying: player.isPlaying,
    playbackPosition: player.position,
    playbackSpeed: player.speed,
    trajectory: player.trajectory,
    playbackPose: player.currentPose,
    playbackIKError: player.ikError,

    // Process Workflow
    processId: activeProcess?.id ?? null,
    activeProcess: activeProcess ?? null,
    processState: processState ?? null,
    processStatus: processState?.status ?? null,
    processProgress: processState?.progress ?? 0,
    processError: processState?.error ?? null,
  }), [
    robot.ready, robot.loading, robot.error, robot.dof, robot.jointAngles, robot.tcpPose, robot.hasTool,
    ghost.jointAngles, ghost.status, ghost.inputMode, ghost.targetPose, ghost.targetJoints, ghost.isComputing,
    player.state, player.isPlaying, player.position, player.speed, player.trajectory, player.currentPose, player.ikError,
    activeProcess, processState,
  ]);

  // Build actions
  const actions = useMemo<RobotProcessActions>(() => ({
    // Robot Control
    setJointAngles: robot.setJointAngles,
    attachTool: robot.attachTool,
    detachTool: robot.detachTool,

    // Ghost Preview
    setGhostTarget: ghost.setTargetPose,
    setGhostJoints: ghost.setTargetJoints,
    clearGhost: ghost.clear,
    applyGhostToRobot: ghost.applyToRobot,

    // Trajectory Playback
    loadTrajectory: player.load,
    clearTrajectory: player.clear,
    play: player.play,
    pause: player.pause,
    stop: player.stop,
    togglePlayback: player.toggle,
    seek: player.seek,
    setPlaybackSpeed: player.setSpeed,
    tick: player.tick,

    // Kinematics
    fkPose: robot.fkPose,
    fkTcpPose: robot.fkTcpPose,
    ikTcp: (target: Pose3D, seed?: JointAngles) => {
      const result = robot.ikTcp(target, seed);
      return {
        success: result?.success ?? false,
        solution: result?.solution ?? null,
      };
    },
  }), [
    robot.setJointAngles, robot.attachTool, robot.detachTool, robot.fkPose, robot.fkTcpPose, robot.ikTcp,
    ghost.setTargetPose, ghost.setTargetJoints, ghost.clear, ghost.applyToRobot,
    player.load, player.clear, player.play, player.pause, player.stop, player.toggle, player.seek, player.setSpeed, player.tick,
  ]);

  // Context value
  const contextValue = useMemo<RobotProcessContextValue>(
    () => ({ state, actions }),
    [state, actions]
  );

  return (
    <RobotProcessContext.Provider value={contextValue}>
      {children}
    </RobotProcessContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access the robot process context
 */
export function useRobotProcessContext(): RobotProcessContextValue {
  const context = useContext(RobotProcessContext);
  if (!context) {
    throw new Error('useRobotProcessContext must be used within a RobotProcessProvider');
  }
  return context;
}

/**
 * Hook to access robot process state
 */
export function useRobotProcessState(): RobotProcessState {
  const { state } = useRobotProcessContext();
  return state;
}

/**
 * Hook to access robot process actions
 */
export function useRobotProcessActions(): RobotProcessActions {
  const { actions } = useRobotProcessContext();
  return actions;
}

/**
 * Hook to access just the robot kinematics part
 */
export function useProcessRobot(): {
  ready: boolean;
  jointAngles: JointAngles;
  setJointAngles: (angles: JointAngles) => void;
  tcpPose: Pose3D | null;
  fkPose: (joints: JointAngles) => Pose3D | null;
  fkTcpPose: (joints: JointAngles) => Pose3D | null;
} {
  const { state, actions } = useRobotProcessContext();
  return {
    ready: state.robotReady,
    jointAngles: state.jointAngles,
    setJointAngles: actions.setJointAngles,
    tcpPose: state.tcpPose,
    fkPose: actions.fkPose,
    fkTcpPose: actions.fkTcpPose,
  };
}

/**
 * Hook to access just the ghost preview part
 *
 * Supports two input modes:
 * - Pose mode: setTarget(pose) uses IK to compute joint angles
 * - Joints mode: setTargetJoints(joints) sets joints directly without IK
 *
 * @example Pose mode (clicking workpoints)
 * ```tsx
 * const ghost = useProcessGhost();
 * ghost.setTarget({ position: [0.5, 0, 0.3], quaternion: [0, 0, 0, 1] });
 * ```
 *
 * @example Joints mode (gamepad control)
 * ```tsx
 * const ghost = useProcessGhost();
 * ghost.setTargetJoints([0, -0.5, 0.5, 0, 0.5, 0]);
 * ```
 */
export function useProcessGhost(): {
  /** Ghost joint angles (IK solution or direct joints) */
  jointAngles: JointAngles | null;
  /** Ghost preview status */
  status: GhostPreviewStatus;
  /** Current input mode */
  inputMode: GhostInputMode;
  /** Current target pose (only in pose mode) */
  targetPose: Pose3D | null;
  /** Current target joints (only in joints mode) */
  targetJoints: JointAngles | null;
  /** Set target pose (switches to pose mode, uses IK) */
  setTarget: (pose: Pose3D | null) => void;
  /** Set target joints directly (switches to joints mode) */
  setTargetJoints: (joints: JointAngles | null) => void;
  /** Clear ghost preview */
  clear: () => void;
  /** Apply ghost to robot (returns current joints) */
  applyToRobot: () => JointAngles | null;
} {
  const { state, actions } = useRobotProcessContext();
  return {
    jointAngles: state.ghostJointAngles,
    status: state.ghostStatus,
    inputMode: state.ghostInputMode,
    targetPose: state.ghostTargetPose,
    targetJoints: state.ghostTargetJoints,
    setTarget: actions.setGhostTarget,
    setTargetJoints: actions.setGhostJoints,
    clear: actions.clearGhost,
    applyToRobot: actions.applyGhostToRobot,
  };
}

/**
 * Hook to access just the trajectory playback part
 */
export function useProcessPlayback(): {
  state: PosePlaybackState;
  isPlaying: boolean;
  position: number;
  speed: number;
  trajectory: PoseTrajectory | null;
  currentPose: Pose3D | null;
  load: (traj: PoseTrajectory) => void;
  clear: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  seek: (pos: number) => void;
  setSpeed: (speed: number) => void;
  tick: (delta: number) => void;
} {
  const { state, actions } = useRobotProcessContext();
  return {
    state: state.playbackState,
    isPlaying: state.isPlaying,
    position: state.playbackPosition,
    speed: state.playbackSpeed,
    trajectory: state.trajectory,
    currentPose: state.playbackPose,
    load: actions.loadTrajectory,
    clear: actions.clearTrajectory,
    play: actions.play,
    pause: actions.pause,
    stop: actions.stop,
    toggle: actions.togglePlayback,
    seek: actions.seek,
    setSpeed: actions.setPlaybackSpeed,
    tick: actions.tick,
  };
}

export default RobotProcessProvider;
