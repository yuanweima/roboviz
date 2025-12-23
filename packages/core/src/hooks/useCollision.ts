/**
 * useCollision Hook
 *
 * React hook for collision detection integration.
 * Provides easy access to CollisionManager functionality in React components.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CollisionManager,
  createCollisionManager,
  getCollisionManager,
} from '../collision/collision-manager';
import type {
  CollisionGeometry,
  SafetyZone,
  SafetyLevel,
  CollisionResult,
  CollisionPair,
  SafetyZoneTriggerState,
  DistanceQueryResult,
  PathCollisionCheckResult,
  CollisionEvent,
  CollisionDetectedEvent,
  SafetyZoneEnteredEvent,
  SafetyZoneExitedEvent,
} from '../collision/types';
import type { Vector3, Transform, ObstacleData, PrimitiveObstacle } from '../types';

/**
 * Options for the useCollision hook
 */
export interface UseCollisionOptions {
  /** Whether collision detection is enabled (default: true) */
  enabled?: boolean;
  /** Check interval in milliseconds (0 = every frame, default: 100) */
  checkInterval?: number;
  /** Whether to use the global collision manager or create a local one */
  useGlobal?: boolean;
  /** Callback when collision is detected */
  onCollision?: (pairs: CollisionPair[]) => void;
  /** Callback when collision is resolved (no longer colliding) */
  onCollisionResolved?: () => void;
  /** Callback when entering a safety zone */
  onSafetyZoneEnter?: (zoneId: string, robotId: string, level: SafetyLevel) => void;
  /** Callback when exiting a safety zone */
  onSafetyZoneExit?: (zoneId: string, robotId: string, level: SafetyLevel) => void;
}

/**
 * State returned by the useCollision hook
 */
export interface UseCollisionState {
  /** Whether any collision is currently detected */
  hasCollision: boolean;
  /** Current collision pairs */
  collisionPairs: CollisionPair[];
  /** Safety zone trigger states */
  safetyZoneStates: SafetyZoneTriggerState[];
  /** Last collision check result */
  lastResult: CollisionResult | null;
  /** Whether collision detection is currently enabled */
  isEnabled: boolean;
}

/**
 * Actions returned by the useCollision hook
 */
export interface UseCollisionActions {
  /** Add a collision geometry */
  addGeometry: (geometry: CollisionGeometry, transform?: Transform) => void;
  /** Remove a collision geometry */
  removeGeometry: (id: string) => void;
  /** Update a collision geometry's transform */
  updateGeometryTransform: (id: string, transform: Transform) => void;
  /** Add an obstacle (converts to collision geometry internally) */
  addObstacle: (obstacle: ObstacleData) => void;
  /** Remove an obstacle */
  removeObstacle: (id: string) => void;
  /** Add a safety zone */
  addSafetyZone: (zone: SafetyZone) => void;
  /** Remove a safety zone */
  removeSafetyZone: (id: string) => void;
  /** Manually trigger a collision check */
  checkCollisions: () => CollisionResult;
  /** Check robot TCP position against safety zones */
  checkRobotSafety: (robotId: string, tcpPosition: Vector3) => SafetyZoneTriggerState[];
  /** Query distance from a point to nearest geometry */
  queryDistance: (point: Vector3, geometryIds?: string[]) => DistanceQueryResult;
  /** Check a path for collisions */
  checkPath: (path: Vector3[], robotId?: string) => PathCollisionCheckResult;
  /** Enable/disable collision detection */
  setEnabled: (enabled: boolean) => void;
  /** Clear all geometries */
  clearGeometries: () => void;
  /** Clear all safety zones */
  clearSafetyZones: () => void;
  /** Clear everything */
  clearAll: () => void;
}

/**
 * Convert ObstacleData to CollisionGeometry
 */
