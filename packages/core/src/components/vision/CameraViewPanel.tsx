/**
 * CameraViewPanel - 相机视图面板组件
 *
 * 综合性相机视图面板，集成：
 * - 实时图像流显示
 * - 2D 标记和 ROI 叠加
 * - 相机信息显示
 * - 交互控制
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { ImageStreamRenderer, type ImageStreamStats } from './ImageStreamRenderer';
import { useCameraStream, type CameraStreamOptions } from '../../hooks/useCameraStream';
import type { Marker2D, ROI2D, CameraView } from '../../vision/types';
import type { ImageFrame, DepthImageFrame } from '../../streaming/types';

// ============================================================================
// Types
// ============================================================================

export interface CameraViewPanelProps {
  /** 相机 ID */
  cameraId: string;

  /** 相机配置信息 (可选) */
  cameraConfig?: CameraView;

  /** 流 ID (如果已存在) */
  streamId?: string;

  /** 是否自动启动流 */
  autoStart?: boolean;

  /** 面板宽度 */
  width?: number;

  /** 面板高度 */
  height?: number;

  /** 2D 标记列表 */
  markers?: Marker2D[];

  /** 2D ROI 列表 */
  rois?: ROI2D[];

  /** 是否显示工具栏 */
  showToolbar?: boolean;

  /** 是否显示 FPS */
  showFps?: boolean;

  /** 是否显示时间戳 */
  showTimestamp?: boolean;

  /** 是否显示相机信息 */
  showCameraInfo?: boolean;

  /** 点击像素回调 */
  onPixelClick?: (
    pixel: { x: number; y: number },
    imageCoord: { u: number; v: number },
    frame: ImageFrame | DepthImageFrame | null
  ) => void;

  /** 帧接收回调 */
  onFrame?: (frame: ImageFrame | DepthImageFrame) => void;

  /** 截图回调 */
  onCapture?: (frame: ImageFrame | DepthImageFrame) => void;

  /** 自定义样式 */
  style?: React.CSSProperties;

  /** 自定义类名 */
  className?: string;

  /** 流配置选项 */
  streamOptions?: Partial<CameraStreamOptions>;
}

// ============================================================================
// Sub-components
// ============================================================================

