/**
 * RoboViz - Main React component for robot visualization
 *
 * This is the primary React component for integrating RoboViz into
 * a React application. It supports both declarative props-based
 * configuration and imperative control via the instance prop.
 */

import * as React from 'react';
import {
  RoboVizCore,
  Robot,
  Trajectory,
  Waypoint,
  Obstacle,
} from '@aspect/roboviz-core';
import { RoboVizProvider, useRoboVizStore } from '../context/RoboVizProvider';
import { RoboVizInstance } from '../core/RoboVizInstance';
import { RoboVizErrorBoundary } from './RoboVizErrorBoundary';
import type { RoboVizProps, RoboVizConfig, CameraState } from '../types';

/**
 * Internal component that renders all entities from the store
 */
function AutoRenderedEntities(): React.JSX.Element {
  const robots = useRoboVizStore((s) => s.robots);
  const trajectories = useRoboVizStore((s) => s.trajectories);
  const waypoints = useRoboVizStore((s) => s.waypoints);
  const obstacles = useRoboVizStore((s) => s.obstacles);
  const selectedWaypointId = useRoboVizStore((s) => s.selectedWaypointId);
  const selectWaypoint = useRoboVizStore((s) => s.selectWaypoint);

  return (
    <>
      {/* Render robots */}
      {Array.from(robots.values()).map((robot) => (
        <Robot
          key={robot.id}
          id={robot.id}
          urdfPath={robot.urdf}
          jointAngles={robot.jointAngles}
          showAxes={robot.options?.showAxes}
          opacity={robot.options?.opacity}
          color={robot.options?.color}
        />
      ))}

      {/* Render trajectories */}
      {Array.from(trajectories.values()).map((trajectory) => (
        <Trajectory
          key={trajectory.id}
          id={trajectory.id}
          data={trajectory.data}
          showPath={trajectory.visualization?.showPath}
          pathColor={trajectory.visualization?.pathColor}
          pathWidth={trajectory.visualization?.pathWidth}
        />
      ))}

      {/* Render waypoints */}
      {Array.from(waypoints.values()).map((waypoint) => (
        <Waypoint
          key={waypoint.id}
          data={waypoint}
          selected={waypoint.id === selectedWaypointId}
          onSelect={selectWaypoint}
        />
      ))}

      {/* Render obstacles */}
      {Array.from(obstacles.values()).map((obstacle) => (
        <Obstacle key={obstacle.id} data={obstacle} />
      ))}
    </>
  );
}

/**
 * Internal component that wraps RoboVizCore and handles events
 */
function RoboVizInner({
  instance,
  children,
  onCameraChange,
  onRobotClick,
  onRobotJointsChanged,
  onObjectSelect,
}: {
  instance: RoboVizInstance;
  children?: React.ReactNode;
  onCameraChange?: (camera: CameraState) => void;
  onRobotClick?: RoboVizProps['onRobotClick'];
  onRobotJointsChanged?: RoboVizProps['onRobotJointsChanged'];
  onObjectSelect?: RoboVizProps['onObjectSelect'];
}): React.JSX.Element {
  const scene = useRoboVizStore((s) => s.scene);
  const camera = useRoboVizStore((s) => s.camera);

  // Setup event handlers
  React.useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (onRobotClick) {
      unsubscribers.push(instance.on('robot:click', onRobotClick));
    }

    if (onRobotJointsChanged) {
      unsubscribers.push(instance.on('robot:joints-changed', onRobotJointsChanged));
    }

    if (onObjectSelect) {
      unsubscribers.push(instance.on('object:selected', onObjectSelect));
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [instance, onRobotClick, onRobotJointsChanged, onObjectSelect]);

  // Handle camera changes
  const handleCameraChange = React.useCallback(
    (newCamera: CameraState) => {
      instance.emit('camera:changed', newCamera);
      onCameraChange?.(newCamera);
    },
    [instance, onCameraChange]
  );

  // Handle object clicks
  const handleObjectClick = React.useCallback(
    (objectId: string | null) => {
      instance.emit('object:selected', { objectId });
    },
    [instance]
  );

  return (
    <RoboVizErrorBoundary
      onError={(error, errorInfo) => {
        instance.emit('error', { error, context: '3D rendering' });
        console.error('[RoboVizInner] Rendering error:', error, errorInfo);
      }}
    >
      <RoboVizCore
        config={scene}
        camera={camera}
        onCameraChange={handleCameraChange}
        onObjectClick={handleObjectClick}
        style={{ width: '100%', height: '100%' }}
      >
        <AutoRenderedEntities />
        {children}
      </RoboVizCore>
    </RoboVizErrorBoundary>
  );
}

