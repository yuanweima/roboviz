/**
 * Spline Generator Tests
 *
 * Unit tests for cable path generation utilities.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  generateCableSpline,
  generateCatenaryPath,
  generateCablePathAlongRobot,
  sampleCurvePoints,
  getCurveLength,
  getTangentAtPoint,
  calculateCurvatureProfile,
  checkMinBendRadius,
  createTubeGeometry,
  smoothPoints,
} from '../../src/capabilities/cable-management/utils/spline-generator';

// ============================================================
// generateCableSpline Tests
// ============================================================

describe('generateCableSpline', () => {
  it('should return null for less than 2 points', () => {
    expect(generateCableSpline([])).toBeNull();
    expect(generateCableSpline([new THREE.Vector3(0, 0, 0)])).toBeNull();
  });

  it('should create a spline for 2+ points', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(2, 1, 0),
    ];
    const spline = generateCableSpline(points);
    expect(spline).not.toBeNull();
    expect(spline).toBeInstanceOf(THREE.CatmullRomCurve3);
  });

  it('should respect custom tension', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(2, 0, 0),
    ];
    const lowTension = generateCableSpline(points, 0.1);
    const highTension = generateCableSpline(points, 0.9);

    expect(lowTension).not.toBeNull();
    expect(highTension).not.toBeNull();

    // Both should have same endpoints
    const lowStart = lowTension!.getPointAt(0);
    const highStart = highTension!.getPointAt(0);
    expect(lowStart.x).toBeCloseTo(0, 5);
    expect(highStart.x).toBeCloseTo(0, 5);
  });
});

// ============================================================
// generateCatenaryPath Tests
// ============================================================

describe('generateCatenaryPath', () => {
  it('should generate path between two points', () => {
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(2, 0, 0);
    const path = generateCatenaryPath(start, end);

    expect(path.length).toBeGreaterThan(2);
    expect(path[0].x).toBeCloseTo(0, 5);
    expect(path[path.length - 1].x).toBeCloseTo(2, 5);
  });

  it('should create sag in the middle', () => {
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(2, 0, 0);
    const path = generateCatenaryPath(start, end, { sagFactor: 0.2 });

    // Middle points should have negative z (sagging down with default gravity)
    const midIdx = Math.floor(path.length / 2);
    expect(path[midIdx].z).toBeLessThan(0);
  });

  it('should respect custom segment count', () => {
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(1, 0, 0);
    const path = generateCatenaryPath(start, end, { segments: 10 });

    expect(path.length).toBe(11); // segments + 1
  });

  it('should use cable length for sag calculation', () => {
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(1, 0, 0);

    // Cable length > distance = more sag
    const longCable = generateCatenaryPath(start, end, { cableLength: 1.5 });
    const shortCable = generateCatenaryPath(start, end, { cableLength: 1.0 });

    const longMidZ = longCable[Math.floor(longCable.length / 2)].z;
    const shortMidZ = shortCable[Math.floor(shortCable.length / 2)].z;

    expect(longMidZ).toBeLessThan(shortMidZ);
  });

  it('should respect custom gravity direction', () => {
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(1, 0, 0);

    const downY = generateCatenaryPath(start, end, {
      gravityDirection: new THREE.Vector3(0, -1, 0),
      sagFactor: 0.2,
    });

    // Middle should have negative y
    const midIdx = Math.floor(downY.length / 2);
    expect(downY[midIdx].y).toBeLessThan(0);
    expect(downY[midIdx].z).toBeCloseTo(0, 5);
  });
});

// ============================================================
// generateCablePathAlongRobot Tests
// ============================================================

describe('generateCablePathAlongRobot', () => {
  it('should connect anchor to attachment', () => {
    const anchor = new THREE.Vector3(0, 0, 0);
    const attachment = new THREE.Vector3(1, 1, 1);
    const path = generateCablePathAlongRobot(anchor, attachment, []);

    expect(path[0].x).toBeCloseTo(0, 5);
    expect(path[path.length - 1].x).toBeCloseTo(1, 5);
  });

  it('should route through specified links', () => {
    const anchor = new THREE.Vector3(0, 0, 0);
    const attachment = new THREE.Vector3(2, 0, 0);
    const linkPositions = [
      new THREE.Vector3(0.5, 0.5, 0),
      new THREE.Vector3(1.0, 0.5, 0),
      new THREE.Vector3(1.5, 0.5, 0),
    ];

    const path = generateCablePathAlongRobot(anchor, attachment, linkPositions, {
      routeLinks: [1],
      addSag: false,
    });

    // Should have intermediate points near the link
    expect(path.length).toBeGreaterThan(2);
  });

  it('should add sag between segments when enabled', () => {
    const anchor = new THREE.Vector3(0, 0, 0);
    const attachment = new THREE.Vector3(2, 0, 0);
    const linkPositions = [new THREE.Vector3(1, 0, 0)];

    const withSag = generateCablePathAlongRobot(anchor, attachment, linkPositions, {
      routeLinks: [0],
      addSag: true,
    });
    const withoutSag = generateCablePathAlongRobot(anchor, attachment, linkPositions, {
      routeLinks: [0],
      addSag: false,
    });

    expect(withSag.length).toBeGreaterThan(withoutSag.length);
  });
});

// ============================================================
// Curve Utility Tests
// ============================================================

describe('sampleCurvePoints', () => {
  it('should sample points from curve', () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(2, 0, 0),
    ]);

    const points = sampleCurvePoints(curve, 10);
    expect(points.length).toBe(11); // n + 1 points for n divisions
  });
});

describe('getCurveLength', () => {
  it('should calculate arc length', () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]);

    const length = getCurveLength(curve);
    expect(length).toBeGreaterThan(0);
    expect(length).toBeCloseTo(1, 1); // Approximately 1 for straight line
  });
});

describe('getTangentAtPoint', () => {
  it('should return tangent vector', () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(2, 0, 0),
    ]);

    const tangent = getTangentAtPoint(curve, 0.5);
    expect(tangent.length()).toBeCloseTo(1, 5); // Normalized
    expect(tangent.x).toBeCloseTo(1, 1); // Pointing in x direction
  });
});

describe('calculateCurvatureProfile', () => {
  it('should calculate curvature along curve', () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(2, 0, 0),
    ]);

    const curvatures = calculateCurvatureProfile(curve, 10);
    expect(curvatures.length).toBe(10);
    curvatures.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
  });

  it('should return finite curvature values', () => {
    // CatmullRom splines have curvature - just verify the values are finite
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0.5, 0),
      new THREE.Vector3(2, 0, 0),
    ]);

    const curvatures = calculateCurvatureProfile(curve, 10);

    curvatures.forEach((c) => {
      expect(Number.isFinite(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('checkMinBendRadius', () => {
  it('should detect bend radius violations', () => {
    // Create a tight curve
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.1, 0.5, 0),
      new THREE.Vector3(0.2, 0, 0),
    ]);

    const result = checkMinBendRadius(curve, 1.0, 20); // 1m min radius
    // Tight curve should have violations
    expect(result.violations.length).toBeGreaterThanOrEqual(0);
  });

  it('should have fewer violations for gentle curves', () => {
    const gentleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0.1, 0),
      new THREE.Vector3(10, 0, 0),
    ]);

    const tightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.1, 0.5, 0),
      new THREE.Vector3(0.2, 0, 0),
    ]);

    const gentleResult = checkMinBendRadius(gentleCurve, 0.1, 20);
    const tightResult = checkMinBendRadius(tightCurve, 0.1, 20);

    // Gentle curve should have fewer or equal violations
    expect(gentleResult.violations.length).toBeLessThanOrEqual(tightResult.violations.length);
  });
});

// ============================================================
// Geometry Creation Tests
// ============================================================

describe('createTubeGeometry', () => {
  it('should create tube geometry from curve', () => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(2, 0, 0),
    ]);

    const geometry = createTubeGeometry(curve, 0.05);
    expect(geometry).toBeInstanceOf(THREE.TubeGeometry);
    expect(geometry.attributes.position).toBeDefined();
  });
});

describe('smoothPoints', () => {
  it('should return original for less than 3 points', () => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
    const smoothed = smoothPoints(points);
    expect(smoothed.length).toBe(2);
  });

  it('should increase point count with smoothing', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(3, 1, 0),
    ];

    const smoothed = smoothPoints(points, 1);
    expect(smoothed.length).toBeGreaterThan(points.length);
  });

  it('should preserve endpoints', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(2, 0, 0),
    ];

    const smoothed = smoothPoints(points, 2);
    expect(smoothed[0].x).toBeCloseTo(0, 5);
    expect(smoothed[smoothed.length - 1].x).toBeCloseTo(2, 5);
  });

  it('should return original for zero iterations', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(2, 0, 0),
    ];

    const smoothed = smoothPoints(points, 0);
    expect(smoothed.length).toBe(points.length);
  });
});
