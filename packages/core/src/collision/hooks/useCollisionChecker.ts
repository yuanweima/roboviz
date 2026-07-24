/**
 * useCollisionChecker Hook
 *
 * Creates a collision checking function compatible with trajx-wasm planners.
 * Handles both self-collision and environment collision detection.
 */

import { useCallback, useMemo, useRef } from 'react';
import { CapsuleTransformer, checkSelfCollision, capsuleSphereCollision, capsuleBoxCollision, capsulesCollision } from '../world/CapsuleTransformer';
import type {
  CollisionWorld,
  CollisionObject,
  RobotCapsuleModel,
  WorldCapsule,
  CollisionCheckerFn,
  BatchCollisionConfig,
  Vector3Tuple,
} from '../world/types';
import { DEFAULT_BATCH_COLLISION_CONFIG } from '../world/types';

// ============================================================================
// Types
// ============================================================================

export interface UseCollisionCheckerOptions {
  /** Collision world containing obstacles */
  world: CollisionWorld;
  /** Robot capsule model */
  robotCapsules: RobotCapsuleModel | null;
  /** Function to get link transforms from joint angles */
  getLinkTransforms: (joints: number[]) => Float64Array | Float32Array | number[];
  /** Batch collision configuration */
  batchConfig?: Partial<BatchCollisionConfig>;
}

export interface UseCollisionCheckerReturn {
  /** Collision checker function (returns true if collision-free) */
  collisionChecker: CollisionCheckerFn;
  /** Check a single configuration for collisions */
  checkCollision: (joints: number[]) => { hasCollision: boolean; details?: CollisionDetails };
  /** Check multiple configurations in batch */
  checkBatch: (configurations: number[][]) => boolean[];
  /** Check if the checker is ready */
  isReady: boolean;
}

export interface CollisionDetails {
  selfCollision: boolean;
  selfCollisionPairs: Array<[number, number]>;
  environmentCollision: boolean;
  environmentCollisionObjects: string[];
}

// ============================================================================
// Environment Collision Checking
// ============================================================================

/**
 * Check collision between world capsules and environment objects
 */
function checkEnvironmentCollision(
  worldCapsules: WorldCapsule[],
  objects: Map<string, CollisionObject>,
  ignoredLinks: number[],
  safetyMargin: number
): { hasCollision: boolean; collidingObjects: string[] } {
  const collidingObjects: string[] = [];
  const ignoredLinkSet = new Set(ignoredLinks);

  for (const capsule of worldCapsules) {
    // Skip ignored links (e.g., base link)
    if (ignoredLinkSet.has(capsule.linkIndex)) continue;

    for (const [objectId, object] of objects) {
      // Skip disabled objects
      if (!object.enabled) continue;

      const collision = checkCapsuleObjectCollision(capsule, object, safetyMargin);
      if (collision) {
        collidingObjects.push(objectId);
      }
    }
  }

  return {
    hasCollision: collidingObjects.length > 0,
    collidingObjects,
  };
}

/**
 * Check collision between a capsule and a collision object
 */
