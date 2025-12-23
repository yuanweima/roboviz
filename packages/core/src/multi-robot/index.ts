/**
 * RoboViz Multi-Robot Module
 *
 * 多机器人协调模块
 */

// Types
export type {
  // Coordination
  CoordinationType,
  RobotGroup,
  CooperativeConfig,
  SyncConfig,
  RobotGroupVisualization,

  // Synchronized Trajectory
  SyncTrajectoryItem,
  SynchronizedTrajectory,
  SyncPoint,
  SyncPlaybackState,

  // Workspace
  WorkspaceType,
  WorkspaceGeometry,
  WorkspaceSphere,
  WorkspaceCylinder,
  WorkspaceBox,
  WorkspaceMesh,
  WorkspaceVoxelGrid,
  WorkspaceVisualization,
  Workspace,

  // Manager
  IMultiRobotManager,

  // Events
  MultiRobotEventType,
  MultiRobotEvent,
  SyncPointReachedEvent,
} from './types';

// Constants
export {
  DEFAULT_GROUP_VISUALIZATION,
  DEFAULT_WORKSPACE_VISUALIZATION,
} from './types';

// Multi-Robot Manager
export {
  MultiRobotManager,
  createMultiRobotManager,
  getMultiRobotManager,
  resetMultiRobotManager,
} from './multi-robot-manager';
export type { MultiRobotManagerConfig } from './multi-robot-manager';
