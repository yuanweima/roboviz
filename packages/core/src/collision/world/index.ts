/**
 * Collision World Module
 *
 * GPU-accelerated collision detection system for motion planning.
 */

// Types
export * from './types';

// Manager
export {
  CollisionWorldManager,
  getCollisionWorldManager,
  resetCollisionWorldManager,
} from './CollisionWorldManager';

// Capsule Transformer
export {
  CapsuleTransformer,
  pointToSegmentDistance,
  segmentToSegmentDistance,
  capsulesCollision,
  checkSelfCollision,
  capsuleSphereCollision,
  capsuleBoxCollision,
} from './CapsuleTransformer';
