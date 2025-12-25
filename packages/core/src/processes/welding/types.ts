/**
 * Welding Process Types
 *
 * Types specific to the welding process plugin.
 */

import type { DetectedEdge } from '../../capabilities/edge-selection';
import type { AngleConstraint } from '../../capabilities/angle-lock';

/**
 * Welding process settings
 */
export interface WeldingSettings {
  /** Welding method */
  method: WeldingMethod;

  /** Wire feed speed (m/min) */
  wireFeedSpeed: number;

  /** Welding voltage (V) */
  voltage: number;

  /** Welding current (A) */
  current: number;

  /** Travel speed (mm/s) */
  travelSpeed: number;

  /** Weave pattern settings */
  weave: WeaveSettings | null;

  /** Angle constraints */
  angleConstraints: AngleConstraint[];

  /** Torch standoff distance (mm) */
  standoffDistance: number;

  /** Gas flow rate (L/min) */
  gasFlowRate: number;

  /** Wire diameter (mm) */
  wireDiameter: number;

  /** Preheat temperature (°C) if required */
  preheatTemp: number | null;

  /** Interpass temperature (°C) if required */
  interpassTemp: number | null;
}

/**
 * Welding methods
 */
export type WeldingMethod =
  | 'MIG' // Gas Metal Arc Welding
  | 'TIG' // Gas Tungsten Arc Welding
  | 'MAG' // Metal Active Gas
  | 'FCAW' // Flux-Cored Arc Welding
  | 'SAW' // Submerged Arc Welding
  | 'Laser' // Laser Welding
  | 'LaserHybrid'; // Laser-Arc Hybrid

/**
 * Weave pattern settings for oscillation
 */
export interface WeaveSettings {
  /** Weave pattern type */
  pattern: WeavePattern;

  /** Weave width (mm) */
  width: number;

  /** Weave frequency (Hz) */
  frequency: number;

  /** Dwell time at sides (ms) */
  dwellTime: number;

  /** Pattern phase offset */
  phaseOffset: number;
}

/**
 * Weave pattern types
 */
export type WeavePattern =
  | 'none'
  | 'linear' // Simple side-to-side
  | 'triangular' // Triangle wave
  | 'circular' // Circular motion
  | 'figure8' // Figure-8 pattern
  | 'crescent'; // Crescent/moon pattern

/**
 * Welding seam definition
 */
export interface WeldingSeam {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Source edge(s) */
  edges: DetectedEdge[];

  /** Seam type */
  type: SeamType;

  /** Joint configuration */
  jointConfig: JointConfiguration;

  /** Start point on seam (0-1) */
  startT: number;

  /** End point on seam (0-1) */
  endT: number;

  /** Welding direction */
  direction: 'forward' | 'reverse';

  /** Number of passes required */
  passCount: number;

  /** Per-pass settings overrides */
  passSettings: PassSettings[];

  /** Seam-specific settings overrides */
  settingsOverrides: Partial<WeldingSettings>;
}

/**
 * Seam types
 */
export type SeamType =
  | 'butt' // Butt joint
  | 'fillet' // Fillet weld
  | 'lap' // Lap joint
  | 'corner' // Corner joint
  | 'edge' // Edge weld
  | 'plug' // Plug weld
  | 'slot'; // Slot weld

/**
 * Joint configuration
 */
export interface JointConfiguration {
  /** Included angle between plates (degrees) */
  includedAngle: number;

  /** Root gap (mm) */
  rootGap: number;

  /** Root face (mm) */
  rootFace: number;

  /** Plate thickness 1 (mm) */
  thickness1: number;

  /** Plate thickness 2 (mm) */
  thickness2: number;

  /** Bevel angle (degrees) */
  bevelAngle: number;

  /** Backing type */
  backing: 'none' | 'ceramic' | 'metal' | 'flux';
}

/**
 * Per-pass settings
 */
export interface PassSettings {
  /** Pass number (1-based) */
  passNumber: number;

  /** Pass type */
  type: PassType;

  /** Override settings for this pass */
  overrides: Partial<WeldingSettings>;

  /** Offset from centerline (mm) */
  offsetY: number;

  /** Offset in Z direction (mm) for multi-layer */
  offsetZ: number;
}

/**
 * Weld pass types
 */
export type PassType =
  | 'root' // Root pass
  | 'hot' // Hot pass
  | 'fill' // Fill pass
  | 'cap'; // Cap/cover pass

/**
 * Welding process input (selected seams)
 */
export interface WeldingInput {
  /** Selected seams to weld */
  seams: WeldingSeam[];

  /** Welding sequence (order of seam IDs) */
  sequence: string[];

  /** Active seam being edited */
  activeSeamId: string | null;
}

/**
 * Welding process output (generated trajectory + weld data)
 */
export interface WeldingOutput {
  /** Process-specific trajectory parameters */
  weldParameters: WeldParameterPoint[];

  /** Quality predictions */
  qualityPrediction: WeldQualityPrediction | null;

  /** Time estimates */
  timeEstimate: {
    arcOnTime: number;
    totalTime: number;
    setupTime: number;
  };

  /** Wire consumption estimate (meters) */
  wireConsumption: number;

  /** Gas consumption estimate (liters) */
  gasConsumption: number;
}

/**
 * Weld parameters at each trajectory point
 */
export interface WeldParameterPoint {
  /** Trajectory waypoint index */
  waypointIndex: number;

  /** Wire feed speed at this point (m/min) */
  wireFeedSpeed: number;

  /** Voltage at this point (V) */
  voltage: number;

  /** Current at this point (A) */
  current: number;

  /** Travel speed at this point (mm/s) */
  travelSpeed: number;

  /** Weave phase at this point (0-1) */
  weavePhase: number;

  /** Whether arc is on */
  arcOn: boolean;
}

/**
 * Weld quality prediction
 */
export interface WeldQualityPrediction {
  /** Overall quality score (0-100) */
  overallScore: number;

  /** Predicted issues */
  issues: WeldQualityIssue[];

  /** Heat input (kJ/mm) */
  heatInput: number;

  /** Predicted distortion (mm) */
  estimatedDistortion: number;
}

/**
 * Potential weld quality issue
 */
export interface WeldQualityIssue {
  /** Issue type */
  type: WeldDefectType;

  /** Severity (0-1) */
  severity: number;

  /** Location along seam (0-1) */
  location: number;

  /** Suggested remedy */
  suggestion: string;
}

/**
 * Common weld defects
 */
export type WeldDefectType =
  | 'porosity'
  | 'undercut'
  | 'lack-of-fusion'
  | 'lack-of-penetration'
  | 'spatter'
  | 'cracking'
  | 'distortion'
  | 'burn-through'
  | 'incomplete-fill';

/**
 * Default welding settings
 */
export const DEFAULT_WELDING_SETTINGS: WeldingSettings = {
  method: 'MIG',
  wireFeedSpeed: 8,
  voltage: 24,
  current: 180,
  travelSpeed: 10,
  weave: null,
  angleConstraints: [],
  standoffDistance: 15,
  gasFlowRate: 18,
  wireDiameter: 1.2,
  preheatTemp: null,
  interpassTemp: null,
};

/**
 * Default joint configuration
 */
export const DEFAULT_JOINT_CONFIG: JointConfiguration = {
  includedAngle: 60,
  rootGap: 2,
  rootFace: 2,
  thickness1: 6,
  thickness2: 6,
  bevelAngle: 30,
  backing: 'none',
};
