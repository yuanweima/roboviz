/**
 * RoboViz Theme Provider
 *
 * React context for providing theme to all RoboViz components.
 * Supports dynamic theme switching and CSS variable injection.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { RoboVizTheme } from './types';
import { darkTheme } from './presets';
import { getThemeStyleVars } from './createTheme';

// ============================================================================
// Context
// ============================================================================

interface ThemeContextValue {
  theme: RoboVizTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export interface RoboVizThemeProviderProps {
  /** Theme to provide to children */
  theme?: RoboVizTheme;
  /** Children components */
  children: React.ReactNode;
  /** Whether to inject CSS variables into a wrapper div */
  injectCssVariables?: boolean;
  /** Custom className for the wrapper div (only used when injectCssVariables is true) */
  className?: string;
  /** Custom style for the wrapper div (only used when injectCssVariables is true) */
  style?: React.CSSProperties;
}

/**
 * Provides theme context to RoboViz components.
 *
 * @example
 * ```tsx
 * import { RoboVizThemeProvider, lightTheme } from '@roboviz/core';
 *
 * function App() {
 *   return (
 *     <RoboVizThemeProvider theme={lightTheme}>
 *       <JogControlPanel {...props} />
 *     </RoboVizThemeProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With CSS variable injection for custom styling
 * <RoboVizThemeProvider theme={customTheme} injectCssVariables>
 *   <div style={{ color: 'var(--roboviz-text-primary)' }}>
 *     Custom styled content
 *   </div>
 * </RoboVizThemeProvider>
 * ```
 */
export function RoboVizThemeProvider({
  theme = darkTheme,
  children,
  injectCssVariables = false,
  className,
  style,
}: RoboVizThemeProviderProps): React.ReactElement {
  const contextValue = useMemo<ThemeContextValue>(
    () => ({ theme }),
    [theme]
  );

  const content = (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );

  if (injectCssVariables) {
    const cssVars = getThemeStyleVars(theme);
    return (
      <div
        className={className}
        style={{
          ...cssVars,
          ...style,
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the current RoboViz theme.
 *
 * @returns The current theme object
 * @throws Error if used outside of RoboVizThemeProvider
 *
 * @example
 * ```tsx
 * function CustomComponent() {
 *   const theme = useRoboVizTheme();
 *   return (
 *     <div style={{ backgroundColor: theme.backgrounds.panel }}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useRoboVizTheme(): RoboVizTheme {
  const context = useContext(ThemeContext);

  if (!context) {
    // Return default theme if no provider found (allows standalone usage)
    return darkTheme;
  }

  return context.theme;
}

/**
 * Hook to access the theme with a fallback for optional provider usage.
 * Unlike useRoboVizTheme, this never throws and always returns a valid theme.
 *
 * @param fallbackTheme - Optional fallback theme (defaults to darkTheme)
 * @returns The current theme or fallback
 *
 * @example
 * ```tsx
 * function FlexibleComponent({ theme: propTheme }) {
 *   // Uses propTheme > context theme > default theme
 *   const theme = useRoboVizThemeWithFallback(propTheme);
 *   return <div style={{ color: theme.text.primary }}>Content</div>;
 * }
 * ```
 */
export function useRoboVizThemeWithFallback(
  fallbackTheme?: RoboVizTheme
): RoboVizTheme {
  const context = useContext(ThemeContext);
  return fallbackTheme ?? context?.theme ?? darkTheme;
}
