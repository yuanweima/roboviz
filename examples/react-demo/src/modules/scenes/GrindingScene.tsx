/**
 * Grinding Scene - Industrial Surface Finishing Demo
 *
 * Features:
 * - Large polyhedron workpiece with multiple grindable faces
 * - Region-based path generation (raster, spiral, contour patterns)
 * - Force-controlled grinding simulation
 * - Real-time grinding progress visualization
 *
 * Process Architecture:
 * - RobotProcessProvider for unified kinematics + tool + ghost
 * - ProcessScene for robot/ghost/trajectory rendering
 * - useProcessPlayback for trajectory control
 * - useProcessGhost for IK preview
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  type PoseTrajectory,
  // Tools from core library
  GrindingWheel,
  GRINDING_WHEEL_METADATA,
  computeTcpFromMetadata,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';
import {
  PolyhedronWorkpiece,
  createPolyhedronRegions,
  type GrindingSurfaceRegion,
} from '../welding/components';
import {
  TcpDebugPanel,
  type TcpDebugState,
  computeTcpFromDebug,
  createDefaultTcpDebug,
} from '../../components/TcpDebugPanel';

// Default TCP debug state from tool metadata
const DEFAULT_TCP_DEBUG = createDefaultTcpDebug(GRINDING_WHEEL_METADATA);

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

const DEFAULT_GRINDING_SETTINGS: GrindingSettings = {
  rpm: 3000,
  feedRate: 50,
  targetForce: 20,
  depthOfCut: 0.05,
  passes: 3,
  pattern: 'raster',
  stepover: 8,
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
// Region Selector Panel
// ============================================================================

function RegionSelectorPanel({
  regions,
  selectedRegionId,
  grindingProgress,
  onSelect,
}: {
  regions: GrindingSurfaceRegion[];
  selectedRegionId: string | null;
  grindingProgress: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  // Group regions by face
  const groupedRegions = useMemo(() => {
    const groups: Record<string, GrindingSurfaceRegion[]> = {};
    regions.forEach((r) => {
      if (!groups[r.face]) groups[r.face] = [];
      groups[r.face].push(r);
    });
    return groups;
  }, [regions]);

  const faceOrder = ['top', 'front', 'back', 'left', 'right'];

  return (
    <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
      <h4 style={{ margin: '0 0 12px 0', color: THEME.secondary }}>Surface Regions</h4>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {faceOrder.map((face) => {
          const faceRegions = groupedRegions[face];
          if (!faceRegions) return null;

          return (
            <div key={face} style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: THEME.textSecondary, textTransform: 'uppercase', marginBottom: '4px' }}>
                {face} Face
              </div>
              {faceRegions.map((region) => {
                const progress = grindingProgress[region.id] || 0;
                const isSelected = selectedRegionId === region.id;

                return (
                  <div
                    key={region.id}
                    onClick={() => onSelect(region.id)}
                    style={{
                      padding: '8px 12px',
                      marginBottom: '4px',
                      background: isSelected ? THEME.primary + '40' : THEME.background,
                      borderRadius: '4px',
                      border: `1px solid ${isSelected ? THEME.primary : THEME.primary + '30'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: THEME.text }}>{region.name}</div>
                      <div style={{ fontSize: '10px', color: THEME.textSecondary }}>
                        {(region.size[0] * 1000).toFixed(0)}×{(region.size[1] * 1000).toFixed(0)}mm
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: progress >= 1 ? THEME.success : progress > 0 ? THEME.accent : THEME.textSecondary,
                      }}>
                        {progress >= 1 ? 'Done' : progress > 0 ? `${(progress * 100).toFixed(0)}%` : 'Pending'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 3D Scene Content
// ============================================================================

function GrindingSceneContent({
  regions,
  selectedRegionId,
  grindingRegionId,
  grindingProgress,
  onRegionSelect,
  onRegionHover,
  isGrinding,
  dustPosition,
}: {
  regions: GrindingSurfaceRegion[];
  selectedRegionId: string | null;
  grindingRegionId: string | null;
  grindingProgress: Record<string, number>;
  onRegionSelect: (id: string) => void;
  onRegionHover: (id: string | null) => void;
  isGrinding: boolean;
  dustPosition: [number, number, number];
}) {
  const [highlightedRegionId, setHighlightedRegionId] = useState<string | null>(null);

  const handleHover = useCallback((id: string | null) => {
    setHighlightedRegionId(id);
    onRegionHover(id);
  }, [onRegionHover]);

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

      {/* Multi-faced polyhedron workpiece */}
      <PolyhedronWorkpiece
        position={[0.5, 0, 0]}
        scale={1}
        highlightedRegionId={highlightedRegionId}
        selectedRegionId={selectedRegionId}
        activeRegionId={grindingRegionId}
        grindingProgress={grindingProgress}
        onRegionClick={onRegionSelect}
        onRegionHover={handleHover}
      />

      <GrindingDust position={dustPosition} active={isGrinding} />

      {/* Enhanced workpiece lighting */}
      <pointLight position={[0.5, 1.5, 0.5]} intensity={0.6} color="#ffffff" distance={5} decay={2} />
      <pointLight position={[-0.5, 1, -0.5]} intensity={0.3} color="#e0f0ff" distance={4} decay={2} />
      <spotLight position={[0.5, 1, 0]} angle={0.5} intensity={0.5} color="#ffffff" />
    </>
  );
}

