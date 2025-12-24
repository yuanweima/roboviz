/**
 * useCameraStream - 相机图像流 Hook
 *
 * 用于订阅和管理工业相机的实时图像流
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStreamManager } from '../streaming/stream-manager';
import type {
  ImageFrame,
  DepthImageFrame,
  StreamConfig,
  StreamState,
} from '../streaming/types';

// ============================================================================
// Types
// ============================================================================

export interface CameraStreamOptions {
  /** 流 ID (如果已存在) */
  streamId?: string;

  /** 是否自动创建流 */
  autoCreate?: boolean;

  /** 流配置 (用于自动创建) */
  streamConfig?: Partial<StreamConfig>;

  /** 目标帧率 (用于限流) */
  targetFps?: number;

  /** 是否启用帧跳过 (当处理不过来时) */
  enableFrameSkip?: boolean;

  /** 最大延迟容忍 (ms)，超过则丢弃旧帧 */
  maxLatency?: number;

  /** 接收到帧时的回调 */
  onFrame?: (frame: ImageFrame | DepthImageFrame) => void;

  /** 错误回调 */
  onError?: (error: Error) => void;
}

export interface CameraStreamState {
  /** 当前帧 */
  frame: ImageFrame | DepthImageFrame | null;

  /** 是否已连接 */
  connected: boolean;

  /** 当前 FPS */
  fps: number;

  /** 流状态 */
  streamState: StreamState | null;

  /** 帧计数 */
  frameCount: number;

  /** 丢帧数 */
  droppedFrames: number;

  /** 平均延迟 (ms) */
  avgLatency: number;

  /** 错误信息 */
  error: string | null;
}

export interface CameraStreamControls {
  /** 开始接收 */
  start: () => void;

  /** 停止接收 */
  stop: () => void;

  /** 暂停 */
  pause: () => void;

  /** 恢复 */
  resume: () => void;

  /** 截取当前帧 */
  captureFrame: () => ImageFrame | DepthImageFrame | null;

  /** 重置统计 */
  resetStats: () => void;
}

export type UseCameraStreamReturn = [CameraStreamState, CameraStreamControls];

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCameraStream(
  cameraId: string,
  options: CameraStreamOptions = {}
): UseCameraStreamReturn {
  const {
    streamId: providedStreamId,
    autoCreate = false,
    streamConfig,
    targetFps = 30,
    enableFrameSkip = true,
    maxLatency = 200,
    onFrame,
    onError,
  } = options;

  // 状态
  const [state, setState] = useState<CameraStreamState>({
    frame: null,
    connected: false,
    fps: 0,
    streamState: null,
    frameCount: 0,
    droppedFrames: 0,
    avgLatency: 0,
    error: null,
  });

  // Refs
  const streamIdRef = useRef<string | null>(providedStreamId || null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isRunningRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const frameTimestampsRef = useRef<number[]>([]);
  const latencyHistoryRef = useRef<number[]>([]);

  // 帧率限制
  const frameIntervalMs = 1000 / targetFps;

  // 处理新帧
  const handleFrame = useCallback(
    (frame: ImageFrame | DepthImageFrame) => {
      const now = performance.now();

      // 帧率限制
      if (enableFrameSkip && now - lastFrameTimeRef.current < frameIntervalMs) {
        setState((prev) => ({
          ...prev,
          droppedFrames: prev.droppedFrames + 1,
        }));
        return;
      }

      // 延迟检查
      const frameTime = frame.timestamp / 1000; // 微秒转毫秒
      const latency = now - frameTime;
      if (maxLatency > 0 && latency > maxLatency) {
        setState((prev) => ({
          ...prev,
          droppedFrames: prev.droppedFrames + 1,
        }));
        return;
      }

      lastFrameTimeRef.current = now;

      // 更新 FPS 计算
      frameTimestampsRef.current.push(now);
      frameTimestampsRef.current = frameTimestampsRef.current.filter((t) => t > now - 1000);
      const fps = frameTimestampsRef.current.length;

      // 更新延迟历史
      latencyHistoryRef.current.push(latency);
      if (latencyHistoryRef.current.length > 30) {
        latencyHistoryRef.current.shift();
      }
      const avgLatency =
        latencyHistoryRef.current.reduce((a, b) => a + b, 0) / latencyHistoryRef.current.length;

      // 更新状态
      setState((prev) => ({
        ...prev,
        frame,
        fps,
        frameCount: prev.frameCount + 1,
        avgLatency,
        error: null,
      }));

      // 回调
      if (onFrame) {
        onFrame(frame);
      }
    },
    [targetFps, enableFrameSkip, maxLatency, onFrame, frameIntervalMs]
  );

  // 开始接收
  const start = useCallback(async () => {
    if (isRunningRef.current) return;

    try {
      const streamManager = getStreamManager();
      let streamId = streamIdRef.current;

      // 如果需要自动创建流
      if (!streamId && autoCreate) {
        const config: StreamConfig = {
          streamId: `camera_${cameraId}_${Date.now()}`,
          type: 'image',
          frequency: targetFps,
          bufferSize: 3,
          compression: 'none',
          priority: 'high',
          sensorId: cameraId,
          ...streamConfig,
        };
        streamId = await streamManager.createStream(config);
        streamIdRef.current = streamId;
      }

      if (!streamId) {
        throw new Error('No stream ID available. Provide streamId or enable autoCreate.');
      }

      // 订阅流
      const unsubscribe = streamManager.subscribe<ImageFrame | DepthImageFrame>(
        streamId,
        handleFrame
      );
      unsubscribeRef.current = unsubscribe;
      isRunningRef.current = true;

      setState((prev) => ({
        ...prev,
        connected: true,
        error: null,
      }));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState((prev) => ({
        ...prev,
        connected: false,
        error: err.message,
      }));
      if (onError) {
        onError(err);
      }
    }
  }, [cameraId, autoCreate, streamConfig, targetFps, handleFrame, onError]);

  // 停止接收
  const stop = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    isRunningRef.current = false;
    setState((prev) => ({
      ...prev,
      connected: false,
    }));
  }, []);

  // 暂停
  const pause = useCallback(() => {
    if (!streamIdRef.current) return;
    const streamManager = getStreamManager();
    streamManager.pauseStream(streamIdRef.current);
  }, []);

  // 恢复
  const resume = useCallback(() => {
    if (!streamIdRef.current) return;
    const streamManager = getStreamManager();
    streamManager.resumeStream(streamIdRef.current);
  }, []);

  // 截取当前帧
  const captureFrame = useCallback(() => {
    return state.frame;
  }, [state.frame]);

  // 重置统计
  const resetStats = useCallback(() => {
    frameTimestampsRef.current = [];
    latencyHistoryRef.current = [];
    setState((prev) => ({
      ...prev,
      frameCount: 0,
      droppedFrames: 0,
      avgLatency: 0,
      fps: 0,
    }));
  }, []);

  // 更新流状态
  useEffect(() => {
    if (!streamIdRef.current) return;

    const streamManager = getStreamManager();
    const interval = setInterval(() => {
      const streamState = streamManager.getStreamState(streamIdRef.current!);
      if (streamState) {
        setState((prev) => ({
          ...prev,
          streamState,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const controls: CameraStreamControls = {
    start,
    stop,
    pause,
    resume,
    captureFrame,
    resetStats,
  };

  return [state, controls];
}

export default useCameraStream;
