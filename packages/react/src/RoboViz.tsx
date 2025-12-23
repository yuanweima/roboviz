/**
 * RoboViz React Component
 *
 * High-level React wrapper for the RoboViz visualization system.
 * This is the main entry point for React applications.
 */

import * as React from 'react';
import {
  RoboVizCore,
  Robot,
  Scene,
  Trajectory,
  Waypoint,
  WaypointGroup,
  Obstacle,
  useVizStore,
  type RoboVizCoreProps,
  type SceneConfig,
  type CameraState,
  type RobotState,
  type TrajectoryState,
  type WaypointData,
  type ObstacleData,
  type Vector3,
} from '@aspect/roboviz-core';

export interface RoboVizProps extends Omit<RoboVizCoreProps, 'children'> {
  /** Width of the visualization container */
  width?: number | string;
  /** Height of the visualization container */
  height?: number | string;
  /** Additional children to render in the scene */
  children?: React.ReactNode;
}

/**
 * RoboViz main component
 *
 * A complete, self-contained robot visualization component.
 * Automatically renders all robots, trajectories, waypoints, and obstacles
 * from the visualization store.
 *
 * @example
 * ```tsx
 * import { RoboViz, useRoboViz } from '@aspect/roboviz-react';
 *
 * function App() {
 *   const { addRobot, setRobotJointAngles } = useRoboViz();
 *
 *   useEffect(() => {
 *     addRobot({
 *       id: 'robot1',
 *       urdf: '/robot.urdf',
 *       jointAngles: [0, 0, 0, 0, 0, 0],
 *     });
 *   }, []);
 *
 *   return (
 *     <RoboViz
 *       width="100%"
 *       height="600px"
 *       config={{ background: '#1a1a2e' }}
 *     />
 *   );
 * }
 * ```
 */
export function RoboViz({
  width = '100%',
  height = '100%',
  style,
  children,
  ...coreProps
}: RoboVizProps): React.ReactElement {
  const containerStyle: React.CSSProperties = {
    width,
    height,
    ...style,
  };

  // Get store state for auto-rendering
  const {
    robots,
    trajectories,
    waypoints,
    obstacles,
    selectedWaypointId,
    selectWaypoint,
  } = useVizStore();

  return (
    <RoboVizCore style={containerStyle} {...coreProps}>
      {/* Auto-render robots from store */}
      {Array.from(robots.values()).map((robot) => (
        <Robot
          key={robot.id}
          id={robot.id}
          urdfPath={robot.urdf}
          jointAngles={robot.jointAngles}
          showAxes={robot.options.showAxes}
          opacity={robot.options.opacity}
          color={robot.options.color}
        />
      ))}

      {/* Auto-render trajectories from store */}
      {Array.from(trajectories.values()).map((trajectory) => (
        <Trajectory
          key={trajectory.id}
          id={trajectory.id}
          data={trajectory.data}
          showPath={trajectory.visualization.showPath}
          pathColor={trajectory.visualization.pathColor}
          pathWidth={trajectory.visualization.pathWidth}
        />
      ))}

      {/* Auto-render waypoints from store */}
      {Array.from(waypoints.values()).map((waypoint) => (
        <Waypoint
          key={waypoint.id}
          data={waypoint}
          selected={waypoint.id === selectedWaypointId}
          onSelect={selectWaypoint}
        />
      ))}

      {/* Auto-render obstacles from store */}
      {Array.from(obstacles.values()).map((obstacle) => (
        <Obstacle key={obstacle.id} data={obstacle} />
      ))}

      {/* Custom children */}
      {children}
    </RoboVizCore>
  );
}

/**
 * Hook for interacting with the RoboViz store
 *
 * Provides methods to add, remove, and update robots, trajectories,
 * waypoints, and obstacles.
 */
