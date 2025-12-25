/**
 * Process Plugins
 *
 * Pre-built process plugins for common industrial applications.
 *
 * @example
 * ```tsx
 * import { registerProcess } from '@roboviz/core/process';
 * import { weldingProcess } from '@roboviz/core/processes';
 *
 * // Register processes
 * registerProcess(weldingProcess);
 * ```
 */

// Welding Process
export * from './welding';
