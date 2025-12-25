/**
 * TrajectoryPath Component
 *
 * 3D visualization of a trajectory path with waypoint markers.
 * Renders the path as a tube/line with color-coded status.
 */

import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Trajectory, Waypoint, WaypointStatus } from '../types';
import { useTrajectoryStore } from '../store/trajectoryStore';

// ============================================================================
// Types
// ============================================================================

export interface TrajectoryPathProps {
  /** Trajectory to render */
  trajectory: Trajectory;

  /** Whether the path is selected/active */
  isActive?: boolean;

  /** Line width for the path */
  lineWidth?: number;

  /** Whether to show waypoint markers */
  showMarkers?: boolean;

  /** Size of waypoint markers */
  markerSize?: number;

  /** Opacity of the path */
  opacity?: number;

  /** Whether the component is enabled */
  enabled?: boolean;

  /** Called when a waypoint is clicked */
  onWaypointClick?: (waypoint: Waypoint) => void;

  /** Called when a waypoint is hovered */
  onWaypointHover?: (waypoint: Waypoint | null) => void;

  /** Color overrides */
  colors?: {
    valid?: string;
    collision?: string;
    unreachable?: string;
    warning?: string;
    pending?: string;
  };
}

// ============================================================================
// Default Colors
// ============================================================================

const DEFAULT_COLORS = {
  valid: '#10b981',      // Green
  collision: '#ef4444',  // Red
  unreachable: '#f59e0b', // Orange
  warning: '#eab308',    // Yellow
  pending: '#6b7280',    // Gray
};

// ============================================================================
// Utilities
// ============================================================================

function getStatusColor(
  status: WaypointStatus,
  colors: typeof DEFAULT_COLORS
): string {
  switch (status) {
    case 'valid':
      return colors.valid;
    case 'collision':
      return colors.collision;
    case 'unreachable':
    case 'singular':
    case 'error':
      return colors.unreachable;
    case 'warning':
    case 'near-limit':
      return colors.warning;
    default:
      return colors.pending;
  }
}

// ============================================================================
// Waypoint Marker Component
// ============================================================================

interface WaypointMarkerProps {
  waypoint: Waypoint;
  isSelected: boolean;
  isHovered: boolean;
  size: number;
  color: string;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

function WaypointMarker({
  waypoint,
  isSelected,
  isHovered,
  size,
  color,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: WaypointMarkerProps): React.JSX.Element {
  const effectiveSize = isSelected ? size * 1.5 : isHovered ? size * 1.2 : size;

  // Create quaternion from array
  const quaternion = useMemo(() => {
    return new THREE.Quaternion(
      waypoint.quaternion[0],
      waypoint.quaternion[1],
      waypoint.quaternion[2],
      waypoint.quaternion[3]
    );
  }, [waypoint.quaternion]);

  return (
    <group
      position={waypoint.position}
      quaternion={quaternion}
    >
      {/* Marker sphere */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onPointerEnter();
        }}
        onPointerLeave={onPointerLeave}
      >
        <sphereGeometry args={[effectiveSize, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : isHovered ? 0.3 : 0.1}
          transparent
          opacity={waypoint.status === 'pending' ? 0.5 : 1}
        />
      </mesh>

      {/* Direction indicator (small cone) */}
      <mesh position={[0, 0, effectiveSize * 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[effectiveSize * 0.4, effectiveSize * 0.8, 8]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[effectiveSize * 1.8, effectiveSize * 0.15, 8, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}

      {/* Manual adjustment indicator */}
      {waypoint.isManuallyAdjusted && (
        <mesh position={[effectiveSize * 1.2, effectiveSize * 1.2, 0]}>
          <sphereGeometry args={[effectiveSize * 0.3, 8, 8]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TrajectoryPath({
  trajectory,
  isActive = false,
  lineWidth = 3,
  showMarkers = true,
  markerSize = 0.01,
  opacity = 1,
  enabled = true,
  onWaypointClick,
  onWaypointHover,
  colors: colorOverrides,
}: TrajectoryPathProps): React.JSX.Element | null {
  const selectedWaypointId = useTrajectoryStore((s) => s.selectedWaypointId);
  const hoveredWaypointId = useTrajectoryStore((s) => s.hoveredWaypointId);
  const selectWaypoint = useTrajectoryStore((s) => s.selectWaypoint);
  const setHoveredWaypoint = useTrajectoryStore((s) => s.setHoveredWaypoint);

  const colors = useMemo(
    () => ({ ...DEFAULT_COLORS, ...colorOverrides }),
    [colorOverrides]
  );

  // Generate path points and colors
  const { points, vertexColors } = useMemo(() => {
    if (trajectory.waypoints.length < 2) {
      return { points: [], vertexColors: [] };
    }

    const pts: THREE.Vector3[] = [];
    const vtxColors: THREE.Color[] = [];

    for (const wp of trajectory.waypoints) {
      pts.push(new THREE.Vector3(...wp.position));
      vtxColors.push(new THREE.Color(getStatusColor(wp.status, colors)));
    }

    return { points: pts, vertexColors: vtxColors };
  }, [trajectory.waypoints, colors]);

  // Handle waypoint click
  const handleWaypointClick = useCallback(
    (waypoint: Waypoint) => {
      selectWaypoint(waypoint.id);
      onWaypointClick?.(waypoint);
    },
    [selectWaypoint, onWaypointClick]
  );

  // Handle waypoint hover
  const handleWaypointEnter = useCallback(
    (waypoint: Waypoint) => {
      setHoveredWaypoint(waypoint.id);
      onWaypointHover?.(waypoint);
    },
    [setHoveredWaypoint, onWaypointHover]
  );

  const handleWaypointLeave = useCallback(() => {
    setHoveredWaypoint(null);
    onWaypointHover?.(null);
  }, [setHoveredWaypoint, onWaypointHover]);

  if (!enabled || trajectory.waypoints.length === 0) {
    return null;
  }

  return (
    <group name={`trajectory-${trajectory.id}`}>
      {/* Path line */}
      {points.length >= 2 && (
        <Line
          points={points}
          vertexColors={vertexColors}
          lineWidth={isActive ? lineWidth * 1.5 : lineWidth}
          transparent
          opacity={opacity}
        />
      )}

      {/* Waypoint markers */}
      {showMarkers &&
        trajectory.waypoints.map((wp) => (
          <WaypointMarker
            key={wp.id}
            waypoint={wp}
            isSelected={selectedWaypointId === wp.id}
            isHovered={hoveredWaypointId === wp.id}
            size={markerSize}
            color={getStatusColor(wp.status, colors)}
            onClick={() => handleWaypointClick(wp)}
            onPointerEnter={() => handleWaypointEnter(wp)}
            onPointerLeave={handleWaypointLeave}
          />
        ))}
    </group>
  );
}

export default TrajectoryPath;
