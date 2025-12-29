/**
 * Collision Module Demo
 *
 * 使用 @aspect/roboviz-react 的碰撞检测演示
 *
 * 展示功能:
 * - 添加和可视化障碍物 (box, sphere, cylinder)
 * - SafetyZone 组件 (geometry-based)
 * - SafetyZoneVisual 组件 (ring-based)
 * - CollisionVisualizer 集成
 * - useCollision hook 实时碰撞检测
 * - 碰撞状态可视化
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useControls, button, folder } from 'leva';
import {
  RoboViz,
  Robot,
  Obstacle,
  SafetyZoneVisual,
  SafetyZoneList,
  useCollision,
  useCollisionVisualization,
  type PrimitiveObstacle,
  type Vector3,
  type SafetyZoneType,
  type CollisionGeometry,
  type Transform,
} from '@aspect/roboviz-react';
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

// 默认安全区域 (Z-up coordinate system)
const DEFAULT_SAFETY_ZONES: SafetyZoneType[] = [
  {
    id: 'warning-zone',
    name: 'Warning Zone',
    type: 'cylinder',
    params: { radius: 0.6, height: 0.5 },
    level: 'warning',
    transform: {
      // Z-up: cylinder centered at z=0.25 (half height above ground)
      position: { x: 0, y: 0, z: 0.25 },
      rotation: { w: 1, x: 0, y: 0, z: 0 },
    },
    visualization: {
      visible: true,
      fillColor: '#ffa500',
      fillOpacity: 0.15,
      wireframe: true,
      wireframeColor: '#ffa500',
      pulseOnWarning: true,
      pulseFrequency: 2,
    },
  },
  {
    id: 'danger-zone',
    name: 'Danger Zone',
    type: 'cylinder',
    params: { radius: 0.35, height: 0.6 },
    level: 'danger',
    transform: {
      // Z-up: cylinder centered at z=0.3 (half height above ground)
      position: { x: 0, y: 0, z: 0.3 },
      rotation: { w: 1, x: 0, y: 0, z: 0 },
    },
    visualization: {
      visible: true,
      fillColor: '#ff4500',
      fillOpacity: 0.2,
      wireframe: true,
      wireframeColor: '#ff4500',
      pulseOnWarning: true,
      pulseFrequency: 4,
    },
  },
];

// 碰撞场景内容组件
function CollisionSceneContent({
  obstacles,
  safetyZones,
  showGeometryZones,
  showRingZones,
  ringZoneRadius,
  onObstacleClick,
}: {
  obstacles: ObstacleItem[];
  safetyZones: SafetyZoneType[];
  showGeometryZones: boolean;
  showRingZones: boolean;
  ringZoneRadius: number;
  onObstacleClick: (id: string) => void;
}) {
  const { addLog } = useAppStore();

  // 使用 useCollision hook
  const [collisionState, collisionActions] = useCollision({
    enabled: true,
    checkInterval: 100,
    onCollision: (pairs) => {
      addLog('warning', `Collision detected: ${pairs.length} pairs`);
    },
    onCollisionResolved: () => {
      addLog('info', 'Collision resolved');
    },
    onSafetyZoneEnter: (zoneId, _robotId, level) => {
      addLog(level === 'danger' ? 'error' : 'warning', `Robot entered ${level} zone: ${zoneId}`);
    },
    onSafetyZoneExit: (zoneId, _robotId, level) => {
      addLog('info', `Robot exited ${level} zone: ${zoneId}`);
    },
  });

  // 注册障碍物为碰撞几何体
  useEffect(() => {
    obstacles.forEach((obs) => {
      const geometry: CollisionGeometry = {
        id: obs.id,
        type: obs.shape,
        params:
          obs.shape === 'box'
            ? { width: obs.dimensions.x, height: obs.dimensions.y, depth: obs.dimensions.z }
            : obs.shape === 'sphere'
              ? { radius: obs.dimensions.x / 2 }
              : { radius: obs.dimensions.x / 2, height: obs.dimensions.y },
        associatedObjectType: 'obstacle',
      };

      const transform: Transform = {
        position: obs.position,
        rotation: { w: 1, x: 0, y: 0, z: 0 },
      };

      collisionActions.addGeometry(geometry, transform);
    });

    return () => {
      obstacles.forEach((obs) => {
        collisionActions.removeGeometry(obs.id);
      });
    };
  }, [obstacles, collisionActions]);

  // 注册安全区域
  useEffect(() => {
    safetyZones.forEach((zone) => {
      collisionActions.addSafetyZone(zone);
    });

    return () => {
      safetyZones.forEach((zone) => {
        collisionActions.removeSafetyZone(zone.id);
      });
    };
  }, [safetyZones, collisionActions]);

  // 转换障碍物为 ObstacleData 格式
  const obstacleDataList = useMemo(() => {
    return obstacles.map(
      (obs): PrimitiveObstacle => ({
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
        color: collisionState.collisionPairs.some(
          (p) => p.objectA.id === obs.id || p.objectB.id === obs.id
        )
          ? '#ff0000'
          : obs.color,
        opacity: 0.8,
      })
    );
  }, [obstacles, collisionState.collisionPairs]);

  // 构建触发状态 map
  const triggeredZonesMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    collisionState.safetyZoneStates.forEach((state) => {
      map[state.zoneId] = state.triggered;
    });
    return map;
  }, [collisionState.safetyZoneStates]);

  return (
    <>
      {/* Ring-based safety zone (original) */}
      {showRingZones && (
        <SafetyZoneVisual
          innerRadius={ringZoneRadius}
          outerRadius={ringZoneRadius * 1.2}
          dangerRadius={ringZoneRadius * 1.5}
          opacity={0.15}
        />
      )}

      {/* Geometry-based safety zones (new) */}
      {showGeometryZones && (
        <SafetyZoneList zones={safetyZones} triggeredZones={triggeredZonesMap} />
      )}

      {/* Obstacle 组件 */}
      {obstacleDataList.map((obsData) => (
        <Obstacle key={obsData.id} data={obsData} onClick={onObstacleClick} />
      ))}
    </>
  );
}

