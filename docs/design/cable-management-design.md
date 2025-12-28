# Cable Management System Design / 线束管理系统设计

## 概述

本文档描述 RoboViz 线束管理系统的完整设计，该系统与 trajx 的 Cable-Aware Motion Planning 功能配合，提供工业机器人线束问题的完整解决方案。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     trajx (Rust/WASM)                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Cable-Aware Planner                         │    │
│  │  • CableConfig           • CableAwareState              │    │
│  │  • 累积旋转计算            • 状态扩展规划                  │    │
│  │  • 自动解缠策略            • 周期任务优化                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ WASM Interface
┌─────────────────────────────▼───────────────────────────────────┐
│                    RoboViz (TypeScript/React)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Cable Management Capability                    │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │    Types     │  │   Context    │  │    Hooks     │   │    │
│  │  │  (types.ts)  │  │  (Provider)  │  │  (useCable*) │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │ Visualizer   │  │  Analyzer    │  │   Panels     │   │    │
│  │  │  (3D渲染)    │  │  (分析工具)   │  │   (UI)      │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │ Existing Systems  │  │  Integration      │                   │
│  │ • Kinematics      │  │  • Process        │                   │
│  │ • Streaming       │  │  • Trajectory     │                   │
│  │ • Collision       │  │  • Protocol       │                   │
│  └───────────────────┘  └───────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## 模块结构

```
packages/core/src/capabilities/cable-management/
├── index.ts                      # 统一导出
├── types.ts                      # 类型定义
├── CableManagementContext.tsx    # Context + Provider
├── hooks/
│   ├── index.ts
│   ├── useCableState.ts          # 状态 hook
│   ├── useCableAnalysis.ts       # 分析 hook
│   ├── useCablePlanning.ts       # 规划 hook (trajx集成)
│   └── useCableVisualization.ts  # 可视化 hook
├── components/
│   ├── index.ts
│   ├── CableVisualizer.tsx       # 3D线束渲染
│   ├── CableTwistGauge.tsx       # 扭转仪表盘
│   ├── CableStatusIndicator.tsx  # 状态指示器
│   ├── CableConfigPanel.tsx      # 配置面板
│   └── CableTrajectoryOverlay.tsx # 轨迹叠加
├── utils/
│   ├── index.ts
│   ├── twist-calculator.ts       # 扭转计算（前端备用）
│   ├── spline-generator.ts       # 样条曲线生成
│   └── color-mapping.ts          # 应力颜色映射
└── constants.ts                  # 常量定义
```

---

## 类型定义 (types.ts)

