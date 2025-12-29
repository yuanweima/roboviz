/**
 * PlanningWaypointGizmo Component
 *
 * Wraps a planning waypoint with TransformControls for interactive editing.
 * Based on WorkpointGizmo pattern.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { PlanningWaypointVisual } from './PlanningWaypointVisual';
import type { PlanningWaypoint, Pose3D } from '../types';

// ============================================================================
// Types
// ============================================================================

export type GizmoMode = 'translate' | 'rotate';

export interface PlanningWaypointGizmoProps {
  /** Waypoint data */
  waypoint: PlanningWaypoint;
  /** Gizmo mode */
  mode: GizmoMode;
  /** Whether gizmo is enabled */
  enabled?: boolean;
  /** Gizmo size */
  size?: number;
  /** Callback when pose changes */
  onPoseChange?: (id: string, pose: Pose3D) => void;
  /** Callback when dragging starts */
  onDragStart?: () => void;
  /** Callback when dragging ends */
  onDragEnd?: () => void;
  /** Click handler */
  onClick?: (id: string) => void;
  /** Show label */
  showLabel?: boolean;
  /** Show order */
  showOrder?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const PlanningWaypointGizmo = React.memo(function PlanningWaypointGizmo({
  waypoint,
  mode,
  enabled = true,
  size = 0.8,
  onPoseChange,
  onDragStart,
  onDragEnd,
  onClick,
  showLabel = true,
  showOrder = true,
}: PlanningWaypointGizmoProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const controlsRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const [attached, setAttached] = React.useState(false);

  // Force re-render when group is mounted to attach TransformControls
  React.useEffect(() => {
    if (groupRef.current) {
      setAttached(true);
    }
  }, []);

  // Initialize group transform from waypoint data (scene is Z-up, use directly)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...waypoint.pose.position);
      groupRef.current.quaternion.set(...waypoint.pose.orientation);
    }
  }, [waypoint.id]); // Only reset when waypoint changes

  // Update from external changes - only when not dragging
  useEffect(() => {
    if (groupRef.current && !isDraggingRef.current) {
      groupRef.current.position.set(...waypoint.pose.position);
      groupRef.current.quaternion.set(...waypoint.pose.orientation);
    }
  }, [waypoint.pose.position, waypoint.pose.orientation]);

  /**
   * Commit the final pose when dragging ends
   * Scene is Z-up, so values are already in Z-up space
   */
  const commitPose = useCallback(() => {
    if (!groupRef.current || !onPoseChange) return;

    // Get values from Three.js group (already in Z-up since scene is Z-up)
    const position = groupRef.current.position.toArray() as [number, number, number];
    const orientation = groupRef.current.quaternion.toArray() as [number, number, number, number];

    onPoseChange(waypoint.id, { position, orientation });
  }, [waypoint.id, onPoseChange]);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    onDragStart?.();
  }, [onDragStart]);

  /**
   * Handle drag end - commit pose
   */
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    commitPose();
    onDragEnd?.();
  }, [commitPose, onDragEnd]);

  // Attach event listeners to TransformControls
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const onDraggingChanged = (event: { value: boolean }) => {
      if (event.value) {
        handleDragStart();
      } else {
        handleDragEnd();
      }
    };

    controls.addEventListener('dragging-changed', onDraggingChanged);

    return () => {
      controls.removeEventListener('dragging-changed', onDraggingChanged);
    };
  }, [handleDragStart, handleDragEnd]);

  // Handle click
  const handleClick = useCallback(() => {
    onClick?.(waypoint.id);
  }, [waypoint.id, onClick]);

  // If gizmo is disabled, just render the visual
  if (!enabled) {
    return (
      <PlanningWaypointVisual
        waypoint={waypoint}
        isSelected={false}
        onClick={onClick}
        showLabel={showLabel}
        showOrder={showOrder}
      />
    );
  }

  return (
    <>
      <group ref={groupRef} onClick={handleClick}>
        {/* Render waypoint at origin since group handles transform */}
        <PlanningWaypointVisual
          waypoint={{
            ...waypoint,
            pose: {
              position: [0, 0, 0],
              orientation: [0, 0, 0, 1],
            },
          }}
          isSelected={true}
          showLabel={showLabel}
          showOrder={showOrder}
        />
      </group>
      {attached && groupRef.current && (
        <TransformControls
          ref={controlsRef}
          object={groupRef.current}
          mode={mode}
          size={size}
          showX={true}
          showY={true}
          showZ={true}
          space="local"
        />
      )}
    </>
  );
});

export default PlanningWaypointGizmo;
