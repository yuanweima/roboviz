/**
 * Core type definitions for RoboViz
 */

// Basic geometric types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Tuple type for convenience (e.g., [x, y, z])
export type Vector3Tuple = [number, number, number];

// Union type that accepts both object and tuple format
export type Vector3Like = Vector3 | Vector3Tuple;

// Helper to convert Vector3Like to Vector3
export function toVector3(v: Vector3Like): Vector3 {
  if (Array.isArray(v)) {
    return { x: v[0], y: v[1], z: v[2] };
  }
  return v;
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

// Helper functions for creating geometric types
export function vec3(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

export function quat(w: number, x: number, y: number, z: number): Quaternion {
  return { w, x, y, z };
}

export function identityQuaternion(): Quaternion {
  return { w: 1, x: 0, y: 0, z: 0 };
}

export function identityTransform(): Transform {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { w: 1, x: 0, y: 0, z: 0 },
  };
}

// Robot types
export interface RobotOptions {
  id?: string;
  transform?: Transform;
  showAxes?: boolean;
  showJoints?: boolean;
  showEndEffector?: boolean;
  showCollisionGeometry?: boolean;
  opacity?: number;
  color?: string | null;
}

export interface RobotInfo {
  id: string;
  dof: number;
  jointNames: string[];
  jointLimits: [number, number][];
}

export interface RobotState {
  id: string;
  urdf: string;
  transform: Transform;
  jointAngles: number[];
  options: RobotOptions;
  info?: RobotInfo;
}

// Trajectory types
export interface TrajectoryData {
  duration: number;
  times: number[];
  positions: number[][];
  velocities?: number[][];
  accelerations?: number[][];
}

export interface TrajectoryState {
  id: string;
  robotId: string;
  data: TrajectoryData;
  visualization: TrajectoryVisualizationOptions;
}

export interface TrajectoryVisualizationOptions {
  showPath?: boolean;
  pathColor?: string;
  pathWidth?: number;
  showVelocityVectors?: boolean;
  showAccelerationIndicator?: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  loop: boolean;
  activeTrajectoryId: string | null;
}

export interface PlaybackOptions {
  speed?: number;
  loop?: boolean;
  startTime?: number;
}

// Waypoint types
export interface WaypointData {
  id: string;
  robotId: string;
  jointAngles: number[];
  tcpPose?: Pose;
  label?: string;
  color?: string;
}

// Obstacle types
export type PrimitiveShape = 'box' | 'sphere' | 'cylinder';

export interface PrimitiveParams {
  shape: PrimitiveShape;
  dimensions: Vector3;
}

export interface PrimitiveObstacle {
  id: string;
  type: 'primitive';
  primitive: PrimitiveParams;
  transform: Transform;
  color?: string;
  opacity?: number;
}

export interface UrdfObstacle {
  id: string;
  type: 'urdf';
  urdf: string;
  transform: Transform;
}

export type ObstacleData = PrimitiveObstacle | UrdfObstacle;

// Scene types
export interface GridOptions {
  enabled: boolean;
  size: number;
  divisions: number;
  color: string;
}

export interface LightingOptions {
  ambient: { intensity: number; color: string };
  directional: { intensity: number; position: Vector3 };
}

export interface SceneConfig {
  background: string;
  grid: GridOptions;
  lighting: LightingOptions;
}

// Camera types
export interface CameraState {
  position: Vector3Like;
  target?: Vector3Like;
  fov?: number;
}

export interface OrbitControlsOptions {
  enabled: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
  autoRotate: boolean;
}

// Event types
export interface RobotClickEvent {
  robotId: string;
  linkName: string;
  position: Vector3;
}

export interface JointChangeEvent {
  robotId: string;
  angles: number[];
  source: 'user' | 'playback' | 'api';
}

export interface TrajectoryProgressEvent {
  trajectoryId: string;
  time: number;
  progress: number;
}

export interface TrajectoryCompletedEvent {
  trajectoryId: string;
}

export interface WaypointSelectEvent {
  waypointId: string;
}

export interface WorkpointCreateEvent {
  position: Vector3;
  normal: Vector3;
  objectId: string;
}

export interface CameraChangeEvent {
  position: Vector3;
  target: Vector3;
  fov: number;
}

// Bridge types
export interface BridgeHandler {
  (params: Record<string, unknown>): Promise<unknown>;
}

export interface BridgeHandlers {
  'ik.solve'?: BridgeHandler;
  'fk.solve'?: BridgeHandler;
  'trajectory.generate'?: BridgeHandler;
  'collision.check'?: BridgeHandler;
  'path.plan'?: BridgeHandler;
  [key: string]: BridgeHandler | undefined;
}

export interface BridgeConfig {
  transport: 'direct' | 'postmessage' | 'websocket' | 'tauri' | 'electron';
  handlers?: BridgeHandlers;
  timeout?: number;
}
