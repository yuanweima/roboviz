/**
 * PlanningWaypointVisual Component
 *
 * Renders a planning waypoint with sphere, axes, and optional label.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { PlanningWaypoint } from '../types';
import { WAYPOINT_TYPE_COLORS, DEFAULT_WAYPOINT_VISUALIZATION } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PlanningWaypointVisualProps {
  /** Waypoint data */
  waypoint: PlanningWaypoint;
  /** Whether this waypoint is selected */
  isSelected?: boolean;
  /** Whether this waypoint is hovered */
  isHovered?: boolean;
  /** Sphere radius */
  radius?: number;
  /** Show orientation axes */
  showAxes?: boolean;
  /** Axes length */
  axesLength?: number;
  /** Show label */
  showLabel?: boolean;
  /** Show order number */
  showOrder?: boolean;
  /** Click handler */
  onClick?: (id: string) => void;
  /** Pointer enter handler */
  onPointerEnter?: (id: string) => void;
  /** Pointer leave handler */
  onPointerLeave?: (id: string) => void;
}

// ============================================================================
// Helper Components
// ============================================================================

interface AxesProps {
  length: number;
  lineWidth?: number;
}

/**
 * Coordinate axes for Z-up scene
 * X = Red (forward), Y = Green (left), Z = Blue (up)
 */
function Axes({ length, lineWidth = 2 }: AxesProps) {
  return (
    <group>
      {/* X axis - Red */}
      <Line
        points={[[0, 0, 0], [length, 0, 0]]}
        color="#ff0000"
        lineWidth={lineWidth}
      />
      {/* Y axis - Green */}
      <Line
        points={[[0, 0, 0], [0, length, 0]]}
        color="#00ff00"
        lineWidth={lineWidth}
      />
      {/* Z axis - Blue */}
      <Line
        points={[[0, 0, 0], [0, 0, length]]}
        color="#0000ff"
        lineWidth={lineWidth}
      />
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const PlanningWaypointVisual = React.memo(function PlanningWaypointVisual({
  waypoint,
  isSelected = false,
  isHovered = false,
  radius = DEFAULT_WAYPOINT_VISUALIZATION.radius,
  showAxes = DEFAULT_WAYPOINT_VISUALIZATION.showAxes,
  axesLength = DEFAULT_WAYPOINT_VISUALIZATION.axesLength,
  showLabel = DEFAULT_WAYPOINT_VISUALIZATION.showLabel,
  showOrder = DEFAULT_WAYPOINT_VISUALIZATION.showOrder,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: PlanningWaypointVisualProps) {
  const color = waypoint.color ?? WAYPOINT_TYPE_COLORS[waypoint.type];

  // Effective color based on state
  const effectiveColor = isHovered ? '#ffffff' : isSelected ? '#00ff00' : color;
  const effectiveRadius = isHovered || isSelected ? radius * 1.2 : radius;

  // IK status color
  const ikStatusColor = useMemo(() => {
    switch (waypoint.ikStatus) {
      case 'solved':
        return '#22c55e';
      case 'failed':
      case 'unreachable':
        return '#ef4444';
      case 'computing':
        return '#f59e0b';
      default:
        return '#9ca3af';
    }
  }, [waypoint.ikStatus]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // Stop event from propagating to other objects and parent groups
    e.stopPropagation();

    // Only handle if THIS mesh was the one directly clicked (eventObject is the mesh with onClick)
    // e.object is the actual mesh that was hit by the ray
    // e.eventObject is the mesh that has the onClick handler attached
    // They should match for a direct click on this waypoint's sphere
    if (e.eventObject !== e.object) {
      // The click was on a different mesh, this is a bubbled event - ignore
      return;
    }

    console.log('[PlanningWaypointVisual] Click:', waypoint.name);

    if (onClick) {
      onClick(waypoint.id);
    }
  };

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerEnter?.(waypoint.id);
  };

  const handlePointerLeave = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerLeave?.(waypoint.id);
  };

  // Opacity based on enabled state
  const opacity = waypoint.enabled ? 1 : 0.4;

  // Scene is Z-up, use position/orientation directly
  const quaternion = useMemo(
    () => new THREE.Quaternion(...waypoint.pose.orientation),
    [waypoint.pose.orientation]
  );

  return (
    <group
      position={waypoint.pose.position}
      quaternion={quaternion}
    >
      {/* Main sphere - primary click target */}
      <mesh
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <sphereGeometry args={[effectiveRadius, 16, 16]} />
        <meshStandardMaterial
          color={effectiveColor}
          transparent={opacity < 1}
          opacity={opacity}
          emissive={isSelected ? effectiveColor : undefined}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {/* IK status ring - on XY plane for Z-up */}
      <mesh raycast={() => null}>
        <ringGeometry args={[effectiveRadius * 1.3, effectiveRadius * 1.5, 32]} />
        <meshBasicMaterial
          color={ikStatusColor}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Selection ring - raycast disabled */}
      {isSelected && (
        <mesh raycast={() => null}>
          <ringGeometry args={[effectiveRadius * 1.6, effectiveRadius * 1.8, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Orientation axes */}
      {showAxes && <Axes length={axesLength} />}

      {/* Label - above waypoint in Z-up */}
      {(showLabel || showOrder) && (
        <Html
          position={[0, 0, effectiveRadius * 2.5]}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              border: isSelected ? '1px solid #00ff00' : '1px solid transparent',
            }}
          >
            {showOrder && (
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  lineHeight: '14px',
                  textAlign: 'center',
                  borderRadius: '50%',
                  backgroundColor: color,
                  marginRight: showLabel ? '4px' : '0',
                  fontSize: '9px',
                }}
              >
                {waypoint.order + 1}
              </span>
            )}
            {showLabel && waypoint.name}
          </div>
        </Html>
      )}
    </group>
  );
});

export default PlanningWaypointVisual;
