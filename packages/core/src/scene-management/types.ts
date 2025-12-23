/**
 * RoboViz Scene Management Types
 *
 * 场景管理相关类型定义
 */

import type {
  RobotState,
  ObstacleData,
  TrajectoryState,
  WaypointData,
  CameraState,
  SceneConfig,
} from '../types';
import type { CoordinateFrame } from '../frames/types';
import type { SafetyZone } from '../collision/types';
import type { RobotGroup, Workspace } from '../multi-robot/types';
import type { PointCloudState, CameraViewState } from '../vision/types';

// ============================================================================
// Scene Snapshot Types
// ============================================================================

/**
 * 场景快照版本
 */
export const SNAPSHOT_VERSION = '1.0.0';

/**
 * 场景快照
 */
export interface SceneSnapshot {
  /** 快照 ID */
  id: string;

  /** 快照名称 */
  name: string;

  /** 创建时间戳 */
  timestamp: number;

  /** 快照版本 */
  version: string;

  /** 场景配置 */
  scene: SceneConfig;

  /** 机器人状态列表 */
  robots: RobotState[];

  /** 障碍物列表 */
  obstacles: ObstacleData[];

  /** 轨迹列表 */
  trajectories: TrajectoryState[];

  /** 路点列表 */
  waypoints: WaypointData[];

  /** 相机状态 */
  camera: CameraState;

  /** 坐标系列表 */
  frames: CoordinateFrame[];

  /** 安全区域列表 */
  safetyZones: SafetyZone[];

  /** 机器人组列表 */
  robotGroups?: RobotGroup[];

  /** 工作空间列表 */
  workspaces?: Workspace[];

  /** 点云列表 (仅包含元数据) */
  pointClouds?: Array<{
    id: string;
    url?: string;  // 如果点云来自 URL
    metadata?: Record<string, unknown>;
  }>;

  /** 相机视图列表 */
  cameraViews?: CameraViewState[];

  /** 用户元数据 */
  metadata?: Record<string, unknown>;

  /** 描述 */
  description?: string;

  /** 缩略图 (base64) */
  thumbnail?: string;
}

// ============================================================================
// Export/Import Types
// ============================================================================

/**
 * 场景导出格式
 */
export type SceneExportFormat = 'json' | 'yaml' | 'xml' | 'binary';

/**
 * 场景导出选项
 */
export interface SceneExportOptions {
  /** 导出格式 */
  format: SceneExportFormat;

  /** 是否压缩 */
  compress?: boolean;

  /** 是否包含机器人 */
  includeRobots?: boolean;

  /** 是否包含轨迹 */
  includeTrajectories?: boolean;

  /** 是否包含路点 */
  includeWaypoints?: boolean;

  /** 是否包含障碍物 */
  includeObstacles?: boolean;

  /** 是否包含安全区域 */
  includeSafetyZones?: boolean;

  /** 是否包含坐标系 */
  includeFrames?: boolean;

  /** 是否包含点云 (仅元数据) */
  includePointClouds?: boolean;

  /** 是否包含相机视图 */
  includeCameraViews?: boolean;

  /** 是否包含缩略图 */
  includeThumbnail?: boolean;

  /** 缩略图尺寸 */
  thumbnailSize?: { width: number; height: number };
}

/**
 * 场景导入选项
 */
export interface SceneImportOptions {
  /** 是否合并 (true = 合并, false = 替换) */
  merge?: boolean;

  /** 是否导入机器人 */
  includeRobots?: boolean;

  /** 是否导入轨迹 */
  includeTrajectories?: boolean;

  /** 是否导入路点 */
  includeWaypoints?: boolean;

  /** 是否导入障碍物 */
  includeObstacles?: boolean;

  /** 是否导入安全区域 */
  includeSafetyZones?: boolean;

  /** 是否导入坐标系 */
  includeFrames?: boolean;

  /** 是否导入相机设置 */
  includeCamera?: boolean;

  /** ID 冲突处理策略 */
  conflictStrategy?: 'skip' | 'overwrite' | 'rename';

  /** 重命名前缀 (用于 rename 策略) */
  renamePrefix?: string;
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean;

  /** 导入的对象统计 */
  imported: {
    robots: number;
    obstacles: number;
    trajectories: number;
    waypoints: number;
    frames: number;
    safetyZones: number;
  };

  /** 跳过的对象 (因冲突) */
  skipped: {
    robots: string[];
    obstacles: string[];
    trajectories: string[];
    waypoints: string[];
    frames: string[];
    safetyZones: string[];
  };

