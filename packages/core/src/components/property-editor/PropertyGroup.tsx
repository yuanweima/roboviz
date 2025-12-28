/**
 * PropertyGroup Component
 *
 * A collapsible group of property fields.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { PropertyGroupProps, PropertyField, PropertyFieldProps } from './types';
import { PropertyRow } from './PropertyRow';
import { getFieldComponent } from './registry';

// Built-in field components
import { NumberField } from './fields/NumberField';
import { TextField } from './fields/TextField';
import { BooleanField } from './fields/BooleanField';
import { EnumField } from './fields/EnumField';
import { Position3DField } from './fields/Position3DField';
import { Pose3DField } from './fields/Pose3DField';
import { JointArrayField } from './fields/JointArrayField';

// Default field component map
// Using 'as any' to handle type differences between specific field component props
const DEFAULT_FIELD_COMPONENTS: Record<string, React.ComponentType<PropertyFieldProps<any>>> = {
  number: NumberField as any,
  text: TextField as any,
  boolean: BooleanField as any,
  enum: EnumField as any,
  position3d: Position3DField as any,
  pose3d: Pose3DField as any,
  'joint-array': JointArrayField as any,
};

export const PropertyGroup: React.FC<PropertyGroupProps> = ({
  group,
  values,
  onChange,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  errors = {},
  highlightedFields = new Set(),
  renderField,
  fieldComponents = {},
  className = '',
}) => {
  // Internal collapsed state (uncontrolled mode)
  const [internalCollapsed, setInternalCollapsed] = useState(group.defaultCollapsed ?? false);

  // Use controlled or uncontrolled
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const handleToggle = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  }, [onToggleCollapse]);

  // Filter visible fields
  const visibleFields = useMemo(() => {
    return group.fields.filter((field) => {
      if (typeof field.visible === 'function') {
        return field.visible(values);
      }
      return field.visible !== false;
    });
  }, [group.fields, values]);

  // Merge field components
  const allFieldComponents = useMemo(() => {
    return { ...DEFAULT_FIELD_COMPONENTS, ...fieldComponents };
  }, [fieldComponents]);

  // Get field component for a type
  const getComponent = useCallback(
    (type: string): React.ComponentType<PropertyFieldProps<any>> | null => {
      // Check custom components first
      if (allFieldComponents[type]) {
        return allFieldComponents[type];
      }
      // Check registry
      const registered = getFieldComponent(type);
      if (registered) {
        return registered;
      }
      // Fallback to text for unknown types
      console.warn(`Unknown field type: ${type}, falling back to text`);
      return TextField;
    },
    [allFieldComponents]
  );

  // Render a single field
  const renderFieldComponent = useCallback(
    (field: PropertyField) => {
      const FieldComponent = getComponent(field.type);
      if (!FieldComponent) return null;

      // Handle computed values - derive value from other fields
      const isComputed = typeof field.computedValue === 'function';
      const value = isComputed ? field.computedValue!(values) : values[field.key];
      const error = errors[field.key];
      const isHighlighted = highlightedFields.has(field.key);
      const isDisabled =
        typeof field.disabled === 'function' ? field.disabled(values) : field.disabled ?? false;
      // Computed fields are automatically read-only
      const isReadOnly = isComputed || field.readOnly;

      const fieldProps: PropertyFieldProps = {
        field,
        value,
        onChange: isComputed ? () => {} : (newValue) => onChange(field.key, newValue),
        disabled: isDisabled,
        readOnly: isReadOnly,
        hasError: !!error,
        errorMessage: error,
        highlighted: isHighlighted,
      };

      // Add type-specific props
      if (field.options) {
        (fieldProps as any).options = field.options;
      }
      if (field.min !== undefined) (fieldProps as any).min = field.min;
      if (field.max !== undefined) (fieldProps as any).max = field.max;
      if (field.step !== undefined) (fieldProps as any).step = field.step;
      if (field.precision !== undefined) (fieldProps as any).precision = field.precision;
      if (field.unit !== undefined) (fieldProps as any).unit = field.unit;
      if (field.placeholder !== undefined) (fieldProps as any).placeholder = field.placeholder;
      if (field.multiline !== undefined) (fieldProps as any).multiline = field.multiline;
      if (field.rows !== undefined) (fieldProps as any).rows = field.rows;
      if (field.maxLength !== undefined) (fieldProps as any).maxLength = field.maxLength;
      // Number field specific
      if (field.showSlider !== undefined) (fieldProps as any).showSlider = field.showSlider;
      // Position3D field specific
      if (field.allowLink !== undefined) (fieldProps as any).allowLink = field.allowLink;
      if (field.labels !== undefined) (fieldProps as any).labels = field.labels;

      const fieldElement = <FieldComponent {...fieldProps} />;

      // Custom field wrapper
      if (renderField) {
        return renderField(field, fieldElement);
      }

      return (
        <PropertyRow
          key={field.key}
          field={field}
          required={field.required}
          hasError={!!error}
          errorMessage={error}
          highlighted={isHighlighted}
        >
          {fieldElement}
        </PropertyRow>
      );
    },
    [values, errors, highlightedFields, onChange, getComponent, renderField]
  );

  // Don't render if group is hidden
  if (typeof group.visible === 'function' && !group.visible(values)) {
    return null;
  }
  if (group.visible === false) {
    return null;
  }

  const showHeader = group.showHeader !== false && (group.label || group.collapsible);

  const containerStyle: React.CSSProperties = {
    marginBottom: 16,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 0',
    cursor: group.collapsible ? 'pointer' : 'default',
    userSelect: 'none',
    borderBottom: '1px solid var(--pe-border, #e5e7eb)',
  };

  const contentStyle: React.CSSProperties = {
    padding: '8px 0',
    display: isCollapsed ? 'none' : 'block',
  };

  return (
    <div className={`property-group ${className}`} style={containerStyle}>
      {/* Header */}
      {showHeader && (
        <div
          style={headerStyle}
          onClick={group.collapsible ? handleToggle : undefined}
          role={group.collapsible ? 'button' : undefined}
          tabIndex={group.collapsible ? 0 : undefined}
          onKeyDown={(e) => {
            if (group.collapsible && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleToggle();
            }
          }}
          aria-expanded={!isCollapsed}
        >
          {/* Collapse indicator */}
          {group.collapsible && (
            <ChevronIcon expanded={!isCollapsed} />
          )}

          {/* Icon */}
          {group.icon && <group.icon size={16} />}

          {/* Label */}
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--pe-group-label, #1f2937)',
            }}
          >
            {group.label}
          </span>

          {/* Field count */}
          <span
            style={{
              fontSize: 11,
              color: 'var(--pe-text-secondary, #9ca3af)',
            }}
          >
            {visibleFields.length} {visibleFields.length === 1 ? 'field' : 'fields'}
          </span>
        </div>
      )}

      {/* Fields */}
      <div style={contentStyle}>
        {visibleFields.map(renderFieldComponent)}
      </div>
    </div>
  );
};

// Chevron icon
const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="currentColor"
    style={{
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.15s ease',
      color: 'var(--pe-text-secondary, #6b7280)',
    }}
  >
    <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

PropertyGroup.displayName = 'PropertyGroup';

export default PropertyGroup;
