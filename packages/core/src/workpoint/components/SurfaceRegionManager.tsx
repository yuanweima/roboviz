/**
 * SurfaceRegionManager Component
 *
 * Manages surface region creation and rendering.
 * Handles click-to-add-point workflow for defining region boundaries.
 */

import React, { useCallback, useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { Line, Sphere } from '@react-three/drei';
import { SurfaceRegion } from './SurfaceRegion';
import {
  useSurfaceRegionStore,
  useRegionCreationState,
  useVisibleSurfaceRegions,
  useSelectedRegionId,
} from '../store/surfaceRegionStore';
import type {
  SurfaceRegionType,
  RegionBoundaryPoint,
  SurfaceRegionCallbacks,
} from '../types';
import { REGION_COLORS, DEFAULT_REGION_CONFIG } from '../types';
import {
  walkOnSurface,
  generateSurfaceWalkingPath,
  generateSurfaceWalkingPathWithNormals,
  createSurfaceConformingGeometry,
  createSimpleRegionGeometry,
  createSurfaceRegionMeshData,
} from '../utils/surfaceUtils';

/**
 * Props for the SurfaceRegionManager component
 */
export interface SurfaceRegionManagerProps {
  /** The workpiece mesh to raycast against */
  workpieceMesh?: THREE.Mesh | null;
  /** Current workpiece ID */
  workpieceId: string;
  /** Whether region creation mode is active */
  isCreating?: boolean;
  /** Type of region being created */
  regionType?: SurfaceRegionType;
  /** Callbacks for region events */
  callbacks?: SurfaceRegionCallbacks;
  /** Whether to show boundary points */
  showBoundaryPoints?: boolean;
  /** Whether to show boundary lines */
  showBoundaryLines?: boolean;
  /** Boundary point size */
  boundaryPointSize?: number;
  /** Boundary line width */
  boundaryLineWidth?: number;
  /** Region opacity */
  regionOpacity?: number;
}

/**
 * Preview component for region being created
 * Shows boundary points, connecting lines, and a semi-transparent fill
 */
function CreationPreview({
  points,
  regionType,
  workpieceMesh,
  boundaryPointSize = DEFAULT_REGION_CONFIG.boundaryPointSize,
  boundaryLineWidth = DEFAULT_REGION_CONFIG.boundaryLineWidth,
}: {
  points: RegionBoundaryPoint[];
  regionType: SurfaceRegionType;
  workpieceMesh?: THREE.Mesh | null;
  boundaryPointSize?: number;
  boundaryLineWidth?: number;
}) {
  const color = REGION_COLORS[regionType];
  const canClose = points.length >= 3;

  // Generate surface-following path for lines using surface walking
  const linePoints = useMemo(() => {
    if (points.length < 2) return [];

    if (workpieceMesh) {
      // Use surface walking for accurate surface-following path
      return generateSurfaceWalkingPath(workpieceMesh, points);
    } else {
      // Simple straight lines fallback
      const pts = points.map((p) => new THREE.Vector3(...p.position));
      if (points.length >= 2) {
        pts.push(pts[0].clone());
      }
      return pts;
    }
  }, [points, workpieceMesh]);

  // Create 3D surface-conforming fill geometry
  const previewGeometry = useMemo(() => {
    if (points.length < 3) return null;

    if (workpieceMesh && linePoints.length > 3) {
      return createSurfaceConformingGeometry(workpieceMesh, points, linePoints);
    }

    return createSimpleRegionGeometry(points);
  }, [points, linePoints, workpieceMesh]);

  return (
    <group>
      {/* Semi-transparent 3D surface fill preview (when 3+ points) */}
      {previewGeometry && (
        <mesh geometry={previewGeometry}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Boundary lines (surface-following) */}
      {linePoints.length > 1 && (
        <Line
          points={linePoints}
          color={color}
          lineWidth={boundaryLineWidth * 2.5}
        />
      )}

      {/* Boundary points */}
      {points.map((point, index) => (
        <Sphere
          key={point.id}
          args={[boundaryPointSize, 12, 12]}
          position={point.position}
        >
          <meshBasicMaterial
            color={index === 0 ? '#00ff00' : color}
            transparent
            opacity={0.95}
          />
        </Sphere>
      ))}

      {/* First point highlight ring (indicates clickable to close) */}
      {canClose && (
        <mesh position={points[0].position}>
          <ringGeometry args={[boundaryPointSize * 1.8, boundaryPointSize * 2.5, 16]} />
          <meshBasicMaterial
            color="#00ff00"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Distance threshold for auto-close (in world units)
const AUTO_CLOSE_DISTANCE = 0.03;

/**
 * SurfaceRegionManager component
 */
export const SurfaceRegionManager = React.memo(function SurfaceRegionManager({
  workpieceMesh,
  workpieceId,
  isCreating = false,
  regionType = 'processing',
  callbacks,
  showBoundaryPoints = DEFAULT_REGION_CONFIG.showBoundaryPoints,
  showBoundaryLines = DEFAULT_REGION_CONFIG.showBoundaryLines,
  boundaryPointSize = DEFAULT_REGION_CONFIG.boundaryPointSize,
  boundaryLineWidth = DEFAULT_REGION_CONFIG.boundaryLineWidth,
  regionOpacity = DEFAULT_REGION_CONFIG.defaultOpacity,
}: SurfaceRegionManagerProps) {
  const creationState = useRegionCreationState();
  const visibleRegions = useVisibleSurfaceRegions();
  const selectedRegionId = useSelectedRegionId();

  const {
    startCreating,
    addBoundaryPoint,
    setBoundaryPoints,
    finishCreating,
    cancelCreating,
    selectRegion,
    updateBoundaryPoint,
    updateRegionBoundaryPoints,
    getRegion,
  } = useSurfaceRegionStore();

  // Filter regions for this workpiece
  const workpieceRegions = useMemo(() => {
    return visibleRegions.filter((r) => r.workpieceId === workpieceId);
  }, [visibleRegions, workpieceId]);

  // Start creation mode when isCreating prop changes
  React.useEffect(() => {
    if (isCreating && creationState.mode === 'none') {
      startCreating(regionType, workpieceId);
    } else if (!isCreating && creationState.mode === 'creating') {
      cancelCreating();
    }
  }, [isCreating, regionType, workpieceId, creationState.mode, startCreating, cancelCreating]);

  // Handle click on workpiece to add boundary point
  const handleWorkpieceClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (creationState.mode !== 'creating') return;
      if (!event.face) return;

      event.stopPropagation();

      const clickPosition = new THREE.Vector3(
        event.point.x,
        event.point.y,
        event.point.z
      );

      // Check if clicking near the first point to auto-close
      if (creationState.points.length >= 3) {
        const firstPoint = new THREE.Vector3(...creationState.points[0].position);
        const distance = clickPosition.distanceTo(firstPoint);

        if (distance < AUTO_CLOSE_DISTANCE) {
          // Generate full surface-walking path with intermediate points
          let meshData: { vertices: number[]; normals: number[]; indices: number[]; vertexCount: number; triangleCount: number } | undefined;

          if (workpieceMesh) {
            const pathWithNormals = generateSurfaceWalkingPathWithNormals(
              workpieceMesh,
              creationState.points
            );

            // Create a Set of user point positions for quick lookup
            const userPointPositions = new Set(
              creationState.points.map(p => `${p.position[0].toFixed(6)},${p.position[1].toFixed(6)},${p.position[2].toFixed(6)}`)
            );

            // Convert SurfacePathPoint[] to RegionBoundaryPoint[]
            // Skip the closing point (duplicate of first) since the store handles that
            const enhancedPoints: RegionBoundaryPoint[] = pathWithNormals
              .slice(0, -1) // Remove closing duplicate
              .map((p, index) => {
                const posKey = `${p.position.x.toFixed(6)},${p.position.y.toFixed(6)},${p.position.z.toFixed(6)}`;
                const isUserPoint = userPointPositions.has(posKey);
                return {
                  id: `point_${index}`,
                  position: [p.position.x, p.position.y, p.position.z] as [number, number, number],
                  normal: [p.normal.x, p.normal.y, p.normal.z] as [number, number, number],
                  order: index,
                  isUserPoint,
                };
              });

            // Update boundary points with the enhanced version including intermediate points
            setBoundaryPoints(enhancedPoints);

            // Generate mesh data for backend
            const meshResult = createSurfaceRegionMeshData(workpieceMesh, enhancedPoints);
            if (meshResult) {
              meshData = meshResult.meshData;
              // Dispose the geometry as we only need the data
              meshResult.geometry.dispose();
            }
          }

          // Auto-close and finish with mesh data
          const region = finishCreating(meshData);
          if (region) {
            callbacks?.onRegionCreated?.(region);
          }
          return;
        }
      }

      const position: [number, number, number] = [
        event.point.x,
        event.point.y,
        event.point.z,
      ];

      const normal: [number, number, number] = [
        event.face.normal.x,
        event.face.normal.y,
        event.face.normal.z,
      ];

      // Transform normal to world space if mesh has rotation
      if (event.object instanceof THREE.Mesh) {
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(
          event.object.matrixWorld
        );
        const worldNormal = new THREE.Vector3(...normal)
          .applyMatrix3(normalMatrix)
          .normalize();
        normal[0] = worldNormal.x;
        normal[1] = worldNormal.y;
        normal[2] = worldNormal.z;
      }

      // Calculate local position relative to workpiece
      let localPosition: [number, number, number] | undefined;
      if (event.object instanceof THREE.Mesh) {
        const localPoint = event.object.worldToLocal(event.point.clone());
        localPosition = [localPoint.x, localPoint.y, localPoint.z];
      }

      addBoundaryPoint(position, normal, localPosition);
      callbacks?.onPointAdded?.(
        {
          id: '',
          position,
          normal,
          localPosition,
          order: creationState.points.length,
        },
        null
      );
    },
    [creationState, addBoundaryPoint, setBoundaryPoints, finishCreating, callbacks, workpieceMesh]
  );

  // Handle region click for selection
  const handleRegionClick = useCallback(
    (regionId: string) => {
      selectRegion(regionId);
      callbacks?.onRegionSelected?.(regionId);
    },
    [selectRegion, callbacks]
  );

  // Handle boundary point drag (lightweight - just update single point position for visual feedback)
  const handlePointDrag = useCallback(
    (regionId: string, pointId: string, newPosition: [number, number, number], newNormal: [number, number, number]) => {
      // Just update the single point for visual feedback during dragging
      updateBoundaryPoint(regionId, pointId, newPosition, newNormal);
    },
    [updateBoundaryPoint]
  );

  // Handle boundary point drag end - regenerate intermediate points after dragging user point
  const handlePointDragEnd = useCallback(
    (regionId: string, pointId: string, newPosition: [number, number, number], newNormal: [number, number, number]) => {
      if (!workpieceMesh) {
        // No mesh, nothing more to do
        return;
      }

      const region = getRegion(regionId);
      if (!region) return;

      // Get only the user points from the current region
      const userPoints = region.boundaryPoints.filter(p => p.isUserPoint);

      // Update the dragged user point
      const updatedUserPoints: RegionBoundaryPoint[] = userPoints.map(p =>
        p.id === pointId ? { ...p, position: newPosition, normal: newNormal } : p
      );

      // Regenerate the full path with intermediate points
      const pathWithNormals = generateSurfaceWalkingPathWithNormals(
        workpieceMesh,
        updatedUserPoints
      );

      // Create a Set of user point positions for quick lookup
      const userPointPositions = new Set(
        updatedUserPoints.map(p => `${p.position[0].toFixed(6)},${p.position[1].toFixed(6)},${p.position[2].toFixed(6)}`)
      );

      // Map to preserve original user point IDs
      const userPointIdMap = new Map(
        updatedUserPoints.map(p => [`${p.position[0].toFixed(6)},${p.position[1].toFixed(6)},${p.position[2].toFixed(6)}`, p.id])
      );

      // Convert SurfacePathPoint[] to RegionBoundaryPoint[]
      const enhancedPoints: RegionBoundaryPoint[] = pathWithNormals
        .slice(0, -1) // Remove closing duplicate
        .map((p, index) => {
          const posKey = `${p.position.x.toFixed(6)},${p.position.y.toFixed(6)},${p.position.z.toFixed(6)}`;
          const isUserPoint = userPointPositions.has(posKey);
          const existingId = userPointIdMap.get(posKey);
          return {
            id: existingId || `point_${index}`,
            position: [p.position.x, p.position.y, p.position.z] as [number, number, number],
            normal: [p.normal.x, p.normal.y, p.normal.z] as [number, number, number],
            order: index,
            isUserPoint,
          };
        });

      // Update the entire region with new boundary points
      updateRegionBoundaryPoints(regionId, enhancedPoints);
    },
    [workpieceMesh, getRegion, updateRegionBoundaryPoints]
  );

  // Clone the workpiece mesh for click detection
  const clickTargetMesh = useMemo(() => {
    if (!workpieceMesh) return null;
    const cloned = workpieceMesh.clone();
    // Copy the world matrix to preserve position/rotation
    cloned.matrixWorld.copy(workpieceMesh.matrixWorld);
    cloned.matrix.copy(workpieceMesh.matrix);
    cloned.position.copy(workpieceMesh.position);
    cloned.rotation.copy(workpieceMesh.rotation);
    cloned.scale.copy(workpieceMesh.scale);
    return cloned;
  }, [workpieceMesh]);

  const isInCreatingMode = creationState.mode === 'creating';

  return (
    <group>
      {/* Click target overlay when in creating mode */}
      {clickTargetMesh && isInCreatingMode && (
        <mesh
          geometry={clickTargetMesh.geometry}
          position={clickTargetMesh.position}
          rotation={clickTargetMesh.rotation}
          scale={clickTargetMesh.scale}
          onClick={handleWorkpieceClick}
        >
          <meshBasicMaterial
            transparent
            opacity={0.1}
            color="#ffff00"
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Creation preview */}
      {isInCreatingMode && creationState.points.length > 0 && (
        <CreationPreview
          points={creationState.points}
          regionType={creationState.regionType}
          workpieceMesh={workpieceMesh}
          boundaryPointSize={boundaryPointSize}
          boundaryLineWidth={boundaryLineWidth}
        />
      )}

      {/* Existing regions */}
      {workpieceRegions.map((region) => (
        <SurfaceRegion
          key={region.id}
          data={region}
          workpieceMesh={workpieceMesh}
          isSelected={region.id === selectedRegionId}
          showBoundaryPoints={showBoundaryPoints}
          showBoundaryLines={showBoundaryLines}
          boundaryPointSize={boundaryPointSize}
          boundaryLineWidth={boundaryLineWidth}
          onClick={handleRegionClick}
          onPointDrag={handlePointDrag}
          onPointDragEnd={handlePointDragEnd}
          enableDrag={!isInCreatingMode}
        />
      ))}
    </group>
  );
});

export default SurfaceRegionManager;
