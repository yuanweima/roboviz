/**
 * Waypoint Module
 *
 * Planning waypoint management and editing system.
 */

// Types
export type {
  Pose3D,
  WaypointType,
  IKStatus,
  MotionConstraints,
  PlanningWaypoint,
  WaypointManagerState,
  WaypointVisualization,
} from './types';

export { DEFAULT_WAYPOINT_VISUALIZATION } from './types';

// Manager
export { WaypointManager, getWaypointManager, resetWaypointManager } from './WaypointManager';

// Hooks
export { useWaypointManager } from './useWaypointManager';
export type {
  UseWaypointManagerOptions,
  UseWaypointManagerReturn,
} from './useWaypointManager';

// Components
export {
  PlanningWaypointVisual,
  PlanningWaypointGizmo,
  WaypointPathRenderer,
} from './components';
export type {
  PlanningWaypointVisualProps,
  PlanningWaypointGizmoProps,
  GizmoMode as WaypointGizmoMode,
  WaypointPathRendererProps,
} from './components';
