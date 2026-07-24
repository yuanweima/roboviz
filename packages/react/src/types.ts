/**
 * @yuanweima/roboviz-react - Type Definitions
 *
 * Core type definitions for the RoboViz React integration library.
 */

import type {
  Vector3,
  Vector3Like,
  Quaternion,
  Transform,
  Pose,
  SceneConfig,
  CameraState,
  RobotState,
  TrajectoryState,
  WaypointData,
  ObstacleData,
  PlaybackState,
  RobotOptions,
  TrajectoryData,
} from '@yuanweima/roboviz-core';

// Re-export core types for convenience
export type {
  Vector3,
  Vector3Like,
  Quaternion,
  Transform,
  Pose,
  SceneConfig,
  CameraState,
  RobotState,
  TrajectoryState,
  WaypointData,
  ObstacleData,
  PlaybackState,
  RobotOptions,
  TrajectoryData,
};

// =============================================================================
// Transport Configuration
// =============================================================================

/** WebSocket transport configuration */
export interface WebSocketTransportConfig {
  type: 'websocket';
  /** WebSocket server URL (e.g., 'ws://localhost:9876') */
  url: string;
  /** Optional WebSocket subprotocols */
  protocols?: string | string[];
}

/** PostMessage transport configuration for iframe embedding */
export interface PostMessageTransportConfig {
  type: 'postmessage';
  /** Target window to communicate with */
  targetWindow: Window;
  /** Target origin for security validation */
  targetOrigin: string;
  /** Optional channel ID for multiple instances */
  channelId?: string;
}

/** Direct transport configuration for same-context integration */
export interface DirectTransportConfig {
  type: 'direct';
}

/** No transport (local-only mode) */
export interface NoTransportConfig {
  type: 'none';
}

/** Union of all transport configurations */
export type TransportConfig =
  | WebSocketTransportConfig
  | PostMessageTransportConfig
  | DirectTransportConfig
  | NoTransportConfig;

// =============================================================================
// Instance Configuration
// =============================================================================

/** Configuration for creating a RoboViz instance */
export interface RoboVizConfig {
  /** Container element or CSS selector for mounting */
  container?: HTMLElement | string;

  /** Transport configuration for remote communication */
  transport?: TransportConfig;

  /** Initial scene configuration */
  scene?: Partial<SceneConfig>;

  /** Initial camera state */
  camera?: Partial<CameraState>;

  /** Auto-connect to transport on creation (default: false) */
  autoConnect?: boolean;

  /** Headless mode - state management without rendering (default: false) */
  headless?: boolean;

  /** Enable debug logging (default: false) */
  debug?: boolean;

  /** Show performance stats overlay (default: false) */
  showStats?: boolean;
}

// =============================================================================
// Event System
// =============================================================================

/** Map of all RoboViz events and their payload types */
export interface RoboVizEventMap {
  // Connection events
  'connect': { timestamp: number };
  'disconnect': { timestamp: number; reason?: string };
  'error': { error: Error; context?: string };
  'reconnecting': { attempt: number; maxAttempts: number };

  // Robot events
  'robot:added': { robotId: string };
  'robot:removed': { robotId: string };
  'robot:loaded': { robotId: string; jointCount: number; jointNames: string[] };
  'robot:joints-changed': { robotId: string; angles: number[]; source: 'local' | 'remote' | 'playback' };
  'robot:tcp-changed': { robotId: string; pose: Pose };
  'robot:click': { robotId: string; linkName?: string; position: Vector3 };
  'robot:hover': { robotId: string | null; linkName?: string };

  // Trajectory events
  'trajectory:added': { trajectoryId: string; robotId: string };
  'trajectory:removed': { trajectoryId: string };
  'trajectory:started': { trajectoryId: string };
  'trajectory:paused': { trajectoryId: string };
  'trajectory:stopped': { trajectoryId: string };
  'trajectory:completed': { trajectoryId: string };
  'trajectory:progress': { trajectoryId: string; progress: number; time: number };

  // Waypoint events
  'waypoint:added': { waypointId: string };
  'waypoint:removed': { waypointId: string };
  'waypoint:selected': { waypointId: string | null };
  'waypoint:click': { waypointId: string; position: Vector3 };

  // Obstacle events
  'obstacle:added': { obstacleId: string };
  'obstacle:removed': { obstacleId: string };

