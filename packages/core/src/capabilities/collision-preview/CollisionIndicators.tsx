/**
 * CollisionIndicators Component
 *
 * 3D visualization of collision contact points and warnings.
 */

import * as React from 'react';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useCollisionPreview } from './CollisionPreviewContext';
import type { PreviewCollisionInfo, CollisionSeverity } from './types';

// ============================================================================
// Types
// ============================================================================

export interface CollisionIndicatorsProps {
  /** Override indicator size */
  indicatorSize?: number;
}

interface ContactPointMarkerProps {
  position: [number, number, number];
  severity: CollisionSeverity;
  color: string;
  size: number;
}

// ============================================================================
// Contact Point Marker
// ============================================================================

function ContactPointMarker({
  position,
  severity,
  color,
  size,
}: ContactPointMarkerProps): React.JSX.Element {
  // Adjust size based on severity
  const scaledSize = useMemo(() => {
    switch (severity) {
      case 'critical':
        return size * 1.5;
      case 'error':
        return size * 1.2;
      case 'warning':
        return size;
      case 'info':
        return size * 0.8;
      default:
        return size;
    }
  }, [size, severity]);

  // Create pulsing animation for critical collisions
  const pulse = severity === 'critical' || severity === 'error';

  return (
    <group position={position}>
      {/* Main sphere */}
      <mesh>
        <sphereGeometry args={[scaledSize, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* Outer ring for visibility */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[scaledSize * 1.5, scaledSize * 2, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Warning cross for errors */}
      {(severity === 'error' || severity === 'critical') && (
        <group>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[scaledSize * 4, scaledSize * 0.3, scaledSize * 0.3]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[scaledSize * 4, scaledSize * 0.3, scaledSize * 0.3]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ============================================================================
// Collision Line
// ============================================================================

interface CollisionLineProps {
  collision: PreviewCollisionInfo;
  color: string;
}

function CollisionLine({ collision, color }: CollisionLineProps): React.JSX.Element | null {
  // If we have resolution direction, show a line indicating escape direction
  if (!collision.resolutionDirection || collision.contactPoints.length === 0) {
    return null;
  }

  const startPoint = collision.contactPoints[0];
  const direction = collision.resolutionDirection;
  const length = collision.penetrationDepth * 3; // Scale for visibility

  const endPoint: [number, number, number] = [
    startPoint[0] + direction[0] * length,
    startPoint[1] + direction[1] * length,
    startPoint[2] + direction[2] * length,
  ];

  // Calculate arrow direction and length
  const midPoint: [number, number, number] = [
    (startPoint[0] + endPoint[0]) / 2,
    (startPoint[1] + endPoint[1]) / 2,
    (startPoint[2] + endPoint[2]) / 2,
  ];

  const lineLength = Math.sqrt(
    Math.pow(endPoint[0] - startPoint[0], 2) +
    Math.pow(endPoint[1] - startPoint[1], 2) +
    Math.pow(endPoint[2] - startPoint[2], 2)
  );

  return (
    <group position={midPoint}>
      <mesh>
        <cylinderGeometry args={[0.002, 0.002, lineLength, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CollisionIndicators({
  indicatorSize: sizeOverride,
}: CollisionIndicatorsProps): React.JSX.Element | null {
  const { state } = useCollisionPreview();
  const { result, displaySettings, enabled } = state;

  // Don't render if disabled or no result
  if (!enabled || !result || !displaySettings.showIndicators) {
    return null;
  }

  const { collisions } = result;
  const { colors, indicatorSize, showContactPoints } = displaySettings;

  const size = sizeOverride ?? indicatorSize;

  if (collisions.length === 0) {
    return null;
  }

  return (
    <group name="collision-indicators">
      {collisions.map((collision) => {
        const color = colors[collision.severity];

        return (
          <group key={collision.id}>
            {/* Contact point markers */}
            {showContactPoints &&
              collision.contactPoints.map((point, i) => (
                <ContactPointMarker
                  key={`${collision.id}-${i}`}
                  position={point}
                  severity={collision.severity}
                  color={color}
                  size={size}
                />
              ))}

            {/* Resolution direction line */}
            <CollisionLine collision={collision} color={color} />
          </group>
        );
      })}
    </group>
  );
}

export default CollisionIndicators;
