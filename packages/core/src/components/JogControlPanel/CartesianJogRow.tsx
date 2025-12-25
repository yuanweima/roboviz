/**
 * CartesianJogRow Component
 *
 * Single Cartesian axis jog control row with:
 * - Axis label (X, Y, Z, Rx, Ry, Rz)
 * - Decrease/Increase jog buttons
 * - Precise numeric display (editable)
 * - Theme-aware styling
 */

import * as React from 'react';
import { useCallback } from 'react';
import { JogButton } from './JogButton';
import { NumericDisplay } from './NumericDisplay';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import type { JogAxis } from './useRobotJogControl';
import { getJogRowStyle, getJogLabelStyle } from './styles';

export interface CartesianJogRowProps {
  /** Axis identifier */
  axis: JogAxis;
  /** Display label */
  label: string;
  /** Current value (meters for position, radians for rotation) */
  value: number;
  /** Whether this is a rotation axis */
  isRotation?: boolean;
  /** Called on jog */
  onJog: (axis: JogAxis, direction: 1 | -1) => void;
  /** Called on value change */
  onValueChange: (axis: JogAxis, value: number) => void;
  /** Called on continuous jog start */
  onStartContinuous?: (axis: JogAxis, direction: 1 | -1) => void;
  /** Called on continuous jog stop */
  onStopContinuous?: () => void;
  /** Row color */
  color?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Error state (unreachable) */
  error?: boolean;
  /** Override theme (uses context theme if not provided) */
  theme?: RoboVizTheme;
  /** Whether this row is selected (for keyboard shortcuts) */
  selected?: boolean;
}

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export function CartesianJogRow({
  axis,
  label,
  value,
  isRotation = false,
  onJog,
  onValueChange,
  onStartContinuous,
  onStopContinuous,
  color,
  disabled = false,
  error = false,
  theme: themeProp,
  selected = false,
}: CartesianJogRowProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);
  const effectiveColor = color ?? theme.colors.primary;

  // Convert for display
  const displayValue = isRotation ? value * RAD_TO_DEG : value * 1000; // rad->deg or m->mm
  const unit = isRotation ? '°' : 'mm';

  // Handlers
  const handleJog = useCallback((direction: 1 | -1) => {
    onJog(axis, direction);
  }, [axis, onJog]);

  const handleStartContinuous = useCallback((direction: 1 | -1) => {
    onStartContinuous?.(axis, direction);
  }, [axis, onStartContinuous]);

  const handleValueChange = useCallback((newDisplayValue: number) => {
    const newValue = isRotation
      ? newDisplayValue * DEG_TO_RAD
      : newDisplayValue / 1000; // deg->rad or mm->m
    onValueChange(axis, newValue);
  }, [axis, isRotation, onValueChange]);

  const rowStyle: React.CSSProperties = {
    ...getJogRowStyle(theme, disabled),
    ...(selected ? {
      backgroundColor: `${theme.colors.primary}15`,
      borderRadius: theme.borderRadius.sm,
      outline: `2px solid ${theme.colors.primary}50`,
      outlineOffset: -2,
    } : {}),
  };
  const labelStyle = getJogLabelStyle(theme, effectiveColor, 28);

  return (
    <div style={rowStyle}>
      {/* Axis label */}
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
        disabled={disabled}
        size="small"
        theme={theme}
      />

      {/* Increase button - placed right next to decrease */}
      <JogButton
        label="+"
        direction={1}
        onJog={handleJog}
        onStartContinuous={handleStartContinuous}
        onStopContinuous={onStopContinuous}
        disabled={disabled}
        size="small"
        theme={theme}
      />

      {/* Spacer to push numeric display to the right */}
      <div style={{ flex: 1 }} />

      {/* Numeric display */}
      <NumericDisplay
        value={displayValue}
        unit={unit}
        precision={isRotation ? 2 : 1}
        onChange={handleValueChange}
        error={error}
        width={90}
        theme={theme}
      />
    </div>
  );
}

export default CartesianJogRow;