function obstacleToCollisionGeometry(obstacle: ObstacleData): CollisionGeometry | null {
  if (obstacle.type !== 'primitive') {
    // URDF obstacles would need special handling
    return null;
  }

  const primitive = obstacle as PrimitiveObstacle;
  const { shape, dimensions } = primitive.primitive;

  let params: CollisionGeometry['params'];
  let type: CollisionGeometry['type'];

  switch (shape) {
    case 'box':
      type = 'box';
      params = {
        width: dimensions.x,
        height: dimensions.y,
        depth: dimensions.z,
      };
      break;
    case 'sphere':
      type = 'sphere';
      params = {
        radius: dimensions.x / 2, // Assuming uniform dimensions for sphere
      };
      break;
    case 'cylinder':
      type = 'cylinder';
      params = {
        radius: dimensions.x / 2,
        height: dimensions.y,
      };
      break;
    default:
      return null;
  }

  return {
    id: obstacle.id,
    type,
    params,
    associatedObjectType: 'obstacle',
    metadata: { obstacleId: obstacle.id },
  };
}

/**
 * Hook for collision detection in React components
 *
 * @example
 * ```tsx
 * function MyScene() {
 *   const [collision, actions] = useCollision({
 *     onCollision: (pairs) => console.log('Collision detected!', pairs),
 *     onSafetyZoneEnter: (zoneId, robotId, level) => {
 *       if (level === 'danger') {
 *         console.error('Robot in danger zone!');
 *       }
 *     },
 *   });
 *
 *   // Add obstacles
 *   useEffect(() => {
 *     actions.addObstacle({
 *       id: 'box1',
 *       type: 'primitive',
 *       primitive: { shape: 'box', dimensions: { x: 0.2, y: 0.2, z: 0.2 } },
 *       transform: { position: { x: 0.5, y: 0.1, z: 0 }, rotation: { w: 1, x: 0, y: 0, z: 0 } },
 *     });
 *   }, []);
 *
 *   return (
 *     <>
 *       {collision.hasCollision && <WarningIndicator />}
 *       <Robot onTcpUpdate={(pos) => actions.checkRobotSafety('robot1', pos)} />
 *     </>
 *   );
 * }
 * ```
 */
