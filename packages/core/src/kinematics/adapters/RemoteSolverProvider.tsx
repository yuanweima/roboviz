/**
 * Remote Solver Provider
 *
 * Connects to a backend service via JSON-RPC and registers a
 * RemoteSolverAdapter with the SolverContext.
 *
 * @example
 * ```tsx
 * const dispatcher = useRemoteDispatcher('ws://backend:8765');
 *
 * <SolverProvider>
 *   <RemoteSolverProvider config={{ robotId: 'main', dispatcher }}>
 *     <IKGhostRobot targetPose={pose} />
 *   </RemoteSolverProvider>
 * </SolverProvider>
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { useSolverContext } from '../SolverContext';
import { RemoteSolverAdapter, type RemoteSolverConfig } from './RemoteSolverAdapter';

export interface RemoteSolverProviderProps {
  /** Remote solver configuration */
  config: RemoteSolverConfig;

  children: React.ReactNode;
}

/**
 * Initializes a remote solver connection and registers it with SolverContext.
 */
export function RemoteSolverProvider({ config, children }: RemoteSolverProviderProps) {
  const { registerSolver, unregisterSolver } = useSolverContext();
  const disposeRef = useRef(false);

  useEffect(() => {
    disposeRef.current = false;

    (async () => {
      try {
        const adapter = new RemoteSolverAdapter(config);
        await adapter.initialize();

        if (!disposeRef.current) {
          registerSolver(adapter);
        }
      } catch (err) {
        if (!disposeRef.current) {
          console.error('[RemoteSolverProvider] Failed to initialize:', err);
        }
      }
    })();

    return () => {
      disposeRef.current = true;
      unregisterSolver();
    };
  }, [config.robotId, config.dispatcher, registerSolver, unregisterSolver]);

  return <>{children}</>;
}
