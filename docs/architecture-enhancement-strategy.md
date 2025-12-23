# RoboViz 架构增强实施策略

## 概述

本文档定义了 RoboViz 架构优化的完整实施策略，按优先级分阶段实施，确保系统逐步演进为工业级机器人可视化平台。

## 实施原则

1. **渐进式演进** - 每个阶段独立可交付，不影响现有功能
2. **向后兼容** - 新增 API 不破坏现有协议
3. **性能优先** - 架构设计考虑高频数据场景
4. **可测试性** - 每个模块包含测试策略

---

## Phase 1: 实时数据流架构 (P0)

### 目标
支持工业机器人高频实时数据传输，满足 1kHz 控制频率需求。

### 设计

#### 1.1 新增流式协议层

```typescript
// packages/core/src/streaming/types.ts

/**
 * 数据流类型定义
 */
export type StreamType =
  | 'joint_state'      // 关节状态 (位置/速度/力矩)
  | 'tcp_pose'         // TCP 位姿
  | 'sensor_data'      // 传感器数据
  | 'point_cloud'      // 点云数据
  | 'force_torque';    // 力/力矩传感器

/**
 * 流配置
 */
export interface StreamConfig {
  streamId: string;
  type: StreamType;
  robotId?: string;
  sensorId?: string;
  frequency: number;           // 目标频率 (Hz)
  bufferSize: number;          // 环形缓冲区大小
  compression?: 'none' | 'lz4' | 'zstd';
  priority: 'realtime' | 'high' | 'normal';
}

/**
 * 流状态
 */
export interface StreamState {
  streamId: string;
  status: 'active' | 'paused' | 'error';
  actualFrequency: number;
  latency: number;             // ms
  droppedFrames: number;
  bufferUsage: number;         // 0-1
}

/**
 * 关节状态数据帧
 */
export interface JointStateFrame {
  timestamp: number;           // 微秒级时间戳
  positions: Float64Array;
  velocities?: Float64Array;
  accelerations?: Float64Array;
  torques?: Float64Array;
  currents?: Float64Array;
}

/**
 * TCP 位姿数据帧
 */
export interface TcpPoseFrame {
  timestamp: number;
  position: Float64Array;      // [x, y, z]
  orientation: Float64Array;   // [w, x, y, z] quaternion
  linearVelocity?: Float64Array;
  angularVelocity?: Float64Array;
}
```

#### 1.2 二进制传输协议

```typescript
// packages/core/src/streaming/binary-protocol.ts

/**
 * 高性能二进制消息格式
 *
 * Header (16 bytes):
 * - Magic Number: 4 bytes (0x52564953 = "RVIS")
 * - Version: 1 byte
 * - Message Type: 1 byte
 * - Stream ID: 2 bytes
 * - Timestamp: 8 bytes (microseconds)
 *
 * Payload: Variable length
 */

export const BINARY_MAGIC = 0x52564953;

export enum BinaryMessageType {
  JOINT_STATE = 0x01,
  TCP_POSE = 0x02,
  POINT_CLOUD = 0x03,
  SENSOR_DATA = 0x04,
  FORCE_TORQUE = 0x05,
  STREAM_CONTROL = 0x10,
  STREAM_STATUS = 0x11,
}

export class BinaryProtocol {
  private encoder: TextEncoder;
  private decoder: TextDecoder;

  encodeJointState(streamId: number, frame: JointStateFrame): ArrayBuffer;
  decodeJointState(buffer: ArrayBuffer): { streamId: number; frame: JointStateFrame };

  encodeTcpPose(streamId: number, frame: TcpPoseFrame): ArrayBuffer;
  decodeTcpPose(buffer: ArrayBuffer): { streamId: number; frame: TcpPoseFrame };
}
```

#### 1.3 流管理器

```typescript
// packages/core/src/streaming/stream-manager.ts

export interface StreamManager {
  // 创建数据流
  createStream(config: StreamConfig): Promise<string>;

  // 销毁数据流
  destroyStream(streamId: string): Promise<void>;

  // 暂停/恢复
  pauseStream(streamId: string): void;
  resumeStream(streamId: string): void;

  // 订阅数据
  subscribe<T>(streamId: string, callback: (data: T) => void): () => void;

  // 获取流状态
  getStreamState(streamId: string): StreamState;

  // 获取所有活跃流
  getActiveStreams(): StreamState[];
}
```

#### 1.4 新增 API

