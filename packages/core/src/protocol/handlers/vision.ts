/**
 * RoboViz Vision Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for pointCloud.*, vision.*, camera.* namespaces
 */

import type { MethodHandler } from '../handler';
import type {
  PointCloudData,
  PointCloudVisualization,
  PointCloudState,
  CameraView,
  CameraViewState,
  ImageOverlay,
  HandEyeCalibration,
  CalibrationVisualization,
  Marker2D,
  ROI2D,
  ROI3D,
} from '../../vision/types';
import type { Vector3 } from '../../types';
import type {
  ImageFrame,
  DepthImageFrame,
  PointCloudFrame,
  PointCloudUpdateFrame,
  StreamConfig,
} from '../../streaming/types';
import {
  getVisionManager,
  type CameraStreamState,
  type PointCloudStreamState,
} from '../../vision/vision-manager';

// ============================================================================
// Point Cloud Handlers
// ============================================================================

/**
 * pointCloud.load - 加载点云
 */
export const pointCloudLoad: MethodHandler<
  { data: PointCloudData; visualization?: Partial<PointCloudVisualization> },
  { id: string }
> = async (params) => {
  const manager = getVisionManager();
  const id = await manager.loadPointCloud(params.data, params.visualization);
  return { id };
};

/**
 * pointCloud.update - 更新点云数据
 */
export const pointCloudUpdate: MethodHandler<
  { id: string; data: Partial<PointCloudData> },
  { success: boolean }
> = async (params) => {
  const manager = getVisionManager();
  await manager.updatePointCloud(params.id, params.data);
  return { success: true };
};

/**
 * pointCloud.setVisualization - 设置可视化选项
 */
export const pointCloudSetVisualization: MethodHandler<
  { id: string; options: Partial<PointCloudVisualization> },
  { success: boolean }
> = (params) => {
  const manager = getVisionManager();
  manager.setPointCloudVisualization(params.id, params.options);
  return { success: true };
};

/**
 * pointCloud.remove - 移除点云
 */
export const pointCloudRemove: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getVisionManager();
  manager.removePointCloud(params.id);
  return { success: true };
};

/**
 * pointCloud.clear - 清除所有点云
 */
export const pointCloudClear: MethodHandler<Record<string, never>, { success: boolean }> = () => {
  const manager = getVisionManager();
  manager.clearPointClouds();
  return { success: true };
};

/**
 * pointCloud.get - 获取点云状态
 */
export const pointCloudGet: MethodHandler<{ id: string }, PointCloudState | null> = (params) => {
  const manager = getVisionManager();
  return manager.getPointCloud(params.id) ?? null;
};

/**
 * pointCloud.list - 列出所有点云
 */
export const pointCloudList: MethodHandler<
  Record<string, never>,
  { pointClouds: Array<{ id: string; pointCount: number; visible: boolean }> }
> = () => {
  const manager = getVisionManager();
  const pointClouds = manager.getPointClouds().map((pc) => ({
    id: pc.data.id,
    pointCount: pc.data.pointCount,
    visible: pc.visualization.visible,
  }));
  return { pointClouds };
};

// ============================================================================
// Camera View Handlers
// ============================================================================

/**
 * vision.addCameraView - 添加相机视图
 */
export const visionAddCameraView: MethodHandler<CameraView, { success: boolean }> = (params) => {
  const manager = getVisionManager();
  manager.addCameraView(params);
  return { success: true };
};

/**
 * vision.removeCameraView - 移除相机视图
 */
export const visionRemoveCameraView: MethodHandler<{ id: string }, { success: boolean }> = (
  params
) => {
  const manager = getVisionManager();
  manager.removeCameraView(params.id);
  return { success: true };
};

/**
 * vision.updateCameraView - 更新相机视图
 */
export const visionUpdateCameraView: MethodHandler<
  { id: string; updates: Partial<CameraView> },
  { success: boolean }
> = (params) => {
  const manager = getVisionManager();
  manager.updateCameraView(params.id, params.updates);
  return { success: true };
};

/**
 * vision.getCameraView - 获取相机视图
 */
export const visionGetCameraView: MethodHandler<{ id: string }, CameraViewState | null> = (
  params
) => {
  const manager = getVisionManager();
  return manager.getCameraView(params.id) ?? null;
};

/**
 * vision.listCameraViews - 列出所有相机视图
 */
export const visionListCameraViews: MethodHandler<
  Record<string, never>,
  { cameraViews: Array<{ id: string; name: string; isActive: boolean }> }
> = () => {
  const manager = getVisionManager();
  const cameraViews = manager.getCameraViews().map((cv) => ({
    id: cv.id,
    name: cv.name,
    isActive: cv.isActive,
  }));
  return { cameraViews };
};

// ============================================================================
// Image Overlay Handlers
// ============================================================================

/**
 * vision.setImageOverlay - 设置图像叠加
 */
