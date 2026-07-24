/**
 * RoboViz Theme Presets
 *
 * Pre-built themes for common use cases:
 * - Dark: Default dark theme for development
 * - Light: Clean light theme for documentation
 * - Industrial: High-contrast theme for industrial environments
 */

import type { RoboVizTheme } from './types';

// ============================================================================
// Shared Base
// ============================================================================

const baseTypography: RoboVizTheme['typography'] = {
  fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  fontFamilyMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
  fontSize: {
    xs: '10px',
    sm: '11px',
    md: '13px',
    lg: '15px',
    xl: '18px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    bold: 600,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

const baseSpacing: RoboVizTheme['spacing'] = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

const baseBorderRadius: RoboVizTheme['borderRadius'] = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  full: '9999px',
};

const baseButton: RoboVizTheme['button'] = {
  height: {
    sm: 24,
    md: 32,
    lg: 40,
  },
  padding: {
    sm: '4px 8px',
    md: '6px 12px',
    lg: '8px 16px',
  },
};

const baseInput: RoboVizTheme['input'] = {
  height: {
    sm: 24,
    md: 32,
    lg: 40,
  },
  padding: '6px 8px',
};

const baseJogControl: RoboVizTheme['jogControl'] = {
  rowHeight: 32,
  labelWidth: 48,
  valueWidth: 64,
  buttonSize: 28,
  gap: 8,
};

const baseAnimation: RoboVizTheme['animation'] = {
  duration: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
  },
  easing: {
    default: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// ============================================================================
// Dark Theme (Default)
// ============================================================================

export const darkTheme: RoboVizTheme = {
  name: 'dark',

  colors: {
    primary: '#4ecdc4',
    secondary: '#667eea',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  backgrounds: {
    panel: '#1a1a2e',
    surface: '#16213e',
    input: '#0d1b2a',
    hover: '#1e3a5f',
    active: '#2a4a6f',
    disabled: '#2a2a3e',
  },

  text: {
    primary: '#ffffff',
    secondary: '#888888',
    disabled: '#555555',
    inverse: '#000000',
    label: '#aaaaaa',
  },

  borders: {
    default: '#333333',
    subtle: '#252525',
    focus: '#4ecdc4',
    error: '#ef4444',
  },

  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  button: baseButton,
  input: baseInput,
  jogControl: baseJogControl,
  animation: baseAnimation,

  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
  },
};

// ============================================================================
// Light Theme
// ============================================================================

export const lightTheme: RoboVizTheme = {
  name: 'light',

  colors: {
    primary: '#0891b2',
    secondary: '#6366f1',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  },

  backgrounds: {
    panel: '#ffffff',
    surface: '#f8fafc',
    input: '#ffffff',
    hover: '#f1f5f9',
    active: '#e2e8f0',
    disabled: '#f1f5f9',
  },

  text: {
    primary: '#0f172a',
    secondary: '#64748b',
    disabled: '#94a3b8',
    inverse: '#ffffff',
    label: '#475569',
  },

  borders: {
    default: '#e2e8f0',
    subtle: '#f1f5f9',
    focus: '#0891b2',
    error: '#dc2626',
  },

  typography: baseTypography,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  button: baseButton,
  input: baseInput,
  jogControl: baseJogControl,
  animation: baseAnimation,

  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.15)',
  },
};

// ============================================================================
// Industrial Theme (High Contrast)
// ============================================================================

export const industrialTheme: RoboVizTheme = {
  name: 'industrial',

  colors: {
    primary: '#00ff88',
    secondary: '#00aaff',
    success: '#00ff00',
    warning: '#ffaa00',
    error: '#ff0000',
    info: '#00ccff',
  },

  backgrounds: {
    panel: '#0a0a0a',
    surface: '#141414',
    input: '#000000',
    hover: '#1a1a1a',
    active: '#252525',
    disabled: '#1a1a1a',
  },

  text: {
    primary: '#ffffff',
    secondary: '#aaaaaa',
    disabled: '#666666',
    inverse: '#000000',
    label: '#cccccc',
  },

  borders: {
    default: '#333333',
    subtle: '#222222',
    focus: '#00ff88',
    error: '#ff0000',
  },

  typography: {
    ...baseTypography,
    fontFamily: "'Roboto Mono', 'Consolas', monospace",
    fontSize: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '20px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
  },

  spacing: baseSpacing,
  borderRadius: {
    ...baseBorderRadius,
    sm: 2,
    md: 4,
    lg: 6,
  },

  button: {
    height: {
      sm: 28,
      md: 36,
      lg: 44,
    },
    padding: {
      sm: '6px 10px',
      md: '8px 14px',
      lg: '10px 18px',
    },
  },

  input: {
    height: {
      sm: 28,
      md: 36,
      lg: 44,
    },
    padding: '8px 10px',
  },

  jogControl: {
    rowHeight: 36,
    labelWidth: 56,
    valueWidth: 72,
    buttonSize: 32,
    gap: 10,
  },

  animation: baseAnimation,

  shadows: {
    none: 'none',
    sm: '0 0 4px rgba(0, 255, 136, 0.2)',
    md: '0 0 8px rgba(0, 255, 136, 0.3)',
    lg: '0 0 16px rgba(0, 255, 136, 0.4)',
  },
};

// ============================================================================
// Theme Registry
// ============================================================================

export const themePresets = {
  dark: darkTheme,
  light: lightTheme,
  industrial: industrialTheme,
} as const;

export type ThemePresetName = keyof typeof themePresets;