```typescript
// JSON-RPC API 扩展

// 创建数据流
'stream.create': StreamConfig → { streamId: string }

// 订阅数据流 (启动数据推送)
'stream.subscribe': {
  streamId: string;
  events?: StreamType[];  // 可选择性订阅
} → { success: boolean }

// 取消订阅
'stream.unsubscribe': { streamId: string } → { success: boolean }

// 暂停/恢复
'stream.pause': { streamId: string } → { success: boolean }
'stream.resume': { streamId: string } → { success: boolean }

// 获取状态
'stream.getState': { streamId: string } → StreamState
'stream.listActive': {} → StreamState[]

// 销毁流
'stream.destroy': { streamId: string } → { success: boolean }
```

### 实施步骤

1. **Week 1-2**: 设计并实现 `BinaryProtocol` 和类型定义
2. **Week 2-3**: 实现 `StreamManager` 核心逻辑
3. **Week 3-4**: 扩展 WebSocket Transport 支持二进制帧
4. **Week 4-5**: 实现 JSON-RPC API 层
5. **Week 5-6**: 添加 SDK 支持和测试

### 交付物

- `packages/core/src/streaming/` 目录
- 更新的 API 文档
- 性能基准测试报告

---

## Phase 2: 机器视觉集成层 (P0)

### 目标
支持点云、相机视图、标定可视化等机器视觉核心功能。

### 设计

#### 2.1 点云数据结构

```typescript
// packages/core/src/vision/types.ts

/**
 * 点云格式
 */
export type PointCloudFormat = 'xyz' | 'xyzrgb' | 'xyzi' | 'xyzrgba' | 'pcd' | 'ply';

/**
 * 点云数据
 */
export interface PointCloudData {
  id: string;
  format: PointCloudFormat;
  points: Float32Array;        // 交错存储 [x,y,z, x,y,z, ...]
  colors?: Uint8Array;         // [r,g,b,a, r,g,b,a, ...] 或 [r,g,b, ...]
  intensities?: Float32Array;
  normals?: Float32Array;
  pointCount: number;
  bounds: {
    min: Vector3;
    max: Vector3;
  };
}

/**
 * 点云可视化配置
 */
export interface PointCloudVisualization {
  pointSize: number;
  colorMode: 'rgb' | 'intensity' | 'height' | 'normal' | 'uniform';
  uniformColor?: string;
  heightColorMap?: 'jet' | 'rainbow' | 'grayscale';
  intensityRange?: [number, number];
  opacity: number;
  visible: boolean;
}

/**
 * 相机内参
 */
export interface CameraIntrinsics {
  width: number;
  height: number;
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  distortionModel: 'none' | 'plumb_bob' | 'fisheye';
  distortionCoeffs?: number[];
}

/**
 * 相机外参
 */
export interface CameraExtrinsics {
  parentFrameId: string;
  transform: Transform;
}

/**
 * 相机视图配置
 */
export interface CameraView {
  id: string;
  name: string;
  intrinsics: CameraIntrinsics;
  extrinsics: CameraExtrinsics;
  imageStreamId?: string;      // 关联的图像流
  showFrustum: boolean;
  frustumColor: string;
  frustumDepth: number;        // 视锥体显示深度
}

/**
 * 手眼标定结果
 */
export interface HandEyeCalibration {
  id: string;
  robotId: string;
  cameraId: string;
  type: 'eye_in_hand' | 'eye_to_hand';
  transform: Transform;        // 相机到末端/基座的变换
  reprojectionError?: number;
}

/**
 * 图像叠加配置
 */
export interface ImageOverlay {
  cameraId: string;
  imageData: ArrayBuffer | string;  // base64 或二进制
  format: 'jpeg' | 'png' | 'raw';
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'overlay';
}
```

#### 2.2 点云渲染器

```typescript
// packages/core/src/components/PointCloud.tsx

export interface PointCloudProps {
  data: PointCloudData;
  visualization?: PointCloudVisualization;
  onPointHover?: (index: number, position: Vector3) => void;
  onPointClick?: (index: number, position: Vector3) => void;
}

// 使用 Three.js Points + BufferGeometry
// 支持 GPU instancing 和 LOD
```

#### 2.3 相机视图渲染器

```typescript
// packages/core/src/components/CameraView.tsx

export interface CameraViewProps {
  camera: CameraView;
  showImage?: boolean;
  imageOverlay?: ImageOverlay;
  showProjectedPoints?: boolean;
  projectedPointCloud?: string;  // 点云 ID
}

// 渲染相机视锥体
// 可选渲染相机画面 (texture plane)
// 支持点云投影显示
```

