/**
 * TimelineContainer Component
 *
 * The main container for the timeline that handles:
 * - Zoom and pan
 * - Playhead positioning
 * - Time ruler
 * - Scroll synchronization
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import type { TimelineContainerProps, TimeRange, ZoomConfig } from './types';
import { TimeRuler } from './TimeRuler';
import { Playhead } from './Playhead';
import { useTimelineZoom } from './hooks/useTimelineZoom';
import { useTimelineKeyboard } from './hooks/useTimelineKeyboard';

const DEFAULT_HEIGHT = 300;
const RULER_HEIGHT = 28;
const LABEL_WIDTH = 80;

/** Dark theme CSS variables */
const DARK_THEME_VARS: Record<string, string> = {
  '--timeline-bg': '#1e1e2e',
  '--timeline-border': '#3f3f5a',
  '--timeline-header-bg': '#252538',
  '--timeline-footer-bg': '#252538',
  '--timeline-label-bg': '#1a1a28',
  '--timeline-legend-bg': '#252538',
  '--timeline-group-header-bg': '#252538',
  '--timeline-group-header-hover': '#2d2d44',
  '--timeline-lane-label-bg': '#1a1a28',
  '--timeline-lane-bg': '#1e1e2e',
  '--timeline-lane-alt-bg': '#222234',
  '--timeline-text-primary': '#e5e7eb',
  '--timeline-text-secondary': '#9ca3af',
  '--timeline-ruler-text': '#9ca3af',
  '--timeline-ruler-line': '#4b5563',
  '--timeline-playhead': '#3b82f6',
  '--timeline-button-bg': '#2d2d44',
  '--timeline-button-border': '#4b5563',
  '--timeline-button-text': '#e5e7eb',
  '--timeline-select-bg': '#2d2d44',
};

/** Light theme CSS variables (defaults) */
const LIGHT_THEME_VARS: Record<string, string> = {
  '--timeline-bg': '#ffffff',
  '--timeline-border': '#e5e7eb',
  '--timeline-header-bg': '#f9fafb',
  '--timeline-footer-bg': '#f9fafb',
  '--timeline-label-bg': '#fafafa',
  '--timeline-legend-bg': '#fafafa',
  '--timeline-group-header-bg': '#f9fafb',
  '--timeline-group-header-hover': '#f3f4f6',
  '--timeline-lane-label-bg': '#fafafa',
  '--timeline-lane-bg': '#ffffff',
  '--timeline-lane-alt-bg': '#f9fafb',
  '--timeline-text-primary': '#374151',
  '--timeline-text-secondary': '#6b7280',
  '--timeline-ruler-text': '#6b7280',
  '--timeline-ruler-line': '#d1d5db',
  '--timeline-playhead': '#3b82f6',
  '--timeline-button-bg': '#ffffff',
  '--timeline-button-border': '#d1d5db',
  '--timeline-button-text': '#374151',
  '--timeline-select-bg': '#ffffff',
};

export interface TimelineContainerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  scrollToTime: (time: number) => void;
}

