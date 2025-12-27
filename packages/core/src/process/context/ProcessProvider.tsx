/**
 * ProcessProvider
 *
 * React context provider for the process system. Manages the currently
 * active process and its state.
 */

import * as React from 'react';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import {
  getAllProcesses,
  getProcess,
  hasProcess,
} from '../registry/processRegistry';
import type {
  ProcessDefinition,
  ProcessState,
  ProcessActions,
  ProcessStatus,
  ProcessContextValue,
  ValidationResult,
} from '../types';

// ============================================================================
// Context
// ============================================================================

const ProcessContext = createContext<ProcessContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

export interface ProcessProviderProps {
  /** Child components */
  children: React.ReactNode;

  /** Initial process to activate (optional) */
  initialProcessId?: string;

  /** Callback when active process changes */
  onProcessChange?: (processId: string | null) => void;

  /** Callback when process state changes */
  onStateChange?: (state: ProcessState | null) => void;
}

// ============================================================================
// Provider Component
// ============================================================================

export function ProcessProvider({
  children,
  initialProcessId,
  onProcessChange,
  onStateChange,
}: ProcessProviderProps): React.JSX.Element {
  // Note: We use getAllProcesses() directly instead of useProcessRegistry() hook
  // to avoid infinite render loops. The processes list is only needed for the
  // context value and doesn't need to trigger re-renders.
  const processesRef = useRef<ProcessDefinition[]>([]);

  // Active process
  const [activeProcessId, setActiveProcessId] = useState<string | null>(
    initialProcessId ?? null
  );

  // Process state
  const [processState, setProcessState] = useState<ProcessState | null>(null);

  // Ref to track if we're in the middle of an async operation
  const operationRef = useRef<AbortController | null>(null);

  // Ref for callbacks to avoid circular dependencies
  const activeProcessIdRef = useRef(activeProcessId);
  activeProcessIdRef.current = activeProcessId;

  // Get active process definition (don't depend on processes array to avoid re-renders)
  const activeProcess = useMemo(() => {
    if (!activeProcessId) return null;
    return getProcess(activeProcessId) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProcessId]);

  // Ref for active process to use in callbacks
  const activeProcessRef = useRef(activeProcess);
  activeProcessRef.current = activeProcess;

  // Create initial state for a process
  const createInitialState = useCallback(
    <TInput, TSettings>(
      process: ProcessDefinition<TInput, TSettings>
    ): ProcessState<TInput, TSettings> => ({
      processId: process.id,
      status: 'idle',
      input: null,
      settings: process.defaultSettings,
      trajectoryId: null,
      progress: 0,
      error: null,
      lastUpdated: Date.now(),
    }),
    []
  );

  // Activate a process (use refs to avoid circular dependencies)
  const activateProcess = useCallback(
    async (processId: string) => {
      // Check if process exists
      if (!hasProcess(processId)) {
        console.error(`[ProcessProvider] Process not found: ${processId}`);
        return;
      }

      // Cancel any ongoing operation
      if (operationRef.current) {
        operationRef.current.abort();
        operationRef.current = null;
      }

      // Deactivate current process (use ref)
      const currentProcess = activeProcessRef.current;
      if (currentProcess?.onDeactivate) {
        try {
          await currentProcess.onDeactivate();
        } catch (error) {
          console.error(
            `[ProcessProvider] Error deactivating process ${activeProcessIdRef.current}:`,
            error
          );
        }
      }

      // Get new process
      const process = getProcess(processId);
      if (!process) return;

      // Create initial state
      const newState = createInitialState(process);
      setProcessState(newState);
      setActiveProcessId(processId);

      // Notify callback
      onProcessChange?.(processId);
      onStateChange?.(newState);

      // Call activation hook
      if (process.onActivate) {
        try {
          await process.onActivate();
        } catch (error) {
          console.error(
            `[ProcessProvider] Error activating process ${processId}:`,
            error
          );
        }
      }

      console.debug(`[ProcessProvider] Activated process: ${processId}`);
    },
    [createInitialState, onProcessChange, onStateChange]
  );

  // Deactivate current process (use refs to avoid circular dependencies)
  const deactivateProcess = useCallback(async () => {
    // Cancel any ongoing operation
    if (operationRef.current) {
      operationRef.current.abort();
      operationRef.current = null;
    }

    // Call deactivation hook (use ref)
    const currentProcess = activeProcessRef.current;
    if (currentProcess?.onDeactivate) {
      try {
        await currentProcess.onDeactivate();
      } catch (error) {
        console.error(
          `[ProcessProvider] Error deactivating process ${activeProcessIdRef.current}:`,
          error
        );
      }
    }

    setActiveProcessId(null);
    setProcessState(null);

    onProcessChange?.(null);
    onStateChange?.(null);

    console.debug('[ProcessProvider] Deactivated process');
  }, [onProcessChange, onStateChange]);

  // Create process actions
  const processActions = useMemo<ProcessActions | null>(() => {
    if (!activeProcess || !processState) return null;

    const updateState = (updates: Partial<ProcessState>) => {
      setProcessState((prev) => {
        if (!prev) return prev;
        const newState = { ...prev, ...updates, lastUpdated: Date.now() };
        onStateChange?.(newState);
        return newState;
      });
    };

    return {
      setStatus: (status: ProcessStatus) => {
        updateState({ status });
      },

      setInput: (input: unknown) => {
        updateState({ input });
        activeProcess.onInputChange?.(input);
      },

      setSettings: (settings: unknown) => {
        updateState({ settings });
        activeProcess.onSettingsChange?.(settings);
      },

      updateSettings: (updates: Partial<unknown>) => {
        setProcessState((prev) => {
          if (!prev) return prev;
          const newSettings = { ...(prev.settings as object), ...updates };
          activeProcess.onSettingsChange?.(newSettings);
          const newState = {
            ...prev,
            settings: newSettings,
            lastUpdated: Date.now(),
          };
          onStateChange?.(newState);
          return newState;
        });
      },

      setTrajectoryId: (trajectoryId: string | null) => {
        updateState({ trajectoryId });
      },

      setProgress: (progress: number) => {
        updateState({ progress: Math.max(0, Math.min(100, progress)) });
      },

      setError: (error: string | null) => {
        updateState({
          error,
          status: error ? 'error' : processState.status,
        });
      },

      reset: () => {
        const newState = createInitialState(activeProcess);
        setProcessState(newState);
        onStateChange?.(newState);
      },

      generateTrajectory: async () => {
        // This would typically call backend
        // For now, just update status
        updateState({ status: 'generating', progress: 0 });

        // TODO: Implement actual trajectory generation via protocol
        console.debug('[ProcessProvider] generateTrajectory called');
      },

      validate: (): ValidationResult => {
        const errors: ValidationResult['errors'] = [];

        // Validate input
        if (processState.input && activeProcess.validateInput) {
          const inputResult = activeProcess.validateInput(processState.input);
          errors.push(...inputResult.errors);
        }

        // Validate settings
        if (activeProcess.validateSettings) {
          const settingsResult = activeProcess.validateSettings(
            processState.settings
          );
          errors.push(...settingsResult.errors);
        }

        return {
          valid: errors.filter((e) => e.severity === 'error').length === 0,
          errors,
        };
      },
    };
  }, [activeProcess, processState, createInitialState, onStateChange]);

  // Auto-activate initial process
  useEffect(() => {
    if (initialProcessId && !activeProcessId && hasProcess(initialProcessId)) {
      activateProcess(initialProcessId);
    }
  }, [initialProcessId, activeProcessId, activateProcess]);

  // Update processes ref when context value is computed
  // This avoids using the reactive hook which can cause infinite loops
  processesRef.current = getAllProcesses();

  // Context value
  const contextValue = useMemo<ProcessContextValue>(
    () => ({
      processes: processesRef.current,
      activeProcess,
      processState,
      processActions,
      activateProcess,
      deactivateProcess,
      hasProcess,
      getProcess,
    }),
    [
      activeProcess,
      processState,
      processActions,
      activateProcess,
      deactivateProcess,
    ]
  );

  return (
    <ProcessContext.Provider value={contextValue}>
      {children}
    </ProcessContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access the process context
 *
 * @throws Error if used outside ProcessProvider
 */
export function useProcessContext(): ProcessContextValue {
  const context = useContext(ProcessContext);
  if (!context) {
    throw new Error('useProcessContext must be used within a ProcessProvider');
  }
  return context;
}

/**
 * Hook to get the currently active process
 */
export function useActiveProcess(): ProcessDefinition | null {
  const { activeProcess } = useProcessContext();
  return activeProcess;
}

/**
 * Hook to get the current process state
 */
export function useProcessState<
  TInput = unknown,
  TSettings = unknown
>(): ProcessState<TInput, TSettings> | null {
  const { processState } = useProcessContext();
  return processState as ProcessState<TInput, TSettings> | null;
}

/**
 * Hook to get process actions
 */
export function useProcessActions<
  TInput = unknown,
  TSettings = unknown
>(): ProcessActions<TInput, TSettings> | null {
  const { processActions } = useProcessContext();
  return processActions as ProcessActions<TInput, TSettings> | null;
}

/**
 * Hook to activate/deactivate processes
 */
export function useProcessControl(): {
  activateProcess: (processId: string) => void;
  deactivateProcess: () => void;
} {
  const { activateProcess, deactivateProcess } = useProcessContext();
  return { activateProcess, deactivateProcess };
}

/**
 * Hook to check if a specific process is active
 */
export function useIsProcessActive(processId: string): boolean {
  const { activeProcess } = useProcessContext();
  return activeProcess?.id === processId;
}

export default ProcessProvider;