#### 2.4 新增 API

```typescript
// 点云 API
'pointCloud.load': {
  id: string;
  data: PointCloudData | string;  // 数据或 URL
  visualization?: PointCloudVisualization;
} → { success: boolean; pointCount: number }

'pointCloud.update': {
  id: string;
  data: PointCloudData;
} → { success: boolean }

'pointCloud.setVisualization': {
  id: string;
  options: Partial<PointCloudVisualization>;
} → { success: boolean }

'pointCloud.remove': { id: string } → { success: boolean }

'pointCloud.clear': {} → { success: boolean }

// 相机视图 API
'camera.addView': CameraView → { success: boolean }

'camera.removeView': { id: string } → { success: boolean }

'camera.setImage': ImageOverlay → { success: boolean }

'camera.clearImage': { cameraId: string } → { success: boolean }

// 标定 API
'calibration.showHandEye': HandEyeCalibration → { success: boolean }

'calibration.hideHandEye': { id: string } → { success: boolean }

// 投影 API
'vision.projectPointCloud': {
  pointCloudId: string;
  cameraId: string;
} → { projectedPoints: Vector2[] }
```

### 实施步骤

1. **Week 1-2**: 点云数据结构和基础渲染
2. **Week 2-3**: 点云 LOD 和大规模优化
3. **Week 3-4**: 相机视图渲染
4. **Week 4-5**: 图像叠加和投影功能
5. **Week 5-6**: 标定可视化和 API 完善

### 交付物

- `packages/core/src/vision/` 目录
- `packages/core/src/components/PointCloud.tsx`
- `packages/core/src/components/CameraView.tsx`
- 更新的 API 文档

---

## Phase 3: 坐标系管理系统 (P1)

### 目标
完善工业机器人多坐标系管理，支持用户坐标系、工具坐标系等工业标准功能。

### 设计

#### 3.1 坐标系类型定义

```typescript
// packages/core/src/frames/types.ts

/**
 * 坐标系类型
 */
export type FrameType =
  | 'world'      // 世界坐标系 (固定)
  | 'base'       // 机器人基座
  | 'flange'     // 法兰盘
  | 'tool'       // 工具坐标系
  | 'user'       // 用户坐标系
  | 'workpiece'  // 工件坐标系
  | 'sensor'     // 传感器坐标系
  | 'camera'     // 相机坐标系
  | 'custom';    // 自定义

/**
 * 坐标系节点
 */
export interface CoordinateFrame {
  id: string;
  name: string;
  type: FrameType;
  parentFrameId: string | null;  // null = world
  transform: Transform;          // 相对于父坐标系
  robotId?: string;              // 关联的机器人

  // 可视化选项
  visualization: FrameVisualization;
}

/**
 * 坐标系可视化配置
 */
export interface FrameVisualization {
  visible: boolean;
  axisLength: number;
  axisThickness: number;
  showLabel: boolean;
  labelSize: number;
  colors: {
    x: string;
    y: string;
    z: string;
  };
}

/**
 * 坐标系树
 */
export interface FrameTree {
  frames: Map<string, CoordinateFrame>;
  getWorldTransform(frameId: string): Transform;
  getRelativeTransform(fromId: string, toId: string): Transform;
  addFrame(frame: CoordinateFrame): void;
  removeFrame(id: string): void;
  updateTransform(id: string, transform: Transform): void;
}

/**
 * 活跃坐标系设置
 */
export interface ActiveFrames {
  robotId: string;
  userFrameId: string | null;
  toolFrameId: string | null;
  workpieceFrameId: string | null;
}
```

#### 3.2 坐标系管理器

```typescript
// packages/core/src/frames/frame-manager.ts

export class FrameManager {
  private tree: FrameTree;
  private activeFrames: Map<string, ActiveFrames>;  // robotId -> ActiveFrames

  // CRUD 操作
  addFrame(frame: CoordinateFrame): void;
  removeFrame(id: string): void;
  getFrame(id: string): CoordinateFrame | undefined;
  getAllFrames(): CoordinateFrame[];

  // 变换计算
  getWorldTransform(frameId: string): Transform;
  transformPoint(point: Vector3, fromFrame: string, toFrame: string): Vector3;
  transformPose(pose: Pose, fromFrame: string, toFrame: string): Pose;

  // 活跃坐标系管理
  setActiveUserFrame(robotId: string, frameId: string | null): void;
  setActiveToolFrame(robotId: string, frameId: string | null): void;
  getActiveFrames(robotId: string): ActiveFrames;

  // 可视化
  showFrameTree(visible: boolean): void;
  highlightFrame(id: string): void;
}
```

