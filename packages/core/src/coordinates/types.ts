/**
 * Coordinate System Types
 *
 * This module defines Z-up coordinate types for the robotics domain.
 * All public APIs use Z-up convention (robotics standard).
 * Internal Three.js rendering uses Y-up, with conversions handled automatically.
 */

/**
 * 3D position in Z-up coordinate system (robotics standard)
 * - X: forward/back
 * - Y: left/right
 * - Z: up/down (positive = up)
 */
export type Position3D = [x: number, y: number, z: number];

/**
 * Quaternion representation [x, y, z, w]
 * Uses Z-up convention for rotation semantics
 */
export type Quaternion = [x: number, y: number, z: number, w: number];

/**
 * Euler angles in radians [rx, ry, rz]
 * Uses ZYX rotation order (common in robotics)
 */
export type EulerAngles = [rx: number, ry: number, rz: number];

/**
 * Complete 6-DOF pose in Z-up coordinate system
 */
export interface Pose3D {
  position: Position3D;
  quaternion: Quaternion;
}

/**
 * Pose with optional Euler angle representation
 */
export interface Pose3DWithEuler extends Pose3D {
  euler?: EulerAngles;
}

/**
 * Joint configuration for a robot
 * Array of joint angles in radians
 */
export type JointAngles = number[];

/**
 * Tool Center Point (TCP) definition
 * Offset from robot flange to tool tip in Z-up coordinates
 */
export interface TCPOffset {
  /** Position offset from flange [x, y, z] in meters */
  position: Position3D;
  /** Orientation offset as quaternion */
  quaternion: Quaternion;
}

/**
 * Robot base pose in Z-up world coordinates
 */
export interface RobotBasePose extends Pose3D {
  /** Optional scale factor (default: 1) */
  scale?: number;
}

/**
 * Coordinate system identifier
 */
export type CoordinateSystem = 'z-up' | 'y-up';

/**
 * Internal Y-up position for Three.js rendering
 * @internal
 */
export type Position3DYUp = [x: number, y: number, z: number];

/**
 * Internal Y-up quaternion for Three.js rendering
 * @internal
 */
export type QuaternionYUp = [x: number, y: number, z: number, w: number];

/**
 * Internal Y-up pose for Three.js rendering
 * @internal
 */
export interface Pose3DYUp {
  position: Position3DYUp;
  quaternion: QuaternionYUp;
}
