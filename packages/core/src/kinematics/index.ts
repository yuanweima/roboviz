/**
 * RoboViz Kinematics Module
 *
 * Provides forward/inverse kinematics and motion planning capabilities
 * using trajx-wasm for high-performance computation.
 *
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Core types
  DhParam,
  JointLimits,
  KinematicLimits,

  // IK/FK results
  IkResult,
  MultiIkResult,
  FkResult,
  FkChainResult,

  // Workspace analysis
  WorkspaceAnalysis,
  ReachabilityResult,

  // Motion planning
  LinearMotionSegment,
  LinearMotionRequest,
  LinearMotionResult,
  PathPlanningConfig,
  PathPlanningRequest,
  PathPlanningResult,

  // Trajectory
  TrajectoryConfig,
  TrajectoryPoint,
  Trajectory,

  // Configuration
  IkSolverConfig,
  RobotSolverConfig,

  // Events
  KinematicsEventType,
  KinematicsEvent,
  KinematicsEventListener,

  // Tool types
  TcpPoint,
  ToolDefinition,
  ToolAttachment,
  StandoffPoseRequest,
} from './types';

// ============================================================================
// Manager
// ============================================================================

export {
  getKinematicsManager,
  resetKinematicsManager,
  RobotSolver,
  UrdfRobotSolver,
  type AnySolver,
  type TrajxTool,
  type TrajxTcpPoint,
  type TrajxToolLibrary,
} from './kinematics-manager';

// ============================================================================
// React Hooks
// ============================================================================

export {
  // Main hook
  useTrajx,
  type UseTrajxState,
  type UseTrajxActions,
  type UseTrajxReturn,

  // Robot solver hook (DH database)
  useRobotSolver,
  type UseRobotSolverOptions,
  type UseRobotSolverState,
  type UseRobotSolverActions,
  type UseRobotSolverReturn,

  // URDF-based solver hook (automatic from URDF content)
  useUrdfSolver,
  type UseUrdfSolverOptions,
  type UseUrdfSolverState,
  type UseUrdfSolverActions,
  type UseUrdfSolverReturn,

  // Hybrid solver hook (URDF + DH for analytical IK)
  useHybridSolver,
  URDF_TO_DH_MAPPING,
  type UseHybridSolverOptions,
  type UseHybridSolverState,
  type UseHybridSolverActions,
  type UseHybridSolverReturn,

  // Coordinate system utilities
  type CoordinateSystem,
  poseYupToZup,
  poseZupToYup,
  quaternionYupToZup,
  quaternionZupToYup,

  // Focused IK hook
  useIK,
  type UseIKOptions,
  type UseIKReturn,

  // Focused FK hook
  useFK,
  type UseFKOptions,
  type UseFKReturn,
} from './useTrajx';

// ============================================================================
// Linear Motion Planning
// ============================================================================

export {
  LinearMotionPlanner,
  createLinearMotionPlanner,
  planLinearMotion,
  planLinearPath,
  checkLinearFeasibility,
  type LinearMotionConfig,
  type LinearPathSegment,
  type WaypointResult,
  type OrientationInterpolation,
} from './linear-motion';
