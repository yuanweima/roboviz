/**
 * RoboViz Vision Types
 *
 * 机器视觉集成相关类型定义
 */

import type { Vector3, Quaternion, Transform, Pose } from '../types';

// ============================================================================
// Point Cloud Types
// ============================================================================

/**
 * 点云格式
 */
export type PointCloudFormat =
  | 'xyz'       // 仅位置
  | 'xyzrgb'    // 位置 + RGB
  | 'xyzi'      // 位置 + 强度
  | 'xyzrgba'   // 位置 + RGBA
  | 'xyzn'      // 位置 + 法线
  | 'xyzrgbn'   // 位置 + RGB + 法线
  | 'pcd'       // PCD 文件格式
  | 'ply';      // PLY 文件格式

/**
 * 点云数据
 */
export interface PointCloudData {
  /** 唯一标识符 */
  id: string;

  /** 数据格式 */
  format: PointCloudFormat;

  /** 点坐标 (交错存储 [x,y,z, x,y,z, ...]) */
  points: Float32Array;

  /** 点数量 */
  pointCount: number;

  /** 颜色 (可选, RGBA 或 RGB) */
  colors?: Uint8Array;

  /** 强度值 (可选) */
  intensities?: Float32Array;

  /** 法线 (可选, 交错存储 [nx,ny,nz, ...]) */
  normals?: Float32Array;

  /** 包围盒 */
  bounds: {
    min: Vector3;
    max: Vector3;
  };

  /** 坐标系 ID */
  frameId?: string;

  /** 时间戳 (微秒) */
  timestamp?: number;
}

/**
 * 点云颜色模式
 */
export type PointCloudColorMode =
  | 'rgb'        // 使用点云自带的 RGB 颜色
  | 'intensity'  // 按强度着色
  | 'height'     // 按高度着色
  | 'normal'     // 按法线方向着色
  | 'uniform'    // 统一颜色
  | 'distance';  // 按距离着色

/**
 * 颜色映射
 */
export type ColorMap = 'jet' | 'rainbow' | 'grayscale' | 'hot' | 'cool' | 'viridis';

/**
 * 点云可视化配置
 */
export interface PointCloudVisualization {
  /** 是否可见 */
  visible: boolean;

  /** 点大小 */
  pointSize: number;

  /** 颜色模式 */
  colorMode: PointCloudColorMode;

  /** 统一颜色 (colorMode = 'uniform' 时使用) */
  uniformColor?: string;

  /** 高度颜色映射 */
  heightColorMap?: ColorMap;

  /** 高度范围 [min, max] (auto if undefined) */
  heightRange?: [number, number];

  /** 强度范围 [min, max] */
  intensityRange?: [number, number];

  /** 透明度 (0-1) */
  opacity: number;

  /** 是否显示包围盒 */
  showBounds?: boolean;

  /** 包围盒颜色 */
  boundsColor?: string;

  /** 最大显示点数 (用于 LOD) */
  maxPoints?: number;

  /** 抽稀因子 */
  decimationFactor?: number;
}

/**
 * 点云状态
 */
export interface PointCloudState {
  data: PointCloudData;
  visualization: PointCloudVisualization;
  transform: Transform;
}

// ============================================================================
// Camera Types
// ============================================================================

/**
 * 畸变模型
 */
export type DistortionModel =
  | 'none'
  | 'plumb_bob'    // 标准 5 参数模型 (k1, k2, p1, p2, k3)
  | 'rational'      // 8 参数模型
  | 'fisheye'       // 鱼眼相机模型
  | 'equidistant';  // 等距投影模型

/**
 * 相机内参
 */
export interface CameraIntrinsics {
  /** 图像宽度 (像素) */
  width: number;

  /** 图像高度 (像素) */
  height: number;

  /** 焦距 x */
  fx: number;

  /** 焦距 y */
  fy: number;

  /** 主点 x */
  cx: number;

  /** 主点 y */
  cy: number;

  /** 畸变模型 */
  distortionModel: DistortionModel;

  /** 畸变系数 */
  distortionCoeffs?: number[];
}

/**
 * 相机外参
 */
export interface CameraExtrinsics {
  /** 父坐标系 ID */
  parentFrameId: string;

