/**
 * RoboViz Obstacle Component
 *
 * Renders obstacle geometry for visualization.
 * Supports primitive shapes (box, sphere, cylinder) and URDF-based obstacles.
 */

import * as React from 'react';
import * as THREE from 'three';
import type { ObstacleData, PrimitiveObstacle, UrdfObstacle, Vector3, Quaternion } from '../types';

export interface ObstacleProps {
  data: ObstacleData;
  transparent?: boolean;
  opacity?: number;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}

// Convert our Vector3 type to THREE.Vector3
function toThreeVector3(v: Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}

// Convert our Quaternion type to THREE.Quaternion
function toThreeQuaternion(q: Quaternion): THREE.Quaternion {
  return new THREE.Quaternion(q.x, q.y, q.z, q.w);
}

// Convert our Quaternion to Euler angles for group rotation
function quaternionToEuler(q: Quaternion): THREE.Euler {
  const threeQuat = toThreeQuaternion(q);
  return new THREE.Euler().setFromQuaternion(threeQuat);
}

/**
 * Renders a primitive obstacle (box, sphere, or cylinder)
 */
function PrimitiveObstacleComponent({
  data,
  transparent = false,
  opacity = 1,
  onClick,
  onHover,
}: {
  data: PrimitiveObstacle;
  transparent?: boolean;
  opacity?: number;
  onClick?: (id: string) => void;
  onHover?: (id: string | null) => void;
}): React.JSX.Element {
  const [hovered, setHovered] = React.useState(false);

  const position = toThreeVector3(data.transform.position);
  const euler = quaternionToEuler(data.transform.rotation);

  const color = data.color || '#ff6b35';
  const finalOpacity = data.opacity ?? opacity;

  const handlePointerOver = React.useCallback(
    (e: any) => {
      e.stopPropagation?.();
      setHovered(true);
      onHover?.(data.id);
    },
    [data.id, onHover]
  );

  const handlePointerOut = React.useCallback(() => {
    setHovered(false);
    onHover?.(null);
  }, [onHover]);

  const handleClick = React.useCallback(
    (e: any) => {
      e.stopPropagation?.();
      onClick?.(data.id);
    },
    [data.id, onClick]
  );

  // Render the appropriate geometry based on shape
  const renderGeometry = () => {
    const { shape, dimensions } = data.primitive;

    switch (shape) {
      case 'box':
        return <boxGeometry args={[dimensions.x, dimensions.y, dimensions.z]} />;

      case 'sphere':
        // For sphere, use x as radius
        return <sphereGeometry args={[dimensions.x / 2, 32, 32]} />;

      case 'cylinder':
        // For cylinder, x is radius, y is height
        return (
          <cylinderGeometry
            args={[dimensions.x / 2, dimensions.x / 2, dimensions.y, 32]}
          />
        );

      default:
        return <boxGeometry args={[0.1, 0.1, 0.1]} />;
    }
  };

  return (
    <group position={position} rotation={euler}>
      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {renderGeometry()}
        <meshStandardMaterial
          color={hovered ? '#ffaa00' : color}
          transparent={transparent || finalOpacity < 1}
          opacity={finalOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe outline */}
      <lineSegments>
        <edgesGeometry
          args={[
            data.primitive.shape === 'box'
              ? new THREE.BoxGeometry(
                  data.primitive.dimensions.x,
                  data.primitive.dimensions.y,
                  data.primitive.dimensions.z
                )
              : data.primitive.shape === 'sphere'
              ? new THREE.SphereGeometry(data.primitive.dimensions.x / 2, 16, 16)
              : new THREE.CylinderGeometry(
                  data.primitive.dimensions.x / 2,
                  data.primitive.dimensions.x / 2,
                  data.primitive.dimensions.y,
                  16
                ),
          ]}
        />
        <lineBasicMaterial color={hovered ? '#ffffff' : color} opacity={0.8} transparent />
      </lineSegments>
    </group>
  );
}

/**
 * Placeholder for URDF-based obstacle (complex mesh loading)
 * TODO: Implement URDF obstacle loading similar to Robot component
 */
function UrdfObstacleComponent({
  data,
  transparent = false,
  opacity = 1,
}: {
  data: UrdfObstacle;
  transparent?: boolean;
  opacity?: number;
}): React.JSX.Element {
  const position = toThreeVector3(data.transform.position);
  const euler = quaternionToEuler(data.transform.rotation);

  // For now, render a placeholder box
  // Full URDF loading would require the urdf-loader package
  return (
    <group position={position} rotation={euler}>
      <mesh>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial
          color="#888888"
          transparent={transparent || opacity < 1}
          opacity={opacity}
          wireframe
        />
      </mesh>
    </group>
  );
}

/**
 * Obstacle component - renders obstacle geometry for collision visualization
 */
export function Obstacle({
  data,
  transparent = false,
  opacity = 1,
  onClick,
  onHover,
}: ObstacleProps): React.JSX.Element {
  if (data.type === 'primitive') {
    return (
      <PrimitiveObstacleComponent
        data={data}
        transparent={transparent}
        opacity={opacity}
        onClick={onClick}
        onHover={onHover}
      />
    );
  } else if (data.type === 'urdf') {
    return (
      <UrdfObstacleComponent
        data={data}
        transparent={transparent}
        opacity={opacity}
      />
    );
  }

  // Fallback for unknown types
  return <group />;
}
