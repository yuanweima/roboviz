/**
 * TextField Component
 *
 * A text input field with optional multiline support.
 */

import React, { useCallback, useState, useRef } from 'react';
import type { TextFieldProps } from '../types';

export const TextField: React.FC<TextFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  hasError = false,
  errorMessage,
  highlighted = false,
  onPreviewChange,
  placeholder,
  maxLength,
  multiline = false,
  rows = 3,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Use field-level config if not explicitly provided
  const effectivePlaceholder = placeholder ?? field.placeholder;
  const effectiveMaxLength = maxLength ?? field.maxLength;
  const effectiveMultiline = multiline ?? field.multiline;
  const effectiveRows = rows ?? field.rows ?? 3;

  // Handle change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      onPreviewChange?.(newValue);
    },
    [onChange, onPreviewChange]
  );

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onPreviewChange?.(null);
  }, [onPreviewChange]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const baseStyle: React.CSSProperties = {
    width: '100%',
    minWidth: 0,
    padding: '6px 8px',
    border: `1px solid ${
      hasError
        ? 'var(--pe-error, #ef4444)'
        : highlighted
        ? 'var(--pe-highlight, #3b82f6)'
        : isFocused
        ? 'var(--pe-focus, #3b82f6)'
        : 'var(--pe-border, #d1d5db)'
    }`,
    borderRadius: 4,
    fontSize: 13,
    backgroundColor: disabled
      ? 'var(--pe-disabled-bg, #f3f4f6)'
      : 'var(--pe-input-bg, white)',
    color: disabled
      ? 'var(--pe-disabled-text, #9ca3af)'
      : 'var(--pe-text, #1f2937)',
    outline: 'none',
    resize: effectiveMultiline ? 'vertical' : 'none',
  };

  const inputStyle: React.CSSProperties = {
    ...baseStyle,
    height: 28,
  };

  const textareaStyle: React.CSSProperties = {
    ...baseStyle,
    minHeight: effectiveRows * 20 + 12,
  };

  // Character count
  const showCharCount = effectiveMaxLength !== undefined;
  const charCount = value?.length ?? 0;
  const isOverLimit = effectiveMaxLength !== undefined && charCount > effectiveMaxLength;

  if (effectiveMultiline) {
    return (
      <div className={`text-field text-field--multiline ${className}`}>
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          readOnly={readOnly}
          placeholder={effectivePlaceholder}
          maxLength={effectiveMaxLength}
          rows={effectiveRows}
          style={textareaStyle}
          aria-invalid={hasError}
          aria-describedby={errorMessage ? `${field.key}-error` : undefined}
        />
        {showCharCount && (
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              textAlign: 'right',
              color: isOverLimit
                ? 'var(--pe-error, #ef4444)'
                : 'var(--pe-text-secondary, #9ca3af)',
            }}
          >
            {charCount}/{effectiveMaxLength}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`text-field ${className}`}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={value ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={effectivePlaceholder}
        maxLength={effectiveMaxLength}
        style={inputStyle}
        aria-invalid={hasError}
        aria-describedby={errorMessage ? `${field.key}-error` : undefined}
      />
      {showCharCount && (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            textAlign: 'right',
            color: isOverLimit
              ? 'var(--pe-error, #ef4444)'
              : 'var(--pe-text-secondary, #9ca3af)',
          }}
        >
          {charCount}/{effectiveMaxLength}
        </div>
      )}
    </div>
  );
};

TextField.displayName = 'TextField';

export default TextField;
