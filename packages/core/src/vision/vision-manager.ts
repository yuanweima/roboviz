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
import type {
  ImageFrame,
  DepthImageFrame,
  PointCloudFrame,
  PointCloudUpdateFrame,
  StreamConfig,
} from '../streaming/types';
import { getStreamManager } from '../streaming/stream-manager';

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
  | 'roi_modified'
  | 'image_frame'
  | 'depth_frame'
  | 'pointcloud_frame';

/**
 * 视觉事件
 */
export type VisionEvent =
  | { type: 'pointcloud_click'; data: PointCloudClickEvent }
  | { type: 'pointcloud_hover'; data: PointCloudHoverEvent }
  | { type: 'cameraview_click'; data: CameraViewClickEvent }
  | { type: 'roi_selected'; data: ROISelectedEvent }
  | { type: 'roi_modified'; data: ROIModifiedEvent }
  | { type: 'image_frame'; data: { cameraId: string; frame: ImageFrame } }
  | { type: 'depth_frame'; data: { cameraId: string; frame: DepthImageFrame } }
  | { type: 'pointcloud_frame'; data: { cloudId: string; frame: PointCloudFrame | PointCloudUpdateFrame } };

type VisionEventCallback = (event: VisionEvent) => void;

/**
 * 相机流状态
 */
export interface CameraStreamState {
  cameraId: string;
  streamId: string;
  isActive: boolean;
  fps: number;
  lastFrame?: ImageFrame | DepthImageFrame;
  lastUpdateTime: number;
}

/**
 * 点云流状态
 */
