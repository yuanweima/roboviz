/**
 * RoboViz Diagnostic Manager
 *
 * 诊断可视化管理器
 */

import type {
  DiagnosticDisplayConfig,
  WorkspaceVisConfig,
  SingularityConfig,
  SingularityState,
  JointLimitConfig,
  JointLimitState,
  VelocityVisConfig,
  IDiagnosticManager,
  DiagnosticEventType,
  DiagnosticEvent,
} from './types';

// ============================================================================
// Types
// ============================================================================

type DiagnosticEventCallback = (event: DiagnosticEvent) => void;
type SingularityCallback = (state: SingularityState) => void;
type JointLimitCallback = (state: JointLimitState) => void;

interface DiagnosticHistoryData {
  timestamps: number[];
  values: Map<string, number[]>; // key: dataType, value: history values
}

/**
 * 诊断管理器配置
 */
export interface DiagnosticManagerConfig {
  /** 默认历史数据长度 */
  defaultHistoryLength?: number;
  /** 奇异点检测更新间隔 (ms) */
  singularityCheckInterval?: number;
  /** 关节限位检测更新间隔 (ms) */
  jointLimitCheckInterval?: number;
}

const DEFAULT_CONFIG: Required<DiagnosticManagerConfig> = {
  defaultHistoryLength: 200,
  singularityCheckInterval: 50,
  jointLimitCheckInterval: 50,
};

// ============================================================================
// Diagnostic Manager Implementation
// ============================================================================

/**
 * 诊断管理器
 */
export class DiagnosticManager implements IDiagnosticManager {
  private readonly config: Required<DiagnosticManagerConfig>;

  // Active diagnostics
  private readonly jointDiagnostics: Map<string, DiagnosticDisplayConfig> = new Map();
  private readonly workspaceVisualizations: Map<string, WorkspaceVisConfig> = new Map();
  private readonly singularityConfigs: Map<string, SingularityConfig> = new Map();
  private readonly jointLimitConfigs: Map<string, JointLimitConfig> = new Map();
  private readonly velocityVisConfigs: Map<string, VelocityVisConfig> = new Map();

  // State tracking
  private readonly singularityStates: Map<string, SingularityState> = new Map();
  private readonly jointLimitStates: Map<string, JointLimitState[]> = new Map();
  private readonly historyData: Map<string, DiagnosticHistoryData> = new Map();

  // Event listeners
  private readonly eventListeners: Map<DiagnosticEventType, Set<DiagnosticEventCallback>> = new Map();
  private readonly singularityCallbacks: Set<SingularityCallback> = new Set();
  private readonly jointLimitCallbacks: Set<JointLimitCallback> = new Set();

  // Update timers
  private readonly updateTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  // Bridge handler for workspace calculation
  private bridgeHandler?: (method: string, params: Record<string, unknown>) => Promise<unknown>;

