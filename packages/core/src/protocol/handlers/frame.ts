/**
 * RoboViz Frame Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for frame.* namespace
 */

import type { MethodHandler } from '../handler';
import type { Vector3, Transform, Pose } from '../../types';
import type {
  CoordinateFrame,
  ActiveFrames,
  FrameVisualization,
  FrameTreeVisualizationConfig,
} from '../../frames/types';
import { getFrameManager } from '../../frames/frame-manager';

// ============================================================================
// Frame CRUD Handlers
// ============================================================================

/**
 * frame.add - 添加坐标系
 */
export const frameAdd: MethodHandler<CoordinateFrame, { success: boolean }> = (params) => {
  const manager = getFrameManager();
  manager.addFrame(params);
  return { success: true };
};

/**
 * frame.remove - 移除坐标系
 */
export const frameRemove: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getFrameManager();
  manager.removeFrame(params.id);
  return { success: true };
};

/**
 * frame.update - 更新坐标系
 */
export const frameUpdate: MethodHandler<
  { id: string; updates: Partial<CoordinateFrame> },
  { success: boolean }
> = (params) => {
  const manager = getFrameManager();
  manager.updateFrame(params.id, params.updates);
  return { success: true };
};

/**
 * frame.get - 获取坐标系
 */
export const frameGet: MethodHandler<{ id: string }, CoordinateFrame | null> = (params) => {
  const manager = getFrameManager();
  return manager.getFrame(params.id) ?? null;
};

/**
 * frame.list - 列出所有坐标系
 */
export const frameList: MethodHandler<
  { type?: string },
  { frames: Array<{ id: string; name: string; type: string; parentFrameId: string | null }> }
> = (params) => {
  const manager = getFrameManager();
  let frames = manager.getAllFrames();

  if (params.type) {
    frames = frames.filter((f) => f.type === params.type);
  }

  return {
    frames: frames.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      parentFrameId: f.parentFrameId,
    })),
  };
};

// ============================================================================
// Transform Handlers
// ============================================================================

/**
 * frame.setTransform - 设置坐标系变换
 */
export const frameSetTransform: MethodHandler<
  { id: string; transform: Transform },
  { success: boolean }
> = (params) => {
  const manager = getFrameManager();
  manager.updateFrame(params.id, { transform: params.transform });
  return { success: true };
};

/**
 * frame.getWorldTransform - 获取世界坐标变换
 */
export const frameGetWorldTransform: MethodHandler<
  { id: string },
  { transform: Transform | null }
> = (params) => {
  const manager = getFrameManager();
  const transform = manager.getWorldTransform(params.id);
  return { transform: transform ?? null };
};

/**
 * frame.getRelativeTransform - 获取相对变换
 */
export const frameGetRelativeTransform: MethodHandler<
  { fromId: string; toId: string },
  { transform: Transform | null }
> = (params) => {
  const manager = getFrameManager();
  const transform = manager.getRelativeTransform(params.fromId, params.toId);
  return { transform: transform ?? null };
};

/**
 * frame.transformPoint - 变换点
 */
export const frameTransformPoint: MethodHandler<
  { point: Vector3; fromFrame: string; toFrame: string },
  { point: Vector3 | null }
> = (params) => {
  const manager = getFrameManager();
  const point = manager.transformPoint(params.point, params.fromFrame, params.toFrame);
  return { point: point ?? null };
};

/**
 * frame.transformPose - 变换位姿
 */
export const frameTransformPose: MethodHandler<
  { pose: Pose; fromFrame: string; toFrame: string },
  { pose: Pose | null }
> = (params) => {
  const manager = getFrameManager();
  const pose = manager.transformPose(params.pose, params.fromFrame, params.toFrame);
  return { pose: pose ?? null };
};

// ============================================================================
// Tree Handlers
// ============================================================================

/**
 * frame.getChildren - 获取子坐标系
 */
export const frameGetChildren: MethodHandler<
  { id: string },
  { children: Array<{ id: string; name: string }> }
> = (params) => {
  const manager = getFrameManager();
  const frame = manager.getFrame(params.id);
  if (!frame) {
    throw new Error(`Frame '${params.id}' not found`);
  }

  const children = manager
    .getAllFrames()
    .filter((f) => f.parentFrameId === params.id)
    .map((f) => ({ id: f.id, name: f.name }));

  return { children };
};

/**
 * frame.getAncestors - 获取祖先坐标系
 */
export const frameGetAncestors: MethodHandler<
  { id: string },
  { ancestors: Array<{ id: string; name: string }> }
> = (params) => {
  const manager = getFrameManager();
  const ancestors: Array<{ id: string; name: string }> = [];

  let current = manager.getFrame(params.id);
  while (current && current.parentFrameId) {
    const parent = manager.getFrame(current.parentFrameId);
    if (parent) {
      ancestors.push({ id: parent.id, name: parent.name });
      current = parent;
    } else {
      break;
    }
  }

  return { ancestors };
};

