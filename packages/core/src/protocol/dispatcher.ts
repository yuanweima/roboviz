/**
 * RoboViz Dispatcher
 *
 * 负责协调消息处理器和传输层，提供完整的 JSON-RPC 2.0 通信能力
 */

import type { Transport } from '../transport/base';
import type {
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
} from './types';
import {
  isRequest,
  isResponse,
  isNotification,
  createErrorResponse,
  ErrorCodes,
} from './types';
import type { MessageHandler, MethodHandler, NotificationHandler, MethodSchema } from './handler';
import { createMessageHandler } from './handler';

// ============================================================================
// Types
// ============================================================================

/**
 * 待处理的请求
 */
interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  method: string;
  startTime: number;
}

/**
 * 桥接处理器 (用于转发请求到后端)
 */
export type BridgeHandler = (
  method: string,
  params: Record<string, unknown>
) => Promise<unknown>;

/**
 * Dispatcher 配置
 */
export interface DispatcherConfig {
  /** 请求超时 (ms) */
  requestTimeout?: number;

  /** 是否自动生成请求 ID */
  autoGenerateId?: boolean;

  /** 桥接处理器 (转发到后端) */
  bridgeHandler?: BridgeHandler;

  /** 桥接方法前缀 (匹配的请求会转发到后端) */
  bridgeMethods?: string[];
}

/**
 * Dispatcher 接口
 */
export interface Dispatcher {
  /**
   * 设置传输层
   */
  setTransport(transport: Transport): void;

  /**
   * 获取传输层
   */
  getTransport(): Transport | null;

  /**
   * 发送请求并等待响应
   */
  request<TResult = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<TResult>;

  /**
   * 发送通知 (不等待响应)
   */
  notify(method: string, params?: Record<string, unknown>): void;

  /**
   * 注册方法处理器
   */
  registerMethod<TParams = Record<string, unknown>, TResult = unknown>(
    method: string,
    handler: MethodHandler<TParams, TResult>,
    schema?: MethodSchema
  ): void;

  /**
   * 注册通知处理器
   */
  registerNotification<TParams = Record<string, unknown>>(
    method: string,
    handler: NotificationHandler<TParams>
  ): void;

  /**
   * 注销方法
   */
  unregisterMethod(method: string): boolean;

  /**
   * 批量注册方法
   */
  registerMethods(
    methods: Record<string, MethodHandler>
  ): void;

  /**
   * 设置桥接处理器
   */
  setBridgeHandler(handler: BridgeHandler): void;

  /**
   * 添加桥接方法前缀
   */
  addBridgeMethod(prefix: string): void;

  /**
   * 获取消息处理器
   */
  getMessageHandler(): MessageHandler;

  /**
   * 获取待处理请求数量
   */
  getPendingCount(): number;

  /**
   * 清理所有待处理请求
   */
  clearPending(error?: Error): void;

