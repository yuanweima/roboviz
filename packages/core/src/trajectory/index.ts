/**
 * Trajectory System
 *
 * Shared trajectory infrastructure for process plugins.
 * Provides waypoint management, visualization, and playback.
 *
 * @example
 * ```tsx
 * import {
 *   useTrajectoryStore,
 *   TrajectoryPath,
 *   TrajectoryInspector,
 *   TrajectoryTimeline,
 * } from '@roboviz/core/trajectory';
 *
 * function TrajectoryEditor() {
 *   const trajectory = useActiveTrajectory();
 *
 *   return (
 *     <>
 *       <TrajectoryPath trajectory={trajectory} />
 *       <TrajectoryInspector trajectory={trajectory} />
 *       <TrajectoryTimeline trajectory={trajectory} />
 *     </>
 *   );
 * }
 * ```
 */

// Types
export * from './types';

// Store
export {
  useTrajectoryStore,
  useActiveTrajectory,
  useAllTrajectories,
  useSelectedWaypoint,
  usePlaybackState,
} from './store/trajectoryStore';

export type { TrajectoryStoreState } from './store/trajectoryStore';

// Components
export * from './components';
