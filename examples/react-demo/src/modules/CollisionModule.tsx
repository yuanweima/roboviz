/**
 * Collision Module Demo
 *
 * 使用 @aspect/roboviz-react 的碰撞检测演示
 *
 * 展示功能:
 * - 添加和可视化障碍物 (box, sphere, cylinder)
 * - 使用 SafetyZoneVisual 组件
 * - 使用 Obstacle 组件
 */
import React, { useState, useMemo } from 'react';
import { useControls, button } from 'leva';
import { RoboViz, Robot, Obstacle, SafetyZoneVisual, type PrimitiveObstacle, type Vector3 } from '@aspect/roboviz-react';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// 障碍物类型
interface ObstacleItem {
  id: string;
  shape: 'box' | 'sphere' | 'cylinder';
  dimensions: Vector3;
  position: Vector3;
  color: string;
}

export function CollisionModule() {
  const [jointAngles, setJointAngles] = useState<number[]>([0, -0.3, 0.6, 0, -0.3, 0]);
  const [obstacles, setObstacles] = useState<ObstacleItem[]>([
    {
      id: 'obs1',
      shape: 'box',
      dimensions: { x: 0.15, y: 0.15, z: 0.15 },
      position: { x: 0.4, y: 0.08, z: 0.3 },
      color: '#ff4444',
    },
    {
      id: 'obs2',
      shape: 'sphere',
      dimensions: { x: 0.1, y: 0.1, z: 0.1 },
      position: { x: -0.3, y: 0.1, z: 0.4 },
      color: '#4444ff',
    },
  ]);
  const { addLog } = useAppStore();

  // 安全区域控制
  const zoneControls = useControls('Safety Zone', {
    showZone: { value: true, label: 'Show Zone' },
    radius: { value: 0.8, min: 0.3, max: 1.5, step: 0.1, label: 'Radius' },
  });

  // 障碍物控制
  useControls('Obstacles', {
    'Add Box': button(() => {
      const size = 0.1 + Math.random() * 0.1;
      const newObs: ObstacleItem = {
        id: `obs_${Date.now()}`,
        shape: 'box',
        dimensions: { x: size, y: size, z: size },
        position: {
          x: (Math.random() - 0.5) * 0.8,
          y: 0.05 + Math.random() * 0.15,
          z: 0.2 + Math.random() * 0.4,
        },
        color: '#ff6b35',
      };
      setObstacles((prev) => [...prev, newObs]);
      addLog('info', 'Added box obstacle');
    }),
    'Add Sphere': button(() => {
      const radius = 0.05 + Math.random() * 0.1;
      const newObs: ObstacleItem = {
        id: `obs_${Date.now()}`,
        shape: 'sphere',
        dimensions: { x: radius, y: radius, z: radius },
        position: {
          x: (Math.random() - 0.5) * 0.8,
          y: radius + Math.random() * 0.2,
          z: 0.2 + Math.random() * 0.4,
        },
        color: '#35a7ff',
      };
      setObstacles((prev) => [...prev, newObs]);
      addLog('info', 'Added sphere obstacle');
    }),
    'Add Cylinder': button(() => {
      const radius = 0.03 + Math.random() * 0.05;
      const height = 0.15 + Math.random() * 0.2;
      const newObs: ObstacleItem = {
        id: `obs_${Date.now()}`,
        shape: 'cylinder',
        dimensions: { x: radius, y: height, z: radius },
        position: {
          x: (Math.random() - 0.5) * 0.8,
          y: height / 2,
          z: 0.2 + Math.random() * 0.4,
        },
        color: '#35ff6b',
      };
      setObstacles((prev) => [...prev, newObs]);
      addLog('info', 'Added cylinder obstacle');
    }),
    'Clear All': button(() => {
      setObstacles([]);
      addLog('info', 'All obstacles cleared');
    }),
  });

  // 关节控制
  useControls('Robot Joints', {
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
  });

  // 点击障碍物删除
  const handleObstacleClick = (id: string) => {
    setObstacles((prev) => prev.filter((obs) => obs.id !== id));
    addLog('info', `Removed obstacle ${id}`);
  };

  // 转换障碍物为 ObstacleData 格式
  const obstacleDataList = useMemo(() => {
    return obstacles.map((obs): PrimitiveObstacle => ({
      id: obs.id,
      type: 'primitive',
      primitive: {
        shape: obs.shape,
        dimensions: obs.dimensions,
      },
      transform: {
        position: obs.position,
        rotation: { w: 1, x: 0, y: 0, z: 0 },
      },
      color: obs.color,
      opacity: 0.8,
    }));
  }, [obstacles]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Collision Detection</h2>
        <p>
          使用 <code>SafetyZoneVisual</code> 和 <code>Obstacle</code> 组件
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
          {/* SafetyZoneVisual 组件 */}
          {zoneControls.showZone && (
            <SafetyZoneVisual
              innerRadius={zoneControls.radius}
              outerRadius={zoneControls.radius * 1.2}
              dangerRadius={zoneControls.radius * 1.5}
            />
          )}

          {/* 机器人 */}
          <Robot
            id="collision_robot"
            urdfPath={URDF_PATH}
            jointAngles={jointAngles}
          />

          {/* Obstacle 组件 */}
          {obstacleDataList.map((obsData) => (
            <Obstacle
              key={obsData.id}
              data={obsData}
              onClick={handleObstacleClick}
            />
          ))}
        </RoboViz>
      </div>

      {/* 状态显示 */}
      <div className="module-status">
        <span>障碍物数量: {obstacles.length}</span>
        <span>安全区域半径: {zoneControls.radius.toFixed(2)}m</span>
      </div>
    </div>
  );
}
