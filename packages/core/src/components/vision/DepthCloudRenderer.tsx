/**
 * DepthCloudRenderer - 深度图转点云渲染组件
 *
 * 将深度相机的深度图像实时转换为 3D 点云并渲染
 * 适用于 Intel RealSense、Kinect、结构光相机等
 */

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCameraStream } from '../../hooks/useCameraStream';
import { depthFrameToPointCloud } from './PointCloudStreamRenderer';
import type { DepthImageFrame, StreamConfig } from '../../streaming/types';
import type { CameraView } from '../../vision/types';

// ============================================================================
// Types
// ============================================================================

export interface DepthCloudRendererProps {
  /** 相机 ID */
  cameraId: string;

  /** 流 ID (如果已存在) */
  streamId?: string;

  /** 是否自动启动 */
  autoStart?: boolean;

  /** 相机配置 (包含内参) */
  cameraConfig?: CameraView;

  /** 点大小 */
  pointSize?: number;

  /** 是否使用彩色 */
  useColor?: boolean;

  /** 统一颜色 (不使用彩色时) */
  uniformColor?: string;

  /** 颜色模式 */
  colorMode?: 'rgb' | 'depth' | 'uniform';

  /** 深度范围着色 */
  depthColorRange?: { min: number; max: number };

  /** 透明度 */
  opacity?: number;

  /** 最大点数 */
  maxPoints?: number;

  /** 抽稀因子 */
  decimation?: number;

  /** 深度滤波 - 最小深度 (m) */
  minDepth?: number;

  /** 深度滤波 - 最大深度 (m) */
  maxDepth?: number;

  /** 变换矩阵 (坐标系转换) */
  transform?: THREE.Matrix4;

  /** 位置偏移 */
  position?: [number, number, number];

  /** 旋转 (欧拉角) */
  rotation?: [number, number, number];

  /** 是否显示边界框 */
  showBounds?: boolean;

  /** 边界框颜色 */
  boundsColor?: string;

  /** 是否启用 LOD */
  enableLOD?: boolean;

  /** 更新回调 */
  onUpdate?: (stats: DepthCloudStats) => void;

  /** 流配置 */
  streamConfig?: Partial<StreamConfig>;
}

export interface DepthCloudStats {
  pointCount: number;
  updateRate: number;
  bounds: THREE.Box3;
  avgDepth: number;
  connected: boolean;
}

// ============================================================================
// Color Maps
// ============================================================================

const DEPTH_COLOR_MAP = [
  { pos: 0.0, color: new THREE.Color(0, 0, 1) },      // Blue (near)
  { pos: 0.25, color: new THREE.Color(0, 1, 1) },     // Cyan
  { pos: 0.5, color: new THREE.Color(0, 1, 0) },      // Green
  { pos: 0.75, color: new THREE.Color(1, 1, 0) },     // Yellow
  { pos: 1.0, color: new THREE.Color(1, 0, 0) },      // Red (far)
];

function interpolateDepthColor(normalizedDepth: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, normalizedDepth));

  for (let i = 0; i < DEPTH_COLOR_MAP.length - 1; i++) {
    if (clamped >= DEPTH_COLOR_MAP[i].pos && clamped <= DEPTH_COLOR_MAP[i + 1].pos) {
      const t =
        (clamped - DEPTH_COLOR_MAP[i].pos) /
        (DEPTH_COLOR_MAP[i + 1].pos - DEPTH_COLOR_MAP[i].pos);
      return new THREE.Color().lerpColors(
        DEPTH_COLOR_MAP[i].color,
        DEPTH_COLOR_MAP[i + 1].color,
        t
      );
    }
  }

  return DEPTH_COLOR_MAP[DEPTH_COLOR_MAP.length - 1].color.clone();
}

// ============================================================================
// Main Component
// ============================================================================

