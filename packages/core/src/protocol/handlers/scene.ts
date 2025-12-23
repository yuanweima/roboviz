/**
 * RoboViz Scene Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for scene.* and history.* namespaces
 */

import type { MethodHandler } from '../handler';
import type {
  SceneSnapshot,
  SceneExportOptions,
  SceneImportOptions,
  ImportResult,
  Operation,
  HistoryConfig,
} from '../../scene-management/types';
import { getSceneManager } from '../../scene-management/scene-manager';

// ============================================================================
// Snapshot Handlers
// ============================================================================

/**
 * scene.createSnapshot - 创建快照
 */
export const sceneCreateSnapshot: MethodHandler<
  { name: string; metadata?: Record<string, unknown> },
  { snapshot: SceneSnapshot }
> = async (params) => {
  const manager = getSceneManager();
  const snapshot = await manager.createSnapshot(params.name, params.metadata);
  return { snapshot };
};

/**
 * scene.restoreSnapshot - 恢复快照
 */
export const sceneRestoreSnapshot: MethodHandler<
  { snapshotId: string },
  { success: boolean }
> = async (params) => {
  const manager = getSceneManager();
  await manager.restoreSnapshot(params.snapshotId);
  return { success: true };
};

/**
 * scene.deleteSnapshot - 删除快照
 */
export const sceneDeleteSnapshot: MethodHandler<
  { snapshotId: string },
  { success: boolean }
> = (params) => {
  const manager = getSceneManager();
  manager.deleteSnapshot(params.snapshotId);
  return { success: true };
};

/**
 * scene.getSnapshot - 获取快照
 */
export const sceneGetSnapshot: MethodHandler<
  { snapshotId: string },
  { snapshot: SceneSnapshot | null }
> = (params) => {
  const manager = getSceneManager();
  const snapshot = manager.getSnapshot(params.snapshotId);
  return { snapshot: snapshot ?? null };
};

/**
 * scene.listSnapshots - 列出快照
 */
export const sceneListSnapshots: MethodHandler<
  Record<string, never>,
  { snapshots: Array<{ id: string; name: string; timestamp: number; description?: string }> }
> = () => {
  const manager = getSceneManager();
  const snapshots = manager.listSnapshots().map((s) => ({
    id: s.id,
    name: s.name,
    timestamp: s.timestamp,
    description: s.description,
  }));
  return { snapshots };
};

// ============================================================================
// Export/Import Handlers
// ============================================================================

/**
 * scene.export - 导出场景
 */
export const sceneExport: MethodHandler<
  Partial<SceneExportOptions>,
  { data: string }
> = async (params) => {
  const manager = getSceneManager();
  const result = await manager.exportScene(params as SceneExportOptions);

  // Convert ArrayBuffer to base64 if needed
  if (result instanceof ArrayBuffer) {
    const bytes = new Uint8Array(result);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return { data: btoa(binary) };
  }

  return { data: result };
};

/**
 * scene.import - 导入场景
 */
export const sceneImport: MethodHandler<
  { data: string; options?: Partial<SceneImportOptions> },
  { result: ImportResult }
> = async (params) => {
  const manager = getSceneManager();
  const result = await manager.importScene(params.data, params.options as SceneImportOptions);
  return { result };
};

// ============================================================================
// History Handlers
// ============================================================================

/**
 * history.undo - 撤销
 */
export const historyUndo: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getSceneManager();
  const success = manager.undo();
  return { success };
};

/**
 * history.redo - 重做
 */
export const historyRedo: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getSceneManager();
  const success = manager.redo();
  return { success };
};

/**
 * history.canUndo - 检查是否可撤销
 */
export const historyCanUndo: MethodHandler<
  Record<string, never>,
  { canUndo: boolean }
> = () => {
  const manager = getSceneManager();
  return { canUndo: manager.canUndo() };
};

/**
 * history.canRedo - 检查是否可重做
 */
export const historyCanRedo: MethodHandler<
  Record<string, never>,
  { canRedo: boolean }
> = () => {
  const manager = getSceneManager();
  return { canRedo: manager.canRedo() };
};

/**
 * history.getUndoStack - 获取撤销栈
 */
export const historyGetUndoStack: MethodHandler<
  Record<string, never>,
  { operations: Array<{ id: string; type: string; description: string; timestamp: number }> }
> = () => {
  const manager = getSceneManager();
  const operations = manager.getUndoStack().map((op) => ({
    id: op.id,
    type: op.type,
    description: op.description,
    timestamp: op.timestamp,
  }));
  return { operations };
};

/**
 * history.getRedoStack - 获取重做栈
 */
export const historyGetRedoStack: MethodHandler<
  Record<string, never>,
  { operations: Array<{ id: string; type: string; description: string; timestamp: number }> }
> = () => {
  const manager = getSceneManager();
  const operations = manager.getRedoStack().map((op) => ({
    id: op.id,
    type: op.type,
    description: op.description,
    timestamp: op.timestamp,
  }));
  return { operations };
};

/**
 * history.clear - 清除历史
 */
export const historyClear: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getSceneManager();
  manager.clearHistory();
  return { success: true };
};

/**
 * history.setConfig - 设置历史配置
 */
export const historySetConfig: MethodHandler<
  Partial<HistoryConfig>,
  { success: boolean }
> = (params) => {
  const manager = getSceneManager();
  manager.setHistoryConfig(params);
  return { success: true };
};

/**
 * history.getConfig - 获取历史配置
 */
export const historyGetConfig: MethodHandler<
  Record<string, never>,
  { config: HistoryConfig }
> = () => {
  const manager = getSceneManager();
  return { config: manager.getHistoryConfig() };
};

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * 所有场景处理器
 */
export const sceneHandlers: Record<string, MethodHandler> = {
  // Snapshots
  'scene.createSnapshot': sceneCreateSnapshot,
  'scene.restoreSnapshot': sceneRestoreSnapshot,
  'scene.deleteSnapshot': sceneDeleteSnapshot,
  'scene.getSnapshot': sceneGetSnapshot,
  'scene.listSnapshots': sceneListSnapshots,

  // Export/Import
  'scene.export': sceneExport,
  'scene.import': sceneImport,

  // History
  'history.undo': historyUndo,
  'history.redo': historyRedo,
  'history.canUndo': historyCanUndo,
  'history.canRedo': historyCanRedo,
  'history.getUndoStack': historyGetUndoStack,
  'history.getRedoStack': historyGetRedoStack,
  'history.clear': historyClear,
  'history.setConfig': historySetConfig,
  'history.getConfig': historyGetConfig,
};

/**
 * 注册所有场景处理器到 dispatcher
 */
export function registerSceneHandlers(
  registerMethod: (method: string, handler: MethodHandler) => void
): void {
  for (const [method, handler] of Object.entries(sceneHandlers)) {
    registerMethod(method, handler);
  }
}
