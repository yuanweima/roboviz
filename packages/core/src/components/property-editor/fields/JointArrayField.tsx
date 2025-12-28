/**
 * JointArrayField Component
 *
 * A field for editing an array of joint angles.
 * Features:
 * - Individual joint sliders
 * - Joint limits visualization
 * - Colored joint indicators
 * - Degree/Radian mode
 */

import React, { useCallback, useMemo } from 'react';
import type { JointArrayFieldProps } from '../types';

const DEFAULT_NUM_JOINTS = 6;
const DEFAULT_JOINT_NAMES = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'];
const DEFAULT_JOINT_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
];

// Default limits (radians) - typical 6-axis robot
const DEFAULT_LIMITS = {
  lower: [-Math.PI, -Math.PI / 2, -Math.PI, -Math.PI, -Math.PI / 2, -Math.PI],
  upper: [Math.PI, Math.PI / 2, Math.PI, Math.PI, Math.PI / 2, Math.PI],
};

export const JointArrayField: React.FC<JointArrayFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  hasError = false,
  highlighted = false,
  onPreviewChange,
  numJoints = DEFAULT_NUM_JOINTS,
  jointNames = DEFAULT_JOINT_NAMES,
  limits,
  colors = DEFAULT_JOINT_COLORS,
  unit = 'deg',
  showSliders = true,
  className = '',
}) => {
  // Ensure value has correct length
  const currentValue = useMemo(() => {
    const arr = value ?? [];
    if (arr.length < numJoints) {
      return [...arr, ...Array(numJoints - arr.length).fill(0)];
    }
    return arr.slice(0, numJoints);
  }, [value, numJoints]);

  // Effective limits
  const effectiveLimits = useMemo(() => {
    return limits ?? DEFAULT_LIMITS;
  }, [limits]);

  // Convert based on unit
  const toDisplay = useCallback(
    (radians: number): number => {
      return unit === 'deg' ? radians * (180 / Math.PI) : radians;
    },
    [unit]
  );

  const fromDisplay = useCallback(
    (display: number): number => {
      return unit === 'deg' ? display * (Math.PI / 180) : display;
    },
    [unit]
  );

  // Handle joint change
  const handleJointChange = useCallback(
    (index: number, displayValue: number) => {
      const radians = fromDisplay(displayValue);
      const newValue = [...currentValue];
      newValue[index] = radians;
      onChange(newValue);
    },
    [currentValue, fromDisplay, onChange]
  );

  // Handle preview
  const handlePreviewChange = useCallback(
    (index: number, displayValue: number | null) => {
      if (displayValue === null) {
        onPreviewChange?.(null);
      } else {
        const radians = fromDisplay(displayValue);
        const newValue = [...currentValue];
        newValue[index] = radians;
        onPreviewChange?.(newValue);
      }
    },
    [currentValue, fromDisplay, onPreviewChange]
  );

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  return (
    <div className={`joint-array-field ${className}`} style={containerStyle}>
      {currentValue.map((jointValue, index) => {
        const name = jointNames[index] ?? `J${index + 1}`;
        const color = colors[index % colors.length];
        const lowerLimit = effectiveLimits.lower[index] ?? -Math.PI;
        const upperLimit = effectiveLimits.upper[index] ?? Math.PI;
        const displayValue = toDisplay(jointValue);
        const displayLower = toDisplay(lowerLimit);
        const displayUpper = toDisplay(upperLimit);

        // Calculate percentage for visual indicator
        const range = upperLimit - lowerLimit;
        const percentage = range > 0 ? (jointValue - lowerLimit) / range : 0.5;
        const isNearLimit = percentage < 0.1 || percentage > 0.9;

        return (
          <JointRow
            key={index}
            index={index}
            name={name}
            color={color}
            value={displayValue}
            min={displayLower}
            max={displayUpper}
            unit={unit}
            showSlider={showSliders}
            isNearLimit={isNearLimit}
            percentage={percentage}
            disabled={disabled}
            readOnly={readOnly}
            onChange={(v) => handleJointChange(index, v)}
            onPreviewChange={(v) => handlePreviewChange(index, v)}
          />
        );
      })}
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

interface JointRowProps {
  index: number;
  name: string;
  color: string;
  value: number;
  min: number;
  max: number;
  unit: 'deg' | 'rad';
  showSlider: boolean;
  isNearLimit: boolean;
  percentage: number;
  disabled: boolean;
  readOnly: boolean;
  onChange: (value: number) => void;
  onPreviewChange: (value: number | null) => void;
}

const JointRow: React.FC<JointRowProps> = ({
  index,
  name,
  color,
  value,
  min,
  max,
  unit,
  showSlider,
  isNearLimit,
  percentage,
  disabled,
  readOnly,
  onChange,
  onPreviewChange,
}) => {
  const [inputValue, setInputValue] = React.useState(formatNumber(value));
  const [isFocused, setIsFocused] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  // Sync input with value when not focused
  React.useEffect(() => {
    if (!isFocused) {
      setInputValue(formatNumber(value));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed)) {
      onPreviewChange(clamp(parsed, min, max));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed, min, max));
    }
    onPreviewChange(null);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  const handleSliderDragStart = () => {
    setIsDragging(true);
  };

  const handleSliderDragEnd = () => {
    setIsDragging(false);
    onPreviewChange(null);
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const labelStyle: React.CSSProperties = {
    width: 28,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: `${color}15`,
    color: color,
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
    border: isNearLimit ? `2px solid ${color}` : 'none',
  };

  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flex: showSlider ? '0 0 100px' : 1,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 26,
    padding: '0 6px',
    border: `1px solid ${isFocused ? 'var(--pe-focus, #3b82f6)' : 'var(--pe-border, #d1d5db)'}`,
    borderRadius: 4,
    fontSize: 12,
    fontFamily: 'var(--font-mono, monospace)',
    textAlign: 'right',
    backgroundColor: disabled ? 'var(--pe-disabled-bg, #f3f4f6)' : 'white',
    outline: 'none',
  };

  const unitStyle: React.CSSProperties = {
    fontSize: 10,
    color: 'var(--pe-unit, #6b7280)',
    minWidth: 16,
  };

  const sliderContainerStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
    height: 20,
    display: 'flex',
    alignItems: 'center',
  };

  const sliderTrackStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'var(--pe-slider-track, #e5e7eb)',
    borderRadius: 2,
  };

  const sliderFillStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: `${percentage * 100}%`,
    height: 4,
    backgroundColor: color,
    borderRadius: 2,
    opacity: 0.5,
  };

  const sliderInputStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
    height: 20,
    margin: 0,
    appearance: 'none',
    background: 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    zIndex: 1,
  };

  return (
    <div style={rowStyle}>
      {/* Joint label */}
      <div style={labelStyle}>{name}</div>

      {/* Slider */}
      {showSlider && (
        <div style={sliderContainerStyle}>
          <div style={sliderTrackStyle} />
          <div style={sliderFillStyle} />
          <input
            type="range"
            min={min}
            max={max}
            step={unit === 'deg' ? 0.1 : 0.001}
            value={value}
            onChange={handleSliderChange}
            onMouseDown={handleSliderDragStart}
            onMouseUp={handleSliderDragEnd}
            onTouchStart={handleSliderDragStart}
            onTouchEnd={handleSliderDragEnd}
            disabled={disabled || readOnly}
            style={sliderInputStyle}
          />
        </div>
      )}

      {/* Number input */}
      <div style={inputContainerStyle}>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          style={inputStyle}
        />
        <span style={unitStyle}>{unit === 'deg' ? '°' : 'rad'}</span>
      </div>

      {/* Limit warning indicator */}
      {isNearLimit && (
        <div
          style={{
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
          }}
          title="Near joint limit"
        >
          <WarningIcon />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Icons
// =============================================================================

const WarningIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <path d="M7 1L13 12H1L7 1Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7 5v3" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="7" cy="10" r="0.75" fill="currentColor" />
  </svg>
);

// =============================================================================
// Utilities
// =============================================================================

function formatNumber(value: number): string {
  return value.toFixed(2);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

JointArrayField.displayName = 'JointArrayField';

export default JointArrayField;
