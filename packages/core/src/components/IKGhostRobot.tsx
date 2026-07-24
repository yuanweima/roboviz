/**
 * IKGhostRobot Component
 *
 * An enhanced ghost robot component that integrates with the kinematics system
 * to provide real-time IK solutions and reachability visualization.
 *
 * Features:
 * - Automatic IK solving for target pose
 * - Multiple IK solution visualization
 * - Reachability status indication
 * - Workspace analysis (manipulability, singularity)
 * - Interactive solution selection
 */

import * as React from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { GhostRobot, type GhostStatus, GHOST_STATUS_COLORS } from './GhostRobot';
import { useHybridSolver } from '../kinematics/useTrajx';
import type { Pose, Vector3Like, Vector3 } from '../types';
import type {
  IkResult,
  MultiIkResult,
  WorkspaceAnalysis,
} from '../kinematics/types';

// ============================================================================
// Types
// ============================================================================

/** Euler angles tuple [x, y, z] in radians */
export type EulerTuple = [number, number, number];

/** Quaternion tuple [x, y, z, w] */
export type QuaternionTuple = [number, number, number, number];

/** Mesh data for loading meshes from memory */
export type MeshDataMap = Record<string, string>;

/**
 * IK solution with metadata
 */
export interface IKSolution {
  /** Joint angles */
  joints: number[];
  /** Position error (meters) */
  positionError: number;
  /** Ghost status based on workspace analysis */
  status: GhostStatus;
  /** Manipulability score */
  manipulability: number;
  /** Whether near singularity */
  isNearSingular: boolean;
  /** Joint limit margins */
  jointLimitMargins: number[];
}

export interface IKGhostRobotProps {
  /** Unique identifier */
  id?: string;

  // Robot configuration
  /** Robot ID for kinematics solver */
  robotId: string;
  /** Robot name for solver creation (deprecated - use solverUrdfContent instead) */
  robotName?: string;
  /** URDF content for solver creation (preferred over robotName) - for IK/workspace analysis */
  solverUrdfContent?: string;
  /** URL path to URDF file (for visualization) */
  urdfPath?: string;
  /** URDF content as string (for visualization) */
  urdfContent?: string;
  /** Mesh data for loading from memory */
  meshData?: MeshDataMap;

  // Target pose
  /** Target end-effector pose for IK */
  targetPose: Pose;
  /** Seed joint configuration for IK solver */
  seedJoints?: number[];

  // Display options
  /** Robot base position */
  position?: Vector3Like;
  /** Robot base rotation (Euler) */
  rotation?: EulerTuple;
  /** Robot base rotation (Quaternion) */
  quaternion?: QuaternionTuple;
  /** Scale factor */
  scale?: number | [number, number, number];
  /** Up axis of URDF model */
  upAxis?: 'Y' | 'Z';
  /** Base opacity */
  opacity?: number;
  /** Show all IK solutions (up to maxSolutions) */
  showAllSolutions?: boolean;
  /** Maximum number of solutions to display */
  maxSolutions?: number;
  /** Currently selected solution index */
  selectedSolution?: number;
  /** Show trajectory line from current position */
  trajectoryFrom?: Vector3Like;
  /** Show axes helper */
  showAxes?: boolean;

  // Thresholds
  /** Singularity threshold (default: 0.01) */
  singularityThreshold?: number;
  /** Joint limit warning threshold (default: 0.1 = 10%) */
  jointLimitWarningThreshold?: number;

