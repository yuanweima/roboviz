/**
 * SurfaceRegion Component
 *
 * Renders a closed surface region on a workpiece.
 * The region is defined by boundary points and rendered as a filled polygon
 * that follows the workpiece surface.
 */

import React, { useMemo, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Line, Sphere } from '@react-three/drei';
import type { SurfaceRegion as SurfaceRegionData, RegionBoundaryPoint } from '../types';
import { REGION_COLORS } from '../types';
import {
  generateSurfaceWalkingPath,
  createSurfaceConformingGeometry,
  createSimpleRegionGeometry,
  offsetPointsFromSurface,
} from '../utils/surfaceUtils';

/**
 * Props for the SurfaceRegion component
 */
export interface SurfaceRegionProps {
  /** Region data */
  data: SurfaceRegionData;
  /** The workpiece mesh for surface-conforming rendering */
  workpieceMesh?: THREE.Mesh | null;
  /** Whether this region is selected */
  isSelected?: boolean;
  /** Whether to show boundary points */
  showBoundaryPoints?: boolean;
  /** Whether to show boundary lines */
  showBoundaryLines?: boolean;
  /** Boundary point size */
  boundaryPointSize?: number;
  /** Boundary line width */
  boundaryLineWidth?: number;
  /** Click handler */
  onClick?: (id: string) => void;
  /** Hover handlers */
  onPointerEnter?: (id: string) => void;
  onPointerLeave?: (id: string) => void;
  /** Callback when a boundary point is being dragged (called frequently during drag) */
  onPointDrag?: (regionId: string, pointId: string, newPosition: [number, number, number], newNormal: [number, number, number]) => void;
  /** Callback when drag ends (called once when user releases) */
  onPointDragEnd?: (regionId: string, pointId: string, newPosition: [number, number, number], newNormal: [number, number, number]) => void;
  /** Whether dragging is enabled */
  enableDrag?: boolean;
}

/**
 * Calculate the average normal of boundary points
 */
function calculateAverageNormal(points: RegionBoundaryPoint[]): THREE.Vector3 {
  const avgNormal = new THREE.Vector3();
  for (const point of points) {
    avgNormal.add(new THREE.Vector3(...point.normal));
  }
  avgNormal.divideScalar(points.length).normalize();
  return avgNormal;
}

/**
 * Boundary point marker component with optional drag support
 */
function BoundaryPointMarker({
  point,
  size,
  color,
  isSelected,
  onClick,
  enableDrag,
  workpieceMesh,
  onDrag,
  onDragEnd,
}: {
  point: RegionBoundaryPoint;
  size: number;
  color: string;
  isSelected?: boolean;
  onClick?: () => void;
  enableDrag?: boolean;
  workpieceMesh?: THREE.Mesh | null;
  onDrag?: (newPosition: [number, number, number], newNormal: [number, number, number]) => void;
  onDragEnd?: (newPosition: [number, number, number], newNormal: [number, number, number]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { camera, gl, controls } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const controlsEnabledRef = useRef(true);
  const lastDragPositionRef = useRef<{ position: [number, number, number]; normal: [number, number, number] } | null>(null);

  // Offset position along normal to prevent z-fighting and ensure visibility
  const offsetPosition = useMemo(() => {
    const pos = new THREE.Vector3(...point.position);
    const normal = new THREE.Vector3(...point.normal);
    return pos.add(normal.multiplyScalar(0.003)).toArray() as [number, number, number];
  }, [point.position, point.normal]);

  // Helper to disable/enable camera controls
  const setControlsEnabled = useCallback((enabled: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = controls as any;
    if (ctrl && typeof ctrl.enabled !== 'undefined') {
      ctrl.enabled = enabled;
    }
  }, [controls]);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!enableDrag || !workpieceMesh) return;
    e.stopPropagation();
    // Disable camera controls while dragging
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctrl = controls as any;
    controlsEnabledRef.current = ctrl?.enabled ?? true;
    setControlsEnabled(false);
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [enableDrag, workpieceMesh, controls, setControlsEnabled]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !workpieceMesh) return;
    e.stopPropagation();

    // Get mouse position in normalized device coordinates
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Raycast to workpiece
    raycaster.current.setFromCamera(mouse, camera);
    const intersects = raycaster.current.intersectObject(workpieceMesh, false);

    if (intersects.length > 0 && intersects[0].face) {
      const hit = intersects[0];
      const face = hit.face!;
      const newPosition: [number, number, number] = [hit.point.x, hit.point.y, hit.point.z];

      // Get world normal
      const normal = face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(workpieceMesh.matrixWorld);
      normal.applyMatrix3(normalMatrix).normalize();
      const newNormal: [number, number, number] = [normal.x, normal.y, normal.z];

      // Save for drag end
      lastDragPositionRef.current = { position: newPosition, normal: newNormal };

      // Call onDrag for visual feedback (lightweight update)
      onDrag?.(newPosition, newNormal);
    }
  }, [isDragging, workpieceMesh, onDrag, camera, gl]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (isDragging) {
      e.stopPropagation();
      setIsDragging(false);
      // Restore camera controls
      setControlsEnabled(controlsEnabledRef.current);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

      // Call onDragEnd with the final position to regenerate intermediate points
      if (lastDragPositionRef.current && onDragEnd) {
        onDragEnd(lastDragPositionRef.current.position, lastDragPositionRef.current.normal);
      }
      lastDragPositionRef.current = null;
    }
  }, [isDragging, setControlsEnabled, onDragEnd]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!isDragging) {
      e.stopPropagation();
      onClick?.();
    }
  }, [isDragging, onClick]);

  // Determine marker color based on state
  const markerColor = isDragging ? '#00ff00' : isHovered && enableDrag ? '#ffff00' : isSelected ? '#ffffff' : color;
  const markerSize = isDragging || isHovered ? size * 1.3 : size;

  return (
    <Sphere
      args={[markerSize, 12, 12]}
      position={offsetPosition}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => {
        setIsHovered(false);
        if (isDragging) {
          setIsDragging(false);
          setControlsEnabled(controlsEnabledRef.current);
        }
      }}
    >
      <meshBasicMaterial
        color={markerColor}
        transparent
        opacity={isDragging ? 1 : isSelected ? 1 : 0.9}
      />
    </Sphere>
  );
}

