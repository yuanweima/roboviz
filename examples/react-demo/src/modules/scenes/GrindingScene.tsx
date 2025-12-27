/**
 * Grinding Scene - Industrial Surface Finishing Demo
 *
 * Optimized using new Process Architecture:
 * - RobotProcessProvider for unified kinematics + tool + ghost
 * - ProcessScene for robot/ghost/trajectory rendering
 * - useProcessPlayback for trajectory control
 * - useProcessGhost for IK preview
 *
 * Industrial Workflow:
 * 1. Select surface region to grind (click on workpiece face)
 * 2. Configure grinding parameters (RPM, force, depth)
 * 3. Generate grinding path (raster/spiral pattern)
 * 4. Preview path with ghost robot (IK validation)
 * 5. Execute grinding operation with real-time force feedback
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RoboViz } from '@aspect/roboviz-react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ProcessProvider,
  RobotProcessProvider,
  ProcessScene,
  useProcessPlayback,
  useProcessGhost,
  useRobotProcessState,
  EndEffector,
  type PoseTrajectory,
  // Tools from core library
  GrindingWheel,
  GRINDING_WHEEL_METADATA,
  computeTcpFromMetadata,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';
import { IndustrialGrindingWorkpiece } from '../welding/components';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// ============================================================================
// Theme
// ============================================================================

const THEME = {
  primary: '#0088ff',
  secondary: '#00aaff',
  accent: '#00ddff',
  success: '#00ff88',
  warning: '#ffaa00',
  danger: '#ff4466',
  background: '#080812',
  surface: '#101828',
  panel: '#182038',
  text: '#ffffff',
  textSecondary: '#6688aa',
};

// ============================================================================
// Types
// ============================================================================

interface GrindingSettings {
  rpm: number;
  feedRate: number; // mm/s
  targetForce: number; // N
  depthOfCut: number; // mm
  passes: number;
  pattern: 'raster' | 'spiral' | 'contour';
  stepover: number; // mm
}

interface SurfaceRegion {
  id: string;
  center: [number, number, number]; // Z-up coordinates
  normal: [number, number, number]; // Surface normal
  size: [number, number]; // width, height
  roughness: number; // Initial roughness (0-1)
}

const DEFAULT_GRINDING_SETTINGS: GrindingSettings = {
  rpm: 3000,
  feedRate: 50,
  targetForce: 20,
  depthOfCut: 0.05,
  passes: 3,
  pattern: 'raster',
  stepover: 5,
};

// ============================================================================
// Grinding Dust Particles
// ============================================================================

function GrindingDust({ position, active }: { position: [number, number, number]; active: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 200;

  const [positions, velocities, lifetimes] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const life = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      vel[i * 3] = (Math.random() - 0.5) * 0.08;
      vel[i * 3 + 1] = Math.random() * 0.05 + 0.02;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
      life[i] = Math.random();
    }
    return [pos, vel, life];
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current || !active) return;
    const posAttr = particlesRef.current.geometry.getAttribute('position');
    const posArray = posAttr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      lifetimes[i] -= delta * 0.8;
      if (lifetimes[i] <= 0 || Math.random() < 0.03) {
        // Reset particle at tool position (convert Z-up to Y-up)
        posArray[i * 3] = position[0] + (Math.random() - 0.5) * 0.03;
        posArray[i * 3 + 1] = position[2]; // Z-up to Y-up
        posArray[i * 3 + 2] = -position[1];
        velocities[i * 3] = (Math.random() - 0.5) * 0.1;
        velocities[i * 3 + 1] = Math.random() * 0.06 + 0.02;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        lifetimes[i] = 1;
      } else {
        posArray[i * 3] += velocities[i * 3] * delta * 2;
        posArray[i * 3 + 1] += velocities[i * 3 + 1] * delta * 2;
        posArray[i * 3 + 2] += velocities[i * 3 + 2] * delta * 2;
        velocities[i * 3] *= 0.98;
        velocities[i * 3 + 1] -= delta * 0.15; // Gravity
        velocities[i * 3 + 2] *= 0.98;
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
      <pointsMaterial
        size={0.005}
        color="#ccaa66"
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}


// ============================================================================
// Force Feedback Panel
// ============================================================================

function ForceFeedbackPanel({ force, targetForce, active }: { force: number; targetForce: number; active: boolean }) {
  const percentage = Math.min(100, (force / 50) * 100);
  const deviation = Math.abs(force - targetForce);
  const isWarning = deviation > 5;
  const isDanger = deviation > 10;

  return (
    <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
      <h4 style={{ margin: '0 0 12px 0', color: THEME.secondary }}>Force Feedback</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: '20px', background: THEME.background, borderRadius: '10px', overflow: 'hidden', border: `1px solid ${THEME.primary}30`, position: 'relative' }}>
            {/* Target force indicator */}
            <div style={{
              position: 'absolute',
              left: `${(targetForce / 50) * 100}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              background: THEME.success,
              zIndex: 1,
            }} />
            {/* Current force bar */}
            <div style={{
              width: `${percentage}%`,
              height: '100%',
              background: isDanger
                ? `linear-gradient(90deg, ${THEME.warning}, ${THEME.danger})`
                : isWarning
                  ? `linear-gradient(90deg, ${THEME.primary}, ${THEME.warning})`
                  : `linear-gradient(90deg, ${THEME.primary}, ${THEME.accent})`,
              transition: 'width 0.1s ease',
            }} />
          </div>
        </div>
        <div style={{
          minWidth: '70px',
          textAlign: 'right',
          color: isDanger ? THEME.danger : isWarning ? THEME.warning : THEME.text,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}>
          {force.toFixed(1)} N
        </div>
      </div>
      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
        <div>
          <span style={{ color: THEME.textSecondary }}>Status: </span>
          <span style={{ color: active ? THEME.success : '#666' }}>{active ? 'Active' : 'Idle'}</span>
        </div>
        <div>
          <span style={{ color: THEME.textSecondary }}>Target: </span>
          <span style={{ color: THEME.accent }}>{targetForce} N</span>
        </div>
        <div>
          <span style={{ color: THEME.textSecondary }}>Deviation: </span>
          <span style={{ color: isDanger ? THEME.danger : isWarning ? THEME.warning : THEME.success }}>
            {deviation.toFixed(1)} N
          </span>
        </div>
        <div>
          <span style={{ color: THEME.textSecondary }}>Mode: </span>
          <span style={{ color: THEME.text }}>Force Control</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Grinding Parameters Panel
// ============================================================================

function GrindingPanel({ settings, onChange }: { settings: GrindingSettings; onChange: (s: Partial<GrindingSettings>) => void }) {
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: THEME.textSecondary };
  const inputStyle: React.CSSProperties = { width: '80px', padding: '6px 10px', background: THEME.background, border: `1px solid ${THEME.primary}40`, borderRadius: '4px', color: THEME.text, fontSize: '12px', textAlign: 'right' };

  return (
    <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
      <h4 style={{ margin: '0 0 16px 0', color: THEME.primary }}>Grinding Parameters</h4>
      <div style={rowStyle}>
        <span style={labelStyle}>Pattern</span>
        <select
          value={settings.pattern}
          onChange={(e) => onChange({ pattern: e.target.value as GrindingSettings['pattern'] })}
          style={{ ...inputStyle, width: '100px' }}
        >
          <option value="raster">Raster</option>
          <option value="spiral">Spiral</option>
          <option value="contour">Contour</option>
        </select>
      </div>
      <div style={rowStyle}><span style={labelStyle}>Spindle RPM</span><input type="number" value={settings.rpm} onChange={(e) => onChange({ rpm: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Feed Rate (mm/s)</span><input type="number" value={settings.feedRate} onChange={(e) => onChange({ feedRate: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Target Force (N)</span><input type="number" value={settings.targetForce} onChange={(e) => onChange({ targetForce: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Depth (mm)</span><input type="number" step="0.01" value={settings.depthOfCut} onChange={(e) => onChange({ depthOfCut: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Stepover (mm)</span><input type="number" value={settings.stepover} onChange={(e) => onChange({ stepover: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Passes</span><input type="number" value={settings.passes} onChange={(e) => onChange({ passes: Number(e.target.value) })} style={inputStyle} /></div>
    </div>
  );
}

// ============================================================================
// 3D Scene Content
// ============================================================================

function GrindingSceneContent({
  selectedRegionId,
  grindingRegionId,
  grindingProgress,
  onRegionSelect,
  isGrinding,
  dustPosition,
}: {
  selectedRegionId: string | null;
  grindingRegionId: string | null;
  grindingProgress: Record<string, number>;
  onRegionSelect: (id: string) => void;
  isGrinding: boolean;
  dustPosition: [number, number, number];
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
          <GrindingWheel color={THEME.accent} isActive={isGrinding} rpm={3000} scale={0.8} />
        </EndEffector>
      </ProcessScene>

      {/* Workpiece with surface regions - IndustrialGrindingWorkpiece has built-in clickable regions */}
      <IndustrialGrindingWorkpiece
        position={[0.5, 0, 0]}
        highlightedRegionId={selectedRegionId}
        grindingProgress={grindingProgress}
        activeRegionId={grindingRegionId}
        onRegionClick={onRegionSelect}
      />

      <GrindingDust position={dustPosition} active={isGrinding} />

      <ambientLight intensity={0.4} color={THEME.primary} />
      <pointLight position={[1, 2, 1]} intensity={0.8} />
      <spotLight position={[0.5, 1, 0]} angle={0.6} intensity={0.5} color={THEME.accent} />
    </>
  );
}

// ============================================================================
// Demo Inner Component (with context access)
// ============================================================================

function GrindingDemoInner() {
  const { addLog } = useAppStore();

  // State
  const [grindingSettings, setGrindingSettings] = useState<GrindingSettings>(DEFAULT_GRINDING_SETTINGS);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [grindingRegionId, setGrindingRegionId] = useState<string | null>(null);
  const [isGrinding, setIsGrinding] = useState(false);
  const [currentForce, setCurrentForce] = useState(0);
  const [grindingProgress, setGrindingProgress] = useState<Record<string, number>>({});
  const [dustPosition, setDustPosition] = useState<[number, number, number]>([0.5, 0.08, 0]);

  // Playback from context
  const playback = useProcessPlayback();
  const ghost = useProcessGhost();
  const state = useRobotProcessState();

  // Define surface regions matching IndustrialGrindingWorkpiece regions
  // Coordinates: [x, y, z] in Y-up space, y=0.076 is top surface height
  const surfaceRegions = useMemo<SurfaceRegion[]>(() => [
    { id: 'region-1', center: [-0.08, -0.06, 0.076], normal: [0, 1, 0], size: [0.08, 0.06], roughness: 0.8 },
    { id: 'region-2', center: [0.08, -0.06, 0.076], normal: [0, 1, 0], size: [0.08, 0.06], roughness: 0.7 },
    { id: 'region-3', center: [-0.08, 0.06, 0.076], normal: [0, 1, 0], size: [0.08, 0.06], roughness: 0.9 },
    { id: 'region-4', center: [0.08, 0.06, 0.076], normal: [0, 1, 0], size: [0.08, 0.06], roughness: 0.75 },
    { id: 'region-5', center: [0, 0, 0.076], normal: [0, 1, 0], size: [0.1, 0.08], roughness: 0.85 },
    { id: 'region-6', center: [0, -0.1, 0.076], normal: [0, 1, 0], size: [0.15, 0.04], roughness: 0.6 },
  ], []);

  // Generate grinding trajectory from selected region
  const generateGrindingPath = useCallback(() => {
    if (!selectedRegionId) {
      addLog('warning', 'Please select a surface region first');
      return;
    }

    const region = surfaceRegions.find(r => r.id === selectedRegionId);
    if (!region) return;

    const waypoints: PoseTrajectory['waypoints'] = [];
    const { pattern, stepover, feedRate } = grindingSettings;

    // Workpiece position offset (Y-up coordinates)
    const baseX = 0.5; // Workpiece center X
    const surfaceY = 0.076; // Height of grinding surface in Y-up

    // Tool pointing down (-Y in Y-up frame) = quaternion for 180 deg rotation around X
    // This makes Z axis point down
    const downQuat: [number, number, number, number] = [1, 0, 0, 0]; // Identity for now, tool points +Z

    let time = 0;
    const speed = feedRate / 1000; // Convert mm/s to m/s
    const stepoverM = stepover / 1000; // Convert to meters

    // Region center is [x, z, y] where y is the surface height
    // For path generation, we work in XZ plane at height Y
    const regionX = region.center[0]; // X offset from workpiece center
    const regionZ = region.center[1]; // Z offset from workpiece center

    if (pattern === 'raster') {
      // Generate raster pattern in XZ plane
      const halfWidth = region.size[0] / 2;
      const halfHeight = region.size[1] / 2;
      const numLines = Math.ceil(region.size[1] / (stepoverM * 1000)) + 1;

      for (let i = 0; i < numLines; i++) {
        const z = -halfHeight + i * stepoverM;
        const startX = i % 2 === 0 ? -halfWidth : halfWidth;
        const endX = i % 2 === 0 ? halfWidth : -halfWidth;

        // Start point (Z-up format: x, y, z where z is up)
        waypoints.push({
          position: [
            baseX + regionX + startX,
            regionZ + z,
            surfaceY,
          ],
          quaternion: downQuat,
          time,
        });

        // End point
        const lineLength = Math.abs(endX - startX);
        time += lineLength / speed;
        waypoints.push({
          position: [
            baseX + regionX + endX,
            regionZ + z,
            surfaceY,
          ],
          quaternion: downQuat,
          time,
        });

        // Small pause between lines
        time += 0.1;
      }
    } else if (pattern === 'spiral') {
      // Generate spiral pattern
      const maxRadius = Math.min(region.size[0], region.size[1]) / 2;
      const numTurns = Math.ceil(maxRadius / stepoverM);
      const pointsPerTurn = 24;

      for (let turn = 0; turn < numTurns; turn++) {
        for (let j = 0; j < pointsPerTurn; j++) {
          const angle = (turn * pointsPerTurn + j) * (2 * Math.PI / pointsPerTurn);
          const radius = (turn / numTurns + j / (numTurns * pointsPerTurn)) * maxRadius;

          waypoints.push({
            position: [
              baseX + regionX + Math.cos(angle) * radius,
              regionZ + Math.sin(angle) * radius,
              surfaceY,
            ],
            quaternion: downQuat,
            time,
          });

          time += (2 * Math.PI * radius / pointsPerTurn) / speed * 0.1;
        }
      }
    } else {
      // Contour pattern - follow boundary in XZ plane
      const halfWidth = region.size[0] / 2;
      const halfHeight = region.size[1] / 2;
      const corners = [
        [-halfWidth, -halfHeight],
        [halfWidth, -halfHeight],
        [halfWidth, halfHeight],
        [-halfWidth, halfHeight],
        [-halfWidth, -halfHeight], // Close the loop
      ];

      for (const [dx, dz] of corners) {
        waypoints.push({
          position: [
            baseX + regionX + dx,
            regionZ + dz,
            surfaceY,
          ],
          quaternion: downQuat,
          time,
        });
        time += 0.5;
      }
    }

    const trajectory: PoseTrajectory = {
      id: `grind-${selectedRegionId}-${Date.now()}`,
      name: `Grind ${selectedRegionId} (${pattern})`,
      waypoints,
      duration: time,
    };

    playback.load(trajectory);
    addLog('info', `Generated ${pattern} path: ${waypoints.length} points, ${time.toFixed(1)}s`);
  }, [selectedRegionId, surfaceRegions, grindingSettings, playback, addLog]);

  // Start grinding operation
  const startGrinding = useCallback(() => {
    if (!state.trajectory) {
      addLog('warning', 'Generate grinding path first');
      return;
    }
    if (!selectedRegionId) {
      addLog('warning', 'Select a region first');
      return;
    }
    setIsGrinding(true);
    setGrindingRegionId(selectedRegionId);
    playback.play();
    addLog('info', `Grinding started on ${selectedRegionId}`);
  }, [state.trajectory, selectedRegionId, playback, addLog]);

  // Update dust position and force during playback
  useEffect(() => {
    if (state.isPlaying && state.playbackPose) {
      setDustPosition(state.playbackPose.position);
      // Simulate force with some noise
      setCurrentForce(grindingSettings.targetForce + (Math.random() - 0.5) * 4);

      // Update grinding progress
      if (grindingRegionId) {
        setGrindingProgress(prev => ({
          ...prev,
          [grindingRegionId]: Math.min(1, state.playbackPosition),
        }));
      }
    }
    if (state.playbackPosition >= 1 && isGrinding) {
      setIsGrinding(false);
      setGrindingRegionId(null);
      setCurrentForce(0);
      addLog('info', 'Grinding complete - surface finished');
    }
  }, [state.isPlaying, state.playbackPose, state.playbackPosition, isGrinding, grindingRegionId, grindingSettings.targetForce, addLog]);

  // Ghost preview on region selection
  const handleRegionSelect = useCallback((id: string) => {
    setSelectedRegionId(id);
    const region = surfaceRegions.find(r => r.id === id);
    if (region) {
      // Position in Z-up coordinates for IK: [x, y, z] where z is height
      // region.center is [x, z, height] in our definition
      ghost.setTarget({
        position: [0.5 + region.center[0], region.center[1], region.center[2]],
        quaternion: [1, 0, 0, 0], // Tool pointing down
      });
    }
    addLog('info', `Selected region: ${id}`);
  }, [surfaceRegions, ghost, addLog]);

  const handleStop = useCallback(() => {
    setIsGrinding(false);
    setGrindingRegionId(null);
    setCurrentForce(0);
    playback.pause();
  }, [playback]);

  const handleReset = useCallback(() => {
    setIsGrinding(false);
    setGrindingRegionId(null);
    setCurrentForce(0);
    setGrindingProgress({});
    playback.stop();
    ghost.clear();
  }, [playback, ghost]);

  const btnStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: '8px 16px',
    background: active ? color : '#666',
    border: 'none',
    borderRadius: '4px',
    color: active ? (color === THEME.warning || color === THEME.accent ? '#000' : '#fff') : '#fff',
    fontWeight: 'bold',
    cursor: active ? 'pointer' : 'not-allowed',
    opacity: active ? 1 : 0.5,
    fontSize: '12px',
  });

  return (
    <div className="module-container" style={{ background: THEME.background, overflowY: 'auto', maxHeight: '100%' }}>
      <div className="module-header" style={{ borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary }}>Surface Grinding Process</h2>
        <p style={{ color: THEME.textSecondary }}>Force-controlled grinding with IK-based path planning</p>
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', gap: '24px', padding: '12px 16px', background: THEME.surface, borderRadius: '8px', marginBottom: '12px', border: `1px solid ${THEME.primary}30`, alignItems: 'center' }}>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>STATUS</span><div style={{ color: isGrinding ? THEME.accent : THEME.text, fontWeight: 'bold' }}>{isGrinding ? 'GRINDING' : 'IDLE'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>REGION</span><div style={{ color: selectedRegionId ? THEME.success : '#666', fontWeight: 'bold' }}>{selectedRegionId || 'None'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>PATTERN</span><div style={{ color: THEME.accent, fontWeight: 'bold', textTransform: 'uppercase' }}>{grindingSettings.pattern}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>PROGRESS</span><div style={{ color: THEME.accent, fontWeight: 'bold' }}>{(state.playbackPosition * 100).toFixed(0)}%</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>RPM</span><div style={{ color: THEME.text, fontWeight: 'bold' }}>{grindingSettings.rpm}</div></div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={generateGrindingPath} disabled={isGrinding} style={btnStyle(!!selectedRegionId && !isGrinding, THEME.primary)}>Generate Path</button>
          <button onClick={startGrinding} disabled={!state.trajectory || isGrinding} style={btnStyle(!!state.trajectory && !isGrinding, THEME.success)}>Start Grinding</button>
          <button onClick={handleStop} disabled={!isGrinding} style={btnStyle(isGrinding, THEME.warning)}>Stop</button>
          <button onClick={handleReset} style={btnStyle(true, THEME.danger)}>Reset</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Left Panel */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Region Selector (for testing - click on 3D regions also works) */}
          <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
            <h4 style={{ margin: '0 0 12px 0', color: THEME.secondary }}>Select Region</h4>
            <select
              value={selectedRegionId || ''}
              onChange={(e) => e.target.value && handleRegionSelect(e.target.value)}
              style={{ width: '100%', padding: '8px', background: THEME.background, border: `1px solid ${THEME.primary}40`, borderRadius: '4px', color: THEME.text, fontSize: '12px' }}
            >
              <option value="">-- Select a region --</option>
              {surfaceRegions.map((r) => (
                <option key={r.id} value={r.id}>{r.id} ({r.size[0]*100}x{r.size[1]*100}cm)</option>
              ))}
            </select>
          </div>
          <GrindingPanel settings={grindingSettings} onChange={(partial) => setGrindingSettings(prev => ({ ...prev, ...partial }))} />
          <ForceFeedbackPanel force={currentForce} targetForce={grindingSettings.targetForce} active={isGrinding} />

          {state.trajectory && (
            <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
              <h4 style={{ margin: '0 0 12px 0', color: THEME.secondary }}>Progress</h4>
              <div style={{ height: '8px', background: THEME.background, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${state.playbackPosition * 100}%`, height: '100%', background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.accent})`, transition: 'width 0.1s linear' }} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: THEME.textSecondary }}>
                {state.trajectory.waypoints.length} waypoints • {state.trajectory.duration?.toFixed(1)}s
              </div>
            </div>
          )}
        </div>

        {/* 3D View */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="canvas-wrapper" style={{ height: '600px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${THEME.primary}30` }}>
            <RoboViz config={{ scene: { background: THEME.background, grid: { enabled: true, size: 10, divisions: 20, color: '#1a2a4a' } }, camera: { position: { x: 1.8, y: 1.2, z: 1.8 } } }}>
              <GrindingSceneContent
                selectedRegionId={selectedRegionId}
                grindingRegionId={grindingRegionId}
                grindingProgress={grindingProgress}
                onRegionSelect={handleRegionSelect}
                isGrinding={isGrinding}
                dustPosition={dustPosition}
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

export function GrindingScene() {
  // Compute TCP from tool metadata (unified pattern)
  const tcp = useMemo(
    () => computeTcpFromMetadata(GRINDING_WHEEL_METADATA),
    []
  );

  return (
    <ProcessProvider>
      <RobotProcessProvider
        urdfPath={URDF_PATH}
        robotId="grinding-robot"
        tool={{ position: tcp.position, quaternion: tcp.quaternion }}
      >
        <GrindingDemoInner />
      </RobotProcessProvider>
    </ProcessProvider>
  );
}

export default GrindingScene;
