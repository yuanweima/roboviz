/**
 * GhostRobot Demo Module
 *
 * Demonstrates the GhostRobot component for previewing target poses,
 * trajectory keyframes, and IK solutions.
 *
 * Features:
 * - Single ghost robot preview (target pose)
 * - Multiple ghost robots (trajectory keyframes)
 * - Status-based coloring (valid/warning/error)
 * - Trajectory line visualization
 * - Interactive controls for ghost configuration
 */
import React, { useState, useMemo } from 'react';
import { useControls, button, folder } from 'leva';
import {
  RoboVizCore,
  Robot,
  GhostRobot,
  GhostRobotTrajectory,
  type GhostStatus,
} from '@aspect/roboviz-core';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// Predefined target poses for demonstration
const PRESET_POSES: Record<string, { angles: number[]; status: GhostStatus; label: string }> = {
  home: {
    angles: [0, 0, 0, 0, 0, 0],
    status: 'valid',
    label: 'Home Position',
  },
  reach: {
    angles: [0.5, -0.3, 0.8, 0, 0.5, 0],
    status: 'valid',
    label: 'Reach Forward',
  },
  side: {
    angles: [1.2, 0.2, 0.4, 0.5, 0, 0.8],
    status: 'valid',
    label: 'Side Reach',
  },
  warning: {
    angles: [1.5, 0.8, 1.2, 0.3, 0.5, 1.0],
    status: 'warning',
    label: 'Near Limit',
  },
  error: {
    angles: [2.5, 1.2, 1.8, 1.0, 1.5, 2.0],
    status: 'error',
    label: 'Unreachable',
  },
};

// Generate trajectory keyframes from current position to target
function generateTrajectory(
  start: number[],
  end: number[],
  steps: number = 5
): { jointAngles: number[]; status: GhostStatus; label?: string }[] {
  const keyframes: { jointAngles: number[]; status: GhostStatus; label?: string }[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Linear interpolation between start and end
    const jointAngles = start.map((s, j) => s + (end[j] - s) * t);

    // Check if any joint is near its limit (simplified check)
    const nearLimit = jointAngles.some((a) => Math.abs(a) > 1.4);

    keyframes.push({
      jointAngles,
      status: nearLimit ? 'warning' : 'valid',
      label: i === 0 ? 'Start' : i === steps ? 'End' : undefined,
    });
  }

  return keyframes;
}

