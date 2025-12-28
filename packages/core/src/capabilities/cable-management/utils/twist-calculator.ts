/**
 * Twist Calculator
 *
 * Utilities for calculating cable twist from robot kinematics.
 */

import * as THREE from 'three';
import { TWIST_CONSTANTS } from '../constants';

/**
 * Pose type (Z-up coordinate system)
 */
export interface Pose3D {
  position: [number, number, number];
  quaternion: [number, number, number, number]; // [x, y, z, w]
}

/**
 * Calculate twist delta between two TCP poses
 * Focuses on rotation around the vertical (Z) axis
 */
export function calculateTcpTwist(prevPose: Pose3D, currPose: Pose3D): number {
  const prevQuat = new THREE.Quaternion(
    prevPose.quaternion[0],
    prevPose.quaternion[1],
    prevPose.quaternion[2],
    prevPose.quaternion[3]
  );
  const currQuat = new THREE.Quaternion(
    currPose.quaternion[0],
    currPose.quaternion[1],
    currPose.quaternion[2],
    currPose.quaternion[3]
  );

  // Calculate relative rotation: deltaQ = prevQ^-1 * currQ
  const deltaQuat = prevQuat.clone().invert().multiply(currQuat);

  // Extract rotation around Z axis using ZYX Euler order
  const euler = new THREE.Euler().setFromQuaternion(deltaQuat, 'ZYX');

  return euler.z;
}

/**
 * Calculate twist from joint angle changes
 * Uses weighted sum of joint rotations (simplified model)
 */
export function calculateJointBasedTwist(
  prevJoints: number[],
  currJoints: number[],
  jointWeights?: number[]
): number {
  if (prevJoints.length !== currJoints.length) {
    throw new Error('Joint arrays must have same length');
  }

  const dof = prevJoints.length;
  const weights =
    jointWeights ??
    (dof === 6
      ? TWIST_CONSTANTS.DEFAULT_6DOF_WEIGHTS
      : dof === 7
        ? TWIST_CONSTANTS.DEFAULT_7DOF_WEIGHTS
        : Array(dof)
            .fill(0)
            .map((_, i) => (i >= dof - 3 ? 1 : 0)));

  let totalTwist = 0;
  for (let i = 0; i < dof; i++) {
    let delta = currJoints[i] - prevJoints[i];

    // Handle angle wrapping
    if (Math.abs(delta) > Math.PI) {
      delta = delta > 0 ? delta - 2 * Math.PI : delta + 2 * Math.PI;
    }

    totalTwist += delta * (weights[i] ?? 0);
  }

  return totalTwist;
}

/**
 * Unwrap angle to prevent discontinuities
 */
export function unwrapAngle(angle: number, reference: number): number {
  let diff = angle - reference;

  while (diff > Math.PI) {
    diff -= 2 * Math.PI;
  }
  while (diff < -Math.PI) {
    diff += 2 * Math.PI;
  }

  return reference + diff;
}

/**
 * Accumulated twist tracker class
 */
export class TwistTracker {
  private accumulatedTwist = 0;
  private lastJoints: number[] | null = null;
  private lastPose: Pose3D | null = null;
  private jointWeights: number[];
  private mode: 'joint' | 'pose';

  constructor(
    dof: number,
    options: {
      jointWeights?: number[];
      mode?: 'joint' | 'pose';
    } = {}
  ) {
    this.mode = options.mode ?? 'joint';
    this.jointWeights =
      options.jointWeights ??
      (dof === 6
        ? TWIST_CONSTANTS.DEFAULT_6DOF_WEIGHTS
        : dof === 7
          ? TWIST_CONSTANTS.DEFAULT_7DOF_WEIGHTS
          : Array(dof)
              .fill(0)
              .map((_, i) => (i >= dof - 3 ? 1 : 0)));
  }

  /**
   * Update with new joint angles
   */
  updateJoints(joints: number[]): number {
    if (this.lastJoints) {
      const delta = calculateJointBasedTwist(
        this.lastJoints,
        joints,
        this.jointWeights
      );

      if (Math.abs(delta) > TWIST_CONSTANTS.MIN_TWIST_DELTA) {
        this.accumulatedTwist += delta;
      }
    }

    this.lastJoints = [...joints];
    return this.accumulatedTwist;
  }

  /**
   * Update with new TCP pose
   */
  updatePose(pose: Pose3D): number {
    if (this.lastPose) {
      const delta = calculateTcpTwist(this.lastPose, pose);

      if (Math.abs(delta) > TWIST_CONSTANTS.MIN_TWIST_DELTA) {
        this.accumulatedTwist += delta;
      }
    }

    this.lastPose = { ...pose };
    return this.accumulatedTwist;
  }

