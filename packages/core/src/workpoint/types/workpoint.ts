/**
 * Workpoint System Types
 *
 * Type definitions for the workpoint system that allows users to
 * define work points on workpiece surfaces for robotic operations.
 */

import type { Vector3Tuple, QuaternionTuple } from '../../types';

/**
 * Types of workpoints supported by the system
 */
export type WorkpointType =
  | 'normal' // General purpose work point
  | 'camera' // Camera/vision inspection point
  | 'weld' // Welding point
  | 'spray' // Spray painting point
  | 'measure'; // Measurement point

/**
 * Workpoint group for organizing and batch controlling workpoints
 */
export interface WorkpointGroup {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Group color (overrides individual workpoint type colors) */
  color?: string;
  /** Whether the group is visible */
  visible: boolean;
  /** Whether to show camera frustums for camera-type workpoints in this group */
  showFrustums: boolean;
  /** Whether to show labels for workpoints in this group */
  showLabels: boolean;
  /** Order for display in UI */
  order?: number;
  /** Creation timestamp */
  createdAt?: number;
}

/**
 * Display level of detail for workpoints
 */
export type WorkpointLOD = 'full' | 'simplified' | 'minimal';

/**
 * Display simplification settings
 */
export interface WorkpointDisplayConfig {
  /** Level of detail for rendering */
  lod: WorkpointLOD;
  /** Global toggle for showing camera frustums */
  showFrustums: boolean;
  /** Global toggle for showing labels */
  showLabels: boolean;
  /** Global toggle for showing order numbers */
  showOrder: boolean;
  /** Maximum number of frustums to show (0 = unlimited) */
  maxVisibleFrustums: number;
  /** Frustum opacity (0-1) */
  frustumOpacity: number;
  /** Only show frustum for selected/hovered workpoint */
  frustumOnHoverOnly: boolean;
  /** Use simplified icons (arrows instead of complex shapes) */
  simplifiedIcons: boolean;
  /** Show coordinate axes on workpoints */
  showAxes: boolean;
  /** Lock rotation offset for batch placement (keep rotation for subsequent points) */
  lockRotation: boolean;
  /** Lock tilt angle for batch placement (degrees from surface normal, e.g., 15° for welding) */
  lockTiltAngle: boolean;
  /** Default tilt angle in degrees (0 = perpendicular to surface, positive = tilted) */
  defaultTiltAngle: number;
}

/**
 * Workpoint metadata for specific types
 */
export interface WorkpointMetadata {
  /** Camera field of view in degrees (for camera type) */
  cameraFOV?: number;
  /** Camera working distance (for camera type) */
  cameraDistance?: number;
  /** Camera aspect ratio (for camera type) */
  cameraAspectRatio?: number;
  /**
   * @deprecated No longer used. The workpoint position is now always the surface position.
   * For camera type, optical center = position + surfaceNormal * cameraDistance.
   * Kept for backward compatibility with existing data.
   */
  targetPosition?: Vector3Tuple;
  /** Tool offset from TCP (for all types) */
  toolOffset?: Vector3Tuple;
  /** Custom user data */
  userData?: Record<string, unknown>;
}

/**
 * A single workpoint definition
 */
export interface Workpoint {
  /** Unique identifier */
  id: string;
  /** Type of workpoint */
  type: WorkpointType;
  /** Position in world coordinates */
  position: Vector3Tuple;
  /** Orientation as quaternion [x, y, z, w] */
  quaternion: QuaternionTuple;
  /** Position relative to workpiece (for following workpiece movement) */
  localPosition?: Vector3Tuple;
  /** Local orientation relative to workpiece */
  localQuaternion?: QuaternionTuple;
  /** ID of the workpiece this point belongs to */
  workpieceId: string;
  /** ID of the group this workpoint belongs to (optional) */
  groupId?: string;
  /** Surface normal at the point */
  surfaceNormal?: Vector3Tuple;
  /** Order in processing sequence (optional) */
  order?: number;
  /** Whether this workpoint is enabled */
  enabled?: boolean;
  /** Type-specific metadata */
  metadata?: WorkpointMetadata;
  /** Creation timestamp */
  createdAt?: number;
  /** Last modification timestamp */
  updatedAt?: number;
}

/**
 * Data for creating a new workpoint
 */
export interface WorkpointCreateData {
  type: WorkpointType;
  position: Vector3Tuple;
  quaternion: QuaternionTuple;
  workpieceId: string;
  groupId?: string;
  surfaceNormal?: Vector3Tuple;
  localPosition?: Vector3Tuple;
  localQuaternion?: QuaternionTuple;
  order?: number;
  metadata?: WorkpointMetadata;
}

/**
 * Data for updating an existing workpoint
 */
export interface WorkpointUpdateData {
  id: string;
  position?: Vector3Tuple;
  quaternion?: QuaternionTuple;
  localPosition?: Vector3Tuple;
  localQuaternion?: QuaternionTuple;
  type?: WorkpointType;
  groupId?: string;
  order?: number;
  enabled?: boolean;
  metadata?: Partial<WorkpointMetadata>;
}

/**
 * Workpoint editing mode
 */
export type WorkpointMode = 'view' | 'edit';

/**
 * Gizmo mode for editing
 */
export type GizmoMode = 'translate' | 'rotate';

/**
 * Raycast hit result on workpiece surface
 */