export interface PointCloudStreamState {
  cloudId: string;
  streamId: string;
  isActive: boolean;
  updateRate: number;
  pointCount: number;
  lastFrame?: PointCloudFrame | PointCloudUpdateFrame;
  lastUpdateTime: number;
}

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

  // 流管理
  private readonly cameraStreams: Map<string, CameraStreamState> = new Map();
  private readonly pointCloudStreams: Map<string, PointCloudStreamState> = new Map();
  private readonly streamSubscriptions: Map<string, () => void> = new Map();

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
  // Camera Stream Management
  // ==========================================================================

  /**
   * 启动相机图像流
   */
  async startCameraStream(
    cameraId: string,
    streamConfig?: Partial<StreamConfig>
  ): Promise<string> {
    // 检查是否已存在
    if (this.cameraStreams.has(cameraId)) {
      const existing = this.cameraStreams.get(cameraId)!;
      if (existing.isActive) {
        return existing.streamId;
      }
    }

    const streamManager = getStreamManager();
    const config: StreamConfig = {
      streamId: `camera_${cameraId}_${Date.now()}`,
      type: 'image',
      frequency: 30,
      bufferSize: 3,
      compression: 'none',
      priority: 'high',
      sensorId: cameraId,
      ...streamConfig,
    };

    const streamId = await streamManager.createStream(config);

    // 订阅流
    const unsubscribe = streamManager.subscribe<ImageFrame | DepthImageFrame>(
      streamId,
      (frame) => this.handleCameraFrame(cameraId, frame)
    );
    this.streamSubscriptions.set(streamId, unsubscribe);

    // 更新状态
    this.cameraStreams.set(cameraId, {
      cameraId,
      streamId,
      isActive: true,
      fps: 0,
      lastUpdateTime: Date.now(),
    });

    return streamId;
  }

  /**
   * 停止相机图像流
   */
  stopCameraStream(cameraId: string): void {
    const state = this.cameraStreams.get(cameraId);
    if (!state) return;

    // 取消订阅
    const unsubscribe = this.streamSubscriptions.get(state.streamId);
    if (unsubscribe) {
      unsubscribe();
      this.streamSubscriptions.delete(state.streamId);
    }

    // 销毁流
    const streamManager = getStreamManager();
    streamManager.destroyStream(state.streamId);

    // 更新状态
    state.isActive = false;
  }

  /**
   * 获取相机流状态
   */
  getCameraStreamState(cameraId: string): CameraStreamState | undefined {
    return this.cameraStreams.get(cameraId);
  }

  /**
   * 获取所有活跃的相机流
   */
  getActiveCameraStreams(): CameraStreamState[] {
    return Array.from(this.cameraStreams.values()).filter((s) => s.isActive);
  }

  /**
   * 处理相机帧
   */
  private handleCameraFrame(cameraId: string, frame: ImageFrame | DepthImageFrame): void {
    const state = this.cameraStreams.get(cameraId);
    if (!state) return;

    state.lastFrame = frame;
    state.lastUpdateTime = Date.now();

    // 判断是否是深度帧
    const isDepthFrame = 'depthData' in frame;

    // 发送事件
    if (isDepthFrame) {
      this.emitEvent({
        type: 'depth_frame',
        data: { cameraId, frame: frame as DepthImageFrame },
      });
    } else {
      this.emitEvent({
        type: 'image_frame',
        data: { cameraId, frame: frame as ImageFrame },
      });
    }
  }

  // ==========================================================================
  // Point Cloud Stream Management
  // ==========================================================================

  /**
   * 启动点云数据流
   */
  async startPointCloudStream(
    cloudId: string,
    streamConfig?: Partial<StreamConfig>
  ): Promise<string> {
    // 检查是否已存在
    if (this.pointCloudStreams.has(cloudId)) {
      const existing = this.pointCloudStreams.get(cloudId)!;
      if (existing.isActive) {
        return existing.streamId;
      }
    }

    const streamManager = getStreamManager();
    const config: StreamConfig = {
      streamId: `pointcloud_${cloudId}_${Date.now()}`,
      type: 'point_cloud',
      frequency: 30,
      bufferSize: 2,
      compression: 'none',
      priority: 'high',
      sensorId: cloudId,
      ...streamConfig,
    };

    const streamId = await streamManager.createStream(config);

    // 订阅流
    const unsubscribe = streamManager.subscribe<PointCloudFrame | PointCloudUpdateFrame>(
      streamId,
      (frame) => this.handlePointCloudFrame(cloudId, frame)
    );
    this.streamSubscriptions.set(streamId, unsubscribe);

    // 更新状态
    this.pointCloudStreams.set(cloudId, {
      cloudId,
      streamId,
      isActive: true,
      updateRate: 0,
      pointCount: 0,
      lastUpdateTime: Date.now(),
    });

    return streamId;
  }

  /**
   * 停止点云数据流
   */
  stopPointCloudStream(cloudId: string): void {
    const state = this.pointCloudStreams.get(cloudId);
    if (!state) return;

    // 取消订阅
    const unsubscribe = this.streamSubscriptions.get(state.streamId);
    if (unsubscribe) {
      unsubscribe();
      this.streamSubscriptions.delete(state.streamId);
    }

    // 销毁流
    const streamManager = getStreamManager();
    streamManager.destroyStream(state.streamId);

    // 更新状态
    state.isActive = false;
  }

  /**
   * 获取点云流状态
   */
  getPointCloudStreamState(cloudId: string): PointCloudStreamState | undefined {
    return this.pointCloudStreams.get(cloudId);
  }

  /**
   * 获取所有活跃的点云流
   */
  getActivePointCloudStreams(): PointCloudStreamState[] {
    return Array.from(this.pointCloudStreams.values()).filter((s) => s.isActive);
  }

  /**
   * 处理点云帧
   */
  private handlePointCloudFrame(
    cloudId: string,
    frame: PointCloudFrame | PointCloudUpdateFrame
  ): void {
    const state = this.pointCloudStreams.get(cloudId);
    if (!state) return;

    state.lastFrame = frame;
    state.lastUpdateTime = Date.now();
    state.pointCount = frame.pointCount;

    // 发送事件
    this.emitEvent({
      type: 'pointcloud_frame',
      data: { cloudId, frame },
    });
  }

  /**
   * 推送图像帧到流 (用于外部数据源)
   */
  pushImageFrame(cameraId: string, frame: ImageFrame | DepthImageFrame): boolean {
    const state = this.cameraStreams.get(cameraId);
    if (!state || !state.isActive) return false;

    const streamManager = getStreamManager();
    return streamManager.pushData(state.streamId, frame);
  }

  /**
   * 推送点云帧到流 (用于外部数据源)
   */
  pushPointCloudFrame(
    cloudId: string,
    frame: PointCloudFrame | PointCloudUpdateFrame
  ): boolean {
    const state = this.pointCloudStreams.get(cloudId);
    if (!state || !state.isActive) return false;

    const streamManager = getStreamManager();
    return streamManager.pushData(state.streamId, frame);
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * 清理所有资源
   */
  dispose(): void {
    // 停止所有流
    for (const [cameraId] of this.cameraStreams) {
      this.stopCameraStream(cameraId);
    }
    for (const [cloudId] of this.pointCloudStreams) {
      this.stopPointCloudStream(cloudId);
    }

    this.pointClouds.clear();
    this.cameraViews.clear();
    this.imageOverlays.clear();
    this.calibrations.clear();
    this.markers2D.clear();
    this.rois2D.clear();
    this.rois3D.clear();
    this.cameraStreams.clear();
    this.pointCloudStreams.clear();
    this.streamSubscriptions.clear();
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
