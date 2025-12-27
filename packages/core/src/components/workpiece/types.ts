/**
 * Workpiece Component Types
 *
 * Standardized interface for industrial workpiece visualizations.
 */

import type * as THREE from 'three';
import type { Vector3Tuple } from '../../types';

/**
 * Base props that all workpiece components should accept
 */
export interface WorkpieceBaseProps {
  /**
   * Position offset [x, y, z] in meters.
   */
  position?: Vector3Tuple;

  /**
   * Scale factor for the workpiece.
   * Default is 1.0.
   */
  scale?: number;

  /**
   * Callback to receive the main mesh reference.
   * This mesh is used for workpoint placement (raycasting).
   */
  onMeshRef?: (mesh: THREE.Mesh | null) => void;

  /**
   * Opacity of the workpiece (0-1).
   * Default is 1.0.
   */
  opacity?: number;

  /**
   * Whether to show debug helpers (axes, bounds, etc.)
   */
  debug?: boolean;
}

/**
 * Feature region on a workpiece surface
 */
export interface SurfaceFeature {
  /** Unique identifier */
  id: string;
  /** Center position relative to workpiece origin */
  center: Vector3Tuple;
  /** Size [width, depth] for rectangular, or [radius] for circular */
  size: number[];
  /** Normal direction (default: [0, 1, 0]) */
  normal?: Vector3Tuple;
  /** Feature type for visualization */
  type?: 'flat' | 'raised' | 'recessed' | 'curved';
  /** Optional label */
  label?: string;
}

/**
 * Linear feature (weld seam, edge, etc.)
 */
export interface LinearFeature {
  /** Unique identifier */
  id: string;
  /** Start point relative to workpiece origin */
  start: Vector3Tuple;
  /** End point relative to workpiece origin */
  end: Vector3Tuple;
  /** Feature type */
  type?: 'seam' | 'edge' | 'groove' | 'bead';
  /** Optional label */
  label?: string;
}

/**
 * Point feature (defect, hole, etc.)
 */
export interface PointFeature {
  /** Unique identifier */
  id: string;
  /** Position relative to workpiece origin */
  position: Vector3Tuple;
  /** Feature type */
  type?: 'hole' | 'defect' | 'marker' | 'reference';
  /** Size (radius) */
  size?: number;
  /** Severity for defects */
  severity?: 'critical' | 'warning' | 'minor' | 'info';
  /** Optional label */
  label?: string;
}

/**
 * Feature interaction state
 */
export interface FeatureInteractionState {
  /** Currently highlighted feature ID */
  highlightedId?: string | null;
  /** Currently selected feature ID */
  selectedId?: string | null;
  /** IDs of features that have been processed/completed */
  completedIds?: string[];
  /** Progress per feature (0-1) */
  progress?: Record<string, number>;
}

/**
 * Props for workpieces with surface features
 */
export interface SurfaceWorkpieceProps extends WorkpieceBaseProps {
  /** Surface features (regions) */
  features?: SurfaceFeature[];
  /** Feature interaction state */
  featureState?: FeatureInteractionState;
  /** Callback when a feature is clicked */
  onFeatureClick?: (featureId: string) => void;
  /** Callback when a feature is hovered */
  onFeatureHover?: (featureId: string | null) => void;
}

/**
 * Props for workpieces with linear features (seams, edges)
 */
export interface LinearWorkpieceProps extends WorkpieceBaseProps {
  /** Linear features */
  features?: LinearFeature[];
  /** Feature interaction state */
  featureState?: FeatureInteractionState;
  /** Callback when a feature is clicked */
  onFeatureClick?: (featureId: string) => void;
  /** Callback when a feature is hovered */
  onFeatureHover?: (featureId: string | null) => void;
}

/**
 * Props for workpieces with point features (defects, markers)
 */
export interface PointWorkpieceProps extends WorkpieceBaseProps {
  /** Point features */
  features?: PointFeature[];
  /** Feature interaction state */
  featureState?: FeatureInteractionState;
  /** Show feature markers */
  showMarkers?: boolean;
  /** Callback when a feature is clicked */
  onFeatureClick?: (featureId: string) => void;
  /** Callback when a feature is hovered */
  onFeatureHover?: (featureId: string | null) => void;
}

/**
 * Combined workpiece props with all feature types
 */
export interface WorkpieceProps extends WorkpieceBaseProps {
  /** Surface regions */
  surfaceFeatures?: SurfaceFeature[];
  /** Linear features (seams, edges) */
  linearFeatures?: LinearFeature[];
  /** Point features (defects, markers) */
  pointFeatures?: PointFeature[];
  /** Feature interaction state */
  featureState?: FeatureInteractionState;
  /** Callbacks */
  onFeatureClick?: (featureId: string, featureType: 'surface' | 'linear' | 'point') => void;
  onFeatureHover?: (featureId: string | null, featureType?: 'surface' | 'linear' | 'point') => void;
}

/**
 * Workpiece metadata for registration
 */
export interface WorkpieceMetadata {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Category (e.g., 'welding', 'machining', 'inspection') */
  category: string;
  /** Bounding box dimensions [width, height, depth] */
  boundingBox?: Vector3Tuple;
  /** Suitable processes for this workpiece */
  suitableProcesses?: string[];
}
