# RoboViz

跨平台 3D 机器人可视化库，专为工业机器人应用设计。

## 概述

RoboViz 是一个功能丰富的 React 3D 机器人可视化组件库，集成了运动学求解、工业流程编排、实时视觉流等高级功能。适用于焊接、打磨、检测等工业应用场景的开发。

### 核心特性

- **运动学引擎**: 集成 trajx-wasm 求解器，支持正逆运动学、DH 参数自动识别
- **工业流程系统**: 插件化流程架构，支持焊接、打磨、检测等应用
- **Ghost 机器人预览**: IK 实时预览，支持工作点悬停显示目标姿态
- **轨迹规划与播放**: 支持关节空间和笛卡尔空间轨迹
- **多 TCP 工具管理**: Tool Library API 支持多工具、多 TCP 配置
- **实时视觉流**: 相机流、点云流、深度图渲染
- **工业主题系统**: 深色/浅色/工业风格主题切换
- **Jog 控制面板**: 工业级关节/笛卡尔点动控制 UI

## 项目结构

```
roboviz/
├── packages/
│   ├── core/          # 核心渲染引擎和组件库
│   ├── react/         # React 封装组件
│   ├── viewer/        # 独立查看器
│   └── sdk/           # Python/其他语言 SDK
├── examples/
│   ├── react-demo/    # React 演示应用（含所有功能模块）
│   └── python/        # Python SDK 示例
└── docs/              # 文档
```

## 包说明

| 包 | 说明 |
|---|------|
| `@aspect/roboviz-core` | 核心渲染引擎（Robot, Scene, 运动学, 流程系统等） |
| `@aspect/roboviz-react` | React 高级封装 |
| `@aspect/roboviz-viewer` | 独立可视化查看器 |

## 快速开始

### 安装

```bash
npm install @aspect/roboviz-core
# 或
pnpm add @aspect/roboviz-core
```

### 基础使用

```tsx
import { Canvas } from '@react-three/fiber';
import { Scene, Robot } from '@aspect/roboviz-core';

function App() {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);

  return (
    <Canvas>
      <Scene>
        <Robot
          urdfPath="/models/fanuc_m10ia.urdf"
          jointAngles={joints}
        />
      </Scene>
    </Canvas>
  );
}
```

### 运动学集成

```tsx
import { useRobotWithKinematics } from '@aspect/roboviz-core';

function RobotWithIK() {
  const robot = useRobotWithKinematics({
    urdfPath: '/models/fanuc_m10ia.urdf',
    dhRobotName: 'fanuc_m10ia', // 自动匹配 DH 参数
    tool: {
      position: [0, 0, 0.12],
      quaternion: [0, 0, 0, 1],
    },
  });

  // 计算逆运动学
  const handleMoveTo = (targetPose) => {
    const result = robot.ikTcp(targetPose);
    if (result.success) {
      robot.setJointAngles(result.solution);
    }
  };

  return <Robot {...robot.robotProps} />;
}
```

### Ghost 机器人预览

```tsx
import {
  RobotProcessProvider,
  ProcessScene,
  useRobotProcessContext
} from '@aspect/roboviz-core';

function WeldingDemo() {
  return (
    <RobotProcessProvider
      urdfPath="/models/fanuc_m10ia.urdf"
      tool={{ position: [0, 0, 0.12], quaternion: [0, 0, 0, 1] }}
    >
      <Canvas>
        <ProcessScene
          urdfPath="/models/fanuc_m10ia.urdf"
          showGhost={true}
          showTrajectory={true}
        />
      </Canvas>
      <WorkpointControls />
    </RobotProcessProvider>
  );
}

function WorkpointControls() {
  const { actions } = useRobotProcessContext();

  // 设置 Ghost 目标位姿，Ghost 机器人会自动显示 IK 解
  const handleHover = (pose) => {
    actions.setGhostTarget(pose);
  };

  return <div onMouseMove={...} />;
}
```

### 工业流程系统

```tsx
import {
  ProcessProvider,
  RobotProcessProvider,
  ProcessScene,
  weldingProcess,
  grindingProcess,
} from '@aspect/roboviz-core';

function IndustrialApp() {
  return (
    <ProcessProvider
      initialProcessId="welding"
      processes={[weldingProcess, grindingProcess]}
    >
      <RobotProcessProvider urdfPath="/models/robot.urdf">
        <Canvas>
          <ProcessScene urdfPath="/models/robot.urdf">
            {/* 末端执行器工具会自动渲染 */}
            <EndEffector>
              <WeldingTorch />
            </EndEffector>
          </ProcessScene>
        </Canvas>
      </RobotProcessProvider>
    </ProcessProvider>
  );
}
```

### 轨迹播放

```tsx
import { useRobotProcessContext } from '@aspect/roboviz-core';

function TrajectoryPlayer() {
  const { actions } = useRobotProcessContext();

  const handlePlay = () => {
    // 加载轨迹
    actions.loadTrajectory({
      waypoints: [
        { position: [0.5, 0, 0.3], quaternion: [0, 0, 0, 1], time: 0 },
        { position: [0.5, 0.2, 0.3], quaternion: [0, 0, 0, 1], time: 1 },
        { position: [0.5, 0.2, 0.5], quaternion: [0, 0, 0, 1], time: 2 },
      ],
    });

    // 开始播放
    actions.play();
  };

  return (
    <button onClick={handlePlay}>播放轨迹</button>
  );
}
```

