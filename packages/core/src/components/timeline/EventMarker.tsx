/**
 * EventMarker Component
 *
 * Renders a single event on the timeline.
 * Supports different visual styles based on event type and severity.
 */

import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { EventMarkerProps, TimelineEvent, EventSeverity, TimelineCollisionEvent } from './types';
import { DEFAULT_EVENT_COLORS } from './types';

/** Get color for an event based on type and severity */
function getEventColor(event: TimelineEvent): string {
  const collisionEvent = event as TimelineCollisionEvent;

  if (collisionEvent.type && collisionEvent.severity) {
    const severity = collisionEvent.severity as EventSeverity;
    switch (collisionEvent.type) {
      case 'collision':
        return DEFAULT_EVENT_COLORS.collision[severity] || DEFAULT_EVENT_COLORS.default;
      case 'near-miss':
        return DEFAULT_EVENT_COLORS.nearMiss[severity] || DEFAULT_EVENT_COLORS.default;
      case 'zone-enter':
        return DEFAULT_EVENT_COLORS.zoneEnter;
      case 'zone-exit':
        return DEFAULT_EVENT_COLORS.zoneExit;
    }
  }

  // Default based on severity only
  if (event.severity) {
    const severity = event.severity as EventSeverity;
    return DEFAULT_EVENT_COLORS.collision[severity] || DEFAULT_EVENT_COLORS.default;
  }

  return DEFAULT_EVENT_COLORS.default;
}

/** Get icon for collision event type */
function getEventIcon(event: TimelineEvent): React.ReactNode {
  const collisionEvent = event as TimelineCollisionEvent;

  switch (collisionEvent.type) {
    case 'collision':
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <circle cx="5" cy="5" r="4" />
        </svg>
      );
    case 'near-miss':
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <polygon points="5,1 9,9 1,9" />
        </svg>
      );
    case 'zone-enter':
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <rect x="1" y="1" width="8" height="8" rx="1" />
        </svg>
      );
    case 'zone-exit':
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
        </svg>
      );
    default:
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <circle cx="5" cy="5" r="3" />
        </svg>
      );
  }
}

const DEFAULT_WIDTH = 8;
const MIN_RANGE_WIDTH = 4;

export const EventMarker: React.FC<EventMarkerProps> = ({
  event,
  position,
  width,
  selected = false,
  hovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDoubleClick,
  color,
  icon,
  tooltip,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const markerRef = useRef<HTMLDivElement>(null);

  const eventColor = color || getEventColor(event);
  const eventIcon = icon || getEventIcon(event);

  // Update tooltip position when showing - use layout effect for synchronous update
  useLayoutEffect(() => {
    if (showTooltip && markerRef.current) {
      const rect = markerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  }, [showTooltip]);

  // Determine if this is a point event or range event
  const isRangeEvent = event.duration && event.duration > 0;
  const markerWidth = width || (isRangeEvent ? Math.max(MIN_RANGE_WIDTH, width || 0) : DEFAULT_WIDTH);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
    onMouseEnter?.(event);
  }, [event, onMouseEnter]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    onMouseLeave?.();
  }, [onMouseLeave]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(event);
    },
    [event, onClick]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(event);
    },
    [event, onDoubleClick]
  );

  const markerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    zIndex: selected ? 10 : hovered ? 5 : 1,
  };

  // Point event style
  const pointStyle: React.CSSProperties = {
    ...markerStyle,
    width: markerWidth,
    height: markerWidth,
    borderRadius: '50%',
    backgroundColor: eventColor,
    border: `2px solid ${selected ? '#1d4ed8' : hovered ? '#3b82f6' : 'transparent'}`,
    color: 'white',
    boxShadow: selected || hovered
      ? `0 0 0 3px ${eventColor}33, 0 2px 8px rgba(0,0,0,0.2)`
      : '0 1px 3px rgba(0,0,0,0.2)',
    transform: selected || hovered
      ? 'translate(-50%, -50%) scale(1.2)'
      : 'translate(-50%, -50%)',
  };

  // Range event style
  const rangeStyle: React.CSSProperties = {
    ...markerStyle,
    width: markerWidth,
    height: 16,
    borderRadius: 3,
    backgroundColor: `${eventColor}cc`,
    border: `1px solid ${selected ? '#1d4ed8' : hovered ? eventColor : 'transparent'}`,
    transform: 'translateY(-50%)',
    left: position,
    boxShadow: selected || hovered
      ? `0 0 0 2px ${eventColor}33`
      : 'none',
  };

  // Tooltip element to be rendered via portal
  const tooltipElement = (
    <div
      style={{
        position: 'fixed',
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        transform: 'translate(-50%, -100%)',
        marginTop: -8,
        padding: '6px 10px',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: 'white',
        borderRadius: 4,
        fontSize: 12,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 10000,
        maxWidth: 280,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      {tooltip || <DefaultTooltip event={event} />}
      {/* Arrow */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgba(0, 0, 0, 0.95)',
        }}
      />
    </div>
  );

  return (
    <>
      <div
        ref={markerRef}
        className={`timeline-event-marker ${className} ${selected ? 'selected' : ''} ${hovered ? 'hovered' : ''}`}
        style={isRangeEvent ? rangeStyle : pointStyle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        aria-label={event.label || `Event at ${event.timestamp}ms`}
      >
        {/* Icon for point events */}
        {!isRangeEvent && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {eventIcon}
          </div>
        )}
      </div>

      {/* Tooltip - rendered via Portal to escape overflow:hidden containers */}
      {showTooltip && typeof document !== 'undefined' && createPortal(tooltipElement, document.body)}
    </>
  );
};