export function GhostRobotModule() {
  const { addLog } = useAppStore();
  const [currentJoints, setCurrentJoints] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [selectedPreset, setSelectedPreset] = useState<string>('reach');
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [ghostClicked, setGhostClicked] = useState<string | null>(null);
  const [ghostHovered, setGhostHovered] = useState<string | null>(null);

  // Ghost robot controls
  const ghostControls = useControls('Ghost Robot', {
    preset: {
      value: 'reach',
      options: Object.keys(PRESET_POSES),
      onChange: (v: string) => setSelectedPreset(v),
    },
    opacity: { value: 0.4, min: 0.1, max: 0.8, step: 0.05 },
    showTrajectoryLine: { value: true },
    customColor: { value: false },
    color: { value: '#88aaff', render: (get) => get('Ghost Robot.customColor') },
  });

  // Trajectory controls
  const trajectoryControls = useControls('Trajectory Preview', {
    showTrajectory: {
      value: false,
      onChange: (v: boolean) => setShowTrajectory(v),
    },
    trajectoryOpacity: { value: 0.3, min: 0.1, max: 0.6, step: 0.05 },
    showLines: { value: true },
    trajectoryColor: { value: '#88aaff' },
  });

  // Current robot controls
  const [, setLevaJoints] = useControls('Current Robot', () => ({
    J1: {
      value: 0,
      min: -Math.PI,
      max: Math.PI,
      step: 0.01,
      onChange: (v: number) => {
        setCurrentJoints((prev) => {
          const newAngles = [...prev];
          newAngles[0] = v;
          return newAngles;
        });
      },
    },
    J2: {
      value: 0,
      min: -Math.PI / 2,
      max: Math.PI / 2,
      step: 0.01,
      onChange: (v: number) => {
        setCurrentJoints((prev) => {
          const newAngles = [...prev];
          newAngles[1] = v;
          return newAngles;
        });
      },
    },
    J3: {
      value: 0,
      min: -Math.PI / 2,
      max: Math.PI,
      step: 0.01,
      onChange: (v: number) => {
        setCurrentJoints((prev) => {
          const newAngles = [...prev];
          newAngles[2] = v;
          return newAngles;
        });
      },
    },
  }));

  // Action buttons - use Leva's get function to read current preset value at click time
  useControls('Actions', {
    'Animate to Target': button((get) => {
      // Use get() to read the current preset value from Leva at click time
      const currentPreset = get('Ghost Robot.preset') as string;
      const target = PRESET_POSES[currentPreset].angles;
      const start = [...currentJoints];
      let t = 0;
      const interval = setInterval(() => {
        t += 0.05;
        if (t >= 1) {
          setCurrentJoints(target);
          setLevaJoints({
            J1: target[0],
            J2: target[1],
            J3: target[2],
          });
          clearInterval(interval);
          addLog('info', 'Animation complete');
          return;
        }
        const interpolated = start.map((s, i) => s + (target[i] - s) * t);
        setCurrentJoints(interpolated);
        setLevaJoints({
          J1: interpolated[0],
          J2: interpolated[1],
          J3: interpolated[2],
        });
      }, 50);
      addLog('info', `Animating to ${currentPreset}`);
    }),
    'Reset Current': button(() => {
      setCurrentJoints([0, 0, 0, 0, 0, 0]);
      setLevaJoints({ J1: 0, J2: 0, J3: 0 });
      addLog('info', 'Reset to home position');
    }),
  });

  // Get selected preset
  const targetPose = PRESET_POSES[selectedPreset];

  // Generate trajectory from current position to selected target
  const trajectoryKeyframes = useMemo(() => {
    return generateTrajectory(currentJoints, targetPose.angles, 5);
  }, [currentJoints, targetPose.angles]);

  // Calculate a simple end effector position for trajectory line
  // (In real application, this would come from FK calculation)
  const currentEndEffector = useMemo(() => {
    // Simplified forward kinematics approximation
    const [j1, j2, j3] = currentJoints;
    return {
      x: Math.cos(j1) * (0.4 + 0.3 * Math.cos(j2 + j3)),
      y: 0.3 + 0.3 * Math.sin(j2) + 0.2 * Math.sin(j2 + j3),
      z: Math.sin(j1) * (0.4 + 0.3 * Math.cos(j2 + j3)),
    };
  }, [currentJoints]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>GhostRobot Demo</h2>
        <p>
          Preview target poses, IK solutions, and trajectory keyframes with semi-transparent ghost robots.
          Similar to RViz's interactive marker visualization.
        </p>
      </div>

      <div className="module-content" style={{ display: 'flex', gap: '16px' }}>
        {/* Visualization */}
        <div className="canvas-wrapper" style={{ flex: 2 }}>
          <RoboVizCore
            config={{
              background: '#1a1a2e',
              grid: { enabled: true, size: 2, divisions: 20, color: '#404060' },
            }}
            camera={{ position: { x: 2, y: 1.5, z: 2 } }}
          >
            {/* Current robot (solid) */}
            <Robot
              id="current-robot"
              urdfPath={URDF_PATH}
              jointAngles={currentJoints}
              position={{ x: 0, y: 0, z: 0 }}
            />

            {/* Single ghost robot (target pose preview) */}
            {!showTrajectory && (
              <GhostRobot
                id="target-ghost"
                urdfPath={URDF_PATH}
                jointAngles={targetPose.angles}
                position={{ x: 0, y: 0, z: 0 }}
                opacity={ghostControls.opacity}
                status={targetPose.status}
                color={ghostControls.customColor ? ghostControls.color : undefined}
                trajectoryFrom={ghostControls.showTrajectoryLine ? currentEndEffector : undefined}
                trajectoryStyle="dashed"
                showAxes
                onClick={(id) => {
                  setGhostClicked(id);
                  addLog('info', `Ghost clicked: ${id}`);
                }}
                onHover={(id) => setGhostHovered(id)}
              />
            )}

            {/* Trajectory ghost robots - dynamically generated from current to target */}
            {showTrajectory && (
              <GhostRobotTrajectory
                urdfPath={URDF_PATH}
                keyframes={trajectoryKeyframes}
                position={{ x: 0, y: 0, z: 0 }}
                opacity={trajectoryControls.trajectoryOpacity}
                showTrajectoryLines={trajectoryControls.showLines}
                trajectoryColor={trajectoryControls.trajectoryColor}
                onKeyframeClick={(index) => {
                  addLog('info', `Trajectory keyframe ${index} clicked`);
                }}
              />
            )}
          </RoboVizCore>
        </div>

        {/* Info panel */}
        <div
          className="info-panel"
          style={{
            flex: 1,
            background: '#1a1a2e',
            borderRadius: '8px',
            padding: '16px',
            overflow: 'auto',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', color: '#4ecdc4' }}>Ghost Status</h3>

          {/* Status legend */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#888', fontSize: '12px' }}>STATUS COLORS</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['valid', 'warning', 'error', 'neutral'] as GhostStatus[]).map((status) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background:
                        status === 'valid'
                          ? '#00ff88'
                          : status === 'warning'
                          ? '#ffaa00'
                          : status === 'error'
                          ? '#ff4444'
                          : '#88aaff',
                    }}
                  />
                  <span style={{ color: '#aaa', fontSize: '12px', textTransform: 'capitalize' }}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Current selection */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#888', fontSize: '12px' }}>SELECTED PRESET</h4>
            <div
              style={{
                padding: '8px 12px',
                background: '#252540',
                borderRadius: '4px',
                borderLeft: `3px solid ${
                  targetPose.status === 'valid'
                    ? '#00ff88'
                    : targetPose.status === 'warning'
                    ? '#ffaa00'
                    : '#ff4444'
                }`,
              }}
            >
              <div style={{ color: '#fff', fontWeight: 'bold' }}>{targetPose.label}</div>
              <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>
                Status: <span style={{ textTransform: 'capitalize' }}>{targetPose.status}</span>
              </div>
              <div style={{ color: '#666', fontSize: '10px', marginTop: '2px', fontFamily: 'monospace' }}>
                [{targetPose.angles.map((a) => a.toFixed(2)).join(', ')}]
              </div>
            </div>
          </div>

          {/* Interaction state */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#888', fontSize: '12px' }}>INTERACTION</h4>
            <div style={{ fontSize: '12px', color: '#aaa' }}>
              <div>
                Hovered:{' '}
                <span style={{ color: ghostHovered ? '#4ecdc4' : '#666' }}>
                  {ghostHovered || 'None'}
                </span>
              </div>
              <div>
                Clicked:{' '}
                <span style={{ color: ghostClicked ? '#ff6b6b' : '#666' }}>
                  {ghostClicked || 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Current joints */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#888', fontSize: '12px' }}>CURRENT JOINTS</h4>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#aaa' }}>
              [{currentJoints.map((a) => a.toFixed(2)).join(', ')}]
            </div>
          </div>
        </div>
      </div>

      {/* Usage example */}
      <div
        className="code-example"
        style={{
          marginTop: '16px',
          padding: '16px',
          background: '#0d0d1a',
          borderRadius: '8px',
          overflow: 'auto',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Usage Example</h4>
        <pre
          style={{
            margin: 0,
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#aaa',
            whiteSpace: 'pre-wrap',
          }}
        >
          {`import { Robot, GhostRobot, GhostRobotTrajectory } from '@aspect/roboviz-core';

// Single ghost for target pose preview
<Robot urdfPath="/robot.urdf" jointAngles={currentAngles} />
<GhostRobot
  urdfPath="/robot.urdf"
  jointAngles={targetAngles}
  status="valid"           // 'valid' | 'warning' | 'error' | 'neutral'
  opacity={0.4}
  trajectoryFrom={currentEndEffector}  // Draw line from current to target
  onClick={(id) => console.log('Ghost clicked')}
/>

// Multiple ghosts for trajectory preview
<GhostRobotTrajectory
  urdfPath="/robot.urdf"
  keyframes={[
    { jointAngles: [0, 0, 0, 0, 0, 0], status: 'valid', label: 'Start' },
    { jointAngles: [0.5, 0.3, 0.2, 0, 0, 0], status: 'valid' },
    { jointAngles: [1.0, 0.6, 0.4, 0, 0, 0], status: 'warning' },
    { jointAngles: [1.5, 0.9, 0.6, 0, 0, 0], status: 'valid', label: 'End' },
  ]}
  opacity={0.3}
  onKeyframeClick={(index) => console.log('Keyframe:', index)}
/>`}
        </pre>
      </div>
    </div>
  );
}
