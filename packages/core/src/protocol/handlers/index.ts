/**
 * RoboViz Protocol Handlers
 *
 * 导出所有协议处理器
 *
 * 设计说明：
 * - 每个 handler 都有完整的类型信息 (MethodHandler<TParams, TResult>)
 * - 使用 registerXxxHandlers 函数进行类型安全的注册
 * - 不导出 handler 集合对象，避免类型擦除
 */

// Stream handlers
export { registerStreamHandlers } from './stream';

// Vision handlers
export { registerVisionHandlers } from './vision';

// Frame handlers
export { registerFrameHandlers } from './frame';

// Collision handlers
export { registerCollisionHandlers } from './collision';

// Multi-Robot handlers
export { registerMultiRobotHandlers } from './multi-robot';

// Performance handlers
export { registerPerformanceHandlers } from './performance';

// Diagnostic handlers
export { registerDiagnosticHandlers } from './diagnostic';

// Scene handlers
export { registerSceneHandlers } from './scene';

// Kinematics handlers
export { registerKinematicsHandlers } from './kinematics';

// Motion planning handlers
export { registerMotionHandlers } from './motion';

// Re-export individual stream handlers
export {
  streamCreate,
  streamSubscribe,
  streamUnsubscribe,
  streamPause,
  streamResume,
  streamDestroy,
  streamGetState,
  streamList,
  streamGetLatest,
} from './stream';

// Re-export individual vision handlers
export {
  pointCloudLoad,
  pointCloudUpdate,
  pointCloudSetVisualization,
  pointCloudRemove,
  pointCloudClear,
  pointCloudGet,
  pointCloudList,
  visionAddCameraView,
  visionRemoveCameraView,
  visionUpdateCameraView,
  visionGetCameraView,
  visionListCameraViews,
  visionSetImageOverlay,
  visionClearImageOverlay,
  visionShowCalibration,
  visionHideCalibration,
  visionAddMarker2D,
  visionRemoveMarker2D,
  visionClearMarkers2D,
  visionAddROI2D,
  visionRemoveROI2D,
  visionAddROI3D,
  visionRemoveROI3D,
  visionProjectPoint,
  visionUnprojectPoint,
} from './vision';

// Re-export individual frame handlers
export {
  frameAdd,
  frameRemove,
  frameUpdate,
  frameGet,
  frameList,
  frameSetTransform,
  frameGetWorldTransform,
  frameGetRelativeTransform,
  frameTransformPoint,
  frameTransformPose,
  frameGetChildren,
  frameGetAncestors,
  frameSetActiveUserFrame,
  frameSetActiveToolFrame,
  frameSetActiveWorkpieceFrame,
  frameGetActiveFrames,
  frameSetVisualization,
  frameShow,
  frameHide,
  frameShowTree,
  frameHideTree,
  frameHighlight,
} from './frame';

// Re-export individual collision handlers
export {
  collisionAddGeometry,
  collisionRemoveGeometry,
  collisionUpdateGeometry,
  collisionSetGeometryTransform,
  collisionEnableGeometry,
  collisionGetGeometry,
  collisionListGeometries,
  collisionClearGeometries,
  collisionCheck,
  collisionGetLastResult,
  collisionCheckPath,
  collisionQueryDistance,
  safetyZoneAdd,
  safetyZoneRemove,
  safetyZoneUpdate,
  safetyZoneGet,
  safetyZoneList,
  safetyZoneClear,
  safetyZoneGetTriggerStates,
  safetyZoneCheckRobot,
  collisionSetVisualization,
  collisionGetVisualization,
  collisionStartContinuousCheck,
  collisionStopContinuousCheck,
} from './collision';

// Re-export individual multi-robot handlers
export {
  robotGroupCreate,
  robotGroupDelete,
  robotGroupUpdate,
  robotGroupGet,
  robotGroupList,
  robotGroupAddRobot,
  robotGroupRemoveRobot,
  robotGroupSetCoordinationType,
  robotGroupSetMasterRobot,
  robotGroupSetCooperativeConfig,
  robotGroupSetVisualization,
  syncTrajectoryLoad,
  syncTrajectoryUnload,
  syncTrajectoryGet,
  syncTrajectoryPlay,
  syncTrajectoryPause,
  syncTrajectoryStop,
  syncTrajectorySeek,
  syncTrajectoryGetPlaybackState,
  workspaceAdd,
  workspaceRemove,
  workspaceUpdate,
  workspaceGet,
  workspaceList,
  workspaceSetVisualization,
  workspaceCalculateReachable,
  workspaceCalculateShared,
} from './multi-robot';

