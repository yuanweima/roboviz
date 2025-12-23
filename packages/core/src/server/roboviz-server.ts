/**
 * RoboViz Server
 *
 * High-level server that handles robot visualization commands.
 * Provides a complete JSON-RPC API for remote control.
 */

import { createNotification, type JsonRpcMessage, type JsonRpcNotification } from '../protocol/types';
import { WebSocketServer, createWebSocketServer, type WebSocketServerConfig, type ClientConnection } from './websocket-server';

// ============================================================================
// Types
// ============================================================================

/**
 * Remote robot state (from WebSocket commands)
 */
export interface RemoteRobotState {
  id: string;
  urdfPath: string;
  joints: number[];
  position: { x: number; y: number; z: number };
  rotation: { w: number; x: number; y: number; z: number };
  color?: string;
  opacity: number;
}

/**
 * Trajectory state
 */
interface TrajectoryState {
  robotId: string;
  playing: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  loop: boolean;
}

/**
 * Safety zone state
 */
interface SafetyZoneState {
  id: string;
  radius: number;
  warningRadius?: number;
  dangerRadius?: number;
  position: { x: number; y: number; z: number };
}

/**
 * Obstacle state
 */
interface ObstacleState {
  id: string;
  type: string;
  shape?: string;
  dimensions: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  color: string;
  opacity: number;
}

/**
 * Waypoint state
 */
interface WaypointState {
  id: string;
  position: { x: number; y: number; z: number };
  label?: string;
  color?: string;
}

/**
 * Server events
 */
export interface ServerEvents {
  onRobotAdd?: (robot: RemoteRobotState) => void;
  onRobotRemove?: (robotId: string) => void;
  onJointsChange?: (robotId: string, joints: number[]) => void;
  onTrajectoryPlay?: (robotId: string, trajectory: unknown, options: { speed: number; loop: boolean }) => void;
  onTrajectoryPause?: (robotId: string) => void;
  onTrajectoryStop?: (robotId: string) => void;
  onTrajectorySeek?: (robotId: string, time: number) => void;
  onSafetyZoneAdd?: (zone: SafetyZoneState) => void;
  onSafetyZoneRemove?: (zoneId: string) => void;
  onObstacleAdd?: (obstacle: ObstacleState) => void;
  onObstacleRemove?: (obstacleId: string) => void;
  onObstacleClear?: () => void;
  onWaypointAdd?: (waypoint: WaypointState) => void;
  onWaypointRemove?: (waypointId: string) => void;
  onWaypointClear?: () => void;
  onCameraSet?: (params: { position?: { x: number; y: number; z: number }; target?: { x: number; y: number; z: number }; fov?: number }) => void;
  onCameraReset?: () => void;
}

/**
 * Server configuration
 */
export interface RoboVizServerConfig extends WebSocketServerConfig {
  /** Server events */
  events?: ServerEvents;
}

// ============================================================================
// RoboViz Server
// ============================================================================

/**
 * RoboViz Server - Handles remote control commands
 */
export class RoboVizServer {
  private wsServer: WebSocketServer;
  private robots = new Map<string, RemoteRobotState>();
  private trajectories = new Map<string, TrajectoryState>();
  private safetyZones = new Map<string, SafetyZoneState>();
  private obstacles = new Map<string, ObstacleState>();
  private waypoints = new Map<string, WaypointState>();
  private events: ServerEvents;
  private robotIdCounter = 0;

  constructor(config: RoboVizServerConfig = {}) {
    this.events = config.events || {};

    this.wsServer = createWebSocketServer(config, {
      onClientConnect: (client) => {
        // Send current state to new client
        this.sendInitialState(client);
      },
      onClientDisconnect: () => {
        // Cleanup if needed
      },
      onError: (error) => {
        console.error('[RoboVizServer] Error:', error);
      },
    });

    this.registerHandlers();
  }

  // ==========================================================================
  // Handler Registration
  // ==========================================================================

