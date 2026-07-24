/**
 * Coordinates Module
 *
 * This module provides Z-up coordinate types, transform utilities,
 * and kinematics hooks for the robotics domain.
 * All public APIs use Z-up convention.
 *
 * @example
 * ```tsx
 * import {
 *   Position3D,
 *   Pose3D,
 *   CoordinateTransform,
 *   useRobotKinematics,
 * } from '@yuanweima/roboviz-core';
 *
 * // Define a pose in Z-up coordinates
 * const pose: Pose3D = {
 *   position: [1.0, 0.5, 0.8],  // X=1m, Y=0.5m, Z=0.8m up
 *   quaternion: [0, 0, 0, 1],
 * };
 *
 * // Convert to Three.js Y-up for rendering
 * const yUpPose = CoordinateTransform.poseToYUp(pose);
 *
 * // Use kinematics with Z-up API
 * function RobotController({ urdfContent }) {
 *   const { fk, ik, attachTcp } = useRobotKinematics({
 *     robotId: 'robot-1',
 *     urdfContent,
 *   });
 *
 *   const pose = fk([0, 0, 0, 0, 0, 0]);
 *   console.log('Height:', pose?.position[2]); // Z is up
 * }
 * ```
 */

export * from './types';
export { CoordinateTransform, default as coordinateTransform } from './transform';
export {
  useRobotKinematics,
  type UseRobotKinematicsOptions,
  type UseRobotKinematicsReturn,
  type FkResult3D,
  type FkChainResult3D,
  type IkResult3D,
  type MultiIkResult3D,
} from './useRobotKinematics';
