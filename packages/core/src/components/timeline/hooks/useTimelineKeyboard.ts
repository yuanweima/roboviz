/**
 * useTimelineKeyboard Hook
 *
 * Handles keyboard shortcuts for timeline navigation and control.
 */

import { useCallback, useEffect } from 'react';
import type { TimeRange } from '../types';

export interface UseTimelineKeyboardOptions {
  /** Whether keyboard shortcuts are enabled */
  enabled?: boolean;
  /** Time range */
  timeRange: TimeRange;
  /** Current time */
  currentTime: number;
  /** Is playing */
  isPlaying?: boolean;
  /** Playback speed */
  playbackSpeed?: number;

  // Callbacks
  onTimeChange?: (time: number) => void;
  onPlayPause?: () => void;
  onSpeedChange?: (speed: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomToFit?: () => void;
  onJumpToStart?: () => void;
  onJumpToEnd?: () => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  onNextEvent?: () => void;
  onPrevEvent?: () => void;
  onClearSelection?: () => void;

  /** Step size for arrow key navigation (ms) */
  stepSize?: number;
  /** Large step size for Shift+Arrow (ms) */
  largeStepSize?: number;
}

export interface UseTimelineKeyboardReturn {
  /** Get help text for shortcuts */
  getShortcutsHelp: () => TimelineShortcutHelp[];
}

export interface TimelineShortcutHelp {
  key: string;
  description: string;
  category: 'playback' | 'navigation' | 'zoom' | 'selection';
}

const DEFAULT_STEP_SIZE = 100; // 100ms
const DEFAULT_LARGE_STEP_SIZE = 1000; // 1 second

export function useTimelineKeyboard(
  options: UseTimelineKeyboardOptions
): UseTimelineKeyboardReturn {
  const {
    enabled = true,
    timeRange,
    currentTime,
    isPlaying,
    playbackSpeed = 1,
    onTimeChange,
    onPlayPause,
    onSpeedChange,
    onZoomIn,
    onZoomOut,
    onZoomToFit,
    onJumpToStart,
    onJumpToEnd,
    onStepForward,
    onStepBackward,
    onNextEvent,
    onPrevEvent,
    onClearSelection,
    stepSize = DEFAULT_STEP_SIZE,
    largeStepSize = DEFAULT_LARGE_STEP_SIZE,
  } = options;

  // Clamp time to valid range
  const clampTime = useCallback(
    (time: number): number => {
      return Math.max(timeRange.start, Math.min(timeRange.end, time));
    },
    [timeRange]
  );

  // Handle keydown
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if focus is in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const step = e.shiftKey ? largeStepSize : stepSize;

      switch (e.key) {
        // Playback
        case ' ': // Space - play/pause
          e.preventDefault();
          onPlayPause?.();
          break;

        case 'k': // K - play/pause (like YouTube)
          e.preventDefault();
          onPlayPause?.();
          break;

        // Navigation
        case 'ArrowLeft':
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) {
            // Cmd/Ctrl + Left = jump to start
            onJumpToStart?.();
            onTimeChange?.(timeRange.start);
          } else {
            // Left = step backward
            onStepBackward?.();
            onTimeChange?.(clampTime(currentTime - step));
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.metaKey || e.ctrlKey) {
            // Cmd/Ctrl + Right = jump to end
            onJumpToEnd?.();
            onTimeChange?.(timeRange.end);
          } else {
            // Right = step forward
            onStepForward?.();
            onTimeChange?.(clampTime(currentTime + step));
          }
          break;

        case 'Home':
          e.preventDefault();
          onJumpToStart?.();
          onTimeChange?.(timeRange.start);
          break;

        case 'End':
          e.preventDefault();
          onJumpToEnd?.();
          onTimeChange?.(timeRange.end);
          break;

        case 'j': // J - previous event
          e.preventDefault();
          onPrevEvent?.();
          break;

        case 'l': // L - next event
          e.preventDefault();
          onNextEvent?.();
          break;

        // Speed control
        case 'ArrowUp':
          e.preventDefault();
          if (onSpeedChange) {
            const speeds = [0.25, 0.5, 1, 2, 4, 8];
            const currentIndex = speeds.indexOf(playbackSpeed);
            if (currentIndex < speeds.length - 1) {
              onSpeedChange(speeds[currentIndex + 1]);
            }
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (onSpeedChange) {
            const speeds = [0.25, 0.5, 1, 2, 4, 8];
            const currentIndex = speeds.indexOf(playbackSpeed);
            if (currentIndex > 0) {
              onSpeedChange(speeds[currentIndex - 1]);
            }
          }
          break;

        // Zoom
        case '=':
        case '+':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onZoomIn?.();
          }
          break;

        case '-':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onZoomOut?.();
          }
          break;

        case '0':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onZoomToFit?.();
          }
          break;

        // Selection
        case 'Escape':
          e.preventDefault();
          onClearSelection?.();
          break;
      }
    },
    [
      timeRange,
      currentTime,
      playbackSpeed,
      stepSize,
      largeStepSize,
      clampTime,
      onTimeChange,
      onPlayPause,
      onSpeedChange,
      onZoomIn,
      onZoomOut,
      onZoomToFit,
      onJumpToStart,
      onJumpToEnd,
      onStepForward,
      onStepBackward,
      onNextEvent,
      onPrevEvent,
      onClearSelection,
    ]
  );

  // Attach keyboard listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Get shortcuts help
  const getShortcutsHelp = useCallback((): TimelineShortcutHelp[] => {
    return [
      // Playback
      { key: 'Space / K', description: 'Play/Pause', category: 'playback' },
      { key: '↑/↓', description: 'Increase/Decrease speed', category: 'playback' },

      // Navigation
      { key: '←/→', description: 'Step backward/forward', category: 'navigation' },
      { key: 'Shift + ←/→', description: 'Large step', category: 'navigation' },
      { key: 'Cmd + ←/→', description: 'Jump to start/end', category: 'navigation' },
      { key: 'Home/End', description: 'Jump to start/end', category: 'navigation' },
      { key: 'J/L', description: 'Previous/Next event', category: 'navigation' },

      // Zoom
      { key: 'Cmd + +/-', description: 'Zoom in/out', category: 'zoom' },
      { key: 'Cmd + 0', description: 'Zoom to fit', category: 'zoom' },

      // Selection
      { key: 'Escape', description: 'Clear selection', category: 'selection' },
    ];
  }, []);

  return {
    getShortcutsHelp,
  };
}