export interface WorkpointRaycastHit {
  /** Hit position in world coordinates */
  position: Vector3Tuple;
  /** Surface normal at hit point */
  normal: Vector3Tuple;
  /** Distance from camera */
  distance: number;
  /** ID of the hit workpiece */
  workpieceId: string;
  /** Face index (for debugging) */
  faceIndex?: number;
  /** Local position relative to workpiece */
  localPosition?: Vector3Tuple;
}

/**
 * Preview workpoint state (shown during hover)
 */
export interface WorkpointPreviewState {
  /** The preview workpoint data */
  workpoint: Workpoint;
  /** Whether the preview is valid (cursor over workpiece) */
  isValid: boolean;
  /** Current rotation offset applied by user (radians) */
  rotationOffset: number;
}

/**
 * Configuration for the workpoint system
 */
export interface WorkpointConfig {
  /** Rotation step in degrees when pressing rotate key */
  rotationStepDegrees: number;
  /** Position step in meters for keyboard nudging (default: 0.001 = 1mm) */
  positionStepMeters: number;
  /** Fine adjustment multiplier (Alt key, default: 0.1) */
  fineStepMultiplier: number;
  /** Coarse adjustment multiplier (Shift key, default: 10) */
  coarseStepMultiplier: number;
  /** Preview opacity (0-1) */
  previewOpacity: number;
  /** Whether Gizmo is enabled */
  enableGizmo: boolean;
  /** Gizmo size multiplier */
  gizmoSize: number;
  /** Default camera FOV for camera-type workpoints */
  defaultCameraFOV: number;
  /** Default camera distance for camera-type workpoints */
  defaultCameraDistance: number;
  /** Default camera aspect ratio */
  defaultCameraAspectRatio: number;
  /** Workpoint visual size */
  workpointSize: number;
  /** Whether to show workpoint labels */
  showLabels: boolean;
  /** Whether to show order numbers */
  showOrder: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_WORKPOINT_CONFIG: WorkpointConfig = {
  rotationStepDegrees: 1, // 1 degree for fine rotation control
  positionStepMeters: 0.001, // 1mm default step
  fineStepMultiplier: 0.1, // Alt key: 0.1mm / 0.1°
  coarseStepMultiplier: 10, // Shift key: 10mm / 10°
  previewOpacity: 0.5,
  enableGizmo: true,
  gizmoSize: 2, // Reasonable size for gizmo
  defaultCameraFOV: 60,
  defaultCameraDistance: 0.3,
  defaultCameraAspectRatio: 4 / 3,
  workpointSize: 0.02,
  showLabels: true,
  showOrder: true,
};

/**
 * Default display configuration
 */
export const DEFAULT_DISPLAY_CONFIG: WorkpointDisplayConfig = {
  lod: 'full',
  showFrustums: true,
  showLabels: true,
  showOrder: true,
  maxVisibleFrustums: 0, // 0 = unlimited
  frustumOpacity: 0.2,
  frustumOnHoverOnly: false,
  simplifiedIcons: true, // Default to simplified for better performance
  showAxes: true,
  lockRotation: false, // Don't lock by default
  lockTiltAngle: false, // Don't lock tilt by default
  defaultTiltAngle: 0, // 0 = perpendicular to surface
};

/**
 * Color scheme for different workpoint types
 */
export const WORKPOINT_COLORS: Record<WorkpointType, string> = {
  normal: '#00ff00', // Green
  camera: '#00ffff', // Cyan
  weld: '#ff8800', // Orange
  spray: '#0088ff', // Blue
  measure: '#ffff00', // Yellow
};

/**
 * Predefined group colors for easy selection
 */
export const GROUP_COLORS = [
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#ffe66d', // Yellow
  '#95e1d3', // Mint
  '#f38181', // Coral
  '#aa96da', // Lavender
  '#fcbad3', // Pink
  '#a8d8ea', // Light blue
  '#f9ed69', // Bright yellow
  '#6a0572', // Purple
];

/**
 * Workpoint system callbacks
 */
export interface WorkpointCallbacks {
  onWorkpointAdded?: (workpoint: Workpoint) => void;
  onWorkpointRemoved?: (workpointId: string) => void;
  onWorkpointChanged?: (workpoint: Workpoint) => void;
  onWorkpointSelected?: (workpointId: string | null) => void;
  onModeChanged?: (mode: WorkpointMode) => void;
  onExecuteWorkpoint?: (workpointId: string, robotId: string) => void;
  onExecuteSequence?: (workpointIds: string[], robotId: string) => void;
  onGroupAdded?: (group: WorkpointGroup) => void;
  onGroupRemoved?: (groupId: string) => void;
  onGroupChanged?: (group: WorkpointGroup) => void;
}

/**
 * Props for the WorkpointManager component
 */
export interface WorkpointManagerProps {
  /** IDs of workpiece objects that can receive workpoints */
  workpieceIds: string[];
  /** Initial workpoints to display */
  initialWorkpoints?: Workpoint[];
  /** Currently active robot ID (for execute operations) */
  activeRobotId?: string;
  /** Configuration overrides */
  config?: Partial<WorkpointConfig>;
  /** Event callbacks */
  callbacks?: WorkpointCallbacks;
  /** Whether the workpoint system is enabled */
  enabled?: boolean;
}