```typescript
// ============================================================
// 基础类型
// ============================================================

/**
 * 线束附着点配置
 */
export interface CableAttachment {
  /** 附着点类型 */
  type: 'base' | 'link' | 'tcp' | 'world';

  /** 如果 type='link'，指定关节名称 */
  linkName?: string;

  /** 相对于附着参考系的偏移位置 [x, y, z] (m) */
  offset: [number, number, number];
}

/**
 * 线束物理属性
 */
export interface CableProperties {
  /** 线束直径 (mm) */
  diameter: number;

  /** 最小弯曲半径 (mm) */
  minBendRadius: number;

  /** 线束类型 */
  type: CableType;

  /** 显示颜色 (CSS color) */
  color: string;

  /** 可选：线束名称/标签 */
  label?: string;
}

/**
 * 线束类型枚举
 */
export type CableType =
  | 'power'           // 电源线
  | 'signal'          // 信号线
  | 'welding'         // 焊接电缆
  | 'gas'             // 气管
  | 'coolant'         // 冷却管
  | 'fiber'           // 光纤
  | 'composite'       // 复合线束
  | 'custom';

/**
 * 完整线束配置
 */
export interface CableConfig {
  /** 唯一标识符 */
  id: string;

  /** 起点附着（通常是基座/控制柜） */
  anchorPoint: CableAttachment;

  /** 终点附着（通常是TCP/工具） */
  attachmentPoint: CableAttachment;

  /** 中间经过点（可选，用于线束导向） */
  waypoints?: CableAttachment[];

  /** 线束物理属性 */
  properties: CableProperties;

  /** 扭转约束 */
  twistConstraints: CableTwistConstraints;
}

/**
 * 扭转约束配置
 */
export interface CableTwistConstraints {
  /** 最大允许扭转角度 (rad)，默认 2π */
  maxTwist: number;

  /** 警告阈值 (rad)，默认 1.5π */
  warningThreshold: number;

  /** 严重警告阈值 (rad)，默认 1.8π */
  criticalThreshold: number;

  /** 是否启用自动解缠建议 */
  enableAutoUnwindSuggestion: boolean;
}

// ============================================================
// 状态类型
// ============================================================

/**
 * 单根线束的实时状态
 */
export interface CableState {
  /** 线束配置ID */
  cableId: string;

  /** 当前累积扭转 (rad) */
  currentTwist: number;

  /** 扭转方向 (1 = 顺时针, -1 = 逆时针) */
  twistDirection: 1 | -1 | 0;

  /** 警告级别 */
  warningLevel: CableWarningLevel;

  /** 线束3D路径点（用于可视化） */
  pathPoints: Array<[number, number, number]>;

  /** 应力分布（沿路径，0-1归一化） */
  stressProfile?: number[];

  /** 时间戳 */
  timestamp: number;
}

/**
 * 警告级别
 */
export type CableWarningLevel =
  | 'safe'       // 绿色：安全
  | 'caution'    // 黄色：接近警告阈值
  | 'warning'    // 橙色：超过警告阈值
  | 'critical';  // 红色：接近最大限制

/**
 * 扭转历史记录点
 */
export interface TwistHistoryPoint {
  timestamp: number;
  twist: number;
  jointAngles: number[];
}

/**
 * 线束管理完整状态
 */
export interface CableManagementState {
  /** 所有线束配置 */
  cables: Map<string, CableConfig>;

  /** 各线束实时状态 */
  cableStates: Map<string, CableState>;

  /** 扭转历史（用于分析） */
  twistHistory: TwistHistoryPoint[];

  /** 历史记录最大长度 */
  historyMaxLength: number;

  /** 初始/参考关节角度（扭转零点） */
  referenceJoints: number[] | null;

  /** 系统是否启用 */
  enabled: boolean;

  /** 显示设置 */
  displaySettings: CableDisplaySettings;
}

/**
 * 显示设置
 */
export interface CableDisplaySettings {
  /** 显示线束3D模型 */
  showCables: boolean;

  /** 显示扭转仪表盘 */
  showTwistGauge: boolean;

  /** 显示警告指示器 */
  showWarnings: boolean;

  /** 线束渲染模式 */
  renderMode: 'line' | 'tube' | 'ribbon';

  /** 线束粗细（用于line模式） */
  lineWidth: number;

  /** 管道分段数（用于tube模式） */
  tubeSegments: number;

  /** 根据应力着色 */
  colorByStress: boolean;

  /** 显示附着点标记 */
  showAttachmentMarkers: boolean;
}

// ============================================================
// 分析类型
// ============================================================

/**
 * 轨迹线束分析结果
 */
export interface TrajectoryTwistAnalysis {
  /** 分析的轨迹ID */
  trajectoryId: string;

  /** 起始扭转状态 */
  startTwist: number;

  /** 结束扭转状态 */
  endTwist: number;

  /** 净扭转变化 */
  netTwistChange: number;

  /** 路径上的最大扭转 */
  maxTwist: number;

  /** 最大扭转发生的位置（0-1） */
  maxTwistPosition: number;

  /** 是否会超出限制 */
  exceedsLimit: boolean;

  /** 警告点列表 */
  warningPoints: TrajectoryWarningPoint[];

  /** 沿轨迹的扭转曲线 */
  twistProfile: TwistProfilePoint[];

  /** 建议的优化方案（如果有问题） */
  optimization?: TwistOptimizationSuggestion;
}

/**
 * 轨迹上的警告点
 */
export interface TrajectoryWarningPoint {
  /** 在轨迹上的位置 (0-1) */
  position: number;

  /** 对应的waypoint索引 */
  waypointIndex: number;

  /** 该点的扭转值 */
  twist: number;

  /** 警告级别 */
  level: CableWarningLevel;

  /** 描述信息 */
  message: string;
}

/**
 * 扭转曲线点
 */
export interface TwistProfilePoint {
  /** 在轨迹上的位置 (0-1) */
  t: number;

  /** 累积扭转值 */
  twist: number;

  /** 瞬时扭转速率 (rad/s) */
  twistRate: number;
}

/**
 * 扭转优化建议
 */
export interface TwistOptimizationSuggestion {
  /** 建议类型 */
  type: 'reorder' | 'add_unwind' | 'modify_path' | 'change_approach';

  /** 描述 */
  description: string;

  /** 预估改善 (%) */
  estimatedImprovement: number;

  /** 详细参数 */
  details: Record<string, unknown>;
}

// ============================================================
// 规划类型（与trajx交互）
// ============================================================

/**
 * 线束感知规划请求
 */
export interface CableAwarePlanRequest {
  /** 起始关节角度 */
  startJoints: number[];

  /** 起始扭转状态 */
  startTwist: number;

  /** 目标关节角度 */
  goalJoints: number[];

  /** 线束配置 */
  cableConfig: CableConfig;

  /** 规划选项 */
  options: CableAwarePlanOptions;
}

/**
 * 规划选项
 */
export interface CableAwarePlanOptions {
  /** 是否启用自动解缠 */
  enableAutoUnwind: boolean;

  /** 最大规划时间 (ms) */
  maxPlanningTime: number;

  /** 同时检查碰撞 */
  checkCollision: boolean;

  /** 优化目标 */
  optimizationGoal: 'min_time' | 'min_twist' | 'balanced';
}

/**
 * 线束感知规划结果
 */
export interface CableAwarePlanResult {
  /** 是否成功 */
  success: boolean;

  /** 规划路径（关节空间） */
  path: number[][];

  /** 沿路径的扭转状态 */
  twistProfile: number[];

  /** 最终扭转状态 */
  finalTwist: number;

  /** 是否包含解缠动作 */
  hasUnwindMotion: boolean;

  /** 解缠点索引（如果有） */
  unwindIndices?: number[];

  /** 规划耗时 (ms) */
  planningTime: number;

  /** 失败原因（如果失败） */
  errorMessage?: string;
}

/**
 * 周期优化请求
 */
export interface CycleOptimizationRequest {
  /** 任务列表（每个任务是一个目标姿态） */
  tasks: Array<{
    id: string;
    goalJoints: number[];
    /** 可选：必须保持的顺序约束 */
    mustFollowTask?: string;
  }>;

  /** 起始状态 */
  startJoints: number[];
  startTwist: number;

  /** 是否要求周期闭合（最终扭转回到起始值） */
  requireClosedCycle: boolean;

  /** 线束配置 */
  cableConfig: CableConfig;
}

/**
 * 周期优化结果
 */
export interface CycleOptimizationResult {
  /** 是否成功 */
  success: boolean;

  /** 优化后的任务顺序 */
  optimizedOrder: string[];

  /** 各任务间的路径 */
  paths: CableAwarePlanResult[];

  /** 净扭转（理想情况下接近0） */
  netTwist: number;

  /** 最大瞬时扭转 */
  maxTwist: number;

  /** 相比原始顺序的改善 (%) */
  improvement: number;
}

// ============================================================
// 事件类型
// ============================================================

/**
 * 线束事件
 */
export type CableEvent =
  | { type: 'twist_warning'; cableId: string; level: CableWarningLevel; twist: number }
  | { type: 'twist_limit_reached'; cableId: string; twist: number }
  | { type: 'cable_config_changed'; cableId: string; config: CableConfig }
  | { type: 'reference_reset'; previousTwist: number }
  | { type: 'unwind_suggested'; cableId: string; suggestion: TwistOptimizationSuggestion };

/**
 * 事件处理器
 */
export type CableEventHandler = (event: CableEvent) => void;

// ============================================================
// Provider Props
// ============================================================

/**
 * CableManagementProvider 属性
 */
export interface CableManagementProviderProps {
  children: React.ReactNode;

  /** 机器人ID */
  robotId: string;

  /** 初始线束配置 */
  initialCables?: CableConfig[];

  /** 初始显示设置 */
  initialDisplaySettings?: Partial<CableDisplaySettings>;

  /** 事件回调 */
  onCableEvent?: CableEventHandler;

  /** 是否自动订阅关节状态流 */
  autoSubscribeJointStream?: boolean;

  /** 关节状态流ID（如果autoSubscribe为true） */
  jointStreamId?: string;
}
```

---

## Context 实现 (CableManagementContext.tsx)

