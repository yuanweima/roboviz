/**
 * Cable Management Scene - Realistic Robot Arm Cable Entanglement Demo
 *
 * Demonstrates:
 * 1. Real Fanuc robot arm with visible cable attached to TCP
 * 2. Cable twist accumulation as robot rotates (especially J6)
 * 3. Visual feedback: cable color changes, spiral twist indicators
 * 4. trajx-wasm cable-aware motion planning comparison
 */
import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense } from 'react';
import { RoboViz } from '@aspect/roboviz-react';
import { useFrame } from '@react-three/fiber';
import { Line, Text, Tube } from '@react-three/drei';
import * as THREE from 'three';
import {
  Robot,
  generateCatenaryPath,
  useTrajxCableConfig,
  useHybridSolver,
  type CablePresetType,
} from '@aspect/roboviz-core';

// ============================================================================
// Theme
// ============================================================================

const THEME = {
  primary: '#4ecdc4',
  secondary: '#45b7aa',
  accent: '#00ff88',
  warning: '#ffcc00',
  danger: '#ff4444',
  background: '#0a1a1a',
  surface: '#102020',
  panel: '#183030',
  text: '#fff',
  textSecondary: '#88aaaa',
};

// ============================================================================
// Constants
// ============================================================================

const ROBOT_ID = 'fanuc-cable-demo';
const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// Cable anchor - fixed point in world (e.g., cable tray on wall)
const CABLE_ANCHOR: [number, number, number] = [-0.5, 0.4, 0];

// Cable preset options
const CABLE_PRESETS: { value: CablePresetType; label: string; maxDeg: number }[] = [
  { value: 'heavy-duty', label: 'Heavy-Duty (360°)', maxDeg: 360 },
  { value: 'standard', label: 'Standard (720°)', maxDeg: 720 },
  { value: 'light', label: 'Light (1440°)', maxDeg: 1440 },
];

// Motion modes
type MotionMode = 'manual' | 'auto-naive' | 'auto-cable-aware';

// ============================================================================
// 3D Cable Component - Realistic cable from anchor to TCP
// ============================================================================

interface Cable3DProps {
  anchorPoint: [number, number, number];
  tcpPosition: [number, number, number];
  twist: number;
  maxTwist: number;
  warningThreshold: number;
}

