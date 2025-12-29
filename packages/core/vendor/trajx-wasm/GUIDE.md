# trajx-wasm 使用指南

trajx-wasm 是 trajx 机器人运动学库的 WebAssembly 封装，提供在浏览器中运行的高性能 FK/IK 计算和路径规划功能。

## 目录

1. [快速开始](#快速开始)
2. [构建说明](#构建说明)
3. [核心概念](#核心概念)
4. [API 详解](#api-详解)
5. [Motion-Centric API](#motion-centric-api运动中心-apinew)
6. [Cable-Aware Planning](#cable-aware-planning线缆感知规划new)
7. [Batch Forward Kinematics](#batch-forward-kinematics批量正运动学)
8. [FK Worker（Web Worker 集成）](#fk-workerweb-worker-集成) ⚡ NEW
9. [使用示例](#使用示例)
10. [坐标系说明](#坐标系说明)
11. [常见问题](#常见问题)

---

## 快速开始

### 1. 构建 WASM 模块

```bash
cd crates/trajx-wasm
./build.sh          # 构建 release 版本
./build.sh serve    # 构建并启动本地服务器
```

### 2. 在 HTML 中使用

```html
<!DOCTYPE html>
<html>
<head>
    <title>trajx-wasm Demo</title>
</head>
<body>
    <script type="module">
        import init, { createRobot, Pose, Position, Quaternion } from './pkg/trajx_wasm.js';

        async function main() {
            // 初始化 WASM 模块
            await init();

            // 从 URDF 创建机器人
            const urdfContent = `<robot name="my_robot">...</robot>`;
            const robot = createRobot(urdfContent);

            // 正运动学
            const joints = [0, 0.5, -0.5, 0, 0.5, 0];
            const pose = robot.forwardKinematics(joints);
            console.log('末端位置:', pose.position);

            // 逆运动学
            const ikResult = robot.inverseKinematics(pose, joints);
            if (ikResult.success) {
                console.log('IK 解:', ikResult.solution);
            }
        }

        main();
    </script>
</body>
</html>
```

---

## 构建说明

### 前置条件

- Rust 1.75+
- wasm-pack (`cargo install wasm-pack`)

### 构建命令

```bash
# 默认构建 (web target, release)
./build.sh

# 开发构建 (带调试信息，更快编译)
./build.sh dev

# 用于 webpack/rollup 的 bundler target
./build.sh bundler

# Node.js target
./build.sh nodejs

# 启用碰撞检测功能
./build.sh collision

# 构建并启动本地服务器 (端口 8088)
./build.sh serve

# 指定端口
./build.sh serve 3000

# 清理构建产物
./build.sh clean
```

### 输出文件

构建完成后，`pkg/` 目录包含：

```
pkg/
├── trajx_wasm.js       # JavaScript 入口文件
├── trajx_wasm_bg.wasm  # WebAssembly 二进制
├── trajx_wasm.d.ts     # TypeScript 类型定义
└── package.json        # npm 包配置
```

---

## 核心概念

### 坐标系

trajx-wasm 使用两套坐标系：

1. **URDF 坐标系**: 机器人 URDF 文件定义的坐标系，用于可视化和外部接口
2. **DH 坐标系**: Denavit-Hartenberg 参数定义的坐标系，用于运动学计算

**重要**: 所有公开 API 都使用 URDF 坐标系，内部自动处理 DH 坐标系转换。

### 关节角度

- 单位：弧度 (radians)
- 数组顺序：从基座到末端执行器
- 例如 6-DOF 机器人：`[j1, j2, j3, j4, j5, j6]`

### 位姿表示

使用 `Pose` 类型表示 6-DOF 位姿：

```javascript
const pose = new Pose(
    new Position(x, y, z),          // 位置，单位：米
    new Quaternion(qx, qy, qz, qw)  // 方向，四元数
);
```

---

## API 详解

### 初始化

```javascript
import init, { createRobot, listDhDatabase } from './pkg/trajx_wasm.js';

// 必须先初始化 WASM 模块
await init();

// 查看内置机器人列表
const robots = listDhDatabase();
console.log(robots); // ["fanuc_m20ia_7l", "ur5", "ur10", ...]
```

### 创建机器人

#### 从 URDF 创建

```javascript
const urdfContent = `
<robot name="Fanuc_LR_Mate_200iD_7L">
  <link name="base_link">...</link>
  <joint name="joint1" type="revolute">
    <origin xyz="0 0 0.33" rpy="0 0 0" />
    <axis xyz="0 0 1" />
    <limit lower="-2.9" upper="2.9" />
  </joint>
  ...
</robot>
`;

const robot = createRobot(urdfContent);
```

#### 机器人属性

```javascript
robot.name               // 机器人名称
robot.dof                // 自由度数量
robot.jointNames()       // 关节名称数组
robot.linkNames()        // 连杆名称数组
robot.getJointLimits()   // 关节限制 { lower: [...], upper: [...] }
robot.hasDhParams()      // 是否加载了 DH 参数
robot.usesDhForFk()      // 是否使用 DH 计算 FK
robot.supportsAnalyticalIk()  // 是否支持解析 IK
```

### 正运动学 (FK)

```javascript
// 单一末端位姿
const joints = [0, 0.5, -0.5, 0, 0.5, 0];
const pose = robot.forwardKinematics(joints);

console.log('位置:', pose.position.x, pose.position.y, pose.position.z);
console.log('方向:', pose.orientation);

// 所有连杆位姿 (用于可视化)
const chainPoses = robot.forwardKinematicsChain(joints);
chainPoses.forEach((p, i) => {
    console.log(`Link ${i}:`, p.position);
});

// 命名连杆变换 (用于 Three.js)
const transforms = robot.getLinkTransforms(joints);
for (const [name, transform] of Object.entries(transforms)) {
    console.log(`${name}:`, transform.position);
}
```

### 逆运动学 (IK)

#### 单解 IK

```javascript
const targetPose = new Pose(
    new Position(0.5, 0.2, 0.4),
    new Quaternion(0, 0, 0, 1)
);

const seed = [0, 0, 0, 0, 0, 0]; // 初始猜测

const result = robot.inverseKinematics(targetPose, seed);

if (result.success) {
    console.log('解:', result.solution);           // Float64Array
    console.log('位置误差:', result.positionError); // 米
    console.log('解析解:', result.isAnalytical);    // boolean
} else {
    console.log('IK 失败:', result.errorMessage);
}
```

#### TCP 位置求逆解

当安装了工具时，使用 `inverseKinematicsTcp` 直接求解 TCP 到达目标位置所需的关节角度：

```javascript
// 1. 先安装工具
const toolOffset = new Pose(
    new Position(0, 0, 0.12),  // 工具沿 Z 轴偏移 120mm
    new Quaternion(0, 0, 0, 1)
);
robot.attachTool(toolOffset);

// 2. 定义目标 TCP 位置（不是法兰盘位置！）
const targetTcp = new Pose(
    new Position(0.4, 0.1, 0.3),
    new Quaternion(0, 0, 0, 1)
);

// 3. 使用 inverseKinematicsTcp 求解
const result = robot.inverseKinematicsTcp(targetTcp, seed);

if (result.success) {
    // FK 验证：TCP 应该正好在目标位置
    const achievedTcp = robot.forwardKinematicsTcp(result.solution);
    console.log('TCP 到达:', achievedTcp.position);
}
```

> **注意**: `inverseKinematics()` 求解的是法兰盘位置，不会考虑工具偏移。
> 如果安装了工具，应该使用 `inverseKinematicsTcp()` 来确保 TCP 到达正确位置。

#### 多解 IK (6-DOF 球腕机器人)

对于 Fanuc、KUKA 等球腕机器人，可以获取所有可能的 IK 解（最多 8 个）：

```javascript
const result = robot.inverseKinematicsAll(targetPose, seed);

if (result.success) {
    console.log(`找到 ${result.solutionCount} 个解`);
    console.log('使用解析 IK:', result.isAnalytical);

    for (let i = 0; i < result.solutionCount; i++) {
        const solution = result.getSolution(i);     // Float64Array
        const error = result.getPositionError(i);   // 米
        console.log(`解 ${i+1}: 误差 = ${error * 1000} mm`);
    }
}
```

### 工作空间分析

```javascript
const analysis = robot.analyzeWorkspace(joints);

console.log('可操作度:', analysis.manipulability);
console.log('条件数:', analysis.conditionNumber);
console.log('最小奇异值:', analysis.minSingularValue);
console.log('接近奇异:', analysis.isNearSingular);

// 关节限制裕度 (0-1, 1 表示位于限制中心)
const margins = Array.from(analysis.jointLimitMargins);
margins.forEach((m, i) => {
    console.log(`J${i+1} 裕度: ${(m * 100).toFixed(1)}%`);
});
```

### 雅可比矩阵

```javascript
const jacobian = robot.computeJacobian(joints);

// jacobian 是 6×n 矩阵 (n = DOF)
// 行 0-2: 线速度分量
// 行 3-5: 角速度分量
```

### 工具偏移

```javascript
// 添加工具偏移
const toolPose = new Pose(
    new Position(0, 0, 0.1),      // 工具沿 Z 轴偏移 100mm
    new Quaternion(0, 0, 0, 1)
);
robot.attachTool(toolPose);

// 移除工具
robot.detachTool();

// 检查是否有工具
robot.hasTool();

// 获取当前工具偏移（NEW）
const offset = robot.getToolOffset();
if (offset) {
    console.log('工具偏移:', offset.position);
}
```

### 工具库管理（NEW）

机器人对象内置工具库管理功能，支持多工具、多TCP点：

```javascript
// 创建单位姿态作为法兰盘偏移
const flangeOffset = Pose.fromPositionQuaternion(0, 0, 0, 1, 0, 0, 0);

// 添加一个工具到工具库
robot.addTool("inspection_tool", flangeOffset);

// 给工具添加 TCP 点
const cameraTcpOffset = Pose.fromPositionQuaternion(0.02, 0, 0.05, 1, 0, 0, 0);
robot.addTcpToTool("inspection_tool", "camera", cameraTcpOffset);

// 添加带工作距离的 TCP
const welderTcpOffset = Pose.fromPositionQuaternion(0, 0, 0.15, 1, 0, 0, 0);
robot.addTcpWithStandoff("inspection_tool", "welder", welderTcpOffset, 0.01);  // 10mm 工作距离

// 激活工具
robot.activateTool("inspection_tool", "camera");  // 可选指定 TCP
console.log('当前工具:', robot.getActiveToolName());
console.log('当前 TCP:', robot.getActiveTcpName());

// 切换 TCP
robot.setActiveTcp("welder");

// 获取工作距离（standoff）
const standoff = robot.getTcpStandoff("inspection_tool", "welder");
console.log('焊接距离:', standoff * 1000, 'mm');

// 列出所有工具和 TCP
console.log('所有工具:', robot.listTools());
console.log('工具的 TCP:', robot.listTcps("inspection_tool"));

// 停用工具
robot.deactivateTool();
```

### 命名 TCP 的 FK/IK（NEW）

使用指定的工具/TCP组合进行计算，无需更改当前激活的工具：

```javascript
const joints = [0, 0.5, -0.5, 0, 0.5, 0];

// 正运动学 - 使用指定的工具/TCP
const cameraPose = robot.forwardKinematicsNamedTcp(joints, "inspection_tool", "camera");
const welderPose = robot.forwardKinematicsNamedTcp(joints, "inspection_tool", "welder");

console.log('相机位置:', cameraPose.position);
console.log('焊枪位置:', welderPose.position);

// 逆运动学 - 求解指定 TCP 到达目标位置
const targetPose = Pose.fromPositionQuaternion(0.5, 0.2, 0.4, 1, 0, 0, 0);
const result = robot.inverseKinematicsNamedTcp(targetPose, "inspection_tool", "camera", joints);

if (result.success) {
    console.log('IK 解:', result.solution);
}
```

---

## Motion-Centric API（运动中心 API）（NEW）

全新的流畅式 API，提供四个渐进级别：

### 级别 1: 简单运动（一行代码）

```javascript
import init, { createRobot, WasmMotion } from './pkg/trajx_wasm.js';

await init();
const robot = createRobot(urdfContent);
robot.setJointPositions([0, 0, 0, 0, 0, 0]);

// 简单点到点运动
const result = WasmMotion.to([1.0, 0.5, -0.5, 0, 0.5, 0]).run(robot);

console.log('持续时间:', result.trajectoryDuration, '秒');
console.log('轨迹点数:', result.numPoints);
```

### 级别 2: 带约束的运动

```javascript
// 快速关节运动
const result = WasmMotion.to(goal).fast().run(robot);

// 慢速精密运动
const result = WasmMotion.to(goal).precise().run(robot);  // = .slow().verySmooth()

// 以 50mm/s 速度进行线性笛卡尔运动
const result = WasmMotion.to(goal).linearAt(50.0).run(robot);

// 启用碰撞避障
const result = WasmMotion.to(goal).safe().run(robot);
```

### 级别 3: 多路点路径

```javascript
import { WasmPath } from './pkg/trajx_wasm.js';

// 创建路点（扁平化数组）
const waypoints = [
  0.5, 0.3, -0.3, 0, 0.3, 0,  // 路点1
  1.0, 0.5, -0.5, 0, 0.5, 0,  // 路点2
  0.8, 0.4, -0.4, 0, 0.4, 0   // 路点3
];

const result = WasmPath.through(waypoints, 6)  // 6 = 自由度
  .linear()
  .speed(0.8)
  .run(robot);
```

### 级别 4: 运动序列

```javascript
import { WasmMotion, WasmSequence } from './pkg/trajx_wasm.js';

// 取放序列
const pickApproach = WasmMotion.to(approachPos).fast();
const pick = WasmMotion.to(pickPos).linear().slow();
const pickRetreat = WasmMotion.to(retreatPos).linear();
const placeApproach = WasmMotion.to(placeApproachPos).fast();
const place = WasmMotion.to(placePos).linear().slow();
const placeRetreat = WasmMotion.to(placeRetreatPos).linear();

const result = WasmSequence.start(pickApproach)
  .then(pick)
  .then(pickRetreat)
  .then(placeApproach)
  .then(place)
  .then(placeRetreat)
  .run(robot);

console.log('总持续时间:', result.trajectoryDuration, '秒');
console.log('总路径长度:', result.pathLength, '弧度');
```

### 检查结果

```javascript
const result = WasmMotion.to(goal).run(robot);

// 结果属性
console.log('已执行:', result.executed);
console.log('自由度:', result.dof);
console.log('点数:', result.numPoints);
console.log('持续时间:', result.trajectoryDuration, '秒');
console.log('路径长度:', result.pathLength, '弧度');
console.log('规划时间:', result.planningTimeMs, '毫秒');
console.log('无碰撞:', result.collisionFree);

// 获取特定索引的位置
const firstPos = result.getPositionsAt(0);
const lastPos = result.getPositionsAt(result.numPoints - 1);

// 获取索引处的时间
const t0 = result.getTimeAt(0);
const tf = result.getTimeAt(result.numPoints - 1);

// 获取原始轨迹 [t0, j0..jn, t1, j0..jn, ...]
const trajectory = result.getTrajectory();
```

### WasmMotion API 参考

| 方法 | 描述 |
|------|------|
| `WasmMotion.to(joints)` | 创建到目标关节位置的运动 |
| `.from(joints)` | 设置起始位置（默认：机器人当前位置） |
| `.joint()` | 使用关节空间插值（最快） |
| `.linear()` | 使用线性笛卡尔插值 |
| `.linearAt(speed)` | 以指定 TCP 速度（mm/s）进行线性运动 |
| `.spline()` | 使用样条插值 |
| `.speed(scale)` | 设置速度比例（0.01-1.0） |
| `.fast()` | 最大速度（1.0） |
| `.slow()` | 慢速（0.3） |
| `.smooth()` | 高平滑度 |
| `.verySmooth()` | 非常高的平滑度 |
| `.precise()` | 精密模式（慢速 + 非常平滑） |
| `.safe()` | 启用碰撞避障 |
| `.verified()` | 验证无碰撞（有碰撞则失败） |
| `.adaptive()` | 启用自适应重规划 |
| `.dwellMs(ms)` | 在末端添加停留时间 |
| `.cableAware()` | 启用线缆扭转跟踪（标准预设） |
| `.cableAwareWith(config)` | 使用自定义 CableConfig |
| `.cableTrack()` | 仅跟踪模式（不约束规划） |
| `.withCableTwist(rad)` | 设置初始扭转（多段跟踪） |
| `.run(robot)` | 在机器人上执行 |
| `.runWithCollision(robot, checker)` | 带碰撞避障执行 |
| `.plan(robot)` | 只规划不执行 |

### 碰撞感知运动 (runWithCollision)

使用 `runWithCollision()` 启用 BiRRT 规划和碰撞检测：

```javascript
// 定义碰撞检测器：返回 true 表示配置有效（无碰撞）
const collisionChecker = (joints) => {
    // 你的碰撞检测逻辑
    return !isColliding(joints);  // true = 无碰撞
};

// 带碰撞避障的运动
const result = WasmMotion.to(goal)
    .safe()  // 启用避障模式
    .runWithCollision(robot, collisionChecker);

console.log('无碰撞:', result.collisionFree);

// 带碰撞避障的路径
const path = WasmPath.through(waypoints, 6)
    .safe()
    .runWithCollision(robot, collisionChecker);

// 带碰撞避障的序列
const seq = WasmSequence.start(motion1.safe())
    .then(motion2.safe())
    .runWithCollision(robot, collisionChecker);
```

**重要**: 碰撞检测回调应返回：
- `true` 表示配置**有效**（无碰撞）
- `false` 表示配置**无效**（检测到碰撞）

### 结果属性（Cable）

启用线缆跟踪时，`WasmMotionResult` 包含：

| 属性 | 描述 |
|-----|------|
| `.cableTwist` | 最终累计扭转（弧度） |
| `.cableMaxTwist` | 运动过程中最大扭转 |
| `.cableWarning` | 是否进入警告区 |
| `.cableExceeded` | 是否超出限制 |
| `.hasCableTracking` | 是否启用了线缆跟踪 |

---

## Cable-Aware Planning（线缆感知规划）

在机器人运动过程中跟踪和约束线缆扭转，防止线缆损坏。

### 基本用法

```javascript
import { WasmMotion, WasmSequence, CableConfig } from './pkg/trajx_wasm.js';

// 简单线缆感知运动（标准 4π/720° 限制）
const result = WasmMotion.to(goal)
    .cableAware()
    .run(robot);

console.log('扭转:', result.cableTwist);
console.log('警告:', result.cableWarning);
```

### 自定义配置

```javascript
// 使用自定义配置
const config = new CableConfig()
    .withMaxTotalTwist(2 * Math.PI)    // 360° 限制
    .withWarningThreshold(0.5);         // 50% 时警告

const result = WasmMotion.to(goal)
    .cableAwareWith(config)
    .run(robot);
```

### 多段运动跟踪

```javascript
// 跟踪多段运动的累计扭转
let twist = 0;
for (const goal of goals) {
    const result = WasmMotion.to(goal)
        .cableAware()
        .withCableTwist(twist)
        .run(robot);
    twist = result.cableTwist;
    console.log(`累计扭转: ${(twist * 180 / Math.PI).toFixed(1)}°`);
}
```

### 线缆感知序列

```javascript
// 跨整个序列跟踪线缆扭转
const result = WasmSequence.start(WasmMotion.to(goal1))
    .then(WasmMotion.to(goal2))
    .then(WasmMotion.to(goal3))
    .cableAware()
    .run(robot);

console.log('最终扭转:', result.cableTwist);
console.log('最大扭转:', result.cableMaxTwist);
```

### 线缆预设

| 预设 | 限制 | 描述 |
|-----|------|------|
| `cablePresetStandard()` | 4π (720°) | 默认，大多数线缆 |
| `cablePresetHeavyDuty()` | 2π (360°) | 粗硬线缆 |
| `cablePresetLight()` | 8π (1440°) | 细软线缆 |
| `cablePresetPrecision()` | 2π + 自动解缠 | 最小应力 |

### CableConfig API

| 方法 | 描述 |
|-----|------|
| `new CableConfig()` | 创建默认配置（4π 限制） |
| `.withMaxTotalTwist(rad)` | 设置最大总扭转 |
| `.withWarningThreshold(0-1)` | 设置警告阈值 |
| `.withAutoUnwind(bool)` | 启用自动解缠 |
| `.isTwistValid(rad)` | 检查扭转是否在限制内 |
| `.isTwistWarning(rad)` | 检查是否在警告区 |

---

## 使用示例

### 笛卡尔空间移动

```javascript
// 当前位姿
const currentPose = robot.forwardKinematics(joints);

// 计算新目标位置
const step = 0.01; // 10mm
const newX = currentPose.position.x + step;

const targetPose = new Pose(
    new Position(newX, currentPose.position.y, currentPose.position.z),
    currentPose.orientation
);

// 求解 IK
const result = robot.inverseKinematics(targetPose, joints);

if (result.success) {
    // 更新关节角度
    joints = Array.from(result.solution);

    // 验证 FK
    const verifyPose = robot.forwardKinematics(joints);
    const error = Math.sqrt(
        Math.pow(verifyPose.position.x - targetPose.position.x, 2) +
        Math.pow(verifyPose.position.y - targetPose.position.y, 2) +
        Math.pow(verifyPose.position.z - targetPose.position.z, 2)
    );
    console.log(`FK 验证误差: ${error * 1000} mm`);
}
```

### Three.js 集成

```javascript
import * as THREE from 'three';
import init, { createRobot } from './pkg/trajx_wasm.js';

async function setupRobot(scene, urdfContent) {
    await init();

    const robot = createRobot(urdfContent);
    const linkMeshes = {}; // 存储每个连杆的 mesh

    // 创建连杆 mesh (简化示例)
    robot.linkNames().forEach(name => {
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
        const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
        linkMeshes[name] = new THREE.Mesh(geometry, material);
        scene.add(linkMeshes[name]);
    });

    // 更新函数
    function updateRobot(joints) {
        const transforms = robot.getLinkTransforms(joints);

        for (const [name, transform] of Object.entries(transforms)) {
            if (linkMeshes[name]) {
                const mesh = linkMeshes[name];
                mesh.position.set(
                    transform.position.x,
                    transform.position.y,
                    transform.position.z
                );
                mesh.quaternion.set(
                    transform.orientation.x,
                    transform.orientation.y,
                    transform.orientation.z,
                    transform.orientation.w
                );
            }
        }
    }

    return { robot, updateRobot };
}
```

### React Hook

```typescript
import { useState, useEffect, useCallback } from 'react';
import init, { createRobot, Robot, Pose } from './pkg/trajx_wasm.js';

export function useRobot(urdfContent: string) {
    const [robot, setRobot] = useState<Robot | null>(null);
    const [joints, setJoints] = useState<number[]>([]);
    const [pose, setPose] = useState<Pose | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function initialize() {
            try {
                await init();
                const r = createRobot(urdfContent);
                setRobot(r);
                setJoints(new Array(r.dof).fill(0));
                setLoading(false);
            } catch (e) {
                setError(e.message);
                setLoading(false);
            }
        }
        initialize();
    }, [urdfContent]);

    // 更新关节时自动计算 FK
    useEffect(() => {
        if (robot && joints.length > 0) {
            try {
                const p = robot.forwardKinematics(joints);
                setPose(p);
            } catch (e) {
                console.error('FK error:', e);
            }
        }
    }, [robot, joints]);

    const setJoint = useCallback((index: number, value: number) => {
        setJoints(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }, []);

    const solveIK = useCallback((targetPose: Pose) => {
        if (!robot) return null;
        return robot.inverseKinematics(targetPose, joints);
    }, [robot, joints]);

    return { robot, joints, pose, setJoint, solveIK, loading, error };
}
```

---

## 坐标系说明

### URDF 关节轴方向

URDF 允许关节轴指向任意方向，例如：

```xml
<joint name="joint3" type="revolute">
    <axis xyz="0 -1 0" />  <!-- 绕 -Y 轴旋转 -->
</joint>
```

trajx-wasm 自动处理这种情况：

1. **FK**: URDF 关节角度 → 内部转换 → DH FK 计算 → 正确的末端位姿
2. **IK**: 目标位姿 → DH IK 求解 → 内部转换 → URDF 关节角度

用户无需关心 DH 坐标系的细节。

### 关节限制

关节限制在 URDF 坐标系中定义，例如：

```xml
<limit lower="-2.4" upper="4.8" />
```

IK 求解器会自动考虑这些限制，返回的所有解都在限制范围内。

---

## Batch Forward Kinematics（批量正运动学）

针对 GPU Instancing 和强化学习可视化场景，trajx-wasm 提供了高性能的批量 FK API，可以在毫秒级时间内计算数百个机器人实例的运动学。

### 使用场景

- **RL 训练可视化**: 同时渲染数百个机器人进行策略对比
- **GPU Instancing**: 与 Three.js InstancedMesh 配合使用
- **蒙特卡洛仿真**: 批量计算多种关节配置

### API 概述

```javascript
import { batchForwardKinematics, batchForwardKinematicsF32, batchForwardKinematicsEndEffector, DhParam } from 'trajx-wasm';

// 定义机器人 DH 参数（所有实例共享）
const dhParams = [
    new DhParam(0, -Math.PI/2, 0.1, 0),   // joint 1
    new DhParam(0.4, 0, 0, 0),             // joint 2
    new DhParam(0.02, -Math.PI/2, 0, 0),   // joint 3
    new DhParam(0, Math.PI/2, 0.4, 0),     // joint 4
    new DhParam(0, -Math.PI/2, 0, 0),      // joint 5
    new DhParam(0, 0, 0.1, 0),             // joint 6
];

const robotCount = 500;
const jointCount = 6;

// 关节角度扁平数组: [robot1_j1, robot1_j2, ..., robot2_j1, robot2_j2, ...]
const jointAngles = new Float32Array(robotCount * jointCount);
// ... 从 RL policy 或其他来源填充数据 ...

// 计算所有 link 的变换矩阵
const allTransforms = batchForwardKinematicsF32(dhParams, Array.from(jointAngles), robotCount, jointCount);
// 返回: [robot1_link1_mat4, robot1_link2_mat4, ..., robot2_link1_mat4, ...]
// 每个机器人有 (jointCount + 1) 个 link（包括 base）
// 总长度: 500 * 7 * 16 = 56000

// 或者只计算末端执行器（更高效）
const eeTransforms = batchForwardKinematicsEndEffector(dhParams, Array.from(jointAngles), robotCount, jointCount);
// 返回: [robot1_ee_mat4, robot2_ee_mat4, ...]
// 总长度: 500 * 16 = 8000
```

### 与 Three.js InstancedMesh 配合使用

```javascript
import * as THREE from 'three';
import { batchForwardKinematicsEndEffector, DhParam } from 'trajx-wasm';

// 创建 InstancedMesh
const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, robotCount);

// 临时矩阵对象
const matrix = new THREE.Matrix4();

function updateRobots(jointAnglesFlat) {
    // 批量计算 FK
    const transforms = batchForwardKinematicsEndEffector(dhParams, jointAnglesFlat, robotCount, jointCount);

    // 更新 InstancedMesh
    for (let i = 0; i < robotCount; i++) {
        const offset = i * 16;
        matrix.fromArray(transforms, offset);
        instancedMesh.setMatrixAt(i, matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
}
```

### 性能

| 机器人数量 | 批量 FK 时间 | 目标 |
|-----------|-------------|------|
| 500       | ~0.3ms      | <5ms |
| 1000      | ~0.6ms      | <10ms |

批量 FK 避免了：
- 每个机器人单独调用 WASM 函数的开销
- JavaScript 和 WASM 之间的多次内存拷贝

### API 变体

| 函数名 | 返回类型 | 用途 |
|-------|---------|------|
| `batchForwardKinematics` | `number[]` (f64) | 高精度计算 |
| `batchForwardKinematicsF32` | `Float32Array` | WebGL/GPU 兼容 |
| `batchForwardKinematicsEndEffector` | `Float32Array` | 仅末端执行器，最高效 |

---

## FK Worker（Web Worker 集成）

为了保持主线程流畅（用于渲染），trajx-wasm 提供了预打包的 Web Worker 解决方案，将批量 FK 计算移到后台线程。

### 问题背景

在 Web 应用中使用 WASM + Web Worker 时，通常会遇到：

1. **WASM 文件路径**：不同打包工具（Vite/Webpack/Rollup）解析路径方式不同
2. **ES Module 支持**：Worker 中的 ES Module 导入兼容性问题
3. **重复工作**：每个项目都需要解决相同的打包问题

### 解决方案

trajx-wasm 提供预打包的 FK Worker：

```
trajx-wasm/
├── pkg-web/           # Web 构建
│   ├── trajx_wasm.js
│   └── trajx_wasm_bg.wasm
└── workers/           # ⚡ 新增
    ├── index.js       # 工厂函数
    ├── fk-worker.js   # Worker 实现
    └── fk-worker.d.ts # TypeScript 类型
```

### 基本用法

```typescript
import { createFKWorker } from 'trajx-wasm/workers';

// 使用内置机器人数据库
const fkWorker = await createFKWorker({
    robotName: 'ur5',    // 从 DH 数据库查找
    robotCount: 500
});

// 生成关节角度
const jointAngles = new Float32Array(500 * 6);
for (let i = 0; i < jointAngles.length; i++) {
    jointAngles[i] = Math.random() * 2 - 1;
}

// 在 Worker 中计算 FK
const { transforms, computeTimeMs } = await fkWorker.computeFK(jointAngles);
console.log(`Computed in ${computeTimeMs.toFixed(2)}ms on background thread`);

// 更新 Three.js InstancedMesh
for (let i = 0; i < 500; i++) {
    for (let link = 0; link < fkWorker.linkCount; link++) {
        const offset = (i * fkWorker.linkCount + link) * 16;
        matrix.fromArray(transforms, offset);
        instancedMesh.setMatrixAt(i * fkWorker.linkCount + link, matrix);
    }
}
instancedMesh.instanceMatrix.needsUpdate = true;

// 完成后终止 Worker
fkWorker.terminate();
```

### 使用自定义 DH 参数

```typescript
const fkWorker = await createFKWorker({
    dhParams: [
        { a: 0, alpha: -Math.PI/2, d: 0.1, theta: 0 },
        { a: 0.4, alpha: 0, d: 0, theta: 0 },
        { a: 0.02, alpha: -Math.PI/2, d: 0, theta: 0 },
        { a: 0, alpha: Math.PI/2, d: 0.4, theta: 0 },
        { a: 0, alpha: -Math.PI/2, d: 0, theta: 0 },
        { a: 0, alpha: 0, d: 0.1, theta: 0 }
    ],
    robotCount: 500
});
```

### SharedArrayBuffer 支持（高级）

对于极高性能场景，可以使用 SharedArrayBuffer 实现零拷贝通信：

```typescript
import { createFKWorker, isSharedArrayBufferAvailable } from 'trajx-wasm/workers';

// 检查是否可用（需要 cross-origin isolation）
if (isSharedArrayBufferAvailable()) {
    const fkWorker = await createFKWorker({
        robotName: 'ur5',
        robotCount: 500,
        useSharedBuffer: true  // 启用共享内存
    });

    // 获取共享内存视图
    const views = fkWorker.getBufferViews();

    // 直接写入共享内存
    for (let i = 0; i < views.jointAngles.length; i++) {
        views.jointAngles[i] = Math.sin(time + i * 0.01);
    }

    // 触发计算（零拷贝）
    await fkWorker.computeFKShared();

    // 直接从共享内存读取结果
    for (let i = 0; i < 500; i++) {
        const offset = i * 16;
        matrix.fromArray(views.transforms, offset);
        // ...
    }
}
```

**注意**: SharedArrayBuffer 需要设置正确的 HTTP 头：
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### 消息协议

Worker 使用标准的 postMessage API：

```typescript
// Main → Worker
{ type: 'init', robotName?: string, dhParams?: DhParam[], robotCount: number }
{ type: 'compute-fk', jointAngles: Float32Array }
{ type: 'compute-fk-shared' }  // 使用 SharedArrayBuffer
{ type: 'update-config', robotCount?: number, dhParams?: DhParam[] }
{ type: 'terminate' }

// Worker → Main
{ type: 'ready', jointCount: number, linkCount: number, supportedRobots: string[] }
{ type: 'fk-result', transforms: Float32Array, computeTimeMs: number }
{ type: 'fk-result-shared', computeTimeMs: number }
{ type: 'error', message: string }
```

### 支持的机器人

查询内置 DH 数据库：

```typescript
import { listSupportedRobots } from 'trajx-wasm/workers';

const robots = await listSupportedRobots();
console.log('Available robots:', robots);
// 输出: ['ur3', 'ur5', 'ur10', 'kuka_iiwa7', 'fanuc_lr_mate_200id', ...]
```

### 性能对比

| 场景 | 主线程 FK | Worker FK | 优势 |
|-----|----------|-----------|-----|
| 500 robots | 0.3ms 阻塞渲染 | 0.3ms 后台计算 | 渲染流畅 60fps |
| 1000 robots | 0.6ms 阻塞渲染 | 0.6ms 后台计算 | 渲染流畅 60fps |

**关键优势**: Worker 不阻塞主线程，即使 FK 计算需要更长时间，渲染循环仍然保持流畅。

### 与 React 集成

```tsx
import { useEffect, useRef, useState } from 'react';
import { createFKWorker, FKWorkerInstance } from 'trajx-wasm/workers';

function useFK Worker(robotName: string, robotCount: number) {
    const workerRef = useRef<FKWorkerInstance | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        createFKWorker({ robotName, robotCount }).then(worker => {
            if (mounted) {
                workerRef.current = worker;
                setReady(true);
            } else {
                worker.terminate();
            }
        });

        return () => {
            mounted = false;
            workerRef.current?.terminate();
        };
    }, [robotName, robotCount]);

    return { worker: workerRef.current, ready };
}

// 使用
function RobotVisualization() {
    const { worker, ready } = useFKWorker('ur5', 500);

    useEffect(() => {
        if (!ready || !worker) return;

        const animate = async () => {
            const jointAngles = generateJointAngles();
            const { transforms } = await worker.computeFK(jointAngles);
            updateMeshes(transforms);
            requestAnimationFrame(animate);
        };

        animate();
    }, [ready, worker]);

    return <canvas id="robot-canvas" />;
}
```

---

## 常见问题

### Q: IK 返回 "Joint limit violation" 错误

**原因**: 目标位姿可能导致某些关节超出限制。

**解决方案**:
- 检查目标位姿是否在机器人工作空间内
- 尝试使用不同的 seed 角度
- 使用 `inverseKinematicsAll` 获取多个解并选择合适的

### Q: FK/IK 结果不一致

**检查**:
1. 确保使用相同的关节角度数组
2. 验证 `robot.usesDhForFk()` 返回 `true`
3. 检查是否有工具偏移影响

### Q: 如何判断机器人是否支持解析 IK？

```javascript
if (robot.supportsAnalyticalIk()) {
    console.log('支持解析 IK，速度更快');
} else {
    console.log('使用数值 IK');
}
```

解析 IK 支持的条件：
- 6-DOF 机器人
- 具有球腕结构（最后三个关节轴交于一点）
- 已加载匹配的 DH 参数

### Q: 多解 IK 返回 0 个解

可能原因：
- 目标位姿超出工作空间
- 目标位姿需要超出关节限制的角度
- 奇异位置

### Q: 如何提高 IK 精度？

```javascript
// 使用更好的 seed
const seed = previousJoints; // 使用上一次的关节角度

// 验证结果
const result = robot.inverseKinematics(target, seed);
if (result.success) {
    const verifyPose = robot.forwardKinematics(result.solution);
    const error = /* 计算误差 */;
    if (error > threshold) {
        // 尝试其他方法
    }
}
```

---

## 性能参考

| 操作 | 典型耗时 |
|------|----------|
| FK (6-DOF) | ~5 µs |
| 数值 IK | ~100 µs |
| 解析 IK (所有解) | ~1 ms |
| 雅可比计算 | ~10 µs |
| 工作空间分析 | ~20 µs |

---

## 文件结构

```
crates/trajx-wasm/
├── build.sh              # 构建脚本
├── GUIDE.md              # 本使用指南（中文）
├── README.md             # 英文说明
├── Cargo.toml            # Rust 包配置
├── src/
│   ├── lib.rs            # WASM 入口
│   ├── core_robot.rs     # Robot 类封装
│   ├── kinematics.rs     # 运动学函数
│   ├── types.rs          # 类型定义 (Pose, Position, ...)
│   ├── planning.rs       # 路径规划 (BiRRT, RRT*, PRM)
│   ├── motion.rs         # Motion-Centric API
│   ├── cable.rs          # 线缆配置
│   ├── collision.rs      # 碰撞检测
│   └── gpu_motion.rs     # GPU 加速规划
├── pkg/                  # 构建输出
└── examples/
    ├── index.html                  # 导航页面
    ├── motion-centric-demo.html    # Motion API + 碰撞避障
    ├── motion-collision-demo.html  # 碰撞感知运动详细示例
    ├── motion-cable-demo.html      # Motion + Cable 集成
    ├── advanced-planners-demo.html # BiRRT/RRT*/PRM 对比
    ├── gpu-batch-planning-demo.html# GPU 批量规划
    └── ...
```

---

## 更多资源

### 交互式示例

| 示例 | 描述 |
|-----|------|
| [导航页面](examples/index.html) | 所有示例的导航入口 |
| [Motion-Centric Demo](examples/motion-centric-demo.html) | 运动 API + 碰撞避障测试 |
| [Motion-Collision Demo](examples/motion-collision-demo.html) | 碰撞感知运动详细测试 |
| [Motion + Cable Demo](examples/motion-cable-demo.html) | Motion API + 线缆集成测试 |
| [Advanced Planners](examples/advanced-planners-demo.html) | BiRRT/RRT*/PRM 规划器对比 |
| [GPU Batch Planning](examples/gpu-batch-planning-demo.html) | GPU 加速批量规划 |

### 相关文档

- [trajx-core 文档](../trajx-core/): 核心运动学库
- [trajx-planning 文档](../trajx-planning/): 路径规划库
- [URDF 规范](http://wiki.ros.org/urdf/XML): 机器人描述格式
