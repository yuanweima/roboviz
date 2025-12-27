/**
 * Tool Component Types
 *
 * Standardized interface for robot end-effector tools.
 * All tools should implement these base props for consistent integration.
 */

import type { Vector3Tuple, QuaternionTuple } from '../../types';

/**
 * Base props that all tool components should accept
 */
export interface ToolBaseProps {
  /**
   * Position in world coordinates [x, y, z] in meters.
   * If not provided, the tool will be positioned at origin.
   * When used with EndEffector component, this is typically not needed.
   */
  position?: Vector3Tuple;

  /**
   * Orientation as quaternion [x, y, z, w].
   * If not provided, the tool will use identity rotation.
   * When used with EndEffector component, this is typically not needed.
   */
  quaternion?: QuaternionTuple;

  /**
   * Scale factor for the tool model.
   * Default is 1.0.
   */
  scale?: number;

  /**
   * Whether the tool is currently active/operating.
   * When true, the tool may show visual effects (sparks, rotation, lights, etc.)
   */
  isActive?: boolean;

  /**
   * Whether to show the tool's axis helper for debugging.
   */
  showAxes?: boolean;

  /**
   * Opacity of the tool (0-1).
   * Default is 1.0 (fully opaque).
   */
  opacity?: number;
}

/**
 * Tool metadata for registration and UI
 */
export interface ToolMetadata {
  /** Unique identifier for this tool type */
  id: string;

  /** Human-readable name */
  name: string;

  /** Short description */
  description: string;

  /** Category for grouping (e.g., 'welding', 'inspection', 'material-handling') */
  category: string;

  /** Default TCP offset for this tool */
  defaultTcpOffset?: {
    position: Vector3Tuple;
    rotation: [number, number, number]; // Euler angles
  };

  /** Default scale */
  defaultScale?: number;
}

/**
 * Tool visualization types (more specific than process ToolType)
 */
export type ToolVisualizationType =
  | 'welding-torch'
  | 'grinding-wheel'
  | 'inspection-camera'
  | 'gripper'
  | 'spray-gun'
  | 'laser-cutter'
  | 'probe'
  | 'custom';

/**
 * Welding torch specific props
 */
export interface WeldingTorchProps extends ToolBaseProps {
  /** Primary color (body accent) */
  color?: string;
  /** Wire feed rate visualization */
  wireFeedActive?: boolean;
}

/**
 * Grinding wheel specific props
 */
export interface GrindingWheelProps extends ToolBaseProps {
  /** Primary color */
  color?: string;
  /** Rotation speed in RPM (for visual effect) */
  rpm?: number;
}

/**
 * Inspection camera specific props
 */
export interface InspectionCameraProps extends ToolBaseProps {
  /** Accent color */
  color?: string;
  /** Show laser line projection */
  showLaser?: boolean;
  /** Laser color */
  laserColor?: string;
}

/**
 * Gripper specific props
 */
export interface GripperProps extends ToolBaseProps {
  /** Primary color */
  color?: string;
  /** Gripper opening (0 = closed, 1 = fully open) */
  opening?: number;
  /** Gripper force visualization (0-1) */
  grippingForce?: number;
}

/**
 * Spray gun specific props
 */
export interface SprayGunProps extends ToolBaseProps {
  /** Spray color */
  sprayColor?: string;
  /** Flow rate (affects particle density) */
  flowRate?: number;
  /** Spray cone angle in degrees */
  coneAngle?: number;
}

/**
 * Generic custom tool props
 */
export interface CustomToolProps extends ToolBaseProps {
  /** Custom geometry or children to render */
  children?: React.ReactNode;
}
