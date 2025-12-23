/**
 * RoboViz Protocol Handlers
 *
 * 导出所有协议处理器
 */

// Stream handlers
export { streamHandlers, registerStreamHandlers } from './stream';

// Vision handlers
export { visionHandlers, registerVisionHandlers } from './vision';

// Frame handlers
export { frameHandlers, registerFrameHandlers } from './frame';

// Collision handlers
export { collisionHandlers, registerCollisionHandlers } from './collision';

// Multi-Robot handlers
export { multiRobotHandlers, registerMultiRobotHandlers } from './multi-robot';

// Performance handlers
export { performanceHandlers, registerPerformanceHandlers } from './performance';

// Diagnostic handlers
export { diagnosticHandlers, registerDiagnosticHandlers } from './diagnostic';

// Scene handlers
export { sceneHandlers, registerSceneHandlers } from './scene';

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

// ============================================================================
// All Handlers Registration
// ============================================================================

import type { MethodHandler } from '../handler';
import { registerCollisionHandlers } from './collision';
import { registerMultiRobotHandlers } from './multi-robot';
import { registerPerformanceHandlers } from './performance';
import { registerDiagnosticHandlers } from './diagnostic';
import { registerSceneHandlers } from './scene';

/**
 * 注册所有协议处理器
 */
export function registerAllHandlers(
  registerMethod: (method: string, handler: MethodHandler) => void
): void {
  registerStreamHandlers(registerMethod);
  registerVisionHandlers(registerMethod);
  registerFrameHandlers(registerMethod);
  registerCollisionHandlers(registerMethod);
  registerMultiRobotHandlers(registerMethod);
  registerPerformanceHandlers(registerMethod);
  registerDiagnosticHandlers(registerMethod);
  registerSceneHandlers(registerMethod);
}
