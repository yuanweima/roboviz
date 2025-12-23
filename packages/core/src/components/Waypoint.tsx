/**
 * RoboViz Waypoint Component
 *
 * Renders a waypoint marker in 3D space.
 * Waypoints represent robot poses/configurations for path planning.
 */

import * as React from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { WaypointData, Vector3, Quaternion } from '../types';

export interface WaypointProps {
  data: WaypointData;
  selected?: boolean;
  onSelect?: (id: string) => void;
  showLabel?: boolean;
  showAxes?: boolean;
  size?: number;
}

// Convert our Vector3 type to THREE.Vector3
function toThreeVector3(v: Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}

// Convert our Quaternion to Euler angles for group rotation
function quaternionToEuler(q: Quaternion): THREE.Euler {
  const threeQuat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
  return new THREE.Euler().setFromQuaternion(threeQuat);
}

/**
 * Axes helper for showing waypoint orientation
 */
function WaypointAxes({ size = 0.05 }: { size?: number }): React.JSX.Element {
  return (
    <group>
      {/* X axis - red */}
      <mesh position={[size / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, size, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[size, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.006, 0.015, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Y axis - green */}
      <mesh position={[0, size / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.002, 0.002, size, 8]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
      <mesh position={[0, size, 0]}>
        <coneGeometry args={[0.006, 0.015, 8]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>

      {/* Z axis - blue */}
      <mesh position={[0, 0, size / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.002, 0.002, size, 8]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
      <mesh position={[0, 0, size]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.006, 0.015, 8]} />
        <meshBasicMaterial color="#0000ff" />
      </mesh>
    </group>
  );
}

/**
 * Waypoint component - renders a waypoint marker with optional label and orientation axes
 */
export function Waypoint({
  data,
  selected = false,
  onSelect,
  showLabel = true,
  showAxes = true,
  size = 0.03,
}: WaypointProps): React.JSX.Element {
  const [hovered, setHovered] = React.useState(false);

  // Get position from TCP pose if available, otherwise use default position
  const position = data.tcpPose
    ? toThreeVector3(data.tcpPose.position)
    : new THREE.Vector3(0, 0, 0);

  // Get rotation from TCP pose if available
  const rotation = data.tcpPose
    ? quaternionToEuler(data.tcpPose.orientation)
    : new THREE.Euler(0, 0, 0);

  const color = data.color || '#ffff00';
  const label = data.label || data.id;

  const handlePointerOver = React.useCallback(
    (e: any) => {
      e.stopPropagation?.();
      setHovered(true);
    },
    []
  );

  const handlePointerOut = React.useCallback(() => {
    setHovered(false);
  }, []);

  const handleClick = React.useCallback(
    (e: any) => {
      e.stopPropagation?.();
      onSelect?.(data.id);
    },
    [data.id, onSelect]
  );

  // Determine visual state
  const isActive = selected || hovered;
  const sphereColor = isActive ? '#ffffff' : color;
  const sphereScale = isActive ? 1.3 : 1;
  const emissiveIntensity = isActive ? 0.5 : 0.2;

  return (
    <group position={position} rotation={rotation}>
      {/* Main waypoint sphere */}
      <mesh
        scale={sphereScale}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={sphereColor}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          metalness={0.3}
          roughness={0.5}
        />
      </mesh>

      {/* Selection ring */}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.5, size * 1.8, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
      )}

      {/* Hover ring */}
      {hovered && !selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.2, size * 1.4, 32]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.3} />
        </mesh>
      )}

      {/* Orientation axes */}
      {showAxes && <WaypointAxes size={size * 2} />}

      {/* Label */}
      {showLabel && (
        <Text
          position={[0, size * 2.5, 0]}
          fontSize={size * 1.5}
          color={isActive ? '#ffffff' : color}
          anchorX="center"
          anchorY="bottom"
        >
          {label}
        </Text>
      )}

      {/* Vertical line to ground for spatial reference */}
      {position.y > 0.01 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([0, 0, 0, 0, -position.y, 0]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} opacity={0.3} transparent linewidth={1} />
        </line>
      )}

      {/* Ground marker */}
      {position.y > 0.01 && (
        <mesh position={[0, -position.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[size * 0.5, 16]} />
          <meshBasicMaterial color={color} opacity={0.2} transparent side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/**
 * WaypointGroup - renders multiple waypoints with connecting lines
 */
export interface WaypointGroupProps {
  waypoints: WaypointData[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  showLabels?: boolean;
  showAxes?: boolean;
  showConnections?: boolean;
  connectionColor?: string;
}

export function WaypointGroup({
  waypoints,
  selectedId,
  onSelect,
  showLabels = true,
  showAxes = true,
  showConnections = true,
  connectionColor = '#888888',
}: WaypointGroupProps): React.JSX.Element {
  // Build connection line points
  const connectionPoints = React.useMemo(() => {
    if (!showConnections || waypoints.length < 2) return null;

    const points: THREE.Vector3[] = [];
    waypoints.forEach((wp) => {
      if (wp.tcpPose) {
        points.push(toThreeVector3(wp.tcpPose.position));
      }
    });

    if (points.length < 2) return null;
    return points;
  }, [waypoints, showConnections]);

  return (
    <group>
      {/* Connection lines between waypoints */}
      {connectionPoints && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(connectionPoints.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineDashedMaterial
            color={connectionColor}
            dashSize={0.02}
            gapSize={0.01}
            opacity={0.5}
            transparent
          />
        </line>
      )}

      {/* Individual waypoints */}
      {waypoints.map((wp) => (
        <Waypoint
          key={wp.id}
          data={wp}
          selected={wp.id === selectedId}
          onSelect={onSelect}
          showLabel={showLabels}
          showAxes={showAxes}
        />
      ))}
    </group>
  );
}
