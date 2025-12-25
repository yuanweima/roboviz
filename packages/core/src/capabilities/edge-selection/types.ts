/**
 * Edge Selection Types
 *
 * Types for edge detection and selection capability.
 */

/**
 * Represents a detected edge on a workpiece
 */
export interface DetectedEdge {
  /** Unique identifier for this edge */
  id: string;

  /** ID of the workpiece this edge belongs to */
  workpieceId: string;

  /** Type of edge geometry */
  type: EdgeType;

  /** 3D points along the edge (world coordinates) */
  points: DetectedEdgePoint[];

  /** Total length of the edge in meters */
  length: number;

  /** Whether this edge is closed (forms a loop) */
  isClosed: boolean;

  /** Curvature information */
  curvature: EdgeCurvature;

  /** Optional metadata from detection algorithm */
  metadata?: Record<string, unknown>;
}

/**
 * Edge geometry types
 */
export type EdgeType =
  | 'linear' // Straight line
  | 'circular' // Arc or circle
  | 'spline' // Free-form curve
  | 'corner' // Corner joint (two lines meeting)
  | 'fillet' // Fillet edge
  | 'chamfer'; // Chamfer edge

/**
 * A point along a detected edge
 */
export interface DetectedEdgePoint {
  /** Position in world coordinates */
  position: [number, number, number];

  /** Tangent direction at this point */
  tangent: [number, number, number];

  /** Normal direction at this point (perpendicular to edge) */
  normal: [number, number, number];

  /** Distance along the edge from start (0-1 normalized) */
  t: number;
}

/**
 * Edge curvature information
 */
export interface EdgeCurvature {
  /** Minimum curvature radius (smallest turn) */
  minRadius: number;

  /** Maximum curvature radius */
  maxRadius: number;

  /** Average curvature radius */
  avgRadius: number;

  /** Whether edge has constant curvature */
  isConstant: boolean;
}

/**
 * Edge selection state
 */
export interface EdgeSelectionState {
  /** Currently detected edges */
  detectedEdges: DetectedEdge[];

  /** Selected edge IDs */
  selectedEdgeIds: string[];

  /** Hovered edge ID */
  hoveredEdgeId: string | null;

  /** Whether edge detection is in progress */
  isDetecting: boolean;

  /** Detection error message if any */
  detectionError: string | null;

  /** Edge display settings */
  displaySettings: EdgeDisplaySettings;
}

/**
 * Edge display settings
 */
export interface EdgeDisplaySettings {
  /** Show all detected edges */
  showAllEdges: boolean;

  /** Edge line width */
  lineWidth: number;

  /** Color for unselected edges */
  defaultColor: string;

  /** Color for selected edges */
  selectedColor: string;

  /** Color for hovered edge */
  hoverColor: string;

  /** Opacity for unselected edges */
  opacity: number;

  /** Show edge direction arrows */
  showDirectionArrows: boolean;

  /** Show edge labels */
  showLabels: boolean;
}

/**
 * Edge selection actions
 */
export interface EdgeSelectionActions {
  /** Trigger edge detection on workpiece(s) */
  detectEdges: (workpieceIds: string[]) => Promise<void>;

  /** Select an edge */
  selectEdge: (edgeId: string) => void;

  /** Deselect an edge */
  deselectEdge: (edgeId: string) => void;

  /** Toggle edge selection */
  toggleEdgeSelection: (edgeId: string) => void;

  /** Select multiple edges */
  selectEdges: (edgeIds: string[]) => void;

  /** Clear all edge selections */
  clearSelection: () => void;

  /** Set hovered edge */
  setHoveredEdge: (edgeId: string | null) => void;

  /** Update display settings */
  setDisplaySettings: (settings: Partial<EdgeDisplaySettings>) => void;

  /** Clear all detected edges */
  clearDetectedEdges: () => void;
}

/**
 * Edge detection options
 */
export interface EdgeDetectionOptions {
  /** Minimum edge length to detect (meters) */
  minLength?: number;

  /** Maximum edge length to detect (meters) */
  maxLength?: number;

  /** Edge types to detect */
  edgeTypes?: EdgeType[];

  /** Detection resolution (points per meter) */
  resolution?: number;

  /** Whether to detect internal edges */
  includeInternal?: boolean;

  /** Angle threshold for corner detection (degrees) */
  cornerAngleThreshold?: number;
}

/**
 * Props for EdgeSelectionProvider
 */
export interface EdgeSelectionProviderProps {
  children: React.ReactNode;

  /** Initial display settings */
  displaySettings?: Partial<EdgeDisplaySettings>;

  /** Callback when edges are selected */
  onSelectionChange?: (selectedEdgeIds: string[]) => void;

  /** Callback when edge is hovered */
  onHoverChange?: (edgeId: string | null) => void;

  /** Custom edge detector implementation */
  edgeDetector?: (workpieceIds: string[], options: EdgeDetectionOptions) => Promise<DetectedEdge[]>;
}