#### 3.3 坐标系树可视化组件

```typescript
// packages/core/src/components/FrameTreeView.tsx

export interface FrameTreeViewProps {
  visible: boolean;
  showConnections: boolean;  // 显示父子关系连线
  connectionColor: string;
  interactiveFrames?: string[];  // 可拖拽的坐标系
  onFrameClick?: (frameId: string) => void;
  onFrameTransformChange?: (frameId: string, transform: Transform) => void;
}
```

#### 3.4 新增 API

```typescript
// 坐标系管理 API
'frame.add': CoordinateFrame → { success: boolean }

'frame.remove': { id: string } → { success: boolean }

'frame.update': {
  id: string;
  transform?: Transform;
  visualization?: Partial<FrameVisualization>;
} → { success: boolean }

'frame.get': { id: string } → CoordinateFrame

'frame.list': {} → CoordinateFrame[]

// 活跃坐标系 API
'frame.setActiveUser': { robotId: string; frameId: string | null } → { success: boolean }

'frame.setActiveTool': { robotId: string; frameId: string | null } → { success: boolean }

'frame.getActive': { robotId: string } → ActiveFrames

// 变换计算 API
'frame.getWorldTransform': { frameId: string } → Transform

'frame.transformPoint': {
  point: Vector3;
  fromFrame: string;
  toFrame: string
} → Vector3

'frame.transformPose': {
  pose: Pose;
  fromFrame: string;
  toFrame: string
} → Pose

// 可视化 API
'frame.showTree': { visible: boolean; options?: Partial<FrameTreeViewProps> } → { success: boolean }

'frame.highlight': { frameId: string; duration?: number } → { success: boolean }
```

### 实施步骤

1. **Week 1**: 坐标系数据结构和 FrameTree 实现
2. **Week 2**: FrameManager 核心逻辑
3. **Week 3**: 坐标系可视化组件
4. **Week 4**: 坐标系树可视化
5. **Week 5**: API 层和与机器人组件集成

### 交付物

- `packages/core/src/frames/` 目录
- `packages/core/src/components/CoordinateFrame.tsx`
- `packages/core/src/components/FrameTreeView.tsx`
- 更新的 API 文档

---

## Phase 4: 碰撞检测可视化架构 (P1)

### 目标
提供实时碰撞预警、安全区域定义和碰撞检测结果可视化。

### 设计

#### 4.1 碰撞相关类型

```typescript
// packages/core/src/collision/types.ts

/**
 * 碰撞体类型
 */
export type CollisionGeometryType = 'box' | 'sphere' | 'cylinder' | 'capsule' | 'mesh' | 'convexHull';

/**
 * 碰撞体定义
 */
export interface CollisionGeometry {
  id: string;
  type: CollisionGeometryType;
  params: CollisionParams;
  transform: Transform;  // 相对于父对象
  parentId: string;      // 机器人 link ID 或障碍物 ID
}

export type CollisionParams =
  | { type: 'box'; size: Vector3 }
  | { type: 'sphere'; radius: number }
  | { type: 'cylinder'; radius: number; height: number }
  | { type: 'capsule'; radius: number; height: number }
  | { type: 'mesh'; vertices: Float32Array; indices: Uint32Array }
  | { type: 'convexHull'; points: Float32Array };

/**
 * 安全区域等级
 */
export type SafetyLevel = 'info' | 'warning' | 'danger' | 'stop';

/**
 * 安全区域定义
 */
export interface SafetyZone {
  id: string;
  name: string;
  type: CollisionGeometryType;
  params: CollisionParams;
  transform: Transform;
  level: SafetyLevel;
  enabled: boolean;

  // 可视化
  visualization: SafetyZoneVisualization;

  // 触发条件
  triggerOnRobots?: string[];  // 指定机器人，空 = 所有
  triggerOnLinks?: string[];   // 指定 link，空 = 所有
}

export interface SafetyZoneVisualization {
  visible: boolean;
  fillColor: string;
  fillOpacity: number;
  wireframe: boolean;
  wireframeColor: string;
  pulseOnWarning: boolean;
}

/**
 * 碰撞检测结果
 */
export interface CollisionResult {
  colliding: boolean;
  pairs: CollisionPair[];
  timestamp: number;
}

export interface CollisionPair {
  objectA: { type: 'robot' | 'obstacle'; id: string; linkName?: string };
  objectB: { type: 'robot' | 'obstacle' | 'safetyZone'; id: string; linkName?: string };
  contactPoints?: Vector3[];
  penetrationDepth?: number;
  normal?: Vector3;
}

/**
 * 碰撞可视化配置
 */
export interface CollisionVisualizationConfig {
  showCollisionGeometry: boolean;
  collisionGeometryOpacity: number;
  highlightCollisions: boolean;
  collisionHighlightColor: string;
  showContactPoints: boolean;
  contactPointSize: number;
  showPenetrationVectors: boolean;
  showSafetyZones: boolean;
}
```

