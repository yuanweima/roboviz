/**
 * RoboViz Frame Manager
 *
 * 坐标系管理器实现
 */

import type { Vector3, Quaternion, Transform, Pose } from '../types';
import type {
  CoordinateFrame,
  ActiveFrames,
  FrameVisualization,
  FrameTreeVisualizationConfig,
  FrameManagerConfig,
  IFrameManager,
  FrameEventType,
  FrameEvent,
} from './types';
import {
  WORLD_FRAME_ID,
  DEFAULT_FRAME_VISUALIZATION,
  createWorldFrame,
} from './types';
import {
  invertTransform,
  multiplyTransforms,
  transformPoint as transformPointUtil,
  transformPose as transformPoseUtil,
} from './transform-utils';

// ============================================================================
// Types
// ============================================================================

type FrameEventCallback = (event: FrameEvent) => void;

/**
 * 默认配置
 */
const DEFAULT_CONFIG: FrameManagerConfig = {
  autoCreateWorld: true,
  defaultVisualization: {},
  updateInterval: 16, // ~60fps
};

// ============================================================================
// Frame Manager Implementation
// ============================================================================

/**
 * 坐标系管理器
 */
export class FrameManager implements IFrameManager {
  private readonly config: FrameManagerConfig;
  private readonly frames: Map<string, CoordinateFrame> = new Map();
  private readonly worldTransformCache: Map<string, Transform> = new Map();
  private readonly activeFrames: Map<string, ActiveFrames> = new Map();
  private readonly eventListeners: Map<FrameEventType, Set<FrameEventCallback>> = new Map();

  private treeVisualizationConfig: FrameTreeVisualizationConfig | null = null;
  private cacheValid = false;

