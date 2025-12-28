/**
 * useTimelineZoom Hook
 *
 * Handles zoom and pan interactions for the timeline.
 * Supports mouse wheel zoom, pinch zoom, and keyboard shortcuts.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import type { TimeRange, ZoomConfig, TimelineViewState } from '../types';

export interface UseTimelineZoomOptions {
  /** Total time range */
  timeRange: TimeRange;
  /** Initial pixels per millisecond */
  initialScale?: number;
  /** Minimum scale (most zoomed out) */
  minScale?: number;
  /** Maximum scale (most zoomed in) */
  maxScale?: number;
  /** Zoom sensitivity for wheel events */
  zoomSensitivity?: number;
  /** Callback when view changes */
  onViewChange?: (state: TimelineViewState) => void;
}

export interface UseTimelineZoomReturn {
  /** Current zoom configuration */
  zoom: ZoomConfig;
  /** Current visible time range */
  visibleRange: TimeRange;
  /** Current scroll position */
  scrollX: number;
  /** Total width in pixels */
  totalWidth: number;
  /** Collapsed lane IDs */
  collapsedLanes: Set<string>;

  // Actions
  /** Zoom in at a specific position */
  zoomIn: (centerX?: number) => void;
  /** Zoom out at a specific position */
  zoomOut: (centerX?: number) => void;
  /** Zoom to fit entire time range */
  zoomToFit: (containerWidth: number) => void;
  /** Zoom to a specific time range */
  zoomToRange: (range: TimeRange, containerWidth: number) => void;
  /** Set zoom scale directly */
  setScale: (scale: number, centerX?: number) => void;
  /** Scroll to a specific time */
  scrollToTime: (time: number, containerWidth: number) => void;
  /** Set scroll position */
  setScrollX: (x: number) => void;
  /** Toggle lane collapse */
  toggleLaneCollapse: (laneId: string) => void;
  /** Set collapsed lanes */
  setCollapsedLanes: (lanes: Set<string>) => void;

  // Event handlers
  /** Handle wheel event for zoom/scroll */
  handleWheel: (e: WheelEvent, containerWidth: number) => void;
  /** Convert pixel position to time */
  pixelToTime: (pixelX: number) => number;
  /** Convert time to pixel position */
  timeToPixel: (time: number) => number;
}

const DEFAULT_INITIAL_SCALE = 0.1; // 0.1 pixels per ms = 100 pixels per second
const DEFAULT_MIN_SCALE = 0.001;   // 1 pixel per second
const DEFAULT_MAX_SCALE = 1;       // 1 pixel per ms = 1000 pixels per second
const DEFAULT_ZOOM_SENSITIVITY = 0.002;
const ZOOM_FACTOR = 1.2;

