/**
 * RoboViz Scene Manager
 *
 * 场景管理器实现
 */

import type {
  SceneSnapshot,
  SceneExportFormat,
  SceneExportOptions,
  SceneImportOptions,
  ImportResult,
  Operation,
  OperationType,
  HistoryConfig,
  ISceneManager,
  SceneEventType,
  SceneEvent,
} from './types';
import {
  SNAPSHOT_VERSION,
  DEFAULT_HISTORY_CONFIG,
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_IMPORT_OPTIONS,
} from './types';

// ============================================================================
// Types
// ============================================================================

type SceneEventCallback = (event: SceneEvent) => void;
type SnapshotCallback = (snapshot: SceneSnapshot) => void;
type VoidCallback = () => void;

/**
 * 场景管理器配置
 */
export interface SceneManagerConfig {
  /** 历史记录配置 */
  historyConfig?: Partial<HistoryConfig>;
  /** 最大快照数量 */
  maxSnapshots?: number;
}

const DEFAULT_CONFIG: Required<SceneManagerConfig> = {
  historyConfig: {},
  maxSnapshots: 50,
};

// ============================================================================
// Scene Manager Implementation
// ============================================================================

/**
 * 场景管理器
 */
export class SceneManager implements ISceneManager {
  private readonly config: Required<SceneManagerConfig>;
  private historyConfig: HistoryConfig;

  // Storage
  private readonly snapshots: Map<string, SceneSnapshot> = new Map();
  private readonly undoStack: Operation[] = [];
  private readonly redoStack: Operation[] = [];

  // Callbacks
  private readonly eventListeners: Map<SceneEventType, Set<SceneEventCallback>> = new Map();
  private readonly snapshotCreatedCallbacks: Set<SnapshotCallback> = new Set();
  private readonly snapshotRestoredCallbacks: Set<(id: string) => void> = new Set();
  private readonly historyChangedCallbacks: Set<VoidCallback> = new Set();

  // State getters (to be set by external system)
  private sceneStateGetter?: () => Promise<Omit<SceneSnapshot, 'id' | 'name' | 'timestamp' | 'version'>>;
  private sceneStateRestorer?: (snapshot: SceneSnapshot) => Promise<void>;
  private thumbnailGenerator?: () => Promise<string>;

  private operationIdCounter = 0;

  constructor(config: SceneManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.historyConfig = {
      ...DEFAULT_HISTORY_CONFIG,
      ...config.historyConfig,
    };
  }

  // ==========================================================================
  // Snapshot Management
  // ==========================================================================

  async createSnapshot(name: string, metadata?: Record<string, unknown>): Promise<SceneSnapshot> {
    const id = this.generateSnapshotId();
    const timestamp = Date.now();

    // Get current scene state
    let sceneState: Omit<SceneSnapshot, 'id' | 'name' | 'timestamp' | 'version'>;
    if (this.sceneStateGetter) {
      sceneState = await this.sceneStateGetter();
    } else {
      // Default empty state
      sceneState = {
        scene: {
          background: '#1a1a1a',
          grid: {
            enabled: true,
            size: 10,
            divisions: 10,
            color: '#4a4a4a',
          },
          lighting: {
            ambient: { intensity: 0.5, color: '#ffffff' },
            directional: { intensity: 0.8, position: { x: 5, y: 5, z: 5 } },
          },
        },
        robots: [],
        obstacles: [],
        trajectories: [],
        waypoints: [],
        camera: {
          position: { x: 5, y: 5, z: 5 },
          target: { x: 0, y: 0, z: 0 },
          fov: 45,
        },
        frames: [],
        safetyZones: [],
      };
    }

    // Generate thumbnail
    let thumbnail: string | undefined;
    if (this.thumbnailGenerator) {
      try {
        thumbnail = await this.thumbnailGenerator();
      } catch {
        // Ignore thumbnail errors
      }
    }

    const snapshot: SceneSnapshot = {
      id,
      name,
      timestamp,
      version: SNAPSHOT_VERSION,
      ...sceneState,
      metadata,
      thumbnail,
    };

    // Store snapshot
    this.snapshots.set(id, snapshot);

    // Enforce max snapshots
    if (this.snapshots.size > this.config.maxSnapshots) {
      const oldest = Array.from(this.snapshots.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest) {
        this.snapshots.delete(oldest.id);
      }
    }

    // Notify callbacks
    this.emitEvent('snapshot_created', snapshot);
    for (const callback of this.snapshotCreatedCallbacks) {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('Error in snapshot created callback:', error);
      }
    }

