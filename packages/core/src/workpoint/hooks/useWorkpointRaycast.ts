/**
 * useWorkpointRaycast Hook
 *
 * Provides raycasting functionality for detecting mouse intersection
 * with workpiece surfaces and calculating surface normals.
 */

import { useCallback, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vector3Tuple, QuaternionTuple } from '../../types';
import type { WorkpointRaycastHit } from '../types';

/**
 * Options for the raycast hook
 */
export interface UseWorkpointRaycastOptions {
  /** Object3D refs or objects to raycast against */
  targets: React.RefObject<THREE.Object3D>[] | THREE.Object3D[];
  /** Mapping from Object3D uuid to workpiece ID */
  objectToWorkpieceId?: Map<string, string>;
  /** Whether raycasting is enabled */
  enabled?: boolean;
}

/**
 * Result of the raycast hook
 */
export interface UseWorkpointRaycastResult {
  /** Perform raycast from current mouse position */
  raycast: (event: { clientX: number; clientY: number }) => WorkpointRaycastHit | null;
  /** Perform raycast from normalized device coordinates */
  raycastNDC: (ndcX: number, ndcY: number) => WorkpointRaycastHit | null;
  /** Convert surface normal to quaternion (Z-axis aligned to normal) */
  normalToQuaternion: (normal: Vector3Tuple) => QuaternionTuple;
  /** Rotate quaternion around an axis */
  rotateAroundAxis: (
    quaternion: QuaternionTuple,
    axis: Vector3Tuple,
    angleRad: number
  ) => QuaternionTuple;
  /** Get local position relative to object */
  worldToLocal: (
    worldPos: Vector3Tuple,
    object: THREE.Object3D
  ) => Vector3Tuple;
}

/**
 * Hook for raycasting to workpiece surfaces
 */
export function useWorkpointRaycast(
  options: UseWorkpointRaycastOptions
): UseWorkpointRaycastResult {
  const { targets, objectToWorkpieceId, enabled = true } = options;
  const { camera, gl } = useThree();

  // Reusable objects to avoid GC
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const normalMatrixRef = useRef(new THREE.Matrix3());

  /**
   * Get target objects from refs or direct objects
   */
  const getTargetObjects = useCallback((): THREE.Object3D[] => {
    return targets
      .map((t) => ('current' in t ? t.current : t))
      .filter((obj): obj is THREE.Object3D => obj !== null && obj !== undefined);
  }, [targets]);

  /**
   * Find workpiece ID for an intersected object
   */
  const findWorkpieceId = useCallback(
    (object: THREE.Object3D): string => {
      // First check direct mapping
      if (objectToWorkpieceId?.has(object.uuid)) {
        return objectToWorkpieceId.get(object.uuid)!;
      }

      // Traverse up to find parent with mapping or name
      let current: THREE.Object3D | null = object;
      while (current) {
        if (objectToWorkpieceId?.has(current.uuid)) {
          return objectToWorkpieceId.get(current.uuid)!;
        }
        if (current.name && current.name.startsWith('workpiece_')) {
          return current.name;
        }
        if (current.userData?.workpieceId) {
          return current.userData.workpieceId as string;
        }
        current = current.parent;
      }

      // Fallback to object uuid
      return object.uuid;
    },
    [objectToWorkpieceId]
  );

  /**
   * Perform raycast from NDC coordinates
   */
  const raycastNDC = useCallback(
    (ndcX: number, ndcY: number): WorkpointRaycastHit | null => {
      if (!enabled) return null;

      const targetObjects = getTargetObjects();
      if (targetObjects.length === 0) return null;

      const raycaster = raycasterRef.current;
      const mouse = mouseRef.current;

      mouse.set(ndcX, ndcY);
      raycaster.setFromCamera(mouse, camera);

      // Raycast against all targets recursively
      const intersects: THREE.Intersection[] = [];
      for (const target of targetObjects) {
        const hits = raycaster.intersectObject(target, true);
        intersects.push(...hits);
      }

      if (intersects.length === 0) return null;

      // Sort by distance and get closest
      intersects.sort((a, b) => a.distance - b.distance);
      const hit = intersects[0];

      // Calculate world normal
      let worldNormal: THREE.Vector3;
      if (hit.face) {
        const normalMatrix = normalMatrixRef.current;
        normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      } else {
        // Fallback: use direction from camera
        worldNormal = raycaster.ray.direction.clone().negate();
      }

      // Calculate local position
      const localPos = hit.point.clone();
      hit.object.worldToLocal(localPos);

      const workpieceId = findWorkpieceId(hit.object);

      return {
        position: [hit.point.x, hit.point.y, hit.point.z],
        normal: [worldNormal.x, worldNormal.y, worldNormal.z],
        distance: hit.distance,
        workpieceId,
        faceIndex: hit.faceIndex ?? undefined,
        localPosition: [localPos.x, localPos.y, localPos.z],
      };
    },
    [enabled, camera, getTargetObjects, findWorkpieceId]
  );

  /**
   * Perform raycast from mouse event
   */
  const raycast = useCallback(
    (event: { clientX: number; clientY: number }): WorkpointRaycastHit | null => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      return raycastNDC(ndcX, ndcY);
    },
    [gl.domElement, raycastNDC]
  );

  /**
   * Convert surface normal to quaternion
   * Makes the Z-axis of the workpoint align with the surface normal
   */
  const normalToQuaternion = useCallback(
    (normal: Vector3Tuple): QuaternionTuple => {
      const up = new THREE.Vector3(0, 0, 1); // Workpoint Z-axis
      const normalVec = new THREE.Vector3(...normal).normalize();

      const quaternion = new THREE.Quaternion();

      // Handle case when normal is parallel to up vector
      const dot = up.dot(normalVec);
      if (Math.abs(dot) > 0.9999) {
        // Normal is parallel to Z, use X as reference
        if (dot > 0) {
          quaternion.set(0, 0, 0, 1); // Identity
        } else {
          quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
        }
      } else {
        quaternion.setFromUnitVectors(up, normalVec);
      }

      return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
    },
    []
  );

  /**
   * Rotate quaternion around an axis
   */
  const rotateAroundAxis = useCallback(
    (
      quaternion: QuaternionTuple,
      axis: Vector3Tuple,
      angleRad: number
    ): QuaternionTuple => {
      const axisVec = new THREE.Vector3(...axis).normalize();
      const rotQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, angleRad);

      const currentQuat = new THREE.Quaternion(...quaternion);
      currentQuat.premultiply(rotQuat);
      currentQuat.normalize();

      return [currentQuat.x, currentQuat.y, currentQuat.z, currentQuat.w];
    },
    []
  );

  /**
   * Convert world position to local position
   */
  const worldToLocal = useCallback(
    (worldPos: Vector3Tuple, object: THREE.Object3D): Vector3Tuple => {
      const pos = new THREE.Vector3(...worldPos);
      object.worldToLocal(pos);
      return [pos.x, pos.y, pos.z];
    },
    []
  );

  return useMemo(
    () => ({
      raycast,
      raycastNDC,
      normalToQuaternion,
      rotateAroundAxis,
      worldToLocal,
    }),
    [raycast, raycastNDC, normalToQuaternion, rotateAroundAxis, worldToLocal]
  );
}