// ============================================================================
// Path Generation Utilities
// ============================================================================

/**
 * Generate grinding path for a surface region
 * All coordinates are in Z-up format
 */
function generateGrindingPath(
  region: GrindingSurfaceRegion,
  settings: GrindingSettings,
  workpieceOffset: [number, number, number] = [0.5, 0, 0]
): PoseTrajectory['waypoints'] {
  const waypoints: PoseTrajectory['waypoints'] = [];
  const { pattern, stepover, feedRate } = settings;

  // Tool approach offset (slightly above surface)
  const approachOffset = 0.005; // 5mm

  // Calculate quaternion to align tool with surface normal
  // The grinding wheel's TCP Z-axis should point opposite to surface normal (into the surface)
  const normal = new THREE.Vector3(...region.normal).normalize();

  // We want tool Z to point opposite to surface normal (pressing into surface)
  // Base orientation: tool Z points -Z in world (down)
  // We need to rotate from -Z to -normal

  let quaternion: [number, number, number, number];

  if (region.face === 'top') {
    // Top face: normal is +Z, tool should point -Z (down)
    // 180° around X axis
    quaternion = [1, 0, 0, 0];
  } else if (region.face === 'front') {
    // Front face: normal is -Y, tool should point +Y
    // 90° around X axis (rotates Z to -Y, then flip)
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    quaternion = [q.x, q.y, q.z, q.w];
  } else if (region.face === 'back') {
    // Back face: normal is +Y, tool should point -Y
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    quaternion = [q.x, q.y, q.z, q.w];
  } else if (region.face === 'left') {
    // Left face: normal is -X, tool should point +X
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    quaternion = [q.x, q.y, q.z, q.w];
  } else if (region.face === 'right') {
    // Right face: normal is +X, tool should point -X
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
    quaternion = [q.x, q.y, q.z, q.w];
  } else {
    quaternion = [1, 0, 0, 0];
  }

  let time = 0;
  const speed = feedRate / 1000; // Convert mm/s to m/s
  const stepoverM = stepover / 1000; // Convert to meters

  // Get region dimensions
  const halfWidth = region.size[0] / 2;
  const halfHeight = region.size[1] / 2;

  // Calculate local coordinate axes based on face orientation
  let uAxis: THREE.Vector3; // First axis in region plane
  let vAxis: THREE.Vector3; // Second axis in region plane

  if (region.face === 'top') {
    uAxis = new THREE.Vector3(1, 0, 0); // X axis
    vAxis = new THREE.Vector3(0, 1, 0); // Y axis
  } else if (region.face === 'front' || region.face === 'back') {
    uAxis = new THREE.Vector3(1, 0, 0); // X axis
    vAxis = new THREE.Vector3(0, 0, 1); // Z axis
  } else {
    // left/right
    uAxis = new THREE.Vector3(0, 1, 0); // Y axis
    vAxis = new THREE.Vector3(0, 0, 1); // Z axis
  }

  // Approach offset direction (opposite to normal)
  const offsetDir = normal.clone().multiplyScalar(approachOffset);

  if (pattern === 'raster') {
    const numLines = Math.ceil(region.size[1] / stepoverM) + 1;

    for (let i = 0; i < numLines; i++) {
      const v = -halfHeight + i * stepoverM;
      const startU = i % 2 === 0 ? -halfWidth : halfWidth;
      const endU = i % 2 === 0 ? halfWidth : -halfWidth;

      // Calculate world position
      const basePos = new THREE.Vector3(...region.center);
      const startPos = basePos.clone()
        .add(uAxis.clone().multiplyScalar(startU))
        .add(vAxis.clone().multiplyScalar(v))
        .add(offsetDir);
      const endPos = basePos.clone()
        .add(uAxis.clone().multiplyScalar(endU))
        .add(vAxis.clone().multiplyScalar(v))
        .add(offsetDir);

      // Add workpiece offset
      startPos.x += workpieceOffset[0];
      startPos.y += workpieceOffset[1];
      startPos.z += workpieceOffset[2];
      endPos.x += workpieceOffset[0];
      endPos.y += workpieceOffset[1];
      endPos.z += workpieceOffset[2];

      // Start point
      waypoints.push({
        position: [startPos.x, startPos.y, startPos.z],
        quaternion,
        time,
      });

      // End point
      const lineLength = Math.abs(endU - startU);
      time += lineLength / speed;
      waypoints.push({
        position: [endPos.x, endPos.y, endPos.z],
        quaternion,
        time,
      });

      time += 0.1; // Small pause between lines
    }
  } else if (pattern === 'spiral') {
    const maxRadius = Math.min(region.size[0], region.size[1]) / 2;
    const numTurns = Math.ceil(maxRadius / stepoverM);
    const pointsPerTurn = 24;

    const basePos = new THREE.Vector3(...region.center);
    basePos.x += workpieceOffset[0];
    basePos.y += workpieceOffset[1];
    basePos.z += workpieceOffset[2];

    for (let turn = 0; turn < numTurns; turn++) {
      for (let j = 0; j < pointsPerTurn; j++) {
        const angle = (turn * pointsPerTurn + j) * (2 * Math.PI / pointsPerTurn);
        const radius = (turn / numTurns + j / (numTurns * pointsPerTurn)) * maxRadius;

        const pos = basePos.clone()
          .add(uAxis.clone().multiplyScalar(Math.cos(angle) * radius))
          .add(vAxis.clone().multiplyScalar(Math.sin(angle) * radius))
          .add(offsetDir);

        waypoints.push({
          position: [pos.x, pos.y, pos.z],
          quaternion,
          time,
        });

        time += (2 * Math.PI * radius / pointsPerTurn) / speed * 0.1;
      }
    }
  } else {
    // Contour pattern
    const corners = [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight],
      [-halfWidth, -halfHeight], // Close loop
    ];

    const basePos = new THREE.Vector3(...region.center);
    basePos.x += workpieceOffset[0];
    basePos.y += workpieceOffset[1];
    basePos.z += workpieceOffset[2];

    for (const [du, dv] of corners) {
      const pos = basePos.clone()
        .add(uAxis.clone().multiplyScalar(du))
        .add(vAxis.clone().multiplyScalar(dv))
        .add(offsetDir);

      waypoints.push({
        position: [pos.x, pos.y, pos.z],
        quaternion,
        time,
      });
      time += 0.5;
    }
  }

  return waypoints;
}

