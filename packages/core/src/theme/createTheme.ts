/**
 * Theme Creation Utilities
 *
 * Provides functions to create and merge themes for RoboViz components.
 */

import type { RoboVizTheme, ThemeOverrides } from './types';
import { darkTheme } from './presets';

/**
 * Deep merge utility for theme objects
 */
function deepMerge<T extends object>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target } as T;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key as keyof T];
      const targetValue = target[key as keyof T];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as object,
          sourceValue as Partial<typeof targetValue>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Creates a custom RoboViz theme by merging overrides with a base theme.
 *
 * @param overrides - Partial theme overrides to apply
 * @param baseTheme - Base theme to extend (defaults to darkTheme)
 * @returns Complete RoboVizTheme object
 *
 * @example
 * ```tsx
 * const customTheme = createRoboVizTheme({
 *   name: 'custom',
 *   colors: {
 *     primary: '#ff6b6b',
 *   },
 *   backgrounds: {
 *     panel: '#2d2d2d',
 *   },
 * });
 * ```
 */
export function createRoboVizTheme(
  overrides: ThemeOverrides = {},
  baseTheme: RoboVizTheme = darkTheme
): RoboVizTheme {
  return deepMerge(baseTheme, overrides as Partial<RoboVizTheme>);
}

/**
 * Creates theme CSS variables from a RoboVizTheme object.
 * Useful for integrating with CSS-in-JS or custom styling solutions.
 *
 * @param theme - The theme to convert
 * @param prefix - CSS variable prefix (default: 'roboviz')
 * @returns Object mapping CSS variable names to values
 *
 * @example
 * ```tsx
 * const cssVars = themeToCssVariables(darkTheme);
 * // { '--roboviz-color-primary': '#4ecdc4', ... }
 * ```
 */
export function themeToCssVariables(
  theme: RoboVizTheme,
  prefix = 'roboviz'
): Record<string, string> {
  const vars: Record<string, string> = {};

  // Colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    vars[`--${prefix}-color-${key}`] = value;
  });

  // Backgrounds
  Object.entries(theme.backgrounds).forEach(([key, value]) => {
    vars[`--${prefix}-bg-${key}`] = value;
  });

  // Text colors
  Object.entries(theme.text).forEach(([key, value]) => {
    vars[`--${prefix}-text-${key}`] = value;
  });

  // Border colors
  Object.entries(theme.borders).forEach(([key, value]) => {
    vars[`--${prefix}-border-${key}`] = value;
  });

  // Typography
  vars[`--${prefix}-font-family`] = theme.typography.fontFamily;
  vars[`--${prefix}-font-family-mono`] = theme.typography.fontFamilyMono;
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    vars[`--${prefix}-font-size-${key}`] = value;
  });
  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    vars[`--${prefix}-font-weight-${key}`] = String(value);
  });
  Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
    vars[`--${prefix}-line-height-${key}`] = String(value);
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    vars[`--${prefix}-spacing-${key}`] = `${value}px`;
  });

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    vars[`--${prefix}-radius-${key}`] = typeof value === 'number' ? `${value}px` : value;
  });

  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    vars[`--${prefix}-shadow-${key}`] = value;
  });

  // Animation
  Object.entries(theme.animation.duration).forEach(([key, value]) => {
    vars[`--${prefix}-duration-${key}`] = value;
  });
  Object.entries(theme.animation.easing).forEach(([key, value]) => {
    vars[`--${prefix}-easing-${key}`] = value;
  });

  return vars;
}

/**
 * Injects theme CSS variables into a style object for React components.
 *
 * @param theme - The theme to use
 * @param prefix - CSS variable prefix (default: 'roboviz')
 * @returns React CSSProperties object with CSS variables
 */
export function getThemeStyleVars(
  theme: RoboVizTheme,
  prefix = 'roboviz'
): React.CSSProperties {
  return themeToCssVariables(theme, prefix) as unknown as React.CSSProperties;
}