/**
 * Utility: Create quaternion from normal with optional rotation around normal
 */
export function createWorkpointOrientation(
  normal: Vector3Tuple,
  rotationAroundNormal: number = 0
): QuaternionTuple {
  const up = new THREE.Vector3(0, 0, 1);
  const normalVec = new THREE.Vector3(...normal).normalize();

  const quaternion = new THREE.Quaternion();

  // Handle parallel case
  const dot = up.dot(normalVec);
  if (Math.abs(dot) > 0.9999) {
    if (dot > 0) {
      quaternion.set(0, 0, 0, 1);
    } else {
      quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    }
  } else {
    quaternion.setFromUnitVectors(up, normalVec);
  }

  // Apply rotation around normal if specified
  if (rotationAroundNormal !== 0) {
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(
      normalVec,
      rotationAroundNormal
    );
    quaternion.premultiply(rotQuat);
    quaternion.normalize();
  }

  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

/**
 * Utility: Create quaternion from normal with tilt angle and rotation around normal
 *
 * @param normal - Surface normal vector
 * @param tiltAngleDegrees - Tilt angle from normal in degrees (0 = aligned with normal)
 * @param rotationAroundNormal - Rotation around the normal axis in radians
 * @returns Quaternion tuple [x, y, z, w]
 *
 * The orientation is computed as:
 * 1. Start with Z-axis aligned to surface normal
 * 2. Apply tilt by rotating around the local X-axis (perpendicular to normal)
 * 3. Apply rotation around the normal (original surface normal, not tilted Z)
 *
 * This is useful for welding where the tool needs to be tilted at a fixed angle
 * (e.g., 15°-45°) relative to the surface, while the rotation direction can vary.
 */
export function createTiltedWorkpointOrientation(
  normal: Vector3Tuple,
  tiltAngleDegrees: number = 0,
  rotationAroundNormal: number = 0
): QuaternionTuple {
  const normalVec = new THREE.Vector3(...normal).normalize();
  const up = new THREE.Vector3(0, 0, 1);

  // Step 1: Create base quaternion that aligns Z to normal
  const baseQuat = new THREE.Quaternion();
  const dot = up.dot(normalVec);
  if (Math.abs(dot) > 0.9999) {
    if (dot > 0) {
      baseQuat.set(0, 0, 0, 1);
    } else {
      baseQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    }
  } else {
    baseQuat.setFromUnitVectors(up, normalVec);
  }

  // Step 2: Apply rotation around normal first (this determines the tilt direction)
  if (rotationAroundNormal !== 0) {
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(
      normalVec,
      rotationAroundNormal
    );
    baseQuat.premultiply(rotQuat);
    baseQuat.normalize();
  }

  // Step 3: Apply tilt around local X-axis (perpendicular to normal in the rotated frame)
  if (tiltAngleDegrees !== 0) {
    const tiltRad = (tiltAngleDegrees * Math.PI) / 180;

    // Get the local X-axis in world space after rotation
    const localX = new THREE.Vector3(1, 0, 0);
    localX.applyQuaternion(baseQuat);

    // Create tilt rotation around this axis
    const tiltQuat = new THREE.Quaternion().setFromAxisAngle(localX, tiltRad);
    baseQuat.premultiply(tiltQuat);
    baseQuat.normalize();
  }

  return [baseQuat.x, baseQuat.y, baseQuat.z, baseQuat.w];
}
