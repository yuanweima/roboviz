/**
 * CollisionWorldManager
 *
 * Manages collision objects and robot capsule models for GPU-accelerated
 * motion planning. Provides CRUD operations and collision checking utilities.
 */

import type {
  CollisionWorld,
  CollisionObject,
  CollisionShapeType,
  CollisionShapeParams,
  Transform3D,
  CollisionVisualization,
  RobotCapsuleModel,
  WorldCapsule,
  CollisionWorldEvent,
  CollisionWorldEventCallback,
  Vector3Tuple,
  MeshImportOptions,
} from './types';
import {
  createEmptyCollisionWorld,
  DEFAULT_COLLISION_VISUALIZATION,
} from './types';

// ============================================================================
// Utility Functions
// ============================================================================

/** Generate a unique ID */
function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Create default shape parameters based on type */
function createDefaultParams(type: CollisionShapeType): CollisionShapeParams {
  switch (type) {
    case 'box':
      return { type: 'box', width: 0.5, height: 0.5, depth: 0.5 };
    case 'sphere':
      return { type: 'sphere', radius: 0.25 };
    case 'cylinder':
      return { type: 'cylinder', radius: 0.25, height: 0.5 };
    case 'capsule':
      return { type: 'capsule', radius: 0.1, height: 0.5 };
    case 'mesh':
      return { type: 'mesh', vertices: new Float32Array(0), indices: new Uint32Array(0) };
    case 'convexHull':
      return { type: 'convexHull', points: new Float32Array(0) };
    default:
      return { type: 'box', width: 0.5, height: 0.5, depth: 0.5 };
  }
}

/** Create default transform */
function createDefaultTransform(): Transform3D {
  return {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    scale: [1, 1, 1],
  };
}

// ============================================================================
// CollisionWorldManager
// ============================================================================

/**
 * Manages the collision world for motion planning.
 *
 * Features:
 * - CRUD operations for collision objects
 * - Robot capsule model management
 * - Mesh/URDF import support
 * - Event system for state changes
 */
export class CollisionWorldManager {
  private world: CollisionWorld;
  private eventListeners: Set<CollisionWorldEventCallback> = new Set();

  constructor(initialWorld?: Partial<CollisionWorld>) {
    this.world = {
      ...createEmptyCollisionWorld(),
      ...initialWorld,
      objects: new Map(initialWorld?.objects ?? []),
    };
  }

  // ==========================================================================
  // State Access
  // ==========================================================================

  /** Get the current collision world state */
  getWorld(): CollisionWorld {
    return this.world;
  }

  /** Get all collision objects as an array */
  getObjects(): CollisionObject[] {
    return Array.from(this.world.objects.values());
  }

  /** Get a specific collision object by ID */
  getObject(id: string): CollisionObject | undefined {
    return this.world.objects.get(id);
  }

  /** Get the currently selected object */
  getSelectedObject(): CollisionObject | undefined {
    if (!this.world.selectedObjectId) return undefined;
    return this.world.objects.get(this.world.selectedObjectId);
  }

  /** Get the robot capsule model */
  getRobotCapsules(): RobotCapsuleModel | null {
    return this.world.robotCapsules;
  }

  // ==========================================================================
  // Object CRUD
  // ==========================================================================

  /**
   * Add a new collision object
   * @returns The generated ID of the new object
   */
  addObject(options: {
    name?: string;
    type: CollisionShapeType;
    transform?: Partial<Transform3D>;
    params?: Partial<CollisionShapeParams>;
    visualization?: Partial<CollisionVisualization>;
    enabled?: boolean;
    metadata?: Record<string, unknown>;
  }): string {
    const id = generateId();
    const defaultParams = createDefaultParams(options.type);

    const object: CollisionObject = {
      id,
      name: options.name ?? `Object ${this.world.objects.size + 1}`,
      type: options.type,
      enabled: options.enabled ?? true,
      transform: {
        ...createDefaultTransform(),
        ...options.transform,
      },
      params: {
        ...defaultParams,
        ...options.params,
      } as CollisionShapeParams,
      visualization: {
        ...DEFAULT_COLLISION_VISUALIZATION,
        ...options.visualization,
      },
      metadata: options.metadata,
    };

    this.world.objects.set(id, object);
    this.emit({ type: 'object-added', objectId: id, data: object });

    return id;
  }

  /**
   * Add a box collision object
   */
  addBox(options?: {
    name?: string;
    position?: Vector3Tuple;
    dimensions?: { width: number; height: number; depth: number };
    color?: string;
  }): string {
    return this.addObject({
      name: options?.name ?? 'Box',
      type: 'box',
      transform: options?.position ? { position: options.position } : undefined,
      params: options?.dimensions
        ? { type: 'box', ...options.dimensions }
        : undefined,
      visualization: options?.color ? { color: options.color } : undefined,
    });
  }

