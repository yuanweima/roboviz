/**
 * Waypoint Types
 *
 * A waypoint represents a single point in a robot trajectory.
 * All process types (welding, grinding, inspection) generate
 * trajectories composed of waypoints.
 */

// ============================================================================
// Waypoint Status
// ============================================================================

/**
 * Status of a waypoint
 */
export type WaypointStatus =
  | 'pending'      // Not yet computed
  | 'computing'    // IK/collision being computed
  | 'valid'        // Reachable, no collision
  | 'collision'    // Has collision with environment
  | 'unreachable'  // IK has no solution
  | 'near-limit'   // Close to joint limits
  | 'singular'     // Near a singularity
  | 'warning'      // Has minor issues
  | 'error';       // General error

/**
 * Detailed collision information for a waypoint
 */
export interface WaypointCollisionInfo {
  /** IDs of colliding objects */
  objectIds: string[];

  /** Human-readable description */
  description: string;

  /** Collision points in world coordinates */
  points?: Array<[number, number, number]>;

  /** Minimum distance to obstacle (negative means penetration) */
  minDistance?: number;
}

/**
 * Warning/error message for a waypoint
 */
export interface WaypointMessage {
  /** Message severity */
  severity: 'info' | 'warning' | 'error';

  /** Message code for programmatic handling */
  code: string;

  /** Human-readable message */
  message: string;
}

// ============================================================================
// Waypoint Definition
// ============================================================================

/**
 * A single waypoint in a trajectory
 */
export interface Waypoint {
  /** Unique identifier */
  id: string;

  /** Index in the trajectory (0-based) */
  index: number;

  // ========== Pose ==========

  /** Position in world coordinates (meters) */
  position: [number, number, number];

  /** Orientation as quaternion [x, y, z, w] */
  quaternion: [number, number, number, number];

  // ========== Kinematics (computed by backend) ==========

  /** Joint configuration (radians) */
  joints?: number[];

  /** IK configuration index (for multi-solution IK) */
  configIndex?: number;

  /** All available IK solutions */
  ikSolutions?: number[][];

  // ========== Status ==========

  /** Current status of this waypoint */
  status: WaypointStatus;

  /** Collision information (if status is 'collision') */
  collisionInfo?: WaypointCollisionInfo;

  /** Warning/error messages */
  messages?: WaypointMessage[];

  // ========== Source Information ==========

  /** ID of the source input (edge, surface, etc.) */
  sourceId?: string;

  /** Parameter along the source curve (0-1) */
  sourceParameter?: number;

  /** Surface normal at this point */
  surfaceNormal?: [number, number, number];

  // ========== Manual Adjustment ==========

  /** Whether this waypoint was manually adjusted */
  isManuallyAdjusted: boolean;

  /** Original pose before adjustment */
  originalPose?: {
    position: [number, number, number];
    quaternion: [number, number, number, number];
  };

  /** Timestamp of last adjustment */
  adjustedAt?: number;

  // ========== Metadata ==========

  /** Optional label for this waypoint */
  label?: string;

  /** Optional user notes */
  notes?: string;

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Timestamp when waypoint was created */
  createdAt: number;

  /** Timestamp of last update */
  updatedAt: number;
}

// ============================================================================
// Waypoint Creation
// ============================================================================

/**
 * Data required to create a new waypoint
 */
export interface WaypointCreateData {
  /** Position in world coordinates */
  position: [number, number, number];

  /** Orientation as quaternion */
  quaternion: [number, number, number, number];

  /** Optional index (defaults to end of trajectory) */
  index?: number;

  /** Source input ID */
  sourceId?: string;

  /** Parameter along source curve */
  sourceParameter?: number;

  /** Surface normal */
  surfaceNormal?: [number, number, number];

  /** Optional label */
  label?: string;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Data for updating an existing waypoint
 */
export interface WaypointUpdateData {
  /** Waypoint ID to update */
  id: string;

  /** New position (optional) */
  position?: [number, number, number];

  /** New orientation (optional) */
  quaternion?: [number, number, number, number];

  /** New joints (optional, for manual config selection) */
  joints?: number[];

  /** New config index (optional) */
  configIndex?: number;

  /** New label (optional) */
  label?: string;

  /** New notes (optional) */
  notes?: string;

  /** Metadata updates (optional) */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Waypoint Utilities
// ============================================================================

/**
 * Check if a waypoint has any issues (warning or error)
 */
export function waypointHasIssues(waypoint: Waypoint): boolean {
  return (
    waypoint.status === 'collision' ||
    waypoint.status === 'unreachable' ||
    waypoint.status === 'singular' ||
    waypoint.status === 'error' ||
    waypoint.status === 'warning'
  );
}

/**
 * Get the severity of a waypoint's status
 */
export function getWaypointSeverity(
  status: WaypointStatus
): 'ok' | 'warning' | 'error' {
  switch (status) {
    case 'valid':
    case 'pending':
    case 'computing':
      return 'ok';
    case 'near-limit':
    case 'warning':
      return 'warning';
    case 'collision':
    case 'unreachable':
    case 'singular':
    case 'error':
      return 'error';
    default:
      return 'ok';
  }
}

/**
 * Create a default waypoint object
 */
export function createWaypoint(
  data: WaypointCreateData,
  index: number
): Waypoint {
  const now = Date.now();
  return {
    id: `wp_${now}_${Math.random().toString(36).substr(2, 9)}`,
    index,
    position: data.position,
    quaternion: data.quaternion,
    status: 'pending',
    isManuallyAdjusted: false,
    sourceId: data.sourceId,
    sourceParameter: data.sourceParameter,
    surfaceNormal: data.surfaceNormal,
    label: data.label,
    metadata: data.metadata,
    createdAt: now,
    updatedAt: now,
  };
}