export const TimelineContainer = React.forwardRef<TimelineContainerHandle, TimelineContainerProps>(
  (
    {
      timeRange,
      currentTime,
      onTimeChange,
      isPlaying = false,
      playbackSpeed = 1,
      onPlayPause,
      onSpeedChange,
      initialZoom = 0.1,
      minZoom = 0.001,
      maxZoom = 1,
      onViewChange,
      children,
      className = '',
      style,
      height = DEFAULT_HEIGHT,
      theme = 'auto',
    },
    ref
  ) => {
    // Determine actual theme (auto defaults to dark for better visibility)
    const effectiveTheme = theme === 'auto' ? 'dark' : theme;
    const themeVars = effectiveTheme === 'dark' ? DARK_THEME_VARS : LIGHT_THEME_VARS;

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    // Zoom and pan
    const {
      zoom,
      visibleRange,
      scrollX,
      totalWidth,
      zoomIn,
      zoomOut,
      zoomToFit,
      scrollToTime,
      setScrollX,
      handleWheel,
      pixelToTime,
      timeToPixel,
    } = useTimelineZoom({
      timeRange,
      initialScale: initialZoom,
      minScale: minZoom,
      maxScale: maxZoom,
      onViewChange,
    });

    // Keyboard shortcuts
    useTimelineKeyboard({
      enabled: true,
      timeRange,
      currentTime,
      isPlaying,
      playbackSpeed,
      onTimeChange,
      onPlayPause,
      onSpeedChange,
      onZoomIn: zoomIn,
      onZoomOut: zoomOut,
      onZoomToFit: () => zoomToFit(containerWidth),
    });

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      zoomIn,
      zoomOut,
      zoomToFit: () => zoomToFit(containerWidth),
      scrollToTime: (time: number) => scrollToTime(time, containerWidth),
    }));

    // Observe container width
    useEffect(() => {
      if (!containerRef.current) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width - LABEL_WIDTH);
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }, []);

    // Handle wheel events
    const handleWheelEvent = useCallback(
      (e: WheelEvent) => {
        handleWheel(e, containerWidth);
      },
      [handleWheel, containerWidth]
    );

    // Attach wheel listener
    useEffect(() => {
      const content = contentRef.current;
      if (!content) return;

      content.addEventListener('wheel', handleWheelEvent, { passive: false });
      return () => content.removeEventListener('wheel', handleWheelEvent);
    }, [handleWheelEvent]);

    // Handle click to seek
    const handleContentClick = useCallback(
      (e: React.MouseEvent) => {
        if (!contentRef.current) return;
        const rect = contentRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollX;
        const time = pixelToTime(x - scrollX);
        onTimeChange?.(Math.max(timeRange.start, Math.min(timeRange.end, time)));
      },
      [scrollX, pixelToTime, onTimeChange, timeRange]
    );

    // Handle playhead drag
    const handlePlayheadDrag = useCallback(
      (pixelX: number) => {
        const time = pixelToTime(pixelX);
        onTimeChange?.(Math.max(timeRange.start, Math.min(timeRange.end, time)));
      },
      [pixelToTime, onTimeChange, timeRange]
    );

    // Playhead position
    const playheadPosition = timeToPixel(currentTime);

    const containerStyle: React.CSSProperties = {
      position: 'relative',
      width: '100%',
      height,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--timeline-bg)',
      border: '1px solid var(--timeline-border)',
      borderRadius: 8,
      overflow: 'hidden',
      ...themeVars,
      ...style,
    };

    return (
      <div ref={containerRef} className={`timeline-container ${className}`} style={containerStyle}>
        {/* Header with ruler */}
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {/* Label column header */}
          <div
            style={{
              width: LABEL_WIDTH,
              height: RULER_HEIGHT,
              flexShrink: 0,
              backgroundColor: 'var(--timeline-header-bg, #f9fafb)',
              borderRight: '1px solid var(--timeline-border, #e5e7eb)',
              borderBottom: '1px solid var(--timeline-border, #e5e7eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Zoom controls */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => zoomOut()}
                style={{
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--timeline-button-border)',
                  borderRadius: 4,
                  backgroundColor: 'var(--timeline-button-bg)',
                  color: 'var(--timeline-button-text)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
                title="Zoom out (Cmd -)"
              >
                −
              </button>
              <button
                onClick={() => zoomToFit(containerWidth)}
                style={{
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--timeline-button-border)',
                  borderRadius: 4,
                  backgroundColor: 'var(--timeline-button-bg)',
                  color: 'var(--timeline-button-text)',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
                title="Zoom to fit (Cmd 0)"
              >
                ⊡
              </button>
              <button
                onClick={() => zoomIn()}
                style={{
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--timeline-button-border)',
                  borderRadius: 4,
                  backgroundColor: 'var(--timeline-button-bg)',
                  color: 'var(--timeline-button-text)',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
                title="Zoom in (Cmd +)"
              >
                +
              </button>
            </div>
          </div>

          {/* Time ruler */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: -scrollX,
                width: totalWidth,
                height: RULER_HEIGHT,
              }}
            >
              <TimeRuler
                timeRange={timeRange}
                visibleRange={visibleRange}
                zoom={zoom}
                height={RULER_HEIGHT}
              />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'crosshair',
          }}
          onClick={handleContentClick}
        >
          {/* Scrolling content wrapper */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: -scrollX,
              width: totalWidth + LABEL_WIDTH,
              height: '100%',
              display: 'flex',
            }}
          >
            {/* Labels column - fixed position */}
            <div
              style={{
                position: 'sticky',
                left: 0,
                width: LABEL_WIDTH,
                flexShrink: 0,
                backgroundColor: 'var(--timeline-label-bg, #fafafa)',
                borderRight: '1px solid var(--timeline-border, #e5e7eb)',
                zIndex: 10,
              }}
            />

            {/* Lanes content */}
            <div
              style={{
                flex: 1,
                position: 'relative',
              }}
            >
              {/* Provide context to children */}
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child as React.ReactElement<any>, {
                    timeRange,
                    zoom,
                    scrollX,
                  });
                }
                return child;
              })}

              {/* Playhead */}
              <Playhead
                time={currentTime}
                position={playheadPosition + scrollX}
                height={height - RULER_HEIGHT}
                onDrag={handlePlayheadDrag}
              />
            </div>
          </div>
        </div>

        {/* Playback controls bar */}
        <div
          style={{
            height: 32,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            borderTop: '1px solid var(--timeline-border)',
            backgroundColor: 'var(--timeline-footer-bg)',
          }}
        >
          {/* Play/Pause button */}
          <button
            onClick={onPlayPause}
            style={{
              width: 28,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--timeline-button-border)',
              borderRadius: 4,
              backgroundColor: 'var(--timeline-button-bg)',
              color: 'var(--timeline-button-text)',
              cursor: 'pointer',
            }}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="1" y="1" width="3" height="10" rx="0.5" />
                <rect x="8" y="1" width="3" height="10" rx="0.5" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 1.5a.5.5 0 01.77-.42l8 5a.5.5 0 010 .84l-8 5A.5.5 0 012 11.5v-10z" />
              </svg>
            )}
          </button>

          {/* Speed selector */}
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange?.(parseFloat(e.target.value))}
            style={{
              height: 24,
              padding: '0 6px',
              border: '1px solid var(--timeline-button-border)',
              borderRadius: 4,
              fontSize: 11,
              backgroundColor: 'var(--timeline-select-bg)',
              color: 'var(--timeline-button-text)',
            }}
            title="Playback speed"
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="4">4x</option>
            <option value="8">8x</option>
          </select>

          {/* Current time display */}
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--timeline-text-secondary)',
            }}
          >
            {formatTime(currentTime)} / {formatTime(timeRange.end)}
          </div>
        </div>
      </div>
    );
  }
);

/** Format time for display */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((ms % 1000) / 10);

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  }
  return `${seconds}.${millis.toString().padStart(2, '0')}s`;
}

TimelineContainer.displayName = 'TimelineContainer';

export default TimelineContainer;
