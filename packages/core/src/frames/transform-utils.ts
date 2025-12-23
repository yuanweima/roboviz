/**
 * RoboViz Transform Utilities
 *
 * 变换计算工具函数
 */

import type { Vector3, Quaternion, Transform, Pose } from '../types';
import type { EulerOrder, ITransformUtils } from './types';

// ============================================================================
// Vector Operations
// ============================================================================

/**
 * 向量加法
 */
export function addVectors(v1: Vector3, v2: Vector3): Vector3 {
  return {
    x: v1.x + v2.x,
    y: v1.y + v2.y,
    z: v1.z + v2.z,
  };
}

/**
 * 向量减法
 */
export function subtractVectors(v1: Vector3, v2: Vector3): Vector3 {
  return {
    x: v1.x - v2.x,
    y: v1.y - v2.y,
    z: v1.z - v2.z,
  };
}

/**
 * 向量数乘
 */
export function scaleVector(v: Vector3, s: number): Vector3 {
  return {
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
  };
}

/**
 * 向量点积
 */
export function dotProduct(v1: Vector3, v2: Vector3): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

/**
 * 向量叉积
 */
export function crossProduct(v1: Vector3, v2: Vector3): Vector3 {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}

/**
 * 向量长度
 */
export function vectorLength(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * 向量归一化
 */
export function normalizeVector(v: Vector3): Vector3 {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return scaleVector(v, 1 / len);
}

// ============================================================================
// Quaternion Operations
// ============================================================================

/**
 * 四元数乘法
 */
export function multiplyQuaternions(q1: Quaternion, q2: Quaternion): Quaternion {
  return {
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
  };
}

/**
 * 四元数求逆
 */
export function invertQuaternion(q: Quaternion): Quaternion {
  const normSq = q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z;
  if (normSq === 0) return { x: 0, y: 0, z: 0, w: 1 };
  return {
    w: q.w / normSq,
    x: -q.x / normSq,
    y: -q.y / normSq,
    z: -q.z / normSq,
  };
}

/**
 * 四元数共轭
 */
export function conjugateQuaternion(q: Quaternion): Quaternion {
  return {
    w: q.w,
    x: -q.x,
    y: -q.y,
    z: -q.z,
  };
}

/**
 * 四元数归一化
 */
export function normalizeQuaternion(q: Quaternion): Quaternion {
  const len = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  if (len === 0) return { x: 0, y: 0, z: 0, w: 1 };
  return {
    w: q.w / len,
    x: q.x / len,
    y: q.y / len,
    z: q.z / len,
  };
}

/**
 * 四元数球面线性插值 (slerp)
 */
export function slerpQuaternion(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
  let cosHalfTheta = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;

  let q2Adjusted = { ...q2 };
  if (cosHalfTheta < 0) {
    q2Adjusted = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta >= 1.0) {
    return { ...q1 };
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

  if (Math.abs(sinHalfTheta) < 0.001) {
    return {
      w: q1.w * 0.5 + q2Adjusted.w * 0.5,
      x: q1.x * 0.5 + q2Adjusted.x * 0.5,
      y: q1.y * 0.5 + q2Adjusted.y * 0.5,
      z: q1.z * 0.5 + q2Adjusted.z * 0.5,
    };
  }

  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

  return normalizeQuaternion({
    w: q1.w * ratioA + q2Adjusted.w * ratioB,
    x: q1.x * ratioA + q2Adjusted.x * ratioB,
    y: q1.y * ratioA + q2Adjusted.y * ratioB,
    z: q1.z * ratioA + q2Adjusted.z * ratioB,
  });
}

/**
 * 用四元数旋转向量
 */
export function rotateVectorByQuaternion(v: Vector3, q: Quaternion): Vector3 {
  // q * v * q^-1
  const vq: Quaternion = { w: 0, x: v.x, y: v.y, z: v.z };
  const qConj = conjugateQuaternion(q);
  const result = multiplyQuaternions(multiplyQuaternions(q, vq), qConj);
  return { x: result.x, y: result.y, z: result.z };
}

// ============================================================================
// Transform Operations
// ============================================================================

/**
 * 组合变换
 */
export function composeTransform(position: Vector3, orientation: Quaternion): Transform {
  return { position, rotation: orientation };
}

/**
 * 变换求逆
 */
export function invertTransform(t: Transform): Transform {
  const invRotation = invertQuaternion(t.rotation);
  const invPosition = rotateVectorByQuaternion(scaleVector(t.position, -1), invRotation);
  return {
    position: invPosition,
    rotation: invRotation,
  };
}

/**
 * 变换乘法 (t1 * t2)
 * 先应用 t2，再应用 t1
 */
export function multiplyTransforms(t1: Transform, t2: Transform): Transform {
  const rotation = multiplyQuaternions(t1.rotation, t2.rotation);
  const position = addVectors(t1.position, rotateVectorByQuaternion(t2.position, t1.rotation));
  return { position, rotation };
}

/**
 * 变换插值
 */
export function interpolateTransforms(t1: Transform, t2: Transform, t: number): Transform {
  const position: Vector3 = {
    x: t1.position.x + (t2.position.x - t1.position.x) * t,
    y: t1.position.y + (t2.position.y - t1.position.y) * t,
    z: t1.position.z + (t2.position.z - t1.position.z) * t,
  };
  const rotation = slerpQuaternion(t1.rotation, t2.rotation, t);
  return { position, rotation };
}

/**
 * 用变换转换点
 */
export function transformPoint(point: Vector3, transform: Transform): Vector3 {
  const rotated = rotateVectorByQuaternion(point, transform.rotation);
  return addVectors(rotated, transform.position);
}

/**
 * 用变换转换向量 (只旋转，不平移)
 */
export function transformVector(vector: Vector3, transform: Transform): Vector3 {
  return rotateVectorByQuaternion(vector, transform.rotation);
}

/**
 * 用变换转换位姿
 */
export function transformPose(pose: Pose, transform: Transform): Pose {
  return {
    position: transformPoint(pose.position, transform),
    orientation: multiplyQuaternions(transform.rotation, pose.orientation),
  };
}

// ============================================================================
// Rotation Conversions
// ============================================================================

/**
 * 四元数转欧拉角
 */
export function quaternionToEuler(
  q: Quaternion,
  order: EulerOrder = 'XYZ'
): { x: number; y: number; z: number } {
  const { w, x, y, z } = q;

  // 计算旋转矩阵元素
  const m11 = 1 - 2 * (y * y + z * z);
  const m12 = 2 * (x * y - z * w);
  const m13 = 2 * (x * z + y * w);
  const m21 = 2 * (x * y + z * w);
  const m22 = 1 - 2 * (x * x + z * z);
  const m23 = 2 * (y * z - x * w);
  const m31 = 2 * (x * z - y * w);
  const m32 = 2 * (y * z + x * w);
  const m33 = 1 - 2 * (x * x + y * y);

  let ex = 0, ey = 0, ez = 0;

  switch (order) {
    case 'XYZ':
      ey = Math.asin(Math.max(-1, Math.min(1, m13)));
      if (Math.abs(m13) < 0.9999999) {
        ex = Math.atan2(-m23, m33);
        ez = Math.atan2(-m12, m11);
      } else {
        ex = Math.atan2(m32, m22);
        ez = 0;
      }
      break;
    case 'ZYX':
      ey = Math.asin(Math.max(-1, Math.min(1, -m31)));
      if (Math.abs(m31) < 0.9999999) {
        ex = Math.atan2(m32, m33);
        ez = Math.atan2(m21, m11);
      } else {
        ex = 0;
        ez = Math.atan2(-m12, m22);
      }
      break;
    // 其他顺序类似实现
    default:
      // 默认 XYZ
      ey = Math.asin(Math.max(-1, Math.min(1, m13)));
      ex = Math.atan2(-m23, m33);
      ez = Math.atan2(-m12, m11);
  }

  return { x: ex, y: ey, z: ez };
}

/**
 * 欧拉角转四元数
 */
export function eulerToQuaternion(
  euler: { x: number; y: number; z: number },
  order: EulerOrder = 'XYZ'
): Quaternion {
  const c1 = Math.cos(euler.x / 2);
  const c2 = Math.cos(euler.y / 2);
  const c3 = Math.cos(euler.z / 2);
  const s1 = Math.sin(euler.x / 2);
  const s2 = Math.sin(euler.y / 2);
  const s3 = Math.sin(euler.z / 2);

  let qw = 1, qx = 0, qy = 0, qz = 0;

  switch (order) {
    case 'XYZ':
      qw = c1 * c2 * c3 - s1 * s2 * s3;
      qx = s1 * c2 * c3 + c1 * s2 * s3;
      qy = c1 * s2 * c3 - s1 * c2 * s3;
      qz = c1 * c2 * s3 + s1 * s2 * c3;
      break;
    case 'ZYX':
      qw = c1 * c2 * c3 + s1 * s2 * s3;
      qx = s1 * c2 * c3 - c1 * s2 * s3;
      qy = c1 * s2 * c3 + s1 * c2 * s3;
      qz = c1 * c2 * s3 - s1 * s2 * c3;
      break;
    default:
      // 默认 XYZ
      qw = c1 * c2 * c3 - s1 * s2 * s3;
      qx = s1 * c2 * c3 + c1 * s2 * s3;
      qy = c1 * s2 * c3 - s1 * c2 * s3;
      qz = c1 * c2 * s3 + s1 * s2 * c3;
  }

  return normalizeQuaternion({ w: qw, x: qx, y: qy, z: qz });
}

/**
 * 四元数转轴角
 */
export function quaternionToAxisAngle(q: Quaternion): { axis: Vector3; angle: number } {
  const qn = normalizeQuaternion(q);
  const angle = 2 * Math.acos(Math.max(-1, Math.min(1, qn.w)));
  const s = Math.sqrt(1 - qn.w * qn.w);

  if (s < 0.001) {
    return { axis: { x: 1, y: 0, z: 0 }, angle: 0 };
  }

  return {
    axis: { x: qn.x / s, y: qn.y / s, z: qn.z / s },
    angle,
  };
}

/**
 * 轴角转四元数
 */
export function axisAngleToQuaternion(axis: Vector3, angle: number): Quaternion {
  const normalizedAxis = normalizeVector(axis);
  const halfAngle = angle / 2;
  const s = Math.sin(halfAngle);

  return {
    w: Math.cos(halfAngle),
    x: normalizedAxis.x * s,
    y: normalizedAxis.y * s,
    z: normalizedAxis.z * s,
  };
}

/**
 * 四元数转 3x3 旋转矩阵
 */
export function quaternionToMatrix(q: Quaternion): number[] {
  const { w, x, y, z } = normalizeQuaternion(q);

  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

/**
 * 3x3 旋转矩阵转四元数
 */
export function matrixToQuaternion(m: number[]): Quaternion {
  const trace = m[0] + m[4] + m[8];
  let w: number, x: number, y: number, z: number;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m[7] - m[5]) * s;
    y = (m[2] - m[6]) * s;
    z = (m[3] - m[1]) * s;
  } else if (m[0] > m[4] && m[0] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[4] - m[8]);
    w = (m[7] - m[5]) / s;
    x = 0.25 * s;
    y = (m[1] + m[3]) / s;
    z = (m[2] + m[6]) / s;
  } else if (m[4] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[4] - m[0] - m[8]);
    w = (m[2] - m[6]) / s;
    x = (m[1] + m[3]) / s;
    y = 0.25 * s;
    z = (m[5] + m[7]) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m[8] - m[0] - m[4]);
    w = (m[3] - m[1]) / s;
    x = (m[2] + m[6]) / s;
    y = (m[5] + m[7]) / s;
    z = 0.25 * s;
  }

  return normalizeQuaternion({ w, x, y, z });
}

