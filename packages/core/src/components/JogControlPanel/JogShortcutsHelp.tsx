/**
 * JogShortcutsHelp Component
 *
 * Floating panel displaying available keyboard shortcuts
 * for the JogControlPanel.
 */

import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { useRoboVizThemeWithFallback } from '../../theme';
import type { RoboVizTheme } from '../../theme';
import {
  DEFAULT_JOG_SHORTCUTS,
  SHORTCUT_CATEGORY_NAMES,
  type JogShortcutConfig,
  type JogShortcutCategory,
} from './types';
import { formatJogShortcut, getJogShortcutsByCategory } from './useJogShortcuts';

// ============================================================================
// Types
// ============================================================================

export interface JogShortcutsHelpProps {
  /** Whether the help panel is visible */
  visible: boolean;
  /** Called when panel should close */
  onClose: () => void;
  /** Custom shortcuts (defaults to DEFAULT_JOG_SHORTCUTS) */
  shortcuts?: JogShortcutConfig[];
  /** Override theme */
  theme?: RoboVizTheme;
}

// ============================================================================
// Styles
// ============================================================================

function getOverlayStyle(theme: RoboVizTheme): React.CSSProperties {
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

export function JogShortcutsHelp({
  visible,
  onClose,
  shortcuts = DEFAULT_JOG_SHORTCUTS,
  theme: themeProp,
}: JogShortcutsHelpProps): React.JSX.Element | null {
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

  const shortcutsByCategory = getJogShortcutsByCategory(shortcuts);

  // Order of categories to display
  const categoryOrder: JogShortcutCategory[] = [
    'mode',
    'jog',
    'joint',
    'cartesian',
    'step',
    'config',
    'help',
  ];

  return (
    <div style={getOverlayStyle(theme)} onClick={handleOverlayClick}>
      <div ref={panelRef} style={getPanelStyle(theme)}>
        {/* Header */}
        <div style={getHeaderStyle(theme)}>
          <h3 style={getTitleStyle(theme)}>Keyboard Shortcuts</h3>
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
          if (categoryShortcuts.length === 0) return null;

          return (
            <div key={category} style={getCategoryStyle(theme)}>
              <div style={getCategoryTitleStyle(theme)}>
                {SHORTCUT_CATEGORY_NAMES[category]}
              </div>
              {categoryShortcuts.map((shortcut, index) => (
                <div key={`${shortcut.action}-${index}`} style={getShortcutRowStyle(theme)}>
                  <span style={getDescriptionStyle(theme)}>
                    {shortcut.description}
                  </span>
                  <span style={getKeyStyle(theme)}>
                    {formatJogShortcut(shortcut)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Footer */}
        <div style={getFooterStyle(theme)}>
          Press <strong>Esc</strong> or click outside to close
        </div>
      </div>
    </div>
  );
}

export default JogShortcutsHelp;