function checkCapsuleObjectCollision(
  capsule: WorldCapsule,
  object: CollisionObject,
  safetyMargin: number
): boolean {
  const { transform, params } = object;
  const objectCenter = transform.position;

  switch (params.type) {
    case 'sphere':
      return capsuleSphereCollision(capsule, objectCenter, params.radius, safetyMargin);

    case 'box': {
      const halfExtents: Vector3Tuple = [
        params.width / 2,
        params.height / 2,
        params.depth / 2,
      ];
      return capsuleBoxCollision(capsule, objectCenter, halfExtents, safetyMargin);
    }

    case 'cylinder': {
      // Approximate cylinder as capsule
      const cylinderCapsule: WorldCapsule = {
        radius: params.radius,
        point1: [objectCenter[0], objectCenter[1] - params.height / 2, objectCenter[2]],
        point2: [objectCenter[0], objectCenter[1] + params.height / 2, objectCenter[2]],
        linkIndex: -1,
      };
      return capsulesCollision(capsule, cylinderCapsule, safetyMargin);
    }

    case 'capsule': {
      // Direct capsule-capsule check
      const objectCapsule: WorldCapsule = {
        radius: params.radius,
        point1: [objectCenter[0], objectCenter[1] - (params.height - 2 * params.radius) / 2, objectCenter[2]],
        point2: [objectCenter[0], objectCenter[1] + (params.height - 2 * params.radius) / 2, objectCenter[2]],
        linkIndex: -1,
      };
      return capsulesCollision(capsule, objectCapsule, safetyMargin);
    }

    case 'mesh':
    case 'convexHull': {
      // For mesh/convex hull, use bounding sphere approximation
      if (params.type === 'mesh' && params.boundingSphere) {
        return capsuleSphereCollision(
          capsule,
          params.boundingSphere.center,
          params.boundingSphere.radius,
          safetyMargin
        );
      }
      // Conservative: assume no collision if we can't check
      return false;
    }

    default:
      return false;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useCollisionChecker(options: UseCollisionCheckerOptions): UseCollisionCheckerReturn {
  const { world, robotCapsules, getLinkTransforms, batchConfig: userBatchConfig } = options;

  const batchConfig = useMemo(
    () => ({ ...DEFAULT_BATCH_COLLISION_CONFIG, ...userBatchConfig }),
    [userBatchConfig]
  );

  // Create capsule transformer if robot capsules are available
  const capsuleTransformerRef = useRef<CapsuleTransformer | null>(null);

  const capsuleTransformer = useMemo(() => {
    if (!robotCapsules) return null;
    capsuleTransformerRef.current = new CapsuleTransformer(robotCapsules);
    return capsuleTransformerRef.current;
  }, [robotCapsules]);

  const isReady = useMemo(() => {
    return capsuleTransformer !== null;
  }, [capsuleTransformer]);

  /**
   * Check a single configuration for collisions
   */
  const checkCollision = useCallback(
    (joints: number[]): { hasCollision: boolean; details?: CollisionDetails } => {
      if (!capsuleTransformer || !robotCapsules) {
        return { hasCollision: false };
      }

      // Get link transforms
      const linkTransforms = getLinkTransforms(joints);

      // Transform capsules to world coordinates
      const worldCapsules = capsuleTransformer.transform(linkTransforms);

      let selfCollision = false;
      let selfCollisionPairs: Array<[number, number]> = [];
      let environmentCollision = false;
      let environmentCollisionObjects: string[] = [];

      // Check self-collision
      if (batchConfig.checkSelfCollision) {
        const selfResult = checkSelfCollision(
          worldCapsules,
          robotCapsules.selfCollisionPairs,
          batchConfig.safetyMargin
        );
        selfCollision = selfResult.hasCollision;
        selfCollisionPairs = selfResult.collidingPairs;
      }

      // Check environment collision
      if (batchConfig.checkEnvironmentCollision && !selfCollision) {
        const envResult = checkEnvironmentCollision(
          worldCapsules,
          world.objects,
          robotCapsules.ignoredLinksForEnv,
          batchConfig.safetyMargin
        );
        environmentCollision = envResult.hasCollision;
        environmentCollisionObjects = envResult.collidingObjects;
      }

      const hasCollision = selfCollision || environmentCollision;

      return {
        hasCollision,
        details: {
          selfCollision,
          selfCollisionPairs,
          environmentCollision,
          environmentCollisionObjects,
        },
      };
    },
    [capsuleTransformer, robotCapsules, getLinkTransforms, world.objects, batchConfig]
  );

  /**
   * Collision checker function for trajx-wasm planners
   * Returns true if configuration is collision-FREE
   */
  const collisionChecker = useCallback(
    (joints: number[]): boolean => {
      const result = checkCollision(joints);
      return !result.hasCollision;
    },
    [checkCollision]
  );

  /**
   * Check multiple configurations in batch
   */
  const checkBatch = useCallback(
    (configurations: number[][]): boolean[] => {
      return configurations.map((joints) => collisionChecker(joints));
    },
    [collisionChecker]
  );

  return {
    collisionChecker,
    checkCollision,
    checkBatch,
    isReady,
  };
}

export default useCollisionChecker;
