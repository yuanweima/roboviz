/**
 * CapsuleTransformer
 *
 * Transforms robot capsule models from link-local coordinates to world coordinates
 * using link transformation matrices from forward kinematics.
 *
 * This is essential for collision checking during motion planning.
 */

import type {
  RobotCapsuleModel,
  WorldCapsule,
  Vector3Tuple,
} from './types';

// ============================================================================
// Matrix Utilities
// ============================================================================

/**
 * Transform a point by a 4x4 transformation matrix (column-major order)
 * Matrix layout: [m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33]
 */
function transformPoint(
  point: Vector3Tuple,
  matrix: Float64Array | Float32Array | number[],
  offset: number = 0
): Vector3Tuple {
  const x = point[0];
  const y = point[1];
  const z = point[2];

  // Column-major indexing
  const m00 = matrix[offset + 0];
  const m10 = matrix[offset + 1];
  const m20 = matrix[offset + 2];
  // m30 = matrix[offset + 3]; // Not used for point transform

  const m01 = matrix[offset + 4];
  const m11 = matrix[offset + 5];
  const m21 = matrix[offset + 6];
  // m31 = matrix[offset + 7];

  const m02 = matrix[offset + 8];
  const m12 = matrix[offset + 9];
  const m22 = matrix[offset + 10];
  // m32 = matrix[offset + 11];

  const m03 = matrix[offset + 12]; // Translation X
  const m13 = matrix[offset + 13]; // Translation Y
  const m23 = matrix[offset + 14]; // Translation Z
  // m33 = matrix[offset + 15]; // Should be 1 for affine transform

  return [
    m00 * x + m01 * y + m02 * z + m03,
    m10 * x + m11 * y + m12 * z + m13,
    m20 * x + m21 * y + m22 * z + m23,
  ];
}

// ============================================================================
// CapsuleTransformer
// ============================================================================

/**
 * Transforms robot capsules from link-local to world coordinates.
 *
 * Usage:
 * ```typescript
 * const transformer = new CapsuleTransformer(robotCapsuleModel);
 * const worldCapsules = transformer.transform(linkTransforms);
 * ```
 */
export class CapsuleTransformer {
  private readonly model: RobotCapsuleModel;

  constructor(model: RobotCapsuleModel) {
    this.model = model;
  }

  /**
   * Transform all capsules to world coordinates
   *
   * @param linkTransforms - Flat array of 4x4 transformation matrices (column-major)
   *                         from trajx-wasm's robot.getLinkTransforms() or batchForwardKinematics()
   *                         Format: [link0_mat4, link1_mat4, ..., linkN_mat4]
   *                         Each mat4 is 16 floats, total size: numLinks * 16
   * @returns Array of capsules in world coordinates
   */
  transform(linkTransforms: Float64Array | Float32Array | number[]): WorldCapsule[] {
    const worldCapsules: WorldCapsule[] = [];

    for (const capsule of this.model.capsules) {
      const linkIndex = capsule.linkIndex;
      const matrixOffset = linkIndex * 16;

      // Transform both endpoints
      const worldPoint1 = transformPoint(capsule.point1, linkTransforms, matrixOffset);
      const worldPoint2 = transformPoint(capsule.point2, linkTransforms, matrixOffset);

      worldCapsules.push({
        radius: capsule.radius,
        point1: worldPoint1,
        point2: worldPoint2,
        linkIndex,
      });
    }

    return worldCapsules;
  }

  /**
   * Get capsules for specific links only
   */
  transformLinks(
    linkTransforms: Float64Array | Float32Array | number[],
    linkIndices: number[]
  ): WorldCapsule[] {
    const worldCapsules: WorldCapsule[] = [];
    const linkSet = new Set(linkIndices);

    for (const capsule of this.model.capsules) {
      if (!linkSet.has(capsule.linkIndex)) continue;

      const matrixOffset = capsule.linkIndex * 16;
      const worldPoint1 = transformPoint(capsule.point1, linkTransforms, matrixOffset);
      const worldPoint2 = transformPoint(capsule.point2, linkTransforms, matrixOffset);

      worldCapsules.push({
        radius: capsule.radius,
        point1: worldPoint1,
        point2: worldPoint2,
        linkIndex: capsule.linkIndex,
      });
    }

    return worldCapsules;
  }

