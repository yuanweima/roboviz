/**
 * RoboViz Collision Types
 *
 * 碰撞检测和安全区域相关类型定义
 * 与 collision-manager.ts 实现对齐
 */

import type { Vector3, Transform } from '../types';

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
 * 碰撞几何体参数 (简化版)
 */
export interface CollisionGeometryParams {
  // Box
  width?: number;
  height?: number;
  depth?: number;
  // Sphere
  radius?: number;
  // Cylinder/Capsule also use radius + height
}

/**
 * 碰撞几何体定义 (简化版)
 */
export interface CollisionGeometry {
  /** 唯一标识符 */
  id: string;

  /** 几何体类型 */
  type: CollisionGeometryType;

  /** 几何体参数 */
  params: CollisionGeometryParams;

  /** 元数据 */
  metadata?: Record<string, unknown>;

  /** 关联对象类型 (用于碰撞检测结果) */
  associatedObjectType?: 'robot' | 'obstacle' | 'geometry';
}

// ============================================================================
// Safety Zone Types
// ============================================================================

/**
 * 安全等级
 */
export type SafetyLevel = 'info' | 'warning' | 'danger' | 'stop';

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
 * 安全区域定义 (简化版 - 与 manager 实现对齐)
 */
export interface SafetyZone {
  /** 唯一标识符 */
  id: string;

  /** 显示名称 */
  name: string;

  /** 几何体类型 */
  type: CollisionGeometryType;

  /** 几何体参数 */
  params: CollisionGeometryParams;

  /** 安全等级 */
  level: SafetyLevel;

  /** 动作类型 */
  action?: string;

  /** 世界坐标系中的变换 */
  transform: Transform;

  /** 几何体 (用于内部碰撞检测) */
  geometry?: {
    type: CollisionGeometryType;
    params: CollisionGeometryParams;
  };

  /** 是否启用 */
  enabled?: boolean;

  /** 可视化配置 */
  visualization?: SafetyZoneVisualization;

  /** 触发条件：指定机器人 (空 = 所有) */
  robotIds?: string[];

  /** 元数据 */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Collision Detection Types
// ============================================================================

/**
 * 碰撞对象引用
 */
export interface CollisionObjectRef {
  /** 对象类型 */
  type: string;

  /** 对象 ID */
  id: string;
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
  contactPoint?: Vector3;

  /** 穿透深度 (米) */
  penetrationDepth?: number;
}

/**
 * 碰撞检测结果
 */
export interface CollisionResult {
  /** 是否发生碰撞 */
  hasCollision: boolean;

  /** 碰撞对列表 */
  pairs: CollisionPair[];

  /** 检测时间戳 */
  timestamp: number;
}

/**
 * 安全区域触发状态
 */
export interface SafetyZoneTriggerState {
  /** 区域 ID */
  zoneId: string;

  /** 是否触发 */
  triggered: boolean;

  /** 进入时间 */
  enteredTime?: number;

  /** 安全等级 */
  level: SafetyLevel;
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
// Collision Manager Interface
// ============================================================================

/**
 * 碰撞管理器接口 (简化版)
 */
export interface ICollisionManager {
  // 碰撞几何体管理
  addCollisionGeometry(geometry: CollisionGeometry, transform?: Transform): void;
  removeCollisionGeometry(id: string): void;
  updateCollisionGeometry(id: string, updates: Partial<CollisionGeometry>): void;
  setCollisionGeometryTransform(id: string, transform: Transform): void;
  enableCollisionGeometry(id: string, enabled: boolean): void;
  getCollisionGeometry(id: string): CollisionGeometry | undefined;
  getAllCollisionGeometries(): CollisionGeometry[];
  clearCollisionGeometries(): void;

  // 安全区域管理
  addSafetyZone(zone: SafetyZone): void;
  removeSafetyZone(id: string): void;
  updateSafetyZone(id: string, updates: Partial<SafetyZone>): void;
  getSafetyZone(id: string): SafetyZone | undefined;
  getAllSafetyZones(): SafetyZone[];
  getSafetyZonesByLevel(level: SafetyLevel): SafetyZone[];
  clearSafetyZones(): void;

  // 碰撞检测
  checkCollisions(): CollisionResult;
  getLastCollisionResult(): CollisionResult | null;
  getSafetyZoneTriggerStates(): SafetyZoneTriggerState[];

  // 路径碰撞检测
  checkPathCollision(request: PathCollisionCheckRequest): PathCollisionCheckResult;

  // 距离查询
  queryDistance(request: DistanceQueryRequest): DistanceQueryResult;

  // 机器人安全区域检测
  checkRobotInSafetyZones(robotId: string, tcpPosition: Vector3): SafetyZoneTriggerState[];

  // 可视化配置
  setVisualizationConfig(config: Partial<CollisionVisualizationConfig>): void;
  getVisualizationConfig(): CollisionVisualizationConfig;

  // 事件
  onCollisionEvent(callback: (event: CollisionEvent) => void): () => void;

  // 持续监测
  startContinuousCheck(intervalMs?: number): void;
  stopContinuousCheck(): void;

  // 清理
  dispose(): void;
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
 * 碰撞事件基类
 */
export interface CollisionEvent {
  type: CollisionEventType;
  timestamp: number;
}

/**
 * 碰撞检测事件
 */
export interface CollisionDetectedEvent extends CollisionEvent {
  type: 'collision_detected';
  pairs: CollisionPair[];
}

/**
 * 安全区域进入事件
 */
export interface SafetyZoneEnteredEvent extends CollisionEvent {
  type: 'safety_zone_entered';
  zoneId: string;
  robotId: string;
  level: SafetyLevel;
}

/**
 * 安全区域退出事件
 */
export interface SafetyZoneExitedEvent extends CollisionEvent {
  type: 'safety_zone_exited';
  zoneId: string;
  robotId: string;
  level: SafetyLevel;
}

// ============================================================================
// Path Collision Check Types
// ============================================================================

/**
 * 路径碰撞检测请求
 */
export interface PathCollisionCheckRequest {
  /** 路径点列表 */
  path: Vector3[];

  /** 检测分辨率 */
  resolution?: number;

  /** 机器人 ID */
  robotId?: string;

  /** 指定几何体 ID */
  geometryId?: string;
}

/**
 * 路径碰撞检测结果
 */
export interface PathCollisionCheckResult {
  /** 是否有碰撞 */
  hasCollision: boolean;

  /** 碰撞点列表 */
  collisions: Array<{
    pathIndex: number;
    position: Vector3;
    geometryId: string;
  }>;

  /** 检测的点数 */
  checkedPoints: number;
}

// ============================================================================
// Distance Query Types
// ============================================================================

/**
 * 距离查询请求
 */
export interface DistanceQueryRequest {
  /** 查询点 */
  point: Vector3;

  /** 指定几何体 ID 列表 */
  geometryIds?: string[];

  /** 最大距离 */
  maxDistance?: number;
}

/**
 * 距离查询结果
 */
export interface DistanceQueryResult {
  /** 最小距离 */
  distance: number;

  /** 最近几何体 ID */
  closestGeometryId?: string;

  /** 最近点 */
  closestPoint?: Vector3;
}