  constructor(config: Partial<FrameManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.autoCreateWorld) {
      const worldFrame = createWorldFrame();
      this.frames.set(worldFrame.id, worldFrame);
    }
  }

  // ==========================================================================
  // Frame CRUD
  // ==========================================================================

  addFrame(frame: CoordinateFrame): void {
    // 验证父坐标系
    if (frame.parentFrameId && !this.frames.has(frame.parentFrameId)) {
      throw new Error(`Parent frame '${frame.parentFrameId}' not found`);
    }

    // 检测循环依赖
    if (frame.parentFrameId && this.wouldCreateCycle(frame.id, frame.parentFrameId)) {
      throw new Error('Adding this frame would create a circular dependency');
    }

    // 应用默认可视化
    const visualization: FrameVisualization = {
      ...DEFAULT_FRAME_VISUALIZATION,
      ...this.config.defaultVisualization,
      ...frame.visualization,
    };

    this.frames.set(frame.id, { ...frame, visualization });
    this.invalidateCache();
    this.emitEvent('frame_added', { frame: this.frames.get(frame.id) });
  }

  removeFrame(id: string): void {
    if (id === WORLD_FRAME_ID) {
      throw new Error('Cannot remove world frame');
    }

    if (!this.frames.has(id)) {
      return;
    }

    // 获取子坐标系
    const children = this.getChildren(id);

    // 重新挂载子坐标系到父坐标系
    const frame = this.frames.get(id)!;
    for (const child of children) {
      child.parentFrameId = frame.parentFrameId;
      this.frames.set(child.id, child);
    }

    this.frames.delete(id);
    this.invalidateCache();
    this.emitEvent('frame_removed', { frameId: id });
  }

  updateFrame(id: string, updates: Partial<CoordinateFrame>): void {
    const frame = this.frames.get(id);
    if (!frame) {
      throw new Error(`Frame '${id}' not found`);
    }

    // 检测循环依赖
    if (updates.parentFrameId !== undefined && updates.parentFrameId !== frame.parentFrameId) {
      if (updates.parentFrameId && this.wouldCreateCycle(id, updates.parentFrameId)) {
        throw new Error('Update would create a circular dependency');
      }
    }

    const updatedFrame = { ...frame, ...updates };
    if (updates.visualization) {
      updatedFrame.visualization = { ...frame.visualization, ...updates.visualization };
    }

    this.frames.set(id, updatedFrame);
    this.invalidateCache();
    this.emitEvent('frame_updated', { frame: updatedFrame });

    if (updates.transform) {
      this.emitEvent('frame_transform_changed', { frameId: id, frame: updatedFrame });
    }
  }

  getFrame(id: string): CoordinateFrame | undefined {
    return this.frames.get(id);
  }

  getAllFrames(): CoordinateFrame[] {
    return Array.from(this.frames.values());
  }

  // ==========================================================================
  // Transform Computation
  // ==========================================================================

  getWorldTransform(frameId: string): Transform | undefined {
    if (!this.cacheValid) {
      this.updateCache();
    }
    return this.worldTransformCache.get(frameId);
  }

  getRelativeTransform(fromId: string, toId: string): Transform | undefined {
    const fromWorld = this.getWorldTransform(fromId);
    const toWorld = this.getWorldTransform(toId);

    if (!fromWorld || !toWorld) {
      return undefined;
    }

    // T_from_to = T_from_world^-1 * T_to_world
    const fromWorldInv = invertTransform(fromWorld);
    return multiplyTransforms(fromWorldInv, toWorld);
  }

  transformPoint(point: Vector3, fromFrame: string, toFrame: string): Vector3 | undefined {
    const transform = this.getRelativeTransform(fromFrame, toFrame);
    if (!transform) {
      return undefined;
    }
    return transformPointUtil(point, transform);
  }

  transformPose(pose: Pose, fromFrame: string, toFrame: string): Pose | undefined {
    const transform = this.getRelativeTransform(fromFrame, toFrame);
    if (!transform) {
      return undefined;
    }
    return transformPoseUtil(pose, transform);
  }

  // ==========================================================================
  // Tree Operations
  // ==========================================================================

  getChildren(frameId: string): CoordinateFrame[] {
    return Array.from(this.frames.values()).filter((f) => f.parentFrameId === frameId);
  }

  getAncestors(frameId: string): CoordinateFrame[] {
    const ancestors: CoordinateFrame[] = [];
    let current = this.frames.get(frameId);

    while (current && current.parentFrameId) {
      const parent = this.frames.get(current.parentFrameId);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  isAncestor(ancestorId: string, descendantId: string): boolean {
    const ancestors = this.getAncestors(descendantId);
    return ancestors.some((a) => a.id === ancestorId);
  }

  // ==========================================================================
  // Active Frames Management
  // ==========================================================================

  setActiveUserFrame(robotId: string, frameId: string | null): void {
    this.ensureActiveFrames(robotId);
    const active = this.activeFrames.get(robotId)!;
    active.userFrameId = frameId;
    this.emitEvent('active_frames_changed', { activeFrames: active });
  }

  setActiveToolFrame(robotId: string, frameId: string | null): void {
    this.ensureActiveFrames(robotId);
    const active = this.activeFrames.get(robotId)!;
    active.toolFrameId = frameId;
    this.emitEvent('active_frames_changed', { activeFrames: active });
  }

  setActiveWorkpieceFrame(robotId: string, frameId: string | null): void {
    this.ensureActiveFrames(robotId);
    const active = this.activeFrames.get(robotId)!;
    active.workpieceFrameId = frameId;
    this.emitEvent('active_frames_changed', { activeFrames: active });
  }

  getActiveFrames(robotId: string): ActiveFrames | undefined {
    return this.activeFrames.get(robotId);
  }

  // ==========================================================================
  // Visualization
  // ==========================================================================

  setFrameVisualization(id: string, visualization: Partial<FrameVisualization>): void {
    const frame = this.frames.get(id);
    if (!frame) {
      throw new Error(`Frame '${id}' not found`);
    }

    frame.visualization = { ...frame.visualization, ...visualization };
    this.emitEvent('frame_updated', { frame });
  }

  showFrame(id: string): void {
    this.setFrameVisualization(id, { visible: true });
  }

  hideFrame(id: string): void {
    this.setFrameVisualization(id, { visible: false });
  }

  showAll(): void {
    for (const frame of this.frames.values()) {
      frame.visualization.visible = true;
    }
  }

  hideAll(): void {
    for (const frame of this.frames.values()) {
      if (frame.id !== WORLD_FRAME_ID) {
        frame.visualization.visible = false;
      }
    }
  }

  showFrameTree(config?: Partial<FrameTreeVisualizationConfig>): void {
    this.treeVisualizationConfig = {
      visible: true,
      showConnections: true,
      connectionColor: '#888888',
      connectionStyle: 'solid',
      ...config,
    };
  }

  hideFrameTree(): void {
    this.treeVisualizationConfig = null;
  }

  highlightFrame(id: string, duration?: number): void {
    if (this.treeVisualizationConfig) {
      this.treeVisualizationConfig.highlightedFrame = id;

      if (duration && duration > 0) {
        setTimeout(() => {
          if (this.treeVisualizationConfig?.highlightedFrame === id) {
            this.treeVisualizationConfig.highlightedFrame = undefined;
          }
        }, duration);
      }
    }
  }

  getTreeVisualizationConfig(): FrameTreeVisualizationConfig | null {
    return this.treeVisualizationConfig;
  }

  // ==========================================================================
  // Events
  // ==========================================================================

  onFrameAdded(callback: (frame: CoordinateFrame) => void): () => void {
    return this.addEventListener('frame_added', (event) => {
      if (event.frame) callback(event.frame);
    });
  }

  onFrameRemoved(callback: (frameId: string) => void): () => void {
    return this.addEventListener('frame_removed', (event) => {
      if (event.frameId) callback(event.frameId);
    });
  }

  onFrameUpdated(callback: (frame: CoordinateFrame) => void): () => void {
    return this.addEventListener('frame_updated', (event) => {
      if (event.frame) callback(event.frame);
    });
  }

  onActiveFramesChanged(callback: (active: ActiveFrames) => void): () => void {
    return this.addEventListener('active_frames_changed', (event) => {
      if (event.activeFrames) callback(event.activeFrames);
    });
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  dispose(): void {
    this.frames.clear();
    this.worldTransformCache.clear();
    this.activeFrames.clear();
    this.eventListeners.clear();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private ensureActiveFrames(robotId: string): void {
    if (!this.activeFrames.has(robotId)) {
      this.activeFrames.set(robotId, {
        robotId,
        userFrameId: null,
        toolFrameId: null,
        workpieceFrameId: null,
      });
    }
  }

  private wouldCreateCycle(frameId: string, newParentId: string): boolean {
    if (frameId === newParentId) {
      return true;
    }

    let current = this.frames.get(newParentId);
    while (current && current.parentFrameId) {
      if (current.parentFrameId === frameId) {
        return true;
      }
      current = this.frames.get(current.parentFrameId);
    }

    return false;
  }

  private invalidateCache(): void {
    this.cacheValid = false;
    this.worldTransformCache.clear();
  }

  private updateCache(): void {
    // 拓扑排序遍历，从根节点开始
    const visited = new Set<string>();

    const visit = (frameId: string): void => {
      if (visited.has(frameId)) return;

      const frame = this.frames.get(frameId);
      if (!frame) return;

      // 先访问父节点
      if (frame.parentFrameId) {
        visit(frame.parentFrameId);
      }

      // 计算世界变换
      if (!frame.parentFrameId) {
        // 根节点
        this.worldTransformCache.set(frameId, frame.transform);
      } else {
        const parentWorld = this.worldTransformCache.get(frame.parentFrameId);
        if (parentWorld) {
          this.worldTransformCache.set(frameId, multiplyTransforms(parentWorld, frame.transform));
        }
      }

      visited.add(frameId);
    };

    for (const frameId of this.frames.keys()) {
      visit(frameId);
    }

    this.cacheValid = true;
  }

  private addEventListener(
    type: FrameEventType,
    callback: FrameEventCallback
  ): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(callback);

    return () => {
      this.eventListeners.get(type)?.delete(callback);
    };
  }

  private emitEvent(type: FrameEventType, data: Partial<FrameEvent>): void {
    const event: FrameEvent = {
      type,
      timestamp: Date.now(),
      ...data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in frame event listener for '${type}':`, error);
        }
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建坐标系管理器
 */
export function createFrameManager(config?: Partial<FrameManagerConfig>): FrameManager {
  return new FrameManager(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalFrameManager: FrameManager | null = null;

/**
 * 获取全局坐标系管理器
 */
export function getFrameManager(): FrameManager {
  if (!globalFrameManager) {
    globalFrameManager = createFrameManager();
  }
  return globalFrameManager;
}

/**
 * 重置全局坐标系管理器
 */
export function resetFrameManager(): void {
  if (globalFrameManager) {
    globalFrameManager.dispose();
    globalFrameManager = null;
  }
}
