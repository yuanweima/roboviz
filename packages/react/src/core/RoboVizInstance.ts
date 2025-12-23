/**
 * RoboVizInstance - Core class for RoboViz visualization
 *
 * This class provides the main API for creating, configuring, and
 * controlling RoboViz visualizations. It can be used both with React
 * (via RoboVizProvider) and imperatively in vanilla JavaScript.
 */

import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  RoboVizConfig,
  RoboVizState,
  IRoboVizInstance,
  RoboVizEventMap,
  RoboVizEventHandler,
  AddRobotConfig,
  AddTrajectoryConfig,
  AddWaypointConfig,
  AddObstacleConfig,
  PlayTrajectoryOptions,
  SceneConfig,
  CameraState,
  RobotState,
  TrajectoryState,
  Transform,
} from '../types';
import { EventBus } from './EventBus';
import { createScopedStore, type ScopedVizStore } from '../store/createScopedStore';

// Instance counter for generating unique IDs
let instanceCounter = 0;

/**
 * Generate a unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * RoboVizInstance - Main class for RoboViz visualization
 *
 * @example React Integration
 * ```tsx
 * import { RoboViz } from '@aspect/roboviz-react';
 *
 * function App() {
 *   return (
 *     <RoboViz
 *       config={{ transport: { type: 'websocket', url: 'ws://localhost:9876' } }}
 *       onRobotClick={(e) => console.log('Clicked:', e.robotId)}
 *     />
 *   );
 * }
 * ```
 *
 * @example Imperative Usage
 * ```typescript
 * import { createRoboViz } from '@aspect/roboviz-react';
 *
 * const viz = createRoboViz({
 *   container: '#roboviz-container',
 *   transport: { type: 'websocket', url: 'ws://localhost:9876' },
 * });
 *
 * viz.addRobot({ urdf: '/models/robot.urdf' });
 * viz.on('robot:joints-changed', (e) => console.log(e));
 * viz.dispose();
 * ```
 */
export class RoboVizInstance implements IRoboVizInstance {
  /** Unique instance identifier */
  readonly id: string;

  /** Configuration options */
  private config: RoboVizConfig;

  /** Scoped Zustand store */
  private store: ScopedVizStore;

  /** Event bus for pub/sub */
  private eventBus: EventBus;

  /** React root for mounting */
  private root: Root | null = null;

  /** Container element */
  private container: HTMLElement | null = null;

  /** Connection status */
  private _isConnected: boolean = false;

  /** Mounted status */
  private _isMounted: boolean = false;

  /** Disposed status */
  private _isDisposed: boolean = false;

  /** Store unsubscribe function */
  private storeUnsubscribe: (() => void) | null = null;

  /** Debug mode */
  private debug: boolean;

