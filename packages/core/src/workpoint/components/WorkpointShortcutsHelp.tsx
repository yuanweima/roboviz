/**
 * WorkpointShortcutsHelp Component
 *
 * Floating panel displaying available keyboard shortcuts
 * for the Workpoint system.
 */

import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import {
  DEFAULT_SHORTCUTS,
  formatShortcut,
  getShortcutsByCategory,
  type ShortcutConfig,
} from '../hooks/useWorkpointShortcuts';

// ============================================================================
// Types
// ============================================================================

export interface WorkpointShortcutsHelpProps {
  /** Whether the help panel is visible */
  visible: boolean;
  /** Called when panel should close */
  onClose: () => void;
  /** Custom shortcuts (defaults to DEFAULT_SHORTCUTS) */
  shortcuts?: ShortcutConfig[];
  /** Override theme */
  theme?: RoboVizTheme;
}

// ============================================================================
// Styles
// ============================================================================

function getOverlayStyle(_theme: RoboVizTheme): React.CSSProperties {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  };
}

function getPanelStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    backgroundColor: theme.backgrounds.panel,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.borders.default}`,
    boxShadow: theme.shadows.lg,
    maxWidth: 500,
    maxHeight: '80vh',
    overflow: 'auto',
    padding: theme.spacing.lg,
  };
}

function getHeaderStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottom: `1px solid ${theme.borders.subtle}`,
  };
}

function getTitleStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    margin: 0,
    color: theme.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily,
  };
}

function getCloseButtonStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    color: theme.text.secondary,
    fontSize: theme.typography.fontSize.lg,
    cursor: 'pointer',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    lineHeight: 1,
    transition: `color ${theme.animation.duration.fast} ${theme.animation.easing.default}`,
  };
}

function getCategoryStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    marginBottom: theme.spacing.lg,
  };
}

function getCategoryTitleStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily,
  };
}

function getShortcutRowStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.xs}px 0`,
  };
}

function getDescriptionStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    color: theme.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily,
  };
}

function getKeyStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    backgroundColor: theme.backgrounds.surface,
    border: `1px solid ${theme.borders.default}`,
    borderRadius: theme.borderRadius.sm,
    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    color: theme.text.primary,
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamilyMono,
    fontWeight: theme.typography.fontWeight.medium,
    minWidth: 60,
    textAlign: 'center' as const,
  };
}

function getFooterStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTop: `1px solid ${theme.borders.subtle}`,
    color: theme.text.disabled,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center' as const,
    fontFamily: theme.typography.fontFamily,
  };
}

// ============================================================================
// Component
// ============================================================================

export function WorkpointShortcutsHelp({
  visible,
  onClose,
  shortcuts = DEFAULT_SHORTCUTS,
  theme: themeProp,
}: WorkpointShortcutsHelpProps): React.JSX.Element | null {
  const theme = useRoboVizThemeWithFallback(themeProp);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle escape key
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const shortcutsByCategory = getShortcutsByCategory(shortcuts);

  // Order of categories to display
  const categoryOrder = ['Mode', 'Creation', 'Type', 'Editing', 'Navigation'];

  return (
    <div style={getOverlayStyle(theme)} onClick={handleOverlayClick}>
      <div ref={panelRef} style={getPanelStyle(theme)}>
        {/* Header */}
        <div style={getHeaderStyle(theme)}>
          <h3 style={getTitleStyle(theme)}>Workpoint Shortcuts</h3>
          <button
            style={getCloseButtonStyle(theme)}
            onClick={onClose}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Categories */}
        {categoryOrder.map((category) => {
          const categoryShortcuts = shortcutsByCategory[category];
          if (!categoryShortcuts || categoryShortcuts.length === 0) return null;

          return (
            <div key={category} style={getCategoryStyle(theme)}>
              <div style={getCategoryTitleStyle(theme)}>{category}</div>
              {categoryShortcuts.map((shortcut, index) => (
                <div
                  key={`${shortcut.action}-${index}`}
                  style={getShortcutRowStyle(theme)}
                >
                  <span style={getDescriptionStyle(theme)}>
                    {shortcut.description}
                  </span>
                  <span style={getKeyStyle(theme)}>
                    {formatShortcut(shortcut)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Nudge shortcuts info */}
        <div style={getCategoryStyle(theme)}>
          <div style={getCategoryTitleStyle(theme)}>Nudge (Selected Point)</div>
          <div style={getShortcutRowStyle(theme)}>
            <span style={getDescriptionStyle(theme)}>Move X/Y axis</span>
            <span style={getKeyStyle(theme)}>Arrow Keys</span>
          </div>
          <div style={getShortcutRowStyle(theme)}>
            <span style={getDescriptionStyle(theme)}>Move Z axis</span>
            <span style={getKeyStyle(theme)}>PgUp/PgDn</span>
          </div>
          <div style={getShortcutRowStyle(theme)}>
            <span style={getDescriptionStyle(theme)}>Rotate</span>
            <span style={getKeyStyle(theme)}>Ctrl+Arrows</span>
          </div>
          <div style={getShortcutRowStyle(theme)}>
            <span style={getDescriptionStyle(theme)}>Coarse (10x)</span>
            <span style={getKeyStyle(theme)}>Shift+Key</span>
          </div>
          <div style={getShortcutRowStyle(theme)}>
            <span style={getDescriptionStyle(theme)}>Fine (0.1x)</span>
            <span style={getKeyStyle(theme)}>Alt+Key</span>
          </div>
        </div>

        {/* Footer */}
        <div style={getFooterStyle(theme)}>
          Press <strong>W</strong> to toggle workpoint edit mode • Press{' '}
          <strong>Esc</strong> or click outside to close
        </div>
      </div>
    </div>
  );
}

export default WorkpointShortcutsHelp;