```typescript
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from 'react';
import type {
  CableConfig,
  CableState,
  CableManagementState,
  CableDisplaySettings,
  CableManagementProviderProps,
  CableWarningLevel,
  TwistHistoryPoint,
  CableEvent,
  CableEventHandler,
} from './types';
import { useRobotKinematics } from '../../hooks';
import { calculateTcpTwist } from './utils/twist-calculator';
import { DEFAULT_DISPLAY_SETTINGS, WARNING_THRESHOLDS } from './constants';

// ============================================================
// State & Actions
// ============================================================

type CableAction =
  | { type: 'ADD_CABLE'; payload: CableConfig }
  | { type: 'REMOVE_CABLE'; payload: string }
  | { type: 'UPDATE_CABLE'; payload: { id: string; updates: Partial<CableConfig> } }
  | { type: 'UPDATE_CABLE_STATE'; payload: { id: string; state: Partial<CableState> } }
  | { type: 'SET_REFERENCE_JOINTS'; payload: number[] }
  | { type: 'RESET_TWIST'; payload: { cableId: string } }
  | { type: 'ADD_HISTORY_POINT'; payload: TwistHistoryPoint }
  | { type: 'SET_ENABLED'; payload: boolean }
  | { type: 'UPDATE_DISPLAY_SETTINGS'; payload: Partial<CableDisplaySettings> }
  | { type: 'BATCH_UPDATE_STATES'; payload: Map<string, CableState> };

function cableReducer(
  state: CableManagementState,
  action: CableAction
): CableManagementState {
  switch (action.type) {
    case 'ADD_CABLE': {
      const newCables = new Map(state.cables);
      newCables.set(action.payload.id, action.payload);
      return { ...state, cables: newCables };
    }

    case 'REMOVE_CABLE': {
      const newCables = new Map(state.cables);
      const newStates = new Map(state.cableStates);
      newCables.delete(action.payload);
      newStates.delete(action.payload);
      return { ...state, cables: newCables, cableStates: newStates };
    }

    case 'UPDATE_CABLE': {
      const existing = state.cables.get(action.payload.id);
      if (!existing) return state;
      const newCables = new Map(state.cables);
      newCables.set(action.payload.id, { ...existing, ...action.payload.updates });
      return { ...state, cables: newCables };
    }

    case 'UPDATE_CABLE_STATE': {
      const existing = state.cableStates.get(action.payload.id);
      const newStates = new Map(state.cableStates);
      newStates.set(action.payload.id, {
        ...existing,
        ...action.payload.state
      } as CableState);
      return { ...state, cableStates: newStates };
    }

    case 'SET_REFERENCE_JOINTS':
      return { ...state, referenceJoints: action.payload };

    case 'RESET_TWIST': {
      const newStates = new Map(state.cableStates);
      const existing = newStates.get(action.payload.cableId);
      if (existing) {
        newStates.set(action.payload.cableId, {
          ...existing,
          currentTwist: 0,
          warningLevel: 'safe',
        });
      }
      return { ...state, cableStates: newStates };
    }

    case 'ADD_HISTORY_POINT': {
      const newHistory = [...state.twistHistory, action.payload];
      if (newHistory.length > state.historyMaxLength) {
        newHistory.shift();
      }
      return { ...state, twistHistory: newHistory };
    }

    case 'SET_ENABLED':
      return { ...state, enabled: action.payload };

    case 'UPDATE_DISPLAY_SETTINGS':
      return {
        ...state,
        displaySettings: { ...state.displaySettings, ...action.payload }
      };

    case 'BATCH_UPDATE_STATES':
      return { ...state, cableStates: action.payload };

    default:
      return state;
  }
}

// ============================================================
// Context Definition
// ============================================================

interface CableManagementContextValue {
  state: CableManagementState;

  // Cable Configuration
  addCable: (config: CableConfig) => void;
  removeCable: (id: string) => void;
  updateCable: (id: string, updates: Partial<CableConfig>) => void;
  getCable: (id: string) => CableConfig | undefined;

  // State Management
  setReferenceJoints: (joints: number[]) => void;
  resetTwist: (cableId: string) => void;
  resetAllTwists: () => void;

  // Enable/Disable
  setEnabled: (enabled: boolean) => void;

  // Display Settings
  updateDisplaySettings: (settings: Partial<CableDisplaySettings>) => void;

  // Computed Values
  getMaxWarningLevel: () => CableWarningLevel;
  getCriticalCables: () => string[];

  // Event Subscription
  subscribeToEvents: (handler: CableEventHandler) => () => void;
}

const CableManagementContext = createContext<CableManagementContextValue | null>(null);

// ============================================================
// Provider Implementation
// ============================================================

const initialState: CableManagementState = {
  cables: new Map(),
  cableStates: new Map(),
  twistHistory: [],
  historyMaxLength: 10000,
  referenceJoints: null,
  enabled: true,
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
};

export function CableManagementProvider({
  children,
  robotId,
  initialCables = [],
  initialDisplaySettings,
  onCableEvent,
  autoSubscribeJointStream = true,
  jointStreamId,
}: CableManagementProviderProps) {
  const [state, dispatch] = useReducer(cableReducer, {
    ...initialState,
    displaySettings: { ...DEFAULT_DISPLAY_SETTINGS, ...initialDisplaySettings },
  });

  const eventHandlersRef = useRef<Set<CableEventHandler>>(new Set());
  const previousJointsRef = useRef<number[] | null>(null);

  // Get kinematics for twist calculation
  const { fk, ready: kinematicsReady } = useRobotKinematics({ robotId });

  // Initialize cables
  useEffect(() => {
    initialCables.forEach(cable => {
      dispatch({ type: 'ADD_CABLE', payload: cable });
    });
  }, []);

  // Event emission helper
  const emitEvent = useCallback((event: CableEvent) => {
    onCableEvent?.(event);
    eventHandlersRef.current.forEach(handler => handler(event));
  }, [onCableEvent]);

  // Calculate warning level from twist value
  const calculateWarningLevel = useCallback((
    twist: number,
    constraints: CableConfig['twistConstraints']
  ): CableWarningLevel => {
    const absTwist = Math.abs(twist);
    if (absTwist >= constraints.maxTwist * 0.95) return 'critical';
    if (absTwist >= constraints.criticalThreshold) return 'warning';
    if (absTwist >= constraints.warningThreshold) return 'caution';
    return 'safe';
  }, []);

  // Update cable states from joint angles
  const updateFromJoints = useCallback((joints: number[]) => {
    if (!kinematicsReady || !state.enabled) return;

    const prevJoints = previousJointsRef.current ?? state.referenceJoints ?? joints;
    previousJointsRef.current = joints;

    const newStates = new Map<string, CableState>();

    state.cables.forEach((cable, id) => {
      const prevState = state.cableStates.get(id);
      const prevTwist = prevState?.currentTwist ?? 0;

      // Calculate twist delta using FK
      const prevPose = fk(prevJoints);
      const currPose = fk(joints);

      if (prevPose && currPose) {
        const twistDelta = calculateTcpTwist(prevPose, currPose);
        const newTwist = prevTwist + twistDelta;
        const warningLevel = calculateWarningLevel(newTwist, cable.twistConstraints);

        // Check for warning level changes
        if (prevState && warningLevel !== prevState.warningLevel) {
          emitEvent({
            type: 'twist_warning',
            cableId: id,
            level: warningLevel,
            twist: newTwist,
          });
        }

        // Check for limit reached
        if (Math.abs(newTwist) >= cable.twistConstraints.maxTwist) {
          emitEvent({
            type: 'twist_limit_reached',
            cableId: id,
            twist: newTwist,
          });
        }

        newStates.set(id, {
          cableId: id,
          currentTwist: newTwist,
          twistDirection: twistDelta > 0 ? 1 : twistDelta < 0 ? -1 : 0,
          warningLevel,
          pathPoints: [], // Will be calculated separately if needed
          timestamp: Date.now(),
        });
      }
    });

    if (newStates.size > 0) {
      dispatch({ type: 'BATCH_UPDATE_STATES', payload: newStates });

      // Add to history
      const representativeTwist = newStates.values().next().value?.currentTwist ?? 0;
      dispatch({
        type: 'ADD_HISTORY_POINT',
        payload: {
          timestamp: Date.now(),
          twist: representativeTwist,
          jointAngles: joints,
        },
      });
    }
  }, [kinematicsReady, state.enabled, state.cables, state.cableStates,
      state.referenceJoints, fk, calculateWarningLevel, emitEvent]);

  // Context value
  const value = useMemo<CableManagementContextValue>(() => ({
    state,

    addCable: (config) => dispatch({ type: 'ADD_CABLE', payload: config }),
    removeCable: (id) => dispatch({ type: 'REMOVE_CABLE', payload: id }),
    updateCable: (id, updates) => dispatch({ type: 'UPDATE_CABLE', payload: { id, updates } }),
    getCable: (id) => state.cables.get(id),

    setReferenceJoints: (joints) => {
      const prevTwist = state.cableStates.values().next().value?.currentTwist ?? 0;
      dispatch({ type: 'SET_REFERENCE_JOINTS', payload: joints });
      previousJointsRef.current = joints;
      emitEvent({ type: 'reference_reset', previousTwist: prevTwist });
    },

    resetTwist: (cableId) => dispatch({ type: 'RESET_TWIST', payload: { cableId } }),

    resetAllTwists: () => {
      state.cables.forEach((_, id) => {
        dispatch({ type: 'RESET_TWIST', payload: { cableId: id } });
      });
    },

    setEnabled: (enabled) => dispatch({ type: 'SET_ENABLED', payload: enabled }),

    updateDisplaySettings: (settings) =>
      dispatch({ type: 'UPDATE_DISPLAY_SETTINGS', payload: settings }),

    getMaxWarningLevel: () => {
      let maxLevel: CableWarningLevel = 'safe';
      const priority: CableWarningLevel[] = ['safe', 'caution', 'warning', 'critical'];

      state.cableStates.forEach(cableState => {
        if (priority.indexOf(cableState.warningLevel) > priority.indexOf(maxLevel)) {
          maxLevel = cableState.warningLevel;
        }
      });

      return maxLevel;
    },

    getCriticalCables: () => {
      const critical: string[] = [];
      state.cableStates.forEach((cableState, id) => {
        if (cableState.warningLevel === 'critical' || cableState.warningLevel === 'warning') {
          critical.push(id);
        }
      });
      return critical;
    },

    subscribeToEvents: (handler) => {
      eventHandlersRef.current.add(handler);
      return () => eventHandlersRef.current.delete(handler);
    },
  }), [state, emitEvent]);

  // Expose updateFromJoints for streaming integration
  useEffect(() => {
    // This would be connected to the streaming system
    // For now, it's available through a ref or could be exposed via context
  }, [updateFromJoints]);

  return (
    <CableManagementContext.Provider value={value}>
      {children}
    </CableManagementContext.Provider>
  );
}

// ============================================================
// Hooks
// ============================================================

export function useCableManagement(): CableManagementContextValue {
  const context = useContext(CableManagementContext);
  if (!context) {
    throw new Error('useCableManagement must be used within CableManagementProvider');
  }
  return context;
}

export function useCableState(cableId: string): CableState | undefined {
  const { state } = useCableManagement();
  return state.cableStates.get(cableId);
}

export function useCableConfig(cableId: string): CableConfig | undefined {
  const { getCable } = useCableManagement();
  return getCable(cableId);
}

export function useAllCableStates(): Map<string, CableState> {
  const { state } = useCableManagement();
  return state.cableStates;
}

export function useCableWarningLevel(): CableWarningLevel {
  const { getMaxWarningLevel } = useCableManagement();
  return getMaxWarningLevel();
}

export function useCableDisplaySettings(): [
  CableDisplaySettings,
  (settings: Partial<CableDisplaySettings>) => void
] {
  const { state, updateDisplaySettings } = useCableManagement();
  return [state.displaySettings, updateDisplaySettings];
}

export function useTwistHistory(): TwistHistoryPoint[] {
  const { state } = useCableManagement();
  return state.twistHistory;
}
```

