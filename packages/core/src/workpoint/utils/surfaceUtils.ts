/**
 * Surface Utilities
 *
 * Shared utilities for surface-related operations like walking on surfaces,
 * generating surface-conforming paths, and creating surface-conforming geometry.
 */

import * as THREE from 'three';
import type { RegionBoundaryPoint } from '../types';

/**
 * Project a point onto the mesh surface from multiple directions
 */
function projectToSurface(
  mesh: THREE.Mesh,
  point: THREE.Vector3,
  preferredNormal: THREE.Vector3,
  raycaster: THREE.Raycaster
): { position: THREE.Vector3; normal: THREE.Vector3 } | null {
  // Try preferred direction first
  const directions = [
    preferredNormal.clone(),
    preferredNormal.clone().negate(),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];

  for (const dir of directions) {
    const origin = point.clone().add(dir.clone().multiplyScalar(0.5));
    raycaster.set(origin, dir.clone().negate());
    raycaster.far = 1.5;
    const hits = raycaster.intersectObject(mesh, false);
    if (hits.length > 0) {
      let hitNormal = dir.clone();
      if (hits[0].face) {
        hitNormal = hits[0].face.normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
        hitNormal.applyMatrix3(normalMatrix).normalize();
      }
      return {
        position: hits[0].point.clone(),
        normal: hitNormal,
      };
    }
  }
  return null;
}

/**
 * Walk along the surface from start to end point.
 * Detects edges/corners by checking normal changes and adds intermediate points.
 */
export function walkOnSurface(
  mesh: THREE.Mesh,
  startPos: THREE.Vector3,
  endPos: THREE.Vector3,
  startNormal: THREE.Vector3,
  stepSize: number = 0.005 // Very small step size
): Array<{ position: THREE.Vector3; normal: THREE.Vector3 }> {
  const result: Array<{ position: THREE.Vector3; normal: THREE.Vector3 }> = [];
  const raycaster = new THREE.Raycaster();

  const totalDistance = startPos.distanceTo(endPos);
  // Use more steps for better edge detection
  const numSteps = Math.max(10, Math.ceil(totalDistance / stepSize));

  let lastNormal = startNormal.clone();

  for (let i = 1; i <= numSteps; i++) {
    const t = i / numSteps;
    const interpPos = startPos.clone().lerp(endPos, t);

    // Project this interpolated point onto the surface
    const projected = projectToSurface(mesh, interpPos, lastNormal, raycaster);

    if (projected) {
      // Check if we crossed an edge (normal changed significantly)
      const normalDot = lastNormal.dot(projected.normal);

      if (normalDot < 0.8 && result.length > 0) {
        // We crossed an edge! Add extra points around the edge
        // Binary search to find the edge more precisely
        const prevT = (i - 1) / numSteps;
        for (let j = 1; j <= 3; j++) {
          const edgeT = prevT + (t - prevT) * (j / 4);
          const edgeInterpPos = startPos.clone().lerp(endPos, edgeT);
          const edgeProjected = projectToSurface(mesh, edgeInterpPos, lastNormal, raycaster);
          if (edgeProjected) {
            result.push(edgeProjected);
          }
        }
      }

      result.push(projected);
      lastNormal = projected.normal.clone();
    }
  }

  return result;
}

/**
 * Point with position and normal information
 */
export interface SurfacePathPoint {
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

/**
 * Generate surface-following path by walking on the mesh surface
 * Returns both positions and normals for each point
 */
export function generateSurfaceWalkingPathWithNormals(
  mesh: THREE.Mesh,
  points: RegionBoundaryPoint[]
): SurfacePathPoint[] {
  if (points.length < 2) {
    return points.map(p => ({
      position: new THREE.Vector3(...p.position),
      normal: new THREE.Vector3(...p.normal),
    }));
  }

  const pathPoints: SurfacePathPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];

    // Add current boundary point
    pathPoints.push({
      position: new THREE.Vector3(...current.position),
      normal: new THREE.Vector3(...current.normal),
    });

    // Walk along surface to next point
    const startPos = new THREE.Vector3(...current.position);
    const endPos = new THREE.Vector3(...next.position);
    const startNormal = new THREE.Vector3(...current.normal);

    const walkPoints = walkOnSurface(mesh, startPos, endPos, startNormal);
    walkPoints.forEach(wp => {
      pathPoints.push({
        position: wp.position.clone(),
        normal: wp.normal.clone(),
      });
    });
  }

  // Close the loop
  if (pathPoints.length > 0) {
    pathPoints.push({
      position: pathPoints[0].position.clone(),
      normal: pathPoints[0].normal.clone(),
    });
  }

  return pathPoints;
}

/**
 * Generate surface-following path by walking on the mesh surface
 * Returns only positions (for backward compatibility)
 */
export function generateSurfaceWalkingPath(
  mesh: THREE.Mesh,
  points: RegionBoundaryPoint[]
): THREE.Vector3[] {
  const pathWithNormals = generateSurfaceWalkingPathWithNormals(mesh, points);
  return pathWithNormals.map(p => p.position);
}

/**
 * Create a 3D surface-conforming fill geometry using path points with normals.
 * Uses a simple but effective approach: offset each boundary point along its normal,
 * then create a fan triangulation to a centroid that's also on the surface.
 */
