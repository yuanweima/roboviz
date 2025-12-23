/**
 * RoboViz Vision Module
 *
 * 机器视觉集成模块
 */

// Types
export type {
  // Point Cloud
  PointCloudFormat,
  PointCloudData,
  PointCloudColorMode,
  ColorMap,
  PointCloudVisualization,
  PointCloudState,

  // Camera
  DistortionModel,
  CameraIntrinsics,
  CameraExtrinsics,
  CameraView,
  CameraViewState,

  // Image
  ImageFormat,
  BlendMode,
  ImageOverlay,

  // Calibration
  HandEyeType,
  HandEyeCalibration,
  CalibrationVisualization,

  // Markers
  MarkerType,
  Marker2D,

  // ROI
  ROIType,
  ROI2D,
  ROI3D,

  // Manager
  IVisionManager,

  // Events
  PointCloudClickEvent,
  PointCloudHoverEvent,
  CameraViewClickEvent,
  ROISelectedEvent,
  ROIModifiedEvent,
} from './types';

// Vision Manager
export {
  VisionManager,
  createVisionManager,
  getVisionManager,
  resetVisionManager,
  type VisionEventType,
  type VisionEvent,
} from './vision-manager';
