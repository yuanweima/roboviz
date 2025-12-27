/**
 * Process Workflow Demo Module
 *
 * 展示多工艺系统架构的完整功能：
 * - 工艺注册与切换 (Process Registry)
 * - 焊接工艺设置面板 (Welding Settings)
 * - 轨迹系统 (Trajectory System)
 * - 3D可视化 (Welding Visualization)
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useControls, button } from 'leva';
import { RoboViz, Robot } from '@aspect/roboviz-react';
import * as THREE from 'three';
import {
  // Trajectory System
  useTrajectoryStore,
  useActiveTrajectory,
  usePlaybackState,
  TrajectoryPath,
  TrajectoryTimeline,
  createWaypoint,
  // Types from trajectory
  type WaypointStatus,

  // Welding Process Types (not registering the process, just using types)
  type WeldingSettings,
  DEFAULT_WELDING_SETTINGS,
  type WeldingMethod,
} from '@aspect/roboviz-core';

import { useAppStore } from '../store';

// Local type aliases to avoid conflict with Trajectory/Waypoint React components
// These match the trajectory system's Trajectory and Waypoint interfaces
type TrajectoryType = ReturnType<typeof useActiveTrajectory>;
interface WaypointType {
  id: string;
  index: number;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  status: WaypointStatus;
  joints?: number[];
  label?: string;
  createdAt: number;
  updatedAt: number;
}

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// ============================================================================
// Mock Workpiece with Weld Seams
// ============================================================================

interface WeldSeamProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  selected?: boolean;
  onSelect?: () => void;
}

function WeldSeam({ start, end, color = '#ff6600', selected, onSelect }: WeldSeamProps) {
  const midPoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];

  const length = Math.sqrt(
    Math.pow(end[0] - start[0], 2) +
    Math.pow(end[1] - start[1], 2) +
    Math.pow(end[2] - start[2], 2)
  );

  // Calculate rotation to align cylinder with the line
  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  ).normalize();

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const euler = new THREE.Euler().setFromQuaternion(quaternion);

  return (
    <group position={midPoint} rotation={euler}>
      <mesh onClick={onSelect}>
        <cylinderGeometry args={[selected ? 0.008 : 0.005, selected ? 0.008 : 0.005, length, 8]} />
        <meshBasicMaterial color={selected ? '#00ff00' : color} />
      </mesh>
    </group>
  );
}

function WeldableWorkpiece({ onSeamSelect, selectedSeamId }: {
  onSeamSelect?: (id: string) => void;
  selectedSeamId?: string | null;
}) {
  const seams = useMemo(() => [
    { id: 'seam1', start: [0.4, 0.3, -0.1] as [number, number, number], end: [0.6, 0.3, -0.1] as [number, number, number] },
    { id: 'seam2', start: [0.4, 0.3, 0.1] as [number, number, number], end: [0.6, 0.3, 0.1] as [number, number, number] },
    { id: 'seam3', start: [0.4, 0.0, 0.0] as [number, number, number], end: [0.6, 0.0, 0.0] as [number, number, number] },
  ], []);

  return (
    <group>
      {/* Base plate */}
      <mesh position={[0.5, -0.025, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Vertical plates forming a T-joint */}
      <mesh position={[0.5, 0.15, -0.1]}>
        <boxGeometry args={[0.3, 0.3, 0.02]} />
        <meshStandardMaterial color="#888888" metalness={0.4} roughness={0.6} />
      </mesh>

      <mesh position={[0.5, 0.15, 0.1]}>
        <boxGeometry args={[0.3, 0.3, 0.02]} />
        <meshStandardMaterial color="#888888" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Weld seams */}
      {seams.map((seam) => (
        <WeldSeam
          key={seam.id}
          start={seam.start}
          end={seam.end}
          selected={selectedSeamId === seam.id}
          onSelect={() => onSeamSelect?.(seam.id)}
        />
      ))}
    </group>
  );
}

// ============================================================================
// Trajectory Visualization Component
// ============================================================================

interface TrajectoryVisualizerProps {
  trajectory: TrajectoryType;
  showPath?: boolean;
}

