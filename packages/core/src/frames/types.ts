/**
 * RoboViz Coordinate Frame Types
 *
 * 坐标系管理相关类型定义
 */

import type { Vector3, Quaternion, Transform, Pose } from '../types';

// ============================================================================
// Frame Types
// ============================================================================

/**
 * 坐标系类型
 */
export type FrameType =
  | 'world'      // 世界坐标系 (固定原点)
  | 'base'       // 机器人基座坐标系
  | 'flange'     // 法兰盘坐标系 (机器人末端)
  | 'tool'       // 工具坐标系 (TCP)
  | 'user'       // 用户坐标系
  | 'workpiece'  // 工件坐标系
  | 'sensor'     // 传感器坐标系
  | 'camera'     // 相机坐标系
  | 'fixture'    // 夹具坐标系
  | 'custom';    // 自定义坐标系

/**
 * 坐标系可视化配置
 */
export interface FrameVisualization {
  /** 是否可见 */
  visible: boolean;

  /** 坐标轴长度 (米) */
  axisLength: number;

  /** 坐标轴粗细 */
  axisThickness: number;

  /** 是否显示标签 */
  showLabel: boolean;

  /** 标签大小 */
  labelSize: number;

  /** 标签偏移 */
  labelOffset?: Vector3;

  /** 坐标轴颜色 */
  colors: {
    x: string;  // 默认红色
    y: string;  // 默认绿色
    z: string;  // 默认蓝色
  };

  /** 是否显示坐标平面 */
  showPlanes?: boolean;

  /** 平面透明度 */
  planeOpacity?: number;

  /** 平面大小 */
  planeSize?: number;
}

/**
 * 坐标系节点
 */
export interface CoordinateFrame {
  /** 唯一标识符 */
  id: string;

  /** 显示名称 */
  name: string;

  /** 坐标系类型 */
  type: FrameType;

  /** 父坐标系 ID (null 表示世界坐标系) */
  parentFrameId: string | null;

  /** 相对于父坐标系的变换 */
  transform: Transform;

  /** 关联的机器人 ID (如果适用) */
  robotId?: string;

  /** 关联的传感器 ID (如果适用) */
  sensorId?: string;

  /** 可视化配置 */
  visualization: FrameVisualization;

  /** 是否可编辑 (用于交互式编辑) */
  editable?: boolean;

  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 活跃坐标系设置
 */
export interface ActiveFrames {
  /** 机器人 ID */
  robotId: string;

  /** 当前用户坐标系 ID */
  userFrameId: string | null;

  /** 当前工具坐标系 ID */
  toolFrameId: string | null;

  /** 当前工件坐标系 ID */
  workpieceFrameId: string | null;
}

// ============================================================================
// Frame Tree Types
// ============================================================================

/**
 * 坐标系树节点
 */
export interface FrameTreeNode {
  frame: CoordinateFrame;
  children: FrameTreeNode[];
  worldTransform: Transform;  // 缓存的世界坐标变换
  dirty: boolean;             // 是否需要更新缓存
}

/**
 * 坐标系树接口
 */
export interface IFrameTree {
  /** 获取所有坐标系 */
  getAllFrames(): CoordinateFrame[];

  /** 获取坐标系 */
  getFrame(id: string): CoordinateFrame | undefined;

  /** 添加坐标系 */
  addFrame(frame: CoordinateFrame): void;

  /** 移除坐标系 */
  removeFrame(id: string): void;

  /** 更新坐标系变换 */
  updateTransform(id: string, transform: Transform): void;

  /** 获取世界坐标变换 */
  getWorldTransform(frameId: string): Transform | undefined;

  /** 获取相对变换 (从 fromId 到 toId) */
  getRelativeTransform(fromId: string, toId: string): Transform | undefined;

  /** 获取子坐标系 */
  getChildren(frameId: string): CoordinateFrame[];

  /** 获取祖先链 */
  getAncestors(frameId: string): CoordinateFrame[];

  /** 检查是否为祖先 */
  isAncestor(ancestorId: string, descendantId: string): boolean;

  /** 设置父坐标系 */
  setParent(frameId: string, newParentId: string | null): void;
}

// ============================================================================
// Frame Manager Types
// ============================================================================

/**
 * 坐标系管理器配置
 */
export interface FrameManagerConfig {
  /** 是否自动创建世界坐标系 */
  autoCreateWorld: boolean;

  /** 默认可视化配置 */
  defaultVisualization: Partial<FrameVisualization>;

  /** 坐标系树更新间隔 (ms) */
  updateInterval: number;
}

/**
 * 坐标系树可视化配置
 */
export interface FrameTreeVisualizationConfig {
  /** 是否可见 */
  visible: boolean;

  /** 是否显示连接线 */
  showConnections: boolean;

  /** 连接线颜色 */
  connectionColor: string;

  /** 连接线样式 */
  connectionStyle: 'solid' | 'dashed';

  /** 可交互的坐标系 ID 列表 */
  interactiveFrames?: string[];

  /** 高亮的坐标系 ID */
  highlightedFrame?: string;

  /** 高亮颜色 */
  highlightColor?: string;
}

/**
 * 坐标系管理器接口
 */
export interface IFrameManager {
  // 坐标系 CRUD
  addFrame(frame: CoordinateFrame): void;
  removeFrame(id: string): void;
  updateFrame(id: string, updates: Partial<CoordinateFrame>): void;
  getFrame(id: string): CoordinateFrame | undefined;
  getAllFrames(): CoordinateFrame[];