#### 4.2 碰撞管理器

```typescript
// packages/core/src/collision/collision-manager.ts

export interface CollisionManager {
  // 碰撞几何体管理
  setCollisionGeometryVisible(objectId: string, visible: boolean): void;
  getCollisionGeometries(objectId: string): CollisionGeometry[];

  // 安全区域管理
  addSafetyZone(zone: SafetyZone): void;
  removeSafetyZone(id: string): void;
  updateSafetyZone(id: string, updates: Partial<SafetyZone>): void;
  getSafetyZones(): SafetyZone[];

  // 碰撞结果可视化
  showCollisionResult(result: CollisionResult): void;
  clearCollisionResult(): void;

  // 配置
  setVisualizationConfig(config: Partial<CollisionVisualizationConfig>): void;
  getVisualizationConfig(): CollisionVisualizationConfig;

  // 事件订阅
  onCollision(callback: (result: CollisionResult) => void): () => void;
  onSafetyZoneEnter(callback: (zoneId: string, objectId: string) => void): () => void;
  onSafetyZoneExit(callback: (zoneId: string, objectId: string) => void): () => void;
}
```

#### 4.3 碰撞可视化组件

```typescript
// packages/core/src/components/CollisionVisualizer.tsx

export interface CollisionVisualizerProps {
  config: CollisionVisualizationConfig;
  collisionResult?: CollisionResult;
}

// packages/core/src/components/SafetyZone.tsx

export interface SafetyZoneProps {
  zone: SafetyZone;
  isTriggered?: boolean;
  onEdit?: (zone: SafetyZone) => void;
}
```

#### 4.4 新增 API

```typescript
// 碰撞几何体 API
'collision.showGeometry': {
  objectId: string;
  visible: boolean;
  opacity?: number;
} → { success: boolean }

'collision.getGeometries': { objectId: string } → CollisionGeometry[]

// 安全区域 API
'safetyZone.add': SafetyZone → { success: boolean }

'safetyZone.remove': { id: string } → { success: boolean }

'safetyZone.update': { id: string; updates: Partial<SafetyZone> } → { success: boolean }

'safetyZone.list': {} → SafetyZone[]

'safetyZone.setEnabled': { id: string; enabled: boolean } → { success: boolean }

// 碰撞检测 API (Bridge 增强)
'collision.check': {
  robotId: string;
  angles: number[];
  includeObstacles?: string[];  // 可选指定障碍物
  includeSafetyZones?: boolean;
} → CollisionResult

'collision.checkPath': {
  robotId: string;
  path: number[][];  // 关节角度路径
  resolution?: number;
} → { collisionFree: boolean; firstCollisionIndex?: number; result?: CollisionResult }

// 可视化配置 API
'collision.setVisualization': CollisionVisualizationConfig → { success: boolean }

'collision.getVisualization': {} → CollisionVisualizationConfig

// 碰撞结果显示 API
'collision.showResult': CollisionResult → { success: boolean }

'collision.clearResult': {} → { success: boolean }
```

#### 4.5 事件通知

```typescript
// 新增事件类型
'collision.detected': CollisionResult

'safetyZone.entered': {
  zoneId: string;
  zoneName: string;
  level: SafetyLevel;
  objectId: string;
  objectType: 'robot' | 'obstacle';
  linkName?: string;
}

'safetyZone.exited': {
  zoneId: string;
  objectId: string;
}
```

### 实施步骤

1. **Week 1**: 碰撞相关类型定义
2. **Week 2**: SafetyZone 组件实现
3. **Week 3**: CollisionVisualizer 组件
4. **Week 4**: CollisionManager 实现
5. **Week 5**: API 层和事件系统

### 交付物

- `packages/core/src/collision/` 目录
- `packages/core/src/components/SafetyZone.tsx`
- `packages/core/src/components/CollisionVisualizer.tsx`
- 更新的 API 文档

---

## Phase 5: 多机器人协调架构 (P2)

### 目标
支持多机器人场景下的协调管理、同步播放和工作区划分。