/** Default tooltip content for collision events */
const DefaultTooltip: React.FC<{ event: TimelineEvent }> = ({ event }) => {
  const collisionEvent = event as TimelineCollisionEvent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Type and severity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: getEventColor(event),
          }}
        />
        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
          {collisionEvent.type?.replace('-', ' ') || 'Event'}
        </span>
        {collisionEvent.severity && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 4px',
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.2)',
              textTransform: 'uppercase',
            }}
          >
            {collisionEvent.severity}
          </span>
        )}
      </div>

      {/* Time */}
      <div style={{ fontSize: 11, opacity: 0.8 }}>
        {formatTimeForTooltip(event.timestamp)}
        {event.duration ? ` (${event.duration}ms)` : ''}
      </div>

      {/* Source and target */}
      {collisionEvent.source && (
        <div style={{ fontSize: 11 }}>
          <span style={{ opacity: 0.7 }}>Source: </span>
          <span>{collisionEvent.source.robotId} / {collisionEvent.source.linkName}</span>
        </div>
      )}

      {collisionEvent.target && (
        <div style={{ fontSize: 11 }}>
          <span style={{ opacity: 0.7 }}>Target: </span>
          <span>
            {collisionEvent.target.type === 'obstacle' && collisionEvent.target.obstacleName}
            {collisionEvent.target.type === 'robot' && `${collisionEvent.target.robotId} / ${collisionEvent.target.linkName}`}
            {collisionEvent.target.type === 'safety-zone' && collisionEvent.target.zoneName}
            {collisionEvent.target.type === 'self' && `Self (${collisionEvent.target.linkName})`}
          </span>
        </div>
      )}

      {/* Distance */}
      {collisionEvent.details?.distance !== undefined && (
        <div style={{ fontSize: 11 }}>
          <span style={{ opacity: 0.7 }}>Distance: </span>
          <span>{collisionEvent.details.distance.toFixed(1)} mm</span>
        </div>
      )}

      {/* Message */}
      {collisionEvent.message && (
        <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>
          {collisionEvent.message}
        </div>
      )}
    </div>
  );
};

function formatTimeForTooltip(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3);

  if (minutes > 0) {
    return `${minutes}m ${parseFloat(seconds).toFixed(3)}s`;
  }
  return `${seconds}s`;
}

EventMarker.displayName = 'EventMarker';

export default EventMarker;
