/**
 * CameraZone Component
 *
 * Renders a camera frustum visualization for camera-type workpoints.
 * Shows the field of view, working distance, and capture area.
 *
 * The workpoint position is at the workpiece surface (target point).
 * The camera optical center is offset along the surface normal by cameraDistance.
 * This design allows easy recalculation when camera parameters change.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { Vector3Tuple, QuaternionTuple } from '../../types';

/**
 * Props for CameraZone component
 */
export interface CameraZoneProps {
  /** Position in world or local coordinates */
  position: Vector3Tuple;
  /** Orientation as quaternion */
  quaternion: QuaternionTuple;
  /** Field of view in degrees */
  fov?: number;
  /** Working distance (depth of frustum) */
  distance?: number;
  /** Aspect ratio (width/height) */
  aspectRatio?: number;
  /** Opacity of the visualization */
  opacity?: number;
  /** Whether this is a preview (affects styling) */
  isPreview?: boolean;
  /** Color override */
  color?: string;
}

/**
 * CameraZone component
 * Renders a camera frustum/viewing area visualization
 */
export const CameraZone = React.memo(function CameraZone({
  position,
  quaternion,
  fov = 60,
  distance = 0.3,
  aspectRatio = 4 / 3,
  opacity = 0.3,
  isPreview = false,
  color = '#00ffff',
}: CameraZoneProps) {
  // Calculate frustum dimensions
  // The workpoint is at the surface (origin), camera optical center is at +Z direction
  const { halfWidth, halfHeight, cameraPosition } = useMemo(() => {
    const fovRad = (fov / 2) * (Math.PI / 180);
    // Calculate the half-dimensions at the surface (where the camera is looking)
    const hh = Math.tan(fovRad) * distance;
    const hw = hh * aspectRatio;

    // Camera optical center position (along +Z from surface)
    const camPos: Vector3Tuple = [0, 0, distance];

    return { halfWidth: hw, halfHeight: hh, cameraPosition: camPos };
  }, [fov, distance, aspectRatio]);

  // Surface corners (where the camera is looking, at origin plane)
  const surfaceCorners = useMemo(() => ({
    topLeft: [-halfWidth, halfHeight, 0] as Vector3Tuple,
    topRight: [halfWidth, halfHeight, 0] as Vector3Tuple,
    bottomLeft: [-halfWidth, -halfHeight, 0] as Vector3Tuple,
    bottomRight: [halfWidth, -halfHeight, 0] as Vector3Tuple,
  }), [halfWidth, halfHeight]);

  // Create quaternion object
  const quatObj = useMemo(() => new THREE.Quaternion(...quaternion), [quaternion]);

  // Line styling based on preview mode
  const lineWidth = isPreview ? 1 : 2;
  const lineOpacity = isPreview ? opacity * 0.7 : opacity;

  return (
    <group position={position} quaternion={quatObj}>
      {/* Frustum edges from camera optical center to surface corners */}
      <Line
        points={[cameraPosition, surfaceCorners.topLeft]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      <Line
        points={[cameraPosition, surfaceCorners.topRight]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      <Line
        points={[cameraPosition, surfaceCorners.bottomLeft]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      <Line
        points={[cameraPosition, surfaceCorners.bottomRight]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />

      {/* Surface plane rectangle (where the camera is looking) */}
      <Line
        points={[
          surfaceCorners.topLeft,
          surfaceCorners.topRight,
          surfaceCorners.bottomRight,
          surfaceCorners.bottomLeft,
          surfaceCorners.topLeft,
        ]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />

      {/* Surface plane fill (semi-transparent) */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[halfWidth * 2, halfHeight * 2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Center crosshair on surface (workpoint center) */}
      <group position={[0, 0, 0]}>
        <Line
          points={[
            [-halfWidth * 0.1, 0, 0],
            [halfWidth * 0.1, 0, 0],
          ]}
          color={color}
          lineWidth={lineWidth}
          transparent
          opacity={lineOpacity}
        />
        <Line
          points={[
            [0, -halfHeight * 0.1, 0],
            [0, halfHeight * 0.1, 0],
          ]}
          color={color}
          lineWidth={lineWidth}
          transparent
          opacity={lineOpacity}
        />
      </group>

      {/* Camera icon at optical center (offset from surface) */}
      <group position={cameraPosition}>
        <CameraIcon color={color} size={distance * 0.15} opacity={opacity} />
      </group>
    </group>
  );
});

/**
 * Simple camera icon
 */
function CameraIcon({
  color,
  size,
  opacity,
}: {
  color: string;
  size: number;
  opacity: number;
}) {
  return (
    <group>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[size * 1.2, size * 0.8, size * 0.6]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.8} />
      </mesh>
      {/* Lens */}
      <mesh position={[0, 0, size * 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[size * 0.25, size * 0.3, size * 0.3, 16]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.8} />
      </mesh>
    </group>
  );
}

/**
 * Calculate camera zone parameters from metadata
 */
export function getCameraZoneParams(metadata?: {
  cameraFOV?: number;
  cameraDistance?: number;
  cameraAspectRatio?: number;
}): { fov: number; distance: number; aspectRatio: number } {
  return {
    fov: metadata?.cameraFOV ?? 60,
    distance: metadata?.cameraDistance ?? 0.3,
    aspectRatio: metadata?.cameraAspectRatio ?? 4 / 3,
  };
}

export default CameraZone;
