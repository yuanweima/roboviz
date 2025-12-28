/**
 * CollisionTimeline Component
 *
 * High-level component that combines all timeline pieces for collision visualization.
 * This is the main export for users who want a ready-to-use collision timeline.
 *
 * Features:
 * - Multi-robot support with collapsible lane groups
 * - Event filtering by severity and type
 * - Playback controls
 * - Keyboard shortcuts
 * - 3D scene synchronization callbacks
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type {
  CollisionTimelineProps,
  TimelineCollisionEvent,
  TimelineLane,
  LaneGroup,
  TimeRange,
  EventSeverity,
  TimelineCollisionEventType,
} from './types';
import { TimelineContainer, type TimelineContainerHandle } from './TimelineContainer';
import { LaneGroup as LaneGroupComponent } from './LaneGroup';
import { DEFAULT_EVENT_COLORS } from './types';

/** Dark theme CSS variables for legend area */
const DARK_THEME_VARS: Record<string, string> = {
  '--timeline-border': '#3f3f5a',
  '--timeline-legend-bg': '#252538',
  '--timeline-text-primary': '#e5e7eb',
  '--timeline-text-secondary': '#9ca3af',
};

/** Light theme CSS variables (defaults) */
const LIGHT_THEME_VARS: Record<string, string> = {
  '--timeline-border': '#e5e7eb',
  '--timeline-legend-bg': '#fafafa',
  '--timeline-text-primary': '#374151',
  '--timeline-text-secondary': '#6b7280',
};

/** Generate lane groups from lanes configuration */
function buildLaneGroups(lanes: TimelineLane[]): LaneGroup[] {
  const groups: LaneGroup[] = [];
  const robotLanes = new Map<string, TimelineLane[]>();
  const otherLanes: TimelineLane[] = [];

  // Group lanes by robot ID
  for (const lane of lanes) {
    if (lane.robotId) {
      const existing = robotLanes.get(lane.robotId) || [];
      existing.push(lane);
      robotLanes.set(lane.robotId, existing);
    } else {
      otherLanes.push(lane);
    }
  }

  // Create groups for each robot
  for (const [robotId, robotLaneList] of robotLanes) {
    // Find the main robot lane (type = 'robot') for group info
    const mainLane = robotLaneList.find((l) => l.type === 'robot');

    groups.push({
      id: `group-${robotId}`,
      label: mainLane?.label || robotId,
      lanes: robotLaneList,
      color: mainLane?.color,
      icon: mainLane?.icon,
    });
  }

  // Add non-robot lanes as individual groups
  for (const lane of otherLanes) {
    groups.push({
      id: `group-${lane.id}`,
      label: lane.label,
      lanes: [lane],
      color: lane.color,
      icon: lane.icon,
    });
  }

  return groups;
}

/** Filter events based on severity and type filters */
function filterEvents(
  events: TimelineCollisionEvent[],
  severityFilter?: EventSeverity[],
  typeFilter?: TimelineCollisionEventType[]
): TimelineCollisionEvent[] {
  return events.filter((event) => {
    if (severityFilter && severityFilter.length > 0) {
      if (!severityFilter.includes(event.severity)) return false;
    }
    if (typeFilter && typeFilter.length > 0) {
      if (!typeFilter.includes(event.type)) return false;
    }
    return true;
  });
}

/** Generate default lanes for robots found in events */
function generateDefaultLanes(events: TimelineCollisionEvent[]): TimelineLane[] {
  const robotIds = new Set<string>();
  const jointIndices = new Map<string, Set<number>>();

  // Collect robot IDs and joint indices from events
  for (const event of events) {
    if (event.source.robotId) {
      robotIds.add(event.source.robotId);

      if (event.source.jointIndex !== undefined) {
        const joints = jointIndices.get(event.source.robotId) || new Set();
        joints.add(event.source.jointIndex);
        jointIndices.set(event.source.robotId, joints);
      }
    }
  }

  const lanes: TimelineLane[] = [];

  for (const robotId of robotIds) {
    // Robot overview lane
    lanes.push({
      id: `lane-${robotId}`,
      label: robotId,
      type: 'robot',
      robotId,
      collapsible: true,
    });

    // Joint lanes
    const joints = jointIndices.get(robotId) || new Set();
    const sortedJoints = Array.from(joints).sort((a, b) => a - b);

    for (const jointIndex of sortedJoints) {
      lanes.push({
        id: `lane-${robotId}-j${jointIndex}`,
        label: `J${jointIndex + 1}`,
        type: 'joint',
        robotId,
        jointIndex,
      });
    }

    // TCP lane
    lanes.push({
      id: `lane-${robotId}-tcp`,
      label: 'TCP',
      type: 'tcp',
      robotId,
    });
  }

  return lanes;
}

const DEFAULT_HEIGHT = 350;

