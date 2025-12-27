/**
 * usePoseTrajectoryPlayer Hook
 *
 * Provides TCP pose trajectory playback with automatic IK computation.
 * Unlike useTrajectoryPlayer (for joint-space), this hook interpolates
 * Cartesian poses and computes IK in real-time.
 *
 * All coordinates use Z-up convention (robotics standard).
 *
 * @example
 * ```tsx
 * function WeldingPlayback({ kinematics, trajectory }) {
 *   const {
 *     isPlaying,
 *     position,
 *     currentPose,
 *     jointAngles,
 *     play,
 *     pause,
 *     tick,
 *   } = usePoseTrajectoryPlayer({
 *     kinematics,
 *     trajectory,
 *   });
 *
 *   // Call tick from useFrame
 *   useFrame((_, delta) => {
 *     tick(delta);
 *   });
 *
 *   return (
 *     <>
 *       <Robot jointAngles={jointAngles || []} />
 *       <PlaybackControls isPlaying={isPlaying} onPlay={play} onPause={pause} />
 *     </>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type {
  Pose3D,
  Position3D,
  Quaternion,
  JointAngles,
} from '../coordinates/types';
import type { UseRobotKinematicsReturn } from '../coordinates/useRobotKinematics';

// =============================================================================
// Types
// =============================================================================

/**
 * Pose waypoint in Z-up coordinates
 */
export interface PoseWaypoint {
  /** Waypoint position in Z-up coordinates [x, y, z] */
  position: Position3D;
  /** Waypoint orientation as quaternion [x, y, z, w] */
  quaternion: Quaternion;
  /** Optional label */
  label?: string;
  /** Velocity at this point (optional, mm/s) */
  velocity?: number;
  /** Blend radius (optional, mm) */
  blendRadius?: number;
  /** Time at this waypoint (optional, seconds from trajectory start) */
  time?: number;
  /** Process-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Pose trajectory definition
 */
export interface PoseTrajectory {
  /** Unique identifier */
  id: string;
  /** Trajectory name */
  name: string;
  /** Waypoints */
  waypoints: PoseWaypoint[];
  /** Total duration in seconds */
  duration?: number;
  /** Process type */
  processType?: string;
}

/**
 * Playback state
 */
export type PosePlaybackState =
  | 'idle'       // Not playing
  | 'playing'    // Playing forward
  | 'paused'     // Paused
  | 'completed'; // Reached end

/**
 * Options for usePoseTrajectoryPlayer hook
 */
export interface UsePoseTrajectoryPlayerOptions {
  /** Kinematics instance from useRobotKinematics */
  kinematics: UseRobotKinematicsReturn;
  /** Initial trajectory (optional) */
  trajectory?: PoseTrajectory | null;
  /** Initial playback speed multiplier */
  initialSpeed?: number;
  /** Default duration when trajectory.duration is not specified (seconds) */
  defaultDuration?: number;
  /** Whether to loop playback */
  loop?: boolean;
  /** Auto-play when trajectory is loaded */
  autoPlay?: boolean;
  /** Callback when playback completes */
  onComplete?: () => void;
  /** Callback when pose updates */
  onPoseUpdate?: (pose: Pose3D, position: number) => void;
  /** Callback when joint angles update */
  onJointAnglesUpdate?: (angles: JointAngles, position: number) => void;
  /** Callback when IK fails */
  onIKError?: (position: number, pose: Pose3D) => void;
}

/**
 * Return type for usePoseTrajectoryPlayer hook
 */
export interface UsePoseTrajectoryPlayerResult {
  // State
  /** Current playback state */
  state: PosePlaybackState;
  /** Whether currently playing */
  isPlaying: boolean;
  /** Playback position (0-1) */
  position: number;
  /** Playback speed multiplier */
  speed: number;
  /** Current interpolated pose */
  currentPose: Pose3D | null;
  /** Current joint angles from IK */
  jointAngles: JointAngles | null;
  /** Current waypoint index */
  currentWaypointIndex: number;
  /** Loaded trajectory */
  trajectory: PoseTrajectory | null;
  /** Whether trajectory is loaded and valid */
  hasTrajectory: boolean;
  /** Last IK error (if any) */
  ikError: string | null;

