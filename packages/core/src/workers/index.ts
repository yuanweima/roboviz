/**
 * Workers Module
 *
 * Web Worker infrastructure for offloading computation from main thread.
 * Supports SharedArrayBuffer for zero-copy communication.
 *
 * Uses trajx-wasm for accurate batch forward kinematics computation.
 *
 * NOTE: Worker files (fk-worker.js, trajx_wasm.js, trajx_wasm_bg.wasm) must be
 * placed in the public/workers/ directory of the consuming application.
 */

// Types
export type {
  FKWorkerMessageType,
  SharedBufferLayout,
  SharedBufferViews,
  InitMessage,
  UpdateJointsMessage,
  ComputeFKMessage,
  MainToWorkerMessage,
  ReadyMessage,
  FKResultMessage,
  ErrorMessage,
  WorkerToMainMessage,
} from './types';

// Utilities
export { calculateBufferLayout, createBufferViews, CONTROL_FLAG } from './types';

// Hooks
export {
  useInstancedRobotWorker,
  type UseInstancedRobotWorkerOptions,
  type InstancedRobotWorkerState,
  type InstancedRobotWorkerActions,
  type UseInstancedRobotWorkerReturn,
} from './useInstancedRobotWorker';

export {
  useSharedBufferWorker,
  type UseSharedBufferWorkerOptions,
  type SharedBufferWorkerState,
  type SharedBufferWorkerActions,
} from './useSharedBufferWorker';
