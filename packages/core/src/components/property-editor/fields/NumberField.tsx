/**
 * NumberField Component
 *
 * A number input field with optional slider, unit display, and validation.
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { NumberFieldProps } from '../types';

const DEFAULT_PRECISION = 2;
const DEFAULT_STEP = 1;

export const NumberField: React.FC<NumberFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  hasError = false,
  errorMessage,
  highlighted = false,
  onPreviewChange,
  min,
  max,
  step = DEFAULT_STEP,
  precision = DEFAULT_PRECISION,
  unit,
  showSlider = false,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState(formatNumber(value, precision));
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; value: number } | null>(null);

  // Use field-level config if not explicitly provided
  const effectiveMin = min ?? field.min;
  const effectiveMax = max ?? field.max;
  const effectiveStep = step ?? field.step ?? DEFAULT_STEP;
  const effectivePrecision = precision ?? field.precision ?? DEFAULT_PRECISION;
  const effectiveUnit = unit ?? field.unit;

  // Sync input value with prop value when not focused
  useEffect(() => {
    if (!isFocused) {
      setInputValue(formatNumber(value, effectivePrecision));
    }
  }, [value, isFocused, effectivePrecision]);

  // Parse and validate input
  const parseAndClamp = useCallback(
    (inputValue: string | number): number => {
      let num = typeof inputValue === 'string' ? parseFloat(inputValue) : inputValue;
      if (isNaN(num)) num = 0;
      if (effectiveMin !== undefined) num = Math.max(effectiveMin, num);
      if (effectiveMax !== undefined) num = Math.min(effectiveMax, num);
      return parseFloat(num.toFixed(effectivePrecision));
    },
    [effectiveMin, effectiveMax, effectivePrecision]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Parse and notify
      const parsed = parseAndClamp(newValue);
      if (!isNaN(parsed)) {
        onPreviewChange?.(parsed);
      }
    },
    [parseAndClamp, onPreviewChange]
  );

  // Handle blur - commit value
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const parsed = parseAndClamp(inputValue);
    setInputValue(formatNumber(parsed, effectivePrecision));
    onChange(parsed);
    onPreviewChange?.(null);
  }, [inputValue, parseAndClamp, effectivePrecision, onChange, onPreviewChange]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Select all text on focus
    inputRef.current?.select();
  }, []);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        setInputValue(formatNumber(value, effectivePrecision));
        inputRef.current?.blur();
        onPreviewChange?.(null);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const multiplier = e.shiftKey ? 10 : 1;
        const newValue = parseAndClamp((value || 0) + effectiveStep * multiplier);
        onChange(newValue);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const multiplier = e.shiftKey ? 10 : 1;
        const newValue = parseAndClamp((value || 0) - effectiveStep * multiplier);
        onChange(newValue);
      }
    },
    [value, effectivePrecision, effectiveStep, parseAndClamp, onChange, onPreviewChange]
  );

  // Handle slider change
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onChange(parseAndClamp(newValue));
    },
    [onChange, parseAndClamp]
  );

  // Handle drag for scrubbing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly || disabled) return;
      if (e.altKey) {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, value: value || 0 };

        const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!dragStartRef.current) return;
          const delta = (moveEvent.clientX - dragStartRef.current.x) * 0.5;
          const multiplier = moveEvent.shiftKey ? 0.1 : 1;
          const newValue = parseAndClamp(
            dragStartRef.current.value + delta * effectiveStep * multiplier
          );
          onChange(newValue);
        };

        const handleMouseUp = () => {
          setIsDragging(false);
          dragStartRef.current = null;
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    },
    [readOnly, disabled, value, effectiveStep, parseAndClamp, onChange]
  );

  // Calculate slider percentage for visual feedback
  const sliderPercent =
    effectiveMin !== undefined && effectiveMax !== undefined
      ? ((value || 0) - effectiveMin) / (effectiveMax - effectiveMin)
      : 0;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: 28,
    padding: '0 8px',
    border: `1px solid ${
      hasError
        ? 'var(--pe-error, #ef4444)'
        : highlighted
        ? 'var(--pe-highlight, #3b82f6)'
        : isFocused
        ? 'var(--pe-focus, #3b82f6)'
        : 'var(--pe-border, #3a3a5a)'
    }`,
    borderRadius: 4,
    fontSize: 13,
    fontFamily: 'var(--font-mono, monospace)',
    backgroundColor: disabled
      ? 'var(--pe-disabled-bg, #3a3a4e)'
      : 'var(--pe-input-bg, #2a2a3e)',
    color: disabled
      ? 'var(--pe-disabled-text, #6b7280)'
      : 'var(--pe-text, #e5e7eb)',
    cursor: isDragging ? 'ew-resize' : disabled ? 'not-allowed' : 'text',
    outline: 'none',
    textAlign: 'right',
  };

  const unitStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--pe-unit, #6b7280)',
    minWidth: 24,
    textAlign: 'left',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: 4,
    appearance: 'none',
    backgroundColor: 'var(--pe-slider-track, #3a3a5a)',
    borderRadius: 2,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div className={`number-field ${className}`} style={containerStyle}>
      <div style={inputContainerStyle}>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          disabled={disabled}
          readOnly={readOnly}
          style={inputStyle}
          aria-invalid={hasError}
          aria-describedby={errorMessage ? `${field.key}-error` : undefined}
        />
        {effectiveUnit && <span style={unitStyle}>{effectiveUnit}</span>}
      </div>

      {/* Slider */}
      {showSlider && effectiveMin !== undefined && effectiveMax !== undefined && (
        <input
          type="range"
          min={effectiveMin}
          max={effectiveMax}
          step={effectiveStep}
          value={value || 0}
          onChange={handleSliderChange}
          disabled={disabled || readOnly}
          style={sliderStyle}
        />
      )}
    </div>
  );
};

/** Format number for display */
function formatNumber(value: number | undefined | null, precision: number): string {
  if (value === undefined || value === null || isNaN(value)) return '';
  return value.toFixed(precision);
}

NumberField.displayName = 'NumberField';

export default NumberField;
