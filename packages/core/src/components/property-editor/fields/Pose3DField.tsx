/**
 * Pose3DField Component
 *
 * A comprehensive field for editing 6-DOF poses (position + orientation).
 * Features:
 * - Position (X, Y, Z) editing
 * - Rotation in Euler or Quaternion mode
 * - Coordinate frame selection
 * - 3D Gizmo integration
 * - Real-time preview
 */

import React, { useCallback, useState, useMemo } from 'react';
import type { Pose3DFieldProps } from '../types';
import { NumberField } from './NumberField';

// Internal types - using object notation for easier manipulation
// These differ from the tuple-based types in coordinates module
interface Position3DObj {
  x: number;
  y: number;
  z: number;
}

interface QuaternionObj {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface EulerAnglesObj {
  x: number;
  y: number;
  z: number;
}

interface Pose3DObj {
  position: Position3DObj;
  quaternion: QuaternionObj;
}

// Default coordinate frames
const DEFAULT_FRAMES = [
  { id: 'world', label: 'World' },
  { id: 'base', label: 'Base' },
  { id: 'tool', label: 'Tool' },
];

// Axis colors
const AXIS_COLORS = {
  x: '#ef4444', // Red
  y: '#22c55e', // Green
  z: '#3b82f6', // Blue
};

export const Pose3DField: React.FC<Pose3DFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  readOnly = false,
  hasError = false,
  highlighted = false,
  onPreviewChange,
  rotationMode = 'euler',
  eulerOrder = 'XYZ',
  coordinateFrames = DEFAULT_FRAMES,
  coordinateFrame = 'world',
  onCoordinateFrameChange,
  enableGizmo = false,
  gizmoMode = 'translate',
  onGizmoModeChange,
  className = '',
}) => {
  const [expandedSection, setExpandedSection] = useState<'position' | 'rotation' | null>('position');

  // Current pose with defaults - cast to internal object types
  const currentPose: Pose3DObj = useMemo(() => {
    if (!value) {
      return {
        position: { x: 0, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      };
    }
    // Handle both object and tuple formats
    const v = value as any;
    return {
      position: Array.isArray(v.position)
        ? { x: v.position[0], y: v.position[1], z: v.position[2] }
        : v.position ?? { x: 0, y: 0, z: 0 },
      quaternion: Array.isArray(v.quaternion)
        ? { x: v.quaternion[0], y: v.quaternion[1], z: v.quaternion[2], w: v.quaternion[3] }
        : v.quaternion ?? { x: 0, y: 0, z: 0, w: 1 },
    };
  }, [value]);

  // Convert quaternion to euler for display
  const eulerAngles = useMemo(() => {
    return quaternionToEuler(currentPose.quaternion, eulerOrder);
  }, [currentPose.quaternion, eulerOrder]);

  // Handle position change
  const handlePositionChange = useCallback(
    (axis: 'x' | 'y' | 'z', newValue: number) => {
      const newPose: Pose3DObj = {
        ...currentPose,
        position: { ...currentPose.position, [axis]: newValue },
      };
      onChange(newPose as any);
    },
    [currentPose, onChange]
  );

  // Handle euler angle change
  const handleEulerChange = useCallback(
    (axis: 'x' | 'y' | 'z', degrees: number) => {
      const newEuler: EulerAnglesObj = {
        ...eulerAngles,
        [axis]: degreesToRadians(degrees),
      };
      const newQuaternion = eulerToQuaternion(newEuler, eulerOrder);
      const newPose: Pose3DObj = {
        ...currentPose,
        quaternion: newQuaternion,
      };
      onChange(newPose as any);
    },
    [currentPose, eulerAngles, eulerOrder, onChange]
  );

  // Handle quaternion change (for direct quaternion editing)
  const handleQuaternionChange = useCallback(
    (component: 'x' | 'y' | 'z' | 'w', newValue: number) => {
      const newQuaternion = { ...currentPose.quaternion, [component]: newValue };
      // Normalize quaternion
      const mag = Math.sqrt(
        newQuaternion.x ** 2 + newQuaternion.y ** 2 + newQuaternion.z ** 2 + newQuaternion.w ** 2
      );
      if (mag > 0.0001) {
        newQuaternion.x /= mag;
        newQuaternion.y /= mag;
        newQuaternion.z /= mag;
        newQuaternion.w /= mag;
      }
      const newPose: Pose3DObj = {
        ...currentPose,
        quaternion: newQuaternion,
      };
      onChange(newPose as any);
    },
    [currentPose, onChange]
  );

  // Handle preview
  const handlePreviewChange = useCallback(
    (pose: Pose3DObj | null) => {
      onPreviewChange?.(pose as any);
    },
    [onPreviewChange]
  );

  // Toggle section
  const toggleSection = (section: 'position' | 'rotation') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    border: '1px solid var(--pe-border, #e5e7eb)',
    borderRadius: 6,
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'var(--pe-header-bg, #f9fafb)',
    borderBottom: '1px solid var(--pe-border, #e5e7eb)',
  };

  return (
    <div className={`pose3d-field ${className}`} style={containerStyle}>
      {/* Toolbar */}
      <div style={headerStyle}>
        {/* Coordinate frame selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--pe-text-secondary, #6b7280)' }}>Frame:</span>
          <select
            value={coordinateFrame}
            onChange={(e) => onCoordinateFrameChange?.(e.target.value)}
            disabled={disabled || !onCoordinateFrameChange}
            style={{
              height: 24,
              padding: '0 6px',
              border: '1px solid var(--pe-border, #d1d5db)',
              borderRadius: 4,
              fontSize: 11,
              backgroundColor: 'white',
            }}
          >
            {coordinateFrames.map((frame) => (
              <option key={frame.id} value={frame.id}>
                {frame.label}
              </option>
            ))}
          </select>
        </div>

        {/* Gizmo mode toggle */}
        {enableGizmo && onGizmoModeChange && (
          <div style={{ display: 'flex', gap: 4 }}>
            <GizmoButton
              mode="translate"
              active={gizmoMode === 'translate'}
              onClick={() => onGizmoModeChange('translate')}
              disabled={disabled}
            />
            <GizmoButton
              mode="rotate"
              active={gizmoMode === 'rotate'}
              onClick={() => onGizmoModeChange('rotate')}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Position Section */}
      <Section
        title="Position"
        expanded={expandedSection === 'position'}
        onToggle={() => toggleSection('position')}
        icon={<PositionIcon />}
      >
        <AxisRow
          label="X"
          color={AXIS_COLORS.x}
          value={currentPose.position.x}
          onChange={(v) => handlePositionChange('x', v)}
          unit="mm"
          precision={2}
          disabled={disabled}
          readOnly={readOnly}
        />
        <AxisRow
          label="Y"
          color={AXIS_COLORS.y}
          value={currentPose.position.y}
          onChange={(v) => handlePositionChange('y', v)}
          unit="mm"
          precision={2}
          disabled={disabled}
          readOnly={readOnly}
        />
        <AxisRow
          label="Z"
          color={AXIS_COLORS.z}
          value={currentPose.position.z}
          onChange={(v) => handlePositionChange('z', v)}
          unit="mm"
          precision={2}
          disabled={disabled}
          readOnly={readOnly}
        />
      </Section>

      {/* Rotation Section */}
      <Section
        title="Rotation"
        expanded={expandedSection === 'rotation'}
        onToggle={() => toggleSection('rotation')}
        icon={<RotationIcon />}
        extra={
          <span style={{ fontSize: 10, color: 'var(--pe-text-secondary, #9ca3af)' }}>
            {rotationMode === 'euler' ? eulerOrder : 'QUAT'}
          </span>
        }
      >
        {rotationMode === 'euler' ? (
          <>
            <AxisRow
              label="RX"
              color={AXIS_COLORS.x}
              value={radiansToDegrees(eulerAngles.x)}
              onChange={(v) => handleEulerChange('x', v)}
              unit="°"
              precision={2}
              disabled={disabled}
              readOnly={readOnly}
            />
            <AxisRow
              label="RY"
              color={AXIS_COLORS.y}
              value={radiansToDegrees(eulerAngles.y)}
              onChange={(v) => handleEulerChange('y', v)}
              unit="°"
              precision={2}
              disabled={disabled}
              readOnly={readOnly}
            />
            <AxisRow
              label="RZ"
              color={AXIS_COLORS.z}
              value={radiansToDegrees(eulerAngles.z)}
              onChange={(v) => handleEulerChange('z', v)}
              unit="°"
              precision={2}
              disabled={disabled}
              readOnly={readOnly}
            />
          </>
        ) : (
          <>
            <AxisRow
              label="X"
              color="#6b7280"
              value={currentPose.quaternion.x}
              onChange={(v) => handleQuaternionChange('x', v)}
              precision={4}
              disabled={disabled}
              readOnly={readOnly}
              min={-1}
              max={1}
              step={0.001}
            />
            <AxisRow
              label="Y"
              color="#6b7280"
              value={currentPose.quaternion.y}
              onChange={(v) => handleQuaternionChange('y', v)}
              precision={4}
              disabled={disabled}
              readOnly={readOnly}
              min={-1}
              max={1}
              step={0.001}
            />
            <AxisRow
              label="Z"
              color="#6b7280"
              value={currentPose.quaternion.z}
              onChange={(v) => handleQuaternionChange('z', v)}
              precision={4}
              disabled={disabled}
              readOnly={readOnly}
              min={-1}
              max={1}
              step={0.001}
            />
            <AxisRow
              label="W"
              color="#6b7280"
              value={currentPose.quaternion.w}
              onChange={(v) => handleQuaternionChange('w', v)}
              precision={4}
              disabled={disabled}
              readOnly={readOnly}
              min={-1}
              max={1}
              step={0.001}
            />
          </>
        )}
      </Section>
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

interface SectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, expanded, onToggle, icon, extra, children }) => (
  <div style={{ borderBottom: '1px solid var(--pe-border, #e5e7eb)' }}>
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        border: 'none',
        backgroundColor: 'var(--pe-section-bg, #fafafa)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <ChevronIcon expanded={expanded} />
      {icon}
      <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--pe-text, #374151)' }}>
        {title}
      </span>
      {extra}
    </button>
    {expanded && (
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    )}
  </div>
);

interface AxisRowProps {
  label: string;
  color: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  precision?: number;
  disabled?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const AxisRow: React.FC<AxisRowProps> = ({
  label,
  color,
  value,
  onChange,
  unit,
  precision = 2,
  disabled,
  readOnly,
  min,
  max,
  step,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div
      style={{
        width: 24,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        backgroundColor: `${color}15`,
        color: color,
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {label}
    </div>
    <div style={{ flex: 1 }}>
      <NumberField
        field={{ key: label, type: 'number', label }}
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        precision={precision}
        unit={unit}
        min={min}
        max={max}
        step={step}
      />
    </div>
  </div>
);

// =============================================================================
// Icons
// =============================================================================

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
    <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const PositionIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="2" />
    <path d="M7 1v3M7 10v3M1 7h3M10 7h3" />
  </svg>
);

const RotationIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 7a5 5 0 11-1.5-3.5" />
    <path d="M12 2v3h-3" />
  </svg>
);

interface GizmoButtonProps {
  mode: 'translate' | 'rotate';
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const GizmoButton: React.FC<GizmoButtonProps> = ({ mode, active, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      width: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--pe-border, #d1d5db)',
      borderRadius: 4,
      backgroundColor: active ? 'var(--pe-primary, #3b82f6)' : 'white',
      color: active ? 'white' : 'var(--pe-text, #374151)',
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
    title={mode === 'translate' ? 'Move' : 'Rotate'}
  >
    {mode === 'translate' ? (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 1v12M1 7h12M7 1l-2 2M7 1l2 2M7 13l-2-2M7 13l2-2M1 7l2-2M1 7l2 2M13 7l-2-2M13 7l-2 2" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="4" />
        <path d="M7 3V1M11 7h2" />
      </svg>
    )}
  </button>
);

// =============================================================================
// Math utilities
// =============================================================================

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

function quaternionToEuler(q: QuaternionObj, order: string): EulerAnglesObj {
  // Simplified XYZ order conversion
  const { x, y, z, w } = q;

  // Roll (x-axis rotation)
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  // Pitch (y-axis rotation)
  const sinp = 2 * (w * y - z * x);
  let pitch;
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * (Math.PI / 2);
  } else {
    pitch = Math.asin(sinp);
  }

  // Yaw (z-axis rotation)
  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return { x: roll, y: pitch, z: yaw };
}

function eulerToQuaternion(euler: EulerAnglesObj, order: string): QuaternionObj {
  const { x: roll, y: pitch, z: yaw } = euler;

  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  return {
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
    w: cr * cp * cy + sr * sp * sy,
  };
}

Pose3DField.displayName = 'Pose3DField';

export default Pose3DField;
