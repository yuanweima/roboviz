/**
 * RoboViz Diagnostic Types
 *
 * 调试诊断相关类型定义
 */

import type { Vector3, Transform } from '../types';

// ============================================================================
// Diagnostic Data Types
// ============================================================================

/**
 * 关节诊断数据类型
 */
export type JointDiagnosticDataType =
  | 'position'       // 位置 (rad)
  | 'velocity'       // 速度 (rad/s)
  | 'acceleration'   // 加速度 (rad/s²)
  | 'torque'         // 力矩 (Nm)
  | 'current'        // 电流 (A)
  | 'temperature'    // 温度 (°C)
  | 'power';         // 功率 (W)

/**
 * TCP 诊断数据类型
 */
export type TcpDiagnosticDataType =
  | 'position'       // 位置 (m)
  | 'orientation'    // 姿态 (quaternion)
  | 'linear_velocity'   // 线速度 (m/s)
  | 'angular_velocity'  // 角速度 (rad/s)
  | 'force'          // 力 (N)
  | 'torque';        // 力矩 (Nm)

/**
 * 诊断显示模式
 */
export type DiagnosticDisplayMode =
  | 'chart'          // 实时曲线图
  | 'bar'            // 柱状图
  | 'gauge'          // 仪表盘
  | 'text'           // 数值文本
  | 'heatmap';       // 热力图

/**
 * 诊断显示配置
 */
export interface DiagnosticDisplayConfig {
  /** 机器人 ID */
  robotId: string;

  /** 数据类型 */
  dataTypes: JointDiagnosticDataType[];

  /** 显示模式 */
  displayMode: DiagnosticDisplayMode;

  /** 更新间隔 (ms) */
  updateInterval: number;

  /** 历史数据点数 (用于 chart 模式) */
  historyLength: number;

  /** 是否显示网格 */
  showGrid?: boolean;

  /** 是否显示图例 */
  showLegend?: boolean;

  /** Y 轴范围 [min, max] (auto 如果未指定) */
  yRange?: [number, number];

  /** 显示位置 */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'floating';

  /** 窗口大小 */
  size?: { width: number; height: number };
}

// ============================================================================
// Workspace Visualization Types
// ============================================================================

/**
 * 工作空间可视化类型
 */
export type WorkspaceVisType =
  | 'reachable'      // 可达空间
  | 'dexterous'      // 灵巧空间
  | 'force';         // 力可达空间

/**
 * 工作空间可视化配置
 */
export interface WorkspaceVisConfig {
  /** 机器人 ID */
  robotId: string;

  /** 可视化类型 */
  type: WorkspaceVisType;

  /** 分辨率 (体素大小, 米) */
  resolution: number;

  /** 颜色映射 */
  colorMap: 'jet' | 'viridis' | 'grayscale';

  /** 透明度 */
  opacity: number;

  /** 是否显示边界 */
  showBoundary: boolean;

  /** 边界颜色 */
  boundaryColor: string;

  /** 切片模式 */
  sliceMode?: 'none' | 'x' | 'y' | 'z';

  /** 切片位置 (米) */
  slicePosition?: number;
}

// ============================================================================
// Singularity Types
// ============================================================================

/**
 * 奇异点类型
 */
export type SingularityType =
  | 'wrist'          // 手腕奇异
  | 'shoulder'       // 肩部奇异
  | 'elbow';         // 肘部奇异

/**
 * 奇异点可视化配置
 */
export interface SingularityConfig {
  /** 机器人 ID */
  robotId: string;

  /** 是否显示奇异面 */
  showSingularSurface: boolean;

  /** 接近阈值 (条件数或行列式值) */
  proximityThreshold: number;

  /** 警告颜色 */
  warningColor: string;

  /** 危险颜色 */
  dangerColor: string;

  /** 是否显示接近度指示器 */
  showProximityIndicator: boolean;

  /** 指示器位置 */
  indicatorPosition?: 'overlay' | 'panel';
}

/**
 * 奇异点状态
 */
export interface SingularityState {
  /** 机器人 ID */
  robotId: string;

  /** 奇异点类型 (如果接近奇异) */
  type?: SingularityType;

