/**
 * Playhead Component
 *
 * The draggable time indicator on the timeline.
 * Shows current playback position and allows seeking.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { PlayheadProps } from './types';

const DEFAULT_COLOR = '#3b82f6'; // blue-500
const HANDLE_WIDTH = 12;
const HANDLE_HEIGHT = 16;

export const Playhead: React.FC<PlayheadProps> = ({
  time,
  position,
  height,
  dragging = false,
  onDragStart,
  onDrag,
  onDragEnd,
  color = DEFAULT_COLOR,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [internalDragging, setInternalDragging] = useState(false);
  const playheadRef = useRef<HTMLDivElement>(null);

  const isDragging = dragging || internalDragging;

  // Handle mouse down on the handle
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setInternalDragging(true);
      onDragStart?.();
    },
    [onDragStart]
  );

  // Global mouse move/up handlers
  useEffect(() => {
    if (!internalDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!playheadRef.current) return;

      const parent = playheadRef.current.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;

      // Convert pixel to time (this should be passed from parent)
      // For now, we emit the pixel position and let parent convert
      onDrag?.(x);
    };

    const handleMouseUp = () => {
      setInternalDragging(false);
      onDragEnd?.();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [internalDragging, onDrag, onDragEnd]);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position,
    top: 0,
    width: 0,
    height: height,
    zIndex: 100,
    pointerEvents: 'none',
  };

  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: HANDLE_HEIGHT,
    width: 2,
    height: height - HANDLE_HEIGHT,
    backgroundColor: color,
    transform: 'translateX(-50%)',
    opacity: isDragging ? 1 : 0.8,
  };

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    left: -HANDLE_WIDTH / 2,
    top: 0,
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    cursor: isDragging ? 'grabbing' : 'grab',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // SVG handle shape (triangle/arrow pointing down)
  const handlePath = `
    M ${HANDLE_WIDTH / 2} ${HANDLE_HEIGHT}
    L 0 ${HANDLE_HEIGHT * 0.4}
    L 0 0
    L ${HANDLE_WIDTH} 0
    L ${HANDLE_WIDTH} ${HANDLE_HEIGHT * 0.4}
    Z
  `;

  return (
    <div
      ref={playheadRef}
      className={`timeline-playhead ${className} ${isDragging ? 'dragging' : ''}`}
      style={containerStyle}
    >
      {/* Handle */}
      <div
        style={handleStyle}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <svg
          width={HANDLE_WIDTH}
          height={HANDLE_HEIGHT}
          viewBox={`0 0 ${HANDLE_WIDTH} ${HANDLE_HEIGHT}`}
          style={{
            filter: isHovered || isDragging
              ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              : 'none',
          }}
        >
          <path
            d={handlePath}
            fill={color}
            stroke={isHovered || isDragging ? '#1d4ed8' : color}
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* Vertical line */}
      <div style={lineStyle} />

      {/* Time tooltip (shown while dragging) */}
      {isDragging && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: HANDLE_HEIGHT + 4,
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'var(--font-mono, monospace)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 101,
          }}
        >
          {formatTimeForDisplay(time)}
        </div>
      )}
    </div>
  );
};

/** Format time for display in tooltip */
function formatTimeForDisplay(ms: number): string {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(2);

  if (minutes > 0) {
    return `${minutes}:${parseFloat(seconds).toFixed(2).padStart(5, '0')}`;
  }
  return `${seconds}s`;
}

Playhead.displayName = 'Playhead';

export default Playhead;
