/**
 * useWaypointManager Hook
 *
 * React hook for managing planning waypoints.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { WaypointManager } from './WaypointManager';
import type {
  PlanningWaypoint,
  WaypointType,
  Pose3D,
  MotionConstraints,
  WaypointEvent,
  WaypointExportData,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface UseWaypointManagerOptions {
  /** Initial waypoints */
  initialWaypoints?: PlanningWaypoint[];
  /** Event callback */
  onEvent?: (event: WaypointEvent) => void;
  /** IK solver function (async) */
  ikSolver?: (pose: Pose3D, seed?: number[]) => Promise<number[] | null>;
}

export interface UseWaypointManagerReturn {
  // State
  waypoints: PlanningWaypoint[];
  waypointsInOrder: PlanningWaypoint[];
  pathOrder: string[];
  selectedId: string | null;
  selectedWaypoint: PlanningWaypoint | undefined;
  selectedIds: string[];
  isClosedLoop: boolean;

  // Waypoint CRUD
  addWaypoint: (options: {
    pose: Pose3D;
    type?: WaypointType;
    name?: string;
    insertAt?: number;
    motionConstraints?: MotionConstraints;
  }) => string;
  addStart: (pose: Pose3D, options?: { name?: string }) => string;
  addGoal: (pose: Pose3D, options?: { name?: string }) => string;
  addVia: (pose: Pose3D, options?: { name?: string; insertAt?: number }) => string;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, updates: Partial<Omit<PlanningWaypoint, 'id'>>) => void;
  setPose: (id: string, pose: Partial<Pose3D>) => void;
  clearWaypoints: () => void;

  // Path ordering
  reorderPath: (fromIndex: number, toIndex: number) => void;
  reversePath: () => void;
  setClosedLoop: (closed: boolean) => void;

  // Selection
  selectWaypoint: (id: string | null) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;

  // IK
  computeIK: (id: string) => Promise<number[] | null>;
  computeAllIK: () => Promise<void>;

  // Serialization
  toJSON: () => WaypointExportData;
  fromJSON: (data: WaypointExportData) => void;

  // Manager access
  getManager: () => WaypointManager;
}

// ============================================================================
// Hook
// ============================================================================

