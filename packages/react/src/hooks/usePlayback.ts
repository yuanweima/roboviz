/**
 * usePlayback - Hook for trajectory playback control
 *
 * Provides a convenient API for controlling trajectory playback
 * with play, pause, stop, seek, and speed controls.
 */

import * as React from 'react';
import { useRoboVizInstance, useRoboVizStore } from '../context/RoboVizProvider';
import type { UsePlaybackReturn } from '../types';

/**
 * Hook for controlling trajectory playback
 *
 * @returns Playback state and control functions
 *
 * @example
 * ```tsx
 * function PlaybackControls() {
 *   const {
 *     isPlaying,
 *     currentTime,
 *     progress,
 *     speed,
 *     loop,
 *     play,
 *     pause,
 *     stop,
 *     seek,
 *     setSpeed,
 *     setLoop,
 *   } = usePlayback();
 *
 *   return (
 *     <div>
 *       <p>Time: {currentTime.toFixed(2)}s ({(progress * 100).toFixed(0)}%)</p>
 *       <p>Speed: {speed}x</p>
 *
 *       <button onClick={() => play()}>
 *         {isPlaying ? 'Playing...' : 'Play'}
 *       </button>
 *       <button onClick={pause}>Pause</button>
 *       <button onClick={stop}>Stop</button>
 *
 *       <input
 *         type="range"
 *         min={0}
 *         max={100}
 *         value={progress * 100}
 *         onChange={(e) => seek(parseFloat(e.target.value) / 100 * duration)}
 *       />
 *
 *       <select
 *         value={speed}
 *         onChange={(e) => setSpeed(parseFloat(e.target.value))}
 *       >
 *         <option value={0.5}>0.5x</option>
 *         <option value={1}>1x</option>
 *         <option value={2}>2x</option>
 *       </select>
 *
 *       <label>
 *         <input
 *           type="checkbox"
 *           checked={loop}
 *           onChange={(e) => setLoop(e.target.checked)}
 *         />
 *         Loop
 *       </label>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlayback(): UsePlaybackReturn {
  const instance = useRoboVizInstance();
  const playback = useRoboVizStore((state) => state.playback);
  const trajectories = useRoboVizStore((state) => state.trajectories);

  // Calculate progress based on trajectory duration
  const progress = React.useMemo(() => {
    if (!playback.activeTrajectoryId) return 0;

    const trajectory = trajectories.get(playback.activeTrajectoryId);
    if (!trajectory || trajectory.data.duration === 0) return 0;

    return playback.currentTime / trajectory.data.duration;
  }, [playback.activeTrajectoryId, playback.currentTime, trajectories]);

  // Play a trajectory (or resume current)
  const play = React.useCallback(
    (trajectoryId?: string) => {
      if (trajectoryId) {
        instance.playTrajectory(trajectoryId);
      } else if (playback.activeTrajectoryId) {
        // Resume current trajectory
        instance.playTrajectory(playback.activeTrajectoryId, {
          startTime: playback.currentTime,
          speed: playback.speed,
          loop: playback.loop,
        });
      } else if (trajectories.size > 0) {
        // Play first trajectory
        const firstId = Array.from(trajectories.keys())[0];
        instance.playTrajectory(firstId);
      }
    },
    [instance, playback, trajectories]
  );

  // Pause playback
  const pause = React.useCallback(() => {
    instance.pauseTrajectory();
  }, [instance]);

  // Stop playback
  const stop = React.useCallback(() => {
    instance.stopTrajectory();
  }, [instance]);

  // Seek to a specific time
  const seek = React.useCallback(
    (time: number) => {
      instance.seekTrajectory(time);
    },
    [instance]
  );

  // Set playback speed
  const setSpeed = React.useCallback(
    (speed: number) => {
      const store = (instance as any).getStore?.();
      if (store) {
        store.getState().setPlayback({ speed });
      }
    },
    [instance]
  );

  // Set loop mode
  const setLoop = React.useCallback(
    (loop: boolean) => {
      const store = (instance as any).getStore?.();
      if (store) {
        store.getState().setPlayback({ loop });
      }
    },
    [instance]
  );

  return {
    isPlaying: playback.isPlaying,
    currentTime: playback.currentTime,
    progress,
    speed: playback.speed,
    loop: playback.loop,
    activeTrajectoryId: playback.activeTrajectoryId,

    play,
    pause,
    stop,
    seek,
    setSpeed,
    setLoop,
  };
}
