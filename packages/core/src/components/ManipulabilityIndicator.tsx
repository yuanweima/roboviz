/**
 * ManipulabilityIndicator Component
 *
 * Visual indicator of robot manipulability at current configuration.
 * Shows how easily the robot can move in different directions.
 *
 * Features:
 * - Real-time manipulability computation
 * - Directional capability visualization (ellipsoid)
 * - Singularity proximity warning
 * - Joint limit margin display
 * - Customizable thresholds
 */

import * as React from 'react';
import { useMemo, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useHybridSolver } from '../kinematics/useTrajx';
import type { WorkspaceAnalysis } from '../kinematics/types';

// ============================================================================
// Types
// ============================================================================

export interface ManipulabilityIndicatorProps {
  /** Robot ID for kinematics */
  robotId: string;
  /** Robot name for solver creation (deprecated - use urdfContent instead) */
  robotName?: string;
  /** URDF content for solver creation (preferred over robotName) */
  urdfContent?: string;
  /** Current joint configuration */
  jointAngles: number[];

  // Position
  /** Position of the indicator in world space */
  position?: [number, number, number];
  /** Attach to end-effector (uses FK to get position) */
  attachToEndEffector?: boolean;

  // Visualization modes
  /** Show manipulability ellipsoid */
  showEllipsoid?: boolean;
  /** Ellipsoid scale factor */
  ellipsoidScale?: number;
  /** Show manipulability value as text (requires Html from drei) */
  showValue?: boolean;
  /** Show joint limit margins as bars */
  showJointLimits?: boolean;
  /** Show singularity warning */
  showSingularityWarning?: boolean;
  /** Show directional arrows for principal axes */
  showAxes?: boolean;

  // Thresholds
  /** Singularity warning threshold (default: 0.01) */
  singularityThreshold?: number;
  /** Low manipulability warning threshold (default: 0.02) */
  lowManipulabilityThreshold?: number;
  /** Joint limit warning threshold (default: 0.1 = 10%) */
  jointLimitWarningThreshold?: number;

  // Styling
  /** Good status color */
  goodColor?: string;
  /** Warning status color */
  warningColor?: string;
  /** Error/danger status color */
  errorColor?: string;
  /** Opacity */
  opacity?: number;

  // Callbacks
  /** Called when workspace analysis is computed */
  onAnalysis?: (analysis: WorkspaceAnalysis | null) => void;
  /** Called when status changes */
  onStatusChange?: (status: 'good' | 'warning' | 'danger') => void;
}

