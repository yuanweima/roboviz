/**
 * RoboViz WebSocket Transport
 *
 * WebSocket 传输实现，支持文本和二进制消息
 */

import type { JsonRpcMessage } from '../protocol/types';
import { BaseTransport, type TransportConfig } from './base';

// ============================================================================
// WebSocket Transport Config
// ============================================================================

/**
 * WebSocket 传输配置
 */
export interface WebSocketTransportConfig extends TransportConfig {
  /** WebSocket URL */
  url: string;

  /** 子协议 */
  protocols?: string | string[];

  /** 二进制类型 */
  binaryType?: 'arraybuffer' | 'blob';
}

// ============================================================================
// WebSocket Transport Implementation
// ============================================================================

/**
 * WebSocket 传输实现
 */
export class WebSocketTransport extends BaseTransport {
  private wsConfig: WebSocketTransportConfig;
  private ws: WebSocket | null = null;

  constructor(config: WebSocketTransportConfig) {
    super(config);
    this.wsConfig = {
      binaryType: 'arraybuffer',
      ...config,
    };
  }

  // ==========================================================================
  // Abstract Method Implementations
  // ==========================================================================

  protected doSend(message: JsonRpcMessage): void {
    if (!this.ws) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  protected doSendBinary(data: ArrayBuffer): void {
    if (!this.ws) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(data);
  }

  protected doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsConfig.url, this.wsConfig.protocols);
        this.ws.binaryType = this.wsConfig.binaryType || 'arraybuffer';

        const onOpen = () => {
          cleanup();
          resolve();
        };

        const onError = (event: Event) => {
          cleanup();
          reject(new Error(`WebSocket connection failed: ${event}`));
        };

        const onClose = (event: CloseEvent) => {
          cleanup();
          if (!event.wasClean) {
            reject(new Error(`WebSocket closed unexpectedly: ${event.code} ${event.reason}`));
          }
        };

        const cleanup = () => {
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          this.ws?.removeEventListener('close', onClose);
        };

        this.ws.addEventListener('open', onOpen);
        this.ws.addEventListener('error', onError);
        this.ws.addEventListener('close', onClose);

        // 设置持久事件处理器
        this.setupEventHandlers();
      } catch (error) {
        reject(error);
      }
    });
  }

  protected doDisconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * 设置 WebSocket 事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        // 文本消息 (JSON-RPC)
        try {
          const message = JSON.parse(event.data) as JsonRpcMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // 二进制消息
        this.handleBinaryMessage(event.data);
      } else if (event.data instanceof Blob) {
        // Blob 类型，转换为 ArrayBuffer
        event.data.arrayBuffer().then((buffer) => {
          this.handleBinaryMessage(buffer);
        });
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      const error = !event.wasClean
        ? new Error(`WebSocket closed: ${event.code} ${event.reason}`)
        : undefined;
      this.handleDisconnect(error);
    };

    this.ws.onerror = () => {
      // 错误详情会在 onclose 中处理
      // WebSocket error 事件不提供详细信息
    };
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * 获取 WebSocket URL
   */
  getUrl(): string {
    return this.wsConfig.url;
  }

  /**
   * 获取 WebSocket 就绪状态
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * 获取缓冲区大小
   */
  getBufferedAmount(): number {
    return this.ws?.bufferedAmount ?? 0;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * 创建 WebSocket 传输
 */
export function createWebSocketTransport(config: WebSocketTransportConfig): WebSocketTransport {
  return new WebSocketTransport(config);
}
