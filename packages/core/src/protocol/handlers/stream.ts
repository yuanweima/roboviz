/**
 * RoboViz Stream Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for stream.* namespace
 */

import type { MethodHandler } from '../handler';
import type { StreamConfig, StreamState, StreamFrame } from '../../streaming/types';
import { getStreamManager } from '../../streaming/stream-manager';

// ============================================================================
// Types
// ============================================================================

/**
 * stream.create 参数
 */
interface StreamCreateParams {
  streamId: string;
  type: string;
  frequency: number;
  bufferSize?: number;
  robotId?: string;
  priority?: 'high' | 'normal' | 'low';
  compression?: 'none' | 'lz4' | 'zstd';
  maxLatency?: number;
}

/**
 * stream.subscribe 参数
 */
interface StreamSubscribeParams {
  streamId: string;
}

/**
 * stream.unsubscribe 参数
 */
interface StreamUnsubscribeParams {
  streamId: string;
}

/**
 * stream.pause 参数
 */
interface StreamPauseParams {
  streamId: string;
}

/**
 * stream.resume 参数
 */
interface StreamResumeParams {
  streamId: string;
}

/**
 * stream.destroy 参数
 */
interface StreamDestroyParams {
  streamId: string;
}

/**
 * stream.getState 参数
 */
interface StreamGetStateParams {
  streamId: string;
}

/**
 * stream.list 结果
 */
interface StreamListResult {
  streams: StreamState[];
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * stream.create - 创建数据流
 */
export const streamCreate: MethodHandler<StreamCreateParams, { streamId: string }> = async (params) => {
  const manager = getStreamManager();

  const config: StreamConfig = {
    streamId: params.streamId,
    type: params.type as StreamConfig['type'],
    frequency: params.frequency,
    bufferSize: params.bufferSize ?? 100,
    robotId: params.robotId,
    priority: params.priority ?? 'normal',
    compression: params.compression ?? 'none',
    maxLatency: params.maxLatency,
  };

  const streamId = await manager.createStream(config);
  return { streamId };
};

/**
 * stream.subscribe - 订阅数据流
 */
export const streamSubscribe: MethodHandler<StreamSubscribeParams, { success: boolean }> = async (params) => {
  const manager = getStreamManager();
  const state = manager.getStreamState(params.streamId);

  if (!state) {
    throw new Error(`Stream '${params.streamId}' not found`);
  }

  // Note: 实际订阅由传输层处理，这里只确认流存在
  return { success: true };
};

/**
 * stream.unsubscribe - 取消订阅
 */
export const streamUnsubscribe: MethodHandler<StreamUnsubscribeParams, { success: boolean }> = async (params) => {
  // Note: 实际取消订阅由传输层处理
  return { success: true };
};

/**
 * stream.pause - 暂停数据流
 */
export const streamPause: MethodHandler<StreamPauseParams, { success: boolean }> = (params) => {
  const manager = getStreamManager();
  manager.pauseStream(params.streamId);
  return { success: true };
};

/**
 * stream.resume - 恢复数据流
 */
export const streamResume: MethodHandler<StreamResumeParams, { success: boolean }> = (params) => {
  const manager = getStreamManager();
  manager.resumeStream(params.streamId);
  return { success: true };
};

/**
 * stream.destroy - 销毁数据流
 */
export const streamDestroy: MethodHandler<StreamDestroyParams, { success: boolean }> = async (params) => {
  const manager = getStreamManager();
  await manager.destroyStream(params.streamId);
  return { success: true };
};

/**
 * stream.getState - 获取流状态
 */
export const streamGetState: MethodHandler<StreamGetStateParams, StreamState | null> = (params) => {
  const manager = getStreamManager();
  const state = manager.getStreamState(params.streamId);
  return state ?? null;
};

/**
 * stream.list - 列出所有流
 */
export const streamList: MethodHandler<Record<string, never>, StreamListResult> = () => {
  const manager = getStreamManager();
  const streams = manager.getActiveStreams();
  return { streams };
};

/**
 * stream.getLatest - 获取最新帧
 */
export const streamGetLatest: MethodHandler<{ streamId: string; count?: number }, { frames: StreamFrame[] }> = (params) => {
  const manager = getStreamManager();
  const frames = manager.getLatestFrames(params.streamId, params.count ?? 1);
  return { frames };
};

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * 所有 stream.* 处理器
 */
export const streamHandlers: Record<string, MethodHandler> = {
  'stream.create': streamCreate,
  'stream.subscribe': streamSubscribe,
  'stream.unsubscribe': streamUnsubscribe,
  'stream.pause': streamPause,
  'stream.resume': streamResume,
  'stream.destroy': streamDestroy,
  'stream.getState': streamGetState,
  'stream.list': streamList,
  'stream.getLatest': streamGetLatest,
};

/**
 * 注册所有 stream 处理器到 dispatcher
 */
export function registerStreamHandlers(
  registerMethod: (method: string, handler: MethodHandler) => void
): void {
  for (const [method, handler] of Object.entries(streamHandlers)) {
    registerMethod(method, handler);
  }
}