export function useWaypointManager(options: UseWaypointManagerOptions = {}): UseWaypointManagerReturn {
  const { initialWaypoints, onEvent, ikSolver } = options;

  // Create manager instance
  const managerRef = useRef<WaypointManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new WaypointManager();

    // Add initial waypoints
    if (initialWaypoints) {
      for (const wp of initialWaypoints) {
        managerRef.current.addWaypoint({
          pose: wp.pose,
          type: wp.type,
          name: wp.name,
          joints: wp.joints,
          ikStatus: wp.ikStatus,
          motionConstraints: wp.motionConstraints,
          color: wp.color,
          metadata: wp.metadata,
        });
      }
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
  const waypoints = useMemo(() => manager.getWaypoints(), [manager, version]);
  const waypointsInOrder = useMemo(() => manager.getWaypointsInOrder(), [manager, version]);
  const pathOrder = useMemo(() => manager.getPathOrder(), [manager, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedId = useMemo(() => manager.getState().selectedId, [manager, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedWaypoint = useMemo(() => manager.getSelectedWaypoint(), [manager, version]);
  const selectedIds = useMemo(() => manager.getSelectedIds(), [manager, version]);
  const isClosedLoop = useMemo(() => manager.isClosedLoop(), [manager, version]);

  // CRUD callbacks
  const addWaypoint = useCallback(
    (opts: Parameters<UseWaypointManagerReturn['addWaypoint']>[0]) => {
      return manager.addWaypoint(opts);
    },
    [manager]
  );

  const addStart = useCallback(
    (pose: Pose3D, opts?: { name?: string }) => {
      return manager.addStart(pose, opts);
    },
    [manager]
  );

  const addGoal = useCallback(
    (pose: Pose3D, opts?: { name?: string }) => {
      return manager.addGoal(pose, opts);
    },
    [manager]
  );

  const addVia = useCallback(
    (pose: Pose3D, opts?: { name?: string; insertAt?: number }) => {
      return manager.addVia(pose, opts);
    },
    [manager]
  );

  const removeWaypoint = useCallback(
    (id: string) => {
      manager.removeWaypoint(id);
    },
    [manager]
  );

  const updateWaypoint = useCallback(
    (id: string, updates: Partial<Omit<PlanningWaypoint, 'id'>>) => {
      manager.updateWaypoint(id, updates);
    },
    [manager]
  );

  const setPose = useCallback(
    (id: string, pose: Partial<Pose3D>) => {
      manager.setPose(id, pose);
    },
    [manager]
  );

  const clearWaypoints = useCallback(() => {
    manager.clearWaypoints();
  }, [manager]);

  // Path ordering
  const reorderPath = useCallback(
    (fromIndex: number, toIndex: number) => {
      manager.reorderPath(fromIndex, toIndex);
    },
    [manager]
  );

  const reversePath = useCallback(() => {
    manager.reversePath();
  }, [manager]);

  const setClosedLoop = useCallback(
    (closed: boolean) => {
      manager.setClosedLoop(closed);
    },
    [manager]
  );

  // Selection
  const selectWaypoint = useCallback(
    (id: string | null) => {
      manager.selectWaypoint(id);
      setVersion(v => v + 1);
    },
    [manager]
  );

  const addToSelection = useCallback(
    (id: string) => {
      manager.addToSelection(id);
    },
    [manager]
  );

  const removeFromSelection = useCallback(
    (id: string) => {
      manager.removeFromSelection(id);
    },
    [manager]
  );

  const clearSelection = useCallback(() => {
    manager.clearSelection();
  }, [manager]);

  // IK
  const computeIK = useCallback(
    async (id: string): Promise<number[] | null> => {
      if (!ikSolver) {
        console.warn('No IK solver provided');
        return null;
      }

      const waypoint = manager.getWaypoint(id);
      if (!waypoint) {
        console.error(`Waypoint '${id}' not found`);
        return null;
      }

      manager.updateWaypoint(id, { ikStatus: 'computing' });

      try {
        // Use previous joints as seed if available
        const seed = waypoint.joints;
        const solution = await ikSolver(waypoint.pose, seed);

        manager.setIKSolution(id, solution, solution ? undefined : 'No solution found');
        return solution;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'IK computation failed';
        manager.setIKSolution(id, null, errorMessage);
        return null;
      }
    },
    [manager, ikSolver]
  );

  const computeAllIK = useCallback(async (): Promise<void> => {
    const wpList = manager.getWaypointsInOrder();

    for (const wp of wpList) {
      if (wp.ikStatus !== 'solved' || !wp.joints) {
        await computeIK(wp.id);
      }
    }
  }, [manager, computeIK]);

  // Serialization
  const toJSON = useCallback(() => {
    return manager.toJSON();
  }, [manager]);

  const fromJSON = useCallback(
    (data: WaypointExportData) => {
      manager.fromJSON(data);
    },
    [manager]
  );

  const getManager = useCallback(() => manager, [manager]);

  return {
    // State
    waypoints,
    waypointsInOrder,
    pathOrder,
    selectedId,
    selectedWaypoint,
    selectedIds,
    isClosedLoop,

    // CRUD
    addWaypoint,
    addStart,
    addGoal,
    addVia,
    removeWaypoint,
    updateWaypoint,
    setPose,
    clearWaypoints,

    // Path ordering
    reorderPath,
    reversePath,
    setClosedLoop,

    // Selection
    selectWaypoint,
    addToSelection,
    removeFromSelection,
    clearSelection,

    // IK
    computeIK,
    computeAllIK,

    // Serialization
    toJSON,
    fromJSON,

    // Manager
    getManager,
  };
}

export default useWaypointManager;
