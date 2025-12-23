/**
 * Obstacle - Collision obstacle component
 *
 * Renders collision obstacles for safety visualization.
 *
 * @example
 * ```tsx
 * // Box obstacle
 * <Obstacle
 *   shape="box"
 *   size={[0.2, 0.3, 0.2]}
 *   position={[0.5, 0.15, 0.3]}
 * />
 *
 * // Sphere obstacle
 * <Obstacle
 *   shape="sphere"
 *   size={0.1}
 *   position={[0.3, 0.2, 0.4]}
 *   color="#ff4444"
 * />
 *
 * // Cylinder obstacle
 * <Obstacle
 *   shape="cylinder"
 *   size={[0.1, 0.3]}
 *   position={[0, 0.15, 0.5]}
 * />
 * ```
 */

import * as React from 'react';
import { Obstacle as CoreObstacle, type PrimitiveObstacle } from '@aspect/roboviz-core';

export interface ObstacleProps {
  /** Unique identifier */
  id?: string;

  /** Obstacle shape */
  shape: 'box' | 'sphere' | 'cylinder';

  /**
   * Size of the obstacle:
   * - box: [width, height, depth]
   * - sphere: radius (number)
   * - cylinder: [radius, height]
   */
  size: number | [number, number] | [number, number, number];

  /** Position [x, y, z] */
  position?: [number, number, number];

  /** Rotation in radians [x, y, z] */
  rotation?: [number, number, number];

  /** Color (default: '#ff4444') */
  color?: string;

  /** Opacity (0-1, default: 0.6) */
  opacity?: number;

  /** Highlight when in collision */
  highlight?: boolean;

  /** Called when clicked */
  onClick?: (id: string) => void;

  /** Called when hovered */
  onHover?: (id: string | null) => void;
}

/**
 * Obstacle - Visual collision obstacle
 */
export function Obstacle({
  id,
  shape,
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = '#ff4444',
  opacity = 0.6,
  highlight = false,
  onClick,
  onHover,
}: ObstacleProps): React.JSX.Element {
  // Generate stable ID
  const obstacleId = React.useMemo(
    () => id || `obstacle_${Math.random().toString(36).slice(2, 9)}`,
    [id]
  );

  // Convert size to dimensions
  const dimensions = React.useMemo(() => {
    if (typeof size === 'number') {
      // Sphere: uniform size
      return { x: size * 2, y: size * 2, z: size * 2 };
    } else if (size.length === 2) {
      // Cylinder: [radius, height]
      return { x: size[0] * 2, y: size[1], z: size[0] * 2 };
    } else {
      // Box: [width, height, depth]
      return { x: size[0], y: size[1], z: size[2] };
    }
  }, [size]);

  // Convert rotation to quaternion (simplified - just use identity for now)
  const quaternion = { w: 1, x: 0, y: 0, z: 0 };

  // Create obstacle data
  const obstacleData: PrimitiveObstacle = {
    id: obstacleId,
    type: 'primitive',
    primitive: {
      shape,
      dimensions,
    },
    transform: {
      position: { x: position[0], y: position[1], z: position[2] },
      rotation: quaternion,
    },
    color,
    opacity,
  };

  return (
    <CoreObstacle
      data={obstacleData}
      transparent
      opacity={highlight ? 0.9 : opacity}
      onClick={onClick}
      onHover={onHover}
    />
  );
}

export default Obstacle;