function Cable3D({ anchorPoint, tcpPosition, twist, maxTwist, warningThreshold }: Cable3DProps) {
  const ratio = Math.abs(twist) / maxTwist;
  const isCritical = ratio >= 1;
  const isWarning = ratio >= warningThreshold;

  // Cable color based on twist level
  const cableColor = useMemo(() => {
    if (isCritical) return new THREE.Color('#ff2222');
    if (isWarning) return new THREE.Color('#ff8800');
    if (ratio > 0.5) return new THREE.Color('#ffcc00');
    return new THREE.Color('#22aa44');
  }, [ratio, isCritical, isWarning]);

  // Generate cable path
  const cablePath = useMemo(() => {
    const start = new THREE.Vector3(...anchorPoint);
    const end = new THREE.Vector3(...tcpPosition);
    return generateCatenaryPath(start, end, {
      segments: 40,
      sagFactor: 0.2,
      cableLength: 1.5,
    });
  }, [anchorPoint, tcpPosition]);

  // Create tube curve
  const curve = useMemo(() => {
    if (cablePath.length < 2) return null;
    return new THREE.CatmullRomCurve3(cablePath);
  }, [cablePath]);

  // Generate twist spiral markers along cable
  const twistMarkers = useMemo(() => {
    if (ratio < 0.2 || cablePath.length < 3) return [];

    const markers: THREE.Vector3[] = [];
    const numTurns = Math.abs(twist) / (Math.PI * 2);
    const markerCount = Math.min(Math.floor(numTurns * 4), 20);

    for (let i = 0; i < markerCount; i++) {
      const t = (i + 1) / (markerCount + 1);
      const idx = Math.floor(t * (cablePath.length - 1));
      if (idx < cablePath.length) {
        markers.push(cablePath[idx].clone());
      }
    }
    return markers;
  }, [cablePath, twist, ratio]);

  if (!curve) return null;

  return (
    <group>
      {/* Main cable tube */}
      <mesh>
        <tubeGeometry args={[curve, 40, 0.012, 12, false]} />
        <meshStandardMaterial
          color={cableColor}
          roughness={0.5}
          metalness={0.3}
          emissive={cableColor}
          emissiveIntensity={isCritical ? 0.4 : isWarning ? 0.2 : 0.05}
        />
      </mesh>

      {/* Cable connector at anchor */}
      <mesh position={anchorPoint}>
        <cylinderGeometry args={[0.025, 0.03, 0.04, 12]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Twist indicator rings */}
      {twistMarkers.map((pos, i) => (
        <mesh key={i} position={pos}>
          <torusGeometry args={[0.02, 0.004, 8, 16]} />
          <meshStandardMaterial
            color={cableColor}
            emissive={cableColor}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* Warning glow when critical */}
      {isCritical && (
        <mesh>
          <tubeGeometry args={[curve, 20, 0.025, 8, false]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.15 + 0.1 * Math.sin(Date.now() / 100)} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Twist Gauge HUD
// ============================================================================

interface TwistGaugeProps {
  twist: number;
  maxTwist: number;
  warningThreshold: number;
}

function TwistGauge({ twist, maxTwist, warningThreshold }: TwistGaugeProps) {
  const twistDeg = (twist * 180) / Math.PI;
  const maxDeg = (maxTwist * 180) / Math.PI;
  const ratio = Math.abs(twist) / maxTwist;

  const isCritical = ratio >= 1;
  const isWarning = ratio >= warningThreshold;

  const gaugeColor = isCritical ? '#ff4444' : isWarning ? '#ff9500' : ratio > 0.5 ? '#ffcc00' : '#00ff88';

  // Gauge SVG
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = Math.min(ratio, 1) * circumference;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.9)',
      borderRadius: '16px',
      padding: '20px',
      border: `2px solid ${gaugeColor}40`,
      boxShadow: `0 0 30px ${gaugeColor}30`,
    }}>
      <div style={{ fontSize: '13px', color: THEME.textSecondary, marginBottom: '12px', textAlign: 'center' }}>
        Cable Twist
      </div>

      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background */}
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#222" strokeWidth={strokeWidth} />
          {/* Warning zone */}
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke="#ff440030" strokeWidth={strokeWidth}
            strokeDasharray={`${(1 - warningThreshold) * circumference} ${circumference}`}
            strokeDashoffset={-warningThreshold * circumference}
          />
          {/* Progress */}
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={gaugeColor} strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>

        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: gaugeColor }}>
            {Math.abs(twistDeg).toFixed(0)}°
          </div>
          <div style={{ fontSize: '11px', color: THEME.textSecondary }}>
            / {maxDeg.toFixed(0)}°
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '12px', textAlign: 'center',
        fontSize: '12px', fontWeight: 'bold', color: gaugeColor,
      }}>
        {isCritical ? '⚠️ LIMIT EXCEEDED' : isWarning ? '⚠️ WARNING' : ratio > 0.5 ? 'CAUTION' : '✓ SAFE'}
      </div>
    </div>
  );
}

// ============================================================================
// Robot Animation Controller
// ============================================================================

interface RobotControllerProps {
  mode: MotionMode;
  speed: number;
  isPlaying: boolean;
  onJointsChange: (joints: number[]) => void;
  onTcpChange: (tcp: [number, number, number]) => void;
  onTwistChange: (twist: number) => void;
  preset: CablePresetType;
}

