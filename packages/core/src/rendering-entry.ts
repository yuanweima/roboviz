/**
 * @aspect/roboviz-core/rendering
 *
 * Pure rendering entry point — zero trajx-wasm dependency.
 * Import from this path when you only need 3D robot visualization
 * without IK/FK computation or motion planning.
 *
 * @example
 * ```tsx
 * import { Robot, Scene, GhostRobot } from '@aspect/roboviz-core/rendering';
 *
 * function App() {
 *   return (
 *     <Scene>
 *       <Robot urdfContent={urdf} jointValues={joints} />
 *       <GhostRobot urdfContent={urdf} jointValues={targetJoints} opacity={0.5} />
 *     </Scene>
 *   );
 * }
 * ```
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
  type URDFJointType,
  type URDFJoint,
  type URDFLink,
  type URDFRobot,
  isURDFLink,
  isURDFJoint,
  isURDFRobot,
  findLastURDFLink,
  findAllURDFJoints,
  findMovableJoints,
  findURDFLinkByName,
  findURDFJointByName,
} from './types/urdf';

// =============================================================================
// Coordinates (pure transform utilities, no kinematics hooks)
// =============================================================================
export {
  type Position3D,
  type Quaternion as QuaternionZup,
  type EulerAngles,
  type Pose3D,
  type Pose3DWithEuler,
  type JointAngles,
  type TCPOffset as TCPOffsetZup,
  type RobotBasePose,
  type CoordinateSystem as CoordinateSystemZup,
  type Position3DYUp,
  type QuaternionYUp,
  type Pose3DYUp,
  CoordinateTransform,
  coordinateTransform,
} from './coordinates';

// =============================================================================
// Store
// =============================================================================
export { useVizStore, type VizState } from './store/vizStore';

// =============================================================================
// Rendering Components (pure 3D, no kinematics)
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

// =============================================================================
// Helper Components
// =============================================================================
export * from './components/helpers';

// =============================================================================
// Tool Components (End-Effector Visualizations)
// =============================================================================
export * from './components/tools';

// =============================================================================
// Workpiece Components
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
// Rendering System (Advanced Post-Processing & Materials)
// =============================================================================
export * from './rendering';

// =============================================================================
// Theme System
// =============================================================================
export {
  createRoboVizTheme,
  themeToCssVariables,
  getThemeStyleVars,
  darkTheme,
  lightTheme,
  industrialTheme,
  themePresets,
  RoboVizThemeProvider,
  useRoboVizTheme,
  useRoboVizThemeWithFallback,
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
// Timeline Components
// =============================================================================
export * from './components/timeline';

// =============================================================================
// Property Editor
// =============================================================================
export * from './components/property-editor';

// =============================================================================
// Pure Rendering Hooks (no kinematics dependency)
// =============================================================================
export {
  useTrajectoryPlayer,
  type TrajectoryPlayerState,
  type TrajectoryPlayerControls,
  type TrajectoryPlayerOptions,
} from './hooks/useTrajectoryPlayer';

export {
  useCollision,
  type UseCollisionOptions,
  type UseCollisionState,
  type UseCollisionActions,
} from './hooks/useCollision';

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
} from './hooks/useRemoteControl';

export {
  useCameraStream,
  type CameraStreamOptions,
  type CameraStreamState,
  type CameraStreamControls,
  type UseCameraStreamReturn,
} from './hooks/useCameraStream';

export {
  usePointCloudStream,
  type PointCloudStreamOptions,
  type PointCloudData as StreamPointCloudData,
  type PointCloudStreamState,
  type PointCloudStreamControls,
  type UsePointCloudStreamReturn,
} from './hooks/usePointCloudStream';

// =============================================================================
// Interaction System
// =============================================================================
export * from './interaction';

// =============================================================================
// Input Devices
// =============================================================================
export * from './input-devices';

// =============================================================================
// Trajectory System
// =============================================================================
export * from './trajectory';

// =============================================================================
// Frames
// =============================================================================
export * from './frames';

// =============================================================================
// Multi-Robot
// =============================================================================
export * from './multi-robot';

// =============================================================================
// Performance
// =============================================================================
export * from './performance';

// =============================================================================
// Diagnostic
// =============================================================================
export * from './diagnostic';

// =============================================================================
// Scene Management
// =============================================================================
export * from './scene-management';

// =============================================================================
// Main Component
// =============================================================================
export { RoboVizCore, type RoboVizCoreProps } from './RoboVizCore';
