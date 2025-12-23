/**
 * useRemoteControl Hook
 *
 * React hook for enabling remote control of RoboViz via WebSocket.
 * Allows Python or other clients to control the visualization.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isConnected, robots, server } = useRemoteControl({
 *     port: 8080,
 *     onRobotAdd: (robot) => console.log('Robot added:', robot.id),
 *   });
 *
 *   return (
 *     <RoboViz>
 *       {robots.map(robot => (
 *         <Robot key={robot.id} urdf={robot.urdfPath} joints={robot.joints} />
 *       ))}
 *     </RoboViz>
 *   );
 * }
 * ```
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  RoboVizServer,
  createRoboVizServer,
  type RoboVizServerConfig,
  type RemoteRobotState,
  type ServerEvents,
} from '../server/roboviz-server';
import { createNotification } from '../protocol/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Remote control configuration
 */
export interface RemoteControlConfig extends ServerEvents {
  /** WebSocket port (documentation only - actual server runs externally) */
  port?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Enable remote control (default: true) */
  enabled?: boolean;

  /** Custom WebSocket instance (if using external server) */
  websocket?: WebSocket;
}

/**
 * Safety zone state from remote
 */
export interface RemoteSafetyZone {
  id: string;
  radius: number;
  warningRadius?: number;
  dangerRadius?: number;
  position: [number, number, number];
}

/**
 * Obstacle state from remote
 */
export interface RemoteObstacle {
  id: string;
  shape: 'box' | 'sphere' | 'cylinder';
  dimensions: [number, number, number];
  position: [number, number, number];
  color: string;
  opacity: number;
}

/**
 * Waypoint state from remote
 */
export interface RemoteWaypoint {
  id: string;
  position: [number, number, number];
  label?: string;
  color?: string;
}

/**
 * Trajectory command from remote
 */
export interface RemoteTrajectory {
  robotId: string;
  times: number[];
  positions: number[][];
  speed: number;
  loop: boolean;
  playing: boolean;
}

/**
 * Remote control state
 */
export interface RemoteControlState {
  /** Whether remote control is enabled */
  enabled: boolean;

  /** Number of connected clients */
  clientCount: number;

  /** Current robots from remote commands */
  robots: Map<string, RemoteRobotState>;

  /** Current safety zones */
  safetyZones: Map<string, RemoteSafetyZone>;

  /** Current obstacles */
  obstacles: Map<string, RemoteObstacle>;

  /** Current waypoints */
  waypoints: Map<string, RemoteWaypoint>;

  /** Active trajectories */
  trajectories: Map<string, RemoteTrajectory>;

  /** The server instance */
  server: RoboVizServer | null;
}

/**
 * Remote control actions
 */
export interface RemoteControlActions {
  /** Enable/disable remote control */
  setEnabled: (enabled: boolean) => void;

  /** Connect to external WebSocket server */
  connectToServer: (url: string) => Promise<void>;

  /** Disconnect from external server */
  disconnect: () => void;

  /** Add a virtual client (for testing) */
  addVirtualClient: () => { send: (msg: string) => void; close: () => void };

  /** Notify TCP position changed */
  notifyTcpMoved: (robotId: string, position: [number, number, number], orientation: [number, number, number, number]) => void;

  /** Notify collision detected */
  notifyCollision: (robotId: string, obstacleId: string) => void;
}

/**
 * Remote control hook return type
 */
export interface UseRemoteControlReturn extends RemoteControlState, RemoteControlActions {}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useRemoteControl - Enable remote control of RoboViz
 */