  constructor(config: RoboVizConfig = {}) {
    this.id = `roboviz-${++instanceCounter}`;
    this.config = config;
    this.debug = config.debug ?? false;

    // Create scoped store
    this.store = createScopedStore({
      scene: config.scene,
      camera: config.camera,
      debug: this.debug,
    });

    // Create event bus
    this.eventBus = new EventBus({ debug: this.debug });

    // Setup store subscriptions for event emission
    this.setupStoreSubscriptions();

    if (this.debug) {
      console.log(`[RoboVizInstance] Created instance: ${this.id}`);
    }
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get isConnected(): boolean {
    return this._isConnected;
  }

  get isMounted(): boolean {
    return this._isMounted;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  // ===========================================================================
  // Internal: Store Access
  // ===========================================================================

  /**
   * Get the internal store (for React context)
   * @internal
   */
  getStore(): ScopedVizStore {
    return this.store;
  }

  /**
   * Get the internal event bus (for React context)
   * @internal
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  // ===========================================================================
  // Lifecycle Methods
  // ===========================================================================

  mount(container?: HTMLElement | string): void {
    if (this._isDisposed) {
      throw new Error('Cannot mount a disposed RoboViz instance');
    }

    if (this._isMounted) {
      console.warn('[RoboVizInstance] Already mounted');
      return;
    }

    // Resolve container
    this.container = this.resolveContainer(container || this.config.container);

    if (!this.container) {
      throw new Error('No container specified for mounting RoboViz');
    }

    if (this.config.headless) {
      if (this.debug) {
        console.log('[RoboVizInstance] Headless mode - skipping DOM mount');
      }
      this._isMounted = true;
      return;
    }

    // Create React root and render
    this.root = createRoot(this.container);
    this.renderComponent();
    this._isMounted = true;

    if (this.debug) {
      console.log(`[RoboVizInstance] Mounted to container`);
    }
  }

  unmount(): void {
    if (!this._isMounted) {
      return;
    }

    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    this.container = null;
    this._isMounted = false;

    if (this.debug) {
      console.log('[RoboVizInstance] Unmounted');
    }
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    // Disconnect if connected
    this.disconnect();

    // Unmount if mounted
    this.unmount();

    // Cleanup store subscription
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    // Clear event bus
    this.eventBus.clear();

    this._isDisposed = true;

    if (this.debug) {
      console.log(`[RoboVizInstance] Disposed: ${this.id}`);
    }
  }

  // ===========================================================================
  // Connection Methods
  // ===========================================================================

  async connect(): Promise<void> {
    if (this._isDisposed) {
      throw new Error('Cannot connect a disposed RoboViz instance');
    }

    if (this._isConnected) {
      console.warn('[RoboVizInstance] Already connected');
      return;
    }

    const transport = this.config.transport;
    if (!transport || transport.type === 'none') {
      if (this.debug) {
        console.log('[RoboVizInstance] No transport configured');
      }
      return;
    }

    // TODO: Implement actual connection logic with BridgeManager
    // For now, we'll simulate a successful connection
    this._isConnected = true;
    this.eventBus.emit('connect', { timestamp: Date.now() });

    if (this.debug) {
      console.log('[RoboVizInstance] Connected');
    }
  }

  disconnect(): void {
    if (!this._isConnected) {
      return;
    }

    // TODO: Implement actual disconnection logic with BridgeManager
    this._isConnected = false;
    this.eventBus.emit('disconnect', { timestamp: Date.now() });

    if (this.debug) {
      console.log('[RoboVizInstance] Disconnected');
    }
  }

  // ===========================================================================
  // State Methods
  // ===========================================================================

  getState(): RoboVizState {
    const state = this.store.getState();
    return {
      scene: state.scene,
      camera: state.camera,
      robots: state.robots,
      trajectories: state.trajectories,
      waypoints: state.waypoints,
      obstacles: state.obstacles,
      playback: state.playback,
      selectedObjectId: state.selectedObjectId,
      hoveredObjectId: state.hoveredObjectId,
      selectedWaypointId: state.selectedWaypointId,
    };
  }

  setState(updates: Partial<RoboVizState>): void {
    const actions = this.store.getState();

    if (updates.scene) {
      actions.setScene(updates.scene);
    }
    if (updates.camera) {
      actions.setCamera(updates.camera);
    }
    if (updates.playback) {
      actions.setPlayback(updates.playback);
    }
    if (updates.selectedObjectId !== undefined) {
      actions.selectObject(updates.selectedObjectId);
    }
    if (updates.selectedWaypointId !== undefined) {
      actions.selectWaypoint(updates.selectedWaypointId);
    }
  }

  subscribe(listener: (state: RoboVizState) => void): () => void {
    return this.store.subscribe((state) => {
      listener({
        scene: state.scene,
        camera: state.camera,
        robots: state.robots,
        trajectories: state.trajectories,
        waypoints: state.waypoints,
        obstacles: state.obstacles,
        playback: state.playback,
        selectedObjectId: state.selectedObjectId,
        hoveredObjectId: state.hoveredObjectId,
        selectedWaypointId: state.selectedWaypointId,
      });
    });
  }

  // ===========================================================================
  // Event Methods
  // ===========================================================================

  on<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): () => void {
    return this.eventBus.on(event, handler);
  }

  off<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): void {
    this.eventBus.off(event, handler);
  }

  emit<K extends keyof RoboVizEventMap>(
    event: K,
    data: RoboVizEventMap[K]
  ): void {
    this.eventBus.emit(event, data);
  }

  // ===========================================================================
  // Robot API
  // ===========================================================================

  addRobot(config: AddRobotConfig): string {
    const id = config.id ?? generateId('robot');
    const actions = this.store.getState();

    const defaultTransform: Transform = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { w: 1, x: 0, y: 0, z: 0 },
    };

    const robotState: RobotState = {
      id,
      urdf: config.urdf ?? config.urdfContent ?? '',
      transform: defaultTransform,
      jointAngles: config.jointAngles ?? [],
      options: {
        id,
        showAxes: config.options?.showAxes ?? false,
        opacity: config.options?.opacity ?? 1,
        color: config.options?.color ?? null,
        ...config.options,
      },
    };

    actions.addRobot(robotState);
    this.eventBus.emit('robot:added', { robotId: id });

    return id;
  }

  removeRobot(robotId: string): void {
    const actions = this.store.getState();
    actions.removeRobot(robotId);
    this.eventBus.emit('robot:removed', { robotId });
  }

  setRobotJoints(robotId: string, angles: number[]): void {
    const actions = this.store.getState();
    actions.setRobotJointAngles(robotId, angles);
    this.eventBus.emit('robot:joints-changed', {
      robotId,
      angles,
      source: 'local',
    });
  }

  getRobotJoints(robotId: string): number[] | undefined {
    const state = this.store.getState();
    return state.robots.get(robotId)?.jointAngles;
  }

  // ===========================================================================
  // Trajectory API
  // ===========================================================================

  addTrajectory(config: AddTrajectoryConfig): string {
    const id = config.id ?? generateId('trajectory');
    const actions = this.store.getState();

    const trajectoryState: TrajectoryState = {
      id,
      robotId: config.robotId,
      data: config.data,
      visualization: {
        showPath: config.visualization?.showPath ?? true,
        pathColor: config.visualization?.pathColor ?? '#4ecdc4',
        pathWidth: config.visualization?.pathWidth ?? 2,
      },
    };

    actions.addTrajectory(trajectoryState);
    this.eventBus.emit('trajectory:added', { trajectoryId: id, robotId: config.robotId });

    return id;
  }

  removeTrajectory(trajectoryId: string): void {
    const actions = this.store.getState();
    const state = this.store.getState();

    // Stop playback if this trajectory is active
    if (state.playback.activeTrajectoryId === trajectoryId) {
      this.stopTrajectory();
    }

    actions.removeTrajectory(trajectoryId);
    this.eventBus.emit('trajectory:removed', { trajectoryId });
  }

  playTrajectory(trajectoryId: string, options?: PlayTrajectoryOptions): void {
    const actions = this.store.getState();

    actions.setPlayback({
      activeTrajectoryId: trajectoryId,
      isPlaying: true,
      currentTime: options?.startTime ?? 0,
      speed: options?.speed ?? 1.0,
      loop: options?.loop ?? false,
    });

    this.eventBus.emit('trajectory:started', { trajectoryId });
  }

  pauseTrajectory(): void {
    const state = this.store.getState();
    const activeId = state.playback.activeTrajectoryId;

    state.setPlayback({ isPlaying: false });

    if (activeId) {
      this.eventBus.emit('trajectory:paused', { trajectoryId: activeId });
    }
  }

  stopTrajectory(): void {
    const state = this.store.getState();
    const activeId = state.playback.activeTrajectoryId;

    state.setPlayback({
      isPlaying: false,
      currentTime: 0,
      activeTrajectoryId: null,
    });

    if (activeId) {
      this.eventBus.emit('trajectory:stopped', { trajectoryId: activeId });
    }
  }

  seekTrajectory(time: number): void {
    const actions = this.store.getState();
    actions.setPlayback({ currentTime: time });
  }

  // ===========================================================================
  // Waypoint API
  // ===========================================================================

  addWaypoint(config: AddWaypointConfig): string {
    const id = config.id ?? generateId('waypoint');
    const actions = this.store.getState();

    actions.addWaypoint({
      id,
      robotId: config.robotId,
      jointAngles: config.jointAngles,
      tcpPose: config.tcpPose,
      label: config.label,
      color: config.color ?? '#ffd93d',
    });

    this.eventBus.emit('waypoint:added', { waypointId: id });
    return id;
  }

  removeWaypoint(waypointId: string): void {
    const actions = this.store.getState();
    actions.removeWaypoint(waypointId);
    this.eventBus.emit('waypoint:removed', { waypointId });
  }

  clearWaypoints(): void {
    const actions = this.store.getState();
    actions.clearWaypoints();
  }

  // ===========================================================================
  // Obstacle API
  // ===========================================================================

  addObstacle(config: AddObstacleConfig): string {
    const id = config.id ?? generateId('obstacle');
    const actions = this.store.getState();

    // Convert to internal format
    const dimensions = Array.isArray(config.dimensions)
      ? { x: config.dimensions[0], y: config.dimensions[1], z: config.dimensions[2] }
      : config.dimensions;

    const position = config.position
      ? (Array.isArray(config.position)
        ? { x: config.position[0], y: config.position[1], z: config.position[2] }
        : config.position)
      : { x: 0, y: 0, z: 0 };

    actions.addObstacle({
      id,
      type: 'primitive',
      primitive: {
        shape: config.shape,
        dimensions,
      },
      transform: {
        position,
        rotation: { w: 1, x: 0, y: 0, z: 0 },
      },
      color: config.color ?? '#ff6b6b',
      opacity: config.opacity ?? 0.8,
    });

    this.eventBus.emit('obstacle:added', { obstacleId: id });
    return id;
  }

  removeObstacle(obstacleId: string): void {
    const actions = this.store.getState();
    actions.removeObstacle(obstacleId);
    this.eventBus.emit('obstacle:removed', { obstacleId });
  }

  clearObstacles(): void {
    const actions = this.store.getState();
    actions.clearObstacles();
  }

  // ===========================================================================
  // Camera API
  // ===========================================================================

  setCamera(config: Partial<CameraState>): void {
    const actions = this.store.getState();
    actions.setCamera(config);
    this.eventBus.emit('camera:changed', { ...this.store.getState().camera, ...config });
  }

  resetCamera(): void {
    const actions = this.store.getState();
    actions.setCamera({
      position: { x: 3, y: 3, z: 3 },
      target: { x: 0, y: 0, z: 0 },
      fov: 50,
    });
    this.eventBus.emit('camera:reset', undefined as any);
  }

  // ===========================================================================
  // Scene API
  // ===========================================================================

  setScene(config: Partial<SceneConfig>): void {
    const actions = this.store.getState();
    actions.setScene(config);
    this.eventBus.emit('scene:changed', config);
  }

  reset(): void {
    const actions = this.store.getState();
    actions.reset();
    this.eventBus.emit('scene:reset', undefined as any);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private resolveContainer(container?: HTMLElement | string): HTMLElement | null {
    if (!container) {
      return null;
    }

    if (typeof container === 'string') {
      return document.querySelector(container);
    }

    return container;
  }

  private renderComponent(): void {
    if (!this.root) return;

    // Dynamic import to avoid circular dependencies
    // The actual rendering will be handled by RoboVizProvider
    // This is a placeholder - actual implementation will be in the component
    const RoboVizRenderer = React.lazy(() =>
      import('../components/RoboVizRenderer').then((mod) => ({
        default: mod.RoboVizRenderer,
      }))
    );

    const element = React.createElement(
      React.Suspense,
      { fallback: null },
      React.createElement(RoboVizRenderer, {
        instance: this,
        showStats: this.config.showStats,
      })
    );

    this.root.render(element);
  }

  private setupStoreSubscriptions(): void {
    let prevState = this.store.getState();

    this.storeUnsubscribe = this.store.subscribe((state) => {
      // Emit events for specific state changes
      // This allows external listeners to react to state changes

      // Check for robot changes
      if (state.robots !== prevState.robots) {
        // Detect added/removed robots
        for (const [id, robot] of state.robots) {
          if (!prevState.robots.has(id)) {
            // Robot was added (already emitted by addRobot)
          } else {
            const prevRobot = prevState.robots.get(id);
            if (prevRobot && robot.jointAngles !== prevRobot.jointAngles) {
              // Joint angles changed (but not by our API - could be from playback)
            }
          }
        }
      }

      // Check for selection changes
      if (state.selectedObjectId !== prevState.selectedObjectId) {
        this.eventBus.emit('object:selected', {
          objectId: state.selectedObjectId,
        });
      }

      if (state.selectedWaypointId !== prevState.selectedWaypointId) {
        this.eventBus.emit('waypoint:selected', {
          waypointId: state.selectedWaypointId,
        });
      }

      prevState = state;
    });
  }
}

/**
 * Type guard to check if a value is a RoboVizInstance
 */
export function isRoboVizInstance(value: unknown): value is RoboVizInstance {
  return value instanceof RoboVizInstance;
}
