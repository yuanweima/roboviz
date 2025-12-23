/**
 * RoboViz Frames Module
 *
 * 坐标系管理模块
 */

// Types
export type {
  FrameType,
  FrameVisualization,
  CoordinateFrame,
  ActiveFrames,
  FrameTreeNode,
  IFrameTree,
  FrameManagerConfig,
  FrameTreeVisualizationConfig,
  IFrameManager,
  FrameEventType,
  FrameEvent,
  EulerOrder,
  Rotation,
  ITransformUtils,
} from './types';

// Constants and Utilities
export {
  WORLD_FRAME_ID,
  DEFAULT_FRAME_VISUALIZATION,
  createWorldFrame,
} from './types';

// Frame Manager
export {
  FrameManager,
  createFrameManager,
  getFrameManager,
  resetFrameManager,
} from './frame-manager';

// Transform Utilities
export {
  transformUtils,
  // Vector operations
  addVectors,
  subtractVectors,
  scaleVector,
  dotProduct,
  crossProduct,
  vectorLength,
  normalizeVector,
  // Quaternion operations
  multiplyQuaternions,
  invertQuaternion,
  conjugateQuaternion,
  normalizeQuaternion,
  slerpQuaternion,
  rotateVectorByQuaternion,
  // Transform operations
  composeTransform,
  invertTransform,
  multiplyTransforms,
  interpolateTransforms,
  transformPoint,
  transformVector,
  transformPose,
  // Rotation conversions
  quaternionToEuler,
  eulerToQuaternion,
  quaternionToAxisAngle,
  axisAngleToQuaternion,
  quaternionToMatrix,
  matrixToQuaternion,
  transformToMatrix4,
  matrix4ToTransform,
  // Distance and angle
  distanceBetweenPoints,
  angleBetweenQuaternions,
} from './transform-utils';
