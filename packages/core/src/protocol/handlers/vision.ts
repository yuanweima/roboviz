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
import { getVisionManager } from '../../vision/vision-manager';

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
// Handler Registry
// ============================================================================

/**
 * 所有视觉相关处理器
 */
export const visionHandlers: Record<string, MethodHandler> = {
  // Point Cloud
  'pointCloud.load': pointCloudLoad,
  'pointCloud.update': pointCloudUpdate,
  'pointCloud.setVisualization': pointCloudSetVisualization,
  'pointCloud.remove': pointCloudRemove,
  'pointCloud.clear': pointCloudClear,
  'pointCloud.get': pointCloudGet,
  'pointCloud.list': pointCloudList,

  // Camera View
  'vision.addCameraView': visionAddCameraView,
  'vision.removeCameraView': visionRemoveCameraView,
  'vision.updateCameraView': visionUpdateCameraView,
  'vision.getCameraView': visionGetCameraView,
  'vision.listCameraViews': visionListCameraViews,

  // Image Overlay
  'vision.setImageOverlay': visionSetImageOverlay,
  'vision.clearImageOverlay': visionClearImageOverlay,

  // Calibration
  'vision.showCalibration': visionShowCalibration,
  'vision.hideCalibration': visionHideCalibration,

  // 2D Markers
  'vision.addMarker2D': visionAddMarker2D,
  'vision.removeMarker2D': visionRemoveMarker2D,
  'vision.clearMarkers2D': visionClearMarkers2D,

  // ROI
  'vision.addROI2D': visionAddROI2D,
  'vision.removeROI2D': visionRemoveROI2D,
  'vision.addROI3D': visionAddROI3D,
  'vision.removeROI3D': visionRemoveROI3D,

  // Projection
  'vision.projectPoint': visionProjectPoint,
  'vision.unprojectPoint': visionUnprojectPoint,
};

/**
 * 注册所有视觉处理器到 dispatcher
 */
export function registerVisionHandlers(
  registerMethod: (method: string, handler: MethodHandler) => void
): void {
  for (const [method, handler] of Object.entries(visionHandlers)) {
    registerMethod(method, handler);
  }
}
