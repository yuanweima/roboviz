/**
 * LaneGroup Component
 *
 * A collapsible group of lanes, typically representing a robot and its joints.
 * Shows a header with collapse toggle and optional summary.
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { LaneGroupProps, TimelineEvent, TimelineLane, TimelineCollisionEvent } from './types';
import { Lane } from './Lane';
import { DEFAULT_LANE_HEIGHTS } from './types';

/** Icons */
const ChevronDown: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <path d="M4.427 5.427a.75.75 0 011.06-.073L8 7.638l2.513-2.284a.75.75 0 11.974 1.292l-3 2.727a.75.75 0 01-.974 0l-3-2.727a.75.75 0 01-.086-1.019z" />
  </svg>
);

const ChevronRight: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
    <path d="M5.427 4.427a.75.75 0 01.073 1.06L3.638 8l2.284 2.513a.75.75 0 11-1.292.974l-2.727-3a.75.75 0 010-.974l2.727-3a.75.75 0 011.019-.086z" transform="rotate(180 8 8)" />
  </svg>
);

const RobotIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="8.5" cy="16" r="1.5" />
    <circle cx="15.5" cy="16" r="1.5" />
    <path d="M12 2v4" />
    <circle cx="12" cy="7" r="2" />
  </svg>
);

/** Count events by severity */
function countEventsBySeverity(events: TimelineEvent[]): { critical: number; warning: number; info: number } {
  return events.reduce(
    (acc, event) => {
      const severity = (event as TimelineCollisionEvent).severity;
      if (severity === 'critical') acc.critical++;
      else if (severity === 'warning') acc.warning++;
      else acc.info++;
      return acc;
    },
    { critical: 0, warning: 0, info: 0 }
  );
}

/** Get events that belong to any lane in the group */
function getGroupEvents(events: TimelineEvent[], group: { lanes: TimelineLane[] }): TimelineEvent[] {
  const robotIds = new Set(group.lanes.map((lane) => lane.robotId).filter(Boolean));
  const zoneIds = new Set(group.lanes.map((lane) => lane.zoneId).filter(Boolean));

  return events.filter((event) => {
    const source = (event as any).source;
    if (source?.robotId && robotIds.has(source.robotId)) return true;

    const target = (event as any).target;
    if (target?.zoneId && zoneIds.has(target.zoneId)) return true;

    return false;
  });
}

const HEADER_HEIGHT = 28;

export const LaneGroup: React.FC<LaneGroupProps> = ({
  group,
  events,
  timeRange,
  zoom,
  collapsed = false,
  onToggleCollapse,
  selectedEventId,
  hoveredEventId,
  onEventSelect,
  onEventHover,
  renderLaneHeader,
  renderEvent,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Get events for this group
  const groupEvents = useMemo(() => getGroupEvents(events, group), [events, group]);

  // Count events by severity
  const eventCounts = useMemo(() => countEventsBySeverity(groupEvents), [groupEvents]);

  const handleToggle = useCallback(() => {
    onToggleCollapse?.(group.id);
  }, [group.id, onToggleCollapse]);

  // Calculate total height
  const contentHeight = useMemo(() => {
    if (collapsed) return 0;
    return group.lanes.reduce((sum, lane) => {
      return sum + (lane.height || DEFAULT_LANE_HEIGHTS[lane.type] || DEFAULT_LANE_HEIGHTS.custom);
    }, 0);
  }, [collapsed, group.lanes]);

  const Icon = group.icon || RobotIcon;

  return (
    <div
      className={`timeline-lane-group ${className} ${collapsed ? 'collapsed' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Group Header */}
      <div
        className="timeline-lane-group__header"
        style={{
          height: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px',
          backgroundColor: isHovered ? 'var(--timeline-group-header-hover, #f3f4f6)' : 'var(--timeline-group-header-bg, #f9fafb)',
          borderBottom: '1px solid var(--timeline-border, #e5e7eb)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-controls={`lane-group-content-${group.id}`}
      >
        {/* Collapse toggle */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--timeline-text-secondary, #6b7280)',
            transition: 'transform 0.2s ease',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(0deg)',
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </span>

        {/* Icon */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            color: group.color || 'var(--timeline-text-primary, #374151)',
          }}
        >
          <Icon size={14} />
        </span>

        {/* Label */}
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--timeline-text-primary, #374151)',
          }}
        >
          {group.label}
        </span>

        {/* Event count badges */}
        <div style={{ display: 'flex', gap: 4 }}>
          {eventCounts.critical > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 18,
                height: 16,
                padding: '0 4px',
                fontSize: 10,
                fontWeight: 600,
                backgroundColor: '#ef4444',
                color: 'white',
                borderRadius: 8,
              }}
            >
              {eventCounts.critical}
            </span>
          )}
          {eventCounts.warning > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 18,
                height: 16,
                padding: '0 4px',
                fontSize: 10,
                fontWeight: 600,
                backgroundColor: '#f97316',
                color: 'white',
                borderRadius: 8,
              }}
            >
              {eventCounts.warning}
            </span>
          )}
        </div>

        {/* Lane count */}
        <span
          style={{
            fontSize: 10,
            color: 'var(--timeline-text-secondary, #9ca3af)',
          }}
        >
          {group.lanes.length} lanes
        </span>
      </div>

      {/* Lanes Content */}
      <div
        id={`lane-group-content-${group.id}`}
        style={{
          height: contentHeight,
          overflow: 'hidden',
          transition: 'height 0.2s ease',
        }}
      >
        {!collapsed &&
          group.lanes.map((lane) => (
            <div
              key={lane.id}
              style={{ display: 'flex' }}
            >
              {/* Lane label */}
              <div
                style={{
                  width: 80,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 24,
                  fontSize: 11,
                  color: 'var(--timeline-text-secondary, #6b7280)',
                  backgroundColor: 'var(--timeline-lane-label-bg, #fafafa)',
                  borderRight: '1px solid var(--timeline-border, #e5e7eb)',
                  borderBottom: '1px solid var(--timeline-border, #e5e7eb)',
                }}
              >
                {renderLaneHeader ? renderLaneHeader(lane) : lane.label}
              </div>

              {/* Lane content */}
              <div style={{ flex: 1, position: 'relative' }}>
                <Lane
                  lane={lane}
                  events={events}
                  timeRange={timeRange}
                  zoom={zoom}
                  selectedEventId={selectedEventId}
                  hoveredEventId={hoveredEventId}
                  onEventSelect={onEventSelect}
                  onEventHover={onEventHover}
                  renderEvent={renderEvent}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

LaneGroup.displayName = 'LaneGroup';

export default LaneGroup;
