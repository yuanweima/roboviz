/**
 * @aspect/roboviz-react
 * 
 * React bindings for RoboViz
 */

export { RoboViz, type RoboVizProps } from './RoboViz';
export { useRoboViz } from './useRoboViz';
export { useRoboVizBridge, type RoboVizBridge } from './useRoboVizBridge';
export { RoboVizContext, RoboVizProvider } from './context';

// Re-export core types
export type {
  Vector3,
  Quaternion,
  Transform,
  Pose,
  RobotOptions,
  RobotInfo,
  TrajectoryData,
  PlaybackOptions,
  WaypointData,
  ObstacleData,
  SceneConfig,
  RobotClickEvent,
  JointChangeEvent,
  TrajectoryProgressEvent,
  WaypointSelectEvent,
  CameraChangeEvent,
  BridgeConfig,
  BridgeHandlers,
} from '@aspect/roboviz-core';
