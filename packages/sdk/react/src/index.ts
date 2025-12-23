/**
 * @aspect/roboviz-react
 *
 * Simple, user-friendly React components for robot visualization.
 *
 * @example
 * ```tsx
 * import { RoboViz, Robot, Trajectory, SafetyZone } from '@aspect/roboviz-react';
 *
 * function App() {
 *   return (
 *     <RoboViz>
 *       <Robot urdf="/models/fanuc.urdf" />
 *       <Trajectory data={trajectory} autoPlay />
 *       <SafetyZone radius={0.8} />
 *     </RoboViz>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Main Components
// =============================================================================
export { RoboViz, type RoboVizProps } from './components/RoboViz';
export { Robot, type RobotProps } from './components/Robot';
export { Trajectory, type TrajectoryProps } from './components/Trajectory';
export { Obstacle, type ObstacleProps } from './components/Obstacle';
export { Waypoint, Waypoints, type WaypointProps, type WaypointsProps } from './components/Waypoint';

// =============================================================================
// Environment Components
// =============================================================================
export { SafetyZone, type SafetyZoneProps } from './components/SafetyZone';
export { Workspace, type WorkspaceProps } from './components/Workspace';

// =============================================================================
// Hooks
// =============================================================================
export {
  useRemoteControl,
  type RemoteControlConfig,
  type UseRemoteControlReturn,
} from './hooks/useRemoteControl';

// =============================================================================
// Types (re-export common types for convenience)
// =============================================================================
export type {
  Vector3,
  Quaternion,
  Transform,
  Pose,
  TrajectoryData,
  WaypointData,
  ObstacleData,
} from '@aspect/roboviz-core';