  /**
   * Reset accumulated twist to zero
   */
  reset(): void {
    this.accumulatedTwist = 0;
    this.lastJoints = null;
    this.lastPose = null;
  }

  /**
   * Set reference (zero point) without resetting accumulated twist
   */
  setReference(joints?: number[], pose?: Pose3D): void {
    if (joints) {
      this.lastJoints = [...joints];
    }
    if (pose) {
      this.lastPose = { ...pose };
    }
  }

  /**
   * Get current accumulated twist
   */
  get twist(): number {
    return this.accumulatedTwist;
  }

  /**
   * Set accumulated twist (for restoration)
   */
  set twist(value: number) {
    this.accumulatedTwist = value;
  }

  /**
   * Get twist direction
   */
  get direction(): 1 | -1 | 0 {
    if (this.accumulatedTwist > TWIST_CONSTANTS.MIN_TWIST_DELTA) return 1;
    if (this.accumulatedTwist < -TWIST_CONSTANTS.MIN_TWIST_DELTA) return -1;
    return 0;
  }
}

/**
 * Analyze trajectory for twist profile
 */
export function analyzeTrajectoryTwist(
  trajectoryJoints: number[][],
  startTwist: number = 0,
  jointWeights?: number[]
): {
  profile: number[];
  maxTwist: number;
  maxTwistIndex: number;
  netChange: number;
} {
  if (trajectoryJoints.length === 0) {
    return {
      profile: [],
      maxTwist: startTwist,
      maxTwistIndex: 0,
      netChange: 0,
    };
  }

  const profile: number[] = [startTwist];
  let currentTwist = startTwist;
  let maxTwist = Math.abs(startTwist);
  let maxTwistIndex = 0;

  for (let i = 1; i < trajectoryJoints.length; i++) {
    const delta = calculateJointBasedTwist(
      trajectoryJoints[i - 1],
      trajectoryJoints[i],
      jointWeights
    );

    currentTwist += delta;
    profile.push(currentTwist);

    if (Math.abs(currentTwist) > maxTwist) {
      maxTwist = Math.abs(currentTwist);
      maxTwistIndex = i;
    }
  }

  return {
    profile,
    maxTwist,
    maxTwistIndex,
    netChange: currentTwist - startTwist,
  };
}

/**
 * Estimate twist for a single joint configuration change
 * Useful for quick preview without full FK
 */
export function estimateTwistDelta(
  fromJoints: number[],
  toJoints: number[],
  jointWeights?: number[]
): number {
  return calculateJointBasedTwist(fromJoints, toJoints, jointWeights);
}

/**
 * Find neutral configuration with minimum twist
 * Given current twist and joint configuration, suggest adjustments
 */
export function suggestUnwindConfiguration(
  currentJoints: number[],
  currentTwist: number,
  jointLimits: { lower: number[]; upper: number[] },
  jointWeights?: number[]
): {
  suggestedJoints: number[];
  expectedTwistReduction: number;
} {
  const dof = currentJoints.length;
  const weights =
    jointWeights ??
    (dof === 6
      ? TWIST_CONSTANTS.DEFAULT_6DOF_WEIGHTS
      : dof === 7
        ? TWIST_CONSTANTS.DEFAULT_7DOF_WEIGHTS
        : Array(dof)
            .fill(0)
            .map((_, i) => (i >= dof - 3 ? 1 : 0)));

  const suggestedJoints = [...currentJoints];
  let remainingTwist = currentTwist;

  // Work backwards from last joint (highest weight typically)
  for (let i = dof - 1; i >= 0 && Math.abs(remainingTwist) > 0.1; i--) {
    const weight = weights[i];
    if (weight <= 0) continue;

    // How much this joint needs to move to compensate
    const neededDelta = -remainingTwist / weight;

    // Clamp to joint limits
    const currentAngle = currentJoints[i];
    const minDelta = jointLimits.lower[i] - currentAngle;
    const maxDelta = jointLimits.upper[i] - currentAngle;

    const actualDelta = Math.max(minDelta, Math.min(maxDelta, neededDelta));
    suggestedJoints[i] = currentAngle + actualDelta;

    remainingTwist += actualDelta * weight;
  }

  return {
    suggestedJoints,
    expectedTwistReduction: currentTwist - remainingTwist,
  };
}
