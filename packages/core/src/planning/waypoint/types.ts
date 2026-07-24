/**
 * Planning Waypoint Types
 *
 * Types for the waypoint system used in motion planning.
 */

// Import base types from core types module to avoid duplication
import type { Vector3Tuple, QuaternionTuple } from '../../types';

// Re-export for convenience (internal use only, not exported from module index)
export type { Vector3Tuple, QuaternionTuple };

// ============================================================================
// Basic Types
// ============================================================================

export interface Pose3D {
  position: Vector3Tuple;
  orientation: QuaternionTuple;
}

// ============================================================================
// Waypoint Types
// ============================================================================

/** Waypoint type classification */
export type WaypointType = 'start' | 'via' | 'goal' | 'approach' | 'retract';

/** IK solution status */
export type IKStatus = 'pending' | 'computing' | 'solved' | 'failed' | 'unreachable';

/** Motion constraints for a waypoint */
export interface MotionConstraints {
  /** Maximum velocity (rad/s) */
  maxVelocity?: number;
  /** Maximum acceleration (rad/s^2) */
  maxAcceleration?: number;
  /** Blend radius for smooth transitions (m) */
  blendRadius?: number;
  /** Whether to use joint-space or Cartesian interpolation */
  interpolation?: 'joint' | 'linear' | 'spline';
}

/** Planning waypoint data */
export interface PlanningWaypoint {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Waypoint type */
  type: WaypointType;
  /** Target pose in world coordinates (Z-up) */
  pose: Pose3D;
  /** IK solution (joint configuration) */
  joints?: number[];
  /** IK solution status */
  ikStatus: IKStatus;
  /** IK error message if failed */
  ikError?: string;
  /** Motion constraints for path to this waypoint */
  motionConstraints?: MotionConstraints;
  /** Order in path (0-indexed) */
  order: number;
  /** Whether this waypoint is enabled */
  enabled: boolean;
  /** Visualization color */
  color?: string;
  /** User-defined metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Waypoint Manager State
// ============================================================================

/** Waypoint manager state */
export interface WaypointManagerState {
  /** All waypoints */
  waypoints: Map<string, PlanningWaypoint>;
  /** Ordered list of waypoint IDs defining the path */
  pathOrder: string[];
  /** Currently selected waypoint ID */
  selectedId: string | null;
  /** Multiple selection (for batch operations) */
  selectedIds: Set<string>;
  /** Whether the path forms a closed loop */
  isClosedLoop: boolean;
}

/** Create empty waypoint manager state */
export function createEmptyWaypointState(): WaypointManagerState {
  return {
    waypoints: new Map(),
    pathOrder: [],
    selectedId: null,
    selectedIds: new Set(),
    isClosedLoop: false,
  };
}

// ============================================================================
// Waypoint Events
// ============================================================================

export type WaypointEventType =
  | 'waypoint-added'
  | 'waypoint-removed'
  | 'waypoint-updated'
  | 'path-reordered'
  | 'selection-changed'
  | 'ik-computed';

export interface WaypointEvent {
  type: WaypointEventType;
  waypointId?: string;
  data?: unknown;
}

export type WaypointEventCallback = (event: WaypointEvent) => void;

// ============================================================================
// Visualization
// ============================================================================

/** Default colors for waypoint types */
export const WAYPOINT_TYPE_COLORS: Record<WaypointType, string> = {
  start: '#22c55e',    // Green
  via: '#3b82f6',      // Blue
  goal: '#ef4444',     // Red
  approach: '#f59e0b', // Orange
  retract: '#8b5cf6',  // Purple
};

/** Waypoint visualization configuration */
export interface WaypointVisualization {
  /** Sphere radius */
  radius: number;
  /** Show orientation axes */
  showAxes: boolean;
  /** Axes length */
  axesLength: number;
  /** Show label */
  showLabel: boolean;
  /** Show order number */
  showOrder: boolean;
  /** Show connection lines between waypoints */
  showConnections: boolean;
  /** Connection line style */
  connectionStyle: 'solid' | 'dashed';
  /** Connection line width */
  connectionWidth: number;
}

/** Default visualization settings */
export const DEFAULT_WAYPOINT_VISUALIZATION: WaypointVisualization = {
  radius: 0.02,
  showAxes: true,
  axesLength: 0.1,
  showLabel: true,
  showOrder: true,
  showConnections: true,
  connectionStyle: 'dashed',
  connectionWidth: 2,
};

// ============================================================================
// Path Operations
// ============================================================================

/** Path validation result */
export interface PathValidationResult {
  isValid: boolean;
  errors: PathValidationError[];
  warnings: PathValidationWarning[];
}

export interface PathValidationError {
  waypointId: string;
  message: string;
  type: 'ik-failed' | 'collision' | 'out-of-reach' | 'missing-joints';
}

export interface PathValidationWarning {
  waypointId: string;
  message: string;
  type: 'high-velocity' | 'sharp-turn' | 'near-limit';
}

// ============================================================================
// Export/Import
// ============================================================================

/** Waypoint export format */
export interface WaypointExportData {
  version: string;
  waypoints: Array<Omit<PlanningWaypoint, 'ikStatus' | 'ikError'>>;
  pathOrder: string[];
  isClosedLoop: boolean;
}

/** Current export version */
export const WAYPOINT_EXPORT_VERSION = '1.0.0';
