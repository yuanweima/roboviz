/**
 * RoboViz SDK Types (Placeholder)
 *
 * TODO: Re-export types from core or define SDK-specific types
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
}

export interface Pose {
  position: Vector3;
  orientation: Quaternion;
}

export interface RobotOptions {
  id: string;
  urdfUrl: string;
}

export interface RobotInfo {
  id: string;
  name: string;
}

export interface TrajectoryData {
  id: string;
  points: Pose[];
}

export interface PlaybackOptions {
  speed?: number;
  loop?: boolean;
}

export interface WaypointData {
  id: string;
  pose: Pose;
}

export interface ObstacleData {
  id: string;
  type: string;
}
