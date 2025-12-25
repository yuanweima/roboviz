/**
 * Process System
 *
 * A plugin-based system for industrial robot processes like welding,
 * grinding, and inspection. Each process can register itself and provide
 * custom UI components, visualization, and protocol handlers.
 *
 * @example
 * ```tsx
 * // Register a process
 * import { registerProcess, ProcessProvider } from '@roboviz/core/process';
 * import { weldingProcess } from './welding';
 *
 * registerProcess(weldingProcess);
 *
 * // Use in app
 * function App() {
 *   return (
 *     <ProcessProvider>
 *       <ProcessSelector />
 *       <ProcessWorkspace />
 *     </ProcessProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Define a custom process
 * const myProcess: ProcessDefinition = {
 *   id: 'my-process',
 *   name: 'My Process',
 *   description: 'Custom industrial process',
 *   icon: MyIcon,
 *   color: '#ff6600',
 *   capabilities: ['edge-selection', 'collision-preview'],
 *   inputTypes: ['edge'],
 *   toolType: 'custom',
 *   defaultSettings: { speed: 100 },
 *   components: {
 *     SettingsPanel: MySettingsPanel,
 *     Visualization: MyVisualization,
 *   },
 * };
 * ```
 */

// Types
export * from './types';

// Registry
export {
  registerProcess,
  unregisterProcess,
  getProcess,
  hasProcess,
  getAllProcesses,
  getProcessesByCategory,
  getProcessesByInputType,
  registerCapability,
  unregisterCapability,
  getCapability,
  hasCapability,
  getAllCapabilities,
  getCapabilities,
  useProcessRegistry,
  useCapabilityRegistry,
  useProcess,
  useCapability,
  useProcessCapabilities,
  clearRegistry,
} from './registry/processRegistry';

// Context
export {
  ProcessProvider,
  useProcessContext,
  useActiveProcess,
  useProcessState,
  useProcessActions,
  useProcessControl,
  useIsProcessActive,
  type ProcessProviderProps,
} from './context/ProcessProvider';

// Components
export * from './components';
