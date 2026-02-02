/**
 * Remote Planner Provider
 *
 * Convenience component that creates a RemotePlannerAdapter from a
 * Dispatcher and registers it with the PlannerContext.
 *
 * @example
 * ```tsx
 * const dispatcher = createDispatcher();
 * dispatcher.setTransport(createWebSocketTransport({ url: 'ws://backend:8765' }));
 *
 * <PlannerProvider>
 *   <RemotePlannerProvider config={{ robotId: 'main', dispatcher }}>
 *     <PlanningControlPanel />
 *   </RemotePlannerProvider>
 * </PlannerProvider>
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { usePlannerContext } from '../PlannerContext';
import { RemotePlannerAdapter, type RemotePlannerConfig } from './RemotePlannerAdapter';

export interface RemotePlannerProviderProps {
  /** Remote planner configuration */
  config: RemotePlannerConfig;

  children: React.ReactNode;
}

/**
 * Creates a remote planner adapter and registers it with PlannerContext.
 *
 * On unmount, the planner is unregistered.
 */
export function RemotePlannerProvider({
  config,
  children,
}: RemotePlannerProviderProps) {
  const { registerPlanner, unregisterPlanner } = usePlannerContext();
  const disposeRef = useRef(false);

  useEffect(() => {
    disposeRef.current = false;

    const adapter = new RemotePlannerAdapter(config);
    registerPlanner(adapter);

    return () => {
      disposeRef.current = true;
      adapter.dispose();
      unregisterPlanner();
    };
  }, [config.robotId, config.dispatcher, registerPlanner, unregisterPlanner]);

  return <>{children}</>;
}
