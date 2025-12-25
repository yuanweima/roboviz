/**
 * NumericDisplay Component
 *
 * Industrial-grade numeric display with:
 * - Precise value display (configurable decimal places)
 * - Click-to-edit functionality
 * - Unit display
 * - Warning/error states
 * - Theme-aware styling
 */

import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import {
  getNumericDisplayContainerStyle,
  getNumericDisplayValueStyle,
  getNumericInputStyle,
  getUnitStyle,
} from './styles';

export interface NumericDisplayProps {
  /** Current value */
  value: number;
  /** Unit to display (e.g., "deg", "mm", "m") */
  unit?: string;
  /** Decimal places to show */
  precision?: number;
  /** Called when value is changed via input */
  onChange?: (value: number) => void;
  /** Whether editing is allowed */
  editable?: boolean;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Warning state (yellow) */
  warning?: boolean;
  /** Error state (red) */
  error?: boolean;
  /** Display width */
  width?: number;
  /** Custom style */
  style?: React.CSSProperties;
  /** Label (optional) */
  label?: string;
  /** Override theme (uses context theme if not provided) */
  theme?: RoboVizTheme;
}

export function NumericDisplay({
  value,
  unit = '',
  precision = 3,
  onChange,
  editable = true,
  min,
  max,
  warning = false,
  error = false,
  width = 100,
  style,
  label,
  theme: themeProp,
}: NumericDisplayProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Format value for display
  const displayValue = value.toFixed(precision);

  // Start editing
  const handleClick = useCallback(() => {
    if (!editable || !onChange) return;
    setEditValue(displayValue);
    setIsEditing(true);
  }, [editable, onChange, displayValue]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  // Commit edit
  const commitEdit = useCallback(() => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      let newValue = parsed;
      // Clamp to range
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);
      onChange?.(newValue);
    }
    setIsEditing(false);
  }, [editValue, min, max, onChange]);

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [commitEdit, cancelEdit]);

  const containerStyle = getNumericDisplayContainerStyle({
    theme,
    warning,
    error,
    isEditing,
    width,
  });

  const valueStyle = getNumericDisplayValueStyle({
    theme,
    warning,
    error,
  });

  const inputStyle = getNumericInputStyle(theme);
  const unitStyle = getUnitStyle(theme);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.xs,
        ...style,
      }}
    >
      {label && (
        <span
          style={{
            color: theme.text.secondary,
            fontSize: theme.typography.fontSize.sm,
            width: 24,
            textAlign: 'right',
          }}
        >
          {label}
        </span>
      )}
      <div
        onClick={handleClick}
        style={{
          ...containerStyle,
          cursor: editable && onChange ? 'text' : 'default',
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={handleInputChange}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
        ) : (
          <span style={valueStyle}>
            {displayValue}
          </span>
        )}
        {unit && !isEditing && (
          <span style={unitStyle}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export default NumericDisplay;
