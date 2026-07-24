/**
 * LinearMotionPreview Component
 *
 * Visualizes a planned linear (straight-line) motion in Cartesian space.
 * Uses the kinematics system to compute FK for each waypoint and displays:
 * - The Cartesian path as a line
 * - Waypoint markers with status coloring
 * - Ghost robots at key positions
 * - Workspace analysis visualization
 *
 * This component is useful for previewing linear motion before execution.
 */

import * as React from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { GhostRobot, GhostRobotTrajectory, type GhostStatus } from './GhostRobot';
import { useHybridSolver } from '../kinematics/useTrajx';
import {
  planLinearMotion,
  type LinearMotionConfig,
} from '../kinematics/linear-motion';
import type { Pose, Vector3Like, Vector3 } from '../types';
import type { LinearMotionResult, WorkspaceAnalysis } from '../kinematics/types';

// ============================================================================
// Types
// ============================================================================

/** Euler angles tuple */
export type EulerTuple = [number, number, number];

/** Quaternion tuple */
export type QuaternionTuple = [number, number, number, number];

/** Mesh data map */
export type MeshDataMap = Record<string, string>;

/**
 * Path point with analysis
 */
export interface PathPoint {
  /** Index in path */
  index: number;
  /** Joint angles */
  joints: number[];
  /** End-effector pose */
  pose: Pose;
  /** Workspace analysis */
  workspace: WorkspaceAnalysis | null;
  /** Status for visualization */
  status: GhostStatus;
  /** Position error from IK (meters) */
  positionError?: number;
}

/**
 * Segment of the path for visualization
 */
export interface PathSegment {
  /** Start point */
  from: Vector3;
  /** End point */
  to: Vector3;
  /** Segment status */
  status: GhostStatus;
  /** Segment index */
  index: number;
}

export interface LinearMotionPreviewProps {
  /** Robot ID for kinematics */
  robotId: string;
  /** Robot name for solver creation (deprecated - use urdfContent instead) */
  robotName?: string;
  /** URDF content for solver creation (preferred) - for internal FK/workspace analysis */
  solverUrdfContent?: string;
  /** Starting joint configuration */
  startJoints: number[];
  /** Target end-effector pose */
  targetPose: Pose;
  /** URDF path for ghost visualization */
  urdfPath?: string;
  /** URDF content */
  urdfContent?: string;
  /** Mesh data */
  meshData?: MeshDataMap;

  // Robot base transform
  /** Robot base position */
  position?: Vector3Like;
  /** Robot base rotation (Euler) */
  rotation?: EulerTuple;
  /** Robot base quaternion */
  quaternion?: QuaternionTuple;
  /** Scale */
  scale?: number | [number, number, number];
  /** Up axis */
  upAxis?: 'Y' | 'Z';

  // Planning config
  /** Linear motion planning config */
  planningConfig?: Partial<LinearMotionConfig>;
  /** Number of ghost keyframes to show */
  keyframeCount?: number;

  // Visualization options
  /** Show the Cartesian path line */
  showPath?: boolean;
  /** Path line width */
  pathWidth?: number;
  /** Show waypoint markers */
  showWaypoints?: boolean;
  /** Waypoint marker size */
  waypointSize?: number;
  /** Show ghost robots at keyframes */
  showGhosts?: boolean;
  /** Ghost opacity */
  ghostOpacity?: number;
  /** Show start ghost */
  showStartGhost?: boolean;
  /** Show end ghost */
  showEndGhost?: boolean;
  /** Color path by status */
  colorByStatus?: boolean;
  /** Default path color */
  pathColor?: string;