  /** 相对于父坐标系的变换 */
  transform: Transform;
}

/**
 * 相机视图配置
 */
export interface CameraView {
  /** 唯一标识符 */
  id: string;

  /** 显示名称 */
  name: string;

  /** 内参 */
  intrinsics: CameraIntrinsics;

  /** 外参 */
  extrinsics: CameraExtrinsics;

  /** 关联的图像流 ID */
  imageStreamId?: string;

  /** 是否显示视锥体 */
  showFrustum: boolean;

  /** 视锥体颜色 */
  frustumColor: string;

  /** 视锥体显示深度 (米) */
  frustumDepth: number;

  /** 视锥体透明度 */
  frustumOpacity?: number;

  /** 是否显示图像平面 */
  showImagePlane?: boolean;

  /** 图像平面距离 */
  imagePlaneDistance?: number;
}

/**
 * 相机视图状态
 */
export interface CameraViewState extends CameraView {
  /** 当前图像数据 */
  currentImage?: ImageData | string;

  /** 是否活跃 */
  isActive: boolean;
}

// ============================================================================
// Image Overlay Types
// ============================================================================

/**
 * 图像格式
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'raw';

/**
 * 混合模式
 */
export type BlendMode = 'normal' | 'multiply' | 'overlay' | 'screen' | 'add';

/**
 * 图像叠加配置
 */
export interface ImageOverlay {
  /** 目标相机 ID */
  cameraId: string;

  /** 图像数据 (base64 或 ArrayBuffer) */
  imageData: ArrayBuffer | string;

  /** 图像格式 */
  format: ImageFormat;

  /** 透明度 (0-1) */
  opacity: number;

  /** 混合模式 */
  blendMode: BlendMode;

  /** 图像宽度 (用于 raw 格式) */
  width?: number;

  /** 图像高度 (用于 raw 格式) */
  height?: number;

  /** 像素格式 (用于 raw 格式) */
  pixelFormat?: 'rgb' | 'rgba' | 'bgr' | 'bgra' | 'gray';
}

// ============================================================================
// Calibration Types
// ============================================================================

/**
 * 手眼标定类型
 */
export type HandEyeType = 'eye_in_hand' | 'eye_to_hand';

/**
 * 手眼标定结果
 */
export interface HandEyeCalibration {
  /** 唯一标识符 */
  id: string;

  /** 关联的机器人 ID */
  robotId: string;

  /** 关联的相机 ID */
  cameraId: string;

  /** 标定类型 */
  type: HandEyeType;

  /** 变换矩阵 (相机到末端/基座) */
  transform: Transform;

  /** 重投影误差 (像素) */
  reprojectionError?: number;

  /** 标定日期 */
  calibrationDate?: string;

  /** 标定方法 */
  method?: string;
}

/**
 * 标定可视化配置
 */
export interface CalibrationVisualization {
  /** 是否显示坐标系 */
  showFrames: boolean;

  /** 坐标系轴长度 */
  axisLength: number;

  /** 是否显示连接线 */
  showConnection: boolean;

  /** 连接线颜色 */
  connectionColor: string;

  /** 是否显示误差指示 */
  showError: boolean;
}

// ============================================================================
// 2D Marker Types
// ============================================================================

/**
 * 2D 标记类型
 */
export type MarkerType =
  | 'point'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'polygon'
  | 'text'
  | 'crosshair';

/**
 * 2D 标记
 */
export interface Marker2D {
  /** 唯一标识符 */
  id: string;

  /** 标记类型 */
  type: MarkerType;

  /** 目标相机 ID */
  cameraId: string;

  /** 位置 (像素坐标) */
  position: [number, number];

  /** 大小或点集 (取决于类型) */
  data: number[] | string;

  /** 颜色 */
  color: string;

  /** 线宽 */
  lineWidth?: number;

  /** 是否填充 */
  filled?: boolean;

  /** 填充颜色 */
  fillColor?: string;

  /** 标签文本 */
  label?: string;

  /** 字体大小 */
  fontSize?: number;
}

// ============================================================================
// ROI (Region of Interest) Types
// ============================================================================

/**
 * ROI 类型
 */
