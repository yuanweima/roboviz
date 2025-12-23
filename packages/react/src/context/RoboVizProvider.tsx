/**
 * RoboVizProvider - React Context Provider for RoboViz
 *
 * This provider makes a RoboViz instance available to all child components,
 * enabling them to access the visualization state and actions.
 */

import * as React from 'react';
import { useStore } from 'zustand';
import type { IRoboVizInstance, RoboVizProviderProps } from '../types';
import type { ScopedVizStore, ScopedVizState } from '../store/createScopedStore';
import { RoboVizInstance } from '../core/RoboVizInstance';
import { EventBus } from '../core/EventBus';

// =============================================================================
// Context Definitions
// =============================================================================

/**
 * Context for accessing the RoboViz instance
 */
export const RoboVizInstanceContext = React.createContext<IRoboVizInstance | null>(null);

/**
 * Context for accessing the scoped Zustand store
 */
export const RoboVizStoreContext = React.createContext<ScopedVizStore | null>(null);

/**
 * Context for accessing the event bus
 */
export const RoboVizEventBusContext = React.createContext<EventBus | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

/**
 * RoboVizProvider - Makes a RoboViz instance available to child components
 *
 * @example Using with an existing instance
 * ```tsx
 * import { RoboVizProvider, createRoboViz } from '@aspect/roboviz-react';
 *
 * const instance = createRoboViz({ headless: true });
 *
 * function App() {
 *   return (
 *     <RoboVizProvider instance={instance}>
 *       <RoboVizCanvas />
 *       <ControlPanel />
 *     </RoboVizProvider>
 *   );
 * }
 * ```
 */
export function RoboVizProvider({
  instance,
  children,
}: RoboVizProviderProps): React.ReactElement {
  // Get internal store and event bus from instance
  const store = React.useMemo(() => {
    if (instance instanceof RoboVizInstance) {
      return instance.getStore();
    }
    // Fallback for interface-only instances (shouldn't happen in practice)
    return null;
  }, [instance]);

  const eventBus = React.useMemo(() => {
    if (instance instanceof RoboVizInstance) {
      return instance.getEventBus();
    }
    return null;
  }, [instance]);

  if (!store) {
    console.warn('[RoboVizProvider] Instance does not expose internal store');
  }

  return (
    <RoboVizInstanceContext.Provider value={instance}>
      <RoboVizStoreContext.Provider value={store}>
        <RoboVizEventBusContext.Provider value={eventBus}>
          {children}
        </RoboVizEventBusContext.Provider>
      </RoboVizStoreContext.Provider>
    </RoboVizInstanceContext.Provider>
  );
}

// =============================================================================
// Context Hooks
// =============================================================================

/**
 * Hook to access the RoboViz instance
 *
 * @throws Error if used outside of RoboVizProvider
 *
 * @example
 * ```tsx
 * function ControlPanel() {
 *   const instance = useRoboVizInstance();
 *
 *   return (
 *     <button onClick={() => instance.reset()}>
 *       Reset Scene
 *     </button>
 *   );
 * }
 * ```
 */
export function useRoboVizInstance(): IRoboVizInstance {
  const instance = React.useContext(RoboVizInstanceContext);

  if (!instance) {
    throw new Error(
      'useRoboVizInstance must be used within a RoboVizProvider. ' +
      'Make sure your component is wrapped with <RoboVizProvider> or <RoboViz>.'
    );
  }

  return instance;
}

/**
 * Hook to access the RoboViz instance, returning null if not available
 * Useful for optional integration scenarios
 */
export function useRoboVizInstanceOptional(): IRoboVizInstance | null {
  return React.useContext(RoboVizInstanceContext);
}

/**
 * Hook to select state from the scoped store
 *
 * @param selector - Function to select a slice of state
 * @param equalityFn - Optional equality function for optimization
 * @throws Error if used outside of RoboVizProvider
 *
 * @example
 * ```tsx
 * function RobotList() {
 *   const robots = useRoboVizStore((state) => state.robots);
 *
 *   return (
 *     <ul>
 *       {Array.from(robots.values()).map((robot) => (
 *         <li key={robot.id}>{robot.id}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useRoboVizStore<T>(
  selector: (state: ScopedVizState) => T
): T {
  const store = React.useContext(RoboVizStoreContext);

  if (!store) {
    throw new Error(
      'useRoboVizStore must be used within a RoboVizProvider. ' +
      'Make sure your component is wrapped with <RoboVizProvider> or <RoboViz>.'
    );
  }

  return useStore(store, selector);
}

/**
 * Hook to access the event bus
 *
 * @throws Error if used outside of RoboVizProvider
 */
