# Known Pitfalls and Gotchas

This document records bugs and issues that were difficult to debug, so future developers (and AI assistants) can avoid them.

## Format
Each pitfall follows this structure:
- **ID**: Unique identifier for reference
- **Date**: When discovered
- **Symptom**: What you observe
- **Root Cause**: Why it happens
- **Fix**: How to solve it
- **Files**: Related source files
- **Prevention**: How to avoid in the future

---

## P001: WASM getPathFlat() Metadata Prefix

**Date**: 2024-12-30

**Symptom**:
- First waypoint has joint values like `[6.0, 30.0, 0.838, 0.42, ...]`
- These values (6.0, 30.0) are suspiciously round numbers
- FK produces positions underground (z < 0) or far from expected
- Console warning: "Invalid flat array length: 218 is not divisible by dof=6"

**Root Cause**:
WASM `getPathFlat()` returns data with a metadata prefix:
```
Format: [dof, n_waypoints, j1_1, j2_1, ..., j1_n, j2_n, ...]
         ^^^  ^^^^^^^^^^^
         6    30           <- These are NOT joint values!
```

The first two elements are:
1. `dof` (degrees of freedom, e.g., 6)
2. `n_waypoints` (number of waypoints, e.g., 30)

If not skipped, these get parsed as the first waypoint's joint values.

**Why Hard to Debug**:
- Values 6.0 and 30.0 are within typical joint limits (±2π ≈ ±6.28)
- Clamping doesn't throw errors, just silently adjusts values
- FK still computes a position, just a wrong one
- Visual output shows a trajectory, but in wrong location

**Fix**:
```typescript
// In planning-manager.ts
const rawPath = result.getPathFlat();
const wasmDof = rawPath[0];           // Extract metadata
const wasmWaypointCount = rawPath[1]; // Extract metadata
const actualPathData = rawPath.slice(2);  // Skip first 2 elements!

// Now parse actualPathData, NOT rawPath
const path = this.flatArrayToWaypoints(actualPathData, dof);
```

**Files**:
- `packages/core/src/planning/planning-manager.ts:610-634`
- `packages/core/src/wasm/trajx_wasm.js` (WASM bindings, documentation)

**Prevention**:
1. Add validation in `flatArrayToWaypoints()` to check first waypoint against joint limits
2. Add JSDoc warning on functions that consume WASM output
3. Create wrapper functions that handle metadata stripping internally

---

## P002: Coordinate System Mismatch (Y-up vs Z-up)

**Date**: 2024-12 (ongoing)

**Symptom**:
- Robot renders sideways or upside down
- IK solutions are mirrored or rotated
- Trajectory appears correct in console but wrong in 3D view

**Root Cause**:
- **Three.js** default: Y-up (graphics convention)
- **URDF/ROS** standard: Z-up (robotics convention)
- Mixing these without conversion causes orientation issues

**Fix**:
Always specify coordinate system explicitly:
```typescript
// In hooks
const { fk, ik } = useHybridSolver({
  coordinateSystem: 'Z-up',  // Explicit!
});

// In TrajectoryFK
<TrajectoryFK
  coordinateSystem="Z-up"
  // ...
/>
```

**Files**:
- `packages/core/src/kinematics/useTrajx.ts`
- `packages/core/src/components/TrajectoryFK.tsx`
- `packages/core/src/coordinates/`

**Prevention**:
1. Default all hooks to 'Z-up' (done in recent update)
2. Add console warning if coordinateSystem is not specified
3. Document coordinate system in all component props

---

## P003: Silent Joint Limit Clamping

**Date**: 2024-12-30

**Symptom**:
- Robot moves but not to expected position
- No error messages in console
- Planned trajectory differs from executed trajectory

**Root Cause**:
Joint values outside limits are silently clamped:
```typescript
// This doesn't throw, just clamps
const clampedJoint = Math.min(upper, Math.max(lower, value));
```

**Why Hard to Debug**:
- No error or warning by default
- Clamped values are still valid, just different
- FK/IK succeed, just with wrong input

**Fix**:
Add validation with warning:
```typescript
if (value < lower || value > upper) {
  console.warn(`Joint ${i} value ${value} outside limits [${lower}, ${upper}]`);
}
```

**Files**:
- `packages/core/src/components/TrajectoryFK.tsx:362-373` (debug logging)
- `packages/core/src/planning/planning-manager.ts:863-874` (validation)

**Prevention**:
1. Add debug mode flag to enable joint limit warnings
2. Validate at system boundaries (WASM output, user input)
3. Include original vs clamped values in debug output

---

## P004: WASM Object Lifecycle (free() calls)

**Date**: 2024-12

**Symptom**:
- Memory leak over time
- "invalid pointer" or similar WASM errors
- Double-free crashes

**Root Cause**:
WASM objects (Planner, Config, JointLimits) must be manually freed:
```typescript
const planner = new trajx.BiRRTPlanner(limits, config);
// ... use planner ...
planner.free();  // MUST call this!
```

Some objects are consumed by constructors (builder pattern):
```typescript
// Config is CONSUMED by Planner constructor - don't free config!
const config = new trajx.BiRRTConfig().withMaxIterations(1000);
const planner = new trajx.BiRRTPlanner(limits, config);  // config consumed
planner.free();  // Only free planner
```

**Fix**:
Use try/finally pattern:
```typescript
const limits = new trajx.JointLimits(...);
try {
  const planner = new trajx.BiRRTPlanner(limits, config);
  try {
    return planner.plan(start, goal);
  } finally {
    planner.free();
  }
} finally {
  limits.free();
}
```

**Files**:
- `packages/core/src/planning/planning-manager.ts` (examples of proper cleanup)
- `packages/core/src/wasm/trajx_wasm.d.ts` (type definitions)

**Prevention**:
1. Always use try/finally for WASM objects
2. Document which objects consume others in JSDoc
3. Consider creating wrapper classes that handle lifecycle

---

## Template for New Pitfalls

```markdown
## P00X: [Title]

**Date**: YYYY-MM-DD

**Symptom**:
[What you observe when this bug occurs]

**Root Cause**:
[Why it happens - technical explanation]

**Fix**:
[Code or steps to fix]

**Files**:
[List of relevant source files]

**Prevention**:
[How to avoid this in the future]
```
