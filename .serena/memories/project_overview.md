# RoboViz 项目概述

## 项目目的
RoboViz 是一个跨平台的 3D 机器人可视化库，专为工业机器人应用设计。它是一个功能丰富的 React 3D 机器人可视化组件库，集成了运动学求解、工业流程编排、实时视觉流等高级功能。

## 核心特性
- **运动学引擎**: 集成 trajx-wasm 求解器 (Rust WebAssembly)
- **工业流程系统**: 插件化流程架构，支持焊接、打磨、检测等应用
- **Ghost 机器人预览**: IK 实时预览
- **轨迹规划与播放**: 支持关节空间和笛卡尔空间轨迹
- **多 TCP 工具管理**: Tool Library API
- **实时视觉流**: 相机流、点云流、深度图渲染
- **工业主题系统**: 深色/浅色/工业风格主题切换
- **Jog 控制面板**: 工业级关节/笛卡尔点动控制 UI

## 技术栈
- **React 18/19** - UI 框架
- **Three.js / React Three Fiber** - 3D 渲染
- **trajx-wasm** - Rust 编写的运动学求解器 (WebAssembly)
- **Zustand** - 状态管理
- **TypeScript** - 类型安全
- **pnpm** - 包管理器
- **Turbo** - Monorepo 构建工具

## 项目结构
```
roboviz/
├── packages/
│   ├── core/          # 核心渲染引擎和组件库 (@aspect/roboviz-core)
│   ├── react/         # React 封装组件 (@aspect/roboviz-react)
│   ├── viewer/        # 独立查看器 (@aspect/roboviz-viewer)
│   └── sdk/           # Python/其他语言 SDK
├── examples/
│   ├── react-demo/    # React 演示应用（含所有功能模块）
│   └── python/        # Python SDK 示例
└── docs/              # 文档
```

## Core 包结构
packages/core/src 主要模块:
- `components/` - UI 组件 (包括 JogControlPanel)
- `hooks/` - React hooks
- `kinematics/` - 运动学相关
- `trajectory/` - 轨迹相关
- `diagnostic/` - 诊断功能
- `interaction/` - 交互系统 (快捷键等)
- `process/` - 流程管理
- `theme/` - 主题系统
- `vision/` - 视觉流
- `collision/` - 碰撞检测

## 子入口架构
`@aspect/roboviz-core` 通过 `package.json` exports 提供 5 个独立入口：
| 入口 | 用途 | WASM 依赖 |
|------|------|-----------|
| `.` | 完整库 | 是 |
| `./rendering` | 纯 3D 渲染 | 否 |
| `./kinematics` | IK/FK 求解 + Provider | 是 |
| `./planning` | 运动规划 + 碰撞检测 | 是 |
| `./protocol` | JSON-RPC 协议层 | 是 |

设计目的：仅需渲染时不引入 WASM 依赖，降低包体积。`trajx-wasm` 是可选 peerDependency。

## Python SDK
`roboviz` Python 包通过 JSON-RPC over WebSocket 与可视化服务器通信：
- 模块化结构：`kinematics.py`, `motion.py`, `vision.py` 等
- 使用 `pyproject.toml` + `hatchling` 构建
- 支持可选依赖：`numpy`, `jupyter`
- 处理 ROS `package://` URDF 路径解析
- 包含 `py.typed` 标记支持静态类型检查
