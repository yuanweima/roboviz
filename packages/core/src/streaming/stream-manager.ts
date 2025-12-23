/**
 * RoboViz Stream Manager
 *
 * 管理所有实时数据流，包括创建、销毁、订阅和状态监控
 */

import type {
  StreamConfig,
  StreamState,
  StreamFrame,
  StreamEvent,
  StreamDataEvent,
  StreamStatusEvent,
  StreamErrorEvent,
  IStreamManager,
  JointStateFrame,
  TcpPoseFrame,
} from './types';
import { GenericRingBuffer, TimestampedRingBuffer } from './ring-buffer';

// ============================================================================
// Types
// ============================================================================

type SubscriberCallback<T extends StreamFrame = StreamFrame> = (frame: T) => void;
type EventCallback = (event: StreamEvent) => void;

interface StreamInstance {
  config: StreamConfig;
  state: StreamState;
  buffer: GenericRingBuffer<StreamFrame>;
  subscribers: Set<SubscriberCallback>;
  lastFrameTime: number;
  frameCount: number;
  droppedCount: number;
}

// ============================================================================
// Stream Manager Implementation
// ============================================================================

/**
 * 流管理器实现
 */
export class StreamManager implements IStreamManager {
  private readonly streams: Map<string, StreamInstance> = new Map();
  private readonly eventListeners: Set<EventCallback> = new Set();
  private readonly streamIdCounter: Map<string, number> = new Map();

  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private readonly metricsUpdateInterval = 1000; // 1 second

  constructor() {
    this.startMetricsUpdate();
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * 创建数据流
   */
  async createStream(config: StreamConfig): Promise<string> {
    // 验证配置
    this.validateConfig(config);

    // 检查 streamId 是否已存在
    if (this.streams.has(config.streamId)) {
      throw new Error(`Stream with ID '${config.streamId}' already exists`);
    }

    // 创建流实例
    const instance: StreamInstance = {
      config,
      state: {
        streamId: config.streamId,
        status: 'active',
        actualFrequency: 0,
        latency: 0,
        droppedFrames: 0,
        bufferUsage: 0,
        totalFrames: 0,
        lastUpdateTime: Date.now(),
      },
      buffer: new GenericRingBuffer<StreamFrame>(config.bufferSize, 'drop_oldest'),
      subscribers: new Set(),
      lastFrameTime: 0,
      frameCount: 0,
      droppedCount: 0,
    };

    this.streams.set(config.streamId, instance);

    // 发送状态变更事件
    this.emitEvent({
      streamId: config.streamId,
      type: 'status_change',
      timestamp: Date.now(),
      data: {
        previousStatus: 'disconnected',
        currentStatus: 'active',
      },
    } as StreamStatusEvent);

    return config.streamId;
  }

  /**
   * 销毁数据流
   */
  async destroyStream(streamId: string): Promise<void> {
    const instance = this.streams.get(streamId);
    if (!instance) {
      throw new Error(`Stream '${streamId}' not found`);
    }

    // 清理订阅者
    instance.subscribers.clear();

    // 清理缓冲区
    instance.buffer.clear();

    // 移除流
    this.streams.delete(streamId);

    // 发送状态变更事件
    this.emitEvent({
      streamId,
      type: 'status_change',
      timestamp: Date.now(),
      data: {
        previousStatus: instance.state.status,
        currentStatus: 'disconnected',
      },
    } as StreamStatusEvent);
  }

  /**
   * 暂停数据流
   */
  pauseStream(streamId: string): void {
    const instance = this.getStreamInstance(streamId);
    if (instance.state.status === 'active') {
      const previousStatus = instance.state.status;
      instance.state.status = 'paused';

      this.emitEvent({
        streamId,
        type: 'status_change',
        timestamp: Date.now(),
        data: { previousStatus, currentStatus: 'paused' },
      } as StreamStatusEvent);
    }
  }

  /**
   * 恢复数据流
   */
  resumeStream(streamId: string): void {
    const instance = this.getStreamInstance(streamId);
    if (instance.state.status === 'paused') {
      instance.state.status = 'active';
      instance.lastFrameTime = Date.now();

      this.emitEvent({
        streamId,
        type: 'status_change',
        timestamp: Date.now(),
        data: { previousStatus: 'paused', currentStatus: 'active' },
      } as StreamStatusEvent);
    }
  }

  /**
   * 订阅数据流
   */
  subscribe<T extends StreamFrame>(
    streamId: string,
    callback: (frame: T) => void
  ): () => void {
    const instance = this.getStreamInstance(streamId);

    const wrappedCallback = callback as SubscriberCallback;
    instance.subscribers.add(wrappedCallback);

    // 返回取消订阅函数
    return () => {
      instance.subscribers.delete(wrappedCallback);
    };
  }

  /**
   * 推送数据 (用于数据生产者)
   */
  pushData<T extends StreamFrame>(streamId: string, frame: T): boolean {
    const instance = this.streams.get(streamId);
    if (!instance) {
      return false;
    }

    // 如果流暂停，不接收数据
    if (instance.state.status === 'paused') {
      return false;
    }

    // 更新时间戳和计数
    const now = Date.now();
    instance.frameCount++;
    instance.state.totalFrames++;

    // 计算延迟 (如果帧有时间戳)
    if (frame.timestamp) {
      const frameTimeMs = frame.timestamp / 1000; // 微秒转毫秒
      instance.state.latency = now - frameTimeMs;

      // 延迟预警
      if (instance.config.maxLatency && instance.state.latency > instance.config.maxLatency) {
        this.emitEvent({
          streamId,
          type: 'latency_warning',
          timestamp: now,
          data: { latency: instance.state.latency, threshold: instance.config.maxLatency },
        });
      }
    }

    // 尝试推入缓冲区
    const pushed = instance.buffer.push(frame);
    if (!pushed) {
      instance.droppedCount++;
      instance.state.droppedFrames++;

      this.emitEvent({
        streamId,
        type: 'buffer_overflow',
        timestamp: now,
        data: { droppedFrames: instance.droppedCount },
      });
    }

    // 更新缓冲区使用率
    instance.state.bufferUsage = instance.buffer.size / instance.buffer.capacity;

    // 通知订阅者
    for (const callback of instance.subscribers) {
      try {
        callback(frame);
      } catch (error) {
        console.error(`Error in stream subscriber for '${streamId}':`, error);
      }
    }

    instance.lastFrameTime = now;
    instance.state.lastUpdateTime = now;

    return pushed;
  }

  /**
   * 获取流状态
   */
  getStreamState(streamId: string): StreamState | undefined {
    return this.streams.get(streamId)?.state;
  }

  /**
   * 获取所有活跃流
   */
  getActiveStreams(): StreamState[] {
    return Array.from(this.streams.values())
      .filter(instance => instance.state.status === 'active')
      .map(instance => ({ ...instance.state }));
  }

  /**
   * 监听流事件
   */
  onStreamEvent(callback: EventCallback): () => void {
    this.eventListeners.add(callback);
    return () => {
      this.eventListeners.delete(callback);
    };
  }

  /**
   * 获取流配置
   */
  getStreamConfig(streamId: string): StreamConfig | undefined {
    return this.streams.get(streamId)?.config;
  }

  /**
   * 获取最新的 N 帧数据
   */
  getLatestFrames(streamId: string, count: number): StreamFrame[] {
    const instance = this.streams.get(streamId);
    if (!instance) {
      return [];
    }

    const allFrames = instance.buffer.toArray();
    return allFrames.slice(-count);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    for (const streamId of this.streams.keys()) {
      this.destroyStream(streamId).catch(console.error);
    }

    this.eventListeners.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private validateConfig(config: StreamConfig): void {
    if (!config.streamId) {
      throw new Error('Stream ID is required');
    }
    if (config.frequency <= 0) {
      throw new Error('Frequency must be positive');
    }
    if (config.bufferSize <= 0) {
      throw new Error('Buffer size must be positive');
    }
  }

  private getStreamInstance(streamId: string): StreamInstance {
    const instance = this.streams.get(streamId);
    if (!instance) {
      throw new Error(`Stream '${streamId}' not found`);
    }
    return instance;
  }

  private emitEvent(event: StreamEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in stream event listener:', error);
      }
    }
  }

