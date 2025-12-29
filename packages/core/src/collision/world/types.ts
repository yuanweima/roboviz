/**
 * Collision World Types
 *
 * Types for the GPU-accelerated collision detection system.
 * Supports primitive shapes, meshes, and robot capsule models.
 */

// Import base types from core types module to avoid duplication
import type { Vector3Tuple, QuaternionTuple } from '../../types';

// Re-export for convenience within collision module
export type { Vector3Tuple, QuaternionTuple };

export interface Transform3D {
  position: Vector3Tuple;
  quaternion: QuaternionTuple;
  scale?: Vector3Tuple;
}

// ============================================================================
// Collision Shape Types
// ============================================================================

export type CollisionShapeType = 'box' | 'sphere' | 'cylinder' | 'capsule' | 'mesh' | 'convexHull';

/** Box collision shape parameters */
export interface BoxParams {
  type: 'box';
  width: number;   // X dimension
  height: number;  // Y dimension
  depth: number;   // Z dimension
}

/** Sphere collision shape parameters */
export interface SphereParams {
  type: 'sphere';
  radius: number;
}

/** Cylinder collision shape parameters */
export interface CylinderParams {
  type: 'cylinder';
  radius: number;
  height: number;
}

/** Capsule collision shape parameters */
export interface CapsuleParams {
  type: 'capsule';
  radius: number;
  height: number;  // Total height including hemispherical caps
}

/** Mesh collision shape parameters */
export interface MeshParams {
  type: 'mesh';
  vertices: Float32Array;  // Flat array [x1,y1,z1, x2,y2,z2, ...]
  indices: Uint32Array;    // Triangle indices
  /** Optional bounding sphere for broad phase */
  boundingSphere?: { center: Vector3Tuple; radius: number };
}

/** Convex hull collision shape parameters */
export interface ConvexHullParams {
  type: 'convexHull';
  points: Float32Array;  // Flat array of hull vertices
}

/** Union of all shape parameters */
export type CollisionShapeParams =
  | BoxParams
  | SphereParams
  | CylinderParams
  | CapsuleParams
  | MeshParams
  | ConvexHullParams;

// ============================================================================
// Collision Object
// ============================================================================

/** Visualization options for collision objects */
export interface CollisionVisualization {
  color: string;
  opacity: number;
  wireframe: boolean;
  visible: boolean;
}

/** Default visualization settings */
export const DEFAULT_COLLISION_VISUALIZATION: CollisionVisualization = {
  color: '#ff6600',
  opacity: 0.4,
  wireframe: false,
  visible: true,
};