### 工具库管理

```tsx
import { useKinematicsSolver } from '@aspect/roboviz-core';

function MultiToolRobot() {
  const solver = useKinematicsSolver(urdfContent);

  useEffect(() => {
    if (!solver) return;

    // 添加焊枪工具
    solver.addTool('welding_torch', {
      position: [0, 0, 0.15],
      quaternion: [0, 0, 0, 1],
    });
    solver.addTcpToTool('welding_torch', 'tip', {
      position: [0, 0, 0.02],
      quaternion: [0, 0, 0, 1],
    });

    // 添加打磨工具
    solver.addTool('grinder', {
      position: [0, 0, 0.1],
      quaternion: [0, 0, 0, 1],
    });
    solver.addTcpWithStandoff('grinder', 'contact', {
      position: [0, 0, 0.05],
      quaternion: [0, 0, 0, 1],
    }, 0.005); // 5mm standoff

    // 激活工具
    solver.activateTool('welding_torch', 'tip');
  }, [solver]);
}
```

### 视觉流渲染

```tsx
import {
  CameraStreamProvider,
  PointCloudStreamProvider,
  ImageStreamRenderer,
  PointCloudStreamRenderer,
} from '@aspect/roboviz-core';

function VisionDemo() {
  return (
    <>
      {/* 相机流 */}
      <CameraStreamProvider
        streamId="camera_1"
        wsUrl="ws://localhost:8080/camera"
      >
        <ImageStreamRenderer />
      </CameraStreamProvider>

      {/* 点云流 */}
      <PointCloudStreamProvider
        streamId="lidar_1"
        wsUrl="ws://localhost:8080/pointcloud"
      >
        <Canvas>
          <PointCloudStreamRenderer colorMode="height" />
        </Canvas>
      </PointCloudStreamProvider>
    </>
  );
}
```

## 演示模块

`examples/react-demo` 包含完整的功能演示：

| 模块 | 说明 |
|------|------|
| `RobotModule` | 基础机器人渲染 |
| `TrajxWasmModule` | 运动学求解演示 |
| `GhostRobotModule` | Ghost 预览功能 |
| `WorkpointModule` | 工作点交互 |
| `TrajectoryModule` | 轨迹规划播放 |
| `CollisionModule` | 碰撞检测可视化 |
| `VisionModule` | 视觉流渲染 |
| `MultiRobotModule` | 多机器人场景 |
| `ProcessWorkflowModule` | 工业流程编排 |
| **工业场景演示** | |
| `WeldingScene` | 焊接场景演示 |
| `GrindingScene` | 打磨场景演示 |
| `InspectionScene` | 检测场景演示 |

运行演示：

```bash
pnpm install
pnpm --filter roboviz-react-demo dev
```

## 核心 API

### 运动学

```typescript
// 正运动学
const fkResult = solver.forwardKinematics(jointAngles);
const tcpPose = solver.forwardKinematicsTcp(jointAngles);

// 逆运动学
const ikResult = solver.inverseKinematics(targetPose, seed);
const allSolutions = solver.inverseKinematicsAll(targetPose);

// 命名 TCP 运动学
const pose = solver.forwardKinematicsNamedTcp(joints, 'torch', 'tip');
const ik = solver.inverseKinematicsNamedTcp(target, 'torch', 'tip');
```

### 流程上下文

```typescript
const { state, actions } = useRobotProcessContext();

// 状态
state.jointAngles        // 当前关节角度
state.tcpPose           // 当前 TCP 位姿
state.ghostJointAngles  // Ghost 关节角度
state.ghostStatus       // 'valid' | 'warning' | 'error' | 'neutral'
state.isPlaying         // 轨迹播放状态
state.trajectory        // 已加载轨迹

// 操作
actions.setJointAngles(angles)
actions.setGhostTarget(pose)
actions.loadTrajectory(traj)
actions.play() / actions.pause() / actions.stop()
```

### 主题系统

```tsx
import {
  RoboVizThemeProvider,
  industrialTheme,
  createRoboVizTheme
} from '@aspect/roboviz-core';

// 使用预设主题
<RoboVizThemeProvider theme={industrialTheme}>
  <App />
</RoboVizThemeProvider>

// 自定义主题
const customTheme = createRoboVizTheme({
  colors: {
    primary: '#0066cc',
    background: { base: '#1a1a2e' },
  },
});
```

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm --filter roboviz-react-demo dev

# 构建所有包
pnpm build

# 运行测试
pnpm test
```

## 技术栈

- **React 18/19** - UI 框架
- **Three.js / React Three Fiber** - 3D 渲染
- **trajx-wasm** - Rust 编写的运动学求解器 (WebAssembly)
- **Zustand** - 状态管理
- **TypeScript** - 类型安全

## 许可证

MIT
