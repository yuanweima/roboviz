/**
 * CollisionGeometryVisual Component
 *
 * Visualizes collision geometries for debugging and inspection purposes.
 * Shows the collision bounds of objects with configurable appearance.
 */

import * as React from 'react';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type {
  CollisionGeometry,
  CollisionGeometryType,
  CollisionGeometryParams,
} from '../../collision/types';
import type { Transform } from '../../types';

// ============================================================================
// Props
// ============================================================================

export interface CollisionGeometryVisualProps {
  /** Collision geometry data */
  geometry: CollisionGeometry;
  /** Transform of the geometry */
  transform: Transform;
  /** Whether this geometry is currently colliding */
  isColliding?: boolean;
  /** Base color for non-colliding state */
  color?: string;
  /** Color when colliding */
  collidingColor?: string;
  /** Opacity of the geometry */
  opacity?: number;
  /** Whether to show wireframe */
  showWireframe?: boolean;
  /** Whether to show solid fill */
  showFill?: boolean;
  /** Animation style for colliding state */
  collidingAnimation?: 'none' | 'pulse' | 'flash';
  /** Callback when geometry is clicked */
  onClick?: (geometry: CollisionGeometry) => void;
}

export interface CollisionGeometryListProps {
  /** List of geometries with their transforms */
  geometries: Array<{
    geometry: CollisionGeometry;
    transform: Transform;
    enabled?: boolean;
  }>;
  /** Set of colliding geometry IDs */
  collidingIds?: Set<string>;
  /** Base color for all geometries */
  color?: string;
  /** Color when colliding */
  collidingColor?: string;
  /** Opacity for all geometries */
  opacity?: number;
  /** Show wireframe for all */
  showWireframe?: boolean;
  /** Show fill for all */
  showFill?: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_COLOR = '#00ffff';
const DEFAULT_COLLIDING_COLOR = '#ff0000';
const DEFAULT_OPACITY = 0.3;

// ============================================================================
// Geometry Creation
// ============================================================================

function createGeometryMesh(
  type: CollisionGeometryType,
  params: CollisionGeometryParams
): THREE.BufferGeometry {
  switch (type) {
    case 'box': {
      const width = params.width ?? 1;
      const height = params.height ?? 1;
      const depth = params.depth ?? 1;
      return new THREE.BoxGeometry(width, height, depth);
    }
    case 'sphere': {
      const radius = params.radius ?? 0.5;
      return new THREE.SphereGeometry(radius, 32, 32);
    }
    case 'cylinder': {
      const radius = params.radius ?? 0.5;
      const height = params.height ?? 1;
      return new THREE.CylinderGeometry(radius, radius, height, 32);
    }
    case 'capsule': {
      const radius = params.radius ?? 0.25;
      const height = params.height ?? 1;
      return new THREE.CapsuleGeometry(radius, height, 16, 32);
    }
    case 'convexHull':
    case 'mesh':
      // For complex geometries, use a placeholder sphere
      return new THREE.SphereGeometry(0.5, 16, 16);
    default:
      return new THREE.SphereGeometry(0.5, 16, 16);
  }
}

// ============================================================================
// CollisionGeometryVisual Component
// ============================================================================

/**
 * Visualizes a single collision geometry
 */
export function CollisionGeometryVisual({
  geometry,
  transform,
  isColliding = false,
  color = DEFAULT_COLOR,
  collidingColor = DEFAULT_COLLIDING_COLOR,
  opacity = DEFAULT_OPACITY,
  showWireframe = true,
  showFill = true,
  collidingAnimation = 'pulse',
  onClick,
}: CollisionGeometryVisualProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Create geometry
  const geom = useMemo(
    () => createGeometryMesh(geometry.type, geometry.params),
    [geometry.type, geometry.params]
  );

  // Create edges geometry for wireframe
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(geom), [geom]);

  // Extract transform
  const position: [number, number, number] = [
    transform.position.x,
    transform.position.y,
    transform.position.z,
  ];

  const quaternion = new THREE.Quaternion(
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
    transform.rotation.w
  );

  // Animation for colliding state
  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    if (isColliding && collidingAnimation !== 'none') {
      if (collidingAnimation === 'pulse') {
        const pulse = Math.sin(clock.elapsedTime * 4) * 0.5 + 0.5;
        materialRef.current.opacity = opacity + pulse * 0.3;
      } else if (collidingAnimation === 'flash') {
        const flash = Math.floor(clock.elapsedTime * 8) % 2 === 0;
        materialRef.current.opacity = flash ? opacity + 0.4 : opacity;
      }
    } else {
      materialRef.current.opacity = opacity;
    }
  });

  const handleClick = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    onClick?.(geometry);
  };

  const currentColor = isColliding ? collidingColor : color;

  return (
    <group position={position} quaternion={quaternion}>
      {/* Solid fill */}
      {showFill && (
        <mesh ref={meshRef} geometry={geom} onClick={handleClick}>
          <meshBasicMaterial
            ref={materialRef}
            color={currentColor}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Wireframe */}
      {showWireframe && (
        <lineSegments geometry={edgesGeom}>
          <lineBasicMaterial color={currentColor} linewidth={1} />
        </lineSegments>
      )}
    </group>
  );
}

// ============================================================================
// CollisionGeometryList Component
// ============================================================================

/**
 * Renders multiple collision geometries
 */
export function CollisionGeometryList({
  geometries,
  collidingIds = new Set(),
  color = DEFAULT_COLOR,
  collidingColor = DEFAULT_COLLIDING_COLOR,
  opacity = DEFAULT_OPACITY,
  showWireframe = true,
  showFill = true,
}: CollisionGeometryListProps): React.JSX.Element {
  return (
    <group name="collision-geometries">
      {geometries
        .filter((g) => g.enabled !== false)
        .map(({ geometry, transform }) => (
          <CollisionGeometryVisual
            key={geometry.id}
            geometry={geometry}
            transform={transform}
            isColliding={collidingIds.has(geometry.id)}
            color={color}
            collidingColor={collidingColor}
            opacity={opacity}
            showWireframe={showWireframe}
            showFill={showFill}
          />
        ))}
    </group>
  );
}

export default CollisionGeometryVisual;
