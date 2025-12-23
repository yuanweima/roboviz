/**
 * RoboViz Message Handler
 *
 * JSON-RPC 2.0 消息处理器，负责方法注册和请求分发
 */

import type {
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification,
} from './types';
import {
  isRequest,
  isNotification,
  createResponse,
  createErrorResponse,
  ErrorCodes,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * 方法处理器
 */
export type MethodHandler<TParams = Record<string, unknown>, TResult = unknown> = (
  params: TParams
) => TResult | Promise<TResult>;

/**
 * 通知处理器
 */
export type NotificationHandler<TParams = Record<string, unknown>> = (
  params: TParams
) => void | Promise<void>;

/**
 * 方法注册项
 */
interface MethodRegistration {
  handler: MethodHandler;
  schema?: MethodSchema;
}

/**
 * 方法 Schema (用于参数验证)
 */
export interface MethodSchema {
  params?: {
    required?: string[];
    properties?: Record<string, { type: string; description?: string }>;
  };
  result?: {
    type: string;
    description?: string;
  };
  description?: string;
}

/**
 * 消息处理器配置
 */
export interface MessageHandlerConfig {
  /** 是否验证参数 */
  validateParams?: boolean;

  /** 错误处理器 */
  onError?: (error: Error, request: JsonRpcRequest) => void;

  /** 处理超时 (ms) */
  timeout?: number;
}

/**
 * 消息处理器接口
 */
export interface MessageHandler {
  /**
   * 处理消息
   */
  handle(message: JsonRpcMessage): Promise<JsonRpcResponse | void>;

  /**
   * 注册方法
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
   * 注销通知处理器
   */
  unregisterNotification(method: string): boolean;

  /**
   * 检查方法是否已注册
   */
  hasMethod(method: string): boolean;

  /**
   * 获取所有已注册方法列表
   */
  getRegisteredMethods(): string[];

  /**
   * 获取方法 Schema
   */
  getMethodSchema(method: string): MethodSchema | undefined;
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: Required<MessageHandlerConfig> = {
  validateParams: true,
  onError: (error, request) => {
    console.error(`Error handling request ${request.method}:`, error);
  },
  timeout: 30000,
};

// ============================================================================
// Message Handler Implementation
// ============================================================================

/**
 * 创建消息处理器
 */
export function createMessageHandler(config: MessageHandlerConfig = {}): MessageHandler {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const methods = new Map<string, MethodRegistration>();
  const notifications = new Map<string, NotificationHandler>();

  /**
   * 处理请求
   */
  async function handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params = {}, id } = request;

    // 查找处理器
    const registration = methods.get(method);
    if (!registration) {
      return createErrorResponse(
        id,
        ErrorCodes.METHOD_NOT_FOUND,
        `Method '${method}' not found`
      );
    }

    // 参数验证
    if (mergedConfig.validateParams && registration.schema?.params) {
      const validationError = validateParams(params, registration.schema.params);
      if (validationError) {
        return createErrorResponse(id, ErrorCodes.INVALID_PARAMS, validationError);
      }
    }

    try {
      // 执行处理器 (带超时)
      const result = await withTimeout(
        registration.handler(params as Record<string, unknown>),
        mergedConfig.timeout,
        `Method '${method}' timed out`
      );

      return createResponse(id, result);
    } catch (error) {
      mergedConfig.onError(error as Error, request);

      if (error instanceof JsonRpcException) {
        return createErrorResponse(id, error.code, error.message, error.data);
      }

      return createErrorResponse(
        id,
        ErrorCodes.INTERNAL_ERROR,
        (error as Error).message || 'Internal error'
      );
    }
  }

  /**
   * 处理通知
   */
  async function handleNotification(notification: JsonRpcNotification): Promise<void> {
    const { method, params = {} } = notification;

    const handler = notifications.get(method);
    if (!handler) {
      // 通知没有响应，静默忽略未注册的通知
      return;
    }

    try {
      await handler(params as Record<string, unknown>);
    } catch (error) {
      // 通知处理错误只记录，不返回
      console.error(`Error handling notification ${method}:`, error);
    }
  }

  return {
    async handle(message: JsonRpcMessage): Promise<JsonRpcResponse | void> {
      if (isRequest(message)) {
        return handleRequest(message);
      }

      if (isNotification(message)) {
        await handleNotification(message);
        return;
      }

      // 响应消息不在此处处理
      return;
    },

    registerMethod<TParams = Record<string, unknown>, TResult = unknown>(
      method: string,
      handler: MethodHandler<TParams, TResult>,
      schema?: MethodSchema
    ): void {
      methods.set(method, {
        handler: handler as MethodHandler,
        schema,
      });
    },

    registerNotification<TParams = Record<string, unknown>>(
      method: string,
      handler: NotificationHandler<TParams>
    ): void {
      notifications.set(method, handler as NotificationHandler);
    },

    unregisterMethod(method: string): boolean {
      return methods.delete(method);
    },

    unregisterNotification(method: string): boolean {
      return notifications.delete(method);
    },

    hasMethod(method: string): boolean {
      return methods.has(method) || notifications.has(method);
    },

    getRegisteredMethods(): string[] {
      return [...methods.keys()];
    },

    getMethodSchema(method: string): MethodSchema | undefined {
      return methods.get(method)?.schema;
    },
  };
}

// ============================================================================
// Utility Classes and Functions
// ============================================================================

/**
 * JSON-RPC 异常类
 */
export class JsonRpcException extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'JsonRpcException';
  }

  /**
   * 创建解析错误
   */
  static parseError(data?: unknown): JsonRpcException {
    return new JsonRpcException(ErrorCodes.PARSE_ERROR, 'Parse error', data);
  }

  /**
   * 创建无效请求错误
   */
  static invalidRequest(data?: unknown): JsonRpcException {
    return new JsonRpcException(ErrorCodes.INVALID_REQUEST, 'Invalid request', data);
  }

  /**
   * 创建方法未找到错误
   */
  static methodNotFound(method: string): JsonRpcException {
    return new JsonRpcException(ErrorCodes.METHOD_NOT_FOUND, `Method '${method}' not found`);
  }

  /**
   * 创建无效参数错误
   */
  static invalidParams(message: string, data?: unknown): JsonRpcException {
    return new JsonRpcException(ErrorCodes.INVALID_PARAMS, message, data);
  }

  /**
   * 创建内部错误
   */
  static internalError(message: string, data?: unknown): JsonRpcException {
    return new JsonRpcException(ErrorCodes.INTERNAL_ERROR, message, data);
  }
}

/**
 * 参数验证
 */
function validateParams(
  params: Record<string, unknown>,
  schema: { required?: string[]; properties?: Record<string, { type: string }> }
): string | null {
  // 检查必需参数
  if (schema.required) {
    for (const key of schema.required) {
      if (!(key in params)) {
        return `Missing required parameter: ${key}`;
      }
    }
  }

  // 检查参数类型
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (key in params) {
        const value = params[key];
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (prop.type !== 'any' && actualType !== prop.type) {
          return `Invalid type for parameter '${key}': expected ${prop.type}, got ${actualType}`;
        }
      }
    }
  }

  return null;
}

/**
 * 超时包装
 */
function withTimeout<T>(
  promise: T | Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  if (!(promise instanceof Promise)) {
    return Promise.resolve(promise);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ============================================================================
// Export Helper Types
// ============================================================================

export type { JsonRpcMessage, JsonRpcRequest, JsonRpcResponse, JsonRpcNotification };
