/**
 * EnumField Component
 *
 * A field for selecting from a list of options.
 * Supports dropdown, radio buttons, or segmented control variants.
 */

import React, { useCallback, useState, useRef } from 'react';
import type { EnumFieldProps } from '../types';

export const EnumField: React.FC<EnumFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  hasError = false,
  highlighted = false,
  options,
  variant = 'dropdown',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use field-level options if not explicitly provided
  const effectiveOptions = options ?? field.options ?? [];

  // Find selected option
  const selectedOption = effectiveOptions.find((opt) => opt.value === value);

  // Handle selection
  const handleSelect = useCallback(
    (optionValue: string | number) => {
      if (!disabled && !readOnly) {
        onChange(optionValue);
        setIsOpen(false);
      }
    },
    [disabled, readOnly, onChange]
  );

  // Handle dropdown toggle
  const handleToggle = useCallback(() => {
    if (!disabled && !readOnly) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled, readOnly]);

  // Handle click outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Dropdown variant
  if (variant === 'dropdown') {
    const dropdownStyle: React.CSSProperties = {
      position: 'relative',
      width: '100%',
    };

    const buttonStyle: React.CSSProperties = {
      width: '100%',
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px',
      border: `1px solid ${
        hasError
          ? 'var(--pe-error, #ef4444)'
          : highlighted
          ? 'var(--pe-highlight, #3b82f6)'
          : isOpen
          ? 'var(--pe-focus, #3b82f6)'
          : 'var(--pe-border, #d1d5db)'
      }`,
      borderRadius: 4,
      backgroundColor: disabled
        ? 'var(--pe-disabled-bg, #f3f4f6)'
        : 'var(--pe-input-bg, white)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 13,
      color: disabled
        ? 'var(--pe-disabled-text, #9ca3af)'
        : 'var(--pe-text, #1f2937)',
    };

    const menuStyle: React.CSSProperties = {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: 'white',
      border: '1px solid var(--pe-border, #d1d5db)',
      borderRadius: 4,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 100,
      maxHeight: 200,
      overflowY: 'auto',
    };

    const optionStyle = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      backgroundColor: isSelected ? 'var(--pe-selected-bg, #eff6ff)' : 'transparent',
      color: isDisabled
        ? 'var(--pe-disabled-text, #9ca3af)'
        : 'var(--pe-text, #1f2937)',
      fontSize: 13,
    });

    return (
      <div
        ref={containerRef}
        className={`enum-field enum-field--dropdown ${className}`}
        style={dropdownStyle}
      >
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          style={buttonStyle}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption?.label ?? 'Select...'}
          </span>
          <ChevronIcon isOpen={isOpen} />
        </button>

        {isOpen && (
          <div role="listbox" style={menuStyle}>
            {effectiveOptions.map((option) => {
              const isSelected = option.value === value;
              const isOptionDisabled = option.disabled || false;

              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => !isOptionDisabled && handleSelect(option.value)}
                  style={optionStyle(isSelected, isOptionDisabled)}
                  onMouseEnter={(e) => {
                    if (!isOptionDisabled) {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        'var(--pe-hover-bg, #f3f4f6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = isSelected
                      ? 'var(--pe-selected-bg, #eff6ff)'
                      : 'transparent';
                  }}
                >
                  {option.icon && <option.icon size={14} />}
                  <span>{option.label}</span>
                  {isSelected && <CheckIcon />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Radio variant
  if (variant === 'radio') {
    return (
      <div
        className={`enum-field enum-field--radio ${className}`}
        role="radiogroup"
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {effectiveOptions.map((option) => {
          const isSelected = option.value === value;
          const isOptionDisabled = disabled || option.disabled;

          return (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: isOptionDisabled ? 'not-allowed' : 'pointer',
                opacity: isOptionDisabled ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: `2px solid ${
                    isSelected ? 'var(--pe-primary, #3b82f6)' : 'var(--pe-border, #d1d5db)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => !isOptionDisabled && handleSelect(option.value)}
              >
                {isSelected && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'var(--pe-primary, #3b82f6)',
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: 13, color: 'var(--pe-text, #1f2937)' }}>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  // Segmented variant
  return (
    <div
      className={`enum-field enum-field--segmented ${className}`}
      role="radiogroup"
      style={{
        display: 'inline-flex',
        border: `1px solid ${
          hasError
            ? 'var(--pe-error, #ef4444)'
            : highlighted
            ? 'var(--pe-highlight, #3b82f6)'
            : 'var(--pe-border, #d1d5db)'
        }`,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {effectiveOptions.map((option, index) => {
        const isSelected = option.value === value;
        const isOptionDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isOptionDisabled}
            onClick={() => handleSelect(option.value)}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderLeft: index > 0 ? '1px solid var(--pe-border, #d1d5db)' : 'none',
              backgroundColor: isSelected
                ? 'var(--pe-primary, #3b82f6)'
                : 'var(--pe-input-bg, white)',
              color: isSelected ? 'white' : 'var(--pe-text, #1f2937)',
              fontSize: 12,
              fontWeight: isSelected ? 600 : 400,
              cursor: isOptionDisabled ? 'not-allowed' : 'pointer',
              opacity: isOptionDisabled ? 0.5 : 1,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

// Icons
const ChevronIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="currentColor"
    style={{
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.15s ease',
    }}
  >
    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto' }}>
    <path
      d="M3 7L6 10L11 4"
      stroke="var(--pe-primary, #3b82f6)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

EnumField.displayName = 'EnumField';

export default EnumField;