  constructor(config: DiagnosticManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Joint Diagnostic
  // ==========================================================================

  showJointDiagnostic(config: DiagnosticDisplayConfig): void {
    this.jointDiagnostics.set(config.robotId, config);

    // Initialize history data
    this.historyData.set(config.robotId, {
      timestamps: [],
      values: new Map(config.dataTypes.map((t) => [t, []])),
    });

    // Start update timer
    this.startJointDiagnosticUpdate(config.robotId, config.updateInterval);
  }

  hideJointDiagnostic(robotId: string): void {
    this.jointDiagnostics.delete(robotId);
    this.historyData.delete(robotId);
    this.stopTimer(`joint_${robotId}`);
  }

  updateJointDiagnostic(robotId: string, updates: Partial<DiagnosticDisplayConfig>): void {
    const config = this.jointDiagnostics.get(robotId);
    if (!config) {
      throw new Error(`Joint diagnostic for robot '${robotId}' not found`);
    }

    const updatedConfig = { ...config, ...updates };
    this.jointDiagnostics.set(robotId, updatedConfig);

    // Update timer if interval changed
    if (updates.updateInterval) {
      this.stopTimer(`joint_${robotId}`);
      this.startJointDiagnosticUpdate(robotId, updates.updateInterval);
    }

    // Update history data types if changed
    if (updates.dataTypes) {
      const history = this.historyData.get(robotId);
      if (history) {
        history.values = new Map(updates.dataTypes.map((t) => [t, []]));
        history.timestamps = [];
      }
    }
  }

  // ==========================================================================
  // Workspace Visualization
  // ==========================================================================

  async showWorkspace(config: WorkspaceVisConfig): Promise<void> {
    // Would trigger workspace calculation via bridge
    if (this.bridgeHandler) {
      await this.bridgeHandler('robot.calculateWorkspace', {
        robotId: config.robotId,
        type: config.type,
        resolution: config.resolution,
      });
    }

    this.workspaceVisualizations.set(config.robotId, config);
  }

  hideWorkspace(robotId: string): void {
    this.workspaceVisualizations.delete(robotId);
  }

  // ==========================================================================
  // Singularity Visualization
  // ==========================================================================

  showSingularity(config: SingularityConfig): void {
    this.singularityConfigs.set(config.robotId, config);

    // Initialize state
    this.singularityStates.set(config.robotId, {
      robotId: config.robotId,
      proximity: 0,
      conditionNumber: 1,
      determinant: 1,
      isWarning: false,
      isDanger: false,
    });

    // Start monitoring
    this.startSingularityMonitoring(config.robotId);
  }

  hideSingularity(robotId: string): void {
    this.singularityConfigs.delete(robotId);
    this.singularityStates.delete(robotId);
    this.stopTimer(`singularity_${robotId}`);
  }

  getSingularityState(robotId: string): SingularityState | undefined {
    return this.singularityStates.get(robotId);
  }

  onSingularityChanged(callback: SingularityCallback): () => void {
    this.singularityCallbacks.add(callback);
    return () => {
      this.singularityCallbacks.delete(callback);
    };
  }

  // ==========================================================================
  // Joint Limits
  // ==========================================================================

  showJointLimits(config: JointLimitConfig): void {
    this.jointLimitConfigs.set(config.robotId, config);

    // Start monitoring
    this.startJointLimitMonitoring(config.robotId);
  }

  hideJointLimits(robotId: string): void {
    this.jointLimitConfigs.delete(robotId);
    this.jointLimitStates.delete(robotId);
    this.stopTimer(`jointlimit_${robotId}`);
  }

  getJointLimitStates(robotId: string): JointLimitState[] {
    return this.jointLimitStates.get(robotId) ?? [];
  }

  onJointLimitWarning(callback: JointLimitCallback): () => void {
    this.jointLimitCallbacks.add(callback);
    return () => {
      this.jointLimitCallbacks.delete(callback);
    };
  }

  // ==========================================================================
  // Velocity Visualization
  // ==========================================================================

  showVelocityVis(config: VelocityVisConfig): void {
    this.velocityVisConfigs.set(config.robotId, config);
  }

  hideVelocityVis(robotId: string): void {
    this.velocityVisConfigs.delete(robotId);
  }

  // ==========================================================================
  // Global Control
  // ==========================================================================

  hideAll(): void {
    // Clear all diagnostics
    for (const robotId of this.jointDiagnostics.keys()) {
      this.hideJointDiagnostic(robotId);
    }
    for (const robotId of this.workspaceVisualizations.keys()) {
      this.hideWorkspace(robotId);
    }
    for (const robotId of this.singularityConfigs.keys()) {
      this.hideSingularity(robotId);
    }
    for (const robotId of this.jointLimitConfigs.keys()) {
      this.hideJointLimits(robotId);
    }
    for (const robotId of this.velocityVisConfigs.keys()) {
      this.hideVelocityVis(robotId);
    }
  }

  getActiveDiagnostics(): string[] {
    const robotIds = new Set<string>();

    for (const robotId of this.jointDiagnostics.keys()) {
      robotIds.add(robotId);
    }
    for (const robotId of this.workspaceVisualizations.keys()) {
      robotIds.add(robotId);
    }
    for (const robotId of this.singularityConfigs.keys()) {
      robotIds.add(robotId);
    }
    for (const robotId of this.jointLimitConfigs.keys()) {
      robotIds.add(robotId);
    }
    for (const robotId of this.velocityVisConfigs.keys()) {
      robotIds.add(robotId);
    }

    return Array.from(robotIds);
  }

  // ==========================================================================
  // Data Update (to be called by external system)
  // ==========================================================================

  /**
   * 更新关节诊断数据 (由流系统调用)
   */
  updateJointData(
    robotId: string,
    data: Record<string, number[]> // key: dataType, value: joint values
  ): void {
    const history = this.historyData.get(robotId);
    if (!history) {
      return;
    }

    const now = Date.now();
    history.timestamps.push(now);

    const config = this.jointDiagnostics.get(robotId);
    const maxLength = config?.historyLength ?? this.config.defaultHistoryLength;

    // Trim old data
    if (history.timestamps.length > maxLength) {
      history.timestamps.shift();
    }

    // Update each data type
    for (const [dataType, values] of Object.entries(data)) {
      const historyValues = history.values.get(dataType);
      if (historyValues) {
        // Store average or first joint value for simplicity
        historyValues.push(values[0] ?? 0);
        if (historyValues.length > maxLength) {
          historyValues.shift();
        }
      }
    }
  }

  /**
   * 更新奇异点状态 (由后端或计算系统调用)
   */
  updateSingularityState(robotId: string, state: Partial<SingularityState>): void {
    const current = this.singularityStates.get(robotId);
    if (!current) {
      return;
    }

    const config = this.singularityConfigs.get(robotId);
    const threshold = config?.proximityThreshold ?? 0.1;

    const updated: SingularityState = {
      ...current,
      ...state,
      isWarning: (state.proximity ?? current.proximity) > threshold * 0.5,
      isDanger: (state.proximity ?? current.proximity) > threshold,
    };

    this.singularityStates.set(robotId, updated);

    // Notify callbacks
    for (const callback of this.singularityCallbacks) {
      try {
        callback(updated);
      } catch (error) {
        console.error('Error in singularity callback:', error);
      }
    }

    // Emit events
    if (updated.isDanger && !current.isDanger) {
      this.emitEvent('singularity_danger', robotId, { state: updated });
    } else if (updated.isWarning && !current.isWarning) {
      this.emitEvent('singularity_warning', robotId, { state: updated });
    }
  }

  /**
   * 更新关节限位状态 (由后端或计算系统调用)
   */
  updateJointLimitStates(robotId: string, states: JointLimitState[]): void {
    this.jointLimitStates.set(robotId, states);

    // Check for warnings
    for (const state of states) {
      if (state.nearHardLimit) {
        this.emitEvent('joint_limit_reached', robotId, { state });
        for (const callback of this.jointLimitCallbacks) {
          try {
            callback(state);
          } catch (error) {
            console.error('Error in joint limit callback:', error);
          }
        }
      } else if (state.nearSoftLimit) {
        this.emitEvent('joint_limit_warning', robotId, { state });
        for (const callback of this.jointLimitCallbacks) {
          try {
            callback(state);
          } catch (error) {
            console.error('Error in joint limit callback:', error);
          }
        }
      }
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * 设置 Bridge 处理器 (用于工作空间计算)
   */
  setBridgeHandler(handler: (method: string, params: Record<string, unknown>) => Promise<unknown>): void {
    this.bridgeHandler = handler;
  }

  /**
   * 获取关节诊断配置
   */
  getJointDiagnosticConfig(robotId: string): DiagnosticDisplayConfig | undefined {
    return this.jointDiagnostics.get(robotId);
  }

  /**
   * 获取工作空间可视化配置
   */
  getWorkspaceVisConfig(robotId: string): WorkspaceVisConfig | undefined {
    return this.workspaceVisualizations.get(robotId);
  }

  /**
   * 获取奇异点配置
   */
  getSingularityConfig(robotId: string): SingularityConfig | undefined {
    return this.singularityConfigs.get(robotId);
  }

  /**
   * 获取关节限位配置
   */
  getJointLimitConfig(robotId: string): JointLimitConfig | undefined {
    return this.jointLimitConfigs.get(robotId);
  }

  /**
   * 获取速度可视化配置
   */
  getVelocityVisConfig(robotId: string): VelocityVisConfig | undefined {
    return this.velocityVisConfigs.get(robotId);
  }

  /**
   * 获取历史数据
   */
  getHistoryData(robotId: string): DiagnosticHistoryData | undefined {
    return this.historyData.get(robotId);
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  dispose(): void {
    this.hideAll();
    this.eventListeners.clear();
    this.singularityCallbacks.clear();
    this.jointLimitCallbacks.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private startJointDiagnosticUpdate(robotId: string, interval: number): void {
    const timerId = `joint_${robotId}`;
    this.stopTimer(timerId);

    const timer = setInterval(() => {
      // In real implementation, would fetch latest data and update history
    }, interval);

    this.updateTimers.set(timerId, timer);
  }

  private startSingularityMonitoring(robotId: string): void {
    const timerId = `singularity_${robotId}`;
    this.stopTimer(timerId);

    const timer = setInterval(() => {
      // In real implementation, would calculate Jacobian condition number
      // and update singularity state
    }, this.config.singularityCheckInterval);

    this.updateTimers.set(timerId, timer);
  }

  private startJointLimitMonitoring(robotId: string): void {
    const timerId = `jointlimit_${robotId}`;
    this.stopTimer(timerId);

    const timer = setInterval(() => {
      // In real implementation, would check joint positions against limits
    }, this.config.jointLimitCheckInterval);

    this.updateTimers.set(timerId, timer);
  }

  private stopTimer(timerId: string): void {
    const timer = this.updateTimers.get(timerId);
    if (timer) {
      clearInterval(timer);
      this.updateTimers.delete(timerId);
    }
  }

  private emitEvent(type: DiagnosticEventType, robotId: string, data: unknown): void {
    const event: DiagnosticEvent = {
      type,
      timestamp: Date.now(),
      robotId,
      data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in diagnostic event listener for '${type}':`, error);
        }
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建诊断管理器
 */
export function createDiagnosticManager(config?: DiagnosticManagerConfig): DiagnosticManager {
  return new DiagnosticManager(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalDiagnosticManager: DiagnosticManager | null = null;

/**
 * 获取全局诊断管理器
 */
export function getDiagnosticManager(): DiagnosticManager {
  if (!globalDiagnosticManager) {
    globalDiagnosticManager = createDiagnosticManager();
  }
  return globalDiagnosticManager;
}

/**
 * 重置全局诊断管理器
 */
export function resetDiagnosticManager(): void {
  if (globalDiagnosticManager) {
    globalDiagnosticManager.dispose();
    globalDiagnosticManager = null;
  }
}