  /**
   * Get the robot capsule model
   */
  getModel(): RobotCapsuleModel {
    return this.model;
  }

  /**
   * Get self-collision pairs
   */
  getSelfCollisionPairs(): Array<[number, number]> {
    return this.model.selfCollisionPairs;
  }

  /**
   * Get links to ignore for environment collision
   */
  getIgnoredLinksForEnv(): number[] {
    return this.model.ignoredLinksForEnv;
  }
}

// ============================================================================
// Collision Geometry Functions
// ============================================================================

/**
 * Distance between a point and a line segment
 */
export function pointToSegmentDistance(
  point: Vector3Tuple,
  segStart: Vector3Tuple,
  segEnd: Vector3Tuple
): { distance: number; closestPoint: Vector3Tuple } {
  const dx = segEnd[0] - segStart[0];
  const dy = segEnd[1] - segStart[1];
  const dz = segEnd[2] - segStart[2];

  const lengthSq = dx * dx + dy * dy + dz * dz;

  if (lengthSq === 0) {
    // Degenerate segment (point)
    const distance = Math.sqrt(
      Math.pow(point[0] - segStart[0], 2) +
      Math.pow(point[1] - segStart[1], 2) +
      Math.pow(point[2] - segStart[2], 2)
    );
    return { distance, closestPoint: segStart };
  }

  // Project point onto line
  const t = Math.max(0, Math.min(1,
    ((point[0] - segStart[0]) * dx +
     (point[1] - segStart[1]) * dy +
     (point[2] - segStart[2]) * dz) / lengthSq
  ));

  const closestPoint: Vector3Tuple = [
    segStart[0] + t * dx,
    segStart[1] + t * dy,
    segStart[2] + t * dz,
  ];

  const distance = Math.sqrt(
    Math.pow(point[0] - closestPoint[0], 2) +
    Math.pow(point[1] - closestPoint[1], 2) +
    Math.pow(point[2] - closestPoint[2], 2)
  );

  return { distance, closestPoint };
}

/**
 * Distance between two line segments
 */
export function segmentToSegmentDistance(
  seg1Start: Vector3Tuple,
  seg1End: Vector3Tuple,
  seg2Start: Vector3Tuple,
  seg2End: Vector3Tuple
): number {
  const d1 = [seg1End[0] - seg1Start[0], seg1End[1] - seg1Start[1], seg1End[2] - seg1Start[2]];
  const d2 = [seg2End[0] - seg2Start[0], seg2End[1] - seg2Start[1], seg2End[2] - seg2Start[2]];
  const r = [seg1Start[0] - seg2Start[0], seg1Start[1] - seg2Start[1], seg1Start[2] - seg2Start[2]];

  const a = d1[0] * d1[0] + d1[1] * d1[1] + d1[2] * d1[2]; // |d1|^2
  const e = d2[0] * d2[0] + d2[1] * d2[1] + d2[2] * d2[2]; // |d2|^2
  const f = d2[0] * r[0] + d2[1] * r[1] + d2[2] * r[2];     // d2 . r

  const EPSILON = 1e-10;
  let s: number, t: number;

  if (a <= EPSILON && e <= EPSILON) {
    // Both segments are points
    s = t = 0;
  } else if (a <= EPSILON) {
    // First segment is a point
    s = 0;
    t = Math.max(0, Math.min(1, f / e));
  } else {
    const c = d1[0] * r[0] + d1[1] * r[1] + d1[2] * r[2]; // d1 . r

    if (e <= EPSILON) {
      // Second segment is a point
      t = 0;
      s = Math.max(0, Math.min(1, -c / a));
    } else {
      const b = d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2]; // d1 . d2
      const denom = a * e - b * b;

      if (denom !== 0) {
        s = Math.max(0, Math.min(1, (b * f - c * e) / denom));
      } else {
        s = 0;
      }

      t = (b * s + f) / e;

      if (t < 0) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.max(0, Math.min(1, (b - c) / a));
      }
    }
  }

  const closest1: Vector3Tuple = [
    seg1Start[0] + s * d1[0],
    seg1Start[1] + s * d1[1],
    seg1Start[2] + s * d1[2],
  ];

  const closest2: Vector3Tuple = [
    seg2Start[0] + t * d2[0],
    seg2Start[1] + t * d2[1],
    seg2Start[2] + t * d2[2],
  ];

  return Math.sqrt(
    Math.pow(closest1[0] - closest2[0], 2) +
    Math.pow(closest1[1] - closest2[1], 2) +
    Math.pow(closest1[2] - closest2[2], 2)
  );
}

