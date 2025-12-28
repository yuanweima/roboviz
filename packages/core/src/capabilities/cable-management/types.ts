/**
 * Cable Management Types
 *
 * Types for cable/wire harness management capability.
 * Used for tracking cable twist, preventing entanglement,
 * and integrating with motion planning.
 */

// ============================================================
// Basic Types
// ============================================================

/**
 * Cable attachment point configuration
 */
export interface CableAttachment {
  /** Attachment point type */
  type: 'base' | 'link' | 'tcp' | 'world';

  /** If type='link', specify the link name */
  linkName?: string;

  /** Offset position relative to attachment frame [x, y, z] (m) */
  offset: [number, number, number];
}

/**
 * Cable physical properties
 */
export interface CableProperties {
  /** Cable diameter (mm) */
  diameter: number;

  /** Minimum bend radius (mm) */
  minBendRadius: number;

  /** Cable type */
  type: CableType;

  /** Display color (CSS color) */
  color: string;

  /** Optional: cable name/label */
  label?: string;
}

/**
 * Cable type enumeration
 */
export type CableType =
  | 'power' // Power cable
  | 'signal' // Signal cable
  | 'welding' // Welding cable
  | 'gas' // Gas hose
  | 'coolant' // Coolant tube
  | 'fiber' // Fiber optic
  | 'composite' // Composite cable bundle
  | 'custom';

/**
 * Cable twist constraints configuration
 */
export interface CableTwistConstraints {
  /** Maximum allowed twist angle (rad), default 2*PI */
  maxTwist: number;

  /** Warning threshold (rad), default 1.5*PI */
  warningThreshold: number;

  /** Critical threshold (rad), default 1.8*PI */
  criticalThreshold: number;

  /** Enable auto-unwind suggestion */
  enableAutoUnwindSuggestion: boolean;
}

/**
 * Complete cable configuration
 */
export interface CableConfig {
  /** Unique identifier */
  id: string;

  /** Anchor point (usually base/cabinet) */
  anchorPoint: CableAttachment;

  /** Attachment point (usually TCP/tool) */
  attachmentPoint: CableAttachment;

  /** Intermediate waypoints (optional, for cable routing) */
  waypoints?: CableAttachment[];

  /** Cable physical properties */
  properties: CableProperties;

  /** Twist constraints */
  twistConstraints: CableTwistConstraints;
}

// ============================================================
// State Types
// ============================================================

/**
 * Single cable real-time state
 */
export interface CableState {
  /** Cable config ID */
  cableId: string;

  /** Current accumulated twist (rad) */
  currentTwist: number;

  /** Twist direction (1 = CW, -1 = CCW, 0 = none) */
  twistDirection: 1 | -1 | 0;

  /** Warning level */
  warningLevel: CableWarningLevel;

  /** Cable 3D path points (for visualization) */
  pathPoints: Array<[number, number, number]>;

  /** Stress profile along path (0-1 normalized) */
  stressProfile?: number[];

  /** Timestamp */
  timestamp: number;
}

/**
 * Warning level
 */
export type CableWarningLevel =
  | 'safe' // Green: safe
  | 'caution' // Yellow: approaching warning threshold
  | 'warning' // Orange: exceeded warning threshold
  | 'critical'; // Red: approaching maximum limit

/**
 * Twist history record point
 */
export interface TwistHistoryPoint {
  timestamp: number;
  twist: number;
  jointAngles: number[];
}

/**
 * Complete cable management state
 */
export interface CableManagementState {
  /** All cable configurations */
  cables: Map<string, CableConfig>;

  /** Real-time cable states */
  cableStates: Map<string, CableState>;

  /** Twist history (for analysis) */
  twistHistory: TwistHistoryPoint[];

  /** Maximum history length */
  historyMaxLength: number;

  /** Initial/reference joint angles (twist zero point) */
  referenceJoints: number[] | null;

  /** System enabled */
  enabled: boolean;

  /** Display settings */
  displaySettings: CableDisplaySettings;
}

/**
 * Display settings
 */
export interface CableDisplaySettings {
  /** Show cable 3D model */
  showCables: boolean;

  /** Show twist gauge */
  showTwistGauge: boolean;

  /** Show warnings */
  showWarnings: boolean;

  /** Cable render mode */
  renderMode: 'line' | 'tube' | 'ribbon';

  /** Line width (for line mode) */
  lineWidth: number;

  /** Tube segments (for tube mode) */
  tubeSegments: number;

  /** Color by stress */
  colorByStress: boolean;

  /** Show attachment point markers */
  showAttachmentMarkers: boolean;
}

// ============================================================
// Analysis Types
// ============================================================

/**
 * Trajectory twist analysis result
 */
export interface TrajectoryTwistAnalysis {
  /** Analyzed trajectory ID */
  trajectoryId: string;

  /** Starting twist state */
  startTwist: number;

  /** Ending twist state */
  endTwist: number;

  /** Net twist change */
  netTwistChange: number;

  /** Maximum twist along path */
  maxTwist: number;

  /** Position of maximum twist (0-1) */
  maxTwistPosition: number;

  /** Whether limit is exceeded */
  exceedsLimit: boolean;

  /** Warning points list */
  warningPoints: TrajectoryWarningPoint[];

  /** Twist profile along trajectory */
  twistProfile: TwistProfilePoint[];

  /** Suggested optimization (if problematic) */
  optimization?: TwistOptimizationSuggestion;
}

/**
 * Warning point on trajectory
 */
export interface TrajectoryWarningPoint {
  /** Position on trajectory (0-1) */
  position: number;

  /** Corresponding waypoint index */
  waypointIndex: number;

  /** Twist value at this point */
  twist: number;

