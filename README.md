# RoboViz

**trajx 运动学 / 运动规划引擎的 Web 可视化前端。**

RoboViz 是一个基于 React Three Fiber 的库,在浏览器里渲染 URDF 机器人,并把 [trajx](../trajx)(Rust + WebGPU 运动学 / 规划内核,编译为 WASM)的 FK/IK、Ghost 预览、规划轨迹实时展示出来。它的定位很窄也很明确:**让 trajx 在网页中"看得见、可交互"**。

> **状态:pre-release (0.1.0),尚未发布到公共 npm。** 包通过私有 GitHub Packages 分发;本地使用需先 `pnpm install && pnpm build`。README 中的用法示例面向已构建的本地 workspace。

---

## 能做什么

| 能力 | 说明 |
|------|------|
| **URDF 渲染** | 基于 `urdf-loader` + Three.js 加载并渲染机器人,Z-up(机器人/URDF 标准)坐标系 |
| **正/逆运动学** | 通过 trajx-wasm 求解 FK/IK;`useHybridSolver` 自动选择解析/数值解 |
| **IK 拖拽** | 拖动末端执行器,实时求解并更新关节角 |
| **Ghost 预览** | 悬停/给定目标位姿时,以半透明 Ghost 机器人显示 IK 解,并标示可达性状态 |
| **轨迹 FK 播放** | `TrajectoryFK` 按关节/位姿轨迹回放真实 FK 姿态 |
| **运动规划可视化** | 展示 trajx 的采样规划器(RRT* / BiRRT / PRM)产出的路径,含 GPU 规划场景 |
| **碰撞可视化** | 基础碰撞几何 / 安全区 / 接触点可视化 |
| **Manipulability 指示** | 可操作度状态提示 |

> 说明:RoboViz 有意**不**包含实时视觉流、多机器人协同、工业流程编排(焊接/打磨/检测)、后期处理渲染管线、以及多语言远程控制 SDK/协议——这些要么超出"展示 trajx"的范围,要么应归属 trajx 自身。历史版本曾包含它们,已在 0.1.0 精简中移除(见 git tag `pre-slim-2026-07-22`)。

---

## 包结构

| 包 | 说明 |
|---|------|
| `@yuanweima/roboviz-core` | 核心:URDF 渲染组件、trajx 运动学/规划绑定、Ghost、轨迹、碰撞可视化 |
| `@yuanweima/roboviz-react` | React 声明式组件与 hooks 封装 |

子入口(core):`@yuanweima/roboviz-core/kinematics`、`@yuanweima/roboviz-core/planning`,用于按需引入、避免拉入无关依赖。

---

## 快速开始(本地 workspace)

```bash
pnpm install
pnpm build
pnpm --filter roboviz-react-demo dev   # 运行 trajx 展示 demo
```

### 基础渲染

```tsx
import { Canvas } from '@react-three/fiber';
import { Scene, Robot } from '@yuanweima/roboviz-core';

function App() {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);

  return (
    <Canvas>
      <Scene>
        <Robot urdfPath="/models/fanuc_m10ia.urdf" jointAngles={joints} />
      </Scene>
    </Canvas>
  );
}
```

### 运动学(trajx)

```tsx
import { useRobotWithKinematics } from '@yuanweima/roboviz-core';

function RobotWithIK() {
  const robot = useRobotWithKinematics({
    urdfPath: '/models/fanuc_m10ia.urdf',
    tool: { position: [0, 0, 0.12], quaternion: [0, 0, 0, 1] },
  });

  const handleMoveTo = (targetPose) => {
    const result = robot.ikTcp(targetPose);
    if (result.success) robot.setJointAngles(result.solution);
  };

  return <Robot {...robot.robotProps} />;
}
```

### Ghost 预览

```tsx
import { GhostRobot } from '@yuanweima/roboviz-core';
import { useGhostPreview } from '@yuanweima/roboviz-core';

// 给定 TCP 目标位姿 → IK → 半透明 Ghost 显示解与可达性状态
```

### 轨迹 FK 播放

```tsx
import { TrajectoryFK } from '@yuanweima/roboviz-core';
import { usePoseTrajectoryPlayer } from '@yuanweima/roboviz-core';
```

完整用法见 `examples/react-demo`。

---

## 技术栈

- **React 18/19** + **Three.js / React Three Fiber** — 渲染
- **trajx-wasm** — Rust + WebGPU 运动学/规划内核(WebAssembly),作为可选 peer dependency 注入
- **Zustand** — 状态管理
- **TypeScript**

## 坐标系

所有 3D 位置使用 **Z-up**(机器人/URDF 标准):X 向前、Y 向左、Z 向上。直接使用 Three.js(默认 Y-up)时需转换,详见 `coordinates/`。

## 许可证

MIT