  /**
   * Add a sphere collision object
   */
  addSphere(options?: {
    name?: string;
    position?: Vector3Tuple;
    radius?: number;
    color?: string;
  }): string {
    return this.addObject({
      name: options?.name ?? 'Sphere',
      type: 'sphere',
      transform: options?.position ? { position: options.position } : undefined,
      params: options?.radius ? { type: 'sphere', radius: options.radius } : undefined,
      visualization: options?.color ? { color: options.color } : undefined,
    });
  }

  /**
   * Add a cylinder collision object
   */
  addCylinder(options?: {
    name?: string;
    position?: Vector3Tuple;
    radius?: number;
    height?: number;
    color?: string;
  }): string {
    return this.addObject({
      name: options?.name ?? 'Cylinder',
      type: 'cylinder',
      transform: options?.position ? { position: options.position } : undefined,
      params:
        options?.radius !== undefined || options?.height !== undefined
          ? {
              type: 'cylinder',
              radius: options?.radius ?? 0.25,
              height: options?.height ?? 0.5,
            }
          : undefined,
      visualization: options?.color ? { color: options.color } : undefined,
    });
  }

  /**
   * Add a capsule collision object
   */
  addCapsule(options?: {
    name?: string;
    position?: Vector3Tuple;
    radius?: number;
    height?: number;
    color?: string;
  }): string {
    return this.addObject({
      name: options?.name ?? 'Capsule',
      type: 'capsule',
      transform: options?.position ? { position: options.position } : undefined,
      params:
        options?.radius !== undefined || options?.height !== undefined
          ? {
              type: 'capsule',
              radius: options?.radius ?? 0.1,
              height: options?.height ?? 0.5,
            }
          : undefined,
      visualization: options?.color ? { color: options.color } : undefined,
    });
  }

  /**
   * Remove a collision object
   */
  removeObject(id: string): boolean {
    const existed = this.world.objects.delete(id);
    if (existed) {
      if (this.world.selectedObjectId === id) {
        this.world.selectedObjectId = null;
      }
      this.emit({ type: 'object-removed', objectId: id });
    }
    return existed;
  }

  /**
   * Update a collision object
   */
  updateObject(id: string, updates: Partial<Omit<CollisionObject, 'id'>>): void {
    const object = this.world.objects.get(id);
    if (!object) {
      throw new Error(`Collision object '${id}' not found`);
    }

    const updated: CollisionObject = {
      ...object,
      ...updates,
      transform: updates.transform
        ? { ...object.transform, ...updates.transform }
        : object.transform,
      visualization: updates.visualization
        ? { ...object.visualization, ...updates.visualization }
        : object.visualization,
    };

    this.world.objects.set(id, updated);
    this.emit({ type: 'object-updated', objectId: id, data: updated });
  }

  /**
   * Update object transform
   */
  setTransform(id: string, transform: Partial<Transform3D>): void {
    const object = this.world.objects.get(id);
    if (!object) {
      throw new Error(`Collision object '${id}' not found`);
    }

    this.updateObject(id, {
      transform: { ...object.transform, ...transform },
    });
  }

  /**
   * Enable or disable a collision object
   */
  setEnabled(id: string, enabled: boolean): void {
    this.updateObject(id, { enabled });
  }

  /**
   * Clear all collision objects
   */
  clearObjects(): void {
    const ids = Array.from(this.world.objects.keys());
    this.world.objects.clear();
    this.world.selectedObjectId = null;

    for (const id of ids) {
      this.emit({ type: 'object-removed', objectId: id });
    }
  }

  // ==========================================================================
  // Selection
  // ==========================================================================

  /**
   * Select a collision object
   */
  selectObject(id: string | null): void {
    if (id && !this.world.objects.has(id)) {
      throw new Error(`Collision object '${id}' not found`);
    }

    const previousId = this.world.selectedObjectId;
    this.world.selectedObjectId = id;

    if (previousId !== id) {
      this.emit({ type: 'selection-changed', objectId: id ?? undefined });
    }
  }

  /**
   * Get selected object ID
   */
  getSelectedObjectId(): string | null {
    return this.world.selectedObjectId;
  }

  // ==========================================================================
  // Robot Capsules
  // ==========================================================================

  /**
   * Set the robot capsule model
   */
  setRobotCapsules(capsules: RobotCapsuleModel | null): void {
    this.world.robotCapsules = capsules;
    this.emit({ type: 'robot-capsules-loaded', data: capsules });
  }