  // Camera events
  'camera:changed': CameraState;
  'camera:reset': void;

  // Selection events
  'object:selected': { objectId: string | null; objectType?: 'robot' | 'waypoint' | 'obstacle' };
  'object:hovered': { objectId: string | null; objectType?: 'robot' | 'waypoint' | 'obstacle' };

  // Scene events
  'scene:changed': Partial<SceneConfig>;
  'scene:reset': void;

  // State sync (for remote control)
  'state:sync': { state: RoboVizState };
}

/** Event handler function type */
export type RoboVizEventHandler<K extends keyof RoboVizEventMap> = (
  data: RoboVizEventMap[K]
) => void;

// =============================================================================
// Instance State
// =============================================================================

/** Complete state of a RoboViz instance */
export interface RoboVizState {
  // Scene configuration
  scene: SceneConfig;

  // Camera state
  camera: CameraState;

  // Entity collections
  robots: Map<string, RobotState>;
  trajectories: Map<string, TrajectoryState>;
  waypoints: Map<string, WaypointData>;
  obstacles: Map<string, ObstacleData>;

  // Playback state
  playback: PlaybackState;

  // Selection state
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  selectedWaypointId: string | null;
}

// =============================================================================
// Instance Interface
// =============================================================================

/** RoboViz instance interface */
export interface IRoboVizInstance {
  /** Unique instance identifier */
  readonly id: string;

  /** Current connection status */
  readonly isConnected: boolean;

  /** Whether instance is mounted to DOM */
  readonly isMounted: boolean;

  /** Whether instance is disposed */
  readonly isDisposed: boolean;

  // -------------------------------------------------------------------------
  // Lifecycle Methods
  // -------------------------------------------------------------------------

  /**
   * Mount the visualization to a container element
   * @param container - Element or CSS selector
   */
  mount(container?: HTMLElement | string): void;

  /**
   * Unmount the visualization from DOM
   */
  unmount(): void;

  /**
   * Dispose the instance and cleanup all resources
   */
  dispose(): void;

  // -------------------------------------------------------------------------
  // Connection Methods
  // -------------------------------------------------------------------------

  /**
   * Connect to the configured transport
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the transport
   */
  disconnect(): void;

  // -------------------------------------------------------------------------
  // State Methods
  // -------------------------------------------------------------------------

  /**
   * Get the current state snapshot
   */
  getState(): RoboVizState;

  /**
   * Update state with partial updates
   * @param updates - Partial state to merge
   */
  setState(updates: Partial<RoboVizState>): void;

