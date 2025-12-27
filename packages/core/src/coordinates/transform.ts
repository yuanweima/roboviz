/**
 * Coordinate Transform Utilities
 *
 * Provides conversion between Z-up (robotics) and Y-up (Three.js) coordinate systems.
 *
 * Z-up (robotics):     Y-up (Three.js):
 *       Z                    Y
 *       |                    |
 *       |                    |
 *       +--- Y               +--- X
 *      /                    /
 *     X                    Z
 *
 * Transformation:
 *   Y-up.x = Z-up.x
 *   Y-up.y = Z-up.z
 *   Y-up.z = -Z-up.y
 */

import * as THREE from 'three';
import type {
  Position3D,
  Quaternion,
  Pose3D,
  EulerAngles,
  Position3DYUp,
  QuaternionYUp,
  Pose3DYUp,
  TCPOffset,
} from './types';
import type {
  Vector3 as Vector3Obj,
  Quaternion as QuaternionObj,
  Pose as PoseObj,
} from '../types';

/**
 * Rotation matrix for Z-up to Y-up conversion
 * This is a 90-degree rotation around the X-axis
 */
const Z_UP_TO_Y_UP_QUAT = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  -Math.PI / 2
);

/**
 * Inverse rotation for Y-up to Z-up conversion
 */
const Y_UP_TO_Z_UP_QUAT = Z_UP_TO_Y_UP_QUAT.clone().invert();

/**
 * Coordinate Transform utilities
 */
