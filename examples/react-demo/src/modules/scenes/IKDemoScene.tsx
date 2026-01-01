/**
 * IK Demo Scene
 *
 * A reference implementation demonstrating the correct usage of:
 * - usePoseIK for IK computation with workspace analysis
 * - Pose3D type (Z-up coordinate system)
 * - GhostRobot with status feedback
 * - Workspace quality visualization
 *
 * This scene serves as a template for building IK-based robot applications.
 *
 * @see docs/kinematics-api.md for detailed documentation
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useControls, button } from 'leva';
import { Html } from '@react-three/drei';
import { RoboViz, Robot } from '@aspect/roboviz-react';
import {
  GhostRobot,
  usePoseIK,
  // Types - use Z-up coordinate types for kinematics
  type Pose3D,
  type GhostStatus,
  type WorkspaceAnalysis,
} from '@aspect/roboviz-core';

// =============================================================================
// Configuration
// =============================================================================

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';
const ROBOT_ID = 'ik-demo-robot';

// Theme colors
const THEME = {
  background: '#1a1a2e',
  grid: '#2a2a4e',
  panel: '#16213e',
  text: '#e8e8e8',
  textMuted: '#888',
  valid: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
  neutral: '#88aaff',
};

/**
 * Tool offset configuration (Z-up).
 * This represents a welding torch with 150mm extension along tool Z-axis.
 *
 * Format matches TCPOffset from coordinates/types.ts:
 * - position: [x, y, z] tuple in meters
 * - quaternion: [x, y, z, w] tuple
 */
const WELDING_TORCH = {
  position: [0, 0, 0.15] as [number, number, number],      // 150mm along Z
  quaternion: [0, 0, 0, 1] as [number, number, number, number],    // No rotation
};

/**
 * Home position - a non-singular configuration.
 * Avoid zero angles which are often near singularities.
 */
const HOME_JOINTS = [0, -0.5, 0.5, 0, 0.5, 0];

// =============================================================================
// Helper Components
// =============================================================================

/**
 * Target marker visualization at the IK target position.
 * Color changes based on IK status.
 */
function TargetMarker({
  position,
  status,
}: {
  position: [number, number, number];
  status: GhostStatus;
}) {
  const color = {
    valid: THEME.valid,
    warning: THEME.warning,
    error: THEME.error,
    neutral: THEME.neutral,
  }[status];

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.02, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </mesh>
  );
}

/**
 * Status panel showing IK result and workspace analysis.
 */