export function createSurfaceConformingGeometryWithNormals(
  mesh: THREE.Mesh,
  pathPointsWithNormals: SurfacePathPoint[]
): THREE.BufferGeometry | null {
  if (pathPointsWithNormals.length < 4) return null;

  const positions: number[] = [];

  // Remove the duplicate closing point for processing
  const points = pathPointsWithNormals.slice(0, -1);
  if (points.length < 3) return null;

  // Surface offset to prevent z-fighting - minimal offset for close fit
  const surfaceOffset = 0.002;

  // Step 1: Create offset boundary points using each point's own normal
  const offsetPoints = points.map(p =>
    p.position.clone().add(p.normal.clone().multiplyScalar(surfaceOffset))
  );

  // Step 2: Create triangles directly between consecutive boundary points
  // This is simpler and more robust than trying to find a center point
  // Use ear-clipping style triangulation from first point

  // For convex or near-convex polygons, fan from first point works well
  const first = offsetPoints[0];

  for (let i = 1; i < offsetPoints.length - 1; i++) {
    const p1 = offsetPoints[i];
    const p2 = offsetPoints[i + 1];

    // Create triangle: first -> p1 -> p2
    positions.push(first.x, first.y, first.z);
    positions.push(p1.x, p1.y, p1.z);
    positions.push(p2.x, p2.y, p2.z);
  }

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create a 3D surface-conforming fill geometry (backward compatible version).
 * Internally generates path with normals and delegates to the new implementation.
 */
export function createSurfaceConformingGeometry(
  mesh: THREE.Mesh,
  boundaryPoints: RegionBoundaryPoint[],
  pathPoints: THREE.Vector3[]
): THREE.BufferGeometry | null {
  // Generate path with normals
  const pathWithNormals = generateSurfaceWalkingPathWithNormals(mesh, boundaryPoints);
  return createSurfaceConformingGeometryWithNormals(mesh, pathWithNormals);
}

/**
 * Create simple fallback geometry when no mesh is available.
 * Uses fan triangulation from centroid.
 */
export function createSimpleRegionGeometry(points: RegionBoundaryPoint[]): THREE.BufferGeometry | null {
  if (points.length < 3) return null;

  const positions: number[] = [];
  const normals: number[] = [];

  // Calculate centroid
  const centroid = new THREE.Vector3();
  points.forEach((p) => {
    centroid.add(new THREE.Vector3(...p.position));
  });
  centroid.divideScalar(points.length);

  // Calculate average normal
  const avgNormal = new THREE.Vector3();
  points.forEach(p => {
    avgNormal.add(new THREE.Vector3(...p.normal));
  });
  avgNormal.normalize();

  // Fan triangulation from centroid
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    positions.push(centroid.x, centroid.y, centroid.z);
    positions.push(...p1.position);
    positions.push(...p2.position);

    normals.push(avgNormal.x, avgNormal.y, avgNormal.z);
    normals.push(...p1.normal);
    normals.push(...p2.normal);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  return geometry;
}

/**
 * Offset points slightly along their normals to prevent z-fighting.
 * Returns new points that are slightly elevated from the surface.
 */
export function offsetPointsFromSurface(
  points: THREE.Vector3[],
  avgNormal: THREE.Vector3,
  offset: number = 0.002
): THREE.Vector3[] {
  return points.map(p => p.clone().add(avgNormal.clone().multiplyScalar(offset)));
}

/**
 * Mesh data extracted from BufferGeometry for serialization/backend use
 */
export interface ExtractedMeshData {
  vertices: number[];
  normals: number[];
  indices: number[];
  vertexCount: number;
  triangleCount: number;
}

/**
 * Extract mesh data from a THREE.BufferGeometry for serialization.
 * This converts the geometry into plain arrays that can be sent to a backend.
 */
export function extractMeshDataFromGeometry(geometry: THREE.BufferGeometry): ExtractedMeshData | null {
  const positionAttr = geometry.getAttribute('position');
  const normalAttr = geometry.getAttribute('normal');
  const indexAttr = geometry.getIndex();

  if (!positionAttr) return null;

  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Extract vertices
  for (let i = 0; i < positionAttr.count; i++) {
    vertices.push(positionAttr.getX(i), positionAttr.getY(i), positionAttr.getZ(i));
  }

  // Extract normals (if available)
  if (normalAttr) {
    for (let i = 0; i < normalAttr.count; i++) {
      normals.push(normalAttr.getX(i), normalAttr.getY(i), normalAttr.getZ(i));
    }
  }

  // Extract indices
  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i++) {
      indices.push(indexAttr.getX(i));
    }
  } else {
    // Non-indexed geometry - create sequential indices
    for (let i = 0; i < positionAttr.count; i++) {
      indices.push(i);
    }
  }

  return {
    vertices,
    normals,
    indices,
    vertexCount: positionAttr.count,
    triangleCount: Math.floor(indices.length / 3),
  };
}

/**
 * Create a complete surface region mesh with extracted data.
 * This generates the geometry and extracts the mesh data in one call.
 */
export function createSurfaceRegionMeshData(
  mesh: THREE.Mesh,
  boundaryPoints: RegionBoundaryPoint[]
): { geometry: THREE.BufferGeometry; meshData: ExtractedMeshData } | null {
  // Generate surface-following path
  const pathPoints = generateSurfaceWalkingPath(mesh, boundaryPoints);
  if (pathPoints.length < 3) return null;

  // Create the geometry
  const geometry = createSurfaceConformingGeometry(mesh, boundaryPoints, pathPoints);
  if (!geometry) return null;

  // Extract the mesh data
  const meshData = extractMeshDataFromGeometry(geometry);
  if (!meshData) {
    geometry.dispose();
    return null;
  }

  return { geometry, meshData };
}
