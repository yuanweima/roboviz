/**
 * RoboViz Linear Motion Planning
 *
 * Provides linear (straight-line) motion planning in Cartesian space.
 * Uses trajx-wasm IK solver to convert Cartesian waypoints to joint space.
 */

import type { Pose, Vector3, Quaternion } from '../types';
import type {
  IkResult,
  WorkspaceAnalysis,
  LinearMotionResult,
} from './types';
import { getKinematicsManager, RobotSolver } from './kinematics-manager';

// ============================================================================
// Types
// ============================================================================

/**
 * Linear motion configuration
 */
export interface LinearMotionConfig {
  /** Linear resolution in meters (default: 0.001 = 1mm) */
  resolution: number;
  /** Position tolerance for IK (meters) */
  positionTolerance: number;
  /** Orientation tolerance for IK (radians) */
  orientationTolerance: number;
  /** Maximum allowed joint velocity (rad/s) - for feasibility check */
  maxJointVelocity?: number;
  /** Check singularity at each waypoint */
  checkSingularity: boolean;
  /** Singularity threshold for rejection */
  singularityThreshold: number;
  /** Allow partial path if some points are unreachable */
  allowPartial: boolean;
}

const DEFAULT_CONFIG: LinearMotionConfig = {
  resolution: 0.001, // 1mm
  positionTolerance: 1e-4, // 0.1mm
  orientationTolerance: 1e-3, // ~0.06 degrees
  checkSingularity: true,
  singularityThreshold: 0.01,
  allowPartial: false,
};

/**
 * Interpolation mode for orientation
 */
export type OrientationInterpolation = 'slerp' | 'linear';

/**
 * Linear path segment
 */
export interface LinearPathSegment {
  startPose: Pose;
  endPose: Pose;
  startJoints: number[];
}

/**
 * Waypoint result
 */
