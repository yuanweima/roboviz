/**
 * Tool Components
 *
 * Standardized robot end-effector tool visualizations.
 */

// Types
export * from './types';

// Base components
export { BaseTool, withBaseTool, type BaseToolProps } from './BaseTool';

// Tool components
export { WeldingTorch, WELDING_TORCH_METADATA } from './WeldingTorch';
export { GrindingWheel, GRINDING_WHEEL_METADATA } from './GrindingWheel';
export {
  InspectionCamera,
  INSPECTION_CAMERA_METADATA,
  type InspectionCameraExtendedProps,
} from './InspectionCamera';

// Camera visualization
export {
  CameraVisualization,
  type CameraVisualizationProps,
  type CameraConfig,
  type CameraType,
  type FrustumStyle,
} from './CameraVisualization';

// TCP utilities
export {
  computeTcpFromMetadata,
  getTcpPosition,
  getTcpQuaternion,
  getDefaultTcpOffset,
  type TcpConfig,
} from './tcpUtils';
