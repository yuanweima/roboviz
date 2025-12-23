/**
 * RoboViz Multi-Robot Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for robotGroup.*, syncTrajectory.*, workspace.* namespaces
 */

import type { MethodHandler } from '../handler';
import type { PlaybackOptions } from '../../types';
import type {
  RobotGroup,
  CoordinationType,
  CooperativeConfig,
  SynchronizedTrajectory,
  SyncPlaybackState,
  Workspace,
  RobotGroupVisualization,
  WorkspaceVisualization,
} from '../../multi-robot/types';
import { getMultiRobotManager } from '../../multi-robot/multi-robot-manager';

// ============================================================================
// Robot Group Handlers
// ============================================================================

/**
 * robotGroup.create - 创建机器人组
 */
export const robotGroupCreate: MethodHandler<RobotGroup, { success: boolean }> = (params) => {
  const manager = getMultiRobotManager();
  manager.createGroup(params);
  return { success: true };
};

/**
 * robotGroup.delete - 删除机器人组
 */
export const robotGroupDelete: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getMultiRobotManager();
  manager.deleteGroup(params.id);
  return { success: true };
};

/**
 * robotGroup.update - 更新机器人组
 */
export const robotGroupUpdate: MethodHandler<
  { id: string; updates: Partial<RobotGroup> },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.updateGroup(params.id, params.updates);
  return { success: true };
};

/**
 * robotGroup.get - 获取机器人组
 */
export const robotGroupGet: MethodHandler<{ id: string }, { group: RobotGroup | null }> = (
  params
) => {
  const manager = getMultiRobotManager();
  const group = manager.getGroup(params.id);
  return { group: group ?? null };
};

/**
 * robotGroup.list - 列出所有机器人组
 */
export const robotGroupList: MethodHandler<
  Record<string, never>,
  { groups: Array<{ id: string; name: string; robotIds: string[]; coordinationType: CoordinationType }> }
> = () => {
  const manager = getMultiRobotManager();
  const groups = manager.getGroups().map((g) => ({
    id: g.id,
    name: g.name,
    robotIds: g.robotIds,
    coordinationType: g.coordinationType,
  }));
  return { groups };
};

/**
 * robotGroup.addRobot - 添加机器人到组
 */
export const robotGroupAddRobot: MethodHandler<
  { groupId: string; robotId: string },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.addRobotToGroup(params.groupId, params.robotId);
  return { success: true };
};

/**
 * robotGroup.removeRobot - 从组中移除机器人
 */
export const robotGroupRemoveRobot: MethodHandler<
  { groupId: string; robotId: string },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.removeRobotFromGroup(params.groupId, params.robotId);
  return { success: true };
};

/**
 * robotGroup.setCoordinationType - 设置协调类型
 */
export const robotGroupSetCoordinationType: MethodHandler<
  { groupId: string; type: CoordinationType },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.setCoordinationType(params.groupId, params.type);
  return { success: true };
};

/**
 * robotGroup.setMasterRobot - 设置主机器人
 */
export const robotGroupSetMasterRobot: MethodHandler<
  { groupId: string; robotId: string },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.setMasterRobot(params.groupId, params.robotId);
  return { success: true };
};

/**
 * robotGroup.setCooperativeConfig - 设置协作配置
 */
export const robotGroupSetCooperativeConfig: MethodHandler<
  { groupId: string; config: CooperativeConfig },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.setCooperativeConfig(params.groupId, params.config);
  return { success: true };
};

/**
 * robotGroup.setVisualization - 设置可视化配置
 */
export const robotGroupSetVisualization: MethodHandler<
  { groupId: string; visualization: Partial<RobotGroupVisualization> },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.updateGroup(params.groupId, { visualization: params.visualization as RobotGroupVisualization });
  return { success: true };
};

// ============================================================================
// Synchronized Trajectory Handlers
// ============================================================================

/**
 * syncTrajectory.load - 加载同步轨迹
 */
export const syncTrajectoryLoad: MethodHandler<SynchronizedTrajectory, { success: boolean }> = (
  params
) => {
  const manager = getMultiRobotManager();
  manager.loadSynchronizedTrajectory(params);
  return { success: true };
};

/**
 * syncTrajectory.unload - 卸载同步轨迹
 */
export const syncTrajectoryUnload: MethodHandler<{ id: string }, { success: boolean }> = (
  params
) => {
  const manager = getMultiRobotManager();
  manager.unloadSynchronizedTrajectory(params.id);
  return { success: true };
};

/**
 * syncTrajectory.get - 获取同步轨迹
 */
export const syncTrajectoryGet: MethodHandler<
  { id: string },
  { trajectory: SynchronizedTrajectory | null }
> = (params) => {
  const manager = getMultiRobotManager();
  const trajectory = manager.getSynchronizedTrajectory(params.id);
  return { trajectory: trajectory ?? null };
};

/**
 * syncTrajectory.play - 播放同步轨迹
 */
export const syncTrajectoryPlay: MethodHandler<
  { groupId: string; options?: PlaybackOptions },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.playSynchronized(params.groupId, params.options);
  return { success: true };
};

/**
 * syncTrajectory.pause - 暂停同步轨迹
 */
export const syncTrajectoryPause: MethodHandler<{ groupId: string }, { success: boolean }> = (
  params
) => {
  const manager = getMultiRobotManager();
  manager.pauseSynchronized(params.groupId);
  return { success: true };
};

/**
 * syncTrajectory.stop - 停止同步轨迹
 */
