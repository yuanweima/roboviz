/**
 * useCollisionWorld Hook
 *
 * React hook for managing collision world state with full CRUD operations.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  CollisionWorldManager,
} from '../world/CollisionWorldManager';
import type {
  CollisionWorld,
  CollisionObject,
  CollisionShapeType,
  Transform3D,
  CollisionVisualization,
  RobotCapsuleModel,
  Vector3Tuple,
  MeshImportOptions,
  CollisionWorldEvent,
} from '../world/types';

// ============================================================================
// Types
// ============================================================================

export interface UseCollisionWorldOptions {
  /** Initial collision objects */
  initialObjects?: CollisionObject[];
  /** Robot capsule model */
  robotCapsules?: RobotCapsuleModel | null;
  /** Event callback */
  onEvent?: (event: CollisionWorldEvent) => void;
}

export interface UseCollisionWorldReturn {
  // State
  /** All collision objects */
  objects: CollisionObject[];
  /** The complete collision world */
  world: CollisionWorld;
  /** Currently selected object ID */
  selectedId: string | null;
  /** Currently selected object */
  selectedObject: CollisionObject | undefined;
  /** Robot capsule model */
  robotCapsules: RobotCapsuleModel | null;

  // CRUD Operations
  /** Add a new collision object */
  addObject: (options: {
    name?: string;
    type: CollisionShapeType;
    transform?: Partial<Transform3D>;
    params?: Record<string, unknown>;
    visualization?: Partial<CollisionVisualization>;
  }) => string;
  /** Add a box */
  addBox: (options?: { name?: string; position?: Vector3Tuple; dimensions?: { width: number; height: number; depth: number }; color?: string }) => string;
  /** Add a sphere */
  addSphere: (options?: { name?: string; position?: Vector3Tuple; radius?: number; color?: string }) => string;
  /** Add a cylinder */
  addCylinder: (options?: { name?: string; position?: Vector3Tuple; radius?: number; height?: number; color?: string }) => string;
  /** Add a capsule */
  addCapsule: (options?: { name?: string; position?: Vector3Tuple; radius?: number; height?: number; color?: string }) => string;
  /** Remove a collision object */
  removeObject: (id: string) => void;
  /** Update a collision object */
  updateObject: (id: string, updates: Partial<Omit<CollisionObject, 'id'>>) => void;
  /** Update object transform */
  setTransform: (id: string, transform: Partial<Transform3D>) => void;
  /** Enable or disable an object */
  setEnabled: (id: string, enabled: boolean) => void;
  /** Clear all objects */
  clearObjects: () => void;

  // Selection
  /** Select an object */
  selectObject: (id: string | null) => void;

  // Robot Capsules
  /** Set robot capsule model */
  setRobotCapsules: (capsules: RobotCapsuleModel | null) => void;

  // Import
  /** Import mesh from vertices and indices */
  importMesh: (vertices: Float32Array, indices: Uint32Array, options: MeshImportOptions) => string;

  // Serialization
  /** Export world to JSON */
  toJSON: () => ReturnType<CollisionWorldManager['toJSON']>;
  /** Import world from JSON */
  fromJSON: (data: Parameters<CollisionWorldManager['fromJSON']>[0]) => void;

  // Manager access
  /** Get the underlying manager instance */
  getManager: () => CollisionWorldManager;
}

// ============================================================================
// Hook
// ============================================================================