export function useCollision(
  options: UseCollisionOptions = {}
): [UseCollisionState, UseCollisionActions] {
  const {
    enabled: initialEnabled = true,
    checkInterval = 100,
    useGlobal = true,
    onCollision,
    onCollisionResolved,
    onSafetyZoneEnter,
    onSafetyZoneExit,
  } = options;

  // State
  const [hasCollision, setHasCollision] = useState(false);
  const [collisionPairs, setCollisionPairs] = useState<CollisionPair[]>([]);
  const [safetyZoneStates, setSafetyZoneStates] = useState<SafetyZoneTriggerState[]>([]);
  const [lastResult, setLastResult] = useState<CollisionResult | null>(null);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);

  // Refs for stable callbacks
  const onCollisionRef = useRef(onCollision);
  const onCollisionResolvedRef = useRef(onCollisionResolved);
  const onSafetyZoneEnterRef = useRef(onSafetyZoneEnter);
  const onSafetyZoneExitRef = useRef(onSafetyZoneExit);
  const hadCollisionRef = useRef(false);
  const lastCheckTimeRef = useRef(0);

  // Update callback refs
  useEffect(() => {
    onCollisionRef.current = onCollision;
    onCollisionResolvedRef.current = onCollisionResolved;
    onSafetyZoneEnterRef.current = onSafetyZoneEnter;
    onSafetyZoneExitRef.current = onSafetyZoneExit;
  }, [onCollision, onCollisionResolved, onSafetyZoneEnter, onSafetyZoneExit]);

  // Get or create collision manager
  const manager = useMemo(() => {
    return useGlobal ? getCollisionManager() : createCollisionManager();
  }, [useGlobal]);

  // Subscribe to collision events
  useEffect(() => {
    const unsubscribe = manager.onCollisionEvent((event: CollisionEvent) => {
      switch (event.type) {
        case 'collision_detected': {
          const detectedEvent = event as CollisionDetectedEvent;
          if (onCollisionRef.current) {
            onCollisionRef.current(detectedEvent.pairs);
          }
          break;
        }
        case 'safety_zone_entered': {
          const enteredEvent = event as SafetyZoneEnteredEvent;
          if (onSafetyZoneEnterRef.current) {
            onSafetyZoneEnterRef.current(enteredEvent.zoneId, enteredEvent.robotId, enteredEvent.level);
          }
          break;
        }
        case 'safety_zone_exited': {
          const exitedEvent = event as SafetyZoneExitedEvent;
          if (onSafetyZoneExitRef.current) {
            onSafetyZoneExitRef.current(exitedEvent.zoneId, exitedEvent.robotId, exitedEvent.level);
          }
          break;
        }
      }
    });

    return unsubscribe;
  }, [manager]);

  // Cleanup non-global manager on unmount
  useEffect(() => {
    if (!useGlobal) {
      return () => {
        manager.dispose();
      };
    }
  }, [manager, useGlobal]);

  // Periodic collision check using useFrame
  useFrame(() => {
    if (!isEnabled) return;

    const now = Date.now();
    if (checkInterval > 0 && now - lastCheckTimeRef.current < checkInterval) {
      return;
    }
    lastCheckTimeRef.current = now;

    const result = manager.checkCollisions();
    setLastResult(result);
    setHasCollision(result.hasCollision);
    setCollisionPairs(result.pairs);

    // Track collision state changes
    if (result.hasCollision && !hadCollisionRef.current) {
      hadCollisionRef.current = true;
      if (onCollisionRef.current) {
        onCollisionRef.current(result.pairs);
      }
    } else if (!result.hasCollision && hadCollisionRef.current) {
      hadCollisionRef.current = false;
      if (onCollisionResolvedRef.current) {
        onCollisionResolvedRef.current();
      }
    }

    // Update safety zone states
    setSafetyZoneStates(manager.getSafetyZoneTriggerStates());
  });

  // Actions
  const addGeometry = useCallback(
    (geometry: CollisionGeometry, transform?: Transform) => {
      manager.addCollisionGeometry(geometry, transform);
    },
    [manager]
  );

  const removeGeometry = useCallback(
    (id: string) => {
      manager.removeCollisionGeometry(id);
    },
    [manager]
  );

  const updateGeometryTransform = useCallback(
    (id: string, transform: Transform) => {
      manager.setCollisionGeometryTransform(id, transform);
    },
    [manager]
  );

  const addObstacle = useCallback(
    (obstacle: ObstacleData) => {
      const geometry = obstacleToCollisionGeometry(obstacle);
      if (geometry) {
        manager.addCollisionGeometry(geometry, obstacle.transform);
      }
    },
    [manager]
  );

  const removeObstacle = useCallback(
    (id: string) => {
      manager.removeCollisionGeometry(id);
    },
    [manager]
  );

  const addSafetyZone = useCallback(
    (zone: SafetyZone) => {
      manager.addSafetyZone(zone);
    },
    [manager]
  );

  const removeSafetyZone = useCallback(
    (id: string) => {
      manager.removeSafetyZone(id);
    },
    [manager]
  );

  const checkCollisions = useCallback(() => {
    return manager.checkCollisions();
  }, [manager]);

  const checkRobotSafety = useCallback(
    (robotId: string, tcpPosition: Vector3) => {
      return manager.checkRobotInSafetyZones(robotId, tcpPosition);
    },
    [manager]
  );

  const queryDistance = useCallback(
    (point: Vector3, geometryIds?: string[]) => {
      return manager.queryDistance({ point, geometryIds });
    },
    [manager]
  );

  const checkPath = useCallback(
    (path: Vector3[], robotId?: string) => {
      return manager.checkPathCollision({ path, robotId });
    },
    [manager]
  );

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  const clearGeometries = useCallback(() => {
    manager.clearCollisionGeometries();
    setCollisionPairs([]);
    setHasCollision(false);
  }, [manager]);

  const clearSafetyZones = useCallback(() => {
    manager.clearSafetyZones();
    setSafetyZoneStates([]);
  }, [manager]);

  const clearAll = useCallback(() => {
    clearGeometries();
    clearSafetyZones();
  }, [clearGeometries, clearSafetyZones]);

  const state: UseCollisionState = {
    hasCollision,
    collisionPairs,
    safetyZoneStates,
    lastResult,
    isEnabled,
  };

  const actions: UseCollisionActions = {
    addGeometry,
    removeGeometry,
    updateGeometryTransform,
    addObstacle,
    removeObstacle,
    addSafetyZone,
    removeSafetyZone,
    checkCollisions,
    checkRobotSafety,
    queryDistance,
    checkPath,
    setEnabled,
    clearGeometries,
    clearSafetyZones,
    clearAll,
  };

  return [state, actions];
}

export default useCollision;
