/**
 * RoboViz Waypoint Component (Placeholder)
 *
 * TODO: Implement waypoint visualization
 */

import type { WaypointData } from '../types';

export interface WaypointProps {
  data: WaypointData;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

/**
 * Waypoint component placeholder
 */
export function Waypoint(_props: WaypointProps): React.ReactElement | null {
  // TODO: Implement with Three.js mesh/sprite
  return null;
}
