/**
 * usePointCloudStream - 点云数据流 Hook
 *
 * 用于订阅和管理 3D 相机的实时点云数据流
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { getStreamManager } from '../streaming/stream-manager';
import type {
  PointCloudFrame,
  PointCloudUpdateFrame,
  DepthImageFrame,
  StreamConfig,
  StreamState,
} from '../streaming/types';
import { depthFrameToPointCloud } from '../components/vision/PointCloudStreamRenderer';

// ============================================================================
// Types
// ============================================================================

export interface PointCloudStreamOptions {
  /** 流 ID (如果已存在) */
  streamId?: string;

  /** 是否自动创建流 */
  autoCreate?: boolean;

  /** 流配置 (用于自动创建) */
  streamConfig?: Partial<StreamConfig>;

  /** 是否累积点云 (用于增量更新) */
  accumulate?: boolean;

  /** 累积最大点数 */
  maxAccumulatedPoints?: number;

  /** 是否从深度图转换 */
  fromDepthImage?: boolean;

  /** 变换矩阵 (坐标系转换) */
  transform?: THREE.Matrix4;

  /** 点云更新回调 */
  onUpdate?: (pointCloud: PointCloudData) => void;

  /** 错误回调 */
  onError?: (error: Error) => void;
}

export interface PointCloudData {
  /** 点坐标 */
  points: Float32Array;

  /** 颜色 */
  colors?: Uint8Array;

  /** 强度 */
  intensities?: Float32Array;

  /** 法线 */
  normals?: Float32Array;

  /** 点数量 */
  pointCount: number;

  /** 边界 */
  bounds: THREE.Box3;

  /** 时间戳 */
  timestamp: number;
}

export interface PointCloudStreamState {
  /** 当前点云数据 */
  pointCloud: PointCloudData | null;

  /** 是否已连接 */
  connected: boolean;

  /** 更新频率 (Hz) */
  updateRate: number;

  /** 流状态 */
  streamState: StreamState | null;

  /** 更新计数 */
  updateCount: number;

  /** 总点数 (累积模式) */
  totalPoints: number;

  /** 错误信息 */
  error: string | null;
}

export interface PointCloudStreamControls {
  /** 开始接收 */
  start: () => void;

  /** 停止接收 */
  stop: () => void;

  /** 清除累积的点云 */
  clearAccumulated: () => void;

  /** 获取当前点云的 BufferGeometry */
  getGeometry: () => THREE.BufferGeometry | null;

  /** 导出点云为 PLY 格式 */
  exportPLY: () => string | null;

  /** 重置统计 */
  resetStats: () => void;
}