export function useCollisionWorld(options: UseCollisionWorldOptions = {}): UseCollisionWorldReturn {
  const { initialObjects, robotCapsules: initialRobotCapsules, onEvent } = options;

  // Create manager instance
  const managerRef = useRef<CollisionWorldManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new CollisionWorldManager();

    // Add initial objects
    if (initialObjects) {
      for (const obj of initialObjects) {
        managerRef.current.addObject({
          ...obj,
          type: obj.type,
        });
      }
    }

    // Set initial robot capsules
    if (initialRobotCapsules) {
      managerRef.current.setRobotCapsules(initialRobotCapsules);
    }
  }

  const manager = managerRef.current;

  // State for triggering re-renders using a version counter
  const [version, setVersion] = useState(0);

  // Subscribe to manager events
  useEffect(() => {
    const unsubscribe = manager.addEventListener((event) => {
      setVersion(v => v + 1);
      onEvent?.(event);
    });

    return unsubscribe;
  }, [manager, onEvent]);

  // Memoized state values - depend on version to update when manager changes
  const objects = useMemo(() => manager.getObjects(), [manager, version]);
  const world = useMemo(() => manager.getWorld(), [manager, version]);
  const selectedId = manager.getSelectedObjectId();
  const selectedObject = selectedId ? manager.getObject(selectedId) : undefined;
  const robotCapsules = manager.getRobotCapsules();

  // CRUD callbacks
  const addObject = useCallback(
    (opts: Parameters<UseCollisionWorldReturn['addObject']>[0]) => {
      return manager.addObject(opts as Parameters<CollisionWorldManager['addObject']>[0]);
    },
    [manager]
  );

  const addBox = useCallback(
    (opts?: Parameters<UseCollisionWorldReturn['addBox']>[0]) => {
      return manager.addBox(opts);
    },
    [manager]
  );

  const addSphere = useCallback(
    (opts?: Parameters<UseCollisionWorldReturn['addSphere']>[0]) => {
      return manager.addSphere(opts);
    },
    [manager]
  );

  const addCylinder = useCallback(
    (opts?: Parameters<UseCollisionWorldReturn['addCylinder']>[0]) => {
      return manager.addCylinder(opts);
    },
    [manager]
  );

  const addCapsule = useCallback(
    (opts?: Parameters<UseCollisionWorldReturn['addCapsule']>[0]) => {
      return manager.addCapsule(opts);
    },
    [manager]
  );

  const removeObject = useCallback(
    (id: string) => {
      manager.removeObject(id);
    },
    [manager]
  );

  const updateObject = useCallback(
    (id: string, updates: Partial<Omit<CollisionObject, 'id'>>) => {
      manager.updateObject(id, updates);
    },
    [manager]
  );

  const setTransform = useCallback(
    (id: string, transform: Partial<Transform3D>) => {
      manager.setTransform(id, transform);
    },
    [manager]
  );

  const setEnabled = useCallback(
    (id: string, enabled: boolean) => {
      manager.setEnabled(id, enabled);
    },
    [manager]
  );

  const clearObjects = useCallback(() => {
    manager.clearObjects();
  }, [manager]);

  const selectObject = useCallback(
    (id: string | null) => {
      manager.selectObject(id);
      setVersion(v => v + 1);
    },
    [manager]
  );

  const setRobotCapsules = useCallback(
    (capsules: RobotCapsuleModel | null) => {
      manager.setRobotCapsules(capsules);
    },
    [manager]
  );

  const importMesh = useCallback(
    (vertices: Float32Array, indices: Uint32Array, meshOptions: MeshImportOptions) => {
      return manager.importMesh(vertices, indices, meshOptions);
    },
    [manager]
  );

  const toJSON = useCallback(() => {
    return manager.toJSON();
  }, [manager]);

  const fromJSON = useCallback(
    (data: Parameters<CollisionWorldManager['fromJSON']>[0]) => {
      manager.fromJSON(data);
    },
    [manager]
  );

  const getManager = useCallback(() => manager, [manager]);

  return {
    // State
    objects,
    world,
    selectedId,
    selectedObject,
    robotCapsules,

    // CRUD
    addObject,
    addBox,
    addSphere,
    addCylinder,
    addCapsule,
    removeObject,
    updateObject,
    setTransform,
    setEnabled,
    clearObjects,

    // Selection
    selectObject,

    // Robot Capsules
    setRobotCapsules,

    // Import
    importMesh,

    // Serialization
    toJSON,
    fromJSON,

    // Manager
    getManager,
  };
}

export default useCollisionWorld;
