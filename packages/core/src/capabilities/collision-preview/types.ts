/**
 * Collision Preview Types
 *
 * Types for collision detection and preview capability.
 */

/**
 * Collision detection result for preview
 */
export interface PreviewCollisionResult {
  /** Whether collision was detected */
  hasCollision: boolean;

  /** List of detected collisions */
  collisions: PreviewCollisionInfo[];

  /** Time taken for detection (ms) */
  detectionTimeMs: number;

  /** Timestamp of detection */
  timestamp: number;
}

/**
 * Information about a single collision in preview
 */
export interface PreviewCollisionInfo {
  /** Unique identifier for this collision */
  id: string;

  /** Type of collision */
  type: CollisionType;

  /** First colliding object */
  objectA: CollisionObject;

  /** Second colliding object */
  objectB: CollisionObject;

  /** Contact point(s) in world coordinates */
  contactPoints: [number, number, number][];

  /** Penetration depth in meters */
  penetrationDepth: number;

  /** Severity level */
  severity: CollisionSeverity;

  /** Suggested resolution direction (unit vector) */
  resolutionDirection?: [number, number, number];
}

/**
 * Type of collision
 */
export type CollisionType =
  | 'robot-workpiece' // Robot colliding with workpiece
  | 'robot-fixture' // Robot colliding with fixture
  | 'robot-environment' // Robot colliding with environment (floor, walls, etc.)
  | 'robot-self' // Self-collision between robot links
  | 'tool-workpiece' // Tool colliding with workpiece unexpectedly
  | 'tool-fixture' // Tool colliding with fixture
  | 'tool-environment'; // Tool colliding with environment

/**
 * Colliding object info
 */
export interface CollisionObject {
  /** Object type */
  type: 'robot' | 'tool' | 'workpiece' | 'fixture' | 'environment';

  /** Object identifier */
  id: string;

  /** Specific part/link name if applicable */
  partName?: string;

  /** Mesh/geometry name if available */
  meshName?: string;
}

/**
 * Collision severity levels
 */
export type CollisionSeverity =
  | 'info' // Near-miss or close approach
  | 'warning' // Potential collision with safety margin
  | 'error' // Definite collision
  | 'critical'; // Severe collision (high speed impact, etc.)

/**
 * Collision check options
 */
export interface CollisionCheckOptions {
  /** Safety margin to add around objects (meters) */
  safetyMargin?: number;

  /** Include self-collision checks */
  checkSelfCollision?: boolean;

  /** Object types to check against */
  checkAgainst?: CollisionObject['type'][];

  /** Return on first collision (faster) or find all */
  stopOnFirst?: boolean;

  /** Maximum distance to consider for near-miss detection */
  nearMissThreshold?: number;
}

/**
 * Collision preview state
 */
export interface CollisionPreviewState {
  /** Whether collision checking is enabled */
  enabled: boolean;

  /** Latest collision result */
  result: PreviewCollisionResult | null;

  /** Whether a check is in progress */
  isChecking: boolean;

  /** Auto-check on pose change */
  autoCheck: boolean;

  /** Display settings */
  displaySettings: CollisionDisplaySettings;

  /** Check options */
  checkOptions: CollisionCheckOptions;
}

/**
 * Collision display settings
 */
export interface CollisionDisplaySettings {
  /** Show collision indicators */
  showIndicators: boolean;

  /** Show contact points */
  showContactPoints: boolean;

  /** Show collision mesh highlights */
  highlightCollisions: boolean;

  /** Indicator size */
  indicatorSize: number;

  /** Colors by severity */
  colors: {
    info: string;
    warning: string;
    error: string;
    critical: string;
  };

  /** Opacity for highlighted meshes */
  highlightOpacity: number;
}

/**
 * Collision preview actions
 */
export interface CollisionPreviewActions {
  /** Enable/disable collision preview */
  setEnabled: (enabled: boolean) => void;

  /** Run collision check for current pose */
  checkCollisions: () => Promise<PreviewCollisionResult>;

  /** Check collisions for a specific joint configuration */
  checkJointConfig: (joints: number[]) => Promise<PreviewCollisionResult>;

  /** Check collisions along a trajectory */
  checkTrajectory: (
    waypoints: Array<{ joints: number[] }>
  ) => Promise<PreviewCollisionResult[]>;

  /** Update check options */
  setCheckOptions: (options: Partial<CollisionCheckOptions>) => void;

  /** Update display settings */
  setDisplaySettings: (settings: Partial<CollisionDisplaySettings>) => void;

  /** Toggle auto-check */
  setAutoCheck: (autoCheck: boolean) => void;

  /** Clear current result */
  clearResult: () => void;
}

/**
 * Props for CollisionPreviewProvider
 */
export interface CollisionPreviewProviderProps {
  children: React.ReactNode;

  /** Robot ID to check collisions for */
  robotId: string;

  /** Initial enabled state */
  enabled?: boolean;

  /** Initial check options */
  checkOptions?: Partial<CollisionCheckOptions>;

  /** Initial display settings */
  displaySettings?: Partial<CollisionDisplaySettings>;

  /** Callback when collision state changes */
  onCollisionChange?: (result: PreviewCollisionResult | null) => void;

  /** Custom collision checker implementation */
  collisionChecker?: (
    robotId: string,
    joints: number[],
    options: CollisionCheckOptions
  ) => Promise<PreviewCollisionResult>;
}