    return snapshot;
  }

  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot '${snapshotId}' not found`);
    }

    // Restore scene state
    if (this.sceneStateRestorer) {
      await this.sceneStateRestorer(snapshot);
    }

    // Notify callbacks
    this.emitEvent('snapshot_restored', snapshotId);
    for (const callback of this.snapshotRestoredCallbacks) {
      try {
        callback(snapshotId);
      } catch (error) {
        console.error('Error in snapshot restored callback:', error);
      }
    }
  }

  deleteSnapshot(snapshotId: string): void {
    if (this.snapshots.delete(snapshotId)) {
      this.emitEvent('snapshot_deleted', snapshotId);
    }
  }

  getSnapshot(snapshotId: string): SceneSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  listSnapshots(): SceneSnapshot[] {
    return Array.from(this.snapshots.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  async exportScene(options: SceneExportOptions = DEFAULT_EXPORT_OPTIONS): Promise<string | ArrayBuffer> {
    const mergedOptions = { ...DEFAULT_EXPORT_OPTIONS, ...options };

    // Create a snapshot for export
    const snapshot = await this.createSnapshot('export', { exportedAt: Date.now() });

    // Filter based on options
    const exportData: Partial<SceneSnapshot> = {
      version: snapshot.version,
      scene: snapshot.scene,
      camera: snapshot.camera,
    };

    if (mergedOptions.includeRobots) {
      exportData.robots = snapshot.robots;
    }
    if (mergedOptions.includeTrajectories) {
      exportData.trajectories = snapshot.trajectories;
    }
    if (mergedOptions.includeWaypoints) {
      exportData.waypoints = snapshot.waypoints;
    }
    if (mergedOptions.includeObstacles) {
      exportData.obstacles = snapshot.obstacles;
    }
    if (mergedOptions.includeSafetyZones) {
      exportData.safetyZones = snapshot.safetyZones;
    }
    if (mergedOptions.includeFrames) {
      exportData.frames = snapshot.frames;
    }
    if (mergedOptions.includePointClouds) {
      exportData.pointClouds = snapshot.pointClouds;
    }
    if (mergedOptions.includeCameraViews) {
      exportData.cameraViews = snapshot.cameraViews;
    }
    if (mergedOptions.includeThumbnail) {
      exportData.thumbnail = snapshot.thumbnail;
    }

    // Delete the temporary snapshot
    this.deleteSnapshot(snapshot.id);

    // Serialize based on format
    let result: string | ArrayBuffer;
    switch (mergedOptions.format) {
      case 'json':
        result = JSON.stringify(exportData, null, 2);
        break;
      case 'yaml':
        // Would need yaml library
        result = JSON.stringify(exportData, null, 2); // Fallback to JSON
        break;
      case 'xml':
        // Would need xml library
        result = JSON.stringify(exportData, null, 2); // Fallback to JSON
        break;
      case 'binary':
        // Would need binary serialization
        const encoder = new TextEncoder();
        result = encoder.encode(JSON.stringify(exportData)).buffer;
        break;
      default:
        result = JSON.stringify(exportData, null, 2);
    }

    // Compress if requested
    if (mergedOptions.compress && typeof result === 'string') {
      // Would use compression library like pako
    }

    this.emitEvent('scene_exported', { format: mergedOptions.format });
    return result;
  }

  async importScene(
    data: string | ArrayBuffer,
    options: SceneImportOptions = DEFAULT_IMPORT_OPTIONS
  ): Promise<ImportResult> {
    const mergedOptions = { ...DEFAULT_IMPORT_OPTIONS, ...options };

    const result: ImportResult = {
      success: true,
      imported: {
        robots: 0,
        obstacles: 0,
        trajectories: 0,
        waypoints: 0,
        frames: 0,
        safetyZones: 0,
      },
      skipped: {
        robots: [],
        obstacles: [],
        trajectories: [],
        waypoints: [],
        frames: [],
        safetyZones: [],
      },
      renamed: {},
      warnings: [],
      errors: [],
    };

    try {
      // Parse data
      let parsedData: Partial<SceneSnapshot>;
      if (typeof data === 'string') {
        parsedData = JSON.parse(data);
      } else {
        const decoder = new TextDecoder();
        parsedData = JSON.parse(decoder.decode(data));
      }

      // Validate version
      if (parsedData.version && parsedData.version !== SNAPSHOT_VERSION) {
        result.warnings.push(`Version mismatch: expected ${SNAPSHOT_VERSION}, got ${parsedData.version}`);
      }

      // Create a snapshot from imported data and restore it
      const snapshot: SceneSnapshot = {
        id: this.generateSnapshotId(),
        name: 'imported',
        timestamp: Date.now(),
        version: parsedData.version ?? SNAPSHOT_VERSION,
        scene: parsedData.scene ?? {
          background: '#1a1a1a',
          grid: {
            enabled: true,
            size: 10,
            divisions: 10,
            color: '#4a4a4a',
          },
          lighting: {
            ambient: { intensity: 0.5, color: '#ffffff' },
            directional: { intensity: 0.8, position: { x: 5, y: 5, z: 5 } },
          },
        },
        robots: mergedOptions.includeRobots ? (parsedData.robots ?? []) : [],
        obstacles: mergedOptions.includeObstacles ? (parsedData.obstacles ?? []) : [],
        trajectories: mergedOptions.includeTrajectories ? (parsedData.trajectories ?? []) : [],
        waypoints: mergedOptions.includeWaypoints ? (parsedData.waypoints ?? []) : [],
        camera: mergedOptions.includeCamera
          ? (parsedData.camera ?? {
              position: { x: 5, y: 5, z: 5 },
              target: { x: 0, y: 0, z: 0 },
              fov: 45,
            })
          : {
              position: { x: 5, y: 5, z: 5 },
              target: { x: 0, y: 0, z: 0 },
              fov: 45,
            },
        frames: mergedOptions.includeFrames ? (parsedData.frames ?? []) : [],
        safetyZones: mergedOptions.includeSafetyZones ? (parsedData.safetyZones ?? []) : [],
      };

      // Apply conflict handling would go here
      // For now, just count what's imported
      result.imported.robots = snapshot.robots.length;
      result.imported.obstacles = snapshot.obstacles.length;
      result.imported.trajectories = snapshot.trajectories.length;
      result.imported.waypoints = snapshot.waypoints.length;
      result.imported.frames = snapshot.frames.length;
      result.imported.safetyZones = snapshot.safetyZones.length;

      // Restore the imported scene
      if (this.sceneStateRestorer) {
        await this.sceneStateRestorer(snapshot);
      }

      this.emitEvent('scene_imported', result);
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
    }

    return result;
  }

  // ==========================================================================
  // Undo/Redo
  // ==========================================================================

  undo(): boolean {
    if (!this.historyConfig.enabled || this.undoStack.length === 0) {
      return false;
    }

    const operation = this.undoStack.pop()!;
    this.redoStack.push(operation);

    // Apply previous state - would need state applier
    this.applyOperation(operation, 'undo');

    this.notifyHistoryChanged();
    this.emitEvent('undo', operation);
    return true;
  }

  redo(): boolean {
    if (!this.historyConfig.enabled || this.redoStack.length === 0) {
      return false;
    }

    const operation = this.redoStack.pop()!;
    this.undoStack.push(operation);

    // Apply next state - would need state applier
    this.applyOperation(operation, 'redo');

    this.notifyHistoryChanged();
    this.emitEvent('redo', operation);
    return true;
  }

  canUndo(): boolean {
    return this.historyConfig.enabled && this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.historyConfig.enabled && this.redoStack.length > 0;
  }

  getUndoStack(): Operation[] {
    return [...this.undoStack];
  }

  getRedoStack(): Operation[] {
    return [...this.redoStack];
  }

  clearHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.notifyHistoryChanged();
    this.emitEvent('history_cleared');
  }

  // ==========================================================================
  // History Configuration
  // ==========================================================================

  setHistoryConfig(config: Partial<HistoryConfig>): void {
    this.historyConfig = { ...this.historyConfig, ...config };

    // Trim history if max size reduced
    while (this.undoStack.length > this.historyConfig.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  getHistoryConfig(): HistoryConfig {
    return { ...this.historyConfig };
  }

  // ==========================================================================
  // Operation Recording (to be called by external system)
  // ==========================================================================

  /**
   * 记录操作 (由外部系统调用)
   */
  recordOperation(
    type: OperationType,
    description: string,
    previousState: unknown,
    nextState: unknown
  ): void {
    if (!this.historyConfig.enabled) {
      return;
    }

    const operation: Operation = {
      id: `op_${++this.operationIdCounter}`,
      type,
      timestamp: Date.now(),
      description,
      previousState,
      nextState,
    };

    // Check if we should merge with previous operation
    if (this.historyConfig.mergeConsecutive && this.undoStack.length > 0) {
      const lastOp = this.undoStack[this.undoStack.length - 1];
      if (
        lastOp.type === type &&
        operation.timestamp - lastOp.timestamp < this.historyConfig.mergeWindow
      ) {
        // Merge: update the next state of the previous operation
        lastOp.nextState = nextState;
        lastOp.description = description;
        this.redoStack.length = 0;
        this.notifyHistoryChanged();
        return;
      }
    }

    // Add to undo stack
    this.undoStack.push(operation);

    // Clear redo stack
    this.redoStack.length = 0;

    // Trim if needed
    while (this.undoStack.length > this.historyConfig.maxHistorySize) {
      this.undoStack.shift();
    }

    this.notifyHistoryChanged();
  }

  /**
   * 开始批量操作
   */
  beginBatch(description: string): string {
    const batchId = `batch_${++this.operationIdCounter}`;
    const batchOp: Operation = {
      id: batchId,
      type: 'batch',
      timestamp: Date.now(),
      description,
      previousState: null,
      nextState: null,
      children: [],
    };
    this.undoStack.push(batchOp);
    return batchId;
  }

  /**
   * 结束批量操作
   */
  endBatch(batchId: string): void {
    const batchIndex = this.undoStack.findIndex((op) => op.id === batchId);
    if (batchIndex === -1) {
      return;
    }

    const batchOp = this.undoStack[batchIndex];
    if (!batchOp.children || batchOp.children.length === 0) {
      // No operations in batch, remove it
      this.undoStack.splice(batchIndex, 1);
    }

    this.redoStack.length = 0;
    this.notifyHistoryChanged();
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onSnapshotCreated(callback: SnapshotCallback): () => void {
    this.snapshotCreatedCallbacks.add(callback);
    return () => {
      this.snapshotCreatedCallbacks.delete(callback);
    };
  }

  onSnapshotRestored(callback: (snapshotId: string) => void): () => void {
    this.snapshotRestoredCallbacks.add(callback);
    return () => {
      this.snapshotRestoredCallbacks.delete(callback);
    };
  }

  onHistoryChanged(callback: VoidCallback): () => void {
    this.historyChangedCallbacks.add(callback);
    return () => {
      this.historyChangedCallbacks.delete(callback);
    };
  }

  // ==========================================================================
  // Configuration Setters
  // ==========================================================================

  /**
   * 设置场景状态获取器
   */
  setSceneStateGetter(
    getter: () => Promise<Omit<SceneSnapshot, 'id' | 'name' | 'timestamp' | 'version'>>
  ): void {
    this.sceneStateGetter = getter;
  }

  /**
   * 设置场景状态恢复器
   */
  setSceneStateRestorer(restorer: (snapshot: SceneSnapshot) => Promise<void>): void {
    this.sceneStateRestorer = restorer;
  }

  /**
   * 设置缩略图生成器
   */
  setThumbnailGenerator(generator: () => Promise<string>): void {
    this.thumbnailGenerator = generator;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  dispose(): void {
    this.snapshots.clear();
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.eventListeners.clear();
    this.snapshotCreatedCallbacks.clear();
    this.snapshotRestoredCallbacks.clear();
    this.historyChangedCallbacks.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private applyOperation(_operation: Operation, _direction: 'undo' | 'redo'): void {
    // Would apply the operation's state changes
    // This requires integration with the actual scene state management
  }

  private notifyHistoryChanged(): void {
    for (const callback of this.historyChangedCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Error in history changed callback:', error);
      }
    }
  }

  private emitEvent(type: SceneEventType, data?: unknown): void {
    const event: SceneEvent = {
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
          console.error(`Error in scene event listener for '${type}':`, error);
        }
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建场景管理器
 */
export function createSceneManager(config?: SceneManagerConfig): SceneManager {
  return new SceneManager(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalSceneManager: SceneManager | null = null;

/**
 * 获取全局场景管理器
 */
export function getSceneManager(): SceneManager {
  if (!globalSceneManager) {
    globalSceneManager = createSceneManager();
  }
  return globalSceneManager;
}

/**
 * 重置全局场景管理器
 */
export function resetSceneManager(): void {
  if (globalSceneManager) {
    globalSceneManager.dispose();
    globalSceneManager = null;
  }
}