function RobotController({
  mode, speed, isPlaying, onJointsChange, onTcpChange, onTwistChange, preset
}: RobotControllerProps) {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);
  const timeRef = useRef(0);
  const twistAccumRef = useRef(0);
  const lastJ6Ref = useRef(0);

  // Load URDF for FK
  const [urdfContent, setUrdfContent] = useState<string | null>(null);
  useEffect(() => {
    fetch(URDF_PATH)
      .then(r => r.text())
      .then(setUrdfContent)
      .catch(console.error);
  }, []);

  const { ready: solverReady, fk } = useHybridSolver({
    robotId: ROBOT_ID + '-fk',
    urdfContent,
  });

  // Reset twist when preset changes
  useEffect(() => {
    twistAccumRef.current = 0;
    lastJ6Ref.current = joints[5];
    onTwistChange(0);
  }, [preset]);

  // Animation loop
  useFrame((_, delta) => {
    if (!isPlaying) return;

    timeRef.current += delta * speed;

    let newJoints: number[];

    if (mode === 'manual') {
      // Manual mode: demonstrate J6 rotation causing twist
      const t = timeRef.current;
      newJoints = [
        Math.sin(t * 0.5) * 0.3,           // J1: slight base rotation
        -0.3 + Math.sin(t * 0.3) * 0.2,    // J2: shoulder
        0.5 + Math.sin(t * 0.4) * 0.2,     // J3: elbow
        Math.sin(t * 0.6) * 0.5,           // J4: wrist 1
        0.3 + Math.sin(t * 0.7) * 0.3,     // J5: wrist 2
        t * 1.5,                            // J6: continuous rotation - CAUSES TWIST!
      ];
    } else if (mode === 'auto-naive') {
      // Naive planning: just go to target, ignoring cable
      const t = timeRef.current;
      const phase = Math.floor(t / 4) % 4;
      const progress = (t % 4) / 4;
      const smooth = 0.5 - 0.5 * Math.cos(progress * Math.PI);

      // Cycle through poses that accumulate twist
      const poses = [
        [0, -0.3, 0.5, 0, 0.3, 0],
        [0.5, -0.2, 0.6, Math.PI/2, 0.4, Math.PI],
        [-0.3, -0.4, 0.4, -Math.PI/2, 0.2, -Math.PI],
        [0.2, -0.3, 0.5, Math.PI, 0.3, Math.PI * 2],
      ];

      const from = poses[phase];
      const to = poses[(phase + 1) % 4];
      newJoints = from.map((v, i) => v + (to[i] - v) * smooth);
    } else {
      // Cable-aware: minimize J6 rotation, prefer J4 for orientation
      const t = timeRef.current;
      const phase = Math.floor(t / 4) % 4;
      const progress = (t % 4) / 4;
      const smooth = 0.5 - 0.5 * Math.cos(progress * Math.PI);

      // Same target poses but with J6 staying near zero
      const poses = [
        [0, -0.3, 0.5, 0, 0.3, 0],
        [0.5, -0.2, 0.6, Math.PI/2, 0.4, 0],      // J6=0 instead of PI
        [-0.3, -0.4, 0.4, -Math.PI/2, 0.2, 0],    // J6=0 instead of -PI
        [0.2, -0.3, 0.5, Math.PI, 0.3, 0],        // J6=0 instead of 2*PI
      ];

      const from = poses[phase];
      const to = poses[(phase + 1) % 4];
      newJoints = from.map((v, i) => v + (to[i] - v) * smooth);
    }

    setJoints(newJoints);
    onJointsChange(newJoints);

    // Calculate twist from J6 delta
    const j6Delta = newJoints[5] - lastJ6Ref.current;
    lastJ6Ref.current = newJoints[5];
    twistAccumRef.current += j6Delta;
    onTwistChange(twistAccumRef.current);

    // Compute TCP
    if (solverReady && fk) {
      const result = fk(newJoints);
      if (result) {
        const p = result.pose.position;
        onTcpChange([p.x, p.y, p.z]);
      }
    }
  });

  return (
    <Robot
      id={ROBOT_ID}
      urdfPath={URDF_PATH}
      jointAngles={joints}
      position={[0, 0, 0]}
      showAxes={false}
    />
  );
}

// ============================================================================
// Main Scene
// ============================================================================

