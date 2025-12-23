/**
 * RoboViz Multi-Robot Manager
 *
 * 多机器人协调管理器实现
 */

import type { PlaybackOptions } from '../types';
import type {
  RobotGroup,
  CoordinationType,
  CooperativeConfig,
  SynchronizedTrajectory,
  SyncPlaybackState,
  Workspace,
  IMultiRobotManager,
  MultiRobotEventType,
  MultiRobotEvent,
  RobotGroupVisualization,
  WorkspaceVisualization,
} from './types';
import {
  DEFAULT_GROUP_VISUALIZATION,
  DEFAULT_WORKSPACE_VISUALIZATION,
} from './types';

// ============================================================================
// Types
// ============================================================================

type MultiRobotEventCallback = (event: MultiRobotEvent) => void;

/**
 * 配置
 */
export interface MultiRobotManagerConfig {
  /** 同步播放更新间隔 (ms) */
  syncUpdateInterval?: number;
  /** 默认组可视化 */
  defaultGroupVisualization?: Partial<RobotGroupVisualization>;
  /** 默认工作空间可视化 */
  defaultWorkspaceVisualization?: Partial<WorkspaceVisualization>;
}

const DEFAULT_CONFIG: Required<MultiRobotManagerConfig> = {
  syncUpdateInterval: 16, // ~60fps
  defaultGroupVisualization: {},
  defaultWorkspaceVisualization: {},
};

// ============================================================================
// Multi-Robot Manager Implementation
// ============================================================================

/**
 * 多机器人管理器
 */
export class MultiRobotManager implements IMultiRobotManager {
  private readonly config: Required<MultiRobotManagerConfig>;
  private readonly groups: Map<string, RobotGroup> = new Map();
  private readonly trajectories: Map<string, SynchronizedTrajectory> = new Map();
  private readonly playbackStates: Map<string, SyncPlaybackState> = new Map();
  private readonly workspaces: Map<string, Workspace> = new Map();
  private readonly eventListeners: Map<MultiRobotEventType, Set<MultiRobotEventCallback>> = new Map();
  private readonly playbackTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  // Bridge handler for workspace calculations
  private bridgeHandler?: (method: string, params: Record<string, unknown>) => Promise<unknown>;

  constructor(config: MultiRobotManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Robot Group Management
  // ==========================================================================

  createGroup(group: RobotGroup): void {
    if (this.groups.has(group.id)) {
      throw new Error(`Group '${group.id}' already exists`);
    }

    // Apply default visualization
    const visualization: RobotGroupVisualization = {
      ...DEFAULT_GROUP_VISUALIZATION,
      ...this.config.defaultGroupVisualization,
      ...group.visualization,
    };

    const newGroup = { ...group, visualization };
    this.groups.set(group.id, newGroup);
    this.emitEvent('group_created', { group: newGroup });
  }

  deleteGroup(groupId: string): void {
    if (!this.groups.has(groupId)) {
      return;
    }

    // Stop any synchronized playback
    this.stopSynchronized(groupId);

    this.groups.delete(groupId);
    this.emitEvent('group_deleted', { groupId });
  }

  updateGroup(groupId: string, updates: Partial<RobotGroup>): void {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group '${groupId}' not found`);
    }

    const updatedGroup = { ...group, ...updates };
    if (updates.visualization) {
      updatedGroup.visualization = { ...group.visualization, ...updates.visualization };
    }

    this.groups.set(groupId, updatedGroup);
    this.emitEvent('group_updated', { group: updatedGroup });
  }

  getGroup(groupId: string): RobotGroup | undefined {
    return this.groups.get(groupId);
  }

  getGroups(): RobotGroup[] {
    return Array.from(this.groups.values());
  }

  addRobotToGroup(groupId: string, robotId: string): void {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group '${groupId}' not found`);
    }

    if (group.robotIds.includes(robotId)) {
      return; // Already in group
    }

