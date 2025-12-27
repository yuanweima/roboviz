/**
 * ProcessScene Component
 *
 * 3D scene container for process visualization. Automatically renders:
 * - Robot with current joint angles
 * - Ghost robot when preview is active
 * - Process-specific visualization (from ProcessDefinition)
 * - Trajectory visualization
 *
 * Must be used within a Canvas and RobotProcessProvider.
 *
 * @example
 * ```tsx
 * function WeldingDemo() {
 *   return (
 *     <ProcessProvider initialProcessId="welding">
 *       <RobotProcessProvider urdfPath="/robots/fanuc.urdf">
 *         <Canvas>
 *           <ProcessScene
 *             urdfPath="/robots/fanuc.urdf"
 *             showGhost
 *             showTrajectory
 *           />
 *         </Canvas>
 *       </RobotProcessProvider>
 *     </ProcessProvider>
 *   );
 * }
 * ```
 */

import * as React from 'react';
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default "raised" pose joint angles for 6-DOF robots when IK fails.
 * This shows the robot in a safe, recognizable position with red color
 * to indicate the IK solution could not be found.
 * Values in radians: [J1, J2, J3, J4, J5, J6]
 */
const IK_FAILURE_RAISED_POSE = [0, -0.5, 1.0, 0, 0.5, 0];

import { Robot, type RobotProps } from '../../components/Robot';
import { GhostRobot, type GhostStatus } from '../../components/GhostRobot';
import { Line } from '@react-three/drei';
import {
  useRobotProcessContext,
} from '../context/RobotProcessContext';
import type { Pose3D } from '../../coordinates/types';

// =============================================================================
// Types
// =============================================================================

export interface ProcessSceneProps {
  /** URDF path for robot visualization */
  urdfPath?: string;
  /** URDF content (alternative to path) */
  urdfContent?: string;
  /** Mesh data for URDF (if loading from memory) */
  meshData?: Record<string, string>;
  /** Whether to show ghost robot preview */
  showGhost?: boolean;
  /** Whether to show trajectory visualization */
  showTrajectory?: boolean;
  /** Whether to show axes helper */
  showAxes?: boolean;
  /** Robot opacity */
  robotOpacity?: number;
  /** Ghost robot opacity */
  ghostOpacity?: number;
  /** Trajectory line color */
  trajectoryColor?: string;
  /** Trajectory line width */
  trajectoryWidth?: number;
  /**
   * Children passed to the Robot component (e.g., EndEffector)
   * These will be rendered inside the Robot component context
   */
  children?: React.ReactNode;
  /**
   * Scene children rendered outside the Robot component
   * Use this for workpieces, lights, and other scene elements
   */
  sceneChildren?: React.ReactNode;
  /** Robot base position (Y-up, for legacy compatibility) */
  position?: [number, number, number];
  /** Robot base pose in Z-up coordinates */
  basePoseZup?: Pose3D;
  /** Additional robot props */
  robotProps?: Partial<RobotProps>;
}

// =============================================================================
// Helper: Convert ghost status
// =============================================================================

function toGhostStatus(status: string): GhostStatus {
  switch (status) {
    case 'valid':
      return 'valid';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'neutral';
  }
}

// =============================================================================
// Component
// =============================================================================