interface ToolbarProps {
  isStreaming: boolean;
  fps: number;
  onStart: () => void;
  onStop: () => void;
  onCapture: () => void;
  onFullscreen?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  isStreaming,
  fps,
  onStart,
  onStop,
  onCapture,
  onFullscreen,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderBottom: '1px solid #333',
      }}
    >
      {/* 播放/停止按钮 */}
      <button
        onClick={isStreaming ? onStop : onStart}
        style={{
          padding: '4px 12px',
          backgroundColor: isStreaming ? '#d32f2f' : '#388e3c',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        {isStreaming ? '■ Stop' : '▶ Start'}
      </button>

      {/* 截图按钮 */}
      <button
        onClick={onCapture}
        disabled={!isStreaming}
        style={{
          padding: '4px 12px',
          backgroundColor: isStreaming ? '#1976d2' : '#666',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: isStreaming ? 'pointer' : 'not-allowed',
          fontSize: 12,
        }}
      >
        📷 Capture
      </button>

      {/* FPS 显示 */}
      <div
        style={{
          marginLeft: 'auto',
          color: fps >= 25 ? '#4caf50' : fps >= 15 ? '#ff9800' : '#f44336',
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        {fps} FPS
      </div>

      {/* 全屏按钮 */}
      {onFullscreen && (
        <button
          onClick={onFullscreen}
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid #666',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          ⛶
        </button>
      )}
    </div>
  );
};

interface CameraInfoProps {
  cameraConfig?: CameraView;
  streamState: {
    connected: boolean;
    frameCount: number;
    droppedFrames: number;
    avgLatency: number;
  };
}

const CameraInfo: React.FC<CameraInfoProps> = ({ cameraConfig, streamState }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#ccc',
        fontSize: 10,
        fontFamily: 'monospace',
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <span>
        {cameraConfig?.name || 'Camera'} | {cameraConfig?.intrinsics?.width || '?'}x
        {cameraConfig?.intrinsics?.height || '?'}
      </span>
      <span>
        Frames: {streamState.frameCount} | Dropped: {streamState.droppedFrames} | Latency:{' '}
        {streamState.avgLatency.toFixed(1)}ms
      </span>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const CameraViewPanel: React.FC<CameraViewPanelProps> = ({
  cameraId,
  cameraConfig,
  streamId,
  autoStart = false,
  width = 640,
  height = 480,
  markers = [],
  rois = [],
  showToolbar = true,
  showFps = true,
  showTimestamp = false,
  showCameraInfo = false,
  onPixelClick,
  onFrame,
  onCapture,
  style,
  className,
  streamOptions = {},
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 使用相机流 hook
  const [streamState, streamControls] = useCameraStream(cameraId, {
    streamId,
    ...streamOptions,
    onFrame,
  });

  // 自动启动
  React.useEffect(() => {
    if (autoStart) {
      streamControls.start();
    }
    return () => {
      streamControls.stop();
    };
  }, [autoStart]);

  // 处理像素点击
  const handlePixelClick = useCallback(
    (pixel: { x: number; y: number }, imageCoord: { u: number; v: number }) => {
      if (onPixelClick) {
        onPixelClick(pixel, imageCoord, streamState.frame);
      }
    },
    [onPixelClick, streamState.frame]
  );

  // 处理截图
  const handleCapture = useCallback(() => {
    const frame = streamControls.captureFrame();
    if (frame && onCapture) {
      onCapture(frame);
    }
  }, [streamControls, onCapture]);

  // 处理全屏
  const handleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 计算显示尺寸
  const displaySize = useMemo(() => {
    if (isFullscreen) {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { width, height };
  }, [width, height, isFullscreen]);

  // 工具栏高度
  const toolbarHeight = showToolbar ? 32 : 0;
  const infoHeight = showCameraInfo ? 24 : 0;
  const imageHeight = displaySize.height - toolbarHeight - infoHeight;

  return (
    <div
      className={className}
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        width: displaySize.width,
        height: displaySize.height,
        backgroundColor: '#1a1a1a',
        borderRadius: isFullscreen ? 0 : 4,
        overflow: 'hidden',
        zIndex: isFullscreen ? 9999 : undefined,
        ...style,
      }}
    >
      {/* 工具栏 */}
      {showToolbar && (
        <Toolbar
          isStreaming={streamState.connected}
          fps={streamState.fps}
          onStart={streamControls.start}
          onStop={streamControls.stop}
          onCapture={handleCapture}
          onFullscreen={handleFullscreen}
        />
      )}

      {/* 图像显示区域 */}
      <ImageStreamRenderer
        cameraId={cameraId}
        frame={streamState.frame && 'pixelFormat' in streamState.frame ? streamState.frame : null}
        width={displaySize.width}
        height={imageHeight}
        autoFit
        markers={markers}
        rois={rois}
        showFps={showFps && !showToolbar}
        showTimestamp={showTimestamp}
        onPixelClick={handlePixelClick}
      />

      {/* 相机信息 */}
      {showCameraInfo && (
        <CameraInfo
          cameraConfig={cameraConfig}
          streamState={{
            connected: streamState.connected,
            frameCount: streamState.frameCount,
            droppedFrames: streamState.droppedFrames,
            avgLatency: streamState.avgLatency,
          }}
        />
      )}

      {/* 连接状态指示 */}
      {!streamState.connected && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#666',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
          <div style={{ fontSize: 14 }}>Camera: {cameraId}</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Click Start to begin streaming</div>
        </div>
      )}

      {/* 错误显示 */}
      {streamState.error && (
        <div
          style={{
            position: 'absolute',
            bottom: infoHeight + 8,
            left: 8,
            right: 8,
            padding: 8,
            backgroundColor: 'rgba(211, 47, 47, 0.9)',
            color: 'white',
            fontSize: 12,
            borderRadius: 4,
          }}
        >
          Error: {streamState.error}
        </div>
      )}

      {/* 全屏关闭按钮 */}
      {isFullscreen && (
        <button
          onClick={handleFullscreen}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '8px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            zIndex: 10000,
          }}
        >
          ✕ Exit Fullscreen
        </button>
      )}
    </div>
  );
};

export default CameraViewPanel;
