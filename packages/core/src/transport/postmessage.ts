/**
 * RoboViz PostMessage Transport
 *
 * 基于 window.postMessage 的传输实现
 * 用于 iframe 嵌入场景的跨域通信
 */

import type { JsonRpcMessage } from '../protocol/types';
import { BaseTransport, type TransportConfig } from './base';

// ============================================================================
// PostMessage Transport Config
// ============================================================================

/**
 * PostMessage 传输配置
 */
export interface PostMessageTransportConfig extends TransportConfig {
  /** 目标窗口 (iframe.contentWindow 或 window.parent) */
  targetWindow: Window;

  /** 目标 origin (用于安全验证) */
  targetOrigin: string;

  /** 源 origin 白名单 (用于验证接收的消息) */
  allowedOrigins?: string[];

  /** 消息通道 ID (用于多个实例区分) */
  channelId?: string;
}

// ============================================================================
// Message Envelope
// ============================================================================

/**
 * PostMessage 消息信封
 */
interface MessageEnvelope {
  /** 协议标识 */
  protocol: 'roboviz';

  /** 消息通道 ID */
  channelId?: string;

  /** 消息类型 */
  type: 'message' | 'binary' | 'ping' | 'pong' | 'connect' | 'disconnect';

  /** 消息内容 */
  payload?: JsonRpcMessage | string; // 二进制数据用 base64 编码

  /** 时间戳 */
  timestamp: number;
}

// ============================================================================
// PostMessage Transport Implementation
// ============================================================================

/**
 * PostMessage 传输实现
 *
 * 用于 iframe 嵌入场景，通过 window.postMessage 进行通信
 */
export class PostMessageTransport extends BaseTransport {
  private pmConfig: PostMessageTransportConfig;
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private connected = false;

  constructor(config: PostMessageTransportConfig) {
    super(config);
    this.pmConfig = {
      allowedOrigins: [config.targetOrigin],
      ...config,
    };
  }

  // ==========================================================================
  // Abstract Method Implementations
  // ==========================================================================

  protected doSend(message: JsonRpcMessage): void {
    this.postMessage({
      protocol: 'roboviz',
      channelId: this.pmConfig.channelId,
      type: 'message',
      payload: message,
      timestamp: Date.now(),
    });
  }

  protected doSendBinary(data: ArrayBuffer): void {
    // 将 ArrayBuffer 转换为 base64
    const base64 = this.arrayBufferToBase64(data);
    this.postMessage({
      protocol: 'roboviz',
      channelId: this.pmConfig.channelId,
      type: 'binary',
      payload: base64,
      timestamp: Date.now(),
    });
  }

  protected doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 设置消息监听器
      this.setupMessageListener();

      // 发送连接请求
      this.postMessage({
        protocol: 'roboviz',
        channelId: this.pmConfig.channelId,
        type: 'connect',
        timestamp: Date.now(),
      });

      // 等待连接确认或超时
      const timeout = setTimeout(() => {
        // 假设连接成功（PostMessage 没有握手机制）
        this.connected = true;
        resolve();
      }, 100);

      // 如果收到 pong 响应，立即确认连接
      const checkConnection = () => {
        if (this.connected) {
          clearTimeout(timeout);
          resolve();
        }
      };

      // 设置一个临时处理器来检测 pong 响应
      const originalHandler = this.messageListener;
      this.messageListener = (event: MessageEvent) => {
        originalHandler?.(event);
        const envelope = event.data as MessageEnvelope;
        if (envelope?.protocol === 'roboviz' && envelope.type === 'pong') {
          this.connected = true;
          checkConnection();
        }
      };