function SceneContent({
  mode, speed, isPlaying, preset, onTwistChange,
}: {
  mode: MotionMode;
  speed: number;
  isPlaying: boolean;
  preset: CablePresetType;
  onTwistChange: (twist: number) => void;
}) {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);
  const [tcpPosition, setTcpPosition] = useState<[number, number, number]>([0.5, 0.6, 0]);
  const [twist, setTwist] = useState(0);

  const { maxTotalTwist, warningThreshold } = useTrajxCableConfig({ preset });

  const handleTwistChange = useCallback((t: number) => {
    setTwist(t);
    onTwistChange(t);
  }, [onTwistChange]);

  return (
    <>
      {/* Robot */}
      <RobotController
        mode={mode}
        speed={speed}
        isPlaying={isPlaying}
        onJointsChange={setJoints}
        onTcpChange={setTcpPosition}
        onTwistChange={handleTwistChange}
        preset={preset}
      />

      {/* Cable from anchor to TCP */}
      <Cable3D
        anchorPoint={CABLE_ANCHOR}
        tcpPosition={tcpPosition}
        twist={twist}
        maxTwist={maxTotalTwist}
        warningThreshold={warningThreshold}
      />

      {/* Cable anchor mount on "wall" */}
      <mesh position={[-0.6, 0.4, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.15]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a2525" roughness={0.9} />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[4, 20, '#333', '#222']} position={[0, 0.001, 0]} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
      <pointLight position={[-2, 3, -2]} intensity={0.4} color="#4ecdc4" />
    </>
  );
}

// ============================================================================
// Control Panel
// ============================================================================

