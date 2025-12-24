/**
 * ImageStreamRenderer - 高效图像流渲染组件
 *
 * 用于显示工业相机的连续帧流，支持：
 * - 高帧率渲染 (60+ FPS)
 * - 多种图像格式 (JPEG, PNG, RAW)
 * - 2D 标记叠加
 * - 性能监控
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { ImageFrame, ImagePixelFormat, ImageEncoding } from '../../streaming/types';
import type { Marker2D, ROI2D } from '../../vision/types';

// ============================================================================
// Types
// ============================================================================

export interface ImageStreamRendererProps {
  /** 相机 ID */
  cameraId: string;

  /** 图像帧数据 (由外部流管理) */
  frame?: ImageFrame | null;

  /** 渲染宽度 (CSS pixels) */
  width?: number;

  /** 渲染高度 (CSS pixels) */
  height?: number;

  /** 是否自动适应容器 */
  autoFit?: boolean;

  /** 2D 标记列表 */
  markers?: Marker2D[];

  /** 2D ROI 列表 */
  rois?: ROI2D[];

  /** 是否显示 FPS */
  showFps?: boolean;

  /** 是否显示时间戳 */
  showTimestamp?: boolean;

  /** 点击回调 */
  onPixelClick?: (pixel: { x: number; y: number }, imageCoord: { u: number; v: number }) => void;

  /** 悬停回调 */
  onPixelHover?: (pixel: { x: number; y: number } | null, imageCoord: { u: number; v: number } | null) => void;

  /** 自定义样式 */
  style?: React.CSSProperties;

  /** 自定义类名 */
  className?: string;
}

export interface ImageStreamStats {
  fps: number;
  frameCount: number;
  lastTimestamp: number;
  droppedFrames: number;
  avgLatency: number;
}

// ============================================================================
// Image Decoding Utilities
// ============================================================================

/**
 * 将图像数据转换为可渲染的 URL
 */
function createImageUrl(
  data: Uint8Array | ArrayBuffer | string,
  encoding: ImageEncoding,
  pixelFormat: ImagePixelFormat,
  width: number,
  height: number
): string {
  // 如果是 base64 字符串
  if (typeof data === 'string') {
    if (data.startsWith('data:')) {
      return data;
    }
    // 假设是 base64 编码
    const mimeType = getMimeType(encoding, pixelFormat);
    return `data:${mimeType};base64,${data}`;
  }

  // 如果是压缩格式 (JPEG, PNG, WebP)
  if (encoding === 'jpeg' || encoding === 'png' || encoding === 'webp') {
    // Convert to ArrayBuffer for Blob creation
    let arrayBuffer: ArrayBuffer;
    if (data instanceof ArrayBuffer) {
      arrayBuffer = data;
    } else {
      const uint8 = data as Uint8Array;
      // Create a new ArrayBuffer and copy data to ensure plain ArrayBuffer type
      const newBuffer = new ArrayBuffer(uint8.byteLength);
      new Uint8Array(newBuffer).set(uint8);
      arrayBuffer = newBuffer;
    }
    const blob = new Blob([arrayBuffer], { type: getMimeType(encoding, pixelFormat) });
    return URL.createObjectURL(blob);
  }

  // 如果是原始格式，需要转换
  if (encoding === 'raw') {
    return convertRawToDataUrl(
      data instanceof ArrayBuffer ? new Uint8Array(data) : data,
      pixelFormat,
      width,
      height
    );
  }

  console.warn(`Unsupported encoding: ${encoding}`);
  return '';
}

/**
 * 获取 MIME 类型
 */
function getMimeType(encoding: ImageEncoding, pixelFormat: ImagePixelFormat): string {
  switch (encoding) {
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      // 对于 raw 格式，根据像素格式判断
      if (pixelFormat === 'jpeg') return 'image/jpeg';
      if (pixelFormat === 'png') return 'image/png';
      return 'image/png';
  }
}

/**
 * 将原始像素数据转换为 DataURL
 */