function TrajectoryVisualizer({ trajectory, showPath = true }: TrajectoryVisualizerProps) {
  const { position } = usePlaybackState();

  if (!trajectory || trajectory.waypoints.length === 0) {
    return null;
  }

  return (
    <group name="trajectory-visualizer">
      {showPath && <TrajectoryPath trajectory={trajectory} />}

      {/* Current playback position indicator */}
      {trajectory.waypoints.length > 0 && (
        <mesh position={(() => {
          const idx = Math.min(
            Math.floor(position * (trajectory.waypoints.length - 1)),
            trajectory.waypoints.length - 1
          );
          const wp = trajectory.waypoints[idx];
          return wp.position;
        })()}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Process Settings Panel
// ============================================================================

interface WeldingControlPanelProps {
  settings: WeldingSettings;
  onChange: (settings: Partial<WeldingSettings>) => void;
}

function WeldingControlPanel({ settings, onChange }: WeldingControlPanelProps) {
  const panelStyle: React.CSSProperties = {
    padding: '12px',
    background: '#2a2a3e',
    borderRadius: '8px',
    marginBottom: '10px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#aaa',
  };

  const inputStyle: React.CSSProperties = {
    width: '80px',
    padding: '4px 8px',
    background: '#1a1a2e',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    textAlign: 'right',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    width: '120px',
    textAlign: 'left',
  };

  return (
    <div style={panelStyle}>
      <h4 style={{ margin: '0 0 12px 0', color: '#ff6600', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>🔥</span> Welding Parameters
      </h4>

      <div style={rowStyle}>
        <span style={labelStyle}>Method</span>
        <select
          value={settings.method}
          onChange={(e) => onChange({ method: e.target.value as WeldingMethod })}
          style={selectStyle}
        >
          <option value="MIG">MIG</option>
          <option value="TIG">TIG</option>
          <option value="MAG">MAG</option>
          <option value="Laser">Laser</option>
        </select>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Voltage (V)</span>
        <input
          type="number"
          value={settings.voltage}
          onChange={(e) => onChange({ voltage: Number(e.target.value) })}
          min={10}
          max={50}
          step={0.5}
          style={inputStyle}
        />
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Current (A)</span>
        <input
          type="number"
          value={settings.current}
          onChange={(e) => onChange({ current: Number(e.target.value) })}
          min={50}
          max={500}
          step={5}
          style={inputStyle}
        />
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Travel Speed (mm/s)</span>
        <input
          type="number"
          value={settings.travelSpeed}
          onChange={(e) => onChange({ travelSpeed: Number(e.target.value) })}
          min={1}
          max={50}
          step={0.5}
          style={inputStyle}
        />
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Wire Feed (m/min)</span>
        <input
          type="number"
          value={settings.wireFeedSpeed}
          onChange={(e) => onChange({ wireFeedSpeed: Number(e.target.value) })}
          min={1}
          max={25}
          step={0.5}
          style={inputStyle}
        />
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Gas Flow (L/min)</span>
        <input
          type="number"
          value={settings.gasFlowRate}
          onChange={(e) => onChange({ gasFlowRate: Number(e.target.value) })}
          min={5}
          max={30}
          step={1}
          style={inputStyle}
        />
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Standoff (mm)</span>
        <input
          type="number"
          value={settings.standoffDistance}
          onChange={(e) => onChange({ standoffDistance: Number(e.target.value) })}
          min={5}
          max={30}
          step={1}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Module Component
// ============================================================================

export function ProcessWorkflowModule() {
  const { addLog } = useAppStore();

  // Process state
  const [activeProcessId, setActiveProcessId] = useState<string>('welding');
  const [weldingSettings, setWeldingSettings] = useState<WeldingSettings>(DEFAULT_WELDING_SETTINGS);

  // Seam selection
  const [selectedSeamId, setSelectedSeamId] = useState<string | null>(null);

  // Trajectory state
  const trajectoryStore = useTrajectoryStore;
  const activeTrajectory = useActiveTrajectory();
  const { isPlaying, position, setPlaying, setPosition } = usePlaybackState();

  // Robot joint angles for playback
  const [jointAngles, setJointAngles] = useState([0, -0.5, 0.8, 0, -0.3, 0]);

  // Generate trajectory from selected seam
  const generateTrajectory = useCallback(() => {
    if (!selectedSeamId) {
      addLog('warning', 'Please select a weld seam first');
      return;
    }

    // Define seam positions
    const seams: Record<string, { start: [number, number, number]; end: [number, number, number] }> = {
      seam1: { start: [0.4, 0.3, -0.1], end: [0.6, 0.3, -0.1] },
      seam2: { start: [0.4, 0.3, 0.1], end: [0.6, 0.3, 0.1] },
      seam3: { start: [0.4, 0.0, 0.0], end: [0.6, 0.0, 0.0] },
    };

    const seam = seams[selectedSeamId];
    if (!seam) return;

    // Generate waypoints along seam
    const numPoints = 10;
    const waypoints = [];

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const pos: [number, number, number] = [
        seam.start[0] + t * (seam.end[0] - seam.start[0]),
        seam.start[1] + t * (seam.end[1] - seam.start[1]) + 0.1, // Offset above seam
        seam.start[2] + t * (seam.end[2] - seam.start[2]),
      ];

      waypoints.push(createWaypoint({
        position: pos,
        quaternion: [0, 0, 0, 1], // Quaternion [x, y, z, w]
        label: i === 0 ? 'Start' : i === numPoints ? 'End' : undefined,
      }, i));
    }

    // Create trajectory and add to store
    const trajectory = trajectoryStore.getState().addTrajectory({
      name: `Weld_${selectedSeamId}`,
      processId: 'welding',
      processType: 'welding',
      sourceId: selectedSeamId,
      waypoints,
      metadata: {
        seamId: selectedSeamId,
        method: weldingSettings.method,
        settings: weldingSettings,
      },
    });

    trajectoryStore.getState().setActiveTrajectory(trajectory.id);

    addLog('info', `Generated trajectory "${trajectory.name}" with ${waypoints.length} waypoints`);
  }, [selectedSeamId, weldingSettings, addLog, trajectoryStore]);

  // Clear trajectory
  const clearTrajectory = useCallback(() => {
    if (activeTrajectory) {
      trajectoryStore.getState().removeTrajectory(activeTrajectory.id);
      addLog('info', 'Trajectory cleared');
    }
  }, [activeTrajectory, addLog, trajectoryStore]);

  // Playback controls
  const handlePlay = useCallback(() => {
    if (activeTrajectory && activeTrajectory.waypoints.length > 0) {
      setPlaying(true);
      addLog('info', 'Playback started');
    }
  }, [activeTrajectory, setPlaying, addLog]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    addLog('info', 'Playback paused');
  }, [setPlaying, addLog]);

  const handleReset = useCallback(() => {
    setPosition(0);
    setPlaying(false);
    addLog('info', 'Playback reset');
  }, [setPosition, setPlaying, addLog]);

  // Update robot pose during playback
  useEffect(() => {
    if (activeTrajectory && activeTrajectory.waypoints.length > 0) {
      const idx = Math.min(
        Math.floor(position * (activeTrajectory.waypoints.length - 1)),
        activeTrajectory.waypoints.length - 1
      );
      const wp = activeTrajectory.waypoints[idx];
      if (wp.joints) {
        setJointAngles(wp.joints);
      }
    }
  }, [activeTrajectory, position]);

  // Leva controls
  useControls('Process', {
    activeProcess: {
      value: activeProcessId,
      options: ['welding', 'grinding', 'inspection'],
      onChange: (v: string) => {
        setActiveProcessId(v);
        addLog('info', `Switched to ${v} process`);
      },
    },
  });

  useControls('Trajectory', {
    'Generate from Seam': button(() => generateTrajectory()),
    'Clear Trajectory': button(() => clearTrajectory()),
    'Play': button(() => handlePlay()),
    'Pause': button(() => handlePause()),
    'Reset': button(() => handleReset()),
  });

  // Status display
  const statusItems = [
    { label: 'Process', value: activeProcessId.toUpperCase(), color: '#ff6600' },
    { label: 'Seam', value: selectedSeamId || 'None', color: selectedSeamId ? '#4ecdc4' : '#666' },
    { label: 'Trajectory', value: activeTrajectory?.name || 'None', color: activeTrajectory ? '#4ecdc4' : '#666' },
    { label: 'Playback', value: isPlaying ? 'Playing' : 'Stopped', color: isPlaying ? '#00ff00' : '#666' },
  ];

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Multi-Process Workflow Demo</h2>
        <p>
          展示插件式多工艺架构：工艺注册、参数配置、轨迹生成与回放。
        </p>
      </div>

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '10px 12px',
        background: '#2a2a3e',
        borderRadius: '8px',
        marginBottom: '10px',
        flexWrap: 'wrap',
      }}>
        {statusItems.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#888' }}>{item.label}:</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{
        padding: '10px',
        background: '#2a2a3e',
        borderRadius: '8px',
        marginBottom: '10px',
        fontSize: '12px',
        color: '#aaa',
      }}>
        <strong style={{ color: '#4ecdc4' }}>操作步骤：</strong>
        <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
          <li>点击3D场景中的橙色焊缝线选择待焊接区域</li>
          <li>调整左侧焊接参数（电压、电流、速度等）</li>
          <li>点击 "Generate from Seam" 生成焊接轨迹</li>
          <li>使用 Play/Pause 控制轨迹回放预览</li>
        </ol>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Left Panel - Settings */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <WeldingControlPanel
            settings={weldingSettings}
            onChange={(partial) => setWeldingSettings((prev) => ({ ...prev, ...partial }))}
          />

          {/* Trajectory Info */}
          {activeTrajectory && (
            <div style={{
              padding: '12px',
              background: '#2a2a3e',
              borderRadius: '8px',
              marginBottom: '10px',
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>
                📈 Trajectory: {activeTrajectory.name}
              </h4>
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                <div style={{ marginBottom: '4px' }}>
                  Waypoints: <strong style={{ color: '#fff' }}>{activeTrajectory.waypoints.length}</strong>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  Status: <strong style={{ color: '#fff' }}>{activeTrajectory.status}</strong>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  Position: <strong style={{ color: '#fff' }}>{(position * 100).toFixed(1)}%</strong>
                </div>

                {/* Progress bar */}
                <div style={{
                  height: '6px',
                  background: '#1a1a2e',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${position * 100}%`,
                    height: '100%',
                    background: isPlaying ? '#00ff00' : '#4ecdc4',
                    transition: 'width 0.05s linear',
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Capabilities Status */}
          <div style={{
            padding: '12px',
            background: '#2a2a3e',
            borderRadius: '8px',
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#888' }}>
              🔧 Active Capabilities
            </h4>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {['edge-selection', 'collision-preview', 'angle-lock', 'seam-tracking'].map((cap) => (
                <div key={cap} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px',
                  background: '#1a1a2e',
                  borderRadius: '4px',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: cap === 'edge-selection' && selectedSeamId ? '#00ff00' : '#444',
                  }} />
                  <span style={{ color: '#aaa' }}>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - 3D View */}
        <div style={{ flex: 1 }}>
          <div className="canvas-wrapper" style={{ height: '500px' }}>
            <RoboViz
              config={{
                scene: {
                  background: '#1a1a2e',
                  grid: { enabled: true, size: 10, divisions: 20, color: '#404060' },
                },
                camera: { position: { x: 1.2, y: 0.8, z: 1.2 } },
              }}
            >
              {/* Robot */}
              <Robot
                id="welding_robot"
                urdfPath={URDF_PATH}
                jointAngles={jointAngles}
                color="#4ecdc4"
                showAxes={false}
              />

              {/* Weldable Workpiece */}
              <WeldableWorkpiece
                selectedSeamId={selectedSeamId}
                onSeamSelect={(id) => {
                  setSelectedSeamId(id);
                  addLog('info', `Selected seam: ${id}`);
                }}
              />

              {/* Trajectory Visualization */}
              <TrajectoryVisualizer trajectory={activeTrajectory} />
            </RoboViz>
          </div>

          {/* Timeline (when trajectory exists) */}
          {activeTrajectory && (
            <div style={{ marginTop: '10px', padding: '12px', background: '#2a2a3e', borderRadius: '8px' }}>
              <TrajectoryTimeline trajectory={activeTrajectory} />
            </div>
          )}
        </div>
      </div>

      {/* Architecture Info */}
      <div style={{
        marginTop: '16px',
        padding: '16px',
        background: '#1a1a2e',
        borderRadius: '8px',
        fontSize: '12px',
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>
          🏗️ Architecture Overview
        </h4>
        <pre style={{
          margin: 0,
          padding: '12px',
          background: '#0d0d1a',
          borderRadius: '4px',
          overflow: 'auto',
          color: '#aaa',
          lineHeight: 1.5,
        }}>
{`┌─────────────────────────────────────────────────────┐
│  Process Layer                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Welding  │ │ Grinding │ │Inspection│ ...        │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘            │
└───────┼────────────┼────────────┼───────────────────┘
        │            │            │
┌───────┴────────────┴────────────┴───────────────────┐
│  Capability Layer                                    │
│  edge-selection, collision-preview, angle-lock ...  │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│  Core Layer                                          │
│  trajectory, store, protocol, components            │
└─────────────────────────────────────────────────────┘`}
        </pre>
      </div>
    </div>
  );
}
