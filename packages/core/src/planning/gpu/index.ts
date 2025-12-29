/**
 * GPU Planning Module
 *
 * GPU-accelerated motion planning using trajx-wasm.
 */

// Types (renamed to avoid conflicts with planning/types.ts and processes/welding/types.ts)
export type {
  JointConfiguration as GpuJointConfiguration,
  GpuPlannerType,
  PlannerParams as GpuPlannerParams,
  BatchCollisionResult,
  EdgeValidationResult,
  PlanningPhase,
  GpuPlanningProgress,
  GpuPathWaypoint,
  GpuPlanningResult,
  PointToPointRequest,
  MultiWaypointRequest,
  GpuPlanningEngineConfig,
  GpuPlanningEngineState,
  IGpuPlanningEngine,
  UseGpuPlanningOptions,
  UseGpuPlanningReturn,
  GpuPlanningEventType,
  GpuPlanningEvent,
  GpuPlanningEventCallback,
} from './types';

export {
  DEFAULT_PLANNER_PARAMS as DEFAULT_GPU_PLANNER_PARAMS,
  INITIAL_PLANNING_PROGRESS,
} from './types';

// Engine
export {
  GpuPlanningEngine,
  createGpuPlanningEngine,
} from './GpuPlanningEngine';

// Hook
export { useGpuPlanning } from './useGpuPlanning';
