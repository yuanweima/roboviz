/**
 * Trajectory Store
 *
 * Zustand store for managing trajectories and waypoints.
 * Provides state management for the trajectory system.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Trajectory,
  TrajectoryStatus,
  TrajectoryCreateData,
  TrajectoryUpdateData,
  Waypoint,
  WaypointCreateData,
  WaypointUpdateData,
} from '../types';
import {
  createTrajectory,
  updateTrajectoryStats,
  createWaypoint,
} from '../types';

// ============================================================================
// Store State
// ============================================================================

export interface TrajectoryStoreState {
  // ========== Data ==========

  /** All trajectories indexed by ID */
  trajectories: Map<string, Trajectory>;

  /** Currently active trajectory ID */
  activeTrajectoryId: string | null;

  /** Currently selected waypoint ID */
  selectedWaypointId: string | null;

  /** Currently hovered waypoint ID */
  hoveredWaypointId: string | null;

  // ========== Playback ==========

  /** Whether playback is active */
  isPlaying: boolean;

  /** Current playback position (0-1) */
  playbackPosition: number;

  /** Playback speed multiplier */
  playbackSpeed: number;

  // ========== UI State ==========

  /** Whether to show all waypoints or only issues */
  showOnlyIssues: boolean;

  /** Whether to show waypoint labels */
  showLabels: boolean;

  /** Whether to show path preview */
  showPath: boolean;

  // ========== Actions ==========

  // Trajectory CRUD
  addTrajectory: (data: TrajectoryCreateData) => Trajectory;
  updateTrajectory: (data: TrajectoryUpdateData) => void;
  removeTrajectory: (id: string) => void;
  getTrajectory: (id: string) => Trajectory | undefined;
  getAllTrajectories: () => Trajectory[];

  // Active trajectory
  setActiveTrajectory: (id: string | null) => void;
  getActiveTrajectory: () => Trajectory | null;

  // Waypoint CRUD
  addWaypoint: (trajectoryId: string, data: WaypointCreateData) => Waypoint | null;
  updateWaypoint: (trajectoryId: string, data: WaypointUpdateData) => void;
  removeWaypoint: (trajectoryId: string, waypointId: string) => void;
  getWaypoint: (trajectoryId: string, waypointId: string) => Waypoint | undefined;
  reorderWaypoints: (trajectoryId: string, fromIndex: number, toIndex: number) => void;

  // Waypoint selection
  selectWaypoint: (id: string | null) => void;
  setHoveredWaypoint: (id: string | null) => void;
  selectNextWaypoint: () => void;
  selectPreviousWaypoint: () => void;
  selectNextIssue: () => void;

  // Trajectory status
  setTrajectoryStatus: (id: string, status: TrajectoryStatus, error?: string) => void;
  setTrajectoryProgress: (id: string, progress: number) => void;

  // Batch waypoint updates (from backend)
  setWaypoints: (trajectoryId: string, waypoints: Waypoint[]) => void;
  updateWaypointsBatch: (trajectoryId: string, updates: WaypointUpdateData[]) => void;

  // Playback
  setPlaying: (playing: boolean) => void;
  setPlaybackPosition: (position: number) => void;
  setPlaybackSpeed: (speed: number) => void;

  // UI settings
  setShowOnlyIssues: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setShowPath: (show: boolean) => void;

  // Clear
  clearAll: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useTrajectoryStore = create<TrajectoryStoreState>()(
  subscribeWithSelector((set, get) => ({
    // ========== Initial State ==========

    trajectories: new Map(),
    activeTrajectoryId: null,
    selectedWaypointId: null,
    hoveredWaypointId: null,
    isPlaying: false,
    playbackPosition: 0,
    playbackSpeed: 1,
    showOnlyIssues: false,
    showLabels: true,
    showPath: true,

    // ========== Trajectory Actions ==========

    addTrajectory: (data) => {
      const trajectory = createTrajectory(data);
      set((state) => {
        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(trajectory.id, trajectory);
        return { trajectories: newTrajectories };
      });
      return trajectory;
    },

    updateTrajectory: (data) => {
      set((state) => {
        const trajectory = state.trajectories.get(data.id);
        if (!trajectory) return state;

        const updated: Trajectory = {
          ...trajectory,
          ...data,
          updatedAt: Date.now(),
        };

        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(data.id, updated);
        return { trajectories: newTrajectories };
      });
    },

    removeTrajectory: (id) => {
      set((state) => {
        const newTrajectories = new Map(state.trajectories);
        newTrajectories.delete(id);

        return {
          trajectories: newTrajectories,
          activeTrajectoryId:
            state.activeTrajectoryId === id ? null : state.activeTrajectoryId,
          selectedWaypointId:
            state.activeTrajectoryId === id ? null : state.selectedWaypointId,
        };
      });
    },

    getTrajectory: (id) => {
      return get().trajectories.get(id);
    },

    getAllTrajectories: () => {
      return Array.from(get().trajectories.values());
    },

    // ========== Active Trajectory ==========

    setActiveTrajectory: (id) => {
      set({
        activeTrajectoryId: id,
        selectedWaypointId: null,
        playbackPosition: 0,
        isPlaying: false,
      });
    },

    getActiveTrajectory: () => {
      const { activeTrajectoryId, trajectories } = get();
      if (!activeTrajectoryId) return null;
      return trajectories.get(activeTrajectoryId) ?? null;
    },

    // ========== Waypoint Actions ==========

    addWaypoint: (trajectoryId, data) => {
      const state = get();
      const trajectory = state.trajectories.get(trajectoryId);
      if (!trajectory) return null;

      const index = data.index ?? trajectory.waypoints.length;
      const waypoint = createWaypoint(data, index);

      // Insert at correct position
      const newWaypoints = [...trajectory.waypoints];
      newWaypoints.splice(index, 0, waypoint);

      // Update indices
      for (let i = index; i < newWaypoints.length; i++) {
        newWaypoints[i] = { ...newWaypoints[i], index: i };
      }

      const updated = updateTrajectoryStats({
        ...trajectory,
        waypoints: newWaypoints,
      });

      set((state) => {
        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(trajectoryId, updated);
        return { trajectories: newTrajectories };
      });

      return waypoint;
    },

    updateWaypoint: (trajectoryId, data) => {
      set((state) => {
        const trajectory = state.trajectories.get(trajectoryId);
        if (!trajectory) return state;

        const waypointIndex = trajectory.waypoints.findIndex(
          (wp) => wp.id === data.id
        );
        if (waypointIndex === -1) return state;

        const waypoint = trajectory.waypoints[waypointIndex];
        const isAdjusting =
          data.position !== undefined || data.quaternion !== undefined;

        const updatedWaypoint: Waypoint = {
          ...waypoint,
          ...data,
          isManuallyAdjusted: isAdjusting ? true : waypoint.isManuallyAdjusted,
          originalPose:
            isAdjusting && !waypoint.isManuallyAdjusted
              ? {
                  position: waypoint.position,
                  quaternion: waypoint.quaternion,
                }
              : waypoint.originalPose,
          adjustedAt: isAdjusting ? Date.now() : waypoint.adjustedAt,
          updatedAt: Date.now(),
        };

        const newWaypoints = [...trajectory.waypoints];
        newWaypoints[waypointIndex] = updatedWaypoint;

        const updated = updateTrajectoryStats({
          ...trajectory,
          waypoints: newWaypoints,
        });

        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(trajectoryId, updated);
        return { trajectories: newTrajectories };
      });
    },

    removeWaypoint: (trajectoryId, waypointId) => {
      set((state) => {
        const trajectory = state.trajectories.get(trajectoryId);
        if (!trajectory) return state;

        const newWaypoints = trajectory.waypoints.filter(
          (wp) => wp.id !== waypointId
        );

        // Update indices
        for (let i = 0; i < newWaypoints.length; i++) {
          newWaypoints[i] = { ...newWaypoints[i], index: i };
        }

        const updated = updateTrajectoryStats({
          ...trajectory,
          waypoints: newWaypoints,
        });

        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(trajectoryId, updated);

        return {
          trajectories: newTrajectories,
          selectedWaypointId:
            state.selectedWaypointId === waypointId
              ? null
              : state.selectedWaypointId,
        };
      });
    },

    getWaypoint: (trajectoryId, waypointId) => {
      const trajectory = get().trajectories.get(trajectoryId);
      return trajectory?.waypoints.find((wp) => wp.id === waypointId);
    },

    reorderWaypoints: (trajectoryId, fromIndex, toIndex) => {
      set((state) => {
        const trajectory = state.trajectories.get(trajectoryId);
        if (!trajectory) return state;

        const newWaypoints = [...trajectory.waypoints];
        const [moved] = newWaypoints.splice(fromIndex, 1);
        newWaypoints.splice(toIndex, 0, moved);

        // Update indices
        for (let i = 0; i < newWaypoints.length; i++) {
          newWaypoints[i] = { ...newWaypoints[i], index: i };
        }

        const updated = updateTrajectoryStats({
          ...trajectory,
          waypoints: newWaypoints,
        });

        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(trajectoryId, updated);
        return { trajectories: newTrajectories };
      });
    },

    // ========== Selection ==========

    selectWaypoint: (id) => {
      set({ selectedWaypointId: id });
    },

    setHoveredWaypoint: (id) => {
      set({ hoveredWaypointId: id });
    },

    selectNextWaypoint: () => {
      const { activeTrajectoryId, selectedWaypointId, trajectories } = get();
      if (!activeTrajectoryId) return;

      const trajectory = trajectories.get(activeTrajectoryId);
      if (!trajectory || trajectory.waypoints.length === 0) return;

      if (!selectedWaypointId) {
        set({ selectedWaypointId: trajectory.waypoints[0].id });
        return;
      }

      const currentIndex = trajectory.waypoints.findIndex(
        (wp) => wp.id === selectedWaypointId
      );
      const nextIndex = (currentIndex + 1) % trajectory.waypoints.length;
      set({ selectedWaypointId: trajectory.waypoints[nextIndex].id });
    },

    selectPreviousWaypoint: () => {
      const { activeTrajectoryId, selectedWaypointId, trajectories } = get();
      if (!activeTrajectoryId) return;

      const trajectory = trajectories.get(activeTrajectoryId);
      if (!trajectory || trajectory.waypoints.length === 0) return;

      if (!selectedWaypointId) {
        set({
          selectedWaypointId:
            trajectory.waypoints[trajectory.waypoints.length - 1].id,
        });
        return;
      }

      const currentIndex = trajectory.waypoints.findIndex(
        (wp) => wp.id === selectedWaypointId
      );
      const prevIndex =
        currentIndex === 0 ? trajectory.waypoints.length - 1 : currentIndex - 1;
      set({ selectedWaypointId: trajectory.waypoints[prevIndex].id });
    },

    selectNextIssue: () => {
      const { activeTrajectoryId, selectedWaypointId, trajectories } = get();
      if (!activeTrajectoryId) return;

      const trajectory = trajectories.get(activeTrajectoryId);
      if (!trajectory) return;

      const startIndex = selectedWaypointId
        ? trajectory.waypoints.findIndex((wp) => wp.id === selectedWaypointId) + 1
        : 0;

      for (let i = 0; i < trajectory.waypoints.length; i++) {
        const index = (startIndex + i) % trajectory.waypoints.length;
        const wp = trajectory.waypoints[index];
        if (
          wp.status === 'collision' ||
          wp.status === 'unreachable' ||
          wp.status === 'singular' ||
          wp.status === 'error' ||
          wp.status === 'warning'
        ) {
          set({ selectedWaypointId: wp.id });
          return;
        }
      }
    },

    // ========== Status ==========

    setTrajectoryStatus: (id, status, error) => {
      set((state) => {
        const trajectory = state.trajectories.get(id);
        if (!trajectory) return state;

        const updated: Trajectory = {
          ...trajectory,
          status,
          error,
          updatedAt: Date.now(),
        };

        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(id, updated);
        return { trajectories: newTrajectories };
      });
    },

    setTrajectoryProgress: (id, progress) => {
      set((state) => {
        const trajectory = state.trajectories.get(id);
        if (!trajectory) return state;

        const updated: Trajectory = {
          ...trajectory,
          progress: Math.max(0, Math.min(100, progress)),
          updatedAt: Date.now(),
        };

        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(id, updated);
        return { trajectories: newTrajectories };
      });
    },

    // ========== Batch Updates ==========

    setWaypoints: (trajectoryId, waypoints) => {
      set((state) => {
        const trajectory = state.trajectories.get(trajectoryId);
        if (!trajectory) return state;

        const updated = updateTrajectoryStats({
          ...trajectory,
          waypoints,
        });

        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(trajectoryId, updated);
        return { trajectories: newTrajectories };
      });
    },

    updateWaypointsBatch: (trajectoryId, updates) => {
      set((state) => {
        const trajectory = state.trajectories.get(trajectoryId);
        if (!trajectory) return state;

        const updateMap = new Map(updates.map((u) => [u.id, u]));
        const newWaypoints = trajectory.waypoints.map((wp) => {
          const update = updateMap.get(wp.id);
          if (!update) return wp;

          return {
            ...wp,
            ...update,
            updatedAt: Date.now(),
          };
        });

        const updated = updateTrajectoryStats({
          ...trajectory,
          waypoints: newWaypoints,
        });

        const newTrajectories = new Map(state.trajectories);
        newTrajectories.set(trajectoryId, updated);
        return { trajectories: newTrajectories };
      });
    },

    // ========== Playback ==========

    setPlaying: (playing) => {
      set({ isPlaying: playing });
    },

    setPlaybackPosition: (position) => {
      set({ playbackPosition: Math.max(0, Math.min(1, position)) });
    },

    setPlaybackSpeed: (speed) => {
      set({ playbackSpeed: Math.max(0.1, Math.min(10, speed)) });
    },

    // ========== UI Settings ==========

    setShowOnlyIssues: (show) => {
      set({ showOnlyIssues: show });
    },

    setShowLabels: (show) => {
      set({ showLabels: show });
    },

    setShowPath: (show) => {
      set({ showPath: show });
    },

    // ========== Clear ==========

    clearAll: () => {
      set({
        trajectories: new Map(),
        activeTrajectoryId: null,
        selectedWaypointId: null,
        hoveredWaypointId: null,
        isPlaying: false,
        playbackPosition: 0,
      });
    },
  }))
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook to get the active trajectory
 */
export function useActiveTrajectory(): Trajectory | null {
  const activeTrajectoryId = useTrajectoryStore((state) => state.activeTrajectoryId);
  const trajectories = useTrajectoryStore((state) => state.trajectories);

  if (!activeTrajectoryId) return null;
  return trajectories.get(activeTrajectoryId) ?? null;
}

/**
 * Hook to get all trajectories
 */
export function useAllTrajectories(): Trajectory[] {
  const trajectories = useTrajectoryStore((state) => state.trajectories);
  return Array.from(trajectories.values());
}

/**
 * Hook to get selected waypoint
 */
export function useSelectedWaypoint(): Waypoint | null {
  const activeTrajectoryId = useTrajectoryStore((state) => state.activeTrajectoryId);
  const selectedWaypointId = useTrajectoryStore((state) => state.selectedWaypointId);
  const trajectories = useTrajectoryStore((state) => state.trajectories);

  if (!activeTrajectoryId || !selectedWaypointId) return null;
  const trajectory = trajectories.get(activeTrajectoryId);
  if (!trajectory) return null;
  return trajectory.waypoints.find((wp) => wp.id === selectedWaypointId) ?? null;
}

/**
 * Hook to get playback state
 * Uses shallow comparison to prevent infinite loops
 */
export function usePlaybackState() {
  const isPlaying = useTrajectoryStore((state) => state.isPlaying);
  const position = useTrajectoryStore((state) => state.playbackPosition);
  const speed = useTrajectoryStore((state) => state.playbackSpeed);
  const setPlaying = useTrajectoryStore((state) => state.setPlaying);
  const setPosition = useTrajectoryStore((state) => state.setPlaybackPosition);
  const setSpeed = useTrajectoryStore((state) => state.setPlaybackSpeed);

  return {
    isPlaying,
    position,
    speed,
    setPlaying,
    setPosition,
    setSpeed,
  };
}
