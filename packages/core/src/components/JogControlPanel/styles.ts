/**
 * JogControlPanel Styled Components
 *
 * Theme-aware style utilities for jog control components.
 * Uses the RoboViz theme system for consistent styling.
 */

import type { RoboVizTheme } from '../../theme';

// ============================================================================
// Style Generators
// ============================================================================

export function getPanelStyle(
  theme: RoboVizTheme,
  compact: boolean,
  customStyle?: React.CSSProperties
): React.CSSProperties {
  return {
    background: theme.backgrounds.panel,
    borderRadius: theme.borderRadius.lg,
    padding: compact ? theme.spacing.md : theme.spacing.lg,
    fontFamily: theme.typography.fontFamily,
    ...customStyle,
  };
}

export function getHeaderStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  };
}

export function getTitleStyle(theme: RoboVizTheme, compact: boolean): React.CSSProperties {
  return {
    margin: 0,
    color: theme.colors.primary,
    fontSize: compact ? theme.typography.fontSize.md : theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  };
}

export function getStatusDotStyle(theme: RoboVizTheme, isReady: boolean): React.CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: isReady ? theme.colors.success : theme.colors.warning,
  };
}

export function getStatusTextStyle(theme: RoboVizTheme, isReady: boolean): React.CSSProperties {
  return {
    color: isReady ? theme.colors.success : theme.colors.warning,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  };
}

export function getSectionLabelStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    color: theme.text.disabled,
    fontSize: theme.typography.fontSize.xs,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
    letterSpacing: '0.5px',
  };
}

// ============================================================================
// Button Styles
// ============================================================================

export interface ButtonStyleOptions {
  theme: RoboVizTheme;
  isActive?: boolean;
  isPressed?: boolean;
  disabled?: boolean;
  warning?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function getModeButtonStyle(options: ButtonStyleOptions): React.CSSProperties {
  const { theme, isActive, disabled } = options;

  return {
    padding: theme.button.padding.md,
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    background: isActive ? theme.colors.primary : theme.backgrounds.surface,
    color: isActive ? theme.text.inverse : theme.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    letterSpacing: '1px',
    transition: `background ${theme.animation.duration.fast}`,
  };
}

export function getStepButtonStyle(options: ButtonStyleOptions): React.CSSProperties {
  const { theme, isActive, disabled } = options;

  return {
    padding: theme.button.padding.sm,
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    background: isActive ? theme.colors.primary : theme.backgrounds.disabled,
    color: isActive ? theme.text.inverse : theme.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: isActive ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: `background ${theme.animation.duration.fast}`,
  };
}

const JOG_BUTTON_SIZES = {
  small: { width: 28, height: 28, fontSize: 14 },
  medium: { width: 36, height: 36, fontSize: 18 },
  large: { width: 44, height: 44, fontSize: 22 },
};

export function getJogButtonStyle(options: ButtonStyleOptions): React.CSSProperties {
  const { theme, isPressed, disabled, warning, size = 'medium' } = options;

  const sizeStyle = JOG_BUTTON_SIZES[size];
  const baseColor = warning ? theme.colors.warning : theme.colors.primary;

  return {
    width: sizeStyle.width,
    height: sizeStyle.height,
    fontSize: sizeStyle.fontSize,
    fontWeight: theme.typography.fontWeight.bold,
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled
      ? theme.backgrounds.disabled
      : isPressed
        ? adjustBrightness(baseColor, -20)
        : baseColor,
    color: disabled ? theme.text.disabled : theme.text.inverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `background ${theme.animation.duration.fast}, transform ${theme.animation.duration.fast}`,
    transform: isPressed ? 'scale(0.95)' : 'scale(1)',
    userSelect: 'none',
  };
}

export function getConfigButtonStyle(options: ButtonStyleOptions): React.CSSProperties {
  const { theme, isActive, disabled } = options;

  return {
    width: theme.jogControl.buttonSize,
    height: theme.jogControl.buttonSize,
    border: 'none',
    borderRadius: theme.borderRadius.sm,
    background: isActive ? theme.colors.primary : theme.backgrounds.disabled,
    color: isActive ? theme.text.inverse : theme.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: isActive ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: `background ${theme.animation.duration.fast}`,
  };
}

// ============================================================================
// Input/Display Styles
// ============================================================================

export interface DisplayStyleOptions {
  theme: RoboVizTheme;
  warning?: boolean;
  error?: boolean;
  isEditing?: boolean;
  width?: number;
}

export function getNumericDisplayContainerStyle(options: DisplayStyleOptions): React.CSSProperties {
  const { theme, warning, error, isEditing, width = 100 } = options;

  let bgColor = theme.backgrounds.surface;
  if (error) {
    bgColor = adjustBrightness(theme.colors.error, -60) + '80';
  } else if (warning) {
    bgColor = adjustBrightness(theme.colors.warning, -60) + '80';
  }

  return {
    width,
    height: theme.input.height.sm,
    padding: theme.input.padding,
    background: bgColor,
    borderRadius: theme.borderRadius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    border: isEditing
      ? `1px solid ${theme.borders.focus}`
      : '1px solid transparent',
    transition: `border ${theme.animation.duration.fast}`,
  };
}

export function getNumericDisplayValueStyle(options: DisplayStyleOptions): React.CSSProperties {
  const { theme, warning, error } = options;

  let textColor = theme.text.primary;
  if (error) {
    textColor = theme.colors.error;
  } else if (warning) {
    textColor = theme.colors.warning;
  }

  return {
    color: textColor,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamilyMono,
    fontWeight: theme.typography.fontWeight.bold,
  };
}

export function getNumericInputStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    width: '100%',
    height: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: theme.text.primary,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamilyMono,
    textAlign: 'right',
  };
}

