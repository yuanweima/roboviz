/**
 * RoboViz Direct Transport
 *
 * 直接调用传输实现，用于同一上下文中的通信
 * 适用于 React 组件直接嵌入的场景
 */

import type { JsonRpcMessage } from '../protocol/types';
import { BaseTransport, type TransportConfig, type MessageHandler } from './base';

// ============================================================================
// Direct Transport Config
// ============================================================================

/**
 * 直接传输配置
 */
export interface DirectTransportConfig extends TransportConfig {
  /** 目标处理器 (可选，用于双向通信) */
  target?: DirectTransport;
}

// ============================================================================
// Direct Transport Implementation
// ============================================================================

/**
 * 直接传输实现
 *
 * 用于同一 JavaScript 上下文中的直接消息传递
 * 主要用于 React 组件直接嵌入宿主应用的场景
 */
export class DirectTransport extends BaseTransport {
  private directConfig: DirectTransportConfig;
  private peer: DirectTransport | null = null;

  constructor(config: DirectTransportConfig = {}) {
    super(config);
    this.directConfig = config;

    if (config.target) {
      this.setPeer(config.target);
    }
  }

  // ==========================================================================
  // Abstract Method Implementations
  // ==========================================================================

  protected doSend(message: JsonRpcMessage): void {
    if (!this.peer) {
      throw new Error('No peer transport connected');
    }
    // 使用 microtask 确保异步行为，模拟真实传输
    queueMicrotask(() => {
      this.peer?.receiveMessage(message);
    });
  }

  protected doSendBinary(data: ArrayBuffer): void {
    if (!this.peer) {
      throw new Error('No peer transport connected');
    }
    // 复制数据以确保隔离
    const copy = data.slice(0);
    queueMicrotask(() => {
      this.peer?.receiveBinaryMessage(copy);
    });
  }

  protected doConnect(): Promise<void> {
    // 直接传输不需要实际连接过程
    return Promise.resolve();
  }

  protected doDisconnect(): void {
    // 断开与对等端的连接
    if (this.peer) {
      const peer = this.peer;
      this.peer = null;
      peer.handlePeerDisconnect();
    }
  }

  // ==========================================================================
  // Peer Management
  // ==========================================================================

  /**
   * 设置对等传输
   */
  setPeer(peer: DirectTransport): void {
    if (this.peer === peer) {
      return;
    }

    // 断开旧的对等连接
    if (this.peer) {
      const oldPeer = this.peer;
      this.peer = null;
      oldPeer.handlePeerDisconnect();
    }

    // 建立新的对等连接
    this.peer = peer;
    if (peer.peer !== this) {
      peer.setPeer(this);
    }
  }

  /**
   * 获取对等传输
   */
  getPeer(): DirectTransport | null {
    return this.peer;
  }

  /**
   * 处理对等端断开
   */
  private handlePeerDisconnect(): void {
    this.peer = null;
    this.handleDisconnect(new Error('Peer disconnected'));
  }

  // ==========================================================================
  // Message Reception (for peer to call)
  // ==========================================================================

  /**
   * 接收消息 (由对等端调用)
   */
  receiveMessage(message: JsonRpcMessage): void {
    this.handleMessage(message);
  }

  /**
   * 接收二进制消息 (由对等端调用)
   */
  receiveBinaryMessage(data: ArrayBuffer): void {
    this.handleBinaryMessage(data);
  }

  // ==========================================================================
  // Override isConnected
  // ==========================================================================

  override isConnected(): boolean {
    return this.state === 'connected' && this.peer !== null;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建直接传输
 */
export function createDirectTransport(config: DirectTransportConfig = {}): DirectTransport {
  return new DirectTransport(config);
}

/**
 * 创建一对已连接的直接传输
 *
 * @returns [clientTransport, serverTransport]
 */
export function createDirectTransportPair(
  clientConfig: DirectTransportConfig = {},
  serverConfig: DirectTransportConfig = {}
): [DirectTransport, DirectTransport] {
  const client = new DirectTransport(clientConfig);
  const server = new DirectTransport(serverConfig);

  client.setPeer(server);

  return [client, server];
}