// Re-export individual performance handlers
export {
  performanceSetConfig,
  performanceGetConfig,
  performanceResetConfig,
  performanceGetMetrics,
  performanceGetRenderStats,
  performanceGetMemoryStats,
  performanceGetNetworkStats,
  performanceStartMonitoring,
  performanceStopMonitoring,
  performanceClearCache,
  performanceClearGeometryCache,
  performanceClearTextureCache,
  performancePreloadURDF,
  performancePreloadPointCloud,
  performanceDisposeUnused,
  performanceEnableAdaptiveQuality,
  performanceDisableAdaptiveQuality,
  performanceSetQualityLevel,
  performanceGetQualityLevel,
  performanceStartProfiling,
  performanceStopProfiling,
  performanceGetBottlenecks,
} from './performance';

// Re-export individual diagnostic handlers
export {
  diagnosticShowJoint,
  diagnosticHideJoint,
  diagnosticUpdateJoint,
  diagnosticGetJointConfig,
  diagnosticShowWorkspace,
  diagnosticHideWorkspace,
  diagnosticGetWorkspaceConfig,
  diagnosticShowSingularity,
  diagnosticHideSingularity,
  diagnosticGetSingularityState,
  diagnosticGetSingularityConfig,
  diagnosticShowJointLimits,
  diagnosticHideJointLimits,
  diagnosticGetJointLimitStates,
  diagnosticGetJointLimitConfig,
  diagnosticShowVelocity,
  diagnosticHideVelocity,
  diagnosticGetVelocityConfig,
  diagnosticHideAll,
  diagnosticGetActive,
} from './diagnostic';

// Re-export individual scene handlers
export {
  sceneCreateSnapshot,
  sceneRestoreSnapshot,
  sceneDeleteSnapshot,
  sceneGetSnapshot,
  sceneListSnapshots,
  sceneExport,
  sceneImport,
  historyUndo,
  historyRedo,
  historyCanUndo,
  historyCanRedo,
  historyGetUndoStack,
  historyGetRedoStack,
  historyClear,
  historySetConfig,
  historyGetConfig,
} from './scene';

// Re-export individual kinematics handlers
export {
  kinematicsInit,
  kinematicsIsReady,
  kinematicsListAvailableRobots,
  kinematicsCreateSolver,
  kinematicsCreateSolverWithConfig,
  kinematicsDisposeSolver,
  kinematicsListSolvers,
  kinematicsHasSolver,
  kinematicsFk,
  kinematicsFkChain,
  kinematicsIk,
  kinematicsIkAll,
  kinematicsConfigureIk,
  kinematicsAnalyzeWorkspace,
  kinematicsIsReachable,
  kinematicsIsNearSingularity,
  kinematicsComputeManipulability,
  kinematicsComputeJacobian,
  kinematicsAttachTool,
  kinematicsDetachTool,
  kinematicsHasTool,
  kinematicsIsValidConfig,
  kinematicsGetDhParams,
} from './kinematics';

// Re-export individual motion handlers
export {
  motionLinear,
  motionLinearPath,
  motionCheckLinear,
  motionLinearFromCurrent,
  motionInterpolatePath,
  motionSmoothPath,
  motionCartesianToJoint,
  motionJointToCartesian,
  motionAnalyzePath,
  motionValidatePath,
} from './motion';

// ============================================================================
// All Handlers Registration
// ============================================================================

import type { MethodHandler } from '../handler';
import { registerStreamHandlers } from './stream';
import { registerVisionHandlers } from './vision';
import { registerFrameHandlers } from './frame';
import { registerCollisionHandlers } from './collision';
import { registerMultiRobotHandlers } from './multi-robot';
import { registerPerformanceHandlers } from './performance';
import { registerDiagnosticHandlers } from './diagnostic';
import { registerSceneHandlers } from './scene';
import { registerKinematicsHandlers } from './kinematics';
import { registerMotionHandlers } from './motion';

/**
 * 类型安全的方法注册函数签名
 */
export type RegisterMethod = <TParams, TResult>(
  method: string,
  handler: MethodHandler<TParams, TResult>
) => void;

/**
 * 注册所有协议处理器
 *
 * @param register - 类型安全的注册函数，保留每个 handler 的完整类型信息
 */
export function registerAllHandlers(register: RegisterMethod): void {
  registerStreamHandlers(register);
  registerVisionHandlers(register);
  registerFrameHandlers(register);
  registerCollisionHandlers(register);
  registerMultiRobotHandlers(register);
  registerPerformanceHandlers(register);
  registerDiagnosticHandlers(register);
  registerSceneHandlers(register);
  registerKinematicsHandlers(register);
  registerMotionHandlers(register);
}