---

## 3D可视化组件 (CableVisualizer.tsx)

```typescript
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Tube } from '@react-three/drei';
import * as THREE from 'three';
import { useCableManagement, useAllCableStates } from './CableManagementContext';
import { useRobotKinematics } from '../../hooks';
import { generateCableSpline } from './utils/spline-generator';
import { getStressColor } from './utils/color-mapping';
import type { CableConfig, CableState, CableDisplaySettings } from './types';

interface CableVisualizerProps {
  robotId: string;
  /** 可选：只显示指定的线束 */
  cableIds?: string[];
  /** 可选：覆盖显示设置 */
  displaySettingsOverride?: Partial<CableDisplaySettings>;
}

export function CableVisualizer({
  robotId,
  cableIds,
  displaySettingsOverride,
}: CableVisualizerProps) {
  const { state } = useCableManagement();
  const cableStates = useAllCableStates();
  const { fkChain, ready } = useRobotKinematics({ robotId });

  const displaySettings = useMemo(
    () => ({ ...state.displaySettings, ...displaySettingsOverride }),
    [state.displaySettings, displaySettingsOverride]
  );

  if (!displaySettings.showCables || !ready) {
    return null;
  }

  const cablesToRender = cableIds
    ? Array.from(state.cables.values()).filter(c => cableIds.includes(c.id))
    : Array.from(state.cables.values());

  return (
    <group name="cable-visualizer">
      {cablesToRender.map(cable => (
        <CableRenderer
          key={cable.id}
          cable={cable}
          cableState={cableStates.get(cable.id)}
          displaySettings={displaySettings}
          robotId={robotId}
        />
      ))}
    </group>
  );
}

interface CableRendererProps {
  cable: CableConfig;
  cableState?: CableState;
  displaySettings: CableDisplaySettings;
  robotId: string;
}

function CableRenderer({
  cable,
  cableState,
  displaySettings,
  robotId,
}: CableRendererProps) {
  const { fkChain } = useRobotKinematics({ robotId });
  const tubeRef = useRef<THREE.Mesh>(null);

  // Generate cable path points based on current robot pose
  const pathPoints = useMemo(() => {
    if (!cableState?.pathPoints || cableState.pathPoints.length === 0) {
      // Fallback: generate from attachment points
      return generateDefaultPath(cable);
    }
    return cableState.pathPoints.map(p => new THREE.Vector3(...p));
  }, [cable, cableState?.pathPoints]);

  // Generate smooth spline curve
  const curve = useMemo(() => {
    if (pathPoints.length < 2) return null;
    return generateCableSpline(pathPoints);
  }, [pathPoints]);

  if (!curve) return null;

  // Determine color based on stress/warning level
  const cableColor = useMemo(() => {
    if (displaySettings.colorByStress && cableState) {
      return getStressColor(cableState.warningLevel);
    }
    return cable.properties.color;
  }, [displaySettings.colorByStress, cableState, cable.properties.color]);

  // Render based on mode
  switch (displaySettings.renderMode) {
    case 'tube':
      return (
        <Tube
          ref={tubeRef}
          args={[curve, displaySettings.tubeSegments, cable.properties.diameter / 2000, 8, false]}
        >
          <meshStandardMaterial
            color={cableColor}
            roughness={0.6}
            metalness={0.2}
          />
        </Tube>
      );

    case 'ribbon':
      // Ribbon mode would use a custom geometry
      return (
        <Line
          points={curve.getPoints(50)}
          color={cableColor}
          lineWidth={displaySettings.lineWidth * 2}
        />
      );

    case 'line':
    default:
      return (
        <Line
          points={curve.getPoints(50)}
          color={cableColor}
          lineWidth={displaySettings.lineWidth}
        />
      );
  }
}

// Attachment point markers
interface AttachmentMarkerProps {
  position: [number, number, number];
  type: 'anchor' | 'attachment';
}

export function AttachmentMarker({ position, type }: AttachmentMarkerProps) {
  const color = type === 'anchor' ? '#4a90d9' : '#d94a4a';

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.01, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Helper to generate default cable path
function generateDefaultPath(cable: CableConfig): THREE.Vector3[] {
  const start = new THREE.Vector3(...cable.anchorPoint.offset);
  const end = new THREE.Vector3(...cable.attachmentPoint.offset);

  // Simple catenary approximation
  const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
  mid.y -= 0.1; // Sag

  return [start, mid, end];
}
```