export function getUnitStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    color: theme.text.disabled,
    fontSize: theme.typography.fontSize.xs,
    marginLeft: theme.spacing.xs,
  };
}

// ============================================================================
// Row Styles
// ============================================================================

export function getJogRowStyle(theme: RoboVizTheme, disabled?: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: theme.jogControl.gap,
    padding: `${theme.spacing.xs}px 0`,
    opacity: disabled ? 0.5 : 1,
  };
}

export function getJogLabelStyle(theme: RoboVizTheme, color: string, width?: number): React.CSSProperties {
  return {
    width: width ?? theme.jogControl.labelWidth,
    color: color,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamilyMono,
  };
}

// ============================================================================
// Progress Bar Styles
// ============================================================================

export function getProgressBarContainerStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    flex: 1,
    height: 8,
    background: theme.backgrounds.panel,
    borderRadius: theme.borderRadius.sm,
    position: 'relative',
    overflow: 'hidden',
  };
}

export function getProgressBarFillStyle(
  theme: RoboVizTheme,
  percent: number,
  color: string,
  warning?: boolean
): React.CSSProperties {
  const fillColor = warning ? theme.colors.warning : color;

  return {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${percent}%`,
    background: warning
      ? `linear-gradient(to right, ${theme.colors.warning}, ${adjustBrightness(theme.colors.warning, 20)})`
      : `linear-gradient(to right, ${fillColor}44, ${fillColor})`,
    borderRadius: theme.borderRadius.sm,
    transition: `width ${theme.animation.duration.fast}`,
  };
}

export function getProgressBarIndicatorStyle(
  theme: RoboVizTheme,
  percent: number,
  color: string,
  warning?: boolean
): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${percent}%`,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 12,
    height: 12,
    background: warning ? theme.colors.warning : color,
    borderRadius: '50%',
    border: `2px solid ${theme.text.primary}`,
    boxShadow: theme.shadows.sm,
  };
}

// ============================================================================
// Status Styles
// ============================================================================

export function getIKBadgeStyle(theme: RoboVizTheme, isAnalytical: boolean): React.CSSProperties {
  return {
    fontSize: theme.typography.fontSize.xs,
    padding: '2px 6px',
    borderRadius: theme.borderRadius.sm,
    background: isAnalytical ? theme.colors.success : theme.colors.warning,
    color: theme.text.inverse,
    fontWeight: theme.typography.fontWeight.bold,
  };
}

export function getSafetyWarningStyle(theme: RoboVizTheme, color: string): React.CSSProperties {
  return {
    padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
    background: color + '33',
    borderRadius: theme.borderRadius.sm,
    borderLeft: `3px solid ${color}`,
  };
}

export function getSyncIndicatorStyle(theme: RoboVizTheme): React.CSSProperties {
  return {
    marginTop: theme.spacing.md,
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    background: theme.backgrounds.surface,
    borderRadius: theme.borderRadius.sm,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Adjusts the brightness of a hex color
 */
function adjustBrightness(hex: string, amount: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Adjust and clamp
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
