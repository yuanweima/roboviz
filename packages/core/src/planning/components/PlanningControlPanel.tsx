/**
 * PlanningControlPanel Component
 *
 * Control panel for motion planning configuration and execution.
 */

import React, { useCallback } from 'react';
import type { PlannerSettings, PlanningState } from '../hooks/usePlanningPipeline';
import type { PlannerType } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PlanningControlPanelProps {
  /** Planning state */
  state: PlanningState;
  /** Planner settings */
  settings: PlannerSettings;
  /** Update settings callback */
  onUpdateSettings: (updates: Partial<PlannerSettings>) => void;
  /** Plan callback */
  onPlan: () => void;
  /** Abort callback */
  onAbort: () => void;
  /** Clear result callback */
  onClearResult: () => void;
  /** Theme colors */
  theme?: PlanningPanelTheme;
  /** Compact mode */
  compact?: boolean;
}

export interface PlanningPanelTheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  danger: string;
}

// Default theme
const defaultPlanningTheme: PlanningPanelTheme = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  background: '#0f0f1a',
  surface: '#1a1a2e',
  text: '#e5e7eb',
  textSecondary: '#9ca3af',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// ============================================================================
// Component
// ============================================================================

export function PlanningControlPanel({
  state,
  settings,
  onUpdateSettings,
  onPlan,
  onAbort,
  onClearResult,
  theme: userTheme,
  compact = false,
}: PlanningControlPanelProps): React.ReactElement {
  const theme = { ...defaultPlanningTheme, ...userTheme };

  const handlePlannerChange = useCallback(
    (type: PlannerType) => {
      onUpdateSettings({ type });
    },
    [onUpdateSettings]
  );

  const handleToggle = useCallback(
    (key: 'enableCollisionCheck' | 'enableTrajectory') => {
      onUpdateSettings({ [key]: !settings[key] });
    },
    [settings, onUpdateSettings]
  );

  const panelStyle: React.CSSProperties = {
    background: theme.surface,
    borderRadius: 8,
    border: `1px solid ${theme.primary}40`,
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: compact ? '8px 12px' : '10px 14px',
    background: theme.background,
    borderBottom: `1px solid ${theme.primary}30`,
    fontSize: compact ? 11 : 12,
    fontWeight: 600,
    color: theme.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const bodyStyle: React.CSSProperties = {
    padding: compact ? 8 : 12,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: compact ? 6 : 10,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: compact ? 10 : 11,
    color: theme.textSecondary,
    minWidth: 80,
  };

  const getButtonStyle = (variant: 'primary' | 'secondary' | 'danger'): React.CSSProperties => ({
    padding: compact ? '4px 10px' : '6px 14px',
    fontSize: compact ? 10 : 11,
    fontWeight: 600,
    borderRadius: 4,
    cursor: 'pointer',
    background:
      variant === 'primary'
        ? theme.primary
        : variant === 'danger'
        ? theme.danger
        : 'transparent',
    color: variant === 'secondary' ? theme.textSecondary : '#fff',
    border: variant === 'secondary' ? `1px solid ${theme.textSecondary}40` : 'none',
  });

  const selectStyle: React.CSSProperties = {
    flex: 1,
    padding: compact ? '4px 8px' : '6px 10px',
    fontSize: compact ? 10 : 11,
    background: theme.background,
    color: theme.text,
    border: `1px solid ${theme.primary}40`,
    borderRadius: 4,
    outline: 'none',
  };

  const checkboxStyle: React.CSSProperties = {
    width: 14,
    height: 14,
    accentColor: theme.primary,
  };

  // Status badge
  const getStatusColor = (): string => {
    if (state.isPlanning) return theme.warning;
    if (state.result?.success) return theme.success;
    if (state.error) return theme.danger;
    if (state.ready) return theme.success;
    return theme.textSecondary;
  };

  const getStatusText = (): string => {
    if (state.isPlanning) return 'Planning...';
    if (state.result?.success) return 'Success';
    if (state.error) return 'Failed';
    if (state.ready) return 'Ready';
    return 'Idle';
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>Motion Planning</span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 10,
            background: `${getStatusColor()}20`,
            color: getStatusColor(),
            fontWeight: 500,
          }}
        >
          {getStatusText()}
        </span>
      </div>

      <div style={bodyStyle}>
        {/* Planner Selection */}
        <div style={rowStyle}>
          <span style={labelStyle}>Planner:</span>
          <select
            style={selectStyle}
            value={settings.type}
            onChange={(e) => handlePlannerChange(e.target.value as PlannerType)}
            disabled={state.isPlanning}
          >
            <option value="birrt">BiRRT</option>
            <option value="rrt-star">RRT*</option>
            <option value="prm">PRM</option>
            <option value="task-space-rrt">Task-Space RRT</option>
          </select>
        </div>

        {/* Options */}
        <div style={rowStyle}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={checkboxStyle}
              checked={settings.enableCollisionCheck}
              onChange={() => handleToggle('enableCollisionCheck')}
              disabled={state.isPlanning}
            />
            <span style={{ fontSize: compact ? 10 : 11, color: theme.text }}>Collision Check</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={checkboxStyle}
              checked={settings.enableTrajectory}
              onChange={() => handleToggle('enableTrajectory')}
              disabled={state.isPlanning}
            />
            <span style={{ fontSize: compact ? 10 : 11, color: theme.text }}>Trajectory</span>
          </label>
        </div>

        {/* Progress */}
        {state.isPlanning && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: theme.textSecondary }}>{state.stage}</span>
              <span style={{ fontSize: 10, color: theme.textSecondary }}>
                {Math.round(state.progress * 100)}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: theme.background,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${state.progress * 100}%`,
                  height: '100%',
                  background: theme.primary,
                  transition: 'width 0.1s',
                }}
              />
            </div>
            {state.message && (
              <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 4 }}>
                {state.message}
              </div>
            )}
          </div>
        )}

        {/* Result Summary */}
        {state.result?.success && !state.isPlanning && (
          <div
            style={{
              marginTop: 10,
              padding: 8,
              background: `${theme.success}10`,
              borderRadius: 4,
              border: `1px solid ${theme.success}30`,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: compact ? 4 : 8,
              }}
            >
              <div>
                <div style={{ fontSize: 9, color: theme.textSecondary }}>Waypoints</div>
                <div style={{ fontSize: 11, color: theme.text, fontWeight: 500 }}>
                  {state.result.path.length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: theme.textSecondary }}>Planning</div>
                <div style={{ fontSize: 11, color: theme.text, fontWeight: 500 }}>
                  {state.result.planningTimeMs.toFixed(0)}ms
                </div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: theme.textSecondary }}>Total</div>
                <div style={{ fontSize: 11, color: theme.text, fontWeight: 500 }}>
                  {state.result.totalTimeMs.toFixed(0)}ms
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {state.error && !state.isPlanning && (
          <div
            style={{
              marginTop: 10,
              padding: 8,
              background: `${theme.danger}20`,
              borderRadius: 4,
              fontSize: compact ? 10 : 11,
              color: theme.danger,
            }}
          >
            {state.error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {state.isPlanning ? (
            <button style={getButtonStyle('danger')} onClick={onAbort}>
              Abort
            </button>
          ) : (
            <button
              style={getButtonStyle('primary')}
              onClick={onPlan}
              disabled={!state.ready}
            >
              Plan Path
            </button>
          )}

          {state.result && !state.isPlanning && (
            <button style={getButtonStyle('secondary')} onClick={onClearResult}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlanningControlPanel;
