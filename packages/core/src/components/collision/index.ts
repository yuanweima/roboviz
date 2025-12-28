/**
 * RoboViz Collision Visualization Components
 *
 * Components for visualizing collision detection and safety zones.
 */

// SafetyZone
export {
  SafetyZone,
  SafetyZoneList,
  type SafetyZoneProps,
  type SafetyZoneListProps,
} from './SafetyZone';

// CollisionGeometryVisual
export {
  CollisionGeometryVisual,
  CollisionGeometryList,
  type CollisionGeometryVisualProps,
  type CollisionGeometryListProps,
} from './CollisionGeometryVisual';

// ContactPointVisual
export {
  ContactPoint,
  ContactPointList,
  PenetrationVector,
  CollisionIndicator,
  type ContactPointProps,
  type ContactPointListProps,
  type PenetrationVectorProps,
  type CollisionIndicatorProps,
} from './ContactPointVisual';

// CollisionVisualizer
export {
  CollisionVisualizer,
  CollisionStatusBadge,
  useCollisionVisualization,
  type CollisionVisualizerProps,
  type CollisionOverlayProps,
  type CollisionStatusBadgeProps,
  type UseCollisionVisualizationOptions,
  type UseCollisionVisualizationReturn,
} from './CollisionVisualizer';

// Distance Field Visualization (advanced shader-based collision visuals)
export {
  DistanceFieldZone,
  ProximityField,
  CollisionRiskIndicator,
  type DistanceFieldConfig,
  type DistanceFieldZoneProps,
  type ProximityFieldProps,
  type CollisionRiskIndicatorProps,
} from './DistanceFieldVisual';
