/**
 * Lane Component
 *
 * A single lane/row in the timeline that displays events for a specific entity
 * (robot, joint, safety zone, etc.)
 */

import React, { useMemo } from 'react';
import type { LaneProps, TimelineEvent, TimelineLane, ZoomConfig, TimeRange } from './types';
import { EventMarker } from './EventMarker';
import { DEFAULT_LANE_HEIGHTS } from './types';

/** Filter events that belong to this lane */
function filterEventsForLane(events: TimelineEvent[], lane: TimelineLane): TimelineEvent[] {
  return events.filter((event) => {
    // Priority 1: Match by laneId (for generic/custom events)
    if (event.laneId !== undefined) {
      return event.laneId === lane.id;
    }

    // Priority 2: Match by robot ID (for collision-specific events)
    if (lane.robotId) {
      const source = (event as any).source;
      if (!source || source.robotId !== lane.robotId) return false;

      // If lane is for a specific joint, filter by joint index
      if (lane.type === 'joint' && lane.jointIndex !== undefined) {
        return source.jointIndex === lane.jointIndex;
      }

      // If lane is for TCP
      if (lane.type === 'tcp') {
        return source.linkName === 'tcp' || source.linkName?.includes('tool') || source.linkName?.includes('end');
      }

      // Robot overview lane shows all events for the robot
      if (lane.type === 'robot') {
        return true;
      }
    }

    // Priority 3: Match by zone ID
    if (lane.zoneId) {
      const target = (event as any).target;
      return target?.type === 'safety-zone' && target.zoneId === lane.zoneId;
    }

    // For custom lanes without specific matching, only show if event has no laneId
    // (otherwise it would have matched in Priority 1)
    if (lane.type === 'custom') {
      return false; // Custom lanes require explicit laneId matching
    }

    return true;
  });
}

/** Calculate event position and width in pixels */
function calculateEventLayout(
  event: TimelineEvent,
  timeRange: TimeRange,
  zoom: ZoomConfig
): { position: number; width: number } {
  const position = (event.timestamp - timeRange.start) * zoom.scale;
  const width = event.duration ? event.duration * zoom.scale : 0;
  return { position, width };
}

export const Lane: React.FC<LaneProps> = ({
  lane,
  events,
  timeRange,
  zoom,
  selectedEventId,
  hoveredEventId,
  onEventSelect,
  onEventHover,
  renderEvent,
  className = '',
}) => {
  // Filter events for this lane
  const laneEvents = useMemo(() => filterEventsForLane(events, lane), [events, lane]);

  // Get lane height
  const height = lane.height || DEFAULT_LANE_HEIGHTS[lane.type] || DEFAULT_LANE_HEIGHTS.custom;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    height,
    backgroundColor: 'var(--timeline-lane-bg, transparent)',
    borderBottom: '1px solid var(--timeline-lane-border, #e5e7eb)',
  };

  // Background color based on lane type
  const getBgColor = (): string => {
    switch (lane.type) {
      case 'robot':
        return 'rgba(59, 130, 246, 0.05)'; // blue tint
      case 'joint':
        return 'transparent';
      case 'tcp':
        return 'rgba(34, 197, 94, 0.05)'; // green tint
      case 'safety-zone':
        return 'rgba(249, 115, 22, 0.05)'; // orange tint
      default:
        return 'transparent';
    }
  };

  return (
    <div
      className={`timeline-lane timeline-lane--${lane.type} ${className}`}
      style={{
        ...containerStyle,
        backgroundColor: lane.color ? `${lane.color}0a` : getBgColor(),
      }}
      data-lane-id={lane.id}
    >
      {/* Event markers */}
      {laneEvents.map((event) => {
        const { position, width } = calculateEventLayout(event, timeRange, zoom);

        // Custom render
        if (renderEvent) {
          return (
            <div
              key={event.id}
              style={{
                position: 'absolute',
                left: position,
                top: 0,
                height: '100%',
              }}
            >
              {renderEvent(event, lane)}
            </div>
          );
        }

        // Default event marker
        return (
          <EventMarker
            key={event.id}
            event={event}
            position={position}
            width={width || undefined}
            selected={selectedEventId === event.id}
            hovered={hoveredEventId === event.id}
            onClick={onEventSelect}
            onMouseEnter={onEventHover}
            onMouseLeave={() => onEventHover?.(null)}
          />
        );
      })}
    </div>
  );
};

Lane.displayName = 'Lane';

export default Lane;
