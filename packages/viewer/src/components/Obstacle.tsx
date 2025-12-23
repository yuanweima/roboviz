/**
 * Obstacle component for Viewer
 */
import * as React from 'react';
import type { ObstacleState } from '../types';

export interface ObstacleProps {
  data: ObstacleState;
}

export function Obstacle({ data }: ObstacleProps) {
  const { shape, dimensions, position, rotation, color = '#ff4444', opacity = 0.8 } = data;

  const geometry = React.useMemo(() => {
    switch (shape) {
      case 'box':
        return <boxGeometry args={dimensions} />;
      case 'sphere':
        return <sphereGeometry args={[dimensions[0] / 2, 32, 32]} />;
      case 'cylinder':
        return <cylinderGeometry args={[dimensions[0] / 2, dimensions[0] / 2, dimensions[2], 32]} />;
      default:
        return <boxGeometry args={[0.1, 0.1, 0.1]} />;
    }
  }, [shape, dimensions]);

  return (
    <mesh position={position} rotation={rotation}>
      {geometry}
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
