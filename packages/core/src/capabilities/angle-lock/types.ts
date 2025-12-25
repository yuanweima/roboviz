/**
 * Angle Lock Types
 *
 * Types for tool angle control capability.
 * Used for welding, grinding, and other processes that require
 * specific tool angles relative to the workpiece surface.
 */

/**
 * Angle constraint configuration
 */
export interface AngleConstraint {
  /** Angle type being constrained */
  type: AngleType;

  /** Target angle in degrees */
  targetAngle: number;

  /** Allowed deviation from target (degrees) */
  tolerance: number;

  /** Whether this constraint is enabled */
  enabled: boolean;

  /** Reference frame for the angle */
  referenceFrame: AngleReferenceFrame;
}

/**
 * Types of angles that can be locked
 */
export type AngleType =
  | 'work' // Work angle (perpendicular to seam direction)
  | 'travel' // Travel angle (along seam direction)
  | 'lead' // Lead/drag angle
  | 'tilt' // General tilt from surface normal
  | 'rotation'; // Tool rotation around its axis

/**
 * Reference frame for angle measurement
 */
export type AngleReferenceFrame =
  | 'surface-normal' // Relative to surface normal
  | 'seam-tangent' // Relative to seam/edge tangent
  | 'gravity' // Relative to gravity (world Z)
  | 'robot-base'; // Relative to robot base frame

/**
 * Angle lock state
 */
export interface AngleLockState {
  /** Active angle constraints */
  constraints: AngleConstraint[];

  /** Whether angle lock is globally enabled */
  enabled: boolean;

  /** Current angle values (computed from robot pose) */
  currentAngles: Record<AngleType, number>;

  /** Whether current angles satisfy constraints */
  constraintsSatisfied: boolean;

  /** Violations for each constraint */
  violations: AngleViolation[];

  /** Display settings */
  displaySettings: AngleDisplaySettings;
}

/**
 * Angle constraint violation
 */
export interface AngleViolation {
  /** Which constraint is violated */
  constraintType: AngleType;

  /** Current angle value */
  currentAngle: number;

  /** Target angle value */
  targetAngle: number;

  /** Amount of deviation */
  deviation: number;

  /** Whether it's within tolerance */
  withinTolerance: boolean;
}

/**
 * Angle display settings
 */
export interface AngleDisplaySettings {
  /** Show angle indicator cones */
  showCones: boolean;

  /** Show angle value labels */
  showLabels: boolean;

  /** Show target angle guides */
  showTargetGuides: boolean;

  /** Cone opacity */
  coneOpacity: number;

  /** Cone size (height) */
  coneSize: number;

  /** Colors */
  colors: {
    /** Within tolerance */
    valid: string;
    /** Outside tolerance but close */
    warning: string;
    /** Significantly off target */
    error: string;
    /** Target indicator */
    target: string;
  };
}

/**
 * Angle lock actions
 */
export interface AngleLockActions {
  /** Enable/disable angle lock globally */
  setEnabled: (enabled: boolean) => void;

  /** Set a specific angle constraint */
  setConstraint: (constraint: AngleConstraint) => void;

  /** Update an existing constraint */
  updateConstraint: (type: AngleType, updates: Partial<AngleConstraint>) => void;

  /** Remove a constraint */
  removeConstraint: (type: AngleType) => void;

  /** Enable/disable a specific constraint */
  toggleConstraint: (type: AngleType, enabled: boolean) => void;

  /** Set all constraints at once */
  setConstraints: (constraints: AngleConstraint[]) => void;

  /** Clear all constraints */
  clearConstraints: () => void;

  /** Update current angle values (called by robot state) */
  updateCurrentAngles: (angles: Record<AngleType, number>) => void;

  /** Update display settings */
  setDisplaySettings: (settings: Partial<AngleDisplaySettings>) => void;

  /** Get suggested correction to satisfy constraints */
  getSuggestedCorrection: () => AngleCorrection | null;
}

/**
 * Suggested angle correction
 */
export interface AngleCorrection {
  /** Rotation around X axis (degrees) */
  rx: number;

  /** Rotation around Y axis (degrees) */
  ry: number;

  /** Rotation around Z axis (degrees) */
  rz: number;

  /** Magnitude of total correction needed */
  magnitude: number;
}

/**
 * Props for AngleLockProvider
 */
export interface AngleLockProviderProps {
  children: React.ReactNode;

  /** Initial constraints */
  constraints?: AngleConstraint[];

  /** Initial enabled state */
  enabled?: boolean;

  /** Initial display settings */
  displaySettings?: Partial<AngleDisplaySettings>;

  /** Callback when constraints change */
  onConstraintsChange?: (constraints: AngleConstraint[]) => void;

  /** Callback when violation state changes */
  onViolationChange?: (violations: AngleViolation[]) => void;
}

/**
 * Common welding angle presets
 */
export const WELDING_ANGLE_PRESETS = {
  /** Flat position welding */
  flat: {
    work: { type: 'work' as const, targetAngle: 90, tolerance: 15, enabled: true, referenceFrame: 'surface-normal' as const },
    travel: { type: 'travel' as const, targetAngle: 0, tolerance: 15, enabled: true, referenceFrame: 'seam-tangent' as const },
  },
  /** Horizontal position welding */
  horizontal: {
    work: { type: 'work' as const, targetAngle: 90, tolerance: 10, enabled: true, referenceFrame: 'surface-normal' as const },
    travel: { type: 'travel' as const, targetAngle: 5, tolerance: 10, enabled: true, referenceFrame: 'seam-tangent' as const },
  },
  /** Vertical up welding */
  verticalUp: {
    work: { type: 'work' as const, targetAngle: 90, tolerance: 10, enabled: true, referenceFrame: 'surface-normal' as const },
    travel: { type: 'travel' as const, targetAngle: 10, tolerance: 10, enabled: true, referenceFrame: 'seam-tangent' as const },
  },
  /** Overhead welding */
  overhead: {
    work: { type: 'work' as const, targetAngle: 90, tolerance: 10, enabled: true, referenceFrame: 'surface-normal' as const },
    travel: { type: 'travel' as const, targetAngle: 5, tolerance: 10, enabled: true, referenceFrame: 'seam-tangent' as const },
  },
};
