/**
 * WorkpointGizmo Component
 *
 * Wraps a workpoint with TransformControls for interactive
 * position and rotation editing.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { Workpoint } from './Workpoint';
import { CameraZone } from './CameraZone';
import type {
  Workpoint as WorkpointData,
  GizmoMode,
  WorkpointConfig,
  WorkpointUpdateData,
} from '../types';

/**
 * Props for WorkpointGizmo component
 */
export interface WorkpointGizmoProps {
  /** Workpoint data */
  data: WorkpointData;
  /** Gizmo mode: translate or rotate */
  mode: GizmoMode;
  /** Configuration */
  config: WorkpointConfig;
  /** Whether gizmo is enabled */
  enabled?: boolean;
  /** Callback when workpoint is changed */
  onChange?: (update: WorkpointUpdateData) => void;
  /** Callback when dragging starts */
  onDragStart?: () => void;
  /** Callback when dragging ends */
  onDragEnd?: () => void;
}

/**
 * WorkpointGizmo component
 * Provides interactive transform controls for editing workpoint position/rotation
 */
export const WorkpointGizmo = React.memo(function WorkpointGizmo({
  data,
  mode,
  config,
  enabled = true,
  onChange,
  onDragStart,
  onDragEnd,
}: WorkpointGizmoProps) {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const isDraggingRef = useRef(false);

  // Initialize group transform from workpoint data
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...data.position);
      groupRef.current.quaternion.set(...data.quaternion);
    }
  }, [data.id]); // Only reset when workpoint changes, not on every data update

  // Update from external changes (e.g., undo/redo) - only when not dragging
  useEffect(() => {
    if (groupRef.current && !isDraggingRef.current) {
      groupRef.current.position.set(...data.position);
      groupRef.current.quaternion.set(...data.quaternion);
    }
  }, [data.position, data.quaternion]);

  /**
   * Commit the final transform when dragging ends
   */
  const commitTransform = useCallback(() => {
    if (!groupRef.current || !onChange) return;

    const position = groupRef.current.position.toArray() as [number, number, number];
    const quaternion = groupRef.current.quaternion.toArray() as [
      number,
      number,
      number,
      number
    ];

    onChange({
      id: data.id,
      position,
      quaternion,
    });
  }, [data.id, onChange]);

  /**
   * Handle drag start
   * Note: OrbitControls with makeDefault is automatically disabled by TransformControls
   */
  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    onDragStart?.();
  }, [onDragStart]);

  /**
   * Handle drag end - commit transform
   * Note: OrbitControls with makeDefault is automatically re-enabled by TransformControls
   */
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    // Commit the transform only when dragging ends
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

  if (!enabled || !config.enableGizmo) {
    // Render workpoint without gizmo
    return (
      <group position={data.position} quaternion={new THREE.Quaternion(...data.quaternion)}>
        <Workpoint
          data={{ ...data, position: [0, 0, 0], quaternion: [0, 0, 0, 1] }}
          isSelected={true}
          size={config.workpointSize}
          showLabel={config.showLabels}
          showOrder={config.showOrder}
        />
        {data.type === 'camera' && (
          <CameraZone
            position={[0, 0, 0]}
            quaternion={[0, 0, 0, 1]}
            fov={data.metadata?.cameraFOV ?? config.defaultCameraFOV}
            distance={data.metadata?.cameraDistance ?? config.defaultCameraDistance}
            aspectRatio={data.metadata?.cameraAspectRatio ?? config.defaultCameraAspectRatio}
            opacity={0.3}
          />
        )}
      </group>
    );
  }

  return (
    <TransformControls
      ref={controlsRef}
      object={groupRef}
      mode={mode}
      size={config.gizmoSize}
      showX={true}
      showY={true}
      showZ={true}
      space="local"
    >
      <group ref={groupRef}>
        {/* Render workpoint at origin since group handles transform */}
        <Workpoint
          data={{ ...data, position: [0, 0, 0], quaternion: [0, 0, 0, 1] }}
          isSelected={true}
          size={config.workpointSize}
          showLabel={config.showLabels}
          showOrder={config.showOrder}
        />

        {/* Camera zone for camera type */}
        {data.type === 'camera' && (
          <CameraZone
            position={[0, 0, 0]}
            quaternion={[0, 0, 0, 1]}
            fov={data.metadata?.cameraFOV ?? config.defaultCameraFOV}
            distance={data.metadata?.cameraDistance ?? config.defaultCameraDistance}
            aspectRatio={data.metadata?.cameraAspectRatio ?? config.defaultCameraAspectRatio}
            opacity={0.3}
          />
        )}
      </group>
    </TransformControls>
  );
});

export default WorkpointGizmo;
