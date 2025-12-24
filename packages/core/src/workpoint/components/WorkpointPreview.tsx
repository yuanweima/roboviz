/**
 * WorkpointPreview Component
 *
 * Renders a semi-transparent preview of the workpoint at the current
 * mouse position on the workpiece surface. Shows the workpoint with
 * applied rotation offset.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Workpoint } from './Workpoint';
import { CameraZone } from './CameraZone';
import type { WorkpointPreviewState, WorkpointConfig } from '../types';

/**
 * Props for WorkpointPreview component
 */
export interface WorkpointPreviewProps {
  /** Preview state from store */
  preview: WorkpointPreviewState;
  /** Configuration */
  config: WorkpointConfig;
}

/**
 * WorkpointPreview component
 * Renders a semi-transparent workpoint at the preview location
 */
export const WorkpointPreview = React.memo(function WorkpointPreview({
  preview,
  config,
}: WorkpointPreviewProps) {
  if (!preview.isValid) {
    return null;
  }

  const { workpoint } = preview;

  // Apply rotation offset to quaternion
  const adjustedQuaternion = useMemo(() => {
    if (preview.rotationOffset === 0) {
      return workpoint.quaternion;
    }

    // Rotate around the Z-axis (surface normal direction)
    const currentQuat = new THREE.Quaternion(...workpoint.quaternion);

    // Get the Z-axis in local space (this is the normal direction)
    const zAxis = new THREE.Vector3(0, 0, 1);
    zAxis.applyQuaternion(currentQuat);

    // Create rotation around this axis
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(
      zAxis,
      preview.rotationOffset
    );

    // Apply rotation
    currentQuat.premultiply(rotQuat);
    currentQuat.normalize();

    return [
      currentQuat.x,
      currentQuat.y,
      currentQuat.z,
      currentQuat.w,
    ] as [number, number, number, number];
  }, [workpoint.quaternion, preview.rotationOffset]);

  // Create adjusted workpoint data for rendering
  const previewData = useMemo(
    () => ({
      ...workpoint,
      quaternion: adjustedQuaternion,
    }),
    [workpoint, adjustedQuaternion]
  );

  return (
    <group>
      {/* Main workpoint preview */}
      <Workpoint
        data={previewData}
        size={config.workpointSize}
        opacity={config.previewOpacity}
        showLabel={false}
        showOrder={false}
        showAxes={true}
      />

      {/* Camera zone preview for camera type */}
      {workpoint.type === 'camera' && (
        <CameraZone
          position={workpoint.position}
          quaternion={adjustedQuaternion}
          fov={workpoint.metadata?.cameraFOV ?? config.defaultCameraFOV}
          distance={workpoint.metadata?.cameraDistance ?? config.defaultCameraDistance}
          aspectRatio={workpoint.metadata?.cameraAspectRatio ?? config.defaultCameraAspectRatio}
          opacity={config.previewOpacity * 0.5}
          isPreview={true}
        />
      )}
    </group>
  );
});

export default WorkpointPreview;
