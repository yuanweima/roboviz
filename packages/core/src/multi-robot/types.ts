/**
 * RoboViz Multi-Robot Types
 *
 * 多机器人协调相关类型定义
 */

import type { Vector3, Transform, PlaybackOptions } from '../types';

// ============================================================================
// Robot Group Types
// ============================================================================

/**
 * 机器人组协调类型
 */
export type CoordinationType =
  | 'independent'     // 独立运动，无约束
  | 'synchronized'    // 时间同步播放
  | 'master_slave'    // 主从跟随模式
  | 'cooperative';    // 协作模式 (共同持物等)

/**
 * 机器人组定义
 */
export interface RobotGroup {
  /** 唯一标识符 */
  id: string;

  /** 组名称 */
  name: string;

  /** 成员机器人 ID 列表 */
  robotIds: string[];

  /** 协调类型 */
  coordinationType: CoordinationType;

  /** 主机器人 ID (用于 master_slave 模式) */
  masterRobotId?: string;

  /** 协作配置 (用于 cooperative 模式) */
  cooperativeConfig?: CooperativeConfig;

  /** 同步配置 */
  syncConfig?: SyncConfig;

  /** 可视化配置 */
  visualization?: RobotGroupVisualization;

  /** 是否启用 */
  enabled: boolean;
}

/**
 * 协作配置
 */
export interface CooperativeConfig {
  /** 共同持有的物体 ID */
  sharedObjectId?: string;

  /** 相对位姿约束 (机器人之间的相对位置) */
  relativePoseConstraints?: Array<{
    robotIdA: string;
    robotIdB: string;
    relativeTransform: Transform;
    tolerance: {
      position: number;  // 米
      orientation: number;  // 弧度
    };
  }>;

  /** 力分配策略 */
  forceDistribution?: 'equal' | 'weighted' | 'custom';

  /** 权重 (用于 weighted 策略) */
  weights?: Record<string, number>;
}

/**
 * 同步配置
 */
export interface SyncConfig {
  /** 同步模式 */
  mode: 'time' | 'progress' | 'trigger';

  /** 最大允许时间差 (ms) */
  maxTimeDelta?: number;

  /** 是否等待所有机器人就绪 */
  waitForAll?: boolean;

  /** 同步信号间隔 (ms) */
  syncInterval?: number;
}

/**
 * 机器人组可视化配置
 */
export interface RobotGroupVisualization {
  /** 是否显示组边界 */
  showBounds: boolean;

  /** 边界颜色 */
  boundsColor: string;

  /** 是否显示连接线 */
  showConnections: boolean;

  /** 连接线颜色 */
  connectionColor: string;

  /** 是否显示组标签 */
  showLabel: boolean;

  /** 标签位置偏移 */
  labelOffset: Vector3;
}

// ============================================================================
// Synchronized Trajectory Types
// ============================================================================

/**
 * 同步轨迹项
 */
export interface SyncTrajectoryItem {
  /** 机器人 ID */
  robotId: string;

  /** 轨迹 ID */
  trajectoryId: string;

  /** 时间偏移 (ms) */
  timeOffset: number;

  /** 速度缩放因子 */
  speedScale?: number;
}

/**
 * 同步轨迹
 */
export interface SynchronizedTrajectory {
  /** 唯一标识符 */
  id: string;

  /** 机器人组 ID */
  groupId: string;

  /** 轨迹项列表 */
  items: SyncTrajectoryItem[];

  /** 总时长 (ms) */
  totalDuration: number;

  /** 同步点 (关键时间点) */
  syncPoints?: SyncPoint[];
}

/**
 * 同步点
 */
export interface SyncPoint {
  /** 时间 (ms) */
  time: number;

  /** 标签 */
  label?: string;

  /** 该点的机器人状态 */
  states: Record<string, {
    angles: number[];
    tcpPose?: Transform;
  }>;
}

/**
 * 同步播放状态
 */
export interface SyncPlaybackState {
  /** 同步轨迹 ID */
  trajectoryId: string;

  /** 是否正在播放 */
  isPlaying: boolean;

  /** 当前时间 (ms) */
  currentTime: number;

  /** 播放速度 */
  speed: number;

  /** 是否循环 */
  loop: boolean;

  /** 各机器人状态 */
  robotStates: Record<string, {
    currentTime: number;
    progress: number;  // 0-1
    isReady: boolean;
  }>;
}

// ============================================================================
// Workspace Types
// ============================================================================

/**
 * 工作空间类型
 */
export type WorkspaceType =
  | 'reachable'    // 可达空间
  | 'dexterous'    // 灵巧空间 (所有姿态可达)
  | 'shared'       // 共享空间 (多机器人重叠区域)
  | 'exclusive'    // 独占空间 (单个机器人专属)
  | 'forbidden';   // 禁止空间

/**
 * 工作空间几何定义
 */
export type WorkspaceGeometry =
  | WorkspaceSphere
  | WorkspaceCylinder
  | WorkspaceBox
  | WorkspaceMesh
  | WorkspaceVoxelGrid;

export interface WorkspaceSphere {
  type: 'sphere';
  center: Vector3;
  radius: number;
}

export interface WorkspaceCylinder {
  type: 'cylinder';
  center: Vector3;
  radius: number;
  height: number;
  axis: Vector3;
}

export interface WorkspaceBox {
  type: 'box';
  min: Vector3;
  max: Vector3;
}

