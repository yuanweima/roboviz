/**
 * RoboViz Stream Client
 *
 * 流客户端，用于接收和处理二进制流数据
 */

import type { Transport } from '../transport/base';
import type {
  StreamFrame,
  JointStateFrame,
  TcpPoseFrame,
  ForceTorqueFrame,
  PointCloudFrame,
  StreamType,
} from './types';
import { BinaryProtocol, binaryProtocol, BinaryMessageType } from './binary-protocol';
import { getStreamManager, StreamManager } from './stream-manager';

// ============================================================================
// Types
// ============================================================================

/**
 * 流客户端配置
 */
export interface StreamClientConfig {
  /** 是否使用全局 StreamManager */
  useGlobalManager?: boolean;

  /** 自动重连二进制流 */
  autoReconnect?: boolean;

  /** 二进制消息批处理大小 */
  batchSize?: number;
}

/**
 * 流订阅回调
 */
type StreamCallback<T extends StreamFrame = StreamFrame> = (frame: T) => void;

// ============================================================================
// Stream Client
// ============================================================================

/**
 * 流客户端类
 *
 * 负责处理传输层的二进制消息，并将其转发到 StreamManager
 */
export class StreamClient {
  private readonly config: Required<StreamClientConfig>;
  private readonly manager: StreamManager;
  private transport: Transport | null = null;
  private readonly subscriptions: Map<string, StreamCallback[]> = new Map();
  private readonly pendingFrames: Map<string, StreamFrame[]> = new Map();
  private processingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: StreamClientConfig = {}) {
    this.config = {
      useGlobalManager: true,
      autoReconnect: true,
      batchSize: 10,
      ...config,
    };

    this.manager = this.config.useGlobalManager
      ? getStreamManager()
      : new StreamManager();
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * 设置传输层
   */
  setTransport(transport: Transport): void {
    // 如果已有传输层，先清理
    if (this.transport) {
      // 无法移除二进制消息处理器，只能替换
    }

    this.transport = transport;

    // 注册二进制消息处理器
    transport.onBinaryMessage?.((data: ArrayBuffer) => {
      this.handleBinaryMessage(data);
    });

    // 开始批处理定时器
    this.startBatchProcessing();
  }

  /**
   * 订阅特定类型的流
   */
  subscribe<T extends StreamFrame>(
    streamId: string,
    callback: StreamCallback<T>
  ): () => void {
    if (!this.subscriptions.has(streamId)) {
      this.subscriptions.set(streamId, []);
    }

    const callbacks = this.subscriptions.get(streamId)!;
    callbacks.push(callback as StreamCallback);

    // 同时注册到 StreamManager
    const unsubFromManager = this.manager.subscribe(streamId, callback);

    // 返回取消订阅函数
    return () => {
      const idx = callbacks.indexOf(callback as StreamCallback);
      if (idx !== -1) {
        callbacks.splice(idx, 1);
      }
      unsubFromManager();
    };
  }

  /**
   * 订阅关节状态流
   */
  subscribeJointState(
    robotId: string,
    callback: StreamCallback<JointStateFrame>
  ): () => void {
    const streamId = `joint_state_${robotId}`;
    return this.subscribe(streamId, callback);
  }

  /**
   * 订阅 TCP 位姿流
   */
  subscribeTcpPose(
    robotId: string,
    callback: StreamCallback<TcpPoseFrame>
  ): () => void {
    const streamId = `tcp_pose_${robotId}`;
    return this.subscribe(streamId, callback);
  }

  /**
   * 订阅力/力矩流
   */
  subscribeForceTorque(
    sensorId: string,
    callback: StreamCallback<ForceTorqueFrame>
  ): () => void {
    const streamId = `force_torque_${sensorId}`;
    return this.subscribe(streamId, callback);
  }

  /**
   * 发送二进制帧到远端
   */
  sendFrame(streamId: string, frame: StreamFrame): void {
    if (!this.transport?.isConnected()) {
      throw new Error('Transport is not connected');
    }

    const messageType = this.getMessageTypeForFrame(frame);
    const encoded = binaryProtocol.encode(messageType, frame);

    this.transport.sendBinary?.(encoded);
  }

  /**
   * 获取 StreamManager 实例
   */
  getManager(): StreamManager {
    return this.manager;
  }

  /**
   * 销毁客户端
   */
  dispose(): void {
    this.stopBatchProcessing();
    this.subscriptions.clear();
    this.pendingFrames.clear();

    if (!this.config.useGlobalManager) {
      this.manager.dispose();
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * 处理二进制消息
   */
  private handleBinaryMessage(data: ArrayBuffer): void {
    try {
      const decoded = binaryProtocol.decode(data);

      if (!decoded) {
        console.warn('Failed to decode binary message');
        return;
      }

      // 提取 streamId 或生成
      const streamId = this.getStreamIdFromFrame(decoded.type, decoded.data);

      // 添加到待处理队列
      if (!this.pendingFrames.has(streamId)) {
        this.pendingFrames.set(streamId, []);
      }
      this.pendingFrames.get(streamId)!.push(decoded.data as StreamFrame);

      // 如果待处理帧数超过批处理大小，立即处理
      if (this.pendingFrames.get(streamId)!.length >= this.config.batchSize) {
        this.processPendingFrames(streamId);
      }
    } catch (error) {
      console.error('Error handling binary message:', error);
    }
  }

  /**
   * 处理待处理的帧
   */
  private processPendingFrames(streamId: string): void {
    const frames = this.pendingFrames.get(streamId);
    if (!frames || frames.length === 0) {
      return;
    }

    // 清空待处理队列
    this.pendingFrames.set(streamId, []);

    // 推送到 StreamManager (只推最后一帧以减少延迟)
    const latestFrame = frames[frames.length - 1];
    this.manager.pushData(streamId, latestFrame);

    // 通知本地订阅者
    const callbacks = this.subscriptions.get(streamId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(latestFrame);
        } catch (error) {
          console.error(`Error in stream callback for '${streamId}':`, error);
        }
      }
    }
  }

  /**
   * 从帧数据获取 streamId
   */
  private getStreamIdFromFrame(type: BinaryMessageType, data: unknown): string {
    const frame = data as Record<string, unknown>;

    switch (type) {
      case BinaryMessageType.JOINT_STATE:
        return `joint_state_${frame.robotId || 'default'}`;
      case BinaryMessageType.TCP_POSE:
        return `tcp_pose_${frame.robotId || 'default'}`;
      case BinaryMessageType.FORCE_TORQUE:
        return `force_torque_${frame.sensorId || 'default'}`;
      case BinaryMessageType.POINT_CLOUD:
        return `point_cloud_${frame.frameId || 'default'}`;
      default:
        return `stream_${type}`;
    }
  }

  /**
   * 根据帧类型获取消息类型
   */
  private getMessageTypeForFrame(frame: StreamFrame): BinaryMessageType {
    // 根据帧的属性推断类型
    const frameAny = frame as unknown as Record<string, unknown>;

    if ('positions' in frameAny && 'velocities' in frameAny) {
      return BinaryMessageType.JOINT_STATE;
    }
    if ('position' in frameAny && 'orientation' in frameAny) {
      return BinaryMessageType.TCP_POSE;
    }
    if ('force' in frameAny && 'torque' in frameAny) {
      return BinaryMessageType.FORCE_TORQUE;
    }
    if ('points' in frameAny) {
      return BinaryMessageType.POINT_CLOUD;
    }

    return BinaryMessageType.JOINT_STATE; // 默认
  }

  /**
   * 开始批处理定时器
   */
  private startBatchProcessing(): void {
    if (this.processingTimer) {
      return;
    }

    // 每 10ms 处理一次待处理帧
    this.processingTimer = setInterval(() => {
      for (const streamId of this.pendingFrames.keys()) {
        this.processPendingFrames(streamId);
      }
    }, 10);
  }

  /**
   * 停止批处理定时器
   */
  private stopBatchProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建流客户端
 */
export function createStreamClient(config?: StreamClientConfig): StreamClient {
  return new StreamClient(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalStreamClient: StreamClient | null = null;

/**
 * 获取全局流客户端
 */
export function getStreamClient(): StreamClient {
  if (!globalStreamClient) {
    globalStreamClient = createStreamClient();
  }
  return globalStreamClient;
}

/**
 * 重置全局流客户端
 */
export function resetStreamClient(): void {
  if (globalStreamClient) {
    globalStreamClient.dispose();
    globalStreamClient = null;
  }
}
