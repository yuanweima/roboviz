/**
 * Coordinate system conversion (pitfall P002).
 *
 * RoboViz is Z-up (robotics/URDF standard); Three.js is Y-up. Every position,
 * quaternion, and pose that crosses that boundary goes through CoordinateTransform.
 * A wrong axis mapping silently mis-renders every robot, so these conversions are
 * pinned here — both the exact axis convention and round-trip invertibility.
 */
import { describe, it, expect } from 'vitest';
import { CoordinateTransform } from '../src/coordinates/transform';
import type { Position3D, Quaternion, Pose3D } from '../src/coordinates/types';

describe('CoordinateTransform — positions (Z-up ↔ Y-up)', () => {
  it('maps Z-up [x, y, z] → Y-up [x, z, -y]', () => {
    expect(CoordinateTransform.positionToYUp([1, 2, 3])).toEqual([1, 3, -2]);
  });

  it('maps Y-up [x, y, z] → Z-up [x, -z, y]', () => {
    expect(CoordinateTransform.positionToZUp([1, 2, 3])).toEqual([1, -3, 2]);
  });

  it('is a round-trip identity (Z-up → Y-up → Z-up)', () => {
    const cases: Position3D[] = [
      [0, 0, 0],
      [0.55, 0, 0.805],
      [-1.2, 3.4, -5.6],
    ];
    for (const p of cases) {
      const back = CoordinateTransform.positionToZUp(
        CoordinateTransform.positionToYUp(p),
      );
      back.forEach((v, i) => expect(v).toBeCloseTo(p[i], 12));
    }
  });
});

describe('CoordinateTransform — quaternions', () => {
  it('round-trips an identity quaternion', () => {
    const identity: Quaternion = [0, 0, 0, 1];
    const back = CoordinateTransform.quaternionToZUp(
      CoordinateTransform.quaternionToYUp(identity),
    );
    back.forEach((v, i) => expect(v).toBeCloseTo(identity[i], 12));
  });

  it('round-trips an arbitrary (normalized) quaternion', () => {
    // normalized [0.1, 0.2, 0.3, 0.9]
    const n = Math.hypot(0.1, 0.2, 0.3, 0.9);
    const q: Quaternion = [0.1 / n, 0.2 / n, 0.3 / n, 0.9 / n];
    const back = CoordinateTransform.quaternionToZUp(
      CoordinateTransform.quaternionToYUp(q),
    );
    back.forEach((v, i) => expect(v).toBeCloseTo(q[i], 10));
  });
});

describe('CoordinateTransform — poses', () => {
  it('round-trips a full pose (position + orientation)', () => {
    const pose: Pose3D = {
      position: [0.4, -0.2, 0.6],
      quaternion: [0, 0.7071, 0, 0.7071],
    };
    const back = CoordinateTransform.poseToZUp(
      CoordinateTransform.poseToYUp(pose),
    );
    back.position.forEach((v, i) => expect(v).toBeCloseTo(pose.position[i], 10));
    back.quaternion.forEach((v, i) => expect(v).toBeCloseTo(pose.quaternion[i], 10));
  });
});
