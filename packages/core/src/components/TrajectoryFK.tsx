/**
 * TrajectoryFK Component
 *
 * Enhanced trajectory visualization that uses Forward Kinematics
 * to compute the actual end-effector path from joint-space trajectory.
 *
 * Features:
 * - Real FK computation for accurate path visualization
 * - Workspace analysis at each waypoint
 * - Status-based path coloring (singularity, joint limits)
 * - Manipulability visualization
 * - Current position tracking during playback
 */

import * as React from 'react';
import { useMemo, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useHybridSolver } from '../kinematics/useTrajx';
import type { Pose, TrajectoryData } from '../types';
import type { WorkspaceAnalysis } from '../kinematics/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Computed waypoint with FK results
 */
export interface TrajectoryWaypoint {
  /** Time stamp */
  time: number;
  /** Original joint angles */
  joints: number[];
  /** Computed end-effector pose */
  pose: Pose;
  /** World position as Vector3 */
  position: THREE.Vector3;
  /** Workspace analysis at this configuration */
  workspace: WorkspaceAnalysis | null;
  /** Status based on workspace analysis */
  status: 'valid' | 'warning' | 'error';
  /** Manipulability value */
  manipulability: number;
}

/**
 * Path segment for colored rendering
 */
interface PathSegment {
  from: THREE.Vector3;
  to: THREE.Vector3;
  status: 'valid' | 'warning' | 'error';
}

export interface TrajectoryFKProps {
  /** Robot ID for kinematics */
  robotId: string;
  /** Robot name for solver creation (deprecated - use urdfContent instead) */
  robotName?: string;
  /** URDF content for solver creation (preferred over robotName) */
  urdfContent?: string;

  /** Trajectory data with joint positions over time */
  trajectoryData: TrajectoryData;

  // Visualization options
  /** Show the path line */
  showPath?: boolean;
  /** Path line width */
  pathWidth?: number;
  /** Show waypoint markers */
  showWaypoints?: boolean;
  /** Waypoint marker size */
  waypointSize?: number;
  /** Color path by workspace status */
  colorByStatus?: boolean;
  /** Default path color (when not using status coloring) */
  pathColor?: string;
  /** Show manipulability as tube radius */
  showManipulability?: boolean;
  /** Max tube radius for manipulability visualization */
  maxTubeRadius?: number;
  /** Show velocity vectors */
  showVelocity?: boolean;

  // Playback
  /** Current playback time (0 to duration) */
  currentTime?: number;
  /** Show current position indicator */
  showCurrentPosition?: boolean;

  // Status thresholds
  /** Singularity threshold (default: 0.01) */
  singularityThreshold?: number;
  /** Joint limit warning threshold (default: 0.1) */
  jointLimitWarningThreshold?: number;

