/**
 * useRobotProcess Hook
 *
 * High-level hook for robot process applications (welding, grinding, inspection, etc.)
 * Integrates kinematics with process execution and provides:
 * - Tool management with TCP offset
 * - Ghost robot preview with IK
 * - Trajectory playback with automatic IK
 * - Process lifecycle management
 *
 * All coordinates use Z-up convention (robotics standard).
 *
 * @example
 * ```tsx
 * function WeldingController({ urdfContent }: Props) {
 *   const {
 *     ready,
 *     jointAngles,
 *     ghostJointAngles,
 *     ghostStatus,
 *     isExecuting,
 *     setTargetPose,
 *     startExecution,
 *   } = useRobotProcess({
 *     robotId: 'welder',
 *     urdfContent,
 *     tool: {
 *       position: [0, 0, 0.12],  // 12cm TCP offset along Z
 *       quaternion: [0, 0, 0, 1],
 *     },
 *   });
 *
 *   // Set target for ghost preview
 *   const handleWorkpointHover = (wp: Workpoint) => {
 *     setTargetPose({
 *       position: wp.position,
 *       quaternion: wp.quaternion,
 *     });
 *   };
 *
 *   return (
 *     <>
 *       <Robot jointAngles={jointAngles} />
 *       {ghostJointAngles && (
 *         <GhostRobot jointAngles={ghostJointAngles} status={ghostStatus} />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useRobotKinematics } from '../coordinates/useRobotKinematics';
import type {
  Pose3D,
  Position3D,
  Quaternion,
  TCPOffset,
  JointAngles,
} from '../coordinates/types';
import type { Pose, Vector3 } from '../types';

// =============================================================================
// Types
// =============================================================================

/**
 * Process type for different industrial applications
 */
export type ProcessType = 'welding' | 'grinding' | 'inspection' | 'painting' | 'assembly' | 'custom';

/**
 * Ghost robot status for IK preview
 */
export type GhostStatus = 'valid' | 'warning' | 'error' | 'neutral';

/**
 * Process execution status
 */
export type ProcessExecutionStatus =
  | 'idle'        // Ready for a new process
  | 'preparing'   // Setting up for execution
  | 'executing'   // Process is running
  | 'paused'      // Process is paused
  | 'completing'  // Finishing up
  | 'completed'   // Process finished successfully
  | 'error';      // An error occurred

/**
 * Trajectory waypoint in Z-up coordinates
 */
export interface ProcessWaypoint {
  /** Waypoint position in Z-up coordinates */
  position: Position3D;
  /** Waypoint orientation as quaternion */
  quaternion: Quaternion;
  /** Optional label */
  label?: string;
  /** Velocity at this point (optional) */
  velocity?: number;
  /** Process-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Process trajectory
 */
export interface ProcessTrajectory {
  /** Unique identifier */
  id: string;
  /** Trajectory name */
  name: string;
  /** Waypoints */
  waypoints: ProcessWaypoint[];
  /** Total duration in seconds */
  duration: number;
}

/**
 * Options for useRobotProcess hook
 */
export interface UseRobotProcessOptions {
  /** Unique robot identifier */
  robotId: string;
  /** URDF content (XML string) */
  urdfContent: string | null;
  /** Force specific DH database robot name for analytical IK */
  dhRobotName?: string;
  /** Process type (for logging and debugging) */
  processType?: ProcessType;
  /** Tool TCP offset (in flange-local Z-up frame) */
  tool?: TCPOffset;
  /** Initial joint angles */
  initialJoints?: JointAngles;
  /** Standoff distance for approach (Z-up, meters) */
  standoffDistance?: number;
  /** IK debounce delay in ms */
  ikDebounceMs?: number;
  /** Enable ghost preview */
  enableGhost?: boolean;
  /** Callback when execution completes */
  onComplete?: () => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Callback when joint angles change */
  onJointChange?: (angles: JointAngles) => void;
}

/**
 * Robot process state (for backwards compatibility)
 */
export interface RobotProcessState {
  /** Current joint angles in radians */
  jointAngles: number[];
  /** End-effector pose in world coordinates */
  endEffectorPose: Pose | null;
  /** Whether the robot model is loaded */
  isLoaded: boolean;
  /** Current execution status */
  status: ProcessExecutionStatus;
  /** Progress (0-1) during execution */
  progress: number;
  /** Error message if status is 'error' */
  error: string | null;
  /** Active trajectory ID */
  activeTrajectoryId: string | null;
}

/**
 * Robot process actions (for backwards compatibility)
 */
export interface RobotProcessActions {
  /** Set joint angles */
  setJointAngles: (angles: number[]) => void;
  /** Move to a specific joint configuration (animated) */
  moveToJoints: (angles: number[], durationMs?: number) => Promise<void>;
  /** Set end-effector pose (triggers IK if available) */
  setEndEffectorPose: (pose: Pose) => void;
  /** Start process execution */
  startExecution: () => void;
  /** Pause execution */
  pauseExecution: () => void;
  /** Resume execution */
  resumeExecution: () => void;
  /** Stop and reset execution */
  stopExecution: () => void;
  /** Set execution progress */
  setProgress: (progress: number) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Set active trajectory */
  setActiveTrajectory: (id: string | null) => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * TCP configuration (deprecated, use TCPOffset instead)
 */
export interface TCPConfig {
  /** Position offset from end-effector [x, y, z] in meters */
  positionOffset: [number, number, number];
  /** Rotation offset as Euler [rx, ry, rz] in radians */
  rotationOffset: [number, number, number];
}

/**
 * Return type for useRobotProcess hook
 */
export interface UseRobotProcessResult {
  // Kinematics State
  /** Whether solver is ready */
  ready: boolean;
  /** Error if any */
  error: Error | null;
  /** Degrees of freedom */
  dof: number;
  /** Whether tool is attached */
  hasTool: boolean;

