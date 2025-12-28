/**
 * Cable Management Constants
 *
 * Default values, presets, and constants for cable management.
 */

import type {
  CableDisplaySettings,
  CableTwistConstraints,
  CableProperties,
  CableWarningLevel,
} from './types';

/**
 * Default display settings
 */
export const DEFAULT_DISPLAY_SETTINGS: CableDisplaySettings = {
  showCables: true,
  showTwistGauge: true,
  showWarnings: true,
  renderMode: 'tube',
  lineWidth: 2,
  tubeSegments: 64,
  colorByStress: true,
  showAttachmentMarkers: true,
};

/**
 * Default twist constraints
 */
export const DEFAULT_TWIST_CONSTRAINTS: CableTwistConstraints = {
  maxTwist: Math.PI * 2, // 360 degrees
  warningThreshold: Math.PI * 1.5, // 270 degrees
  criticalThreshold: Math.PI * 1.8, // 324 degrees
  enableAutoUnwindSuggestion: true,
};

/**
 * Warning level colors
 */
export const WARNING_LEVEL_COLORS: Record<CableWarningLevel, string> = {
  safe: '#22c55e', // Green
  caution: '#eab308', // Yellow
  warning: '#f97316', // Orange
  critical: '#ef4444', // Red
};

/**
 * Warning level priority (higher = more severe)
 */
export const WARNING_LEVEL_PRIORITY: Record<CableWarningLevel, number> = {
  safe: 0,
  caution: 1,
  warning: 2,
  critical: 3,
};

/**
 * Cable type presets
 */
export const CABLE_PRESETS: Record<string, Omit<CableProperties, 'label'>> = {
  /** Welding power cable */
  welding: {
    diameter: 25,
    minBendRadius: 100,
    type: 'welding',
    color: '#e74c3c',
  },

  /** Wire feeder tube */
  wireFeeder: {
    diameter: 8,
    minBendRadius: 50,
    type: 'composite',
    color: '#3498db',
  },

  /** Gas hose */
  gas: {
    diameter: 6,
    minBendRadius: 30,
    type: 'gas',
    color: '#2ecc71',
  },

  /** Signal cable */
  signal: {
    diameter: 4,
    minBendRadius: 20,
    type: 'signal',
    color: '#9b59b6',
  },

  /** Fiber optic */
  fiber: {
    diameter: 3,
    minBendRadius: 25,
    type: 'fiber',
    color: '#f39c12',
  },

  /** Power cable */
  power: {
    diameter: 12,
    minBendRadius: 60,
    type: 'power',
    color: '#1abc9c',
  },

  /** Coolant tube */
  coolant: {
    diameter: 10,
    minBendRadius: 40,
    type: 'coolant',
    color: '#00bcd4',
  },

  /** Generic composite bundle */
  composite: {
    diameter: 30,
    minBendRadius: 120,
    type: 'composite',
    color: '#607d8b',
  },
};

/**
 * Animation and update constants
 */
export const UPDATE_CONSTANTS = {
  /** Maximum history length */
  MAX_HISTORY_LENGTH: 10000,

  /** Minimum update interval (ms) */
  MIN_UPDATE_INTERVAL: 16, // ~60fps

  /** Warning debounce time (ms) */
  WARNING_DEBOUNCE: 500,

  /** Spline interpolation segments */
  SPLINE_SEGMENTS: 50,

  /** Path update throttle (ms) */
  PATH_UPDATE_THROTTLE: 100,
};

/**
 * Twist calculation constants
 */
export const TWIST_CONSTANTS = {
  /** Minimum twist delta to register (rad) */
  MIN_TWIST_DELTA: 0.001,

  /** Angle wrap threshold (rad) */
  WRAP_THRESHOLD: Math.PI * 1.9,

  /** Default joint weights for 6-axis robot (last 3 joints contribute to twist) */
  DEFAULT_6DOF_WEIGHTS: [0, 0, 0, 0.5, 0.8, 1.0],

  /** Default joint weights for 7-axis robot */
  DEFAULT_7DOF_WEIGHTS: [0, 0, 0, 0, 0.5, 0.8, 1.0],
};

/**
 * Visualization constants
 */
export const VISUALIZATION_CONSTANTS = {
  /** Default tube radius scale */
  TUBE_RADIUS_SCALE: 0.001, // Convert mm to m

  /** Attachment marker size */
  ATTACHMENT_MARKER_SIZE: 0.015,

  /** Cable sag factor (for catenary) */
  DEFAULT_SAG_FACTOR: 0.1,

  /** Minimum points for spline */
  MIN_SPLINE_POINTS: 3,

  /** Spline interpolation segments */
  SPLINE_SEGMENTS: 50,

  /** Gauge sizes */
  GAUGE_SIZES: {
    small: { width: 80, height: 80 },
    medium: { width: 120, height: 120 },
    large: { width: 160, height: 160 },
  },
};

/**
 * Create default cable config
 */
export function createDefaultCableConfig(
  id: string,
  preset: keyof typeof CABLE_PRESETS = 'composite'
): {
  id: string;
  properties: CableProperties;
  twistConstraints: CableTwistConstraints;
} {
  return {
    id,
    properties: {
      ...CABLE_PRESETS[preset],
      label: id,
    },
    twistConstraints: DEFAULT_TWIST_CONSTRAINTS,
  };
}

/**
 * Get warning level from twist value
 */
export function getWarningLevelFromTwist(
  twist: number,
  constraints: CableTwistConstraints
): CableWarningLevel {
  const absTwist = Math.abs(twist);

  if (absTwist >= constraints.maxTwist * 0.95) {
    return 'critical';
  }
  if (absTwist >= constraints.criticalThreshold) {
    return 'warning';
  }
  if (absTwist >= constraints.warningThreshold) {
    return 'caution';
  }
  return 'safe';
}

/**
 * Compare warning levels
 */
export function isMoreSevere(
  a: CableWarningLevel,
  b: CableWarningLevel
): boolean {
  return WARNING_LEVEL_PRIORITY[a] > WARNING_LEVEL_PRIORITY[b];
}

/**
 * Get most severe warning level
 */
export function getMostSevereLevel(
  levels: CableWarningLevel[]
): CableWarningLevel {
  return levels.reduce((max, level) =>
    isMoreSevere(level, max) ? level : max
  , 'safe' as CableWarningLevel);
}
