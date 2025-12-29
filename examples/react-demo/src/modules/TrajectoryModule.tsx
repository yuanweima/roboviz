/**
 * Trajectory Module Demo
 *
 * 使用 @aspect/roboviz-react 的轨迹播放演示
 *
 * 展示功能:
 * - 生成和可视化机器人轨迹
 * - 使用 useTrajectoryPlayer hook 控制播放
 * - 实时TCP轨迹可视化
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls, button } from 'leva';
import * as THREE from 'three';
import {
  RoboViz,
  Robot,
  useTrajectoryPlayer,
  type TrajectoryData,
  type TrajectoryPlayerState,
  type TrajectoryPlayerControls,
} from '@aspect/roboviz-react';
import { useHybridSolver } from '@aspect/roboviz-core';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// Joint limits for Fanuc LR Mate 200iD/7L (approximate, in radians)
// All joints should stay within [-6.2, 6.2] to avoid FK errors
const JOINT_LIMITS = {
  J1: [-2.8, 2.8],
  J2: [-1.0, 1.5],
  J3: [-0.8, 2.5],
  J4: [-3.1, 3.1],
  J5: [-2.0, 2.0],
  J6: [-6.0, 6.0], // Wrist rotation - most flexible but still has limits
};

// Clamp angle to joint limits
function clampJoint(angle: number, jointIndex: number): number {
  const limits = [JOINT_LIMITS.J1, JOINT_LIMITS.J2, JOINT_LIMITS.J3,
                  JOINT_LIMITS.J4, JOINT_LIMITS.J5, JOINT_LIMITS.J6];
  const [min, max] = limits[jointIndex];
  return Math.max(min, Math.min(max, angle));
}

// 生成轨迹 - 确保关节角度在限制范围内
function generateTrajectory(type: 'pick-place' | 'circular' | 'wave'): TrajectoryData {
  const numPoints = 100;
  const duration = 5;
  const times: number[] = [];
  const positions: number[][] = [];

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1)) * duration;
    times.push(t);

    let angles: number[];
    const phase = (t / duration) * Math.PI * 2;

    switch (type) {
      case 'pick-place':
        // Pick and place motion - safe joint angles
        const segment = Math.floor((t / duration) * 4);
        const segProgress = ((t / duration) * 4) % 1;
        switch (segment) {
          case 0: // Move down to pick
            angles = [0, -0.3 - 0.2 * segProgress, 0.6 + 0.3 * segProgress, 0, 0.3, 0];
            break;
          case 1: // Rotate to place position
            angles = [0.5 * segProgress, -0.5, 0.9, 0, 0.3, 0];
            break;
          case 2: // Move up slightly
            angles = [0.5, -0.5 + 0.2 * segProgress, 0.9 - 0.1 * segProgress, 0, 0.3, 0];
            break;
          default: // Return to start
            angles = [0.5 - 0.5 * segProgress, -0.3, 0.8, 0, 0.3, 0];
        }
        break;

      case 'circular':
        // Circular motion - keep all joints within safe limits
        angles = [
          0.5 * Math.sin(phase),           // J1: ±0.5 rad
          -0.3 + 0.2 * Math.cos(phase),    // J2: -0.5 to -0.1 rad
          0.8 + 0.3 * Math.sin(phase),     // J3: 0.5 to 1.1 rad
          0.5 * Math.sin(phase * 1.5),     // J4: ±0.5 rad (removed continuous rotation)
          0.3 * Math.cos(phase),           // J5: ±0.3 rad
          1.0 * Math.sin(phase * 2),       // J6: ±1.0 rad (oscillating instead of continuous)
        ];
        break;

      case 'wave':
      default:
        // Wave motion - smooth oscillations within limits
        angles = [
          0.4 * Math.sin(phase),           // J1: ±0.4 rad
          -0.3 + 0.2 * Math.sin(phase * 2), // J2: -0.5 to -0.1 rad
          0.7 + 0.3 * Math.cos(phase),     // J3: 0.4 to 1.0 rad
          0.5 * Math.sin(phase * 1.5),     // J4: ±0.5 rad
          0.4 * Math.cos(phase * 2),       // J5: ±0.4 rad
          0.8 * Math.sin(phase * 3),       // J6: ±0.8 rad
        ];
    }

    // Clamp all angles to ensure they're within limits
    angles = angles.map((a, idx) => clampJoint(a, idx));
    positions.push(angles);
  }

  return { times, positions, duration };
}

// ============================================================================
// TCP Trail Component - Shows the path traced by the end-effector
// ============================================================================

interface TcpTrailProps {
  jointAngles: number[];
  maxPoints?: number;
  color?: string;
  isPlaying: boolean;
}

function TcpTrail({ jointAngles, maxPoints = 200, color = '#00ffff', isPlaying }: TcpTrailProps) {
  const trailPointsRef = useRef<THREE.Vector3[]>([]);
  const lineRef = useRef<THREE.Line | null>(null);

  // Load URDF for FK calculation
  const [urdfContent, setUrdfContent] = useState<string | null>(null);
  useEffect(() => {
    fetch(URDF_PATH)
      .then(r => r.text())
      .then(setUrdfContent)
      .catch(console.error);
  }, []);

  const { ready: solverReady, fk } = useHybridSolver({
    robotId: 'trajectory-trail-fk',
    urdfContent,
    coordinateSystem: 'Z-up',
  });

  // Create line geometry and material once
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(maxPoints * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({ color });
    return { geometry: geo, material: mat };
  }, [color, maxPoints]);

  // Update trail points when playing
  useFrame(() => {
    if (!isPlaying || !solverReady || !fk) return;

    const result = fk(jointAngles);
    if (result) {
      const pos = result.pose.position;
      const newPoint = new THREE.Vector3(pos.x, pos.y, pos.z);

      // Only add point if it's different from the last one
      const lastPoint = trailPointsRef.current[trailPointsRef.current.length - 1];
      if (!lastPoint || newPoint.distanceTo(lastPoint) > 0.001) {
        trailPointsRef.current.push(newPoint);

        // Limit the number of points
        if (trailPointsRef.current.length > maxPoints) {
          trailPointsRef.current.shift();
        }

        // Update line geometry
        if (trailPointsRef.current.length >= 2) {
          const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
          const positions = positionAttr.array as Float32Array;
          trailPointsRef.current.forEach((p, i) => {
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
          });
          positionAttr.needsUpdate = true;
          geometry.setDrawRange(0, trailPointsRef.current.length);
        }
      }
    }
  });

  return <primitive object={new THREE.Line(geometry, material)} ref={lineRef} />;
}

// ============================================================================
// TCP Marker - Shows current end-effector position
// ============================================================================

interface TcpMarkerProps {
  jointAngles: number[];
}

function TcpMarker({ jointAngles }: TcpMarkerProps) {
  const [tcpPosition, setTcpPosition] = useState<[number, number, number]>([0, 0, 0]);

  // Load URDF for FK calculation
  const [urdfContent, setUrdfContent] = useState<string | null>(null);
  useEffect(() => {
    fetch(URDF_PATH)
      .then(r => r.text())
      .then(setUrdfContent)
      .catch(console.error);
  }, []);

  const { ready: solverReady, fk } = useHybridSolver({
    robotId: 'trajectory-marker-fk',
    urdfContent,
    coordinateSystem: 'Z-up',
  });

  useFrame(() => {
    if (!solverReady || !fk) return;
    const result = fk(jointAngles);
    if (result) {
      const pos = result.pose.position;
      setTcpPosition([pos.x, pos.y, pos.z]);
    }
  });

  return (
    <group position={tcpPosition}>
      {/* Glowing sphere at TCP */}
      <mesh>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Internal Scene Component - Uses useTrajectoryPlayer (must be inside Canvas)
