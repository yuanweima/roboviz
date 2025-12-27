/**
 * Welding Scene - Industrial Manufacturing Demo
 *
 * Optimized using new Process Architecture:
 * - RobotProcessProvider for unified kinematics + tool + ghost
 * - ProcessScene for robot/ghost/trajectory rendering
 * - useProcessPlayback for trajectory control
 * - useProcessGhost for IK preview
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { RoboViz } from '@aspect/roboviz-react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ProcessProvider,
  RobotProcessProvider,
  ProcessScene,
  useProcessPlayback,
  useProcessGhost,
  useRobotProcessState,
  EndEffector,
  Robot,
  registerProcess,
  weldingProcess,
  type PoseTrajectory,
  type WeldingSettings,
  type ProcessDefinition,
  DEFAULT_WELDING_SETTINGS,
  type WeldingMethod,
  // Tools from core library
  WeldingTorch,
  WELDING_TORCH_METADATA,
  computeTcpFromMetadata,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// ============================================================================
// Theme
// ============================================================================

const THEME = {
  primary: '#ff6600',
  secondary: '#ff8833',
  accent: '#ffaa00',
  success: '#00ff88',
  warning: '#ffcc00',
  danger: '#ff3333',
  background: '#1a1208',
  surface: '#2a2018',
  panel: '#3a2820',
  text: '#fff',
  textSecondary: '#cc9966',
};

// ============================================================================
// Types
// ============================================================================

interface WeldSeam {
  id: string;
  start: [number, number, number]; // Z-up
  end: [number, number, number];
}

// ============================================================================
// Welding Sparks
// ============================================================================

function WeldingSparks({ position, active }: { position: [number, number, number]; active: boolean }) {
  const particlesRef = React.useRef<THREE.Points>(null);
  const particleCount = 100;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      vel[i * 3] = (Math.random() - 0.5) * 0.1;
      vel[i * 3 + 1] = Math.random() * 0.1 + 0.02;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
    }
    return [pos, vel];
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current || !active) return;
    const posAttr = particlesRef.current.geometry.getAttribute('position');
    const posArray = posAttr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      if (Math.random() < 0.1) {
        posArray[i * 3] = position[0];
        posArray[i * 3 + 1] = position[2]; // Z-up to Y-up
        posArray[i * 3 + 2] = -position[1];
        velocities[i * 3] = (Math.random() - 0.5) * 0.15;
        velocities[i * 3 + 1] = Math.random() * 0.15 + 0.03;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
      } else {
        posArray[i * 3] += velocities[i * 3] * delta * 2;
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta * 2;
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta * 2;
        velocities[i * 3 + 1] -= delta * 0.3;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.008} color={THEME.accent} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ============================================================================
// Workpiece
// ============================================================================

function WeldingWorkpiece({
  seams,
  selectedSeamId,
  onSeamSelect,
}: {
  seams: WeldSeam[];
  selectedSeamId: string | null;
  onSeamSelect: (id: string) => void;
}) {
  return (
    <group>
      {/* Base plate */}
      <mesh position={[0.5, -0.025, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial color="#8090a0" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Vertical plates */}
      <mesh position={[0.5, 0.15, -0.1]}>
        <boxGeometry args={[0.3, 0.3, 0.02]} />
        <meshStandardMaterial color="#95a5b5" metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0.5, 0.15, 0.1]}>
        <boxGeometry args={[0.3, 0.3, 0.02]} />
        <meshStandardMaterial color="#95a5b5" metalness={0.65} roughness={0.3} />
      </mesh>

      {/* Seam lines */}
      {seams.map((seam) => {
        // Convert Z-up to Y-up for Three.js
        const start = new THREE.Vector3(seam.start[0], seam.start[2], -seam.start[1]);
        const end = new THREE.Vector3(seam.end[0], seam.end[2], -seam.end[1]);
        const midPoint = start.clone().add(end).multiplyScalar(0.5);
        const length = start.distanceTo(end);
        const dir = end.clone().sub(start).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        return (
          <mesh key={seam.id} position={midPoint} quaternion={quat} onClick={() => onSeamSelect(seam.id)}>
            <cylinderGeometry args={[0.005, 0.005, length, 8]} />
            <meshBasicMaterial color={selectedSeamId === seam.id ? THEME.success : THEME.primary} />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// Welding Parameters Panel
// ============================================================================

function WeldingPanel({ settings, onChange }: { settings: WeldingSettings; onChange: (s: Partial<WeldingSettings>) => void }) {
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: THEME.textSecondary };
  const inputStyle: React.CSSProperties = { width: '80px', padding: '4px 8px', background: THEME.background, border: `1px solid ${THEME.primary}40`, borderRadius: '4px', color: THEME.text, fontSize: '12px', textAlign: 'right' };

  return (
    <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
      <h4 style={{ margin: '0 0 16px 0', color: THEME.primary }}>Welding Parameters</h4>
      <div style={rowStyle}>
        <span style={labelStyle}>Method</span>
        <select value={settings.method} onChange={(e) => onChange({ method: e.target.value as WeldingMethod })} style={{ ...inputStyle, width: '100px' }}>
          <option value="MIG">MIG</option>
          <option value="TIG">TIG</option>
          <option value="MAG">MAG</option>
          <option value="Laser">Laser</option>
        </select>
      </div>
      <div style={rowStyle}><span style={labelStyle}>Voltage (V)</span><input type="number" value={settings.voltage} onChange={(e) => onChange({ voltage: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Current (A)</span><input type="number" value={settings.current} onChange={(e) => onChange({ current: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Travel Speed (mm/s)</span><input type="number" value={settings.travelSpeed} onChange={(e) => onChange({ travelSpeed: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Wire Feed (m/min)</span><input type="number" value={settings.wireFeedSpeed} onChange={(e) => onChange({ wireFeedSpeed: Number(e.target.value) })} style={inputStyle} /></div>
    </div>
  );
}

// ============================================================================
// 3D Scene Content
// ============================================================================

function WeldingSceneContent({
  seams,
  selectedSeamId,
  onSeamSelect,
  isWelding,
  sparkPosition,
}: {
  seams: WeldSeam[];
  selectedSeamId: string | null;
  onSeamSelect: (id: string) => void;
  isWelding: boolean;
  sparkPosition: [number, number, number];
}) {
  return (
    <>
      <ProcessScene
        urdfPath={URDF_PATH}
        showGhost={true}
        showTrajectory={true}
        trajectoryColor={THEME.primary}
      >
        <EndEffector showAxes={false}>
          <WeldingTorch color={THEME.primary} isActive={isWelding} scale={1.0} />
        </EndEffector>
      </ProcessScene>

      <WeldingWorkpiece seams={seams} selectedSeamId={selectedSeamId} onSeamSelect={onSeamSelect} />
      <WeldingSparks position={sparkPosition} active={isWelding} />

      <ambientLight intensity={0.3} color={THEME.primary} />
      <pointLight position={[1, 2, 1]} intensity={0.8} />
    </>
  );
}

// ============================================================================
// Demo Inner Component (with context access)
// ============================================================================

function WeldingDemoInner() {
  const { addLog } = useAppStore();

  // State
  const [weldingSettings, setWeldingSettings] = useState<WeldingSettings>(DEFAULT_WELDING_SETTINGS);
  const [selectedSeamId, setSelectedSeamId] = useState<string | null>(null);
  const [isWelding, setIsWelding] = useState(false);
  const [sparkPosition, setSparkPosition] = useState<[number, number, number]>([0.5, 0, 0.3]);

  // Playback from context
  const playback = useProcessPlayback();
  const ghost = useProcessGhost();
  const state = useRobotProcessState();

  // Seams (Z-up coordinates)
  const seams = useMemo<WeldSeam[]>(() => [
    { id: 'seam1', start: [0.4, -0.09, 0.005], end: [0.6, -0.09, 0.005] },
    { id: 'seam2', start: [0.4, 0.09, 0.005], end: [0.6, 0.09, 0.005] },
    { id: 'seam3', start: [0.4, 0, 0.005], end: [0.6, 0, 0.005] },
  ], []);

  // Generate trajectory from seam
  const generateFromSeam = useCallback(() => {
    if (!selectedSeamId) {
      addLog('warning', 'Please select a weld seam first');
      return;
    }
    const seam = seams.find(s => s.id === selectedSeamId);
    if (!seam) return;

    // Tool pointing down (-Z in Z-up frame)
    const SQRT1_2 = Math.SQRT1_2;
    const downQuat: [number, number, number, number] = [SQRT1_2, 0, 0, SQRT1_2];

    const waypoints = [];
    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      waypoints.push({
        position: [
          seam.start[0] + t * (seam.end[0] - seam.start[0]),
          seam.start[1] + t * (seam.end[1] - seam.start[1]),
          seam.start[2] + t * (seam.end[2] - seam.start[2]),
        ] as [number, number, number],
        quaternion: downQuat,
        time: t * 5,
      });
    }

    const trajectory: PoseTrajectory = {
      id: `weld-${selectedSeamId}-${Date.now()}`,
      name: `Weld ${selectedSeamId}`,
      waypoints,
      duration: 5,
    };

    playback.load(trajectory);
    addLog('info', `Trajectory generated: ${waypoints.length} points`);
  }, [selectedSeamId, seams, playback, addLog]);

  // Start welding
  const startWelding = useCallback(() => {
    if (!state.trajectory) {
      addLog('warning', 'Generate trajectory first');
      return;
    }
    setIsWelding(true);
    playback.play();
    addLog('info', 'Welding started');
  }, [state.trajectory, playback, addLog]);

  // Update spark position during playback
  React.useEffect(() => {
    if (state.isPlaying && state.playbackPose) {
      setSparkPosition(state.playbackPose.position);
    }
    if (state.playbackPosition >= 1 && isWelding) {
      setIsWelding(false);
      addLog('info', 'Welding complete');
    }
  }, [state.isPlaying, state.playbackPose, state.playbackPosition, isWelding, addLog]);

  // Ghost preview on seam hover
  const handleSeamSelect = useCallback((id: string) => {
    setSelectedSeamId(id);
    const seam = seams.find(s => s.id === id);
    if (seam) {
      const SQRT1_2 = Math.SQRT1_2;
      ghost.setTarget({
        position: seam.start,
        quaternion: [SQRT1_2, 0, 0, SQRT1_2],
      });
    }
    addLog('info', `Selected: ${id}`);
  }, [seams, ghost, addLog]);

  const handleStop = useCallback(() => {
    setIsWelding(false);
    playback.pause();
  }, [playback]);

  const handleReset = useCallback(() => {
    setIsWelding(false);
    playback.stop();
    ghost.clear();
  }, [playback, ghost]);

  const btnStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: '8px 16px',
    background: active ? color : '#666',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontWeight: 'bold',
    cursor: active ? 'pointer' : 'not-allowed',
    opacity: active ? 1 : 0.5,
    fontSize: '12px',
  });

  return (
    <div className="module-container" style={{ background: THEME.background, overflowY: 'auto', maxHeight: '100%' }}>
      <div className="module-header" style={{ borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary }}>Welding Process</h2>
        <p style={{ color: THEME.textSecondary }}>Optimized with RobotProcessProvider + ProcessScene</p>
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', gap: '16px', padding: '12px 16px', background: THEME.surface, borderRadius: '8px', marginBottom: '12px', border: `1px solid ${THEME.primary}30`, alignItems: 'center' }}>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>STATUS</span><div style={{ color: isWelding ? THEME.accent : THEME.text, fontWeight: 'bold' }}>{isWelding ? 'WELDING' : 'IDLE'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>SEAM</span><div style={{ color: selectedSeamId ? THEME.success : '#666', fontWeight: 'bold' }}>{selectedSeamId || 'None'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>PROGRESS</span><div style={{ color: THEME.accent, fontWeight: 'bold' }}>{(state.playbackPosition * 100).toFixed(0)}%</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>METHOD</span><div style={{ color: THEME.text, fontWeight: 'bold' }}>{weldingSettings.method}</div></div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={generateFromSeam} disabled={isWelding} style={btnStyle(!!selectedSeamId && !isWelding, THEME.primary)}>Generate Path</button>
          <button onClick={startWelding} disabled={!state.trajectory || isWelding} style={btnStyle(!!state.trajectory && !isWelding, THEME.success)}>Start Welding</button>
          <button onClick={handleStop} disabled={!isWelding} style={btnStyle(isWelding, THEME.warning)}>Stop</button>
          <button onClick={handleReset} style={btnStyle(true, THEME.danger)}>Reset</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Left Panel */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <WeldingPanel settings={weldingSettings} onChange={(partial) => setWeldingSettings(prev => ({ ...prev, ...partial }))} />

          {state.trajectory && (
            <div style={{ marginTop: '12px', padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
              <h4 style={{ margin: '0 0 12px 0', color: THEME.secondary }}>Progress</h4>
              <div style={{ height: '8px', background: THEME.background, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${state.playbackPosition * 100}%`, height: '100%', background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.accent})`, transition: 'width 0.1s linear' }} />
              </div>
            </div>
          )}
        </div>

        {/* 3D View */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="canvas-wrapper" style={{ height: '600px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${THEME.primary}30` }}>
            <RoboViz config={{ scene: { background: THEME.background }, camera: { position: { x: 2.0, y: 1.5, z: 2.0 } } }}>
              <WeldingSceneContent
                seams={seams}
                selectedSeamId={selectedSeamId}
                onSeamSelect={handleSeamSelect}
                isWelding={isWelding}
                sparkPosition={sparkPosition}
              />
            </RoboViz>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Export - Full Version with ProcessProvider
// ============================================================================

// Register welding process at module load time
// This ensures it's available when ProcessProvider initializes
try {
  registerProcess(weldingProcess as ProcessDefinition, { override: true });
} catch (e) {
  // Already registered, that's fine
}

export function WeldingScene() {
  // Compute TCP from tool metadata (unified pattern)
  const tcp = useMemo(
    () => computeTcpFromMetadata(WELDING_TORCH_METADATA),
    []
  );

  return (
    <ProcessProvider>
      <RobotProcessProvider
        urdfPath={URDF_PATH}
        robotId="welding-robot"
        tool={{ position: tcp.position, quaternion: tcp.quaternion }}
      >
        <WeldingDemoInner />
      </RobotProcessProvider>
    </ProcessProvider>
  );
}

export default WeldingScene;
