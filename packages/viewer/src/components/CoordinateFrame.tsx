/**
 * CoordinateFrame component
 * Renders a coordinate frame with axes and optional label
 */
import * as React from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import type { CoordinateFrameState } from '../types';

interface CoordinateFrameProps {
  data: CoordinateFrameState;
  highlighted?: boolean;
  highlightColor?: string;
  onClick?: (frameId: string) => void;
}

export function CoordinateFrame({ data, highlighted, highlightColor = '#ffff00', onClick }: CoordinateFrameProps) {
  const { id, name, position, rotation, visualization } = data;

  if (!visualization.visible) return null;

  const axisLength = visualization.axisLength;
  const thickness = visualization.axisThickness;

  // Convert quaternion [w, x, y, z] to THREE.Quaternion
  const quaternion = React.useMemo(() => {
    return new THREE.Quaternion(rotation[1], rotation[2], rotation[3], rotation[0]);
  }, [rotation]);

  // Create axis end points
  const xEnd: [number, number, number] = [axisLength, 0, 0];
  const yEnd: [number, number, number] = [0, axisLength, 0];
  const zEnd: [number, number, number] = [0, 0, axisLength];

  const handleClick = React.useCallback((e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    onClick?.(id);
  }, [id, onClick]);

  return (
    <group position={position} quaternion={quaternion} onClick={handleClick}>
      {/* X axis - Red */}
      <Line
        points={[[0, 0, 0], xEnd]}
        color={highlighted ? highlightColor : visualization.colors.x}
        lineWidth={thickness}
      />

      {/* Y axis - Green */}
      <Line
        points={[[0, 0, 0], yEnd]}
        color={highlighted ? highlightColor : visualization.colors.y}
        lineWidth={thickness}
      />

      {/* Z axis - Blue */}
      <Line
        points={[[0, 0, 0], zEnd]}
        color={highlighted ? highlightColor : visualization.colors.z}
        lineWidth={thickness}
      />

      {/* Axis arrows (cones) */}
      <mesh position={xEnd} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[axisLength * 0.1, axisLength * 0.2, 8]} />
        <meshBasicMaterial color={highlighted ? highlightColor : visualization.colors.x} />
      </mesh>
      <mesh position={yEnd}>
        <coneGeometry args={[axisLength * 0.1, axisLength * 0.2, 8]} />
        <meshBasicMaterial color={highlighted ? highlightColor : visualization.colors.y} />
      </mesh>
      <mesh position={zEnd} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[axisLength * 0.1, axisLength * 0.2, 8]} />
        <meshBasicMaterial color={highlighted ? highlightColor : visualization.colors.z} />
      </mesh>

      {/* Optional coordinate planes */}
      {visualization.showPlanes && (
        <group>
          {/* XY plane */}
          <mesh rotation={[0, 0, 0]}>
            <planeGeometry args={[visualization.planeSize || axisLength, visualization.planeSize || axisLength]} />
            <meshBasicMaterial
              color="#0000ff"
              transparent
              opacity={visualization.planeOpacity || 0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* XZ plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[visualization.planeSize || axisLength, visualization.planeSize || axisLength]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={visualization.planeOpacity || 0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* YZ plane */}
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[visualization.planeSize || axisLength, visualization.planeSize || axisLength]} />
            <meshBasicMaterial
              color="#ff0000"
              transparent
              opacity={visualization.planeOpacity || 0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Label */}
      {visualization.showLabel && (
        <Html
          position={[
            visualization.labelOffset?.x || 0,
            visualization.labelOffset?.y || axisLength * 1.3,
            visualization.labelOffset?.z || 0,
          ]}
          center
          style={{
            fontSize: visualization.labelSize,
            color: highlighted ? highlightColor : '#ffffff',
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '2px 6px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {name}
        </Html>
      )}
    </group>
  );
}

interface FrameConnectionProps {
  from: CoordinateFrameState;
  to: CoordinateFrameState;
  color: string;
  dashed?: boolean;
}

export function FrameConnection({ from, to, color, dashed }: FrameConnectionProps) {
  return (
    <Line
      points={[from.position, to.position]}
      color={color}
      lineWidth={1}
      dashed={dashed}
      dashSize={0.05}
      gapSize={0.03}
    />
  );
}
