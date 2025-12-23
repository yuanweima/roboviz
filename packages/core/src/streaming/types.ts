/**
 * RoboViz Streaming Types
 *
 * 定义实时数据流相关的类型，支持工业机器人高频数据传输
 */

import type { Vector3, Quaternion, Transform } from '../types';

// ============================================================================
// Stream Configuration
// ============================================================================

/**
 * 数据流类型
 */
export type StreamType =
  | 'joint_state'      // 关节状态 (位置/速度/力矩)
  | 'tcp_pose'         // TCP 位姿
  | 'sensor_data'      // 传感器数据
  | 'point_cloud'      // 点云数据
  | 'force_torque'     // 力/力矩传感器
  | 'io_state'         // IO 状态
  | 'custom';          // 自定义数据

/**
 * 流优先级
 */
export type StreamPriority = 'realtime' | 'high' | 'normal' | 'low';

/**
 * 压缩算法
 */
export type CompressionType = 'none' | 'lz4' | 'zstd';

/**
 * 流配置
 */
export interface StreamConfig {
  /** 流唯一标识符 */
  streamId: string;

  /** 数据流类型 */
  type: StreamType;

  /** 关联的机器人 ID (可选) */
  robotId?: string;

  /** 关联的传感器 ID (可选) */
  sensorId?: string;

  /** 目标频率 (Hz) */
  frequency: number;

  /** 环形缓冲区大小 */
  bufferSize: number;

  /** 压缩算法 */
  compression: CompressionType;

  /** 优先级 */
  priority: StreamPriority;

  /** 是否启用插值 */
  interpolation?: boolean;

  /** 最大延迟容忍 (ms) */
  maxLatency?: number;
}

/**
 * 流状态
 */
export interface StreamState {
  /** 流 ID */
  streamId: string;

  /** 当前状态 */
  status: 'active' | 'paused' | 'error' | 'disconnected';

  /** 实际频率 (Hz) */
  actualFrequency: number;

  /** 当前延迟 (ms) */
  latency: number;

  /** 丢帧数 */
  droppedFrames: number;

  /** 缓冲区使用率 (0-1) */
  bufferUsage: number;

  /** 接收的总帧数 */
  totalFrames: number;

  /** 最后更新时间戳 */
  lastUpdateTime: number;

  /** 错误信息 (如果有) */
  errorMessage?: string;
}

// ============================================================================
// Data Frames
// ============================================================================

/**
 * 基础数据帧
 */
export interface BaseFrame {
  /** 时间戳 (微秒) */
  timestamp: number;

  /** 序列号 */
  sequenceNumber: number;
}

/**
 * 关节状态数据帧
 */
export interface JointStateFrame extends BaseFrame {
  /** 关节位置 (rad) */
  positions: Float64Array;

  /** 关节速度 (rad/s) */
  velocities?: Float64Array;

  /** 关节加速度 (rad/s²) */
  accelerations?: Float64Array;

  /** 关节力矩 (Nm) */
  torques?: Float64Array;

  /** 电机电流 (A) */
  currents?: Float64Array;

  /** 关节温度 (°C) */
  temperatures?: Float64Array;
}

/**
 * TCP 位姿数据帧
 */
export interface TcpPoseFrame extends BaseFrame {
  /** 位置 [x, y, z] (m) */
  position: Float64Array;

  /** 姿态 [w, x, y, z] 四元数 */
  orientation: Float64Array;

  /** 线速度 [vx, vy, vz] (m/s) */
  linearVelocity?: Float64Array;

  /** 角速度 [wx, wy, wz] (rad/s) */
  angularVelocity?: Float64Array;

  /** 参考坐标系 ID */
  referenceFrameId?: string;
}

/**
 * 力/力矩传感器数据帧
 */
export interface ForceTorqueFrame extends BaseFrame {
  /** 力 [fx, fy, fz] (N) */
  force: Float64Array;

  /** 力矩 [tx, ty, tz] (Nm) */
  torque: Float64Array;

  /** 传感器坐标系 ID */
  sensorFrameId?: string;
}

/**
 * 点云数据帧
 */
export interface PointCloudFrame extends BaseFrame {
  /** 点数量 */
  pointCount: number;

  /** 点坐标 (交错存储 [x,y,z, x,y,z, ...]) */
  points: Float32Array;

  /** 颜色 (可选, [r,g,b,a, ...]) */
  colors?: Uint8Array;

  /** 强度 (可选) */
  intensities?: Float32Array;

  /** 法线 (可选) */
  normals?: Float32Array;
}

/**
 * IO 状态数据帧
 */