/**
 * RoboViz - Main React component for robot visualization
 *
 * This component creates a complete 3D visualization environment for
 * displaying and controlling robots. It can be used declaratively
 * with React props or imperatively via the instance prop.
 *
 * @example Basic Usage
 * ```tsx
 * import { RoboViz, useRoboViz } from '@aspect/roboviz-react';
 *
 * function App() {
 *   return (
 *     <RoboViz
 *       width="100%"
 *       height="600px"
 *       config={{ scene: { background: '#1a1a2e' } }}
 *     >
 *       <MyCustomComponent />
 *     </RoboViz>
 *   );
 * }
 * ```
 *
 * @example With Transport
 * ```tsx
 * function RemoteControlledViz() {
 *   return (
 *     <RoboViz
 *       config={{
 *         transport: { type: 'websocket', url: 'ws://localhost:9876' },
 *         autoConnect: true,
 *       }}
 *       onConnect={() => console.log('Connected!')}
 *       onRobotClick={(e) => console.log('Robot clicked:', e.robotId)}
 *     />
 *   );
 * }
 * ```
 *
 * @example With External Instance
 * ```tsx
 * function ControlledViz() {
 *   const instanceRef = React.useRef(createRoboViz({ headless: true }));
 *
 *   React.useEffect(() => {
 *     instanceRef.current.addRobot({ urdf: '/robot.urdf' });
 *   }, []);
 *
 *   return (
 *     <RoboViz
 *       instance={instanceRef.current}
 *       width="100%"
 *       height="600px"
 *     />
 *   );
 * }
 * ```
 */
export function RoboViz({
  config,
  instance: externalInstance,
  width = '100%',
  height = '100%',
  className,
  style,
  children,
  onConnect,
  onDisconnect,
  onError,
  onRobotClick,
  onRobotJointsChanged,
  onWaypointSelect,
  onTrajectoryComplete,
  onTrajectoryProgress,
  onCameraChange,
  onObjectSelect,
}: RoboVizProps): React.ReactElement {
  // Create or use external instance
  const [internalInstance] = React.useState(() => {
    if (externalInstance) {
      return null; // Using external instance
    }
    return new RoboVizInstance(config);
  });

  const instance = (externalInstance ?? internalInstance) as RoboVizInstance;

  // Cleanup internal instance on unmount
  React.useEffect(() => {
    return () => {
      if (internalInstance && !externalInstance) {
        internalInstance.dispose();
      }
    };
  }, [internalInstance, externalInstance]);

  // Setup connection event handlers
  React.useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (onConnect) {
      unsubscribers.push(instance.on('connect', onConnect));
    }

    if (onDisconnect) {
      unsubscribers.push(
        instance.on('disconnect', (e) => onDisconnect(e.reason))
      );
    }

    if (onError) {
      unsubscribers.push(instance.on('error', (e) => onError(e.error)));
    }

    if (onWaypointSelect) {
      unsubscribers.push(instance.on('waypoint:selected', onWaypointSelect));
    }

    if (onTrajectoryComplete) {
      unsubscribers.push(instance.on('trajectory:completed', onTrajectoryComplete));
    }

    if (onTrajectoryProgress) {
      unsubscribers.push(instance.on('trajectory:progress', onTrajectoryProgress));
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [
    instance,
    onConnect,
    onDisconnect,
    onError,
    onWaypointSelect,
    onTrajectoryComplete,
    onTrajectoryProgress,
  ]);

  // Auto-connect if configured
  React.useEffect(() => {
    if (config?.autoConnect && config?.transport && config.transport.type !== 'none') {
      instance.connect().catch((error) => {
        console.error('[RoboViz] Auto-connect failed:', error);
        onError?.(error);
      });
    }
  }, [instance, config, onError]);

  // Container styles
  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    position: 'relative',
    ...style,
  };

  return (
    <div style={containerStyle} className={className}>
      <RoboVizProvider instance={instance}>
        <RoboVizInner
          instance={instance}
          onCameraChange={onCameraChange}
          onRobotClick={onRobotClick}
          onRobotJointsChanged={onRobotJointsChanged}
          onObjectSelect={onObjectSelect}
        >
          {children}
        </RoboVizInner>
      </RoboVizProvider>
    </div>
  );
}

/**
 * Headless RoboViz - State management only, no rendering
 *
 * Use this when you need the RoboViz state management and events
 * but want to use your own renderer or don't need visualization.
 *
 * @example
 * ```tsx
 * function HeadlessController() {
 *   return (
 *     <RoboVizHeadless
 *       config={{
 *         transport: { type: 'websocket', url: 'ws://localhost:9876' },
 *       }}
 *     >
 *       <MyCustomUI />
 *     </RoboVizHeadless>
 *   );
 * }
 * ```
 */
export function RoboVizHeadless({
  config,
  instance: externalInstance,
  children,
  onConnect,
  onDisconnect,
  onError,
}: Pick<
  RoboVizProps,
  'config' | 'instance' | 'children' | 'onConnect' | 'onDisconnect' | 'onError'
>): React.ReactElement {
  // Create or use external instance
  const [internalInstance] = React.useState(() => {
    if (externalInstance) {
      return null;
    }
    return new RoboVizInstance({ ...config, headless: true });
  });

  const instance = (externalInstance ?? internalInstance) as RoboVizInstance;

  // Cleanup internal instance on unmount
  React.useEffect(() => {
    return () => {
      if (internalInstance && !externalInstance) {
        internalInstance.dispose();
      }
    };
  }, [internalInstance, externalInstance]);

  // Setup connection event handlers
  React.useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (onConnect) {
      unsubscribers.push(instance.on('connect', onConnect));
    }

    if (onDisconnect) {
      unsubscribers.push(
        instance.on('disconnect', (e) => onDisconnect(e.reason))
      );
    }

    if (onError) {
      unsubscribers.push(instance.on('error', (e) => onError(e.error)));
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [instance, onConnect, onDisconnect, onError]);

  return <RoboVizProvider instance={instance}>{children}</RoboVizProvider>;
}
