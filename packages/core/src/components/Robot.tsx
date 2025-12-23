/**
 * RoboViz Robot Component (Placeholder)
 *
 * TODO: Implement robot visualization with URDF rendering
 */

import type { RobotState } from '../types';

export interface RobotProps {
  state: RobotState;
  onSelect?: (id: string) => void;
}

/**
 * Robot component placeholder
 */
export function Robot(_props: RobotProps): React.ReactElement | null {
  // TODO: Implement with Three.js/R3F robot model
  return null;
}