export type ManipulabilityStatus = 'good' | 'warning' | 'danger';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLORS = {
  good: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine overall status from workspace analysis
 */
function getStatus(
  analysis: WorkspaceAnalysis | null,
  singularityThreshold: number,
  lowManipThreshold: number,
  jointLimitThreshold: number
): ManipulabilityStatus {
  if (!analysis) return 'warning';

  // Check singularity
  if (analysis.isNearSingular || analysis.minSingularValue < singularityThreshold) {
    return 'danger';
  }

  // Check manipulability
  if (analysis.manipulability < lowManipThreshold) {
    return 'warning';
  }

  // Check joint limits
  if (analysis.jointLimitMargins.some((m) => m < jointLimitThreshold)) {
    return 'warning';
  }

  return 'good';
}

/**
 * Get color for status
 */
function getStatusColor(
  status: ManipulabilityStatus,
  colors: { good: string; warning: string; error: string }
): string {
  switch (status) {
    case 'good':
      return colors.good;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.error;
    default:
      return colors.warning;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Ellipsoid visualization of manipulability
 * Uses manipulability value to scale a sphere uniformly
 */
function ManipulabilityEllipsoid({
  position,
  scale,
  manipulability,
  color,
  opacity,
}: {
  position: THREE.Vector3;
  scale: number;
  manipulability: number;
  color: string;
  opacity: number;
}) {
  // Scale based on manipulability (normalized to reasonable range)
  const normalizedManip = Math.min(1, Math.max(0.1, manipulability * 10));
  const sphereScale = scale * normalizedManip;

  return (
    <group position={position}>
      {/* Main sphere */}
      <mesh scale={[sphereScale, sphereScale, sphereScale]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity * 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh scale={[sphereScale, sphereScale, sphereScale]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>
    </group>
  );
}

/**
 * Joint limit margin bars
 */
function JointLimitBars({
  position,
  margins,
  warningThreshold,
  colors,
  opacity,
}: {
  position: THREE.Vector3;
  margins: number[];
  warningThreshold: number;
  colors: { good: string; warning: string; error: string };
  opacity: number;
}) {
  const barWidth = 0.01;
  const barHeight = 0.05;
  const spacing = 0.015;
  const totalWidth = margins.length * spacing;
  const startX = -totalWidth / 2;

  return (
    <group position={[position.x, position.y - 0.05, position.z]}>
      {margins.map((margin, i) => {
        const normalizedMargin = Math.max(0, Math.min(1, margin));
        const height = normalizedMargin * barHeight;
        const color =
          margin < 0.05
            ? colors.error
            : margin < warningThreshold
              ? colors.warning
              : colors.good;

        return (
          <group key={`joint-limit-${i}`} position={[startX + i * spacing, 0, 0]}>
            {/* Background bar */}
            <mesh position={[0, barHeight / 2, 0]}>
              <boxGeometry args={[barWidth, barHeight, barWidth]} />
              <meshBasicMaterial color="#333333" transparent opacity={opacity * 0.3} />
            </mesh>
            {/* Margin bar */}
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[barWidth * 0.8, height, barWidth * 0.8]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Singularity warning indicator
 */
function SingularityWarning({
  position,
  isNearSingular,
  singularityValue,
  color,
}: {
  position: THREE.Vector3;
  isNearSingular: boolean;
  singularityValue: number;
  color: string;
}) {
  const [flash, setFlash] = useState(false);

  // Flash animation for warning
  useEffect(() => {
    if (!isNearSingular) return;

    const interval = setInterval(() => {
      setFlash((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, [isNearSingular]);

  if (!isNearSingular) return null;

  return (
    <group position={[position.x, position.y + 0.04, position.z]}>
      {/* Warning triangle */}
      <mesh rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.015, 0.025, 3]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={flash ? 1 : 0.5}
        />
      </mesh>
      {/* Exclamation mark */}
      <mesh position={[0, -0.005, 0.008]}>
        <boxGeometry args={[0.003, 0.012, 0.001]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0, -0.015, 0.008]}>
        <boxGeometry args={[0.003, 0.003, 0.001]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}

/**
 * Principal axes arrows showing robot's ability to move in each direction
 * Uses manipulability as uniform scale
 */
function PrincipalAxes({
  position,
  scale,
  manipulability,
  opacity,
}: {
  position: THREE.Vector3;
  scale: number;
  manipulability: number;
  opacity: number;
}) {
  const colors = ['#ff4444', '#44ff44', '#4444ff']; // X, Y, Z
  const normalizedManip = Math.min(1, Math.max(0.2, manipulability * 10));
  const baseLength = scale * normalizedManip * 2;

  return (
    <group position={position}>
      {[0, 1, 2].map((i) => {
        const length = baseLength;
        const direction = [0, 0, 0];
        direction[i] = 1;

        const arrowPos = direction.map((d) => (d * length) / 2) as [
          number,
          number,
          number,
        ];
        const rotation: [number, number, number] =
          i === 0 ? [0, 0, -Math.PI / 2] : i === 2 ? [Math.PI / 2, 0, 0] : [0, 0, 0];

        return (
          <group key={`axis-${i}`}>
            {/* Arrow shaft */}
            <mesh position={arrowPos} rotation={rotation}>
              <cylinderGeometry args={[0.002, 0.002, length, 8]} />
              <meshBasicMaterial
                color={colors[i]}
                transparent
                opacity={opacity * 0.8}
              />
            </mesh>
            {/* Arrow head */}
            <mesh
              position={direction.map((d) => d * length) as [number, number, number]}
              rotation={rotation}
            >
              <coneGeometry args={[0.005, 0.015, 8]} />
              <meshBasicMaterial
                color={colors[i]}
                transparent
                opacity={opacity}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ManipulabilityIndicator({
  robotId,
  robotName,
  urdfContent,
  jointAngles,
  position,
  attachToEndEffector = true,
  showEllipsoid = true,
  ellipsoidScale = 0.05,
  showValue = false,
  showJointLimits = false,
  showSingularityWarning = true,
  showAxes = false,
  singularityThreshold = 0.01,
  lowManipulabilityThreshold = 0.02,
  jointLimitWarningThreshold = 0.1,
  goodColor = DEFAULT_COLORS.good,
  warningColor = DEFAULT_COLORS.warning,
  errorColor = DEFAULT_COLORS.error,
  opacity = 0.8,
  onAnalysis,
  onStatusChange,
}: ManipulabilityIndicatorProps): React.JSX.Element | null {
  // Solver - use useHybridSolver (which supports URDF content)
  const { ready, fk: hybridFk, jointLimits } = useHybridSolver({
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

  // Wrapper for FK
  const fk = useCallback(
    (joints: number[]) => hybridFk(joints),
    [hybridFk]
  );

  // State
  const [analysis, setAnalysis] = useState<WorkspaceAnalysis | null>(null);
  const [endEffectorPos, setEndEffectorPos] = useState<THREE.Vector3>(
    new THREE.Vector3()
  );

  // Colors object
  const colors = useMemo(
    () => ({
      good: goodColor,
      warning: warningColor,
      error: errorColor,
    }),
    [goodColor, warningColor, errorColor]
  );

  // Compute workspace analysis
  useEffect(() => {
    if (!ready || jointAngles.length === 0) {
      setAnalysis(null);
      return;
    }

    const workspaceAnalysis = analyzeWorkspace(jointAngles);
    setAnalysis(workspaceAnalysis);
    onAnalysis?.(workspaceAnalysis);

    // Get end-effector position if needed
    if (attachToEndEffector) {
      const fkResult = fk(jointAngles);
      if (fkResult) {
        setEndEffectorPos(
          new THREE.Vector3(
            fkResult.pose.position.x,
            fkResult.pose.position.y,
            fkResult.pose.position.z
          )
        );
      }
    }
  }, [ready, jointAngles, attachToEndEffector, analyzeWorkspace, fk, onAnalysis]);

  // Compute status
  const status = useMemo(
    () =>
      getStatus(
        analysis,
        singularityThreshold,
        lowManipulabilityThreshold,
        jointLimitWarningThreshold
      ),
    [analysis, singularityThreshold, lowManipulabilityThreshold, jointLimitWarningThreshold]
  );

  // Notify status changes
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Get display position
  const displayPosition = useMemo(() => {
    if (position) {
      return new THREE.Vector3(position[0], position[1], position[2]);
    }
    return endEffectorPos;
  }, [position, endEffectorPos]);

  // Don't render if not ready
  if (!ready || !analysis) {
    return null;
  }

  const statusColor = getStatusColor(status, colors);

  return (
    <group>
      {/* Manipulability ellipsoid */}
      {showEllipsoid && (
        <ManipulabilityEllipsoid
          position={displayPosition}
          scale={ellipsoidScale}
          manipulability={analysis.manipulability}
          color={statusColor}
          opacity={opacity}
        />
      )}

      {/* Principal axes */}
      {showAxes && (
        <PrincipalAxes
          position={displayPosition}
          scale={ellipsoidScale}
          manipulability={analysis.manipulability}
          opacity={opacity}
        />
      )}

      {/* Joint limit bars */}
      {showJointLimits && (
        <JointLimitBars
          position={displayPosition}
          margins={analysis.jointLimitMargins}
          warningThreshold={jointLimitWarningThreshold}
          colors={colors}
          opacity={opacity}
        />
      )}

      {/* Singularity warning */}
      {showSingularityWarning && (
        <SingularityWarning
          position={displayPosition}
          isNearSingular={analysis.isNearSingular}
          singularityValue={analysis.minSingularValue}
          color={colors.error}
        />
      )}

      {/* Value indicator (simple sphere that changes color) */}
      {showValue && (
        <mesh position={displayPosition}>
          <sphereGeometry args={[0.008, 16, 16]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

export default ManipulabilityIndicator;
