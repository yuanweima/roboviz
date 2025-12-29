/**
 * PathVisualizer Component
 *
 * Visualizes planned paths in 3D space.
 * Shows path line, waypoints, and endpoints.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { PathWaypoint, PathVisualizationOptions } from '../types';
import { DEFAULT_PATH_VISUALIZATION } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PathVisualizerProps {
  /** Path waypoints with FK-computed TCP positions */
  pathPositions: Array<[number, number, number]>;
  /** Visualization options */
  options?: Partial<PathVisualizationOptions>;
  /** Current playback position (0-1) */
  playbackPosition?: number;
  /** Selected waypoint index */
  selectedIndex?: number | null;
  /** Click handler for waypoints */
  onWaypointClick?: (index: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export function PathVisualizer({
  pathPositions,
  options: userOptions,
  playbackPosition = 0,
  selectedIndex = null,
  onWaypointClick,
}: PathVisualizerProps) {
  const options = { ...DEFAULT_PATH_VISUALIZATION, ...userOptions };

  // Create path geometry
  const pathGeometry = useMemo(() => {
    if (pathPositions.length < 2) return null;

    const points = pathPositions.map(
      ([x, y, z]) => new THREE.Vector3(x, y, z)
    );

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    const linePoints = curve.getPoints(Math.max(50, pathPositions.length * 5));

    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [pathPositions]);

  // Current position marker
  const currentPosition = useMemo(() => {
    if (pathPositions.length < 2) return null;

    const index = Math.min(
      Math.floor(playbackPosition * (pathPositions.length - 1)),
      pathPositions.length - 1
    );
    const nextIndex = Math.min(index + 1, pathPositions.length - 1);

    const t = (playbackPosition * (pathPositions.length - 1)) % 1;

    const [x1, y1, z1] = pathPositions[index];
    const [x2, y2, z2] = pathPositions[nextIndex];

    return [
      x1 + (x2 - x1) * t,
      y1 + (y2 - y1) * t,
      z1 + (z2 - z1) * t,
    ] as [number, number, number];
  }, [pathPositions, playbackPosition]);

  if (pathPositions.length === 0) return null;

  return (
    <group name="path-visualizer">
      {/* Path line */}
      {options.showPath && pathGeometry && (
        <line>
          <bufferGeometry attach="geometry" {...pathGeometry} />
          <lineBasicMaterial
            attach="material"
            color={options.pathColor}
            linewidth={options.pathWidth}
            transparent
            opacity={0.8}
          />
        </line>
      )}

      {/* Waypoint markers */}
      {options.showWaypoints &&
        pathPositions.map((pos, index) => {
          const isSelected = index === selectedIndex;
          const isEndpoint = index === 0 || index === pathPositions.length - 1;

          // Skip non-endpoints if there are too many waypoints
          if (!isEndpoint && !isSelected && pathPositions.length > 20 && index % 5 !== 0) {
            return null;
          }

          return (
            <mesh
              key={index}
              position={pos}
              onClick={(e) => {
                e.stopPropagation();
                onWaypointClick?.(index);
              }}
            >
              <sphereGeometry args={[options.waypointSize * (isSelected ? 1.5 : 1), 16, 8]} />
              <meshBasicMaterial
                color={isSelected ? '#ffffff' : isEndpoint ? '#22c55e' : options.pathColor}
                transparent
                opacity={isSelected ? 1 : 0.7}
              />
            </mesh>
          );
        })}

      {/* Start marker */}
      {options.showEndpoints && pathPositions.length > 0 && (
        <group position={pathPositions[0]}>
          <mesh>
            <sphereGeometry args={[options.waypointSize * 2, 16, 8]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[options.waypointSize * 1.5, options.waypointSize * 3, 8]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      )}

      {/* Goal marker */}
      {options.showEndpoints && pathPositions.length > 1 && (
        <group position={pathPositions[pathPositions.length - 1]}>
          <mesh>
            <sphereGeometry args={[options.waypointSize * 2, 16, 8]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.9} />
          </mesh>
          <mesh>
            <octahedronGeometry args={[options.waypointSize * 1.5]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      )}

      {/* Current position marker (during animation) */}
      {options.animatePath && currentPosition && (
        <mesh position={currentPosition}>
          <sphereGeometry args={[options.waypointSize * 2.5, 16, 8]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

export default PathVisualizer;
