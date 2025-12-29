/**
 * RoboViz Collision Module
 *
 * 碰撞检测和安全区域模块
 */

// Types
export type {
  // Geometry
  CollisionGeometryType,
  CollisionGeometryParams,
  CollisionGeometry,

  // Safety Zone
  SafetyLevel,
  SafetyZoneVisualization,
  SafetyZone,

  // Collision Detection
  CollisionObjectRef,
  CollisionPair,
  CollisionResult,
  SafetyZoneTriggerState,

  // Visualization
  CollisionVisualizationConfig,

  // Manager
  ICollisionManager,

  // Events
  CollisionEventType,
  CollisionEvent,
  CollisionDetectedEvent,
  SafetyZoneEnteredEvent,
  SafetyZoneExitedEvent,

  // Path & Distance
  PathCollisionCheckRequest,
  PathCollisionCheckResult,
  DistanceQueryRequest,
  DistanceQueryResult,
} from './types';

// Constants
export { DEFAULT_COLLISION_VISUALIZATION } from './types';

// Collision Manager
export {
  CollisionManager,
  createCollisionManager,
  getCollisionManager,
  resetCollisionManager,
} from './collision-manager';

// ============================================================================
// Collision World (GPU-Accelerated Motion Planning)
// ============================================================================

// World Types (excluding Vector3Tuple/QuaternionTuple which are already exported from core types)
export type {
  Transform3D,
  CollisionShapeType,
  BoxParams,
  SphereParams,
  CylinderParams,
  CapsuleParams,
  MeshParams,
  ConvexHullParams,
  CollisionShapeParams,
  CollisionVisualization,
  CollisionObject as WorldCollisionObject,
  LinkCapsule,
  RobotCapsuleModel,
  WorldCapsule,
  CollisionWorld,
  CollisionCheckResult,
  CollisionPair as WorldCollisionPair,
  CollisionCheckerFn as WorldCollisionCheckerFn,
  BatchCollisionConfig,
  BatchEdgeResult,
  MeshImportOptions,
  UrdfImportOptions,
  CollisionWorldEventType,
  CollisionWorldEvent,
  CollisionWorldEventCallback,
} from './world/types';

export {
  DEFAULT_COLLISION_VISUALIZATION as DEFAULT_WORLD_COLLISION_VISUALIZATION,
  DEFAULT_BATCH_COLLISION_CONFIG,
  createEmptyCollisionWorld,
} from './world/types';

// World Manager
export {
  CollisionWorldManager,
  getCollisionWorldManager,
  resetCollisionWorldManager,
} from './world/CollisionWorldManager';

// Capsule Transformer
export {
  CapsuleTransformer,
  pointToSegmentDistance,
  segmentToSegmentDistance,
  capsulesCollision,
  checkSelfCollision,
  capsuleSphereCollision,
  capsuleBoxCollision,
} from './world/CapsuleTransformer';

// Components
export {
  CollisionObjectVisual,
  CollisionObjectGizmo,
  CollisionWorldRenderer,
} from './components';
export type {
  CollisionObjectVisualProps,
  CollisionObjectGizmoProps,
  GizmoMode as CollisionGizmoMode,
  CollisionWorldRendererProps,
} from './components';

// Hooks
export { useCollisionWorld, useCollisionChecker } from './hooks';
export type {
  UseCollisionWorldOptions,
  UseCollisionWorldReturn,
  UseCollisionCheckerOptions,
  UseCollisionCheckerReturn,
  CollisionDetails as WorldCollisionDetails,
} from './hooks';
