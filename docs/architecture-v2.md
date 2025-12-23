# RoboViz Architecture v2

## Design Philosophy

**Core Principle: Zero-Config for Users**

用户应该能够用最少的代码启动可视化，不需要理解底层架构：

```python
# Python - 一行启动
import roboviz as rv
rv.init()
rv.add_robot("/robot.urdf").set_joints([0, 0.5, 0.8])
rv.show()
```

```tsx
// TypeScript/React - 直接使用组件
<RoboViz>
  <Robot urdf="/robot.urdf" joints={[0, 0.5, 0.8]} />
</RoboViz>
```

## Feature Overview

### Phase 1: Core Visualization (Completed)

| Feature | Description | Status |
|---------|-------------|--------|
| Trajectory Playback | 动画播放机器人轨迹，支持速度控制和循环 | ✅ |
| TCP Pose | 显示/获取机器人末端执行器位姿 | ✅ |
| Robot Interaction | 点击选中、拖拽交互 | ✅ |

### Phase 2: Advanced Visualization (Completed)

| Feature | Description | Status |
|---------|-------------|--------|
| Collision Detection | 机器人与障碍物碰撞检测和可视化 | ✅ |
| Coordinate Frames | 层级坐标系显示（parent-child关系） | ✅ |
| Point Cloud | 点云渲染，支持uniform/height/intensity颜色模式 | ✅ |

### Phase 3: UI & Controls (Completed)

| Feature | Description | Status |
|---------|-------------|--------|
| Control Panel | 场景设置面板（背景、阴影、地面等） | ✅ |
| Visual Effects | 光照、阴影、环境贴图 | ✅ |
| Keyboard Shortcuts | R重置相机、G切换网格、Space播放/暂停等 | ✅ |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Application                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Python    │  │    C++      │  │    Rust     │  │ TypeScript  │        │
│  │    App      │  │    App      │  │    App      │  │  React App  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │               │
│         ▼                ▼                ▼                │               │
│  ┌─────────────────────────────────────────────┐          │               │
│  │              SDK Layer (Remote)             │          │               │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │          │               │
│  │  │ Python  │ │  C++    │ │  Rust   │       │          │               │
│  │  │  SDK    │ │  SDK    │ │  SDK    │       │          │               │
│  │  └────┬────┘ └────┬────┘ └────┬────┘       │          │               │
│  │       │           │           │             │          │               │
│  │       └───────────┴───────────┘             │          │               │
│  │                   │                         │          │               │
│  │           ┌───────▼───────┐                 │          │               │
│  │           │  Embedded     │                 │          │               │
│  │           │  HTTP + WS    │                 │          │ Direct        │
│  │           │  Server       │                 │          │ Import        │
│  │           └───────┬───────┘                 │          │               │
│  └───────────────────┼─────────────────────────┘          │               │
│                      │                                    │               │
│                      ▼                                    ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                         Viewer (Browser)                            │  │
│  │  ┌───────────────────────────────────────────────────────────────┐  │  │
│  │  │                    @aspect/roboviz-viewer                     │  │  │
│  │  │                                                               │  │  │
│  │  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │  │  │
│  │  │  │  Protocol   │───▶│   State     │───▶│  Renderer   │       │  │  │
│  │  │  │  Handler    │    │   Store     │    │  (Three.js) │       │  │  │
│  │  │  └─────────────┘    └─────────────┘    └─────────────┘       │  │  │
│  │  │                                                               │  │  │
│  │  └───────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Package Structure

