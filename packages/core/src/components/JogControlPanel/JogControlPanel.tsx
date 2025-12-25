/**
 * JogControlPanel Component
 *
 * Industrial-grade robot jog control panel with:
 * - Joint space and Cartesian space bidirectional sync
 * - Step-based jogging (0.1, 1, 10)
 * - Long-press continuous motion
 * - Precise numeric input
 * - IK solution selector
 * - Safety indicators
 * - Theme-aware styling
 * - Keyboard shortcuts (press ? for help)
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { JointJogRow } from './JointJogRow';
import { CartesianJogRow } from './CartesianJogRow';
import { JogShortcutsHelp } from './JogShortcutsHelp';
import { useRobotJogControl, type JogMode, type StepSize, type JogAxis } from './useRobotJogControl';
import { useJogShortcuts } from './useJogShortcuts';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import type { Pose } from '../../types';
import type { JogShortcutConfig, JogShortcutAction } from './types';
import {
  getPanelStyle,
  getHeaderStyle,
  getTitleStyle,
  getStatusDotStyle,
  getStatusTextStyle,
  getSectionLabelStyle,
  getModeButtonStyle,
  getStepButtonStyle,
  getConfigButtonStyle,
  getIKBadgeStyle,
  getSafetyWarningStyle,
  getSyncIndicatorStyle,
} from './styles';

// ============================================================================
// Types
// ============================================================================

export interface JogControlPanelProps {
  /** Robot ID for kinematics solver */
  robotId: string;
  /** Robot name from database */
  robotName: string;
  /** Initial joint angles (radians) */
  initialJoints?: number[];
  /** Joint limits */
  jointLimits?: { lower: number[]; upper: number[] };
  /** Joint names (default: J1-J6) */
  jointNames?: string[];
  /** Number of joints (default: 6) */
  numJoints?: number;
  /** Called when joints change */
  onJointsChange?: (joints: number[]) => void;
  /** Called when pose changes */
  onPoseChange?: (pose: Pose) => void;
  /** Panel style */
  style?: React.CSSProperties;
  /** Compact mode */
  compact?: boolean;
  /** Override theme (uses context theme if not provided) */
  theme?: RoboVizTheme;
  /** Joint colors (one per joint) */
  jointColors?: string[];
  /** Cartesian axis colors */
  cartesianColors?: {
    x?: string;
    y?: string;
    z?: string;
    rx?: string;
    ry?: string;
    rz?: string;
  };
  /** Enable keyboard shortcuts (default: true) */
  enableShortcuts?: boolean;
  /** Custom shortcut configuration */
  shortcuts?: JogShortcutConfig[];
  /** Callback when a shortcut is triggered */
  onShortcut?: (action: JogShortcutAction) => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StepSelectorProps {
  value: StepSize;
  onChange: (step: StepSize) => void;
  unit: string;
  disabled?: boolean;
  theme: RoboVizTheme;
}

function StepSelector({ value, onChange, unit, disabled, theme }: StepSelectorProps) {
  const steps: StepSize[] = [0.1, 1, 10];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
      <span style={{ color: theme.text.secondary, fontSize: theme.typography.fontSize.xs, marginRight: theme.spacing.xs }}>
        Step:
      </span>
      {steps.map((step) => (
        <button
          key={step}
          onClick={() => onChange(step)}
          disabled={disabled}
          style={getStepButtonStyle({ theme, isActive: value === step, disabled })}
        >
          {step}
        </button>
      ))}
      <span style={{ color: theme.text.disabled, fontSize: theme.typography.fontSize.xs, marginLeft: 2 }}>
        {unit}
      </span>
    </div>
  );
}

interface ModeSelectorProps {
  value: JogMode;
  onChange: (mode: JogMode) => void;
  disabled?: boolean;
  theme: RoboVizTheme;
}

