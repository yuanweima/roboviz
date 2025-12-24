/**
 * PointCloudStreamRenderer - 高性能点云流渲染组件
 *
 * 用于实时显示 3D 相机的点云数据，支持：
 * - 高性能渲染 (百万级点)
 * - 增量更新
 * - 多种颜色模式
 * - LOD 渲染
 * - 坐标系变换
 */

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type {
  PointCloudFrame,
  PointCloudUpdateFrame,
  DepthImageFrame,
} from '../../streaming/types';
import type { PointCloudVisualization } from '../../vision/types';

// ============================================================================
// Types
// ============================================================================

export type PointCloudColorMode =
  | 'rgb'        // 使用点云自带颜色
  | 'intensity'  // 根据强度着色
  | 'height'     // 根据高度着色
  | 'distance'   // 根据到原点距离着色
  | 'normal'     // 根据法线方向着色
  | 'uniform';   // 统一颜色

export interface ColorMapConfig {
  type: 'jet' | 'viridis' | 'plasma' | 'turbo' | 'grayscale' | 'custom';
  min?: number;
  max?: number;
  customColors?: Array<{ position: number; color: string }>;
}

export interface PointCloudStreamRendererProps {
  /** 点云 ID */
  cloudId: string;

  /** 点云帧数据 */
  frame?: PointCloudFrame | PointCloudUpdateFrame | null;

  /** 可视化配置 */
  visualization?: Partial<PointCloudVisualization>;

  /** 颜色模式 */
  colorMode?: PointCloudColorMode;

  /** 颜色映射配置 */
  colorMap?: ColorMapConfig;

  /** 统一颜色 (colorMode='uniform' 时使用) */
  uniformColor?: string;

  /** 点大小 */
  pointSize?: number;

  /** 透明度 */
  opacity?: number;

  /** 最大显示点数 (性能优化) */
  maxPoints?: number;

  /** 抽稀因子 (1 = 不抽稀) */
  decimation?: number;

  /** 是否启用 LOD */
  enableLOD?: boolean;

  /** 变换矩阵 (用于坐标系转换) */
  transform?: THREE.Matrix4;

  /** 位置偏移 */
  position?: [number, number, number];

  /** 旋转 (欧拉角) */
  rotation?: [number, number, number];

  /** 是否显示边界框 */
  showBounds?: boolean;

  /** 边界框颜色 */
  boundsColor?: string;

  /** 是否可交互 */
  interactive?: boolean;

  /** 点击回调 */
  onPointClick?: (pointIndex: number, position: THREE.Vector3) => void;

  /** 悬停回调 */
  onPointHover?: (pointIndex: number | null, position: THREE.Vector3 | null) => void;
}

export interface PointCloudStats {
  totalPoints: number;
  visiblePoints: number;
  fps: number;
  updateRate: number;
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
}

// ============================================================================
// Color Map Utilities
// ============================================================================

const COLOR_MAPS = {
  jet: [
    { pos: 0.0, color: new THREE.Color(0, 0, 0.5) },
    { pos: 0.1, color: new THREE.Color(0, 0, 1) },
    { pos: 0.35, color: new THREE.Color(0, 1, 1) },
    { pos: 0.5, color: new THREE.Color(0, 1, 0) },
    { pos: 0.65, color: new THREE.Color(1, 1, 0) },
    { pos: 0.9, color: new THREE.Color(1, 0, 0) },
    { pos: 1.0, color: new THREE.Color(0.5, 0, 0) },
  ],
  viridis: [
    { pos: 0.0, color: new THREE.Color(0.267, 0.004, 0.329) },
    { pos: 0.25, color: new THREE.Color(0.282, 0.140, 0.457) },
    { pos: 0.5, color: new THREE.Color(0.127, 0.566, 0.550) },
    { pos: 0.75, color: new THREE.Color(0.369, 0.789, 0.382) },
    { pos: 1.0, color: new THREE.Color(0.993, 0.906, 0.144) },
  ],
  turbo: [
    { pos: 0.0, color: new THREE.Color(0.18995, 0.07176, 0.23217) },
    { pos: 0.25, color: new THREE.Color(0.28549, 0.55959, 0.96663) },
    { pos: 0.5, color: new THREE.Color(0.49544, 0.91066, 0.50488) },
    { pos: 0.75, color: new THREE.Color(0.97274, 0.69478, 0.21122) },
    { pos: 1.0, color: new THREE.Color(0.64362, 0.04309, 0.05761) },
  ],
  grayscale: [
    { pos: 0.0, color: new THREE.Color(0, 0, 0) },
    { pos: 1.0, color: new THREE.Color(1, 1, 1) },
  ],
};

