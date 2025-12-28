/**
 * Spline Generator
 *
 * Utilities for generating smooth cable paths using spline curves.
 */

import * as THREE from 'three';
import { VISUALIZATION_CONSTANTS } from '../constants';

/**
 * Generate smooth cable spline curve
 */
export function generateCableSpline(
  points: THREE.Vector3[],
  tension: number = 0.5
): THREE.CatmullRomCurve3 | null {
  if (points.length < 2) {
    return null;
  }

  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension);
}

/**
 * Generate catenary (natural cable droop) path
 */
export function generateCatenaryPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  options: {
    /** Cable length (if > distance, will sag) */
    cableLength?: number;
    /** Gravity direction */
    gravityDirection?: THREE.Vector3;
    /** Number of segments */
    segments?: number;
    /** Sag factor (0-1, multiplied by distance) */
    sagFactor?: number;
  } = {}
): THREE.Vector3[] {
  const {
    cableLength,
    gravityDirection = new THREE.Vector3(0, 0, -1), // Z-down in robot coords
    segments = 20,
    sagFactor = VISUALIZATION_CONSTANTS.DEFAULT_SAG_FACTOR,
  } = options;

  const distance = start.distanceTo(end);
  const slack = cableLength
    ? Math.max(0, cableLength - distance)
    : distance * sagFactor;

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().lerpVectors(start, end, t);

    // Parabolic sag: 4 * slack * t * (1 - t)
    const sag = slack * 4 * t * (1 - t);
    point.addScaledVector(gravityDirection.clone().normalize(), sag);

    points.push(point);
  }

  return points;
}

/**
 * Generate cable path along robot links
 */
export function generateCablePathAlongRobot(
  anchorPoint: THREE.Vector3,
  attachmentPoint: THREE.Vector3,
  linkPositions: THREE.Vector3[],
  options: {
    /** Cable standoff distance from robot surface */
    standoff?: number;
    /** Which links to route through (indices) */
    routeLinks?: number[];
    /** Add sag between waypoints */
    addSag?: boolean;
    /** Sag factor */
    sagFactor?: number;
  } = {}
): THREE.Vector3[] {
  const {
    standoff = 0.02,
    routeLinks,
    addSag = true,
    sagFactor = 0.05,
  } = options;

  const points: THREE.Vector3[] = [anchorPoint.clone()];

  // Add routed link positions if specified
  if (routeLinks && routeLinks.length > 0) {
    for (const linkIdx of routeLinks) {
      if (linkIdx >= 0 && linkIdx < linkPositions.length) {
        const linkPos = linkPositions[linkIdx].clone();

        // Add standoff perpendicular to cable direction
        if (points.length > 0) {
          const direction = linkPos.clone().sub(points[points.length - 1]);
          const perpendicular = new THREE.Vector3(0, 0, 1)
            .cross(direction)
            .normalize();

          if (perpendicular.length() > 0.01) {
            linkPos.addScaledVector(perpendicular, standoff);
          }
        }

        points.push(linkPos);
      }
    }
  }

  points.push(attachmentPoint.clone());

  // Add sag between waypoints if requested
  if (addSag && points.length >= 2) {
    const saggedPoints: THREE.Vector3[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const segmentStart = points[i];
      const segmentEnd = points[i + 1];
      const distance = segmentStart.distanceTo(segmentEnd);

      // Add segment with sag
      const segmentPoints = generateCatenaryPath(segmentStart, segmentEnd, {
        segments: 5,
        sagFactor: sagFactor * (distance > 0.1 ? 1 : 0.5),
      });

      // Add all but last point (avoid duplicates)
      if (i === 0) {
        saggedPoints.push(...segmentPoints.slice(0, -1));
      } else {
        saggedPoints.push(...segmentPoints.slice(1, -1));
      }
    }

    // Add final point
    saggedPoints.push(points[points.length - 1]);

    return saggedPoints;
  }

  return points;
}

/**
 * Sample points from a curve
 */
export function sampleCurvePoints(
  curve: THREE.CatmullRomCurve3,
  numPoints: number = VISUALIZATION_CONSTANTS.SPLINE_SEGMENTS
): THREE.Vector3[] {
  return curve.getPoints(numPoints);
}

/**
 * Calculate arc length of curve
 */
export function getCurveLength(curve: THREE.CatmullRomCurve3): number {
  return curve.getLength();
}

/**
 * Get tangent at a point on the curve
 */
export function getTangentAtPoint(
  curve: THREE.CatmullRomCurve3,
  t: number
): THREE.Vector3 {
  return curve.getTangentAt(t);
}

/**
 * Calculate curvature profile along the curve
 * Higher curvature = tighter bend = more stress
 */
export function calculateCurvatureProfile(
  curve: THREE.CatmullRomCurve3,
  numSamples: number = 50
): number[] {
  const curvatures: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);

    // Use finite differences to estimate curvature
    const dt = 0.01;
    const t0 = Math.max(0, t - dt);
    const t1 = Math.min(1, t + dt);

    const p0 = curve.getPointAt(t0);
    const p1 = curve.getPointAt(t);
    const p2 = curve.getPointAt(t1);

    // Second derivative approximation
    const d1 = p1.clone().sub(p0);
    const d2 = p2.clone().sub(p1);
    const dd = d2.clone().sub(d1);

    // Curvature magnitude
    const curvature = dd.length() / (dt * dt * 2);
    curvatures.push(curvature);
  }

  return curvatures;
}

/**
 * Check if any bend radius is below minimum
 */
export function checkMinBendRadius(
  curve: THREE.CatmullRomCurve3,
  minRadius: number,
  numSamples: number = 50
): {
  violations: Array<{ t: number; radius: number }>;
  isValid: boolean;
} {
  const curvatures = calculateCurvatureProfile(curve, numSamples);
  const violations: Array<{ t: number; radius: number }> = [];

  for (let i = 0; i < curvatures.length; i++) {
    const curvature = curvatures[i];
    if (curvature > 0) {
      const radius = 1 / curvature;
      if (radius < minRadius) {
        violations.push({
          t: i / (curvatures.length - 1),
          radius,
        });
      }
    }
  }

  return {
    violations,
    isValid: violations.length === 0,
  };
}

/**
 * Create tube geometry from curve
 */
export function createTubeGeometry(
  curve: THREE.CatmullRomCurve3,
  radius: number,
  segments: number = 64,
  radialSegments: number = 8
): THREE.TubeGeometry {
  return new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
}

/**
 * Smooth a set of points using subdivision
 */
export function smoothPoints(
  points: THREE.Vector3[],
  iterations: number = 1
): THREE.Vector3[] {
  if (points.length < 3 || iterations <= 0) {
    return points;
  }

  let current = points;

  for (let iter = 0; iter < iterations; iter++) {
    const smoothed: THREE.Vector3[] = [current[0].clone()];

    for (let i = 1; i < current.length - 1; i++) {
      // Chaikin's corner cutting
      const p0 = current[i - 1];
      const p1 = current[i];
      const p2 = current[i + 1];

      // Midpoints
      const m1 = new THREE.Vector3().lerpVectors(p0, p1, 0.75);
      const m2 = new THREE.Vector3().lerpVectors(p1, p2, 0.25);

      smoothed.push(m1, m2);
    }

    smoothed.push(current[current.length - 1].clone());
    current = smoothed;
  }

  return current;
}
