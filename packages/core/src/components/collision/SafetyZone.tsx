/**
 * SafetyZone Component
 *
 * Visualizes safety zones based on geometric shapes (box, sphere, cylinder, capsule).
 * Supports different safety levels with customizable colors and animations.
 */

import * as React from 'react';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type {
  SafetyZone as SafetyZoneType,
  SafetyLevel,
  SafetyZoneVisualization,
  CollisionGeometryType,
  CollisionGeometryParams,
} from '../../collision/types';
import type { Transform } from '../../types';

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_LEVEL_COLORS: Record<SafetyLevel, string> = {
  info: '#00bfff',
  warning: '#ffa500',
  danger: '#ff4500',
  stop: '#ff0000',
};

const DEFAULT_VISUALIZATION: SafetyZoneVisualization = {
  visible: true,
  fillColor: '#ff0000',
  fillOpacity: 0.2,
  wireframe: true,
  wireframeColor: '#ffffff',
  pulseOnWarning: true,
  pulseFrequency: 2,
};

// ============================================================================
// Props
// ============================================================================

export interface SafetyZoneProps {
  /** Safety zone data */
  zone: SafetyZoneType;
  /** Whether the zone is currently triggered (robot inside) */
  isTriggered?: boolean;
  /** Override visualization settings */
  visualizationOverride?: Partial<SafetyZoneVisualization>;
  /** Custom level colors */
  levelColors?: Partial<Record<SafetyLevel, string>>;
  /** Callback when zone is clicked */
  onClick?: (zone: SafetyZoneType) => void;
  /** Callback when zone is hovered */
  onHover?: (zone: SafetyZoneType, hovered: boolean) => void;
}

export interface SafetyZoneListProps {
  /** List of safety zones to render */
  zones: SafetyZoneType[];
  /** Map of zone IDs to triggered state */
  triggeredZones?: Record<string, boolean>;
  /** Custom level colors */
  levelColors?: Partial<Record<SafetyLevel, string>>;
  /** Callback when zone is clicked */
  onZoneClick?: (zone: SafetyZoneType) => void;
}

// ============================================================================
// Geometry Components
// ============================================================================

interface GeometryProps {
  type: CollisionGeometryType;
  params: CollisionGeometryParams;
}

function GeometryMesh({ type, params }: GeometryProps): React.JSX.Element | null {
  switch (type) {
    case 'box': {
      const width = params.width ?? 1;
      const height = params.height ?? 1;
      const depth = params.depth ?? 1;
      return <boxGeometry args={[width, height, depth]} />;
    }
    case 'sphere': {
      const radius = params.radius ?? 0.5;
      return <sphereGeometry args={[radius, 32, 32]} />;
    }
    case 'cylinder': {
      const radius = params.radius ?? 0.5;
      const height = params.height ?? 1;
      return <cylinderGeometry args={[radius, radius, height, 32]} />;
    }
    case 'capsule': {
      const radius = params.radius ?? 0.25;
      const height = params.height ?? 1;
      return <capsuleGeometry args={[radius, height, 16, 32]} />;
    }
    default:
      return <sphereGeometry args={[0.5, 32, 32]} />;
  }
}

function WireframeGeometry({ type, params }: GeometryProps): React.JSX.Element | null {
  switch (type) {
    case 'box': {
      const width = params.width ?? 1;
      const height = params.height ?? 1;
      const depth = params.depth ?? 1;
      return <boxGeometry args={[width, height, depth]} />;
    }
    case 'sphere': {
      const radius = params.radius ?? 0.5;
      return <sphereGeometry args={[radius, 16, 12]} />;
    }
    case 'cylinder': {
      const radius = params.radius ?? 0.5;
      const height = params.height ?? 1;
      return <cylinderGeometry args={[radius, radius, height, 16]} />;
    }
    case 'capsule': {
      const radius = params.radius ?? 0.25;
      const height = params.height ?? 1;
      return <capsuleGeometry args={[radius, height, 8, 16]} />;
    }
    default:
      return <sphereGeometry args={[0.5, 16, 12]} />;
  }
}

// ============================================================================
// SafetyZone Component
// ============================================================================

