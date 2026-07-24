/**
 * @yuanweima/roboviz-core/kinematics
 *
 * Kinematics entry point — IK/FK computation, solver providers, and
 * kinematics-dependent components.
 *
 * Requires either:
 * - trajx-wasm (for local WASM computation)
 * - A custom ISolverProvider implementation
 *
 * @example Local WASM (trajx)
 * ```tsx
 * import { SolverProvider, WasmSolverProvider, usePoseIK } from '@yuanweima/roboviz-core/kinematics';
 * import { Robot, Scene, GhostRobot } from '@yuanweima/roboviz-core';
 *
 * <SolverProvider>
 *   <WasmSolverProvider robotId="main" urdfContent={urdf}>
 *     <Scene>
 *       <Robot urdfContent={urdf} jointValues={joints} />
 *       {ghostJoints && <GhostRobot jointAngles={ghostJoints} status={ghostStatus} />}
 *     </Scene>
 *   </WasmSolverProvider>
 * </SolverProvider>
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Kinematics Module (solvers, hooks, types, adapters)
// =============================================================================
export * from './kinematics';

// =============================================================================
// Coordinates: Kinematics hook (depends on useHybridSolver)
// =============================================================================
export {
  useRobotKinematics,
  type UseRobotKinematicsOptions,
  type UseRobotKinematicsReturn,
  type FkResult3D,
  type FkChainResult3D,
  type IkResult3D,
  type MultiIkResult3D,
} from './coordinates/useRobotKinematics';

// =============================================================================
// Kinematics-dependent Components
// =============================================================================
export {
  TrajectoryFK,
  type TrajectoryFKProps,
  type TrajectoryWaypoint,
} from './components/TrajectoryFK';

// =============================================================================
// Kinematics-dependent Hooks
// =============================================================================
export {
  useIKDrag,
  type UseIKDragOptions,
  type IKDragResult,
  type UseIKDragReturn,
} from './hooks/useIKDrag';

export {
  usePoseIK,
  type UsePoseIKOptions,
  type UsePoseIKReturn,
} from './hooks/usePoseIK';