// ============================================================================

interface TrajectorySceneProps {
  trajectory: TrajectoryData | null;
  onStateChange: (state: TrajectoryPlayerState, controls: TrajectoryPlayerControls) => void;
  onComplete: () => void;
  autoPlay: boolean;
  showTrail: boolean;
}

function TrajectoryScene({ trajectory, onStateChange, onComplete, autoPlay, showTrail }: TrajectorySceneProps) {
  // 使用 useTrajectoryPlayer hook (在 Canvas 内部)
  // Use the hook's built-in autoPlay option for reliable auto-play
  const [playerState, playerControls] = useTrajectoryPlayer(trajectory, {
    speed: 1,
    loop: true, // Loop by default for better demo
    autoPlay: autoPlay, // Use hook's built-in autoPlay
    onComplete,
  });

  // 通知父组件状态变化
  const stateRef = useRef(playerState);
  const controlsRef = useRef(playerControls);

  useEffect(() => {
    stateRef.current = playerState;
    controlsRef.current = playerControls;
    onStateChange(playerState, playerControls);
  }, [playerState, playerControls, onStateChange]);

  // Default joint angles when trajectory hasn't started or currentAngles is empty
  const DEFAULT_JOINTS = [0, -0.3, 0.6, 0, -0.3, 0];
  const jointAngles = playerState.currentAngles.length > 0
    ? playerState.currentAngles
    : DEFAULT_JOINTS;

  return (
    <>
      {/* 机器人 */}
      <Robot
        id="trajectory_robot"
        urdfPath={URDF_PATH}
        jointAngles={jointAngles}
      />

      {/* TCP Marker - shows current end-effector position */}
      <TcpMarker jointAngles={jointAngles} />

      {/* TCP Trail - shows the real path traced by end-effector using FK */}
      {showTrail && (
        <TcpTrail
          jointAngles={jointAngles}
          isPlaying={playerState.isPlaying}
          color="#00ffff"
          maxPoints={500}
        />
      )}
    </>
  );
}

