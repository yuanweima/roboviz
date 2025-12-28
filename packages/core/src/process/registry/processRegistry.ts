/**
 * Process Registry
 *
 * Central registry for all process plugins. Provides functions to
 * register, retrieve, and list available processes.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  ProcessDefinition,
  ProcessRegistrationOptions,
  CapabilityDefinition,
  CapabilityId,
  BuiltinCapability,
} from '../types';

// ============================================================================
// Builtin Capability Definitions (lazy loaded to avoid circular deps)
// ============================================================================

/**
 * Map of builtin capability IDs to their definitions
 * These are created lazily when needed
 */
const builtinCapabilityDefinitions: Record<BuiltinCapability, () => CapabilityDefinition> = {
  'edge-selection': () => ({
    id: 'edge-selection',
    name: 'Edge Selection',
    description: 'Select edges on workpieces for seam-based processes',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: { showAllEdges: true, lineWidth: 2 },
  }),
  'surface-selection': () => ({
    id: 'surface-selection',
    name: 'Surface Selection',
    description: 'Select surfaces or regions on workpieces',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: {},
  }),
  'point-selection': () => ({
    id: 'point-selection',
    name: 'Point Selection',
    description: 'Select individual points on workpieces',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: {},
  }),
  'region-selection': () => ({
    id: 'region-selection',
    name: 'Region Selection',
    description: 'Select or draw regions on workpieces',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: {},
  }),
  'angle-lock': () => ({
    id: 'angle-lock',
    name: 'Angle Lock',
    description: 'Lock tool orientation angles for consistent processing',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: { workAngle: 15, travelAngle: 10, stickout: 15 },
  }),
  'force-control': () => ({
    id: 'force-control',
    name: 'Force Control',
    description: 'Force-based control for grinding and polishing',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: { targetForce: 10, maxForce: 50 },
  }),
  'coverage-planning': () => ({
    id: 'coverage-planning',
    name: 'Coverage Planning',
    description: 'Generate surface coverage patterns',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: {},
  }),
  'viewpoint-planning': () => ({
    id: 'viewpoint-planning',
    name: 'Viewpoint Planning',
    description: 'Camera viewpoint optimization for inspection',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: {},
  }),
  'collision-preview': () => ({
    id: 'collision-preview',
    name: 'Collision Preview',
    description: 'Preview and detect collisions in real-time',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: { enabled: true, showVolumes: false },
  }),
  'seam-tracking': () => ({
    id: 'seam-tracking',
    name: 'Seam Tracking',
    description: 'Real-time seam tracking for adaptive path following',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: { enabled: false, sensitivity: 0.5 },
  }),
  'multi-robot': () => ({
    id: 'multi-robot',
    name: 'Multi-Robot',
    description: 'Coordinate multiple robots for collaborative tasks',
    hooks: {},
    components: {},
    visualization: {},
    defaultConfig: {},
  }),
};

/**
 * Check if a capability ID is a builtin capability
 */
function isBuiltinCapability(id: CapabilityId): id is BuiltinCapability {
  return id in builtinCapabilityDefinitions;
}

/**
 * Get a builtin capability definition by ID
 */
function getBuiltinCapabilityDefinition(id: BuiltinCapability): CapabilityDefinition {
  return builtinCapabilityDefinitions[id]();
}

// ============================================================================
// Process Registry Store
// ============================================================================

/**
 * Internal store for registered processes
 */
const processStore = new Map<string, ProcessDefinition>();

/**
 * Internal store for registered capabilities
 */
const capabilityStore = new Map<CapabilityId, CapabilityDefinition>();

/**
 * Subscribers for store changes
 */
const subscribers = new Set<() => void>();

/**
 * Cached snapshots for useSyncExternalStore
 * These MUST be cached to avoid infinite loops
 * IMPORTANT: Only create new array references when content actually changes
 */
let processSnapshotCache: ProcessDefinition[] = [];
let capabilitySnapshotCache: CapabilityDefinition[] = [];
let processStoreVersion = 0;
let capabilityStoreVersion = 0;

/**
 * Update snapshot caches when store changes
 * Only creates new arrays when the version changes
 */
function updateProcessSnapshotCache(): void {
  processSnapshotCache = Array.from(processStore.values());
  processStoreVersion++;
}

function updateCapabilitySnapshotCache(): void {
  capabilitySnapshotCache = Array.from(capabilityStore.values());
  capabilityStoreVersion++;
}