/**
 * SafetyZone component renders a safety zone with configurable geometry and appearance
 */
export function SafetyZone({
  zone,
  isTriggered = false,
  visualizationOverride,
  levelColors,
  onClick,
  onHover,
}: SafetyZoneProps): React.JSX.Element | null {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);

  // Merge visualization settings
  const vis: SafetyZoneVisualization = {
    ...DEFAULT_VISUALIZATION,
    ...zone.visualization,
    ...visualizationOverride,
  };

  // Get color based on level
  const colors = { ...DEFAULT_LEVEL_COLORS, ...levelColors };
  const levelColor = colors[zone.level] ?? colors.warning;
  const baseColor = vis.fillColor !== DEFAULT_VISUALIZATION.fillColor ? vis.fillColor : levelColor;

  // Handle visibility
  if (!vis.visible && zone.enabled !== false) {
    return null;
  }

  // Extract transform
  const position: [number, number, number] = [
    zone.transform.position.x,
    zone.transform.position.y,
    zone.transform.position.z,
  ];

  // Convert quaternion to euler for rotation
  const quaternion = new THREE.Quaternion(
    zone.transform.rotation.x,
    zone.transform.rotation.y,
    zone.transform.rotation.z,
    zone.transform.rotation.w
  );

  // Pulse animation for triggered zones
  useFrame(({ clock }) => {
    if (meshRef.current && vis.pulseOnWarning && isTriggered) {
      const pulseFreq = vis.pulseFrequency ?? 2;
      const pulse = Math.sin(clock.elapsedTime * pulseFreq * Math.PI * 2) * 0.5 + 0.5;
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = vis.fillOpacity + pulse * 0.2;
    }
  });

  // Event handlers
  const handleClick = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    onClick?.(zone);
  };

  const handlePointerOver = () => onHover?.(zone, true);
  const handlePointerOut = () => onHover?.(zone, false);

  return (
    <group position={position} quaternion={quaternion}>
      {/* Fill mesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <GeometryMesh type={zone.type} params={zone.params} />
        <meshBasicMaterial
          color={isTriggered ? colors.danger : baseColor}
          transparent
          opacity={vis.fillOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe */}
      {vis.wireframe && (
        <lineSegments ref={wireframeRef}>
          <edgesGeometry
            args={[
              (() => {
                const geom = createGeometry(zone.type, zone.params);
                return geom;
              })(),
            ]}
          />
          <lineBasicMaterial
            color={isTriggered ? colors.stop : vis.wireframeColor}
            linewidth={1}
          />
        </lineSegments>
      )}
    </group>
  );
}

// ============================================================================
// SafetyZoneList Component
// ============================================================================

/**
 * Renders multiple safety zones
 */
export function SafetyZoneList({
  zones,
  triggeredZones = {},
  levelColors,
  onZoneClick,
}: SafetyZoneListProps): React.JSX.Element {
  return (
    <group name="safety-zones">
      {zones.map((zone) => (
        <SafetyZone
          key={zone.id}
          zone={zone}
          isTriggered={triggeredZones[zone.id] ?? false}
          levelColors={levelColors}
          onClick={onZoneClick}
        />
      ))}
    </group>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function createGeometry(
  type: CollisionGeometryType,
  params: CollisionGeometryParams
): THREE.BufferGeometry {
  switch (type) {
    case 'box': {
      const width = params.width ?? 1;
      const height = params.height ?? 1;
      const depth = params.depth ?? 1;
      return new THREE.BoxGeometry(width, height, depth);
    }
    case 'sphere': {
      const radius = params.radius ?? 0.5;
      return new THREE.SphereGeometry(radius, 16, 12);
    }
    case 'cylinder': {
      const radius = params.radius ?? 0.5;
      const height = params.height ?? 1;
      return new THREE.CylinderGeometry(radius, radius, height, 16);
    }
    case 'capsule': {
      const radius = params.radius ?? 0.25;
      const height = params.height ?? 1;
      return new THREE.CapsuleGeometry(radius, height, 8, 16);
    }
    default:
      return new THREE.SphereGeometry(0.5, 16, 12);
  }
}

export default SafetyZone;