export function ProcessScene({
  urdfPath,
  urdfContent,
  meshData,
  showGhost = true,
  showTrajectory = true,
  showAxes = false,
  robotOpacity = 1,
  ghostOpacity = 0.5,
  trajectoryColor = '#00ff88',
  trajectoryWidth = 2,
  children,
  sceneChildren,
  position,
  basePoseZup,
  robotProps,
}: ProcessSceneProps): React.JSX.Element {
  // Get context - activeProcess and processState come from RobotProcessContext
  // to avoid double subscription to ProcessContext
  const { state, actions } = useRobotProcessContext();
  const { activeProcess, processState } = state;

  // Tick trajectory playback
  useFrame((_, delta) => {
    if (state.isPlaying) {
      actions.tick(delta);
    }
  });

  // Convert trajectory to points for visualization (Z-up to Y-up)
  const trajectoryPoints = useMemo((): THREE.Vector3[] => {
    if (!state.trajectory?.waypoints) return [];
    return state.trajectory.waypoints.map((wp) => new THREE.Vector3(
      wp.position[0],
      wp.position[2], // Z-up to Y-up: z -> y
      -wp.position[1], // Z-up to Y-up: y -> -z
    ));
  }, [state.trajectory]);

  // Get process visualization component
  const ProcessVisualization = activeProcess?.components.Visualization;

  return (
    <group>
      {/* Main Robot with children (e.g., EndEffector) */}
      {(urdfPath || urdfContent) && (
        <Robot
          id="process-robot"
          urdfPath={urdfPath}
          urdfContent={urdfContent}
          meshData={meshData}
          jointAngles={state.jointAngles}
          position={position}
          basePoseZup={basePoseZup}
          showAxes={showAxes}
          opacity={robotOpacity}
          {...robotProps}
        >
          {children}
        </Robot>
      )}

      {/* Ghost Robot - hidden during trajectory playback */}
      {showGhost && !state.isPlaying && (urdfPath || urdfContent) && (
        // Show ghost when we have valid joint angles OR when IK failed (show raised pose)
        (state.ghostJointAngles || state.ghostStatus === 'error') && (
          <GhostRobot
            urdfPath={urdfPath}
            urdfContent={urdfContent}
            meshData={meshData}
            jointAngles={state.ghostJointAngles || IK_FAILURE_RAISED_POSE}
            status={toGhostStatus(state.ghostStatus)}
            position={position}
            opacity={ghostOpacity}
          >
            {/* Pass children (EndEffector with tools) to ghost robot */}
            {children}
          </GhostRobot>
        )
      )}

      {/* Trajectory Visualization */}
      {showTrajectory && trajectoryPoints.length >= 2 && (
        <Line
          points={trajectoryPoints}
          color={trajectoryColor}
          lineWidth={trajectoryWidth}
        />
      )}

      {/* Process-specific Visualization */}
      {ProcessVisualization && processState && (
        <ProcessVisualization
          input={processState.input}
          settings={processState.settings}
          status={processState.status}
          enabled={true}
        />
      )}

      {/* Scene children (workpieces, lights, etc.) */}
      {sceneChildren}
    </group>
  );
}

// =============================================================================
// Standalone Robot (without ProcessContext)
// =============================================================================

export interface StandaloneProcessRobotProps {
  /** URDF path */
  urdfPath?: string;
  /** URDF content */
  urdfContent?: string;
  /** Mesh data */
  meshData?: Record<string, string>;
  /** Joint angles */
  jointAngles: number[];
  /** Ghost joint angles (optional) */
  ghostJointAngles?: number[] | null;
  /** Ghost status */
  ghostStatus?: GhostStatus;
  /** Show ghost */
  showGhost?: boolean;
  /** Robot opacity */
  opacity?: number;
  /** Ghost opacity */
  ghostOpacity?: number;
  /** Show axes */
  showAxes?: boolean;
  /** Position (Y-up coordinates) */
  position?: [number, number, number];
  /** Children */
  children?: React.ReactNode;
}

/**
 * Standalone robot component for use without ProcessContext.
 * Useful for simple demos or testing.
 */
export function StandaloneProcessRobot({
  urdfPath,
  urdfContent,
  meshData,
  jointAngles,
  ghostJointAngles,
  ghostStatus = 'neutral',
  showGhost = true,
  opacity = 1,
  ghostOpacity = 0.5,
  showAxes = false,
  position,
  children,
}: StandaloneProcessRobotProps): React.JSX.Element {
  return (
    <group>
      {/* Main Robot */}
      <Robot
        id="standalone-robot"
        urdfPath={urdfPath}
        urdfContent={urdfContent}
        meshData={meshData}
        jointAngles={jointAngles}
        position={position}
        showAxes={showAxes}
        opacity={opacity}
      />

      {/* Ghost Robot */}
      {showGhost && ghostJointAngles && (
        <GhostRobot
          urdfPath={urdfPath}
          urdfContent={urdfContent}
          meshData={meshData}
          jointAngles={ghostJointAngles}
          status={ghostStatus}
          position={position}
          opacity={ghostOpacity}
        />
      )}

      {children}
    </group>
  );
}

export default ProcessScene;