function StatusPanel({
  ready,
  computing,
  status,
  workspace,
  isNearSingular,
  hasAnalyticalIk,
}: {
  ready: boolean;
  computing: boolean;
  status: GhostStatus;
  workspace: WorkspaceAnalysis | null;
  isNearSingular: boolean;
  hasAnalyticalIk: boolean;
}) {
  const statusColor = {
    valid: THEME.valid,
    warning: THEME.warning,
    error: THEME.error,
    neutral: THEME.neutral,
  }[status];

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: THEME.panel,
        borderRadius: 8,
        padding: 16,
        minWidth: 220,
        fontSize: 12,
        color: THEME.text,
        pointerEvents: 'auto', // Enable pointer events for this panel
      }}
    >
      <div style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 'bold' }}>IK Status</div>

      {/* Ready state */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: THEME.textMuted }}>Solver: </span>
        <span style={{ color: ready ? THEME.valid : THEME.warning }}>
          {ready ? 'Ready' : 'Loading...'}
        </span>
        {hasAnalyticalIk && (
          <span style={{ color: THEME.valid, marginLeft: 8, fontSize: 10 }}>
            (Analytical)
          </span>
        )}
      </div>

      {/* IK Status */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: THEME.textMuted }}>Status: </span>
        <span style={{ color: statusColor, fontWeight: 'bold' }}>
          {status.toUpperCase()}
        </span>
        {computing && (
          <span style={{ color: THEME.textMuted, marginLeft: 8 }}>
            (computing...)
          </span>
        )}
      </div>

      {/* Singularity warning */}
      {isNearSingular && (
        <div
          style={{
            background: THEME.warning + '20',
            border: `1px solid ${THEME.warning}`,
            borderRadius: 4,
            padding: 8,
            marginBottom: 8,
            color: THEME.warning,
          }}
        >
          Near Singularity
        </div>
      )}

      {/* Workspace Analysis */}
      {workspace && (
        <>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: THEME.textMuted }}>Manipulability: </span>
            <span
              style={{
                color:
                  workspace.manipulability > 0.3
                    ? THEME.valid
                    : workspace.manipulability > 0.1
                      ? THEME.warning
                      : THEME.error,
              }}
            >
              {workspace.manipulability.toFixed(4)}
            </span>
          </div>
          <div>
            <span style={{ color: THEME.textMuted }}>Condition #: </span>
            <span
              style={{
                color:
                  workspace.conditionNumber < 10
                    ? THEME.valid
                    : workspace.conditionNumber < 50
                      ? THEME.warning
                      : THEME.error,
              }}
            >
              {workspace.conditionNumber.toFixed(1)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Main Scene Component
// =============================================================================

function IKDemoSceneContent({ urdfContent }: { urdfContent: string }) {
  // ==========================================================================
  // State
  // ==========================================================================

  const [robotJoints] = useState<number[]>(HOME_JOINTS);

  // Target position state (controlled via Leva)
  const [targetPosition, setTargetPosition] = useState<[number, number, number]>([
    0.4, 0.1, 0.3,
  ]);

  // ==========================================================================
  // Target Pose (Z-up Pose3D format)
  // ==========================================================================

  /**
   * Create the target pose from position.
   *
   * IMPORTANT: Use Pose3D format for all kinematics hooks:
   * - position: [x, y, z] tuple
   * - quaternion: [x, y, z, w] tuple (not orientation object!)
   *
   * This quaternion represents "tool pointing down" (90° rotation around Y).
   */
  const targetPose: Pose3D = useMemo(
    () => ({
      position: targetPosition,
      quaternion: [0, 0.707, 0, 0.707], // Tool pointing down
    }),
    [targetPosition]
  );

  // ==========================================================================
  // usePoseIK - The recommended hook for pose-based IK
  // ==========================================================================

  const {
    ready,
    computing,
    ghostJoints,
    ghostStatus,
    workspace,
    isNearSingular,
    hasAnalyticalIk,
    solverError,
  } = usePoseIK({
    robotId: ROBOT_ID,
    urdfContent,
    targetPose,
    seedJoints: robotJoints, // Use current joints as seed for smoother IK
    toolOffset: WELDING_TORCH, // Apply tool offset
    enabled: true,
    debounceMs: 16, // ~60fps update rate
  });

  // ==========================================================================
  // Leva Controls
  // ==========================================================================

  useControls('Target Position', {
    x: {
      value: targetPosition[0],
      min: -0.5,
      max: 0.8,
      step: 0.01,
      onChange: (v) => setTargetPosition((p) => [v, p[1], p[2]]),
    },
    y: {
      value: targetPosition[1],
      min: -0.5,
      max: 0.5,
      step: 0.01,
      onChange: (v) => setTargetPosition((p) => [p[0], v, p[2]]),
    },
    z: {
      value: targetPosition[2],
      min: 0,
      max: 0.8,
      step: 0.01,
      onChange: (v) => setTargetPosition((p) => [p[0], p[1], v]),
    },
    'Reset to Center': button(() => setTargetPosition([0.4, 0.1, 0.3])),
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================

  useEffect(() => {
    if (solverError) {
      console.error('Solver error:', solverError);
    }
  }, [solverError]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <>
      {/* Robot at home position */}
      <Robot id={ROBOT_ID} urdfPath={URDF_PATH} jointAngles={robotJoints} />

      {/* Ghost robot showing IK solution */}
      {ghostJoints && (
        <GhostRobot
          urdfPath={URDF_PATH}
          jointAngles={ghostJoints}
          status={ghostStatus}
        />
      )}

      {/* Target position marker */}
      <TargetMarker position={targetPosition} status={ghostStatus} />

      {/* Status panel - wrapped in Html for R3F compatibility */}
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <StatusPanel
          ready={ready}
          computing={computing}
          status={ghostStatus}
          workspace={workspace}
          isNearSingular={isNearSingular}
          hasAnalyticalIk={hasAnalyticalIk}
        />
      </Html>
    </>
  );
}

// =============================================================================
// Exported Component with URDF Loading
// =============================================================================

export function IKDemoScene() {
  const [urdfContent, setUrdfContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load URDF content
  useEffect(() => {
    fetch(URDF_PATH)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((content) => {
        setUrdfContent(content);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: THEME.text,
        }}
      >
        Loading URDF...
      </div>
    );
  }

  if (error || !urdfContent) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: THEME.error,
        }}
      >
        Error: {error || 'Failed to load URDF'}
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>IK Demo Scene</h2>
        <p>
          Reference implementation for <code>usePoseIK</code> with workspace analysis.
          Drag the sliders to move the target position.
        </p>
      </div>

      <div className="canvas-wrapper" style={{ position: 'relative' }}>
        <RoboViz
          config={{
            scene: {
              background: THEME.background,
              grid: { enabled: true, size: 2, divisions: 20, color: THEME.grid },
            },
            camera: { position: { x: 1.2, y: 0.8, z: 1.2 } },
          }}
        >
          <IKDemoSceneContent urdfContent={urdfContent} />
        </RoboViz>
      </div>
    </div>
  );
}

export default IKDemoScene;