/**
 * SurfaceRegion component
 */
export const SurfaceRegion = React.memo(function SurfaceRegion({
  data,
  workpieceMesh,
  isSelected = false,
  showBoundaryPoints = true,
  showBoundaryLines = true,
  boundaryPointSize = 0.01,
  boundaryLineWidth = 2,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onPointDrag,
  onPointDragEnd,
  enableDrag = false,
}: SurfaceRegionProps) {
  const color = data.color || REGION_COLORS[data.type];
  const opacity = data.opacity ?? 0.5;

  // Calculate average normal for offset calculations
  const avgNormal = useMemo(() => {
    return calculateAverageNormal(data.boundaryPoints);
  }, [data.boundaryPoints]);

  // Generate surface-following path for boundary lines
  const pathPoints = useMemo(() => {
    if (data.boundaryPoints.length < 2) return [];

    if (workpieceMesh) {
      // Use surface walking for accurate surface-following path
      return generateSurfaceWalkingPath(workpieceMesh, data.boundaryPoints);
    } else {
      // Simple straight lines fallback
      const pts = data.boundaryPoints.map((p) => new THREE.Vector3(...p.position));
      if (pts.length >= 2) {
        pts.push(pts[0].clone());
      }
      return pts;
    }
  }, [data.boundaryPoints, workpieceMesh]);

  // Offset line points to prevent z-fighting with surface
  const linePoints = useMemo(() => {
    if (pathPoints.length < 2) return [];
    return offsetPointsFromSurface(pathPoints, avgNormal, 0.003);
  }, [pathPoints, avgNormal]);

  // Create 3D surface-conforming geometry
  const geometry = useMemo(() => {
    if (data.boundaryPoints.length < 3) return null;

    if (workpieceMesh && pathPoints.length > 3) {
      return createSurfaceConformingGeometry(workpieceMesh, data.boundaryPoints, pathPoints);
    }

    return createSimpleRegionGeometry(data.boundaryPoints);
  }, [data.boundaryPoints, pathPoints, workpieceMesh]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.(data.id);
  };

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerEnter?.(data.id);
  };

  const handlePointerLeave = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerLeave?.(data.id);
  };

  // Handler for boundary point drag (lightweight, called frequently)
  const handleBoundaryPointDrag = useCallback(
    (pointId: string) =>
      (newPosition: [number, number, number], newNormal: [number, number, number]) => {
        onPointDrag?.(data.id, pointId, newPosition, newNormal);
      },
    [data.id, onPointDrag]
  );

  // Handler for boundary point drag end (heavyweight, regenerates intermediate points)
  const handleBoundaryPointDragEnd = useCallback(
    (pointId: string) =>
      (newPosition: [number, number, number], newNormal: [number, number, number]) => {
        onPointDragEnd?.(data.id, pointId, newPosition, newNormal);
      },
    [data.id, onPointDragEnd]
  );

  if (data.boundaryPoints.length < 3) {
    // Not enough points to form a region, just show points and lines
    return (
      <group>
        {showBoundaryPoints &&
          data.boundaryPoints.map((point) => (
            <BoundaryPointMarker
              key={point.id}
              point={point}
              size={boundaryPointSize}
              color={color}
            />
          ))}
        {showBoundaryLines && linePoints.length > 1 && (
          <Line
            points={linePoints}
            color={color}
            lineWidth={boundaryLineWidth}
          />
        )}
      </group>
    );
  }

  return (
    <group>
      {/* Region mesh - rendered above surface to be visible */}
      {geometry && (
        <mesh
          geometry={geometry}
          onClick={handleClick}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          renderOrder={5}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isSelected ? opacity + 0.2 : opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={false}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
          />
        </mesh>
      )}

      {/* Selection outline */}
      {isSelected && geometry && (
        <mesh geometry={geometry} renderOrder={2}>
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            depthWrite={false}
            wireframe
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      )}

      {/* Boundary lines - rendered on top with depth test disabled */}
      {showBoundaryLines && linePoints.length > 1 && (
        <Line
          points={linePoints}
          color={isSelected ? '#ffffff' : color}
          lineWidth={isSelected ? boundaryLineWidth + 2 : boundaryLineWidth + 1}
          depthTest={false}
          renderOrder={10}
        />
      )}

      {/* Boundary points - only show user-clicked points */}
      {showBoundaryPoints &&
        data.boundaryPoints
          .filter((point) => point.isUserPoint)
          .map((point) => (
            <BoundaryPointMarker
              key={point.id}
              point={point}
              size={boundaryPointSize}
              color={color}
              isSelected={isSelected}
              enableDrag={enableDrag && isSelected}
              workpieceMesh={workpieceMesh}
              onDrag={handleBoundaryPointDrag(point.id)}
              onDragEnd={handleBoundaryPointDragEnd(point.id)}
            />
          ))}
    </group>
  );
});

export default SurfaceRegion;