  private registerHandlers(): void {
    // Robot handlers
    this.wsServer.registerMethod('robot.add', this.handleRobotAdd.bind(this));
    this.wsServer.registerMethod('robot.remove', this.handleRobotRemove.bind(this));
    this.wsServer.registerNotification('robot.setJoints', this.handleSetJoints.bind(this));
    this.wsServer.registerMethod('robot.getJoints', this.handleGetJoints.bind(this));
    this.wsServer.registerMethod('robot.getTcpPose', this.handleGetTcpPose.bind(this));

    // Trajectory handlers
    this.wsServer.registerNotification('trajectory.play', this.handleTrajectoryPlay.bind(this));
    this.wsServer.registerNotification('trajectory.pause', this.handleTrajectoryPause.bind(this));
    this.wsServer.registerNotification('trajectory.stop', this.handleTrajectoryStop.bind(this));
    this.wsServer.registerNotification('trajectory.seek', this.handleTrajectorySeek.bind(this));

    // Safety zone handlers
    this.wsServer.registerNotification('safetyZone.add', this.handleSafetyZoneAdd.bind(this));
    this.wsServer.registerNotification('safetyZone.remove', this.handleSafetyZoneRemove.bind(this));

    // Obstacle handlers
    this.wsServer.registerNotification('obstacle.add', this.handleObstacleAdd.bind(this));
    this.wsServer.registerNotification('obstacle.remove', this.handleObstacleRemove.bind(this));
    this.wsServer.registerNotification('obstacle.clear', this.handleObstacleClear.bind(this));

    // Waypoint handlers
    this.wsServer.registerNotification('waypoint.add', this.handleWaypointAdd.bind(this));
    this.wsServer.registerNotification('waypoint.remove', this.handleWaypointRemove.bind(this));
    this.wsServer.registerNotification('waypoint.clear', this.handleWaypointClear.bind(this));

    // Camera handlers
    this.wsServer.registerNotification('camera.set', this.handleCameraSet.bind(this));
    this.wsServer.registerNotification('camera.reset', this.handleCameraReset.bind(this));
  }

  // ==========================================================================
  // Robot Handlers
  // ==========================================================================

  private handleRobotAdd(params: Record<string, unknown>): RemoteRobotState {
    const id = (params.id as string) || `robot_${++this.robotIdCounter}`;
    const urdfPath = params.urdfPath as string;

    const robot: RemoteRobotState = {
      id,
      urdfPath,
      joints: [],
      position: (params.position as { x: number; y: number; z: number }) || { x: 0, y: 0, z: 0 },
      rotation: (params.rotation as { w: number; x: number; y: number; z: number }) || { w: 1, x: 0, y: 0, z: 0 },
      color: params.color as string | undefined,
      opacity: (params.opacity as number) ?? 1.0,
    };

    this.robots.set(id, robot);
    this.events.onRobotAdd?.(robot);
    this.broadcast(createNotification('robot.added', { robot }));

    return {
      ...robot,
      // Add additional info that would come from URDF parsing
    };
  }

  private handleRobotRemove(params: Record<string, unknown>): void {
    const id = params.id as string;
    if (this.robots.delete(id)) {
      this.events.onRobotRemove?.(id);
      this.broadcast(createNotification('robot.removed', { id }));
    }
  }

  private handleSetJoints(params: Record<string, unknown>): void {
    const id = params.id as string;
    const angles = params.angles as number[];

    const robot = this.robots.get(id);
    if (robot) {
      robot.joints = angles;
      this.events.onJointsChange?.(id, angles);
      this.broadcast(createNotification('robot.jointsChanged', { id, angles }));
    }
  }

  private handleGetJoints(params: Record<string, unknown>): { angles: number[] } {
    const id = params.id as string;
    const robot = this.robots.get(id);
    return { angles: robot?.joints || [] };
  }

  private handleGetTcpPose(params: Record<string, unknown>): { position: { x: number; y: number; z: number }; orientation: { w: number; x: number; y: number; z: number } } {
    const id = params.id as string;
    const robot = this.robots.get(id);
    // In real implementation, this would compute TCP from joint angles + kinematics
    return {
      position: robot?.position || { x: 0, y: 0, z: 0 },
      orientation: robot?.rotation || { w: 1, x: 0, y: 0, z: 0 },
    };
  }

  // ==========================================================================
  // Trajectory Handlers
  // ==========================================================================

