/**
 * Trajectory Module Demo
 *
 * 使用 @aspect/roboviz-react 的轨迹播放演示
 *
 * 展示功能:
 * - 生成和可视化机器人轨迹
 * - 使用 useTrajectoryPlayer hook 控制播放
 * - 管理路点
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useControls, button } from 'leva';
import {
  RoboViz,
  Robot,
  Trajectory,
  Waypoint,
  useTrajectoryPlayer,
  type TrajectoryData,
  type WaypointData,
  type TrajectoryPlayerState,
  type TrajectoryPlayerControls,
} from '@aspect/roboviz-react';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// 生成轨迹
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
        const segment = Math.floor((t / duration) * 4);
        switch (segment) {
          case 0:
            angles = [0, -0.3 - 0.2 * ((t / duration) * 4), 0.6 + 0.3 * ((t / duration) * 4), 0, 0, 0];
            break;
          case 1:
            angles = [0.5 * (((t / duration) * 4) - 1), -0.5, 0.9, 0, -0.3, 0];
            break;
          case 2:
            angles = [0.5, -0.5 + 0.2 * (((t / duration) * 4) - 2), 0.9, 0, -0.3, 0];
            break;
          default:
            angles = [0.5 - 0.5 * (((t / duration) * 4) - 3), -0.3, 0.9, 0, -0.3, 0];
        }
        break;

      case 'circular':
        angles = [
          0.5 * Math.sin(phase),
          -0.3 + 0.2 * Math.cos(phase),
          0.6 + 0.2 * Math.sin(phase * 2),
          phase,
          0.3 * Math.sin(phase * 1.5),
          phase * 2,
        ];
        break;

      case 'wave':
      default:
        angles = [
          0.3 * Math.sin(phase * 2),
          -0.4 + 0.1 * Math.sin(phase * 3),
          0.7 + 0.2 * Math.cos(phase * 2),
          0.5 * Math.sin(phase),
          0.4 * Math.cos(phase * 2),
          phase,
        ];
    }

    positions.push(angles);
  }

  return { times, positions, duration };
}

// 内部场景组件 - 使用 useTrajectoryPlayer (必须在 Canvas 内部)
interface TrajectorySceneProps {
  trajectory: TrajectoryData | null;
  waypoints: WaypointData[];
  onStateChange: (state: TrajectoryPlayerState, controls: TrajectoryPlayerControls) => void;
  onComplete: () => void;
}

function TrajectoryScene({ trajectory, waypoints, onStateChange, onComplete }: TrajectorySceneProps) {
  // 使用 useTrajectoryPlayer hook (在 Canvas 内部)
  const [playerState, playerControls] = useTrajectoryPlayer(trajectory, {
    speed: 1,
    loop: false,
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

  return (
    <>
      {/* 机器人 */}
      <Robot
        id="trajectory_robot"
        urdfPath={URDF_PATH}
        jointAngles={playerState.currentAngles}
      />

      {/* 轨迹可视化 */}
      {trajectory && (
        <Trajectory
          id="main_trajectory"
          data={trajectory}
          showPath
          pathColor="#4ecdc4"
          pathWidth={2}
        />
      )}

      {/* 路点 */}
      {waypoints.map((wp) => (
        <Waypoint
          key={wp.id}
          data={wp}
          showLabel
          showAxes={false}
        />
      ))}
    </>
  );
}

export function TrajectoryModule() {
  const [trajectory, setTrajectory] = useState<TrajectoryData | null>(null);
  const [waypoints, setWaypoints] = useState<WaypointData[]>([]);
  const [playerState, setPlayerState] = useState<TrajectoryPlayerState | null>(null);
  const playerControlsRef = useRef<TrajectoryPlayerControls | null>(null);
  const { addLog } = useAppStore();

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
    },
    Generate: button(() => {
      const traj = generateTrajectory(controls.trajectoryType as 'pick-place' | 'circular' | 'wave');
      setTrajectory(traj);
      addLog('info', `Generated ${controls.trajectoryType} trajectory`);
    }),
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
      value: false,
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

  // 路点控制
  useControls('Waypoints', {
    'Add Waypoint': button(() => {
      const id = `wp_${Date.now()}`;
      const newWaypoint: WaypointData = {
        id,
        robotId: 'trajectory_robot',
        jointAngles: playerState?.currentAngles || [],
        tcpPose: {
          position: {
            x: 0.3 + Math.random() * 0.3,
            y: 0.2 + Math.random() * 0.3,
            z: 0.3 + Math.random() * 0.3,
          },
          orientation: { w: 1, x: 0, y: 0, z: 0 },
        },
        label: `WP${waypoints.length + 1}`,
        color: '#ffff00',
      };
      setWaypoints((prev) => [...prev, newWaypoint]);
      addLog('info', `Added waypoint ${newWaypoint.label}`);
    }),
    'Clear All': button(() => {
      setWaypoints([]);
      addLog('info', 'Waypoints cleared');
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
            background: '#1a1a2e',
            grid: { enabled: true, size: 10, divisions: 20, color: '#404060' },
          }}
          camera={{ position: [2, 1.5, 2] }}
        >
          <TrajectoryScene
            trajectory={trajectory}
            waypoints={waypoints}
            onStateChange={handleStateChange}
            onComplete={handleComplete}
          />
        </RoboViz>
      </div>

      {/* 状态显示 */}
      <div className="module-status">
        <span>状态: {playerState?.isPlaying ? '播放中' : trajectory ? '已暂停' : '无轨迹'}</span>
        <span>进度: {progress.toFixed(1)}%</span>
        <span>时间: {(playerState?.currentTime || 0).toFixed(2)}s</span>
        <span>路点数: {waypoints.length}</span>
      </div>
    </div>
  );
}
