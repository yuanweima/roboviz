/**
 * useRoboViz - Main hook for RoboViz integration
 *
 * This hook provides access to the RoboViz instance, state, and actions
 * in a convenient, unified API.
 */

import * as React from 'react';
import {
  useRoboVizInstance,
  useRoboVizStore,
} from '../context/RoboVizProvider';
import type {
  UseRoboVizReturn,
  AddRobotConfig,
  AddTrajectoryConfig,
  AddWaypointConfig,
  AddObstacleConfig,
  PlayTrajectoryOptions,
  SceneConfig,
  CameraState,
} from '../types';

/**
 * Main hook for accessing RoboViz functionality
 *
 * This hook provides a complete API for controlling the visualization,
 * including state access and all available actions.
 *
 * @returns Object containing instance, state, and actions
 *
 * @example Basic Usage
 * ```tsx
 * function RobotController() {
 *   const {
 *     robots,
 *     addRobot,
 *     setRobotJoints,
 *     isConnected,
 *   } = useRoboViz();
 *
 *   const handleAddRobot = () => {
 *     const id = addRobot({
 *       urdf: '/models/fanuc.urdf',
 *     });
 *     console.log('Added robot:', id);
 *   };
 *
 *   return (
 *     <div>
 *       <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
 *       <p>Robots: {robots.size}</p>
 *       <button onClick={handleAddRobot}>Add Robot</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Trajectory Playback
 * ```tsx
 * function TrajectoryControls() {
 *   const {
 *     trajectories,
 *     playback,
 *     playTrajectory,
 *     pauseTrajectory,
 *     stopTrajectory,
 *   } = useRoboViz();
 *
 *   const trajectoryId = Array.from(trajectories.keys())[0];
 *
 *   return (
 *     <div>
 *       <p>Playing: {playback.isPlaying ? 'Yes' : 'No'}</p>
 *       <p>Time: {playback.currentTime.toFixed(2)}s</p>
 *       <button onClick={() => playTrajectory(trajectoryId)}>Play</button>
 *       <button onClick={pauseTrajectory}>Pause</button>
 *       <button onClick={stopTrajectory}>Stop</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRoboViz(): UseRoboVizReturn {
  const instance = useRoboVizInstance();

  // Select state slices from store
  const robots = useRoboVizStore((state) => state.robots);
  const trajectories = useRoboVizStore((state) => state.trajectories);
  const waypoints = useRoboVizStore((state) => state.waypoints);
  const obstacles = useRoboVizStore((state) => state.obstacles);
  const playback = useRoboVizStore((state) => state.playback);
  const scene = useRoboVizStore((state) => state.scene);
  const camera = useRoboVizStore((state) => state.camera);
  const selectedObjectId = useRoboVizStore((state) => state.selectedObjectId);
  const selectedWaypointId = useRoboVizStore((state) => state.selectedWaypointId);

  // Track connection state
  const [isConnected, setIsConnected] = React.useState(instance.isConnected);

  React.useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const unsubConnect = instance.on('connect', handleConnect);
    const unsubDisconnect = instance.on('disconnect', handleDisconnect);

    // Sync initial state
    setIsConnected(instance.isConnected);

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, [instance]);

  // Memoize action wrappers
  const addRobot = React.useCallback(
    (config: AddRobotConfig) => instance.addRobot(config),
    [instance]
  );

  const removeRobot = React.useCallback(
    (robotId: string) => instance.removeRobot(robotId),
    [instance]
  );

  const setRobotJoints = React.useCallback(
    (robotId: string, angles: number[]) => instance.setRobotJoints(robotId, angles),
    [instance]
  );

  const addTrajectory = React.useCallback(
    (config: AddTrajectoryConfig) => instance.addTrajectory(config),
    [instance]
  );

  const removeTrajectory = React.useCallback(
    (trajectoryId: string) => instance.removeTrajectory(trajectoryId),
    [instance]
  );

  const playTrajectory = React.useCallback(
    (trajectoryId: string, options?: PlayTrajectoryOptions) =>
      instance.playTrajectory(trajectoryId, options),
    [instance]
  );

  const pauseTrajectory = React.useCallback(
    () => instance.pauseTrajectory(),
    [instance]
  );

  const stopTrajectory = React.useCallback(
    () => instance.stopTrajectory(),
    [instance]
  );

  const addWaypoint = React.useCallback(
    (config: AddWaypointConfig) => instance.addWaypoint(config),
    [instance]
  );

  const removeWaypoint = React.useCallback(
    (waypointId: string) => instance.removeWaypoint(waypointId),
    [instance]
  );

  const clearWaypoints = React.useCallback(
    () => instance.clearWaypoints(),
    [instance]
  );

  const selectWaypoint = React.useCallback(
    (waypointId: string | null) => {
      // Use store action for selection
      const store = (instance as any).getStore?.();
      if (store) {
        store.getState().selectWaypoint(waypointId);
      }
    },
    [instance]
  );

  const addObstacle = React.useCallback(
    (config: AddObstacleConfig) => instance.addObstacle(config),
    [instance]
  );

  const removeObstacle = React.useCallback(
    (obstacleId: string) => instance.removeObstacle(obstacleId),
    [instance]
  );

  const clearObstacles = React.useCallback(
    () => instance.clearObstacles(),
    [instance]
  );

  const setScene = React.useCallback(
    (config: Partial<SceneConfig>) => instance.setScene(config),
    [instance]
  );

  const setCamera = React.useCallback(
    (config: Partial<CameraState>) => instance.setCamera(config),
    [instance]
  );

  const resetCamera = React.useCallback(
    () => instance.resetCamera(),
    [instance]
  );

  const reset = React.useCallback(
    () => instance.reset(),
    [instance]
  );

  const connect = React.useCallback(
    () => instance.connect(),
    [instance]
  );

  const disconnect = React.useCallback(
    () => instance.disconnect(),
    [instance]
  );

  return {
    instance,
    isConnected,

    // State
    robots,
    trajectories,
    waypoints,
    obstacles,
    playback,
    scene,
    camera,
    selectedObjectId,
    selectedWaypointId,

    // Robot actions
    addRobot,
    removeRobot,
    setRobotJoints,

    // Trajectory actions
    addTrajectory,
    removeTrajectory,
    playTrajectory,
    pauseTrajectory,
    stopTrajectory,

    // Waypoint actions
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    selectWaypoint,

    // Obstacle actions
    addObstacle,
    removeObstacle,
    clearObstacles,

    // Scene/Camera actions
    setScene,
    setCamera,
    resetCamera,

    // General actions
    reset,
    connect,
    disconnect,
  };
}
