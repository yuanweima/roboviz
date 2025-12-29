/**
 * PolyhedronWorkpiece Component
 *
 * A large multi-faced workpiece for grinding demonstrations.
 * Features multiple selectable surface regions on different faces.
 */

import React, { useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { Vector3Tuple } from '@aspect/roboviz-core';

// ============================================================================
// Types
// ============================================================================

export interface GrindingSurfaceRegion {
  id: string;
  name: string;
  /** Center position in Z-up coordinates [x, y, z] */
  center: Vector3Tuple;
  /** Surface normal in Z-up coordinates */
  normal: Vector3Tuple;
  /** Size [width, height] in meters */
  size: [number, number];
  /** Face identifier (top, front, back, left, right) */
  face: 'top' | 'front' | 'back' | 'left' | 'right';
  /** Initial roughness (0-1) */
  roughness: number;
}

export interface PolyhedronWorkpieceProps {
  /** Position offset in Z-up coordinates */
  position?: Vector3Tuple;
  /** Scale factor */
  scale?: number;
  /** Currently highlighted region ID */
  highlightedRegionId?: string | null;
  /** Currently selected region ID */
  selectedRegionId?: string | null;
  /** Currently active (grinding) region ID */
  activeRegionId?: string | null;
  /** Grinding progress per region (0-1) */
  grindingProgress?: Record<string, number>;
  /** Callback when region is clicked */
  onRegionClick?: (regionId: string) => void;
  /** Callback when region is hovered */
  onRegionHover?: (regionId: string | null) => void;
  /** Get the defined regions */
  onRegionsReady?: (regions: GrindingSurfaceRegion[]) => void;
}

// ============================================================================
// Region Definitions
// ============================================================================

/**
 * Define grinding surface regions on the polyhedron workpiece
 * All coordinates are in Z-up format
 */
export function createPolyhedronRegions(scale: number = 1): GrindingSurfaceRegion[] {
  const s = scale;

  // Workpiece dimensions
  const width = 0.4 * s;   // X dimension
  const depth = 0.3 * s;   // Y dimension
  const height = 0.15 * s; // Z dimension (height in Z-up)

  const baseZ = height; // Top surface Z coordinate

  return [
    // === TOP FACE REGIONS ===
    {
      id: 'top-left',
      name: 'Top Left Region',
      center: [-0.1 * s, -0.05 * s, baseZ],
      normal: [0, 0, 1],
      size: [0.12 * s, 0.08 * s],
      face: 'top',
      roughness: 0.85,
    },
    {
      id: 'top-right',
      name: 'Top Right Region',
      center: [0.1 * s, -0.05 * s, baseZ],
      normal: [0, 0, 1],
      size: [0.12 * s, 0.08 * s],
      face: 'top',
      roughness: 0.75,
    },
    {
      id: 'top-center',
      name: 'Top Center Region',
      center: [0, 0.05 * s, baseZ],
      normal: [0, 0, 1],
      size: [0.15 * s, 0.1 * s],
      face: 'top',
      roughness: 0.9,
    },

    // === FRONT FACE REGIONS (Y negative, normal pointing -Y) ===
    {
      id: 'front-main',
      name: 'Front Face',
      center: [0, -depth / 2, height / 2],
      normal: [0, -1, 0],
      size: [0.25 * s, 0.1 * s],
      face: 'front',
      roughness: 0.8,
    },

    // === BACK FACE REGIONS (Y positive, normal pointing +Y) ===
    {
      id: 'back-main',
      name: 'Back Face',
      center: [0, depth / 2, height / 2],
      normal: [0, 1, 0],
      size: [0.25 * s, 0.1 * s],
      face: 'back',
      roughness: 0.7,
    },

    // === LEFT FACE REGION (X negative, normal pointing -X) ===
    {
      id: 'left-main',
      name: 'Left Face',
      center: [-width / 2, 0, height / 2],
      normal: [-1, 0, 0],
      size: [0.2 * s, 0.1 * s],
      face: 'left',
      roughness: 0.85,
    },

    // === RIGHT FACE REGION (X positive, normal pointing +X) ===
    {
      id: 'right-main',
      name: 'Right Face',
      center: [width / 2, 0, height / 2],
      normal: [1, 0, 0],
      size: [0.2 * s, 0.1 * s],
      face: 'right',
      roughness: 0.8,
    },
  ];
}

// ============================================================================
// Component
// ============================================================================

/**
 * Multi-faced polyhedron workpiece for grinding demonstrations
 */
export const PolyhedronWorkpiece = React.memo(function PolyhedronWorkpiece({
  position = [0.5, 0, 0],
  scale = 1,
  highlightedRegionId,
  selectedRegionId,
  activeRegionId,
  grindingProgress = {},
  onRegionClick,
  onRegionHover,
  onRegionsReady,
}: PolyhedronWorkpieceProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const s = scale;

  // Workpiece dimensions
  const width = 0.4 * s;
  const depth = 0.3 * s;
  const height = 0.15 * s;

  // Create regions
  const regions = useMemo(() => {
    const r = createPolyhedronRegions(scale);
    onRegionsReady?.(r);
    return r;
  }, [scale, onRegionsReady]);

  // Z-up scene: use position directly
  // No coordinate conversion needed - scene is already Z-up

  // Get region color based on state
  const getRegionColor = useCallback((regionId: string) => {
    if (activeRegionId === regionId) return '#00ff88';
    if (selectedRegionId === regionId) return '#0088ff';
    if (highlightedRegionId === regionId) return '#00aaff';
    return '#4488aa';
  }, [activeRegionId, selectedRegionId, highlightedRegionId]);

  // Get region opacity based on state
  const getRegionOpacity = useCallback((regionId: string) => {
    if (activeRegionId === regionId) return 0.6;
    if (selectedRegionId === regionId) return 0.5;
    if (highlightedRegionId === regionId) return 0.4;
    return 0.15;
  }, [activeRegionId, selectedRegionId, highlightedRegionId]);

  // Render a surface region indicator
  const renderRegion = useCallback((region: GrindingSurfaceRegion) => {
    const progress = grindingProgress[region.id] || 0;
    const color = getRegionColor(region.id);
    const opacity = getRegionOpacity(region.id);

    // Z-up scene: use center directly, no conversion needed
    const center = region.center;

    // Calculate rotation to align plane with surface normal
    // Z-up: plane default normal is +Z, rotate to match surface normal
    const normal = new THREE.Vector3(...region.normal).normalize();

    // Create rotation from default plane normal (0,0,1) to target normal
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normal);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    // Polished surface color based on progress
    const polishedColor = progress > 0.8 ? '#aabbdd' : progress > 0.4 ? '#99aacc' : '#8899bb';

    return (
      <group key={region.id}>
        {/* Region boundary indicator */}
        <mesh
          position={center}
          rotation={[euler.x, euler.y, euler.z]}
          onClick={(e) => {
            e.stopPropagation();
            onRegionClick?.(region.id);
          }}
          onPointerEnter={() => onRegionHover?.(region.id)}
          onPointerLeave={() => onRegionHover?.(null)}
        >
          <planeGeometry args={[region.size[0], region.size[1]]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Progress overlay - polished surface effect */}
        {progress > 0 && (
          <mesh
            position={[
              center[0] + normal.x * 0.001,
              center[1] + normal.y * 0.001,
              center[2] + normal.z * 0.001,
            ]}
            rotation={[euler.x, euler.y, euler.z]}
          >
            <planeGeometry args={[region.size[0] * progress, region.size[1]]} />
            <meshStandardMaterial
              color={polishedColor}
              metalness={0.95}
              roughness={0.05 + (1 - progress) * 0.4}
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    );
  }, [grindingProgress, getRegionColor, getRegionOpacity, onRegionClick, onRegionHover]);

  return (
    <group position={position}>
      {/* === MAIN BODY === */}
      {/* Base block - Z-up: [width, depth, height] */}
      <mesh
        ref={meshRef}
        position={[0, 0, height / 2]}
        name="polyhedron_workpiece"
        userData={{ workpieceId: 'polyhedron_workpiece' }}
      >
        <boxGeometry args={[width, depth, height]} />
        <meshStandardMaterial color="#5a5a5a" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* === SURFACE DETAILS === */}

      {/* Top face raised features - Z-up: [x, y, z_height] */}
      <mesh position={[-0.1 * s, -0.05 * s, height + 0.008 * s]}>
        <boxGeometry args={[0.06 * s, 0.04 * s, 0.016 * s]} />
        <meshStandardMaterial color="#666666" metalness={0.65} roughness={0.4} />
      </mesh>

      <mesh position={[0.1 * s, 0.05 * s, height + 0.006 * s]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025 * s, 0.028 * s, 0.012 * s, 16]} />
        <meshStandardMaterial color="#666666" metalness={0.65} roughness={0.4} />
      </mesh>

      {/* Weld spatter / rough spots - Z-up: [x, y, z_height] */}
      {[
        [0.05, 0.08, height + 0.002],
        [-0.12, -0.02, height + 0.003],
        [0.15, -0.08, height + 0.002],
        [-0.05, 0.1, height + 0.002],
        [0.08, -0.1, height + 0.003],
      ].map(([x, y, z], i) => (
        <mesh key={`spatter-${i}`} position={[x * s, y * s, z]}>
          <sphereGeometry args={[0.006 * s, 8, 8]} />
          <meshStandardMaterial color="#8B7355" metalness={0.4} roughness={0.7} />
        </mesh>
      ))}

      {/* === SIDE FACE FEATURES === */}

      {/* Front face rib - Z-up: front is -Y */}
      <mesh position={[0, -depth / 2 - 0.008 * s, height / 2]}>
        <boxGeometry args={[0.2 * s, 0.016 * s, 0.08 * s]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Back face rib - Z-up: back is +Y */}
      <mesh position={[0, depth / 2 + 0.008 * s, height / 2]}>
        <boxGeometry args={[0.2 * s, 0.016 * s, 0.08 * s]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Left face boss - Z-up: left is -X, cylinder along X axis */}
      <mesh position={[-width / 2 - 0.01 * s, 0, height / 2]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.03 * s, 0.035 * s, 0.02 * s, 16]} />
        <meshStandardMaterial color="#606060" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Right face boss - Z-up: right is +X, cylinder along X axis */}
      <mesh position={[width / 2 + 0.01 * s, 0, height / 2]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.03 * s, 0.035 * s, 0.02 * s, 16]} />
        <meshStandardMaterial color="#606060" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* === MOUNTING HOLES === Z-up: holes go into Z, positions [x, y] */}
      {[
        [-width / 2 + 0.03 * s, -depth / 2 + 0.03 * s],
        [width / 2 - 0.03 * s, -depth / 2 + 0.03 * s],
        [-width / 2 + 0.03 * s, depth / 2 - 0.03 * s],
        [width / 2 - 0.03 * s, depth / 2 - 0.03 * s],
      ].map(([x, y], i) => (
        <mesh key={`hole-${i}`} position={[x, y, height + 0.001]}>
          <cylinderGeometry args={[0.01 * s, 0.01 * s, 0.02 * s, 12]} />
          <meshStandardMaterial color="#333333" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}

      {/* === FIXTURE BASE === Z-up: [width, depth, height] */}
      <mesh position={[0, 0, -0.015 * s]}>
        <boxGeometry args={[width + 0.05 * s, depth + 0.05 * s, 0.03 * s]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Fixture clamps - Z-up: [x, y, z_height] */}
      {[
        [-width / 2 - 0.02 * s, -depth / 2, 0],
        [width / 2 + 0.02 * s, -depth / 2, 0],
        [-width / 2 - 0.02 * s, depth / 2, 0],
        [width / 2 + 0.02 * s, depth / 2, 0],
      ].map(([x, y, z], i) => (
        <mesh key={`clamp-${i}`} position={[x, y, 0.04 * s]}>
          <boxGeometry args={[0.025 * s, 0.025 * s, 0.06 * s]} />
          <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* === SURFACE REGION INDICATORS === */}
      {regions.map(renderRegion)}
    </group>
  );
});

export default PolyhedronWorkpiece;
