/**
 * ProcessSelector Component
 *
 * UI component for switching between available processes.
 * Displays process icons and names in a horizontal or vertical list.
 */

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useProcessContext } from '../context/ProcessProvider';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import type { ProcessDefinition } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ProcessSelectorProps {
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';

  /** Show process names (default: true) */
  showNames?: boolean;

  /** Show process descriptions on hover */
  showDescriptions?: boolean;

  /** Compact mode (smaller icons) */
  compact?: boolean;

  /** Filter processes by category */
  category?: string;

  /** Custom class name */
  className?: string;

  /** Custom style */
  style?: React.CSSProperties;

  /** Override theme */
  theme?: RoboVizTheme;

  /** Callback when process is selected */
  onSelect?: (processId: string) => void;
}

// ============================================================================
// Styles
// ============================================================================

function getContainerStyle(
  theme: RoboVizTheme,
  direction: 'horizontal' | 'vertical'
): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.backgrounds.panel,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.borders.default}`,
  };
}

function getItemStyle(
  theme: RoboVizTheme,
  isActive: boolean,
  color: string,
  compact: boolean
): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: compact ? theme.spacing.xs : theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    border: `2px solid ${isActive ? color : 'transparent'}`,
    backgroundColor: isActive
      ? `${color}15`
      : theme.backgrounds.surface,
    cursor: 'pointer',
    transition: `all ${theme.animation.duration.fast} ${theme.animation.easing.default}`,
    minWidth: compact ? 48 : 64,
  };
}

function getIconContainerStyle(
  theme: RoboVizTheme,
  color: string,
  compact: boolean
): React.CSSProperties {
  const size = compact ? 24 : 32;
  return {
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color,
  };
}

function getNameStyle(
  theme: RoboVizTheme,
  isActive: boolean
): React.CSSProperties {
  return {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily,
    fontWeight: isActive
      ? theme.typography.fontWeight.bold
      : theme.typography.fontWeight.normal,
    color: isActive ? theme.text.primary : theme.text.secondary,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 80,
  };
}

function getEmptyStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    padding: theme.spacing.md,
    color: theme.text.disabled,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
  };
}

// ============================================================================
// Process Item Component
// ============================================================================

interface ProcessItemProps {
  process: ProcessDefinition;
  isActive: boolean;
  showName: boolean;
  compact: boolean;
  theme: RoboVizTheme;
  onClick: () => void;
}

function ProcessItem({
  process,
  isActive,
  showName,
  compact,
  theme,
  onClick,
}: ProcessItemProps): React.JSX.Element {
  const [isHovered, setIsHovered] = React.useState(false);

  const itemStyle = useMemo(
    () => ({
      ...getItemStyle(theme, isActive, process.color, compact),
      ...(isHovered && !isActive
        ? { backgroundColor: theme.backgrounds.hover }
        : {}),
    }),
    [theme, isActive, process.color, compact, isHovered]
  );

  const Icon = process.icon;

  return (
    <div
      style={itemStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={process.description}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div style={getIconContainerStyle(theme, process.color, compact)}>
        <Icon size={compact ? 20 : 24} color={process.color} />
      </div>
      {showName && (
        <span style={getNameStyle(theme, isActive)}>{process.name}</span>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ProcessSelector({
  direction = 'horizontal',
  showNames = true,
  showDescriptions = true,
  compact = false,
  category,
  className,
  style,
  theme: themeProp,
  onSelect,
}: ProcessSelectorProps): React.JSX.Element {
  const theme = useRoboVizThemeWithFallback(themeProp);
  const { processes, activeProcess, activateProcess } = useProcessContext();

  // Filter processes by category if specified
  const filteredProcesses = useMemo(() => {
    if (!category) return processes;
    return processes.filter((p) => p.category === category);
  }, [processes, category]);

  // Handle process selection
  const handleSelect = useCallback(
    (processId: string) => {
      activateProcess(processId);
      onSelect?.(processId);
    },
    [activateProcess, onSelect]
  );

  // Empty state
  if (filteredProcesses.length === 0) {
    return (
      <div
        className={className}
        style={{ ...getContainerStyle(theme, direction), ...style }}
      >
        <div style={getEmptyStyle(theme)}>No processes available</div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ ...getContainerStyle(theme, direction), ...style }}
      role="tablist"
      aria-label="Process selector"
    >
      {filteredProcesses.map((process) => (
        <ProcessItem
          key={process.id}
          process={process}
          isActive={activeProcess?.id === process.id}
          showName={showNames}
          compact={compact}
          theme={theme}
          onClick={() => handleSelect(process.id)}
        />
      ))}
    </div>
  );
}

export default ProcessSelector;
