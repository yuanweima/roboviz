/**
 * RoboViz Theme System - Type Definitions
 *
 * Provides a flexible theming system for all RoboViz components.
 * Supports custom themes, preset themes, and CSS variable integration.
 */

// ============================================================================
// Color Palette
// ============================================================================

export interface ColorPalette {
  /** Primary accent color (buttons, active states) */
  primary: string;
  /** Secondary accent color */
  secondary: string;
  /** Success/valid state */
  success: string;
  /** Warning state */
  warning: string;
  /** Error/danger state */
  error: string;
  /** Info state */
  info: string;
}

export interface BackgroundColors {
  /** Main panel background */
  panel: string;
  /** Secondary/nested background */
  surface: string;
  /** Input field background */
  input: string;
  /** Hover state background */
  hover: string;
  /** Active/pressed state background */
  active: string;
  /** Disabled state background */
  disabled: string;
}

export interface TextColors {
  /** Primary text */
  primary: string;
  /** Secondary/muted text */
  secondary: string;
  /** Disabled text */
  disabled: string;
  /** Inverse text (on primary color) */
  inverse: string;
  /** Label text */
  label: string;
}

export interface BorderColors {
  /** Default border */
  default: string;
  /** Subtle border (lighter than default) */
  subtle: string;
  /** Focus border */
  focus: string;
  /** Error border */
  error: string;
}

// ============================================================================
// Typography
// ============================================================================

export interface Typography {
  /** Font family */
  fontFamily: string;
  /** Monospace font for numeric values */
  fontFamilyMono: string;
  /** Base font size */
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  /** Font weights */
  fontWeight: {
    normal: number;
    medium: number;
    bold: number;
  };
  /** Line heights */
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

// ============================================================================
// Spacing & Layout
// ============================================================================

export interface Spacing {
  /** Extra small spacing */
  xs: number;
  /** Small spacing */
  sm: number;
  /** Medium spacing */
  md: number;
  /** Large spacing */
  lg: number;
  /** Extra large spacing */
  xl: number;
}

export interface BorderRadius {
  /** No radius */
  none: number;
  /** Small radius */
  sm: number;
  /** Medium radius */
  md: number;
  /** Large radius */
  lg: number;
  /** Full/pill radius */
  full: string;
}

// ============================================================================
// Component-Specific Tokens
// ============================================================================

export interface ButtonTokens {
  /** Button height */
  height: {
    sm: number;
    md: number;
    lg: number;
  };
  /** Button padding */
  padding: {
    sm: string;
    md: string;
    lg: string;
  };
}

export interface InputTokens {
  /** Input height */
  height: {
    sm: number;
    md: number;
    lg: number;
  };
  /** Input padding */
  padding: string;
}

export interface JogControlTokens {
  /** Row height */
  rowHeight: number;
  /** Label width */
  labelWidth: number;
  /** Value display width */
  valueWidth: number;
  /** Button size */
  buttonSize: number;
  /** Gap between elements */
  gap: number;
}

// ============================================================================
// Animation & Transitions
// ============================================================================

export interface Animation {
  /** Transition duration */
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  /** Easing functions */
  easing: {
    default: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

// ============================================================================
// Shadows
// ============================================================================

export interface Shadows {
  /** No shadow */
  none: string;
  /** Small shadow */
  sm: string;
  /** Medium shadow */
  md: string;
  /** Large shadow */
  lg: string;
}

// ============================================================================
// Complete Theme
// ============================================================================

export interface RoboVizTheme {
  /** Theme name */
  name: string;

  /** Color palette */
  colors: ColorPalette;

  /** Background colors */
  backgrounds: BackgroundColors;

  /** Text colors */
  text: TextColors;

  /** Border colors */
  borders: BorderColors;

  /** Typography */
  typography: Typography;

  /** Spacing scale */
  spacing: Spacing;

  /** Border radius scale */
  borderRadius: BorderRadius;

  /** Button tokens */
  button: ButtonTokens;

  /** Input tokens */
  input: InputTokens;

  /** Jog control tokens */
  jogControl: JogControlTokens;

  /** Animation tokens */
  animation: Animation;

  /** Shadow tokens */
  shadows: Shadows;
}

// ============================================================================
// Theme Creation Helpers
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ThemeOverrides = DeepPartial<RoboVizTheme>;
