/**
 * Collision Analysis Scene - Timeline + Robot Integration Demo
 *
 * 展示 CollisionTimeline 组件与机器人场景的完美结合:
 *
 * 核心功能:
 * 1. 时间轴与机器人轨迹同步播放
 * 2. 碰撞事件可视化 - 点击事件跳转到对应时间点
 * 3. 多机器人泳道 - 清晰展示各机器人碰撞情况
 * 4. 实时碰撞检测 - 播放时检测并记录碰撞事件
 * 5. 3D 场景联动 - 选中事件时高亮对应位置
 *
 * 使用场景:
 * - 碰撞分析与调试
 * - 轨迹安全验证
 * - 多机器人协作规划
 * - 安全区域监控
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RoboViz, CollisionTimeline, type PropertySchema, PropertyEditor } from '@aspect/roboviz-react';
import * as THREE from 'three';
// Rendering components
import { EndEffector } from '@aspect/roboviz-core/rendering';
// Process architecture, timeline types (main entry)
import {
  ProcessProvider,
  RobotProcessProvider,
  ProcessScene,
  useProcessPlayback,
  useRobotProcessState,
  type PoseTrajectory,
  type TimelineCollisionEvent,
  type TimeRange,
  type EventSeverity,
  type TimelineCollisionEventType,
  type TimelineLane,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';

// ============================================================================
// Theme & Constants
// ============================================================================

const THEME = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#a855f7',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#0f0f1a',
  surface: '#1a1a2e',
  panel: '#252540',
  text: '#e5e7eb',
  textSecondary: '#9ca3af',
};

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// 轨迹总时长 (毫秒)
const TRAJECTORY_DURATION = 8000;

// ============================================================================
// Types
// ============================================================================

interface Obstacle {
  id: string;
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

interface CollisionZone {
  id: string;
  name: string;
  position: [number, number, number];
  radius: number;
  level: 'warning' | 'danger';
}

// ============================================================================
// Sample Data
// ============================================================================

// 障碍物定义
const OBSTACLES: Obstacle[] = [
  { id: 'obs_1', name: 'Work Table', position: [0.5, 0, -0.15], size: [0.4, 0.4, 0.3], color: '#666' },
  { id: 'obs_2', name: 'Tool Rack', position: [0.2, 0.4, 0], size: [0.1, 0.1, 0.4], color: '#888' },
  { id: 'obs_3', name: 'Part Feeder', position: [0.6, -0.3, 0], size: [0.15, 0.15, 0.25], color: '#777' },
];

// 安全区域定义
const SAFETY_ZONES: CollisionZone[] = [
  { id: 'zone_warning', name: 'Warning Zone', position: [0.5, 0, 0.1], radius: 0.35, level: 'warning' },
  { id: 'zone_danger', name: 'Danger Zone', position: [0.5, 0, 0.1], radius: 0.2, level: 'danger' },
];

// 生成示例轨迹 - 包含会经过障碍物附近的路径
function generateDemoTrajectory(): PoseTrajectory {
  const waypoints = [];
  const numPoints = 80;

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const time = t * (TRAJECTORY_DURATION / 1000);

    // 复杂的运动路径 - 会经过障碍物和安全区域
    const phase = t * Math.PI * 4;
    const x = 0.3 + 0.25 * Math.sin(phase);
    const y = 0.2 * Math.cos(phase * 0.5);
    const z = 0.15 + 0.1 * Math.sin(phase * 2);

    waypoints.push({
      position: [x, y, z] as [number, number, number],
      quaternion: [0, 0.707, 0, 0.707] as [number, number, number, number],
      time,
    });
  }

  return {
    id: 'demo-trajectory',
    name: 'Demo Collision Path',
    waypoints,
    duration: TRAJECTORY_DURATION / 1000,
  };
}

// 默认机器人状态 (用于事件详情)
const DEFAULT_ROBOT_STATE = {
  joints: [0, 0, 0, 0, 0, 0],
  tcpPose: {
    position: [0.4, 0, 0.2] as [number, number, number],
    quaternion: [0, 0, 0, 1] as [number, number, number, number],
  },
};

// 生成模拟碰撞事件 - 基于轨迹分析
function generateCollisionEvents(): TimelineCollisionEvent[] {
  const events: TimelineCollisionEvent[] = [];

  // 碰撞事件 - 靠近障碍物
  events.push({
    id: 'collision_1',
    timestamp: 1500,
    type: 'collision',
    severity: 'critical',
    source: { robotId: 'Robot_Main', linkName: 'link_5' },
    target: { type: 'obstacle', obstacleId: 'obs_1', obstacleName: 'Work Table' },
    message: 'TCP 与工作台发生碰撞',
    details: { distance: 0, velocity: 45, robotState: DEFAULT_ROBOT_STATE },
  });

  // 近距事件
  events.push({
    id: 'near_miss_1',
    timestamp: 2200,
    type: 'near-miss',
    severity: 'warning',
    source: { robotId: 'Robot_Main', linkName: 'link_4' },
    target: { type: 'obstacle', obstacleId: 'obs_2', obstacleName: 'Tool Rack' },
    message: 'Link4 与工具架距离过近 (12mm)',
    details: { distance: 12, velocity: 30, robotState: DEFAULT_ROBOT_STATE },
  });

  // 进入警告区
  events.push({
    id: 'zone_enter_1',
    timestamp: 3000,
    duration: 800,
    type: 'zone-enter',
    severity: 'warning',
    source: { robotId: 'Robot_Main', linkName: 'tcp' },
    target: { type: 'safety-zone', zoneId: 'zone_warning', zoneName: 'Warning Zone', level: 'warning' },
    message: 'TCP 进入警告区域',
    details: { distance: 0, robotState: DEFAULT_ROBOT_STATE },
  });

  // 进入危险区
  events.push({
    id: 'zone_enter_2',
    timestamp: 3400,
    duration: 400,
    type: 'zone-enter',
    severity: 'critical',
    source: { robotId: 'Robot_Main', linkName: 'tcp' },
    target: { type: 'safety-zone', zoneId: 'zone_danger', zoneName: 'Danger Zone', level: 'danger' },
    message: 'TCP 进入危险区域!',
    details: { distance: 0, robotState: DEFAULT_ROBOT_STATE },
  });

  // 离开危险区
  events.push({
    id: 'zone_exit_1',
    timestamp: 3800,
    type: 'zone-exit',
    severity: 'info',
    source: { robotId: 'Robot_Main', linkName: 'tcp' },
    target: { type: 'safety-zone', zoneId: 'zone_danger', zoneName: 'Danger Zone', level: 'danger' },
    message: 'TCP 离开危险区域',
    details: { distance: 0, robotState: DEFAULT_ROBOT_STATE },
  });

  // 离开警告区
  events.push({
    id: 'zone_exit_2',
    timestamp: 3800,
    type: 'zone-exit',
    severity: 'info',
    source: { robotId: 'Robot_Main', linkName: 'tcp' },
    target: { type: 'safety-zone', zoneId: 'zone_warning', zoneName: 'Warning Zone', level: 'warning' },
    message: 'TCP 离开警告区域',
    details: { distance: 0, robotState: DEFAULT_ROBOT_STATE },
  });

  // 另一个碰撞
  events.push({
    id: 'collision_2',
    timestamp: 5500,
    type: 'collision',
    severity: 'warning',
    source: { robotId: 'Robot_Main', linkName: 'link_3' },
    target: { type: 'obstacle', obstacleId: 'obs_3', obstacleName: 'Part Feeder' },
    message: 'Link3 与零件送料器轻微碰撞',
    details: { distance: 0, velocity: 20, robotState: DEFAULT_ROBOT_STATE },
  });

  // 自碰撞风险
  events.push({
    id: 'near_miss_2',
    timestamp: 6800,
    type: 'near-miss',
    severity: 'warning',
    source: { robotId: 'Robot_Main', linkName: 'link_2' },
    target: { type: 'self', linkName: 'link_5' },
    message: 'Link2 与 Link5 距离过近 (8mm)',
    details: { distance: 8, velocity: 35, robotState: DEFAULT_ROBOT_STATE },
  });

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

// 泳道配置
const TIMELINE_LANES: TimelineLane[] = [
  { id: 'robot-main', label: 'Robot Main', type: 'robot', robotId: 'Robot_Main', color: THEME.primary },
  { id: 'robot-tcp', label: 'TCP', type: 'tcp', robotId: 'Robot_Main' },
  { id: 'robot-j1', label: 'J1-J3', type: 'joint', robotId: 'Robot_Main', jointIndex: 0 },
  { id: 'robot-j4', label: 'J4-J6', type: 'joint', robotId: 'Robot_Main', jointIndex: 3 },
  { id: 'zones', label: 'Safety Zones', type: 'safety-zone', color: THEME.warning },
];

// ============================================================================
// PropertyEditor Schema - 分析设置
// ============================================================================

const ANALYSIS_SETTINGS_SCHEMA: PropertySchema = {
  groups: [
    {
      id: 'collision',
      label: '碰撞检测 / Collision Detection',
      collapsible: true,
      fields: [
        {
          key: 'enabled',
          type: 'boolean',
          label: '启用碰撞检测',
          description: '开启后会在播放时实时检测碰撞',
        },
        {
          key: 'safetyMargin',
          type: 'number',
          label: '安全边距',
          unit: 'mm',
          min: 0,
          max: 100,
          step: 1,
          precision: 0,
          showSlider: true,
          description: '碰撞检测的额外安全距离',
        },
        {
          key: 'checkSelfCollision',
          type: 'boolean',
          label: '自碰撞检测',
          description: '检测机器人自身连杆之间的碰撞',
        },
      ],
    },
    {
      id: 'zones',
      label: '安全区域 / Safety Zones',
      collapsible: true,
      fields: [
        {
          key: 'showWarningZone',
          type: 'boolean',
          label: '显示警告区域',
        },
        {
          key: 'showDangerZone',
          type: 'boolean',
          label: '显示危险区域',
        },
        {
          key: 'zoneOpacity',
          type: 'number',
          label: '区域透明度',
          min: 0.1,
          max: 1,
          step: 0.1,
          precision: 1,
          showSlider: true,
        },
      ],
    },
    {
      id: 'visualization',
      label: '可视化 / Visualization',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          key: 'showTrajectory',
          type: 'boolean',
          label: '显示轨迹',
        },
        {
          key: 'showCollisionPoints',
          type: 'boolean',
          label: '显示碰撞点',
          description: '在 3D 场景中标记碰撞位置',
        },
        {
          key: 'highlightDuration',
          type: 'number',
          label: '高亮持续时间',
          unit: 'ms',
          min: 100,
          max: 2000,
          step: 100,
          precision: 0,
        },
      ],
    },
  ],
};

// 默认设置
const DEFAULT_ANALYSIS_SETTINGS = {
  enabled: true,
  safetyMargin: 10,
  checkSelfCollision: true,
  showWarningZone: true,
  showDangerZone: true,
  zoneOpacity: 0.3,
  showTrajectory: true,
  showCollisionPoints: true,
  highlightDuration: 500,
};

// ============================================================================
// 3D Scene Components
// ============================================================================

function ObstaclesMesh({ obstacles }: { obstacles: Obstacle[] }) {
  return (
    <group>
      {obstacles.map((obs) => (
        <mesh key={obs.id} position={obs.position}>
          <boxGeometry args={obs.size} />
          <meshStandardMaterial color={obs.color} metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function SafetyZonesMesh({
  zones,
  settings,
}: {
  zones: CollisionZone[];
  settings: typeof DEFAULT_ANALYSIS_SETTINGS;
}) {
  return (
    <group>
      {zones.map((zone) => {
        const isWarning = zone.level === 'warning';
        const show = isWarning ? settings.showWarningZone : settings.showDangerZone;
        if (!show) return null;

        return (
          <mesh key={zone.id} position={zone.position}>
            <sphereGeometry args={[zone.radius, 32, 16]} />
            <meshBasicMaterial
              color={isWarning ? THEME.warning : THEME.danger}
              transparent
              opacity={settings.zoneOpacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function CollisionMarkers({
  events,
  selectedEventId,
  currentTime,
  settings,
}: {
  events: TimelineCollisionEvent[];
  selectedEventId: string | null;
  currentTime: number;
  settings: typeof DEFAULT_ANALYSIS_SETTINGS;
}) {
  if (!settings.showCollisionPoints) return null;

  // 只显示当前时间附近的碰撞点
  const nearbyEvents = events.filter(
    (e) =>
      (e.type === 'collision' || e.type === 'near-miss') &&
      Math.abs(e.timestamp - currentTime) < settings.highlightDuration * 2
  );

  return (
    <group>
      {nearbyEvents.map((event) => {
        const isSelected = event.id === selectedEventId;
        const isCurrent = Math.abs(event.timestamp - currentTime) < 100;
        const isCollision = event.type === 'collision';

        // 基于事件类型计算位置 (简化示例)
        const basePos: [number, number, number] = [
          0.4 + Math.random() * 0.2,
          Math.random() * 0.2 - 0.1,
          0.1 + Math.random() * 0.1,
        ];

        const size = isCollision ? 0.03 : 0.02;
        const color = isCollision ? THEME.danger : THEME.warning;

        return (
          <group key={event.id} position={basePos}>
            {/* 碰撞点标记 */}
            <mesh>
              <sphereGeometry args={[size * (isSelected ? 1.5 : 1), 16, 8]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isCurrent ? 1 : 0.5}
              />
            </mesh>
            {/* 选中时的光环 */}
            {isSelected && (
              <mesh>
                <ringGeometry args={[size * 2, size * 2.5, 32]} />
                <meshBasicMaterial color={color} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// Scene Content Component
// ============================================================================

function SceneContent({
  settings,
  events,
  selectedEventId,
  currentTime,
}: {
  settings: typeof DEFAULT_ANALYSIS_SETTINGS;
  events: TimelineCollisionEvent[];
  selectedEventId: string | null;
  currentTime: number;
}) {
  return (
    <>
      <ProcessScene
        urdfPath={URDF_PATH}
        showGhost={false}
        showTrajectory={settings.showTrajectory}
        trajectoryColor={THEME.primary}
      >
        <EndEffector showAxes={true}>
          {/* 简单的末端执行器指示 */}
          <mesh>
            <coneGeometry args={[0.02, 0.05, 8]} />
            <meshStandardMaterial color={THEME.accent} />
          </mesh>
        </EndEffector>
      </ProcessScene>

      <ObstaclesMesh obstacles={OBSTACLES} />
      <SafetyZonesMesh zones={SAFETY_ZONES} settings={settings} />
      <CollisionMarkers
        events={events}
        selectedEventId={selectedEventId}
        currentTime={currentTime}
        settings={settings}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[-2, 3, 2]} intensity={0.3} color="#e0e0ff" />
    </>
  );
}

// ============================================================================
// Inner Component with Context Access
// ============================================================================

function CollisionAnalysisInner() {
  const { addLog } = useAppStore();

  // State
  const [events] = useState<TimelineCollisionEvent[]>(() => generateCollisionEvents());
  const [settings, setSettings] = useState(DEFAULT_ANALYSIS_SETTINGS);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Playback from context
  const playback = useProcessPlayback();
  const state = useRobotProcessState();

  // 时间范围
  const timeRange: TimeRange = useMemo(
    () => ({ start: 0, end: TRAJECTORY_DURATION }),
    []
  );

  // 使用 ref 来避免 effect 依赖问题
  const playbackRef = useRef(playback);
  playbackRef.current = playback;
  const addLogRef = useRef(addLog);
  addLogRef.current = addLog;

  // 加载轨迹 - 只在组件挂载时执行一次
  const trajectoryLoadedRef = useRef(false);
  useEffect(() => {
    if (trajectoryLoadedRef.current) return;
    trajectoryLoadedRef.current = true;

    const trajectory = generateDemoTrajectory();
    playbackRef.current.load(trajectory);
    addLogRef.current('info', '轨迹已加载，点击播放开始分析');
  }, []);

  // 同步播放状态
  useEffect(() => {
    if (isPlaying) {
      playbackRef.current.play();
    } else {
      playbackRef.current.pause();
    }
  }, [isPlaying]);

  // 同步时间位置
  useEffect(() => {
    if (state.playbackPosition !== undefined) {
      setCurrentTime(state.playbackPosition * TRAJECTORY_DURATION);
    }
  }, [state.playbackPosition]);

  // 处理时间轴时间变化
  const handleTimeChange = useCallback(
    (time: number) => {
      setCurrentTime(time);
      // 同步到轨迹播放
      playbackRef.current.seek(time / TRAJECTORY_DURATION);
    },
    []
  );

  // 播放/暂停
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const newState = !prev;
      addLogRef.current('info', newState ? '开始播放分析' : '暂停');
      return newState;
    });
  }, []);

  // 速度变化
  const handleSpeedChange = useCallback(
    (speed: number) => {
      setPlaybackSpeed(speed);
      playbackRef.current.setSpeed(speed);
      addLogRef.current('info', `播放速度: ${speed}x`);
    },
    []
  );

  // 选择事件
  const handleEventSelect = useCallback(
    (event: TimelineCollisionEvent | null) => {
      setSelectedEventId(event?.id || null);
      if (event) {
        // 跳转到事件时间点
        setCurrentTime(event.timestamp);
        playbackRef.current.seek(event.timestamp / TRAJECTORY_DURATION);
        addLogRef.current(
          event.severity === 'critical' ? 'error' : 'warning',
          `选中事件: ${event.message || event.type} @ ${(event.timestamp / 1000).toFixed(2)}s`
        );
      }
    },
    []
  );

  // 双击事件 - 跳转并暂停
  const handleEventDoubleClick = useCallback(
    (event: TimelineCollisionEvent) => {
      setIsPlaying(false);
      setCurrentTime(event.timestamp);
      playbackRef.current.seek(event.timestamp / TRAJECTORY_DURATION);
      playbackRef.current.pause();
      addLogRef.current('info', `跳转到事件: ${event.id}`);
    },
    []
  );

  // 事件统计
  const eventStats = useMemo(() => {
    return {
      total: events.length,
      collisions: events.filter((e) => e.type === 'collision').length,
      nearMiss: events.filter((e) => e.type === 'near-miss').length,
      zoneEvents: events.filter((e) => e.type === 'zone-enter' || e.type === 'zone-exit').length,
      critical: events.filter((e) => e.severity === 'critical').length,
    };
  }, [events]);

  return (
    <div className="module-container" style={{ background: THEME.background, maxHeight: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div className="module-header" style={{ borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary }}>Collision Analysis</h2>
        <p style={{ color: THEME.textSecondary }}>
          轨迹碰撞分析 - Timeline 与机器人场景同步演示
        </p>
      </div>

      {/* Event Statistics Bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '12px 16px',
          background: THEME.surface,
          borderRadius: 8,
          marginBottom: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <StatBadge label="总事件" value={eventStats.total} color={THEME.textSecondary} />
        <StatBadge label="碰撞" value={eventStats.collisions} color={THEME.danger} />
        <StatBadge label="近距" value={eventStats.nearMiss} color={THEME.warning} />
        <StatBadge label="区域" value={eventStats.zoneEvents} color={THEME.primary} />
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: eventStats.critical > 0 ? `${THEME.danger}20` : `${THEME.success}20`,
            borderRadius: 4,
            border: `1px solid ${eventStats.critical > 0 ? THEME.danger : THEME.success}40`,
          }}
        >
          <span style={{ color: eventStats.critical > 0 ? THEME.danger : THEME.success, fontWeight: 600 }}>
            {eventStats.critical > 0 ? `${eventStats.critical} 严重问题` : '无严重问题'}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left Panel - Settings */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Analysis Settings */}
          <div
            style={{
              background: THEME.panel,
              borderRadius: 8,
              border: `1px solid ${THEME.primary}40`,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                background: THEME.surface,
                borderBottom: `1px solid ${THEME.primary}30`,
                fontSize: 12,
                fontWeight: 600,
                color: THEME.text,
              }}
            >
              分析设置
            </div>
            <PropertyEditor
              schema={ANALYSIS_SETTINGS_SCHEMA}
              value={settings as unknown as Record<string, unknown>}
              onChange={(v) => setSettings(v as unknown as typeof DEFAULT_ANALYSIS_SETTINGS)}
              theme="dark"
              compact={true}
              hideActions={true}
              autoSave={true}
            />
          </div>

          {/* Selected Event Details */}
          {selectedEventId && (
            <div
              style={{
                background: THEME.panel,
                borderRadius: 8,
                border: `1px solid ${THEME.primary}40`,
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: THEME.textSecondary,
                  marginBottom: 8,
                }}
              >
                选中事件详情
              </div>
              {(() => {
                const event = events.find((e) => e.id === selectedEventId);
                if (!event) return null;

                return (
                  <div style={{ fontSize: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background:
                            event.severity === 'critical'
                              ? THEME.danger
                              : event.severity === 'warning'
                              ? THEME.warning
                              : THEME.primary,
                        }}
                      />
                      <span style={{ fontWeight: 600, color: THEME.text }}>
                        {event.type.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color: THEME.textSecondary, marginBottom: 4 }}>
                      时间: {(event.timestamp / 1000).toFixed(2)}s
                    </div>
                    <div style={{ color: THEME.textSecondary, marginBottom: 4 }}>
                      来源: {event.source.robotId} / {event.source.linkName}
                    </div>
                    {event.message && (
                      <div
                        style={{
                          color: THEME.text,
                          marginTop: 8,
                          padding: 8,
                          background: THEME.surface,
                          borderRadius: 4,
                        }}
                      >
                        {event.message}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Playback Status */}
          <div
            style={{
              background: THEME.panel,
              borderRadius: 8,
              border: `1px solid ${THEME.primary}40`,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: THEME.textSecondary, marginBottom: 8 }}>
              播放状态
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: THEME.textSecondary }}>时间:</span>
                <span style={{ color: THEME.text, marginLeft: 4 }}>
                  {(currentTime / 1000).toFixed(2)}s
                </span>
              </div>
              <div>
                <span style={{ color: THEME.textSecondary }}>速度:</span>
                <span style={{ color: THEME.text, marginLeft: 4 }}>{playbackSpeed}x</span>
              </div>
              <div>
                <span style={{ color: THEME.textSecondary }}>状态:</span>
                <span
                  style={{
                    color: isPlaying ? THEME.success : THEME.warning,
                    marginLeft: 4,
                  }}
                >
                  {isPlaying ? '播放中' : '已暂停'}
                </span>
              </div>
              <div>
                <span style={{ color: THEME.textSecondary }}>进度:</span>
                <span style={{ color: THEME.text, marginLeft: 4 }}>
                  {((currentTime / TRAJECTORY_DURATION) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - 3D View + Timeline */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 3D Scene */}
          <div
            style={{
              height: 400,
              borderRadius: 8,
              overflow: 'hidden',
              border: `1px solid ${THEME.primary}30`,
            }}
          >
            <RoboViz
              config={{
                scene: { background: THEME.background },
                camera: { position: { x: 1.5, y: 1.2, z: 1.5 } },
              }}
            >
              <SceneContent
                settings={settings}
                events={events}
                selectedEventId={selectedEventId}
                currentTime={currentTime}
              />
            </RoboViz>
          </div>

          {/* Timeline */}
          <div
            style={{
              background: THEME.surface,
              borderRadius: 8,
              overflow: 'hidden',
              border: `1px solid ${THEME.primary}30`,
            }}
          >
            <CollisionTimeline
              events={events}
              lanes={TIMELINE_LANES}
              timeRange={timeRange}
              currentTime={currentTime}
              onTimeChange={handleTimeChange}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onPlayPause={handlePlayPause}
              onSpeedChange={handleSpeedChange}
              selectedEventId={selectedEventId}
              onEventSelect={handleEventSelect}
              onEventDoubleClick={handleEventDoubleClick}
              showPlaybackControls={true}
              showZoomControls={true}
              showLegend={true}
              height={280}
            />
          </div>

          {/* Keyboard Shortcuts */}
          <div
            style={{
              padding: 10,
              background: `${THEME.surface}80`,
              borderRadius: 6,
              fontSize: 11,
              color: THEME.textSecondary,
            }}
          >
            <strong>快捷键:</strong>
            <span style={{ marginLeft: 16 }}>
              <kbd style={kbdStyle}>Space</kbd> 播放/暂停
            </span>
            <span style={{ marginLeft: 12 }}>
              <kbd style={kbdStyle}>+/-</kbd> 缩放
            </span>
            <span style={{ marginLeft: 12 }}>
              <kbd style={kbdStyle}>[/]</kbd> 上/下一个事件
            </span>
            <span style={{ marginLeft: 12 }}>
              <kbd style={kbdStyle}>Home/End</kbd> 跳转开始/结束
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  background: '#333',
  borderRadius: 3,
  border: '1px solid #555',
  fontFamily: 'monospace',
  fontSize: 10,
};

// ============================================================================
// Helper Components
// ============================================================================

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        backgroundColor: `${color}15`,
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      <span style={{ color: THEME.textSecondary }}>{label}:</span>
      <span style={{ fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export function CollisionAnalysisScene() {
  return (
    <ProcessProvider>
      <RobotProcessProvider urdfPath={URDF_PATH} robotId="collision-analysis-robot">
        <CollisionAnalysisInner />
      </RobotProcessProvider>
    </ProcessProvider>
  );
}

export default CollisionAnalysisScene;
