/**
 * Scoped Store Factory
 *
 * Creates instance-isolated Zustand stores for RoboViz instances.
 * This allows multiple RoboViz instances on the same page to have
 * independent state.
 */

import { createStore, type StoreApi } from 'zustand/vanilla';
import type {
  RoboVizState,
  SceneConfig,
  CameraState,
  RobotState,
  TrajectoryState,
  WaypointData,
  ObstacleData,
  PlaybackState,
} from '../types';

// =============================================================================
// Store Actions Interface
// =============================================================================

export interface ScopedStoreActions {
  // Scene
  setScene: (config: Partial<SceneConfig>) => void;

  // Camera
  setCamera: (config: Partial<CameraState>) => void;

  // Robots
  addRobot: (robot: RobotState) => void;
  removeRobot: (id: string) => void;
  updateRobot: (id: string, updates: Partial<RobotState>) => void;
  setRobotJointAngles: (id: string, angles: number[]) => void;

  // Trajectories
  addTrajectory: (trajectory: TrajectoryState) => void;
  removeTrajectory: (id: string) => void;
  updateTrajectory: (id: string, updates: Partial<TrajectoryState>) => void;

  // Playback
  setPlayback: (updates: Partial<PlaybackState>) => void;

  // Waypoints
  addWaypoint: (waypoint: WaypointData) => void;
  removeWaypoint: (id: string) => void;
  selectWaypoint: (id: string | null) => void;
  clearWaypoints: () => void;

  // Obstacles
  addObstacle: (obstacle: ObstacleData) => void;
  removeObstacle: (id: string) => void;
  clearObstacles: () => void;

  // Selection
  selectObject: (id: string | null) => void;
  hoverObject: (id: string | null) => void;

  // Reset
  reset: () => void;
}

// Combined state and actions type
export type ScopedVizState = RoboVizState & ScopedStoreActions;

// Store type for vanilla Zustand
export type ScopedVizStore = StoreApi<ScopedVizState>;

// =============================================================================
// Default State
// =============================================================================

const defaultScene: SceneConfig = {
  background: '#0a0a0a',
  grid: {
    enabled: true,
    size: 10,
    divisions: 10,
    color: '#4a4a4a',
  },
  lighting: {
    ambient: { intensity: 0.4, color: '#ffffff' },
    directional: { intensity: 0.8, position: { x: 10, y: 10, z: 5 } },
  },
};

const defaultCamera: CameraState = {
  position: { x: 3, y: 3, z: 3 },
  target: { x: 0, y: 0, z: 0 },
  fov: 50,
};

const defaultPlayback: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  speed: 1.0,
  loop: false,
  activeTrajectoryId: null,
};

function getDefaultState(): RoboVizState {
  return {
    scene: { ...defaultScene },
    camera: { ...defaultCamera },
    robots: new Map(),
    trajectories: new Map(),
    waypoints: new Map(),
    obstacles: new Map(),
    playback: { ...defaultPlayback },
    selectedObjectId: null,
    hoveredObjectId: null,
    selectedWaypointId: null,
  };
}

// =============================================================================
// Store Factory
// =============================================================================

