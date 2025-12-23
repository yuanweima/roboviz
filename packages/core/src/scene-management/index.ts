/**
 * RoboViz Scene Management Module
 *
 * 场景管理模块
 */

// Types
export type {
  SceneSnapshot,
  SceneExportFormat,
  SceneExportOptions,
  SceneImportOptions,
  ImportResult,
  OperationType,
  Operation,
  HistoryConfig,
  ISceneManager,
  SceneEventType,
  SceneEvent,
} from './types';

// Constants
export {
  SNAPSHOT_VERSION,
  DEFAULT_HISTORY_CONFIG,
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_IMPORT_OPTIONS,
} from './types';

// Scene Manager
export {
  SceneManager,
  createSceneManager,
  getSceneManager,
  resetSceneManager,
} from './scene-manager';
export type { SceneManagerConfig } from './scene-manager';