export const CollisionTimeline: React.FC<CollisionTimelineProps> = ({
  events,
  lanes: providedLanes,
  timeRange,
  currentTime,
  onTimeChange,
  isPlaying = false,
  playbackSpeed = 1,
  loop = false,
  onPlayPause,
  onSpeedChange,
  selectedEventId: controlledSelectedEventId,
  onEventSelect,
  onEventHover,
  onEventDoubleClick,
  collapsedLanes: controlledCollapsedLanes,
  onLaneToggle,
  renderEvent,
  renderLaneHeader,
  renderTooltip,
  renderEmptyState,
  severityFilter,
  typeFilter,
  showPlaybackControls = true,
  showZoomControls = true,
  showLegend = true,
  showMinimap = false,
  className = '',
  style,
  height = DEFAULT_HEIGHT,
  theme = 'auto',
}) => {
  const containerRef = useRef<TimelineContainerHandle>(null);

  // Internal state for uncontrolled mode
  const [internalSelectedEventId, setInternalSelectedEventId] = useState<string | null>(null);
  const [internalCollapsedLanes, setInternalCollapsedLanes] = useState<Set<string>>(new Set());
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  // Use controlled or uncontrolled state
  const selectedEventId = controlledSelectedEventId ?? internalSelectedEventId;
  const collapsedLanesSet = controlledCollapsedLanes
    ? new Set(controlledCollapsedLanes)
    : internalCollapsedLanes;

  // Generate lanes if not provided
  const lanes = useMemo(() => {
    return providedLanes || generateDefaultLanes(events);
  }, [providedLanes, events]);

  // Build lane groups
  const laneGroups = useMemo(() => buildLaneGroups(lanes), [lanes]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return filterEvents(events, severityFilter, typeFilter);
  }, [events, severityFilter, typeFilter]);

  // Handle event selection
  const handleEventSelect = useCallback(
    (event: TimelineCollisionEvent | null) => {
      if (controlledSelectedEventId === undefined) {
        setInternalSelectedEventId(event?.id || null);
      }
      onEventSelect?.(event);
    },
    [controlledSelectedEventId, onEventSelect]
  );

  // Handle event hover
  const handleEventHover = useCallback(
    (event: TimelineCollisionEvent | null) => {
      setHoveredEventId(event?.id || null);
      onEventHover?.(event);
    },
    [onEventHover]
  );

  // Handle lane toggle
  const handleLaneToggle = useCallback(
    (groupId: string) => {
      if (controlledCollapsedLanes === undefined) {
        setInternalCollapsedLanes((prev) => {
          const next = new Set(prev);
          if (next.has(groupId)) {
            next.delete(groupId);
          } else {
            next.add(groupId);
          }
          return next;
        });
      }

      // Find the group to get its collapsed state
      const isCurrentlyCollapsed = collapsedLanesSet.has(groupId);
      onLaneToggle?.(groupId, !isCurrentlyCollapsed);
    },
    [controlledCollapsedLanes, collapsedLanesSet, onLaneToggle]
  );

  // Handle event double click (typically used to focus camera on collision)
  const handleEventDoubleClick = useCallback(
    (event: TimelineCollisionEvent) => {
      // Scroll timeline to event
      containerRef.current?.scrollToTime(event.timestamp);

      // Update current time
      onTimeChange?.(event.timestamp);

      // Notify parent
      onEventDoubleClick?.(event);
    },
    [onTimeChange, onEventDoubleClick]
  );

  // Empty state
  if (events.length === 0 && renderEmptyState) {
    return (
      <div className={`collision-timeline collision-timeline--empty ${className}`} style={style}>
        {renderEmptyState()}
      </div>
    );
  }

  // Determine effective theme
  const effectiveTheme = theme === 'auto' ? 'dark' : theme;
  const themeVars = effectiveTheme === 'dark' ? DARK_THEME_VARS : LIGHT_THEME_VARS;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    ...themeVars,
    ...style,
  };

  return (
    <div className={`collision-timeline ${className}`} style={containerStyle}>
      {/* Legend */}
      {showLegend && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '8px 12px',
            borderBottom: '1px solid var(--timeline-border)',
            backgroundColor: 'var(--timeline-legend-bg)',
            fontSize: 11,
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--timeline-text-secondary)' }}>
            Legend:
          </span>
          <LegendItem color={DEFAULT_EVENT_COLORS.collision.critical} label="Collision (Critical)" />
          <LegendItem color={DEFAULT_EVENT_COLORS.collision.warning} label="Collision (Warning)" />
          <LegendItem color={DEFAULT_EVENT_COLORS.nearMiss.warning} label="Near Miss" />
          <LegendItem color={DEFAULT_EVENT_COLORS.zoneEnter} label="Zone Enter" />
          <LegendItem color={DEFAULT_EVENT_COLORS.zoneExit} label="Zone Exit" />

          {/* Event count */}
          <span style={{ marginLeft: 'auto', color: 'var(--timeline-text-secondary)' }}>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Timeline */}
      <TimelineContainer
        ref={containerRef}
        timeRange={timeRange}
        currentTime={currentTime}
        onTimeChange={onTimeChange}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onPlayPause={onPlayPause}
        onSpeedChange={onSpeedChange}
        height={height - (showLegend ? 36 : 0)}
        theme={effectiveTheme}
      >
        {/* Lane groups */}
        {laneGroups.map((group) => (
          <LaneGroupComponent
            key={group.id}
            group={group}
            events={filteredEvents}
            timeRange={timeRange}
            zoom={{ scale: 0.1, minScale: 0.001, maxScale: 1 }} // Will be overridden by container
            collapsed={collapsedLanesSet.has(group.id)}
            onToggleCollapse={handleLaneToggle}
            selectedEventId={selectedEventId}
            hoveredEventId={hoveredEventId}
            onEventSelect={(e) => handleEventSelect(e as TimelineCollisionEvent)}
            onEventHover={(e) => handleEventHover(e as TimelineCollisionEvent | null)}
            renderLaneHeader={renderLaneHeader}
            renderEvent={renderEvent as any}
          />
        ))}
      </TimelineContainer>
    </div>
  );
};

/** Legend item component */
const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: color,
      }}
    />
    <span style={{ color: 'var(--timeline-text-primary)' }}>{label}</span>
  </div>
);

CollisionTimeline.displayName = 'CollisionTimeline';

export default CollisionTimeline;
