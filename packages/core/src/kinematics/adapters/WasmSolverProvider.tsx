/**
 * WASM Solver Provider
 *
 * Convenience component that initializes trajx-wasm and registers
 * a WasmSolverAdapter with the SolverContext.
 *
 * @example
 * ```tsx
 * <SolverProvider>
 *   <WasmSolverProvider robotId="main" urdfContent={urdfXml}>
 *     <IKGhostRobot targetPose={pose} />
 *   </WasmSolverProvider>
 * </SolverProvider>
 * ```
 */

import React, { useEffect, useRef } from 'react';
import { useSolverContext } from '../SolverContext';
import { WasmSolverAdapter } from './WasmSolverAdapter';
import { getKinematicsManager } from '../kinematics-manager';
import { URDF_TO_DH_MAPPING } from '../useTrajx';

export interface WasmSolverProviderProps {
  /** Robot identifier */
  robotId: string;

  /** URDF content (XML string). Solver is created when this is non-null. */
  urdfContent: string | null;

  /** Optional: Force a specific DH database robot name for analytical IK */
  dhRobotName?: string;

  children: React.ReactNode;
}

/**
 * Initializes WASM kinematics and registers solver with SolverContext.
 *
 * When urdfContent changes, the previous solver is disposed and a new one
 * is created. When unmounted, the solver is unregistered.
 */
export function WasmSolverProvider({
  robotId,
  urdfContent,
  dhRobotName,
  children,
}: WasmSolverProviderProps) {
  const { registerSolver, unregisterSolver } = useSolverContext();
  const disposeRef = useRef(false);

  useEffect(() => {
    if (!urdfContent) return;

    disposeRef.current = false;

    (async () => {
      try {
        const manager = getKinematicsManager();
        await manager.initialize();

        if (disposeRef.current) return;

        // Create URDF-based solver
        const solver = manager.createSolverFromUrdf(robotId, urdfContent);

        // Try to load DH params for analytical IK
        const resolvedDhName = dhRobotName || URDF_TO_DH_MAPPING[solver.name];
        if (resolvedDhName) {
          try {
            solver.loadDhParamsFromDatabase(resolvedDhName);
          } catch {
            // DH params not available for this robot — numerical IK only
          }
        }

        if (disposeRef.current) return;

        const adapter = new WasmSolverAdapter(solver);
        registerSolver(adapter);
      } catch (err) {
        if (!disposeRef.current) {
          console.error('[WasmSolverProvider] Failed to initialize:', err);
        }
      }
    })();

    return () => {
      disposeRef.current = true;
      unregisterSolver();
    };
  }, [robotId, urdfContent, dhRobotName, registerSolver, unregisterSolver]);

  return <>{children}</>;
}
