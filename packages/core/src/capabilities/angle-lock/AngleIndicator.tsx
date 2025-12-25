/**
 * AngleIndicator Component
 *
 * 3D visualization of tool angles with constraint indicators.
 */

import * as React from 'react';
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAngleLock } from './AngleLockContext';
import type { AngleConstraint, AngleViolation } from './types';

// ============================================================================
// Types
// ============================================================================

export interface AngleIndicatorProps {
  /** Tool position in world coordinates */
  position: [number, number, number];

  /** Tool orientation (quaternion) */
  quaternion: [number, number, number, number];

  /** Override display settings */
  coneSize?: number;
  coneOpacity?: number;
}

interface ConstraintConeProps {
  constraint: AngleConstraint;
  violation: AngleViolation | undefined;
  coneSize: number;
  coneOpacity: number;
  colors: {
    valid: string;
    warning: string;
    error: string;
    target: string;
  };
  showLabel: boolean;
}

// ============================================================================
// Constraint Cone
// ============================================================================

function ConstraintCone({
  constraint,
  violation,
  coneSize,
  coneOpacity,
  colors,
  showLabel,
}: ConstraintConeProps): React.JSX.Element {
  // Determine color based on violation state
  let color = colors.valid;
  if (violation) {
    const severity = violation.deviation / constraint.tolerance;
    if (severity > 2) {
      color = colors.error;
    } else if (severity > 1) {
      color = colors.warning;
    }
  }

  // Create cone geometry for angle visualization
  const coneRotation = useMemo(() => {
    // Rotate cone based on constraint type
    switch (constraint.type) {
      case 'work':
        return new THREE.Euler(0, 0, Math.PI / 2);
      case 'travel':
      case 'lead':
        return new THREE.Euler(Math.PI / 2, 0, 0);
      case 'tilt':
        return new THREE.Euler(0, 0, 0);
      case 'rotation':
        return new THREE.Euler(0, 0, 0);
      default:
        return new THREE.Euler(0, 0, 0);
    }
  }, [constraint.type]);

  // Calculate cone angle based on tolerance
  const coneAngle = (constraint.tolerance * Math.PI) / 180;

  return (
    <group rotation={coneRotation}>
      {/* Tolerance cone */}
      <mesh>
        <coneGeometry args={[Math.tan(coneAngle) * coneSize, coneSize, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={coneOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center axis line (target direction) */}
      <mesh>
        <cylinderGeometry args={[0.001, 0.001, coneSize * 1.2, 8]} />
        <meshBasicMaterial color={colors.target} />
      </mesh>

      {/* Label */}
      {showLabel && (
        <Html position={[0, coneSize * 1.3, 0]} center>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
            }}
          >
            {constraint.type}: {violation?.currentAngle.toFixed(1) ?? constraint.targetAngle}°
            {violation && (
              <span style={{ color: colors.warning, marginLeft: 4 }}>
                (±{violation.deviation.toFixed(1)}°)
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AngleIndicator({
  position,
  quaternion,
  coneSize: sizeOverride,
  coneOpacity: opacityOverride,
}: AngleIndicatorProps): React.JSX.Element | null {
  const { state } = useAngleLock();
  const { constraints, violations, displaySettings, enabled } = state;

  // Don't render if disabled
  if (!enabled || !displaySettings.showCones) {
    return null;
  }

  const coneSize = sizeOverride ?? displaySettings.coneSize;
  const coneOpacity = opacityOverride ?? displaySettings.coneOpacity;

  // Create violation lookup
  const violationMap = useMemo(() => {
    const map = new Map<string, AngleViolation>();
    for (const v of violations) {
      map.set(v.constraintType, v);
    }
    return map;
  }, [violations]);

  // Convert quaternion to THREE.Quaternion
  const threeQuaternion = useMemo(() => {
    return new THREE.Quaternion(...quaternion);
  }, [quaternion]);

  return (
    <group position={position} quaternion={threeQuaternion} name="angle-indicator">
      {constraints.map((constraint) => {
        if (!constraint.enabled) return null;

        return (
          <ConstraintCone
            key={constraint.type}
            constraint={constraint}
            violation={violationMap.get(constraint.type)}
            coneSize={coneSize}
            coneOpacity={coneOpacity}
            colors={displaySettings.colors}
            showLabel={displaySettings.showLabels}
          />
        );
      })}
    </group>
  );
}

export default AngleIndicator;