export function useRoboViz() {
  const store = useVizStore();

  return {
    // Robots
    addRobot: store.addRobot,
    removeRobot: store.removeRobot,
    updateRobot: store.updateRobot,
    setRobotJointAngles: store.setRobotJointAngles,
    robots: store.robots,

    // Trajectories
    addTrajectory: store.addTrajectory,
    removeTrajectory: store.removeTrajectory,
    trajectories: store.trajectories,

    // Playback
    playback: store.playback,
    setPlayback: store.setPlayback,

    // Waypoints
    addWaypoint: store.addWaypoint,
    removeWaypoint: store.removeWaypoint,
    selectWaypoint: store.selectWaypoint,
    waypoints: store.waypoints,
    selectedWaypointId: store.selectedWaypointId,

    // Obstacles
    addObstacle: store.addObstacle,
    removeObstacle: store.removeObstacle,
    obstacles: store.obstacles,

    // Scene
    scene: store.scene,
    setScene: store.setScene,

    // Camera
    camera: store.camera,
    setCamera: store.setCamera,

    // Selection
    selectedObjectId: store.selectedObjectId,
    hoveredObjectId: store.hoveredObjectId,
    selectObject: store.selectObject,
    hoverObject: store.hoverObject,

    // Reset
    reset: store.reset,
  };
}

/**
 * Hook for controlling trajectory playback
 */
export function usePlayback() {
  const { playback, setPlayback, trajectories } = useVizStore();

  const play = React.useCallback((trajectoryId?: string) => {
    if (trajectoryId) {
      setPlayback({ activeTrajectoryId: trajectoryId, isPlaying: true, currentTime: 0 });
    } else if (playback.activeTrajectoryId) {
      setPlayback({ isPlaying: true });
    }
  }, [playback.activeTrajectoryId, setPlayback]);

  const pause = React.useCallback(() => {
    setPlayback({ isPlaying: false });
  }, [setPlayback]);

  const stop = React.useCallback(() => {
    setPlayback({ isPlaying: false, currentTime: 0 });
  }, [setPlayback]);

  const setSpeed = React.useCallback((speed: number) => {
    setPlayback({ speed });
  }, [setPlayback]);

  const setLoop = React.useCallback((loop: boolean) => {
    setPlayback({ loop });
  }, [setPlayback]);

  const seek = React.useCallback((time: number) => {
    setPlayback({ currentTime: time });
  }, [setPlayback]);

  return {
    ...playback,
    play,
    pause,
    stop,
    setSpeed,
    setLoop,
    seek,
  };
}

/**
 * Hook for managing robot joints
 */
export function useRobotJoints(robotId: string) {
  const { robots, setRobotJointAngles, updateRobot } = useVizStore();
  const robot = robots.get(robotId);

  const setJointAngle = React.useCallback((index: number, value: number) => {
    if (!robot) return;
    const newAngles = [...robot.jointAngles];
    newAngles[index] = value;
    setRobotJointAngles(robotId, newAngles);
  }, [robot, robotId, setRobotJointAngles]);

  const setAllJointAngles = React.useCallback((angles: number[]) => {
    setRobotJointAngles(robotId, angles);
  }, [robotId, setRobotJointAngles]);

  const goToHome = React.useCallback(() => {
    if (!robot) return;
    setRobotJointAngles(robotId, robot.jointAngles.map(() => 0));
  }, [robot, robotId, setRobotJointAngles]);

  return {
    jointAngles: robot?.jointAngles || [],
    jointNames: robot?.info?.jointNames || [],
    jointLimits: robot?.info?.jointLimits || [],
    setJointAngle,
    setAllJointAngles,
    goToHome,
  };
}

// Re-export core components for direct use
export {
  RoboVizCore,
  Robot,
  Scene,
  Trajectory,
  Waypoint,
  WaypointGroup,
  Obstacle,
  useVizStore,
};

// Re-export types
export type {
  RoboVizCoreProps,
  SceneConfig,
  CameraState,
  RobotState,
  TrajectoryState,
  WaypointData,
  ObstacleData,
  Vector3,
};