---

## 扭转仪表盘组件 (CableTwistGauge.tsx)

```typescript
import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useCableState, useCableConfig } from './CableManagementContext';
import type { CableWarningLevel } from './types';

interface CableTwistGaugeProps {
  cableId: string;
  /** 3D位置（可选，用于3D场景中显示） */
  position?: [number, number, number];
  /** 2D模式（用于HUD） */
  mode?: '2d' | '3d';
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { width: 80, height: 80 },
  medium: { width: 120, height: 120 },
  large: { width: 160, height: 160 },
};

const WARNING_COLORS: Record<CableWarningLevel, string> = {
  safe: '#22c55e',
  caution: '#eab308',
  warning: '#f97316',
  critical: '#ef4444',
};

export function CableTwistGauge({
  cableId,
  position = [0, 0, 0],
  mode = '2d',
  size = 'medium',
}: CableTwistGaugeProps) {
  const cableState = useCableState(cableId);
  const cableConfig = useCableConfig(cableId);

  const { width, height } = SIZES[size];

  const gaugeData = useMemo(() => {
    if (!cableState || !cableConfig) {
      return { angle: 0, percentage: 0, color: WARNING_COLORS.safe };
    }

    const maxTwist = cableConfig.twistConstraints.maxTwist;
    const currentTwist = cableState.currentTwist;
    const percentage = Math.min(100, (Math.abs(currentTwist) / maxTwist) * 100);

    // Map twist to gauge angle (-135° to 135°)
    const normalizedTwist = currentTwist / maxTwist;
    const angle = normalizedTwist * 135;

    return {
      angle: Math.max(-135, Math.min(135, angle)),
      percentage,
      color: WARNING_COLORS[cableState.warningLevel],
      twistDegrees: (currentTwist * 180 / Math.PI).toFixed(1),
      direction: cableState.twistDirection,
    };
  }, [cableState, cableConfig]);

  const GaugeContent = (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '50%',
        border: `3px solid ${gaugeData.color}`,
        color: 'white',
        fontFamily: 'monospace',
      }}
    >
      {/* Gauge arc background */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Background arc */}
        <path
          d={describeArc(width/2, height/2, width/2 - 10, -135, 135)}
          fill="none"
          stroke="#333"
          strokeWidth="6"
        />
        {/* Value arc */}
        <path
          d={describeArc(width/2, height/2, width/2 - 10, -135, -135 + (gaugeData.angle + 135))}
          fill="none"
          stroke={gaugeData.color}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Needle */}
        <line
          x1={width/2}
          y1={height/2}
          x2={width/2 + Math.cos((gaugeData.angle - 90) * Math.PI / 180) * (width/2 - 20)}
          y2={height/2 + Math.sin((gaugeData.angle - 90) * Math.PI / 180) * (height/2 - 20)}
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      {/* Center display */}
      <div style={{
        textAlign: 'center',
        zIndex: 1,
        marginTop: height * 0.1,
      }}>
        <div style={{ fontSize: size === 'small' ? 12 : 16, fontWeight: 'bold' }}>
          {gaugeData.twistDegrees}°
        </div>
        <div style={{ fontSize: size === 'small' ? 8 : 10, opacity: 0.7 }}>
          {gaugeData.percentage.toFixed(0)}%
        </div>
      </div>

      {/* Direction indicator */}
      {gaugeData.direction !== 0 && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          fontSize: 10,
          opacity: 0.8,
        }}>
          {gaugeData.direction === 1 ? '↻ CW' : '↺ CCW'}
        </div>
      )}

      {/* Label */}
      {cableConfig && (
        <div style={{
          position: 'absolute',
          top: -20,
          fontSize: 10,
          whiteSpace: 'nowrap',
        }}>
          {cableConfig.properties.label || cableId}
        </div>
      )}
    </div>
  );

  if (mode === '3d') {
    return (
      <Html position={position} center>
        {GaugeContent}
      </Html>
    );
  }

  return GaugeContent;
}

// SVG arc helper
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}
```

