/**
 * WaypointPathRenderer Component
 *
 * Renders the complete waypoint path including all waypoints,
 * connection lines, and optional Gizmo editing.
 */

import React, { useCallback, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { PlanningWaypointVisual } from './PlanningWaypointVisual';
import { PlanningWaypointGizmo, type GizmoMode } from './PlanningWaypointGizmo';
import type { PlanningWaypoint, Pose3D, WaypointVisualization } from '../types';
import { DEFAULT_WAYPOINT_VISUALIZATION } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface WaypointPathRendererProps {
  /** Waypoints in order */
  waypoints: PlanningWaypoint[];
  /** Currently selected waypoint ID */
  selectedId: string | null;
  /** Whether editing is enabled */
  editingEnabled?: boolean;
  /** Current gizmo mode */
  gizmoMode?: GizmoMode;
  /** Gizmo size */
  gizmoSize?: number;
  /** Whether path is closed loop */
  isClosedLoop?: boolean;
  /** Visualization configuration */
  visualization?: Partial<WaypointVisualization>;
  /** Callback when waypoint is selected */
  onSelect?: (id: string | null) => void;
  /** Callback when waypoint pose changes */
  onPoseChange?: (id: string, pose: Pose3D) => void;
  /** Callback when dragging starts */
  onDragStart?: () => void;
  /** Callback when dragging ends */
  onDragEnd?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const WaypointPathRenderer = React.memo(function WaypointPathRenderer({
  waypoints,
  selectedId,
  editingEnabled = true,
  gizmoMode = 'translate',
  gizmoSize = 0.8,
  isClosedLoop = false,
  visualization: userVisualization,
  onSelect,
  onPoseChange,
  onDragStart,
  onDragEnd,
}: WaypointPathRendererProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const visualization = useMemo(
    () => ({ ...DEFAULT_WAYPOINT_VISUALIZATION, ...userVisualization }),
    [userVisualization]
  );

  const handleClick = useCallback(
    (id: string) => {
      console.log('[WaypointPathRenderer] handleClick:', id);
      onSelect?.(id);
    },
    [onSelect]
  );

  const handleBackgroundClick = useCallback((e: any) => {
    // Only deselect if we clicked directly on the background group, not on a waypoint
    // Since groups have no geometry, this handler should not fire from clicks on child meshes
    // if stopPropagation is called correctly. But as a safety check:
    console.log('[WaypointPathRenderer] background click - stopped:', e.stopped);
    if (!e.stopped) {
      onSelect?.(null);
    }
  }, [onSelect]);

  const handlePointerEnter = useCallback((id: string) => {
    setHoveredId(id);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  // Build connection line points (scene is Z-up, use positions directly)
  const connectionPoints = useMemo(() => {
    if (!visualization.showConnections || waypoints.length < 2) return null;

    const points: THREE.Vector3[] = waypoints
      .filter((wp) => wp.enabled)
      .map((wp) => new THREE.Vector3(...wp.pose.position));

    // Add first point again if closed loop
    if (isClosedLoop && points.length > 2) {
      points.push(points[0].clone());
    }

    return points;
  }, [waypoints, isClosedLoop, visualization.showConnections]);

  return (
    <group>
      {/* Connection lines */}
      {connectionPoints && connectionPoints.length >= 2 && (
        <Line
          points={connectionPoints}
          color="#6366f1"
          lineWidth={visualization.connectionWidth}
          dashed={visualization.connectionStyle === 'dashed'}
          dashSize={0.05}
          gapSize={0.03}
        />
      )}

      {/* Waypoints */}
      {waypoints.map((waypoint) => {
        const isSelected = waypoint.id === selectedId;

        // If selected and editing enabled, show gizmo
        if (isSelected && editingEnabled && waypoint.enabled) {
          return (
            <PlanningWaypointGizmo
              key={waypoint.id}
              waypoint={waypoint}
              mode={gizmoMode}
              enabled={true}
              size={gizmoSize}
              onPoseChange={onPoseChange}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={handleClick}
              showLabel={visualization.showLabel}
              showOrder={visualization.showOrder}
            />
          );
        }

        // Otherwise, just render the visual
        return (
          <PlanningWaypointVisual
            key={waypoint.id}
            waypoint={waypoint}
            isSelected={isSelected}
            isHovered={waypoint.id === hoveredId}
            radius={visualization.radius}
            showAxes={visualization.showAxes}
            axesLength={visualization.axesLength}
            showLabel={visualization.showLabel}
            showOrder={visualization.showOrder}
            onClick={handleClick}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />
        );
      })}
    </group>
  );
});

export default WaypointPathRenderer;
