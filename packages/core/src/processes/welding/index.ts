/**
 * Welding Process Plugin
 *
 * Complete process plugin for robotic welding operations.
 *
 * @example
 * ```tsx
 * import { registerProcess } from '@roboviz/core/process';
 * import { weldingProcess } from '@roboviz/core/processes/welding';
 *
 * // Register the welding process
 * registerProcess(weldingProcess);
 * ```
 */

// Types
export * from './types';

// Process definition
export { weldingProcess } from './weldingProcess';

// Components
export { WeldingSettingsPanel } from './WeldingSettingsPanel';
export type { WeldingSettingsPanelProps } from './WeldingSettingsPanel';

export { WeldingVisualization } from './WeldingVisualization';
export type {
  WeldingVisualizationProps,
  WeldingVisualizationSettings,
} from './WeldingVisualization';

export { WeldingIcon } from './WeldingIcon';
export type { WeldingIconProps } from './WeldingIcon';
