/**
 * JogButton Component
 *
 * Industrial-grade jog button supporting:
 * - Single click for step movement
 * - Long press for continuous movement
 * - Visual feedback during press
 * - Theme-aware styling
 */

import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import { getJogButtonStyle } from './styles';

export interface JogButtonProps {
  /** Button label (typically "-" or "+") */
  label: string;
  /** Direction: -1 for decrease, 1 for increase */
  direction: 1 | -1;
  /** Called on single click */
  onJog: (direction: 1 | -1) => void;
  /** Called when long press starts */
  onStartContinuous?: (direction: 1 | -1) => void;
  /** Called when long press ends */
  onStopContinuous?: () => void;
  /** Delay before continuous mode starts (ms) */
  longPressDelay?: number;
  /** Button disabled state */
  disabled?: boolean;
  /** Warning state (e.g., near limit) */
  warning?: boolean;
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Custom style */
  style?: React.CSSProperties;
  /** Override theme (uses context theme if not provided) */
  theme?: RoboVizTheme;
}

export function JogButton({
  label,
  direction,
  onJog,
  onStartContinuous,
  onStopContinuous,
  longPressDelay = 300,
  disabled = false,
  warning = false,
  size = 'medium',
  style,
  theme: themeProp,
}: JogButtonProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);

  const [isPressed, setIsPressed] = useState(false);
  const [isContinuous, setIsContinuous] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMouseDownRef = useRef(false);

  // Start press
  const handlePressStart = useCallback(() => {
    if (disabled) return;

    isMouseDownRef.current = true;
    setIsPressed(true);

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      if (isMouseDownRef.current) {
        setIsContinuous(true);
        onStartContinuous?.(direction);
      }
    }, longPressDelay);
  }, [disabled, direction, longPressDelay, onStartContinuous]);

  // End press
  const handlePressEnd = useCallback(() => {
    if (!isMouseDownRef.current) return;

    isMouseDownRef.current = false;
    setIsPressed(false);

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isContinuous) {
      // Was continuous, just stop
      setIsContinuous(false);
      onStopContinuous?.();
    } else {
      // Was single click
      onJog(direction);
    }
  }, [direction, isContinuous, onJog, onStopContinuous]);

  // Handle mouse leave (treat as release)
  const handleMouseLeave = useCallback(() => {
    if (isPressed) {
      handlePressEnd();
    }
  }, [isPressed, handlePressEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const buttonStyle = getJogButtonStyle({
    theme,
    isPressed,
    disabled,
    warning,
    size,
  });

  // Add continuous indicator outline
  const finalStyle: React.CSSProperties = {
    ...buttonStyle,
    outline: isContinuous ? `2px solid ${warning ? theme.colors.warning : theme.colors.primary}` : 'none',
    outlineOffset: 2,
    ...style,
  };

  return (
    <button
      type="button"
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      disabled={disabled}
      style={finalStyle}
    >
      {label}
    </button>
  );
}

export default JogButton;
