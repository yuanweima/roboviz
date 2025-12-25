/**
 * TrajectoryInspector Component
 *
 * UI panel for inspecting and editing trajectory waypoints.
 * Shows a list of waypoints with status indicators and allows selection.
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import type { Trajectory, Waypoint, WaypointStatus } from '../types';
import { useTrajectoryStore } from '../store/trajectoryStore';

// ============================================================================
// Types
// ============================================================================

export interface TrajectoryInspectorProps {
  /** Trajectory to inspect */
  trajectory: Trajectory;

  /** Maximum height (scrollable) */
  maxHeight?: number;

  /** Whether to show only waypoints with issues */
  showOnlyIssues?: boolean;

  /** Override theme */
  theme?: RoboVizTheme;

  /** Called when a waypoint is selected */
  onSelectWaypoint?: (waypoint: Waypoint) => void;

  /** Called when delete is requested */
  onDeleteWaypoint?: (waypoint: Waypoint) => void;
}

// ============================================================================
// Status Configuration
// ============================================================================

interface StatusConfig {
  label: string;
  color: string;
  icon: string;
}

function getStatusConfig(status: WaypointStatus, theme: RoboVizTheme): StatusConfig {
  switch (status) {
    case 'valid':
      return { label: 'Valid', color: theme.colors.success, icon: '✓' };
    case 'collision':
      return { label: 'Collision', color: theme.colors.error, icon: '⚠' };
    case 'unreachable':
      return { label: 'Unreachable', color: theme.colors.error, icon: '✗' };
    case 'singular':
      return { label: 'Singular', color: theme.colors.warning, icon: '◎' };
    case 'near-limit':
      return { label: 'Near Limit', color: theme.colors.warning, icon: '⚡' };
    case 'warning':
      return { label: 'Warning', color: theme.colors.warning, icon: '!' };
    case 'error':
      return { label: 'Error', color: theme.colors.error, icon: '✗' };
    case 'computing':
      return { label: 'Computing...', color: theme.colors.info, icon: '◌' };
    case 'pending':
    default:
      return { label: 'Pending', color: theme.text.disabled, icon: '○' };
  }
}

// ============================================================================
// Styles
// ============================================================================

function getContainerStyle(theme: RoboVizTheme, maxHeight?: number): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
    overflowY: maxHeight ? 'auto' : undefined,
  };
}

function getHeaderStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.sm,
    borderBottom: `1px solid ${theme.borders.subtle}`,
    marginBottom: theme.spacing.sm,
  };
}

function getSummaryStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    gap: theme.spacing.md,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily,
    color: theme.text.secondary,
  };
}

function getRowStyle(
  theme: RoboVizTheme,
  isSelected: boolean,
  isHovered: boolean
): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    borderRadius: theme.borderRadius.sm,
    cursor: 'pointer',
    backgroundColor: isSelected
      ? `${theme.colors.primary}20`
      : isHovered
      ? theme.backgrounds.hover
      : 'transparent',
    border: isSelected
      ? `1px solid ${theme.colors.primary}`
      : '1px solid transparent',
    transition: `all ${theme.animation.duration.fast} ${theme.animation.easing.default}`,
  };
}

function getIndexStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    width: 32,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamilyMono,
    color: theme.text.secondary,
    textAlign: 'right',
  };
}

function getStatusIconStyle(color: string): React.CSSProperties {
  return {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color,
  };
}

function getPositionStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    flex: 1,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamilyMono,
    color: theme.text.primary,
  };
}

function getLabelStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily,
    color: theme.text.secondary,
    maxWidth: 80,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };
}

function getAdjustedBadgeStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    padding: `0 ${theme.spacing.xs}px`,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.info,
    backgroundColor: `${theme.colors.info}20`,
    borderRadius: theme.borderRadius.sm,
  };
}

function getEmptyStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    padding: theme.spacing.lg,
    textAlign: 'center',
    color: theme.text.disabled,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily,
  };
}

// ============================================================================
// Waypoint Row Component
// ============================================================================

interface WaypointRowProps {
  waypoint: Waypoint;
  isSelected: boolean;
  theme: RoboVizTheme;
  onSelect: () => void;
  onDelete?: () => void;
}

