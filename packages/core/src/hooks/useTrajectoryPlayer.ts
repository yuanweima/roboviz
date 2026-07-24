/**
 * useTrajectoryPlayer Hook
 *
 * Provides trajectory playback functionality with interpolation.
 * Eliminates the need for manual playback logic in demo/application code.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { TrajectoryData } from '../types';

/**
 * Playback state returned by the hook
 */
export interface TrajectoryPlayerState {
  /** Whether playback is currently active */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Progress from 0 to 1 */
  progress: number;
  /** Interpolated joint angles at current time */
  currentAngles: number[];
  /** Whether playback has completed (for non-looping mode) */
  isComplete: boolean;
  /** Current playback speed multiplier */
  speed: number;
  /** Whether looping is enabled */
  loop: boolean;
}

/**
 * Playback controls returned by the hook
 */
export interface TrajectoryPlayerControls {
  /** Start or resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Stop playback and reset to beginning */
  stop: () => void;
  /** Toggle between play and pause */
  toggle: () => void;
  /** Seek to a specific time in seconds */
  seek: (time: number) => void;
  /** Seek to a progress value (0-1) */
  seekProgress: (progress: number) => void;
  /** Set playback speed (1 = normal, 2 = double speed, etc.) */
  setSpeed: (speed: number) => void;
  /** Enable or disable looping */
  setLoop: (loop: boolean) => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Options for the trajectory player
 */
export interface TrajectoryPlayerOptions {
  /** Initial playback speed (default: 1) */
  speed?: number;
  /** Whether to loop playback (default: false) */
  loop?: boolean;
  /** Whether to auto-play when trajectory is provided (default: false) */
  autoPlay?: boolean;
  /** Callback when playback completes (only called in non-loop mode) */
  onComplete?: () => void;
  /** Callback on each progress update */
  onProgress?: (progress: number, time: number) => void;
  /** Callback when playback starts */
  onPlay?: () => void;
  /** Callback when playback pauses */
  onPause?: () => void;
  /** Callback when playback stops */
  onStop?: () => void;
}

/**
 * Interpolate between trajectory positions
 */
function interpolatePositions(
  trajectory: TrajectoryData,
  time: number
): number[] {
  const { times, positions, duration } = trajectory;

  if (positions.length === 0) {
    return [];
  }

  if (positions.length === 1) {
    return positions[0];
  }

  // Clamp time to valid range
  const clampedTime = Math.max(0, Math.min(time, duration));

  // Find the two surrounding keyframes
  let lowerIndex = 0;
  let upperIndex = 1;

  for (let i = 0; i < times.length - 1; i++) {
    if (times[i] <= clampedTime && times[i + 1] >= clampedTime) {
      lowerIndex = i;
      upperIndex = i + 1;
      break;
    }
    if (times[i] > clampedTime) {
      // Time is before this keyframe
      lowerIndex = Math.max(0, i - 1);
      upperIndex = i;
      break;
    }
  }

  // Handle edge case where time is at or past the end
  if (clampedTime >= times[times.length - 1]) {
    return positions[positions.length - 1];
  }

  // Calculate interpolation factor
  const lowerTime = times[lowerIndex];
  const upperTime = times[upperIndex];
  const timeDiff = upperTime - lowerTime;

  if (timeDiff === 0) {
    return positions[lowerIndex];
  }

  const t = (clampedTime - lowerTime) / timeDiff;

  // Linear interpolation between positions
  const lowerPos = positions[lowerIndex];
  const upperPos = positions[upperIndex];

  return lowerPos.map((val, i) => {
    const nextVal = upperPos[i] ?? val;
    return val + t * (nextVal - val);
  });
}

/**
 * Hook for playing back trajectory data with full playback controls.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [trajectory, setTrajectory] = useState<TrajectoryData | null>(null);
 *
 *   const [state, controls] = useTrajectoryPlayer(trajectory, {
 *     loop: true,
 *     speed: 1.5,
 *     onComplete: () => console.log('Playback complete'),
 *   });
 *
 *   return (
 *     <>
 *       <Robot jointAngles={state.currentAngles} />
 *       <button onClick={controls.toggle}>
 *         {state.isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *       <input
 *         type="range"
 *         min={0}
 *         max={1}
 *         step={0.01}
 *         value={state.progress}
 *         onChange={(e) => controls.seekProgress(parseFloat(e.target.value))}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useTrajectoryPlayer(
  trajectory: TrajectoryData | null,
  options: TrajectoryPlayerOptions = {}
): [TrajectoryPlayerState, TrajectoryPlayerControls] {
  const {
    speed: initialSpeed = 1,
    loop: initialLoop = false,
    autoPlay = false,
    onComplete,
    onProgress,
    onPlay,
    onPause,
    onStop,
  } = options;

  // Playback state
  const [isPlaying, setIsPlaying] = useState(autoPlay && trajectory !== null);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeedState] = useState(initialSpeed);
  const [loop, setLoopState] = useState(initialLoop);
  const [isComplete, setIsComplete] = useState(false);

  // Refs for stable callback access
  const timeRef = useRef(0);
  const trajectoryRef = useRef(trajectory);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onStopRef = useRef(onStop);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onProgressRef.current = onProgress;
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onStopRef.current = onStop;
  }, [onComplete, onProgress, onPlay, onPause, onStop]);

  // Reset when trajectory changes
  useEffect(() => {
    const prevTrajectory = trajectoryRef.current;
    trajectoryRef.current = trajectory;

    // If trajectory changed (not just a reference update), reset
    if (trajectory !== prevTrajectory) {
      timeRef.current = 0;
      setCurrentTime(0);
      setIsComplete(false);

      if (autoPlay && trajectory !== null) {
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }
  }, [trajectory, autoPlay]);

  // Playback animation loop
  useFrame((_, delta) => {
    if (!isPlaying || !trajectory || trajectory.duration <= 0) {
      return;
    }

    // Advance time
    timeRef.current += delta * speed;

    // Check for completion
    if (timeRef.current >= trajectory.duration) {
      if (loop) {
        // Loop back to start
        timeRef.current = timeRef.current % trajectory.duration;
      } else {
        // Stop at end
        timeRef.current = trajectory.duration;
        setIsPlaying(false);
        setIsComplete(true);
        onCompleteRef.current?.();
      }
    }

    // Update state
    setCurrentTime(timeRef.current);

    // Progress callback
    if (onProgressRef.current) {
      const progress = trajectory.duration > 0
        ? timeRef.current / trajectory.duration
        : 0;
      onProgressRef.current(progress, timeRef.current);
    }
  });

  // Calculate derived state
  const progress = trajectory && trajectory.duration > 0
    ? Math.min(currentTime / trajectory.duration, 1)
    : 0;

  const currentAngles = trajectory
    ? interpolatePositions(trajectory, currentTime)
    : [];

  // Controls
  const play = useCallback(() => {
    if (!trajectory) return;

    // If at end, restart from beginning
    if (isComplete) {
      timeRef.current = 0;
      setCurrentTime(0);
      setIsComplete(false);
    }

    setIsPlaying(true);
    onPlayRef.current?.();
  }, [trajectory, isComplete]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    onPauseRef.current?.();
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    timeRef.current = 0;
    setCurrentTime(0);
    setIsComplete(false);
    onStopRef.current?.();
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (!trajectory) return;

    const clampedTime = Math.max(0, Math.min(time, trajectory.duration));
    timeRef.current = clampedTime;
    setCurrentTime(clampedTime);
    setIsComplete(clampedTime >= trajectory.duration);
  }, [trajectory]);

  const seekProgress = useCallback((progressValue: number) => {
    if (!trajectory) return;

    const clampedProgress = Math.max(0, Math.min(progressValue, 1));
    const time = clampedProgress * trajectory.duration;
    seek(time);
  }, [trajectory, seek]);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(Math.max(0.1, newSpeed));
  }, []);

  const setLoop = useCallback((newLoop: boolean) => {
    setLoopState(newLoop);
  }, []);

  const reset = useCallback(() => {
    stop();
    setSpeedState(initialSpeed);
    setLoopState(initialLoop);
  }, [stop, initialSpeed, initialLoop]);

  const state: TrajectoryPlayerState = {
    isPlaying,
    currentTime,
    progress,
    currentAngles,
    isComplete,
    speed,
    loop,
  };

  const controls: TrajectoryPlayerControls = {
    play,
    pause,
    stop,
    toggle,
    seek,
    seekProgress,
    setSpeed,
    setLoop,
    reset,
  };

  return [state, controls];
}

export default useTrajectoryPlayer;
