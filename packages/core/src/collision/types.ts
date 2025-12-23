/**
 * RoboViz Collision Types
 *
 * 碰撞检测和安全区域相关类型定义
 */

import type { Vector3, Quaternion, Transform } from '../types';

// ============================================================================
// Collision Geometry Types
// ============================================================================

/**
 * 碰撞几何体类型
 */
export type CollisionGeometryType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'capsule'
  | 'mesh'
  | 'convexHull';

/**
 * 碰撞几何体参数
 */
export type CollisionParams =
  | BoxParams
  | SphereParams
  | CylinderParams
  | CapsuleParams
  | MeshParams
  | ConvexHullParams;

export interface BoxParams {
  type: 'box';
  /** 尺寸 [width, depth, height] (米) */
  size: Vector3;
}

export interface SphereParams {
  type: 'sphere';
  /** 半径 (米) */
  radius: number;
}

export interface CylinderParams {
  type: 'cylinder';
  /** 半径 (米) */
  radius: number;
  /** 高度 (米) */
  height: number;
}

export interface CapsuleParams {
  type: 'capsule';
  /** 半径 (米) */
  radius: number;
  /** 高度 (不包括两端半球) (米) */
  height: number;
}

export interface MeshParams {
  type: 'mesh';
  /** 顶点数组 (交错存储 [x,y,z, ...]) */
  vertices: Float32Array;
  /** 三角形索引 */
  indices: Uint32Array;
}

export interface ConvexHullParams {
  type: 'convexHull';
  /** 点集 (交错存储 [x,y,z, ...]) */
  points: Float32Array;
}

/**
 * 碰撞几何体定义
 */
export interface CollisionGeometry {
  /** 唯一标识符 */
  id: string;

  /** 几何体类型 */
  type: CollisionGeometryType;

  /** 几何体参数 */
  params: CollisionParams;

  /** 相对于父对象的变换 */
  transform: Transform;

  /** 父对象 ID (机器人 link 或障碍物) */
  parentId: string;

  /** 父对象类型 */
  parentType: 'robot_link' | 'obstacle';

  /** 是否启用 */
  enabled: boolean;
}

// ============================================================================
// Safety Zone Types
// ============================================================================

/**
 * 安全等级
 */
export type SafetyLevel =
  | 'info'      // 信息级别，仅显示
  | 'warning'   // 警告级别，减速
  | 'danger'    // 危险级别，需要注意
  | 'stop';     // 停止级别，立即停止

/**
 * 安全区域可视化配置
 */
export interface SafetyZoneVisualization {
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

  /** 是否在警告时脉冲动画 */
  pulseOnWarning: boolean;

  /** 脉冲频率 (Hz) */
  pulseFrequency?: number;
}

/**
 * 安全区域定义
 */
export interface SafetyZone {
  /** 唯一标识符 */
  id: string;

  /** 显示名称 */
  name: string;

  /** 几何体类型 */
  type: CollisionGeometryType;

  /** 几何体参数 */
  params: CollisionParams;

  /** 世界坐标系中的变换 */
  transform: Transform;

  /** 安全等级 */
  level: SafetyLevel;

  /** 是否启用 */
  enabled: boolean;

  /** 可视化配置 */
  visualization: SafetyZoneVisualization;

  /** 触发条件：指定机器人 (空 = 所有) */
  triggerOnRobots?: string[];

  /** 触发条件：指定 link (空 = 所有) */
  triggerOnLinks?: string[];

  /** 进入区域时的动作 */
  enterAction?: SafetyAction;

  /** 退出区域时的动作 */
  exitAction?: SafetyAction;
}

/**
 * 安全动作
 */
export interface SafetyAction {
  /** 动作类型 */
  type: 'notify' | 'slow_down' | 'pause' | 'stop' | 'custom';

  /** 减速系数 (用于 slow_down) */
  speedFactor?: number;

  /** 自定义动作 ID */
  customActionId?: string;

  /** 动作参数 */
  params?: Record<string, unknown>;
}

// ============================================================================
// Collision Detection Types
// ============================================================================

/**
 * 碰撞对象类型
 */
export type CollisionObjectType = 'robot' | 'obstacle' | 'safetyZone';

/**
 * 碰撞对象引用
 */
