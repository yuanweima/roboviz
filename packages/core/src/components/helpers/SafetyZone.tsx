/**
 * SafetyZoneVisual Component
 *
 * Visualizes safety zones around robots with configurable radii and colors.
 * Supports inner (safe), warning, and danger zones.
 */

import * as React from 'react';
import * as THREE from 'three';
import type { Vector3Like } from '../../types';

export interface SafetyZoneVisualProps {
  /** Inner (safe) zone radius */
  innerRadius: number;
  /** Warning zone radius (optional, defaults to innerRadius * 1.5) */
  outerRadius?: number;
  /** Danger zone radius (optional, defaults to outerRadius * 1.2) */
  dangerRadius?: number;
  /** Position of the zone center */
  position?: Vector3Like;
  /** Height of the zone (for 3D cylinder mode) */
  height?: number;
  /** Color for inner safe zone */
  innerColor?: string;
  /** Color for warning zone */
  warningColor?: string;
  /** Color for danger zone */
  dangerColor?: string;
  /** Opacity of the zones */
  opacity?: number;
  /** Whether to show the boundary lines */
  showBoundary?: boolean;
  /** Boundary line color */
  boundaryColor?: string;
  /** Whether to use 3D cylinder visualization instead of 2D rings */
  use3D?: boolean;
  /** Rotation of the zone (for non-horizontal surfaces) */
  rotation?: [number, number, number];
}

/**
 * SafetyZoneVisual component for visualizing safety zones around robots
 */
export function SafetyZoneVisual({
  innerRadius,
  outerRadius,
  dangerRadius,
  position,
  height = 0,
  innerColor = '#00ff00',
  warningColor = '#ffff00',
  dangerColor = '#ff4444',
  opacity = 0.2,
  showBoundary = true,
  boundaryColor = '#ffffff',
  use3D = false,
  rotation,
}: SafetyZoneVisualProps): React.JSX.Element {
  // Calculate default radii if not provided
  const warningRadius = outerRadius ?? innerRadius * 1.5;
  const dangerZoneRadius = dangerRadius ?? warningRadius * 1.2;

  // Convert position to array
  const pos: [number, number, number] = position
    ? (Array.isArray(position)
        ? position
        : [position.x, position.y, position.z])
    : [0, 0.01, 0]; // Slightly above ground by default

  // Base rotation for horizontal placement
  const baseRotation: [number, number, number] = rotation ?? [-Math.PI / 2, 0, 0];

  if (use3D && height > 0) {
    // 3D cylinder visualization
    return (
      <group position={pos}>
        {/* Inner safe zone cylinder */}
        <mesh>
          <cylinderGeometry args={[innerRadius, innerRadius, height, 64, 1, true]} />
          <meshBasicMaterial
            color={innerColor}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Warning zone cylinder */}
        <mesh>
          <cylinderGeometry args={[warningRadius, warningRadius, height, 64, 1, true]} />
          <meshBasicMaterial
            color={warningColor}
            transparent
            opacity={opacity * 0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Danger zone cylinder */}
        <mesh>
          <cylinderGeometry args={[dangerZoneRadius, dangerZoneRadius, height, 64, 1, true]} />
          <meshBasicMaterial
            color={dangerColor}
            transparent
            opacity={opacity * 0.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Boundary circles at top and bottom */}
        {showBoundary && (
          <>
            {/* Inner boundary */}
            <BoundaryCircle radius={innerRadius} y={height / 2} color={innerColor} />
            <BoundaryCircle radius={innerRadius} y={-height / 2} color={innerColor} />
            {/* Warning boundary */}
            <BoundaryCircle radius={warningRadius} y={height / 2} color={warningColor} />
            <BoundaryCircle radius={warningRadius} y={-height / 2} color={warningColor} />
            {/* Danger boundary */}
            <BoundaryCircle radius={dangerZoneRadius} y={height / 2} color={dangerColor} />
            <BoundaryCircle radius={dangerZoneRadius} y={-height / 2} color={dangerColor} />
          </>
        )}
      </group>
    );
  }

  // 2D ring visualization (default)
  return (
    <group position={pos} rotation={baseRotation}>
      {/* Inner safe zone */}
      <mesh>
        <ringGeometry args={[0, innerRadius, 64]} />
        <meshBasicMaterial
          color={innerColor}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Warning zone */}
      <mesh>
        <ringGeometry args={[innerRadius, warningRadius, 64]} />
        <meshBasicMaterial
          color={warningColor}
          transparent
          opacity={opacity * 0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Danger zone */}
      <mesh>
        <ringGeometry args={[warningRadius, dangerZoneRadius, 64]} />
        <meshBasicMaterial
          color={dangerColor}
          transparent
          opacity={opacity * 0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Boundary lines */}
      {showBoundary && (
        <>
          <BoundaryRing radius={innerRadius} color={innerColor} />
          <BoundaryRing radius={warningRadius} color={warningColor} />
          <BoundaryRing radius={dangerZoneRadius} color={dangerColor} />
        </>
      )}
    </group>
  );
}

/**
 * Helper component for boundary ring
 */
function BoundaryRing({
  radius,
  color,
  segments = 64,
}: {
  radius: number;
  color: string;
  segments?: number;
}): React.JSX.Element {
  const lineRef = React.useRef<THREE.Line>(null);

  const geometry = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.001));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius, segments]);

  const material = React.useMemo(() => {
    return new THREE.LineBasicMaterial({ color, linewidth: 1 });
  }, [color]);

  return (
    <primitive ref={lineRef} object={new THREE.Line(geometry, material)} />
  );
}

/**
 * Helper component for 3D boundary circle
 */
function BoundaryCircle({
  radius,
  y,
  color,
  segments = 64,
}: {
  radius: number;
  y: number;
  color: string;
  segments?: number;
}): React.JSX.Element {
  const geometry = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius, y, segments]);

  const material = React.useMemo(() => {
    return new THREE.LineBasicMaterial({ color, linewidth: 1 });
  }, [color]);

  return (
    <primitive object={new THREE.Line(geometry, material)} />
  );
}

export default SafetyZoneVisual;