  // Joint State
  /** Current joint angles */
  jointAngles: JointAngles;
  /** Set joint angles directly */
  setJointAngles: (angles: JointAngles) => void;

  // Kinematics (Z-up)
  /** Current TCP pose (computed from jointAngles + tool offset) */
  tcpPose: Pose3D | null;
  /** Compute FK for given joints - returns pose only */
  fk: (joints: JointAngles) => Pose3D | null;
  /** Compute FK TCP for given joints - returns pose only */
  fkTcp: (joints: JointAngles) => Pose3D | null;

  // Ghost Preview
  /** Ghost joint angles (IK solution for target) */
  ghostJointAngles: JointAngles | null;
  /** Ghost preview status */
  ghostStatus: GhostStatus;
  /** Set target pose for ghost preview (Z-up) */
  setTargetPose: (pose: Pose3D | null) => void;
  /** Current target pose */
  targetPose: Pose3D | null;

  // Execution State
  /** Current execution status */
  status: ProcessExecutionStatus;
  /** Progress (0-1) during execution */
  progress: number;
  /** Whether currently executing */
  isExecuting: boolean;
  /** Whether can start new execution */
  canStart: boolean;

  // Execution Controls
  /** Start process execution */
  startExecution: () => void;
  /** Pause execution */
  pauseExecution: () => void;
  /** Resume execution */
  resumeExecution: () => void;
  /** Stop and reset execution */
  stopExecution: () => void;

  // Trajectory Playback
  /** Whether trajectory is playing */
  isPlaying: boolean;
  /** Playback position (0-1) */
  playbackPosition: number;
  /** Playback speed multiplier */
  playbackSpeed: number;
  /** Active trajectory */
  trajectory: ProcessTrajectory | null;
  /** Load trajectory for playback */
  loadTrajectory: (trajectory: ProcessTrajectory) => void;
  /** Clear loaded trajectory */
  clearTrajectory: () => void;
  /** Start playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Stop and reset playback */
  stop: () => void;
  /** Set playback position (0-1) */
  seek: (position: number) => void;
  /** Set playback speed */
  setSpeed: (speed: number) => void;
  /** Advance playback by delta time (call from useFrame) */
  tick: (deltaSeconds: number) => void;

