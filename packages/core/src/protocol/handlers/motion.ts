/**
 * RoboViz Motion Planning Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for motion.* namespace
 * Provides linear motion planning and path generation.
 */

import type { MethodHandler } from '../handler';
import type { Pose } from '../../types';
import type {
  LinearMotionResult,
  PathPlanningResult,
  PathPlanningConfig,
} from '../../kinematics/types';
import {
  createLinearMotionPlanner,
  planLinearMotion,
  planLinearPath,
  checkLinearFeasibility,
  type LinearMotionConfig,
} from '../../kinematics/linear-motion';
import { getKinematicsManager } from '../../kinematics/kinematics-manager';
import { useVizStore } from '../../store/vizStore';

// ============================================================================
// Linear Motion Handlers
// ============================================================================

/**
 * motion.linear - Plan a single linear motion
 */
export const motionLinear: MethodHandler<
  {
    robotId: string;
    startJoints: number[];
    targetPose: Pose;
    config?: Partial<LinearMotionConfig>;
  },
  LinearMotionResult
> = (params) => {
  return planLinearMotion(
    params.robotId,
    params.startJoints,
    params.targetPose,
    params.config
  );
};

/**
 * motion.linearPath - Plan a linear path through multiple waypoints
 */
export const motionLinearPath: MethodHandler<
  {
    robotId: string;
    startJoints: number[];
    waypoints: Pose[];
    config?: Partial<LinearMotionConfig>;
  },
  LinearMotionResult
> = (params) => {
  return planLinearPath(
    params.robotId,
    params.startJoints,
    params.waypoints,
    params.config
  );
};

/**
 * motion.checkLinear - Check if a linear motion is feasible
 */
export const motionCheckLinear: MethodHandler<
  {
    robotId: string;
    startJoints: number[];
    targetPose: Pose;
    numSamples?: number;
  },
  { feasible: boolean; reason?: string }
> = (params) => {
  return checkLinearFeasibility(
    params.robotId,
    params.startJoints,
    params.targetPose,
    params.numSamples
  );
};

/**
 * motion.linearFromCurrent - Plan linear motion from current robot state
 *
 * Gets current joints from the visualization store
 */
export const motionLinearFromCurrent: MethodHandler<
  {
    robotId: string;
    targetPose: Pose;
    config?: Partial<LinearMotionConfig>;
  },
  LinearMotionResult
> = (params) => {
  const state = useVizStore.getState();
  const robot = state.robots.get(params.robotId);

  if (!robot) {
    return {
      success: false,
      path: [],
      cartesianPath: [],
      pathLength: 0,
      planningTimeMs: 0,
      errorMessage: `Robot '${params.robotId}' not found in store`,
    };
  }

  return planLinearMotion(
    params.robotId,
    robot.jointAngles,
    params.targetPose,
    params.config
  );
};

// ============================================================================
// Path Interpolation Handlers
// ============================================================================

/**
 * motion.interpolatePath - Interpolate a joint path with finer resolution
 */
export const motionInterpolatePath: MethodHandler<
  {
    path: number[][];
    resolution: number;
  },
  { path: number[][]; pointCount: number }
> = (params) => {
  const { path, resolution } = params;

  if (path.length < 2) {
    return { path, pointCount: path.length };
  }

  const interpolated: number[][] = [path[0]];
  const dof = path[0].length;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];

    // Calculate max joint movement
    let maxDelta = 0;
    for (let j = 0; j < dof; j++) {
      maxDelta = Math.max(maxDelta, Math.abs(curr[j] - prev[j]));
    }

    // Number of intermediate points
    const numPoints = Math.max(1, Math.ceil(maxDelta / resolution));

    // Interpolate
    for (let k = 1; k <= numPoints; k++) {
      const t = k / numPoints;
      const point = new Array(dof);
      for (let j = 0; j < dof; j++) {
        point[j] = prev[j] + (curr[j] - prev[j]) * t;
      }
      interpolated.push(point);
    }
  }

  return { path: interpolated, pointCount: interpolated.length };
};

/**
 * motion.smoothPath - Smooth a joint path using moving average
 */
export const motionSmoothPath: MethodHandler<
  {
    path: number[][];
    windowSize?: number;
  },
  { path: number[][] }
> = (params) => {
  const { path, windowSize = 3 } = params;

  if (path.length <= windowSize) {
    return { path };
  }

  const dof = path[0].length;
  const smoothed: number[][] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < path.length; i++) {
    // Keep first and last points unchanged
    if (i < halfWindow || i >= path.length - halfWindow) {
      smoothed.push([...path[i]]);
      continue;
    }

    // Average over window
    const point = new Array(dof).fill(0);
    for (let w = -halfWindow; w <= halfWindow; w++) {
      for (let j = 0; j < dof; j++) {
        point[j] += path[i + w][j];
      }
    }
    for (let j = 0; j < dof; j++) {
      point[j] /= windowSize;
    }
    smoothed.push(point);
  }

  return { path: smoothed };
};

// ============================================================================
// Cartesian Path Handlers
// ============================================================================

/**
 * motion.cartesianToJoint - Convert a Cartesian path to joint path using IK
 */