  // Controls
  /** Load a trajectory */
  load: (trajectory: PoseTrajectory) => void;
  /** Clear loaded trajectory */
  clear: () => void;
  /** Start or resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Stop and reset to beginning */
  stop: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Seek to position (0-1) */
  seek: (position: number) => void;
  /** Set playback speed multiplier */
  setSpeed: (speed: number) => void;
  /** Advance playback by delta time (call from useFrame) */
  tick: (deltaSeconds: number) => void;
  /** Get interpolated pose at specific position (0-1) */
  getPoseAt: (position: number) => Pose3D | null;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_DURATION = 10; // seconds
const DEFAULT_SPEED = 1;
const MIN_SPEED = 0.1;
const MAX_SPEED = 10;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * usePoseTrajectoryPlayer - TCP pose trajectory playback with IK
 */
export function usePoseTrajectoryPlayer(
  options: UsePoseTrajectoryPlayerOptions
): UsePoseTrajectoryPlayerResult {
  const {
    kinematics,
    trajectory: initialTrajectory = null,
    initialSpeed = DEFAULT_SPEED,
    defaultDuration = DEFAULT_DURATION,
    loop = false,
    autoPlay = false,
    onComplete,
    onPoseUpdate,
    onJointAnglesUpdate,
    onIKError,
  } = options;

  const { ready, ikTcp } = kinematics;

  // State
  const [trajectory, setTrajectory] = useState<PoseTrajectory | null>(initialTrajectory);
  const [playbackState, setPlaybackState] = useState<PosePlaybackState>('idle');
  const [position, setPosition] = useState(0);
  const [speed, setSpeedInternal] = useState(initialSpeed);
  const [currentPose, setCurrentPose] = useState<Pose3D | null>(null);
  const [jointAngles, setJointAngles] = useState<JointAngles | null>(null);
  const [ikError, setIkError] = useState<string | null>(null);

  // Refs for callbacks
  const onCompleteRef = useRef(onComplete);
  const onPoseUpdateRef = useRef(onPoseUpdate);
  const onJointAnglesUpdateRef = useRef(onJointAnglesUpdate);
  const onIKErrorRef = useRef(onIKError);
  const jointAnglesRef = useRef<JointAngles | null>(null);

  // Update callback refs
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onPoseUpdateRef.current = onPoseUpdate;
    onJointAnglesUpdateRef.current = onJointAnglesUpdate;
    onIKErrorRef.current = onIKError;
  }, [onComplete, onPoseUpdate, onJointAnglesUpdate, onIKError]);

  useEffect(() => {
    jointAnglesRef.current = jointAngles;
  }, [jointAngles]);

  // Computed values
  const isPlaying = playbackState === 'playing';
  const hasTrajectory = trajectory !== null && trajectory.waypoints.length >= 2;

  // Current waypoint index
  const currentWaypointIndex = useMemo(() => {
    if (!trajectory || trajectory.waypoints.length < 2) return 0;
    const totalSegments = trajectory.waypoints.length - 1;
    return Math.min(Math.floor(position * totalSegments), totalSegments - 1);
  }, [trajectory, position]);

  // Interpolate pose at given position using SLERP
  const getPoseAt = useCallback((pos: number): Pose3D | null => {
    if (!trajectory || trajectory.waypoints.length < 2) return null;

    const clampedPos = Math.max(0, Math.min(1, pos));
    const waypoints = trajectory.waypoints;
    const totalSegments = waypoints.length - 1;
    const segmentFloat = clampedPos * totalSegments;
    const segmentIdx = Math.min(Math.floor(segmentFloat), totalSegments - 1);
    const t = segmentFloat - segmentIdx;

    const wp1 = waypoints[segmentIdx];
    const wp2 = waypoints[segmentIdx + 1];

    if (!wp1 || !wp2) return null;

    // Linear interpolation for position
    const interpPosition: Position3D = [
      wp1.position[0] + t * (wp2.position[0] - wp1.position[0]),
      wp1.position[1] + t * (wp2.position[1] - wp1.position[1]),
      wp1.position[2] + t * (wp2.position[2] - wp1.position[2]),
    ];

    // SLERP interpolation for orientation
    const q1 = new THREE.Quaternion(wp1.quaternion[0], wp1.quaternion[1], wp1.quaternion[2], wp1.quaternion[3]);
    const q2 = new THREE.Quaternion(wp2.quaternion[0], wp2.quaternion[1], wp2.quaternion[2], wp2.quaternion[3]);
    const interpQuat = new THREE.Quaternion().slerpQuaternions(q1, q2, t);

    return {
      position: interpPosition,
      quaternion: [interpQuat.x, interpQuat.y, interpQuat.z, interpQuat.w],
    };
  }, [trajectory]);

