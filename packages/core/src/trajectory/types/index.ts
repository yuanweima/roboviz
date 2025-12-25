/**
 * Trajectory System Types
 */

// Waypoint types
export type {
  WaypointStatus,
  WaypointCollisionInfo,
  WaypointMessage,
  Waypoint,
  WaypointCreateData,
  WaypointUpdateData,
} from './waypoint';

export {
  waypointHasIssues,
  getWaypointSeverity,
  createWaypoint,
} from './waypoint';

// Trajectory types
export type {
  TrajectoryStatus,
  InterpolationType,
  Trajectory,
  TrajectorySegment,
  TrajectoryCreateData,
  TrajectoryUpdateData,
  TrajectoryGenerateRequest,
  TrajectoryGenerateResponse,
} from './trajectory';

export {
  createTrajectory,
  updateTrajectoryStats,
  isTrajectoryExecutable,
  getNextWaypointWithIssue,
} from './trajectory';
