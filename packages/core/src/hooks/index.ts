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