  /**
   * Subscribe to state changes
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: RoboVizState) => void): () => void;

  // -------------------------------------------------------------------------
  // Event Methods
  // -------------------------------------------------------------------------

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Event handler
   * @returns Unsubscribe function
   */
  on<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): () => void;

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Event handler to remove
   */
  off<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): void;

  /**
   * Emit an event
   * @param event - Event name
   * @param data - Event payload
   */
  emit<K extends keyof RoboVizEventMap>(
    event: K,
    data: RoboVizEventMap[K]
  ): void;

  // -------------------------------------------------------------------------
  // Robot API
  // -------------------------------------------------------------------------

  /**
   * Add a robot to the scene
   * @param config - Robot configuration
   * @returns Robot ID
   */
  addRobot(config: AddRobotConfig): string;

  /**
   * Remove a robot from the scene
   * @param robotId - Robot ID to remove
   */
  removeRobot(robotId: string): void;

  /**
   * Set robot joint angles
   * @param robotId - Robot ID
   * @param angles - Joint angles in radians
   */
  setRobotJoints(robotId: string, angles: number[]): void;

  /**
   * Get robot joint angles
   * @param robotId - Robot ID
   * @returns Current joint angles
   */
  getRobotJoints(robotId: string): number[] | undefined;

  // -------------------------------------------------------------------------
  // Trajectory API
  // -------------------------------------------------------------------------

  /**
   * Add a trajectory
   * @param config - Trajectory configuration
   * @returns Trajectory ID
   */
  addTrajectory(config: AddTrajectoryConfig): string;

  /**
   * Remove a trajectory
   * @param trajectoryId - Trajectory ID to remove
   */
  removeTrajectory(trajectoryId: string): void;

  /**
   * Start trajectory playback
   * @param trajectoryId - Trajectory ID to play
   * @param options - Playback options
   */
  playTrajectory(trajectoryId: string, options?: PlayTrajectoryOptions): void;

  /**
   * Pause trajectory playback
   */
  pauseTrajectory(): void;

  /**
   * Stop trajectory playback and reset
   */
  stopTrajectory(): void;

  /**
   * Seek to a specific time in the trajectory
   * @param time - Time in seconds
   */
  seekTrajectory(time: number): void;

  // -------------------------------------------------------------------------
  // Waypoint API
  // -------------------------------------------------------------------------

  /**
   * Add a waypoint
   * @param config - Waypoint configuration
   * @returns Waypoint ID
   */
  addWaypoint(config: AddWaypointConfig): string;

  /**
   * Remove a waypoint
   * @param waypointId - Waypoint ID to remove
   */
  removeWaypoint(waypointId: string): void;

  /**
   * Clear all waypoints
   */
  clearWaypoints(): void;

  // -------------------------------------------------------------------------
  // Obstacle API
  // -------------------------------------------------------------------------

  /**
   * Add an obstacle
   * @param config - Obstacle configuration
   * @returns Obstacle ID
   */
  addObstacle(config: AddObstacleConfig): string;

  /**
   * Remove an obstacle
   * @param obstacleId - Obstacle ID to remove
   */
  removeObstacle(obstacleId: string): void;

  /**
   * Clear all obstacles
   */
  clearObstacles(): void;

  // -------------------------------------------------------------------------
  // Camera API
  // -------------------------------------------------------------------------

  /**
   * Set camera state
   * @param config - Camera configuration
   */
  setCamera(config: Partial<CameraState>): void;

  /**
   * Reset camera to default position
   */
  resetCamera(): void;

  // -------------------------------------------------------------------------
  // Scene API
  // -------------------------------------------------------------------------

  /**
   * Set scene configuration
   * @param config - Scene configuration
   */
  setScene(config: Partial<SceneConfig>): void;

  /**
   * Reset the entire scene
   */
  reset(): void;
}

// =============================================================================
// API Configuration Types
// =============================================================================

/** Configuration for adding a robot */
export interface AddRobotConfig {
  /** Robot ID (auto-generated if not provided) */
  id?: string;
  /** URL to URDF file */
  urdf?: string;
  /** Inline URDF content */
  urdfContent?: string;
  /** Base64 encoded mesh data */
  meshData?: Record<string, string>;
  /** Initial joint angles */
  jointAngles?: number[];
  /** Position in world coordinates */
  position?: Vector3Like;
  /** Rotation (Euler angles in radians) */
  rotation?: [number, number, number];
  /** Robot options */
  options?: Partial<RobotOptions>;
}

/** Configuration for adding a trajectory */
export interface AddTrajectoryConfig {
  /** Trajectory ID (auto-generated if not provided) */
  id?: string;
  /** Robot ID this trajectory belongs to */
  robotId: string;
  /** Trajectory data */
  data: TrajectoryData;
  /** Visualization options */
  visualization?: {
    showPath?: boolean;
    pathColor?: string;
    pathWidth?: number;
  };
}

/** Options for playing a trajectory */
export interface PlayTrajectoryOptions {
  /** Playback speed multiplier (default: 1.0) */
  speed?: number;
  /** Loop playback (default: false) */
  loop?: boolean;
  /** Start time in seconds (default: 0) */
  startTime?: number;
}

/** Configuration for adding a waypoint */
export interface AddWaypointConfig {
  /** Waypoint ID (auto-generated if not provided) */
  id?: string;
  /** Robot ID this waypoint belongs to */
  robotId: string;
  /** Joint angles at this waypoint */
  jointAngles: number[];
  /** TCP pose (optional) */
  tcpPose?: Pose;
  /** Display label */
  label?: string;
  /** Display color */
  color?: string;
}

/** Configuration for adding an obstacle */
export interface AddObstacleConfig {
  /** Obstacle ID (auto-generated if not provided) */
  id?: string;
  /** Obstacle type */
  type: 'primitive';
  /** Primitive shape */
  shape: 'box' | 'sphere' | 'cylinder';
  /** Dimensions (interpretation depends on shape) */
  dimensions: Vector3Like;
  /** Position in world coordinates */
  position?: Vector3Like;
  /** Rotation (Euler angles in radians) */
  rotation?: [number, number, number];
  /** Display color */
  color?: string;
  /** Opacity (0-1) */
  opacity?: number;
}

