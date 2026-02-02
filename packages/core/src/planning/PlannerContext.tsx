/**
 * Planner Context
 *
 * React Context for injecting motion planning providers.
 * Enables decoupling of planner implementation (WASM, remote, custom)
 * from visualization components.
 *
 * Usage:
 * ```tsx
 * <PlannerProvider>
 *   <WasmPlannerProvider robotId="main">
 *     <PlanningControlPanel />
 *   </WasmPlannerProvider>
 * </PlannerProvider>
 * ```
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { IPlannerProvider, PlannerContextValue, PlannerCapabilities } from './planner-provider-types';

// ============================================================================
// Context
// ============================================================================

const PlannerCtx = createContext<PlannerContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface PlannerProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that manages planner lifecycle.
 *
 * Wrap your scene with this provider, then nest a planner-specific provider
 * (WasmPlannerProvider, RemotePlannerProvider, or custom) to register the planner.
 */
export function PlannerProvider({ children }: PlannerProviderProps) {
  const [planner, setPlanner] = useState<IPlannerProvider | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const registerPlanner = useCallback((newPlanner: IPlannerProvider) => {
    setPlanner(newPlanner);
    setReady(true);
    setLoading(false);
    setError(null);
  }, []);

  const unregisterPlanner = useCallback(() => {
    setPlanner((prev) => {
      prev?.dispose();
      return null;
    });
    setReady(false);
    setLoading(false);
    setError(null);
  }, []);

  const value = useMemo<PlannerContextValue>(
    () => ({ planner, ready, loading, error, registerPlanner, unregisterPlanner }),
    [planner, ready, loading, error, registerPlanner, unregisterPlanner]
  );

  return (
    <PlannerCtx.Provider value={value}>
      {children}
    </PlannerCtx.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the planner context. Throws if used outside PlannerProvider.
 */
export function usePlannerContext(): PlannerContextValue {
  const ctx = useContext(PlannerCtx);
  if (!ctx) {
    throw new Error(
      'usePlannerContext must be used within a <PlannerProvider>. ' +
      'Wrap your component tree with <PlannerProvider> to provide motion planning capabilities.'
    );
  }
  return ctx;
}

/**
 * Optionally access the planner context.
 * Returns null if not inside a PlannerProvider.
 */
export function usePlannerContextOptional(): PlannerContextValue | null {
  return useContext(PlannerCtx);
}

/**
 * Convenience hook for planner status display in UI.
 */
export function usePlannerStatus(): {
  available: boolean;
  loading: boolean;
  error: Error | null;
  capabilities: PlannerCapabilities | null;
  type: IPlannerProvider['type'] | null;
} {
  const ctx = usePlannerContextOptional();
  return {
    available: ctx?.ready ?? false,
    loading: ctx?.loading ?? false,
    error: ctx?.error ?? null,
    capabilities: ctx?.planner?.capabilities ?? null,
    type: ctx?.planner?.type ?? null,
  };
}