---

## trajx 集成 Hook (useCablePlanning.ts)

```typescript
import { useCallback, useState } from 'react';
import { useCableManagement } from '../CableManagementContext';
import type {
  CableAwarePlanRequest,
  CableAwarePlanResult,
  CycleOptimizationRequest,
  CycleOptimizationResult,
  TrajectoryTwistAnalysis,
} from '../types';

// Note: These functions will call into trajx-wasm once the cable-aware
// planning features are implemented in trajx

interface UseCablePlanningOptions {
  robotId: string;
}

interface UseCablePlanningReturn {
  /** 是否就绪 */
  ready: boolean;

  /** 规划中 */
  isPlanning: boolean;

  /** 线束感知路径规划 */
  planPath: (request: CableAwarePlanRequest) => Promise<CableAwarePlanResult>;

  /** 分析轨迹的线束影响 */
  analyzeTrajectory: (
    trajectoryJoints: number[][],
    startTwist: number
  ) => Promise<TrajectoryTwistAnalysis>;

  /** 周期任务优化 */
  optimizeCycle: (request: CycleOptimizationRequest) => Promise<CycleOptimizationResult>;

  /** 最后的错误 */
  error: Error | null;
}

export function useCablePlanning({
  robotId,
}: UseCablePlanningOptions): UseCablePlanningReturn {
  const { state } = useCableManagement();
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // TODO: Check if trajx cable-aware planner is available
  const ready = true; // Will be dynamic once trajx integration is complete

  const planPath = useCallback(async (
    request: CableAwarePlanRequest
  ): Promise<CableAwarePlanResult> => {
    setIsPlanning(true);
    setError(null);

    try {
      // TODO: Call trajx-wasm CableAwareBiRRTPlanner
      // For now, return a mock result

      // Placeholder implementation using front-end twist calculation
      const result: CableAwarePlanResult = {
        success: true,
        path: [request.startJoints, request.goalJoints],
        twistProfile: [request.startTwist, request.startTwist], // Simplified
        finalTwist: request.startTwist, // Would be calculated
        hasUnwindMotion: false,
        planningTime: 0,
      };

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsPlanning(false);
    }
  }, []);

  const analyzeTrajectory = useCallback(async (
    trajectoryJoints: number[][],
    startTwist: number
  ): Promise<TrajectoryTwistAnalysis> => {
    // TODO: Use trajx for analysis or implement front-end fallback

    // Placeholder implementation
    const twistProfile = trajectoryJoints.map((_, i) => ({
      t: i / (trajectoryJoints.length - 1),
      twist: startTwist, // Would be calculated incrementally
      twistRate: 0,
    }));

    return {
      trajectoryId: 'analysis-' + Date.now(),
      startTwist,
      endTwist: startTwist,
      netTwistChange: 0,
      maxTwist: startTwist,
      maxTwistPosition: 0,
      exceedsLimit: false,
      warningPoints: [],
      twistProfile,
    };
  }, []);

  const optimizeCycle = useCallback(async (
    request: CycleOptimizationRequest
  ): Promise<CycleOptimizationResult> => {
    setIsPlanning(true);
    setError(null);

    try {
      // TODO: Call trajx-wasm CycleOptimizer

      // Placeholder
      return {
        success: true,
        optimizedOrder: request.tasks.map(t => t.id),
        paths: [],
        netTwist: 0,
        maxTwist: 0,
        improvement: 0,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsPlanning(false);
    }
  }, []);

  return {
    ready,
    isPlanning,
    planPath,
    analyzeTrajectory,
    optimizeCycle,
    error,
  };
}
```

---

## 工具函数

### twist-calculator.ts

```typescript
import * as THREE from 'three';
import type { Pose3D } from '../../types';

/**
 * 计算两个TCP姿态之间的扭转变化
 * 主要关注绕Z轴（垂直轴）的旋转累积
 */
export function calculateTcpTwist(
  prevPose: Pose3D,
  currPose: Pose3D
): number {
  const prevQuat = new THREE.Quaternion(...prevPose.quaternion);
  const currQuat = new THREE.Quaternion(...currPose.quaternion);

  // 计算相对旋转
  const deltaQuat = prevQuat.clone().invert().multiply(currQuat);

  // 提取绕Z轴的旋转分量
  const euler = new THREE.Euler().setFromQuaternion(deltaQuat, 'ZYX');

  // 返回绕Z轴的旋转（弧度）
  return euler.z;
}

/**
 * 计算关节角度变化导致的累积扭转
 * 这是一个简化模型，假设线束只对最后几个关节敏感
 */
export function calculateJointBasedTwist(
  prevJoints: number[],
  currJoints: number[],
  /** 每个关节对扭转的贡献权重 */
  jointWeights?: number[]
): number {
  if (prevJoints.length !== currJoints.length) {
    throw new Error('Joint arrays must have same length');
  }

  const weights = jointWeights ?? prevJoints.map((_, i) =>
    i >= prevJoints.length - 3 ? 1 : 0  // 默认只考虑最后3个关节
  );

  let totalTwist = 0;
  for (let i = 0; i < prevJoints.length; i++) {
    const delta = currJoints[i] - prevJoints[i];
    totalTwist += delta * weights[i];
  }

  return totalTwist;
}

/**
 * 累积扭转跟踪器
 */
export class TwistTracker {
  private accumulatedTwist = 0;
  private lastJoints: number[] | null = null;
  private jointWeights: number[];

  constructor(dof: number, jointWeights?: number[]) {
    this.jointWeights = jointWeights ??
      Array(dof).fill(0).map((_, i) => i >= dof - 3 ? 1 : 0);
  }

  update(joints: number[]): number {
    if (this.lastJoints) {
      const delta = calculateJointBasedTwist(
        this.lastJoints,
        joints,
        this.jointWeights
      );
      this.accumulatedTwist += delta;
    }
    this.lastJoints = [...joints];
    return this.accumulatedTwist;
  }

  reset(): void {
    this.accumulatedTwist = 0;
    this.lastJoints = null;
  }

  get twist(): number {
    return this.accumulatedTwist;
  }

  setReference(joints: number[]): void {
    this.lastJoints = [...joints];
    // Don't reset accumulated twist, just update reference
  }
}
```