export const CoordinateTransform = {
  /**
   * Convert position from Z-up to Y-up (for Three.js rendering)
   */
  positionToYUp(pos: Position3D): Position3DYUp {
    const [x, y, z] = pos;
    return [x, z, -y];
  },

  /**
   * Convert position from Y-up to Z-up (from Three.js to robotics)
   */
  positionToZUp(pos: Position3DYUp): Position3D {
    const [x, y, z] = pos;
    return [x, -z, y];
  },

  /**
   * Convert quaternion from Z-up to Y-up
   * Applies coordinate system rotation to the quaternion
   */
  quaternionToYUp(quat: Quaternion): QuaternionYUp {
    const q = new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
    // Transform the orientation to Y-up coordinate system
    q.premultiply(Z_UP_TO_Y_UP_QUAT);
    q.multiply(Y_UP_TO_Z_UP_QUAT);
    return [q.x, q.y, q.z, q.w];
  },

  /**
   * Convert quaternion from Y-up to Z-up
   */
  quaternionToZUp(quat: QuaternionYUp): Quaternion {
    const q = new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
    // Transform the orientation to Z-up coordinate system
    q.premultiply(Y_UP_TO_Z_UP_QUAT);
    q.multiply(Z_UP_TO_Y_UP_QUAT);
    return [q.x, q.y, q.z, q.w];
  },

  /**
   * Convert full pose from Z-up to Y-up
   */
  poseToYUp(pose: Pose3D): Pose3DYUp {
    return {
      position: this.positionToYUp(pose.position),
      quaternion: this.quaternionToYUp(pose.quaternion),
    };
  },

  /**
   * Convert full pose from Y-up to Z-up
   */
  poseToZUp(pose: Pose3DYUp): Pose3D {
    return {
      position: this.positionToZUp(pose.position),
      quaternion: this.quaternionToZUp(pose.quaternion),
    };
  },

  /**
   * Convert Euler angles from Z-up to Y-up
   * Input: ZYX rotation order (robotics)
   * Output: XYZ rotation order (Three.js default)
   */
  eulerToYUp(euler: EulerAngles): [number, number, number] {
    const [rx, ry, rz] = euler;
    // Create euler in Z-up space
    const e = new THREE.Euler(rx, ry, rz, 'ZYX');
    // Convert to quaternion
    const q = new THREE.Quaternion().setFromEuler(e);
    // Apply coordinate transform
    q.premultiply(Z_UP_TO_Y_UP_QUAT);
    q.multiply(Y_UP_TO_Z_UP_QUAT);
    // Convert back to euler in Y-up space
    const eOut = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    return [eOut.x, eOut.y, eOut.z];
  },

  /**
   * Convert Euler angles from Y-up to Z-up
   */
  eulerToZUp(euler: [number, number, number]): EulerAngles {
    const [rx, ry, rz] = euler;
    const e = new THREE.Euler(rx, ry, rz, 'XYZ');
    const q = new THREE.Quaternion().setFromEuler(e);
    q.premultiply(Y_UP_TO_Z_UP_QUAT);
    q.multiply(Z_UP_TO_Y_UP_QUAT);
    const eOut = new THREE.Euler().setFromQuaternion(q, 'ZYX');
    return [eOut.x, eOut.y, eOut.z];
  },

  /**
   * Convert TCP offset from Z-up to Y-up
   */
  tcpToYUp(tcp: TCPOffset): { position: Position3DYUp; quaternion: QuaternionYUp } {
    return {
      position: this.positionToYUp(tcp.position),
      quaternion: this.quaternionToYUp(tcp.quaternion),
    };
  },

  /**
   * Convert TCP offset from Y-up to Z-up
   */
  tcpToZUp(tcp: { position: Position3DYUp; quaternion: QuaternionYUp }): TCPOffset {
    return {
      position: this.positionToZUp(tcp.position),
      quaternion: this.quaternionToZUp(tcp.quaternion),
    };
  },

  /**
   * Create a THREE.Vector3 from Z-up position
   */
  toVector3(pos: Position3D): THREE.Vector3 {
    const yUp = this.positionToYUp(pos);
    return new THREE.Vector3(yUp[0], yUp[1], yUp[2]);
  },

  /**
   * Create a Position3D from THREE.Vector3 (assumes Y-up input)
   */
  fromVector3(vec: THREE.Vector3): Position3D {
    return this.positionToZUp([vec.x, vec.y, vec.z]);
  },

  /**
   * Create a THREE.Quaternion from Z-up quaternion
   */
  toQuaternion(quat: Quaternion): THREE.Quaternion {
    const yUp = this.quaternionToYUp(quat);
    return new THREE.Quaternion(yUp[0], yUp[1], yUp[2], yUp[3]);
  },

  /**
   * Create a Quaternion from THREE.Quaternion (assumes Y-up input)
   */
  fromQuaternion(quat: THREE.Quaternion): Quaternion {
    return this.quaternionToZUp([quat.x, quat.y, quat.z, quat.w]);
  },

  /**
   * Create a THREE.Matrix4 from Z-up pose
   */
  toMatrix4(pose: Pose3D): THREE.Matrix4 {
    const yUp = this.poseToYUp(pose);
    const mat = new THREE.Matrix4();
    mat.compose(
      new THREE.Vector3(yUp.position[0], yUp.position[1], yUp.position[2]),
      new THREE.Quaternion(yUp.quaternion[0], yUp.quaternion[1], yUp.quaternion[2], yUp.quaternion[3]),
      new THREE.Vector3(1, 1, 1)
    );
    return mat;
  },

  /**
   * Create a Pose3D from THREE.Matrix4 (assumes Y-up input)
   */
  fromMatrix4(mat: THREE.Matrix4): Pose3D {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    mat.decompose(position, quaternion, scale);
    return {
      position: this.positionToZUp([position.x, position.y, position.z]),
      quaternion: this.quaternionToZUp([quaternion.x, quaternion.y, quaternion.z, quaternion.w]),
    };
  },

  /**
   * Identity quaternion in Z-up space
   */
  identityQuaternion(): Quaternion {
    return [0, 0, 0, 1];
  },

  /**
   * Zero position
   */
  zeroPosition(): Position3D {
    return [0, 0, 0];
  },

  /**
   * Identity pose (zero position, identity rotation)
   */
  identityPose(): Pose3D {
    return {
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
    };
  },

  // ============================================================================
  // Array <-> Object type conversions
  // ============================================================================

  /**
   * Convert array-based Position3D to object-based Vector3
   */
  positionToObject(pos: Position3D): Vector3Obj {
    return { x: pos[0], y: pos[1], z: pos[2] };
  },

  /**
   * Convert object-based Vector3 to array-based Position3D
   */
  positionFromObject(vec: Vector3Obj): Position3D {
    return [vec.x, vec.y, vec.z];
  },

  /**
   * Convert array-based Quaternion [x,y,z,w] to object-based Quaternion {x,y,z,w}
   */
  quaternionToObject(quat: Quaternion): QuaternionObj {
    return { x: quat[0], y: quat[1], z: quat[2], w: quat[3] };
  },

  /**
   * Convert object-based Quaternion {x,y,z,w} to array-based Quaternion [x,y,z,w]
   */
  quaternionFromObject(quat: QuaternionObj): Quaternion {
    return [quat.x, quat.y, quat.z, quat.w];
  },

  /**
   * Convert array-based Pose3D to object-based Pose
   */
  poseToObject(pose: Pose3D): PoseObj {
    return {
      position: this.positionToObject(pose.position),
      orientation: this.quaternionToObject(pose.quaternion),
    };
  },

  /**
   * Convert object-based Pose to array-based Pose3D
   */
  poseFromObject(pose: PoseObj): Pose3D {
    return {
      position: this.positionFromObject(pose.position),
      quaternion: this.quaternionFromObject(pose.orientation),
    };
  },

  /**
   * Convert Z-up Pose3D to Y-up object Pose (for passing to existing hooks)
   * Combines coordinate system conversion with type conversion
   */
  pose3DToYUpObject(pose: Pose3D): PoseObj {
    const yUpPose = this.poseToYUp(pose);
    return {
      position: { x: yUpPose.position[0], y: yUpPose.position[1], z: yUpPose.position[2] },
      orientation: { x: yUpPose.quaternion[0], y: yUpPose.quaternion[1], z: yUpPose.quaternion[2], w: yUpPose.quaternion[3] },
    };
  },

  /**
   * Convert Y-up object Pose to Z-up Pose3D (for receiving from existing hooks)
   * Combines coordinate system conversion with type conversion
   */
  yUpObjectToPose3D(pose: PoseObj): Pose3D {
    const yUpPose: Pose3DYUp = {
      position: [pose.position.x, pose.position.y, pose.position.z],
      quaternion: [pose.orientation.x, pose.orientation.y, pose.orientation.z, pose.orientation.w],
    };
    return this.poseToZUp(yUpPose);
  },
};

export default CoordinateTransform;
