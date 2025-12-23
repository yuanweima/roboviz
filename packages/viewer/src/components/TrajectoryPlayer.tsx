/**
 * TrajectoryPlayer Component
 *
 * Handles trajectory playback animation and updates robot joint angles.
 * Uses useFrame for smooth animation updates.
 */
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useViewerStore } from '../store/viewerStore';
import type { TrajectoryData } from '../types';

/**
 * Interpolate between trajectory positions at a given time
 */
function interpolatePositions(data: TrajectoryData, time: number): number[] {
  const { times, positions } = data;
  const duration = times[times.length - 1] || 0;

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

interface TrajectoryPlayerProps {
  /** Callback when trajectory playback ends */
  onTrajectoryEnded?: (trajectoryId: string) => void;
}

/**
 * TrajectoryPlayer manages trajectory playback using React Three Fiber's useFrame
 */
export function TrajectoryPlayer({ onTrajectoryEnded }: TrajectoryPlayerProps) {
  const {
    trajectories,
    playback,
    setPlayback,
    setRobotJoints,
    stopPlayback,
  } = useViewerStore();

  const timeRef = useRef(0);
  const lastUpdateRef = useRef(0);

  // Get active trajectory
  const activeTrajectory = playback.activeTrajectoryId
    ? trajectories.get(playback.activeTrajectoryId)
    : null;

  // Calculate duration from trajectory data
  const duration = activeTrajectory
    ? activeTrajectory.data.times[activeTrajectory.data.times.length - 1] || 0
    : 0;

  // Reset time when starting new playback
  useEffect(() => {
    if (playback.isPlaying && playback.currentTime === 0) {
      timeRef.current = 0;
    }
  }, [playback.isPlaying, playback.currentTime]);

  // Animation frame update
  useFrame((_, delta) => {
    if (!playback.isPlaying || !activeTrajectory || duration <= 0) {
      return;
    }

    // Advance time
    timeRef.current += delta * playback.speed;

    // Check for completion
    if (timeRef.current >= duration) {
      if (playback.loop) {
        // Loop back to start
        timeRef.current = timeRef.current % duration;
      } else {
        // Stop at end
        timeRef.current = duration;
        stopPlayback();
        onTrajectoryEnded?.(activeTrajectory.id);
        return;
      }
    }

    // Calculate progress
    const progress = duration > 0 ? timeRef.current / duration : 0;

    // Interpolate joint angles
    const interpolatedAngles = interpolatePositions(activeTrajectory.data, timeRef.current);

    // Update robot joints
    if (activeTrajectory.robotId && interpolatedAngles.length > 0) {
      setRobotJoints(activeTrajectory.robotId, interpolatedAngles);
    }

    // Throttle state updates to avoid too many renders (~30fps for UI updates)
    const now = performance.now();
    if (now - lastUpdateRef.current > 33) {
      lastUpdateRef.current = now;
      setPlayback({
        currentTime: timeRef.current,
        progress,
      });
    }
  });

  // This component doesn't render anything visible
  return null;
}

export default TrajectoryPlayer;
