/**
 * TimeRuler Component
 *
 * Renders the time scale/ruler at the top of the timeline.
 * Shows major and minor tick marks with time labels.
 */

import React, { useMemo } from 'react';
import type { TimeRulerProps, TimeRange, ZoomConfig } from './types';

/** Format time in ms to human-readable string */
function formatTime(ms: number, showMilliseconds: boolean): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);

  if (showMilliseconds) {
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    return `${seconds}.${milliseconds.toString().padStart(3, '0')}s`;
  }

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/** Calculate appropriate tick intervals based on zoom level */
function calculateTickIntervals(
  visibleRange: TimeRange,
  zoom: ZoomConfig,
  containerWidth: number
): { major: number; minor: number } {
  const visibleDuration = visibleRange.end - visibleRange.start;
  const pixelsPerSecond = zoom.scale * 1000;

  // Target: roughly 80-150 pixels between major ticks
  const targetMajorPixels = 100;
  const targetMajorInterval = targetMajorPixels / zoom.scale;

  // Snap to nice intervals
  const niceIntervals = [
    10,      // 10ms
    20,      // 20ms
    50,      // 50ms
    100,     // 100ms
    200,     // 200ms
    500,     // 500ms
    1000,    // 1s
    2000,    // 2s
    5000,    // 5s
    10000,   // 10s
    30000,   // 30s
    60000,   // 1min
    120000,  // 2min
    300000,  // 5min
    600000,  // 10min
  ];

  let majorInterval = niceIntervals[0];
  for (const interval of niceIntervals) {
    if (interval >= targetMajorInterval) {
      majorInterval = interval;
      break;
    }
    majorInterval = interval;
  }

  // Minor interval is typically 1/5 of major
  const minorInterval = majorInterval / 5;

  return { major: majorInterval, minor: minorInterval };
}

/** Generate tick positions */
function generateTicks(
  visibleRange: TimeRange,
  timeRange: TimeRange,
  intervals: { major: number; minor: number }
): { time: number; isMajor: boolean }[] {
  const ticks: { time: number; isMajor: boolean }[] = [];

  // Start from a clean multiple of the interval
  const startMajor = Math.floor(visibleRange.start / intervals.major) * intervals.major;
  const startMinor = Math.floor(visibleRange.start / intervals.minor) * intervals.minor;

  // Generate minor ticks
  for (let t = startMinor; t <= visibleRange.end; t += intervals.minor) {
    if (t >= visibleRange.start && t >= timeRange.start && t <= timeRange.end) {
      const isMajor = Math.abs(t % intervals.major) < 0.001;
      ticks.push({ time: t, isMajor });
    }
  }

  return ticks;
}

const DEFAULT_HEIGHT = 28;

export const TimeRuler: React.FC<TimeRulerProps> = ({
  timeRange,
  visibleRange,
  zoom,
  height = DEFAULT_HEIGHT,
  showMilliseconds = false,
  tickColor = '#6b7280',
  labelColor = '#374151',
  className = '',
}) => {
  // Calculate tick intervals
  const intervals = useMemo(() => {
    return calculateTickIntervals(visibleRange, zoom, 1000); // Approximate width
  }, [visibleRange, zoom]);

  // Generate ticks
  const ticks = useMemo(() => {
    return generateTicks(visibleRange, timeRange, intervals);
  }, [visibleRange, timeRange, intervals]);

  // Decide whether to show milliseconds based on zoom level
  const shouldShowMs = showMilliseconds || intervals.major < 1000;

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    height,
    backgroundColor: 'var(--timeline-ruler-bg, #f9fafb)',
    borderBottom: '1px solid var(--timeline-border, #e5e7eb)',
    overflow: 'hidden',
    userSelect: 'none',
  };

  return (
    <div className={`timeline-ruler ${className}`} style={containerStyle}>
      {ticks.map(({ time, isMajor }) => {
        const x = (time - timeRange.start) * zoom.scale;

        return (
          <div
            key={time}
            style={{
              position: 'absolute',
              left: x,
              top: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {/* Tick line */}
            <div
              style={{
                width: 1,
                height: isMajor ? 12 : 6,
                backgroundColor: tickColor,
                opacity: isMajor ? 1 : 0.5,
              }}
            />

            {/* Label (only for major ticks) */}
            {isMajor && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 4,
                  fontSize: 10,
                  fontFamily: 'var(--font-mono, monospace)',
                  color: labelColor,
                  whiteSpace: 'nowrap',
                }}
              >
                {formatTime(time, shouldShowMs)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

TimeRuler.displayName = 'TimeRuler';

export default TimeRuler;