  /** Warning level */
  level: CableWarningLevel;

  /** Description message */
  message: string;
}

/**
 * Twist profile point
 */
export interface TwistProfilePoint {
  /** Position on trajectory (0-1) */
  t: number;

  /** Accumulated twist value */
  twist: number;

  /** Instantaneous twist rate (rad/s) */
  twistRate: number;
}

/**
 * Twist optimization suggestion
 */
export interface TwistOptimizationSuggestion {
  /** Suggestion type */
  type: 'reorder' | 'add_unwind' | 'modify_path' | 'change_approach';

  /** Description */
  description: string;

  /** Estimated improvement (%) */
  estimatedImprovement: number;

  /** Detailed parameters */
  details: Record<string, unknown>;
}

// ============================================================
// Planning Types (trajx interaction)
// ============================================================

/**
 * Cable-aware planning request
 */
export interface CableAwarePlanRequest {
  /** Starting joint angles */
  startJoints: number[];

  /** Starting twist state */
  startTwist: number;

  /** Goal joint angles */
  goalJoints: number[];

  /** Cable configuration */
  cableConfig: CableConfig;

  /** Planning options */
  options: CableAwarePlanOptions;
}

/**
 * Planning options
 */
export interface CableAwarePlanOptions {
  /** Enable auto-unwind */
  enableAutoUnwind: boolean;

  /** Maximum planning time (ms) */
  maxPlanningTime: number;

  /** Check collision simultaneously */
  checkCollision: boolean;

  /** Optimization goal */
  optimizationGoal: 'min_time' | 'min_twist' | 'balanced';
}

/**
 * Cable-aware planning result
 */
export interface CableAwarePlanResult {
  /** Success status */
  success: boolean;

  /** Planned path (joint space) */
  path: number[][];

  /** Twist profile along path */
  twistProfile: number[];

  /** Final twist state */
  finalTwist: number;

  /** Whether path includes unwind motion */
  hasUnwindMotion: boolean;

  /** Unwind point indices (if any) */
  unwindIndices?: number[];

  /** Planning time (ms) */
  planningTime: number;

  /** Error message (if failed) */
  errorMessage?: string;
}

/**
 * Cycle optimization request
 */
export interface CycleOptimizationRequest {
  /** Task list (each task is a goal pose) */
  tasks: Array<{
    id: string;
    goalJoints: number[];
    /** Optional: order constraint */
    mustFollowTask?: string;
  }>;

  /** Starting state */
  startJoints: number[];
  startTwist: number;

  /** Require closed cycle (final twist equals start) */
  requireClosedCycle: boolean;

  /** Cable configuration */
  cableConfig: CableConfig;
}

/**
 * Cycle optimization result
 */
export interface CycleOptimizationResult {
  /** Success status */
  success: boolean;

  /** Optimized task order */
  optimizedOrder: string[];

  /** Paths between tasks */
  paths: CableAwarePlanResult[];

  /** Net twist (ideally close to 0) */
  netTwist: number;

  /** Maximum instantaneous twist */
  maxTwist: number;

  /** Improvement over original order (%) */
  improvement: number;
}

// ============================================================
// Event Types
// ============================================================

/**
 * Cable event types
 */
export type CableEvent =
  | {
      type: 'twist_warning';
      cableId: string;
      level: CableWarningLevel;
      twist: number;
    }
  | { type: 'twist_limit_reached'; cableId: string; twist: number }
  | { type: 'cable_config_changed'; cableId: string; config: CableConfig }
  | { type: 'reference_reset'; previousTwist: number }
  | {
      type: 'unwind_suggested';
      cableId: string;
      suggestion: TwistOptimizationSuggestion;
    };

/**
 * Event handler type
 */
export type CableEventHandler = (event: CableEvent) => void;

// ============================================================
// Actions Types
// ============================================================

/**
 * Cable management actions
 */
export interface CableManagementActions {
  /** Add a cable configuration */
  addCable: (config: CableConfig) => void;

  /** Remove a cable */
  removeCable: (id: string) => void;

  /** Update a cable configuration */
  updateCable: (id: string, updates: Partial<CableConfig>) => void;

  /** Get a cable configuration */
  getCable: (id: string) => CableConfig | undefined;

  /** Set reference joint angles (twist zero point) */
  setReferenceJoints: (joints: number[]) => void;

  /** Reset twist for a specific cable */
  resetTwist: (cableId: string) => void;

  /** Reset twist for all cables */
  resetAllTwists: () => void;

  /** Enable/disable the system */
  setEnabled: (enabled: boolean) => void;

  /** Update display settings */
  updateDisplaySettings: (settings: Partial<CableDisplaySettings>) => void;

  /** Get maximum warning level across all cables */
  getMaxWarningLevel: () => CableWarningLevel;

  /** Get cables in critical/warning state */
  getCriticalCables: () => string[];

  /** Subscribe to cable events */
  subscribeToEvents: (handler: CableEventHandler) => () => void;

  /** Update cable states from joint angles */
  updateFromJoints: (joints: number[]) => void;
}

// ============================================================
// Provider Props
// ============================================================

/**
 * CableManagementProvider props
 */
export interface CableManagementProviderProps {
  children: React.ReactNode;

  /** Robot ID */
  robotId: string;

  /** Initial cable configurations */
  initialCables?: CableConfig[];

  /** Initial display settings */
  initialDisplaySettings?: Partial<CableDisplaySettings>;

  /** Event callback */
  onCableEvent?: CableEventHandler;

  /** Auto-subscribe to joint state stream */
  autoSubscribeJointStream?: boolean;

  /** Joint state stream ID (if autoSubscribe is true) */
  jointStreamId?: string;
}