export function useRemoteControl(config: RemoteControlConfig = {}): UseRemoteControlReturn {
  const {
    enabled = true,
    debug = false,
    websocket,
    ...events
  } = config;

  // State
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [clientCount, setClientCount] = useState(0);
  const [robots, setRobots] = useState<Map<string, RemoteRobotState>>(new Map());
  const [safetyZones, setSafetyZones] = useState<Map<string, RemoteSafetyZone>>(new Map());
  const [obstacles, setObstacles] = useState<Map<string, RemoteObstacle>>(new Map());
  const [waypoints, setWaypoints] = useState<Map<string, RemoteWaypoint>>(new Map());
  const [trajectories, setTrajectories] = useState<Map<string, RemoteTrajectory>>(new Map());

  // Refs
  const serverRef = useRef<RoboVizServer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string | null>(null);

  // Logging helper
  const log = useCallback((...args: unknown[]) => {
    if (debug) {
      console.log('[useRemoteControl]', ...args);
    }
  }, [debug]);

  // Create server with event handlers
  useEffect(() => {
    if (!isEnabled) {
      serverRef.current?.close();
      serverRef.current = null;
      return;
    }

    const serverEvents: ServerEvents = {
      onRobotAdd: (robot) => {
        log('Robot added:', robot.id);
        setRobots(prev => new Map(prev).set(robot.id, robot));
        events.onRobotAdd?.(robot);
      },
      onRobotRemove: (robotId) => {
        log('Robot removed:', robotId);
        setRobots(prev => {
          const next = new Map(prev);
          next.delete(robotId);
          return next;
        });
        events.onRobotRemove?.(robotId);
      },
      onJointsChange: (robotId, joints) => {
        log('Joints changed:', robotId, joints);
        setRobots(prev => {
          const robot = prev.get(robotId);
          if (robot) {
            const next = new Map(prev);
            next.set(robotId, { ...robot, joints });
            return next;
          }
          return prev;
        });
        events.onJointsChange?.(robotId, joints);
      },
      onTrajectoryPlay: (robotId, trajectory, options) => {
        log('Trajectory play:', robotId);
        const traj = trajectory as { times: number[]; positions: number[][] };
        setTrajectories(prev => new Map(prev).set(robotId, {
          robotId,
          times: traj.times || [],
          positions: traj.positions || [],
          speed: options.speed,
          loop: options.loop,
          playing: true,
        }));
        events.onTrajectoryPlay?.(robotId, trajectory, options);
      },
      onTrajectoryPause: (robotId) => {
        log('Trajectory pause:', robotId);
        setTrajectories(prev => {
          const traj = prev.get(robotId);
          if (traj) {
            const next = new Map(prev);
            next.set(robotId, { ...traj, playing: false });
            return next;
          }
          return prev;
        });
        events.onTrajectoryPause?.(robotId);
      },
      onTrajectoryStop: (robotId) => {
        log('Trajectory stop:', robotId);
        setTrajectories(prev => {
          const next = new Map(prev);
          next.delete(robotId);
          return next;
        });
        events.onTrajectoryStop?.(robotId);
      },
      onTrajectorySeek: events.onTrajectorySeek,
      onSafetyZoneAdd: (zone) => {
        log('Safety zone added:', zone.id);
        setSafetyZones(prev => new Map(prev).set(zone.id, {
          id: zone.id,
          radius: zone.radius,
          warningRadius: zone.warningRadius,
          dangerRadius: zone.dangerRadius,
          position: [zone.position.x, zone.position.y, zone.position.z],
        }));
        events.onSafetyZoneAdd?.(zone);
      },
      onSafetyZoneRemove: (zoneId) => {
        log('Safety zone removed:', zoneId);
        setSafetyZones(prev => {
          const next = new Map(prev);
          next.delete(zoneId);
          return next;
        });
        events.onSafetyZoneRemove?.(zoneId);
      },
      onObstacleAdd: (obstacle) => {
        log('Obstacle added:', obstacle.id);
        setObstacles(prev => new Map(prev).set(obstacle.id, {
          id: obstacle.id,
          shape: (obstacle.shape || 'box') as 'box' | 'sphere' | 'cylinder',
          dimensions: [obstacle.dimensions.x, obstacle.dimensions.y, obstacle.dimensions.z],
          position: [obstacle.position.x, obstacle.position.y, obstacle.position.z],
          color: obstacle.color,
          opacity: obstacle.opacity,
        }));
        events.onObstacleAdd?.(obstacle);
      },
      onObstacleRemove: (obstacleId) => {
        log('Obstacle removed:', obstacleId);
        setObstacles(prev => {
          const next = new Map(prev);
          next.delete(obstacleId);
          return next;
        });
        events.onObstacleRemove?.(obstacleId);
      },
      onObstacleClear: () => {
        log('Obstacles cleared');
        setObstacles(new Map());
        events.onObstacleClear?.();
      },
      onWaypointAdd: (waypoint) => {
        log('Waypoint added:', waypoint.id);
        setWaypoints(prev => new Map(prev).set(waypoint.id, {
          id: waypoint.id,
          position: [waypoint.position.x, waypoint.position.y, waypoint.position.z],
          label: waypoint.label,
          color: waypoint.color,
        }));
        events.onWaypointAdd?.(waypoint);
      },
      onWaypointRemove: (waypointId) => {
        log('Waypoint removed:', waypointId);
        setWaypoints(prev => {
          const next = new Map(prev);
          next.delete(waypointId);
          return next;
        });
        events.onWaypointRemove?.(waypointId);
      },
      onWaypointClear: () => {
        log('Waypoints cleared');
        setWaypoints(new Map());
        events.onWaypointClear?.();
      },
      onCameraSet: events.onCameraSet,
      onCameraReset: events.onCameraReset,
    };

    serverRef.current = createRoboVizServer({
      debug,
      events: serverEvents,
    });

    log('Server created');

    return () => {
      serverRef.current?.close();
      serverRef.current = null;
    };
  }, [isEnabled, debug]);

  // Connect to external WebSocket server
  const connectToServer = useCallback(async (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!serverRef.current) {
        reject(new Error('Server not initialized'));
        return;
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        log('Connected to:', url);

        // Register as a client
        const client = serverRef.current?.addClient(
          (msg) => ws.send(JSON.stringify(msg)),
          () => ws.close()
        );
        clientIdRef.current = client?.id || null;
        setClientCount(1);
        resolve();
      };

      ws.onmessage = (event) => {
        if (clientIdRef.current && serverRef.current) {
          serverRef.current.handleMessage(clientIdRef.current, event.data);
        }
      };

      ws.onerror = (event) => {
        log('WebSocket error:', event);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        log('Disconnected');
        if (clientIdRef.current) {
          serverRef.current?.removeClient(clientIdRef.current);
          clientIdRef.current = null;
        }
        wsRef.current = null;
        setClientCount(0);
      };
    });
  }, [log]);

  // Disconnect from external server
  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    clientIdRef.current = null;
    setClientCount(0);
  }, []);

  // Add virtual client (for testing)
  const addVirtualClient = useCallback(() => {
    if (!serverRef.current) {
      throw new Error('Server not initialized');
    }

    const messages: string[] = [];
    const client = serverRef.current.addClient(
      (msg) => messages.push(JSON.stringify(msg))
    );

    setClientCount(prev => prev + 1);

    return {
      send: (msg: string) => {
        serverRef.current?.handleMessage(client.id, msg);
      },
      close: () => {
        serverRef.current?.removeClient(client.id);
        setClientCount(prev => Math.max(0, prev - 1));
      },
    };
  }, []);

  // Notify TCP moved
  const notifyTcpMoved = useCallback((
    robotId: string,
    position: [number, number, number],
    orientation: [number, number, number, number]
  ) => {
    serverRef.current?.emitTcpMoved(robotId, {
      position: { x: position[0], y: position[1], z: position[2] },
      orientation: { w: orientation[0], x: orientation[1], y: orientation[2], z: orientation[3] },
    });
  }, []);

  // Notify collision
  const notifyCollision = useCallback((robotId: string, obstacleId: string) => {
    serverRef.current?.emitCollision(robotId, obstacleId, { x: 0, y: 0, z: 0 });
  }, []);

  return {
    enabled: isEnabled,
    clientCount,
    robots,
    safetyZones,
    obstacles,
    waypoints,
    trajectories,
    server: serverRef.current,
    setEnabled: setIsEnabled,
    connectToServer,
    disconnect,
    addVirtualClient,
    notifyTcpMoved,
    notifyCollision,
  };
}

export default useRemoteControl;