### spline-generator.ts

```typescript
import * as THREE from 'three';

/**
 * 生成光滑的线束样条曲线
 */
export function generateCableSpline(
  points: THREE.Vector3[],
  tension: number = 0.5
): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension);
}

/**
 * 根据线束物理属性生成自然下垂的路径
 */
export function generateCatenaryPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  options: {
    /** 线束长度（如果大于两点距离，会产生下垂） */
    cableLength?: number;
    /** 重力方向 */
    gravityDirection?: THREE.Vector3;
    /** 插值点数 */
    segments?: number;
  } = {}
): THREE.Vector3[] {
  const {
    cableLength,
    gravityDirection = new THREE.Vector3(0, -1, 0),
    segments = 20,
  } = options;

  const distance = start.distanceTo(end);
  const slack = cableLength ? Math.max(0, cableLength - distance) : distance * 0.1;

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().lerpVectors(start, end, t);

    // 抛物线下垂
    const sag = slack * 4 * t * (1 - t);
    point.addScaledVector(gravityDirection, sag);

    points.push(point);
  }

  return points;
}

/**
 * 沿机器人关节生成线束路径
 */
export function generateCablePathAlongRobot(
  anchorPoint: THREE.Vector3,
  attachmentPoint: THREE.Vector3,
  jointPositions: THREE.Vector3[],
  options: {
    /** 线束距离机器人表面的距离 */
    standoff?: number;
    /** 是否沿特定关节走线 */
    routeJoints?: number[];
  } = {}
): THREE.Vector3[] {
  const { standoff = 0.02, routeJoints } = options;

  const points: THREE.Vector3[] = [anchorPoint];

  // 如果指定了走线关节，添加这些点
  if (routeJoints && routeJoints.length > 0) {
    for (const jointIdx of routeJoints) {
      if (jointIdx < jointPositions.length) {
        const jointPos = jointPositions[jointIdx].clone();
        // 添加standoff偏移（简化：向外偏移）
        const direction = jointPos.clone().sub(anchorPoint).normalize();
        jointPos.addScaledVector(direction.cross(new THREE.Vector3(0, 1, 0)), standoff);
        points.push(jointPos);
      }
    }
  }

  points.push(attachmentPoint);

  return points;
}
```

### color-mapping.ts

```typescript
import type { CableWarningLevel } from '../types';

/**
 * 警告级别对应的颜色
 */
export const WARNING_LEVEL_COLORS: Record<CableWarningLevel, string> = {
  safe: '#22c55e',      // 绿色
  caution: '#eab308',   // 黄色
  warning: '#f97316',   // 橙色
  critical: '#ef4444',  // 红色
};

/**
 * 获取警告级别对应的颜色
 */
export function getStressColor(level: CableWarningLevel): string {
  return WARNING_LEVEL_COLORS[level];
}

/**
 * 根据扭转百分比获取渐变颜色
 */
export function getTwistGradientColor(percentage: number): string {
  // 0-50%: 绿色到黄色
  // 50-75%: 黄色到橙色
  // 75-100%: 橙色到红色

  if (percentage < 50) {
    return lerpColor('#22c55e', '#eab308', percentage / 50);
  } else if (percentage < 75) {
    return lerpColor('#eab308', '#f97316', (percentage - 50) / 25);
  } else {
    return lerpColor('#f97316', '#ef4444', (percentage - 75) / 25);
  }
}

/**
 * 颜色线性插值
 */
function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return color1;

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * 生成应力颜色贴图（用于线束表面着色）
 */
export function generateStressColorMap(
  stressProfile: number[],
  width: number = 256
): Uint8Array {
  const data = new Uint8Array(width * 4);

  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const stressIdx = Math.floor(t * (stressProfile.length - 1));
    const stress = stressProfile[stressIdx] ?? 0;

    const color = getTwistGradientColor(stress * 100);
    const rgb = hexToRgb(color.replace('rgb(', '').replace(')', '')) || { r: 0, g: 255, b: 0 };

    data[i * 4] = rgb.r;
    data[i * 4 + 1] = rgb.g;
    data[i * 4 + 2] = rgb.b;
    data[i * 4 + 3] = 255;
  }

  return data;
}
```

---

## 常量定义 (constants.ts)

```typescript
import type { CableDisplaySettings, CableTwistConstraints } from './types';

/**
 * 默认显示设置
 */
export const DEFAULT_DISPLAY_SETTINGS: CableDisplaySettings = {
  showCables: true,
  showTwistGauge: true,
  showWarnings: true,
  renderMode: 'tube',
  lineWidth: 2,
  tubeSegments: 64,
  colorByStress: true,
  showAttachmentMarkers: true,
};

/**
 * 默认扭转约束
 */
export const DEFAULT_TWIST_CONSTRAINTS: CableTwistConstraints = {
  maxTwist: Math.PI * 2,           // 360°
  warningThreshold: Math.PI * 1.5,  // 270°
  criticalThreshold: Math.PI * 1.8, // 324°
  enableAutoUnwindSuggestion: true,
};

/**
 * 预设线束配置
 */
export const CABLE_PRESETS = {
  /** 焊接电缆 */
  welding: {
    diameter: 25,
    minBendRadius: 100,
    type: 'welding' as const,
    color: '#e74c3c',
  },

  /** 送丝管 */
  wireFeeder: {
    diameter: 8,
    minBendRadius: 50,
    type: 'composite' as const,
    color: '#3498db',
  },

  /** 气管 */
  gas: {
    diameter: 6,
    minBendRadius: 30,
    type: 'gas' as const,
    color: '#2ecc71',
  },

  /** 信号线 */
  signal: {
    diameter: 4,
    minBendRadius: 20,
    type: 'signal' as const,
    color: '#9b59b6',
  },

  /** 光纤 */
  fiber: {
    diameter: 3,
    minBendRadius: 25,
    type: 'fiber' as const,
    color: '#f39c12',
  },
};

/**
 * 动画和更新相关常量
 */
export const UPDATE_CONSTANTS = {
  /** 历史记录最大长度 */
  MAX_HISTORY_LENGTH: 10000,

  /** 最小更新间隔 (ms) */
  MIN_UPDATE_INTERVAL: 16, // ~60fps

  /** 警告消抖时间 (ms) */
  WARNING_DEBOUNCE: 500,
};
```