function convertRawToDataUrl(
  data: Uint8Array,
  pixelFormat: ImagePixelFormat,
  width: number,
  height: number
): string {
  // 创建 Canvas 进行转换
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  switch (pixelFormat) {
    case 'rgb8':
      for (let i = 0, j = 0; i < data.length && j < pixels.length; i += 3, j += 4) {
        pixels[j] = data[i];         // R
        pixels[j + 1] = data[i + 1]; // G
        pixels[j + 2] = data[i + 2]; // B
        pixels[j + 3] = 255;         // A
      }
      break;

    case 'rgba8':
      pixels.set(data);
      break;

    case 'bgr8':
      for (let i = 0, j = 0; i < data.length && j < pixels.length; i += 3, j += 4) {
        pixels[j] = data[i + 2];     // R (from B)
        pixels[j + 1] = data[i + 1]; // G
        pixels[j + 2] = data[i];     // B (from R)
        pixels[j + 3] = 255;         // A
      }
      break;

    case 'bgra8':
      for (let i = 0, j = 0; i < data.length && j < pixels.length; i += 4, j += 4) {
        pixels[j] = data[i + 2];     // R (from B)
        pixels[j + 1] = data[i + 1]; // G
        pixels[j + 2] = data[i];     // B (from R)
        pixels[j + 3] = data[i + 3]; // A
      }
      break;

    case 'mono8':
      for (let i = 0, j = 0; i < data.length && j < pixels.length; i++, j += 4) {
        pixels[j] = data[i];     // R
        pixels[j + 1] = data[i]; // G
        pixels[j + 2] = data[i]; // B
        pixels[j + 3] = 255;     // A
      }
      break;

    default:
      console.warn(`Unsupported pixel format: ${pixelFormat}`);
      return '';
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// ============================================================================
// Marker Rendering
// ============================================================================

interface OverlayProps {
  markers?: Marker2D[];
  rois?: ROI2D[];
  imageWidth: number;
  imageHeight: number;
  displayWidth: number;
  displayHeight: number;
}

const OverlayCanvas: React.FC<OverlayProps> = ({
  markers = [],
  rois = [],
  imageWidth,
  imageHeight,
  displayWidth,
  displayHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // 计算缩放比例
    const scaleX = displayWidth / imageWidth;
    const scaleY = displayHeight / imageHeight;

    // 绘制 ROIs
    rois.forEach((roi) => {
      ctx.strokeStyle = roi.strokeColor || '#00ff00';
      ctx.fillStyle = roi.fillColor || 'rgba(0, 255, 0, 0.2)';
      ctx.lineWidth = 2;

      // Parse ROI data based on type
      const dataStr = typeof roi.data === 'string' ? roi.data : '';
      const dataArr = Array.isArray(roi.data) ? roi.data as number[] : [];

      if (roi.type === 'rectangle' && dataArr.length >= 4) {
        const [rx, ry, rw, rh] = dataArr;
        const sx = rx * scaleX;
        const sy = ry * scaleY;
        const sw = rw * scaleX;
        const sh = rh * scaleY;

        ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeRect(sx, sy, sw, sh);
      } else if (roi.type === 'polygon' && dataArr.length >= 6) {
        // Points stored as [x1, y1, x2, y2, ...]
        ctx.beginPath();
        ctx.moveTo(dataArr[0] * scaleX, dataArr[1] * scaleY);
        for (let i = 2; i < dataArr.length; i += 2) {
          ctx.lineTo(dataArr[i] * scaleX, dataArr[i + 1] * scaleY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (roi.type === 'circle' && dataArr.length >= 3) {
        const [rcx, rcy, rrad] = dataArr;
        ctx.beginPath();
        ctx.arc(rcx * scaleX, rcy * scaleY, rrad * Math.min(scaleX, scaleY), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 绘制标签
      if (roi.label && dataArr.length >= 2) {
        ctx.fillStyle = roi.strokeColor || '#00ff00';
        ctx.font = '12px sans-serif';
        ctx.fillText(roi.label, dataArr[0] * scaleX, dataArr[1] * scaleY - 5);
      }
    });

    // 绘制 Markers
    markers.forEach((marker) => {
      // marker.position is [number, number]
      const [mx, my] = marker.position;
      const x = mx * scaleX;
      const y = my * scaleY;
      const color = marker.color || '#ff0000';
      const lineWidth = marker.lineWidth || 2;

      ctx.strokeStyle = color;
      ctx.fillStyle = marker.fillColor || color;
      ctx.lineWidth = lineWidth;

      // Parse marker data
      const dataArr = Array.isArray(marker.data) ? marker.data as number[] : [];

      switch (marker.type) {
        case 'point':
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'crosshair':
          const size = dataArr[0] || 10;
          ctx.beginPath();
          ctx.moveTo(x - size, y);
          ctx.lineTo(x + size, y);
          ctx.moveTo(x, y - size);
          ctx.lineTo(x, y + size);
          ctx.stroke();
          break;

        case 'circle':
          const radius = dataArr[0] || 10;
          ctx.beginPath();
          ctx.arc(x, y, radius * Math.min(scaleX, scaleY), 0, Math.PI * 2);
          if (marker.filled) {
            ctx.fill();
          } else {
            ctx.stroke();
          }
          break;

        case 'line':
          if (dataArr.length >= 2) {
            const dx = dataArr[0] * scaleX;
            const dy = dataArr[1] * scaleY;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + dx, y + dy);
            ctx.stroke();
          }
          break;

        case 'text':
          ctx.fillStyle = color;
          ctx.font = `${marker.fontSize || 14}px sans-serif`;
          ctx.fillText(marker.label || '', x, y);
          break;

        case 'rectangle':
          if (dataArr.length >= 2) {
            const rw = dataArr[0] * scaleX;
            const rh = dataArr[1] * scaleY;
            if (marker.filled) {
              ctx.fillRect(x - rw / 2, y - rh / 2, rw, rh);
            } else {
              ctx.strokeRect(x - rw / 2, y - rh / 2, rw, rh);
            }
          }
          break;

        case 'polygon':
          if (dataArr.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(x + dataArr[0] * scaleX, y + dataArr[1] * scaleY);
            for (let i = 2; i < dataArr.length; i += 2) {
              ctx.lineTo(x + dataArr[i] * scaleX, y + dataArr[i + 1] * scaleY);
            }
            ctx.closePath();
            if (marker.filled) {
              ctx.fill();
            } else {
              ctx.stroke();
            }
          }
          break;
      }

      // 绘制标签
      if (marker.label && marker.type !== 'text') {
        ctx.fillStyle = color;
        ctx.font = `${marker.fontSize || 12}px sans-serif`;
        ctx.fillText(marker.label, x + 8, y - 8);
      }
    });
  }, [markers, rois, imageWidth, imageHeight, displayWidth, displayHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={displayWidth}
      height={displayHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ImageStreamRenderer: React.FC<ImageStreamRendererProps> = ({
  cameraId,
  frame,
  width = 640,
  height = 480,
  autoFit = false,
  markers = [],
  rois = [],
  showFps = false,
  showTimestamp = false,
  onPixelClick,
  onPixelHover,
  style,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [stats, setStats] = useState<ImageStreamStats>({
    fps: 0,
    frameCount: 0,
    lastTimestamp: 0,
    droppedFrames: 0,
    avgLatency: 0,
  });

  // FPS 计算
  const fpsTracker = useRef({
    frameTimestamps: [] as number[],
    lastFrameTime: 0,
  });

  // 计算显示尺寸
  const displaySize = useMemo(() => {
    if (!frame) return { width, height };

    if (autoFit) {
      const aspectRatio = frame.width / frame.height;
      if (width / height > aspectRatio) {
        return { width: height * aspectRatio, height };
      } else {
        return { width, height: width / aspectRatio };
      }
    }

    return { width, height };
  }, [frame, width, height, autoFit]);

  // 处理新帧
  useEffect(() => {
    if (!frame) return;

    // 创建图像 URL
    const url = createImageUrl(
      frame.data,
      frame.encoding,
      frame.pixelFormat,
      frame.width,
      frame.height
    );

    // 清理旧的 blob URL
    if (imageUrl && imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }

    setImageUrl(url);

    // 更新 FPS 统计
    const now = performance.now();
    const tracker = fpsTracker.current;
    tracker.frameTimestamps.push(now);

    // 只保留最近 1 秒的帧
    const oneSecondAgo = now - 1000;
    tracker.frameTimestamps = tracker.frameTimestamps.filter((t) => t > oneSecondAgo);

    const fps = tracker.frameTimestamps.length;
    const latency = frame.timestamp ? now - frame.timestamp / 1000 : 0;

    setStats((prev) => ({
      fps,
      frameCount: prev.frameCount + 1,
      lastTimestamp: frame.timestamp,
      droppedFrames: prev.droppedFrames,
      avgLatency: prev.avgLatency * 0.9 + latency * 0.1,
    }));

    tracker.lastFrameTime = now;

    // 清理
    return () => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [frame]);

  // 点击处理
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPixelClick || !frame || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 转换为图像坐标
      const u = (x / displaySize.width) * frame.width;
      const v = (y / displaySize.height) * frame.height;

      onPixelClick({ x, y }, { u, v });
    },
    [onPixelClick, frame, displaySize]
  );

  // 悬停处理
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPixelHover || !frame || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const u = (x / displaySize.width) * frame.width;
      const v = (y / displaySize.height) * frame.height;

      onPixelHover({ x, y }, { u, v });
    },
    [onPixelHover, frame, displaySize]
  );

  const handleMouseLeave = useCallback(() => {
    if (onPixelHover) {
      onPixelHover(null, null);
    }
  }, [onPixelHover]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: displaySize.width,
        height: displaySize.height,
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
        ...style,
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 图像 */}
      {imageUrl && (
        <img
          ref={imageRef}
          src={imageUrl}
          alt={`Camera: ${cameraId}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      )}

      {/* 无图像占位 */}
      {!imageUrl && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            color: '#666',
            fontSize: 14,
          }}
        >
          No Image - Camera: {cameraId}
        </div>
      )}

      {/* 标记叠加层 */}
      {frame && (markers.length > 0 || rois.length > 0) && (
        <OverlayCanvas
          markers={markers}
          rois={rois}
          imageWidth={frame.width}
          imageHeight={frame.height}
          displayWidth={displaySize.width}
          displayHeight={displaySize.height}
        />
      )}

      {/* FPS 显示 */}
      {showFps && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            padding: '2px 6px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: stats.fps >= 25 ? '#00ff00' : stats.fps >= 15 ? '#ffff00' : '#ff0000',
            fontSize: 12,
            fontFamily: 'monospace',
            borderRadius: 4,
          }}
        >
          {stats.fps} FPS
        </div>
      )}

      {/* 时间戳显示 */}
      {showTimestamp && frame && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '2px 6px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            fontSize: 12,
            fontFamily: 'monospace',
            borderRadius: 4,
          }}
        >
          {new Date(frame.timestamp / 1000).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3D Scene Integration (for R3F)
// ============================================================================

export interface ImagePlane3DProps {
  /** 相机 ID */
  cameraId: string;

  /** 图像帧 */
  frame?: ImageFrame | null;

  /** 在 3D 空间中的位置 */
  position?: [number, number, number];

  /** 旋转 (欧拉角) */
  rotation?: [number, number, number];

  /** 缩放 */
  scale?: number;

  /** 是否面向相机 */
  billboard?: boolean;

  /** 透明度 */
  opacity?: number;
}

/**
 * 在 3D 场景中显示图像平面
 * 可用于显示相机视锥中的图像
 */
export const ImagePlane3D: React.FC<ImagePlane3DProps> = ({
  cameraId,
  frame,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  billboard = false,
  opacity = 1,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    if (!frame) {
      setImageUrl('');
      return;
    }

    const url = createImageUrl(
      frame.data,
      frame.encoding,
      frame.pixelFormat,
      frame.width,
      frame.height
    );

    setImageUrl(url);

    return () => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [frame]);

  if (!imageUrl || !frame) return null;

  const aspectRatio = frame.width / frame.height;
  const planeWidth = scale;
  const planeHeight = scale / aspectRatio;

  return (
    <Html
      position={position}
      rotation={rotation}
      transform
      occlude
      style={{
        width: planeWidth * 100,
        height: planeHeight * 100,
        opacity,
        pointerEvents: 'none',
      }}
    >
      <img
        src={imageUrl}
        alt={`Camera ${cameraId}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </Html>
  );
};

export default ImageStreamRenderer;
