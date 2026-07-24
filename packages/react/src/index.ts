/**
 * @yuanweima/roboviz-react
 *
 * React bindings for RoboViz - A complete 3D robot visualization library.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core - Factory and Instance
// =============================================================================

export { createRoboViz, createMultipleRoboViz, createSimpleRoboViz } from './core/createRoboViz';
export { RoboVizInstance, isRoboVizInstance } from './core/RoboVizInstance';
export { EventBus, createEventBus } from './core/EventBus';

// =============================================================================
// React Components
// =============================================================================

export { RoboViz, RoboVizHeadless } from './components/RoboViz';
export {
  RoboVizErrorBoundary,
  type RoboVizErrorBoundaryProps,
} from './components/RoboVizErrorBoundary';

// =============================================================================
// React Context
// =============================================================================

export {
  RoboVizProvider,
  useRoboVizInstance,
  useRoboVizInstanceOptional,
  useRoboVizStore,
  useRoboVizEventBus,
  useRoboVizActions,
  // Convenience hooks
  useRobots,
  useTrajectories,
  useWaypoints,
  useObstacles,
  usePlaybackState,
  useSceneConfig,
  useCameraState,
  useSelectedObjectId,
  useSelectedWaypointId,
  useIsConnected,
} from './context/RoboVizProvider';

// =============================================================================
// Hooks
// =============================================================================

export { useRoboViz } from './hooks/useRoboViz';
export { usePlayback } from './hooks/usePlayback';
export { useRobotJoints } from './hooks/useRobotJoints';
export {
  useEvents,
  useEventValue,
  useEventCallback,
  useMultipleEvents,
  useConnection,
} from './hooks/useEvents';

// =============================================================================
// Store
// =============================================================================

export {
  createScopedStore,
  createSelector,
  shallow,
  type ScopedVizStore,
  type ScopedVizState,
  type ScopedStoreActions,
  type CreateScopedStoreOptions,
} from './store/createScopedStore';

// =============================================================================
// Types
// =============================================================================

export type {
  // Configuration
  RoboVizConfig,
  TransportConfig,
  WebSocketTransportConfig,
  PostMessageTransportConfig,
  DirectTransportConfig,
  NoTransportConfig,

  // Instance
  IRoboVizInstance,
  RoboVizState,

  // Events
  RoboVizEventMap,
  RoboVizEventHandler,

  // API Types
  AddRobotConfig,
  AddTrajectoryConfig,
  AddWaypointConfig,
  AddObstacleConfig,
  PlayTrajectoryOptions,

  // Component Props
  RoboVizProps,
  RoboVizProviderProps,

  // Hook Return Types
  UseRoboVizReturn,
  UsePlaybackReturn,
  UseRobotJointsReturn,
  UseEventsReturn,
} from './types';

// Re-export core types for convenience
export type {
  Vector3,
  Vector3Like,
  Vector3Tuple,
  Quaternion,
  Transform,
  Pose,
  SceneConfig,
  CameraState,
  RobotState,
  TrajectoryState,
  WaypointData,
  ObstacleData,
  PrimitiveObstacle,
  UrdfObstacle,
  PrimitiveShape,
  PrimitiveParams,
  PlaybackState,
  RobotOptions,
  TrajectoryData,
  GridOptions,
  LightingOptions,
  OrbitControlsOptions,
} from '@yuanweima/roboviz-core';

// =============================================================================
// Re-export Core Components for Direct Use
// =============================================================================

export {
  RoboVizCore,
  Robot,
  Scene,
  Waypoint,
  WaypointGroup,
  Obstacle,
} from '@yuanweima/roboviz-core';

// Re-export core types
export type {
  RoboVizCoreProps,
  RobotProps,
  SceneProps,
  WaypointProps,
  WaypointGroupProps,
  ObstacleProps,
} from '@yuanweima/roboviz-core';

// =============================================================================
// Re-export Advanced Features from Core
// =============================================================================

// Trajectory Player
export {
  useTrajectoryPlayer,
  type TrajectoryPlayerState,
  type TrajectoryPlayerControls,
  type TrajectoryPlayerOptions,
} from '@yuanweima/roboviz-core';

// Helper Components
export {
  SafetyZoneVisual,
  type SafetyZoneVisualProps,
} from '@yuanweima/roboviz-core';

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
} from '@yuanweima/roboviz-core';

// Collision hooks and types
export {
  useCollision,
  type UseCollisionOptions,
  type UseCollisionState,
  type UseCollisionActions,
} from '@yuanweima/roboviz-core';

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
} from '@yuanweima/roboviz-core';
