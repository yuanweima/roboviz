/**
 * CollisionObjectVisual Component
 *
 * Renders a collision object (box, sphere, cylinder, capsule, mesh) in 3D.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type {
  CollisionObject,
  BoxParams,
  SphereParams,
  CylinderParams,
  CapsuleParams,
  MeshParams,
} from '../world/types';

// ============================================================================
// Props
// ============================================================================

export interface CollisionObjectVisualProps {
  /** Collision object data */
  object: CollisionObject;
  /** Whether this object is selected */
  isSelected?: boolean;
  /** Whether this object is hovered */
  isHovered?: boolean;
  /** Click handler */
  onClick?: (id: string) => void;
  /** Pointer enter handler */
  onPointerEnter?: (id: string) => void;
  /** Pointer leave handler */
  onPointerLeave?: (id: string) => void;
}

// ============================================================================
// Helper Components
// ============================================================================

interface BaseShapeProps {
  color: string;
  opacity: number;
  wireframe: boolean;
  isSelected: boolean;
  isHovered: boolean;
}

function BoxShape({ params, color, opacity, wireframe, isSelected, isHovered }: BaseShapeProps & { params: BoxParams }) {
  const effectiveColor = isHovered ? '#ffffff' : isSelected ? '#00ff00' : color;
  const effectiveOpacity = isHovered ? Math.min(opacity + 0.2, 1) : opacity;

  return (
    <mesh>
      <boxGeometry args={[params.width, params.height, params.depth]} />
      <meshStandardMaterial
        color={effectiveColor}
        transparent={opacity < 1}
        opacity={effectiveOpacity}
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SphereShape({ params, color, opacity, wireframe, isSelected, isHovered }: BaseShapeProps & { params: SphereParams }) {
  const effectiveColor = isHovered ? '#ffffff' : isSelected ? '#00ff00' : color;
  const effectiveOpacity = isHovered ? Math.min(opacity + 0.2, 1) : opacity;

  return (
    <mesh>
      <sphereGeometry args={[params.radius, 32, 32]} />
      <meshStandardMaterial
        color={effectiveColor}
        transparent={opacity < 1}
        opacity={effectiveOpacity}
        wireframe={wireframe}
      />
    </mesh>
  );
}

function CylinderShape({ params, color, opacity, wireframe, isSelected, isHovered }: BaseShapeProps & { params: CylinderParams }) {
  const effectiveColor = isHovered ? '#ffffff' : isSelected ? '#00ff00' : color;
  const effectiveOpacity = isHovered ? Math.min(opacity + 0.2, 1) : opacity;

  // Three.js cylinder is Y-up by default, rotate to Z-up
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[params.radius, params.radius, params.height, 32]} />
      <meshStandardMaterial
        color={effectiveColor}
        transparent={opacity < 1}
        opacity={effectiveOpacity}
        wireframe={wireframe}
      />
    </mesh>
  );
}

function CapsuleShape({ params, color, opacity, wireframe, isSelected, isHovered }: BaseShapeProps & { params: CapsuleParams }) {
  const effectiveColor = isHovered ? '#ffffff' : isSelected ? '#00ff00' : color;
  const effectiveOpacity = isHovered ? Math.min(opacity + 0.2, 1) : opacity;

  // Capsule = cylinder + two hemispheres
  // In Z-up, capsule extends along Z axis
  const cylinderHeight = params.height - 2 * params.radius;

  return (
    <group>
      {/* Main cylinder body - rotated to Z-up */}
      {cylinderHeight > 0 && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[params.radius, params.radius, cylinderHeight, 32]} />
          <meshStandardMaterial
            color={effectiveColor}
            transparent={opacity < 1}
            opacity={effectiveOpacity}
            wireframe={wireframe}
          />
        </mesh>
      )}
      {/* Top hemisphere - at +Z */}
      <mesh position={[0, 0, Math.max(0, cylinderHeight / 2)]}>
        <sphereGeometry args={[params.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={effectiveColor}
          transparent={opacity < 1}
          opacity={effectiveOpacity}
          wireframe={wireframe}
        />
      </mesh>
      {/* Bottom hemisphere - at -Z */}
      <mesh position={[0, 0, Math.min(0, -cylinderHeight / 2)]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[params.radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={effectiveColor}
          transparent={opacity < 1}
          opacity={effectiveOpacity}
          wireframe={wireframe}
        />
      </mesh>
    </group>
  );
}

function MeshShape({ params, color, opacity, wireframe, isSelected, isHovered }: BaseShapeProps & { params: MeshParams }) {
  const effectiveColor = isHovered ? '#ffffff' : isSelected ? '#00ff00' : color;
  const effectiveOpacity = isHovered ? Math.min(opacity + 0.2, 1) : opacity;

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();

    if (params.vertices.length > 0) {
      geom.setAttribute('position', new THREE.BufferAttribute(params.vertices, 3));

      if (params.indices.length > 0) {
        geom.setIndex(new THREE.BufferAttribute(params.indices, 1));
      }

      geom.computeVertexNormals();
    }

    return geom;
  }, [params.vertices, params.indices]);

  if (params.vertices.length === 0) {
    // Show placeholder
    return (
      <mesh>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#888888" wireframe />
      </mesh>
    );
  }

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={effectiveColor}
        transparent={opacity < 1}
        opacity={effectiveOpacity}
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const CollisionObjectVisual = React.memo(function CollisionObjectVisual({
  object,
  isSelected = false,
  isHovered = false,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: CollisionObjectVisualProps) {
  // Don't render if not visible
  if (!object.visualization.visible) {
    return null;
  }

  const { color, opacity, wireframe } = object.visualization;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.(object.id);
  };

  const handlePointerEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerEnter?.(object.id);
  };

  const handlePointerLeave = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerLeave?.(object.id);
  };

  const shapeProps = {
    color,
    opacity,
    wireframe,
    isSelected,
    isHovered,
  };

  // Render shape based on type
  const renderShape = () => {
    switch (object.params.type) {
      case 'box':
        return <BoxShape {...shapeProps} params={object.params} />;
      case 'sphere':
        return <SphereShape {...shapeProps} params={object.params} />;
      case 'cylinder':
        return <CylinderShape {...shapeProps} params={object.params} />;
      case 'capsule':
        return <CapsuleShape {...shapeProps} params={object.params} />;
      case 'mesh':
        return <MeshShape {...shapeProps} params={object.params} />;
      case 'convexHull':
        // Treat convex hull same as mesh for visualization
        return <MeshShape {...shapeProps} params={{ ...object.params, type: 'mesh', vertices: object.params.points, indices: new Uint32Array(0) }} />;
      default:
        return null;
    }
  };

  // Scene is already configured as Z-up, so use position/quaternion directly
  const quaternion = useMemo(
    () => new THREE.Quaternion(...object.transform.quaternion),
    [object.transform.quaternion]
  );

  return (
    <group
      position={object.transform.position}
      quaternion={quaternion}
      scale={object.transform.scale ?? [1, 1, 1]}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {renderShape()}

    </group>
  );
});

export default CollisionObjectVisual;
