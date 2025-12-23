/**
 * RoboViz Trajectory Component
 *
 * Visualizes robot trajectories as 3D paths
 */

import * as React from 'react';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useVizStore } from '../store/vizStore';
import type { TrajectoryState } from '../types';

export interface TrajectoryProps {
  /** Trajectory state from store or directly provided */
  state?: TrajectoryState;
  /** Trajectory ID (used to get state from store if state prop not provided) */
  trajectoryId?: string;
  /** Direct props for simple usage */
  id?: string;
  data?: import('../types').TrajectoryData;
  showPath?: boolean;
  pathColor?: string;
  pathWidth?: number;
  /** Whether to show waypoint markers */
  showPoints?: boolean;
  /** Whether to show the path line */
  showLine?: boolean;
  /** Path points in world space (optional, for direct visualization) */
  pathPoints?: THREE.Vector3[];
}

/**
 * Trajectory path visualization
 */
function TrajectoryPath({
  points,
  color = '#00ff88',
  lineWidth = 2,
  dashed = false,
}: {
  points: THREE.Vector3[];
  color?: string;
  lineWidth?: number;
  dashed?: boolean;
}) {
  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={0.05}
      gapSize={0.02}
    />
  );
}

/**
 * Waypoint marker on trajectory
 */
function TrajectoryPoint({
  position,
  color = '#ffff00',
  size = 0.015,
  isHighlighted = false,
}: {
  position: THREE.Vector3;
  color?: string;
  size?: number;
  isHighlighted?: boolean;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[isHighlighted ? size * 1.5 : size, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isHighlighted ? 0.5 : 0.2}
      />
    </mesh>
  );
}

/**
 * Current position indicator
 */
function PositionIndicator({
  position,
  color = '#ff4444',
}: {
  position: THREE.Vector3;
  color?: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Vertical line indicator */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.1, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

/**
 * Velocity vector visualization
 */
function VelocityVector({
  position,
  velocity,
  scale = 0.1,
  color = '#4488ff',
}: {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale?: number;
  color?: string;
}) {
  const length = velocity.length() * scale;
  if (length < 0.001) return null;

  const dir = velocity.clone().normalize();
  const arrow = useRef<THREE.ArrowHelper>(null);

  return (
    <primitive
      ref={arrow}
      object={new THREE.ArrowHelper(dir, position, length, color, 0.02, 0.01)}
    />
  );
}

/**
 * Trajectory component
 */
export function Trajectory({
  state: propState,
  trajectoryId,
  // Direct props
  id,
  data,
  showPath = true,
  pathColor = '#00ff88',
  pathWidth = 2,
  showPoints = false,
  showLine = true,
  pathPoints: directPoints,
}: TrajectoryProps): React.JSX.Element | null {
  const { trajectories, playback } = useVizStore();

  // Build state from direct props if provided
  const directState: TrajectoryState | undefined = (id && data) ? {
    id,
    robotId: '',
    data,
    visualization: {
      showPath,
      pathColor,
      pathWidth,
    },
  } : undefined;

  // Get state from props, direct props, or store
  const state = propState ?? directState ?? (trajectoryId ? trajectories.get(trajectoryId) : undefined);

  // Generate path points from trajectory data or use direct points
  const { points, currentPosition, velocities } = useMemo(() => {
    if (directPoints) {
      return {
        points: directPoints,
        currentPosition: null,
        velocities: [] as THREE.Vector3[],
      };
    }

    if (!state) {
      return { points: [], currentPosition: null, velocities: [] };
    }

    // For now, we'll use the trajectory positions as direct world-space points
    // In a real implementation, this would use FK to compute end-effector positions
    const pts: THREE.Vector3[] = [];
    const vels: THREE.Vector3[] = [];

    // Generate a simple path visualization
    // This is a placeholder - real implementation would compute FK for each configuration
    const { data, visualization } = state;
    const numPoints = data.positions.length;

    for (let i = 0; i < numPoints; i++) {
      const t = data.times[i];
      // Placeholder: create a path based on first 3 joint angles as XYZ
      const pos = data.positions[i];
      const x = 0.4 + 0.2 * Math.sin(pos[0] || 0);
      const y = 0.3 + 0.2 * (pos[1] || 0);
      const z = 0.5 + 0.1 * Math.sin(pos[2] || 0);
      pts.push(new THREE.Vector3(x, z, y)); // Y-up coordinate system

      // Velocity visualization
      if (data.velocities && data.velocities[i]) {
        const vel = data.velocities[i];
        vels.push(new THREE.Vector3(vel[0] || 0, vel[2] || 0, vel[1] || 0).multiplyScalar(0.1));
      }
    }

    // Current position based on playback time
    let currentPos: THREE.Vector3 | null = null;
    if (playback.activeTrajectoryId === state.id && pts.length > 0) {
      const progress = playback.currentTime / data.duration;
      const index = Math.min(Math.floor(progress * (pts.length - 1)), pts.length - 1);
      currentPos = pts[index];
    }

    return { points: pts, currentPosition: currentPos, velocities: vels };
  }, [state, directPoints, playback.activeTrajectoryId, playback.currentTime]);

  if (points.length === 0) {
    return null;
  }

  const visualization = state?.visualization;
  const finalPathColor = visualization?.pathColor ?? pathColor ?? '#00ff88';
  const finalPathWidth = visualization?.pathWidth ?? pathWidth ?? 2;
  const showVelocityVectors = visualization?.showVelocityVectors ?? false;

  return (
    <group>
      {/* Main path line */}
      {showLine && visualization?.showPath !== false && (
        <TrajectoryPath
          points={points}
          color={finalPathColor}
          lineWidth={finalPathWidth}
        />
      )}

      {/* Waypoint markers */}
      {showPoints && points.map((point, index) => (
        <TrajectoryPoint
          key={index}
          position={point}
          color={finalPathColor}
          isHighlighted={index === 0 || index === points.length - 1}
        />
      ))}

      {/* Velocity vectors */}
      {showVelocityVectors && velocities.map((vel, index) => (
        <VelocityVector
          key={index}
          position={points[index]}
          velocity={vel}
        />
      ))}

      {/* Current position indicator */}
      {currentPosition && (
        <PositionIndicator position={currentPosition} />
      )}
    </group>
  );
}
