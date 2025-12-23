/**
 * @aspect/roboviz-react
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
  PlaybackState,
  RobotOptions,
  TrajectoryData,
  GridOptions,
  LightingOptions,
  OrbitControlsOptions,
} from '@aspect/roboviz-core';

// =============================================================================
// Re-export Core Components for Direct Use
// =============================================================================

export {
  RoboVizCore,
  Robot,
  Scene,
  Trajectory,
  Waypoint,
  WaypointGroup,
  Obstacle,
} from '@aspect/roboviz-core';

// Re-export core types
export type {
  RoboVizCoreProps,
  RobotProps,
  SceneProps,
  TrajectoryProps,
  WaypointProps,
  WaypointGroupProps,
  ObstacleProps,
} from '@aspect/roboviz-core';

// =============================================================================
// Re-export Advanced Features from Core
// =============================================================================

// Transport
export {
  createDirectTransport,
  createPostMessageTransport,
  createWebSocketTransport,
  type Transport,
} from '@aspect/roboviz-core';

// Protocol
export {
  createMessageHandler,
  createDispatcher,
  type Dispatcher,
  type JsonRpcMessage,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from '@aspect/roboviz-core';

// Remote Control Hook
export {
  useRemoteControl,
  type RemoteControlConfig,
  type RemoteControlState,
  type RemoteControlActions,
  type UseRemoteControlReturn,
} from '@aspect/roboviz-core';

// Trajectory Player
export {
  useTrajectoryPlayer,
  type TrajectoryPlayerState,
  type TrajectoryPlayerControls,
  type TrajectoryPlayerOptions,
} from '@aspect/roboviz-core';

// Helper Components
export {
  SafetyZoneVisual,
  type SafetyZoneVisualProps,
} from '@aspect/roboviz-core';