// =============================================================================
// React Component Props
// =============================================================================

/** Props for the RoboViz React component */
export interface RoboVizProps {
  /** Instance configuration (creates new instance if not provided) */
  config?: RoboVizConfig;

  /** Use an existing instance instead of creating a new one */
  instance?: IRoboVizInstance;

  /** Container width */
  width?: string | number;

  /** Container height */
  height?: string | number;

  /** CSS class name */
  className?: string;

  /** Inline styles */
  style?: React.CSSProperties;

  /** Children to render inside the Canvas */
  children?: React.ReactNode;

  // Event handler props (convenience API)
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: Error) => void;
  onRobotClick?: (event: RoboVizEventMap['robot:click']) => void;
  onRobotJointsChanged?: (event: RoboVizEventMap['robot:joints-changed']) => void;
  onWaypointSelect?: (event: RoboVizEventMap['waypoint:selected']) => void;
  onTrajectoryComplete?: (event: RoboVizEventMap['trajectory:completed']) => void;
  onTrajectoryProgress?: (event: RoboVizEventMap['trajectory:progress']) => void;
  onCameraChange?: (camera: CameraState) => void;
  onObjectSelect?: (event: RoboVizEventMap['object:selected']) => void;
}

/** Props for the RoboVizProvider component */
export interface RoboVizProviderProps {
  /** RoboViz instance to provide */
  instance: IRoboVizInstance;
  /** Children components */
  children: React.ReactNode;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/** Return type for useRoboViz hook */
export interface UseRoboVizReturn {
  /** The RoboViz instance */
  instance: IRoboVizInstance;

  /** Connection status */
  isConnected: boolean;

  // State selectors
  robots: Map<string, RobotState>;
  trajectories: Map<string, TrajectoryState>;
  waypoints: Map<string, WaypointData>;
  obstacles: Map<string, ObstacleData>;
  playback: PlaybackState;
  scene: SceneConfig;
  camera: CameraState;
  selectedObjectId: string | null;
  selectedWaypointId: string | null;

  // Actions
  addRobot: (config: AddRobotConfig) => string;
  removeRobot: (robotId: string) => void;
  setRobotJoints: (robotId: string, angles: number[]) => void;

  addTrajectory: (config: AddTrajectoryConfig) => string;
  removeTrajectory: (trajectoryId: string) => void;
  playTrajectory: (trajectoryId: string, options?: PlayTrajectoryOptions) => void;
  pauseTrajectory: () => void;
  stopTrajectory: () => void;

  addWaypoint: (config: AddWaypointConfig) => string;
  removeWaypoint: (waypointId: string) => void;
  clearWaypoints: () => void;
  selectWaypoint: (waypointId: string | null) => void;

  addObstacle: (config: AddObstacleConfig) => string;
  removeObstacle: (obstacleId: string) => void;
  clearObstacles: () => void;

  setScene: (config: Partial<SceneConfig>) => void;
  setCamera: (config: Partial<CameraState>) => void;
  resetCamera: () => void;

  reset: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

/** Return type for usePlayback hook */
export interface UsePlaybackReturn {
  /** Current playback state */
  isPlaying: boolean;
  currentTime: number;
  progress: number;
  speed: number;
  loop: boolean;
  activeTrajectoryId: string | null;

  /** Playback controls */
  play: (trajectoryId?: string) => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
}

/** Return type for useRobotJoints hook */
export interface UseRobotJointsReturn {
  /** Current joint angles */
  jointAngles: number[];
  /** Joint names (if available) */
  jointNames: string[];
  /** Joint limits (if available) */
  jointLimits: [number, number][];

  /** Set a single joint angle */
  setJointAngle: (index: number, value: number) => void;
  /** Set all joint angles */
  setAllJointAngles: (angles: number[]) => void;
  /** Reset to home position (all zeros) */
  goToHome: () => void;
}

/** Return type for useEvents hook */
export interface UseEventsReturn {
  /** Subscribe to an event */
  on: <K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ) => () => void;
  /** Emit an event */
  emit: <K extends keyof RoboVizEventMap>(
    event: K,
    data: RoboVizEventMap[K]
  ) => void;
}