export function CollisionModule() {
  const [jointAngles, setJointAngles] = useState<number[]>([0, -0.3, 0.6, 0, -0.3, 0]);
  // Z-up coordinate system: z is height
  const [obstacles, setObstacles] = useState<ObstacleItem[]>([
    {
      id: 'obs1',
      shape: 'box',
      dimensions: { x: 0.15, y: 0.15, z: 0.15 },
      position: { x: 0.4, y: 0.3, z: 0.08 },
      color: '#ff4444',
    },
    {
      id: 'obs2',
      shape: 'sphere',
      dimensions: { x: 0.1, y: 0.1, z: 0.1 },
      position: { x: -0.3, y: 0.4, z: 0.1 },
      color: '#4444ff',
    },
  ]);
  const [safetyZones, setSafetyZones] = useState<SafetyZoneType[]>(DEFAULT_SAFETY_ZONES);
  const { addLog } = useAppStore();

  // Collision visualization state
  const { config, setConfig } = useCollisionVisualization({
    initialEnabled: true,
  });

  // 安全区域控制
  const zoneControls = useControls(
    'Safety Zone',
    {
      'Ring Zones': folder({
        showRingZones: { value: false, label: 'Show Ring Zones' },
        ringRadius: { value: 0.8, min: 0.3, max: 1.5, step: 0.1, label: 'Ring Radius' },
      }),
      'Geometry Zones': folder({
        showGeometryZones: { value: true, label: 'Show Geometry Zones' },
        warningRadius: {
          value: 0.6,
          min: 0.3,
          max: 1.0,
          step: 0.05,
          label: 'Warning Radius',
          onChange: (v: number) => {
            setSafetyZones((prev) =>
              prev.map((z) =>
                z.id === 'warning-zone' ? { ...z, params: { ...z.params, radius: v } } : z
              )
            );
          },
        },
        dangerRadius: {
          value: 0.35,
          min: 0.2,
          max: 0.8,
          step: 0.05,
          label: 'Danger Radius',
          onChange: (v: number) => {
            setSafetyZones((prev) =>
              prev.map((z) =>
                z.id === 'danger-zone' ? { ...z, params: { ...z.params, radius: v } } : z
              )
            );
          },
        },
      }),
    },
    [setSafetyZones]
  );

  // Visualization controls
  useControls('Visualization', {
    showCollisionGeometry: {
      value: config.showCollisionGeometry,
      label: 'Show Collision Bounds',
      onChange: (v: boolean) => setConfig({ showCollisionGeometry: v }),
    },
    showContactPoints: {
      value: config.showContactPoints,
      label: 'Show Contact Points',
      onChange: (v: boolean) => setConfig({ showContactPoints: v }),
    },
    highlightCollisions: {
      value: config.highlightCollisions,
      label: 'Highlight Collisions',
      onChange: (v: boolean) => setConfig({ highlightCollisions: v }),
    },
    geometryOpacity: {
      value: config.collisionGeometryOpacity,
      min: 0.1,
      max: 0.8,
      step: 0.05,
      label: 'Geometry Opacity',
      onChange: (v: number) => setConfig({ collisionGeometryOpacity: v }),
    },
  });

  // 障碍物控制 (Z-up coordinate system)
  useControls('Obstacles', {
    'Add Box': button(() => {
      const size = 0.1 + Math.random() * 0.1;
      const newObs: ObstacleItem = {
        id: `obs_${Date.now()}`,
        shape: 'box',
        dimensions: { x: size, y: size, z: size },
        position: {
          x: (Math.random() - 0.5) * 0.8,
          y: 0.2 + Math.random() * 0.4,
          z: 0.05 + Math.random() * 0.15, // z is height
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
          y: 0.2 + Math.random() * 0.4,
          z: radius + Math.random() * 0.2, // z is height
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
        dimensions: { x: radius, y: radius, z: height }, // z dimension is height for cylinder
        position: {
          x: (Math.random() - 0.5) * 0.8,
          y: 0.2 + Math.random() * 0.4,
          z: height / 2, // z is height, cylinder centered at half height
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
      onChange: (v: number) => setJointAngles((prev) => [v, prev[1], prev[2], prev[3], prev[4], prev[5]]),
    },
    J2: {
      value: jointAngles[1],
      min: -Math.PI / 2,
      max: Math.PI / 2,
      step: 0.01,
      onChange: (v: number) => setJointAngles((prev) => [prev[0], v, prev[2], prev[3], prev[4], prev[5]]),
    },
    J3: {
      value: jointAngles[2],
      min: -Math.PI / 2,
      max: Math.PI,
      step: 0.01,
      onChange: (v: number) => setJointAngles((prev) => [prev[0], prev[1], v, prev[3], prev[4], prev[5]]),
    },
  });

  // 点击障碍物删除
  const handleObstacleClick = useCallback(
    (id: string) => {
      setObstacles((prev) => prev.filter((obs) => obs.id !== id));
      addLog('info', `Removed obstacle ${id}`);
    },
    [addLog]
  );

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Collision Detection</h2>
        <p>
          使用 <code>SafetyZone</code>, <code>CollisionVisualizer</code>, <code>useCollision</code>{' '}
          hook
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
          {/* 机器人 */}
          <Robot id="collision_robot" urdfPath={URDF_PATH} jointAngles={jointAngles} />

          {/* 碰撞场景内容 */}
          <CollisionSceneContent
            obstacles={obstacles}
            safetyZones={safetyZones}
            showGeometryZones={zoneControls.showGeometryZones}
            showRingZones={zoneControls.showRingZones}
            ringZoneRadius={zoneControls.ringRadius}
            onObstacleClick={handleObstacleClick}
          />
        </RoboViz>
      </div>

      {/* 状态显示 */}
      <div className="module-status">
        <span>障碍物: {obstacles.length}</span>
        <span>安全区域: {safetyZones.length}</span>
        <span className={zoneControls.showGeometryZones ? 'active' : ''}>
          Geometry Zones: {zoneControls.showGeometryZones ? 'ON' : 'OFF'}
        </span>
        <span className={zoneControls.showRingZones ? 'active' : ''}>
          Ring Zones: {zoneControls.showRingZones ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}
