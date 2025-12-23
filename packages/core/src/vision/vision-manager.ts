/**
 * RoboViz Vision Manager
 *
 * 管理点云、相机视图、标定可视化等视觉元素
 */

import type { Vector3 } from '../types';
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
  IVisionManager,
  PointCloudClickEvent,
  PointCloudHoverEvent,
  CameraViewClickEvent,
  ROISelectedEvent,
  ROIModifiedEvent,
} from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * 视觉事件类型
 */
export type VisionEventType =
  | 'pointcloud_click'
  | 'pointcloud_hover'
  | 'cameraview_click'
  | 'roi_selected'
  | 'roi_modified';

/**
 * 视觉事件
 */
export type VisionEvent =
  | { type: 'pointcloud_click'; data: PointCloudClickEvent }
  | { type: 'pointcloud_hover'; data: PointCloudHoverEvent }
  | { type: 'cameraview_click'; data: CameraViewClickEvent }
  | { type: 'roi_selected'; data: ROISelectedEvent }
  | { type: 'roi_modified'; data: ROIModifiedEvent };

type VisionEventCallback = (event: VisionEvent) => void;

/**
 * 默认点云可视化配置
 */
const DEFAULT_POINT_CLOUD_VISUALIZATION: PointCloudVisualization = {
  visible: true,
  pointSize: 1.0,
  colorMode: 'rgb',
  opacity: 1.0,
  showBounds: false,
};

/**
 * 默认标定可视化配置
 */
const DEFAULT_CALIBRATION_VISUALIZATION: CalibrationVisualization = {
  showFrames: true,
  axisLength: 0.1,
  showConnection: true,
  connectionColor: '#00ff00',
  showError: false,
};

// ============================================================================
// Vision Manager Implementation
// ============================================================================

/**
 * 视觉管理器实现
 */
export class VisionManager implements IVisionManager {
  private readonly pointClouds: Map<string, PointCloudState> = new Map();
  private readonly cameraViews: Map<string, CameraViewState> = new Map();
  private readonly imageOverlays: Map<string, ImageOverlay> = new Map();
  private readonly calibrations: Map<string, { calibration: HandEyeCalibration; visualization: CalibrationVisualization }> = new Map();
  private readonly markers2D: Map<string, Marker2D> = new Map();
  private readonly rois2D: Map<string, ROI2D> = new Map();
  private readonly rois3D: Map<string, ROI3D> = new Map();

  private readonly eventListeners: Set<VisionEventCallback> = new Set();
  private idCounter = 0;

  // ==========================================================================
  // Point Cloud Management
  // ==========================================================================

  async loadPointCloud(
    data: PointCloudData,
    visualization?: Partial<PointCloudVisualization>
  ): Promise<string> {
    const id = data.id || this.generateId('pointcloud');

    const state: PointCloudState = {
      data: { ...data, id },
      visualization: { ...DEFAULT_POINT_CLOUD_VISUALIZATION, ...visualization },
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
    };

    this.pointClouds.set(id, state);
    return id;
  }

  async updatePointCloud(id: string, data: Partial<PointCloudData>): Promise<void> {
    const state = this.pointClouds.get(id);
    if (!state) {
      throw new Error(`Point cloud '${id}' not found`);
    }

    state.data = { ...state.data, ...data };
  }

  setPointCloudVisualization(id: string, options: Partial<PointCloudVisualization>): void {
    const state = this.pointClouds.get(id);
    if (!state) {
      throw new Error(`Point cloud '${id}' not found`);
    }

    state.visualization = { ...state.visualization, ...options };
  }

  removePointCloud(id: string): void {
    this.pointClouds.delete(id);
  }

  clearPointClouds(): void {
    this.pointClouds.clear();
  }

  getPointCloud(id: string): PointCloudState | undefined {
    return this.pointClouds.get(id);
  }

  getPointClouds(): PointCloudState[] {
    return Array.from(this.pointClouds.values());
  }

  // ==========================================================================
  // Camera View Management
  // ==========================================================================

  addCameraView(camera: CameraView): void {
    const state: CameraViewState = {
      ...camera,
      isActive: true,
    };

    this.cameraViews.set(camera.id, state);
  }

  removeCameraView(id: string): void {
    this.cameraViews.delete(id);
    this.imageOverlays.delete(id);
  }

  updateCameraView(id: string, updates: Partial<CameraView>): void {
    const state = this.cameraViews.get(id);
    if (!state) {
      throw new Error(`Camera view '${id}' not found`);
    }

    Object.assign(state, updates);
  }

  getCameraView(id: string): CameraViewState | undefined {
    return this.cameraViews.get(id);
  }

  getCameraViews(): CameraViewState[] {
    return Array.from(this.cameraViews.values());
  }

  // ==========================================================================
  // Image Overlay
  // ==========================================================================

  setImageOverlay(overlay: ImageOverlay): void {
    this.imageOverlays.set(overlay.cameraId, overlay);

    // 更新相机视图状态
    const cameraState = this.cameraViews.get(overlay.cameraId);
    if (cameraState) {
      if (typeof overlay.imageData === 'string') {
        cameraState.currentImage = overlay.imageData;
      }
    }
  }

