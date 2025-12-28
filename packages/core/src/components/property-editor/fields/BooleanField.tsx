/**
 * BooleanField Component
 *
 * A boolean toggle field, displayed as either a switch or checkbox.
 */

import React, { useCallback } from 'react';
import type { BooleanFieldProps } from '../types';

export const BooleanField: React.FC<BooleanFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  hasError = false,
  highlighted = false,
  variant = 'switch',
  className = '',
}) => {
  const handleChange = useCallback(() => {
    if (!disabled && !readOnly) {
      onChange(!value);
    }
  }, [disabled, readOnly, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleChange();
      }
    },
    [handleChange]
  );

  if (variant === 'checkbox') {
    const checkboxStyle: React.CSSProperties = {
      width: 16,
      height: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px solid ${
        hasError
          ? 'var(--pe-error, #ef4444)'
          : highlighted
          ? 'var(--pe-highlight, #3b82f6)'
          : value
          ? 'var(--pe-primary, #3b82f6)'
          : 'var(--pe-border, #d1d5db)'
      }`,
      borderRadius: 3,
      backgroundColor: value
        ? 'var(--pe-primary, #3b82f6)'
        : 'var(--pe-input-bg, white)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s ease',
    };

    return (
      <div
        className={`boolean-field boolean-field--checkbox ${className}`}
        role="checkbox"
        aria-checked={value}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleChange}
        onKeyDown={handleKeyDown}
        style={checkboxStyle}
      >
        {value && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="white">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        )}
      </div>
    );
  }

  // Switch variant
  const switchWidth = 36;
  const switchHeight = 20;
  const knobSize = 16;
  const knobOffset = 2;

  const switchContainerStyle: React.CSSProperties = {
    width: switchWidth,
    height: switchHeight,
    borderRadius: switchHeight / 2,
    backgroundColor: value
      ? 'var(--pe-primary, #3b82f6)'
      : 'var(--pe-switch-off, #d1d5db)',
    border: `1px solid ${
      hasError
        ? 'var(--pe-error, #ef4444)'
        : highlighted
        ? 'var(--pe-highlight, #3b82f6)'
        : 'transparent'
    }`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 0.15s ease',
    position: 'relative',
  };

  const knobStyle: React.CSSProperties = {
    position: 'absolute',
    top: knobOffset,
    left: value ? switchWidth - knobSize - knobOffset - 2 : knobOffset,
    width: knobSize,
    height: knobSize,
    borderRadius: '50%',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'left 0.15s ease',
  };

  return (
    <div
      className={`boolean-field boolean-field--switch ${className}`}
      role="switch"
      aria-checked={value}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleChange}
      onKeyDown={handleKeyDown}
      style={switchContainerStyle}
    >
      <div style={knobStyle} />
    </div>
  );
};

BooleanField.displayName = 'BooleanField';

export default BooleanField;
