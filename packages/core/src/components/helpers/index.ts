/**
 * RoboViz Helper Components
 *
 * Common visualization helpers for robot applications.
 */

export { SafetyZoneVisual, type SafetyZoneVisualProps } from './SafetyZone';
export { WorkspaceVisual, SharedWorkspace, type WorkspaceVisualProps, type SharedWorkspaceProps } from './Workspace';
export {
  ProgressIndicator,
  AnimatedProgress,
  type ProgressIndicatorProps,
  type AnimatedProgressProps,
} from './ProgressIndicator';
export {
  CoordinationLine,
  CoordinationLines,
  AnimatedCoordinationLine,
  BidirectionalLine,
  type CoordinationLineProps,
  type CoordinationLinesProps,
  type AnimatedCoordinationLineProps,
  type BidirectionalLineProps,
} from './CoordinationLine';

// Collision visualization components
// Note: SafetyZone component renamed to SafetyZone3D to avoid conflict with SafetyZone type
export {
  // Main visualizer
  CollisionVisualizer,
  CollisionStatusBadge,
  useCollisionVisualization,
  // Geometry-based SafetyZone component (as SafetyZone3D to distinguish from type)
  SafetyZone as SafetyZone3D,
  SafetyZoneList,
  // Collision geometry
  CollisionGeometryVisual,
  CollisionGeometryList,
  // Contact points
  ContactPoint,
  ContactPointList,
  PenetrationVector,
  CollisionIndicator,
  // Types
  type CollisionVisualizerProps,
  type SafetyZoneProps,
  type SafetyZoneListProps,
  type CollisionGeometryVisualProps,
  type CollisionGeometryListProps,
  type ContactPointProps,
  type ContactPointListProps,
  type CollisionStatusBadgeProps,
} from '../collision/index';
