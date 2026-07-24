<div align="center">

# RoboViz

**[trajx](https://github.com/yuanweima/trajx) 运动学与运动规划引擎的浏览器可视化前端。**

[![在线 Demo](https://img.shields.io/badge/▶%20在线%20demo-online-4a9eff?style=flat-square)](https://yuanweima.github.io/roboviz/)
[![部署状态](https://img.shields.io/github/actions/workflow/status/yuanweima/roboviz/deploy-demo.yml?style=flat-square&label=pages)](https://github.com/yuanweima/roboviz/actions/workflows/deploy-demo.yml)
[![React](https://img.shields.io/badge/React-18%20%7C%2019-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r170-000000?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org)
[![WebGPU](https://img.shields.io/badge/WebGPU-powered-005a9c?style=flat-square)](https://www.w3.org/TR/webgpu/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey?style=flat-square)](#许可证)

**[▶ 打开在线 Demo](https://yuanweima.github.io/roboviz/)** · [特性](#特性) · [Demo](#在线-demo) · [快速开始](#快速开始) · [性能](#性能)

[English](./README.md) · **简体中文**

</div>

---

RoboViz 用 **React Three Fiber** 渲染 URDF 机器人,并在浏览器里实时展示 **[trajx](https://github.com/yuanweima/trajx)**(一个编译到 WebAssembly 的 Rust + WebGPU 运动学/运动规划引擎)求解正运动学、解析式与 GPU 批量逆运动学,以及基于采样的运动规划。它是 trajx 官方的交互式 Demo 与渲染层。

> **状态 — 预发布。** RoboViz 在本仓库源码可见;其 npm 包通过**私有 GitHub Packages** 分发(**并非**公共 npm),引擎 `@yuanweima/trajx-wasm`(`0.9.0`)为专有软件。无需安装即可体验 —— 直接打开**[在线 Demo](https://yuanweima.github.io/roboviz/)**。

## 为什么选 RoboViz

cuRobo 给了你 GPU,却把你锁进 NVIDIA + Python;Pinocchio 与 MoveIt 很强,却上不了网页。**trajx 是唯一把 GPU 级运动学带进浏览器的引擎** —— 而 RoboViz 就是你看见并与之交互的方式。无 CUDA、无 ROS、无后端:整个引擎作为单个 WebAssembly 模块在客户端运行。

## 在线 Demo

以下每个场景都在你的浏览器里跑真实的 trajx 引擎 —— [点此体验](https://yuanweima.github.io/roboviz/)。

| Demo | 展示内容 |
|------|----------|
| [**Batch IK Swarm**](https://yuanweima.github.io/roboviz/#/demo/batch-ik) | 数百个独立逆运动学问题在 GPU(WebGPU)上一次性求解,带实时吞吐量。 |
| [**Batch FK Swarm**](https://yuanweima.github.io/roboviz/#/demo/batch-fk) | 数千台机器人的正运动学,在一次 WebAssembly 调用里逐帧计算。 |
| [**Interactive IK**](https://yuanweima.github.io/roboviz/#/demo/ik) | 拖动目标,trajx 实时求解解析式 IK 并给出可达性。 |
| [**Motion Planning**](https://yuanweima.github.io/roboviz/#/demo/planning) | RRT\* / BiRRT / PRM 在同一障碍环境下对比与计时。 |

## 特性

- ⚡ **GPU 批量运动学** —— 在 WebGPU 上每帧求解数千次 FK/IK;Float32,零拷贝写入 `InstancedMesh`。
- 🎯 **解析式 IK,全部解** —— 面向 6 轴球型手腕机械臂的闭式 IK,最多 8 个已排序、经 FK 校验的解。
- 🧭 **采样规划器** —— BiRRT、RRT\*、PRM 与任务空间 RRT,碰撞检测可插拔,另含 GPU Lazy-PRM 模式。
- 🛡️ **WebGPU 碰撞**(实验性)—— 常驻 GPU 的 FK→SDF 批量碰撞,球体/胶囊体近似。
- 📐 **雅可比与可操作度** —— 逐配置的雅可比、可操作度、奇异性检测与工作空间分析。
- 📈 **时间最优轨迹** —— Ruckig 限加加速度 S 曲线,支持速度/加速度/加加速度上限。
- 👻 **Ghost 预览与 IK 拖拽** —— 拖动末端执行器或给定目标位姿,半透明 Ghost 臂实时显示 IK 解与可达性。
- 📦 **单个 WASM 包,无后端** —— 整个引擎作为单模块分发。无 CUDA、无 ROS、无服务器。

## 定位对比

RoboViz/trajx 并不试图在原始吞吐量上超越 cuRobo —— 它的差异化在于**能在网页上交付**,且无 CUDA、无 ROS、无后端。

| | **trajx** | cuRobo | Pinocchio | MoveIt | Foxglove |
|---|:---:|:---:|:---:|:---:|:---:|
| GPU 加速 | **WebGPU / wgpu** | 仅 CUDA | CPU | CPU | — |
| 浏览器内运行 | **是** | 否 | 否 | 否 | 仅查看器 |
| 依赖 | **1 个 wasm 包** | CUDA + Python | C++ / Python | 完整 ROS | ROS / 数据 |
| 解析式多解 IK | **最多 8 个** | 数值解 | 是 | 插件 | — |
| 运动规划 | **RRT\*/BiRRT/PRM/TS-RRT** | GPU | 否 | OMPL | 否 |
| 线缆感知规划 | **是** | 否 | 否 | 否 | 否 |

## 性能

以下为在 [trajx](https://github.com/yuanweima/trajx) 仓库中实测的引擎数据(除注明外均为 WebGPU、Apple M4 上的 Chrome)。每项都标注来源以便复现。

| 负载 | 结果 | 细节 | 来源 |
|------|------|------|------|
| 浏览器批量 IK(WebGPU) | **20,000 IK / 81.7 ms** | ≈24.5 万问题/秒 · 相较 JS 单线程 19.6× | `trajx/CHANGELOG.md:31` |
| GPU 批量 IK(原生) | **10 万 / 32.3 ms** | 对比 rayon 46.8 ms · 单核 173 ms | `trajx/CHANGELOG.md:26` |
| GPU FK→SDF 碰撞 | **10 万 / 35 ms** | ≈285 万配置/秒 · 相较 rayon 7.4× | `trajx/CHANGELOG.md:28` |
| 核心 FK / IK 延迟 | **FK 1.7–2.6 µs** | 带种子 IK 21 µs · Ruckig 6-DOF 1 µs | `trajx/README.md:826` |

引擎的 DH 数据库内置 **13 款机器人** —— Fanuc(LR Mate 200iD/7L、LR Mate 200iD、M-20iB/25、M-20iD/25)、Universal Robots(UR5、UR10)、JAKA(Zu7、S12、A12L)与 Agilebot(GBT-C12A、GBT-C5A-850、GBT P7A-700、GBT P7A-900)。

## 架构

两个仓库,一个产品:

- **[trajx](https://github.com/yuanweima/trajx)** —— 引擎。Rust + WebGPU 运动学/规划内核,编译为 `@yuanweima/trajx-wasm`(WebAssembly + WebGPU)。
- **RoboViz**(本仓库)—— 浏览器渲染器与官方 Demo。以**可选** peer dependency 方式引用 `@yuanweima/trajx-wasm`,因此纯渲染场景依旧轻量。

```
packages/
├── core/    @yuanweima/roboviz-core    URDF 渲染、trajx 绑定、Ghost/轨迹/碰撞可视化
└── react/   @yuanweima/roboviz-react   声明式 React 组件与 hooks
examples/
└── react-demo/                         trajx 产品 Demo(部署到 GitHub Pages)
```

core 包的子入口 —— `@yuanweima/roboviz-core/kinematics` 与 `@yuanweima/roboviz-core/planning` —— 让你只在需要时引入 IK/规划,把笨重的 WASM 挡在纯渲染打包之外。

## 快速开始

RoboViz 是一个 **pnpm + Turbo** monorepo。安装会从 GitHub Packages 拉取 `@yuanweima/trajx-wasm`,需要在 `~/.npmrc` 里配置一个具备 `read:packages` 权限的 token(仓库内的 `.npmrc` 只把 scope 映射到 registry,不含任何密钥)。

```bash
pnpm install          # 安装工作区依赖(含 trajx 引擎)
pnpm build            # 构建 core + react + demo
pnpm dev              # 运行 trajx demo(examples/react-demo)
pnpm test             # 运行 core 测试套件(真实 trajx-wasm FK/IK/规划)
```

## 用法

**带 Ghost 臂的交互式 IK**(声明式组件 + kinematics 子入口):

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

// 用 <WasmSolverProvider> 包裹组件树，即可注入 trajx 的 WASM IK 求解器。
```

**直接调用引擎**(`@yuanweima/trajx-wasm`):

```ts
import init, { createRobot } from '@yuanweima/trajx-wasm';

await init();
const robot = createRobot(urdfString);

// 正运动学
const pose = robot.forwardKinematics(new Float64Array([0, 0, 0, 0, 0, 0]));

// 解析式 IK —— 一次性给出全部解(球型手腕最多 8 个)
const ik = robot.inverseKinematicsAll(pose);
if (ik.success) console.log(`${ik.solutionCount} 个解，解析式: ${ik.isAnalytical}`);
```

完整可运行场景见 [`examples/react-demo`](./examples/react-demo)。

## 坐标系

所有 3D 位置采用 **Z-up**(机器人/URDF 标准):**X** 向前、**Y** 向左、**Z** 向上。直接使用 Three.js(默认 Y-up)时,请使用 `packages/core/src/coordinates/` 中的转换工具。

## 文档

- [`docs/architecture.md`](./docs/architecture.md) —— 系统架构
- [`docs/kinematics-api.md`](./docs/kinematics-api.md) —— 运动学 API 参考
- [`docs/LINKING.md`](./docs/LINKING.md) —— 开发时 roboviz ↔ trajx 两仓库如何联动
- [`docs/decisions/`](./docs/decisions) —— 架构决策记录

## 范围

RoboViz 有意保持窄小:它渲染机器人并可视化 trajx。它**刻意不包含**工业流程编排(焊接/打磨/检测)、实时视觉流、多机器人协同、高级后处理渲染管线,以及多语言远程控制 SDK —— 这些要么归属 trajx,要么超出范围。

## 许可证

`UNLICENSED` —— 专有软件。RoboViz 内嵌专有的 trajx 引擎;本仓库虽公开,但不授予任何使用、复制或分发的许可。详见各 `package.json`。

---

<div align="center">

由 [Yuanwei Ma](https://github.com/yuanweima) 打造 · [trajx](https://github.com/yuanweima/trajx) · [在线 Demo](https://yuanweima.github.io/roboviz/)

</div>