export interface WorkspaceMesh {
  type: 'mesh';
  vertices: Float32Array;
  indices: Uint32Array;
}

export interface WorkspaceVoxelGrid {
  type: 'voxelGrid';
  origin: Vector3;
  resolution: number;  // 体素大小 (米)
  dimensions: [number, number, number];  // x, y, z 体素数量
  data: Uint8Array;  // 占用数据 (0 = 空, 1 = 占用)
}

/**
 * 工作空间可视化配置
 */
export interface WorkspaceVisualization {
  /** 是否可见 */
  visible: boolean;

  /** 填充颜色 */
  fillColor: string;

  /** 填充透明度 */
  fillOpacity: number;

  /** 是否显示线框 */
  wireframe: boolean;

  /** 线框颜色 */
  wireframeColor: string;

  /** 切片显示 (仅显示特定高度) */
  sliceHeight?: number;

  /** 切片厚度 */
  sliceThickness?: number;
}

/**
 * 工作空间定义
 */
export interface Workspace {
  /** 唯一标识符 */
  id: string;

  /** 显示名称 */
  name: string;

  /** 关联的机器人 ID */
  robotId: string;

  /** 工作空间类型 */
  type: WorkspaceType;

  /** 几何定义 */
  geometry: WorkspaceGeometry;

  /** 变换 (相对于机器人基座) */
  transform?: Transform;

  /** 可视化配置 */
  visualization: WorkspaceVisualization;

  /** 元数据 */
  metadata?: {
    computeTime?: number;
    resolution?: number;
    coverage?: number;  // 覆盖率 (0-1)
  };
}

// ============================================================================
// Multi-Robot Manager Types
// ============================================================================

/**
 * 多机器人管理器接口
 */
export interface IMultiRobotManager {
  // 机器人组管理
  createGroup(group: RobotGroup): void;
  deleteGroup(groupId: string): void;
  updateGroup(groupId: string, updates: Partial<RobotGroup>): void;
  getGroup(groupId: string): RobotGroup | undefined;
  getGroups(): RobotGroup[];

  addRobotToGroup(groupId: string, robotId: string): void;
  removeRobotFromGroup(groupId: string, robotId: string): void;

  // 协调设置
  setCoordinationType(groupId: string, type: CoordinationType): void;
  setMasterRobot(groupId: string, robotId: string): void;
  setCooperativeConfig(groupId: string, config: CooperativeConfig): void;

  // 同步播放
  loadSynchronizedTrajectory(trajectory: SynchronizedTrajectory): void;
  unloadSynchronizedTrajectory(trajectoryId: string): void;
  getSynchronizedTrajectory(trajectoryId: string): SynchronizedTrajectory | undefined;

  playSynchronized(groupId: string, options?: PlaybackOptions): void;
  pauseSynchronized(groupId: string): void;
  stopSynchronized(groupId: string): void;
  seekSynchronized(groupId: string, time: number): void;
  getSyncPlaybackState(groupId: string): SyncPlaybackState | undefined;

  // 工作空间管理
  addWorkspace(workspace: Workspace): void;
  removeWorkspace(id: string): void;
  updateWorkspace(id: string, updates: Partial<Workspace>): void;
  getWorkspace(id: string): Workspace | undefined;
  getWorkspaces(): Workspace[];
  getWorkspacesForRobot(robotId: string): Workspace[];

  // 工作空间计算 (委托给 Bridge)
  calculateReachableWorkspace(robotId: string, resolution?: number): Promise<Workspace>;
  calculateSharedWorkspace(robotIds: string[], resolution?: number): Promise<Workspace>;

  // 事件
  onGroupChanged(callback: (group: RobotGroup) => void): () => void;
  onSyncPlaybackChanged(callback: (state: SyncPlaybackState) => void): () => void;
  onWorkspaceChanged(callback: (workspace: Workspace) => void): () => void;
}

// ============================================================================
// Multi-Robot Events
// ============================================================================

/**
 * 多机器人事件类型
 */
export type MultiRobotEventType =
  | 'group_created'
  | 'group_deleted'
  | 'group_updated'
  | 'robot_added_to_group'
  | 'robot_removed_from_group'
  | 'sync_playback_started'
  | 'sync_playback_paused'
  | 'sync_playback_stopped'
  | 'sync_point_reached'
  | 'workspace_calculated';

/**
 * 多机器人事件
 */
export interface MultiRobotEvent {
  type: MultiRobotEventType;
  timestamp: number;
  data: unknown;
}

/**
 * 同步点到达事件
 */
export interface SyncPointReachedEvent extends MultiRobotEvent {
  type: 'sync_point_reached';
  data: {
    trajectoryId: string;
    syncPoint: SyncPoint;
    actualStates: Record<string, {
      angles: number[];
      deviation: number;  // 与目标的偏差
    }>;
  };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 默认机器人组可视化配置
 */
export const DEFAULT_GROUP_VISUALIZATION: RobotGroupVisualization = {
  showBounds: false,
  boundsColor: '#808080',
  showConnections: true,
  connectionColor: '#00ffff',
  showLabel: true,
  labelOffset: { x: 0, y: 0, z: 0.5 },
};

/**
 * 默认工作空间可视化配置
 */
export const DEFAULT_WORKSPACE_VISUALIZATION: WorkspaceVisualization = {
  visible: true,
  fillColor: '#00ff00',
  fillOpacity: 0.2,
  wireframe: true,
  wireframeColor: '#00ff00',
};
