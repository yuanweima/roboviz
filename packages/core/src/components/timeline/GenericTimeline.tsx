/**
 * GenericTimeline Component
 *
 * A flexible timeline component for any type of time-based events.
 * Unlike CollisionTimeline, this component works with generic TimelineEvent objects
 * and supports custom lanes via laneId matching.
 *
 * Features:
 * - Works with any event type (not collision-specific)
 * - Custom lane support via laneId
 * - Custom severity colors
 * - Event filtering by type and severity
 * - Playback controls
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import type {
  TimelineEvent,
  TimelineLane,
  LaneGroup,
  TimeRange,
  ZoomConfig,
  ExtendedSeverity,
} from './types';
import { TimelineContainer, type TimelineContainerHandle } from './TimelineContainer';
import { LaneGroup as LaneGroupComponent } from './LaneGroup';

/** Props for GenericTimeline component */
export interface GenericTimelineProps<T = unknown> {
  // Data
  events: TimelineEvent<T>[];
  lanes: TimelineLane[];

  // Time control
  timeRange: TimeRange;
  currentTime: number;
  onTimeChange?: (time: number) => void;

  // Playback
  isPlaying?: boolean;
  playbackSpeed?: number;
  loop?: boolean;
  onPlayPause?: () => void;
  onSpeedChange?: (speed: number) => void;

  // Selection
  selectedEventId?: string | null;
  onEventSelect?: (event: TimelineEvent<T> | null) => void;
  onEventHover?: (event: TimelineEvent<T> | null) => void;
  onEventDoubleClick?: (event: TimelineEvent<T>) => void;

  // Lane control
  collapsedLanes?: string[];
  onLaneToggle?: (laneId: string, collapsed: boolean) => void;

  // Customization
  renderEvent?: (event: TimelineEvent<T>, lane: TimelineLane) => React.ReactNode;
  renderLaneHeader?: (lane: TimelineLane) => React.ReactNode;
  renderTooltip?: (event: TimelineEvent<T>) => React.ReactNode;
  renderEmptyState?: () => React.ReactNode;

  // Filtering
  severityFilter?: ExtendedSeverity[];
  typeFilter?: string[];

  // Legend
  showLegend?: boolean;
  legendItems?: LegendItemConfig[];

  // Display options
  showPlaybackControls?: boolean;
  showZoomControls?: boolean;

  // Styling
  className?: string;
  style?: React.CSSProperties;
  height?: number;
  theme?: 'light' | 'dark' | 'auto';
}

/** Legend item configuration */
export interface LegendItemConfig {
  color: string;
  label: string;
  type?: string;
  severity?: ExtendedSeverity;
}

/** Default severity colors for generic events */
export const DEFAULT_SEVERITY_COLORS: Record<ExtendedSeverity, string> = {
  critical: '#ef4444',  // red-500
  warning: '#f97316',   // orange-500
  info: '#3b82f6',      // blue-500
  high: '#dc2626',      // red-600
  medium: '#eab308',    // yellow-500
  low: '#22c55e',       // green-500
  success: '#10b981',   // emerald-500
  error: '#ef4444',     // red-500
};

/** Dark theme CSS variables */
const DARK_THEME_VARS: Record<string, string> = {
  '--timeline-border': '#3f3f5a',
  '--timeline-legend-bg': '#252538',
  '--timeline-text-primary': '#e5e7eb',
  '--timeline-text-secondary': '#9ca3af',
};

/** Light theme CSS variables */
const LIGHT_THEME_VARS: Record<string, string> = {
  '--timeline-border': '#e5e7eb',
  '--timeline-legend-bg': '#fafafa',
  '--timeline-text-primary': '#374151',
  '--timeline-text-secondary': '#6b7280',
};

/** Generate lane groups from lanes configuration */
function buildLaneGroups(lanes: TimelineLane[]): LaneGroup[] {
  const groups: LaneGroup[] = [];
  const groupedLanes = new Map<string, TimelineLane[]>();
  const standaloneGroups: LaneGroup[] = [];

  // Group lanes by robotId or create standalone groups
  for (const lane of lanes) {
    if (lane.robotId) {
      const existing = groupedLanes.get(lane.robotId) || [];
      existing.push(lane);
      groupedLanes.set(lane.robotId, existing);
    } else {
      // Each non-robot lane gets its own group
      standaloneGroups.push({
        id: `group-${lane.id}`,
        label: lane.label,
        lanes: [lane],
        color: lane.color,
        icon: lane.icon,
      });
    }
  }

  // Create groups for robots
  for (const [robotId, robotLanes] of groupedLanes) {
    const mainLane = robotLanes.find((l) => l.type === 'robot');
    groups.push({
      id: `group-${robotId}`,
      label: mainLane?.label || robotId,
      lanes: robotLanes,
      color: mainLane?.color,
      icon: mainLane?.icon,
    });
  }

  // Add standalone groups
  groups.push(...standaloneGroups);

  return groups;
}

