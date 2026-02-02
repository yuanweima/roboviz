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
// Rendering components
import { Robot } from '@aspect/roboviz-core/rendering';
// Kinematics hooks and cable config
import {
  useTrajxCableConfig,
  useHybridSolver,
  type CablePresetType,
} from '@aspect/roboviz-core/kinematics';
// Cable utility from main entry (capabilities module)
import { generateCatenaryPath } from '@aspect/roboviz-core';

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
// Z-up coordinates: [x, y, z_height]
// Cable anchor point in front of the robot (+X direction) to avoid cable going through robot
const CABLE_ANCHOR: [number, number, number] = [0.6, -0.4, 0.3];

// Cable preset options
const CABLE_PRESETS: { value: CablePresetType; label: string; maxDeg: number }[] = [
  { value: 'heavy-duty', label: 'Heavy-Duty (360°)', maxDeg: 360 },
  { value: 'standard', label: 'Standard (720°)', maxDeg: 720 },
  { value: 'light', label: 'Light (1440°)', maxDeg: 1440 },
];

// Motion modes
type MotionMode = 'manual' | 'auto-naive' | 'auto-cable-aware';

// ============================================================================
// 3D Cable Component - Realistic cable routed along robot arm
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

  // Cable color based on twist level - more vivid colors for better visibility
  const cableColor = useMemo(() => {
    if (isCritical) return new THREE.Color('#ff0000'); // Bright red
    if (isWarning) return new THREE.Color('#ff6600'); // Orange
    if (ratio > 0.5) return new THREE.Color('#ffaa00'); // Yellow
    return new THREE.Color('#00cc66'); // Green
  }, [ratio, isCritical, isWarning]);

  // Generate cable path - simple catenary curve that droops naturally
  // We avoid complex routing through links as it can cause penetration issues
  const cablePath = useMemo(() => {
    const start = new THREE.Vector3(...anchorPoint);
    const end = new THREE.Vector3(...tcpPosition);

    // Use catenary (hanging cable) physics for natural droop
    // The cable hangs down due to gravity (Z-down in this context)
    return generateCatenaryPath(start, end, {
      segments: 50,
      sagFactor: 0.35, // More droop to stay clear of robot
      gravityDirection: new THREE.Vector3(0, 0, -1), // Z-down
    });
  }, [anchorPoint, tcpPosition]);

  // Create tube curve
  const curve = useMemo(() => {
    if (cablePath.length < 2) return null;
    return new THREE.CatmullRomCurve3(cablePath);
  }, [cablePath]);


  // Pulsing effect for critical state
  const [pulsePhase, setPulsePhase] = useState(0);
  useFrame((_, delta) => {
    if (isCritical) {
      setPulsePhase((p) => (p + delta * 8) % (Math.PI * 2));
    }
  });

  if (!curve) return null;

  const pulseIntensity = isCritical ? 0.3 + 0.2 * Math.sin(pulsePhase) : 0;

  return (
    <group>
      {/* Main cable tube - thicker for visibility */}
      <mesh>
        <tubeGeometry args={[curve, 64, 0.015, 16, false]} />
        <meshStandardMaterial
          color={cableColor}
          roughness={0.4}
          metalness={0.2}
          emissive={cableColor}
          emissiveIntensity={isCritical ? 0.5 + pulseIntensity : isWarning ? 0.3 : 0.1}
        />
      </mesh>

      {/* Cable connector at anchor - larger and more visible */}
      <mesh position={anchorPoint}>
        <cylinderGeometry args={[0.03, 0.035, 0.05, 16]} />
        <meshStandardMaterial color="#666" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Cable connector at TCP */}
      <mesh position={tcpPosition}>
        <cylinderGeometry args={[0.025, 0.03, 0.04, 16]} />
        <meshStandardMaterial color="#666" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Warning glow when critical - larger and pulsing */}
      {isCritical && (
        <mesh>
          <tubeGeometry args={[curve, 32, 0.04, 8, false]} />
          <meshBasicMaterial
            color="#ff0000"
            transparent
            opacity={0.2 + pulseIntensity}
          />
        </mesh>
      )}

      {/* Warning glow when warning level */}
      {isWarning && !isCritical && (
        <mesh>
          <tubeGeometry args={[curve, 32, 0.03, 8, false]} />
          <meshBasicMaterial
            color="#ff6600"
            transparent
            opacity={0.15}
          />
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
// Flange Tool - Shows rotation clearly with asymmetric marker
// ============================================================================

// TCP pose type including position and quaternion
interface TcpPose {
  position: [number, number, number];
  quaternion: [number, number, number, number]; // [x, y, z, w]
}

interface FlangeToolProps {
  pose: TcpPose;
  twist: number;
  maxTwist: number;
}

function FlangeTool({ pose, twist, maxTwist }: FlangeToolProps) {
  const ratio = Math.abs(twist) / maxTwist;
  const isCritical = ratio >= 1;
  const isWarning = ratio >= 0.8;

  // Color for the marker based on twist level
  const markerColor = useMemo(() => {
    if (isCritical) return '#ff0000';
    if (isWarning) return '#ff6600';
    if (ratio > 0.5) return '#ffaa00';
    return '#00cc66';
  }, [ratio, isCritical, isWarning]);

  // Create quaternion from pose
  const quaternion = useMemo(() => {
    return new THREE.Quaternion(
      pose.quaternion[0],
      pose.quaternion[1],
      pose.quaternion[2],
      pose.quaternion[3]
    );
  }, [pose.quaternion]);

  return (
    <group position={pose.position} quaternion={quaternion}>
      {/* Flange base plate */}
      <mesh position={[0, 0, 0.01]}>
        <cylinderGeometry args={[0.04, 0.04, 0.02, 24]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Main rod/pole extending from flange */}
      <mesh position={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.012, 0.012, 0.12, 16]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Asymmetric marker - L-shaped bracket to show rotation clearly */}
      <group position={[0, 0, 0.1]}>
        {/* Horizontal arm of L */}
        <mesh position={[0.04, 0, 0]}>
          <boxGeometry args={[0.06, 0.015, 0.015]} />
          <meshStandardMaterial
            color={markerColor}
            emissive={markerColor}
            emissiveIntensity={isCritical ? 0.5 : 0.2}
          />
        </mesh>

        {/* Vertical arm of L - offset to make it clearly asymmetric */}
        <mesh position={[0.065, 0.025, 0]}>
          <boxGeometry args={[0.015, 0.035, 0.015]} />
          <meshStandardMaterial
            color={markerColor}
            emissive={markerColor}
            emissiveIntensity={isCritical ? 0.5 : 0.2}
          />
        </mesh>

        {/* Arrow tip to indicate direction */}
        <mesh position={[0.08, 0.045, 0]} rotation={[0, 0, Math.PI / 4]}>
          <coneGeometry args={[0.015, 0.025, 4]} />
          <meshStandardMaterial
            color={markerColor}
            emissive={markerColor}
            emissiveIntensity={isCritical ? 0.5 : 0.2}
          />
        </mesh>
      </group>

      {/* Cable attachment point - where cable connects */}
      <mesh position={[0, 0, 0.15]}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshStandardMaterial color="#666" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
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
  onTcpPoseChange: (pose: TcpPose) => void;
  onTwistChange: (twist: number) => void;
  preset: CablePresetType;
  maxTwist: number; // Max twist limit from cable config
}

function RobotController({
  mode, speed, isPlaying, onJointsChange, onTcpPoseChange, onTwistChange, preset, maxTwist
}: RobotControllerProps) {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);
  const timeRef = useRef(0);
  const twistAccumRef = useRef(0);
  const lastJ6Ref = useRef(0);
  const j6AccumRef = useRef(0); // Accumulated J6 for manual mode
  const j6DirectionRef = useRef(1); // 1 = forward, -1 = reverse

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
    coordinateSystem: 'Z-up', // Match scene coordinate system
  });

  // Reset twist when preset changes
  useEffect(() => {
    twistAccumRef.current = 0;
    lastJ6Ref.current = joints[5];
    j6AccumRef.current = 0;
    j6DirectionRef.current = 1;
    onTwistChange(0);
  }, [preset]);

  // Animation loop
  useFrame((_, delta) => {
    if (!isPlaying) return;

    timeRef.current += delta * speed;

    let newJoints: number[];

    if (mode === 'manual') {
      // Manual mode: demonstrate J6 rotation causing twist
      // J6 accumulates rotation until approaching twist limit, then reverses
      const t = timeRef.current;
      const j6Speed = 1.5 * delta * speed;

      // Check if we're approaching the twist limit (use 95% as the reversal point)
      const currentTwist = twistAccumRef.current;
      if (Math.abs(currentTwist) >= maxTwist * 0.95) {
        // Reverse direction when near limit
        j6DirectionRef.current = -Math.sign(currentTwist);
      }

      // Accumulate J6 rotation
      j6AccumRef.current += j6Speed * j6DirectionRef.current;

      newJoints = [
        Math.sin(t * 0.5) * 0.3,           // J1: slight base rotation
        -0.3 + Math.sin(t * 0.3) * 0.2,    // J2: shoulder
        0.5 + Math.sin(t * 0.4) * 0.2,     // J3: elbow
        Math.sin(t * 0.6) * 0.5,           // J4: wrist 1
        0.3 + Math.sin(t * 0.7) * 0.3,     // J5: wrist 2
        j6AccumRef.current,                 // J6: controlled rotation that reverses at limits
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

    // Compute TCP pose (position + orientation)
    if (solverReady && fk) {
      const result = fk(newJoints);
      if (result) {
        const p = result.pose.position;
        const q = result.pose.orientation;
        onTcpPoseChange({
          position: [p.x, p.y, p.z],
          quaternion: [q.x, q.y, q.z, q.w],
        });
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
  // TCP pose with position and orientation
  const [tcpPose, setTcpPose] = useState<TcpPose>({
    position: [0.5, 0, 0.6],
    quaternion: [0, 0, 0, 1],
  });
  const [twist, setTwist] = useState(0);

  const { maxTotalTwist, warningThreshold } = useTrajxCableConfig({ preset });

  const handleTwistChange = useCallback((t: number) => {
    setTwist(t);
    onTwistChange(t);
  }, [onTwistChange]);

  const handleTcpPoseChange = useCallback((pose: TcpPose) => {
    setTcpPose(pose);
  }, []);

  // Calculate cable endpoint - offset from TCP along the tool axis
  const cableEndpoint = useMemo((): [number, number, number] => {
    const q = new THREE.Quaternion(
      tcpPose.quaternion[0],
      tcpPose.quaternion[1],
      tcpPose.quaternion[2],
      tcpPose.quaternion[3]
    );
    // Offset along local Z axis (tool direction) to reach cable attachment point
    const offset = new THREE.Vector3(0, 0, 0.15).applyQuaternion(q);
    return [
      tcpPose.position[0] + offset.x,
      tcpPose.position[1] + offset.y,
      tcpPose.position[2] + offset.z,
    ];
  }, [tcpPose]);

  return (
    <>
      {/* Robot */}
      <RobotController
        mode={mode}
        speed={speed}
        isPlaying={isPlaying}
        onJointsChange={setJoints}
        onTcpPoseChange={handleTcpPoseChange}
        onTwistChange={handleTwistChange}
        preset={preset}
        maxTwist={maxTotalTwist}
      />

      {/* Flange tool with asymmetric marker to show rotation */}
      <FlangeTool
        pose={tcpPose}
        twist={twist}
        maxTwist={maxTotalTwist}
      />

      {/* Cable from anchor to flange tool attachment point */}
      <Cable3D
        anchorPoint={CABLE_ANCHOR}
        tcpPosition={cableEndpoint}
        twist={twist}
        maxTwist={maxTotalTwist}
        warningThreshold={warningThreshold}
      />

      {/* Cable anchor mount - positioned in front of robot */}
      <mesh position={[0.6, -0.4, 0.15]}>
        <boxGeometry args={[0.15, 0.15, 0.3]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Ground - on XY plane for Z-up, no rotation needed */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a2525" roughness={0.9} />
      </mesh>

      {/* Grid helper - Z-up scene already configured, no rotation needed */}
      <gridHelper args={[4, 20, '#333', '#222']} position={[0, 0, 0.001]} rotation={[Math.PI / 2, 0, 0]} />

      {/* Lighting - Z-up: [x, y, z_height] */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 8]} intensity={0.8} castShadow />
      <pointLight position={[-2, -2, 3]} intensity={0.4} color="#4ecdc4" />
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
