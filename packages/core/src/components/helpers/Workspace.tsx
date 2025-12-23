/**
 * WorkspaceVisual Component
 *
 * Visualizes robot workspace areas as circles or spheres.
 */

import * as React from 'react';
import * as THREE from 'three';
import type { Vector3Like } from '../../types';

export interface WorkspaceVisualProps {
  /** Radius of the workspace */
  radius: number;
  /** Position of the workspace center */
  position?: Vector3Like;
  /** Color of the workspace */
  color?: string;
  /** Opacity of the workspace fill */
  opacity?: number;
  /** Whether to show the boundary line */
  showBoundary?: boolean;
  /** Boundary line width (visual only, not actual pixels) */
  boundaryWidth?: number;
  /** Whether to use 3D sphere visualization instead of 2D circle */
  use3D?: boolean;
  /** Rotation of the workspace (for non-horizontal surfaces) */
  rotation?: [number, number, number];
  /** Whether the workspace is reachable (affects color/style) */
  reachable?: boolean;
  /** Reachable color (used when reachable prop is true) */
  reachableColor?: string;
  /** Unreachable color (used when reachable prop is false) */
  unreachableColor?: string;
}

/**
 * WorkspaceVisual component for visualizing robot work areas
 */
export function WorkspaceVisual({
  radius,
  position,
  color = '#4ecdc4',
  opacity = 0.1,
  showBoundary = true,
  boundaryWidth = 2,
  use3D = false,
  rotation,
  reachable,
  reachableColor = '#00ff88',
  unreachableColor = '#ff4444',
}: WorkspaceVisualProps): React.JSX.Element {
  // Convert position to array
  const pos: [number, number, number] = position
    ? (Array.isArray(position)
        ? position
        : [position.x, position.y, position.z])
    : [0, 0.01, 0]; // Slightly above ground by default

  // Determine final color based on reachable state
  const finalColor = reachable !== undefined
    ? (reachable ? reachableColor : unreachableColor)
    : color;

  // Base rotation for horizontal placement
  const baseRotation: [number, number, number] = rotation ?? [-Math.PI / 2, 0, 0];

  if (use3D) {
    // 3D sphere visualization
    return (
      <group position={pos}>
        {/* Workspace sphere */}
        <mesh>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial
            color={finalColor}
            transparent
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            wireframe={false}
          />
        </mesh>

        {/* Wireframe boundary */}
        {showBoundary && (
          <mesh>
            <sphereGeometry args={[radius, 32, 16]} />
            <meshBasicMaterial
              color={finalColor}
              transparent
              opacity={0.3}
              wireframe
            />
          </mesh>
        )}
      </group>
    );
  }

  // 2D circle visualization (default)
  return (
    <group position={pos} rotation={baseRotation}>
      {/* Workspace circle */}
      <mesh>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial
          color={finalColor}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Boundary circle */}
      {showBoundary && (
        <WorkspaceBoundary radius={radius} color={finalColor} />
      )}
    </group>
  );
}

/**
 * Helper component for workspace boundary
 */
function WorkspaceBoundary({
  radius,
  color,
  segments = 64,
}: {
  radius: number;
  color: string;
  segments?: number;
}): React.JSX.Element {
  const geometry = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0.001
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius, segments]);

  const material = React.useMemo(() => {
    return new THREE.LineBasicMaterial({ color, linewidth: 1, transparent: true, opacity: 0.5 });
  }, [color]);

  return (
    <primitive object={new THREE.Line(geometry, material)} />
  );
}

/**
 * Component for visualizing overlapping workspaces (shared work area)
 */
export interface SharedWorkspaceProps {
  /** Array of workspace positions */
  workspaces: Vector3Like[];
  /** Radius of each workspace */
  radius: number;
  /** Color for the shared area */
  color?: string;
  /** Opacity of the shared area */
  opacity?: number;
}

export function SharedWorkspace({
  workspaces,
  radius,
  color = '#ffffff',
  opacity = 0.15,
}: SharedWorkspaceProps): React.JSX.Element | null {
  if (workspaces.length < 2) {
    return null;
  }

  // Calculate center point between all workspaces
  const center = React.useMemo(() => {
    let x = 0, y = 0, z = 0;
    for (const wp of workspaces) {
      if (Array.isArray(wp)) {
        x += wp[0];
        y += wp[1];
        z += wp[2];
      } else {
        x += wp.x;
        y += wp.y;
        z += wp.z;
      }
    }
    const n = workspaces.length;
    return [x / n, y / n, z / n] as [number, number, number];
  }, [workspaces]);

  // Calculate approximate shared radius (simplified - actual intersection is complex)
  const sharedRadius = React.useMemo(() => {
    // Find minimum distance between any two workspaces
    let minDist = Infinity;
    for (let i = 0; i < workspaces.length; i++) {
      for (let j = i + 1; j < workspaces.length; j++) {
        const a = workspaces[i];
        const b = workspaces[j];
        const ax = Array.isArray(a) ? a[0] : a.x;
        const ay = Array.isArray(a) ? a[1] : a.y;
        const az = Array.isArray(a) ? a[2] : a.z;
        const bx = Array.isArray(b) ? b[0] : b.x;
        const by = Array.isArray(b) ? b[1] : b.y;
        const bz = Array.isArray(b) ? b[2] : b.z;
        const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2);
        minDist = Math.min(minDist, dist);
      }
    }
    // Approximate shared radius
    return Math.max(0, radius - minDist / 2);
  }, [workspaces, radius]);

  if (sharedRadius <= 0) {
    return null;
  }

  return (
    <group position={center}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[sharedRadius, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default WorkspaceVisual;
