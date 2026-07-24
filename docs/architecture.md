# RoboViz Architecture

## System Overview

RoboViz is a React Three Fiber library that renders URDF robots in the browser and
visualizes the output of the **trajx** kinematics / motion-planning engine (Rust +
WebGPU, compiled to WebAssembly). It is intentionally narrow in scope: its job is to
make trajx **visible and interactive** on the web.

```
┌─────────────────────────────────────────────────────────────────┐
│                       Host Web Application                       │
│                    (React app embedding RoboViz)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │  import { ... } from '@yuanweima/roboviz-*'
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                   @yuanweima/roboviz-react                          │
│   Declarative <RoboViz> wrapper, provider, and hooks            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                    @yuanweima/roboviz-core                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  3D Renderer (React Three Fiber + Three.js)                │ │
│  │  - Scene, lighting, camera, OrbitControls                  │ │
│  │  - Robot (URDF via urdf-loader), GhostRobot, IKGhostRobot  │ │
│  │  - TrajectoryFK, Waypoint, Obstacle, collision visuals     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Kinematics / Planning (trajx bindings)                    │ │
│  │  - useHybridSolver → Wasm solver adapter (trajx-wasm)      │ │
│  │  - FK / IK / Jacobian delegated to the WASM kernel         │ │
│  │  - Motion planning (RRT* / BiRRT / PRM) via trajx          │ │
│  │  - Provider injection (SolverProvider / PlannerProvider)   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Internal State Store (Zustand)                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │  optional peer dependency
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│              trajx-wasm  (Rust + WebGPU → WebAssembly)           │
│         FK / IK / Jacobian / collision / motion planning         │
└─────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. trajx is the engine; RoboViz is the frontend

RoboViz does not implement kinematics or planning itself. FK/IK/Jacobian and the
sampling planners (RRT*/BiRRT/PRM) are all delegated to the trajx WASM kernel. The
JS side only handles type marshalling, React integration, and rendering. `urdf-loader`
is reused for URDF parsing; nothing is reinvented in JS.

### 2. Provider dependency injection

The heavy optional dependency (trajx-wasm) is injected via context providers, so
render-only usage does not pull in the WASM kernel:

```tsx
<SolverProvider solver={solver}>
  <Robot />        {/* works without a provider too */}
  <GhostRobot />   {/* gains IK capability from the provider */}
</SolverProvider>
```

Hooks use `useSolverContextOptional` to work both with and without a provider.

### 3. Sub-entry points for tree-shaking

`@yuanweima/roboviz-core` exposes focused sub-entries so consumers only pay for what
they import:

- `@yuanweima/roboviz-core` — rendering components + hooks
- `@yuanweima/roboviz-core/kinematics` — solver providers + IK/FK hooks/components
- `@yuanweima/roboviz-core/planning` — motion planning bindings

### 4. Z-up coordinate system

All 3D positions use the **Z-up** robotics/URDF convention (X forward, Y left, Z up).
Conversion helpers for Three.js's default Y-up live in `coordinates/`.

## Packages

| Package | Responsibility |
|---------|----------------|
| `@yuanweima/roboviz-core` | Rendering, trajx kinematics/planning bindings, state store |
| `@yuanweima/roboviz-react` | Declarative React components, provider, and hooks |

## Related Documents

- `kinematics-api.md` — kinematics/IK/ghost API reference
- `decisions/001-wasm-data-format.md` — trajx WASM `getPathFlat()` data format (ADR)
- `internal/pitfalls.md` — known pitfalls (WASM metadata prefix, Z-up/Y-up, etc.)