  /** 重命名的对象映射 */
  renamed: Record<string, string>;

  /** 警告信息 */
  warnings: string[];

  /** 错误信息 */
  errors: string[];
}

// ============================================================================
// Undo/Redo Types
// ============================================================================

/**
 * 操作类型
 */
export type OperationType =
  | 'add_robot'
  | 'remove_robot'
  | 'update_robot'
  | 'add_obstacle'
  | 'remove_obstacle'
  | 'update_obstacle'
  | 'add_trajectory'
  | 'remove_trajectory'
  | 'add_waypoint'
  | 'remove_waypoint'
  | 'update_waypoint'
  | 'add_frame'
  | 'remove_frame'
  | 'update_frame'
  | 'add_safety_zone'
  | 'remove_safety_zone'
  | 'update_safety_zone'
  | 'update_scene'
  | 'update_camera'
  | 'batch';

/**
 * 操作记录
 */
export interface Operation {
  /** 操作 ID */
  id: string;

  /** 操作类型 */
  type: OperationType;

  /** 时间戳 */
  timestamp: number;

  /** 操作描述 */
  description: string;

  /** 操作前的状态 (用于撤销) */
  previousState: unknown;

  /** 操作后的状态 (用于重做) */
  nextState: unknown;

  /** 子操作 (用于 batch 类型) */
  children?: Operation[];
}

/**
 * 历史记录配置
 */
export interface HistoryConfig {
  /** 最大历史记录数 */
  maxHistorySize: number;

  /** 是否启用 */
  enabled: boolean;

  /** 是否合并连续的小操作 */
  mergeConsecutive: boolean;

  /** 合并时间窗口 (ms) */
  mergeWindow: number;
}

// ============================================================================
// Scene Manager Types
// ============================================================================

/**
 * 场景管理器接口
 */
export interface ISceneManager {
  // 快照管理
  createSnapshot(name: string, metadata?: Record<string, unknown>): Promise<SceneSnapshot>;
  restoreSnapshot(snapshotId: string): Promise<void>;
  deleteSnapshot(snapshotId: string): void;
  getSnapshot(snapshotId: string): SceneSnapshot | undefined;
  listSnapshots(): SceneSnapshot[];

  // 导出/导入
  exportScene(options: SceneExportOptions): Promise<string | ArrayBuffer>;
  importScene(data: string | ArrayBuffer, options: SceneImportOptions): Promise<ImportResult>;

  // 撤销/重做
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoStack(): Operation[];
  getRedoStack(): Operation[];
  clearHistory(): void;

  // 历史记录配置
  setHistoryConfig(config: Partial<HistoryConfig>): void;
  getHistoryConfig(): HistoryConfig;

  // 事件
  onSnapshotCreated(callback: (snapshot: SceneSnapshot) => void): () => void;
  onSnapshotRestored(callback: (snapshotId: string) => void): () => void;
  onHistoryChanged(callback: () => void): () => void;
}

// ============================================================================
// Scene Events
// ============================================================================

/**
 * 场景事件类型
 */
export type SceneEventType =
  | 'snapshot_created'
  | 'snapshot_restored'
  | 'snapshot_deleted'
  | 'scene_exported'
  | 'scene_imported'
  | 'undo'
  | 'redo'
  | 'history_cleared';

/**
 * 场景事件
 */
export interface SceneEvent {
  type: SceneEventType;
  timestamp: number;
  data?: unknown;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * 默认历史记录配置
 */
export const DEFAULT_HISTORY_CONFIG: HistoryConfig = {
  maxHistorySize: 100,
  enabled: true,
  mergeConsecutive: true,
  mergeWindow: 500,
};

/**
 * 默认导出选项
 */
export const DEFAULT_EXPORT_OPTIONS: SceneExportOptions = {
  format: 'json',
  compress: false,
  includeRobots: true,
  includeTrajectories: true,
  includeWaypoints: true,
  includeObstacles: true,
  includeSafetyZones: true,
  includeFrames: true,
  includePointClouds: false,
  includeCameraViews: true,
  includeThumbnail: true,
  thumbnailSize: { width: 256, height: 256 },
};

/**
 * 默认导入选项
 */
export const DEFAULT_IMPORT_OPTIONS: SceneImportOptions = {
  merge: false,
  includeRobots: true,
  includeTrajectories: true,
  includeWaypoints: true,
  includeObstacles: true,
  includeSafetyZones: true,
  includeFrames: true,
  includeCamera: true,
  conflictStrategy: 'overwrite',
};