export function useTimelineZoom(options: UseTimelineZoomOptions): UseTimelineZoomReturn {
  const {
    timeRange,
    initialScale = DEFAULT_INITIAL_SCALE,
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
    zoomSensitivity = DEFAULT_ZOOM_SENSITIVITY,
    onViewChange,
  } = options;

  const [zoom, setZoom] = useState<ZoomConfig>({
    scale: initialScale,
    minScale,
    maxScale,
  });

  const [scrollX, setScrollXState] = useState(0);
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  // Track container width for calculations
  const containerWidthRef = useRef(0);

  // Calculate derived values
  const duration = timeRange.end - timeRange.start;
  const totalWidth = duration * zoom.scale;

  // Calculate visible range based on scroll position and container width
  const getVisibleRange = useCallback(
    (containerWidth: number): TimeRange => {
      const startTime = timeRange.start + scrollX / zoom.scale;
      const endTime = startTime + containerWidth / zoom.scale;
      return {
        start: Math.max(timeRange.start, startTime),
        end: Math.min(timeRange.end, endTime),
      };
    },
    [timeRange, scrollX, zoom.scale]
  );

  const visibleRange = getVisibleRange(containerWidthRef.current);

  // Notify on view change
  useEffect(() => {
    onViewChange?.({
      visibleRange,
      zoom,
      scrollX,
      collapsedLanes,
    });
  }, [visibleRange, zoom, scrollX, collapsedLanes, onViewChange]);

  // Conversion functions
  const pixelToTime = useCallback(
    (pixelX: number): number => {
      return timeRange.start + (scrollX + pixelX) / zoom.scale;
    },
    [timeRange.start, scrollX, zoom.scale]
  );

  const timeToPixel = useCallback(
    (time: number): number => {
      return (time - timeRange.start) * zoom.scale - scrollX;
    },
    [timeRange.start, zoom.scale, scrollX]
  );

  // Clamp scroll to valid range
  const clampScrollX = useCallback(
    (x: number, containerWidth: number): number => {
      const maxScrollX = Math.max(0, totalWidth - containerWidth);
      return Math.max(0, Math.min(maxScrollX, x));
    },
    [totalWidth]
  );

  // Set scroll with clamping
  const setScrollX = useCallback(
    (x: number) => {
      setScrollXState((prev) => {
        const clamped = clampScrollX(x, containerWidthRef.current);
        return clamped;
      });
    },
    [clampScrollX]
  );

  // Zoom at a specific center point
  const zoomAtPoint = useCallback(
    (newScale: number, centerX: number) => {
      const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));

      // Calculate the time at the center point before zoom
      const centerTime = pixelToTime(centerX);

      setZoom((prev) => ({ ...prev, scale: clampedScale }));

      // Adjust scroll to keep the center point at the same position
      const newScrollX = (centerTime - timeRange.start) * clampedScale - centerX;
      setScrollXState(clampScrollX(newScrollX, containerWidthRef.current));
    },
    [minScale, maxScale, pixelToTime, timeRange.start, clampScrollX]
  );

  // Zoom actions
  const zoomIn = useCallback(
    (centerX?: number) => {
      const center = centerX ?? containerWidthRef.current / 2;
      zoomAtPoint(zoom.scale * ZOOM_FACTOR, center);
    },
    [zoom.scale, zoomAtPoint]
  );

  const zoomOut = useCallback(
    (centerX?: number) => {
      const center = centerX ?? containerWidthRef.current / 2;
      zoomAtPoint(zoom.scale / ZOOM_FACTOR, center);
    },
    [zoom.scale, zoomAtPoint]
  );

  const zoomToFit = useCallback(
    (containerWidth: number) => {
      containerWidthRef.current = containerWidth;
      const newScale = containerWidth / duration;
      const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
      setZoom((prev) => ({ ...prev, scale: clampedScale }));
      setScrollXState(0);
    },
    [duration, minScale, maxScale]
  );

  const zoomToRange = useCallback(
    (range: TimeRange, containerWidth: number) => {
      containerWidthRef.current = containerWidth;
      const rangeDuration = range.end - range.start;
      const newScale = containerWidth / rangeDuration;
      const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
      setZoom((prev) => ({ ...prev, scale: clampedScale }));
      setScrollXState((range.start - timeRange.start) * clampedScale);
    },
    [timeRange.start, minScale, maxScale]
  );

  const setScale = useCallback(
    (scale: number, centerX?: number) => {
      const center = centerX ?? containerWidthRef.current / 2;
      zoomAtPoint(scale, center);
    },
    [zoomAtPoint]
  );

  const scrollToTime = useCallback(
    (time: number, containerWidth: number) => {
      containerWidthRef.current = containerWidth;
      // Center the time in the view
      const targetScrollX = (time - timeRange.start) * zoom.scale - containerWidth / 2;
      setScrollXState(clampScrollX(targetScrollX, containerWidth));
    },
    [timeRange.start, zoom.scale, clampScrollX]
  );

  // Handle wheel events
  const handleWheel = useCallback(
    (e: WheelEvent, containerWidth: number) => {
      containerWidthRef.current = containerWidth;

      // Ctrl/Cmd + wheel = zoom
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = zoom.scale * (1 + delta);
        zoomAtPoint(newScale, e.offsetX);
      }
      // Shift + wheel = horizontal scroll
      else if (e.shiftKey) {
        e.preventDefault();
        setScrollX(scrollX + e.deltaY);
      }
      // Regular wheel = horizontal scroll (for timeline, vertical scroll doesn't make sense)
      else {
        e.preventDefault();
        setScrollX(scrollX + e.deltaX + e.deltaY);
      }
    },
    [zoom.scale, zoomSensitivity, zoomAtPoint, scrollX, setScrollX]
  );

  // Lane collapse
  const toggleLaneCollapse = useCallback((laneId: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(laneId)) {
        next.delete(laneId);
      } else {
        next.add(laneId);
      }
      return next;
    });
  }, []);

  return {
    zoom,
    visibleRange,
    scrollX,
    totalWidth,
    collapsedLanes,

    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToRange,
    setScale,
    scrollToTime,
    setScrollX,
    toggleLaneCollapse,
    setCollapsedLanes,

    handleWheel,
    pixelToTime,
    timeToPixel,
  };
}
