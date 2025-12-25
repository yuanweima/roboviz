/**
 * Input Selection Types
 *
 * Types for different kinds of geometric inputs that processes
 * can accept (edges, surfaces, points, regions).
 */

// ============================================================================
// Input Type Identifiers
// ============================================================================

/**
 * Types of geometric inputs a process can accept
 */
export type InputType =
  | 'edge'      // A single edge on a mesh
  | 'surface'   // A surface/face on a mesh
  | 'point'     // A single point in 3D space
  | 'region'    // A user-defined region on a surface
  | 'path'      // A sequence of points forming a path
  | 'volume';   // A 3D volume/region

// ============================================================================
// Base Input Selection
// ============================================================================

/**
 * Base interface for all input selections
 */
export interface BaseInputSelection {
  /** Unique identifier for this selection */
  id: string;

  /** Type of input */
  type: InputType;

  /** ID of the workpiece/mesh this input belongs to */
  workpieceId: string;

  /** Optional label/name for this selection */
  label?: string;

  /** Timestamp when this selection was created */
  createdAt: number;
}

// ============================================================================
// Edge Input
// ============================================================================

/**
 * A point along an edge with parameter
 */
export interface EdgePoint {
  /** Position in world coordinates */
  position: [number, number, number];

  /** Parameter along the edge (0-1) */
  parameter: number;

  /** Tangent direction at this point */
  tangent: [number, number, number];

  /** Normal direction at this point (perpendicular to edge, on surface) */
  normal: [number, number, number];
}

/**
 * Selection of an edge on a mesh
 */
export interface EdgeSelection extends BaseInputSelection {
  type: 'edge';

  /** Backend-assigned edge identifier */
  edgeId: string;

  /** Start point on the edge */
  startPoint: EdgePoint;

  /** End point on the edge */
  endPoint: EdgePoint;

  /** Total length of the edge in mm */
  length: number;

  /** Whether this is a closed loop edge */
  isClosed: boolean;

  /** Sampled points along the edge (for visualization) */
  samplePoints?: EdgePoint[];
}

// ============================================================================
// Surface Input
// ============================================================================

/**
 * Selection of a surface/face on a mesh
 */
export interface SurfaceSelection extends BaseInputSelection {
  type: 'surface';

  /** Backend-assigned surface/face identifier */
  surfaceId: string;

  /** Center point of the surface */
  center: [number, number, number];

  /** Average normal of the surface */
  normal: [number, number, number];

  /** Approximate area in mm² */
  area: number;

  /** Bounding box of the surface */
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

// ============================================================================
// Point Input
// ============================================================================

/**
 * Selection of a single point
 */
export interface PointSelection extends BaseInputSelection {
  type: 'point';

  /** Position in world coordinates */
  position: [number, number, number];

  /** Surface normal at this point (if on a surface) */
  normal?: [number, number, number];

  /** Local position relative to workpiece origin */
  localPosition?: [number, number, number];
}

// ============================================================================
// Region Input
// ============================================================================

/**
 * A user-defined region on a surface
 */
export interface RegionSelection extends BaseInputSelection {
  type: 'region';

  /** Backend-assigned region identifier */
  regionId: string;

  /** Boundary points defining the region */
  boundary: Array<[number, number, number]>;

  /** Average normal of the region */
  normal: [number, number, number];

  /** Approximate area in mm² */
  area: number;

  /** Whether this is a closed region */
  isClosed: boolean;
}

// ============================================================================
// Path Input
// ============================================================================

/**
 * A sequence of points forming a path
 */
export interface PathSelection extends BaseInputSelection {
  type: 'path';

  /** Ordered points along the path */
  points: Array<{
    position: [number, number, number];
    normal?: [number, number, number];
  }>;

  /** Total length of the path in mm */
  length: number;

  /** Whether this is a closed loop path */
  isClosed: boolean;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * Any type of input selection
 */
export type InputSelection =
  | EdgeSelection
  | SurfaceSelection
  | PointSelection
  | RegionSelection
  | PathSelection;

// ============================================================================
// Selection State
// ============================================================================

/**
 * State of the input selection system
 */
export interface SelectionState {
  /** Currently active input type being selected */
  activeInputType: InputType | null;

  /** Currently hovered element (for preview) */
  hoveredId: string | null;

  /** All completed selections */
  selections: InputSelection[];

  /** Currently selected selection ID */
  selectedId: string | null;

  /** Whether selection mode is active */
  isSelecting: boolean;
}

/**
 * Actions for manipulating selection state
 */
export interface SelectionActions {
  /** Start selecting a specific input type */
  startSelection: (type: InputType) => void;

  /** Cancel current selection */
  cancelSelection: () => void;

  /** Add a new selection */
  addSelection: (selection: InputSelection) => void;

  /** Remove a selection by ID */
  removeSelection: (id: string) => void;

  /** Update an existing selection */
  updateSelection: (id: string, updates: Partial<InputSelection>) => void;

  /** Select a specific selection */
  select: (id: string | null) => void;

  /** Set hovered element */
  setHovered: (id: string | null) => void;

  /** Clear all selections */
  clearAll: () => void;
}