  clearImageOverlay(cameraId: string): void {
    this.imageOverlays.delete(cameraId);

    const cameraState = this.cameraViews.get(cameraId);
    if (cameraState) {
      cameraState.currentImage = undefined;
    }
  }

  // ==========================================================================
  // Calibration Visualization
  // ==========================================================================

  showHandEyeCalibration(
    calibration: HandEyeCalibration,
    visualization?: Partial<CalibrationVisualization>
  ): void {
    this.calibrations.set(calibration.id, {
      calibration,
      visualization: { ...DEFAULT_CALIBRATION_VISUALIZATION, ...visualization },
    });
  }

  hideHandEyeCalibration(id: string): void {
    this.calibrations.delete(id);
  }

  // ==========================================================================
  // 2D Markers
  // ==========================================================================

  addMarker2D(marker: Marker2D): void {
    this.markers2D.set(marker.id, marker);
  }

  removeMarker2D(id: string): void {
    this.markers2D.delete(id);
  }

  clearMarkers2D(cameraId?: string): void {
    if (cameraId) {
      for (const [id, marker] of this.markers2D) {
        if (marker.cameraId === cameraId) {
          this.markers2D.delete(id);
        }
      }
    } else {
      this.markers2D.clear();
    }
  }

  getMarkers2D(cameraId?: string): Marker2D[] {
    const markers = Array.from(this.markers2D.values());
    if (cameraId) {
      return markers.filter(m => m.cameraId === cameraId);
    }
    return markers;
  }

  // ==========================================================================
  // ROI Management
  // ==========================================================================

  addROI2D(roi: ROI2D): void {
    this.rois2D.set(roi.id, roi);
  }

  removeROI2D(id: string): void {
    this.rois2D.delete(id);
  }

  getROIs2D(cameraId?: string): ROI2D[] {
    const rois = Array.from(this.rois2D.values());
    if (cameraId) {
      return rois.filter(r => r.cameraId === cameraId);
    }
    return rois;
  }

  addROI3D(roi: ROI3D): void {
    this.rois3D.set(roi.id, roi);
  }

  removeROI3D(id: string): void {
    this.rois3D.delete(id);
  }

  getROIs3D(): ROI3D[] {
    return Array.from(this.rois3D.values());
  }

  // ==========================================================================
  // Projection Functions
  // ==========================================================================

  projectPointToImage(point: Vector3, cameraId: string): [number, number] | null {
    const camera = this.cameraViews.get(cameraId);
    if (!camera) {
      return null;
    }

    const { intrinsics, extrinsics } = camera;

    // 将点从世界坐标系转换到相机坐标系
    // 简化实现，假设相机在世界原点
    const cameraPoint = this.transformPoint(point, extrinsics.transform);

    // 检查点是否在相机前方
    if (cameraPoint.z <= 0) {
      return null;
    }

    // 投影到图像平面
    const u = (intrinsics.fx * cameraPoint.x / cameraPoint.z) + intrinsics.cx;
    const v = (intrinsics.fy * cameraPoint.y / cameraPoint.z) + intrinsics.cy;

    // 检查是否在图像范围内
    if (u < 0 || u >= intrinsics.width || v < 0 || v >= intrinsics.height) {
      return null;
    }

    return [u, v];
  }

  unprojectPointFromImage(
    pixel: [number, number],
    depth: number,
    cameraId: string
  ): Vector3 | null {
    const camera = this.cameraViews.get(cameraId);
    if (!camera) {
      return null;
    }

    const { intrinsics } = camera;
    const [u, v] = pixel;

    // 反投影到相机坐标系
    const x = (u - intrinsics.cx) * depth / intrinsics.fx;
    const y = (v - intrinsics.cy) * depth / intrinsics.fy;
    const z = depth;

    // TODO: 转换到世界坐标系
    return { x, y, z };
  }

  // ==========================================================================
  // Event Management
  // ==========================================================================

  /**
   * 监听视觉事件
   */
  onEvent(callback: VisionEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * 触发事件
   */
  emitEvent(event: VisionEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in vision event listener:', error);
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * 清理所有资源
   */
  dispose(): void {
    this.pointClouds.clear();
    this.cameraViews.clear();
    this.imageOverlays.clear();
    this.calibrations.clear();
    this.markers2D.clear();
    this.rois2D.clear();
    this.rois3D.clear();
    this.eventListeners.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${++this.idCounter}`;
  }

  private transformPoint(point: Vector3, transform: { position: Vector3; rotation: { x: number; y: number; z: number; w: number } }): Vector3 {
    // 简化的变换实现 (仅平移)
    // TODO: 完整的四元数旋转
    return {
      x: point.x - transform.position.x,
      y: point.y - transform.position.y,
      z: point.z - transform.position.z,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建视觉管理器
 */
export function createVisionManager(): VisionManager {
  return new VisionManager();
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalVisionManager: VisionManager | null = null;

/**
 * 获取全局视觉管理器
 */
export function getVisionManager(): VisionManager {
  if (!globalVisionManager) {
    globalVisionManager = createVisionManager();
  }
  return globalVisionManager;
}

/**
 * 重置全局视觉管理器
 */
export function resetVisionManager(): void {
  if (globalVisionManager) {
    globalVisionManager.dispose();
    globalVisionManager = null;
  }
}
