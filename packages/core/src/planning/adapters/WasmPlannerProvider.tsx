/**
 * WASM Planner Provider
 *
 * Convenience component that initializes the MotionPlanningManager and
 * registers a WasmPlannerAdapter with the PlannerContext.
 *
 * @example
 * ```tsx
 * <PlannerProvider>
 *   <WasmPlannerProvider robotId="main">
 *     <PlanningControlPanel />
 *   </WasmPlannerProvider>
 * </PlannerProvider>
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { usePlannerContext } from '../PlannerContext';
import { WasmPlannerAdapter } from './WasmPlannerAdapter';
import { getMotionPlanningManager } from '../planning-manager';

export interface WasmPlannerProviderProps {
  /** Robot identifier */
  robotId: string;

  children: React.ReactNode;
}

/**
 * Initializes the WASM planner and registers it with PlannerContext.
 *
 * On unmount, the planner is unregistered.
 */
export function WasmPlannerProvider({
  robotId,
  children,
}: WasmPlannerProviderProps) {
  const { registerPlanner, unregisterPlanner } = usePlannerContext();
  const disposeRef = useRef(false);

  useEffect(() => {
    disposeRef.current = false;

    (async () => {
      try {
        const manager = getMotionPlanningManager();
        await manager.initialize();

        if (disposeRef.current) return;

        const adapter = new WasmPlannerAdapter(manager, robotId);
        registerPlanner(adapter);
      } catch (err) {
        if (!disposeRef.current) {
          console.error('[WasmPlannerProvider] Failed to initialize:', err);
        }
      }
    })();

    return () => {
      disposeRef.current = true;
      unregisterPlanner();
    };
  }, [robotId, registerPlanner, unregisterPlanner]);

  return <>{children}</>;
}
