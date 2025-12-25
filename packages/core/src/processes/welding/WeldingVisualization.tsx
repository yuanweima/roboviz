/**
 * WeldingVisualization Component
 *
 * 3D visualization for welding process including seam preview,
 * weld path, and torch indicator.
 */

import * as React from 'react';
import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { WeldingSeam } from './types';
import type { Trajectory } from '../../trajectory';

// ============================================================================
// Types
// ============================================================================

export interface WeldingVisualizationProps {
  /** Welding seams to display */
  seams: WeldingSeam[];

  /** Generated trajectory (if any) */
  trajectory?: Trajectory | null;

  /** Currently active seam ID */
  activeSeamId?: string | null;

  /** Display settings */
  settings?: WeldingVisualizationSettings;
}

export interface WeldingVisualizationSettings {
  /** Show seam path lines */
  showSeamPaths: boolean;

  /** Show generated trajectory */
  showTrajectory: boolean;

  /** Show torch cone indicator */
  showTorchCone: boolean;

  /** Seam path color */
  seamColor: string;

  /** Active seam color */
  activeSeamColor: string;

  /** Trajectory color */
  trajectoryColor: string;

  /** Line width for seams */
  seamLineWidth: number;

  /** Line width for trajectory */
  trajectoryLineWidth: number;

  /** Opacity for inactive seams */
  inactiveOpacity: number;
}

const DEFAULT_SETTINGS: WeldingVisualizationSettings = {
  showSeamPaths: true,
  showTrajectory: true,
  showTorchCone: true,
  seamColor: '#ff6600',
  activeSeamColor: '#00ff88',
  trajectoryColor: '#4a9eff',
  seamLineWidth: 3,
  trajectoryLineWidth: 2,
  inactiveOpacity: 0.5,
};

// ============================================================================
// Seam Path Component
// ============================================================================

interface SeamPathProps {
  seam: WeldingSeam;
  isActive: boolean;
  settings: WeldingVisualizationSettings;
}

function SeamPath({ seam, isActive, settings }: SeamPathProps): React.JSX.Element {
  // Extract points from seam edges
  const points = useMemo(() => {
    const allPoints: THREE.Vector3[] = [];

    for (const edge of seam.edges) {
      // Get subset of edge based on startT/endT
      const startIndex = Math.floor(seam.startT * (edge.points.length - 1));
      const endIndex = Math.ceil(seam.endT * (edge.points.length - 1));

      for (let i = startIndex; i <= endIndex; i++) {
        const pt = edge.points[i];
        if (pt) {
          allPoints.push(new THREE.Vector3(...pt.position));
        }
      }
    }

    // Reverse if direction is reverse
    if (seam.direction === 'reverse') {
      allPoints.reverse();
    }

    return allPoints;
  }, [seam]);

  if (points.length < 2) {
    return <group />;
  }

  const color = isActive ? settings.activeSeamColor : settings.seamColor;
  const opacity = isActive ? 1 : settings.inactiveOpacity;

  return (
    <group name={`seam-${seam.id}`}>
      <Line
        points={points}
        color={color}
        lineWidth={settings.seamLineWidth}
        transparent
        opacity={opacity}
      />

      {/* Start marker */}
      <mesh position={points[0]}>
        <sphereGeometry args={[0.003, 16, 16]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>

      {/* End marker */}
      <mesh position={points[points.length - 1]}>
        <sphereGeometry args={[0.003, 16, 16]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Direction arrow */}
      {points.length >= 3 && (
        <DirectionArrow
          start={points[Math.floor(points.length / 2) - 1]}
          end={points[Math.floor(points.length / 2)]}
          color={color}
        />
      )}
    </group>
  );
}

// ============================================================================
// Direction Arrow
// ============================================================================

interface DirectionArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
}

function DirectionArrow({ start, end, color }: DirectionArrowProps): React.JSX.Element {
  const { position, rotation, length } = useMemo(() => {
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Create rotation to align arrow with direction
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    quaternion.setFromUnitVectors(up, direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: midpoint,
      rotation: euler,
      length: start.distanceTo(end),
    };
  }, [start, end]);

  const arrowSize = Math.min(length * 0.3, 0.01);

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <coneGeometry args={[arrowSize * 0.5, arrowSize, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Trajectory Path
// ============================================================================

interface TrajectoryPathDisplayProps {
  trajectory: Trajectory;
  settings: WeldingVisualizationSettings;
}

function TrajectoryPathDisplay({
  trajectory,
  settings,
}: TrajectoryPathDisplayProps): React.JSX.Element | null {
  const points = useMemo(() => {
    return trajectory.waypoints.map((wp) => new THREE.Vector3(...wp.position));
  }, [trajectory.waypoints]);

  if (points.length < 2) {
    return null;
  }

  return (
    <Line
      points={points}
      color={settings.trajectoryColor}
      lineWidth={settings.trajectoryLineWidth}
      dashed
      dashSize={0.01}
      gapSize={0.005}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WeldingVisualization({
  seams,
  trajectory,
  activeSeamId,
  settings: settingsProp,
}: WeldingVisualizationProps): React.JSX.Element {
  const settings = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...settingsProp }),
    [settingsProp]
  );

  return (
    <group name="welding-visualization">
      {/* Seam paths */}
      {settings.showSeamPaths &&
        seams.map((seam) => (
          <SeamPath
            key={seam.id}
            seam={seam}
            isActive={seam.id === activeSeamId}
            settings={settings}
          />
        ))}

      {/* Trajectory */}
      {settings.showTrajectory && trajectory && (
        <TrajectoryPathDisplay trajectory={trajectory} settings={settings} />
      )}
    </group>
  );
}

export default WeldingVisualization;