  // Load trajectory
  const load = useCallback((traj: PoseTrajectory) => {
    setTrajectory(traj);
    setPosition(0);
    setPlaybackState('idle');
    setIkError(null);

    // Set initial pose
    if (traj.waypoints.length >= 1) {
      const initialPose: Pose3D = {
        position: traj.waypoints[0].position,
        quaternion: traj.waypoints[0].quaternion,
      };
      setCurrentPose(initialPose);
    }

    // Auto-play if enabled
    if (autoPlay && traj.waypoints.length >= 2) {
      setPlaybackState('playing');
    }
  }, [autoPlay]);

  // Clear trajectory
  const clear = useCallback(() => {
    setTrajectory(null);
    setPosition(0);
    setPlaybackState('idle');
    setCurrentPose(null);
    setJointAngles(null);
    setIkError(null);
  }, []);

  // Play
  const play = useCallback(() => {
    if (!hasTrajectory) return;

    if (playbackState === 'completed') {
      setPosition(0);
    }
    setPlaybackState('playing');
  }, [hasTrajectory, playbackState]);

  // Pause
  const pause = useCallback(() => {
    if (playbackState === 'playing') {
      setPlaybackState('paused');
    }
  }, [playbackState]);

  // Stop
  const stop = useCallback(() => {
    setPlaybackState('idle');
    setPosition(0);
    setIkError(null);
  }, []);

  // Toggle
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  // Seek
  const seek = useCallback((pos: number) => {
    const clampedPos = Math.max(0, Math.min(1, pos));
    setPosition(clampedPos);

    // Update pose and compute IK
    const pose = getPoseAt(clampedPos);
    if (pose) {
      setCurrentPose(pose);
      onPoseUpdateRef.current?.(pose, clampedPos);

      // Compute IK
      if (ready && ikTcp) {
        const result = ikTcp(pose, jointAnglesRef.current || []);
        if (result?.success && result.solution) {
          setJointAngles(result.solution);
          setIkError(null);
          onJointAnglesUpdateRef.current?.(result.solution, clampedPos);
        } else {
          setIkError('IK failed at seek position');
          onIKErrorRef.current?.(clampedPos, pose);
        }
      }
    }
  }, [getPoseAt, ready, ikTcp]);

  // Set speed
  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedInternal(Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed)));
  }, []);

  // Tick - advance playback (call from useFrame)
  const tick = useCallback((deltaSeconds: number) => {
    if (!isPlaying || !trajectory || trajectory.waypoints.length < 2) return;

    const duration = trajectory.duration || defaultDuration;
    const newPosition = position + (deltaSeconds * speed) / duration;

    // Check for completion
    if (newPosition >= 1) {
      if (loop) {
        setPosition(newPosition % 1);
      } else {
        setPosition(1);
        setPlaybackState('completed');
        onCompleteRef.current?.();

        // Compute final pose and IK
        const finalPose = getPoseAt(1);
        if (finalPose) {
          setCurrentPose(finalPose);
          onPoseUpdateRef.current?.(finalPose, 1);

          if (ready && ikTcp) {
            const result = ikTcp(finalPose, jointAnglesRef.current || []);
            if (result?.success && result.solution) {
              setJointAngles(result.solution);
              onJointAnglesUpdateRef.current?.(result.solution, 1);
            }
          }
        }
        return;
      }
    } else {
      setPosition(newPosition);
    }

    const effectivePosition = loop ? newPosition % 1 : Math.min(newPosition, 1);

    // Update pose
    const pose = getPoseAt(effectivePosition);
    if (pose) {
      setCurrentPose(pose);
      onPoseUpdateRef.current?.(pose, effectivePosition);

      // Compute IK
      if (ready && ikTcp) {
        const result = ikTcp(pose, jointAnglesRef.current || []);
        if (result?.success && result.solution) {
          setJointAngles(result.solution);
          setIkError(null);
          onJointAnglesUpdateRef.current?.(result.solution, effectivePosition);
        } else {
          setIkError('IK failed during playback');
          onIKErrorRef.current?.(effectivePosition, pose);
        }
      }
    }
  }, [isPlaying, trajectory, position, speed, defaultDuration, loop, ready, ikTcp, getPoseAt]);

  return {
    // State
    state: playbackState,
    isPlaying,
    position,
    speed,
    currentPose,
    jointAngles,
    currentWaypointIndex,
    trajectory,
    hasTrajectory,
    ikError,

    // Controls
    load,
    clear,
    play,
    pause,
    stop,
    toggle,
    seek,
    setSpeed,
    tick,
    getPoseAt,
  };
}