export const syncTrajectoryStop: MethodHandler<{ groupId: string }, { success: boolean }> = (
  params
) => {
  const manager = getMultiRobotManager();
  manager.stopSynchronized(params.groupId);
  return { success: true };
};

/**
 * syncTrajectory.seek - 跳转到指定时间
 */
export const syncTrajectorySeek: MethodHandler<
  { groupId: string; time: number },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.seekSynchronized(params.groupId, params.time);
  return { success: true };
};

/**
 * syncTrajectory.getPlaybackState - 获取播放状态
 */
export const syncTrajectoryGetPlaybackState: MethodHandler<
  { groupId: string },
  { state: SyncPlaybackState | null }
> = (params) => {
  const manager = getMultiRobotManager();
  const state = manager.getSyncPlaybackState(params.groupId);
  return { state: state ?? null };
};

// ============================================================================
// Workspace Handlers
// ============================================================================

/**
 * workspace.add - 添加工作空间
 */
export const workspaceAdd: MethodHandler<Workspace, { success: boolean }> = (params) => {
  const manager = getMultiRobotManager();
  manager.addWorkspace(params);
  return { success: true };
};

/**
 * workspace.remove - 移除工作空间
 */
export const workspaceRemove: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getMultiRobotManager();
  manager.removeWorkspace(params.id);
  return { success: true };
};

/**
 * workspace.update - 更新工作空间
 */
export const workspaceUpdate: MethodHandler<
  { id: string; updates: Partial<Workspace> },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.updateWorkspace(params.id, params.updates);
  return { success: true };
};

/**
 * workspace.get - 获取工作空间
 */
export const workspaceGet: MethodHandler<{ id: string }, { workspace: Workspace | null }> = (
  params
) => {
  const manager = getMultiRobotManager();
  const workspace = manager.getWorkspace(params.id);
  return { workspace: workspace ?? null };
};

/**
 * workspace.list - 列出工作空间
 */
export const workspaceList: MethodHandler<
  { robotId?: string },
  { workspaces: Array<{ id: string; name: string; robotId: string; type: string }> }
> = (params) => {
  const manager = getMultiRobotManager();
  let workspaces = params.robotId
    ? manager.getWorkspacesForRobot(params.robotId)
    : manager.getWorkspaces();

  return {
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      robotId: w.robotId,
      type: w.type,
    })),
  };
};

/**
 * workspace.setVisualization - 设置工作空间可视化
 */
export const workspaceSetVisualization: MethodHandler<
  { id: string; visualization: Partial<WorkspaceVisualization> },
  { success: boolean }
> = (params) => {
  const manager = getMultiRobotManager();
  manager.updateWorkspace(params.id, { visualization: params.visualization as WorkspaceVisualization });
  return { success: true };
};

/**
 * workspace.calculateReachable - 计算可达工作空间
 */
export const workspaceCalculateReachable: MethodHandler<
  { robotId: string; resolution?: number },
  { workspace: Workspace }
> = async (params) => {
  const manager = getMultiRobotManager();
  const workspace = await manager.calculateReachableWorkspace(params.robotId, params.resolution);
  return { workspace };
};

/**
 * workspace.calculateShared - 计算共享工作空间
 */
export const workspaceCalculateShared: MethodHandler<
  { robotIds: string[]; resolution?: number },
  { workspace: Workspace }
> = async (params) => {
  const manager = getMultiRobotManager();
  const workspace = await manager.calculateSharedWorkspace(params.robotIds, params.resolution);
  return { workspace };
};

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * 所有多机器人处理器
 */
export const multiRobotHandlers: Record<string, MethodHandler> = {
  // Robot Group
  'robotGroup.create': robotGroupCreate,
  'robotGroup.delete': robotGroupDelete,
  'robotGroup.update': robotGroupUpdate,
  'robotGroup.get': robotGroupGet,
  'robotGroup.list': robotGroupList,
  'robotGroup.addRobot': robotGroupAddRobot,
  'robotGroup.removeRobot': robotGroupRemoveRobot,
  'robotGroup.setCoordinationType': robotGroupSetCoordinationType,
  'robotGroup.setMasterRobot': robotGroupSetMasterRobot,
  'robotGroup.setCooperativeConfig': robotGroupSetCooperativeConfig,
  'robotGroup.setVisualization': robotGroupSetVisualization,

  // Synchronized Trajectory
  'syncTrajectory.load': syncTrajectoryLoad,
  'syncTrajectory.unload': syncTrajectoryUnload,
  'syncTrajectory.get': syncTrajectoryGet,
  'syncTrajectory.play': syncTrajectoryPlay,
  'syncTrajectory.pause': syncTrajectoryPause,
  'syncTrajectory.stop': syncTrajectoryStop,
  'syncTrajectory.seek': syncTrajectorySeek,
  'syncTrajectory.getPlaybackState': syncTrajectoryGetPlaybackState,

  // Workspace
  'workspace.add': workspaceAdd,
  'workspace.remove': workspaceRemove,
  'workspace.update': workspaceUpdate,
  'workspace.get': workspaceGet,
  'workspace.list': workspaceList,
  'workspace.setVisualization': workspaceSetVisualization,
  'workspace.calculateReachable': workspaceCalculateReachable,
  'workspace.calculateShared': workspaceCalculateShared,
};

/**
 * 注册所有多机器人处理器到 dispatcher
 */
export function registerMultiRobotHandlers(
  registerMethod: (method: string, handler: MethodHandler) => void
): void {
  for (const [method, handler] of Object.entries(multiRobotHandlers)) {
    registerMethod(method, handler);
  }
}
