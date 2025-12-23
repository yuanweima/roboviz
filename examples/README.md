# RoboViz Examples

本目录包含 RoboViz 的使用示例。

## 示例目录

```
examples/
├── python/                    # Python SDK 示例
│   ├── basic.py              # 基础用法（推荐）
│   └── simple_remote_control.py  # 旧版远程控制
│
├── react-basic/              # React 直接使用示例
│   └── src/App.tsx           # 纯组件使用，无远程控制
│
└── react-demo/               # 完整功能演示（旧版）
    └── src/modules/          # 各种功能模块
```

## 快速开始

### Python 用户（推荐）

最简单的方式 - 只需一个 Python 脚本：

```bash
# 安装 SDK
cd packages/sdk/python
pip install .

# 运行示例
python examples/python/basic.py
```

脚本会自动启动服务器并打开浏览器，无需其他步骤。

### React 用户

#### 方式 1：直接使用组件（无远程控制）

```bash
# 安装依赖
pnpm install

# 运行 react-basic 示例
pnpm --filter roboviz-react-basic dev
```

这个示例展示如何在 React 应用中直接使用 RoboViz 组件。

#### 方式 2：查看完整功能演示

```bash
# 运行 react-demo（旧版）
pnpm --filter roboviz-react-demo dev
```

## 使用模式说明

### 模式 1：Python/C++ 独立使用

```python
import roboviz as rv

rv.init()  # 自动启动一切
robot = rv.add_robot("/robot.urdf")
robot.set_joints([0, 0.5, 0.8])
rv.show()  # 阻塞运行
```

用户只需要运行 Python 脚本，SDK 会自动：
1. 启动 HTTP 服务器（serve viewer）
2. 启动 WebSocket 服务器
3. 打开浏览器
4. 等待连接

### 模式 2：React 直接集成

```tsx
import { Robot } from '@aspect/roboviz-core';

function App() {
  return (
    <Canvas>
      <Robot urdfPath="/robot.urdf" joints={[0, 0.5, 0.8]} />
    </Canvas>
  );
}
```

适用于：
- 需要深度定制 UI
- 需要与现有 React 应用集成
- 不需要远程控制

### 模式 3：Tauri/Electron 桌面应用

使用 `useRoboVizBridge` hook 与后端通信，通过 IPC 而非 WebSocket。