/** Collision object representing an obstacle in the world */
export interface CollisionObject {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Shape type */
  type: CollisionShapeType;
  /** Whether collision checking is enabled for this object */
  enabled: boolean;
  /** World transform */
  transform: Transform3D;
  /** Shape-specific parameters */
  params: CollisionShapeParams;
  /** Visualization options */
  visualization: CollisionVisualization;
  /** User-defined metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Robot Capsule Model
// ============================================================================

/** Single capsule representing a robot link */
export interface LinkCapsule {
  /** Index of the link this capsule belongs to */
  linkIndex: number;
  /** Link name from URDF */
  linkName: string;
  /** Capsule radius */
  radius: number;
  /** First endpoint in link-local coordinates */
  point1: Vector3Tuple;
  /** Second endpoint in link-local coordinates */
  point2: Vector3Tuple;
}

/** Robot capsule model for self-collision and environment collision */
export interface RobotCapsuleModel {
  /** Robot identifier */
  robotId: string;
  /** Link names in order */
  linkNames: string[];
  /** Capsules for each link */
  capsules: LinkCapsule[];
  /** Self-collision pair indices to check (links that can collide with each other) */
  selfCollisionPairs: Array<[number, number]>;
  /** Links to skip for environment collision (e.g., base link) */
  ignoredLinksForEnv: number[];
}

/** Transformed capsule in world coordinates */
export interface WorldCapsule {
  /** Capsule radius */
  radius: number;
  /** First endpoint in world coordinates */
  point1: Vector3Tuple;
  /** Second endpoint in world coordinates */
  point2: Vector3Tuple;
  /** Original link index */
  linkIndex: number;
}

// ============================================================================
// Collision World
// ============================================================================

/** The complete collision world state */
export interface CollisionWorld {
  /** All collision objects (obstacles) */
  objects: Map<string, CollisionObject>;
  /** Robot capsule model (if loaded) */
  robotCapsules: RobotCapsuleModel | null;
  /** Currently selected object ID */
  selectedObjectId: string | null;
}

/** Empty collision world factory */
export function createEmptyCollisionWorld(): CollisionWorld {
  return {
    objects: new Map(),
    robotCapsules: null,
    selectedObjectId: null,
  };
}

// ============================================================================
// Collision Check Types
// ============================================================================

/** Result of a collision check */
export interface CollisionCheckResult {
  /** Whether any collision was detected */
  hasCollision: boolean;
  /** Colliding pairs */
  collidingPairs: CollisionPair[];
  /** Time taken for the check in milliseconds */
  checkTimeMs: number;
}

/** A pair of colliding objects */
export interface CollisionPair {
  /** First object (can be robot link or collision object) */
  objectA: { type: 'link' | 'object'; id: string | number };
  /** Second object */
  objectB: { type: 'link' | 'object'; id: string | number };
  /** Approximate contact point */
  contactPoint?: Vector3Tuple;
  /** Penetration depth (if available) */
  penetrationDepth?: number;
}

/** Collision checker function signature (compatible with trajx-wasm) */
export type CollisionCheckerFn = (joints: number[]) => boolean;

// ============================================================================
// Batch Collision Check Types (GPU Optimization)
// ============================================================================

/** Configuration for batch collision checking */
export interface BatchCollisionConfig {
  /** Number of edge samples for interpolation */
  samplesPerEdge: number;
  /** Enable self-collision checking */
  checkSelfCollision: boolean;
  /** Enable environment collision checking */
  checkEnvironmentCollision: boolean;
  /** Safety margin to add to collision shapes */
  safetyMargin: number;
  /** Use parallel processing (Web Workers) */
  useParallelProcessing: boolean;
}

/** Default batch collision configuration */
export const DEFAULT_BATCH_COLLISION_CONFIG: BatchCollisionConfig = {
  samplesPerEdge: 10,
  checkSelfCollision: true,
  checkEnvironmentCollision: true,
  safetyMargin: 0.005, // 5mm
  useParallelProcessing: false,
};

/** Result of batch edge validation */
export interface BatchEdgeResult {
  /** Whether each edge is collision-free */
  edgeFree: boolean[];
  /** Total number of collision checks performed */
  totalChecks: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

// ============================================================================
// Import Types
// ============================================================================

/** Options for importing mesh collision shapes */
export interface MeshImportOptions {
  /** Name for the imported object */
  name: string;
  /** Initial transform */
  transform?: Partial<Transform3D>;
  /** Whether to compute convex hull instead of using raw mesh */
  useConvexHull?: boolean;
  /** Scale factor to apply */
  scale?: number;
  /** Visualization options */
  visualization?: Partial<CollisionVisualization>;
}

/** Options for importing URDF collision shapes */
export interface UrdfImportOptions {
  /** URDF content string */
  urdfContent: string;
  /** Specific link names to import (empty = all links) */
  linkNames?: string[];
  /** Base transform for the URDF model */
  baseTransform?: Partial<Transform3D>;
  /** Visualization options */
  visualization?: Partial<CollisionVisualization>;
}

// ============================================================================
// Events
// ============================================================================

/** Collision world event types */
export type CollisionWorldEventType =
  | 'object-added'
  | 'object-removed'
  | 'object-updated'
  | 'selection-changed'
  | 'robot-capsules-loaded';

/** Collision world event */
export interface CollisionWorldEvent {
  type: CollisionWorldEventType;
  objectId?: string;
  data?: unknown;
}

/** Event callback type */
export type CollisionWorldEventCallback = (event: CollisionWorldEvent) => void;