### 设计

#### 5.1 多机器人类型定义

```typescript
// packages/core/src/multi-robot/types.ts

/**
 * 机器人组协调类型
 */
export type CoordinationType =
  | 'independent'    // 独立运动
  | 'synchronized'   // 时间同步
  | 'master_slave'   // 主从模式
  | 'cooperative';   // 协作模式 (共同持物等)

/**
 * 机器人组定义
 */
export interface RobotGroup {
  id: string;
  name: string;
  robotIds: string[];
  coordinationType: CoordinationType;
  masterRobotId?: string;           // 主从模式下的主机器人

  // 协作配置
  cooperativeConfig?: CooperativeConfig;
}

/**
 * 协作配置
 */
export interface CooperativeConfig {
  sharedObjectId?: string;          // 共同持有的物体
  relativePoseConstraint?: Transform;  // 相对位姿约束
}

/**
 * 同步轨迹
 */
export interface SynchronizedTrajectory {
  groupId: string;
  trajectories: {
    robotId: string;
    trajectoryId: string;
    timeOffset: number;             // 时间偏移 (ms)
  }[];
  totalDuration: number;
}

/**
 * 工作区定义
 */
export interface Workspace {
  id: string;
  name: string;
  robotId: string;                  // 关联的机器人
  type: 'reachable' | 'shared' | 'exclusive' | 'forbidden';
  geometry: WorkspaceGeometry;
  visualization: WorkspaceVisualization;
}

export type WorkspaceGeometry =
  | { type: 'sphere'; center: Vector3; radius: number }
  | { type: 'cylinder'; center: Vector3; radius: number; height: number; axis: Vector3 }
  | { type: 'box'; min: Vector3; max: Vector3 }
  | { type: 'mesh'; vertices: Float32Array; indices: Uint32Array };

export interface WorkspaceVisualization {
  visible: boolean;
  fillColor: string;
  fillOpacity: number;
  wireframe: boolean;
  wireframeColor: string;
}
```

#### 5.2 多机器人管理器

```typescript
// packages/core/src/multi-robot/multi-robot-manager.ts

export interface MultiRobotManager {
  // 机器人组管理
  createGroup(group: RobotGroup): void;
  deleteGroup(groupId: string): void;
  getGroup(groupId: string): RobotGroup | undefined;
  getGroups(): RobotGroup[];

  addRobotToGroup(groupId: string, robotId: string): void;
  removeRobotFromGroup(groupId: string, robotId: string): void;

  // 同步控制
  setCoordinationType(groupId: string, type: CoordinationType): void;
  setMasterRobot(groupId: string, robotId: string): void;

  // 同步播放
  loadSynchronizedTrajectory(syncTraj: SynchronizedTrajectory): void;
  playSynchronized(groupId: string, options?: PlaybackOptions): void;
  pauseSynchronized(groupId: string): void;
  seekSynchronized(groupId: string, time: number): void;

  // 工作区管理
  addWorkspace(workspace: Workspace): void;
  removeWorkspace(id: string): void;
  updateWorkspace(id: string, updates: Partial<Workspace>): void;
  getWorkspaces(): Workspace[];

  // 工作区计算 (可选，可委托给 Bridge)
  calculateReachableWorkspace(robotId: string, resolution?: number): Promise<Workspace>;
  calculateSharedWorkspace(robotIds: string[]): Promise<Workspace>;
}
```

#### 5.3 新增 API

```typescript
// 机器人组 API
'robotGroup.create': RobotGroup → { success: boolean }

'robotGroup.delete': { groupId: string } → { success: boolean }

'robotGroup.list': {} → RobotGroup[]

'robotGroup.addRobot': { groupId: string; robotId: string } → { success: boolean }

'robotGroup.removeRobot': { groupId: string; robotId: string } → { success: boolean }

'robotGroup.setCoordination': {
  groupId: string;
  type: CoordinationType;
  masterRobotId?: string;
} → { success: boolean }

// 同步播放 API
'robotGroup.loadSyncTrajectory': SynchronizedTrajectory → { success: boolean }

'robotGroup.playSynchronized': {
  groupId: string;
  options?: PlaybackOptions
} → { success: boolean }

'robotGroup.pauseSynchronized': { groupId: string } → { success: boolean }

'robotGroup.seekSynchronized': { groupId: string; time: number } → { success: boolean }

// 工作区 API
'workspace.add': Workspace → { success: boolean }

'workspace.remove': { id: string } → { success: boolean }

'workspace.update': { id: string; updates: Partial<Workspace> } → { success: boolean }

'workspace.list': {} → Workspace[]

// 工作区计算 (Bridge)
'workspace.calculateReachable': {
  robotId: string;
  resolution?: number
} → Workspace

'workspace.calculateShared': {
  robotIds: string[]
} → Workspace
```

