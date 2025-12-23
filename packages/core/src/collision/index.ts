/**
 * RoboViz Collision Module
 *
 * 碰撞检测和安全区域模块
 */

// Types
export type {
  // Geometry
  CollisionGeometryType,
  CollisionParams,
  BoxParams,
  SphereParams,
  CylinderParams,
  CapsuleParams,
  MeshParams,
  ConvexHullParams,
  CollisionGeometry,

  // Safety Zone
  SafetyLevel,
  SafetyZoneVisualization,
  SafetyZone,
  SafetyAction,

  // Collision Detection
  CollisionObjectType,
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
