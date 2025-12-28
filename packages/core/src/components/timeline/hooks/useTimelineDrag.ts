/**
 * useTimelineDrag Hook
 *
 * Handles drag interactions for the timeline including:
 * - Playhead dragging
 * - Range selection
 * - Panning
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import type { TimeRange } from '../types';

export type DragMode = 'none' | 'playhead' | 'range' | 'pan';

export interface UseTimelineDragOptions {
  /** Time range of the timeline */
  timeRange: TimeRange;
  /** Current time */
  currentTime: number;
  /** Callback when time changes */
  onTimeChange?: (time: number) => void;
  /** Callback when range is selected */
  onRangeSelect?: (range: TimeRange | null) => void;
  /** Callback when panning */
  onPan?: (deltaX: number) => void;
  /** Function to convert pixel to time */
  pixelToTime: (pixelX: number) => number;
  /** Function to convert time to pixel */
  timeToPixel: (time: number) => number;
  /** Enable range selection */
  enableRangeSelection?: boolean;
  /** Enable panning */
  enablePanning?: boolean;
}

export interface UseTimelineDragReturn {
  /** Current drag mode */
  dragMode: DragMode;
  /** Is currently dragging */
  isDragging: boolean;
  /** Drag start position (pixels) */
  dragStartX: number | null;
  /** Current drag position (pixels) */
  dragCurrentX: number | null;
  /** Selected range during drag */
  pendingRange: TimeRange | null;

  // Event handlers
  handleMouseDown: (e: React.MouseEvent, mode?: DragMode) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: (e: React.MouseEvent) => void;
  handleMouseLeave: (e: React.MouseEvent) => void;

  // Playhead specific
  startPlayheadDrag: (e: React.MouseEvent) => void;
  isPlayheadDragging: boolean;
}

export function useTimelineDrag(options: UseTimelineDragOptions): UseTimelineDragReturn {
  const {
    timeRange,
    currentTime,
    onTimeChange,
    onRangeSelect,
    onPan,
    pixelToTime,
    timeToPixel,
    enableRangeSelection = true,
    enablePanning = true,
  } = options;

  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);

  const lastPanXRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const isDragging = dragMode !== 'none';
  const isPlayheadDragging = dragMode === 'playhead';

  // Calculate pending range during range selection
  const pendingRange =
    dragMode === 'range' && dragStartX !== null && dragCurrentX !== null
      ? {
          start: Math.min(pixelToTime(dragStartX), pixelToTime(dragCurrentX)),
          end: Math.max(pixelToTime(dragStartX), pixelToTime(dragCurrentX)),
        }
      : null;

  // Clamp time to valid range
  const clampTime = useCallback(
    (time: number): number => {
      return Math.max(timeRange.start, Math.min(timeRange.end, time));
    },
    [timeRange]
  );

  // Start playhead drag
  const startPlayheadDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode('playhead');
    setDragStartX(e.nativeEvent.offsetX);
    setDragCurrentX(e.nativeEvent.offsetX);
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode?: DragMode) => {
      // If mode is specified (e.g., from playhead), use it
      if (mode) {
        setDragMode(mode);
        setDragStartX(e.nativeEvent.offsetX);
        setDragCurrentX(e.nativeEvent.offsetX);
        if (mode === 'pan') {
          lastPanXRef.current = e.nativeEvent.offsetX;
        }
        return;
      }

      // Middle mouse button = pan
      if (e.button === 1 && enablePanning) {
        e.preventDefault();
        setDragMode('pan');
        lastPanXRef.current = e.nativeEvent.offsetX;
        return;
      }

      // Left click with Shift = range selection
      if (e.button === 0 && e.shiftKey && enableRangeSelection) {
        e.preventDefault();
        setDragMode('range');
        setDragStartX(e.nativeEvent.offsetX);
        setDragCurrentX(e.nativeEvent.offsetX);
        return;
      }

      // Left click on empty area = move playhead
      if (e.button === 0) {
        const clickedTime = pixelToTime(e.nativeEvent.offsetX);
        onTimeChange?.(clampTime(clickedTime));
      }
    },
    [enablePanning, enableRangeSelection, pixelToTime, onTimeChange, clampTime]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      const currentX = e.nativeEvent.offsetX;

      switch (dragMode) {
        case 'playhead': {
          setDragCurrentX(currentX);
          const newTime = pixelToTime(currentX);
          onTimeChange?.(clampTime(newTime));
          break;
        }

        case 'range': {
          setDragCurrentX(currentX);
          break;
        }

        case 'pan': {
          if (lastPanXRef.current !== null) {
            const deltaX = lastPanXRef.current - currentX;
            onPan?.(deltaX);
            lastPanXRef.current = currentX;
          }
          break;
        }
      }
    },
    [isDragging, dragMode, pixelToTime, onTimeChange, clampTime, onPan]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;

      switch (dragMode) {
        case 'range': {
          if (pendingRange && pendingRange.end - pendingRange.start > 0) {
            onRangeSelect?.(pendingRange);
          }
          break;
        }
      }

      // Reset state
      setDragMode('none');
      setDragStartX(null);
      setDragCurrentX(null);
      lastPanXRef.current = null;
    },
    [isDragging, dragMode, pendingRange, onRangeSelect]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && dragMode !== 'playhead') {
        // Cancel non-playhead drags when leaving
        setDragMode('none');
        setDragStartX(null);
        setDragCurrentX(null);
        lastPanXRef.current = null;
      }
    },
    [isDragging, dragMode]
  );

  // Global mouse up listener for playhead drag
  useEffect(() => {
    if (!isPlayheadDragging) return;

    const handleGlobalMouseUp = () => {
      setDragMode('none');
      setDragStartX(null);
      setDragCurrentX(null);
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = pixelToTime(x);
      onTimeChange?.(clampTime(newTime));
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isPlayheadDragging, pixelToTime, onTimeChange, clampTime]);

  return {
    dragMode,
    isDragging,
    dragStartX,
    dragCurrentX,
    pendingRange,

    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,

    startPlayheadDrag,
    isPlayheadDragging,
  };
}
