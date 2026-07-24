# RoboViz - AI Context

## Quick Facts
- **Type**: Web visualization frontend for the **trajx** kinematics/motion-planning engine (renders URDF robots + shows trajx FK/IK/planning in the browser)
- **Stack**: React 18/19 + Three.js + React Three Fiber + trajx-wasm (Rust)
- **Monorepo**: pnpm + Turbo
- **Coordinate System**: Z-up (robotics/URDF standard)
- **Language**: TypeScript
- **Scope note**: Deliberately narrow. Industrial process, vision streaming, multi-robot, advanced rendering pipeline, and multi-language SDK/protocol were removed in the 0.1.0 slim (git tag `pre-slim-2026-07-22`). Don't reintroduce them here — they belong to trajx or are out of scope.

## Build & Test
```bash
pnpm install              # Install dependencies
pnpm build                # Build all packages
pnpm test                 # Run tests
pnpm dev                  # Start demo app (examples/react-demo)
cd packages/core && pnpm build  # Build core package only
```

## Package Structure
```
packages/
├── core/           # @yuanweima/roboviz-core - Main library
└── react/          # @yuanweima/roboviz-react - Declarative React wrappers
examples/
└── react-demo/     # trajx showcase demo (render / IK / ghost / trajectory / planning)
```

## Key Directories (packages/core/src/)
| Directory | Purpose |
|-----------|---------|
| `kinematics/` | trajx IK/FK solvers, useTrajx hook, solver-interface, Wasm adapter |
| `planning/` | Motion planning (BiRRT, RRT*, PRM), planning-manager |
| `components/` | React 3D components (Robot, Scene, GhostRobot, TrajectoryFK, collision, etc.) |
| `hooks/` | React hooks (usePoseIK, useIKDrag, useGhostPreview, usePoseTrajectoryPlayer) |
| `wasm/` | WASM bindings for trajx-wasm (Rust kinematics/planning) |
| `coordinates/` | Coordinate system utilities (Z-up/Y-up conversion) |
| `collision/` `trajectory/` `interaction/` `theme/` `workers/` | Collision visuals, trajectory infra, input shortcuts, theming, WASM workers |

## Critical Patterns

### 1. WASM Data Format Warning
**WASM `getPathFlat()` returns metadata prefix!**
```
Format: [dof, n_waypoints, j1_1, j2_1, ..., j1_2, j2_2, ...]
         ^^^  ^^^^^^^^^^^
         METADATA - NOT joint values!
```
**Always slice first 2 elements:**
```typescript
const rawPath = result.getPathFlat();
const actualPathData = rawPath.slice(2);  // Skip metadata
```
**Related files**: `planning-manager.ts:610-634`

### 2. Coordinate System
All 3D positions use **Z-up** convention:
- X: forward (towards robot)
- Y: left
- Z: up

When using Three.js directly (Y-up default), conversion may be needed.
```typescript
// In hooks, specify coordinate system:
useHybridSolver({ coordinateSystem: 'Z-up' })
```

### 3. Kinematics Solver Hierarchy
```
useHybridSolver (high-level hook)
    ├── RobotSolver (DH-based, analytical IK)
    └── UrdfSolver (URDF-based, numerical IK)
```
Use `useHybridSolver` for most cases - it auto-selects best solver.

### 4. Provider Dependency Injection
Heavy optional deps (WASM solvers, planners) are injected via Context Providers:
```tsx
// SolverProvider / PlannerProvider wrap components needing IK/planning
<SolverProvider solver={solver}>
  <Robot />        {/* works without provider too */}
  <GhostRobot />   {/* gets IK capability from provider */}
</SolverProvider>
```
Hooks use `useSolverContextOptional` to work in both modes (with/without provider).

### 5. React Three Fiber Patterns
Components inside `<Canvas>` must use R3F hooks:
```tsx
// Inside Canvas: use drei/R3F hooks
const { camera } = useThree();

// Outside Canvas: use regular React hooks
const [state, setState] = useState();
```

## Common Debugging

### IK Not Working
1. Check URDF loaded: `useHybridSolver({ urdfContent })` - urdfContent must not be null
2. Check coordinate system: Should be 'Z-up' for URDF robots
3. Check joint limits: IK may fail if target is unreachable

### Trajectory Visualization Wrong
1. Check WASM path format (see Critical Pattern #1)
2. Verify start/goal joints match expected values
3. Check TrajectoryFK component has correct `robotId` and `urdfContent`

### Motion Planning Fails
1. Check joint limits are correct
2. Verify collision checker (if used) doesn't block start/goal
3. Check planner config (maxIterations, etc.)

## Architecture Decision Records
See `docs/decisions/` for design decisions:
- Coordinate system choice
- WASM integration strategy
- Solver architecture

## Known Pitfalls (docs/internal/pitfalls.md)
| ID | Issue | Quick Fix |
|----|-------|-----------|
| P001 | WASM getPathFlat() metadata | `slice(2)` before parsing |
| P002 | Y-up vs Z-up mismatch | Use `coordinateSystem: 'Z-up'` |
| P003 | Joint values clamped silently | Check logs for "out of limits" |
| P004 | Hardcoded WASM deps bloat rendering-only usage | Use optional peerDeps + sub-entry points |
| P005 | coordinates/ implicitly depends on kinematics | Move `useRobotKinematics` to `/kinematics` entry |
| P006 | TS type inference fails in async `.then()` | Use explicit casting or `resolveSync` helper |

## Testing
Core test suite (`packages/core/test/`, vitest, node env) covers the trajx engine
link + coordinate layer. The prior feature-specific tests were removed with their
features in the 0.1.0 slim.

```bash
cd packages/core && pnpm test    # 3 files / 16 tests
pnpm build                        # core + react + demo all build (tsup + vite)
```

| Test file | Covers |
|-----------|--------|
| `trajx-kinematics.test.ts` | Real trajx-wasm FK/IK vs 6-DOF fixture (round-trip, reachability) |
| `trajx-planning.test.ts` | Real BiRRT plan + `getPathFlat()` metadata format (P001) |
| `coordinates.test.ts` | Z-up ↔ Y-up conversions (P002), exact mapping + round-trip |

`test/helpers/trajx.ts` initializes the vendored trajx-wasm binary under Node
(`initSync` with the resolved `.wasm` bytes). **Still uncovered:** the React binding
layer (`kinematics-manager`, hooks) — needs a browser/jsdom + wasm harness.

## Related Documentation
- `docs/architecture.md` - System architecture (trajx frontend)
- `docs/kinematics-api.md` - Kinematics API reference
- `docs/decisions/001-wasm-data-format.md` - trajx WASM getPathFlat() format (ADR)
- `docs/internal/pitfalls.md` - Known pitfalls
- `.serena/memories/` - Project-specific knowledge
