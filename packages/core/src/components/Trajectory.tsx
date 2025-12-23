/**
 * RoboViz Trajectory Component (Placeholder)
 *
 * TODO: Implement trajectory visualization
 */

import type { TrajectoryState } from '../types';

export interface TrajectoryProps {
  state: TrajectoryState;
  showPoints?: boolean;
  showLine?: boolean;
}

/**
 * Trajectory component placeholder
 */
export function Trajectory(_props: TrajectoryProps): React.ReactElement | null {
  // TODO: Implement with Three.js Line/Points
  return null;
}