export interface CreateScopedStoreOptions {
  /** Initial scene configuration */
  scene?: Partial<SceneConfig>;
  /** Initial camera state */
  camera?: Partial<CameraState>;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Create a new scoped Zustand store for a RoboViz instance
 *
 * @param options - Initial configuration options
 * @returns Zustand vanilla store
 *
 * @example
 * ```typescript
 * const store = createScopedStore({
 *   scene: { background: '#1a1a2e' },
 *   camera: { position: { x: 5, y: 5, z: 5 } },
 * });
 *
 * // Access state
 * const state = store.getState();
 * console.log(state.robots.size);
 *
 * // Update state
 * store.getState().addRobot({ id: 'robot1', ... });
 *
 * // Subscribe to changes
 * const unsubscribe = store.subscribe((state) => {
 *   console.log('State changed:', state);
 * });
 * ```
 */
export function createScopedStore(options: CreateScopedStoreOptions = {}): ScopedVizStore {
  const { scene: initialScene, camera: initialCamera, debug = false } = options;

  const initialState = getDefaultState();

  // Merge initial options
  if (initialScene) {
    initialState.scene = { ...initialState.scene, ...initialScene };
  }
  if (initialCamera) {
    initialState.camera = { ...initialState.camera, ...initialCamera };
  }

  return createStore<ScopedVizState>((set, get) => ({
    // Initial state
    ...initialState,

    // Scene actions
    setScene: (config) => {
      if (debug) console.log('[Store] setScene', config);
      set((state) => ({
        scene: { ...state.scene, ...config },
      }));
    },

    // Camera actions
    setCamera: (config) => {
      if (debug) console.log('[Store] setCamera', config);
      set((state) => ({
        camera: { ...state.camera, ...config },
      }));
    },

    // Robot actions
    addRobot: (robot) => {
      if (debug) console.log('[Store] addRobot', robot.id);
      set((state) => {
        const newRobots = new Map(state.robots);
        newRobots.set(robot.id, robot);
        return { robots: newRobots };
      });
    },

    removeRobot: (id) => {
      if (debug) console.log('[Store] removeRobot', id);
      set((state) => {
        const newRobots = new Map(state.robots);
        newRobots.delete(id);
        return { robots: newRobots };
      });
    },

    updateRobot: (id, updates) => {
      if (debug) console.log('[Store] updateRobot', id, updates);
      set((state) => {
        const robot = state.robots.get(id);
        if (!robot) return state;
        const newRobots = new Map(state.robots);
        newRobots.set(id, { ...robot, ...updates });
        return { robots: newRobots };
      });
    },

    setRobotJointAngles: (id, angles) => {
      if (debug) console.log('[Store] setRobotJointAngles', id, angles);
      set((state) => {
        const robot = state.robots.get(id);
        if (!robot) return state;
        const newRobots = new Map(state.robots);
        newRobots.set(id, { ...robot, jointAngles: angles });
        return { robots: newRobots };
      });
    },

    // Trajectory actions
    addTrajectory: (trajectory) => {
      if (debug) console.log('[Store] addTrajectory', trajectory.id);
      set((state) => {
        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(trajectory.id, trajectory);
        return { trajectories: newTrajectories };
      });
    },

    removeTrajectory: (id) => {
      if (debug) console.log('[Store] removeTrajectory', id);
      set((state) => {
        const newTrajectories = new Map(state.trajectories);
        newTrajectories.delete(id);
        return { trajectories: newTrajectories };
      });
    },

    updateTrajectory: (id, updates) => {
      if (debug) console.log('[Store] updateTrajectory', id, updates);
      set((state) => {
        const trajectory = state.trajectories.get(id);
        if (!trajectory) return state;
        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(id, { ...trajectory, ...updates });
        return { trajectories: newTrajectories };
      });
    },

    // Playback actions
    setPlayback: (updates) => {
      if (debug) console.log('[Store] setPlayback', updates);
      set((state) => ({
        playback: { ...state.playback, ...updates },
      }));
    },

    // Waypoint actions
    addWaypoint: (waypoint) => {
      if (debug) console.log('[Store] addWaypoint', waypoint.id);
      set((state) => {
        const newWaypoints = new Map(state.waypoints);
        newWaypoints.set(waypoint.id, waypoint);
        return { waypoints: newWaypoints };
      });
    },

    removeWaypoint: (id) => {
      if (debug) console.log('[Store] removeWaypoint', id);
      set((state) => {
        const newWaypoints = new Map(state.waypoints);
        newWaypoints.delete(id);
        return { waypoints: newWaypoints };
      });
    },

    selectWaypoint: (id) => {
      if (debug) console.log('[Store] selectWaypoint', id);
      set({ selectedWaypointId: id });
    },

    clearWaypoints: () => {
      if (debug) console.log('[Store] clearWaypoints');
      set({ waypoints: new Map(), selectedWaypointId: null });
    },

    // Obstacle actions
    addObstacle: (obstacle) => {
      if (debug) console.log('[Store] addObstacle', obstacle.id);
      set((state) => {
        const newObstacles = new Map(state.obstacles);
        newObstacles.set(obstacle.id, obstacle);
        return { obstacles: newObstacles };
      });
    },

    removeObstacle: (id) => {
      if (debug) console.log('[Store] removeObstacle', id);
      set((state) => {
        const newObstacles = new Map(state.obstacles);
        newObstacles.delete(id);
        return { obstacles: newObstacles };
      });
    },

    clearObstacles: () => {
      if (debug) console.log('[Store] clearObstacles');
      set({ obstacles: new Map() });
    },

    // Selection actions
    selectObject: (id) => {
      if (debug) console.log('[Store] selectObject', id);
      set({ selectedObjectId: id });
    },

    hoverObject: (id) => {
      set({ hoveredObjectId: id });
    },

    // Reset
    reset: () => {
      if (debug) console.log('[Store] reset');
      set(getDefaultState());
    },
  }));
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a selector function for the scoped store
 * Useful for React integration with useStore hook
 */
export function createSelector<T>(
  selector: (state: ScopedVizState) => T
): (state: ScopedVizState) => T {
  return selector;
}

/**
 * Shallow compare two values for equality
 * Used for optimizing re-renders
 */
export function shallow<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    ) {
      return false;
    }
  }

  return true;
}
