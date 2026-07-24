/**
 * Solver Context
 *
 * React Context for injecting kinematics solver providers.
 * Enables decoupling of solver implementation (WASM, remote, custom)
 * from visualization components.
 *
 * Usage:
 * ```tsx
 * // With WASM solver
 * <SolverProvider>
 *   <WasmSolverProvider robotId="main" urdfContent={urdf}>
 *     <IKGhostRobot targetPose={pose} />
 *   </WasmSolverProvider>
 * </SolverProvider>
 *
 * // With remote backend solver
 * <SolverProvider>
 *   <RemoteSolverProvider config={{ robotId: 'main', dispatcher }}>
 *     <IKGhostRobot targetPose={pose} />
 *   </RemoteSolverProvider>
 * </SolverProvider>
 * ```
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ISolverProvider, SolverContextValue, SolverCapabilities } from './solver-provider-types';

// ============================================================================
// Context
// ============================================================================

const SolverContext = createContext<SolverContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface SolverProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that manages solver lifecycle.
 *
 * Wrap your scene with this provider, then nest a solver-specific provider
 * (WasmSolverProvider, RemoteSolverProvider, or custom) to register the solver.
 */
export function SolverProvider({ children }: SolverProviderProps) {
  const [solver, setSolver] = useState<ISolverProvider | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const registerSolver = useCallback((newSolver: ISolverProvider) => {
    setSolver(newSolver);
    setReady(true);
    setLoading(false);
    setError(null);
  }, []);

  const unregisterSolver = useCallback(() => {
    setSolver((prev) => {
      prev?.dispose();
      return null;
    });
    setReady(false);
    setLoading(false);
    setError(null);
  }, []);

  const value = useMemo<SolverContextValue>(
    () => ({ solver, ready, loading, error, registerSolver, unregisterSolver }),
    [solver, ready, loading, error, registerSolver, unregisterSolver]
  );

  return (
    <SolverContext.Provider value={value}>
      {children}
    </SolverContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the solver context. Throws if used outside SolverProvider.
 */
export function useSolverContext(): SolverContextValue {
  const ctx = useContext(SolverContext);
  if (!ctx) {
    throw new Error(
      'useSolverContext must be used within a <SolverProvider>. ' +
      'Wrap your component tree with <SolverProvider> to provide kinematics capabilities.'
    );
  }
  return ctx;
}

/**
 * Optionally access the solver context.
 * Returns null if not inside a SolverProvider — used for dual-mode hooks
 * that fall back to legacy behavior.
 */
export function useSolverContextOptional(): SolverContextValue | null {
  return useContext(SolverContext);
}

/**
 * Convenience hook for solver status display in UI.
 *
 * @example
 * ```tsx
 * function StatusIndicator() {
 *   const { available, loading, type, capabilities } = useSolverStatus();
 *   if (loading) return <span>Initializing solver...</span>;
 *   if (!available) return <span>No solver available</span>;
 *   return <span>Solver: {type} (IK: {capabilities?.hasIK ? 'yes' : 'no'})</span>;
 * }
 * ```
 */
export function useSolverStatus(): {
  available: boolean;
  loading: boolean;
  error: Error | null;
  capabilities: SolverCapabilities | null;
  type: ISolverProvider['type'] | null;
} {
  const ctx = useSolverContextOptional();
  return {
    available: ctx?.ready ?? false,
    loading: ctx?.loading ?? false,
    error: ctx?.error ?? null,
    capabilities: ctx?.solver?.capabilities ?? null,
    type: ctx?.solver?.type ?? null,
  };
}
