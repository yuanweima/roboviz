/**
 * JointJogRow Component
 *
 * Single joint jog control row with:
 * - Joint label
 * - Decrease/Increase jog buttons
 * - Position bar (visual only)
 * - Precise numeric display (editable)
 * - Theme-aware styling
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { JogButton } from './JogButton';
import { NumericDisplay } from './NumericDisplay';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import {
  getJogRowStyle,
  getJogLabelStyle,
  getProgressBarContainerStyle,
  getProgressBarFillStyle,
  getProgressBarIndicatorStyle,
} from './styles';

export interface JointJogRowProps {
  /** Joint index (0-based) */
  index: number;
  /** Joint name/label */
  label: string;
  /** Current value in radians */
  value: number;
  /** Lower limit in radians */
  lowerLimit?: number;
  /** Upper limit in radians */
  upperLimit?: number;
  /** Whether near limit */
  nearLimit?: boolean;
  /** Called on jog */
  onJog: (jointIndex: number, direction: 1 | -1) => void;
  /** Called on value change */
  onValueChange: (jointIndex: number, value: number) => void;
  /** Called on continuous jog start */
  onStartContinuous?: (jointIndex: number, direction: 1 | -1) => void;
  /** Called on continuous jog stop */
  onStopContinuous?: () => void;
  /** Row color */
  color?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Override theme (uses context theme if not provided) */
  theme?: RoboVizTheme;
  /** Whether this row is selected (for keyboard shortcuts) */
  selected?: boolean;
}

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export function JointJogRow({
  index,
  label,
  value,
  lowerLimit = -Math.PI,
  upperLimit = Math.PI,
  nearLimit = false,
  onJog,
  onValueChange,
  onStartContinuous,
  onStopContinuous,
  color,
  disabled = false,
  theme: themeProp,
  selected = false,
}: JointJogRowProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);
  const effectiveColor = color ?? theme.colors.primary;

  // Convert to degrees for display
  const valueDeg = value * RAD_TO_DEG;
  const lowerDeg = lowerLimit * RAD_TO_DEG;
  const upperDeg = upperLimit * RAD_TO_DEG;

  // Calculate position percentage for bar
  const positionPercent = useMemo(() => {
    const range = upperLimit - lowerLimit;
    if (range <= 0) return 50;
    return ((value - lowerLimit) / range) * 100;
  }, [value, lowerLimit, upperLimit]);

  // Calculate zero position percentage
  const zeroPercent = useMemo(() => {
    if (lowerLimit >= 0 || upperLimit <= 0) return null;
    return ((-lowerLimit) / (upperLimit - lowerLimit)) * 100;
  }, [lowerLimit, upperLimit]);

  // Handlers
  const handleJog = useCallback((direction: 1 | -1) => {
    onJog(index, direction);
  }, [index, onJog]);

  const handleStartContinuous = useCallback((direction: 1 | -1) => {
    onStartContinuous?.(index, direction);
  }, [index, onStartContinuous]);

  const handleValueChange = useCallback((newValueDeg: number) => {
    onValueChange(index, newValueDeg * DEG_TO_RAD);
  }, [index, onValueChange]);

  const rowStyle: React.CSSProperties = {
    ...getJogRowStyle(theme, disabled),
    ...(selected ? {
      backgroundColor: `${theme.colors.primary}15`,
      borderRadius: theme.borderRadius.sm,
      outline: `2px solid ${theme.colors.primary}50`,
      outlineOffset: -2,
    } : {}),
  };
  const labelStyle = getJogLabelStyle(theme, effectiveColor, 32);
  const barContainerStyle = getProgressBarContainerStyle(theme);
  const barFillStyle = getProgressBarFillStyle(theme, positionPercent, effectiveColor, nearLimit);
  const indicatorStyle = getProgressBarIndicatorStyle(theme, positionPercent, effectiveColor, nearLimit);

  return (
    <div style={rowStyle}>
      {/* Joint label */}
      <div style={labelStyle}>
        {label}
      </div>

      {/* Decrease button */}
      <JogButton
        label="-"
        direction={-1}
        onJog={handleJog}
        onStartContinuous={handleStartContinuous}
        onStopContinuous={onStopContinuous}
        warning={nearLimit}
        disabled={disabled}
        size="small"
        theme={theme}
      />

      {/* Position bar */}
      <div style={barContainerStyle}>
        {/* Track */}
        <div style={barFillStyle} />
        {/* Center marker (zero position) */}
        {zeroPercent !== null && (
          <div
            style={{
              position: 'absolute',
              left: `${zeroPercent}%`,
              top: 0,
              width: 1,
              height: '100%',
              background: theme.text.disabled,
            }}
          />
        )}
        {/* Position indicator */}
        <div style={indicatorStyle} />
      </div>

      {/* Increase button */}
      <JogButton
        label="+"
        direction={1}
        onJog={handleJog}
        onStartContinuous={handleStartContinuous}
        onStopContinuous={onStopContinuous}
        warning={nearLimit}
        disabled={disabled}
        size="small"
        theme={theme}
      />

      {/* Numeric display */}
      <NumericDisplay
        value={valueDeg}
        unit="°"
        precision={2}
        onChange={handleValueChange}
        min={lowerDeg}
        max={upperDeg}
        warning={nearLimit}
        width={80}
        theme={theme}
      />
    </div>
  );
}

export default JointJogRow;