export function useRoboVizEventBus(): EventBus {
  const eventBus = React.useContext(RoboVizEventBusContext);

  if (!eventBus) {
    throw new Error(
      'useRoboVizEventBus must be used within a RoboVizProvider. ' +
      'Make sure your component is wrapped with <RoboVizProvider> or <RoboViz>.'
    );
  }

  return eventBus;
}

// =============================================================================
// Store Access Hooks
// =============================================================================

/**
 * Hook to access store actions
 *
 * Returns all action functions from the store, allowing components
 * to dispatch state changes.
 *
 * @example
 * ```tsx
 * function AddRobotButton() {
 *   const actions = useRoboVizActions();
 *
 *   const handleAdd = () => {
 *     actions.addRobot({
 *       id: 'robot-1',
 *       urdf: '/models/robot.urdf',
 *       jointAngles: [0, 0, 0, 0, 0, 0],
 *       transform: { position: { x: 0, y: 0, z: 0 }, rotation: { w: 1, x: 0, y: 0, z: 0 } },
 *       options: {},
 *     });
 *   };
 *
 *   return <button onClick={handleAdd}>Add Robot</button>;
 * }
 * ```
 */
export function useRoboVizActions() {
  const store = React.useContext(RoboVizStoreContext);

  if (!store) {
    throw new Error(
      'useRoboVizActions must be used within a RoboVizProvider.'
    );
  }

  // Get actions from store - these are stable references
  const state = store.getState();

  return React.useMemo(
    () => ({
      setScene: state.setScene,
      setCamera: state.setCamera,
      addRobot: state.addRobot,
      removeRobot: state.removeRobot,
      updateRobot: state.updateRobot,
      setRobotJointAngles: state.setRobotJointAngles,
      addTrajectory: state.addTrajectory,
      removeTrajectory: state.removeTrajectory,
      updateTrajectory: state.updateTrajectory,
      setPlayback: state.setPlayback,
      addWaypoint: state.addWaypoint,
      removeWaypoint: state.removeWaypoint,
      selectWaypoint: state.selectWaypoint,
      clearWaypoints: state.clearWaypoints,
      addObstacle: state.addObstacle,
      removeObstacle: state.removeObstacle,
      clearObstacles: state.clearObstacles,
      selectObject: state.selectObject,
      hoverObject: state.hoverObject,
      reset: state.reset,
    }),
    [state]
  );
}

// =============================================================================
// Convenience State Hooks
// =============================================================================

/**
 * Hook to access robots map
 */
export function useRobots() {
  return useRoboVizStore((state) => state.robots);
}

/**
 * Hook to access trajectories map
 */
export function useTrajectories() {
  return useRoboVizStore((state) => state.trajectories);
}

/**
 * Hook to access waypoints map
 */
export function useWaypoints() {
  return useRoboVizStore((state) => state.waypoints);
}

/**
 * Hook to access obstacles map
 */
export function useObstacles() {
  return useRoboVizStore((state) => state.obstacles);
}

/**
 * Hook to access playback state
 */
export function usePlaybackState() {
  return useRoboVizStore((state) => state.playback);
}

/**
 * Hook to access scene config
 */
export function useSceneConfig() {
  return useRoboVizStore((state) => state.scene);
}

/**
 * Hook to access camera state
 */
export function useCameraState() {
  return useRoboVizStore((state) => state.camera);
}

/**
 * Hook to access selected object ID
 */
export function useSelectedObjectId() {
  return useRoboVizStore((state) => state.selectedObjectId);
}

/**
 * Hook to access selected waypoint ID
 */
export function useSelectedWaypointId() {
  return useRoboVizStore((state) => state.selectedWaypointId);
}

/**
 * Hook to check if instance is connected
 */
export function useIsConnected(): boolean {
  const instance = useRoboVizInstance();
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

  return isConnected;
}