// ============================================================================
// Active Frames Handlers
// ============================================================================

/**
 * frame.setActiveUserFrame - 设置活跃用户坐标系
 */
export const frameSetActiveUserFrame: MethodHandler<
  { robotId: string; frameId: string | null },
  { success: boolean }
> = (params) => {
  const manager = getFrameManager();
  manager.setActiveUserFrame(params.robotId, params.frameId);
  return { success: true };
};

/**
 * frame.setActiveToolFrame - 设置活跃工具坐标系
 */
export const frameSetActiveToolFrame: MethodHandler<
  { robotId: string; frameId: string | null },
  { success: boolean }
> = (params) => {
  const manager = getFrameManager();
  manager.setActiveToolFrame(params.robotId, params.frameId);
  return { success: true };
};

/**
 * frame.setActiveWorkpieceFrame - 设置活跃工件坐标系
 */
export const frameSetActiveWorkpieceFrame: MethodHandler<
  { robotId: string; frameId: string | null },
  { success: boolean }
> = (params) => {
  const manager = getFrameManager();
  manager.setActiveWorkpieceFrame(params.robotId, params.frameId);
  return { success: true };
};

/**
 * frame.getActiveFrames - 获取活跃坐标系
 */
export const frameGetActiveFrames: MethodHandler<
  { robotId: string },
  { activeFrames: ActiveFrames | null }
> = (params) => {
  const manager = getFrameManager();
  const active = manager.getActiveFrames(params.robotId);
  return { activeFrames: active ?? null };
};

// ============================================================================
// Visualization Handlers
// ============================================================================

/**
 * frame.setVisualization - 设置可视化配置
 */
export const frameSetVisualization: MethodHandler<
  { id: string; visualization: Partial<FrameVisualization> },
  { success: boolean }
> = (params) => {
  const manager = getFrameManager();
  manager.setFrameVisualization(params.id, params.visualization);
  return { success: true };
};

/**
 * frame.show - 显示坐标系
 */
export const frameShow: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getFrameManager();
  manager.showFrame(params.id);
  return { success: true };
};

/**
 * frame.hide - 隐藏坐标系
 */
export const frameHide: MethodHandler<{ id: string }, { success: boolean }> = (params) => {
  const manager = getFrameManager();
  manager.hideFrame(params.id);
  return { success: true };
};

/**
 * frame.showTree - 显示坐标系树
 */
export const frameShowTree: MethodHandler<
  Partial<FrameTreeVisualizationConfig>,
  { success: boolean }
> = (params) => {
  const manager = getFrameManager();
  manager.showFrameTree(params);
  return { success: true };
};

/**
 * frame.hideTree - 隐藏坐标系树
 */
export const frameHideTree: MethodHandler<Record<string, never>, { success: boolean }> = () => {
  const manager = getFrameManager();
  manager.hideFrameTree();
  return { success: true };
};

/**
 * frame.highlight - 高亮坐标系
 */
export const frameHighlight: MethodHandler<
  { id: string; duration?: number },
  { success: boolean }
> = (params) => {
  const manager = getFrameManager();
  manager.highlightFrame(params.id, params.duration);
  return { success: true };
};

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * 所有 frame.* 处理器
 */
export const frameHandlers: Record<string, MethodHandler> = {
  // CRUD
  'frame.add': frameAdd,
  'frame.remove': frameRemove,
  'frame.update': frameUpdate,
  'frame.get': frameGet,
  'frame.list': frameList,

  // Transform
  'frame.setTransform': frameSetTransform,
  'frame.getWorldTransform': frameGetWorldTransform,
  'frame.getRelativeTransform': frameGetRelativeTransform,
  'frame.transformPoint': frameTransformPoint,
  'frame.transformPose': frameTransformPose,

  // Tree
  'frame.getChildren': frameGetChildren,
  'frame.getAncestors': frameGetAncestors,

  // Active frames
  'frame.setActiveUserFrame': frameSetActiveUserFrame,
  'frame.setActiveToolFrame': frameSetActiveToolFrame,
  'frame.setActiveWorkpieceFrame': frameSetActiveWorkpieceFrame,
  'frame.getActiveFrames': frameGetActiveFrames,

  // Visualization
  'frame.setVisualization': frameSetVisualization,
  'frame.show': frameShow,
  'frame.hide': frameHide,
  'frame.showTree': frameShowTree,
  'frame.hideTree': frameHideTree,
  'frame.highlight': frameHighlight,
};

/**
 * 注册所有 frame 处理器到 dispatcher
 */
export function registerFrameHandlers(
  registerMethod: (method: string, handler: MethodHandler) => void
): void {
  for (const [method, handler] of Object.entries(frameHandlers)) {
    registerMethod(method, handler);
  }
}
