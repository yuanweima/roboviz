/**
 * CameraZone Component
 *
 * Renders a camera frustum visualization for camera-type workpoints.
 * Shows the field of view, working distance, and capture area.
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
  const { halfWidth, halfHeight, corners } = useMemo(() => {
    const fovRad = (fov / 2) * (Math.PI / 180);
    const hh = Math.tan(fovRad) * distance;
    const hw = hh * aspectRatio;

    // Frustum corner points (at the far plane)
    // Camera looks in -Z direction (opposite to surface normal)
    // This means the camera is positioned at the workpoint and looks outward
    const c = {
      topLeft: [-hw, hh, -distance] as Vector3Tuple,
      topRight: [hw, hh, -distance] as Vector3Tuple,
      bottomLeft: [-hw, -hh, -distance] as Vector3Tuple,
      bottomRight: [hw, -hh, -distance] as Vector3Tuple,
    };

    return { halfWidth: hw, halfHeight: hh, corners: c };
  }, [fov, distance, aspectRatio]);

  // Create quaternion object
  const quatObj = useMemo(() => new THREE.Quaternion(...quaternion), [quaternion]);

  // Line styling based on preview mode
  const lineWidth = isPreview ? 1 : 2;
  const lineOpacity = isPreview ? opacity * 0.7 : opacity;

  return (
    <group position={position} quaternion={quatObj}>
      {/* Frustum edges from origin to corners */}
      <Line
        points={[[0, 0, 0], corners.topLeft]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      <Line
        points={[[0, 0, 0], corners.topRight]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      <Line
        points={[[0, 0, 0], corners.bottomLeft]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />
      <Line
        points={[[0, 0, 0], corners.bottomRight]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />

      {/* Far plane rectangle */}
      <Line
        points={[
          corners.topLeft,
          corners.topRight,
          corners.bottomRight,
          corners.bottomLeft,
          corners.topLeft,
        ]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />

      {/* Far plane fill (semi-transparent) */}
      <mesh position={[0, 0, -distance]}>
        <planeGeometry args={[halfWidth * 2, halfHeight * 2]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Center crosshair on far plane */}
      <group position={[0, 0, -distance]}>
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

      {/* Camera icon at origin */}
      <CameraIcon color={color} size={distance * 0.15} opacity={opacity} />
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