export interface IOStateFrame extends BaseFrame {
  /** 数字输入 */
  digitalInputs: boolean[];

  /** 数字输出 */
  digitalOutputs: boolean[];

  /** 模拟输入 */
  analogInputs?: Float64Array;

  /** 模拟输出 */
  analogOutputs?: Float64Array;
}

/**
 * 传感器数据帧 (通用)
 */
export interface SensorDataFrame extends BaseFrame {
  /** 传感器类型 */
  sensorType: string;

  /** 数据值 */
  values: Float64Array;

  /** 数据单位 */
  units?: string[];

  /** 数据标签 */
  labels?: string[];
}

/**
 * 所有帧类型联合
 */
export type StreamFrame =
  | JointStateFrame
  | TcpPoseFrame
  | ForceTorqueFrame
  | PointCloudFrame
  | IOStateFrame
  | SensorDataFrame;

// ============================================================================
// Stream Events
// ============================================================================

/**
 * 流事件类型
 */
export type StreamEventType =
  | 'data'
  | 'status_change'
  | 'error'
  | 'latency_warning'
  | 'buffer_overflow';

/**
 * 流事件
 */
export interface StreamEvent {
  streamId: string;
  type: StreamEventType;
  timestamp: number;
  data?: unknown;
}

/**
 * 数据事件
 */
export interface StreamDataEvent<T extends StreamFrame = StreamFrame> extends StreamEvent {
  type: 'data';
  data: T;
}

/**
 * 状态变更事件
 */
export interface StreamStatusEvent extends StreamEvent {
  type: 'status_change';
  data: {
    previousStatus: StreamState['status'];
    currentStatus: StreamState['status'];
  };
}

/**
 * 错误事件
 */
export interface StreamErrorEvent extends StreamEvent {
  type: 'error';
  data: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Ring Buffer
// ============================================================================

/**
 * 环形缓冲区配置
 */
export interface RingBufferConfig {
  /** 缓冲区容量 */
  capacity: number;

  /** 元素大小 (bytes) */
  elementSize: number;

  /** 溢出策略 */
  overflowPolicy: 'drop_oldest' | 'drop_newest' | 'block';
}

/**
 * 环形缓冲区接口
 */
export interface RingBuffer<T> {
  /** 推入数据 */
  push(data: T): boolean;

  /** 弹出数据 */
  pop(): T | undefined;

  /** 查看最新数据 */
  peek(): T | undefined;

  /** 查看最旧数据 */
  peekOldest(): T | undefined;

  /** 获取所有数据 (按时间顺序) */
  toArray(): T[];

  /** 清空缓冲区 */
  clear(): void;

  /** 当前大小 */
  readonly size: number;

  /** 容量 */
  readonly capacity: number;

  /** 是否为空 */
  readonly isEmpty: boolean;

  /** 是否已满 */
  readonly isFull: boolean;
}

// ============================================================================
// Interpolation
// ============================================================================

/**
 * 插值方法
 */
export type InterpolationMethod = 'none' | 'linear' | 'cubic' | 'spline';

/**
 * 插值器配置
 */
export interface InterpolatorConfig {
  /** 插值方法 */
  method: InterpolationMethod;

  /** 历史窗口大小 */
  windowSize: number;
}

/**
 * 插值器接口
 */
export interface Interpolator<T extends StreamFrame> {
  /** 添加采样点 */
  addSample(frame: T): void;

  /** 获取插值结果 */
  interpolate(timestamp: number): T | undefined;

  /** 清空历史 */
  clear(): void;
}

// ============================================================================
// Stream Manager Interface
// ============================================================================

/**
 * 流管理器接口
 */
export interface IStreamManager {
  /**
   * 创建数据流
   */
  createStream(config: StreamConfig): Promise<string>;

  /**
   * 销毁数据流
   */
  destroyStream(streamId: string): Promise<void>;

  /**
   * 暂停数据流
   */
  pauseStream(streamId: string): void;

  /**
   * 恢复数据流
   */
  resumeStream(streamId: string): void;

  /**
   * 订阅数据流
   */
  subscribe<T extends StreamFrame>(
    streamId: string,
    callback: (frame: T) => void
  ): () => void;

  /**
   * 推送数据 (用于数据生产者)
   */
  pushData<T extends StreamFrame>(streamId: string, frame: T): boolean;

  /**
   * 获取流状态
   */
  getStreamState(streamId: string): StreamState | undefined;

  /**
   * 获取所有活跃流
   */
  getActiveStreams(): StreamState[];

  /**
   * 监听流事件
   */
  onStreamEvent(callback: (event: StreamEvent) => void): () => void;
}