  // Backwards Compatibility
  /** Legacy state object */
  state: RobotProcessState;
  /** Legacy actions object */
  actions: RobotProcessActions;
  /** Legacy handler for Robot component */
  handleEndEffectorUpdate: (pose: Pose) => void;
  /** Legacy handler for Robot loaded */
  handleRobotLoaded: (info: { jointNames: string[]; dof: number }) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Default standoff distance in meters
 */
const DEFAULT_STANDOFF = 0.005;

/**
 * Default IK debounce in ms
 */
const DEFAULT_IK_DEBOUNCE = 16;

/**
 * useRobotProcess - Unified hook for robot process applications
 */
export function useRobotProcess(options: UseRobotProcessOptions): UseRobotProcessResult {
  const {
    robotId,
    urdfContent,
    dhRobotName,
    processType = 'custom',
    tool,
    initialJoints,
    standoffDistance = DEFAULT_STANDOFF,
    ikDebounceMs = DEFAULT_IK_DEBOUNCE,
    enableGhost = true,
    onComplete,
    onError,
    onJointChange,
  } = options;

  // Refs for callbacks
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onJointChangeRef = useRef(onJointChange);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onJointChangeRef.current = onJointChange;
  }, [onComplete, onError, onJointChange]);

  // Kinematics
  const kinematics = useRobotKinematics({
    robotId,
    urdfContent,
    dhRobotName,
    autoCreate: true,
  });

  const {
    ready,
    error: kinematicsError,
    dof,
    fk,
    fkTcp,
    ikTcp,
    attachTcp,
    detachTcp,
    hasTool: kinematicsHasTool,
  } = kinematics;

  // Joint state
  const [jointAngles, setJointAnglesInternal] = useState<JointAngles>(initialJoints || []);

  // Initialize joints when ready
  useEffect(() => {
    if (ready && jointAngles.length === 0 && dof > 0) {
      setJointAnglesInternal(new Array(dof).fill(0));
    }
  }, [ready, dof, jointAngles.length]);

  // Set joint angles with callback
  const setJointAngles = useCallback((angles: JointAngles) => {
    setJointAnglesInternal(angles);
    onJointChangeRef.current?.(angles);
  }, []);

  // Tool attachment
  const [hasToolAttached, setHasToolAttached] = useState(false);

  useEffect(() => {
    if (ready && tool) {
      attachTcp(tool);
      setHasToolAttached(true);
      console.log(`[useRobotProcess:${processType}] TCP attached:`, tool.position);
    }
    return () => {
      if (ready && hasToolAttached) {
        detachTcp();
        setHasToolAttached(false);
      }
    };
  }, [ready, tool, attachTcp, detachTcp, processType, hasToolAttached]);

  // Wrapper functions to extract pose from FkResult3D
  const fkPoseOnly = useCallback(
    (joints: JointAngles): Pose3D | null => {
      const result = fk(joints);
      return result?.pose || null;
    },
    [fk]
  );

  const fkTcpPoseOnly = useCallback(
    (joints: JointAngles): Pose3D | null => {
      const result = fkTcp(joints);
      return result?.pose || null;
    },
    [fkTcp]
  );

  // Current TCP pose
  const tcpPose = useMemo(() => {
    if (!ready || jointAngles.length === 0) return null;
    return fkTcpPoseOnly(jointAngles);
  }, [ready, jointAngles, fkTcpPoseOnly]);

  // Ghost preview state
  const [targetPose, setTargetPose] = useState<Pose3D | null>(null);
  const [ghostJointAngles, setGhostJointAngles] = useState<JointAngles | null>(null);
  const [ghostStatus, setGhostStatus] = useState<GhostStatus>('neutral');

  // IK computation for ghost with debounce
  const ikTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const computeIdRef = useRef(0);

  useEffect(() => {
    if (!enableGhost || !ready || !targetPose) {
      setGhostJointAngles(null);
      setGhostStatus('neutral');
      return;
    }

    // Debounce IK computation
    if (ikTimeoutRef.current) {
      clearTimeout(ikTimeoutRef.current);
    }

    const computeId = ++computeIdRef.current;

    ikTimeoutRef.current = setTimeout(() => {
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
        const result = ikTcp(targetWithStandoff, jointAngles);

        if (result?.success && result.solution) {
          setGhostJointAngles(result.solution);
          // Check for warnings
          const posError = result.positionError || 0;
          if (posError > 0.01) {
            setGhostStatus('warning');
          } else {
            setGhostStatus('valid');
          }
        } else {
          setGhostJointAngles(null);
          setGhostStatus('error');
        }
      } catch (e) {
        console.error(`[useRobotProcess:${processType}] IK error:`, e);
        setGhostJointAngles(null);
        setGhostStatus('error');
      }
    }, ikDebounceMs);

    return () => {
      if (ikTimeoutRef.current) {
        clearTimeout(ikTimeoutRef.current);
      }
    };
  }, [enableGhost, ready, targetPose, jointAngles, ikTcp, standoffDistance, ikDebounceMs, processType]);