export const DepthCloudRenderer: React.FC<DepthCloudRendererProps> = ({
  cameraId,
  streamId,
  autoStart = true,
  cameraConfig,
  pointSize = 2,
  useColor = true,
  uniformColor = '#ffffff',
  colorMode = 'rgb',
  depthColorRange,
  opacity = 1,
  maxPoints = 500000,
  decimation = 1,
  minDepth = 0.1,
  maxDepth = 10,
  transform,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  showBounds = false,
  boundsColor = '#00ff00',
  enableLOD = true,
  onUpdate,
  streamConfig,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const { camera } = useThree();

  const [stats, setStats] = useState<DepthCloudStats>({
    pointCount: 0,
    updateRate: 0,
    bounds: new THREE.Box3(),
    avgDepth: 0,
    connected: false,
  });

  // 更新率跟踪
  const updateTracker = useRef({
    timestamps: [] as number[],
    lastUpdate: 0,
  });

  // 使用相机流
  const [streamState, streamControls] = useCameraStream(cameraId, {
    streamId,
    autoCreate: true,
    streamConfig: {
      type: 'depth_image',
      frequency: 30,
      ...streamConfig,
    },
    onFrame: (frame) => {
      if ('depthData' in frame) {
        processDepthFrame(frame as DepthImageFrame);
      }
    },
  });

  // 处理深度帧
  const processDepthFrame = useCallback(
    (frame: DepthImageFrame) => {
      if (!geometryRef.current) return;

      const now = performance.now();

      // 添加相机内参 (如果帧中没有)
      const frameWithIntrinsics: DepthImageFrame = {
        ...frame,
        intrinsics: frame.intrinsics || cameraConfig?.intrinsics,
        minDepth: minDepth,
        maxDepth: maxDepth,
      };

      // 转换为点云
      const { points, colors } = depthFrameToPointCloud(frameWithIntrinsics);

      if (points.length === 0) return;

      // 抽稀
      let finalPoints = points;
      let finalColors = colors;
      let pointCount = points.length / 3;

      if (decimation > 1) {
        const newCount = Math.ceil(pointCount / decimation);
        finalPoints = new Float32Array(newCount * 3);
        if (colors) {
          finalColors = new Uint8Array(newCount * 4);
        }

        for (let i = 0, j = 0; i < newCount; i++, j += decimation) {
          const srcIdx = Math.min(j, pointCount - 1) * 3;
          const dstIdx = i * 3;
          finalPoints[dstIdx] = points[srcIdx];
          finalPoints[dstIdx + 1] = points[srcIdx + 1];
          finalPoints[dstIdx + 2] = points[srcIdx + 2];

          if (colors && finalColors) {
            const srcColorIdx = Math.min(j, pointCount - 1) * 4;
            const dstColorIdx = i * 4;
            finalColors[dstColorIdx] = colors[srcColorIdx];
            finalColors[dstColorIdx + 1] = colors[srcColorIdx + 1];
            finalColors[dstColorIdx + 2] = colors[srcColorIdx + 2];
            finalColors[dstColorIdx + 3] = colors[srcColorIdx + 3];
          }
        }
        pointCount = newCount;
      }

      // 限制最大点数
      if (pointCount > maxPoints) {
        pointCount = maxPoints;
        finalPoints = finalPoints.slice(0, pointCount * 3);
        if (finalColors) {
          finalColors = finalColors.slice(0, pointCount * 4);
        }
      }

      // 应用变换
      if (transform) {
        const v = new THREE.Vector3();
        for (let i = 0; i < pointCount; i++) {
          v.set(
            finalPoints[i * 3],
            finalPoints[i * 3 + 1],
            finalPoints[i * 3 + 2]
          );
          v.applyMatrix4(transform);
          finalPoints[i * 3] = v.x;
          finalPoints[i * 3 + 1] = v.y;
          finalPoints[i * 3 + 2] = v.z;
        }
      }

      // 计算边界和平均深度
      const bounds = new THREE.Box3();
      let totalDepth = 0;
      for (let i = 0; i < pointCount; i++) {
        const z = finalPoints[i * 3 + 2];
        totalDepth += z;
        bounds.expandByPoint(
          new THREE.Vector3(
            finalPoints[i * 3],
            finalPoints[i * 3 + 1],
            z
          )
        );
      }
      const avgDepth = totalDepth / pointCount;

      // 计算颜色
      let vertexColors: Float32Array;
      if (colorMode === 'rgb' && finalColors) {
        vertexColors = new Float32Array(pointCount * 3);
        for (let i = 0; i < pointCount; i++) {
          vertexColors[i * 3] = finalColors[i * 4] / 255;
          vertexColors[i * 3 + 1] = finalColors[i * 4 + 1] / 255;
          vertexColors[i * 3 + 2] = finalColors[i * 4 + 2] / 255;
        }
      } else if (colorMode === 'depth') {
        const range = depthColorRange || { min: minDepth, max: maxDepth };
        const depthRange = range.max - range.min;
        vertexColors = new Float32Array(pointCount * 3);
        for (let i = 0; i < pointCount; i++) {
          const depth = finalPoints[i * 3 + 2];
          const normalized = (depth - range.min) / depthRange;
          const color = interpolateDepthColor(normalized);
          vertexColors[i * 3] = color.r;
          vertexColors[i * 3 + 1] = color.g;
          vertexColors[i * 3 + 2] = color.b;
        }
      } else {
        const color = new THREE.Color(uniformColor);
        vertexColors = new Float32Array(pointCount * 3);
        for (let i = 0; i < pointCount; i++) {
          vertexColors[i * 3] = color.r;
          vertexColors[i * 3 + 1] = color.g;
          vertexColors[i * 3 + 2] = color.b;
        }
      }

      // 更新几何体
      const geometry = geometryRef.current;
      geometry.setAttribute('position', new THREE.BufferAttribute(finalPoints, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      // 更新统计
      updateTracker.current.timestamps.push(now);
      updateTracker.current.timestamps = updateTracker.current.timestamps.filter(
        (t) => t > now - 1000
      );
      const updateRate = updateTracker.current.timestamps.length;

      const newStats: DepthCloudStats = {
        pointCount,
        updateRate,
        bounds,
        avgDepth,
        connected: streamState.connected,
      };

      setStats(newStats);
      if (onUpdate) {
        onUpdate(newStats);
      }

      updateTracker.current.lastUpdate = now;
    },
    [
      cameraConfig,
      minDepth,
      maxDepth,
      decimation,
      maxPoints,
      transform,
      colorMode,
      uniformColor,
      depthColorRange,
      streamState.connected,
      onUpdate,
    ]
  );

  // 自动启动
  useEffect(() => {
    if (autoStart) {
      streamControls.start();
    }
    return () => {
      streamControls.stop();
    };
  }, [autoStart]);

  // 创建材质
  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: colorMode !== 'uniform',
      color: colorMode === 'uniform' ? new THREE.Color(uniformColor) : undefined,
      transparent: opacity < 1,
      opacity,
      sizeAttenuation: true,
    });
  }, [pointSize, colorMode, uniformColor, opacity]);

  // LOD 更新
  useFrame(() => {
    if (!enableLOD || !pointsRef.current) return;

    const distance = camera.position.distanceTo(pointsRef.current.position);
    const lodSize = Math.max(1, pointSize * (1 + distance * 0.005));
    material.size = Math.min(lodSize, pointSize * 2);
  });

  return (
    <group position={position} rotation={rotation}>
      <points ref={pointsRef} material={material}>
        <bufferGeometry ref={geometryRef} />
      </points>

      {/* 边界框 */}
      {showBounds && stats.bounds && !stats.bounds.isEmpty() && (
        <box3Helper
          args={[stats.bounds, new THREE.Color(boundsColor)]}
        />
      )}
    </group>
  );
};

export default DepthCloudRenderer;