  // Callbacks
  /** Called when planning completes */
  onPlanningComplete?: (result: LinearMotionResult, points: PathPoint[]) => void;
  /** Called when a waypoint is clicked */
  onWaypointClick?: (index: number, point: PathPoint) => void;
  /** Called when a ghost is clicked */
  onGhostClick?: (index: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_COLORS: Record<GhostStatus, string> = {
  valid: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
  neutral: '#88aaff',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine status from workspace analysis
 */
function getStatusFromWorkspace(
  workspace: WorkspaceAnalysis | null,
  hasError: boolean
): GhostStatus {
  if (hasError) return 'error';
  if (!workspace) return 'neutral';
  if (workspace.isNearSingular) return 'error';
  if (workspace.manipulability < 0.01) return 'warning';
  if (workspace.jointLimitMargins.some((m) => m < 0.1)) return 'warning';
  return 'valid';
}

/**
 * Sample indices for keyframes
 */
function sampleKeyframeIndices(totalPoints: number, keyframeCount: number): number[] {
  if (totalPoints <= keyframeCount) {
    return Array.from({ length: totalPoints }, (_, i) => i);
  }

  const indices: number[] = [0]; // Always include start
  const step = (totalPoints - 1) / (keyframeCount - 1);

  for (let i = 1; i < keyframeCount - 1; i++) {
    indices.push(Math.round(i * step));
  }

  indices.push(totalPoints - 1); // Always include end
  return indices;
}

// ============================================================================
// Component
// ============================================================================

export function LinearMotionPreview({
  robotId,
  robotName,
  solverUrdfContent,
  startJoints,
  targetPose,
  urdfPath,
  urdfContent,
  meshData,
  position,
  rotation,
  quaternion,
  scale,
  upAxis = 'Z',
  planningConfig,
  keyframeCount = 5,
  showPath = true,
  pathWidth = 2,
  showWaypoints = true,
  waypointSize = 0.01,
  showGhosts = true,
  ghostOpacity = 0.3,
  showStartGhost = true,
  showEndGhost = true,
  colorByStatus = true,
  pathColor = '#88aaff',
  onPlanningComplete,
  onWaypointClick,
  onGhostClick,
}: LinearMotionPreviewProps): React.JSX.Element | null {
  // Solver - use useHybridSolver (which supports URDF content)
  const { ready, fk: hybridFk, jointLimits } = useHybridSolver({
    robotId,
    urdfContent: solverUrdfContent || urdfContent || null,
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

  // Wrapper for FK
  const fk = useCallback(
    (joints: number[]) => hybridFk(joints),
    [hybridFk]
  );

  // State
  const [planResult, setPlanResult] = useState<LinearMotionResult | null>(null);
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  // Plan linear motion when inputs change
  useEffect(() => {
    if (!ready) return;

    setIsPlanning(true);

    try {
      // Plan the motion
      const result = planLinearMotion(robotId, startJoints, targetPose, planningConfig);
      setPlanResult(result);

      // Process path points with workspace analysis
      const points: PathPoint[] = result.path.map((joints, index) => {
        const fkResult = fk(joints);
        const workspace = analyzeWorkspace(joints);
        const cartesianPose = result.cartesianPath[index] || fkResult?.pose;

        const hasError = result.unreachableSegments?.some((s) => s.index === index);

        return {
          index,
          joints,
          pose: cartesianPose || {
            position: { x: 0, y: 0, z: 0 },
            orientation: { x: 0, y: 0, z: 0, w: 1 },
          },
          workspace,
          status: getStatusFromWorkspace(workspace, hasError || false),
          positionError: undefined,
        };
      });

      setPathPoints(points);
      onPlanningComplete?.(result, points);
    } catch (error) {
      console.error('Linear motion planning failed:', error);
      setPlanResult(null);
      setPathPoints([]);
    } finally {
      setIsPlanning(false);
    }
  }, [
    ready,
    robotId,
    startJoints,
    targetPose,
    planningConfig,
    fk,
    analyzeWorkspace,
    onPlanningComplete,
  ]);

  // Compute path segments for colored line rendering
  const pathSegments = useMemo((): PathSegment[] => {
    if (pathPoints.length < 2) return [];

    const segments: PathSegment[] = [];
    for (let i = 1; i < pathPoints.length; i++) {
      const from = pathPoints[i - 1].pose.position;
      const to = pathPoints[i].pose.position;
      segments.push({
        from: { x: from.x, y: from.y, z: from.z },
        to: { x: to.x, y: to.y, z: to.z },
        status: pathPoints[i].status,
        index: i,
      });
    }
    return segments;
  }, [pathPoints]);

  // Get keyframe indices
  const keyframeIndices = useMemo(() => {
    return sampleKeyframeIndices(pathPoints.length, keyframeCount);
  }, [pathPoints.length, keyframeCount]);

  // Build keyframe data for GhostRobotTrajectory
  const keyframes = useMemo(() => {
    return keyframeIndices.map((idx) => {
      const point = pathPoints[idx];
      return {
        jointAngles: point?.joints || [],
        status: point?.status || 'neutral',
        label: idx === 0 ? 'Start' : idx === pathPoints.length - 1 ? 'End' : undefined,
      };
    });
  }, [keyframeIndices, pathPoints]);

  // Don't render while planning
  if (isPlanning || !planResult || pathPoints.length === 0) {
    return null;
  }

  // Check if planning failed
  if (!planResult.success && pathPoints.length < 2) {
    // Show error indicator at target
    return (
      <group
        position={[
          targetPose.position.x,
          targetPose.position.y,
          targetPose.position.z,
        ]}
      >
        <mesh>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color={STATUS_COLORS.error} transparent opacity={0.8} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      {/* Path line */}
      {showPath && pathSegments.length > 0 && (
        <>
          {colorByStatus ? (
            // Render segments with status coloring
            pathSegments.map((segment, i) => (
              <Line
                key={`segment-${i}`}
                points={[
                  [segment.from.x, segment.from.y, segment.from.z],
                  [segment.to.x, segment.to.y, segment.to.z],
                ]}
                color={STATUS_COLORS[segment.status]}
                lineWidth={pathWidth}
                transparent
                opacity={0.8}
              />
            ))
          ) : (
            // Single color path
            <Line
              points={pathPoints.map((p) => [
                p.pose.position.x,
                p.pose.position.y,
                p.pose.position.z,
              ])}
              color={pathColor}
              lineWidth={pathWidth}
              transparent
              opacity={0.8}
            />
          )}
        </>
      )}

      {/* Waypoint markers */}
      {showWaypoints &&
        pathPoints.map((point, index) => (
          <mesh
            key={`waypoint-${index}`}
            position={[
              point.pose.position.x,
              point.pose.position.y,
              point.pose.position.z,
            ]}
            onClick={(e) => {
              e.stopPropagation();
              onWaypointClick?.(index, point);
            }}
          >
            <sphereGeometry args={[waypointSize, 8, 8]} />
            <meshBasicMaterial
              color={STATUS_COLORS[point.status]}
              transparent
              opacity={index === 0 || index === pathPoints.length - 1 ? 1 : 0.5}
            />
          </mesh>
        ))}

      {/* Ghost robots at keyframes */}
      {showGhosts && (urdfPath || urdfContent) && keyframes.length > 0 && (
        <GhostRobotTrajectory
          urdfPath={urdfPath}
          urdfContent={urdfContent}
          meshData={meshData}
          keyframes={keyframes.slice(
            showStartGhost ? 0 : 1,
            showEndGhost ? undefined : -1
          )}
          position={position}
          rotation={rotation}
          quaternion={quaternion}
          scale={scale}
          upAxis={upAxis}
          opacity={ghostOpacity}
          showTrajectoryLines={false}
          onKeyframeClick={onGhostClick}
        />
      )}

      {/* Start marker */}
      {pathPoints.length > 0 && (
        <mesh
          position={[
            pathPoints[0].pose.position.x,
            pathPoints[0].pose.position.y,
            pathPoints[0].pose.position.z,
          ]}
        >
          <sphereGeometry args={[waypointSize * 1.5, 16, 16]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}

      {/* End marker */}
      {pathPoints.length > 1 && (
        <mesh
          position={[
            pathPoints[pathPoints.length - 1].pose.position.x,
            pathPoints[pathPoints.length - 1].pose.position.y,
            pathPoints[pathPoints.length - 1].pose.position.z,
          ]}
        >
          <sphereGeometry args={[waypointSize * 1.5, 16, 16]} />
          <meshBasicMaterial
            color={planResult.success ? '#0088ff' : STATUS_COLORS.error}
          />
        </mesh>
      )}

      {/* Unreachable segment indicators */}
      {planResult.unreachableSegments?.map((segment, i) => (
        <mesh
          key={`unreachable-${i}`}
          position={[
            segment.pose.position.x,
            segment.pose.position.y,
            segment.pose.position.z,
          ]}
        >
          <octahedronGeometry args={[waypointSize * 2]} />
          <meshBasicMaterial
            color={STATUS_COLORS.error}
            transparent
            opacity={0.8}
            wireframe
          />
        </mesh>
      ))}
    </group>
  );
}

export default LinearMotionPreview;