  /**
   * 销毁
   */
  dispose(): void;
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<DispatcherConfig, 'bridgeHandler'>> & { bridgeHandler?: BridgeHandler } = {
  requestTimeout: 30000,
  autoGenerateId: true,
  bridgeMethods: [],
};

// ============================================================================
// Dispatcher Implementation
// ============================================================================

/**
 * 创建 Dispatcher
 */
export function createDispatcher(config: DispatcherConfig = {}): Dispatcher {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const messageHandler = createMessageHandler();
  const pendingRequests = new Map<string | number, PendingRequest>();
  const bridgeMethods = new Set(mergedConfig.bridgeMethods);

  let transport: Transport | null = null;
  let bridgeHandler: BridgeHandler | undefined = mergedConfig.bridgeHandler;
  let requestIdCounter = 0;

  /**
   * 生成请求 ID
   */
  function generateId(): string {
    return `req_${++requestIdCounter}_${Date.now()}`;
  }

  /**
   * 处理接收到的消息
   */
  async function handleMessage(message: JsonRpcMessage): Promise<void> {
    // 处理响应消息
    if (isResponse(message)) {
      handleResponse(message);
      return;
    }

    // 处理请求消息
    if (isRequest(message)) {
      // 检查是否需要桥接
      if (shouldBridge(message.method)) {
        await handleBridgeRequest(message);
        return;
      }

      // 本地处理
      const response = await messageHandler.handle(message);
      if (response && transport) {
        transport.send(response);
      }
      return;
    }

    // 处理通知消息
    if (isNotification(message)) {
      await messageHandler.handle(message);
    }
  }

  /**
   * 处理响应消息
   */
  function handleResponse(response: JsonRpcResponse): void {
    const pending = pendingRequests.get(response.id);
    if (!pending) {
      // 可能是超时后收到的响应，忽略
      return;
    }

    // 清理
    clearTimeout(pending.timer);
    pendingRequests.delete(response.id);

    // 处理结果
    if (response.error) {
      pending.reject(
        new Error(`${response.error.message} (code: ${response.error.code})`)
      );
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * 检查是否需要桥接
   */
  function shouldBridge(method: string): boolean {
    if (!bridgeHandler) return false;

    for (const prefix of bridgeMethods) {
      if (method.startsWith(prefix)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 处理需要桥接的请求
   */
  async function handleBridgeRequest(request: JsonRpcRequest): Promise<void> {
    if (!bridgeHandler || !transport) {
      transport?.send(
        createErrorResponse(request.id, ErrorCodes.BRIDGE_ERROR, 'Bridge not available')
      );
      return;
    }

    try {
      const result = await bridgeHandler(request.method, request.params || {});
      transport.send({
        jsonrpc: '2.0',
        result,
        id: request.id,
      });
    } catch (error) {
      transport.send(
        createErrorResponse(
          request.id,
          ErrorCodes.BRIDGE_ERROR,
          (error as Error).message || 'Bridge error'
        )
      );
    }
  }

  /**
   * 发送请求
   */
  function request<TResult = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<TResult> {
    return new Promise((resolve, reject) => {
      if (!transport || !transport.isConnected()) {
        reject(new Error('Transport is not connected'));
        return;
      }

      const id = mergedConfig.autoGenerateId ? generateId() : requestIdCounter++;

      const timer = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`Request '${method}' timed out`));
      }, mergedConfig.requestTimeout);

      pendingRequests.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timer,
        method,
        startTime: Date.now(),
      });

      const message: JsonRpcRequest = {
        jsonrpc: '2.0',
        method,
        params,
        id,
      };

      try {
        transport.send(message);
      } catch (error) {
        clearTimeout(timer);
        pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  /**
   * 发送通知
   */
  function notify(method: string, params?: Record<string, unknown>): void {
    if (!transport || !transport.isConnected()) {
      throw new Error('Transport is not connected');
    }

    const message: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    transport.send(message);
  }

  return {
    setTransport(newTransport: Transport): void {
      // 清理旧传输
      if (transport) {
        // 保留之前的逻辑，不断开旧连接
      }

      transport = newTransport;
      transport.onMessage(handleMessage);
    },

    getTransport(): Transport | null {
      return transport;
    },

    request,

    notify,

    registerMethod<TParams = Record<string, unknown>, TResult = unknown>(
      method: string,
      handler: MethodHandler<TParams, TResult>,
      schema?: MethodSchema
    ): void {
      messageHandler.registerMethod(method, handler, schema);
    },

    registerNotification<TParams = Record<string, unknown>>(
      method: string,
      handler: NotificationHandler<TParams>
    ): void {
      messageHandler.registerNotification(method, handler);
    },

    unregisterMethod(method: string): boolean {
      return messageHandler.unregisterMethod(method);
    },

    registerMethods(methods: Record<string, MethodHandler>): void {
      for (const [name, handler] of Object.entries(methods)) {
        messageHandler.registerMethod(name, handler);
      }
    },

    setBridgeHandler(handler: BridgeHandler): void {
      bridgeHandler = handler;
    },

    addBridgeMethod(prefix: string): void {
      bridgeMethods.add(prefix);
    },

    getMessageHandler(): MessageHandler {
      return messageHandler;
    },

    getPendingCount(): number {
      return pendingRequests.size;
    },

    clearPending(error?: Error): void {
      const err = error || new Error('Request cancelled');
      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(err);
      }
      pendingRequests.clear();
    },

    dispose(): void {
      this.clearPending(new Error('Dispatcher disposed'));
      transport = null;
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 创建带有预注册处理器的 Dispatcher
 */
export function createDispatcherWithHandlers(
  handlers: {
    methods?: Record<string, MethodHandler>;
    notifications?: Record<string, NotificationHandler>;
    bridge?: {
      handler: BridgeHandler;
      methods: string[];
    };
  },
  config: DispatcherConfig = {}
): Dispatcher {
  const dispatcher = createDispatcher({
    ...config,
    bridgeHandler: handlers.bridge?.handler,
    bridgeMethods: handlers.bridge?.methods,
  });

  if (handlers.methods) {
    dispatcher.registerMethods(handlers.methods);
  }

  if (handlers.notifications) {
    for (const [name, handler] of Object.entries(handlers.notifications)) {
      dispatcher.registerNotification(name, handler);
    }
  }

  return dispatcher;
}
