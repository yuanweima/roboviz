/**
 * RoboViz Theme System
 *
 * Provides theming support for all RoboViz components.
 *
 * @example
 * ```tsx
 * import {
 *   RoboVizThemeProvider,
 *   useRoboVizTheme,
 *   createRoboVizTheme,
 *   darkTheme,
 *   lightTheme,
 * } from '@roboviz/core/theme';
 *
 * // Create a custom theme
 * const myTheme = createRoboVizTheme({
 *   name: 'my-theme',
 *   colors: { primary: '#ff0000' },
 * });
 *
 * // Provide theme to components
 * function App() {
 *   return (
 *     <RoboVizThemeProvider theme={myTheme}>
 *       <YourComponents />
 *     </RoboVizThemeProvider>
 *   );
 * }
 * ```
 */

// Types
export type {
  RoboVizTheme,
  ThemeOverrides,
  ColorPalette,
  BackgroundColors,
  TextColors,
  BorderColors,
  Typography,
  Spacing,
  BorderRadius,
  ButtonTokens,
  InputTokens,
  JogControlTokens,
  Animation,
  Shadows,
  DeepPartial,
} from './types';

// Theme creation
export { createRoboVizTheme, themeToCssVariables, getThemeStyleVars } from './createTheme';

// Preset themes
export { darkTheme, lightTheme, industrialTheme, themePresets } from './presets';
export type { ThemePresetName } from './presets';

// Provider and hooks
export {
  RoboVizThemeProvider,
  useRoboVizTheme,
  useRoboVizThemeWithFallback,
} from './ThemeProvider';
export type { RoboVizThemeProviderProps } from './ThemeProvider';