export interface CollisionObjectRef {
  /** 对象类型 */
  type: CollisionObjectType;

  /** 对象 ID */
  id: string;

  /** Link 名称 (仅对机器人有效) */
  linkName?: string;

  /** 几何体 ID */
  geometryId?: string;
}

/**
 * 碰撞对
 */
export interface CollisionPair {
  /** 碰撞对象 A */
  objectA: CollisionObjectRef;

  /** 碰撞对象 B */
  objectB: CollisionObjectRef;

  /** 接触点 (世界坐标) */
  contactPoints?: Vector3[];

  /** 穿透深度 (米) */
  penetrationDepth?: number;

  /** 碰撞法向 (从 A 到 B) */
  normal?: Vector3;

  /** 最近点对 */
  closestPoints?: {
    pointA: Vector3;
    pointB: Vector3;
  };
}

/**
 * 碰撞检测结果
 */
export interface CollisionResult {
  /** 是否发生碰撞 */
  colliding: boolean;

  /** 碰撞对列表 */
  pairs: CollisionPair[];

  /** 检测时间戳 */
  timestamp: number;

  /** 检测耗时 (ms) */
  computeTime?: number;
}

/**
 * 安全区域触发状态
 */
export interface SafetyZoneTriggerState {
  /** 区域 ID */
  zoneId: string;

  /** 区域名称 */
  zoneName: string;

  /** 安全等级 */
  level: SafetyLevel;

  /** 触发对象 */
  triggeredBy: CollisionObjectRef[];

  /** 进入时间 */
  enterTime: number;
}

// ============================================================================
// Collision Visualization Types
// ============================================================================

/**
 * 碰撞可视化配置
 */
export interface CollisionVisualizationConfig {
  /** 是否显示碰撞几何体 */
  showCollisionGeometry: boolean;

  /** 碰撞几何体透明度 */
  collisionGeometryOpacity: number;

  /** 碰撞几何体颜色 */
  collisionGeometryColor: string;

  /** 是否高亮碰撞部分 */
  highlightCollisions: boolean;

  /** 碰撞高亮颜色 */
  collisionHighlightColor: string;

  /** 碰撞高亮动画 */
  collisionHighlightAnimation: 'none' | 'pulse' | 'flash';

  /** 是否显示接触点 */
  showContactPoints: boolean;

  /** 接触点大小 */
  contactPointSize: number;

  /** 接触点颜色 */
  contactPointColor: string;

  /** 是否显示穿透向量 */
  showPenetrationVectors: boolean;

  /** 穿透向量颜色 */
  penetrationVectorColor: string;

  /** 是否显示安全区域 */
  showSafetyZones: boolean;

  /** 安全区域等级颜色映射 */
  safetyLevelColors: Record<SafetyLevel, string>;
}

/**
 * 默认碰撞可视化配置
 */
export const DEFAULT_COLLISION_VISUALIZATION: CollisionVisualizationConfig = {
  showCollisionGeometry: false,
  collisionGeometryOpacity: 0.3,
  collisionGeometryColor: '#00ffff',
  highlightCollisions: true,
  collisionHighlightColor: '#ff0000',
  collisionHighlightAnimation: 'pulse',
  showContactPoints: true,
  contactPointSize: 5,
  contactPointColor: '#ffff00',
  showPenetrationVectors: false,
  penetrationVectorColor: '#ff00ff',
  showSafetyZones: true,
  safetyLevelColors: {
    info: '#00bfff',
    warning: '#ffa500',
    danger: '#ff4500',
    stop: '#ff0000',
  },
};

// ============================================================================
// Collision Manager Types
// ============================================================================

/**
 * 碰撞管理器接口
 */
export interface ICollisionManager {
  // 碰撞几何体管理
  getCollisionGeometries(objectId: string): CollisionGeometry[];
  setCollisionGeometryVisible(objectId: string, visible: boolean): void;
  setCollisionGeometryEnabled(geometryId: string, enabled: boolean): void;

  // 安全区域管理
  addSafetyZone(zone: SafetyZone): void;
  removeSafetyZone(id: string): void;
  updateSafetyZone(id: string, updates: Partial<SafetyZone>): void;
  getSafetyZone(id: string): SafetyZone | undefined;
  getSafetyZones(): SafetyZone[];
  setSafetyZoneEnabled(id: string, enabled: boolean): void;