export function TrajectoryModule() {
  const [trajectory, setTrajectory] = useState<TrajectoryData | null>(null);
  const [playerState, setPlayerState] = useState<TrajectoryPlayerState | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const playerControlsRef = useRef<TrajectoryPlayerControls | null>(null);
  const { addLog } = useAppStore();

  // 自动生成初始轨迹
  useEffect(() => {
    const initialTrajectory = generateTrajectory('circular');
    setTrajectory(initialTrajectory);
    addLog('info', 'Auto-generated circular trajectory');
  }, []);

  // 状态变化回调
  const handleStateChange = useCallback((state: TrajectoryPlayerState, controls: TrajectoryPlayerControls) => {
    setPlayerState(state);
    playerControlsRef.current = controls;
  }, []);

  // 完成回调
  const handleComplete = useCallback(() => {
    addLog('info', 'Trajectory completed');
  }, [addLog]);

  // 轨迹控制
  const controls = useControls('Trajectory', {
    trajectoryType: {
      value: 'circular',
      options: ['pick-place', 'circular', 'wave'],
      label: 'Type',
      onChange: (v: string) => {
        // Auto-regenerate trajectory when type changes
        const traj = generateTrajectory(v as 'pick-place' | 'circular' | 'wave');
        setTrajectory(traj);
        addLog('info', `Generated ${v} trajectory`);
      },
    },
    showTrail: {
      value: true,
      label: 'Show TCP Trail',
      onChange: setShowTrail,
    },
    autoPlay: {
      value: true,
      label: 'Auto Play',
      onChange: setAutoPlay,
    },
  });

  // 播放控制
  useControls('Playback', {
    speed: {
      value: 1,
      min: 0.1,
      max: 3,
      step: 0.1,
      label: 'Speed',
      onChange: (v) => playerControlsRef.current?.setSpeed(v),
    },
    loop: {
      value: true,
      label: 'Loop',
      onChange: (v) => playerControlsRef.current?.setLoop(v),
    },
    Play: button(() => {
      if (trajectory) {
        playerControlsRef.current?.play();
        addLog('info', 'Playing trajectory');
      }
    }),
    Pause: button(() => {
      playerControlsRef.current?.pause();
      addLog('info', 'Paused trajectory');
    }),
    Stop: button(() => {
      playerControlsRef.current?.stop();
      addLog('info', 'Stopped trajectory');
    }),
  });

  // 计算进度百分比
  const progress = useMemo(() => {
    if (!trajectory || !playerState || trajectory.times.length === 0) return 0;
    const duration = trajectory.times[trajectory.times.length - 1];
    return duration > 0 ? (playerState.currentTime / duration) * 100 : 0;
  }, [trajectory, playerState]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Trajectory Playback</h2>
        <p>
          使用 <code>useTrajectoryPlayer</code> hook 控制轨迹播放
        </p>
      </div>

      <div className="canvas-wrapper">
        <RoboViz
          config={{
            scene: {
              background: '#1a1a2e',
              grid: { enabled: true, size: 10, divisions: 20, color: '#404060' },
            },
            camera: { position: { x: 2, y: 1.5, z: 2 } },
          }}
        >
          <TrajectoryScene
            trajectory={trajectory}
            onStateChange={handleStateChange}
            onComplete={handleComplete}
            autoPlay={autoPlay}
            showTrail={showTrail}
          />
        </RoboViz>
      </div>

      {/* 状态显示 */}
      <div className="module-status">
        <span>状态: {playerState?.isPlaying ? '播放中' : trajectory ? '已暂停' : '无轨迹'}</span>
        <span>进度: {progress.toFixed(1)}%</span>
        <span>时间: {(playerState?.currentTime || 0).toFixed(2)}s</span>
      </div>
    </div>
  );
}
