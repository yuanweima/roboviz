/**
 * Remote Control Module Demo
 *
 * 使用 @aspect/roboviz-react 的 useRemoteControl hook 演示 Python SDK 远程控制
 *
 * 展示功能:
 * - 连接到 WebSocket 服务器
 * - 接收 Python SDK 发送的机器人控制命令
 * - 动态渲染远程添加的机器人、障碍物、安全区域
 */
import React, { useState, useMemo } from 'react';
import { useControls, button } from 'leva';
import {
  RoboViz,
  Robot,
  SafetyZoneVisual,
  Obstacle,
  Waypoint,
  useRemoteControl,
  type PrimitiveObstacle,
  type WaypointData,
} from '@aspect/roboviz-react';
import { useAppStore } from '../store';

export function RemoteControlModule() {
  const [wsUrl, setWsUrl] = useState('ws://localhost:8080');
  const [isConnecting, setIsConnecting] = useState(false);
  const { addLog } = useAppStore();

  // 使用 useRemoteControl hook
  const {
    enabled,
    clientCount,
    robots,
    safetyZones,
    obstacles,
    waypoints,
    connectToServer,
    disconnect,
    setEnabled,
  } = useRemoteControl({
    debug: true,
    onRobotAdd: (robot) => {
      addLog('info', `Remote robot added: ${robot.id}`);
    },
    onRobotRemove: (robotId) => {
      addLog('info', `Remote robot removed: ${robotId}`);
    },
    onJointsChange: (robotId: string, joints: number[]) => {
      // 仅记录前3个关节避免日志过多 (comment out for less noise)
      // addLog('info', `Joints updated for ${robotId}: [${joints.slice(0, 3).map(j => j.toFixed(2)).join(', ')}...]`);
    },
    onTrajectoryPlay: (robotId) => {
      addLog('info', `Trajectory playing for: ${robotId}`);
    },
    onObstacleAdd: (obstacle) => {
      addLog('info', `Obstacle added: ${obstacle.id}`);
    },
  });

  // 连接控制
  useControls('Connection', {
    serverUrl: {
      value: wsUrl,
      onChange: (v) => setWsUrl(v),
    },
    Connect: button(async () => {
      if (clientCount > 0) {
        disconnect();
        addLog('info', 'Disconnected from WebSocket server');
      } else {
        setIsConnecting(true);
        try {
          await connectToServer(wsUrl);
          addLog('info', `Connected to ${wsUrl}`);
        } catch (error) {
          addLog('error', `Connection failed: ${error}`);
        } finally {
          setIsConnecting(false);
        }
      }
    }),
    'Toggle Remote': button(() => {
      setEnabled(!enabled);
      addLog('info', `Remote control ${!enabled ? 'enabled' : 'disabled'}`);
    }),
  });

  // 状态信息
  useControls('Status', {
    connected: { value: clientCount > 0, label: 'Connected', disabled: true },
    robotCount: { value: robots.size, label: 'Robots', disabled: true },
    obstacleCount: { value: obstacles.size, label: 'Obstacles', disabled: true },
    waypointCount: { value: waypoints.size, label: 'Waypoints', disabled: true },
  });

  // 转换障碍物为 ObstacleData 格式
  const obstacleDataList = useMemo(() => {
    return Array.from(obstacles.values()).map((obs): PrimitiveObstacle => ({
      id: obs.id,
      type: 'primitive',
      primitive: {
        shape: obs.shape,
        dimensions: { x: obs.dimensions[0], y: obs.dimensions[1], z: obs.dimensions[2] },
      },
      transform: {
        position: { x: obs.position[0], y: obs.position[1], z: obs.position[2] },
        rotation: { w: 1, x: 0, y: 0, z: 0 },
      },
      color: obs.color,
      opacity: obs.opacity,
    }));
  }, [obstacles]);

  // 转换路点为 WaypointData 格式
  const waypointDataList = useMemo(() => {
    return Array.from(waypoints.values()).map((wp): WaypointData => ({
      id: wp.id,
      robotId: 'remote',
      jointAngles: [], // 远程路点可能没有关节角度
      tcpPose: {
        position: { x: wp.position[0], y: wp.position[1], z: wp.position[2] },
        orientation: { w: 1, x: 0, y: 0, z: 0 },
      },
      label: wp.label,
      color: wp.color,
    }));
  }, [waypoints]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Remote Control</h2>
        <p>
          通过 <code>useRemoteControl</code> hook 接收 Python SDK 控制命令
        </p>
      </div>

      <div className="canvas-wrapper">
        <RoboViz
          config={{
            scene: {
              background: '#1a1a2e',
              grid: { enabled: true, size: 10, divisions: 20, color: '#404060' },
            },
            camera: { position: { x: 3, y: 2, z: 3 } },
          }}
        >
          {/* 渲染远程控制的机器人 */}
          {Array.from(robots.values()).map((robot) => (
            <Robot
              key={robot.id}
              id={robot.id}
              urdfPath={robot.urdfPath}
              position={robot.position}
              jointAngles={robot.joints}
              color={robot.color}
            />
          ))}

          {/* 渲染安全区域 */}
          {Array.from(safetyZones.values()).map((zone) => (
            <SafetyZoneVisual
              key={zone.id}
              innerRadius={zone.radius}
              outerRadius={zone.warningRadius}
              dangerRadius={zone.dangerRadius}
              position={zone.position}
            />
          ))}

          {/* 渲染障碍物 */}
          {obstacleDataList.map((obsData) => (
            <Obstacle
              key={obsData.id}
              data={obsData}
            />
          ))}

          {/* 渲染路点 */}
          {waypointDataList.map((wpData) => (
            <Waypoint
              key={wpData.id}
              data={wpData}
            />
          ))}
        </RoboViz>
      </div>

      {/* 连接状态指示器 */}
      <div className="module-status">
        <span className={`status-indicator ${clientCount > 0 ? 'connected' : 'disconnected'}`}>
          {isConnecting ? 'Connecting...' : clientCount > 0 ? 'Connected' : 'Disconnected'}
        </span>
        <span>Robots: {robots.size}</span>
        <span>Obstacles: {obstacles.size}</span>
        <span>Safety Zones: {safetyZones.size}</span>
        <span>Waypoints: {waypoints.size}</span>
      </div>

      {/* 使用说明 */}
      <div className="module-info">
        <h4>Usage Instructions</h4>
        <ol>
          <li>Click "Connect" to connect to WebSocket server at {wsUrl}</li>
          <li>Run Python SDK script: <code>python examples/python/simple_remote_control.py</code></li>
          <li>Watch as Python commands control the visualization</li>
        </ol>
      </div>
    </div>
  );
}
