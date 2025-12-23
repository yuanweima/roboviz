/**
 * Control Panel Component
 * Provides UI controls for robot joints and camera presets
 */
import { useState, useCallback } from 'react';
import { useViewerStore } from '../store/viewerStore';
import type { CameraConfig } from '../types';

// Camera preset positions
const CAMERA_PRESETS: Record<string, CameraConfig> = {
  front: { position: [0, 0, 3], target: [0, 0, 0], fov: 50 },
  back: { position: [0, 0, -3], target: [0, 0, 0], fov: 50 },
  left: { position: [-3, 0, 0], target: [0, 0, 0], fov: 50 },
  right: { position: [3, 0, 0], target: [0, 0, 0], fov: 50 },
  top: { position: [0, 3, 0], target: [0, 0, 0], fov: 50 },
  bottom: { position: [0, -3, 0], target: [0, 0, 0], fov: 50 },
  iso: { position: [2, 2, 2], target: [0, 0, 0], fov: 50 },
  default: { position: [3, 2, 3], target: [0, 0, 0], fov: 50 },
};

// Panel styles
const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 50,
  right: 10,
  width: 280,
  maxHeight: 'calc(100vh - 100px)',
  overflowY: 'auto',
  background: 'rgba(0, 0, 0, 0.85)',
  borderRadius: 8,
  color: 'white',
  fontSize: 12,
  fontFamily: 'system-ui',
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 12,
  color: '#4ecdc4',
};

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: 8,
};

const sliderLabelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 4,
  fontSize: 11,
  color: '#aaa',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 4,
  cursor: 'pointer',
  accentColor: '#4ecdc4',
};

const buttonStyle: React.CSSProperties = {
  background: '#333',
  border: '1px solid #555',
  borderRadius: 4,
  padding: '6px 12px',
  color: 'white',
  cursor: 'pointer',
  fontSize: 11,
  minWidth: 60,
};

const activeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#4ecdc4',
  borderColor: '#4ecdc4',
  color: '#000',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginTop: 8,
};

interface JointSliderProps {
  index: number;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

function JointSlider({ index, value, min = -Math.PI, max = Math.PI, onChange }: JointSliderProps) {
  return (
    <div style={sliderContainerStyle}>
      <div style={sliderLabelStyle}>
        <span>Joint {index + 1}</span>
        <span>{(value * 180 / Math.PI).toFixed(1)}°</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={sliderStyle}
      />
    </div>
  );
}

interface RobotControlsProps {
  robotId: string;
  joints: number[];
  onJointChange?: (robotId: string, angles: number[]) => void;
}

function RobotControls({ robotId, joints, onJointChange }: RobotControlsProps) {
  const { setRobotJoints } = useViewerStore();

  const handleJointChange = useCallback((index: number, value: number) => {
    const newJoints = [...joints];
    newJoints[index] = value;
    setRobotJoints(robotId, newJoints);
    onJointChange?.(robotId, newJoints);
  }, [robotId, joints, setRobotJoints, onJointChange]);

  const handleResetJoints = useCallback(() => {
    const resetJoints = joints.map(() => 0);
    setRobotJoints(robotId, resetJoints);
    onJointChange?.(robotId, resetJoints);
  }, [robotId, joints, setRobotJoints, onJointChange]);

  if (joints.length === 0) return null;

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Robot: {robotId}</div>
      {joints.map((value, index) => (
        <JointSlider
          key={index}
          index={index}
          value={value}
          onChange={(v) => handleJointChange(index, v)}
        />
      ))}
      <div style={buttonRowStyle}>
        <button style={buttonStyle} onClick={handleResetJoints}>
          Reset All
        </button>
      </div>
    </div>
  );
}

function CameraControls() {
  const { camera, setCamera } = useViewerStore();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handlePresetClick = useCallback((presetName: string) => {
    const preset = CAMERA_PRESETS[presetName];
    if (preset) {
      setCamera(preset);
      setActivePreset(presetName);
    }
  }, [setCamera]);

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Camera View</div>
      <div style={buttonRowStyle}>
        {Object.keys(CAMERA_PRESETS).map((name) => (
          <button
            key={name}
            style={activePreset === name ? activeButtonStyle : buttonStyle}
            onClick={() => handlePresetClick(name)}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ ...sliderLabelStyle, color: '#888' }}>Current Position</div>
        <div style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
          X: {camera.position?.[0]?.toFixed(2) || 0} |
          Y: {camera.position?.[1]?.toFixed(2) || 0} |
          Z: {camera.position?.[2]?.toFixed(2) || 0}
        </div>
      </div>
    </div>
  );
}