---

## 与现有系统的集成

### 1. 与 Process 系统集成

```typescript
// 在焊接 Process 中使用
import { CableManagementProvider, useCableManagement } from '../capabilities/cable-management';

export function WeldingProcessWithCable({ robotId, ...props }) {
  return (
    <CableManagementProvider
      robotId={robotId}
      initialCables={[
        {
          id: 'welding-cable',
          anchorPoint: { type: 'base', offset: [0, 0, 0] },
          attachmentPoint: { type: 'tcp', offset: [0, 0, 0] },
          properties: CABLE_PRESETS.welding,
          twistConstraints: DEFAULT_TWIST_CONSTRAINTS,
        }
      ]}
    >
      <WeldingProcess robotId={robotId} {...props} />
      <CableAwareWeldingOverlay />
    </CableManagementProvider>
  );
}

function CableAwareWeldingOverlay() {
  const { getMaxWarningLevel } = useCableManagement();
  const warningLevel = getMaxWarningLevel();

  // 在焊接界面显示线束状态
  return (
    <div className="cable-status-overlay">
      {warningLevel !== 'safe' && (
        <div className={`cable-warning cable-warning-${warningLevel}`}>
          ⚠️ Cable twist warning: {warningLevel}
        </div>
      )}
    </div>
  );
}
```

### 2. 与 Trajectory 系统集成

```typescript
// 轨迹预分析
import { useCablePlanning } from '../capabilities/cable-management';

function TrajectoryWithCableAnalysis({ trajectory }) {
  const { analyzeTrajectory } = useCablePlanning({ robotId: 'main' });
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (trajectory?.waypoints) {
      analyzeTrajectory(trajectory.waypoints, 0)
        .then(setAnalysis);
    }
  }, [trajectory]);

  return (
    <>
      <TrajectoryVisualization trajectory={trajectory} />
      {analysis && (
        <CableTrajectoryOverlay analysis={analysis} />
      )}
    </>
  );
}
```

### 3. 与 Streaming 系统集成

```typescript
// 实时关节状态更新
import { useStreamSubscription } from '../streaming';
import { useCableManagement } from '../capabilities/cable-management';

function CableStreamIntegration({ streamId }) {
  const { updateFromJoints } = useCableManagement();

  useStreamSubscription(streamId, (frame) => {
    if (frame.type === 'joint_state') {
      updateFromJoints(Array.from(frame.positions));
    }
  });

  return null;
}
```

---

## 使用示例

### 基本使用

```tsx
import {
  CableManagementProvider,
  CableVisualizer,
  CableTwistGauge,
  CABLE_PRESETS,
  DEFAULT_TWIST_CONSTRAINTS,
} from '@aspect/roboviz-core/capabilities/cable-management';

function RobotSceneWithCable() {
  const robotId = 'main-robot';

  return (
    <CableManagementProvider
      robotId={robotId}
      initialCables={[
        {
          id: 'main-cable',
          anchorPoint: {
            type: 'world',
            offset: [-0.5, 0, 0.1]
          },
          attachmentPoint: {
            type: 'tcp',
            offset: [0, 0, 0]
          },
          properties: {
            ...CABLE_PRESETS.welding,
            label: 'Welding Cable',
          },
          twistConstraints: DEFAULT_TWIST_CONSTRAINTS,
        }
      ]}
      onCableEvent={(event) => {
        if (event.type === 'twist_warning') {
          console.warn(`Cable ${event.cableId}: ${event.level}`);
        }
      }}
    >
      <Canvas>
        <Robot id={robotId} />
        <CableVisualizer robotId={robotId} />
      </Canvas>

      {/* HUD */}
      <div className="cable-hud">
        <CableTwistGauge cableId="main-cable" mode="2d" />
      </div>
    </CableManagementProvider>
  );
}
```

### 高级：轨迹规划集成

```tsx
import { useCablePlanning } from '@aspect/roboviz-core/capabilities/cable-management';

function CableAwareTrajectoryPlanner() {
  const { planPath, isPlanning } = useCablePlanning({ robotId: 'main' });
  const { state } = useCableManagement();

  const handlePlanPath = async (goal: number[]) => {
    const cableConfig = state.cables.get('main-cable');
    if (!cableConfig) return;

    const currentJoints = getCurrentJoints(); // 从其他地方获取
    const currentTwist = state.cableStates.get('main-cable')?.currentTwist ?? 0;

    const result = await planPath({
      startJoints: currentJoints,
      startTwist: currentTwist,
      goalJoints: goal,
      cableConfig,
      options: {
        enableAutoUnwind: true,
        maxPlanningTime: 5000,
        checkCollision: true,
        optimizationGoal: 'balanced',
      },
    });

    if (result.success) {
      if (result.hasUnwindMotion) {
        console.log('Path includes unwind motion');
      }
      // 使用 result.path 执行轨迹
    }
  };

  return (
    <button onClick={() => handlePlanPath([0, 0, 0, 0, 0, 0])} disabled={isPlanning}>
      {isPlanning ? 'Planning...' : 'Plan Path'}
    </button>
  );
}
```

---

## 路线图

### Phase 1: 基础能力 (Week 1-2)
- [x] 类型定义
- [ ] CableManagementContext 实现
- [ ] 基础扭转计算（前端）
- [ ] CableTwistGauge 组件
- [ ] 基本单元测试

### Phase 2: 可视化 (Week 2-3)
- [ ] CableVisualizer 组件
- [ ] 样条曲线生成
- [ ] 应力颜色映射
- [ ] 附着点标记

### Phase 3: trajx 集成 (Week 3-4, 依赖 trajx 实现)
- [ ] useCablePlanning hook
- [ ] 轨迹分析功能
- [ ] 自动解缠建议

### Phase 4: Process 集成 (Week 4-5)
- [ ] 焊接流程集成
- [ ] 轨迹叠加显示
- [ ] 周期优化 UI

### Phase 5: 优化与完善 (Week 5-6)
- [ ] 性能优化
- [ ] 完整文档
- [ ] 集成测试
- [ ] Demo 场景

---

## 相关 Issues

- trajx: [Feature: Cable-Aware Motion Planning](https://github.com/yuanweima/trajx/issues/51)
