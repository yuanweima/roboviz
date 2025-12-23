/**
 * JSON-RPC 2.0 Protocol Types
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

// Method names
export const Methods = {
  // Robot
  ROBOT_ADD: 'robot.add',
  ROBOT_REMOVE: 'robot.remove',
  ROBOT_SET_JOINTS: 'robot.setJoints',
  ROBOT_GET_JOINTS: 'robot.getJoints',
  ROBOT_GET_TCP_POSE: 'robot.getTcpPose',

  // Trajectory
  TRAJECTORY_ADD: 'trajectory.add',
  TRAJECTORY_PLAY: 'trajectory.play',
  TRAJECTORY_PAUSE: 'trajectory.pause',
  TRAJECTORY_STOP: 'trajectory.stop',
  TRAJECTORY_SEEK: 'trajectory.seek',

  // Obstacle
  OBSTACLE_ADD: 'obstacle.add',
  OBSTACLE_REMOVE: 'obstacle.remove',
  OBSTACLE_CLEAR: 'obstacle.clear',

  // Safety Zone
  SAFETY_ZONE_ADD: 'safetyZone.add',
  SAFETY_ZONE_REMOVE: 'safetyZone.remove',

  // Waypoint
  WAYPOINT_ADD: 'waypoint.add',
  WAYPOINT_REMOVE: 'waypoint.remove',
  WAYPOINT_CLEAR: 'waypoint.clear',

  // Camera
  CAMERA_SET: 'camera.set',
  CAMERA_RESET: 'camera.reset',

  // Scene
  SCENE_CLEAR: 'scene.clear',
  SCENE_SET_CONFIG: 'scene.setConfig',

  // Collision
  COLLISION_ADD_GEOMETRY: 'collision.addGeometry',
  COLLISION_REMOVE_GEOMETRY: 'collision.removeGeometry',
  COLLISION_CLEAR_GEOMETRIES: 'collision.clearGeometries',
  COLLISION_SET_CONFIG: 'collision.setConfig',
  COLLISION_ENABLE: 'collision.enable',
  COLLISION_CHECK: 'collision.check',
  COLLISION_GET_RESULT: 'collision.getResult',

  // Coordinate Frames
  FRAME_ADD: 'frame.add',
  FRAME_REMOVE: 'frame.remove',
  FRAME_UPDATE: 'frame.update',
  FRAME_CLEAR: 'frame.clear',
  FRAME_SET_CONFIG: 'frame.setConfig',
  FRAME_ENABLE: 'frame.enable',

  // Point Clouds
  POINTCLOUD_ADD: 'pointCloud.add',
  POINTCLOUD_UPDATE: 'pointCloud.update',
  POINTCLOUD_REMOVE: 'pointCloud.remove',
  POINTCLOUD_CLEAR: 'pointCloud.clear',
  POINTCLOUD_SET_VISUALIZATION: 'pointCloud.setVisualization',
  POINTCLOUD_ENABLE: 'pointCloud.enable',
} as const;

// Event names (Viewer -> SDK)
export const Events = {
  ROBOT_CLICKED: 'robot.clicked',
  ROBOT_JOINTS_CHANGED: 'robot.jointsChanged',
  ROBOT_TCP_MOVED: 'robot.tcpMoved',
  TRAJECTORY_ENDED: 'trajectory.ended',
  COLLISION_DETECTED: 'collision.detected',
  COLLISION_CLEARED: 'collision.cleared',
  SAFETY_ZONE_ENTERED: 'safetyZone.entered',
  SAFETY_ZONE_EXITED: 'safetyZone.exited',
  POINTCLOUD_CLICKED: 'pointCloud.clicked',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
} as const;
