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

export {
  useRemoteControl,
  type RemoteControlConfig,
  type RemoteControlState,
  type RemoteControlActions,
  type UseRemoteControlReturn,
  type RemoteSafetyZone,
  type RemoteObstacle,
  type RemoteWaypoint,
  type RemoteTrajectory,
} from './useRemoteControl';

// Vision streaming hooks
export {
  useCameraStream,
  type CameraStreamOptions,
  type CameraStreamState,
  type CameraStreamControls,
  type UseCameraStreamReturn,
} from './useCameraStream';

export {
  usePointCloudStream,
  type PointCloudStreamOptions,
  type PointCloudData as StreamPointCloudData,
  type PointCloudStreamState,
  type PointCloudStreamControls,
  type UsePointCloudStreamReturn,
} from './usePointCloudStream';

// IK drag hook for interactive end-effector control
export {
  useIKDrag,
  type UseIKDragOptions,
  type IKDragResult,
  type UseIKDragReturn,
} from './useIKDrag';

// Robot process hook for unified state management (Z-up API)
export {
  useRobotProcess,
  type ProcessType,
  type GhostStatus,
  type ProcessExecutionStatus,
  type ProcessWaypoint,
  type ProcessTrajectory,
  type UseRobotProcessOptions,
  type UseRobotProcessResult,
  // Legacy types (backwards compatibility) - renamed to avoid collision
  type RobotProcessState as LegacyRobotProcessState,
  type RobotProcessActions as LegacyRobotProcessActions,
  type TCPConfig,
} from './useRobotProcess';

// Ghost preview hook for IK-based robot pose preview (Z-up API)
export {
  useGhostPreview,
  type GhostPreviewStatus,
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
