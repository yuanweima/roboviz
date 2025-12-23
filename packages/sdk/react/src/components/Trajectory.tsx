/**
 * Trajectory - Animated trajectory playback component
 *
 * Simplifies trajectory visualization and playback. Internally manages
 * the useTrajectoryPlayer hook so users don't need to.
 *
 * @example
 * ```tsx
 * // Auto-play trajectory
 * <Trajectory data={trajectoryData} autoPlay />
 *
 * // Controlled playback
 * <Trajectory
 *   data={trajectoryData}
 *   playing={isPlaying}
 *   speed={1.5}
 *   loop
 *   onProgress={(progress) => console.log(`${progress * 100}%`)}
 *   onComplete={() => console.log('Done!')}
 * />
 *
 * // With robot binding
 * <Trajectory data={trajectoryData} robotId="my_robot" autoPlay />
 * ```
 */

import * as React from 'react';
import {
  Trajectory as CoreTrajectory,
  useTrajectoryPlayer,
  ProgressIndicator,
  type TrajectoryData,
} from '@aspect/roboviz-core';

export interface TrajectoryProps {
  /** Trajectory data with times and positions */
  data: TrajectoryData;

  /** Robot ID to bind trajectory playback to */
  robotId?: string;

  /** Start playing automatically (default: false) */
  autoPlay?: boolean;

  /** Controlled playing state (overrides autoPlay) */
  playing?: boolean;

  /** Playback speed multiplier (default: 1) */
  speed?: number;

  /** Loop playback (default: false) */
  loop?: boolean;

  /** Show trajectory path visualization (default: true) */
  showPath?: boolean;

  /** Path color (default: '#00ff88') */
  pathColor?: string;

  /** Show progress indicator (default: false) */
  showProgress?: boolean;

  /** Progress indicator position */
  progressPosition?: [number, number, number];

  /** Called on each frame with current joint angles */
  onJoints?: (joints: number[]) => void;

  /** Called with progress (0-1) */
  onProgress?: (progress: number) => void;

  /** Called when playback completes */
  onComplete?: () => void;
}

/**
 * Trajectory - Self-contained trajectory visualization and playback
 */
export function Trajectory({
  data,
  robotId,
  autoPlay = false,
  playing,
  speed = 1,
  loop = false,
  showPath = true,
  pathColor = '#00ff88',
  showProgress = false,
  progressPosition = [0, 0.01, -1],
  onJoints,
  onProgress,
  onComplete,
}: TrajectoryProps): React.JSX.Element {
  // Use the trajectory player hook internally
  const [playerState, playerControls] = useTrajectoryPlayer(data, {
    speed,
    loop,
    onComplete,
  });

  // Handle autoPlay
  React.useEffect(() => {
    if (autoPlay && data) {
      playerControls.play();
    }
  }, [autoPlay, data, playerControls]);

  // Handle controlled playing state
  React.useEffect(() => {
    if (playing !== undefined) {
      if (playing && !playerState.isPlaying) {
        playerControls.play();
      } else if (!playing && playerState.isPlaying) {
        playerControls.pause();
      }
    }
  }, [playing, playerState.isPlaying, playerControls]);

  // Update speed when prop changes
  React.useEffect(() => {
    playerControls.setSpeed(speed);
  }, [speed, playerControls]);

  // Update loop when prop changes
  React.useEffect(() => {
    playerControls.setLoop(loop);
  }, [loop, playerControls]);

  // Report joints to parent
  React.useEffect(() => {
    if (onJoints && playerState.currentAngles.length > 0) {
      onJoints(playerState.currentAngles);
    }
  }, [playerState.currentAngles, onJoints]);

  // Report progress to parent
  React.useEffect(() => {
    if (onProgress) {
      onProgress(playerState.progress);
    }
  }, [playerState.progress, onProgress]);

  // Generate trajectory ID
  const trajectoryId = React.useMemo(
    () => `trajectory_${robotId || 'default'}`,
    [robotId]
  );

  return (
    <>
      {/* Trajectory path visualization */}
      <CoreTrajectory
        id={trajectoryId}
        data={data}
        showPath={showPath}
        pathColor={pathColor}
      />

      {/* Progress indicator */}
      {showProgress && (
        <ProgressIndicator
          progress={playerState.progress}
          position={progressPosition}
          width={2}
          height={0.05}
          color={pathColor}
          backgroundColor="#333"
        />
      )}
    </>
  );
}

export default Trajectory;