  // Callbacks
  /** Called when trajectory is computed */
  onComputed?: (waypoints: TrajectoryWaypoint[]) => void;
  /** Called when waypoint is clicked */
  onWaypointClick?: (index: number, waypoint: TrajectoryWaypoint) => void;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS = {
  valid: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine status from workspace analysis
 */
function getStatus(
  workspace: WorkspaceAnalysis | null,
  singularityThreshold: number,
  jointLimitThreshold: number
): 'valid' | 'warning' | 'error' {
  if (!workspace) return 'warning';
  if (workspace.isNearSingular || workspace.minSingularValue < singularityThreshold) {
    return 'error';
  }
  if (workspace.manipulability < 0.01) return 'warning';
  if (workspace.jointLimitMargins.some((m) => m < jointLimitThreshold)) {
    return 'warning';
  }
  return 'valid';
}

/**
 * Interpolate position on path at given time
 */
function interpolatePosition(
  waypoints: TrajectoryWaypoint[],
  time: number,
  duration: number
): THREE.Vector3 | null {
  if (waypoints.length === 0) return null;
  if (waypoints.length === 1) return waypoints[0].position.clone();

  // Find surrounding waypoints
  const normalizedTime = Math.max(0, Math.min(1, time / duration));
  const targetTime = normalizedTime * duration;

  let prevIndex = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    if (waypoints[i + 1].time > targetTime) {
      prevIndex = i;
      break;
    }
    prevIndex = i;
  }

  const nextIndex = Math.min(prevIndex + 1, waypoints.length - 1);
  const prev = waypoints[prevIndex];
  const next = waypoints[nextIndex];

  if (prevIndex === nextIndex) return prev.position.clone();

  // Interpolate
  const segmentDuration = next.time - prev.time;
  const t = segmentDuration > 0 ? (targetTime - prev.time) / segmentDuration : 0;

  return new THREE.Vector3().lerpVectors(prev.position, next.position, t);
}

// ============================================================================
// Sub-Components
// ============================================================================

function WaypointMarker({
  position,
  status,
  size,
  isFirst,
  isLast,
  onClick,
}: {
  position: THREE.Vector3;
  status: 'valid' | 'warning' | 'error';
  size: number;
  isFirst: boolean;
  isLast: boolean;
  onClick?: () => void;
}) {
  const actualSize = isFirst || isLast ? size * 1.5 : size;
  const color = isFirst ? '#00ff00' : isLast ? '#0088ff' : STATUS_COLORS[status];

  return (
    <mesh
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <sphereGeometry args={[actualSize, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
        transparent
        opacity={isFirst || isLast ? 1 : 0.7}
      />
    </mesh>
  );
}

function CurrentPositionIndicator({
  position,
}: {
  position: THREE.Vector3;
}) {
  return (
    <group position={position}>
      {/* Main sphere */}
      <mesh>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial
          color="#ff4444"
          emissive="#ff4444"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Pulse ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.02, 0.025, 32]} />
        <meshBasicMaterial
          color="#ff4444"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Vertical indicator */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.002, 0.002, 0.06, 8]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TrajectoryFK({
  robotId,
  robotName,
  urdfContent,
  trajectoryData,
  showPath = true,
  pathWidth = 2,
  showWaypoints = true,
  waypointSize = 0.008,
  colorByStatus = true,
  pathColor = '#88aaff',
  showManipulability = false,
  maxTubeRadius = 0.02,
  showVelocity = false,
  currentTime,
  showCurrentPosition = true,
  singularityThreshold = 0.01,
  jointLimitWarningThreshold = 0.1,
  onComputed,
  onWaypointClick,
}: TrajectoryFKProps): React.JSX.Element | null {
  // Get solver using useHybridSolver (which supports URDF content)
  const {
    ready,
    fk: hybridFk,
    urdfSolver,
    jointLimits,
  } = useHybridSolver({
    robotId,
    urdfContent: urdfContent || null,
    dhRobotName: robotName,
    coordinateSystem: 'Z-up',
  });

  // Simple workspace analysis based on joint limits
  const analyzeWorkspace = useCallback(
    (joints: number[]): WorkspaceAnalysis | null => {
      if (!jointLimits) return null;

      // Calculate joint limit margins
      const jointLimitMargins = joints.map((joint, i) => {
        const lower = jointLimits.lower[i] ?? -Math.PI;
        const upper = jointLimits.upper[i] ?? Math.PI;
        const range = upper - lower;
        const fromLower = (joint - lower) / range;
        const fromUpper = (upper - joint) / range;
        return Math.min(fromLower, fromUpper);
      });

      // Approximate manipulability (simplified - based on joint limit margins)
      const manipulability = jointLimitMargins.reduce((a, b) => a * b, 1);

      return {
        isValid: true,
        manipulability,
        isNearSingular: manipulability < 0.01,
        minSingularValue: manipulability,
        jointLimitMargins,
        conditionNumber: 1 / Math.max(manipulability, 0.001),
      };
    },
    [jointLimits]
  );

  // Computed waypoints
  const [waypoints, setWaypoints] = useState<TrajectoryWaypoint[]>([]);

  // Clamp joints to limits to avoid FK errors
  const clampJoints = useCallback(
    (joints: number[]): number[] => {
      if (!jointLimits) return joints;
      return joints.map((joint, i) => {
        const lower = jointLimits.lower[i] ?? -Math.PI;
        const upper = jointLimits.upper[i] ?? Math.PI;
        return Math.max(lower, Math.min(upper, joint));
      });
    },
    [jointLimits]
  );

  // Compute FK for all trajectory points
  useEffect(() => {
    if (!ready || !hybridFk || !trajectoryData.positions.length) {
      setWaypoints([]);
      return;
    }

    const computed: TrajectoryWaypoint[] = [];

    // Debug: Log first few FK results to verify coordinate system
    const debugEnabled = trajectoryData.positions.length > 0;

    for (let i = 0; i < trajectoryData.positions.length; i++) {
      const rawJoints = trajectoryData.positions[i];
      const time = trajectoryData.times[i];

      // Clamp joints to limits to prevent FK errors
      const joints = clampJoints(rawJoints);

      try {
        // Compute FK using hybrid solver
        const fkResult = hybridFk(joints);
        if (!fkResult) continue;

        // Debug: Log first 3 waypoints to verify FK coordinate system
        if (debugEnabled && i < 3) {
          const wasClamped = rawJoints.some((j, idx) => j !== joints[idx]);
          console.log(`[TrajectoryFK Debug] Waypoint ${i}:`, {
            rawJoints: rawJoints.map(j => j.toFixed(3)),
            clampedJoints: wasClamped ? joints.map(j => j.toFixed(3)) : 'no clamping needed',
            fk: {
              x: fkResult.pose.position.x.toFixed(4),
              y: fkResult.pose.position.y.toFixed(4),
              z: fkResult.pose.position.z.toFixed(4),
            },
          });
        }

        // Analyze workspace
        const workspace = analyzeWorkspace(joints);

        // Determine status - mark as error if original joints were clamped
        const wasClamped = rawJoints.some((j, idx) => j !== joints[idx]);
        const status = wasClamped
          ? 'error'
          : getStatus(workspace, singularityThreshold, jointLimitWarningThreshold);

        computed.push({
          time,
          joints,
          pose: fkResult.pose,
          position: new THREE.Vector3(
            fkResult.pose.position.x,
            fkResult.pose.position.y,
            fkResult.pose.position.z
          ),
          workspace,
          status,
          manipulability: workspace?.manipulability ?? 0,
        });
      } catch (error) {
        // Skip waypoints that fail FK computation
        console.warn(`TrajectoryFK: FK failed for waypoint ${i}:`, error);
      }
    }

    setWaypoints(computed);
    onComputed?.(computed);
  }, [
    ready,
    urdfSolver,
    trajectoryData,
    hybridFk,
    clampJoints,
    analyzeWorkspace,
    singularityThreshold,
    jointLimitWarningThreshold,
    onComputed,
  ]);

  // Compute path segments for colored rendering
  const pathSegments = useMemo((): PathSegment[] => {
    if (waypoints.length < 2) return [];

    const segments: PathSegment[] = [];
    for (let i = 1; i < waypoints.length; i++) {
      segments.push({
        from: waypoints[i - 1].position,
        to: waypoints[i].position,
        status: waypoints[i].status,
      });
    }
    return segments;
  }, [waypoints]);

  // Current position
  const currentPosition = useMemo(() => {
    if (currentTime === undefined || waypoints.length === 0) return null;
    return interpolatePosition(waypoints, currentTime, trajectoryData.duration);
  }, [currentTime, waypoints, trajectoryData.duration]);

  // Don't render if no waypoints
  if (waypoints.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Path line(s) */}
      {showPath && pathSegments.length > 0 && (
        <>
          {colorByStatus ? (
            // Render segments with status coloring
            pathSegments.map((segment, i) => (
              <Line
                key={`segment-${i}`}
                points={[segment.from, segment.to]}
                color={STATUS_COLORS[segment.status]}
                lineWidth={pathWidth}
                transparent
                opacity={0.9}
              />
            ))
          ) : (
            // Single color path
            <Line
              points={waypoints.map((w) => w.position)}
              color={pathColor}
              lineWidth={pathWidth}
              transparent
              opacity={0.9}
            />
          )}
        </>
      )}

      {/* Waypoint markers */}
      {showWaypoints &&
        waypoints.map((waypoint, index) => (
          <WaypointMarker
            key={`waypoint-${index}`}
            position={waypoint.position}
            status={waypoint.status}
            size={waypointSize}
            isFirst={index === 0}
            isLast={index === waypoints.length - 1}
            onClick={() => onWaypointClick?.(index, waypoint)}
          />
        ))}

      {/* Manipulability visualization as varying tube radius */}
      {showManipulability && waypoints.length >= 2 && (
        <group>
          {waypoints.slice(0, -1).map((waypoint, i) => {
            const next = waypoints[i + 1];
            const radius = Math.max(
              0.002,
              (waypoint.manipulability / 0.1) * maxTubeRadius
            );
            const direction = new THREE.Vector3().subVectors(
              next.position,
              waypoint.position
            );
            const length = direction.length();

            if (length < 0.001) return null;

            const midpoint = new THREE.Vector3()
              .addVectors(waypoint.position, next.position)
              .multiplyScalar(0.5);

            return (
              <mesh
                key={`tube-${i}`}
                position={midpoint}
                quaternion={new THREE.Quaternion().setFromUnitVectors(
                  new THREE.Vector3(0, 1, 0),
                  direction.normalize()
                )}
              >
                <cylinderGeometry args={[radius, radius, length, 8]} />
                <meshStandardMaterial
                  color={STATUS_COLORS[waypoint.status]}
                  transparent
                  opacity={0.6}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Current position indicator */}
      {showCurrentPosition && currentPosition && (
        <CurrentPositionIndicator position={currentPosition} />
      )}
    </group>
  );
}

export default TrajectoryFK;
