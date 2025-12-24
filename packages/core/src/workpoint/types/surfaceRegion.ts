/**
 * Surface Region Types
 *
 * Type definitions for surface region selection system.
 * Allows users to define regions on workpiece surfaces by clicking boundary points.
 */

import type { Vector3Tuple } from '../../types';

/**
 * Mesh data for a surface region - can be serialized and sent to backend
 */
export interface RegionMeshData {
  /** Flat array of vertex positions [x1,y1,z1, x2,y2,z2, ...] */
  vertices: number[];
  /** Flat array of vertex normals [nx1,ny1,nz1, nx2,ny2,nz2, ...] */
  normals: number[];
  /** Triangle indices (3 per triangle) */
  indices: number[];
  /** Number of vertices */
  vertexCount: number;
  /** Number of triangles */
  triangleCount: number;
}

/**
 * A single boundary point on the surface
 */
export interface RegionBoundaryPoint {
  /** Unique identifier */
  id: string;
  /** Position in world coordinates */
  position: Vector3Tuple;
  /** Surface normal at this point */
  normal: Vector3Tuple;
  /** Position relative to workpiece */
  localPosition?: Vector3Tuple;
  /** Order in the boundary (0-indexed) */
  order: number;
  /** Whether this is a user-clicked point (vs auto-generated intermediate point) */
  isUserPoint?: boolean;
}

/**
 * Surface region type
 */
export type SurfaceRegionType =
  | 'processing' // General processing area
  | 'spray' // Spray painting area
  | 'weld' // Welding area
  | 'avoid' // Area to avoid
  | 'inspection'; // Inspection area

/**
 * A closed surface region defined by boundary points
 */
export interface SurfaceRegion {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Type of region */
  type: SurfaceRegionType;
  /** ID of the workpiece this region belongs to */
  workpieceId: string;
  /** Boundary points (must be closed - first and last point connect) */
  boundaryPoints: RegionBoundaryPoint[];
  /** Whether the region is visible */
  visible: boolean;
  /** Region color */
  color: string;
  /** Region opacity (0-1) */
  opacity: number;
  /** Whether this region is currently being edited */
  isEditing?: boolean;
  /** Group ID if part of a group */
  groupId?: string;
  /** Creation timestamp */
  createdAt?: number;
  /** Last modification timestamp */
  updatedAt?: number;
  /** Mesh data for backend processing - contains triangulated geometry */
  meshData?: RegionMeshData;
}

/**
 * Data for creating a new surface region
 */
export interface SurfaceRegionCreateData {
  name?: string;
  type: SurfaceRegionType;
  workpieceId: string;
  boundaryPoints: Omit<RegionBoundaryPoint, 'id'>[];
  color?: string;
  opacity?: number;
  groupId?: string;
  meshData?: RegionMeshData;
}

/**
 * Data for updating an existing surface region
 */
export interface SurfaceRegionUpdateData {
  id: string;
  name?: string;
  type?: SurfaceRegionType;
  visible?: boolean;
  color?: string;
  opacity?: number;
  groupId?: string;
  boundaryPoints?: RegionBoundaryPoint[];
}

/**
 * Region editing mode
 */
export type RegionEditMode = 'none' | 'creating' | 'editing';

/**
 * State for region creation
 */
export interface RegionCreationState {
  /** Current mode */
  mode: RegionEditMode;
  /** Type of region being created */
  regionType: SurfaceRegionType;
  /** Current workpiece ID */
  workpieceId: string | null;
  /** Points collected so far */
  points: RegionBoundaryPoint[];
  /** Whether to close the region */
  isClosed: boolean;
}

/**
 * Default colors for different region types
 */
export const REGION_COLORS: Record<SurfaceRegionType, string> = {
  processing: '#4ecdc4', // Teal
  spray: '#0088ff', // Blue
  weld: '#ff8800', // Orange
  avoid: '#ff4444', // Red
  inspection: '#ffff00', // Yellow
};

/**
 * Default region configuration
 */
export const DEFAULT_REGION_CONFIG = {
  defaultOpacity: 0.4,
  boundaryLineWidth: 2,
  boundaryPointSize: 0.005,
  minPointsForRegion: 3,
  showBoundaryPoints: true,
  showBoundaryLines: true,
};

/**
 * Region system callbacks
 */
export interface SurfaceRegionCallbacks {
  onRegionCreated?: (region: SurfaceRegion) => void;
  onRegionRemoved?: (regionId: string) => void;
  onRegionChanged?: (region: SurfaceRegion) => void;
  onRegionSelected?: (regionId: string | null) => void;
  onPointAdded?: (point: RegionBoundaryPoint, regionId: string | null) => void;
}