function VisualizationToggles() {
  const {
    collisionEnabled,
    setCollisionEnabled,
    framesEnabled,
    setFramesEnabled,
    pointCloudsEnabled,
    setPointCloudsEnabled,
    scene,
    setScene,
  } = useViewerStore();

  const toggleStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  };

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>Visualization</div>

      <div style={toggleStyle}>
        <span>Grid</span>
        <input
          type="checkbox"
          checked={scene.grid?.enabled ?? true}
          onChange={(e) => setScene({ grid: { ...scene.grid, enabled: e.target.checked } })}
        />
      </div>

      <div style={toggleStyle}>
        <span>Collision Detection</span>
        <input
          type="checkbox"
          checked={collisionEnabled}
          onChange={(e) => setCollisionEnabled(e.target.checked)}
        />
      </div>

      <div style={toggleStyle}>
        <span>Coordinate Frames</span>
        <input
          type="checkbox"
          checked={framesEnabled}
          onChange={(e) => setFramesEnabled(e.target.checked)}
        />
      </div>

      <div style={toggleStyle}>
        <span>Point Clouds</span>
        <input
          type="checkbox"
          checked={pointCloudsEnabled}
          onChange={(e) => setPointCloudsEnabled(e.target.checked)}
        />
      </div>

      <div style={toggleStyle}>
        <span>Shadows</span>
        <input
          type="checkbox"
          checked={scene.shadows ?? true}
          onChange={(e) => setScene({ shadows: e.target.checked })}
        />
      </div>

      <div style={toggleStyle}>
        <span>Ground Plane</span>
        <input
          type="checkbox"
          checked={scene.groundPlane ?? false}
          onChange={(e) => setScene({ groundPlane: e.target.checked })}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ ...toggleStyle, borderBottom: 'none', padding: '4px 0' }}>
          <span>Environment</span>
          <select
            value={scene.environmentPreset || 'studio'}
            onChange={(e) => setScene({ environmentPreset: e.target.value as typeof scene.environmentPreset })}
            style={{
              background: '#333',
              border: '1px solid #555',
              borderRadius: 4,
              padding: '4px 8px',
              color: 'white',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            <option value="studio">Studio</option>
            <option value="sunset">Sunset</option>
            <option value="dawn">Dawn</option>
            <option value="night">Night</option>
            <option value="warehouse">Warehouse</option>
            <option value="forest">Forest</option>
            <option value="apartment">Apartment</option>
            <option value="city">City</option>
            <option value="park">Park</option>
            <option value="lobby">Lobby</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export interface ControlPanelProps {
  visible?: boolean;
  onJointChange?: (robotId: string, angles: number[]) => void;
}

export function ControlPanel({ visible = true, onJointChange }: ControlPanelProps) {
  const { robots } = useViewerStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!visible) return null;

  const toggleButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 50,
    right: collapsed ? 10 : 300,
    background: 'rgba(0, 0, 0, 0.85)',
    border: 'none',
    borderRadius: 4,
    padding: '8px 12px',
    color: 'white',
    cursor: 'pointer',
    fontSize: 12,
    zIndex: 1,
  };

  return (
    <>
      <button style={toggleButtonStyle} onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '◀ Show Controls' : '▶'}
      </button>

      {!collapsed && (
        <div style={panelStyle}>
          {/* Camera Controls */}
          <CameraControls />

          {/* Visualization Toggles */}
          <VisualizationToggles />

          {/* Robot Joint Controls */}
          {Array.from(robots.values()).map((robot) => (
            <RobotControls
              key={robot.id}
              robotId={robot.id}
              joints={robot.joints}
              onJointChange={onJointChange}
            />
          ))}

          {robots.size === 0 && (
            <div style={{ ...sectionStyle, color: '#666', fontStyle: 'italic' }}>
              No robots loaded
            </div>
          )}
        </div>
      )}
    </>
  );
}