```
packages/
├── core/                        # 核心渲染组件库
│   ├── src/
│   │   ├── components/          # React Three Fiber 组件
│   │   │   ├── Robot.tsx        # URDF机器人渲染
│   │   │   ├── Trajectory.tsx   # 轨迹可视化
│   │   │   ├── Waypoint.tsx     # 路点标记
│   │   │   ├── Obstacle.tsx     # 障碍物（box/sphere/cylinder/mesh）
│   │   │   ├── SafetyZone.tsx   # 安全区域
│   │   │   ├── CoordinateFrame.tsx  # 坐标系
│   │   │   ├── PointCloud.tsx   # 点云渲染
│   │   │   └── Scene.tsx        # 场景管理
│   │   ├── hooks/               # React Hooks
│   │   │   └── useCollisionDetection.ts
│   │   └── index.ts
│   └── package.json
│
├── viewer/                      # 可视化前端（打包为静态资源）
│   ├── src/
│   │   ├── components/          # Viewer特定组件
│   │   │   ├── ControlPanel.tsx # 控制面板UI
│   │   │   ├── StatusBar.tsx    # 状态栏
│   │   │   └── KeyboardShortcuts.tsx
│   │   ├── store/               # Zustand 状态管理
│   │   │   ├── index.ts         # 主store
│   │   │   └── types.ts         # 状态类型
│   │   ├── protocol/            # JSON-RPC 消息处理
│   │   │   ├── handler.ts       # 消息分发
│   │   │   ├── methods.ts       # 方法定义
│   │   │   └── types.ts         # 协议类型
│   │   ├── App.tsx              # Viewer 入口
│   │   └── index.tsx
│   ├── dist/                    # 打包产物（被 SDK 引用）
│   └── package.json
│
└── sdk/
    └── python/                  # Python SDK
        └── roboviz/
            ├── __init__.py      # 模块级API入口
            ├── core.py          # 核心类（RoboViz, Robot, Obstacle等）
            ├── server.py        # 内嵌 HTTP + WebSocket Server
            ├── types.py         # 类型定义
            └── _viewer/         # 打包的前端静态资源

examples/
├── python/
│   ├── basic.py                 # 基础用法
│   ├── trajectory_demo.py       # 轨迹播放示例
│   └── full_features_demo.py    # 全功能演示
│
└── react-basic/                 # React 组件直接使用示例
    ├── src/
    │   └── App.tsx
    └── package.json
```

## Integration Patterns

### Pattern 1: Python SDK (Embedded Server)

SDK 内部启动服务器，用户无感知：

```python
import roboviz as rv

# 初始化（自动启动 HTTP Server + WebSocket + 打开浏览器）
rv.init()

# 配置场景
rv.set_scene(
    background="#1a1a2e",
    shadows=True,
    ground_plane=True,
    environment="warehouse"
)

# 添加机器人（使用URDF原始材质颜色）
robot = rv.add_robot("/path/to/robot.urdf")

# 添加坐标系层级
rv.add_frame("world", position=[0, 0, 0])
rv.add_frame("base", position=[0.5, 0, 0], parent="world")
rv.add_frame("tool", position=[0, 0, 0.3], parent="base")

# 添加点云
rv.add_point_cloud(
    points=point_data,
    color_mode="height",
    point_size=0.02
)

# 添加障碍物
rv.add_box(size=[0.2, 0.2, 0.2], position=[0.5, 0.1, 0.3], color="#ff6b6b")
rv.add_sphere(radius=0.1, position=[0.3, 0.2, 0.1], color="#4ecdc4")

# 启用碰撞检测
rv.enable_collision_detection(True)

# 播放轨迹
trajectory = [
    {"time": 0.0, "joints": [0, 0, 0, 0, 0, 0]},
    {"time": 1.0, "joints": [0.5, 0.3, 0.8, 0, 0, 0]},
    {"time": 2.0, "joints": [0, 0, 0, 0, 0, 0]},
]
rv.play_trajectory(robot.id, trajectory, speed=1.0, loop=True)

# 保持运行
rv.show()
```

**内部流程：**
```
rv.init()
    │
    ├── 1. 启动 HTTP Server (serve viewer 静态资源)
    ├── 2. 启动 WebSocket Server
    ├── 3. 打开浏览器访问 http://localhost:8765
    └── 4. 等待 WebSocket 连接

rv.add_robot()
    │
    ├── 1. 读取 URDF 文件
    ├── 2. 加载所有 mesh 文件（STL/DAE/OBJ）
    ├── 3. Base64 编码 mesh 数据
    └── 4. 发送 JSON-RPC: { method: "robot.add", params: {...} }
            │
            └── WebSocket ──> Viewer ──> 渲染
```