function interpolateColorMap(
  value: number,
  colorMap: Array<{ pos: number; color: THREE.Color }>
): THREE.Color {
  const clampedValue = Math.max(0, Math.min(1, value));

  for (let i = 0; i < colorMap.length - 1; i++) {
    if (clampedValue >= colorMap[i].pos && clampedValue <= colorMap[i + 1].pos) {
      const t = (clampedValue - colorMap[i].pos) / (colorMap[i + 1].pos - colorMap[i].pos);
      return new THREE.Color().lerpColors(colorMap[i].color, colorMap[i + 1].color, t);
    }
  }

  return colorMap[colorMap.length - 1].color.clone();
}

function getColorMapArray(type: ColorMapConfig['type']): Array<{ pos: number; color: THREE.Color }> {
  return COLOR_MAPS[type as keyof typeof COLOR_MAPS] || COLOR_MAPS.jet;
}

// ============================================================================
// Depth to Point Cloud Conversion
// ============================================================================

export function depthFrameToPointCloud(
  depthFrame: DepthImageFrame
): { points: Float32Array; colors?: Uint8Array } {
  const { width, height, depthData, depthFormat, intrinsics, colorImage } = depthFrame;

  if (!intrinsics) {
    console.warn('Depth frame missing intrinsics, cannot convert to point cloud');
    return { points: new Float32Array(0) };
  }

  const { fx, fy, cx, cy } = intrinsics;
  const points: number[] = [];
  const colors: number[] = [];

  // 解析彩色图像数据
  let colorData: Uint8Array | null = null;
  if (colorImage) {
    if (colorImage.data instanceof Uint8Array) {
      colorData = colorImage.data;
    } else if (colorImage.data instanceof ArrayBuffer) {
      colorData = new Uint8Array(colorImage.data);
    }
  }

  for (let v = 0; v < height; v++) {
    for (let u = 0; u < width; u++) {
      const idx = v * width + u;
      let depth: number;

      if (depthFormat === 'uint16_mm') {
        depth = (depthData as Uint16Array)[idx] / 1000; // mm -> m
      } else {
        depth = (depthData as Float32Array)[idx];
      }

      // 跳过无效深度
      if (depth <= depthFrame.minDepth || depth >= depthFrame.maxDepth || !isFinite(depth)) {
        continue;
      }

      // 反投影到 3D
      const x = (u - cx) * depth / fx;
      const y = (v - cy) * depth / fy;
      const z = depth;

      points.push(x, y, z);

      // 添加颜色
      if (colorData && colorImage) {
        const pixelIdx = idx * (colorImage.pixelFormat === 'rgba8' ? 4 : 3);
        if (colorImage.pixelFormat === 'bgr8' || colorImage.pixelFormat === 'bgra8') {
          colors.push(colorData[pixelIdx + 2], colorData[pixelIdx + 1], colorData[pixelIdx], 255);
        } else {
          colors.push(colorData[pixelIdx], colorData[pixelIdx + 1], colorData[pixelIdx + 2], 255);
        }
      }
    }
  }

  return {
    points: new Float32Array(points),
    colors: colors.length > 0 ? new Uint8Array(colors) : undefined,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export const PointCloudStreamRenderer: React.FC<PointCloudStreamRendererProps> = ({
  cloudId,
  frame,
  colorMode = 'rgb',
  colorMap = { type: 'turbo' },
  uniformColor = '#ffffff',
  pointSize = 2,
  opacity = 1,
  maxPoints = 1000000,
  decimation = 1,
  enableLOD = true,
  transform,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  showBounds = false,
  boundsColor = '#00ff00',
  interactive = false,
  onPointClick,
  onPointHover,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const boundsRef = useRef<THREE.Box3Helper>(null);
  const { camera } = useThree();

  // 累积点云数据 (用于增量更新)
  const accumulatedData = useRef<{
    positions: Float32Array;
    colors: Uint8Array | null;
    count: number;
  }>({
    positions: new Float32Array(0),
    colors: null,
    count: 0,
  });

  // 统计信息
  const [stats, setStats] = useState<PointCloudStats>({
    totalPoints: 0,
    visiblePoints: 0,
    fps: 0,
    updateRate: 0,
    bounds: {
      min: new THREE.Vector3(),
      max: new THREE.Vector3(),
    },
  });

  // 帧率跟踪
  const frameTracker = useRef({
    timestamps: [] as number[],
    lastUpdate: 0,
  });

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

  // 处理新帧
  useEffect(() => {
    if (!frame || !geometryRef.current) return;

    const now = performance.now();
    const tracker = frameTracker.current;
    tracker.timestamps.push(now);
    tracker.timestamps = tracker.timestamps.filter((t) => t > now - 1000);

    let points: Float32Array;
    let colors: Uint8Array | undefined;
    let updateType: 'full' | 'append' | 'replace_region' | 'clear' = 'full';

    // 根据帧类型处理
    if ('updateType' in frame) {
      // PointCloudUpdateFrame
      const updateFrame = frame as PointCloudUpdateFrame;
      updateType = updateFrame.updateType;
      points = updateFrame.points;
      colors = updateFrame.colors;
    } else {
      // PointCloudFrame
      points = frame.points;
      colors = frame.colors;
    }

    // 处理增量更新
    if (updateType === 'clear') {
      accumulatedData.current = {
        positions: new Float32Array(0),
        colors: null,
        count: 0,
      };
    } else if (updateType === 'append') {
      // 追加新点
      const oldPositions = accumulatedData.current.positions;
      const newPositions = new Float32Array(oldPositions.length + points.length);
      newPositions.set(oldPositions);
      newPositions.set(points, oldPositions.length);
      accumulatedData.current.positions = newPositions;

      if (colors) {
        const oldColors = accumulatedData.current.colors || new Uint8Array(0);
        const newColors = new Uint8Array(oldColors.length + colors.length);
        newColors.set(oldColors);
        newColors.set(colors, oldColors.length);
        accumulatedData.current.colors = newColors;
      }

      accumulatedData.current.count = newPositions.length / 3;
      points = newPositions;
      colors = accumulatedData.current.colors || undefined;
    } else {
      // full 或 replace_region - 完全替换
      accumulatedData.current = {
        positions: points,
        colors: colors || null,
        count: points.length / 3,
      };
    }

    // 应用抽稀
    let decimatedPoints = points;
    let decimatedColors = colors;
    if (decimation > 1) {
      const newCount = Math.ceil(points.length / 3 / decimation);
      decimatedPoints = new Float32Array(newCount * 3);
      if (colors) {
        decimatedColors = new Uint8Array(newCount * 4);
      }

      for (let i = 0, j = 0; i < newCount; i++, j += decimation) {
        const srcIdx = j * 3;
        const dstIdx = i * 3;
        decimatedPoints[dstIdx] = points[srcIdx];
        decimatedPoints[dstIdx + 1] = points[srcIdx + 1];
        decimatedPoints[dstIdx + 2] = points[srcIdx + 2];

        if (colors && decimatedColors) {
          const srcColorIdx = j * 4;
          const dstColorIdx = i * 4;
          decimatedColors[dstColorIdx] = colors[srcColorIdx];
          decimatedColors[dstColorIdx + 1] = colors[srcColorIdx + 1];
          decimatedColors[dstColorIdx + 2] = colors[srcColorIdx + 2];
          decimatedColors[dstColorIdx + 3] = colors[srcColorIdx + 3];
        }
      }
    }

    // 限制最大点数
    const pointCount = Math.min(decimatedPoints.length / 3, maxPoints);
    const finalPoints = decimatedPoints.slice(0, pointCount * 3);

    // 计算边界
    const bounds = new THREE.Box3();
    for (let i = 0; i < finalPoints.length; i += 3) {
      bounds.expandByPoint(new THREE.Vector3(finalPoints[i], finalPoints[i + 1], finalPoints[i + 2]));
    }

    // 计算颜色
    let finalColors: Float32Array;
    if (colorMode === 'rgb' && decimatedColors) {
      // 使用点云自带颜色
      finalColors = new Float32Array(pointCount * 3);
      for (let i = 0; i < pointCount; i++) {
        finalColors[i * 3] = decimatedColors[i * 4] / 255;
        finalColors[i * 3 + 1] = decimatedColors[i * 4 + 1] / 255;
        finalColors[i * 3 + 2] = decimatedColors[i * 4 + 2] / 255;
      }
    } else if (colorMode === 'height') {
      // 根据高度着色
      finalColors = new Float32Array(pointCount * 3);
      const colorMapArray = getColorMapArray(colorMap.type);
      const minZ = colorMap.min ?? bounds.min.z;
      const maxZ = colorMap.max ?? bounds.max.z;
      const range = maxZ - minZ || 1;

      for (let i = 0; i < pointCount; i++) {
        const z = finalPoints[i * 3 + 2];
        const normalized = (z - minZ) / range;
        const color = interpolateColorMap(normalized, colorMapArray);
        finalColors[i * 3] = color.r;
        finalColors[i * 3 + 1] = color.g;
        finalColors[i * 3 + 2] = color.b;
      }
    } else if (colorMode === 'intensity' && frame && 'intensities' in frame && frame.intensities) {
      // 根据强度着色
      finalColors = new Float32Array(pointCount * 3);
      const colorMapArray = getColorMapArray(colorMap.type);
      const intensities = frame.intensities;
      let minI = colorMap.min ?? Infinity;
      let maxI = colorMap.max ?? -Infinity;

      if (!colorMap.min || !colorMap.max) {
        for (let i = 0; i < Math.min(intensities.length, pointCount); i++) {
          minI = Math.min(minI, intensities[i]);
          maxI = Math.max(maxI, intensities[i]);
        }
      }
      const range = maxI - minI || 1;

      for (let i = 0; i < pointCount; i++) {
        const intensity = intensities[i] || 0;
        const normalized = (intensity - minI) / range;
        const color = interpolateColorMap(normalized, colorMapArray);
        finalColors[i * 3] = color.r;
        finalColors[i * 3 + 1] = color.g;
        finalColors[i * 3 + 2] = color.b;
      }
    } else if (colorMode === 'distance') {
      // 根据距离着色
      finalColors = new Float32Array(pointCount * 3);
      const colorMapArray = getColorMapArray(colorMap.type);
      let minD = Infinity;
      let maxD = 0;

      // 先计算距离范围
      for (let i = 0; i < pointCount; i++) {
        const x = finalPoints[i * 3];
        const y = finalPoints[i * 3 + 1];
        const z = finalPoints[i * 3 + 2];
        const d = Math.sqrt(x * x + y * y + z * z);
        minD = Math.min(minD, d);
        maxD = Math.max(maxD, d);
      }

      const range = maxD - minD || 1;

      for (let i = 0; i < pointCount; i++) {
        const x = finalPoints[i * 3];
        const y = finalPoints[i * 3 + 1];
        const z = finalPoints[i * 3 + 2];
        const d = Math.sqrt(x * x + y * y + z * z);
        const normalized = (d - minD) / range;
        const color = interpolateColorMap(normalized, colorMapArray);
        finalColors[i * 3] = color.r;
        finalColors[i * 3 + 1] = color.g;
        finalColors[i * 3 + 2] = color.b;
      }
    } else {
      // uniform 或其他 - 使用统一颜色
      const color = new THREE.Color(uniformColor);
      finalColors = new Float32Array(pointCount * 3);
      for (let i = 0; i < pointCount; i++) {
        finalColors[i * 3] = color.r;
        finalColors[i * 3 + 1] = color.g;
        finalColors[i * 3 + 2] = color.b;
      }
    }

    // 更新几何体
    const geometry = geometryRef.current;
    geometry.setAttribute('position', new THREE.BufferAttribute(finalPoints, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(finalColors, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // 应用变换
    if (transform) {
      geometry.applyMatrix4(transform);
    }

    // 更新统计
    setStats({
      totalPoints: accumulatedData.current.count,
      visiblePoints: pointCount,
      fps: tracker.timestamps.length,
      updateRate: now - tracker.lastUpdate,
      bounds: {
        min: bounds.min.clone(),
        max: bounds.max.clone(),
      },
    });

    tracker.lastUpdate = now;
  }, [frame, colorMode, colorMap, uniformColor, maxPoints, decimation, transform]);

  // LOD 更新
  useFrame(() => {
    if (!enableLOD || !pointsRef.current) return;

    // 根据相机距离调整点大小
    const distance = camera.position.distanceTo(pointsRef.current.position);
    const lodSize = Math.max(1, pointSize * (1 + distance * 0.01));
    material.size = Math.min(lodSize, pointSize * 3);
  });

  // 射线拾取
  const handlePointerDown = useCallback(
    (event: THREE.Event) => {
      if (!interactive || !onPointClick || !geometryRef.current) return;

      const intersection = (event as unknown as { intersections?: THREE.Intersection[] }).intersections?.[0];
      if (intersection && intersection.index !== undefined) {
        const positions = geometryRef.current.getAttribute('position');
        const pos = new THREE.Vector3(
          positions.getX(intersection.index),
          positions.getY(intersection.index),
          positions.getZ(intersection.index)
        );
        onPointClick(intersection.index, pos);
      }
    },
    [interactive, onPointClick]
  );

  return (
    <group position={position} rotation={rotation}>
      <points
        ref={pointsRef}
        material={material}
        onPointerDown={interactive ? handlePointerDown : undefined}
      >
        <bufferGeometry ref={geometryRef} />
      </points>

      {/* 边界框 */}
      {showBounds && stats.bounds.min && stats.bounds.max && (
        <box3Helper
          ref={boundsRef}
          args={[
            new THREE.Box3(stats.bounds.min, stats.bounds.max),
            new THREE.Color(boundsColor),
          ]}
        />
      )}
    </group>
  );
};

export default PointCloudStreamRenderer;
