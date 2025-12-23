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
