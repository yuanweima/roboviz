/**
 * CollisionObjectGizmo Component
 *
 * Wraps a collision object with TransformControls for interactive
 * position, rotation, and scale editing.
 *
 * Based on WorkpointGizmo pattern.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { CollisionObjectVisual } from './CollisionObjectVisual';
import type { CollisionObject, Transform3D } from '../world/types';

// ============================================================================
// Types
// ============================================================================

export type GizmoMode = 'translate' | 'rotate' | 'scale';

export interface CollisionObjectGizmoProps {
  /** Collision object data */
  object: CollisionObject;
  /** Gizmo mode */
  mode: GizmoMode;
  /** Whether gizmo is enabled */
  enabled?: boolean;
  /** Gizmo size */
  size?: number;
  /** Callback when transform changes */
  onTransformChange?: (id: string, transform: Transform3D) => void;
  /** Callback when dragging starts */
  onDragStart?: () => void;
  /** Callback when dragging ends */
  onDragEnd?: () => void;
  /** Click handler */
  onClick?: (id: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export const CollisionObjectGizmo = React.memo(function CollisionObjectGizmo({
  object,
  mode,
  enabled = true,
  size = 1,
  onTransformChange,
  onDragStart,
  onDragEnd,
  onClick,
}: CollisionObjectGizmoProps) {
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

  // Initialize group transform from object data (scene is Z-up, use directly)
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...object.transform.position);
      groupRef.current.quaternion.set(...object.transform.quaternion);
      if (object.transform.scale) {
        groupRef.current.scale.set(...object.transform.scale);
      }
    }
  }, [object.id]); // Only reset when object changes

  // Update from external changes (e.g., undo/redo) - only when not dragging
  useEffect(() => {
    if (groupRef.current && !isDraggingRef.current) {
      groupRef.current.position.set(...object.transform.position);
      groupRef.current.quaternion.set(...object.transform.quaternion);
      if (object.transform.scale) {
        groupRef.current.scale.set(...object.transform.scale);
      }
    }
  }, [object.transform.position, object.transform.quaternion, object.transform.scale]);

  /**
   * Commit the final transform when dragging ends
   * Scene is Z-up, so values are already in Z-up space
   */
  const commitTransform = useCallback(() => {
    if (!groupRef.current || !onTransformChange) return;

    // Get values from Three.js group (already in Z-up since scene is Z-up)
    const position = groupRef.current.position.toArray() as [number, number, number];
    const quaternion = groupRef.current.quaternion.toArray() as [number, number, number, number];
    const scale = groupRef.current.scale.toArray() as [number, number, number];

    onTransformChange(object.id, {
      position,
      quaternion,
      scale,
    });
  }, [object.id, onTransformChange]);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    onDragStart?.();
  }, [onDragStart]);

  /**
   * Handle drag end - commit transform
   */
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    commitTransform();
    onDragEnd?.();
  }, [commitTransform, onDragEnd]);

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
    onClick?.(object.id);
  }, [object.id, onClick]);

  // If gizmo is disabled, just render the visual
  if (!enabled) {
    return (
      <CollisionObjectVisual
        object={object}
        isSelected={false}
        onClick={onClick}
      />
    );
  }

  return (
    <>
      <group ref={groupRef} onClick={handleClick}>
        {/* Render object at origin since group handles transform */}
        <CollisionObjectVisual
          object={{
            ...object,
            transform: {
              position: [0, 0, 0],
              quaternion: [0, 0, 0, 1],
              scale: [1, 1, 1],
            },
          }}
          isSelected={true}
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

export default CollisionObjectGizmo;
