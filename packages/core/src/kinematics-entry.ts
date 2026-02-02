/**
 * @aspect/roboviz-core/kinematics
 *
 * Kinematics entry point — IK/FK computation, solver providers, and
 * kinematics-dependent components.
 *
 * Requires either:
 * - trajx-wasm (for local WASM computation)
 * - A remote solver backend (via RemoteSolverProvider)
 * - A custom ISolverProvider implementation
 *
 * @example Local WASM
 * ```tsx
 * import { SolverProvider, WasmSolverProvider, IKGhostRobot } from '@aspect/roboviz-core/kinematics';
 * import { Robot, Scene } from '@aspect/roboviz-core/rendering';
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
 * @example Remote backend
 * ```tsx
 * import { SolverProvider, RemoteSolverProvider, IKGhostRobot } from '@aspect/roboviz-core/kinematics';
 *
 * <SolverProvider>
 *   <RemoteSolverProvider config={{ robotId: 'main', dispatcher }}>
 *     <IKGhostRobot targetPose={pose} />
 *   </RemoteSolverProvider>
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
  WorkpointGhostPreview,
  type WorkpointGhostPreviewProps,
} from './components/WorkpointGhostPreview';

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

export {
  CartesianControlPanel,
  type CartesianControlPanelProps,
  type CartesianControlPanelState,
} from './components/CartesianControlPanel';

export {
  JogControlPanel,
  JogButton,
  NumericDisplay,
  JointJogRow,
  CartesianJogRow,
  useRobotJogControl,
  type JogControlPanelProps,
  type JogButtonProps,
  type NumericDisplayProps,
  type JointJogRowProps,
  type CartesianJogRowProps,
  type UseRobotJogControlOptions,
  type JogControlState,
  type JogControlActions,
  type JogMode,
  type JogAxis,
  type StepSize,
} from './components/JogControlPanel';

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
  useRobotProcess,
  type ProcessType,
  type GhostStatus as ProcessGhostStatus,
  type ProcessExecutionStatus,
  type ProcessWaypoint,
  type ProcessTrajectory,
  type UseRobotProcessOptions,
  type UseRobotProcessResult,
  type RobotProcessState as LegacyRobotProcessState,
  type RobotProcessActions as LegacyRobotProcessActions,
  type TCPConfig,
} from './hooks/useRobotProcess';

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
  useWorkpointIK,
  type UseWorkpointIKOptions,
  type UseWorkpointIKReturn,
} from './hooks/useWorkpointIK';

export {
  usePoseIK,
  type UsePoseIKOptions,
  type UsePoseIKReturn,
} from './hooks/usePoseIK';

// =============================================================================
// Workpoint System
// =============================================================================
export * from './workpoint';

// =============================================================================
// Capabilities (some depend on kinematics)
// =============================================================================
export * from './capabilities';

// =============================================================================
// Process System
// =============================================================================
export * from './process';

// =============================================================================
// Process Plugins
// =============================================================================
export * from './processes';
