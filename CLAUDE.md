# RoboViz - AI Context

## Quick Facts
- **Type**: 3D Robot Visualization Library for Industrial Robotics
- **Stack**: React 18/19 + Three.js + React Three Fiber + WASM (Rust)
- **Monorepo**: pnpm + Turbo
- **Coordinate System**: Z-up (robotics/URDF standard)
- **Language**: TypeScript

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
├── core/           # @aspect/roboviz-core - Main library
├── react/          # @aspect/roboviz-react - React wrappers
└── viewer/         # @aspect/roboviz-viewer - Standalone viewer
examples/
└── react-demo/     # Demo application with all features
```

## Key Directories (packages/core/src/)
| Directory | Purpose |
|-----------|---------|
| `kinematics/` | IK/FK solvers, useTrajx hook, solver-interface |
| `planning/` | Motion planning (BiRRT, RRT*, PRM), planning-manager |
| `components/` | React 3D components (Robot, TrajectoryFK, Ghost, etc.) |
| `hooks/` | React hooks (usePoseIK, useIKDrag, useWorkpointIK) |
| `wasm/` | WASM bindings for trajx-wasm (Rust kinematics/planning) |
| `coordinates/` | Coordinate system utilities (Z-up/Y-up conversion) |
| `process/` | Industrial process management |

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

### 4. React Three Fiber Patterns
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

## Testing
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- packages/core/test/kinematics.test.ts

# Visual test for trajx-wasm
open packages/core/test/trajx-wasm-visual/index.html
```

## Related Documentation
- `docs/architecture.md` - System architecture
- `docs/kinematics-api.md` - Kinematics API reference
- `docs/protocol.md` - JSON-RPC protocol spec
- `.serena/memories/` - Project-specific knowledge
