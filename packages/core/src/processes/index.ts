/**
 * Process Plugins
 *
 * Pre-built process plugins for common industrial applications.
 *
 * Builtin capabilities (edge-selection, angle-lock, collision-preview, etc.)
 * are auto-registered when a process requires them - no manual setup needed.
 *
 * @example
 * ```tsx
 * import { registerProcess } from '@roboviz/core/process';
 * import { weldingProcess } from '@roboviz/core/processes';
 *
 * // Register processes - capabilities are auto-registered
 * registerProcess(weldingProcess);
 * ```
 */

// Welding Process
export * from './welding';
