/**
 * Position3DField Component
 *
 * A field for editing 3D position (X, Y, Z coordinates).
 * Supports linked mode for uniform scaling.
 *
 * Supports both formats:
 * - Object format: { x: 1, y: 2, z: 3 }
 * - Tuple format: [1, 2, 3]
 *
 * The output format matches the input format automatically.
 */

import React, { useCallback, useState, useRef } from 'react';
import type { Position3DFieldProps } from '../types';
import { NumberField } from './NumberField';

// Internal object type for easier manipulation
interface Position3DObj {
  x: number;
  y: number;
  z: number;
}

// Type for tuple format
type Position3DTuple = [number, number, number];

const DEFAULT_LABELS: [string, string, string] = ['X', 'Y', 'Z'];
const DEFAULT_COLORS = ['#ef4444', '#22c55e', '#3b82f6']; // Red, Green, Blue

export const Position3DField: React.FC<Position3DFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  hasError = false,
  highlighted = false,
  onPreviewChange,
  labels = DEFAULT_LABELS,
  unit = 'mm',
  precision = 2,
  allowLink = false,
  className = '',
}) => {
  const [isLinked, setIsLinked] = useState(false);

  // Track input format to preserve it on output
  const isTupleFormat = useRef(Array.isArray(value));

  // Update format detection when value changes externally
  React.useEffect(() => {
    isTupleFormat.current = Array.isArray(value);
  }, [value]);

  // Current values with fallback - convert from tuple or object format
  const currentValue: Position3DObj = React.useMemo(() => {
    if (!value) {
      return { x: 0, y: 0, z: 0 };
    }
    // Handle both object and tuple formats
    if (Array.isArray(value)) {
      return { x: value[0], y: value[1], z: value[2] };
    }
    return value as unknown as Position3DObj;
  }, [value]);

  // Convert internal object to output format
  const toOutputFormat = useCallback((pos: Position3DObj): Position3DObj | Position3DTuple => {
    if (isTupleFormat.current) {
      return [pos.x, pos.y, pos.z] as Position3DTuple;
    }
    return pos;
  }, []);

  // Handle individual axis change
  const handleAxisChange = useCallback(
    (axis: 'x' | 'y' | 'z', newValue: number) => {
      let newPosition: Position3DObj;

      if (isLinked) {
        // In linked mode, scale all axes by the same ratio
        const oldValue = currentValue[axis];
        if (oldValue !== 0) {
          const ratio = newValue / oldValue;
          newPosition = {
            x: currentValue.x * ratio,
            y: currentValue.y * ratio,
            z: currentValue.z * ratio,
          };
        } else {
          // If old value was 0, set all to new value
          newPosition = { x: newValue, y: newValue, z: newValue };
        }
      } else {
        newPosition = { ...currentValue, [axis]: newValue };
      }

      onChange(toOutputFormat(newPosition) as any);
    },
    [currentValue, isLinked, onChange, toOutputFormat]
  );

  // Handle preview change
  const handleAxisPreviewChange = useCallback(
    (axis: 'x' | 'y' | 'z', previewValue: number | null) => {
      if (previewValue === null) {
        onPreviewChange?.(null);
      } else {
        const previewPosition = { ...currentValue, [axis]: previewValue };
        onPreviewChange?.(toOutputFormat(previewPosition) as any);
      }
    },
    [currentValue, onPreviewChange, toOutputFormat]
  );

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const labelStyle = (color: string): React.CSSProperties => ({
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: `${color}15`,
    color: color,
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  });

  const axes: Array<{ key: 'x' | 'y' | 'z'; label: string; color: string }> = [
    { key: 'x', label: labels[0], color: DEFAULT_COLORS[0] },
    { key: 'y', label: labels[1], color: DEFAULT_COLORS[1] },
    { key: 'z', label: labels[2], color: DEFAULT_COLORS[2] },
  ];

  return (
    <div className={`position3d-field ${className}`} style={containerStyle}>
      {/* Link toggle */}
      {allowLink && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <button
            type="button"
            onClick={() => setIsLinked(!isLinked)}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              border: `1px solid ${isLinked ? 'var(--pe-primary, #3b82f6)' : 'var(--pe-border, #d1d5db)'}`,
              borderRadius: 4,
              backgroundColor: isLinked ? 'var(--pe-primary-light, #eff6ff)' : 'transparent',
              color: isLinked ? 'var(--pe-primary, #3b82f6)' : 'var(--pe-text-secondary, #6b7280)',
              fontSize: 10,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            title={isLinked ? 'Unlink axes' : 'Link axes for uniform scaling'}
          >
            <LinkIcon size={12} linked={isLinked} />
            <span>{isLinked ? 'Linked' : 'Link'}</span>
          </button>
        </div>
      )}

      {/* Axis inputs */}
      {axes.map(({ key, label, color }) => (
        <div key={key} style={rowStyle}>
          <div style={labelStyle(color)}>{label}</div>
          <div style={{ flex: 1 }}>
            <NumberField
              field={{ ...field, key: `${field.key}.${key}` }}
              value={currentValue[key]}
              onChange={(v) => handleAxisChange(key, v)}
              onPreviewChange={(v) => handleAxisPreviewChange(key, v)}
              disabled={disabled}
              readOnly={readOnly}
              hasError={hasError}
              highlighted={highlighted}
              precision={precision}
              unit={unit}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Link icon
const LinkIcon: React.FC<{ size: number; linked: boolean }> = ({ size, linked }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    {linked ? (
      <>
        <path d="M7 9L9 7" />
        <path d="M5.5 10.5L4.5 11.5C3.5 12.5 3.5 14 4.5 15C5.5 16 7 16 8 15L9 14" />
        <path d="M10.5 5.5L11.5 4.5C12.5 3.5 12.5 2 11.5 1C10.5 0 9 0 8 1L7 2" />
      </>
    ) : (
      <>
        <path d="M6 10L10 6" />
        <path d="M4.5 10.5L3.5 11.5C2.5 12.5 2.5 14 3.5 15C4.5 16 6 16 7 15L8 14" />
        <path d="M11.5 5.5L12.5 4.5C13.5 3.5 13.5 2 12.5 1C11.5 0 10 0 9 1L8 2" />
        <path d="M2 2L14 14" strokeDasharray="2 2" />
      </>
    )}
  </svg>
);

Position3DField.displayName = 'Position3DField';

export default Position3DField;
