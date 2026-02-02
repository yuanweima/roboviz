/**
 * Motion Planning Module
 *
 * GPU-accelerated motion planning pipeline for robotics.
 */

// Types
export * from './types';

// Manager
export {
  MotionPlanningManager,
  getMotionPlanningManager,
  resetMotionPlanningManager,
} from './planning-manager';

// Hooks
export * from './hooks';

// Components
export * from './components';

// ============================================================================
// Waypoint System
// ============================================================================

export * from './waypoint';

// ============================================================================
// GPU Planning Engine
// ============================================================================

export * from './gpu';

// ============================================================================
// Planner Provider (injection pattern — parallel to SolverProvider)
// ============================================================================

export * from './planner-provider-types';
export {
  PlannerProvider,
  usePlannerContext,
  usePlannerContextOptional,
  usePlannerStatus,
  type PlannerProviderProps,
} from './PlannerContext';
export * from './adapters';
