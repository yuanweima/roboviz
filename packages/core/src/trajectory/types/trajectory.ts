/**
 * Trajectory Types
 *
 * A trajectory is an ordered sequence of waypoints that defines
 * the path a robot will follow. Trajectories are generated from
 * process inputs (edges, surfaces, etc.) and can be edited.
 */

import type { Waypoint, WaypointStatus } from './waypoint';

// ============================================================================
// Trajectory Status
// ============================================================================

/**
 * Overall status of a trajectory
 */
export type TrajectoryStatus =
  | 'draft'        // Initial state, not yet generated
  | 'generating'   // Backend is generating waypoints
  | 'computing'    // Computing IK/collision for waypoints
  | 'ready'        // All waypoints computed, ready for review
  | 'validated'    // Trajectory has been validated
  | 'executing'    // Robot is executing this trajectory
  | 'paused'       // Execution paused
  | 'completed'    // Execution completed
  | 'error';       // Generation or execution error

/**
 * Interpolation method between waypoints
 */
export type InterpolationType =
  | 'linear'       // Linear interpolation in Cartesian space
  | 'joint'        // Joint-space interpolation
  | 'circular'     // Circular arc interpolation
  | 'spline';      // Smooth spline interpolation

// ============================================================================
// Trajectory Definition
// ============================================================================

/**
 * A complete trajectory
 */
export interface Trajectory {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  // ========== Process Information ==========

  /** ID of the process that generated this trajectory */
  processId: string;

  /** Type of the process (for display) */
  processType: string;

  /** ID of the source input (edge, surface, etc.) */
  sourceId: string;

  // ========== Waypoints ==========

  /** Ordered list of waypoints */
  waypoints: Waypoint[];

  /** Total number of waypoints */
  waypointCount: number;

  // ========== Status ==========

  /** Current status */
  status: TrajectoryStatus;

  /** Generation/computation progress (0-100) */
  progress: number;

  /** Error message (if status is 'error') */
  error?: string;

  // ========== Settings ==========

  /** Interpolation method between waypoints */
  interpolation: InterpolationType;

  /** Speed setting (percentage of max, 0-100) */
  speed: number;

  /** Acceleration setting (percentage of max, 0-100) */
  acceleration: number;

  // ========== Statistics ==========

  /** Total path length in meters */
  pathLength?: number;

  /** Estimated execution time in seconds */
  estimatedTime?: number;

  /** Number of waypoints with issues */
  issueCount: number;

  /** Summary of waypoint statuses */
  statusSummary: Record<WaypointStatus, number>;

  // ========== Metadata ==========

  /** Robot ID this trajectory is for */
  robotId?: string;

  /** Optional description */
  description?: string;

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Timestamp when trajectory was created */
  createdAt: number;

  /** Timestamp of last update */
  updatedAt: number;
}

// ============================================================================
// Trajectory Segment
// ============================================================================

/**
 * A segment of a trajectory (subset of waypoints)
 * Used for incremental updates and partial re-computation
 */
export interface TrajectorySegment {
  /** Trajectory ID this segment belongs to */
  trajectoryId: string;

  /** Start index in the trajectory */
  startIndex: number;

  /** End index in the trajectory (inclusive) */
  endIndex: number;

  /** Waypoints in this segment */
  waypoints: Waypoint[];

  /** Whether this segment needs re-computation */
  needsRecompute: boolean;
}

// ============================================================================
// Trajectory Operations
// ============================================================================

/**
 * Data for creating a new trajectory
 */
export interface TrajectoryCreateData {
  /** Name for the trajectory */
  name: string;

  /** Process ID */
  processId: string;

  /** Process type */
  processType: string;

  /** Source input ID */
  sourceId: string;

  /** Initial waypoints (optional) */
  waypoints?: Waypoint[];

  /** Interpolation method */
  interpolation?: InterpolationType;

  /** Speed setting */
  speed?: number;

  /** Acceleration setting */
  acceleration?: number;

  /** Robot ID */
  robotId?: string;

  /** Description */
  description?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Data for updating a trajectory
 */
export interface TrajectoryUpdateData {
  /** Trajectory ID to update */
  id: string;

