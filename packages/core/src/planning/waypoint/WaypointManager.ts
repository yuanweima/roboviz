/**
 * WaypointManager
 *
 * Manages planning waypoints for motion planning.
 * Supports CRUD operations, path ordering, and IK computation.
 */

import type {
  PlanningWaypoint,
  WaypointType,
  Pose3D,
  MotionConstraints,
  WaypointManagerState,
  WaypointEvent,
  WaypointEventCallback,
  WaypointExportData,
  IKStatus,
} from './types';
import {
  createEmptyWaypointState,
  WAYPOINT_TYPE_COLORS,
  WAYPOINT_EXPORT_VERSION,
} from './types';

// ============================================================================
// Utilities
// ============================================================================

function generateId(): string {
  return `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultName(type: WaypointType, order: number): string {
  const typeLabels: Record<WaypointType, string> = {
    start: 'Start',
    via: 'Via',
    goal: 'Goal',
    approach: 'Approach',
    retract: 'Retract',
  };
  return `${typeLabels[type]} ${order + 1}`;
}

// ============================================================================
// WaypointManager
// ============================================================================

/**
 * Manages waypoints for motion planning.
 */
export class WaypointManager {
  private state: WaypointManagerState;
  private eventListeners: Set<WaypointEventCallback> = new Set();

  constructor(initialState?: Partial<WaypointManagerState>) {
    this.state = {
      ...createEmptyWaypointState(),
      ...initialState,
      waypoints: new Map(initialState?.waypoints ?? []),
      selectedIds: new Set(initialState?.selectedIds ?? []),
    };
  }

  // ==========================================================================
  // State Access
  // ==========================================================================

  getState(): WaypointManagerState {
    return this.state;
  }

  getWaypoints(): PlanningWaypoint[] {
    return Array.from(this.state.waypoints.values());
  }

  getWaypoint(id: string): PlanningWaypoint | undefined {
    return this.state.waypoints.get(id);
  }

  getWaypointsInOrder(): PlanningWaypoint[] {
    return this.state.pathOrder
      .map((id) => this.state.waypoints.get(id))
      .filter((wp): wp is PlanningWaypoint => wp !== undefined);
  }

  getSelectedWaypoint(): PlanningWaypoint | undefined {
    if (!this.state.selectedId) return undefined;
    return this.state.waypoints.get(this.state.selectedId);
  }

  getPathOrder(): string[] {
    return [...this.state.pathOrder];
  }

  isClosedLoop(): boolean {
    return this.state.isClosedLoop;
  }

  // ==========================================================================
  // Waypoint CRUD
  // ==========================================================================

  /**
   * Add a new waypoint
   */
  addWaypoint(options: {
    pose: Pose3D;
    type?: WaypointType;
    name?: string;
    joints?: number[];
    ikStatus?: IKStatus;
    motionConstraints?: MotionConstraints;
    color?: string;
    insertAt?: number; // Position in path order
    metadata?: Record<string, unknown>;
  }): string {
    const id = generateId();
    const order = options.insertAt ?? this.state.pathOrder.length;
    const type = options.type ?? 'via';

    const waypoint: PlanningWaypoint = {
      id,
      name: options.name ?? getDefaultName(type, order),
      type,
      pose: options.pose,
      joints: options.joints,
      ikStatus: options.ikStatus ?? (options.joints ? 'solved' : 'pending'),
      motionConstraints: options.motionConstraints,
      order,
      enabled: true,
      color: options.color ?? WAYPOINT_TYPE_COLORS[type],
      metadata: options.metadata,
    };

    this.state.waypoints.set(id, waypoint);

    // Insert into path order
    if (options.insertAt !== undefined && options.insertAt < this.state.pathOrder.length) {
      this.state.pathOrder.splice(options.insertAt, 0, id);
      // Update order numbers
      this.updateOrderNumbers();
    } else {
      this.state.pathOrder.push(id);
    }

    this.emit({ type: 'waypoint-added', waypointId: id, data: waypoint });
    return id;
  }

  /**
   * Add start waypoint (convenience method)
   */
  addStart(pose: Pose3D, options?: { name?: string; motionConstraints?: MotionConstraints }): string {
    return this.addWaypoint({
      pose,
      type: 'start',
      insertAt: 0,
      ...options,
    });
  }

  /**
   * Add goal waypoint (convenience method)
   */
  addGoal(pose: Pose3D, options?: { name?: string; motionConstraints?: MotionConstraints }): string {
    return this.addWaypoint({
      pose,
      type: 'goal',
      ...options,
    });
  }

  /**
   * Add via waypoint (convenience method)
   */
  addVia(pose: Pose3D, options?: { name?: string; insertAt?: number; motionConstraints?: MotionConstraints }): string {
    return this.addWaypoint({
      pose,
      type: 'via',
      ...options,
    });
  }

  /**
   * Remove a waypoint
   */
  removeWaypoint(id: string): boolean {
    const existed = this.state.waypoints.delete(id);
    if (existed) {
      // Remove from path order
      const index = this.state.pathOrder.indexOf(id);
      if (index !== -1) {
        this.state.pathOrder.splice(index, 1);
        this.updateOrderNumbers();
      }

      // Clear selection if removed
      if (this.state.selectedId === id) {
        this.state.selectedId = null;
      }
      this.state.selectedIds.delete(id);

      this.emit({ type: 'waypoint-removed', waypointId: id });
    }
    return existed;
  }

  /**
   * Update a waypoint
   */
  updateWaypoint(id: string, updates: Partial<Omit<PlanningWaypoint, 'id'>>): void {
    const waypoint = this.state.waypoints.get(id);
    if (!waypoint) {
      throw new Error(`Waypoint '${id}' not found`);
    }

    const updated: PlanningWaypoint = {
      ...waypoint,
      ...updates,
      pose: updates.pose ? { ...waypoint.pose, ...updates.pose } : waypoint.pose,
      motionConstraints: updates.motionConstraints
        ? { ...waypoint.motionConstraints, ...updates.motionConstraints }
        : waypoint.motionConstraints,
    };

    this.state.waypoints.set(id, updated);
    this.emit({ type: 'waypoint-updated', waypointId: id, data: updated });
  }

  /**
   * Update waypoint pose
   */
  setPose(id: string, pose: Partial<Pose3D>): void {
    const waypoint = this.state.waypoints.get(id);
    if (!waypoint) {
      throw new Error(`Waypoint '${id}' not found`);
    }

    this.updateWaypoint(id, {
      pose: { ...waypoint.pose, ...pose },
      ikStatus: 'pending', // Reset IK status when pose changes
      joints: undefined,
    });
  }

  /**
   * Set IK solution for a waypoint
   */
  setIKSolution(id: string, joints: number[] | null, error?: string): void {
    const status: IKStatus = joints ? 'solved' : (error ? 'failed' : 'unreachable');

    this.updateWaypoint(id, {
      joints: joints ?? undefined,
      ikStatus: status,
      ikError: error,
    });

    this.emit({ type: 'ik-computed', waypointId: id, data: { joints, error } });
  }

  /**
   * Clear all waypoints
   */
  clearWaypoints(): void {
    const ids = Array.from(this.state.waypoints.keys());
    this.state.waypoints.clear();
    this.state.pathOrder = [];
    this.state.selectedId = null;
    this.state.selectedIds.clear();

    for (const id of ids) {
      this.emit({ type: 'waypoint-removed', waypointId: id });
    }
  }

  // ==========================================================================
  // Path Ordering
  // ==========================================================================

  /**
   * Reorder path by moving a waypoint
   */
  reorderPath(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.state.pathOrder.length) return;
    if (toIndex < 0 || toIndex >= this.state.pathOrder.length) return;
    if (fromIndex === toIndex) return;

    const [id] = this.state.pathOrder.splice(fromIndex, 1);
    this.state.pathOrder.splice(toIndex, 0, id);
    this.updateOrderNumbers();

    this.emit({ type: 'path-reordered', data: this.state.pathOrder });
  }

  /**
   * Reverse path order
   */
  reversePath(): void {
    this.state.pathOrder.reverse();
    this.updateOrderNumbers();

    // Swap start/goal types
    for (const wp of this.state.waypoints.values()) {
      if (wp.type === 'start') {
        wp.type = 'goal';
        wp.color = WAYPOINT_TYPE_COLORS.goal;
      } else if (wp.type === 'goal') {
        wp.type = 'start';
        wp.color = WAYPOINT_TYPE_COLORS.start;
      }
    }

    this.emit({ type: 'path-reordered', data: this.state.pathOrder });
  }

  /**
   * Set closed loop mode
   */
  setClosedLoop(closed: boolean): void {
    this.state.isClosedLoop = closed;
    this.emit({ type: 'path-reordered', data: { isClosedLoop: closed } });
  }

  /**
   * Update order numbers for all waypoints
   */
  private updateOrderNumbers(): void {
    this.state.pathOrder.forEach((id, index) => {
      const wp = this.state.waypoints.get(id);
      if (wp) {
        wp.order = index;
      }
    });
  }

  // ==========================================================================
  // Selection
  // ==========================================================================

  /**
   * Select a single waypoint
   */
  selectWaypoint(id: string | null): void {
    if (id && !this.state.waypoints.has(id)) {
      throw new Error(`Waypoint '${id}' not found`);
    }

    const previousId = this.state.selectedId;
    this.state.selectedId = id;
    this.state.selectedIds.clear();
    if (id) {
      this.state.selectedIds.add(id);
    }

    if (previousId !== id) {
      this.emit({ type: 'selection-changed', waypointId: id ?? undefined });
    }
  }

  /**
   * Add waypoint to selection (multi-select)
   */
  addToSelection(id: string): void {
    if (!this.state.waypoints.has(id)) {
      throw new Error(`Waypoint '${id}' not found`);
    }

    this.state.selectedIds.add(id);
    if (!this.state.selectedId) {
      this.state.selectedId = id;
    }

    this.emit({ type: 'selection-changed', data: Array.from(this.state.selectedIds) });
  }

  /**
   * Remove waypoint from selection
   */
  removeFromSelection(id: string): void {
    this.state.selectedIds.delete(id);
    if (this.state.selectedId === id) {
      this.state.selectedId = this.state.selectedIds.size > 0
        ? Array.from(this.state.selectedIds)[0]
        : null;
    }

    this.emit({ type: 'selection-changed', data: Array.from(this.state.selectedIds) });
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.state.selectedId = null;
    this.state.selectedIds.clear();
    this.emit({ type: 'selection-changed' });
  }

  /**
   * Get selected waypoint IDs
   */
  getSelectedIds(): string[] {
    return Array.from(this.state.selectedIds);
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Export waypoints to JSON
   */
  toJSON(): WaypointExportData {
    const waypoints = this.getWaypointsInOrder().map((wp) => {
      const { ikStatus, ikError, ...rest } = wp;
      return rest;
    });

    return {
      version: WAYPOINT_EXPORT_VERSION,
      waypoints,
      pathOrder: [...this.state.pathOrder],
      isClosedLoop: this.state.isClosedLoop,
    };
  }

  /**
   * Import waypoints from JSON
   */
  fromJSON(data: WaypointExportData): void {
    this.clearWaypoints();

    for (const wpData of data.waypoints) {
      const wp: PlanningWaypoint = {
        ...wpData,
        ikStatus: 'pending',
      };
      this.state.waypoints.set(wp.id, wp);
    }

    this.state.pathOrder = [...data.pathOrder];
    this.state.isClosedLoop = data.isClosedLoop;

    this.emit({ type: 'path-reordered', data: this.state.pathOrder });
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  addEventListener(callback: WaypointEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  private emit(event: WaypointEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in waypoint event listener:', error);
      }
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let managerInstance: WaypointManager | null = null;

export function getWaypointManager(): WaypointManager {
  if (!managerInstance) {
    managerInstance = new WaypointManager();
  }
  return managerInstance;
}

export function resetWaypointManager(): void {
  managerInstance = null;
}
