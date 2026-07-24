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
 * import { SolverProvider, WasmSolverProvider, IKGhostRobot } from '@yuanweima/roboviz-core/kinematics';
 * import { Robot, Scene } from '@yuanweima/roboviz-core';
 *
 * <SolverProvider>
 *   <WasmSolverProvider robotId="main" urdfContent={urdf}>
 *     <Scene>
 *       <Robot urdfContent={urdf} jointValues={joints} />
 *       <IKGhostRobot targetPose={pose} />
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
  IKGhostRobot,
  useIKSolutionSelector,
  type IKGhostRobotProps,
  type IKSolution,
  type IKSolutionSelectorProps,
} from './components/IKGhostRobot';

export {
  LinearMotionPreview,
  type LinearMotionPreviewProps,
  type PathPoint,
  type PathSegment,
} from './components/LinearMotionPreview';

export {
  TrajectoryFK,
  type TrajectoryFKProps,
  type TrajectoryWaypoint,
} from './components/TrajectoryFK';

export {
  ManipulabilityIndicator,
  type ManipulabilityIndicatorProps,
  type ManipulabilityStatus,
} from './components/ManipulabilityIndicator';

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
  useGhostPreview,
  type GhostInputMode,
  type UseGhostPreviewOptions,
  type UseGhostPreviewResult,
} from './hooks/useGhostPreview';

export {
  usePoseTrajectoryPlayer,
  type PoseWaypoint,
  type PoseTrajectory,
  type PosePlaybackState,
  type UsePoseTrajectoryPlayerOptions,
  type UsePoseTrajectoryPlayerResult,
} from './hooks/usePoseTrajectoryPlayer';

export {
  useRobotWithKinematics,
  type ToolConfig,
  type UseRobotWithKinematicsOptions,
  type UseRobotWithKinematicsResult,
} from './hooks/useRobotWithKinematics';

export {
  usePoseIK,
  type UsePoseIKOptions,
  type UsePoseIKReturn,
} from './hooks/usePoseIK';
