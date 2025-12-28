/**
 * Twist Calculator Tests
 *
 * Unit tests for cable twist calculation utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTcpTwist,
  calculateJointBasedTwist,
  unwrapAngle,
  TwistTracker,
  analyzeTrajectoryTwist,
  estimateTwistDelta,
  suggestUnwindConfiguration,
} from '../../src/capabilities/cable-management/utils/twist-calculator';

// ============================================================
// Test Helpers
// ============================================================

const createPose = (
  position: [number, number, number],
  euler: [number, number, number] // [roll, pitch, yaw] in radians
) => {
  // Convert Euler to Quaternion (simplified ZYX order)
  const [roll, pitch, yaw] = euler;
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  return {
    position,
    quaternion: [
      sr * cp * cy - cr * sp * sy, // x
      cr * sp * cy + sr * cp * sy, // y
      cr * cp * sy - sr * sp * cy, // z
      cr * cp * cy + sr * sp * sy, // w
    ] as [number, number, number, number],
  };
};

// ============================================================
// calculateTcpTwist Tests
// ============================================================

describe('calculateTcpTwist', () => {
  it('should return 0 for identical poses', () => {
    const pose = createPose([0, 0, 0], [0, 0, 0]);
    const twist = calculateTcpTwist(pose, pose);
    expect(twist).toBeCloseTo(0, 5);
  });

  it('should detect positive Z rotation (yaw)', () => {
    const pose1 = createPose([0, 0, 0], [0, 0, 0]);
    const pose2 = createPose([0, 0, 0], [0, 0, Math.PI / 4]); // 45 degrees

    const twist = calculateTcpTwist(pose1, pose2);
    expect(twist).toBeCloseTo(Math.PI / 4, 3);
  });

  it('should detect negative Z rotation', () => {
    const pose1 = createPose([0, 0, 0], [0, 0, 0]);
    const pose2 = createPose([0, 0, 0], [0, 0, -Math.PI / 2]); // -90 degrees

    const twist = calculateTcpTwist(pose1, pose2);
    expect(twist).toBeCloseTo(-Math.PI / 2, 3);
  });

  it('should be independent of position changes', () => {
    const pose1 = createPose([0, 0, 0], [0, 0, 0]);
    const pose2 = createPose([1, 2, 3], [0, 0, 0]);

    const twist = calculateTcpTwist(pose1, pose2);
    expect(twist).toBeCloseTo(0, 5);
  });
});

// ============================================================
// calculateJointBasedTwist Tests
// ============================================================

describe('calculateJointBasedTwist', () => {
  it('should return 0 for identical joint angles', () => {
    const joints = [0, 0, 0, 0, 0, 0];
    const twist = calculateJointBasedTwist(joints, joints);
    expect(twist).toBeCloseTo(0, 5);
  });

  it('should calculate twist with default 6-DOF weights', () => {
    const prev = [0, 0, 0, 0, 0, 0];
    const curr = [0, 0, 0, 0, 0, Math.PI]; // Last joint rotated 180 degrees

    const twist = calculateJointBasedTwist(prev, curr);
    // Default weight for joint 6 is 1.0
    expect(twist).toBeCloseTo(Math.PI, 3);
  });

  it('should use custom joint weights', () => {
    const prev = [0, 0, 0, 0, 0, 0];
    const curr = [Math.PI, 0, 0, 0, 0, 0]; // First joint rotated

    const weights = [1, 0, 0, 0, 0, 0]; // Only first joint contributes
    const twist = calculateJointBasedTwist(prev, curr, weights);
    expect(twist).toBeCloseTo(Math.PI, 3);
  });

  it('should handle angle wrapping', () => {
    const prev = [0, 0, 0, 0, 0, Math.PI * 0.9];
    const curr = [0, 0, 0, 0, 0, -Math.PI * 0.9]; // Wrapped around

    const twist = calculateJointBasedTwist(prev, curr);
    // Should detect ~0.2π change, not ~1.8π
    expect(Math.abs(twist)).toBeLessThan(Math.PI);
  });

  it('should throw for mismatched array lengths', () => {
    const prev = [0, 0, 0, 0, 0, 0];
    const curr = [0, 0, 0, 0, 0];

    expect(() => calculateJointBasedTwist(prev, curr)).toThrow(
      'Joint arrays must have same length'
    );
  });
});

// ============================================================
// unwrapAngle Tests
// ============================================================

describe('unwrapAngle', () => {
  it('should not change angle within π of reference', () => {
    const result = unwrapAngle(0.5, 0);
    expect(result).toBeCloseTo(0.5, 5);
  });

  it('should wrap positive angle exceeding π', () => {
    const result = unwrapAngle(Math.PI + 0.5, 0);
    expect(result).toBeCloseTo(-Math.PI + 0.5, 5);
  });

  it('should wrap negative angle below -π', () => {
    const result = unwrapAngle(-Math.PI - 0.5, 0);
    expect(result).toBeCloseTo(Math.PI - 0.5, 5);
  });
});

// ============================================================
// TwistTracker Tests
// ============================================================

describe('TwistTracker', () => {
  let tracker: TwistTracker;

  beforeEach(() => {
    tracker = new TwistTracker(6);
  });

  it('should start with zero twist', () => {
    expect(tracker.twist).toBe(0);
  });

  it('should accumulate twist from joint updates', () => {
    tracker.updateJoints([0, 0, 0, 0, 0, 0]);
    tracker.updateJoints([0, 0, 0, 0, 0, Math.PI / 2]);

    expect(tracker.twist).toBeCloseTo(Math.PI / 2, 3);
  });

  it('should accumulate multiple updates', () => {
    tracker.updateJoints([0, 0, 0, 0, 0, 0]);
    tracker.updateJoints([0, 0, 0, 0, 0, Math.PI / 4]);
    tracker.updateJoints([0, 0, 0, 0, 0, Math.PI / 2]);

    expect(tracker.twist).toBeCloseTo(Math.PI / 2, 3);
  });

  it('should reset twist to zero', () => {
    tracker.updateJoints([0, 0, 0, 0, 0, 0]);
    tracker.updateJoints([0, 0, 0, 0, 0, Math.PI]);

    tracker.reset();
    expect(tracker.twist).toBe(0);
  });

  it('should report correct direction', () => {
    tracker.updateJoints([0, 0, 0, 0, 0, 0]);
    tracker.updateJoints([0, 0, 0, 0, 0, 0.1]);

    expect(tracker.direction).toBe(1); // Positive/CW

    tracker.reset();
    tracker.updateJoints([0, 0, 0, 0, 0, 0]);
    tracker.updateJoints([0, 0, 0, 0, 0, -0.1]);

    expect(tracker.direction).toBe(-1); // Negative/CCW
  });

  it('should allow setting twist value', () => {
    tracker.twist = Math.PI;
    expect(tracker.twist).toBe(Math.PI);
  });
});

// ============================================================
// analyzeTrajectoryTwist Tests
// ============================================================

describe('analyzeTrajectoryTwist', () => {
  it('should handle empty trajectory', () => {
    const result = analyzeTrajectoryTwist([]);
    expect(result.profile).toHaveLength(0);
    expect(result.netChange).toBe(0);
  });

  it('should analyze simple trajectory', () => {
    const trajectory = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, Math.PI / 4],
      [0, 0, 0, 0, 0, Math.PI / 2],
    ];

    const result = analyzeTrajectoryTwist(trajectory);

    expect(result.profile).toHaveLength(3);
    expect(result.profile[0]).toBeCloseTo(0, 3);
    expect(result.profile[2]).toBeCloseTo(Math.PI / 2, 3);
    expect(result.netChange).toBeCloseTo(Math.PI / 2, 3);
  });

  it('should track maximum twist position', () => {
    const trajectory = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, Math.PI], // Peak
      [0, 0, 0, 0, 0, Math.PI / 2], // Return
    ];

    const result = analyzeTrajectoryTwist(trajectory);

    expect(result.maxTwist).toBeCloseTo(Math.PI, 3);
    expect(result.maxTwistIndex).toBe(1);
  });

  it('should use start twist offset', () => {
    const trajectory = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, Math.PI / 4],
    ];

    const startTwist = Math.PI / 2;
    const result = analyzeTrajectoryTwist(trajectory, startTwist);

    expect(result.profile[0]).toBeCloseTo(startTwist, 3);
    expect(result.profile[1]).toBeCloseTo(startTwist + Math.PI / 4, 3);
  });
});

// ============================================================
// estimateTwistDelta Tests
// ============================================================

describe('estimateTwistDelta', () => {
  it('should estimate twist delta between configurations', () => {
    const from = [0, 0, 0, 0, 0, 0];
    const to = [0, 0, 0, 0, 0, Math.PI / 2];

    const delta = estimateTwistDelta(from, to);
    expect(delta).toBeCloseTo(Math.PI / 2, 3);
  });
});

// ============================================================
// suggestUnwindConfiguration Tests
// ============================================================

describe('suggestUnwindConfiguration', () => {
  it('should suggest configuration to reduce twist', () => {
    const currentJoints = [0, 0, 0, 0, 0, Math.PI / 2];
    const currentTwist = Math.PI / 2;
    const jointLimits = {
      lower: [-Math.PI, -Math.PI, -Math.PI, -Math.PI, -Math.PI, -Math.PI],
      upper: [Math.PI, Math.PI, Math.PI, Math.PI, Math.PI, Math.PI],
    };

    const result = suggestUnwindConfiguration(
      currentJoints,
      currentTwist,
      jointLimits
    );

    // Should suggest reducing twist
    expect(result.expectedTwistReduction).toBeGreaterThan(0);
  });

  it('should respect joint limits', () => {
    const currentJoints = [0, 0, 0, 0, 0, 2.5]; // Close to upper limit
    const currentTwist = 2.5;
    const jointLimits = {
      lower: [-Math.PI, -Math.PI, -Math.PI, -Math.PI, -Math.PI, -Math.PI],
      upper: [Math.PI, Math.PI, Math.PI, Math.PI, Math.PI, Math.PI],
    };

    const result = suggestUnwindConfiguration(
      currentJoints,
      currentTwist,
      jointLimits
    );

    // Suggested joints should be within limits
    result.suggestedJoints.forEach((joint, i) => {
      expect(joint).toBeGreaterThanOrEqual(jointLimits.lower[i]);
      expect(joint).toBeLessThanOrEqual(jointLimits.upper[i]);
    });
  });
});
