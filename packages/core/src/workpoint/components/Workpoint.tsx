/**
 * Workpoint Component
 *
 * Renders a single workpoint with type-specific visualization.
 * Includes coordinate axes, direction indicator, and optional label.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Line, Text, Cone, Sphere } from '@react-three/drei';
import type { Workpoint as WorkpointData, WorkpointType } from '../types';
import { WORKPOINT_COLORS } from '../types';

/**
 * Props for the Workpoint component
 */
export interface WorkpointProps {
  /** Workpoint data */
  data: WorkpointData;
  /** Whether this workpoint is selected */
  isSelected?: boolean;
  /** Whether this workpoint is hovered */
  isHovered?: boolean;
  /** Size multiplier */
  size?: number;
  /** Whether to show label */
  showLabel?: boolean;
  /** Whether to show order number */
  showOrder?: boolean;
  /** Whether to show coordinate axes */
  showAxes?: boolean;
  /** Use simplified icon (simple arrow instead of complex shape) */
  simplified?: boolean;
  /** Opacity (0-1) */
  opacity?: number;
  /** Override color (e.g., from group) */
  color?: string;
  /** Click handler */
  onClick?: (id: string) => void;
  /** Hover handlers */
  onPointerEnter?: (id: string) => void;
  onPointerLeave?: (id: string) => void;
}

/**
 * Simplified icon - just an arrow pointing in Z direction
 * Used when simplifiedIcons is enabled for better performance with many workpoints
 */
function SimplifiedIcon({
  color,
  size,
}: {
  color: string;
  size: number;
}) {
  // Cone points along +Z in Z-up scene
  return (
    <Cone
      args={[size * 0.25, size * 0.6, 6]}
      position={[0, 0, size * 0.3]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshBasicMaterial color={color} />
    </Cone>
  );
}

/**
 * Type-specific icon component (detailed version)
 */
function WorkpointIcon({
  type,
  color,
  size,
  simplified = false,
}: {
  type: WorkpointType;
  color: string;
  size: number;
  simplified?: boolean;
}) {
  // Use simplified icon for all types when simplified mode is enabled
  if (simplified) {
    return <SimplifiedIcon color={color} size={size} />;
  }

  switch (type) {
    case 'camera':
      // Camera icon: simple cone pointing in viewing direction (+Z in Z-up)
      return (
        <Cone
          args={[size * 0.3, size * 0.8, 8]}
          position={[0, 0, size * 0.4]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial color={color} />
        </Cone>
      );

    case 'weld':
      // Welding torch icon
      // Z-axis points AWAY from surface (approach direction), so visual extends in +Z
      // This shows the tool approaching from above the surface
      return (
        <group>
          <Cone args={[size * 0.3, size * 1.2, 8]} position={[0, 0, size * 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={color} />
          </Cone>
          {/* Spark/weld point indicator at surface (origin) */}
          <Sphere args={[size * 0.15, 8, 8]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#ffff00" emissive="#ff8800" emissiveIntensity={0.5} />
          </Sphere>
        </group>
      );

    case 'spray':
      // Spray gun icon
      return (
        <group>
          <Cone args={[size * 0.4, size * 1.0, 8]} position={[0, 0, size * 0.5]}>
            <meshStandardMaterial color={color} transparent opacity={0.8} />
          </Cone>
        </group>
      );

    case 'measure':
      // Measurement point
      return (
        <group>
          <Sphere args={[size * 0.25, 16, 16]}>
            <meshStandardMaterial color={color} />
          </Sphere>
          {/* Crosshair */}
          <Line
            points={[
              [-size * 0.5, 0, 0],
              [size * 0.5, 0, 0],
            ]}
            color={color}
            lineWidth={2}
          />
          <Line
            points={[
              [0, -size * 0.5, 0],
              [0, size * 0.5, 0],
            ]}
            color={color}
            lineWidth={2}
          />
        </group>
      );

    case 'normal':
    default:
      // Default: cone pointing in +Z direction
      return (
        <Cone
          args={[size * 0.3, size * 0.8, 8]}
          position={[0, 0, size * 0.4]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshStandardMaterial color={color} />
        </Cone>
      );
  }
}

/**
 * Coordinate axes component
 */
function CoordinateAxes({ size, opacity = 1 }: { size: number; opacity?: number }) {
  const axisLength = size * 2;
  const axisWidth = 2;

  return (
    <group>
      {/* X axis - Red */}
      <Line
        points={[
          [0, 0, 0],
          [axisLength, 0, 0],
        ]}
        color="#ff0000"
        lineWidth={axisWidth}
        transparent
        opacity={opacity}
      />
      {/* Y axis - Green */}
      <Line
        points={[
          [0, 0, 0],
          [0, axisLength, 0],
        ]}
        color="#00ff00"
        lineWidth={axisWidth}
        transparent
        opacity={opacity}
      />
      {/* Z axis - Blue */}
      <Line
        points={[
          [0, 0, 0],
          [0, 0, axisLength],
        ]}
        color="#0000ff"
        lineWidth={axisWidth}
        transparent
        opacity={opacity}
      />
    </group>
  );
}

/**
 * Selection ring component - on XY plane for Z-up
 */
function SelectionRing({ size, color }: { size: number; color: string }) {
  return (
    <mesh>
      <ringGeometry args={[size * 0.8, size * 1.0, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * Workpoint component
 */
export const Workpoint = React.memo(function Workpoint({
  data,
  isSelected = false,
  isHovered = false,
  size = 0.02,
  showLabel = true,
  showOrder = true,
  showAxes = true,
  simplified = false,
  opacity = 1,
  color: colorOverride,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: WorkpointProps) {
  const groupRef = useRef<THREE.Group>(null);

  const color = colorOverride || WORKPOINT_COLORS[data.type] || WORKPOINT_COLORS.normal;
  const effectiveSize = size * (isHovered ? 1.2 : 1);

  // Create quaternion from data
  const quaternion = useMemo(() => {
    return new THREE.Quaternion(...data.quaternion);
  }, [data.quaternion]);

  // Label text
  const labelText = useMemo(() => {
    const parts: string[] = [];
    if (showOrder && data.order !== undefined) {
      parts.push(`#${data.order}`);
    }
    if (showLabel) {
      parts.push(data.type.charAt(0).toUpperCase() + data.type.slice(1));
    }
    return parts.join(' ');
  }, [data.type, data.order, showLabel, showOrder]);

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onClick?.(data.id);
  };

  const handlePointerEnter = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onPointerEnter?.(data.id);
  };

  const handlePointerLeave = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onPointerLeave?.(data.id);
  };

  return (
    <group
      ref={groupRef}
      position={data.position}
      quaternion={quaternion}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Selection indicator */}
      {isSelected && <SelectionRing size={effectiveSize} color={color} />}

      {/* Coordinate axes */}
      {showAxes && <CoordinateAxes size={effectiveSize} opacity={opacity * 0.7} />}

      {/* Type-specific icon */}
      <group scale={opacity}>
        <WorkpointIcon type={data.type} color={color} size={effectiveSize} simplified={simplified} />
      </group>

      {/* Label */}
      {labelText && (showLabel || showOrder) && (
        <Text
          position={[0, effectiveSize * 2, 0]}
          fontSize={effectiveSize * 0.8}
          color={color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={effectiveSize * 0.05}
          outlineColor="#000000"
        >
          {labelText}
        </Text>
      )}

      {/* Invisible hitbox for easier clicking */}
      <mesh visible={false}>
        <sphereGeometry args={[effectiveSize * 1.5, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
});

export default Workpoint;
