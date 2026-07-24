/**
 * @roboviz/core
 *
 * Web-native visualization frontend for the trajx kinematics & motion-planning engine.
 * Renders URDF robots in the browser and shows trajx FK/IK, ghost preview, and
 * planned trajectories live via React Three Fiber.
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
// Collision (Collision Detection Visualization)
// =============================================================================
export * from './collision';

// =============================================================================
// Hooks
// =============================================================================
export * from './hooks';

// =============================================================================
// Interaction System (Global Shortcuts & Keyboard Handling)
// =============================================================================
export * from './interaction';

// =============================================================================
// Kinematics (trajx FK/IK)
// =============================================================================
export * from './kinematics';

// =============================================================================
// Components
// =============================================================================
export { Scene, type SceneProps } from './components/Scene';
export { Robot, type RobotProps, type EulerTuple, type QuaternionTuple, type MeshDataMap, useEndEffectorPose } from './components/Robot';
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

// =============================================================================
// Helper Components
// =============================================================================
export * from './components/helpers';

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
// Trajectory System (Shared Trajectory Infrastructure)
// =============================================================================
export * from './trajectory';

// `Trajectory` is exported by both ./kinematics and ./trajectory; the
// trajectory-system type is canonical at the top level. Explicit re-export
// disambiguates the star-export collision.
export type { Trajectory } from './trajectory';

// =============================================================================
// Workers (Web Worker + SharedArrayBuffer)
// =============================================================================
export * from './workers';

// =============================================================================
// Motion Planning (trajx planners)
// =============================================================================
export * from './planning';

// =============================================================================
// Main Component
// =============================================================================
export { RoboVizCore, type RoboVizCoreProps } from './RoboVizCore';
