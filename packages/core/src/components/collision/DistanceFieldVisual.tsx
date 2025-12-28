/**
 * DistanceFieldVisual Component
 *
 * Visualizes collision proximity using distance field shaders.
 * Provides gradient visualization showing collision risk levels.
 */

import * as React from 'react';
import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getMaterialLibrary } from '../../rendering/materials/MaterialLibrary';
import type { Vector3 } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface DistanceFieldConfig {
  /** Minimum distance (safe zone boundary) in meters */
  minDistance: number;
  /** Maximum distance (danger zone starts) in meters */
  maxDistance: number;
  /** Color for safe zone */
  safeColor: string;
  /** Color for warning zone */
  warningColor: string;
  /** Color for danger zone */
  dangerColor: string;
  /** Opacity of the visualization */
  opacity: number;
  /** Pulse animation speed */
  pulseSpeed: number;
  /** Whether to animate */
  animated: boolean;
}

export interface DistanceFieldZoneProps {
  /** Center position of the zone */
  position: [number, number, number];
  /** Radius of the zone */
  radius: number;
  /** Zone configuration */
  config?: Partial<DistanceFieldConfig>;
  /** Current distance value (for dynamic coloring) */
  currentDistance?: number;
  /** Zone type: 'sphere' | 'cylinder' | 'box' */
  shape?: 'sphere' | 'cylinder' | 'box';
  /** Height for cylinder shape */
  height?: number;
  /** Size for box shape [x, y, z] */
  size?: [number, number, number];
}

export interface ProximityFieldProps {
  /** Objects to track proximity to */
  targetPositions: Vector3[];
  /** Reference position (e.g., robot end effector) */
  referencePosition: Vector3;
  /** Ground plane Y position for visualization */
  groundY?: number;
  /** Grid resolution */
  resolution?: number;
  /** Field size in meters */
  fieldSize?: number;
  /** Configuration */
  config?: Partial<DistanceFieldConfig>;
  /** Whether to show the field */
  visible?: boolean;
}

export interface CollisionRiskIndicatorProps {
  /** Position of the indicator */
  position: [number, number, number];
  /** Distance to nearest obstacle (normalized 0-1, where 0 is collision) */
  normalizedDistance: number;
  /** Size of the indicator */
  size?: number;
  /** Configuration */
  config?: Partial<DistanceFieldConfig>;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: DistanceFieldConfig = {
  minDistance: 0.05,
  maxDistance: 0.5,
  safeColor: '#00ff88',
  warningColor: '#ffaa00',
  dangerColor: '#ff4444',
  opacity: 0.7,
  pulseSpeed: 3.0,
  animated: true,
};

// ============================================================================
// DistanceFieldZone Component
// ============================================================================

/**
 * Renders a zone with distance field coloring
 *
 * @example
 * ```tsx
 * <DistanceFieldZone
 *   position={[0, 0.5, 0]}
 *   radius={0.5}
 *   currentDistance={0.3}
 *   config={{ minDistance: 0.1, maxDistance: 0.5 }}
 * />
 * ```
 */
export function DistanceFieldZone({
  position,
  radius,
  config: configOverride,
  currentDistance,
  shape = 'sphere',
  height = 1,
  size = [1, 1, 1],
}: DistanceFieldZoneProps): React.JSX.Element | null {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  // Create distance field material
  useEffect(() => {
    const lib = getMaterialLibrary();
    materialRef.current = lib.createDistanceFieldMaterial({
      minDistance: config.minDistance,
      maxDistance: config.maxDistance,
      safeColor: config.safeColor,
      warningColor: config.warningColor,
      dangerColor: config.dangerColor,
      opacity: config.opacity,
      pulseSpeed: config.pulseSpeed,
    });

    return () => {
      if (materialRef.current) {
        materialRef.current.dispose();
      }
    };
  }, [config]);

  // Update time uniform for animation
  useFrame(() => {
    if (materialRef.current && config.animated) {
      getMaterialLibrary().updateTime(materialRef.current);
    }

    // Update distance uniform if provided
    if (materialRef.current && currentDistance !== undefined) {
      // Map distance to 0-1 range for shader
      const normalizedDist =
        (currentDistance - config.minDistance) /
        (config.maxDistance - config.minDistance);
      materialRef.current.uniforms.uDistance = { value: Math.max(0, Math.min(1, normalizedDist)) };
    }
  });

  // Create geometry based on shape
  const geometry = useMemo(() => {
    switch (shape) {
      case 'sphere':
        return new THREE.SphereGeometry(radius, 32, 32);
      case 'cylinder':
        return new THREE.CylinderGeometry(radius, radius, height, 32);
      case 'box':
        return new THREE.BoxGeometry(size[0], size[1], size[2]);
      default:
        return new THREE.SphereGeometry(radius, 32, 32);
    }
  }, [shape, radius, height, size]);

  if (!materialRef.current) return null;

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={geometry}
      material={materialRef.current}
    />
  );
}

// ============================================================================
// ProximityField Component
// ============================================================================

