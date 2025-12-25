# 多工艺系统架构实施计划

## 概述

构建一个可扩展的工艺插件系统，支持焊接、打磨、质检等多种工业应用场景。

## 阶段划分

### Phase 1: 工艺系统核心基础设施 (process/)

创建工艺系统的核心类型定义、注册机制和上下文提供者。

```
packages/core/src/process/
├── types/
│   ├── process.ts        # ProcessDefinition, ProcessState
│   ├── capability.ts     # Capability, CapabilityDefinition
│   ├── input.ts          # InputSelection, InputType
│   └── index.ts
├── registry/
│   └── processRegistry.ts # registerProcess, getProcess, useProcessRegistry
├── context/
│   └── ProcessProvider.tsx # ProcessContext, useProcess, useActiveProcess
├── components/
│   ├── ProcessSelector.tsx # 工艺切换器 UI
│   └── ProcessWorkspace.tsx # 工艺工作区容器
└── index.ts
```

**关键类型:**
- `ProcessDefinition<TInput, TSettings>` - 工艺插件接口
- `Capability` - 能力模块接口
- `ProcessState` - 工艺运行时状态

### Phase 2: 能力模块 (capabilities/)

创建可复用的能力模块，各工艺按需组合。

```
packages/core/src/capabilities/
├── types.ts              # 通用能力类型
├── edge-selection/       # 边缘选择能力
│   ├── types.ts
│   ├── useEdgeSelection.ts
│   ├── EdgeHighlighter.tsx
│   └── index.ts
├── surface-selection/    # 曲面选择能力
│   ├── types.ts
│   ├── useSurfaceSelection.ts
│   ├── SurfaceHighlighter.tsx
│   └── index.ts
├── angle-lock/           # 角度锁定能力
│   ├── types.ts
│   ├── useAngleLock.ts
│   ├── AngleLockPanel.tsx
│   ├── AngleIndicator.tsx
│   └── index.ts
├── collision-preview/    # 碰撞预览能力
│   ├── types.ts
│   ├── useCollisionPreview.ts
│   ├── CollisionZone.tsx
│   └── index.ts
└── index.ts
```

**优先实现:**
1. edge-selection - 焊接需要
2. angle-lock - 焊接需要
3. collision-preview - 所有工艺需要

### Phase 3: 轨迹系统 (trajectory/)

创建通用的轨迹管理系统，所有工艺共享。

```
packages/core/src/trajectory/
├── types/
│   ├── waypoint.ts       # Waypoint, WaypointStatus
│   ├── trajectory.ts     # Trajectory, TrajectoryStatus
│   ├── segment.ts        # TrajectorySegment (焊缝/区域的一段)
│   └── index.ts
├── store/
│   └── trajectoryStore.ts # Zustand store
├── hooks/
│   ├── useTrajectory.ts
│   ├── useTrajectoryEditor.ts
│   ├── useTrajectoryPlayback.ts
│   └── useWaypointAdjustment.ts
├── components/
│   ├── TrajectoryPath.tsx      # 3D 路径渲染
│   ├── WaypointMarker.tsx      # 3D 路点标记
│   ├── TrajectoryTimeline.tsx  # 时间轴回放控件
│   ├── TrajectoryInspector.tsx # 路点检查器面板
│   └── WaypointEditor.tsx      # 单点编辑面板
├── protocol/
│   └── trajectoryHandlers.ts
└── index.ts
```

**关键功能:**
- 路点的增删改查
- 路径可视化（颜色编码状态）
- 时间轴回放
- 手动调整与后端同步

### Phase 4: 焊接工艺插件 (process-welding/)

作为第一个完整的工艺插件示例。

```
packages/core/src/processes/welding/
├── types/
│   ├── seam.ts           # WeldSeam, SeamPoint
│   ├── settings.ts       # WeldSettings
│   └── index.ts
├── hooks/
│   ├── useSeamDefinition.ts    # 焊缝定义
│   ├── useSeamDiscretization.ts # 离散化请求
│   └── index.ts
├── components/
│   ├── SeamLine.tsx            # 3D 焊缝线渲染
│   ├── SeamControlPoints.tsx   # 起止点控制
│   ├── WeldSettingsPanel.tsx   # 焊接参数面板
│   ├── WeldVisualization.tsx   # 焊接专用可视化
│   └── index.ts
├── protocol/
│   └── weldingHandlers.ts
├── definition.ts         # ProcessDefinition 导出
└── index.ts
```

**焊接工作流:**
1. 选择边缘 (edge-selection)
2. 定义起止点
3. 设置焊接参数（角度、速度等）
4. 请求离散化生成轨迹
5. 手动调整关键点
6. 导出/执行

### Phase 5: 集成与测试

1. 更新 core/index.ts 导出
2. 创建 demo 页面展示工艺系统
3. 编写基本测试
4. 文档更新

---

## 实施顺序

### Step 1: 核心类型定义
- [ ] process/types/process.ts
- [ ] process/types/capability.ts
- [ ] process/types/input.ts

### Step 2: 工艺注册机制
- [ ] process/registry/processRegistry.ts
- [ ] process/context/ProcessProvider.tsx

### Step 3: 轨迹基础类型
- [ ] trajectory/types/waypoint.ts
- [ ] trajectory/types/trajectory.ts

### Step 4: 轨迹 Store
- [ ] trajectory/store/trajectoryStore.ts

### Step 5: 能力模块 - 边缘选择
- [ ] capabilities/edge-selection/*

### Step 6: 能力模块 - 角度锁定
- [ ] capabilities/angle-lock/*

### Step 7: 轨迹可视化组件
- [ ] trajectory/components/TrajectoryPath.tsx
- [ ] trajectory/components/WaypointMarker.tsx

### Step 8: 焊接工艺类型
- [ ] processes/welding/types/*

### Step 9: 焊接工艺组件
- [ ] processes/welding/components/*

### Step 10: 焊接工艺定义
- [ ] processes/welding/definition.ts

### Step 11: UI 组件
- [ ] process/components/ProcessSelector.tsx
- [ ] trajectory/components/TrajectoryInspector.tsx
- [ ] trajectory/components/TrajectoryTimeline.tsx

### Step 12: 集成
- [ ] 更新导出
- [ ] 创建 demo
- [ ] 测试验证

---

## 预计产出

1. **工艺系统核心** - 可扩展的插件架构
2. **能力模块** - 可复用的功能单元
3. **轨迹系统** - 通用的轨迹管理
4. **焊接插件** - 完整的焊接工艺示例
5. **UI 组件** - 工艺切换、轨迹检查、时间轴等

---

## 依赖关系

```
ProcessDefinition
      │
      ├─→ Capability (edge-selection, angle-lock, ...)
      │
      ├─→ Trajectory (waypoints, path, timeline)
      │
      └─→ Protocol (backend communication)
```

所有工艺插件依赖 core 基础设施，但工艺插件之间相互独立。