/**
 * Notify all subscribers of store changes
 */
function notifySubscribers(): void {
  subscribers.forEach((callback) => callback());
}

/**
 * Subscribe to store changes
 */
function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Get current snapshot of process store (cached)
 * MUST return the same reference if store hasn't changed
 */
function getProcessSnapshot(): ProcessDefinition[] {
  return processSnapshotCache;
}

/**
 * Get current snapshot of capability store (cached)
 * MUST return the same reference if store hasn't changed
 */
function getCapabilitySnapshot(): CapabilityDefinition[] {
  return capabilitySnapshotCache;
}

// ============================================================================
// Process Registration Functions
// ============================================================================

/**
 * Register a new process plugin
 *
 * @param process - The process definition to register
 * @param options - Registration options
 * @throws Error if process with same ID exists and override is false
 *
 * @example
 * ```ts
 * import { registerProcess } from '@roboviz/core/process';
 * import { weldingProcess } from './welding';
 *
 * registerProcess(weldingProcess);
 * ```
 */
export function registerProcess(
  process: ProcessDefinition,
  options: ProcessRegistrationOptions = {}
): void {
  const { override = false } = options;

  if (processStore.has(process.id) && !override) {
    throw new Error(
      `Process with ID "${process.id}" is already registered. ` +
      `Use { override: true } to replace it.`
    );
  }

  // Auto-register missing builtin capabilities
  // This ensures processes can be registered without manual capability setup
  for (const capabilityId of process.capabilities) {
    if (!capabilityStore.has(capabilityId)) {
      if (isBuiltinCapability(capabilityId)) {
        // Auto-register builtin capability
        const definition = getBuiltinCapabilityDefinition(capabilityId);
        capabilityStore.set(capabilityId, definition);
        updateCapabilitySnapshotCache();
        console.debug(`[ProcessRegistry] Auto-registered builtin capability: ${capabilityId}`);
      } else {
        // Custom capability not registered - warn user
        console.warn(
          `Process "${process.id}" requires custom capability "${capabilityId}" ` +
          `which is not registered. Make sure to register it before using this process.`
        );
      }
    }
  }

  processStore.set(process.id, process);
  updateProcessSnapshotCache();
  notifySubscribers();

  console.debug(`[ProcessRegistry] Registered process: ${process.id}`);
}

/**
 * Unregister a process by ID
 *
 * @param processId - ID of the process to unregister
 * @returns true if process was found and removed, false otherwise
 */
export function unregisterProcess(processId: string): boolean {
  const result = processStore.delete(processId);
  if (result) {
    updateProcessSnapshotCache();
    notifySubscribers();
    console.debug(`[ProcessRegistry] Unregistered process: ${processId}`);
  }
  return result;
}

/**
 * Get a process by ID
 *
 * @param processId - ID of the process to retrieve
 * @returns The process definition or undefined if not found
 */
export function getProcess(processId: string): ProcessDefinition | undefined {
  return processStore.get(processId);
}

/**
 * Check if a process is registered
 *
 * @param processId - ID of the process to check
 * @returns true if process is registered
 */
export function hasProcess(processId: string): boolean {
  return processStore.has(processId);
}

/**
 * Get all registered processes
 *
 * @returns Array of all registered process definitions
 */
export function getAllProcesses(): ProcessDefinition[] {
  return Array.from(processStore.values());
}

/**
 * Get processes by category
 *
 * @param category - Category to filter by
 * @returns Array of processes in the given category
 */
export function getProcessesByCategory(category: string): ProcessDefinition[] {
  return Array.from(processStore.values()).filter(
    (process) => process.category === category
  );
}

/**
 * Get processes that support a specific input type
 *
 * @param inputType - Input type to filter by
 * @returns Array of processes that accept this input type
 */
export function getProcessesByInputType(
  inputType: string
): ProcessDefinition[] {
  return Array.from(processStore.values()).filter((process) =>
    process.inputTypes.includes(inputType as any)
  );
}

// ============================================================================
// Capability Registration Functions
// ============================================================================

/**
 * Register a capability module
 *
 * @param capability - The capability definition to register
 * @param options - Registration options
 */