export interface WaypointResult {
  index: number;
  pose: Pose;
  joints: number[] | null;
  success: boolean;
  positionError?: number;
  workspace?: WorkspaceAnalysis;
  errorReason?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Interpolate between two positions
 */
function lerpPosition(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/**
 * SLERP (Spherical Linear Interpolation) between two quaternions
 */
function slerpQuaternion(a: Quaternion, b: Quaternion, t: number): Quaternion {
  // Normalize inputs
  let ax = a.x, ay = a.y, az = a.z, aw = a.w;
  let bx = b.x, by = b.y, bz = b.z, bw = b.w;

  // Compute dot product
  let dot = ax * bx + ay * by + az * bz + aw * bw;

  // If dot is negative, negate one quaternion to take shorter path
  if (dot < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    dot = -dot;
  }

  // Use linear interpolation for nearly identical quaternions
  if (dot > 0.9995) {
    return normalizeQuaternion({
      x: ax + (bx - ax) * t,
      y: ay + (by - ay) * t,
      z: az + (bz - az) * t,
      w: aw + (bw - aw) * t,
    });
  }

  // SLERP
  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);

  const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
  const s1 = sinTheta / sinTheta0;

  return {
    x: ax * s0 + bx * s1,
    y: ay * s0 + by * s1,
    z: az * s0 + bz * s1,
    w: aw * s0 + bw * s1,
  };
}

/**
 * Normalize a quaternion
 */
function normalizeQuaternion(q: Quaternion): Quaternion {
  const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (len === 0) {
    return { x: 0, y: 0, z: 0, w: 1 };
  }
  return {
    x: q.x / len,
    y: q.y / len,
    z: q.z / len,
    w: q.w / len,
  };
}

/**
 * Compute distance between two positions
 */
function positionDistance(a: Vector3, b: Vector3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Interpolate a pose along a linear path
 */
function interpolatePose(
  start: Pose,
  end: Pose,
  t: number,
  orientationMode: OrientationInterpolation = 'slerp'
): Pose {
  const position = lerpPosition(start.position, end.position, t);
  const orientation =
    orientationMode === 'slerp'
      ? slerpQuaternion(start.orientation, end.orientation, t)
      : normalizeQuaternion({
          x: start.orientation.x + (end.orientation.x - start.orientation.x) * t,
          y: start.orientation.y + (end.orientation.y - start.orientation.y) * t,
          z: start.orientation.z + (end.orientation.z - start.orientation.z) * t,
          w: start.orientation.w + (end.orientation.w - start.orientation.w) * t,
        });

  return { position, orientation };
}

// ============================================================================
// Linear Motion Planner
// ============================================================================

/**
 * Linear Motion Planner
 *
 * Plans straight-line motion in Cartesian space using IK at each waypoint.
 */
export class LinearMotionPlanner {
  private solver: RobotSolver;
  private config: LinearMotionConfig;

  constructor(solver: RobotSolver, config: Partial<LinearMotionConfig> = {}) {
    this.solver = solver;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Plan a linear motion from current configuration to target pose
   */
  planLinear(
    startJoints: number[],
    targetPose: Pose,
    options?: Partial<LinearMotionConfig>
  ): LinearMotionResult {
    const startTime = performance.now();
    const config = { ...this.config, ...options };

    // Get start pose from FK
    const startFk = this.solver.forwardKinematics(startJoints);
    const startPose = startFk.pose;

    // Calculate total distance
    const totalDistance = positionDistance(startPose.position, targetPose.position);

    // Calculate number of waypoints based on resolution
    const numWaypoints = Math.max(2, Math.ceil(totalDistance / config.resolution) + 1);

    // Generate waypoints
    const waypoints: WaypointResult[] = [];
    const jointPath: number[][] = [startJoints];
    const cartesianPath: Pose[] = [startPose];
    const unreachableSegments: { index: number; pose: Pose; reason: string }[] = [];

    let currentJoints = startJoints;
    let success = true;

    for (let i = 1; i < numWaypoints; i++) {
      const t = i / (numWaypoints - 1);
      const pose = interpolatePose(startPose, targetPose, t);

      // Solve IK using previous joints as seed
      const ikResult = this.solver.inverseKinematics(pose, currentJoints);

      const waypointResult: WaypointResult = {
        index: i,
        pose,
        joints: null,
        success: false,
      };

      if (ikResult.success && ikResult.solution) {
        // Check singularity if enabled
        if (config.checkSingularity) {
          const workspace = this.solver.analyzeWorkspace(ikResult.solution);
          waypointResult.workspace = workspace;

          if (workspace.isNearSingular || workspace.minSingularValue < config.singularityThreshold) {
            waypointResult.errorReason = 'near_singularity';
            unreachableSegments.push({
              index: i,
              pose,
              reason: `Near singularity (min singular value: ${workspace.minSingularValue.toFixed(4)})`,
            });

            if (!config.allowPartial) {
              success = false;
              break;
            }
            continue;
          }
        }

        // Validate joint limits
        if (!this.solver.isValidConfig(ikResult.solution)) {
          waypointResult.errorReason = 'joint_limits';
          unreachableSegments.push({
            index: i,
            pose,
            reason: 'Joint limits exceeded',
          });

          if (!config.allowPartial) {
            success = false;
            break;
          }
          continue;
        }

        // Success!
        waypointResult.joints = ikResult.solution;
        waypointResult.success = true;
        waypointResult.positionError = ikResult.positionError;

        jointPath.push(ikResult.solution);
        cartesianPath.push(pose);
        currentJoints = ikResult.solution;
      } else {
        // IK failed
        waypointResult.errorReason = ikResult.errorMessage || 'ik_failed';
        unreachableSegments.push({
          index: i,
          pose,
          reason: ikResult.errorMessage || 'IK solver failed',
        });

        if (!config.allowPartial) {
          success = false;
          break;
        }
      }

      waypoints.push(waypointResult);
    }

    const planningTimeMs = performance.now() - startTime;

    return {
      success: success && unreachableSegments.length === 0,
      path: jointPath,
      cartesianPath,
      pathLength: totalDistance,
      planningTimeMs,
      errorMessage: success ? undefined : `Failed at waypoint. ${unreachableSegments.length} unreachable segments.`,
      unreachableSegments: unreachableSegments.length > 0 ? unreachableSegments : undefined,
    };
  }

  /**
   * Plan a linear motion through multiple waypoints
   */
  planLinearPath(
    startJoints: number[],
    waypoints: Pose[],
    options?: Partial<LinearMotionConfig>
  ): LinearMotionResult {
    if (waypoints.length === 0) {
      return {
        success: false,
        path: [startJoints],
        cartesianPath: [],
        pathLength: 0,
        planningTimeMs: 0,
        errorMessage: 'No waypoints provided',
      };
    }

    const startTime = performance.now();
    const config = { ...this.config, ...options };

    let currentJoints = startJoints;
    const fullJointPath: number[][] = [startJoints];
    const fullCartesianPath: Pose[] = [];
    const allUnreachable: { index: number; pose: Pose; reason: string }[] = [];
    let totalDistance = 0;

    // Get start pose
    const startFk = this.solver.forwardKinematics(startJoints);
    let previousPose = startFk.pose;
    fullCartesianPath.push(previousPose);

    for (let w = 0; w < waypoints.length; w++) {
      const targetPose = waypoints[w];

      // Plan segment
      const segmentResult = this.planLinear(currentJoints, targetPose, config);

      if (!segmentResult.success && !config.allowPartial) {
        return {
          success: false,
          path: fullJointPath,
          cartesianPath: fullCartesianPath,
          pathLength: totalDistance,
          planningTimeMs: performance.now() - startTime,
          errorMessage: `Failed at waypoint ${w + 1}: ${segmentResult.errorMessage}`,
          unreachableSegments: segmentResult.unreachableSegments,
        };
      }

      // Append segment (skip first point as it duplicates previous end)
      for (let i = 1; i < segmentResult.path.length; i++) {
        fullJointPath.push(segmentResult.path[i]);
      }
      for (let i = 1; i < segmentResult.cartesianPath.length; i++) {
        fullCartesianPath.push(segmentResult.cartesianPath[i]);
      }

      // Accumulate unreachable segments with offset
      if (segmentResult.unreachableSegments) {
        for (const seg of segmentResult.unreachableSegments) {
          allUnreachable.push({
            ...seg,
            index: fullJointPath.length - segmentResult.path.length + seg.index,
          });
        }
      }

      totalDistance += segmentResult.pathLength;

      // Update for next segment
      if (segmentResult.path.length > 1) {
        currentJoints = segmentResult.path[segmentResult.path.length - 1];
      }
      previousPose = targetPose;
    }

    return {
      success: allUnreachable.length === 0,
      path: fullJointPath,
      cartesianPath: fullCartesianPath,
      pathLength: totalDistance,
      planningTimeMs: performance.now() - startTime,
      unreachableSegments: allUnreachable.length > 0 ? allUnreachable : undefined,
    };
  }

  /**
   * Check if a linear path is feasible (quick check without full planning)
   */
  checkLinearFeasibility(
    startJoints: number[],
    targetPose: Pose,
    numSamples: number = 5
  ): { feasible: boolean; reason?: string } {
    const startFk = this.solver.forwardKinematics(startJoints);
    const startPose = startFk.pose;

    let currentJoints = startJoints;

    for (let i = 1; i <= numSamples; i++) {
      const t = i / numSamples;
      const pose = interpolatePose(startPose, targetPose, t);

      // Quick IK check
      const ikResult = this.solver.inverseKinematics(pose, currentJoints);

      if (!ikResult.success || !ikResult.solution) {
        return {
          feasible: false,
          reason: `IK failed at t=${t.toFixed(2)}: ${ikResult.errorMessage}`,
        };
      }

      // Check singularity
      if (this.solver.isNearSingularity(ikResult.solution, this.config.singularityThreshold)) {
        return {
          feasible: false,
          reason: `Near singularity at t=${t.toFixed(2)}`,
        };
      }

      currentJoints = ikResult.solution;
    }

    return { feasible: true };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a linear motion planner for a robot
 */
export function createLinearMotionPlanner(
  robotId: string,
  config?: Partial<LinearMotionConfig>
): LinearMotionPlanner {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(robotId);

  if (!solver) {
    throw new Error(`Robot solver '${robotId}' not found`);
  }

  return new LinearMotionPlanner(solver, config);
}

/**
 * Plan a single linear motion (convenience function)
 */
export function planLinearMotion(
  robotId: string,
  startJoints: number[],
  targetPose: Pose,
  config?: Partial<LinearMotionConfig>
): LinearMotionResult {
  const planner = createLinearMotionPlanner(robotId, config);
  return planner.planLinear(startJoints, targetPose);
}

/**
 * Plan a linear path through multiple waypoints (convenience function)
 */
export function planLinearPath(
  robotId: string,
  startJoints: number[],
  waypoints: Pose[],
  config?: Partial<LinearMotionConfig>
): LinearMotionResult {
  const planner = createLinearMotionPlanner(robotId, config);
  return planner.planLinearPath(startJoints, waypoints);
}

/**
 * Check if a linear motion is feasible (convenience function)
 */
export function checkLinearFeasibility(
  robotId: string,
  startJoints: number[],
  targetPose: Pose,
  numSamples?: number
): { feasible: boolean; reason?: string } {
  const planner = createLinearMotionPlanner(robotId);
  return planner.checkLinearFeasibility(startJoints, targetPose, numSamples);
}