  // 碰撞结果可视化
  showCollisionResult(result: CollisionResult): void;
  clearCollisionResult(): void;
  getLastCollisionResult(): CollisionResult | undefined;

  // 安全区域状态
  getTriggerState(): SafetyZoneTriggerState[];
  isInSafetyZone(objectId: string, zoneLevel?: SafetyLevel): boolean;

  // 配置
  setVisualizationConfig(config: Partial<CollisionVisualizationConfig>): void;
  getVisualizationConfig(): CollisionVisualizationConfig;

  // 事件订阅
  onCollision(callback: (result: CollisionResult) => void): () => void;
  onSafetyZoneEnter(callback: (state: SafetyZoneTriggerState) => void): () => void;
  onSafetyZoneExit(callback: (zoneId: string, objectId: string) => void): () => void;
}

// ============================================================================
// Collision Events
// ============================================================================

/**
 * 碰撞事件类型
 */
export type CollisionEventType =
  | 'collision_detected'
  | 'collision_cleared'
  | 'safety_zone_entered'
  | 'safety_zone_exited'
  | 'safety_level_changed';

/**
 * 碰撞事件
 */
export interface CollisionEvent {
  type: CollisionEventType;
  timestamp: number;
  data: unknown;
}

/**
 * 碰撞检测事件
 */
export interface CollisionDetectedEvent extends CollisionEvent {
  type: 'collision_detected';
  data: CollisionResult;
}

/**
 * 安全区域进入事件
 */
export interface SafetyZoneEnteredEvent extends CollisionEvent {
  type: 'safety_zone_entered';
  data: {
    zoneId: string;
    zoneName: string;
    level: SafetyLevel;
    objectId: string;
    objectType: CollisionObjectType;
    linkName?: string;
  };
}

/**
 * 安全区域退出事件
 */
export interface SafetyZoneExitedEvent extends CollisionEvent {
  type: 'safety_zone_exited';
  data: {
    zoneId: string;
    objectId: string;
    duration: number; // 停留时间 (ms)
  };
}

// ============================================================================
// Path Collision Check Types
// ============================================================================

/**
 * 路径碰撞检测请求
 */
export interface PathCollisionCheckRequest {
  /** 机器人 ID */
  robotId: string;

  /** 关节角度路径 */
  path: number[][];

  /** 检测分辨率 (0-1 之间插值点数) */
  resolution?: number;

  /** 是否包含障碍物 */
  includeObstacles?: string[];

  /** 是否包含安全区域 */
  includeSafetyZones?: boolean;

  /** 是否在第一个碰撞点停止 */
  stopAtFirstCollision?: boolean;
}

/**
 * 路径碰撞检测结果
 */
export interface PathCollisionCheckResult {
  /** 路径是否无碰撞 */
  collisionFree: boolean;

  /** 第一个碰撞点的索引 */
  firstCollisionIndex?: number;

  /** 第一个碰撞点的插值参数 (0-1) */
  firstCollisionParameter?: number;

  /** 碰撞详情 */
  collisionResult?: CollisionResult;

  /** 所有碰撞点 (如果 stopAtFirstCollision = false) */
  allCollisions?: Array<{
    index: number;
    parameter: number;
    result: CollisionResult;
  }>;

  /** 检测耗时 (ms) */
  computeTime?: number;
}

// ============================================================================
// Distance Query Types
// ============================================================================

/**
 * 距离查询请求
 */
export interface DistanceQueryRequest {
  /** 机器人 ID */
  robotId: string;

  /** 关节角度 (可选，默认使用当前状态) */
  angles?: number[];

  /** 查询对象 (可选，默认查询所有) */
  targetObjects?: string[];

  /** 是否只返回最近的 */
  onlyClosest?: boolean;
}

/**
 * 距离查询结果
 */
export interface DistanceQueryResult {
  /** 最小距离 */
  minDistance: number;

  /** 距离对列表 */
  distances: Array<{
    objectA: CollisionObjectRef;
    objectB: CollisionObjectRef;
    distance: number;
    closestPointA: Vector3;
    closestPointB: Vector3;
  }>;

  /** 计算耗时 (ms) */
  computeTime?: number;
}
