/**
 * RoboViz Hooks
 *
 * React hooks for common visualization tasks.
 */

export {
  useTrajectoryPlayer,
  type TrajectoryPlayerState,
  type TrajectoryPlayerControls,
  type TrajectoryPlayerOptions,
} from './useTrajectoryPlayer';

export {
  useCollision,
  type UseCollisionOptions,
  type UseCollisionState,
  type UseCollisionActions,
} from './useCollision';

// IK drag hook for interactive end-effector control
export {
  useIKDrag,
  type UseIKDragOptions,
  type IKDragResult,
  type UseIKDragReturn,
} from './useIKDrag';

// Ghost preview hook for IK-based robot pose preview (Z-up API)
export {
  useGhostPreview,
  type GhostInputMode,
  type UseGhostPreviewOptions,
  type UseGhostPreviewResult,
} from './useGhostPreview';

// Pose trajectory player for TCP trajectory playback with IK (Z-up API)
export {
  usePoseTrajectoryPlayer,
  type PoseWaypoint,
  type PoseTrajectory,
  type PosePlaybackState,
  type UsePoseTrajectoryPlayerOptions,
  type UsePoseTrajectoryPlayerResult,
} from './usePoseTrajectoryPlayer';

// Unified robot kinematics hook (Z-up API)
export {
  useRobotWithKinematics,
  type ToolConfig,
  type UseRobotWithKinematicsOptions,
  type UseRobotWithKinematicsResult,
} from './useRobotWithKinematics';

// Pose IK hook - low-level pose → IK → ghost (Z-up API)
export {
  usePoseIK,
  type UsePoseIKOptions,
  type UsePoseIKReturn,
} from './usePoseIK';