export const visionSetImageOverlay: MethodHandler<ImageOverlay, { success: boolean }> = (
  params
) => {
  const manager = getVisionManager();
  manager.setImageOverlay(params);
  return { success: true };
};

/**
 * vision.clearImageOverlay - 清除图像叠加
 */
export const visionClearImageOverlay: MethodHandler<{ cameraId: string }, { success: boolean }> = (
  params
) => {
  const manager = getVisionManager();
  manager.clearImageOverlay(params.cameraId);
  return { success: true };
};

// ============================================================================
// Calibration Handlers
// ============================================================================

/**
 * vision.showCalibration - 显示手眼标定
 */
export const visionShowCalibration: MethodHandler<
  { calibration: HandEyeCalibration; visualization?: Partial<CalibrationVisualization> },
  { success: boolean }
> = (params) => {
  const manager = getVisionManager();
  manager.showHandEyeCalibration(params.calibration, params.visualization);
  return { success: true };
};

/**
 * vision.hideCalibration - 隐藏手眼标定
 */
export const visionHideCalibration: MethodHandler<{ id: string }, { success: boolean }> = (
  params
) => {
  const manager = getVisionManager();
  manager.hideHandEyeCalibration(params.id);
  return { success: true };
};

// ============================================================================
// 2D Marker Handlers
// ============================================================================

/**
 * vision.addMarker2D - 添加 2D 标记
 */
export const visionAddMarker2D: MethodHandler<Marker2D, { success: boolean }> = (params) => {
  const manager = getVisionManager();
  manager.addMarker2D(params);
  return { success: true };
};

/**
 * vision.removeMarker2D - 移除 2D 标记
 */
export const visionRemoveMarker2D: MethodHandler<{ id: string }, { success: boolean }> = (
  params
) => {
  const manager = getVisionManager();
  manager.removeMarker2D(params.id);
  return { success: true };
};

/**
 * vision.clearMarkers2D - 清除 2D 标记
 */
export const visionClearMarkers2D: MethodHandler<
  { cameraId?: string },
  { success: boolean }
> = (params) => {
  const manager = getVisionManager();
  manager.clearMarkers2D(params.cameraId);
  return { success: true };
};

// ============================================================================
// ROI Handlers
// ============================================================================

/**
 * vision.addROI2D - 添加 2D ROI
 */
export const visionAddROI2D: MethodHandler<ROI2D, { success: boolean }> = (params) => {
  const manager = getVisionManager();
  manager.addROI2D(params);
  return { success: true };
};

/**
 * vision.removeROI2D - 移除 2D ROI
 */
export const visionRemoveROI2D: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getVisionManager();
  manager.removeROI2D(params.id);
  return { success: true };
};

/**
 * vision.addROI3D - 添加 3D ROI
 */
export const visionAddROI3D: MethodHandler<ROI3D, { success: boolean }> = (params) => {
  const manager = getVisionManager();
  manager.addROI3D(params);
  return { success: true };
};

/**
 * vision.removeROI3D - 移除 3D ROI
 */
export const visionRemoveROI3D: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getVisionManager();
  manager.removeROI3D(params.id);
  return { success: true };
};

// ============================================================================
// Projection Handlers
// ============================================================================

/**
 * vision.projectPoint - 投影 3D 点到图像
 */
export const visionProjectPoint: MethodHandler<
  { point: Vector3; cameraId: string },
  { pixel: [number, number] | null }
> = (params) => {
  const manager = getVisionManager();
  const pixel = manager.projectPointToImage(params.point, params.cameraId);
  return { pixel };
};

/**
 * vision.unprojectPoint - 反投影图像点到 3D
 */
export const visionUnprojectPoint: MethodHandler<
  { pixel: [number, number]; depth: number; cameraId: string },
  { point: Vector3 | null }
> = (params) => {
  const manager = getVisionManager();
  const point = manager.unprojectPointFromImage(params.pixel, params.depth, params.cameraId);
  return { point };
};

// ============================================================================
// Camera Stream Handlers
// ============================================================================

/**
 * camera.startStream - 启动相机图像流
 */
export const cameraStartStream: MethodHandler<
  { cameraId: string; config?: Partial<StreamConfig> },
  { streamId: string }
> = async (params) => {
  const manager = getVisionManager();
  const streamId = await manager.startCameraStream(params.cameraId, params.config);
  return { streamId };
};

/**
 * camera.stopStream - 停止相机图像流
 */
export const cameraStopStream: MethodHandler<
  { cameraId: string },
  { success: boolean }
> = (params) => {
  const manager = getVisionManager();
  manager.stopCameraStream(params.cameraId);
  return { success: true };
};

/**
 * camera.getStreamState - 获取相机流状态
 */
export const cameraGetStreamState: MethodHandler<
  { cameraId: string },
  CameraStreamState | null
> = (params) => {
  const manager = getVisionManager();
  return manager.getCameraStreamState(params.cameraId) ?? null;
};

/**
 * camera.listActiveStreams - 列出所有活跃的相机流
 */