  /**
   * 定期更新流指标
   */
  private startMetricsUpdate(): void {
    this.metricsInterval = setInterval(() => {
      const now = Date.now();

      for (const instance of this.streams.values()) {
        // 计算实际频率
        const elapsed = (now - (instance.lastFrameTime || now)) / 1000;
        if (elapsed > 0 && elapsed < 5) {
          // 使用移动平均
          const instantFreq = instance.frameCount / elapsed;
          instance.state.actualFrequency =
            instance.state.actualFrequency * 0.8 + instantFreq * 0.2;
        } else if (elapsed >= 5) {
          // 超过 5 秒没有数据，频率归零
          instance.state.actualFrequency = 0;

          // 如果流是活跃状态但没有数据，可能是错误
          if (instance.state.status === 'active' && instance.state.totalFrames > 0) {
            instance.state.status = 'error';
            instance.state.errorMessage = 'No data received for 5 seconds';

            this.emitEvent({
              streamId: instance.config.streamId,
              type: 'error',
              timestamp: now,
              data: {
                code: 'STREAM_TIMEOUT',
                message: 'No data received for 5 seconds',
              },
            } as StreamErrorEvent);
          }
        }

        // 重置计数器
        instance.frameCount = 0;
      }
    }, this.metricsUpdateInterval);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建流管理器实例
 */
export function createStreamManager(): StreamManager {
  return new StreamManager();
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalStreamManager: StreamManager | null = null;

/**
 * 获取全局流管理器实例
 */
export function getStreamManager(): StreamManager {
  if (!globalStreamManager) {
    globalStreamManager = createStreamManager();
  }
  return globalStreamManager;
}

/**
 * 重置全局流管理器 (主要用于测试)
 */
export function resetStreamManager(): void {
  if (globalStreamManager) {
    globalStreamManager.dispose();
    globalStreamManager = null;
  }
}