/** Filter events by severity and type */
function filterEvents<T>(
  events: TimelineEvent<T>[],
  severityFilter?: ExtendedSeverity[],
  typeFilter?: string[]
): TimelineEvent<T>[] {
  return events.filter((event) => {
    if (severityFilter && severityFilter.length > 0) {
      if (!event.severity || !severityFilter.includes(event.severity as ExtendedSeverity)) {
        return false;
      }
    }
    if (typeFilter && typeFilter.length > 0) {
      if (!typeFilter.includes(event.type)) {
        return false;
      }
    }
    return true;
  });
}

const DEFAULT_HEIGHT = 300;

export function GenericTimeline<T = unknown>({
  events,
  lanes,
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
  showLegend = false,
  legendItems,
  showPlaybackControls = true,
  showZoomControls = true,
  className = '',
  style,
  height = DEFAULT_HEIGHT,
  theme = 'auto',
}: GenericTimelineProps<T>) {
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

  // Build lane groups
  const laneGroups = useMemo(() => buildLaneGroups(lanes), [lanes]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return filterEvents(events, severityFilter, typeFilter);
  }, [events, severityFilter, typeFilter]);

  // Handle event selection
  const handleEventSelect = useCallback(
    (event: TimelineEvent<T> | null) => {
      if (controlledSelectedEventId === undefined) {
        setInternalSelectedEventId(event?.id || null);
      }
      onEventSelect?.(event);
    },
    [controlledSelectedEventId, onEventSelect]
  );

  // Handle event hover
  const handleEventHover = useCallback(
    (event: TimelineEvent<T> | null) => {
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

      const isCurrentlyCollapsed = collapsedLanesSet.has(groupId);
      onLaneToggle?.(groupId, !isCurrentlyCollapsed);
    },
    [controlledCollapsedLanes, collapsedLanesSet, onLaneToggle]
  );

  // Handle event double click
  const handleEventDoubleClick = useCallback(
    (event: TimelineEvent<T>) => {
      containerRef.current?.scrollToTime(event.timestamp);
      onTimeChange?.(event.timestamp);
      onEventDoubleClick?.(event);
    },
    [onTimeChange, onEventDoubleClick]
  );

  // Empty state
  if (events.length === 0 && renderEmptyState) {
    return (
      <div className={`generic-timeline generic-timeline--empty ${className}`} style={style}>
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
    <div className={`generic-timeline ${className}`} style={containerStyle}>
      {/* Legend */}
      {showLegend && legendItems && legendItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '8px 12px',
            borderBottom: '1px solid var(--timeline-border)',
            backgroundColor: 'var(--timeline-legend-bg)',
            fontSize: 11,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--timeline-text-secondary)' }}>
            Legend:
          </span>
          {legendItems.map((item, idx) => (
            <LegendItem key={idx} color={item.color} label={item.label} />
          ))}
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
        height={height - (showLegend && legendItems ? 36 : 0)}
        theme={effectiveTheme}
      >
        {laneGroups.map((group) => (
          <LaneGroupComponent
            key={group.id}
            group={group}
            events={filteredEvents}
            timeRange={timeRange}
            zoom={{ scale: 0.1, minScale: 0.001, maxScale: 1 }}
            collapsed={collapsedLanesSet.has(group.id)}
            onToggleCollapse={handleLaneToggle}
            selectedEventId={selectedEventId}
            hoveredEventId={hoveredEventId}
            onEventSelect={(e) => handleEventSelect(e as TimelineEvent<T>)}
            onEventHover={(e) => handleEventHover(e as TimelineEvent<T> | null)}
            renderLaneHeader={renderLaneHeader}
            renderEvent={renderEvent as any}
          />
        ))}
      </TimelineContainer>
    </div>
  );
}

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

GenericTimeline.displayName = 'GenericTimeline';

export default GenericTimeline;
