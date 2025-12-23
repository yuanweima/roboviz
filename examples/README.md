# RoboViz Examples

本目录包含 RoboViz 系统的演示示例。

## 目录结构

```
examples/
├── python/                    # Python SDK 示例
│   └── simple_remote_control.py  # 远程控制示例
└── react-demo/                # React Demo 应用
    └── src/modules/           # 功能模块演示
        ├── RobotModule.tsx       # 基础机器人控制
        ├── TrajectoryModule.tsx  # 轨迹播放
        ├── CollisionModule.tsx   # 碰撞检测与安全区域
        └── RemoteControlModule.tsx # Python SDK 远程控制
```

## 快速开始

### 1. 启动 React Demo

```bash
pnpm install
pnpm --filter roboviz-react-demo dev
```

打开浏览器访问显示的地址（如 http://localhost:3004）

### 2. Python SDK 远程控制

首先安装 Python SDK：

```bash
cd packages/sdk/python
pip install .
pip install websocket-client
```

然后在 React Demo 的 "Remote" 模块中点击 "Connect" 连接服务器。

运行 Python 脚本：

```bash
python examples/python/simple_remote_control.py
```

## 功能演示

### Robot Module
- 加载 URDF 机器人模型
- 控制关节角度
- 调整机器人颜色和显示选项

### Trajectory Module
- 生成不同类型的轨迹 (pick-place, circular, wave)
- 使用 `useTrajectoryPlayer` hook 控制播放
- 添加和管理路点

### Collision Module
- 添加障碍物 (box, sphere, cylinder)
- 显示安全区域 (`SafetyZoneVisual`)
- 点击删除障碍物

### Remote Control Module
- 通过 WebSocket 接收 Python SDK 命令
- 动态添加机器人、障碍物、安全区域
- 实时关节控制
