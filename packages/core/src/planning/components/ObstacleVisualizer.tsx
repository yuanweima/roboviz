/**
 * ObstacleVisualizer Component
 *
 * Visualizes obstacles for motion planning.
 * Supports box, sphere, cylinder, and mesh obstacles.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { PlanningObstacle, ObstacleVisualizationOptions } from '../types';
import { DEFAULT_OBSTACLE_VISUALIZATION } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ObstacleVisualizerProps {
  /** Obstacles to visualize */
  obstacles: PlanningObstacle[];
  /** Visualization options */
  options?: Partial<ObstacleVisualizationOptions>;
  /** IDs of obstacles currently in collision */
  collidingIds?: Set<string>;
  /** Selected obstacle ID */
  selectedId?: string | null;
  /** Click handler */
  onObstacleClick?: (obstacle: PlanningObstacle) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ObstacleVisualizer({
  obstacles,
  options: userOptions,
  collidingIds = new Set(),
  selectedId = null,
  onObstacleClick,
}: ObstacleVisualizerProps) {
  const options = { ...DEFAULT_OBSTACLE_VISUALIZATION, ...userOptions };

  if (!options.showObstacles) return null;

  return (
    <group name="obstacle-visualizer">
      {obstacles.map((obstacle) => {
        if (!obstacle.enabled) return null;

        const isColliding = collidingIds.has(obstacle.id);
        const isSelected = obstacle.id === selectedId;
        const color = isColliding ? options.collisionColor : obstacle.color || '#888888';

        return (
          <ObstacleMesh
            key={obstacle.id}
            obstacle={obstacle}
            color={color}
            opacity={options.opacity}
            wireframe={options.wireframe}
            isSelected={isSelected}
            onClick={() => onObstacleClick?.(obstacle)}
          />
        );
      })}
    </group>
  );
}

// ============================================================================
// Obstacle Mesh Component
// ============================================================================

interface ObstacleMeshProps {
  obstacle: PlanningObstacle;
  color: string;
  opacity: number;
  wireframe: boolean;
  isSelected: boolean;
  onClick?: () => void;
}

function ObstacleMesh({
  obstacle,
  color,
  opacity,
  wireframe,
  isSelected,
  onClick,
}: ObstacleMeshProps) {
  const rotation = useMemo(() => {
    if (!obstacle.rotation) return undefined;
    const [x, y, z, w] = obstacle.rotation;
    const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(x, y, z, w));
    return euler;
  }, [obstacle.rotation]);

  const geometry = useMemo(() => {
    switch (obstacle.type) {
      case 'box': {
        const [width, height, depth] = obstacle.dimensions;
        return <boxGeometry args={[width, height, depth]} />;
      }
      case 'sphere': {
        const [radius] = obstacle.dimensions;
        return <sphereGeometry args={[radius, 32, 16]} />;
      }
      case 'cylinder': {
        const [radius, height] = obstacle.dimensions;
        return <cylinderGeometry args={[radius, radius, height, 32]} />;
      }
      default:
        return <boxGeometry args={[0.1, 0.1, 0.1]} />;
    }
  }, [obstacle.type, obstacle.dimensions]);

  return (
    <group position={obstacle.position} rotation={rotation}>
      {/* Main mesh */}
      <mesh onClick={onClick}>
        {geometry}
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          wireframe={wireframe}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Selection outline */}
      {isSelected && (
        <mesh>
          {geometry}
          <meshBasicMaterial
            color="#ffffff"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      {/* Wireframe overlay for depth perception */}
      {!wireframe && (
        <mesh>
          {geometry}
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={0.1}
          />
        </mesh>
      )}
    </group>
  );
}

export default ObstacleVisualizer;
