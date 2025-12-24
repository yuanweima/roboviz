/**
 * Robot Module Demo
 *
 * 使用 @aspect/roboviz-react 简化 SDK 的机器人控制演示
 *
 * 展示功能:
 * - 加载 URDF 机器人模型
 * - 通过 Leva UI 控制关节
 * - 播放动画
 */
import React, { useState, useEffect } from 'react';
import { useControls, button } from 'leva';
import { RoboViz, Robot } from '@aspect/roboviz-react';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

export function RobotModule() {
  const [jointAngles, setJointAngles] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const { addLog } = useAppStore();

  // Robot display controls
  const robotControls = useControls('Robot', {
    color: { value: '#4ecdc4', label: 'Color' },
    showAxes: { value: true, label: 'Show Axes' },
  });

  // Joint controls
  useControls('Joints', {
    J1: {
      value: jointAngles[0],
      min: -Math.PI,
      max: Math.PI,
      step: 0.01,
      onChange: (v) => setJointAngles((prev) => [v, prev[1], prev[2], prev[3], prev[4], prev[5]]),
    },
    J2: {
      value: jointAngles[1],
      min: -Math.PI / 2,
      max: Math.PI / 2,
      step: 0.01,
      onChange: (v) => setJointAngles((prev) => [prev[0], v, prev[2], prev[3], prev[4], prev[5]]),
    },
    J3: {
      value: jointAngles[2],
      min: -Math.PI / 2,
      max: Math.PI,
      step: 0.01,
      onChange: (v) => setJointAngles((prev) => [prev[0], prev[1], v, prev[3], prev[4], prev[5]]),
    },
    J4: {
      value: jointAngles[3],
      min: -Math.PI,
      max: Math.PI,
      step: 0.01,
      onChange: (v) => setJointAngles((prev) => [prev[0], prev[1], prev[2], v, prev[4], prev[5]]),
    },
    J5: {
      value: jointAngles[4],
      min: -Math.PI / 2,
      max: Math.PI / 2,
      step: 0.01,
      onChange: (v) => setJointAngles((prev) => [prev[0], prev[1], prev[2], prev[3], v, prev[5]]),
    },
    J6: {
      value: jointAngles[5],
      min: -Math.PI,
      max: Math.PI,
      step: 0.01,
      onChange: (v) => setJointAngles((prev) => [prev[0], prev[1], prev[2], prev[3], prev[4], v]),
    },
  });

  // Animation controls
  useControls('Animation', {
    'Play Demo': button(() => {
      setIsAnimating(true);
      addLog('info', 'Animation started');
    }),
    Stop: button(() => {
      setIsAnimating(false);
      addLog('info', 'Animation stopped');
    }),
    'Home Position': button(() => {
      setJointAngles([0, 0, 0, 0, 0, 0]);
      addLog('info', 'Robot moved to home position');
    }),
    'Ready Position': button(() => {
      setJointAngles([0, -0.5, 0.8, 0, -0.3, 0]);
      addLog('info', 'Robot moved to ready position');
    }),
    'Pick Position': button(() => {
      setJointAngles([0.8, -0.3, 1.0, 0, -0.7, 0]);
      addLog('info', 'Robot moved to pick position');
    }),
  });

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      const angles = [
        0.5 * Math.sin(t * 0.5),
        -0.3 + 0.3 * Math.cos(t * 0.7),
        0.6 + 0.3 * Math.sin(t * 0.6),
        t * 0.5,
        0.3 * Math.sin(t * 0.9),
        t,
      ];
      setJointAngles(angles);
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Robot Control</h2>
        <p>
          使用 <code>@aspect/roboviz-react</code> 简化 SDK 控制机器人
        </p>
      </div>

      <div className="canvas-wrapper">
        {/* ✨ 使用简化的 RoboViz 组件 */}
        <RoboViz
          config={{
            scene: {
              background: '#1a1a2e',
              grid: { enabled: true, size: 10, divisions: 20, color: '#404060' },
            },
            camera: { position: { x: 2, y: 1.5, z: 2 } },
          }}
        >
          {/* ✨ 简化的 Robot 组件 - 无需处理回调 */}
          <Robot
            id="fanuc_robot"
            urdfPath={URDF_PATH}
            jointAngles={jointAngles}
            color={robotControls.color}
            showAxes={robotControls.showAxes}
          />
        </RoboViz>
      </div>
    </div>
  );
}
