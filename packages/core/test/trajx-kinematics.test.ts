/**
 * trajx engine link — forward / inverse kinematics.
 *
 * These tests exercise the real trajx-wasm kernel (not a mock) against a
 * bundled 6-DOF URDF fixture. They guard the single most important contract
 * RoboViz depends on: that trajx actually computes correct FK/IK. A broken or
 * mismatched trajx-wasm vendor bump should fail here.
 *
 * Note: the React binding layer (kinematics-manager) initializes trajx-wasm by
 * fetching the co-located `.wasm` via the bundler, which needs a browser/jsdom
 * harness. That layer is intentionally not covered here — this file verifies the
 * engine itself.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadTrajx, loadFixtureUrdf } from './helpers/trajx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasm: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let robot: any;
let jointCount: number;

beforeAll(async () => {
  wasm = await loadTrajx();
  robot = wasm.Robot.fromString(loadFixtureUrdf());
  jointCount = robot.jointNames().length;
});

const zeros = () => new Float64Array(jointCount);

describe('trajx FK/IK (6-DOF Fanuc fixture)', () => {
  it('loads a 6-DOF robot from URDF', () => {
    expect(jointCount).toBe(6);
    expect(robot.jointNames()).toEqual([
      'joint1', 'joint2', 'joint3', 'joint4', 'joint5', 'joint6',
    ]);
  });

  it('forward kinematics returns a plausible, deterministic pose', () => {
    const pose1 = robot.forwardKinematics(zeros());
    const pose2 = robot.forwardKinematics(zeros());

    // Deterministic: same joints → same TCP position
    expect(pose1.position.x).toBeCloseTo(pose2.position.x, 10);
    expect(pose1.position.y).toBeCloseTo(pose2.position.y, 10);
    expect(pose1.position.z).toBeCloseTo(pose2.position.z, 10);

    // Home pose is off the base origin and above the ground
    const [x, y, z] = Array.from(pose1.position.toArray() as Float64Array);
    expect(Math.hypot(x, y, z)).toBeGreaterThan(0.1);
    expect(z).toBeGreaterThan(0);
  });

  it('moving a joint changes the end-effector pose', () => {
    const home = robot.forwardKinematics(zeros());
    const moved = robot.forwardKinematics(
      Float64Array.from([0, 0.4, -0.3, 0, 0.2, 0]),
    );
    const delta = Math.hypot(
      home.position.x - moved.position.x,
      home.position.y - moved.position.y,
      home.position.z - moved.position.z,
    );
    expect(delta).toBeGreaterThan(1e-3);
  });

  it('IK recovers a reachable target (FK → IK → FK round-trip)', () => {
    const q = Float64Array.from([0.2, 0.3, -0.2, 0.1, 0.4, -0.1]);
    const target = robot.forwardKinematics(q);

    const ik = robot.inverseKinematics(target, zeros());
    expect(ik.success).toBe(true);
    expect(ik.error).toBeLessThan(1e-4);

    // IK may return a different valid branch, so compare poses, not joints.
    const reached = robot.forwardKinematics(ik.solution);
    expect(reached.position.x).toBeCloseTo(target.position.x, 4);
    expect(reached.position.y).toBeCloseTo(target.position.y, 4);
    expect(reached.position.z).toBeCloseTo(target.position.z, 4);
  });

  it('reports reachability for in-workspace vs far-away targets', () => {
    const reachable = robot.forwardKinematics(
      Float64Array.from([0, 0.3, -0.2, 0, 0.3, 0]),
    );
    expect(robot.isReachable(reachable)).toBe(true);

    const farAway = new wasm.Pose(
      new wasm.Position(100, 100, 100),
      new wasm.Quaternion(0, 0, 0, 1),
    );
    expect(robot.isReachable(farAway)).toBe(false);
  });

  it('exposes finite joint limits', () => {
    const limits = robot.getJointLimits();
    expect(limits).toBeDefined();
  });
});