export function registerCapability(
  capability: CapabilityDefinition,
  options: { override?: boolean } = {}
): void {
  const { override = false } = options;

  if (capabilityStore.has(capability.id) && !override) {
    throw new Error(
      `Capability with ID "${capability.id}" is already registered. ` +
      `Use { override: true } to replace it.`
    );
  }

  // Check dependencies
  if (capability.dependencies) {
    for (const depId of capability.dependencies) {
      if (!capabilityStore.has(depId)) {
        console.warn(
          `Capability "${capability.id}" depends on "${depId}" ` +
          `which is not registered yet.`
        );
      }
    }
  }

  capabilityStore.set(capability.id, capability);
  updateCapabilitySnapshotCache();
  notifySubscribers();

  console.debug(`[ProcessRegistry] Registered capability: ${capability.id}`);
}

/**
 * Unregister a capability by ID
 */
export function unregisterCapability(capabilityId: CapabilityId): boolean {
  const result = capabilityStore.delete(capabilityId);
  if (result) {
    updateCapabilitySnapshotCache();
    notifySubscribers();
    console.debug(`[ProcessRegistry] Unregistered capability: ${capabilityId}`);
  }
  return result;
}

/**
 * Get a capability by ID
 */
export function getCapability(
  capabilityId: CapabilityId
): CapabilityDefinition | undefined {
  return capabilityStore.get(capabilityId);
}

/**
 * Check if a capability is registered
 */
export function hasCapability(capabilityId: CapabilityId): boolean {
  return capabilityStore.has(capabilityId);
}

/**
 * Get all registered capabilities
 */
export function getAllCapabilities(): CapabilityDefinition[] {
  return Array.from(capabilityStore.values());
}

/**
 * Get multiple capabilities by IDs
 */
export function getCapabilities(
  capabilityIds: CapabilityId[]
): CapabilityDefinition[] {
  return capabilityIds
    .map((id) => capabilityStore.get(id))
    .filter((cap): cap is CapabilityDefinition => cap !== undefined);
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to access all registered processes
 *
 * Automatically re-renders when processes are registered/unregistered.
 *
 * @example
 * ```tsx
 * function ProcessList() {
 *   const processes = useProcessRegistry();
 *   return (
 *     <ul>
 *       {processes.map(p => <li key={p.id}>{p.name}</li>)}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useProcessRegistry(): ProcessDefinition[] {
  const [processes, setProcesses] = useState<ProcessDefinition[]>(() => processSnapshotCache);

  useEffect(() => {
    // Update on mount in case the cache changed
    setProcesses(processSnapshotCache);

    // Subscribe to changes
    const unsubscribe = subscribe(() => {
      setProcesses(processSnapshotCache);
    });

    return unsubscribe;
  }, []);

  return processes;
}

/**
 * Hook to access all registered capabilities
 */
export function useCapabilityRegistry(): CapabilityDefinition[] {
  const [capabilities, setCapabilities] = useState<CapabilityDefinition[]>(() => capabilitySnapshotCache);

  useEffect(() => {
    // Update on mount in case the cache changed
    setCapabilities(capabilitySnapshotCache);

    // Subscribe to changes
    const unsubscribe = subscribe(() => {
      setCapabilities(capabilitySnapshotCache);
    });

    return unsubscribe;
  }, []);

  return capabilities;
}

/**
 * Hook to get a specific process by ID
 */
export function useProcess(processId: string): ProcessDefinition | undefined {
  const processes = useProcessRegistry();
  return processes.find((p) => p.id === processId);
}

/**
 * Hook to get a specific capability by ID
 */
export function useCapability(
  capabilityId: CapabilityId
): CapabilityDefinition | undefined {
  const capabilities = useCapabilityRegistry();
  return capabilities.find((c) => c.id === capabilityId);
}

/**
 * Hook to get capabilities required by a process
 */
export function useProcessCapabilities(
  processId: string
): CapabilityDefinition[] {
  const process = useProcess(processId);
  const capabilities = useCapabilityRegistry();

  return useCallback(() => {
    if (!process) return [];
    return process.capabilities
      .map((id) => capabilities.find((c) => c.id === id))
      .filter((c): c is CapabilityDefinition => c !== undefined);
  }, [process, capabilities])();
}

// ============================================================================
// Clear Registry (for testing)
// ============================================================================

/**
 * Clear all registered processes and capabilities
 * WARNING: Only use for testing!
 */
export function clearRegistry(): void {
  processStore.clear();
  capabilityStore.clear();
  updateProcessSnapshotCache();
  updateCapabilitySnapshotCache();
  notifySubscribers();
  console.debug('[ProcessRegistry] Cleared all registrations');
}