/**
 * Check if two capsules collide
 */
export function capsulesCollision(
  capsule1: WorldCapsule,
  capsule2: WorldCapsule,
  safetyMargin: number = 0
): boolean {
  const distance = segmentToSegmentDistance(
    capsule1.point1,
    capsule1.point2,
    capsule2.point1,
    capsule2.point2
  );

  const minDistance = capsule1.radius + capsule2.radius + safetyMargin;
  return distance < minDistance;
}

/**
 * Check self-collision between robot capsules
 */
export function checkSelfCollision(
  worldCapsules: WorldCapsule[],
  selfCollisionPairs: Array<[number, number]>,
  safetyMargin: number = 0
): { hasCollision: boolean; collidingPairs: Array<[number, number]> } {
  const collidingPairs: Array<[number, number]> = [];

  // Create a map from link index to world capsule
  const capsuleMap = new Map<number, WorldCapsule>();
  for (const capsule of worldCapsules) {
    capsuleMap.set(capsule.linkIndex, capsule);
  }

  for (const [linkA, linkB] of selfCollisionPairs) {
    const capsuleA = capsuleMap.get(linkA);
    const capsuleB = capsuleMap.get(linkB);

    if (!capsuleA || !capsuleB) continue;

    if (capsulesCollision(capsuleA, capsuleB, safetyMargin)) {
      collidingPairs.push([linkA, linkB]);
    }
  }

  return {
    hasCollision: collidingPairs.length > 0,
    collidingPairs,
  };
}

/**
 * Check collision between a capsule and a sphere
 */
export function capsuleSphereCollision(
  capsule: WorldCapsule,
  sphereCenter: Vector3Tuple,
  sphereRadius: number,
  safetyMargin: number = 0
): boolean {
  const { distance } = pointToSegmentDistance(sphereCenter, capsule.point1, capsule.point2);
  return distance < capsule.radius + sphereRadius + safetyMargin;
}

/**
 * Check collision between a capsule and an axis-aligned box
 * This is a conservative approximation using the capsule's bounding sphere
 */
export function capsuleBoxCollision(
  capsule: WorldCapsule,
  boxCenter: Vector3Tuple,
  boxHalfExtents: Vector3Tuple,
  safetyMargin: number = 0
): boolean {
  // Find closest point on capsule to box center
  const { closestPoint } = pointToSegmentDistance(boxCenter, capsule.point1, capsule.point2);

  // Clamp to box
  const closestOnBox: Vector3Tuple = [
    Math.max(boxCenter[0] - boxHalfExtents[0], Math.min(boxCenter[0] + boxHalfExtents[0], closestPoint[0])),
    Math.max(boxCenter[1] - boxHalfExtents[1], Math.min(boxCenter[1] + boxHalfExtents[1], closestPoint[1])),
    Math.max(boxCenter[2] - boxHalfExtents[2], Math.min(boxCenter[2] + boxHalfExtents[2], closestPoint[2])),
  ];

  const distance = Math.sqrt(
    Math.pow(closestPoint[0] - closestOnBox[0], 2) +
    Math.pow(closestPoint[1] - closestOnBox[1], 2) +
    Math.pow(closestPoint[2] - closestOnBox[2], 2)
  );

  return distance < capsule.radius + safetyMargin;
}
