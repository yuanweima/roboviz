/**
 * ContactPointVisual Component
 *
 * Visualizes collision contact points and penetration vectors.
 * Used to show where collisions occur and their severity.
 */

import * as React from 'react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CollisionPair } from '../../collision/types';
import type { Vector3 } from '../../types';

// ============================================================================
// Props
// ============================================================================

export interface ContactPointProps {
  /** Position of the contact point */
  position: Vector3;
  /** Size of the contact point marker */
  size?: number;
  /** Color of the contact point */
  color?: string;
  /** Whether to animate the contact point */
  animate?: boolean;
  /** Whether to show a glow effect */
  showGlow?: boolean;
}

export interface PenetrationVectorProps {
  /** Start position (contact point) */
  start: Vector3;
  /** Direction and magnitude of penetration */
  direction: Vector3;
  /** Penetration depth */
  depth: number;
  /** Color of the vector */
  color?: string;
  /** Arrow head size */
  arrowSize?: number;
}

export interface ContactPointListProps {
  /** Collision pairs containing contact information */
  collisionPairs: CollisionPair[];
  /** Size of contact point markers */
  pointSize?: number;
  /** Color of contact points */
  pointColor?: string;
  /** Whether to show penetration vectors */
  showPenetrationVectors?: boolean;
  /** Color of penetration vectors */
  vectorColor?: string;
  /** Whether to animate contact points */
  animate?: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_POINT_SIZE = 0.02;
const DEFAULT_POINT_COLOR = '#ffff00';
const DEFAULT_VECTOR_COLOR = '#ff00ff';

// ============================================================================
// ContactPoint Component
// ============================================================================

/**
 * Renders a single contact point marker
 */
export function ContactPoint({
  position,
  size = DEFAULT_POINT_SIZE,
  color = DEFAULT_POINT_COLOR,
  animate = true,
  showGlow = true,
}: ContactPointProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const pos: [number, number, number] = [position.x, position.y, position.z];

  // Animation
  useFrame(({ clock }) => {
    if (!animate) return;

    if (meshRef.current) {
      // Pulsing scale
      const pulse = Math.sin(clock.elapsedTime * 6) * 0.2 + 1;
      meshRef.current.scale.setScalar(pulse);
    }

    if (glowRef.current) {
      // Glow opacity animation
      const glowPulse = Math.sin(clock.elapsedTime * 4) * 0.3 + 0.5;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowPulse;
    }
  });

  return (
    <group position={pos}>
      {/* Core point */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Glow effect */}
      {showGlow && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[size * 2, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// PenetrationVector Component
// ============================================================================

/**
 * Renders a penetration vector arrow
 */
export function PenetrationVector({
  start,
  direction,
  depth,
  color = DEFAULT_VECTOR_COLOR,
  arrowSize = 0.01,
}: PenetrationVectorProps): React.JSX.Element {
  // Create line object
  const lineObject = useMemo(() => {
    const points = [
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(
        start.x + direction.x * depth,
        start.y + direction.y * depth,
        start.z + direction.z * depth
      ),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    return new THREE.Line(geometry, material);
  }, [start, direction, depth, color]);

  // Arrow head
  const arrowGeom = useMemo(() => {
    return new THREE.ConeGeometry(arrowSize, arrowSize * 3, 8);
  }, [arrowSize]);

  const endPosition: [number, number, number] = [
    start.x + direction.x * depth,
    start.y + direction.y * depth,
    start.z + direction.z * depth,
  ];

  // Calculate rotation for arrow head to point in direction
  const arrowRotation = useMemo(() => {
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return quaternion;
  }, [direction]);

  return (
    <group>
      {/* Line */}
      <primitive object={lineObject} />

      {/* Arrow head */}
      <mesh position={endPosition} quaternion={arrowRotation} geometry={arrowGeom}>
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// ============================================================================
// ContactPointList Component
// ============================================================================

/**
 * Renders contact points from collision pairs
 */
export function ContactPointList({
  collisionPairs,
  pointSize = DEFAULT_POINT_SIZE,
  pointColor = DEFAULT_POINT_COLOR,
  showPenetrationVectors = false,
  vectorColor = DEFAULT_VECTOR_COLOR,
  animate = true,
}: ContactPointListProps): React.JSX.Element {
  return (
    <group name="contact-points">
      {collisionPairs.map((pair, index) => (
        <React.Fragment key={`contact-${index}`}>
          {/* Contact point */}
          {pair.contactPoint && (
            <ContactPoint
              position={pair.contactPoint}
              size={pointSize}
              color={pointColor}
              animate={animate}
            />
          )}

          {/* Penetration vector */}
          {showPenetrationVectors &&
            pair.contactPoint &&
            pair.penetrationDepth !== undefined &&
            pair.penetrationDepth > 0 && (
              <PenetrationVector
                start={pair.contactPoint}
                direction={{ x: 0, y: 1, z: 0 }} // Default up direction
                depth={pair.penetrationDepth}
                color={vectorColor}
              />
            )}
        </React.Fragment>
      ))}
    </group>
  );
}

// ============================================================================
// CollisionIndicator Component
// ============================================================================

export interface CollisionIndicatorProps {
  /** Position to show the indicator */
  position: Vector3;
  /** Label text */
  label?: string;
  /** Severity level */
  severity?: 'low' | 'medium' | 'high';
}

/**
 * A 3D collision indicator that appears at collision locations
 */
export function CollisionIndicator({
  position,
  label,
  severity = 'medium',
}: CollisionIndicatorProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);

  const severityColors = {
    low: '#ffff00',
    medium: '#ffa500',
    high: '#ff0000',
  };

  const color = severityColors[severity];
  const pos: [number, number, number] = [position.x, position.y, position.z];

  // Rotation animation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 2;
    }
  });

  return (
    <group position={pos}>
      {/* Rotating indicator */}
      <group ref={groupRef}>
        {/* Diamond shape */}
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.03, 0.03, 0.03]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Outer ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.04, 0.05, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

export default ContactPoint;