  private handleTrajectoryPlay(params: Record<string, unknown>): void {
    const robotId = params.robotId as string;
    const trajectory = params.trajectory;
    const speed = (params.speed as number) ?? 1.0;
    const loop = (params.loop as boolean) ?? false;

    this.events.onTrajectoryPlay?.(robotId, trajectory, { speed, loop });
    this.broadcast(createNotification('trajectory.started', { robotId, speed, loop }));
  }

  private handleTrajectoryPause(params: Record<string, unknown>): void {
    const robotId = params.robotId as string;
    this.events.onTrajectoryPause?.(robotId);
    this.broadcast(createNotification('trajectory.paused', { robotId }));
  }

  private handleTrajectoryStop(params: Record<string, unknown>): void {
    const robotId = params.robotId as string;
    this.events.onTrajectoryStop?.(robotId);
    this.broadcast(createNotification('trajectory.stopped', { robotId }));
  }

  private handleTrajectorySeek(params: Record<string, unknown>): void {
    const robotId = params.robotId as string;
    const time = params.time as number;
    this.events.onTrajectorySeek?.(robotId, time);
    this.broadcast(createNotification('trajectory.seeked', { robotId, time }));
  }

  // ==========================================================================
  // Safety Zone Handlers
  // ==========================================================================

  private handleSafetyZoneAdd(params: Record<string, unknown>): void {
    const zone: SafetyZoneState = {
      id: params.id as string,
      radius: params.innerRadius as number,
      warningRadius: params.outerRadius as number | undefined,
      dangerRadius: params.dangerRadius as number | undefined,
      position: (params.position as { x: number; y: number; z: number }) || { x: 0, y: 0, z: 0 },
    };

    this.safetyZones.set(zone.id, zone);
    this.events.onSafetyZoneAdd?.(zone);
    this.broadcast(createNotification('safetyZone.added', zone as unknown as Record<string, unknown>));
  }

  private handleSafetyZoneRemove(params: Record<string, unknown>): void {
    const id = params.id as string;
    if (this.safetyZones.delete(id)) {
      this.events.onSafetyZoneRemove?.(id);
      this.broadcast(createNotification('safetyZone.removed', { id }));
    }
  }

  // ==========================================================================
  // Obstacle Handlers
  // ==========================================================================

  private handleObstacleAdd(params: Record<string, unknown>): void {
    const primitive = params.primitive as { shape: string; dimensions: { x: number; y: number; z: number } } | undefined;
    const transform = params.transform as { position: { x: number; y: number; z: number } } | undefined;

    const obstacle: ObstacleState = {
      id: params.id as string,
      type: params.type as string,
      shape: primitive?.shape,
      dimensions: primitive?.dimensions || { x: 0.1, y: 0.1, z: 0.1 },
      position: transform?.position || { x: 0, y: 0, z: 0 },
      color: (params.color as string) || '#ff4444',
      opacity: (params.opacity as number) ?? 0.6,
    };

    this.obstacles.set(obstacle.id, obstacle);
    this.events.onObstacleAdd?.(obstacle);
    this.broadcast(createNotification('obstacle.added', params));
  }

  private handleObstacleRemove(params: Record<string, unknown>): void {
    const id = params.id as string;
    if (this.obstacles.delete(id)) {
      this.events.onObstacleRemove?.(id);
      this.broadcast(createNotification('obstacle.removed', { id }));
    }
  }

  private handleObstacleClear(): void {
    this.obstacles.clear();
    this.events.onObstacleClear?.();
    this.broadcast(createNotification('obstacle.cleared', {}));
  }

  // ==========================================================================
  // Waypoint Handlers
  // ==========================================================================

  private handleWaypointAdd(params: Record<string, unknown>): void {
    const tcpPose = params.tcpPose as { position: { x: number; y: number; z: number } } | undefined;

    const waypoint: WaypointState = {
      id: params.id as string,
      position: tcpPose?.position || { x: 0, y: 0, z: 0 },
      label: params.label as string | undefined,
      color: params.color as string | undefined,
    };

    this.waypoints.set(waypoint.id, waypoint);
    this.events.onWaypointAdd?.(waypoint);
    this.broadcast(createNotification('waypoint.added', params));
  }