export type UsePointCloudStreamReturn = [PointCloudStreamState, PointCloudStreamControls];

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePointCloudStream(
  cloudId: string,
  options: PointCloudStreamOptions = {}
): UsePointCloudStreamReturn {
  const {
    streamId: providedStreamId,
    autoCreate = false,
    streamConfig,
    accumulate = false,
    maxAccumulatedPoints = 10000000,
    fromDepthImage = false,
    transform,
    onUpdate,
    onError,
  } = options;

  // 状态
  const [state, setState] = useState<PointCloudStreamState>({
    pointCloud: null,
    connected: false,
    updateRate: 0,
    streamState: null,
    updateCount: 0,
    totalPoints: 0,
    error: null,
  });

  // Refs
  const streamIdRef = useRef<string | null>(providedStreamId || null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isRunningRef = useRef(false);
  const updateTimestampsRef = useRef<number[]>([]);

  // 累积点云数据
  const accumulatedRef = useRef<{
    points: Float32Array;
    colors: Uint8Array | null;
    count: number;
  }>({
    points: new Float32Array(0),
    colors: null,
    count: 0,
  });

  // 缓存的 geometry
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // 处理新帧
  const handleFrame = useCallback(
    (frame: PointCloudFrame | PointCloudUpdateFrame | DepthImageFrame) => {
      const now = performance.now();

      let points: Float32Array;
      let colors: Uint8Array | undefined;
      let intensities: Float32Array | undefined;
      let normals: Float32Array | undefined;
      let updateType: 'full' | 'append' | 'replace_region' | 'clear' = 'full';

      // 根据帧类型处理
      if (fromDepthImage && 'depthData' in frame) {
        // DepthImageFrame -> PointCloud
        const converted = depthFrameToPointCloud(frame as DepthImageFrame);
        points = converted.points;
        colors = converted.colors;
      } else if ('updateType' in frame) {
        // PointCloudUpdateFrame
        const updateFrame = frame as PointCloudUpdateFrame;
        updateType = updateFrame.updateType;
        points = updateFrame.points;
        colors = updateFrame.colors;
        intensities = updateFrame.intensities;
        normals = updateFrame.normals;
      } else {
        // PointCloudFrame
        const pcFrame = frame as PointCloudFrame;
        points = pcFrame.points;
        colors = pcFrame.colors;
        intensities = pcFrame.intensities;
        normals = pcFrame.normals;
      }

      // 应用变换
      if (transform) {
        const transformedPoints = new Float32Array(points.length);
        const v = new THREE.Vector3();
        for (let i = 0; i < points.length; i += 3) {
          v.set(points[i], points[i + 1], points[i + 2]);
          v.applyMatrix4(transform);
          transformedPoints[i] = v.x;
          transformedPoints[i + 1] = v.y;
          transformedPoints[i + 2] = v.z;
        }
        points = transformedPoints;
      }

      // 处理累积模式
      if (accumulate) {
        if (updateType === 'clear') {
          accumulatedRef.current = {
            points: new Float32Array(0),
            colors: null,
            count: 0,
          };
        } else if (updateType === 'append' || updateType === 'full') {
          const oldPoints = accumulatedRef.current.points;
          const newCount = oldPoints.length / 3 + points.length / 3;

          // 检查是否超过最大点数
          if (newCount > maxAccumulatedPoints) {
            // 丢弃最旧的点
            const keepCount = maxAccumulatedPoints - points.length / 3;
            const keepStart = oldPoints.length - keepCount * 3;
            const keptPoints = oldPoints.slice(keepStart);

            const newPoints = new Float32Array(keptPoints.length + points.length);
            newPoints.set(keptPoints);
            newPoints.set(points, keptPoints.length);
            points = newPoints;

            if (colors) {
              const oldColors = accumulatedRef.current.colors;
              if (oldColors) {
                const keptColors = oldColors.slice((keepStart / 3) * 4);
                const newColors = new Uint8Array(keptColors.length + colors.length);
                newColors.set(keptColors);
                newColors.set(colors, keptColors.length);
                colors = newColors;
              }
            }
          } else {
            const newPoints = new Float32Array(oldPoints.length + points.length);
            newPoints.set(oldPoints);
            newPoints.set(points, oldPoints.length);
            points = newPoints;

            if (colors) {
              const oldColors = accumulatedRef.current.colors || new Uint8Array(0);
              const newColors = new Uint8Array(oldColors.length + colors.length);
              newColors.set(oldColors);
              newColors.set(colors, oldColors.length);
              colors = newColors;
            }
          }
        }

        accumulatedRef.current = {
          points,
          colors: colors || null,
          count: points.length / 3,
        };
      }

      // 计算边界
      const bounds = new THREE.Box3();
      for (let i = 0; i < points.length; i += 3) {
        bounds.expandByPoint(new THREE.Vector3(points[i], points[i + 1], points[i + 2]));
      }

      // 创建点云数据
      const pointCloud: PointCloudData = {
        points,
        colors,
        intensities,
        normals,
        pointCount: points.length / 3,
        bounds,
        timestamp: frame.timestamp,
      };

      // 更新更新率统计
      updateTimestampsRef.current.push(now);
      updateTimestampsRef.current = updateTimestampsRef.current.filter((t) => t > now - 1000);
      const updateRate = updateTimestampsRef.current.length;

      // 更新状态
      setState((prev) => ({
        ...prev,
        pointCloud,
        updateRate,
        updateCount: prev.updateCount + 1,
        totalPoints: accumulate ? accumulatedRef.current.count : points.length / 3,
        error: null,
      }));

      // 回调
      if (onUpdate) {
        onUpdate(pointCloud);
      }
    },
    [accumulate, maxAccumulatedPoints, fromDepthImage, transform, onUpdate]
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
          streamId: `pointcloud_${cloudId}_${Date.now()}`,
          type: fromDepthImage ? 'depth_image' : 'point_cloud',
          frequency: 30,
          bufferSize: 2,
          compression: 'none',
          priority: 'high',
          sensorId: cloudId,
          ...streamConfig,
        };
        streamId = await streamManager.createStream(config);
        streamIdRef.current = streamId;
      }

      if (!streamId) {
        throw new Error('No stream ID available. Provide streamId or enable autoCreate.');
      }

      // 订阅流
      const unsubscribe = streamManager.subscribe(streamId, handleFrame);
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
  }, [cloudId, autoCreate, streamConfig, fromDepthImage, handleFrame, onError]);

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

  // 清除累积的点云
  const clearAccumulated = useCallback(() => {
    accumulatedRef.current = {
      points: new Float32Array(0),
      colors: null,
      count: 0,
    };
    setState((prev) => ({
      ...prev,
      pointCloud: null,
      totalPoints: 0,
    }));
  }, []);

  // 获取 BufferGeometry
  const getGeometry = useCallback(() => {
    const pc = state.pointCloud;
    if (!pc) return null;

    if (!geometryRef.current) {
      geometryRef.current = new THREE.BufferGeometry();
    }

    const geometry = geometryRef.current;
    geometry.setAttribute('position', new THREE.BufferAttribute(pc.points, 3));

    if (pc.colors) {
      const colorFloats = new Float32Array(pc.pointCount * 3);
      for (let i = 0; i < pc.pointCount; i++) {
        colorFloats[i * 3] = pc.colors[i * 4] / 255;
        colorFloats[i * 3 + 1] = pc.colors[i * 4 + 1] / 255;
        colorFloats[i * 3 + 2] = pc.colors[i * 4 + 2] / 255;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colorFloats, 3));
    }

    if (pc.normals) {
      geometry.setAttribute('normal', new THREE.BufferAttribute(pc.normals, 3));
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }, [state.pointCloud]);

  // 导出 PLY
  const exportPLY = useCallback(() => {
    const pc = state.pointCloud;
    if (!pc) return null;

    const hasColor = !!pc.colors;
    const hasNormal = !!pc.normals;

    let ply = 'ply\n';
    ply += 'format ascii 1.0\n';
    ply += `element vertex ${pc.pointCount}\n`;
    ply += 'property float x\n';
    ply += 'property float y\n';
    ply += 'property float z\n';

    if (hasNormal) {
      ply += 'property float nx\n';
      ply += 'property float ny\n';
      ply += 'property float nz\n';
    }

    if (hasColor) {
      ply += 'property uchar red\n';
      ply += 'property uchar green\n';
      ply += 'property uchar blue\n';
    }

    ply += 'end_header\n';

    for (let i = 0; i < pc.pointCount; i++) {
      const x = pc.points[i * 3];
      const y = pc.points[i * 3 + 1];
      const z = pc.points[i * 3 + 2];
      let line = `${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`;

      if (hasNormal && pc.normals) {
        const nx = pc.normals[i * 3];
        const ny = pc.normals[i * 3 + 1];
        const nz = pc.normals[i * 3 + 2];
        line += ` ${nx.toFixed(6)} ${ny.toFixed(6)} ${nz.toFixed(6)}`;
      }

      if (hasColor && pc.colors) {
        const r = pc.colors[i * 4];
        const g = pc.colors[i * 4 + 1];
        const b = pc.colors[i * 4 + 2];
        line += ` ${r} ${g} ${b}`;
      }

      ply += line + '\n';
    }

    return ply;
  }, [state.pointCloud]);

  // 重置统计
  const resetStats = useCallback(() => {
    updateTimestampsRef.current = [];
    setState((prev) => ({
      ...prev,
      updateCount: 0,
      updateRate: 0,
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
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, [stop]);

  const controls: PointCloudStreamControls = {
    start,
    stop,
    clearAccumulated,
    getGeometry,
    exportPLY,
    resetStats,
  };

  return [state, controls];
}

export default usePointCloudStream;