/**
 * Renders a ground-plane proximity field showing distances to obstacles
 *
 * @example
 * ```tsx
 * <ProximityField
 *   targetPositions={[{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }]}
 *   referencePosition={{ x: 0, y: 0, z: 0 }}
 *   fieldSize={5}
 * />
 * ```
 */
export function ProximityField({
  targetPositions,
  referencePosition,
  groundY = 0,
  resolution = 32,
  fieldSize = 4,
  config: configOverride,
  visible = true,
}: ProximityFieldProps): React.JSX.Element | null {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);

  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  // Create material and geometry
  useEffect(() => {
    const lib = getMaterialLibrary();
    materialRef.current = lib.createDistanceFieldMaterial({
      minDistance: config.minDistance,
      maxDistance: config.maxDistance,
      safeColor: config.safeColor,
      warningColor: config.warningColor,
      dangerColor: config.dangerColor,
      opacity: config.opacity,
      pulseSpeed: config.pulseSpeed,
    });

    geometryRef.current = new THREE.PlaneGeometry(
      fieldSize,
      fieldSize,
      resolution,
      resolution
    );

    return () => {
      materialRef.current?.dispose();
      geometryRef.current?.dispose();
    };
  }, [config, fieldSize, resolution]);

  // Update distance values based on positions
  useFrame(() => {
    if (!geometryRef.current || !materialRef.current) return;

    const positions = geometryRef.current.getAttribute('position');
    const distances = new Float32Array(positions.count);

    const refPos = new THREE.Vector3(
      referencePosition.x,
      referencePosition.y,
      referencePosition.z
    );

    // Calculate distance at each vertex
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const vertexPos = new THREE.Vector3(x, 0, z);

      // Find minimum distance to any target
      let minDist = Infinity;
      for (const target of targetPositions) {
        const targetVec = new THREE.Vector3(target.x, target.y, target.z);
        const dist = vertexPos.distanceTo(targetVec);
        minDist = Math.min(minDist, dist);
      }

      // Also consider distance to reference
      const refDist = vertexPos.distanceTo(refPos);
      distances[i] = Math.min(minDist, refDist);
    }

    // Apply as attribute (for heatmap-style visualization)
    geometryRef.current.setAttribute(
      'aValue',
      new THREE.BufferAttribute(distances, 1)
    );

    // Update time for animation
    if (config.animated) {
      getMaterialLibrary().updateTime(materialRef.current);
    }
  });

  if (!visible || !materialRef.current || !geometryRef.current) return null;

  return (
    <mesh
      ref={meshRef}
      position={[0, groundY + 0.001, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometryRef.current}
      material={materialRef.current}
    />
  );
}

// ============================================================================
// CollisionRiskIndicator Component
// ============================================================================

/**
 * A 3D indicator showing collision risk level with distance field coloring
 *
 * @example
 * ```tsx
 * <CollisionRiskIndicator
 *   position={[0, 1, 0]}
 *   normalizedDistance={0.3}  // 30% distance from collision
 * />
 * ```
 */
export function CollisionRiskIndicator({
  position,
  normalizedDistance,
  size = 0.1,
  config: configOverride,
}: CollisionRiskIndicatorProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  // Create distance field material
  useEffect(() => {
    const lib = getMaterialLibrary();
    materialRef.current = lib.createDistanceFieldMaterial({
      minDistance: 0,
      maxDistance: 1,
      safeColor: config.safeColor,
      warningColor: config.warningColor,
      dangerColor: config.dangerColor,
      opacity: config.opacity,
      pulseSpeed: config.pulseSpeed,
    });

    return () => {
      materialRef.current?.dispose();
    };
  }, [config]);

  // Update animation and distance
  useFrame(() => {
    if (materialRef.current) {
      getMaterialLibrary().updateTime(materialRef.current);

      // Update distance uniform
      if (materialRef.current.uniforms.uDistance) {
        materialRef.current.uniforms.uDistance.value = normalizedDistance;
      }
    }

    // Rotate ring
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.02;
    }

    // Pulse scale based on risk
    if (meshRef.current) {
      const riskFactor = 1 - normalizedDistance;
      const pulse = 1 + Math.sin(Date.now() * 0.01 * (1 + riskFactor * 3)) * 0.1 * riskFactor;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  // Calculate color based on distance
  const indicatorColor = useMemo(() => {
    if (normalizedDistance > 0.66) return config.safeColor;
    if (normalizedDistance > 0.33) return config.warningColor;
    return config.dangerColor;
  }, [normalizedDistance, config]);

  return (
    <group position={position}>
      {/* Main indicator sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={indicatorColor}
          emissive={indicatorColor}
          emissiveIntensity={0.5 * (1 - normalizedDistance)}
          transparent
          opacity={config.opacity}
        />
      </mesh>

      {/* Rotating ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.3, size * 1.5, 32]} />
        <meshBasicMaterial
          color={indicatorColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer glow ring (larger when closer to collision) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[
            size * (1.5 + (1 - normalizedDistance) * 0.5),
            size * (1.8 + (1 - normalizedDistance) * 0.5),
            32,
          ]}
        />
        <meshBasicMaterial
          color={indicatorColor}
          transparent
          opacity={0.3 * (1 - normalizedDistance)}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default DistanceFieldZone;