  private handleWaypointRemove(params: Record<string, unknown>): void {
    const id = params.id as string;
    if (this.waypoints.delete(id)) {
      this.events.onWaypointRemove?.(id);
      this.broadcast(createNotification('waypoint.removed', { id }));
    }
  }

  private handleWaypointClear(): void {
    this.waypoints.clear();
    this.events.onWaypointClear?.();
    this.broadcast(createNotification('waypoint.cleared', {}));
  }

  // ==========================================================================
  // Camera Handlers
  // ==========================================================================

  private handleCameraSet(params: Record<string, unknown>): void {
    this.events.onCameraSet?.(params as { position?: { x: number; y: number; z: number }; target?: { x: number; y: number; z: number }; fov?: number });
    this.broadcast(createNotification('camera.changed', params));
  }

  private handleCameraReset(): void {
    this.events.onCameraReset?.();
    this.broadcast(createNotification('camera.reset', {}));
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  private sendInitialState(client: ClientConnection): void {
    // Send all current robots
    for (const robot of this.robots.values()) {
      client.send(createNotification('robot.added', { robot } as Record<string, unknown>));
    }

    // Send all safety zones
    for (const zone of this.safetyZones.values()) {
      client.send(createNotification('safetyZone.added', zone as unknown as Record<string, unknown>));
    }

    // Send all obstacles
    for (const obstacle of this.obstacles.values()) {
      client.send(createNotification('obstacle.added', obstacle as unknown as Record<string, unknown>));
    }

    // Send all waypoints
    for (const waypoint of this.waypoints.values()) {
      client.send(createNotification('waypoint.added', waypoint as unknown as Record<string, unknown>));
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Get the underlying WebSocket server
   */
  getWebSocketServer(): WebSocketServer {
    return this.wsServer;
  }

  /**
   * Add a client connection
   */
  addClient(sendFn: (message: unknown) => void, closeFn?: () => void): ClientConnection {
    return this.wsServer.addClient(sendFn as (message: JsonRpcMessage) => void, closeFn);
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    this.wsServer.removeClient(clientId);
  }

  /**
   * Handle incoming message from a client
   */
  async handleMessage(clientId: string, message: string | Record<string, unknown>): Promise<void> {
    if (typeof message === 'string') {
      await this.wsServer.handleRawMessage(clientId, message);
    } else {
      await this.wsServer.handleMessage(clientId, message as unknown as JsonRpcMessage);
    }
  }

  /**
   * Broadcast a notification to all clients
   */
  broadcast(notification: JsonRpcNotification): void {
    this.wsServer.broadcast(notification);
  }

  /**
   * Get current robot state
   */
  getRobots(): RemoteRobotState[] {
    return Array.from(this.robots.values());
  }

  /**
   * Get robot by ID
   */
  getRobot(id: string): RemoteRobotState | undefined {
    return this.robots.get(id);
  }

  /**
   * Close the server
   */
  close(): void {
    this.wsServer.close();
    this.robots.clear();
    this.safetyZones.clear();
    this.obstacles.clear();
    this.waypoints.clear();
  }

  /**
   * Emit TCP moved event (called by visualization)
   */
  emitTcpMoved(robotId: string, pose: { position: { x: number; y: number; z: number }; orientation: { w: number; x: number; y: number; z: number } }): void {
    this.broadcast(createNotification('robot.tcpMoved', { robotId, pose }));
  }

  /**
   * Emit collision event
   */
  emitCollision(robotId: string, obstacleId: string, point: { x: number; y: number; z: number }): void {
    this.broadcast(createNotification('collision.detected', { robotId, obstacleId, point }));
  }

  /**
   * Emit safety zone entered event
   */
  emitZoneEntered(robotId: string, zoneId: string, zoneType: 'safe' | 'warning' | 'danger'): void {
    this.broadcast(createNotification('safetyZone.entered', { robotId, zoneId, zoneType }));
  }

  /**
   * Emit safety zone exited event
   */
  emitZoneExited(robotId: string, zoneId: string): void {
    this.broadcast(createNotification('safetyZone.exited', { robotId, zoneId }));
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a RoboViz server instance
 */
export function createRoboVizServer(config?: RoboVizServerConfig): RoboVizServer {
  return new RoboVizServer(config);
}
