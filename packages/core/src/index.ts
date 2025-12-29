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
// URDF Types and Type Guards
// =============================================================================
export {
  // Types
  type URDFJointType,
  type URDFJoint,
  type URDFLink,
  type URDFRobot,
  // Type Guards
  isURDFLink,
  isURDFJoint,
  isURDFRobot,
  // Helper Functions
  findLastURDFLink,
  findAllURDFJoints,
  findMovableJoints,
  findURDFLinkByName,
  findURDFJointByName,
} from './types/urdf';

// =============================================================================
// Coordinates (Z-up Robotics Standard)
// =============================================================================
export {
  // Types (using Zup suffix to avoid collision with core types)
  type Position3D,
  type Quaternion as QuaternionZup,
  type EulerAngles,
  type Pose3D,
  type Pose3DWithEuler,
  type JointAngles,
  type TCPOffset as TCPOffsetZup,
  type RobotBasePose,
  type CoordinateSystem as CoordinateSystemZup,
  // Internal types
  type Position3DYUp,
  type QuaternionYUp,
  type Pose3DYUp,
  // Transform utilities
  CoordinateTransform,
  coordinateTransform,
  // Kinematics hook
  useRobotKinematics,
  type UseRobotKinematicsOptions,
  type UseRobotKinematicsReturn,
  type FkResult3D,
  type FkChainResult3D,
  type IkResult3D,
  type MultiIkResult3D,
} from './coordinates';

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
// Rendering System (Advanced Post-Processing & Materials)
// =============================================================================
export * from './rendering';

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
// Interaction System (Global Shortcuts & Keyboard Handling)
// =============================================================================
export * from './interaction';

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
  InstancedRobotArms,
  useRobotArmBuffers,
  type InstancedRobotArmsProps,
  type RobotLoadedInfo,
  type RobotArmBuffers,
  type UseRobotArmBuffersOptions,
  type MeshQuality,
} from './components/InstancedRobotArms';
export {
  EndEffector,
  StandaloneEndEffector,
  useEndEffector,
  type EndEffectorProps,
  type StandaloneEndEffectorProps,
  type TCPOffset,
  type EndEffectorPose,
  type EndEffectorContextValue,
} from './components/EndEffector';
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
// Input Devices (Gamepad, SpaceMouse, 6DoF Controllers)
// =============================================================================
export * from './input-devices';

// =============================================================================
// Helper Components
// =============================================================================
export * from './components/helpers';

// =============================================================================
// Tool Components (End-Effector Visualizations)
// =============================================================================
export * from './components/tools';

// =============================================================================
// Workpiece Components (Industrial Workpiece Visualizations)
// =============================================================================
export * from './components/workpiece';

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
// Timeline Components (Collision Visualization & Playback)
// =============================================================================
export * from './components/timeline';

// =============================================================================
// Property Editor (Schema-driven Property Editing)
// =============================================================================
export * from './components/property-editor';

// =============================================================================
// Workers (Web Worker + SharedArrayBuffer for RL)
// =============================================================================
export * from './workers';

// =============================================================================
// Motion Planning (GPU-Accelerated Path Planning)
// =============================================================================
export * from './planning';

// =============================================================================
// Main Component
// =============================================================================
export { RoboVizCore, type RoboVizCoreProps } from './RoboVizCore';