### Pattern 2: React Direct (No Server)

直接在 React 应用中使用组件，无需服务器：

```tsx
import { Canvas } from '@react-three/fiber';
import {
  Robot,
  Trajectory,
  PointCloud,
  CoordinateFrame,
  Obstacle
} from '@aspect/roboviz-core';

function App() {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);

  return (
    <Canvas>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} castShadow />

      <Robot
        urdfPath="/models/fanuc.urdf"
        jointAngles={joints}
        showTcpFrame={true}
        onTcpPoseChange={(pose) => console.log(pose)}
      />

      <Trajectory
        waypoints={trajectoryData}
        color="#4ecdc4"
        lineWidth={2}
      />

      <PointCloud
        points={pointData}
        colorMode="height"
        pointSize={0.02}
      />

      <CoordinateFrame
        name="world"
        position={[0, 0, 0]}
        scale={0.5}
      />

      <Obstacle
        type="box"
        size={[0.2, 0.2, 0.2]}
        position={[0.5, 0.1, 0.3]}
        color="#ff6b6b"
      />
    </Canvas>
  );
}
```

### Pattern 3: Tauri/Electron (IPC)

桌面应用通过 IPC 通信：

```tsx
// Frontend (Renderer)
import { RoboViz, useRoboVizBridge } from '@aspect/roboviz-react';
import { invoke } from '@tauri-apps/api/core';

function App() {
  const bridge = useRoboVizBridge({
    onIKSolve: (params) => invoke('solve_ik', params),
    onCollision: (data) => console.log('Collision:', data),
  });

  return <RoboViz bridge={bridge} />;
}
```

## Protocol Definition

### JSON-RPC 2.0 Methods

| Method | Direction | Description |
|--------|-----------|-------------|
| `robot.add` | SDK → Viewer | 添加机器人 |
| `robot.remove` | SDK → Viewer | 移除机器人 |
| `robot.setJoints` | SDK → Viewer | 设置关节角度 |
| `robot.getJoints` | SDK → Viewer | 获取关节角度 |
| `robot.getTcpPose` | SDK → Viewer | 获取 TCP 位姿 |
| `trajectory.add` | SDK → Viewer | 添加轨迹 |
| `trajectory.play` | SDK → Viewer | 播放轨迹 |
| `trajectory.pause` | SDK → Viewer | 暂停轨迹 |
| `trajectory.stop` | SDK → Viewer | 停止轨迹 |
| `obstacle.add` | SDK → Viewer | 添加障碍物 |
| `obstacle.remove` | SDK → Viewer | 移除障碍物 |
| `frame.add` | SDK → Viewer | 添加坐标系 |
| `frame.remove` | SDK → Viewer | 移除坐标系 |
| `pointCloud.add` | SDK → Viewer | 添加点云 |
| `pointCloud.remove` | SDK → Viewer | 移除点云 |
| `safetyZone.add` | SDK → Viewer | 添加安全区域 |
| `safetyZone.remove` | SDK → Viewer | 移除安全区域 |
| `collision.enable` | SDK → Viewer | 启用碰撞检测 |
| `scene.setConfig` | SDK → Viewer | 设置场景配置 |
| `camera.set` | SDK → Viewer | 设置相机 |
| `scene.clear` | SDK → Viewer | 清空场景 |

### Events (Viewer → SDK)

| Event | Description |
|-------|-------------|
| `robot.clicked` | 机器人被点击 |
| `robot.tcpMoved` | TCP 位置变化 |
| `trajectory.ended` | 轨迹播放结束 |
| `collision.detected` | 碰撞检测 |

### Message Format

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "robot.add",
  "params": {
    "id": "fanuc",
    "urdfContent": "<robot>...</robot>",
    "meshData": {
      "link1.stl": "base64...",
      "link2.stl": "base64..."
    },
    "position": [0, 0, 0],
    "joints": [0, 0, 0, 0, 0, 0]
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "id": "fanuc"
  }
}
```

**Notification (Event):**
```json
{
  "jsonrpc": "2.0",
  "method": "collision.detected",
  "params": {
    "robotId": "fanuc",
    "obstacleId": "box_1",
    "point": [0.5, 0.1, 0.3]
  }
}
```

## State Management

Viewer 使用 Zustand 管理状态：

```typescript
interface ViewerState {
  // Connection
  connected: boolean;