export type ROIType = 'rectangle' | 'circle' | 'polygon' | 'freeform';

/**
 * 2D ROI 定义
 */
export interface ROI2D {
  /** 唯一标识符 */
  id: string;

  /** ROI 类型 */
  type: ROIType;

  /** 目标相机 ID */
  cameraId: string;

  /** ROI 数据 (取决于类型) */
  data: number[];  // rect: [x,y,w,h], circle: [cx,cy,r], polygon: [x1,y1,x2,y2,...]

  /** 边框颜色 */
  strokeColor: string;

  /** 填充颜色 */
  fillColor?: string;

  /** 透明度 */
  opacity?: number;

  /** 标签 */
  label?: string;
}

/**
 * 3D ROI 定义 (用于点云裁剪)
 */
export interface ROI3D {
  /** 唯一标识符 */
  id: string;

  /** ROI 类型 */
  type: 'box' | 'sphere' | 'cylinder' | 'convexHull';

  /** ROI 参数 */
  params: {
    // box: min/max 点
    min?: Vector3;
    max?: Vector3;
    // sphere: 中心和半径
    center?: Vector3;
    radius?: number;
    // cylinder: 轴和半径
    axis?: Vector3;
    height?: number;
    // convexHull: 点集
    points?: Vector3[];
  };

  /** 变换 */
  transform?: Transform;

  /** 是否反转 (排除 ROI 内的点) */
  inverted?: boolean;

  /** 可视化配置 */
  visualization?: {
    visible: boolean;
    color: string;
    opacity: number;
    wireframe: boolean;
  };
}

// ============================================================================
// Vision Manager Interface
// ============================================================================

/**
 * 视觉管理器接口
 */
export interface IVisionManager {
  // 点云管理
  loadPointCloud(data: PointCloudData, visualization?: PointCloudVisualization): Promise<string>;
  updatePointCloud(id: string, data: Partial<PointCloudData>): Promise<void>;
  setPointCloudVisualization(id: string, options: Partial<PointCloudVisualization>): void;
  removePointCloud(id: string): void;
  clearPointClouds(): void;
  getPointCloud(id: string): PointCloudState | undefined;
  getPointClouds(): PointCloudState[];

  // 相机视图管理
  addCameraView(camera: CameraView): void;
  removeCameraView(id: string): void;
  updateCameraView(id: string, updates: Partial<CameraView>): void;
  getCameraView(id: string): CameraViewState | undefined;
  getCameraViews(): CameraViewState[];

  // 图像叠加
  setImageOverlay(overlay: ImageOverlay): void;
  clearImageOverlay(cameraId: string): void;

  // 标定可视化
  showHandEyeCalibration(calibration: HandEyeCalibration, visualization?: CalibrationVisualization): void;
  hideHandEyeCalibration(id: string): void;

  // 2D 标记
  addMarker2D(marker: Marker2D): void;
  removeMarker2D(id: string): void;
  clearMarkers2D(cameraId?: string): void;

  // ROI 管理
  addROI2D(roi: ROI2D): void;
  removeROI2D(id: string): void;
  addROI3D(roi: ROI3D): void;
  removeROI3D(id: string): void;

  // 投影计算
  projectPointToImage(point: Vector3, cameraId: string): [number, number] | null;
  unprojectPointFromImage(pixel: [number, number], depth: number, cameraId: string): Vector3 | null;
}

// ============================================================================
// Vision Events
// ============================================================================

/**
 * 点云事件
 */
export interface PointCloudClickEvent {
  pointCloudId: string;
  pointIndex: number;
  position: Vector3;
  normal?: Vector3;
  color?: [number, number, number];
}

export interface PointCloudHoverEvent {
  pointCloudId: string;
  pointIndex: number;
  position: Vector3;
}

/**
 * 相机视图事件
 */
export interface CameraViewClickEvent {
  cameraId: string;
  pixel: [number, number];
  worldPosition?: Vector3;
}

/**
 * ROI 事件
 */
export interface ROISelectedEvent {
  roiId: string;
  type: '2d' | '3d';
}

export interface ROIModifiedEvent {
  roiId: string;
  type: '2d' | '3d';
  data: number[] | ROI3D['params'];
}