  /** New name (optional) */
  name?: string;

  /** New interpolation method (optional) */
  interpolation?: InterpolationType;

  /** New speed setting (optional) */
  speed?: number;

  /** New acceleration setting (optional) */
  acceleration?: number;

  /** New description (optional) */
  description?: string;

  /** Metadata updates (optional) */
  metadata?: Record<string, unknown>;
}

/**
 * Request to generate trajectory from process input
 */
export interface TrajectoryGenerateRequest {
  /** Process ID */
  processId: string;

  /** Source input ID */
  sourceId: string;

  /** Process-specific settings */
  settings: Record<string, unknown>;

  /** Target robot ID */
  robotId: string;

  /** Trajectory settings */
  trajectorySettings?: {
    interpolation?: InterpolationType;
    speed?: number;
    acceleration?: number;
  };
}

/**
 * Response from trajectory generation
 */
export interface TrajectoryGenerateResponse {
  /** Generated trajectory */
  trajectory: Trajectory;

  /** Whether generation completed successfully */
  success: boolean;

  /** Warnings during generation */
  warnings?: string[];

  /** Error message (if success is false) */
  error?: string;
}

// ============================================================================
// Trajectory Utilities
// ============================================================================

/**
 * Create a default trajectory object
 */
export function createTrajectory(data: TrajectoryCreateData): Trajectory {
  const now = Date.now();
  const waypoints = data.waypoints || [];

  // Calculate status summary
  const statusSummary: Record<WaypointStatus, number> = {
    pending: 0,
    computing: 0,
    valid: 0,
    collision: 0,
    unreachable: 0,
    'near-limit': 0,
    singular: 0,
    warning: 0,
    error: 0,
  };

  for (const wp of waypoints) {
    statusSummary[wp.status]++;
  }

  const issueCount =
    statusSummary.collision +
    statusSummary.unreachable +
    statusSummary.singular +
    statusSummary.error +
    statusSummary.warning;

  return {
    id: `traj_${now}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name,
    processId: data.processId,
    processType: data.processType,
    sourceId: data.sourceId,
    waypoints,
    waypointCount: waypoints.length,
    status: waypoints.length === 0 ? 'draft' : 'ready',
    progress: waypoints.length === 0 ? 0 : 100,
    interpolation: data.interpolation || 'linear',
    speed: data.speed ?? 50,
    acceleration: data.acceleration ?? 50,
    issueCount,
    statusSummary,
    robotId: data.robotId,
    description: data.description,
    metadata: data.metadata,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update trajectory statistics after waypoint changes
 */
export function updateTrajectoryStats(trajectory: Trajectory): Trajectory {
  const statusSummary: Record<WaypointStatus, number> = {
    pending: 0,
    computing: 0,
    valid: 0,
    collision: 0,
    unreachable: 0,
    'near-limit': 0,
    singular: 0,
    warning: 0,
    error: 0,
  };

  for (const wp of trajectory.waypoints) {
    statusSummary[wp.status]++;
  }

  const issueCount =
    statusSummary.collision +
    statusSummary.unreachable +
    statusSummary.singular +
    statusSummary.error +
    statusSummary.warning;

  return {
    ...trajectory,
    waypointCount: trajectory.waypoints.length,
    issueCount,
    statusSummary,
    updatedAt: Date.now(),
  };
}

/**
 * Check if a trajectory is ready for execution
 */
export function isTrajectoryExecutable(trajectory: Trajectory): boolean {
  return (
    trajectory.status === 'ready' ||
    trajectory.status === 'validated'
  ) && trajectory.issueCount === 0;
}

/**
 * Get the next waypoint with issues
 */
export function getNextWaypointWithIssue(
  trajectory: Trajectory,
  startIndex: number = 0
): Waypoint | null {
  for (let i = startIndex; i < trajectory.waypoints.length; i++) {
    const wp = trajectory.waypoints[i];
    if (
      wp.status === 'collision' ||
      wp.status === 'unreachable' ||
      wp.status === 'singular' ||
      wp.status === 'error' ||
      wp.status === 'warning'
    ) {
      return wp;
    }
  }
  return null;
}
