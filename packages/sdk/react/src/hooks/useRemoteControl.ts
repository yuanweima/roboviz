/**
 * useRemoteControl Hook (Simplified)
 *
 * Enables remote control of RoboViz via WebSocket.
 * This is a simplified wrapper around the core useRemoteControl hook.
 *
 * @example
 * ```tsx
 * import { RoboViz, Robot, useRemoteControl } from '@aspect/roboviz-react';
 *
 * function RemoteControlledViz() {
 *   const { robots, safetyZones, obstacles, connectToServer } = useRemoteControl();
 *
 *   // Connect to Python client's WebSocket server
 *   useEffect(() => {
 *     connectToServer('ws://localhost:8080');
 *   }, []);
 *
 *   return (
 *     <RoboViz>
 *       {Array.from(robots.values()).map(robot => (
 *         <Robot
 *           key={robot.id}
 *           urdf={robot.urdfPath}
 *           joints={robot.joints}
 *         />
 *       ))}
 *     </RoboViz>
 *   );
 * }
 * ```
 */

import {
  useRemoteControl as useCoreRemoteControl,
  type RemoteControlConfig as CoreConfig,
  type UseRemoteControlReturn as CoreReturn,
  type RobotState,
} from '@aspect/roboviz-core';

// ============================================================================
// Types
// ============================================================================

/**
 * Simplified remote control configuration
 */
export interface RemoteControlConfig {
  /** Enable remote control (default: true) */
  enabled?: boolean;

  /** Enable debug logging */
  debug?: boolean;

  /** Called when a robot is added */
  onRobotAdd?: (robot: { id: string; urdfPath: string }) => void;

  /** Called when a robot is removed */
  onRobotRemove?: (robotId: string) => void;

  /** Called when joint angles change */
  onJointsChange?: (robotId: string, joints: number[]) => void;

  /** Called when trajectory starts playing */
  onTrajectoryPlay?: (robotId: string) => void;

  /** Called when trajectory stops */
  onTrajectoryStop?: (robotId: string) => void;
}

/**
 * Simplified remote control state and actions
 */
export interface UseRemoteControlReturn {
  /** Whether remote control is enabled */
  enabled: boolean;

  /** Number of connected clients */
  clientCount: number;

  /** Current robots (Map of id -> robot state) */
  robots: Map<string, {
    id: string;
    urdfPath: string;
    joints: number[];
    position: [number, number, number];
    color?: string;
  }>;

  /** Current safety zones */
  safetyZones: Map<string, {
    id: string;
    radius: number;
    position: [number, number, number];
  }>;

  /** Current obstacles */
  obstacles: Map<string, {
    id: string;
    shape: 'box' | 'sphere' | 'cylinder';
    dimensions: [number, number, number];
    position: [number, number, number];
    color: string;
  }>;

  /** Current waypoints */
  waypoints: Map<string, {
    id: string;
    position: [number, number, number];
    label?: string;
  }>;

  /** Connect to external WebSocket server */
  connectToServer: (url: string) => Promise<void>;

  /** Disconnect from server */
  disconnect: () => void;

  /** Enable/disable remote control */
  setEnabled: (enabled: boolean) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useRemoteControl - Enable remote control of RoboViz
 *
 * This hook manages the state for robots, obstacles, safety zones, and waypoints
 * that are controlled remotely via WebSocket (e.g., from Python).
 */
export function useRemoteControl(config: RemoteControlConfig = {}): UseRemoteControlReturn {
  const coreReturn = useCoreRemoteControl({
    enabled: config.enabled,
    debug: config.debug,
    onRobotAdd: config.onRobotAdd ? (robot) => config.onRobotAdd?.({ id: robot.id, urdfPath: robot.urdfPath }) : undefined,
    onRobotRemove: config.onRobotRemove,
    onJointsChange: config.onJointsChange,
    onTrajectoryPlay: config.onTrajectoryPlay ? (robotId) => config.onTrajectoryPlay?.(robotId) : undefined,
    onTrajectoryStop: config.onTrajectoryStop,
  });

  // Transform robots to simplified format
  const robots = new Map<string, {
    id: string;
    urdfPath: string;
    joints: number[];
    position: [number, number, number];
    color?: string;
  }>();

  coreReturn.robots.forEach((robot, id) => {
    robots.set(id, {
      id: robot.id,
      urdfPath: robot.urdfPath,
      joints: robot.joints,
      position: [robot.position.x, robot.position.y, robot.position.z],
      color: robot.color,
    });
  });

  // Transform safety zones
  const safetyZones = new Map<string, {
    id: string;
    radius: number;
    position: [number, number, number];
  }>();

  coreReturn.safetyZones.forEach((zone, id) => {
    safetyZones.set(id, {
      id: zone.id,
      radius: zone.radius,
      position: zone.position,
    });
  });

  // Transform obstacles
  const obstacles = new Map<string, {
    id: string;
    shape: 'box' | 'sphere' | 'cylinder';
    dimensions: [number, number, number];
    position: [number, number, number];
    color: string;
  }>();

  coreReturn.obstacles.forEach((obstacle, id) => {
    obstacles.set(id, {
      id: obstacle.id,
      shape: obstacle.shape,
      dimensions: obstacle.dimensions,
      position: obstacle.position,
      color: obstacle.color,
    });
  });

  // Transform waypoints
  const waypoints = new Map<string, {
    id: string;
    position: [number, number, number];
    label?: string;
  }>();

  coreReturn.waypoints.forEach((waypoint, id) => {
    waypoints.set(id, {
      id: waypoint.id,
      position: waypoint.position,
      label: waypoint.label,
    });
  });

  return {
    enabled: coreReturn.enabled,
    clientCount: coreReturn.clientCount,
    robots,
    safetyZones,
    obstacles,
    waypoints,
    connectToServer: coreReturn.connectToServer,
    disconnect: coreReturn.disconnect,
    setEnabled: coreReturn.setEnabled,
  };
}

export default useRemoteControl;