### 实施步骤

1. **Week 1**: 多机器人类型定义
2. **Week 2**: RobotGroup 管理实现
3. **Week 3**: 同步播放功能
4. **Week 4**: Workspace 可视化
5. **Week 5**: API 层和集成测试

---

## Phase 6: 性能优化架构 (P2)

### 目标
优化大规模场景性能，支持 Web Worker、LOD 和 GPU instancing。

### 设计

#### 6.1 性能配置

```typescript
// packages/core/src/performance/types.ts

/**
 * 性能配置
 */
export interface PerformanceConfig {
  // Web Worker
  useWorkerForParsing: boolean;      // URDF 解析使用 Worker
  useWorkerForPointCloud: boolean;   // 点云处理使用 Worker

  // LOD
  lodEnabled: boolean;
  lodDistances: [number, number, number];  // 切换距离阈值

  // 渲染优化
  maxVisibleRobots: number;
  maxVisiblePointCloudPoints: number;
  frustumCulling: boolean;
  occlusionCulling: boolean;

  // 轨迹优化
  trajectoryDownsampleThreshold: number;  // 点数超过此值时降采样
  trajectoryDownsampleFactor: number;

  // 内存管理
  maxCachedURDFs: number;
  maxCachedPointClouds: number;
  autoDisposeUnusedGeometry: boolean;

  // 帧率控制
  targetFPS: number;
  adaptiveQuality: boolean;
}

/**
 * 性能监控数据
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;

  // 内存
  usedJSHeapSize: number;
  totalJSHeapSize: number;

  // 自定义
  activeStreams: number;
  pendingRequests: number;
}
```

#### 6.2 性能管理器

```typescript
// packages/core/src/performance/performance-manager.ts

export interface PerformanceManager {
  // 配置
  setConfig(config: Partial<PerformanceConfig>): void;
  getConfig(): PerformanceConfig;

  // 监控
  getMetrics(): PerformanceMetrics;
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void;

  // 资源管理
  clearCache(): void;
  preloadURDF(url: string): Promise<void>;
  disposeUnused(): void;

  // 自适应质量
  enableAdaptiveQuality(targetFPS: number): void;
  disableAdaptiveQuality(): void;
}
```

#### 6.3 Worker 架构

```typescript
// packages/core/src/workers/urdf-worker.ts
// 使用 Comlink 简化 Worker 通信

export interface URDFWorkerAPI {
  parseURDF(urdfString: string): Promise<ParsedURDF>;
  loadURDFFromURL(url: string): Promise<ParsedURDF>;
}

// packages/core/src/workers/pointcloud-worker.ts

export interface PointCloudWorkerAPI {
  parsePCD(data: ArrayBuffer): Promise<PointCloudData>;
  parsePLY(data: ArrayBuffer): Promise<PointCloudData>;
  downsample(data: PointCloudData, factor: number): Promise<PointCloudData>;
  computeNormals(data: PointCloudData): Promise<PointCloudData>;
}
```

#### 6.4 新增 API

```typescript
// 性能配置 API
'performance.setConfig': Partial<PerformanceConfig> → { success: boolean }

'performance.getConfig': {} → PerformanceConfig

'performance.getMetrics': {} → PerformanceMetrics

// 资源管理 API
'performance.clearCache': {} → { success: boolean; freedBytes: number }

'performance.preload': { urls: string[] } → { success: boolean }

'performance.disposeUnused': {} → { success: boolean; freedCount: number }
```

---

## Phase 7: 调试诊断与场景管理 (P3)

### 目标
提供丰富的调试诊断功能和场景持久化能力。

### 设计

#### 7.1 诊断类型

```typescript
// packages/core/src/diagnostic/types.ts

/**
 * 关节诊断数据类型
 */
export type DiagnosticDataType =
  | 'position'
  | 'velocity'
  | 'acceleration'
  | 'torque'
  | 'current'
  | 'temperature';

/**
 * 诊断显示配置
 */
export interface DiagnosticDisplayConfig {
  robotId: string;
  dataTypes: DiagnosticDataType[];
  displayMode: 'chart' | 'bar' | 'text';
  updateInterval: number;  // ms
  historyLength: number;   // 历史数据点数
}

/**
 * 工作空间可视化类型
 */
export type WorkspaceVisType = 'reachable' | 'dexterous' | 'force';

/**
 * 奇异点可视化配置
 */
export interface SingularityConfig {
  robotId: string;
  showSingularSurface: boolean;
  proximityThreshold: number;
  warningColor: string;
}
```

