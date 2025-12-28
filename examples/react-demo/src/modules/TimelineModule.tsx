/**
 * Timeline Module Demo
 *
 * Demonstrates the CollisionTimeline component for visualizing
 * collision events over time with multi-robot lane support.
 *
 * ===== 使用说明 / Usage Guide =====
 *
 * ## 1. 基本导入 / Basic Import
 * ```tsx
 * import {
 *   CollisionTimeline,
 *   type TimelineCollisionEvent,
 *   type TimelineLane,
 *   type TimeRange,
 *   type EventSeverity,
 *   type TimelineCollisionEventType,
 * } from '@aspect/roboviz-react';
 * ```
 *
 * ## 2. 必需属性 / Required Props
 * - `events`: TimelineCollisionEvent[] - 碰撞事件数组 / Array of collision events
 * - `timeRange`: TimeRange - 时间范围 { start: number, end: number } / Time range in milliseconds
 *
 * ## 3. 可选属性 / Optional Props
 *
 * ### 播放控制 / Playback Control
 * - `currentTime`: number - 当前时间位置 / Current time position in ms
 * - `onTimeChange`: (time: number) => void - 时间改变回调 / Time change callback
 * - `isPlaying`: boolean - 是否正在播放 / Whether timeline is playing
 * - `playbackSpeed`: number - 播放速度倍率 (0.25, 0.5, 1, 2) / Playback speed multiplier
 * - `onPlayPause`: () => void - 播放/暂停回调 / Play/pause toggle callback
 * - `onSpeedChange`: (speed: number) => void - 速度改变回调 / Speed change callback
 *
 * ### 事件交互 / Event Interaction
 * - `selectedEventId`: string | null - 选中的事件ID / Currently selected event ID
 * - `onEventSelect`: (event: TimelineCollisionEvent | null) => void - 事件选择回调
 * - `onEventHover`: (event: TimelineCollisionEvent | null) => void - 事件悬停回调
 * - `onEventDoubleClick`: (event: TimelineCollisionEvent) => void - 双击事件回调
 *
 * ### 过滤器 / Filters
 * - `severityFilter`: EventSeverity[] - 严重程度过滤 ['critical', 'warning', 'info']
 * - `typeFilter`: TimelineCollisionEventType[] - 类型过滤 ['collision', 'near-miss', 'zone-enter', 'zone-exit']
 *
 * ### 显示选项 / Display Options
 * - `lanes`: TimelineLane[] - 自定义泳道配置 / Custom lane configuration
 * - `showPlaybackControls`: boolean - 显示播放控制 (default: true)
 * - `showZoomControls`: boolean - 显示缩放控制 (default: true)
 * - `showLegend`: boolean - 显示图例 (default: true)
 * - `height`: number - 组件高度 (default: 350)
 * - `theme`: 'light' | 'dark' | 'auto' - 主题 (default: 'auto' → 'dark')
 *
 * ## 4. 事件数据结构 / Event Data Structure
 * ```tsx
 * interface TimelineCollisionEvent {
 *   id: string;                    // 唯一ID / Unique identifier
 *   timestamp: number;             // 时间戳(ms) / Timestamp in milliseconds
 *   duration?: number;             // 持续时间(ms) / Duration for zone events
 *   type: 'collision' | 'near-miss' | 'zone-enter' | 'zone-exit';
 *   severity: 'info' | 'warning' | 'critical';
 *   source: {
 *     robotId: string;             // 机器人ID / Robot identifier
 *     linkName?: string;           // 连杆名称 / Link name
 *     jointIndex?: number;         // 关节索引 / Joint index
 *   };
 *   target: CollisionTarget;       // 碰撞目标 / Collision target
 *   message?: string;              // 描述信息 / Description message
 *   details?: CollisionDetails;    // 详细数据 / Detailed data
 * }
 * ```
 *
 * ## 5. 泳道配置 / Lane Configuration
 * ```tsx
 * interface TimelineLane {
 *   id: string;                    // 泳道ID / Lane identifier
 *   label: string;                 // 显示标签 / Display label
 *   type: 'robot' | 'joint' | 'tcp' | 'zone' | 'custom';
 *   robotId?: string;              // 关联的机器人ID / Associated robot ID
 *   jointIndex?: number;           // 关节索引 / Joint index (for joint lanes)
 *   color?: string;                // 泳道颜色 / Lane color
 *   height?: number;               // 高度(px) / Height in pixels
 * }
 * ```
 *
 * ## 6. 快捷键 / Keyboard Shortcuts
 * - Space: 播放/暂停 / Play/Pause
 * - +/-: 缩放 / Zoom in/out
 * - Home/End: 跳转到开始/结束 / Jump to start/end
 * - [/]: 上一个/下一个事件 / Previous/Next event
 *
 * ===================================
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useControls, button, folder } from 'leva';
import {
  CollisionTimeline,
  type TimelineCollisionEvent,
  type TimelineLaneType,
  type TimeRange,
  type EventSeverity,
  type TimelineCollisionEventType,
} from '@aspect/roboviz-react';
import { useAppStore } from '../store';

// Generate mock collision events
function generateMockEvents(count: number, duration: number): TimelineCollisionEvent[] {
  const types: TimelineCollisionEventType[] = ['collision', 'near-miss', 'zone-enter', 'zone-exit'];
  const severities: EventSeverity[] = ['info', 'warning', 'critical'];
  const robots = ['Robot_A', 'Robot_B'];
  const links = ['link_1', 'link_2', 'link_3', 'tcp'];

  const events: TimelineCollisionEvent[] = [];

  for (let i = 0; i < count; i++) {
    const robotId = robots[Math.floor(Math.random() * robots.length)];
    const eventType = types[Math.floor(Math.random() * types.length)];
    const severity = eventType === 'collision'
      ? (Math.random() > 0.5 ? 'critical' : 'warning')
      : eventType === 'near-miss'
        ? 'warning'
        : 'info';

    events.push({
      id: `event_${i}`,
      timestamp: Math.random() * duration,
      duration: eventType === 'zone-enter' ? Math.random() * 500 + 100 : undefined,
      type: eventType,
      severity,
      source: {
        robotId,
        linkName: links[Math.floor(Math.random() * links.length)],
        jointIndex: Math.floor(Math.random() * 6),
      },
      target: eventType === 'zone-enter' || eventType === 'zone-exit'
        ? {
            type: 'safety-zone' as const,
            zoneId: `zone_${Math.floor(Math.random() * 3)}`,
            zoneName: Math.random() > 0.5 ? 'Warning Zone' : 'Danger Zone',
            level: Math.random() > 0.5 ? 'warning' as const : 'danger' as const,
          }
        : eventType === 'collision' && Math.random() > 0.7
          ? {
              type: 'self' as const,
              linkName: links[Math.floor(Math.random() * links.length)],
            }
          : {
              type: 'obstacle' as const,
              obstacleId: `obs_${Math.floor(Math.random() * 5)}`,
              obstacleName: `Obstacle_${Math.floor(Math.random() * 5)}`,
            },
      details: {
        distance: Math.random() * 50,
        velocity: Math.random() * 100,
        robotState: {
          joints: [0, 0, 0, 0, 0, 0],
          tcpPose: {
            position: [0, 0, 0] as [number, number, number],
            quaternion: [0, 0, 0, 1] as [number, number, number, number],
          },
        },
      },
      message: `${eventType} detected at ${robotId}`,
    });
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

// Default lanes configuration
const DEFAULT_LANES: TimelineLaneType[] = [
  { id: 'robot-a', label: 'Robot A', type: 'robot', robotId: 'Robot_A', color: '#4ecdc4' },
  { id: 'robot-a-j1', label: 'J1', type: 'joint', robotId: 'Robot_A', jointIndex: 0 },
  { id: 'robot-a-j2', label: 'J2', type: 'joint', robotId: 'Robot_A', jointIndex: 1 },
  { id: 'robot-a-j3', label: 'J3', type: 'joint', robotId: 'Robot_A', jointIndex: 2 },
  { id: 'robot-a-tcp', label: 'TCP', type: 'tcp', robotId: 'Robot_A' },
  { id: 'robot-b', label: 'Robot B', type: 'robot', robotId: 'Robot_B', color: '#ff6b6b' },
  { id: 'robot-b-j1', label: 'J1', type: 'joint', robotId: 'Robot_B', jointIndex: 0 },
  { id: 'robot-b-j2', label: 'J2', type: 'joint', robotId: 'Robot_B', jointIndex: 1 },
  { id: 'robot-b-tcp', label: 'TCP', type: 'tcp', robotId: 'Robot_B' },
];

const TOTAL_DURATION = 10000; // 10 seconds

export function TimelineModule() {
  const { addLog } = useAppStore();

  // State
  const [events, setEvents] = useState<TimelineCollisionEvent[]>(() =>
    generateMockEvents(30, TOTAL_DURATION)
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<EventSeverity[]>([]);
  const [typeFilter, setTypeFilter] = useState<TimelineCollisionEventType[]>([]);

  const timeRange: TimeRange = useMemo(() => ({
    start: 0,
    end: TOTAL_DURATION,
  }), []);

  // Event handlers
  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
    addLog('info', isPlaying ? 'Playback paused' : 'Playback started');
  }, [isPlaying, addLog]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    addLog('info', `Playback speed: ${speed}x`);
  }, [addLog]);

  const handleEventSelect = useCallback((event: TimelineCollisionEvent | null) => {
    setSelectedEventId(event?.id || null);
    if (event) {
      addLog('info', `Selected event: ${event.type} at ${(event.timestamp / 1000).toFixed(2)}s`);
    }
  }, [addLog]);

  const handleEventHover = useCallback((event: TimelineCollisionEvent | null) => {
    // Could add hover visualization here
  }, []);

  const handleEventDoubleClick = useCallback((event: TimelineCollisionEvent) => {
    addLog('info', `Focused on event: ${event.id}`);
    setCurrentTime(event.timestamp);
  }, [addLog]);

  // Leva controls
  useControls('Timeline Controls', {
    'Event Generation': folder({
      'Generate 10 Events': button(() => {
        setEvents(generateMockEvents(10, TOTAL_DURATION));
        addLog('info', 'Generated 10 mock events');
      }),
      'Generate 50 Events': button(() => {
        setEvents(generateMockEvents(50, TOTAL_DURATION));
        addLog('info', 'Generated 50 mock events');
      }),
      'Generate 100 Events': button(() => {
        setEvents(generateMockEvents(100, TOTAL_DURATION));
        addLog('info', 'Generated 100 mock events');
      }),
      'Clear Events': button(() => {
        setEvents([]);
        addLog('info', 'Cleared all events');
      }),
    }),
    'Filters': folder({
      showCritical: {
        value: true,
        label: 'Critical',
        onChange: (v: boolean) => {
          setSeverityFilter((prev) =>
            v ? prev.filter((s) => s !== 'critical') : [...prev, 'critical']
          );
        },
      },
      showWarning: {
        value: true,
        label: 'Warning',
        onChange: (v: boolean) => {
          setSeverityFilter((prev) =>
            v ? prev.filter((s) => s !== 'warning') : [...prev, 'warning']
          );
        },
      },
      showInfo: {
        value: true,
        label: 'Info',
        onChange: (v: boolean) => {
          setSeverityFilter((prev) =>
            v ? prev.filter((s) => s !== 'info') : [...prev, 'info']
          );
        },
      },
    }),
    'Event Types': folder({
      showCollisions: {
        value: true,
        label: 'Collisions',
        onChange: (v: boolean) => {
          setTypeFilter((prev) =>
            v ? prev.filter((t) => t !== 'collision') : [...prev, 'collision']
          );
        },
      },
      showNearMiss: {
        value: true,
        label: 'Near Miss',
        onChange: (v: boolean) => {
          setTypeFilter((prev) =>
            v ? prev.filter((t) => t !== 'near-miss') : [...prev, 'near-miss']
          );
        },
      },
      showZoneEvents: {
        value: true,
        label: 'Zone Events',
        onChange: (v: boolean) => {
          setTypeFilter((prev) => {
            if (v) {
              return prev.filter((t) => t !== 'zone-enter' && t !== 'zone-exit');
            }
            return [...prev, 'zone-enter', 'zone-exit'];
          });
        },
      },
    }),
  });

  // Count events by type
  const eventCounts = useMemo(() => {
    const counts = {
      total: events.length,
      collision: 0,
      nearMiss: 0,
      zoneEnter: 0,
      zoneExit: 0,
      critical: 0,
      warning: 0,
      info: 0,
    };

    for (const event of events) {
      switch (event.type) {
        case 'collision':
          counts.collision++;
          break;
        case 'near-miss':
          counts.nearMiss++;
          break;
        case 'zone-enter':
          counts.zoneEnter++;
          break;
        case 'zone-exit':
          counts.zoneExit++;
          break;
      }

      switch (event.severity) {
        case 'critical':
          counts.critical++;
          break;
        case 'warning':
          counts.warning++;
          break;
        case 'info':
          counts.info++;
          break;
      }
    }

    return counts;
  }, [events]);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Collision Timeline</h2>
        <p>
          Multi-robot collision event visualization with lanes, playback controls, and filtering.
        </p>
      </div>

      {/* Event statistics */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 16,
          padding: 12,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: 8,
          flexWrap: 'wrap',
        }}
      >
        <StatBadge label="Total" value={eventCounts.total} color="#888" />
        <StatBadge label="Collisions" value={eventCounts.collision} color="#dc2626" />
        <StatBadge label="Near Miss" value={eventCounts.nearMiss} color="#f59e0b" />
        <StatBadge label="Zone Enter" value={eventCounts.zoneEnter} color="#3b82f6" />
        <StatBadge label="Zone Exit" value={eventCounts.zoneExit} color="#22c55e" />
        <div style={{ flex: 1 }} />
        <StatBadge label="Critical" value={eventCounts.critical} color="#dc2626" />
        <StatBadge label="Warning" value={eventCounts.warning} color="#f59e0b" />
        <StatBadge label="Info" value={eventCounts.info} color="#3b82f6" />
      </div>

      {/* Timeline component */}
      <div
        style={{
          backgroundColor: '#1e1e2e',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        <CollisionTimeline
          events={events}
          lanes={DEFAULT_LANES}
          timeRange={timeRange}
          currentTime={currentTime}
          onTimeChange={handleTimeChange}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onPlayPause={handlePlayPause}
          onSpeedChange={handleSpeedChange}
          selectedEventId={selectedEventId}
          onEventSelect={handleEventSelect}
          onEventHover={handleEventHover}
          onEventDoubleClick={handleEventDoubleClick}
          severityFilter={severityFilter.length > 0 ? severityFilter : undefined}
          typeFilter={typeFilter.length > 0 ? typeFilter : undefined}
          showPlaybackControls={true}
          showZoomControls={true}
          showLegend={true}
          height={400}
        />
      </div>

      {/* Current state display */}
      <div className="module-status">
        <span>Time: {(currentTime / 1000).toFixed(2)}s</span>
        <span>Speed: {playbackSpeed}x</span>
        <span className={isPlaying ? 'active' : ''}>
          {isPlaying ? 'Playing' : 'Paused'}
        </span>
        {selectedEventId && (
          <span className="active">Selected: {selectedEventId}</span>
        )}
      </div>

      {/* Keyboard shortcuts help */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 8,
          fontSize: 12,
          color: '#888',
        }}
      >
        <strong>Keyboard Shortcuts:</strong>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
          <span><kbd>Space</kbd> Play/Pause</span>
          <span><kbd>+/-</kbd> Zoom</span>
          <span><kbd>Home/End</kbd> Go to Start/End</span>
          <span><kbd>[/]</kbd> Previous/Next Event</span>
        </div>
      </div>
    </div>
  );
}

// Stat badge component
function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        backgroundColor: `${color}22`,
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
      <span style={{ color: '#aaa' }}>{label}:</span>
      <span style={{ fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
