<div align="center">

# RoboViz

**In-browser visualization frontend for the [trajx](https://github.com/yuanweima/trajx) kinematics & motion-planning engine.**

[![Live demo](https://img.shields.io/badge/▶%20live%20demo-online-4a9eff?style=flat-square)](https://yuanweima.github.io/roboviz/)
[![Deploy demo](https://img.shields.io/github/actions/workflow/status/yuanweima/roboviz/deploy-demo.yml?style=flat-square&label=pages)](https://github.com/yuanweima/roboviz/actions/workflows/deploy-demo.yml)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r170-000000?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org)
[![WebGPU](https://img.shields.io/badge/WebGPU-powered-005a9c?style=flat-square)](https://www.w3.org/TR/webgpu/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey?style=flat-square)](#license)

**[▶ Try the live demo](https://yuanweima.github.io/roboviz/)** · [Features](#features) · [Demos](#live-demos) · [Quickstart](#quickstart) · [Benchmarks](#benchmarks)

**English** · [简体中文](./README.zh-CN.md)

</div>

---

RoboViz renders URDF robots with **React Three Fiber** and shows **[trajx](https://github.com/yuanweima/trajx)** — a Rust + WebGPU kinematics / motion-planning engine compiled to WebAssembly — solving forward kinematics, analytical and GPU-batch inverse kinematics, and sampling-based motion planning, live in the browser. It is the official interactive demo and rendering layer for trajx.

> **Status — pre-release.** RoboViz is source-available in this repo. Its packages ship through **private GitHub Packages** (not public npm), and the engine `@yuanweima/trajx-wasm` (`0.9.0`) is proprietary. There is nothing to install to try it — just open the **[live demo](https://yuanweima.github.io/roboviz/)**.

## Why RoboViz

cuRobo gives you GPU acceleration but locks you into NVIDIA + Python. Pinocchio and MoveIt are excellent but can't run on the web. **trajx is the only engine that brings GPU-class kinematics to the browser** — and RoboViz is how you see and interact with it. No CUDA, no ROS, no backend: the whole engine runs client-side as a single WebAssembly module.

## Live demos

Everything below runs the real trajx engine in your browser — [try it](https://yuanweima.github.io/roboviz/).

| Demo | What it shows |
|------|----------------|
| [**Batch IK Swarm**](https://yuanweima.github.io/roboviz/#/demo/batch-ik) | Hundreds of independent inverse-kinematics problems solved at once on the GPU (WebGPU), with live throughput. |
| [**Batch FK Swarm**](https://yuanweima.github.io/roboviz/#/demo/batch-fk) | Thousands of robots' forward kinematics, computed per frame in one WebAssembly call. |
| [**Interactive IK**](https://yuanweima.github.io/roboviz/#/demo/ik) | Drag a target; trajx solves analytical IK in real time and reports reachability. |
| [**Motion Planning**](https://yuanweima.github.io/roboviz/#/demo/planning) | RRT\* / BiRRT / PRM compared and timed against obstacles. |

## Features

- ⚡ **GPU batch kinematics** — solve thousands of FK/IK per frame on WebGPU; Float32, zero-copy into an `InstancedMesh`.
- 🎯 **Analytical IK, all solutions** — closed-form IK for 6-DOF spherical-wrist arms, up to 8 ranked, FK-verified solutions.
- 🧭 **Sampling planners** — BiRRT, RRT\*, PRM and Task-Space RRT with pluggable collision, plus a GPU Lazy-PRM mode.
- 🛡️ **WebGPU collision** *(experimental)* — GPU-resident FK→SDF batch collision with sphere / capsule approximation.
- 📐 **Jacobian & manipulability** — Jacobian, manipulability, singularity detection and workspace analysis per configuration.
- 📈 **Time-optimal trajectories** — Ruckig jerk-limited S-curves with velocity / acceleration / jerk limits.
- 👻 **Ghost preview & IK drag** — drag the end-effector or set a target pose; a translucent ghost arm shows the live IK solution and reachability.
- 📦 **One WASM package, no backend** — the whole engine ships as a single module. No CUDA, no ROS, no server.

## Where it fits

RoboViz/trajx isn't trying to beat cuRobo on raw throughput — it's the one you can **ship on the web**, with no CUDA, no ROS and no backend.

| | **trajx** | cuRobo | Pinocchio | MoveIt | Foxglove |
|---|:---:|:---:|:---:|:---:|:---:|
| GPU acceleration | **WebGPU / wgpu** | CUDA only | CPU | CPU | — |
| Runs in the browser | **yes** | no | no | no | viewer only |
| Dependencies | **1 wasm pkg** | CUDA + Python | C++ / Python | full ROS | ROS / data |
| Analytical multi-solution IK | **up to 8** | numerical | yes | plugin | — |
| Motion planning | **RRT\*/BiRRT/PRM/TS-RRT** | GPU | no | OMPL | no |
| Cable-aware planning | **yes** | no | no | no | no |

## Benchmarks

Engine numbers measured in the [trajx](https://github.com/yuanweima/trajx) repository (WebGPU, Chrome on Apple M4 unless noted). Each is cited to its source so it can be reproduced.

| Workload | Result | Detail | Source |
|----------|--------|--------|--------|
| Browser batch IK (WebGPU) | **20,000 IK / 81.7 ms** | ≈245k problems/sec · 19.6× vs single-thread JS | `trajx/CHANGELOG.md:31` |
| GPU batch IK (native) | **100k / 32.3 ms** | vs 46.8 ms rayon · 173 ms single-core | `trajx/CHANGELOG.md:26` |
| GPU FK→SDF collision | **100k / 35 ms** | ≈2.85M configs/sec · 7.4× vs rayon | `trajx/CHANGELOG.md:28` |
| Core FK / IK latency | **FK 1.7–2.6 µs** | seeded IK 21 µs · Ruckig 6-DOF 1 µs | `trajx/README.md:826` |

**13 robots** are built into the engine's DH database — Fanuc (LR Mate 200iD/7L, LR Mate 200iD, M-20iB/25, M-20iD/25), Universal Robots (UR5, UR10), JAKA (Zu7, S12, A12L) and Agilebot (GBT-C12A, GBT-C5A-850, GBT P7A-700, GBT P7A-900).

## Architecture

Two repositories, one product:

- **[trajx](https://github.com/yuanweima/trajx)** — the engine. Rust + WebGPU kinematics / planning core, compiled to `@yuanweima/trajx-wasm` (WebAssembly + WebGPU).
- **RoboViz** *(this repo)* — the browser renderer and official demo. Consumes `@yuanweima/trajx-wasm` as an **optional** peer dependency, so rendering-only usage stays lightweight.

```
packages/
├── core/    @yuanweima/roboviz-core    URDF rendering, trajx bindings, ghost/trajectory/collision viz
└── react/   @yuanweima/roboviz-react   declarative React components & hooks
examples/
└── react-demo/                         the trajx product demo (deployed to GitHub Pages)
```

Sub-entry points on the core package — `@yuanweima/roboviz-core/kinematics` and `@yuanweima/roboviz-core/planning` — let you pull in IK/planning only when you need it and keep the heavy WASM out of a rendering-only bundle.

## Quickstart

RoboViz is a **pnpm + Turbo** monorepo. Installing pulls `@yuanweima/trajx-wasm` from GitHub Packages, which requires a token with `read:packages` in your `~/.npmrc` (the repo's `.npmrc` only maps the scope to the registry — no secret is committed).

```bash
pnpm install          # install workspace deps (+ the trajx engine)
pnpm build            # build core + react + demo
pnpm dev              # run the trajx demo (examples/react-demo)
pnpm test             # run the core test suite (real trajx-wasm FK/IK/planning)
```

## Usage

**Interactive IK with a ghost arm** (declarative components + the kinematics sub-entry):

```tsx
import { RoboViz, Robot } from '@yuanweima/roboviz-react';
import { GhostRobot, type Pose3D } from '@yuanweima/roboviz-core';
import { usePoseIK, WasmSolverProvider } from '@yuanweima/roboviz-core/kinematics';

function IkScene({ urdfContent }: { urdfContent: string }) {
  const target: Pose3D = { position: [0.45, 0, 0.5], quaternion: [0, 0.707, 0, 0.707] };
  const { ghostJoints, ghostStatus } = usePoseIK({ robotId: 'arm', urdfContent, targetPose: target });

  return (
    <RoboViz>
      <Robot urdfContent={urdfContent} />
      {ghostJoints && <GhostRobot jointAngles={ghostJoints} status={ghostStatus} />}
    </RoboViz>
  );
}

// Wrap the tree in <WasmSolverProvider> to inject trajx's WASM IK solver.
```

**Talking to the engine directly** (`@yuanweima/trajx-wasm`):

```ts
import init, { createRobot } from '@yuanweima/trajx-wasm';

await init();
const robot = createRobot(urdfString);

// Forward kinematics
const pose = robot.forwardKinematics(new Float64Array([0, 0, 0, 0, 0, 0]));

// Analytical IK — all solutions at once (up to 8 for spherical-wrist arms)
const ik = robot.inverseKinematicsAll(pose);
if (ik.success) console.log(`${ik.solutionCount} solutions, analytical: ${ik.isAnalytical}`);
```

See [`examples/react-demo`](./examples/react-demo) for the full, runnable scenes.

## Coordinate system

All 3D positions use **Z-up** (the robotics / URDF standard): **X** forward, **Y** left, **Z** up. When working with Three.js directly (Y-up by default), use the conversions in `packages/core/src/coordinates/`.

## Documentation

- [`docs/architecture.md`](./docs/architecture.md) — system architecture
- [`docs/kinematics-api.md`](./docs/kinematics-api.md) — kinematics API reference
- [`docs/LINKING.md`](./docs/LINKING.md) — how the roboviz ↔ trajx repos link during development
- [`docs/decisions/`](./docs/decisions) — architecture decision records

## Scope

RoboViz is deliberately narrow: it renders robots and visualizes trajx. It intentionally does **not** include industrial process orchestration (welding/grinding/inspection), real-time vision streaming, multi-robot coordination, an advanced post-processing pipeline, or multi-language remote-control SDKs — those belong to trajx or are out of scope.

## License

`UNLICENSED` — proprietary. RoboViz embeds the proprietary trajx engine; no license to use, copy or distribute is granted by this repository being public. See each `package.json`.

---

<div align="center">

Built by [Yuanwei Ma](https://github.com/yuanweima) · [trajx](https://github.com/yuanweima/trajx) · [Live demo](https://yuanweima.github.io/roboviz/)

</div>
