/**
 * @aspect/roboviz-react
 *
 * React bindings for RoboViz
 */

// Main component and hooks
export {
  RoboViz,
  useRoboViz,
  usePlayback,
  useRobotJoints,
  type RoboVizProps,
} from './RoboViz';

// Re-export core components for direct use
export {
  RoboVizCore,
  Robot,
  Scene,
  Trajectory,
  Waypoint,
  WaypointGroup,
  Obstacle,
  useVizStore,
} from './RoboViz';

// Re-export types from core
export type {
  RoboVizCoreProps,
  SceneConfig,
  CameraState,
  RobotState,
  TrajectoryState,
  WaypointData,
  ObstacleData,
  Vector3,
} from './RoboViz';

// Additional types from core
export type {
  Quaternion,
  Transform,
  Pose,
  RobotOptions,
  RobotInfo,
  TrajectoryData,
  PlaybackState,
  PlaybackOptions,
  PrimitiveShape,
  PrimitiveParams,
  PrimitiveObstacle,
  UrdfObstacle,
  GridOptions,
  LightingOptions,
  OrbitControlsOptions,
} from '@aspect/roboviz-core';

// Remote control hook
export {
  useRemoteControl,
  type RemoteControlConfig,
  type RemoteControlState,
  type RemoteControlActions,
  type UseRemoteControlReturn,
  type RemoteSafetyZone,
  type RemoteObstacle,
  type RemoteWaypoint,
  type RemoteTrajectory,
} from '@aspect/roboviz-core';

// Helper components
export {
  SafetyZoneVisual,
  type SafetyZoneVisualProps,
} from '@aspect/roboviz-core';

// Collision visualization components
export {
  // Main component
  CollisionVisualizer,
  CollisionStatusBadge,
  useCollisionVisualization,
  // Safety zones (SafetyZone3D to avoid conflict with SafetyZone type)
  SafetyZone3D,
  SafetyZoneList,
  // Collision geometry
  CollisionGeometryVisual,
  CollisionGeometryList,
  // Contact points
  ContactPoint,
  ContactPointList,
  PenetrationVector,
  CollisionIndicator,
  // Types
  type CollisionVisualizerProps,
  type SafetyZoneProps,
  type SafetyZoneListProps,
  type CollisionGeometryVisualProps,
  type CollisionGeometryListProps,
  type ContactPointProps,
  type ContactPointListProps,
  type CollisionStatusBadgeProps,
} from '@aspect/roboviz-core';

// Collision hooks and types
export {
  useCollision,
  type UseCollisionOptions,
  type UseCollisionState,
  type UseCollisionActions,
} from '@aspect/roboviz-core';

// Collision types
export type {
  CollisionGeometry,
  CollisionGeometryType,
  CollisionGeometryParams,
  SafetyZone as SafetyZoneType,
  SafetyLevel,
  SafetyZoneVisualization,
  CollisionResult,
  CollisionPair,
  CollisionVisualizationConfig,
  SafetyZoneTriggerState,
} from '@aspect/roboviz-core';

// Trajectory playback hook
export {
  useTrajectoryPlayer,
  type TrajectoryPlayerState,
  type TrajectoryPlayerControls,
  type TrajectoryPlayerOptions,
} from '@aspect/roboviz-core';