function WaypointRow({
  waypoint,
  isSelected,
  theme,
  onSelect,
}: WaypointRowProps): React.JSX.Element {
  const [isHovered, setIsHovered] = React.useState(false);
  const statusConfig = getStatusConfig(waypoint.status, theme);

  // Format position for display
  const positionStr = useMemo(() => {
    const [x, y, z] = waypoint.position.map((v) => (v * 1000).toFixed(1));
    return `${x}, ${y}, ${z}`;
  }, [waypoint.position]);

  return (
    <div
      style={getRowStyle(theme, isSelected, isHovered)}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${statusConfig.label}${waypoint.label ? ` - ${waypoint.label}` : ''}`}
    >
      {/* Index */}
      <span style={getIndexStyle(theme)}>{waypoint.index + 1}</span>

      {/* Status icon */}
      <span style={getStatusIconStyle(statusConfig.color)}>
        {statusConfig.icon}
      </span>

      {/* Position */}
      <span style={getPositionStyle(theme)}>{positionStr}</span>

      {/* Label */}
      {waypoint.label && (
        <span style={getLabelStyle(theme)}>{waypoint.label}</span>
      )}

      {/* Manually adjusted badge */}
      {waypoint.isManuallyAdjusted && (
        <span style={getAdjustedBadgeStyle(theme)}>Edited</span>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TrajectoryInspector({
  trajectory,
  maxHeight = 400,
  showOnlyIssues = false,
  theme: themeProp,
  onSelectWaypoint,
  onDeleteWaypoint,
}: TrajectoryInspectorProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);
  const selectedWaypointId = useTrajectoryStore((s) => s.selectedWaypointId);
  const selectWaypoint = useTrajectoryStore((s) => s.selectWaypoint);

  // Filter waypoints if needed
  const displayedWaypoints = useMemo(() => {
    if (!showOnlyIssues) return trajectory.waypoints;
    return trajectory.waypoints.filter(
      (wp) =>
        wp.status === 'collision' ||
        wp.status === 'unreachable' ||
        wp.status === 'singular' ||
        wp.status === 'error' ||
        wp.status === 'warning'
    );
  }, [trajectory.waypoints, showOnlyIssues]);

  // Handle waypoint selection
  const handleSelect = useCallback(
    (waypoint: Waypoint) => {
      selectWaypoint(waypoint.id);
      onSelectWaypoint?.(waypoint);
    },
    [selectWaypoint, onSelectWaypoint]
  );

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = trajectory.waypoints.length;
    const valid = trajectory.statusSummary.valid;
    const issues = trajectory.issueCount;
    const adjusted = trajectory.waypoints.filter((wp) => wp.isManuallyAdjusted).length;
    return { total, valid, issues, adjusted };
  }, [trajectory]);

  return (
    <div style={getContainerStyle(theme, maxHeight)}>
      {/* Header with stats */}
      <div style={getHeaderStyle(theme)}>
        <div style={getSummaryStyle(theme)}>
          <span>
            <strong>{stats.total}</strong> points
          </span>
          <span style={{ color: theme.colors.success }}>
            <strong>{stats.valid}</strong> valid
          </span>
          {stats.issues > 0 && (
            <span style={{ color: theme.colors.error }}>
              <strong>{stats.issues}</strong> issues
            </span>
          )}
          {stats.adjusted > 0 && (
            <span style={{ color: theme.colors.info }}>
              <strong>{stats.adjusted}</strong> edited
            </span>
          )}
        </div>
      </div>

      {/* Waypoint list */}
      {displayedWaypoints.length === 0 ? (
        <div style={getEmptyStyle(theme)}>
          {showOnlyIssues
            ? 'No issues found'
            : 'No waypoints in trajectory'}
        </div>
      ) : (
        displayedWaypoints.map((wp) => (
          <WaypointRow
            key={wp.id}
            waypoint={wp}
            isSelected={selectedWaypointId === wp.id}
            theme={theme}
            onSelect={() => handleSelect(wp)}
            onDelete={onDeleteWaypoint ? () => onDeleteWaypoint(wp) : undefined}
          />
        ))
      )}
    </div>
  );
}

export default TrajectoryInspector;