    group.robotIds.push(robotId);
    this.emitEvent('robot_added_to_group', { groupId, robotId });
  }

  removeRobotFromGroup(groupId: string, robotId: string): void {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group '${groupId}' not found`);
    }

    const index = group.robotIds.indexOf(robotId);
    if (index === -1) {
      return; // Not in group
    }

    group.robotIds.splice(index, 1);

    // If this was the master, clear it
    if (group.masterRobotId === robotId) {
      group.masterRobotId = undefined;
    }

    this.emitEvent('robot_removed_from_group', { groupId, robotId });
  }

  // ==========================================================================
  // Coordination Settings
  // ==========================================================================

  setCoordinationType(groupId: string, type: CoordinationType): void {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group '${groupId}' not found`);
    }

    group.coordinationType = type;
    this.emitEvent('group_updated', { group });
  }

  setMasterRobot(groupId: string, robotId: string): void {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group '${groupId}' not found`);
    }

    if (!group.robotIds.includes(robotId)) {
      throw new Error(`Robot '${robotId}' is not a member of group '${groupId}'`);
    }

    group.masterRobotId = robotId;
    this.emitEvent('group_updated', { group });
  }

  setCooperativeConfig(groupId: string, config: CooperativeConfig): void {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error(`Group '${groupId}' not found`);
    }

    group.cooperativeConfig = config;
    this.emitEvent('group_updated', { group });
  }

  // ==========================================================================
  // Synchronized Trajectory Management
  // ==========================================================================

  loadSynchronizedTrajectory(trajectory: SynchronizedTrajectory): void {
    this.trajectories.set(trajectory.id, trajectory);

    // Initialize playback state
    const robotStates: Record<string, { currentTime: number; progress: number; isReady: boolean }> = {};
    for (const item of trajectory.items) {
      robotStates[item.robotId] = {
        currentTime: 0,
        progress: 0,
        isReady: true,
      };
    }

    this.playbackStates.set(trajectory.id, {
      trajectoryId: trajectory.id,
      isPlaying: false,
      currentTime: 0,
      speed: 1,
      loop: false,
      robotStates,
    });
  }

  unloadSynchronizedTrajectory(trajectoryId: string): void {
    // Stop playback first
    const trajectory = this.trajectories.get(trajectoryId);
    if (trajectory) {
      this.stopSynchronized(trajectory.groupId);
    }

    this.trajectories.delete(trajectoryId);
    this.playbackStates.delete(trajectoryId);
  }

  getSynchronizedTrajectory(trajectoryId: string): SynchronizedTrajectory | undefined {
    return this.trajectories.get(trajectoryId);
  }

  // ==========================================================================
  // Synchronized Playback
  // ==========================================================================

  playSynchronized(groupId: string, options?: PlaybackOptions): void {
    const trajectory = this.findTrajectoryForGroup(groupId);
    if (!trajectory) {
      throw new Error(`No trajectory loaded for group '${groupId}'`);
    }

    const state = this.playbackStates.get(trajectory.id);
    if (!state) {
      return;
    }

    // Apply options
    if (options?.speed !== undefined) {
      state.speed = options.speed;
    }
    if (options?.loop !== undefined) {
      state.loop = options.loop;
    }

    state.isPlaying = true;

    // Start playback timer
    this.startPlaybackTimer(trajectory.id);
    this.emitEvent('sync_playback_started', { groupId, trajectoryId: trajectory.id });
  }

  pauseSynchronized(groupId: string): void {
    const trajectory = this.findTrajectoryForGroup(groupId);
    if (!trajectory) {
      return;
    }

    const state = this.playbackStates.get(trajectory.id);
    if (state) {
      state.isPlaying = false;
      this.stopPlaybackTimer(trajectory.id);
      this.emitEvent('sync_playback_paused', { groupId, trajectoryId: trajectory.id });
    }
  }

  stopSynchronized(groupId: string): void {
    const trajectory = this.findTrajectoryForGroup(groupId);
    if (!trajectory) {
      return;
    }

    const state = this.playbackStates.get(trajectory.id);
    if (state) {
      state.isPlaying = false;
      state.currentTime = 0;

      // Reset all robot states
      for (const robotId of Object.keys(state.robotStates)) {
        state.robotStates[robotId].currentTime = 0;
        state.robotStates[robotId].progress = 0;
      }

      this.stopPlaybackTimer(trajectory.id);
      this.emitEvent('sync_playback_stopped', { groupId, trajectoryId: trajectory.id });
    }
  }

  seekSynchronized(groupId: string, time: number): void {
    const trajectory = this.findTrajectoryForGroup(groupId);
    if (!trajectory) {
      return;
    }

    const state = this.playbackStates.get(trajectory.id);
    if (state) {
      const clampedTime = Math.max(0, Math.min(time, trajectory.totalDuration));
      state.currentTime = clampedTime;
      this.updateRobotStates(trajectory.id, clampedTime);
    }
  }

  getSyncPlaybackState(groupId: string): SyncPlaybackState | undefined {
    const trajectory = this.findTrajectoryForGroup(groupId);
    if (!trajectory) {
      return undefined;
    }
    return this.playbackStates.get(trajectory.id);
  }

  // ==========================================================================
  // Workspace Management
  // ==========================================================================

  addWorkspace(workspace: Workspace): void {
    // Apply default visualization
    const visualization: WorkspaceVisualization = {
      ...DEFAULT_WORKSPACE_VISUALIZATION,
      ...this.config.defaultWorkspaceVisualization,
      ...workspace.visualization,
    };

    this.workspaces.set(workspace.id, { ...workspace, visualization });
    this.emitEvent('workspace_calculated', { workspace: this.workspaces.get(workspace.id) });
  }

  removeWorkspace(id: string): void {
    this.workspaces.delete(id);
  }

  updateWorkspace(id: string, updates: Partial<Workspace>): void {
    const workspace = this.workspaces.get(id);
    if (!workspace) {
      throw new Error(`Workspace '${id}' not found`);
    }

    const updatedWorkspace = { ...workspace, ...updates };
    if (updates.visualization) {
      updatedWorkspace.visualization = { ...workspace.visualization, ...updates.visualization };
    }

    this.workspaces.set(id, updatedWorkspace);
    this.emitEvent('workspace_calculated', { workspace: updatedWorkspace });
  }

  getWorkspace(id: string): Workspace | undefined {
    return this.workspaces.get(id);
  }

  getWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  getWorkspacesForRobot(robotId: string): Workspace[] {
    return Array.from(this.workspaces.values()).filter((w) => w.robotId === robotId);
  }

  // ==========================================================================
  // Workspace Calculation (Bridge)
  // ==========================================================================

  async calculateReachableWorkspace(robotId: string, resolution?: number): Promise<Workspace> {
    if (!this.bridgeHandler) {
      throw new Error('Bridge handler not configured');
    }

    const result = await this.bridgeHandler('robot.calculateWorkspace', {
      robotId,
      type: 'reachable',
      resolution: resolution ?? 0.05,
    });

    const workspace = result as Workspace;
    this.addWorkspace(workspace);
    return workspace;
  }

  async calculateSharedWorkspace(robotIds: string[], resolution?: number): Promise<Workspace> {
    if (!this.bridgeHandler) {
      throw new Error('Bridge handler not configured');
    }

    const result = await this.bridgeHandler('robot.calculateSharedWorkspace', {
      robotIds,
      resolution: resolution ?? 0.05,
    });

    const workspace = result as Workspace;
    this.addWorkspace(workspace);
    return workspace;
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onGroupChanged(callback: (group: RobotGroup) => void): () => void {
    const types: MultiRobotEventType[] = ['group_created', 'group_updated'];
    const unsubscribers = types.map((type) =>
      this.addEventListener(type, (event) => {
        if (event.data && (event.data as { group?: RobotGroup }).group) {
          callback((event.data as { group: RobotGroup }).group);
        }
      })
    );
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  onSyncPlaybackChanged(callback: (state: SyncPlaybackState) => void): () => void {
    const types: MultiRobotEventType[] = [
      'sync_playback_started',
      'sync_playback_paused',
      'sync_playback_stopped',
    ];
    const unsubscribers = types.map((type) =>
      this.addEventListener(type, (event) => {
        const trajectoryId = (event.data as { trajectoryId?: string })?.trajectoryId;
        if (trajectoryId) {
          const state = this.playbackStates.get(trajectoryId);
          if (state) {
            callback(state);
          }
        }
      })
    );
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  onWorkspaceChanged(callback: (workspace: Workspace) => void): () => void {
    return this.addEventListener('workspace_calculated', (event) => {
      if (event.data && (event.data as { workspace?: Workspace }).workspace) {
        callback((event.data as { workspace: Workspace }).workspace);
      }
    });
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

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  dispose(): void {
    // Stop all playback timers
    for (const trajectoryId of this.playbackTimers.keys()) {
      this.stopPlaybackTimer(trajectoryId);
    }

    this.groups.clear();
    this.trajectories.clear();
    this.playbackStates.clear();
    this.workspaces.clear();
    this.eventListeners.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private findTrajectoryForGroup(groupId: string): SynchronizedTrajectory | undefined {
    for (const trajectory of this.trajectories.values()) {
      if (trajectory.groupId === groupId) {
        return trajectory;
      }
    }
    return undefined;
  }

  private startPlaybackTimer(trajectoryId: string): void {
    this.stopPlaybackTimer(trajectoryId);

    const timer = setInterval(() => {
      this.updatePlayback(trajectoryId);
    }, this.config.syncUpdateInterval);

    this.playbackTimers.set(trajectoryId, timer);
  }

  private stopPlaybackTimer(trajectoryId: string): void {
    const timer = this.playbackTimers.get(trajectoryId);
    if (timer) {
      clearInterval(timer);
      this.playbackTimers.delete(trajectoryId);
    }
  }

  private updatePlayback(trajectoryId: string): void {
    const state = this.playbackStates.get(trajectoryId);
    const trajectory = this.trajectories.get(trajectoryId);

    if (!state || !trajectory || !state.isPlaying) {
      return;
    }

    // Advance time
    const deltaTime = this.config.syncUpdateInterval * state.speed;
    state.currentTime += deltaTime;

    // Check for loop or end
    if (state.currentTime >= trajectory.totalDuration) {
      if (state.loop) {
        state.currentTime = 0;
      } else {
        state.currentTime = trajectory.totalDuration;
        state.isPlaying = false;
        this.stopPlaybackTimer(trajectoryId);
        this.emitEvent('sync_playback_stopped', {
          groupId: trajectory.groupId,
          trajectoryId,
        });
        return;
      }
    }

    // Update robot states
    this.updateRobotStates(trajectoryId, state.currentTime);

    // Check sync points
    this.checkSyncPoints(trajectory, state.currentTime);
  }

  private updateRobotStates(trajectoryId: string, currentTime: number): void {
    const state = this.playbackStates.get(trajectoryId);
    const trajectory = this.trajectories.get(trajectoryId);

    if (!state || !trajectory) {
      return;
    }

    for (const item of trajectory.items) {
      const robotTime = (currentTime - item.timeOffset) * (item.speedScale ?? 1);
      const progress = Math.max(0, Math.min(1, robotTime / trajectory.totalDuration));

      state.robotStates[item.robotId] = {
        currentTime: Math.max(0, robotTime),
        progress,
        isReady: true,
      };
    }
  }

  private checkSyncPoints(trajectory: SynchronizedTrajectory, currentTime: number): void {
    if (!trajectory.syncPoints) {
      return;
    }

    const previousTime = currentTime - this.config.syncUpdateInterval;

    for (const syncPoint of trajectory.syncPoints) {
      if (syncPoint.time > previousTime && syncPoint.time <= currentTime) {
        this.emitEvent('sync_point_reached', {
          trajectoryId: trajectory.id,
          syncPoint,
          actualStates: {}, // Would be filled with actual robot states in real implementation
        });
      }
    }
  }

  private addEventListener(
    type: MultiRobotEventType,
    callback: MultiRobotEventCallback
  ): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(callback);

    return () => {
      this.eventListeners.get(type)?.delete(callback);
    };
  }

  private emitEvent(type: MultiRobotEventType, data: unknown): void {
    const event: MultiRobotEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in multi-robot event listener for '${type}':`, error);
        }
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建多机器人管理器
 */
export function createMultiRobotManager(config?: MultiRobotManagerConfig): MultiRobotManager {
  return new MultiRobotManager(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalMultiRobotManager: MultiRobotManager | null = null;

/**
 * 获取全局多机器人管理器
 */
export function getMultiRobotManager(): MultiRobotManager {
  if (!globalMultiRobotManager) {
    globalMultiRobotManager = createMultiRobotManager();
  }
  return globalMultiRobotManager;
}

/**
 * 重置全局多机器人管理器
 */
export function resetMultiRobotManager(): void {
  if (globalMultiRobotManager) {
    globalMultiRobotManager.dispose();
    globalMultiRobotManager = null;
  }
}