  // Scene
  scene: {
    background: string;
    shadows: boolean;
    groundPlane: boolean;
    groundColor: string;
    environmentPreset: string;
    ambientIntensity: number;
    directionalIntensity: number;
  };

  // Entities
  robots: Map<string, RobotState>;
  obstacles: Map<string, ObstacleState>;
  trajectories: Map<string, TrajectoryState>;
  frames: Map<string, FrameState>;
  pointClouds: Map<string, PointCloudState>;
  safetyZones: Map<string, SafetyZoneState>;

  // UI
  selectedRobotId: string | null;
  collisionDetectionEnabled: boolean;

  // Actions
  actions: {
    setConnected: (connected: boolean) => void;
    setScene: (config: Partial<SceneConfig>) => void;
    addRobot: (robot: RobotState) => void;
    updateRobot: (id: string, updates: Partial<RobotState>) => void;
    removeRobot: (id: string) => void;
    // ... more actions
  };
}
```

## Build & Distribution

### Viewer 打包

```bash
# 构建 Viewer 静态资源
pnpm --filter @aspect/roboviz-viewer build

# 输出到 packages/viewer/dist/
# - index.html
# - assets/
```

### SDK 分发

**Python:**
```bash
# 将 viewer dist 复制到 SDK
cp -r packages/viewer/dist/* packages/sdk/python/roboviz/_viewer/

# 发布到 PyPI
cd packages/sdk/python && python -m build && twine upload dist/*
```

**npm:**
```bash
pnpm --filter @aspect/roboviz-core publish
```

## Component Reference

### Robot

```typescript
interface RobotProps {
  id: string;
  urdfPath?: string;           // URL to URDF file
  urdfContent?: string;        // URDF XML content
  meshData?: Record<string, string>;  // Base64 encoded meshes
  jointAngles?: number[];      // Joint values
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;              // Override color (optional)
  opacity?: number;
  showTcpFrame?: boolean;
  selected?: boolean;
  onTcpPoseChange?: (pose: TcpPose) => void;
  onClick?: () => void;
}
```

### PointCloud

```typescript
interface PointCloudProps {
  id: string;
  points: number[][];          // [[x, y, z], ...]
  colors?: number[][];         // [[r, g, b], ...] 0-255
  intensities?: number[];      // For intensity color mode
  pointSize?: number;          // Default: 0.02
  colorMode?: 'uniform' | 'height' | 'intensity';
  color?: string;              // For uniform mode
}
```

### CoordinateFrame

```typescript
interface CoordinateFrameProps {
  name: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  parent?: string;             // Parent frame name
  showLabel?: boolean;
}
```

### Trajectory

```typescript
interface TrajectoryProps {
  id: string;
  waypoints: TrajectoryWaypoint[];
  color?: string;
  lineWidth?: number;
  showWaypoints?: boolean;
  playing?: boolean;
  speed?: number;
  loop?: boolean;
}

interface TrajectoryWaypoint {
  time: number;
  joints: number[];
  position?: [number, number, number];  // For Cartesian trajectories
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Reset camera view |
| `G` | Toggle grid |
| `A` | Toggle axes helper |
| `Space` | Play/Pause trajectory |
| `Escape` | Stop trajectory |
| `1-9` | Select robot by index |
| `Delete` | Remove selected robot |

## Future Roadmap

### Phase 4: Advanced Features (Planned)

- [ ] Multi-robot coordination visualization
- [ ] Path planning visualization
- [ ] Force/torque visualization
- [ ] VR/AR support
- [ ] Recording and playback
- [ ] Plugin system

### SDK Extensions (Planned)

- [ ] C++ SDK
- [ ] Rust SDK
- [ ] ROS2 integration
- [ ] MATLAB SDK
