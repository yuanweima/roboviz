/**
 * Type definitions for RoboViz Viewer
 */

// Basic geometric types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type Vector3Tuple = [number, number, number];
export type Vector3Like = Vector3 | Vector3Tuple;

export function toVector3(v: Vector3Like): Vector3 {
  if (Array.isArray(v)) {
    return { x: v[0], y: v[1], z: v[2] };
  }
  return v;
}

export function toTuple(v: Vector3Like): Vector3Tuple {
  if (Array.isArray(v)) {
    return v;
  }
  return [v.x, v.y, v.z];
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

// Mesh data map: filename -> base64 encoded content
export type MeshDataMap = Record<string, string>;

// Robot types
export interface RobotState {
  id: string;
  /** URL path to URDF file (use this OR urdfContent) */
  urdfPath?: string;
  /** URDF XML content as string (use this OR urdfPath) */
  urdfContent?: string;
  /** Base64 encoded mesh data (required when using urdfContent) */
  meshData?: MeshDataMap;
  position: Vector3Tuple;
  joints: number[];
  color?: string;
  opacity?: number;
  showAxes?: boolean;
  visible?: boolean;
  /** TCP (end effector) pose - updated by Robot component during rendering */
  tcpPose?: Pose;
}

// Trajectory types
export interface TrajectoryData {
  times: number[];
  positions: number[][];
  velocities?: number[][];
}

export interface TrajectoryState {
  id: string;
  robotId: string;
  data: TrajectoryData;
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  loop: boolean;
}

// Obstacle types
export type PrimitiveShape = 'box' | 'sphere' | 'cylinder';

export interface ObstacleState {
  id: string;
  shape: PrimitiveShape;
  dimensions: Vector3Tuple;
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
  color?: string;
  opacity?: number;
}

// Safety Zone types
export interface SafetyZoneState {
  id: string;
  position: Vector3Tuple;
  radius: number;
  warningRadius: number;
  dangerRadius: number;
}

// Waypoint types
export interface WaypointState {
  id: string;
  position: Vector3Tuple;
  label?: string;
  color?: string;
}

// Scene configuration
export interface SceneConfig {
  background: string;
  grid: {
    enabled: boolean;
    size: number;
    divisions: number;
    color: string;
  };
  // Visual effects
  shadows?: boolean;
  groundPlane?: boolean;
  groundColor?: string;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'studio' | 'sunset' | 'warehouse';
}

// Camera configuration
export interface CameraConfig {
  position: Vector3Tuple;
  target?: Vector3Tuple;
  fov?: number;
}

// Collision types
export type CollisionGeometryType = 'box' | 'sphere' | 'cylinder' | 'capsule';
export type SafetyLevel = 'info' | 'warning' | 'danger' | 'stop';

export interface CollisionGeometryState {
  id: string;
  type: CollisionGeometryType;
  params: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
  };
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
  enabled: boolean;
  associatedObjectType?: 'robot' | 'obstacle' | 'geometry';
}

export interface CollisionPair {
  objectA: { type: string; id: string };
  objectB: { type: string; id: string };
  contactPoint?: Vector3;
  penetrationDepth?: number;
}

export interface CollisionResult {
  hasCollision: boolean;
  pairs: CollisionPair[];
  timestamp: number;
}

export interface CollisionVisualizationConfig {
  showCollisionGeometry: boolean;
  collisionGeometryOpacity: number;
  collisionGeometryColor: string;
  highlightCollisions: boolean;
  collisionHighlightColor: string;
  collisionHighlightAnimation: 'none' | 'pulse' | 'flash';
  showContactPoints: boolean;
  contactPointSize: number;
  contactPointColor: string;
  showSafetyZones: boolean;
  safetyLevelColors: Record<SafetyLevel, string>;
}