#### 7.2 场景管理类型

```typescript
// packages/core/src/scene-management/types.ts

/**
 * 场景快照
 */
export interface SceneSnapshot {
  id: string;
  name: string;
  timestamp: number;
  version: string;

  // 完整状态
  scene: SceneConfig;
  robots: RobotState[];
  obstacles: ObstacleData[];
  trajectories: TrajectoryState[];
  waypoints: WaypointData[];
  camera: CameraState;
  frames: CoordinateFrame[];
  safetyZones: SafetyZone[];

  // 元数据
  metadata?: Record<string, unknown>;
}

/**
 * 场景导出格式
 */
export type SceneExportFormat = 'json' | 'yaml' | 'xml';

/**
 * 场景导入选项
 */
export interface SceneImportOptions {
  merge: boolean;           // 合并还是替换
  includeRobots: boolean;
  includeTrajectories: boolean;
  includeWaypoints: boolean;
  includeObstacles: boolean;
  includeSafetyZones: boolean;
}
```

#### 7.3 新增 API

```typescript
// 诊断 API
'diagnostic.showJointData': DiagnosticDisplayConfig → { success: boolean }

'diagnostic.hideJointData': { robotId: string } → { success: boolean }

'diagnostic.showWorkspace': {
  robotId: string;
  type: WorkspaceVisType;
  resolution?: number;
} → { success: boolean }

'diagnostic.hideWorkspace': { robotId: string } → { success: boolean }

'diagnostic.showSingularity': SingularityConfig → { success: boolean }

'diagnostic.hideSingularity': { robotId: string } → { success: boolean }

// 场景管理 API
'scene.snapshot': { name: string; metadata?: Record<string, unknown> } → { snapshotId: string }

'scene.restore': { snapshotId: string } → { success: boolean }

'scene.listSnapshots': {} → SceneSnapshot[]

'scene.deleteSnapshot': { snapshotId: string } → { success: boolean }

'scene.export': { format: SceneExportFormat } → { data: string }

'scene.import': { data: string; format: SceneExportFormat; options?: SceneImportOptions } → { success: boolean }
```

---

## 实施时间线

```
Phase 1: 实时数据流架构     [====] 6 weeks   (P0)
Phase 2: 机器视觉集成       [====] 6 weeks   (P0)
Phase 3: 坐标系管理         [===]  5 weeks   (P1)
Phase 4: 碰撞检测可视化     [===]  5 weeks   (P1)
Phase 5: 多机器人协调       [===]  5 weeks   (P2)
Phase 6: 性能优化           [==]   4 weeks   (P2)
Phase 7: 诊断与场景管理     [==]   4 weeks   (P3)

总计: 约 35 weeks (8-9 个月)

建议并行实施:
- Phase 1 + Phase 3 可部分并行 (不同模块)
- Phase 4 + Phase 5 可部分并行 (不同模块)
- Phase 6 可贯穿始终，作为持续优化
```

---

## 技术债务清理计划

在开始新功能前，需先完成基础设施：

### Week 0: 基础设施准备

1. **补全 Transport 层实现**
   - `packages/core/src/transport/base.ts` - 抽象接口
   - `packages/core/src/transport/websocket.ts` - WebSocket 实现
   - `packages/core/src/transport/postmessage.ts` - PostMessage 实现
   - `packages/core/src/transport/direct.ts` - Direct 实现

2. **添加测试框架**
   - 配置 Vitest
   - 添加基础测试用例
   - 配置 CI pipeline

3. **SDK 基础实现**
   - TypeScript SDK 客户端
   - Python SDK 客户端骨架
   - Rust SDK 客户端骨架

---

## 文档更新计划

每个 Phase 完成后需更新：

1. `docs/architecture.md` - 架构图更新
2. `docs/api.md` - 新增 API 文档
3. `docs/protocol.md` - 协议变更
4. `CHANGELOG.md` - 版本变更记录

---

## 结语

本策略文档提供了 RoboViz 从基础可视化工具向工业级机器人可视化平台演进的完整路线图。每个阶段都是独立可交付的，同时为后续阶段奠定基础。

建议按优先级（P0 → P1 → P2 → P3）顺序实施，同时根据实际资源情况调整并行度。