/**
 * 变换转 4x4 矩阵
 */
export function transformToMatrix4(t: Transform): number[] {
  const r = quaternionToMatrix(t.rotation);
  return [
    r[0], r[1], r[2], t.position.x,
    r[3], r[4], r[5], t.position.y,
    r[6], r[7], r[8], t.position.z,
    0, 0, 0, 1,
  ];
}

/**
 * 4x4 矩阵转变换
 */
export function matrix4ToTransform(m: number[]): Transform {
  const rotation = matrixToQuaternion([
    m[0], m[1], m[2],
    m[4], m[5], m[6],
    m[8], m[9], m[10],
  ]);
  const position: Vector3 = { x: m[3], y: m[7], z: m[11] };
  return { position, rotation };
}

// ============================================================================
// Distance and Angle
// ============================================================================

/**
 * 两点间距离
 */
export function distanceBetweenPoints(p1: Vector3, p2: Vector3): number {
  return vectorLength(subtractVectors(p2, p1));
}

/**
 * 两个四元数之间的角度 (弧度)
 */
export function angleBetweenQuaternions(q1: Quaternion, q2: Quaternion): number {
  const dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;
  return 2 * Math.acos(Math.abs(Math.max(-1, Math.min(1, dot))));
}

// ============================================================================
// Transform Utils Object
// ============================================================================

/**
 * 变换工具对象
 */
export const transformUtils: ITransformUtils = {
  multiplyQuaternions,
  invertQuaternion,
  normalizeQuaternion,
  slerpQuaternion,
  composeTransform,
  invertTransform,
  multiplyTransforms,
  interpolateTransforms,
  transformPoint,
  transformVector,
  transformPose,
  quaternionToEuler,
  eulerToQuaternion,
  quaternionToAxisAngle,
  axisAngleToQuaternion,
  quaternionToMatrix,
  matrixToQuaternion,
  transformToMatrix4,
  matrix4ToTransform,
  distanceBetweenPoints,
  angleBetweenQuaternions,
};

export default transformUtils;