  // 变换计算
  getWorldTransform(frameId: string): Transform | undefined;
  getRelativeTransform(fromId: string, toId: string): Transform | undefined;
  transformPoint(point: Vector3, fromFrame: string, toFrame: string): Vector3 | undefined;
  transformPose(pose: Pose, fromFrame: string, toFrame: string): Pose | undefined;

  // 活跃坐标系管理
  setActiveUserFrame(robotId: string, frameId: string | null): void;
  setActiveToolFrame(robotId: string, frameId: string | null): void;
  setActiveWorkpieceFrame(robotId: string, frameId: string | null): void;
  getActiveFrames(robotId: string): ActiveFrames | undefined;

  // 可视化
  setFrameVisualization(id: string, visualization: Partial<FrameVisualization>): void;
  showFrame(id: string): void;
  hideFrame(id: string): void;
  showAll(): void;
  hideAll(): void;

  // 坐标系树可视化
  showFrameTree(config?: Partial<FrameTreeVisualizationConfig>): void;
  hideFrameTree(): void;
  highlightFrame(id: string, duration?: number): void;

  // 事件
  onFrameAdded(callback: (frame: CoordinateFrame) => void): () => void;
  onFrameRemoved(callback: (frameId: string) => void): () => void;
  onFrameUpdated(callback: (frame: CoordinateFrame) => void): () => void;
  onActiveFramesChanged(callback: (active: ActiveFrames) => void): () => void;
}

// ============================================================================
// Frame Events
// ============================================================================

/**
 * 坐标系事件类型
 */
export type FrameEventType =
  | 'frame_added'
  | 'frame_removed'
  | 'frame_updated'
  | 'frame_selected'
  | 'frame_transform_changed'
  | 'active_frames_changed';

/**
 * 坐标系事件
 */
export interface FrameEvent {
  type: FrameEventType;
  frameId?: string;
  frame?: CoordinateFrame;
  activeFrames?: ActiveFrames;
  timestamp: number;
}

// ============================================================================
// Transform Utilities Types
// ============================================================================

/**
 * 欧拉角顺序
 */
export type EulerOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX';

/**
 * 旋转表示方式
 */
export interface Rotation {
  /** 四元数表示 */
  quaternion?: Quaternion;

  /** 欧拉角表示 (弧度) */
  euler?: {
    x: number;
    y: number;
    z: number;
    order: EulerOrder;
  };

  /** 轴角表示 */
  axisAngle?: {
    axis: Vector3;
    angle: number;
  };

  /** 旋转矩阵 (3x3, 行优先) */
  matrix?: number[];
}

/**
 * 变换工具接口
 */
export interface ITransformUtils {
  // 四元数操作
  multiplyQuaternions(q1: Quaternion, q2: Quaternion): Quaternion;
  invertQuaternion(q: Quaternion): Quaternion;
  normalizeQuaternion(q: Quaternion): Quaternion;
  slerpQuaternion(q1: Quaternion, q2: Quaternion, t: number): Quaternion;

  // 变换操作
  composeTransform(position: Vector3, orientation: Quaternion): Transform;
  invertTransform(t: Transform): Transform;
  multiplyTransforms(t1: Transform, t2: Transform): Transform;
  interpolateTransforms(t1: Transform, t2: Transform, t: number): Transform;

  // 坐标转换
  transformPoint(point: Vector3, transform: Transform): Vector3;
  transformVector(vector: Vector3, transform: Transform): Vector3;
  transformPose(pose: Pose, transform: Transform): Pose;

  // 旋转转换
  quaternionToEuler(q: Quaternion, order?: EulerOrder): { x: number; y: number; z: number };
  eulerToQuaternion(euler: { x: number; y: number; z: number }, order?: EulerOrder): Quaternion;
  quaternionToAxisAngle(q: Quaternion): { axis: Vector3; angle: number };
  axisAngleToQuaternion(axis: Vector3, angle: number): Quaternion;
  quaternionToMatrix(q: Quaternion): number[];
  matrixToQuaternion(m: number[]): Quaternion;

  // 变换矩阵
  transformToMatrix4(t: Transform): number[];  // 4x4 矩阵
  matrix4ToTransform(m: number[]): Transform;

  // 距离和角度
  distanceBetweenPoints(p1: Vector3, p2: Vector3): number;
  angleBetweenQuaternions(q1: Quaternion, q2: Quaternion): number;
}

// ============================================================================
// Predefined Frames
// ============================================================================

/**
 * 预定义坐标系 ID
 */
export const WORLD_FRAME_ID = 'world';

/**
 * 默认可视化配置
 */
export const DEFAULT_FRAME_VISUALIZATION: FrameVisualization = {
  visible: true,
  axisLength: 0.1,
  axisThickness: 2,
  showLabel: true,
  labelSize: 12,
  colors: {
    x: '#ff0000',
    y: '#00ff00',
    z: '#0000ff',
  },
};

/**
 * 创建世界坐标系
 */
export function createWorldFrame(): CoordinateFrame {
  return {
    id: WORLD_FRAME_ID,
    name: 'World',
    type: 'world',
    parentFrameId: null,
    transform: {
      position: [0, 0, 0],
      orientation: [1, 0, 0, 0],
    },
    visualization: {
      ...DEFAULT_FRAME_VISUALIZATION,
      axisLength: 0.2,
    },
    editable: false,
  };
}
