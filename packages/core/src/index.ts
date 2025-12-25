/**
 * @aspect/roboviz-core
 *
 * Core rendering engine for RoboViz - a standalone 3D robot visualization component.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================
export * from './types';

// =============================================================================
// Store
// =============================================================================
export { useVizStore, type VizState } from './store/vizStore';

// =============================================================================
// Protocol
// =============================================================================
export { createMessageHandler } from './protocol/handler';
export { createDispatcher, type Dispatcher } from './protocol/dispatcher';
export type { JsonRpcMessage, JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from './protocol/types';

// =============================================================================
// Transport
// =============================================================================
export { createDirectTransport } from './transport/direct';
export { createPostMessageTransport } from './transport/postmessage';
export { createWebSocketTransport } from './transport/websocket';
export type { Transport } from './transport/base';

// =============================================================================
// Streaming (Phase 1: Real-time Data)
// =============================================================================
export * from './streaming';

// =============================================================================
// Vision (Phase 2: Machine Vision Integration)
// =============================================================================
export * from './vision';

// =============================================================================
// Frames (Phase 3: Coordinate Frame Management)
// =============================================================================
export * from './frames';

// =============================================================================
// Collision (Phase 4: Collision Detection Visualization)
// =============================================================================
export * from './collision';

// =============================================================================
// Multi-Robot (Phase 5: Multi-Robot Coordination)
// =============================================================================
export * from './multi-robot';

// =============================================================================
// Performance (Phase 6: Performance Optimization)
// =============================================================================
export * from './performance';

// =============================================================================
// Diagnostic (Phase 7: Debugging & Diagnostics)
// =============================================================================
export * from './diagnostic';

// =============================================================================
// Scene Management (Phase 7: Scene Persistence)
// =============================================================================
export * from './scene-management';

// =============================================================================
// Workpoint System (Interactive Work Point Definition)
// =============================================================================
export * from './workpoint';

// =============================================================================
// Server (Remote Control)
// =============================================================================
export * from './server';

// =============================================================================
// Hooks
// =============================================================================
export * from './hooks';

// =============================================================================
// Kinematics (FK/IK, Motion Planning)
// =============================================================================
export * from './kinematics';

// =============================================================================
// Components (internal, exposed for advanced use)
// =============================================================================
export { Scene, type SceneProps } from './components/Scene';
export { Robot, type RobotProps, type EulerTuple, type QuaternionTuple, type MeshDataMap, useEndEffectorPose } from './components/Robot';
export {
  GhostRobot,
  GhostRobotTrajectory,
  GHOST_STATUS_COLORS,
  type GhostRobotProps,
  type GhostRobotTrajectoryProps,
  type GhostStatus,
} from './components/GhostRobot';
export { Trajectory, type TrajectoryProps } from './components/Trajectory';
export { Waypoint, WaypointGroup, type WaypointProps, type WaypointGroupProps } from './components/Waypoint';
export { Obstacle, type ObstacleProps } from './components/Obstacle';

// Kinematics-enhanced components
export {
  IKGhostRobot,
  useIKSolutionSelector,
  type IKGhostRobotProps,
  type IKSolution,
  type IKSolutionSelectorProps,
} from './components/IKGhostRobot';
export {
  LinearMotionPreview,
  type LinearMotionPreviewProps,
  type PathPoint,
  type PathSegment,
} from './components/LinearMotionPreview';
export {
  TrajectoryFK,
  type TrajectoryFKProps,
  type TrajectoryWaypoint,
} from './components/TrajectoryFK';
export {
  ManipulabilityIndicator,
  type ManipulabilityIndicatorProps,
  type ManipulabilityStatus,
} from './components/ManipulabilityIndicator';
export {
  CartesianControlPanel,
  type CartesianControlPanelProps,
  type CartesianControlPanelState,
} from './components/CartesianControlPanel';

// Industrial Jog Control Panel
export {
  JogControlPanel,
  JogButton,
  NumericDisplay,
  JointJogRow,
  CartesianJogRow,
  useRobotJogControl,
  type JogControlPanelProps,
  type JogButtonProps,
  type NumericDisplayProps,
  type JointJogRowProps,
  type CartesianJogRowProps,
  type UseRobotJogControlOptions,
  type JogControlState,
  type JogControlActions,
  type JogMode,
  type JogAxis,
  type StepSize,
} from './components/JogControlPanel';

// =============================================================================
// Helper Components
// =============================================================================
export * from './components/helpers';

// =============================================================================
// Vision Components (Camera & Point Cloud Streaming)
// =============================================================================
export {
  ImageStreamRenderer,
  ImagePlane3D,
  PointCloudStreamRenderer,
  depthFrameToPointCloud,
  CameraViewPanel,
  DepthCloudRenderer,
  type ImageStreamRendererProps,
  type ImagePlane3DProps,
  type ImageStreamStats,
  type PointCloudStreamRendererProps,
  type PointCloudColorMode as VisionPointCloudColorMode,
  type ColorMapConfig,
  type PointCloudStats,
  type CameraViewPanelProps,
  type DepthCloudRendererProps,
  type DepthCloudStats,
} from './components/vision';

// =============================================================================
// Theme System
// =============================================================================
export {
  // Theme creation
  createRoboVizTheme,
  themeToCssVariables,
  getThemeStyleVars,
  // Preset themes
  darkTheme,
  lightTheme,
  industrialTheme,
  themePresets,
  // Provider and hooks
  RoboVizThemeProvider,
  useRoboVizTheme,
  useRoboVizThemeWithFallback,
  // Types
  type RoboVizTheme,
  type ThemeOverrides,
  type ThemePresetName,
  type RoboVizThemeProviderProps,
  type ColorPalette,
  type BackgroundColors,
  type TextColors,
  type BorderColors,
  type Typography,
  type Spacing,
  type BorderRadius,
  type ButtonTokens,
  type InputTokens,
  type JogControlTokens,
  type Animation,
  type Shadows,
} from './theme';

// =============================================================================
// Process System (Plugin-based Industrial Processes)
// =============================================================================
export * from './process';

// =============================================================================
// Trajectory System (Shared Trajectory Infrastructure)
// =============================================================================
export * from './trajectory';

// =============================================================================
// Capabilities (Composable Feature Modules)
// =============================================================================
export * from './capabilities';

// =============================================================================
// Process Plugins (Pre-built Industrial Processes)
// =============================================================================
export * from './processes';

// =============================================================================
// Main Component
// =============================================================================
export { RoboVizCore, type RoboVizCoreProps } from './RoboVizCore';
