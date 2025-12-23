/**
 * Waypoint - Position marker component
 *
 * Shows waypoint markers for robot motion planning.
 *
 * @example
 * ```tsx
 * // Single waypoint
 * <Waypoint position={[0.5, 0.3, 0.2]} label="P1" />
 *
 * // Multiple waypoints with connections
 * <Waypoints
 *   points={[
 *     { position: [0, 0.3, 0.2], label: 'Start' },
 *     { position: [0.5, 0.4, 0.3], label: 'Via' },
 *     { position: [0.8, 0.3, 0.1], label: 'End' },
 *   ]}
 *   showConnections
 * />
 * ```
 */

import * as React from 'react';
import {
  Waypoint as CoreWaypoint,
  WaypointGroup,
  type WaypointData,
} from '@aspect/roboviz-core';

export interface WaypointProps {
  /** Unique identifier */
  id?: string;

  /** Position [x, y, z] */
  position: [number, number, number];

  /** Waypoint label */
  label?: string;

  /** Color (default: '#ffff00') */
  color?: string;

  /** Size (default: 0.02) */
  size?: number;

  /** Show coordinate axes */
  showAxes?: boolean;

  /** Selected state */
  selected?: boolean;

  /** Called when clicked */
  onClick?: (id: string) => void;
}

/**
 * Waypoint - Single waypoint marker
 */
export function Waypoint({
  id,
  position,
  label,
  color = '#ffff00',
  size = 0.02,
  showAxes = false,
  selected = false,
  onClick,
}: WaypointProps): React.JSX.Element {
  // Generate stable ID
  const waypointId = React.useMemo(
    () => id || `waypoint_${Math.random().toString(36).slice(2, 9)}`,
    [id]
  );

  // Create waypoint data
  const waypointData: WaypointData = {
    id: waypointId,
    robotId: 'default',
    jointAngles: [],
    tcpPose: {
      position: { x: position[0], y: position[1], z: position[2] },
      orientation: { w: 1, x: 0, y: 0, z: 0 },
    },
    label,
    color,
  };

  return (
    <CoreWaypoint
      data={waypointData}
      showLabel={!!label}
      showAxes={showAxes}
      selected={selected}
      onClick={() => onClick?.(waypointId)}
    />
  );
}

// Types for Waypoints component
interface WaypointPoint {
  id?: string;
  position: [number, number, number];
  label?: string;
  color?: string;
}

export interface WaypointsProps {
  /** Array of waypoint definitions */
  points: WaypointPoint[];

  /** Show connection lines between waypoints */
  showConnections?: boolean;

  /** Show labels (default: true) */
  showLabels?: boolean;

  /** Show axes on each waypoint */
  showAxes?: boolean;

  /** Default color for all waypoints */
  color?: string;

  /** Currently selected waypoint ID */
  selectedId?: string;

  /** Called when a waypoint is selected */
  onSelect?: (id: string) => void;
}

/**
 * Waypoints - Multiple waypoints with optional connections
 */
export function Waypoints({
  points,
  showConnections = false,
  showLabels = true,
  showAxes = false,
  color = '#ffff00',
  selectedId,
  onSelect,
}: WaypointsProps): React.JSX.Element {
  // Convert points to WaypointData
  const waypointData: WaypointData[] = React.useMemo(
    () =>
      points.map((point, index) => ({
        id: point.id || `wp_${index}`,
        robotId: 'default',
        jointAngles: [],
        tcpPose: {
          position: { x: point.position[0], y: point.position[1], z: point.position[2] },
          orientation: { w: 1, x: 0, y: 0, z: 0 },
        },
        label: point.label,
        color: point.color || color,
      })),
    [points, color]
  );

  return (
    <WaypointGroup
      waypoints={waypointData}
      selectedId={selectedId}
      onSelect={onSelect}
      showLabels={showLabels}
      showAxes={showAxes}
      showConnections={showConnections}
    />
  );
}

export default Waypoint;
