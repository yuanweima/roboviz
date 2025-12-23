/**
 * RoboViz Transport Layer - Base Interface
 *
 * 定义传输层的抽象接口，支持多种传输实现
 */

import type { JsonRpcMessage } from '../protocol/types';

// ============================================================================
// Transport Interface
// ============================================================================

/**
 * 传输状态
 */
export type TransportState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * 传输配置基础接口
 */
export interface TransportConfig {
  /** 连接超时 (ms) */
  connectTimeout?: number;

  /** 请求超时 (ms) */
  requestTimeout?: number;

  /** 自动重连 */
  autoReconnect?: boolean;

  /** 重连间隔 (ms) */
  reconnectInterval?: number;

  /** 最大重连次数 */
  maxReconnectAttempts?: number;

  /** 心跳间隔 (ms), 0 = 禁用 */
  heartbeatInterval?: number;
}

/**
 * 传输事件类型
 */
export type TransportEventType =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'message'
  | 'reconnecting'
  | 'reconnected';

/**
 * 传输事件
 */
export interface TransportEvent {
  type: TransportEventType;
  timestamp: number;
  data?: unknown;
  error?: Error;
}

/**
 * 消息处理器
 */
export type MessageHandler = (message: JsonRpcMessage) => void;

/**
 * 事件处理器
 */
export type EventHandler = (event: TransportEvent) => void;

/**
 * 传输层抽象接口
 */
export interface Transport {
  /**
   * 发送消息
   */
  send(message: JsonRpcMessage): void;

  /**
   * 发送二进制数据 (用于流式传输)
   */
  sendBinary?(data: ArrayBuffer): void;

  /**
   * 注册消息处理器
   */
  onMessage(handler: MessageHandler): void;

  /**
   * 注册二进制消息处理器
   */
  onBinaryMessage?(handler: (data: ArrayBuffer) => void): void;

  /**
   * 连接到远程端点
   */
  connect(): Promise<void>;

  /**
   * 断开连接
   */
  disconnect(): void;

  /**
   * 检查连接状态
   */
  isConnected(): boolean;

  /**
   * 获取当前状态
   */
  getState(): TransportState;

  /**
   * 注册事件处理器
   */
  on(event: TransportEventType, handler: EventHandler): () => void;

  /**
   * 移除事件处理器
   */
  off(event: TransportEventType, handler: EventHandler): void;

  /**
   * 销毁传输实例
   */
  dispose(): void;
}

// ============================================================================
// Base Transport Implementation
// ============================================================================

/**
 * 默认传输配置
 */
export const DEFAULT_TRANSPORT_CONFIG: Required<TransportConfig> = {
  connectTimeout: 10000,
  requestTimeout: 10000,
  autoReconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
};

/**
 * 抽象传输基类
 *
 * 提供通用的事件处理和状态管理逻辑
 */
export abstract class BaseTransport implements Transport {
  protected config: Required<TransportConfig>;
  protected state: TransportState = 'disconnected';
  protected messageHandlers: Set<MessageHandler> = new Set();
  protected binaryMessageHandlers: Set<(data: ArrayBuffer) => void> = new Set();
  protected eventHandlers: Map<TransportEventType, Set<EventHandler>> = new Map();
  protected reconnectAttempts = 0;
  protected heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: TransportConfig = {}) {
    this.config = { ...DEFAULT_TRANSPORT_CONFIG, ...config };
  }

  // ==========================================================================
  // Abstract Methods (子类必须实现)
  // ==========================================================================

  /**
   * 实际发送消息的实现
   */
  protected abstract doSend(message: JsonRpcMessage): void;

  /**
   * 实际发送二进制数据的实现
   */
  protected abstract doSendBinary?(data: ArrayBuffer): void;

  /**
   * 实际连接的实现
   */
  protected abstract doConnect(): Promise<void>;

  /**
   * 实际断开连接的实现
   */
  protected abstract doDisconnect(): void;

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  send(message: JsonRpcMessage): void {
    if (!this.isConnected()) {
      throw new Error('Transport is not connected');
    }
    this.doSend(message);
  }

  sendBinary(data: ArrayBuffer): void {
    if (!this.isConnected()) {
      throw new Error('Transport is not connected');
    }
    if (this.doSendBinary) {
      this.doSendBinary(data);
    } else {
      throw new Error('Binary transport not supported');
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.add(handler);
  }

  onBinaryMessage(handler: (data: ArrayBuffer) => void): void {
    this.binaryMessageHandlers.add(handler);
  }

  async connect(): Promise<void> {
    if (this.state === 'connected') {
      return;
    }

    if (this.state === 'connecting') {
      throw new Error('Already connecting');
    }

    this.setState('connecting');

    try {
      await Promise.race([
        this.doConnect(),
        this.timeout(this.config.connectTimeout, 'Connection timeout'),
      ]);

      this.setState('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.emit('connect', {});
    } catch (error) {
      this.setState('error');
      this.emit('error', { error: error as Error });
      throw error;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.doDisconnect();
    this.setState('disconnected');
    this.emit('disconnect', {});
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  getState(): TransportState {
    return this.state;
  }

  on(event: TransportEventType, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  off(event: TransportEventType, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  dispose(): void {
    this.disconnect();
    this.messageHandlers.clear();
    this.binaryMessageHandlers.clear();
    this.eventHandlers.clear();
  }

  // ==========================================================================
  // Protected Methods (供子类使用)
  // ==========================================================================

  /**
   * 处理接收到的消息
   */
  protected handleMessage(message: JsonRpcMessage): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    }
  }

  /**
   * 处理接收到的二进制数据
   */
  protected handleBinaryMessage(data: ArrayBuffer): void {
    for (const handler of this.binaryMessageHandlers) {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in binary message handler:', error);
      }
    }
  }

  /**
   * 设置状态
   */
  protected setState(state: TransportState): void {
    this.state = state;
  }

  /**
   * 发送事件
   */
  protected emit(type: TransportEventType, data: Partial<TransportEvent>): void {
    const event: TransportEvent = {
      type,
      timestamp: Date.now(),
      ...data,
    };

    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in ${type} event handler:`, error);
        }
      }
    }
  }

  /**
   * 处理连接断开 (支持自动重连)
   */
  protected handleDisconnect(error?: Error): void {
    this.stopHeartbeat();

    if (error) {
      this.setState('error');
      this.emit('error', { error });
    } else {
      this.setState('disconnected');
    }

    this.emit('disconnect', { error });

    // 自动重连
    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * 调度重连
   */
  protected scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.emit('reconnecting', { data: { attempt: this.reconnectAttempts } });

    setTimeout(async () => {
      try {
        await this.connect();
        this.emit('reconnected', { data: { attempts: this.reconnectAttempts } });
      } catch {
        // 重连失败，connect 方法已经处理了错误
      }
    }, this.config.reconnectInterval);
  }

  /**
   * 启动心跳
   */
  protected startHeartbeat(): void {
    if (this.config.heartbeatInterval <= 0) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendHeartbeat();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  protected stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 发送心跳 (子类可重写)
   */
  protected sendHeartbeat(): void {
    // 默认发送 ping 消息
    try {
      this.send({
        jsonrpc: '2.0',
        method: 'ping',
      } as JsonRpcMessage);
    } catch {
      // 忽略心跳发送错误
    }
  }

  /**
   * 超时辅助函数
   */
  protected timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
}

// ============================================================================
// Export Types
// ============================================================================

export type { JsonRpcMessage };