export const cameraListActiveStreams: MethodHandler<
  Record<string, never>,
  { streams: CameraStreamState[] }
> = () => {
  const manager = getVisionManager();
  return { streams: manager.getActiveCameraStreams() };
};

/**
 * camera.pushFrame - 推送图像帧 (用于外部数据源)
 */
export const cameraPushFrame: MethodHandler<
  { cameraId: string; frame: ImageFrame | DepthImageFrame },
  { success: boolean }
> = (params) => {
  const manager = getVisionManager();
  const success = manager.pushImageFrame(params.cameraId, params.frame);
  return { success };
};

// ============================================================================
// Point Cloud Stream Handlers
// ============================================================================

/**
 * pointCloud.startStream - 启动点云数据流
 */
export const pointCloudStartStream: MethodHandler<
  { cloudId: string; config?: Partial<StreamConfig> },
  { streamId: string }
> = async (params) => {
  const manager = getVisionManager();
  const streamId = await manager.startPointCloudStream(params.cloudId, params.config);
  return { streamId };
};

/**
 * pointCloud.stopStream - 停止点云数据流
 */
export const pointCloudStopStream: MethodHandler<
  { cloudId: string },
  { success: boolean }
> = (params) => {
  const manager = getVisionManager();
  manager.stopPointCloudStream(params.cloudId);
  return { success: true };
};

/**
 * pointCloud.getStreamState - 获取点云流状态
 */
export const pointCloudGetStreamState: MethodHandler<
  { cloudId: string },
  PointCloudStreamState | null
> = (params) => {
  const manager = getVisionManager();
  return manager.getPointCloudStreamState(params.cloudId) ?? null;
};

/**
 * pointCloud.listActiveStreams - 列出所有活跃的点云流
 */
export const pointCloudListActiveStreams: MethodHandler<
  Record<string, never>,
  { streams: PointCloudStreamState[] }
> = () => {
  const manager = getVisionManager();
  return { streams: manager.getActivePointCloudStreams() };
};

/**
 * pointCloud.pushFrame - 推送点云帧 (用于外部数据源)
 */
export const pointCloudPushFrame: MethodHandler<
  { cloudId: string; frame: PointCloudFrame | PointCloudUpdateFrame },
  { success: boolean }
> = (params) => {
  const manager = getVisionManager();
  const success = manager.pushPointCloudFrame(params.cloudId, params.frame);
  return { success };
};

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * 注册所有视觉处理器到 dispatcher
 *
 * 使用类型安全的逐个注册方式
 */
export function registerVisionHandlers(
  register: <TParams, TResult>(method: string, handler: MethodHandler<TParams, TResult>) => void
): void {
  // Point Cloud
  register('pointCloud.load', pointCloudLoad);
  register('pointCloud.update', pointCloudUpdate);
  register('pointCloud.setVisualization', pointCloudSetVisualization);
  register('pointCloud.remove', pointCloudRemove);
  register('pointCloud.clear', pointCloudClear);
  register('pointCloud.get', pointCloudGet);
  register('pointCloud.list', pointCloudList);

  // Point Cloud Streaming
  register('pointCloud.startStream', pointCloudStartStream);
  register('pointCloud.stopStream', pointCloudStopStream);
  register('pointCloud.getStreamState', pointCloudGetStreamState);
  register('pointCloud.listActiveStreams', pointCloudListActiveStreams);
  register('pointCloud.pushFrame', pointCloudPushFrame);

  // Camera View
  register('vision.addCameraView', visionAddCameraView);
  register('vision.removeCameraView', visionRemoveCameraView);
  register('vision.updateCameraView', visionUpdateCameraView);
  register('vision.getCameraView', visionGetCameraView);
  register('vision.listCameraViews', visionListCameraViews);

  // Camera Streaming
  register('camera.startStream', cameraStartStream);
  register('camera.stopStream', cameraStopStream);
  register('camera.getStreamState', cameraGetStreamState);
  register('camera.listActiveStreams', cameraListActiveStreams);
  register('camera.pushFrame', cameraPushFrame);

  // Image Overlay
  register('vision.setImageOverlay', visionSetImageOverlay);
  register('vision.clearImageOverlay', visionClearImageOverlay);

  // Calibration
  register('vision.showCalibration', visionShowCalibration);
  register('vision.hideCalibration', visionHideCalibration);

  // 2D Markers
  register('vision.addMarker2D', visionAddMarker2D);
  register('vision.removeMarker2D', visionRemoveMarker2D);
  register('vision.clearMarkers2D', visionClearMarkers2D);

  // ROI
  register('vision.addROI2D', visionAddROI2D);
  register('vision.removeROI2D', visionRemoveROI2D);
  register('vision.addROI3D', visionAddROI3D);
  register('vision.removeROI3D', visionRemoveROI3D);

  // Projection
  register('vision.projectPoint', visionProjectPoint);
  register('vision.unprojectPoint', visionUnprojectPoint);
}