function ModeSelector({ value, onChange, disabled, theme }: ModeSelectorProps) {
  const modes: { id: JogMode; label: string }[] = [
    { id: 'joint', label: 'JOINT' },
    { id: 'cartesian', label: 'CARTESIAN' },
  ];

  return (
    <div style={{ display: 'flex', gap: theme.spacing.xs }}>
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          disabled={disabled}
          style={getModeButtonStyle({ theme, isActive: value === mode.id, disabled })}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

interface IKConfigSelectorProps {
  solutions: number[][];
  selected: number;
  isAnalytical: boolean;
  onSelect: (index: number) => void;
  disabled?: boolean;
  theme: RoboVizTheme;
}

function IKConfigSelector({ solutions, selected, isAnalytical, onSelect, disabled, theme }: IKConfigSelectorProps) {
  if (solutions.length === 0) return null;

  return (
    <div style={{ marginTop: theme.spacing.md }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
        <span style={{ color: theme.text.secondary, fontSize: theme.typography.fontSize.xs }}>
          {solutions.length} CONFIG{solutions.length > 1 ? 'S' : ''}
        </span>
        <span style={getIKBadgeStyle(theme, isAnalytical)}>
          {isAnalytical ? 'ANALYTICAL' : 'NUMERICAL'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        {solutions.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            disabled={disabled}
            style={getConfigButtonStyle({ theme, isActive: i === selected, disabled })}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SafetyStatusProps {
  isNearSingular: boolean;
  manipulability: number;
  isReachable: boolean;
  ikError: string | null;
  theme: RoboVizTheme;
}

function SafetyStatus({ isNearSingular, isReachable, ikError, theme }: SafetyStatusProps) {
  const items: { label: string; color: string }[] = [];

  if (!isReachable) {
    items.push({ label: 'UNREACHABLE', color: theme.colors.error });
  }
  if (isNearSingular) {
    items.push({ label: 'SINGULAR', color: theme.colors.warning });
  }
  if (ikError) {
    items.push({ label: 'IK ERROR', color: theme.colors.error });
  }

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
      {items.map((item, i) => (
        <div key={i} style={getSafetyWarningStyle(theme, item.color)}>
          <span style={{ color: item.color, fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.bold }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

// Default joint limits for 6-DOF robot (radians)
const DEFAULT_JOINT_LIMITS = {
  lower: [-3.14, -1.57, -3.14, -3.14, -1.57, -3.14],
  upper: [3.14, 1.57, 3.14, 3.14, 1.57, 3.14],
};

// Default joint colors
const DEFAULT_JOINT_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ff9f43', '#a55eea', '#26de81'];

// Default Cartesian axis colors
const DEFAULT_CARTESIAN_COLORS = {
  x: '#ff6b6b',
  y: '#4ecdc4',
  z: '#45b7d1',
  rx: '#ff9f43',
  ry: '#a55eea',
  rz: '#26de81',
};

export function JogControlPanel({
  robotId,
  robotName,
  initialJoints,
  jointLimits = DEFAULT_JOINT_LIMITS,
  jointNames,
  numJoints = 6,
  onJointsChange,
  onPoseChange,
  style,
  compact = false,
  theme: themeProp,
  jointColors = DEFAULT_JOINT_COLORS,
  cartesianColors = DEFAULT_CARTESIAN_COLORS,
  enableShortcuts = true,
  shortcuts,
  onShortcut,
}: JogControlPanelProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);

  // Use jog control hook
  const [state, actions] = useRobotJogControl({
    robotId,
    robotName,
    initialJoints,
    jointLimits,
    onJointsChange,
    onPoseChange,
  });

  // Use keyboard shortcuts
  const {
    selectedJoint,
    selectedAxis,
    showingHelp,
    setShowingHelp,
    toggleHelp,
  } = useJogShortcuts({
    enabled: enableShortcuts && state.solverReady,
    shortcuts,
    actions,
    state,
    onShortcut,
  });

  // Generate joint names
  const jointLabels = useMemo(() => {
    if (jointNames) return jointNames;
    return Array.from({ length: numJoints }, (_, i) => `J${i + 1}`);
  }, [jointNames, numJoints]);

  // Merge cartesian colors with defaults
  const effectiveCartesianColors = useMemo(() => ({
    ...DEFAULT_CARTESIAN_COLORS,
    ...cartesianColors,
  }), [cartesianColors]);

  // Cartesian axes
  const cartesianAxes: { axis: JogAxis; label: string; isRotation: boolean }[] = [
    { axis: 'x', label: 'X', isRotation: false },
    { axis: 'y', label: 'Y', isRotation: false },
    { axis: 'z', label: 'Z', isRotation: false },
    { axis: 'rx', label: 'Rx', isRotation: true },
    { axis: 'ry', label: 'Ry', isRotation: true },
    { axis: 'rz', label: 'Rz', isRotation: true },
  ];

  // Get Cartesian value
  const getCartesianValue = useCallback((axis: JogAxis): number => {
    const { position, orientation } = state.currentPose;
    const euler = quaternionToEuler(orientation);

    switch (axis) {
      case 'x': return position.x;
      case 'y': return position.y;
      case 'z': return position.z;
      case 'rx': return euler.roll;
      case 'ry': return euler.pitch;
      case 'rz': return euler.yaw;
    }
  }, [state.currentPose]);

  // Handle joint value change
  const handleJointValueChange = useCallback((index: number, value: number) => {
    actions.setJointValue(index, value);
  }, [actions]);

  // Handle Cartesian value change
  const handleCartesianValueChange = useCallback((axis: JogAxis, value: number) => {
    actions.setCartesianValue(axis, value);
  }, [actions]);

  // Handle continuous jog
  const handleStartContinuousJoint = useCallback((index: number, direction: 1 | -1) => {
    actions.startContinuousJog('joint', index, direction);
  }, [actions]);

  const handleStartContinuousCartesian = useCallback((axis: JogAxis, direction: 1 | -1) => {
    actions.startContinuousJog('cartesian', axis, direction);
  }, [actions]);

  // Styles
  const panelStyle = getPanelStyle(theme, compact, style);
  const headerStyle = getHeaderStyle(theme);
  const titleStyle = getTitleStyle(theme, compact);
  const statusDotStyle = getStatusDotStyle(theme, state.solverReady);
  const statusTextStyle = getStatusTextStyle(theme, state.solverReady);
  const sectionLabelStyle = getSectionLabelStyle(theme);
  const syncIndicatorStyle = getSyncIndicatorStyle(theme);

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <h3 style={titleStyle}>
            Jog Control
          </h3>
          <div style={statusDotStyle} />
          <span style={statusTextStyle}>
            {state.solverReady ? 'READY' : 'LOADING'}
          </span>
          {/* Help button */}
          {enableShortcuts && (
            <button
              onClick={toggleHelp}
              style={{
                background: 'transparent',
                border: `1px solid ${theme.borders.subtle}`,
                borderRadius: theme.borderRadius.sm,
                color: theme.text.secondary,
                fontSize: theme.typography.fontSize.xs,
                padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
                cursor: 'pointer',
                marginLeft: theme.spacing.sm,
              }}
              title="Keyboard shortcuts (? or H)"
            >
              ?
            </button>
          )}
        </div>
        <ModeSelector
          value={state.mode}
          onChange={actions.setMode}
          disabled={!state.solverReady}
          theme={theme}
        />
      </div>

      {/* Step selector */}
      <div style={{ marginBottom: theme.spacing.lg }}>
        <StepSelector
          value={state.mode === 'joint' ? state.stepJoint : state.stepCartesian}
          onChange={state.mode === 'joint' ? actions.setStepJoint : actions.setStepCartesian}
          unit={state.mode === 'joint' ? '°' : 'mm'}
          disabled={!state.solverReady}
          theme={theme}
        />
      </div>

      {/* Joint Controls */}
      {state.mode === 'joint' && (
        <div>
          <div style={sectionLabelStyle}>
            Joint Space (deg)
            {enableShortcuts && selectedJoint !== null && (
              <span style={{
                marginLeft: theme.spacing.sm,
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.xs,
              }}>
                [J{selectedJoint + 1} selected - use ↑↓ to jog]
              </span>
            )}
          </div>
          {jointLabels.map((label, i) => (
            <JointJogRow
              key={i}
              index={i}
              label={label}
              value={state.currentJoints[i] || 0}
              lowerLimit={jointLimits.lower[i]}
              upperLimit={jointLimits.upper[i]}
              nearLimit={state.jointLimitWarnings[i]}
              onJog={actions.jogJoint}
              onValueChange={handleJointValueChange}
              onStartContinuous={handleStartContinuousJoint}
              onStopContinuous={actions.stopContinuousJog}
              color={jointColors[i % jointColors.length]}
              disabled={!state.solverReady}
              theme={theme}
              selected={enableShortcuts && selectedJoint === i}
            />
          ))}
        </div>
      )}

      {/* Cartesian Controls */}
      {state.mode === 'cartesian' && (
        <div>
          {/* Position */}
          <div style={sectionLabelStyle}>
            Position (mm)
            {enableShortcuts && selectedAxis && !selectedAxis.startsWith('r') && (
              <span style={{
                marginLeft: theme.spacing.sm,
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.xs,
              }}>
                [{selectedAxis.toUpperCase()} selected - use ↑↓ to jog]
              </span>
            )}
          </div>
          {cartesianAxes.slice(0, 3).map(({ axis, label }) => (
            <CartesianJogRow
              key={axis}
              axis={axis}
              label={label}
              value={getCartesianValue(axis)}
              isRotation={false}
              onJog={actions.jogCartesian}
              onValueChange={handleCartesianValueChange}
              onStartContinuous={handleStartContinuousCartesian}
              onStopContinuous={actions.stopContinuousJog}
              color={effectiveCartesianColors[axis]}
              disabled={!state.solverReady}
              error={!state.isReachable}
              theme={theme}
              selected={enableShortcuts && selectedAxis === axis}
            />
          ))}

          {/* Orientation */}
          <div style={{ ...sectionLabelStyle, marginTop: theme.spacing.md }}>
            Orientation (deg)
            {enableShortcuts && selectedAxis && selectedAxis.startsWith('r') && (
              <span style={{
                marginLeft: theme.spacing.sm,
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.xs,
              }}>
                [{selectedAxis.toUpperCase()} selected - use ↑↓ to jog]
              </span>
            )}
          </div>
          {cartesianAxes.slice(3).map(({ axis, label }) => (
            <CartesianJogRow
              key={axis}
              axis={axis}
              label={label}
              value={getCartesianValue(axis)}
              isRotation={true}
              onJog={actions.jogCartesian}
              onValueChange={handleCartesianValueChange}
              onStartContinuous={handleStartContinuousCartesian}
              onStopContinuous={actions.stopContinuousJog}
              color={effectiveCartesianColors[axis]}
              disabled={!state.solverReady}
              error={!state.isReachable}
              theme={theme}
              selected={enableShortcuts && selectedAxis === axis}
            />
          ))}

          {/* IK Config Selector */}
          <IKConfigSelector
            solutions={state.ikSolutions}
            selected={state.selectedConfig}
            isAnalytical={state.isAnalytical}
            onSelect={actions.setSelectedConfig}
            disabled={!state.solverReady}
            theme={theme}
          />
        </div>
      )}

      {/* Safety Status */}
      <SafetyStatus
        isNearSingular={state.isNearSingular}
        manipulability={state.manipulability}
        isReachable={state.isReachable}
        ikError={state.ikError}
        theme={theme}
      />

      {/* Sync indicator */}
      <div style={syncIndicatorStyle}>
        <span style={{ color: theme.text.disabled, fontSize: theme.typography.fontSize.xs }}>
          FK/IK SYNC
        </span>
        <span
          style={{
            color: state.isComputing ? theme.colors.warning : theme.colors.success,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.bold,
          }}
        >
          {state.isComputing ? 'COMPUTING...' : 'SYNCED'}
        </span>
      </div>

      {/* Keyboard shortcuts help panel */}
      {enableShortcuts && (
        <JogShortcutsHelp
          visible={showingHelp}
          onClose={() => setShowingHelp(false)}
          shortcuts={shortcuts}
          theme={theme}
        />
      )}
    </div>
  );
}

// Helper function (duplicated from hook for component use)
function quaternionToEuler(q: { x: number; y: number; z: number; w: number }): { roll: number; pitch: number; yaw: number } {
  const sinrCosp = 2 * (q.w * q.x + q.y * q.z);
  const cosrCosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  const sinp = 2 * (q.w * q.y - q.z * q.x);
  let pitch: number;
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * (Math.PI / 2);
  } else {
    pitch = Math.asin(sinp);
  }

  const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
  const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return { roll, pitch, yaw };
}

export default JogControlPanel;