export const motionCartesianToJoint: MethodHandler<
  {
    robotId: string;
    cartesianPath: Pose[];
    seedJoints: number[];
  },
  {
    success: boolean;
    jointPath: number[][];
    failedIndices: number[];
  }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);

  if (!solver) {
    return {
      success: false,
      jointPath: [],
      failedIndices: [],
    };
  }

  const jointPath: number[][] = [];
  const failedIndices: number[] = [];
  let currentSeed = params.seedJoints;

  for (let i = 0; i < params.cartesianPath.length; i++) {
    const pose = params.cartesianPath[i];
    const ikResult = solver.inverseKinematics(pose, currentSeed);

    if (ikResult.success && ikResult.solution) {
      jointPath.push(ikResult.solution);
      currentSeed = ikResult.solution;
    } else {
      failedIndices.push(i);
      // Use previous solution as placeholder
      jointPath.push(currentSeed);
    }
  }

  return {
    success: failedIndices.length === 0,
    jointPath,
    failedIndices,
  };
};

/**
 * motion.jointToCartesian - Convert a joint path to Cartesian path using FK
 */
export const motionJointToCartesian: MethodHandler<
  {
    robotId: string;
    jointPath: number[][];
  },
  {
    success: boolean;
    cartesianPath: Pose[];
  }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);

  if (!solver) {
    return {
      success: false,
      cartesianPath: [],
    };
  }

  const cartesianPath: Pose[] = [];

  for (const joints of params.jointPath) {
    const fkResult = solver.forwardKinematics(joints);
    cartesianPath.push(fkResult.pose);
  }

  return {
    success: true,
    cartesianPath,
  };
};

// ============================================================================
// Path Analysis Handlers
// ============================================================================

/**
 * motion.analyzePath - Analyze a path for singularities and joint limit margins
 */
export const motionAnalyzePath: MethodHandler<
  {
    robotId: string;
    path: number[][];
  },
  {
    totalLength: number;
    singularityIndices: number[];
    jointLimitWarnings: { index: number; joint: number; margin: number }[];
    manipulabilities: number[];
  }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);

  if (!solver) {
    throw new Error(`Solver '${params.robotId}' not found`);
  }

  const singularityIndices: number[] = [];
  const jointLimitWarnings: { index: number; joint: number; margin: number }[] = [];
  const manipulabilities: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < params.path.length; i++) {
    const joints = params.path[i];
    const workspace = solver.analyzeWorkspace(joints);

    manipulabilities.push(workspace.manipulability);

    if (workspace.isNearSingular) {
      singularityIndices.push(i);
    }

    // Check joint limit margins (warn if < 10%)
    for (let j = 0; j < workspace.jointLimitMargins.length; j++) {
      if (workspace.jointLimitMargins[j] < 0.1) {
        jointLimitWarnings.push({
          index: i,
          joint: j,
          margin: workspace.jointLimitMargins[j],
        });
      }
    }

    // Calculate path length
    if (i > 0) {
      const prev = params.path[i - 1];
      let segmentLength = 0;
      for (let j = 0; j < joints.length; j++) {
        segmentLength += (joints[j] - prev[j]) ** 2;
      }
      totalLength += Math.sqrt(segmentLength);
    }
  }

  return {
    totalLength,
    singularityIndices,
    jointLimitWarnings,
    manipulabilities,
  };
};

/**
 * motion.validatePath - Validate a path for execution
 */
export const motionValidatePath: MethodHandler<
  {
    robotId: string;
    path: number[][];
    maxJointVelocity?: number;
    timeStep?: number;
  },
  {
    valid: boolean;
    issues: string[];
  }
> = (params) => {
  const manager = getKinematicsManager();
  const solver = manager.getSolver(params.robotId);

  if (!solver) {
    return { valid: false, issues: [`Solver '${params.robotId}' not found`] };
  }

  const issues: string[] = [];
  const maxVel = params.maxJointVelocity || 2.0; // rad/s
  const dt = params.timeStep || 0.008; // 8ms = 125Hz

  for (let i = 0; i < params.path.length; i++) {
    const joints = params.path[i];

    // Check joint limits
    if (!solver.isValidConfig(joints)) {
      issues.push(`Point ${i}: Joint limits exceeded`);
    }

    // Check singularity
    if (solver.isNearSingularity(joints)) {
      issues.push(`Point ${i}: Near singularity`);
    }

    // Check velocity limits
    if (i > 0) {
      const prev = params.path[i - 1];
      for (let j = 0; j < joints.length; j++) {
        const vel = Math.abs(joints[j] - prev[j]) / dt;
        if (vel > maxVel) {
          issues.push(`Point ${i}, Joint ${j}: Velocity ${vel.toFixed(2)} rad/s exceeds limit ${maxVel} rad/s`);
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register all motion planning handlers to dispatcher
 */
export function registerMotionHandlers(
  register: <TParams, TResult>(method: string, handler: MethodHandler<TParams, TResult>) => void
): void {
  // Linear motion
  register('motion.linear', motionLinear);
  register('motion.linearPath', motionLinearPath);
  register('motion.checkLinear', motionCheckLinear);
  register('motion.linearFromCurrent', motionLinearFromCurrent);

  // Path interpolation
  register('motion.interpolatePath', motionInterpolatePath);
  register('motion.smoothPath', motionSmoothPath);

  // Cartesian conversion
  register('motion.cartesianToJoint', motionCartesianToJoint);
  register('motion.jointToCartesian', motionJointToCartesian);

  // Path analysis
  register('motion.analyzePath', motionAnalyzePath);
  register('motion.validatePath', motionValidatePath);
}