  // Callbacks
  /** Called when IK is computed */
  onIKComputed?: (result: {
    success: boolean;
    solutions: IKSolution[];
    bestSolutionIndex: number;
  }) => void;
  /** Called when a solution is clicked */
  onSolutionClick?: (index: number, solution: IKSolution) => void;
  /** Called when a solution is hovered */
  onSolutionHover?: (index: number | null) => void;
  /** Called when reachability changes */
  onReachabilityChange?: (reachable: boolean, reason?: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine ghost status based on workspace analysis
 */
function getStatusFromAnalysis(
  workspace: WorkspaceAnalysis,
  jointLimitWarningThreshold: number
): GhostStatus {
  // Check singularity
  if (workspace.isNearSingular) {
    return 'error';
  }

  // Check joint limit margins
  const hasJointWarning = workspace.jointLimitMargins.some(
    (margin) => margin < jointLimitWarningThreshold
  );
  if (hasJointWarning) {
    return 'warning';
  }

  // Check manipulability
  if (workspace.manipulability < 0.01) {
    return 'warning';
  }

  return 'valid';
}

// ============================================================================
// Component
// ============================================================================

/**
 * IKGhostRobot - Ghost robot with integrated IK solving
 */
export function IKGhostRobot({
  id = 'ik-ghost',
  robotId,
  robotName,
  solverUrdfContent,
  urdfPath,
  urdfContent,
  meshData,
  targetPose,
  seedJoints,
  position,
  rotation,
  quaternion,
  scale,
  upAxis = 'Z',
  opacity = 0.4,
  showAllSolutions = false,
  maxSolutions = 4,
  selectedSolution = 0,
  trajectoryFrom,
  showAxes = false,
  singularityThreshold = 0.01,
  jointLimitWarningThreshold = 0.1,
  onIKComputed,
  onSolutionClick,
  onSolutionHover,
  onReachabilityChange,
}: IKGhostRobotProps): React.JSX.Element | null {
  // Get solver - use useHybridSolver (which supports URDF content)
  const { ready, ikAll: hybridIkAll, jointLimits } = useHybridSolver({
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

  // Wrapper for ikAll
  const ikAll = useCallback(
    (pose: Pose, seed?: number[]): MultiIkResult | null => {
      const result = hybridIkAll(pose, seed);
      if (!result) return null;
      return result;
    },
    [hybridIkAll]
  );

  // State
  const [solutions, setSolutions] = useState<IKSolution[]>([]);
  const [isReachableState, setIsReachableState] = useState<boolean>(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute IK when target changes
  useEffect(() => {
    if (!ready) {
      return;
    }

    // Get all IK solutions
    const multiResult = ikAll(targetPose, seedJoints);

    if (!multiResult || !multiResult.success) {
      setSolutions([]);
      setIsReachableState(false);
      onReachabilityChange?.(false, multiResult?.errorMessage || 'IK failed');
      onIKComputed?.({
        success: false,
        solutions: [],
        bestSolutionIndex: -1,
      });
      return;
    }

    // Process each solution
    const processedSolutions: IKSolution[] = [];

    for (let i = 0; i < multiResult.solutionCount && i < maxSolutions; i++) {
      const joints = multiResult.solutions[i];
      if (!joints) continue;

      // Analyze workspace at this configuration
      const workspace = analyzeWorkspace(joints);
      if (!workspace) continue;

      const status = getStatusFromAnalysis(workspace, jointLimitWarningThreshold);

      processedSolutions.push({
        joints,
        positionError: multiResult.positionErrors[i] || 0,
        status,
        manipulability: workspace.manipulability,
        isNearSingular: workspace.isNearSingular,
        jointLimitMargins: workspace.jointLimitMargins,
      });
    }

    // Sort by manipulability (higher is better) and position error (lower is better)
    processedSolutions.sort((a, b) => {
      // Prioritize non-singular solutions
      if (a.status === 'error' && b.status !== 'error') return 1;
      if (b.status === 'error' && a.status !== 'error') return -1;
      // Then by manipulability
      return b.manipulability - a.manipulability;
    });

    setSolutions(processedSolutions);
    setIsReachableState(processedSolutions.length > 0);

    onReachabilityChange?.(processedSolutions.length > 0);
    onIKComputed?.({
      success: processedSolutions.length > 0,
      solutions: processedSolutions,
      bestSolutionIndex: 0,
    });
  }, [
    ready,
    targetPose,
    seedJoints,
    maxSolutions,
    jointLimitWarningThreshold,
    ikAll,
    analyzeWorkspace,
    onIKComputed,
    onReachabilityChange,
  ]);

  // Handle solution click
  const handleSolutionClick = useCallback(
    (solutionId: string) => {
      const index = parseInt(solutionId.split('-').pop() || '0', 10);
      if (solutions[index]) {
        onSolutionClick?.(index, solutions[index]);
      }
    },
    [solutions, onSolutionClick]
  );

  // Handle solution hover
  const handleSolutionHover = useCallback(
    (solutionId: string | null) => {
      if (solutionId === null) {
        setHoveredIndex(null);
        onSolutionHover?.(null);
      } else {
        const index = parseInt(solutionId.split('-').pop() || '0', 10);
        setHoveredIndex(index);
        onSolutionHover?.(index);
      }
    },
    [onSolutionHover]
  );

  // Don't render if no solutions
  if (!ready || solutions.length === 0) {
    // Render error indicator at target position
    if (!isReachableState && targetPose) {
      return (
        <group
          position={[
            targetPose.position.x,
            targetPose.position.y,
            targetPose.position.z,
          ]}
        >
          {/* Error indicator sphere */}
          <mesh>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshBasicMaterial
              color={GHOST_STATUS_COLORS.error}
              transparent
              opacity={0.6}
            />
          </mesh>
          {/* X mark */}
          <group rotation={[0, 0, Math.PI / 4]}>
            <mesh>
              <boxGeometry args={[0.08, 0.01, 0.01]} />
              <meshBasicMaterial color={GHOST_STATUS_COLORS.error} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.08, 0.01, 0.01]} />
              <meshBasicMaterial color={GHOST_STATUS_COLORS.error} />
            </mesh>
          </group>
        </group>
      );
    }
    return null;
  }

  // Render ghosts
  if (showAllSolutions) {
    // Show all solutions with varying opacity
    return (
      <>
        {solutions.map((solution, index) => {
          const isSelected = index === selectedSolution;
          const isHovered = index === hoveredIndex;
          const solutionOpacity =
            isSelected || isHovered
              ? opacity
              : opacity * (0.3 + 0.7 * (1 - index / solutions.length));

          return (
            <GhostRobot
              key={`${id}-solution-${index}`}
              id={`${id}-solution-${index}`}
              urdfPath={urdfPath}
              urdfContent={urdfContent}
              meshData={meshData}
              jointAngles={solution.joints}
              position={position}
              rotation={rotation}
              quaternion={quaternion}
              scale={scale}
              upAxis={upAxis}
              opacity={solutionOpacity}
              status={solution.status}
              showAxes={showAxes && isSelected}
              trajectoryFrom={isSelected ? trajectoryFrom : undefined}
              onClick={handleSolutionClick}
              onHover={handleSolutionHover}
            />
          );
        })}
      </>
    );
  }

  // Show only selected solution
  const solution = solutions[selectedSolution] || solutions[0];
  if (!solution) return null;

  return (
    <GhostRobot
      id={id}
      urdfPath={urdfPath}
      urdfContent={urdfContent}
      meshData={meshData}
      jointAngles={solution.joints}
      position={position}
      rotation={rotation}
      quaternion={quaternion}
      scale={scale}
      upAxis={upAxis}
      opacity={opacity}
      status={solution.status}
      showAxes={showAxes}
      trajectoryFrom={trajectoryFrom}
      onClick={handleSolutionClick}
      onHover={handleSolutionHover}
    />
  );
}

// ============================================================================
// IK Solution Selector Component
// ============================================================================

export interface IKSolutionSelectorProps {
  /** Available solutions */
  solutions: IKSolution[];
  /** Currently selected index */
  selectedIndex: number;
  /** Callback when selection changes */
  onSelect: (index: number) => void;
}

/**
 * UI component for selecting between IK solutions
 * (This is a headless component - styling should be done in the consuming app)
 */
export function useIKSolutionSelector(props: IKSolutionSelectorProps) {
  const { solutions, selectedIndex, onSelect } = props;

  const selectNext = useCallback(() => {
    if (solutions.length === 0) return;
    onSelect((selectedIndex + 1) % solutions.length);
  }, [solutions.length, selectedIndex, onSelect]);

  const selectPrevious = useCallback(() => {
    if (solutions.length === 0) return;
    onSelect((selectedIndex - 1 + solutions.length) % solutions.length);
  }, [solutions.length, selectedIndex, onSelect]);

  const selectByStatus = useCallback(
    (status: GhostStatus) => {
      const index = solutions.findIndex((s) => s.status === status);
      if (index !== -1) {
        onSelect(index);
      }
    },
    [solutions, onSelect]
  );

  const selectBest = useCallback(() => {
    if (solutions.length === 0) return;
    // Find solution with best manipulability that isn't near singularity
    let bestIndex = 0;
    let bestManipulability = -1;

    solutions.forEach((s, i) => {
      if (!s.isNearSingular && s.manipulability > bestManipulability) {
        bestManipulability = s.manipulability;
        bestIndex = i;
      }
    });

    onSelect(bestIndex);
  }, [solutions, onSelect]);

  return {
    current: solutions[selectedIndex],
    total: solutions.length,
    selectedIndex,
    selectNext,
    selectPrevious,
    selectByStatus,
    selectBest,
    solutions,
  };
}

export default IKGhostRobot;
