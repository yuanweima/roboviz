/**
 * WorkpointManager Component
 *
 * Main component that orchestrates the workpoint system.
 * Handles mode switching, mouse events, keyboard shortcuts,
 * and renders all workpoints with their controls.
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Workpoint } from './Workpoint';
import { WorkpointPreview } from './WorkpointPreview';
import { WorkpointGizmo } from './WorkpointGizmo';
import { CameraZone } from './CameraZone';
import { useWorkpointRaycast, createWorkpointOrientation, createTiltedWorkpointOrientation } from '../hooks/useWorkpointRaycast';
import { useWorkpointShortcuts } from '../hooks/useWorkpointShortcuts';
import { useWorkpointNudge } from '../hooks/useWorkpointNudge';
import {
  useWorkpointStore,
  useWorkpointMode,
  useWorkpointPreview,
  useSelectedWorkpointId,
  useHoveredWorkpointId,
  useVisibleWorkpoints,
  useWorkpointConfig,
  useWorkpointDisplayConfig,
  useWorkpointGroups,
} from '../store';
import type {
  WorkpointManagerProps,
  Workpoint as WorkpointData,
  WorkpointCreateData,
  WorkpointUpdateData,
  WorkpointPreviewState,
  WorkpointGroup,
} from '../types';
import { WORKPOINT_COLORS } from '../types';

/**
 * WorkpointManager component
 * Orchestrates the entire workpoint system
 */
