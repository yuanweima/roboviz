/**
 * @aspect/roboviz-sdk
 * 
 * TypeScript SDK for remote control of RoboViz
 */

export { RoboVizClient } from './client';
export type { RoboVizClientOptions } from './client';

// Transport utilities
export { createWebSocketTransport } from './transport/websocket';
export { createPostMessageTransport } from './transport/postmessage';

// Types
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
} from './types';