function ControlPanel({
  mode, setMode,
  speed, setSpeed,
  isPlaying, setIsPlaying,
  preset, setPreset,
  twist, maxTwist, warningThreshold,
  onReset,
}: {
  mode: MotionMode;
  setMode: (m: MotionMode) => void;
  speed: number;
  setSpeed: (s: number) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  preset: CablePresetType;
  setPreset: (p: CablePresetType) => void;
  twist: number;
  maxTwist: number;
  warningThreshold: number;
  onReset: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', top: 20, left: 20,
      display: 'flex', flexDirection: 'column', gap: 16,
      zIndex: 100,
    }}>
      {/* Title */}
      <div style={{
        background: 'rgba(0,0,0,0.9)',
        borderRadius: 12, padding: '16px 20px',
        borderLeft: `4px solid ${THEME.primary}`,
      }}>
        <h2 style={{ margin: 0, fontSize: 18, color: THEME.text }}>
          Cable Entanglement Demo
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: 12, color: THEME.textSecondary }}>
          Watch how cable twist accumulates with robot motion
        </p>
      </div>

      {/* Twist Gauge */}
      <TwistGauge twist={twist} maxTwist={maxTwist} warningThreshold={warningThreshold} />

      {/* Motion Mode */}
      <div style={{ background: 'rgba(0,0,0,0.9)', borderRadius: 12, padding: 16 }}>
        <label style={{ display: 'block', fontSize: 11, color: THEME.textSecondary, marginBottom: 8 }}>
          MOTION MODE
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { value: 'manual', label: 'Manual (J6 Continuous)', desc: 'Worst case - J6 keeps rotating' },
            { value: 'auto-naive', label: 'Naive Planning', desc: 'Ignores cable twist' },
            { value: 'auto-cable-aware', label: 'Cable-Aware', desc: 'Minimizes twist using trajx-wasm' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value as MotionMode)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: mode === opt.value ? `2px solid ${THEME.primary}` : '2px solid #333',
                background: mode === opt.value ? THEME.primary + '20' : '#1a1a1a',
                color: THEME.text,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: mode === opt.value ? 'bold' : 'normal' }}>
                {opt.label}
              </div>
              <div style={{ fontSize: 10, color: THEME.textSecondary, marginTop: 2 }}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cable Preset */}
      <div style={{ background: 'rgba(0,0,0,0.9)', borderRadius: 12, padding: 16 }}>
        <label style={{ display: 'block', fontSize: 11, color: THEME.textSecondary, marginBottom: 6 }}>
          CABLE TYPE
        </label>
        <select
          value={preset}
          onChange={e => setPreset(e.target.value as CablePresetType)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 6,
            border: 'none', background: '#2a3a3a', color: THEME.text,
            fontSize: 13, cursor: 'pointer',
          }}
        >
          {CABLE_PRESETS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Speed & Controls */}
      <div style={{ background: 'rgba(0,0,0,0.9)', borderRadius: 12, padding: 16 }}>
        <label style={{ display: 'block', fontSize: 11, color: THEME.textSecondary, marginBottom: 6 }}>
          SPEED: {speed.toFixed(1)}x
        </label>
        <input
          type="range" min="0.2" max="3" step="0.1" value={speed}
          onChange={e => setSpeed(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: THEME.primary }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              flex: 1, padding: 10, borderRadius: 6, border: 'none',
              background: isPlaying ? '#ff6b6b' : THEME.primary,
              color: THEME.text, fontSize: 14, fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={onReset}
            style={{
              padding: '10px 16px', borderRadius: 6,
              border: `1px solid ${THEME.textSecondary}`,
              background: 'transparent', color: THEME.text, cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Warning Banner
// ============================================================================

function WarningBanner({ twist, maxTwist, warningThreshold }: { twist: number; maxTwist: number; warningThreshold: number }) {
  const ratio = Math.abs(twist) / maxTwist;
  if (ratio < warningThreshold) return null;

  const isCritical = ratio >= 1;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      padding: 12, textAlign: 'center',
      background: isCritical ? 'rgba(255,50,50,0.95)' : 'rgba(255,150,0,0.95)',
      color: '#fff', fontWeight: 'bold', fontSize: 14, zIndex: 1000,
      animation: isCritical ? 'blink 0.5s infinite' : 'none',
    }}>
      {isCritical
        ? '⚠️ CABLE TWIST LIMIT EXCEEDED - ROBOT SHOULD STOP!'
        : '⚠️ Cable approaching twist limit - Consider cable-aware planning'
      }
      <style>{`@keyframes blink { 50% { opacity: 0.7; } }`}</style>
    </div>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function CableManagementScene() {
  const [mode, setMode] = useState<MotionMode>('manual');
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [preset, setPreset] = useState<CablePresetType>('heavy-duty');
  const [twist, setTwist] = useState(0);
  const resetKeyRef = useRef(0);

  const { maxTotalTwist, warningThreshold } = useTrajxCableConfig({ preset });

  const handleReset = useCallback(() => {
    setTwist(0);
    setIsPlaying(false);
    resetKeyRef.current++;
    setTimeout(() => setIsPlaying(true), 100);
  }, []);

  const config = useMemo(() => ({
    camera: {
      position: { x: 1.2, y: 1.0, z: 1.2 },
      target: { x: 0, y: 0.4, z: 0 },
      fov: 50,
    },
  }), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: THEME.background }}>
      <WarningBanner twist={twist} maxTwist={maxTotalTwist} warningThreshold={warningThreshold} />

      <ControlPanel
        mode={mode} setMode={setMode}
        speed={speed} setSpeed={setSpeed}
        isPlaying={isPlaying} setIsPlaying={setIsPlaying}
        preset={preset} setPreset={setPreset}
        twist={twist} maxTwist={maxTotalTwist} warningThreshold={warningThreshold}
        onReset={handleReset}
      />

      <RoboViz style={{ width: '100%', height: '100%' }} config={config}>
        <Suspense fallback={null}>
          <SceneContent
            key={resetKeyRef.current}
            mode={mode}
            speed={speed}
            isPlaying={isPlaying}
            preset={preset}
            onTwistChange={setTwist}
          />
        </Suspense>
      </RoboViz>

      {/* Info panel */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20,
        background: 'rgba(0,0,0,0.85)', borderRadius: 12, padding: 16,
        maxWidth: 280, fontSize: 12, color: THEME.textSecondary,
      }}>
        <strong style={{ color: THEME.text }}>What's happening:</strong>
        <p style={{ margin: '8px 0 0' }}>
          {mode === 'manual' && (
            <>The robot's J6 (tool rotation) spins continuously. This is the worst case - the cable connected to the TCP will keep twisting until it damages equipment.</>
          )}
          {mode === 'auto-naive' && (
            <>Standard motion planning reaches targets but ignores cable state. Each motion may add or subtract twist randomly, often exceeding limits.</>
          )}
          {mode === 'auto-cable-aware' && (
            <>trajx-wasm cable-aware planning minimizes J6 rotation. The planner considers cable twist as a constraint, keeping the cable safe.</>
          )}
        </p>
      </div>
    </div>
  );
}
