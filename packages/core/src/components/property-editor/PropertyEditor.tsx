/**
 * PropertyEditor Component
 *
 * The main property editor component that renders a schema-driven form
 * for editing object properties. Designed for industrial robotics applications.
 *
 * Features:
 * - Schema-driven form generation
 * - Grouped and collapsible fields
 * - Real-time validation
 * - 3D scene preview integration
 * - Custom field type support
 * - Auto-save and manual submit modes
 */

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import type { PropertyEditorProps, PropertySchema, PropertyValidationResult, PropertyValidationError } from './types';
import { PropertyGroup } from './PropertyGroup';
import { validateSchema } from './validation';

/** Dark theme CSS variables */
const DARK_THEME_VARS: Record<string, string> = {
  '--pe-bg': '#1e1e2e',
  '--pe-border': '#3f3f5a',
  '--pe-text': '#e5e7eb',
  '--pe-text-secondary': '#9ca3af',
  '--pe-label': '#d1d5db',
  '--pe-description': '#9ca3af',
  '--pe-group-label': '#e5e7eb',
  '--pe-input-bg': '#2d2d44',
  '--pe-focus': '#3b82f6',
  '--pe-highlight': '#3b82f6',
  '--pe-highlight-bg': 'rgba(59, 130, 246, 0.15)',
  '--pe-error': '#f87171',
  '--pe-error-bg': 'rgba(239, 68, 68, 0.15)',
  '--pe-error-border': '#7f1d1d',
  '--pe-primary': '#3b82f6',
  '--pe-disabled-bg': '#4b5563',
  '--pe-disabled-text': '#6b7280',
  '--pe-unit': '#9ca3af',
  '--pe-slider-track': '#4b5563',
  '--pe-button-bg': '#2d2d44',
  '--pe-button-border': '#4b5563',
  // Dropdown specific
  '--pe-dropdown-bg': '#2d2d44',
  '--pe-selected-bg': 'rgba(59, 130, 246, 0.25)',
  '--pe-hover-bg': 'rgba(255, 255, 255, 0.08)',
};

/** Light theme CSS variables */
const LIGHT_THEME_VARS: Record<string, string> = {
  '--pe-bg': '#ffffff',
  '--pe-border': '#e5e7eb',
  '--pe-text': '#374151',
  '--pe-text-secondary': '#6b7280',
  '--pe-label': '#374151',
  '--pe-description': '#6b7280',
  '--pe-group-label': '#1f2937',
  '--pe-input-bg': '#ffffff',
  '--pe-focus': '#3b82f6',
  '--pe-highlight': '#3b82f6',
  '--pe-highlight-bg': '#eff6ff',
  '--pe-error': '#dc2626',
  '--pe-error-bg': '#fef2f2',
  '--pe-error-border': '#fecaca',
  '--pe-primary': '#3b82f6',
  '--pe-disabled-bg': '#f3f4f6',
  '--pe-disabled-text': '#9ca3af',
  '--pe-unit': '#6b7280',
  '--pe-slider-track': '#e5e7eb',
  '--pe-button-bg': '#ffffff',
  '--pe-button-border': '#d1d5db',
  // Dropdown specific
  '--pe-dropdown-bg': '#ffffff',
  '--pe-selected-bg': '#eff6ff',
  '--pe-hover-bg': '#f3f4f6',
};