  /** 接近度 (0 = 远离, 1 = 奇异) */
  proximity: number;

  /** 雅可比矩阵条件数 */
  conditionNumber: number;

  /** 雅可比矩阵行列式 */
  determinant: number;

  /** 是否处于警告状态 */
  isWarning: boolean;

  /** 是否处于危险状态 */
  isDanger: boolean;
}

// ============================================================================
// Joint Limit Types
// ============================================================================

/**
 * 关节限位可视化配置
 */
export interface JointLimitConfig {
  /** 机器人 ID */
  robotId: string;

  /** 是否显示软限位 */
  showSoftLimits: boolean;

  /** 软限位阈值 (与硬限位的距离, rad) */
  softLimitThreshold: number;

  /** 软限位颜色 */
  softLimitColor: string;

  /** 硬限位颜色 */
  hardLimitColor: string;

  /** 是否显示接近度条 */
  showProximityBars: boolean;
}

/**
 * 关节限位状态
 */
export interface JointLimitState {
  /** 关节索引 */
  jointIndex: number;

  /** 关节名称 */
  jointName: string;

  /** 当前位置 */
  position: number;

  /** 下限 */
  lowerLimit: number;

  /** 上限 */
  upperLimit: number;

  /** 到下限的距离 (rad) */
  distanceToLower: number;

  /** 到上限的距离 (rad) */
  distanceToUpper: number;

  /** 是否接近软限位 */
  nearSoftLimit: boolean;

  /** 是否接近硬限位 */
  nearHardLimit: boolean;
}

// ============================================================================
// Velocity/Acceleration Visualization
// ============================================================================

/**
 * 速度/加速度可视化配置
 */
export interface VelocityVisConfig {
  /** 机器人 ID */
  robotId: string;

  /** 是否显示 TCP 速度向量 */
  showTcpVelocity: boolean;

  /** 速度向量缩放因子 */
  velocityScale: number;

  /** 速度颜色 */
  velocityColor: string;

  /** 是否显示加速度向量 */
  showAcceleration: boolean;

  /** 加速度向量缩放因子 */
  accelerationScale: number;

  /** 加速度颜色 */
  accelerationColor: string;

  /** 是否显示轨迹尾迹 */
  showTrail: boolean;

  /** 轨迹长度 (点数) */
  trailLength: number;
}

// ============================================================================
// Diagnostic Manager Types
// ============================================================================

/**
 * 诊断管理器接口
 */
export interface IDiagnosticManager {
  // 关节数据诊断
  showJointDiagnostic(config: DiagnosticDisplayConfig): void;
  hideJointDiagnostic(robotId: string): void;
  updateJointDiagnostic(robotId: string, config: Partial<DiagnosticDisplayConfig>): void;

  // 工作空间可视化
  showWorkspace(config: WorkspaceVisConfig): Promise<void>;
  hideWorkspace(robotId: string): void;

  // 奇异点可视化
  showSingularity(config: SingularityConfig): void;
  hideSingularity(robotId: string): void;
  getSingularityState(robotId: string): SingularityState | undefined;
  onSingularityChanged(callback: (state: SingularityState) => void): () => void;

  // 关节限位
  showJointLimits(config: JointLimitConfig): void;
  hideJointLimits(robotId: string): void;
  getJointLimitStates(robotId: string): JointLimitState[];
  onJointLimitWarning(callback: (state: JointLimitState) => void): () => void;

  // 速度/加速度可视化
  showVelocityVis(config: VelocityVisConfig): void;
  hideVelocityVis(robotId: string): void;

  // 全局控制
  hideAll(): void;
  getActiveDiagnostics(): string[];  // 返回活跃诊断的机器人 ID 列表
}

// ============================================================================
// Diagnostic Events
// ============================================================================

/**
 * 诊断事件类型
 */
export type DiagnosticEventType =
  | 'singularity_warning'
  | 'singularity_danger'
  | 'joint_limit_warning'
  | 'joint_limit_reached'
  | 'velocity_limit_warning'
  | 'torque_limit_warning';

/**
 * 诊断事件
 */
export interface DiagnosticEvent {
  type: DiagnosticEventType;
  timestamp: number;
  robotId: string;
  data: unknown;
}