export function WorkpointManager({
  workpieceIds,
  initialWorkpoints,
  activeRobotId,
  config: configOverrides,
  callbacks,
  enabled = true,
}: WorkpointManagerProps) {
  const { scene, gl } = useThree();
  const store = useWorkpointStore;

  // Get state from store
  const mode = useWorkpointMode();
  const preview = useWorkpointPreview();
  const selectedId = useSelectedWorkpointId();
  const hoveredId = useHoveredWorkpointId();
  const workpoints = useVisibleWorkpoints(); // Only visible workpoints
  const groups = useWorkpointGroups();
  const config = useWorkpointConfig();
  const displayConfig = useWorkpointDisplayConfig();
  const gizmoMode = useWorkpointStore((s) => s.gizmoMode);
  const currentType = useWorkpointStore((s) => s.currentType);

  // Create groups map for quick lookup
  const groupsMap = useMemo(() => {
    const map = new Map<string, WorkpointGroup>();
    for (const group of groups) {
      map.set(group.id, group);
    }
    return map;
  }, [groups]);

  // Refs for workpiece objects
  const workpieceRefs = useRef<Map<string, THREE.Object3D>>(new Map());

  /**
   * Find workpiece objects in scene
   */
  useEffect(() => {
    const findWorkpieces = () => {
      workpieceRefs.current.clear();

      for (const id of workpieceIds) {
        // Try to find by name or userData
        scene.traverse((obj) => {
          if (
            obj.name === id ||
            obj.name === `workpiece_${id}` ||
            obj.userData?.workpieceId === id
          ) {
            workpieceRefs.current.set(id, obj);
          }
        });
      }
    };

    findWorkpieces();

    // Re-find when scene changes
    const interval = setInterval(findWorkpieces, 1000);
    return () => clearInterval(interval);
  }, [scene, workpieceIds]);

  /**
   * Apply config overrides
   */
  useEffect(() => {
    if (configOverrides) {
      store.getState().setConfig(configOverrides);
    }
  }, [configOverrides]);

  /**
   * Load initial workpoints
   */
  useEffect(() => {
    if (initialWorkpoints && initialWorkpoints.length > 0) {
      const state = store.getState();
      for (const wp of initialWorkpoints) {
        // Add directly to avoid duplicate event emission
        state.workpoints.set(wp.id, wp);
      }
      // Force re-render
      store.setState({ workpoints: new Map(state.workpoints) });
    }
  }, []); // Only on mount

  /**
   * Get target objects for raycasting
   */
  const raycastTargets = useMemo(() => {
    return Array.from(workpieceRefs.current.values());
  }, [workpieceIds]);

  /**
   * Setup raycasting
   */
  const { raycast, normalToQuaternion } = useWorkpointRaycast({
    targets: raycastTargets,
    enabled: enabled && mode === 'edit',
  });

  /**
   * Calculate workpoint position based on type
   * All types use the hit position (surface position) directly.
   * For camera type, the camera optical center is calculated from surface position + cameraDistance
   * during visualization and export, making it easier to recalculate when camera parameters change.
   */
  const calculateWorkpointPosition = useCallback(
    (hitPosition: [number, number, number], _normal: [number, number, number], _type: string): [number, number, number] => {
      // All types: position at hit point (workpiece surface)
      // For camera type, the optical center offset is handled in CameraZone visualization
      return hitPosition;
    },
    []
  );

  /**
   * Determine if Z-axis should point into surface based on workpoint type
   * Standard convention: Z points ALONG the normal (outward) - the "approach direction"
   * This matches industrial robot tool frame conventions where Z is the approach direction
   */
  const shouldFlipZ = useCallback((_type: string): boolean => {
    // Use standard approach convention for all types: Z points away from surface
    return false;
  }, []);

  /**
   * Handle mouse move for preview
   */
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!enabled || mode !== 'edit') return;

      const hit = raycast(event);

      if (hit) {
        const state = store.getState();
        const rotationOffset = state.preview?.rotationOffset ?? 0;
        const { lockTiltAngle, defaultTiltAngle } = state.displayConfig;
        const flipZ = shouldFlipZ(currentType);

        // Create preview workpoint orientation
        // Use tilted orientation when tilt is locked (for welding etc.)
        const quaternion = lockTiltAngle && defaultTiltAngle !== 0
          ? createTiltedWorkpointOrientation(hit.normal, defaultTiltAngle, rotationOffset, flipZ)
          : createWorkpointOrientation(hit.normal, rotationOffset, flipZ);

        // Calculate workpoint position (may be offset for camera type)
        const position = calculateWorkpointPosition(hit.position, hit.normal, currentType);

        const previewWorkpoint: WorkpointData = {
          id: 'preview',
          type: currentType,
          position, // Always the surface position for all types
          quaternion,
          workpieceId: hit.workpieceId,
          surfaceNormal: hit.normal,
          localPosition: hit.localPosition,
          enabled: true,
        };

        const previewState: WorkpointPreviewState = {
          workpoint: previewWorkpoint,
          isValid: true,
          rotationOffset,
        };

        state.setPreview(previewState);
      } else {
        // Clear preview when not over workpiece
        if (store.getState().preview?.isValid) {
          store.getState().setPreview({
            ...store.getState().preview!,
            isValid: false,
          });
        }
      }
    },
    [enabled, mode, currentType, raycast, calculateWorkpointPosition, shouldFlipZ]
  );

  /**
   * Handle workpoint creation
   */
  const handleConfirmPoint = useCallback(() => {
    const state = store.getState();
    if (!state.preview?.isValid) return;

    const { workpoint } = state.preview;
    const { lockTiltAngle, defaultTiltAngle } = state.displayConfig;
    const flipZ = shouldFlipZ(workpoint.type);

    // Apply rotation offset (and tilt if enabled) to final quaternion
    const finalQuaternion = lockTiltAngle && defaultTiltAngle !== 0
      ? createTiltedWorkpointOrientation(
          workpoint.surfaceNormal!,
          defaultTiltAngle,
          state.preview.rotationOffset,
          flipZ
        )
      : createWorkpointOrientation(
          workpoint.surfaceNormal!,
          state.preview.rotationOffset,
          flipZ
        );

    // Position is always the surface position for all workpoint types
    // For camera type, the optical center is calculated as position + surfaceNormal * cameraDistance
    const createData: WorkpointCreateData = {
      type: workpoint.type,
      position: workpoint.position,
      quaternion: finalQuaternion,
      workpieceId: workpoint.workpieceId,
      surfaceNormal: workpoint.surfaceNormal,
      localPosition: workpoint.localPosition,
      metadata: workpoint.metadata,
    };

    const created = state.addWorkpoint(createData);

    // Reset preview rotation for next point only if lockRotation is false
    // When lockRotation is true, keep the rotation offset for batch placement
    if (!state.displayConfig.lockRotation) {
      state.setPreview({
        ...state.preview,
        rotationOffset: 0,
      });
    }

    // Notify callback
    callbacks?.onWorkpointAdded?.(created);
  }, [callbacks, shouldFlipZ]);

  /**
   * Handle workpoint deletion
   */
  const handleDeleteSelected = useCallback(() => {
    const state = store.getState();
    if (!state.selectedWorkpointId) return;

    const id = state.selectedWorkpointId;
    state.removeWorkpoint(id);

    // Notify callback
    callbacks?.onWorkpointRemoved?.(id);
  }, [callbacks]);

  /**
   * Handle workpoint update from Gizmo
   */
  const handleWorkpointChange = useCallback(
    (update: WorkpointUpdateData) => {
      store.getState().updateWorkpoint(update);

      // Get updated workpoint
      const updated = store.getState().getWorkpoint(update.id);
      if (updated) {
        callbacks?.onWorkpointChanged?.(updated);
      }
    },
    [callbacks]
  );

  /**
   * Handle workpoint selection
   */
  const handleWorkpointClick = useCallback(
    (id: string) => {
      store.getState().selectWorkpoint(id);
      callbacks?.onWorkpointSelected?.(id);
    },
    [callbacks]
  );

  /**
   * Handle click on empty space (deselect)
   */
  const handleBackgroundClick = useCallback(
    (event: THREE.Event) => {
      // Only deselect if clicking on background, not on a workpoint
      if (store.getState().selectedWorkpointId) {
        store.getState().selectWorkpoint(null);
        callbacks?.onWorkpointSelected?.(null);
      }
    },
    [callbacks]
  );

  /**
   * Setup keyboard shortcuts
   */
  useWorkpointShortcuts({
    enabled: enabled,
    onConfirmPoint: handleConfirmPoint,
    onDeleteSelected: handleDeleteSelected,
    onShortcut: (action) => {
      if (action === 'toggleMode') {
        callbacks?.onModeChanged?.(store.getState().mode);
      }
    },
  });

  /**
   * Setup keyboard nudge for precise position/rotation adjustment
   * Arrow keys: X/Y axis, PageUp/PageDown: Z axis
   * Shift: 10x step (coarse), Alt: 0.1x step (fine)
   */
  useWorkpointNudge({
    enabled: enabled,
    positionStep: config.positionStepMeters,
    rotationStep: config.rotationStepDegrees,
    fineMultiplier: config.fineStepMultiplier,
    coarseMultiplier: config.coarseStepMultiplier,
    onNudge: (workpointId, _axis, _delta, _isRotation) => {
      const wp = store.getState().getWorkpoint(workpointId);
      if (wp) {
        callbacks?.onWorkpointChanged?.(wp);
      }
    },
  });

  /**
   * Setup pointer event listeners
   */
  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
    };
  }, [enabled, gl.domElement, handlePointerMove]);

  /**
   * Get selected workpoint
   */
  const selectedWorkpoint = useMemo(() => {
    if (!selectedId) return null;
    return workpoints.find((wp) => wp.id === selectedId) ?? null;
  }, [selectedId, workpoints]);

  /**
   * Filter non-selected workpoints for regular rendering
   */
  const nonSelectedWorkpoints = useMemo(() => {
    return workpoints.filter((wp) => wp.id !== selectedId);
  }, [workpoints, selectedId]);

  /**
   * Determine if frustum should be shown for a workpoint
   */
  const shouldShowFrustum = useCallback(
    (wp: WorkpointData): boolean => {
      // Only camera type has frustum
      if (wp.type !== 'camera') return false;

      // Global toggle
      if (!displayConfig.showFrustums) return false;

      // Frustum on hover only mode
      if (displayConfig.frustumOnHoverOnly) {
        return wp.id === hoveredId || wp.id === selectedId;
      }

      // Check group settings
      if (wp.groupId) {
        const group = groupsMap.get(wp.groupId);
        if (group && !group.showFrustums) return false;
      }

      // Check max visible frustums limit
      if (displayConfig.maxVisibleFrustums > 0) {
        const cameraWorkpoints = workpoints.filter((w) => w.type === 'camera');
        const index = cameraWorkpoints.findIndex((w) => w.id === wp.id);
        if (index >= displayConfig.maxVisibleFrustums) return false;
      }

      return true;
    },
    [displayConfig, hoveredId, selectedId, groupsMap, workpoints]
  );

  /**
   * Determine if label should be shown for a workpoint
   */
  const shouldShowLabel = useCallback(
    (wp: WorkpointData): boolean => {
      // Global toggle
      if (!displayConfig.showLabels) return false;

      // Check group settings
      if (wp.groupId) {
        const group = groupsMap.get(wp.groupId);
        if (group && !group.showLabels) return false;
      }

      return true;
    },
    [displayConfig, groupsMap]
  );

  /**
   * Get color for a workpoint (group color overrides type color)
   */
  const getWorkpointColor = useCallback(
    (wp: WorkpointData): string => {
      if (wp.groupId) {
        const group = groupsMap.get(wp.groupId);
        if (group?.color) return group.color;
      }
      return WORKPOINT_COLORS[wp.type];
    },
    [groupsMap]
  );

  /**
   * Handle hover state
   */
  const handlePointerEnter = useCallback((id: string) => {
    store.getState().setHoveredWorkpoint(id);
  }, []);

  const handlePointerLeave = useCallback(() => {
    store.getState().setHoveredWorkpoint(null);
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <group name="workpoint-manager" onClick={handleBackgroundClick}>
      {/* Render non-selected workpoints */}
      {nonSelectedWorkpoints.map((wp) => {
        const showFrustum = shouldShowFrustum(wp);
        const showLabel = shouldShowLabel(wp);
        const color = getWorkpointColor(wp);

        return (
          <group key={wp.id}>
            <Workpoint
              data={wp}
              isSelected={false}
              isHovered={hoveredId === wp.id}
              size={config.workpointSize}
              showLabel={showLabel}
              showOrder={displayConfig.showOrder}
              showAxes={displayConfig.showAxes}
              simplified={displayConfig.simplifiedIcons}
              color={color}
              onClick={handleWorkpointClick}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
            />
            {/* Camera zone for camera type */}
            {showFrustum && (
              <CameraZone
                position={wp.position}
                quaternion={wp.quaternion}
                fov={wp.metadata?.cameraFOV ?? config.defaultCameraFOV}
                distance={wp.metadata?.cameraDistance ?? config.defaultCameraDistance}
                aspectRatio={wp.metadata?.cameraAspectRatio ?? config.defaultCameraAspectRatio}
                opacity={displayConfig.frustumOpacity}
                color={color}
              />
            )}
          </group>
        );
      })}

      {/* Render selected workpoint with Gizmo */}
      {selectedWorkpoint && mode === 'edit' && (
        <WorkpointGizmo
          data={selectedWorkpoint}
          mode={gizmoMode}
          config={config}
          enabled={config.enableGizmo}
          onChange={handleWorkpointChange}
        />
      )}

      {/* Render selected workpoint without Gizmo in view mode */}
      {selectedWorkpoint && mode === 'view' && (() => {
        const showFrustum = shouldShowFrustum(selectedWorkpoint);
        const showLabel = shouldShowLabel(selectedWorkpoint);
        const color = getWorkpointColor(selectedWorkpoint);

        return (
          <group>
            <Workpoint
              data={selectedWorkpoint}
              isSelected={true}
              size={config.workpointSize}
              showLabel={showLabel}
              showOrder={displayConfig.showOrder}
              showAxes={displayConfig.showAxes}
              simplified={displayConfig.simplifiedIcons}
              color={color}
              onClick={handleWorkpointClick}
            />
            {showFrustum && (
              <CameraZone
                position={selectedWorkpoint.position}
                quaternion={selectedWorkpoint.quaternion}
                fov={selectedWorkpoint.metadata?.cameraFOV ?? config.defaultCameraFOV}
                distance={selectedWorkpoint.metadata?.cameraDistance ?? config.defaultCameraDistance}
                aspectRatio={selectedWorkpoint.metadata?.cameraAspectRatio ?? config.defaultCameraAspectRatio}
                opacity={displayConfig.frustumOpacity + 0.1}
                color={color}
              />
            )}
          </group>
        );
      })()}

      {/* Render preview when in edit mode */}
      {mode === 'edit' && preview && preview.isValid && (
        <WorkpointPreview preview={preview} config={config} />
      )}
    </group>
  );
}

export default WorkpointManager;
