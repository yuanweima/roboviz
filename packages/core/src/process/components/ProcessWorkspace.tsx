/**
 * ProcessWorkspace Component
 *
 * Container component that renders the active process's UI components.
 * Handles the layout of process-specific settings, visualization, and inspector.
 */

import * as React from 'react';
import { useMemo } from 'react';
import {
  useActiveProcess,
  useProcessState,
  useProcessActions,
} from '../context/ProcessProvider';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';

// ============================================================================
// Types
// ============================================================================

export interface ProcessWorkspaceProps {
  /** Override theme */
  theme?: RoboVizTheme;

  /** Custom class name for container */
  className?: string;

  /** Custom style for container */
  style?: React.CSSProperties;

  /** Whether to render settings panel */
  showSettings?: boolean;

  /** Whether to render inspector panel */
  showInspector?: boolean;

  /** Whether to render toolbar extras */
  showToolbar?: boolean;

  /** Slot for custom header content */
  header?: React.ReactNode;

  /** Slot for custom footer content */
  footer?: React.ReactNode;
}

// ============================================================================
// Styles
// ============================================================================

function getContainerStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    height: '100%',
  };
}

function getSectionStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    backgroundColor: theme.backgrounds.panel,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.borders.default}`,
    padding: theme.spacing.md,
  };
}

function getSectionHeaderStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottom: `1px solid ${theme.borders.subtle}`,
  };
}

function getSectionTitleStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    margin: 0,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily,
    color: theme.text.primary,
  };
}

function getEmptyStateStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    color: theme.text.disabled,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
  };
}

function getStatusBadgeStyle(
  theme: RoboVizTheme,
  color: string
): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    backgroundColor: `${color}20`,
    color: color,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    fontFamily: theme.typography.fontFamily,
    borderRadius: theme.borderRadius.full,
  };
}

// ============================================================================
// Status Badge Component
// ============================================================================

interface StatusBadgeProps {
  status: string;
  theme: RoboVizTheme;
}

function StatusBadge({ status, theme }: StatusBadgeProps): React.JSX.Element {
  const statusConfig: Record<string, { label: string; color: string }> = {
    idle: { label: 'Idle', color: theme.text.disabled },
    selecting: { label: 'Selecting', color: theme.colors.info },
    configuring: { label: 'Configuring', color: theme.colors.info },
    generating: { label: 'Generating...', color: theme.colors.warning },
    ready: { label: 'Ready', color: theme.colors.success },
    adjusting: { label: 'Adjusting', color: theme.colors.info },
    validating: { label: 'Validating...', color: theme.colors.warning },
    executing: { label: 'Executing', color: theme.colors.primary },
    paused: { label: 'Paused', color: theme.colors.warning },
    completed: { label: 'Completed', color: theme.colors.success },
    error: { label: 'Error', color: theme.colors.error },
  };

  const config = statusConfig[status] || { label: status, color: theme.text.secondary };

  return (
    <span style={getStatusBadgeStyle(theme, config.color)}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: config.color,
        }}
      />
      {config.label}
    </span>
  );
}

// ============================================================================
// Section Components
// ============================================================================

interface SectionProps {
  title: string;
  theme: RoboVizTheme;
  children: React.ReactNode;
  extra?: React.ReactNode;
}

function Section({
  title,
  theme,
  children,
  extra,
}: SectionProps): React.JSX.Element {
  return (
    <div style={getSectionStyle(theme)}>
      <div style={getSectionHeaderStyle(theme)}>
        <h4 style={getSectionTitleStyle(theme)}>{title}</h4>
        {extra}
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ProcessWorkspace({
  theme: themeProp,
  className,
  style,
  showSettings = true,
  showInspector = true,
  showToolbar = true,
  header,
  footer,
}: ProcessWorkspaceProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);
  const activeProcess = useActiveProcess();
  const processState = useProcessState();
  const processActions = useProcessActions();

  // No active process
  if (!activeProcess) {
    return (
      <div
        className={className}
        style={{ ...getContainerStyle(theme), ...style }}
      >
        <div style={getEmptyStateStyle(theme)}>
          <span style={{ fontSize: 48, marginBottom: theme.spacing.md }}>
            🤖
          </span>
          <p style={{ margin: 0 }}>No process selected</p>
          <p
            style={{
              margin: `${theme.spacing.sm}px 0 0`,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Select a process from the toolbar to get started
          </p>
        </div>
      </div>
    );
  }

  const { SettingsPanel, Inspector, ToolbarExtras } = activeProcess.components;
  const Icon = activeProcess.icon;

  return (
    <div
      className={className}
      style={{ ...getContainerStyle(theme), ...style }}
    >
      {/* Header */}
      {header}

      {/* Process Header */}
      <div style={getSectionStyle(theme)}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <div
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeProcess.color,
              }}
            >
              <Icon size={24} color={activeProcess.color} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  fontFamily: theme.typography.fontFamily,
                  color: theme.text.primary,
                }}
              >
                {activeProcess.name}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.text.secondary,
                  fontFamily: theme.typography.fontFamily,
                }}
              >
                {activeProcess.description}
              </p>
            </div>
          </div>

          {processState && <StatusBadge status={processState.status} theme={theme} />}
        </div>

        {/* Toolbar Extras */}
        {showToolbar && ToolbarExtras && processState && (
          <div style={{ marginTop: theme.spacing.md }}>
            <ToolbarExtras status={processState.status} />
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && SettingsPanel && processState && processActions && (
        <Section title="Settings" theme={theme}>
          <SettingsPanel
            settings={processState.settings}
            onChange={processActions.setSettings}
            disabled={
              processState.status === 'generating' ||
              processState.status === 'executing'
            }
          />
        </Section>
      )}

      {/* Inspector Panel */}
      {showInspector && Inspector && processState?.trajectoryId && (
        <Section
          title="Trajectory Inspector"
          theme={theme}
          extra={
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.text.secondary,
              }}
            >
              {/* Point count would come from trajectory store */}
            </span>
          }
        >
          <Inspector
            trajectoryId={processState.trajectoryId}
            selectedWaypointId={null} // TODO: Connect to selection state
            onSelectWaypoint={() => {}} // TODO: Connect to selection actions
          />
        </Section>
      )}

      {/* Error Display */}
      {processState?.error && (
        <div
          style={{
            ...getSectionStyle(theme),
            backgroundColor: `${theme.colors.error}10`,
            borderColor: theme.colors.error,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: theme.spacing.sm,
            }}
          >
            <span style={{ color: theme.colors.error, fontSize: 20 }}>⚠</span>
            <div>
              <h4
                style={{
                  margin: 0,
                  color: theme.colors.error,
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: theme.typography.fontWeight.bold,
                }}
              >
                Error
              </h4>
              <p
                style={{
                  margin: `${theme.spacing.xs}px 0 0`,
                  color: theme.colors.error,
                  fontSize: theme.typography.fontSize.sm,
                }}
              >
                {processState.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {footer}
    </div>
  );
}

export default ProcessWorkspace;