  /**
   * Create robot capsules from link dimensions
   * This is a simplified version - full implementation would parse URDF
   */
  createRobotCapsulesFromLinks(
    robotId: string,
    links: Array<{
      name: string;
      radius: number;
      length: number;
      axis?: 'x' | 'y' | 'z';
    }>,
    selfCollisionPairs?: Array<[number, number]>
  ): RobotCapsuleModel {
    const capsules = links.map((link, index) => {
      const halfLength = link.length / 2;
      const axis = link.axis ?? 'z';

      let point1: Vector3Tuple;
      let point2: Vector3Tuple;

      switch (axis) {
        case 'x':
          point1 = [-halfLength, 0, 0];
          point2 = [halfLength, 0, 0];
          break;
        case 'y':
          point1 = [0, -halfLength, 0];
          point2 = [0, halfLength, 0];
          break;
        case 'z':
        default:
          point1 = [0, 0, -halfLength];
          point2 = [0, 0, halfLength];
          break;
      }

      return {
        linkIndex: index,
        linkName: link.name,
        radius: link.radius,
        point1,
        point2,
      };
    });

    const model: RobotCapsuleModel = {
      robotId,
      linkNames: links.map((l) => l.name),
      capsules,
      selfCollisionPairs: selfCollisionPairs ?? [],
      ignoredLinksForEnv: [0], // Typically ignore base link
    };

    this.setRobotCapsules(model);
    return model;
  }

  // ==========================================================================
  // Import
  // ==========================================================================

  /**
   * Import mesh from vertices and indices
   */
  importMesh(
    vertices: Float32Array,
    indices: Uint32Array,
    options: MeshImportOptions
  ): string {
    // Compute bounding sphere
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    const center: Vector3Tuple = [
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ];

    const radius = Math.sqrt(
      Math.pow(maxX - minX, 2) +
      Math.pow(maxY - minY, 2) +
      Math.pow(maxZ - minZ, 2)
    ) / 2;

    return this.addObject({
      name: options.name,
      type: 'mesh',
      transform: {
        ...createDefaultTransform(),
        ...options.transform,
        scale: options.scale ? [options.scale, options.scale, options.scale] : [1, 1, 1],
      },
      params: {
        type: 'mesh',
        vertices,
        indices,
        boundingSphere: { center, radius },
      },
      visualization: options.visualization,
    });
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Export world state to JSON-serializable format
   */
  toJSON(): {
    objects: Array<Omit<CollisionObject, 'params'> & { params: Record<string, unknown> }>;
    robotCapsules: RobotCapsuleModel | null;
  } {
    const objects = this.getObjects().map((obj) => {
      // Convert typed arrays to regular arrays for JSON
      const params: Record<string, unknown> = { ...obj.params };
      if (obj.params.type === 'mesh') {
        params.vertices = Array.from(obj.params.vertices);
        params.indices = Array.from(obj.params.indices);
      } else if (obj.params.type === 'convexHull') {
        params.points = Array.from(obj.params.points);
      }

      return { ...obj, params };
    });

    return {
      objects,
      robotCapsules: this.world.robotCapsules,
    };
  }

  /**
   * Import world state from JSON
   */
  fromJSON(data: {
    objects: Array<Record<string, unknown>>;
    robotCapsules?: RobotCapsuleModel | null;
  }): void {
    this.clearObjects();

    for (const objData of data.objects) {
      const params = objData.params as Record<string, unknown>;

      // Convert arrays back to typed arrays
      if (params.type === 'mesh') {
        params.vertices = new Float32Array(params.vertices as number[]);
        params.indices = new Uint32Array(params.indices as number[]);
      } else if (params.type === 'convexHull') {
        params.points = new Float32Array(params.points as number[]);
      }

      const object = objData as unknown as CollisionObject;
      this.world.objects.set(object.id, object);
      this.emit({ type: 'object-added', objectId: object.id, data: object });
    }

    if (data.robotCapsules) {
      this.setRobotCapsules(data.robotCapsules);
    }
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  /**
   * Subscribe to collision world events
   */
  addEventListener(callback: CollisionWorldEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: CollisionWorldEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in collision world event listener:', error);
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: CollisionWorldManager | null = null;

/**
 * Get the collision world manager singleton
 */
export function getCollisionWorldManager(): CollisionWorldManager {
  if (!managerInstance) {
    managerInstance = new CollisionWorldManager();
  }
  return managerInstance;
}

/**
 * Reset the collision world manager (for testing)
 */
export function resetCollisionWorldManager(): void {
  managerInstance = null;
}