      window.addEventListener('message', this.messageListener);
    });
  }

  protected doDisconnect(): void {
    // 发送断开通知
    try {
      this.postMessage({
        protocol: 'roboviz',
        channelId: this.pmConfig.channelId,
        type: 'disconnect',
        timestamp: Date.now(),
      });
    } catch {
      // 忽略发送失败
    }

    // 清理监听器
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }

    this.connected = false;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * 设置消息监听器
   */
  private setupMessageListener(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }

    this.messageListener = (event: MessageEvent) => {
      // 验证来源
      if (!this.isAllowedOrigin(event.origin)) {
        return;
      }

      // 验证消息格式
      const envelope = event.data as MessageEnvelope;
      if (!this.isValidEnvelope(envelope)) {
        return;
      }

      // 检查通道 ID
      if (this.pmConfig.channelId && envelope.channelId !== this.pmConfig.channelId) {
        return;
      }

      // 处理消息
      this.handleEnvelope(envelope);
    };

    window.addEventListener('message', this.messageListener);
  }

  /**
   * 验证来源是否允许
   */
  private isAllowedOrigin(origin: string): boolean {
    if (!this.pmConfig.allowedOrigins || this.pmConfig.allowedOrigins.length === 0) {
      return true;
    }
    return this.pmConfig.allowedOrigins.includes(origin) || this.pmConfig.allowedOrigins.includes('*');
  }

  /**
   * 验证消息信封格式
   */
  private isValidEnvelope(envelope: unknown): envelope is MessageEnvelope {
    if (!envelope || typeof envelope !== 'object') {
      return false;
    }
    const env = envelope as MessageEnvelope;
    return env.protocol === 'roboviz' && typeof env.type === 'string';
  }

  /**
   * 处理消息信封
   */
  private handleEnvelope(envelope: MessageEnvelope): void {
    switch (envelope.type) {
      case 'message':
        if (envelope.payload && typeof envelope.payload === 'object') {
          this.handleMessage(envelope.payload as JsonRpcMessage);
        }
        break;

      case 'binary':
        if (typeof envelope.payload === 'string') {
          const data = this.base64ToArrayBuffer(envelope.payload);
          this.handleBinaryMessage(data);
        }
        break;

      case 'ping':
        // 响应 ping
        this.postMessage({
          protocol: 'roboviz',
          channelId: this.pmConfig.channelId,
          type: 'pong',
          timestamp: Date.now(),
        });
        break;

      case 'pong':
        // 连接确认
        this.connected = true;
        break;

      case 'connect':
        // 对端请求连接，发送 pong 响应
        this.connected = true;
        this.postMessage({
          protocol: 'roboviz',
          channelId: this.pmConfig.channelId,
          type: 'pong',
          timestamp: Date.now(),
        });
        break;

      case 'disconnect':
        // 对端断开
        this.handleDisconnect();
        break;
    }
  }

  /**
   * 发送 PostMessage
   */
  private postMessage(envelope: MessageEnvelope): void {
    this.pmConfig.targetWindow.postMessage(envelope, this.pmConfig.targetOrigin);
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64 转 ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ==========================================================================
  // Override sendHeartbeat
  // ==========================================================================

  protected override sendHeartbeat(): void {
    // 使用 ping/pong 机制代替 JSON-RPC ping
    this.postMessage({
      protocol: 'roboviz',
      channelId: this.pmConfig.channelId,
      type: 'ping',
      timestamp: Date.now(),
    });
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * 获取目标 Origin
   */
  getTargetOrigin(): string {
    return this.pmConfig.targetOrigin;
  }

  /**
   * 获取通道 ID
   */
  getChannelId(): string | undefined {
    return this.pmConfig.channelId;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * 创建 PostMessage 传输
 */
export function createPostMessageTransport(
  config: PostMessageTransportConfig
): PostMessageTransport {
  return new PostMessageTransport(config);
}

/**
 * 创建用于 iframe 嵌入的 PostMessage 传输
 *
 * @param iframe - iframe 元素
 * @param targetOrigin - 目标 origin
 * @param options - 其他配置选项
 */
export function createIframeTransport(
  iframe: HTMLIFrameElement,
  targetOrigin: string,
  options: Partial<Omit<PostMessageTransportConfig, 'targetWindow' | 'targetOrigin'>> = {}
): PostMessageTransport {
  if (!iframe.contentWindow) {
    throw new Error('iframe contentWindow is not available');
  }

  return createPostMessageTransport({
    ...options,
    targetWindow: iframe.contentWindow,
    targetOrigin,
  });
}

/**
 * 创建用于父窗口通信的 PostMessage 传输 (从 iframe 内部使用)
 *
 * @param targetOrigin - 父窗口 origin
 * @param options - 其他配置选项
 */
export function createParentWindowTransport(
  targetOrigin: string,
  options: Partial<Omit<PostMessageTransportConfig, 'targetWindow' | 'targetOrigin'>> = {}
): PostMessageTransport {
  if (!window.parent || window.parent === window) {
    throw new Error('No parent window available');
  }

  return createPostMessageTransport({
    ...options,
    targetWindow: window.parent,
    targetOrigin,
  });
}
