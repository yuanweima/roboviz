/**
 * TrajectoryTimeline Component
 *
 * Timeline scrubber for trajectory playback.
 * Allows users to scrub through the trajectory and see robot preview.
 */

import * as React from 'react';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import type { Trajectory } from '../types';
import { usePlaybackState } from '../store/trajectoryStore';

// ============================================================================
// Types
// ============================================================================

export interface TrajectoryTimelineProps {
  /** Trajectory to display timeline for */
  trajectory: Trajectory;

  /** Height of the timeline component */
  height?: number;

  /** Whether to show waypoint markers on the timeline */
  showMarkers?: boolean;

  /** Whether to show time labels */
  showTimeLabels?: boolean;

  /** Override theme */
  theme?: RoboVizTheme;

  /** Called when playback position changes */
  onPositionChange?: (position: number) => void;

  /** Called when play state changes */
  onPlayStateChange?: (playing: boolean) => void;
}

// ============================================================================
// Styles
// ============================================================================

function getContainerStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  };
}

function getControlsStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
  };
}

function getPlayButtonStyle(
  theme: RoboVizTheme,
  isPlaying: boolean
): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isPlaying ? theme.colors.primary : theme.backgrounds.surface,
    color: isPlaying ? theme.text.inverse : theme.text.primary,
    border: `1px solid ${isPlaying ? theme.colors.primary : theme.borders.default}`,
    borderRadius: theme.borderRadius.full,
    cursor: 'pointer',
    fontSize: 16,
    transition: `all ${theme.animation.duration.fast} ${theme.animation.easing.default}`,
  };
}

function getSliderContainerStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    flex: 1,
    position: 'relative',
    height: 24,
    display: 'flex',
    alignItems: 'center',
  };
}

function getSliderTrackStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: theme.backgrounds.surface,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  };
}

function getSliderFillStyle(
  theme: RoboVizTheme,
  position: number
): React.CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: `${position * 100}%`,
    backgroundColor: theme.colors.primary,
    transition: 'width 0.05s linear',
  };
}

function getSliderThumbStyle(
  theme: RoboVizTheme,
  position: number
): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${position * 100}%`,
    width: 14,
    height: 14,
    marginLeft: -7,
    backgroundColor: theme.colors.primary,
    border: `2px solid ${theme.text.inverse}`,
    borderRadius: theme.borderRadius.full,
    cursor: 'grab',
    boxShadow: theme.shadows.sm,
    zIndex: 1,
  };
}

function getMarkerStyle(
  theme: RoboVizTheme,
  position: number,
  hasIssue: boolean
): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${position * 100}%`,
    top: '50%',
    width: 4,
    height: 12,
    marginLeft: -2,
    marginTop: -6,
    backgroundColor: hasIssue ? theme.colors.error : theme.colors.success,
    borderRadius: 2,
    opacity: 0.6,
  };
}

function getTimeLabelStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamilyMono,
    color: theme.text.secondary,
    minWidth: 50,
    textAlign: 'center',
  };
}

function getSpeedControlStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily,
    color: theme.text.secondary,
  };
}

function getSpeedButtonStyle(
  theme: RoboVizTheme,
  isActive: boolean
): React.CSSProperties {
  return {
    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    backgroundColor: isActive ? theme.colors.primary : theme.backgrounds.surface,
    color: isActive ? theme.text.inverse : theme.text.primary,
    border: `1px solid ${isActive ? theme.colors.primary : theme.borders.default}`,
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamilyMono,
  };
}

// ============================================================================
// Utilities
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// Main Component
// ============================================================================

export function TrajectoryTimeline({
  trajectory,
  height = 60,
  showMarkers = true,
  showTimeLabels = true,
  theme: themeProp,
  onPositionChange,
  onPlayStateChange,
}: TrajectoryTimelineProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const {
    isPlaying,
    position,
    speed,
    setPlaying,
    setPosition,
    setSpeed,
  } = usePlaybackState();

  // Calculate waypoint markers
  const markers = useMemo(() => {
    return trajectory.waypoints.map((wp, i) => ({
      position: i / Math.max(1, trajectory.waypoints.length - 1),
      hasIssue:
        wp.status === 'collision' ||
        wp.status === 'unreachable' ||
        wp.status === 'singular' ||
        wp.status === 'error',
    }));
  }, [trajectory.waypoints]);

  // Calculate time values
  const estimatedTime = trajectory.estimatedTime || trajectory.waypoints.length * 0.5;
  const currentTime = position * estimatedTime;

  // Handle slider interaction
  const updatePosition = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const newPosition = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );

      setPosition(newPosition);
      onPositionChange?.(newPosition);
    },
    [setPosition, onPositionChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        updatePosition(e.clientX);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [updatePosition]);

  // Handle play/pause toggle
  const togglePlay = useCallback(() => {
    const newPlaying = !isPlaying;
    setPlaying(newPlaying);
    onPlayStateChange?.(newPlaying);
  }, [isPlaying, setPlaying, onPlayStateChange]);

  // Handle speed change
  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
    },
    [setSpeed]
  );

  // Playback animation - use ref to track position to avoid stale closure
  const positionRef = React.useRef(position);
  positionRef.current = position;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const step = (speed * 0.016) / estimatedTime; // ~60fps
      const next = positionRef.current + step;
      if (next >= 1) {
        setPlaying(false);
        setPosition(1);
      } else {
        setPosition(next);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isPlaying, speed, estimatedTime, setPosition, setPlaying]);

  const speedOptions = [0.5, 1, 2, 4];

  return (
    <div style={{ ...getContainerStyle(theme), height }}>
      {/* Controls row */}
      <div style={getControlsStyle(theme)}>
        {/* Play/Pause button */}
        <button
          style={getPlayButtonStyle(theme, isPlaying)}
          onClick={togglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>

        {/* Slider */}
        <div
          ref={sliderRef}
          style={getSliderContainerStyle(theme)}
          onMouseDown={handleMouseDown}
        >
          <div style={getSliderTrackStyle(theme)}>
            <div style={getSliderFillStyle(theme, position)} />
          </div>

          {/* Waypoint markers */}
          {showMarkers &&
            markers.map((marker, i) => (
              <div
                key={i}
                style={getMarkerStyle(theme, marker.position, marker.hasIssue)}
              />
            ))}

          {/* Thumb */}
          <div style={getSliderThumbStyle(theme, position)} />
        </div>

        {/* Time labels */}
        {showTimeLabels && (
          <div style={getTimeLabelStyle(theme)}>
            {formatTime(currentTime)} / {formatTime(estimatedTime)}
          </div>
        )}

        {/* Speed control */}
        <div style={getSpeedControlStyle(theme)}>
          <span>Speed:</span>
          {speedOptions.map((s) => (
            <button
              key={s}
              style={getSpeedButtonStyle(theme, speed === s)}
              onClick={() => handleSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TrajectoryTimeline;