  // Execution state
  const [status, setStatus] = useState<ProcessExecutionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTrajectoryId, setActiveTrajectoryId] = useState<string | null>(null);

  // Trajectory playback state
  const [trajectory, setTrajectory] = useState<ProcessTrajectory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Refs for playback
  const jointAnglesRef = useRef(jointAngles);
  useEffect(() => {
    jointAnglesRef.current = jointAngles;
  }, [jointAngles]);

  // Execution controls
  const startExecution = useCallback(() => {
    setStatus('executing');
    setProgress(0);
    setErrorMsg(null);
  }, []);

  const pauseExecution = useCallback(() => {
    if (status === 'executing') {
      setStatus('paused');
      setIsPlaying(false);
    }
  }, [status]);

  const resumeExecution = useCallback(() => {
    if (status === 'paused') {
      setStatus('executing');
    }
  }, [status]);

  const stopExecution = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setIsPlaying(false);
    setPlaybackPosition(0);
  }, []);

  // Trajectory controls
  const loadTrajectory = useCallback((traj: ProcessTrajectory) => {
    setTrajectory(traj);
    setActiveTrajectoryId(traj.id);
    setPlaybackPosition(0);
    setIsPlaying(false);
    console.log(`[useRobotProcess:${processType}] Loaded trajectory: ${traj.name}`);
  }, [processType]);

  const clearTrajectory = useCallback(() => {
    setTrajectory(null);
    setActiveTrajectoryId(null);
    setPlaybackPosition(0);
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (trajectory) {
      setIsPlaying(true);
      if (status === 'idle') {
        setStatus('executing');
      }
    }
  }, [trajectory, status]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setPlaybackPosition(0);
    setStatus('idle');
    setProgress(0);
  }, []);

  const seek = useCallback((pos: number) => {
    setPlaybackPosition(Math.max(0, Math.min(1, pos)));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(Math.max(0.1, Math.min(10, speed)));
  }, []);

  // Tick function for playback (call from useFrame)
  const tick = useCallback((deltaSeconds: number) => {
    if (!isPlaying || !trajectory || trajectory.waypoints.length < 2) return;

    const duration = trajectory.duration || 10;
    const newPosition = playbackPosition + (deltaSeconds * playbackSpeed) / duration;

    if (newPosition >= 1) {
      setPlaybackPosition(1);
      setIsPlaying(false);
      setStatus('completed');
      setProgress(1);
      onCompleteRef.current?.();
      return;
    }

    setPlaybackPosition(newPosition);
    setProgress(newPosition);

    // Interpolate pose and compute IK
    const waypoints = trajectory.waypoints;
    const totalSegments = waypoints.length - 1;
    const segmentFloat = newPosition * totalSegments;
    const segmentIdx = Math.min(Math.floor(segmentFloat), totalSegments - 1);
    const t = segmentFloat - segmentIdx;

    const wp1 = waypoints[segmentIdx];
    const wp2 = waypoints[segmentIdx + 1];

    if (!wp1 || !wp2) return;

    // Interpolate position
    const interpPosition: Position3D = [
      wp1.position[0] + t * (wp2.position[0] - wp1.position[0]),
      wp1.position[1] + t * (wp2.position[1] - wp1.position[1]),
      wp1.position[2] + t * (wp2.position[2] - wp1.position[2]),
    ];

    // Interpolate orientation using SLERP
    const q1 = new THREE.Quaternion(wp1.quaternion[0], wp1.quaternion[1], wp1.quaternion[2], wp1.quaternion[3]);
    const q2 = new THREE.Quaternion(wp2.quaternion[0], wp2.quaternion[1], wp2.quaternion[2], wp2.quaternion[3]);
    const interpQuat = new THREE.Quaternion().slerpQuaternions(q1, q2, t);

    const interpPose: Pose3D = {
      position: interpPosition,
      quaternion: [interpQuat.x, interpQuat.y, interpQuat.z, interpQuat.w],
    };

    // Compute IK
    if (ready && ikTcp) {
      const result = ikTcp(interpPose, jointAnglesRef.current);
      if (result?.success && result.solution) {
        setJointAngles(result.solution);
      }
    }
  }, [isPlaying, trajectory, playbackPosition, playbackSpeed, ready, ikTcp, setJointAngles]);

  // Derived state
  const isExecuting = status === 'executing';
  const canStart = status === 'idle' || status === 'completed' || status === 'error';
  const error = kinematicsError || (errorMsg ? new Error(errorMsg) : null);

  // Animation ref for moveToJoints
  const animationRef = useRef<number | null>(null);

  // Move to joints with animation
  const moveToJoints = useCallback(
    async (targetAngles: number[], durationMs = 1000): Promise<void> => {
      return new Promise((resolve) => {
        const startAngles = [...jointAngles];
        const startTime = performance.now();

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const t = Math.min(elapsed / durationMs, 1);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

          const interpolated = startAngles.map((start, i) => {
            const target = targetAngles[i] ?? start;
            return start + (target - start) * eased;
          });

          setJointAngles(interpolated);

          if (t < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            animationRef.current = null;
            resolve();
          }
        };

        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }

        animationRef.current = requestAnimationFrame(animate);
      });
    },
    [jointAngles, setJointAngles]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      if (ikTimeoutRef.current) {
        clearTimeout(ikTimeoutRef.current);
      }
    };
  }, []);

  // Legacy end effector pose for backwards compatibility
  const [endEffectorPose, setEndEffectorPose] = useState<Pose | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleEndEffectorUpdate = useCallback((pose: Pose) => {
    setEndEffectorPose(pose);
  }, []);

  const handleRobotLoaded = useCallback((_info: { jointNames: string[]; dof: number }) => {
    setIsLoaded(true);
  }, []);

  // Legacy state object
  const state: RobotProcessState = useMemo(() => ({
    jointAngles,
    endEffectorPose,
    isLoaded: ready,
    status,
    progress,
    error: errorMsg,
    activeTrajectoryId,
  }), [jointAngles, endEffectorPose, ready, status, progress, errorMsg, activeTrajectoryId]);

  // Legacy actions object
  const actions: RobotProcessActions = useMemo(() => ({
    setJointAngles,
    moveToJoints,
    setEndEffectorPose: (pose: Pose) => {
      // Convert Y-up Pose to Z-up Pose3D and set as target
      const pose3D: Pose3D = {
        position: [pose.position.x, -pose.position.z, pose.position.y], // Y-up to Z-up
        quaternion: [pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w],
      };
      setTargetPose(pose3D);
    },
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,
    setProgress: (p: number) => setProgress(p),
    setError: (e: string | null) => {
      setErrorMsg(e);
      if (e) {
        setStatus('error');
        onErrorRef.current?.(e);
      }
    },
    setActiveTrajectory: setActiveTrajectoryId,
    reset: () => {
      setStatus('idle');
      setProgress(0);
      setErrorMsg(null);
      setActiveTrajectoryId(null);
      setIsPlaying(false);
      setPlaybackPosition(0);
    },
  }), [setJointAngles, moveToJoints, startExecution, pauseExecution, resumeExecution, stopExecution]);

  return {
    // Kinematics State
    ready,
    error,
    dof,
    hasTool: hasToolAttached,

    // Joint State
    jointAngles,
    setJointAngles,

    // Kinematics (Z-up)
    tcpPose,
    fk: fkPoseOnly,
    fkTcp: fkTcpPoseOnly,

    // Ghost Preview
    ghostJointAngles,
    ghostStatus,
    setTargetPose,
    targetPose,

    // Execution State
    status,
    progress,
    isExecuting,
    canStart,

    // Execution Controls
    startExecution,
    pauseExecution,
    resumeExecution,
    stopExecution,

    // Trajectory Playback
    isPlaying,
    playbackPosition,
    playbackSpeed,
    trajectory,
    loadTrajectory,
    clearTrajectory,
    play,
    pause,
    stop,
    seek,
    setSpeed,
    tick,

    // Backwards Compatibility
    state,
    actions,
    handleEndEffectorUpdate,
    handleRobotLoaded,
  };
}
