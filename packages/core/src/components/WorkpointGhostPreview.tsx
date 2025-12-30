/**
 * WorkpointGhostPreview Component
 *
 * Complete solution for workpoint → IK → Ghost visualization.
 * Combines useWorkpointIK hook with GhostRobot component for a
 * declarative, easy-to-use interface.
 *
 * This component eliminates the need to manually:
 * - Initialize IK solvers
 * - Subscribe to workpoint changes
 * - Compute IK and manage state
 * - Render and configure GhostRobot
 */

import React from 'react';
import { GhostRobot, type GhostRobotProps, type GhostStatus } from './GhostRobot';
import { useWorkpointIK, type UseWorkpointIKOptions } from '../hooks/useWorkpointIK';
import type { TCPOffset } from '../coordinates/types';
import type { StatusThresholds } from '../kinematics/unified-types';

// =============================================================================
// Types
// =============================================================================

export interface WorkpointGhostPreviewProps {
  /**
   * Robot ID for the IK solver.
   */
  robotId: string;

  /**
   * URDF content for the robot.
   * Required for both IK computation and ghost rendering.
   */
  urdfContent: string;

  /**
   * Workpoint ID to visualize.
   * When null, ghost is hidden.
   */
  workpointId?: string | null;

  /**
   * Whether to use the workpoint store's selectedWorkpointId.
   * When true, workpointId prop is ignored.
   * @default false
   */
  useStoreSelection?: boolean;

  /**
   * Tool TCP offset from flange (Z-up).
   * When provided, IK targets the TCP position.
   */
  toolOffset?: TCPOffset;

  /**
   * Seed joints for IK computation.
   */
  seedJoints?: number[];

  /**
   * Custom thresholds for status computation.
   */
  statusThresholds?: Partial<StatusThresholds>;

  /**
   * Ghost opacity (0-1).
   * @default 0.4
   */
  opacity?: number;

  /**
   * Override ghost color (uses status color if not provided).
   */
  color?: string;

  /**
   * Whether to show axes on ghost.
   * @default false
   */
  showAxes?: boolean;

  /**
   * Whether to show label on ghost.
   * @default false
   */
  showLabel?: boolean;

  /**
   * Custom label for ghost.
   */
  label?: string;

  /**
   * Position of the ghost robot base.
   * Should match the real robot position.
   */
  position?: [number, number, number];

  /**
   * Quaternion rotation of the ghost robot base.
   */
  quaternion?: [number, number, number, number];

  /**
   * Scale of the ghost robot.
   */
  scale?: number | [number, number, number];

  /**
   * Callback when IK result changes.
   */
  onIKChange?: (result: {
    success: boolean;
    joints: number[] | null;
    status: GhostStatus;
    positionError: number | null;
  }) => void;

  /**
   * Callback when ghost is clicked.
   */
  onClick?: (id: string) => void;

  /**
   * Callback when ghost is hovered.
   */
  onHover?: (id: string | null) => void;

  /**
   * Children to render inside the ghost robot group.
   */
  children?: React.ReactNode;

  /**
   * Up axis for the ghost robot.
   * @default 'Z' (since scene is Z-up)
   */
  upAxis?: 'Y' | 'Z';

  /**
   * Enable/disable the component.
   * @default true
   */
  enabled?: boolean;

  /**
   * Debounce delay for IK computation (ms).
   * @default 16
   */
  debounceMs?: number;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * Complete workpoint → IK → ghost preview component.
 *
 * Provides a declarative interface for showing a ghost robot at a workpoint
 * position, automatically computing IK and updating the visualization.
 *
 * @example Basic usage
 * ```tsx
 * <Canvas>
 *   <Robot urdfPath={URDF_PATH} />
 *   <WorkpointGhostPreview
 *     robotId="main-robot"
 *     urdfContent={urdfContent}
 *     workpointId={selectedWorkpointId}
 *   />
 * </Canvas>
 * ```
 *
 * @example With store selection
 * ```tsx
 * <WorkpointGhostPreview
 *   robotId="main-robot"
 *   urdfContent={urdfContent}
 *   useStoreSelection={true}
 * />
 * ```
 *
 * @example With tool and callbacks
 * ```tsx
 * <WorkpointGhostPreview
 *   robotId="main-robot"
 *   urdfContent={urdfContent}
 *   workpointId={selectedId}
 *   toolOffset={{
 *     position: [0, 0, 0.1],
 *     quaternion: [0, 0, 0, 1],
 *   }}
 *   onIKChange={({ success, joints, status }) => {
 *     console.log('IK result:', success, status);
 *   }}
 * >
 *   <WeldingTorch length={0.1} />
 * </WorkpointGhostPreview>
 * ```
 */
export function WorkpointGhostPreview({
  robotId,
  urdfContent,
  workpointId = null,
  useStoreSelection = false,
  toolOffset,
  seedJoints,
  statusThresholds,
  opacity = 0.4,
  color,
  showAxes = false,
  showLabel = false,
  label,
  position,
  quaternion,
  scale,
  onIKChange,
  onClick,
  onHover,
  children,
  upAxis = 'Z',
  enabled = true,
  debounceMs = 16,
}: WorkpointGhostPreviewProps): React.ReactElement | null {
  // Use the unified hook
  const {
    ready,
    computing,
    result,
    ghostJoints,
    ghostStatus,
    workpoint,
  } = useWorkpointIK({
    robotId,
    urdfContent,
    workpointId,
    useStoreSelection,
    toolOffset,
    seedJoints,
    statusThresholds,
    enabled,
    debounceMs,
  });

  // Notify parent of IK changes
  React.useEffect(() => {
    if (onIKChange && result) {
      onIKChange({
        success: result.success,
        joints: result.joints,
        status: result.status,
        positionError: result.positionError,
      });
    }
  }, [result, onIKChange]);

  // Don't render if not ready, disabled, or no valid joints
  if (!ready || !enabled || !ghostJoints) {
    return null;
  }

  // Generate ID for the ghost
  const ghostId = workpoint?.id ?? 'workpoint-ghost';

  return (
    <GhostRobot
      id={ghostId}
      urdfContent={urdfContent}
      jointAngles={ghostJoints}
      status={ghostStatus}
      opacity={opacity}
      color={color}
      showAxes={showAxes}
      showLabel={showLabel}
      label={label ?? workpoint?.id}
      position={position}
      quaternion={quaternion}
      scale={scale}
      upAxis={upAxis}
      onClick={onClick}
      onHover={onHover}
    >
      {children}
    </GhostRobot>
  );
}

export default WorkpointGhostPreview;
