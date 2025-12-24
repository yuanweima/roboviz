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
  | 'image'            // 图像数据 (工业相机)
  | 'depth_image'      // 深度图像 (3D相机)
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

// ============================================================================
// Image Frames (工业相机/3D相机)
// ============================================================================

/**
 * 图像像素格式
 */
export type ImagePixelFormat =
  | 'rgb8'       // RGB 8-bit per channel
  | 'rgba8'      // RGBA 8-bit per channel
  | 'bgr8'       // BGR 8-bit per channel
  | 'bgra8'      // BGRA 8-bit per channel
  | 'mono8'      // Grayscale 8-bit
  | 'mono16'     // Grayscale 16-bit
  | 'bayer_rggb' // Bayer pattern RGGB
  | 'bayer_grbg' // Bayer pattern GRBG
  | 'yuv422'     // YUV 4:2:2
  | 'jpeg'       // JPEG compressed
  | 'png';       // PNG compressed

/**
 * 图像编码格式 (传输时)
 */
export type ImageEncoding = 'raw' | 'jpeg' | 'png' | 'webp' | 'h264' | 'h265';

/**
 * 图像数据帧 (工业相机)
 */
export interface ImageFrame extends BaseFrame {
  /** 相机 ID */
  cameraId: string;

  /** 图像宽度 (pixels) */
  width: number;

  /** 图像高度 (pixels) */
  height: number;

  /** 像素格式 */
  pixelFormat: ImagePixelFormat;

  /** 传输编码 */
  encoding: ImageEncoding;

  /** 图像数据 (原始字节或 base64) */
  data: Uint8Array | ArrayBuffer | string;

  /** 曝光时间 (微秒) */
  exposureTime?: number;

  /** 增益 */
  gain?: number;

  /** 帧 ID (相机内部计数器) */
  frameId?: number;

  /** 关联的坐标系 */
  frameRefId?: string;
}

/**
 * 深度图像数据帧 (3D相机)
 */
export interface DepthImageFrame extends BaseFrame {
  /** 相机 ID */
  cameraId: string;

  /** 图像宽度 (pixels) */
  width: number;

  /** 图像高度 (pixels) */
  height: number;

  /** 深度数据格式 */
  depthFormat: 'uint16_mm' | 'float32_m';

  /** 深度数据 */
  depthData: Uint16Array | Float32Array;

  /** 最小有效深度 (m) */
  minDepth: number;

  /** 最大有效深度 (m) */
  maxDepth: number;

  /** 配对的彩色图像 (可选) */
  colorImage?: {
    pixelFormat: ImagePixelFormat;
    encoding: ImageEncoding;
    data: Uint8Array | ArrayBuffer | string;
  };

  /** 相机内参 (用于反投影) */
  intrinsics?: {
    fx: number;
    fy: number;
    cx: number;
    cy: number;
  };
}

/**
 * 增量点云更新帧
 */
export interface PointCloudUpdateFrame extends BaseFrame {
  /** 点云 ID */
  cloudId: string;

  /** 更新类型 */
  updateType: 'full' | 'append' | 'replace_region' | 'clear';

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

  /** 区域边界 (用于 replace_region) */
  regionBounds?: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };

  /** 关联的坐标系 */
  frameRefId?: string;
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
  | SensorDataFrame
  | ImageFrame
  | DepthImageFrame
  | PointCloudUpdateFrame;

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
