/**
 * PropertyRow Component
 *
 * A single row in the property editor containing a label and field.
 */

import React from 'react';
import type { PropertyRowProps } from './types';

const DEFAULT_LABEL_WIDTH = 100;

export const PropertyRow: React.FC<PropertyRowProps> = ({
  field,
  labelWidth = DEFAULT_LABEL_WIDTH,
  children,
  required = false,
  hasError = false,
  errorMessage,
  highlighted = false,
  className = '',
}) => {
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '6px 0',
    backgroundColor: highlighted
      ? 'var(--pe-highlight-bg, #eff6ff)'
      : 'transparent',
    borderRadius: 4,
  };

  const labelStyle: React.CSSProperties = {
    width: labelWidth,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    paddingTop: 6, // Align with input
    fontSize: 12,
    fontWeight: 500,
    color: hasError
      ? 'var(--pe-error, #ef4444)'
      : 'var(--pe-label, #374151)',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--pe-description, #6b7280)',
    marginTop: 2,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--pe-error, #ef4444)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  return (
    <div
      className={`property-row ${className} ${hasError ? 'property-row--error' : ''} ${highlighted ? 'property-row--highlighted' : ''}`}
      style={rowStyle}
    >
      {/* Label */}
      <label style={labelStyle}>
        {field.icon && <field.icon size={14} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {field.label}
        </span>
        {required && (
          <span style={{ color: 'var(--pe-error, #ef4444)', marginLeft: 2 }}>*</span>
        )}
      </label>

      {/* Field content */}
      <div style={contentStyle}>
        {children}

        {/* Description */}
        {field.description && !hasError && (
          <div style={descriptionStyle}>{field.description}</div>
        )}

        {/* Error message */}
        {hasError && errorMessage && (
          <div style={errorStyle} id={`${field.key}-error`} role="alert">
            <ErrorIcon />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ErrorIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
    <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6 3v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="6" cy="8.5" r="0.75" />
  </svg>
);

PropertyRow.displayName = 'PropertyRow';

export default PropertyRow;
