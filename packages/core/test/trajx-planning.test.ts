/**
 * trajx engine link — motion planning + WASM path data format (pitfall P001).
 *
 * Exercises the real BiRRT planner and locks in the `getPathFlat()` contract:
 *
 *   [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
 *    ^^^  ^^^^^^^^^^^
 *    metadata — NOT joint values; consumers must slice(2) before parsing.
 *
 * See CLAUDE.md "Critical Pattern #1" and docs/internal/pitfalls.md P001.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadTrajx } from './helpers/trajx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasm: any;

const DOF = 6;
const START = Float64Array.from([0, 0, 0, 0, 0, 0]);
const GOAL = Float64Array.from([0.5, -0.3, 0.4, 0, 0.2, 0]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makePlanner(): any {
  const lower = Float64Array.from([-3, -3, -3, -3, -3, -3]);
  const upper = Float64Array.from([3, 3, 3, 3, 3, 3]);
  const limits = new wasm.JointLimits(lower, upper);
  return new wasm.BiRRTPlanner(limits);
}

beforeAll(async () => {
  wasm = await loadTrajx();
});

describe('trajx BiRRT planning', () => {
  it('plans a collision-free-space path between two configurations', () => {
    const result = makePlanner().plan(START, GOAL);
    expect(result.success).toBe(true);
  });

  it('getPathFlat() prefixes [dof, n_waypoints] metadata (P001)', () => {
    const result = makePlanner().plan(START, GOAL);
    const flat = result.getPathFlat();

    const dof = flat[0];
    const nWaypoints = flat[1];
    expect(dof).toBe(DOF);
    expect(nWaypoints).toBeGreaterThanOrEqual(2); // at least start + goal

    // Total length must equal metadata (2) + dof * n_waypoints
    expect(flat.length).toBe(2 + dof * nWaypoints);
  });

  it('actual path (after slice(2)) starts at START and ends at GOAL', () => {
    const result = makePlanner().plan(START, GOAL);
    const flat = result.getPathFlat();
    const nWaypoints = flat[1];

    // Skip the 2-element metadata prefix, then reshape into waypoints.
    const path = flat.slice(2);
    const first = Array.from(path.slice(0, DOF));
    const last = Array.from(path.slice((nWaypoints - 1) * DOF, nWaypoints * DOF));

    first.forEach((v, i) => expect(v).toBeCloseTo(START[i], 3));
    last.forEach((v, i) => expect(v).toBeCloseTo(GOAL[i], 3));
  });

  it('every waypoint stays within joint limits (metadata not treated as joints)', () => {
    const result = makePlanner().plan(START, GOAL);
    const path = result.getPathFlat().slice(2);
    // If metadata leaked into the joint stream, values like `n_waypoints`
    // would appear as a joint and blow past the ±3 rad limits.
    for (const v of path) {
      expect(v).toBeGreaterThanOrEqual(-3.0001);
      expect(v).toBeLessThanOrEqual(3.0001);
    }
  });
});
