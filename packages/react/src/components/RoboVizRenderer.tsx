/**
 * RoboVizRenderer - Internal component for rendering RoboViz
 *
 * This component is used internally by RoboVizInstance.mount() to
 * render the visualization. It's not exported publicly.
 */

import * as React from 'react';
import {
  RoboVizCore,
  Robot,
  Trajectory,
  Waypoint,
  Obstacle,
} from '@aspect/roboviz-core';
import { RoboVizProvider } from '../context/RoboVizProvider';
import { useRoboVizStore } from '../context/RoboVizProvider';
import type { RoboVizInstance } from '../core/RoboVizInstance';

interface RoboVizRendererProps {
  instance: RoboVizInstance;
  showStats?: boolean;
}

/**
 * Internal scene component that renders all entities from the store
 */
function AutoRenderedScene(): React.JSX.Element {
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
 * RoboVizRenderer - Renders the RoboViz visualization
 *
 * This component wraps RoboVizCore from @aspect/roboviz-core and
 * automatically renders all entities from the scoped store.
 */
export function RoboVizRenderer({
  instance,
  showStats = false,
}: RoboVizRendererProps): React.JSX.Element {
  // Get scene and camera config from store
  const scene = useRoboVizStore((s) => s.scene);
  const camera = useRoboVizStore((s) => s.camera);

  // Handle camera changes
  const handleCameraChange = React.useCallback(
    (newCamera: any) => {
      instance.emit('camera:changed', newCamera);
    },
    [instance]
  );

  // Handle object clicks
  const handleObjectClick = React.useCallback(
    (objectId: string | null) => {
      instance.emit('object:selected', { objectId });
    },
    [instance]
  );

  return (
    <RoboVizCore
      config={scene}
      camera={camera}
      showStats={showStats}
      onCameraChange={handleCameraChange}
      onObjectClick={handleObjectClick}
      style={{ width: '100%', height: '100%' }}
    >
      <AutoRenderedScene />
    </RoboVizCore>
  );
}

/**
 * Wrapped renderer with provider (for use by RoboVizInstance.mount)
 */
export function RoboVizRendererWithProvider({
  instance,
  showStats,
}: RoboVizRendererProps): React.JSX.Element {
  return (
    <RoboVizProvider instance={instance}>
      <RoboVizRenderer instance={instance} showStats={showStats} />
    </RoboVizProvider>
  );
}