export function PropertyEditor<T extends Record<string, unknown> = Record<string, unknown>>({
  schema,
  value,
  onChange,
  mode = 'edit',
  autoSave = true,
  autoSaveDelay = 300,
  onSubmit,
  onReset,
  showValidation = true,
  validateOn = 'change',
  onValidationChange,
  onPreviewChange,
  highlightFields = [],
  fieldRenderers = {},
  renderGroup,
  renderFieldWrapper,
  renderActions,
  hideActions = false,
  className = '',
  style,
  compact = false,
  theme = 'auto',
}: PropertyEditorProps<T>): React.ReactElement {
  // Determine effective theme
  const effectiveTheme = theme === 'auto' ? 'dark' : theme;
  const themeVars = effectiveTheme === 'dark' ? DARK_THEME_VARS : LIGHT_THEME_VARS;
  // Validation state
  const [validationResult, setValidationResult] = useState<PropertyValidationResult>({
    valid: true,
    errors: [],
  });
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Debounce timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Original value for reset
  const originalValueRef = useRef<T>(value);

  // Highlighted fields set
  const highlightedFieldsSet = useMemo(() => new Set(highlightFields), [highlightFields]);

  // Error map by field key
  const errorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const error of validationResult.errors) {
      // Only show errors for touched fields or after submit attempt
      if (touchedFields.has(error.field) || !autoSave) {
        map[error.field] = error.message;
      }
    }
    return map;
  }, [validationResult.errors, touchedFields, autoSave]);

  // Validate on value change
  useEffect(() => {
    if (validateOn === 'change') {
      const result = validateSchema(schema, value as Record<string, unknown>);
      setValidationResult(result);
      onValidationChange?.(result);
    }
  }, [value, schema, validateOn, onValidationChange]);

  // Handle field change
  const handleFieldChange = useCallback(
    (key: string, fieldValue: unknown) => {
      // Mark field as touched
      setTouchedFields((prev) => new Set(prev).add(key));

      // Create new value
      const newValue = { ...value, [key]: fieldValue } as T;

      // Auto-save with debounce
      if (autoSave) {
        onChange(newValue);

        // Clear existing timer
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }

        // Set new timer for submit callback
        if (onSubmit) {
          saveTimerRef.current = setTimeout(() => {
            const result = validateSchema(schema, newValue as Record<string, unknown>);
            if (result.valid) {
              onSubmit(newValue);
            }
          }, autoSaveDelay);
        }
      } else {
        onChange(newValue);
      }
    },
    [value, autoSave, autoSaveDelay, onChange, onSubmit, schema]
  );

  // Handle submit
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      // Validate all fields
      const result = validateSchema(schema, value as Record<string, unknown>);
      setValidationResult(result);
      onValidationChange?.(result);

      // Mark all fields as touched
      const allKeys = schema.groups.flatMap((g) => g.fields.map((f) => f.key));
      setTouchedFields(new Set(allKeys));

      if (result.valid) {
        onSubmit?.(value);
      }
    },
    [schema, value, onSubmit, onValidationChange]
  );

  // Handle reset
  const handleReset = useCallback(() => {
    onChange(originalValueRef.current);
    setTouchedFields(new Set());
    setValidationResult({ valid: true, errors: [] });
    onReset?.();
  }, [onChange, onReset]);

  // Handle preview change (pass to parent for 3D scene)
  const handlePreviewChange = useCallback(
    (preview: Partial<T> | null) => {
      onPreviewChange?.(preview);
    },
    [onPreviewChange]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(value) !== JSON.stringify(originalValueRef.current);
  }, [value]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: compact ? 8 : 16,
    padding: compact ? 8 : 16,
    backgroundColor: 'var(--pe-bg)',
    color: 'var(--pe-text)',
    ...themeVars,
    ...style,
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 16,
    borderTop: '1px solid var(--pe-border)',
    marginTop: 8,
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: validationResult.valid
      ? 'var(--pe-primary)'
      : 'var(--pe-disabled-bg)',
    color: 'white',
    border: 'none',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    backgroundColor: 'var(--pe-button-bg)',
    color: 'var(--pe-text)',
    border: '1px solid var(--pe-button-border)',
  };

  return (
    <form
      className={`property-editor ${className} ${mode === 'view' ? 'property-editor--view' : ''}`}
      style={containerStyle}
      onSubmit={handleSubmit}
    >
      {/* Groups */}
      {schema.groups.map((group) => {
        const groupElement = (
          <PropertyGroup
            key={group.id}
            group={group}
            values={value as Record<string, unknown>}
            onChange={handleFieldChange}
            errors={errorMap}
            highlightedFields={highlightedFieldsSet}
            fieldComponents={fieldRenderers}
            renderField={renderFieldWrapper}
          />
        );

        if (renderGroup) {
          return renderGroup(group, groupElement);
        }

        return groupElement;
      })}

      {/* Validation summary */}
      {showValidation && !validationResult.valid && Object.keys(errorMap).length > 0 && (
        <div
          style={{
            padding: 12,
            backgroundColor: 'var(--pe-error-bg)',
            border: '1px solid var(--pe-error-border)',
            borderRadius: 4,
            fontSize: 12,
            color: 'var(--pe-error)',
          }}
          role="alert"
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Please fix the following errors:
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.entries(errorMap).map(([key, message]) => (
              <li key={key}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {!hideActions && mode === 'edit' && (
        <div style={actionsStyle}>
          {renderActions ? (
            renderActions()
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges}
                style={{
                  ...secondaryButtonStyle,
                  opacity: hasChanges ? 1 : 0.5,
                  cursor: hasChanges ? 'pointer' : 'not-allowed',
                }}
              >
                Reset
              </button>
              {!autoSave && (
                <button
                  type="submit"
                  disabled={!validationResult.valid}
                  style={primaryButtonStyle}
                >
                  Apply
                </button>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}

PropertyEditor.displayName = 'PropertyEditor';

export default PropertyEditor;