export const DEFAULT_COLLISION_VISUALIZATION: CollisionVisualizationConfig = {
  showCollisionGeometry: false,
  collisionGeometryOpacity: 0.3,
  collisionGeometryColor: '#00ffff',
  highlightCollisions: true,
  collisionHighlightColor: '#ff0000',
  collisionHighlightAnimation: 'pulse',
  showContactPoints: true,
  contactPointSize: 0.02,
  contactPointColor: '#ffff00',
  showSafetyZones: true,
  safetyLevelColors: {
    info: '#00bfff',
    warning: '#ffa500',
    danger: '#ff4500',
    stop: '#ff0000',
  },
};

// Coordinate Frame types
export type FrameType =
  | 'world'
  | 'base'
  | 'flange'
  | 'tool'
  | 'user'
  | 'workpiece'
  | 'sensor'
  | 'camera'
  | 'fixture'
  | 'custom';

export interface FrameVisualization {
  visible: boolean;
  axisLength: number;
  axisThickness: number;
  showLabel: boolean;
  labelSize: number;
  labelOffset?: Vector3;
  colors: {
    x: string;
    y: string;
    z: string;
  };
  showPlanes?: boolean;
  planeOpacity?: number;
  planeSize?: number;
}

export interface CoordinateFrameState {
  id: string;
  name: string;
  type: FrameType;
  parentFrameId: string | null;
  position: Vector3Tuple;
  rotation: [number, number, number, number]; // quaternion [w, x, y, z]
  robotId?: string;
  visualization: FrameVisualization;
  editable?: boolean;
}

export const DEFAULT_FRAME_VISUALIZATION: FrameVisualization = {
  visible: true,
  axisLength: 0.1,
  axisThickness: 2,
  showLabel: true,
  labelSize: 12,
  colors: {
    x: '#ff0000',
    y: '#00ff00',
    z: '#0000ff',
  },
};

export interface FrameTreeVisualizationConfig {
  visible: boolean;
  showConnections: boolean;
  connectionColor: string;
  connectionStyle: 'solid' | 'dashed';
  highlightedFrame?: string;
  highlightColor?: string;
}

// Point Cloud types
export type PointCloudColorMode =
  | 'rgb'        // Use point cloud's RGB color
  | 'intensity'  // Color by intensity
  | 'height'     // Color by height (Z)
  | 'uniform'    // Single uniform color
  | 'distance';  // Color by distance from origin

export type ColorMap = 'jet' | 'rainbow' | 'grayscale' | 'hot' | 'cool' | 'viridis';

export interface PointCloudData {
  id: string;
  /** Interleaved point positions [x,y,z, x,y,z, ...] */
  points: number[];
  /** Point count */
  pointCount: number;
  /** Optional RGB colors (0-255) */
  colors?: number[];
  /** Optional intensity values */
  intensities?: number[];
  /** Optional normals [nx,ny,nz, ...] */
  normals?: number[];
  /** Bounding box */
  bounds?: {
    min: Vector3;
    max: Vector3;
  };
  /** Frame ID this point cloud is relative to */
  frameId?: string;
  /** Timestamp (microseconds) */
  timestamp?: number;
}

export interface PointCloudVisualization {
  visible: boolean;
  pointSize: number;
  colorMode: PointCloudColorMode;
  uniformColor?: string;
  colorMap?: ColorMap;
  heightRange?: [number, number];
  intensityRange?: [number, number];
  opacity: number;
  showBounds?: boolean;
  boundsColor?: string;
  maxPoints?: number;
  decimationFactor?: number;
}

export interface PointCloudState {
  data: PointCloudData;
  visualization: PointCloudVisualization;
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
}

export const DEFAULT_POINT_CLOUD_VISUALIZATION: PointCloudVisualization = {
  visible: true,
  pointSize: 0.01,
  colorMode: 'uniform',
  uniformColor: '#ffffff',
  colorMap: 'jet',
  opacity: 1.0,
  showBounds: false,
  boundsColor: '#ffff00',
  decimationFactor: 1,
};