// ============================================================================
// Demo Inner Component (with context access)
// ============================================================================

interface GrindingDemoInnerProps {
  tcpDebug: TcpDebugState;
  onTcpDebugChange: (update: Partial<TcpDebugState>) => void;
}

function GrindingDemoInner({ tcpDebug, onTcpDebugChange }: GrindingDemoInnerProps) {
  const { addLog } = useAppStore();

  // Get regions from polyhedron workpiece
  const surfaceRegions = useMemo(() => createPolyhedronRegions(1), []);

  // State
  const [grindingSettings, setGrindingSettings] = useState<GrindingSettings>(DEFAULT_GRINDING_SETTINGS);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [grindingRegionId, setGrindingRegionId] = useState<string | null>(null);
  const [isGrinding, setIsGrinding] = useState(false);
  const [currentForce, setCurrentForce] = useState(0);
  const [grindingProgress, setGrindingProgress] = useState<Record<string, number>>({});
  const [dustPosition, setDustPosition] = useState<[number, number, number]>([0.5, 0.15, 0]);

  // Playback from context
  const playback = useProcessPlayback();
  const ghost = useProcessGhost();
  const state = useRobotProcessState();

  // Generate grinding trajectory from selected region
  const generateGrindingTrajectory = useCallback(() => {
    if (!selectedRegionId) {
      addLog('warning', 'Please select a surface region first');
      return;
    }

    const region = surfaceRegions.find(r => r.id === selectedRegionId);
    if (!region) return;

    const waypoints = generateGrindingPath(region, grindingSettings, [0.5, 0, 0]);

    if (waypoints.length === 0) {
      addLog('error', 'Failed to generate path');
      return;
    }

    const trajectory: PoseTrajectory = {
      id: `grind-${selectedRegionId}-${Date.now()}`,
      name: `Grind ${region.name} (${grindingSettings.pattern})`,
      waypoints,
      duration: waypoints[waypoints.length - 1].time,
    };

    playback.load(trajectory);
    addLog('info', `Generated ${grindingSettings.pattern} path: ${waypoints.length} points, ${trajectory.duration?.toFixed(1)}s`);
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
      // Calculate approach position (slightly offset from surface)
      const normal = new THREE.Vector3(...region.normal);
      const approachOffset = normal.clone().multiplyScalar(0.05); // 50mm offset
      const position: [number, number, number] = [
        0.5 + region.center[0] + approachOffset.x,
        region.center[1] + approachOffset.y,
        region.center[2] + approachOffset.z,
      ];

      // Calculate quaternion for tool orientation
      let quaternion: [number, number, number, number];
      if (region.face === 'top') {
        quaternion = [1, 0, 0, 0];
      } else if (region.face === 'front') {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        quaternion = [q.x, q.y, q.z, q.w];
      } else if (region.face === 'back') {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        quaternion = [q.x, q.y, q.z, q.w];
      } else if (region.face === 'left') {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        quaternion = [q.x, q.y, q.z, q.w];
      } else if (region.face === 'right') {
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        quaternion = [q.x, q.y, q.z, q.w];
      } else {
        quaternion = [1, 0, 0, 0];
      }

      ghost.setTarget({ position, quaternion });
    }
    addLog('info', `Selected region: ${id}`);
  }, [surfaceRegions, ghost, addLog]);

  const handleRegionHover = useCallback((_id: string | null) => {
    // Can add hover preview logic here if needed
  }, []);

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

  // Get selected region info
  const selectedRegion = surfaceRegions.find(r => r.id === selectedRegionId);

  return (
    <div className="module-container" style={{ background: THEME.background, overflowY: 'auto', maxHeight: '100%' }}>
      <div className="module-header" style={{ borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary }}>Multi-Face Surface Grinding</h2>
        <p style={{ color: THEME.textSecondary }}>Select surface regions on the polyhedron workpiece for force-controlled grinding</p>
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', gap: '24px', padding: '12px 16px', background: THEME.surface, borderRadius: '8px', marginBottom: '12px', border: `1px solid ${THEME.primary}30`, alignItems: 'center', flexWrap: 'wrap' }}>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>STATUS</span><div style={{ color: isGrinding ? THEME.accent : THEME.text, fontWeight: 'bold' }}>{isGrinding ? 'GRINDING' : 'IDLE'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>REGION</span><div style={{ color: selectedRegionId ? THEME.success : '#666', fontWeight: 'bold' }}>{selectedRegion?.name || 'None'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>FACE</span><div style={{ color: THEME.accent, fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedRegion?.face || '-'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>PATTERN</span><div style={{ color: THEME.text, fontWeight: 'bold', textTransform: 'uppercase' }}>{grindingSettings.pattern}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>PROGRESS</span><div style={{ color: THEME.accent, fontWeight: 'bold' }}>{(state.playbackPosition * 100).toFixed(0)}%</div></div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={generateGrindingTrajectory} disabled={isGrinding} style={btnStyle(!!selectedRegionId && !isGrinding, THEME.primary)}>Generate Path</button>
          <button onClick={startGrinding} disabled={!state.trajectory || isGrinding} style={btnStyle(!!state.trajectory && !isGrinding, THEME.success)}>Start Grinding</button>
          <button onClick={handleStop} disabled={!isGrinding} style={btnStyle(isGrinding, THEME.warning)}>Stop</button>
          <button onClick={handleReset} style={btnStyle(true, THEME.danger)}>Reset</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Left Panel */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <RegionSelectorPanel
            regions={surfaceRegions}
            selectedRegionId={selectedRegionId}
            grindingProgress={grindingProgress}
            onSelect={handleRegionSelect}
          />
          <GrindingPanel settings={grindingSettings} onChange={(partial) => setGrindingSettings(prev => ({ ...prev, ...partial }))} />
          <ForceFeedbackPanel force={currentForce} targetForce={grindingSettings.targetForce} active={isGrinding} />

          {/* TCP Debug Panel */}
          <TcpDebugPanel
            tcpDebug={tcpDebug}
            onTcpDebugChange={onTcpDebugChange}
            toolName="GrindingWheel"
            backgroundColor={THEME.background}
            accentColor={THEME.primary}
          />

          {state.trajectory && (
            <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
              <h4 style={{ margin: '0 0 12px 0', color: THEME.secondary }}>Trajectory</h4>
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
                regions={surfaceRegions}
                selectedRegionId={selectedRegionId}
                grindingRegionId={grindingRegionId}
                grindingProgress={grindingProgress}
                onRegionSelect={handleRegionSelect}
                onRegionHover={handleRegionHover}
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
  // TCP Debug state - lifted to this level to control RobotProcessProvider
  const [tcpDebug, setTcpDebug] = useState<TcpDebugState>(DEFAULT_TCP_DEBUG);

  const handleTcpDebugChange = useCallback((update: Partial<TcpDebugState>) => {
    setTcpDebug(prev => ({ ...prev, ...update }));
  }, []);

  // Compute TCP - use debug values if enabled, otherwise use metadata
  const tcp = useMemo(() => {
    if (tcpDebug.enabled) {
      return computeTcpFromDebug(tcpDebug);
    }
    return computeTcpFromMetadata(GRINDING_WHEEL_METADATA);
  }, [tcpDebug.enabled, tcpDebug.position, tcpDebug.rotation]);

  // Key changes when TCP debug changes to force re-mount of RobotProcessProvider
  const providerKey = tcpDebug.enabled
    ? `debug-${tcpDebug.position.join('-')}-${tcpDebug.rotation.join('-')}`
    : 'default';

  return (
    <ProcessProvider>
      <RobotProcessProvider
        key={providerKey}
        urdfPath={URDF_PATH}
        robotId="grinding-robot"
        tool={{ position: tcp.position, quaternion: tcp.quaternion }}
      >
        <GrindingDemoInner tcpDebug={tcpDebug} onTcpDebugChange={handleTcpDebugChange} />
      </RobotProcessProvider>
    </ProcessProvider>
  );
}

export default GrindingScene;
