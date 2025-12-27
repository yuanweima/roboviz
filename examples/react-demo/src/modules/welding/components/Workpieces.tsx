/**
 * Enhanced Industrial Workpiece Components
 *
 * Realistic workpiece visualizations for process demonstrations:
 * - IndustrialWeldingWorkpiece: T-joint, corner joint, lap joint assemblies
 * - IndustrialGrindingWorkpiece: Metal block with surface features
 * - IndustrialInspectionWorkpiece: Part with various defect types
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Vector3Tuple } from '@aspect/roboviz-core';

// ============================================================================
// Welding Workpiece - Industrial T-Joint Assembly
// ============================================================================

export interface WeldSeamDefinition {
  id: string;
  start: Vector3Tuple;
  end: Vector3Tuple;
  type: 'fillet' | 'butt' | 'corner';
}

export interface IndustrialWeldingWorkpieceProps {
  /** Position offset */
  position?: Vector3Tuple;
  /** Scale factor */
  scale?: number;
  /** Mesh reference callback */
  onMeshRef?: (mesh: THREE.Mesh | null) => void;
  /** Highlighted seam ID */
  highlightedSeamId?: string | null;
  /** Weld progress per seam (0-1) */
  weldProgress?: Record<string, number>;
  /** Callback when seam is clicked */
  onSeamClick?: (seamId: string) => void;
}

/**
 * Industrial welding workpiece with multiple joint types
 */
export const IndustrialWeldingWorkpiece = React.memo(function IndustrialWeldingWorkpiece({
  position = [0.5, 0, 0],
  scale = 1,
  onMeshRef,
  highlightedSeamId,
  weldProgress = {},
  onSeamClick,
}: IndustrialWeldingWorkpieceProps) {
  const baseRef = useRef<THREE.Mesh>(null);

  // Define weld seams
  const seams = useMemo<WeldSeamDefinition[]>(() => [
    // Left T-joint fillet weld
    { id: 'seam-1', start: [-0.12, 0.025, -0.08], end: [-0.12, 0.025, 0.08], type: 'fillet' },
    // Right T-joint fillet weld
    { id: 'seam-2', start: [0.12, 0.025, -0.08], end: [0.12, 0.025, 0.08], type: 'fillet' },
    // Front corner weld
    { id: 'seam-3', start: [-0.15, 0.025, 0.12], end: [0.15, 0.025, 0.12], type: 'corner' },
    // Back corner weld
    { id: 'seam-4', start: [-0.15, 0.025, -0.12], end: [0.15, 0.025, -0.12], type: 'corner' },
  ], []);

  const s = scale;

  return (
    <group position={position}>
      {/* Base plate (main workpiece for interaction) */}
      <mesh
        ref={(mesh) => {
          baseRef.current = mesh;
          onMeshRef?.(mesh);
        }}
        name="welding_workpiece"
        position={[0, -0.015 * s, 0]}
        userData={{ workpieceId: 'welding_workpiece' }}
      >
        <boxGeometry args={[0.35 * s, 0.03 * s, 0.3 * s]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Vertical rib - left */}
      <mesh position={[-0.1 * s, 0.06 * s, 0]}>
        <boxGeometry args={[0.02 * s, 0.12 * s, 0.22 * s]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Vertical rib - right */}
      <mesh position={[0.1 * s, 0.06 * s, 0]}>
        <boxGeometry args={[0.02 * s, 0.12 * s, 0.22 * s]} />
        <meshStandardMaterial color="#555555" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Cross beam top */}
      <mesh position={[0, 0.13 * s, 0]}>
        <boxGeometry args={[0.24 * s, 0.02 * s, 0.18 * s]} />
        <meshStandardMaterial color="#4d4d4d" metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Angle brackets (corners) */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x * 0.14 * s, 0.03 * s, z * 0.1 * s]}
          rotation={[0, Math.atan2(z, x) + Math.PI / 4, 0]}
        >
          <boxGeometry args={[0.04 * s, 0.05 * s, 0.02 * s]} />
          <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {/* Weld seam visualizations */}
      {seams.map((seam) => {
        const progress = weldProgress[seam.id] || 0;
        const isHighlighted = highlightedSeamId === seam.id;
        const start = new THREE.Vector3(...seam.start).multiplyScalar(s);
        const end = new THREE.Vector3(...seam.end).multiplyScalar(s);
        const length = start.distanceTo(end);
        const center = start.clone().add(end).multiplyScalar(0.5);
        const direction = end.clone().sub(start).normalize();
        const angle = Math.atan2(direction.x, direction.z);

        return (
          <group key={seam.id}>
            {/* Seam line indicator */}
            <mesh
              position={[center.x, center.y + 0.005 * s, center.z]}
              rotation={[0, angle, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSeamClick?.(seam.id);
              }}
            >
              <boxGeometry args={[0.008 * s, 0.003 * s, length]} />
              <meshBasicMaterial
                color={isHighlighted ? '#ff6b35' : '#ff9500'}
                transparent
                opacity={isHighlighted ? 1 : 0.7}
              />
            </mesh>

            {/* Weld bead (progress) */}
            {progress > 0 && (
              <mesh
                position={[
                  start.x + direction.x * length * progress * 0.5,
                  center.y + 0.003 * s,
                  start.z + direction.z * length * progress * 0.5,
                ]}
                rotation={[0, angle, 0]}
              >
                <boxGeometry args={[0.012 * s, 0.006 * s, length * progress]} />
                <meshStandardMaterial
                  color="#8B7355"
                  metalness={0.4}
                  roughness={0.6}
                  emissive={progress < 1 ? '#ff4400' : '#000000'}
                  emissiveIntensity={progress < 1 ? 0.3 : 0}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Clamps visualization */}
      {[[-0.18, 0], [0.18, 0], [0, -0.15], [0, 0.15]].map(([x, z], i) => (
        <mesh key={`clamp-${i}`} position={[x * s, 0.02 * s, z * s]}>
          <cylinderGeometry args={[0.015 * s, 0.015 * s, 0.04 * s, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================================
// Grinding Workpiece - Metal Block with Surface Features
// ============================================================================

export interface SurfaceRegionDef {
  id: string;
  center: Vector3Tuple;
  size: [number, number];
  rotation?: number;
}

export interface IndustrialGrindingWorkpieceProps {
  /** Position offset */
  position?: Vector3Tuple;
  /** Scale factor */
  scale?: number;
  /** Mesh reference callback */
  onMeshRef?: (mesh: THREE.Mesh | null) => void;
  /** Highlighted region ID */
  highlightedRegionId?: string | null;
  /** Grinding progress per region (0-1) */
  grindingProgress?: Record<string, number>;
  /** Currently grinding region */
  activeRegionId?: string | null;
  /** Callback when region is clicked */
  onRegionClick?: (regionId: string) => void;
}

/**
 * Industrial grinding workpiece with defined surface regions
 */
export const IndustrialGrindingWorkpiece = React.memo(function IndustrialGrindingWorkpiece({
  position = [0.5, 0, 0],
  scale = 1,
  onMeshRef,
  highlightedRegionId,
  grindingProgress = {},
  activeRegionId,
  onRegionClick,
}: IndustrialGrindingWorkpieceProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Define surface regions for grinding
  const regions = useMemo<SurfaceRegionDef[]>(() => [
    { id: 'region-1', center: [-0.08, 0.076, -0.06], size: [0.08, 0.06] },
    { id: 'region-2', center: [0.08, 0.076, -0.06], size: [0.08, 0.06] },
    { id: 'region-3', center: [-0.08, 0.076, 0.06], size: [0.08, 0.06] },
    { id: 'region-4', center: [0.08, 0.076, 0.06], size: [0.08, 0.06] },
    { id: 'region-5', center: [0, 0.076, 0], size: [0.1, 0.08] },
    { id: 'region-6', center: [0, 0.076, -0.1], size: [0.15, 0.04] },
  ], []);

  const s = scale;

  return (
    <group position={position}>
      {/* Main metal block */}
      <mesh
        ref={(mesh) => {
          meshRef.current = mesh;
          onMeshRef?.(mesh);
        }}
        name="grinding_workpiece"
        position={[0, 0.0375 * s, 0]}
        userData={{ workpieceId: 'grinding_workpiece' }}
      >
        <boxGeometry args={[0.3 * s, 0.075 * s, 0.25 * s]} />
        <meshStandardMaterial color="#6b6b6b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Raised features (need grinding) */}
      <mesh position={[-0.08 * s, 0.085 * s, -0.06 * s]}>
        <boxGeometry args={[0.05 * s, 0.02 * s, 0.04 * s]} />
        <meshStandardMaterial color="#777777" metalness={0.6} roughness={0.5} />
      </mesh>

      <mesh position={[0.08 * s, 0.083 * s, 0.06 * s]}>
        <cylinderGeometry args={[0.025 * s, 0.025 * s, 0.016 * s, 16]} />
        <meshStandardMaterial color="#777777" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Weld spatter (to be ground off) */}
      {[
        [0.05, 0.077, 0.02],
        [-0.03, 0.078, -0.08],
        [0.1, 0.077, -0.03],
        [-0.1, 0.078, 0.05],
      ].map(([x, y, z], i) => (
        <mesh key={`spatter-${i}`} position={[x * s, y * s, z * s]}>
          <sphereGeometry args={[0.005 * s, 8, 8]} />
          <meshStandardMaterial color="#8B7355" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}

      {/* Surface region indicators */}
      {regions.map((region) => {
        const progress = grindingProgress[region.id] || 0;
        const isHighlighted = highlightedRegionId === region.id;
        const isActive = activeRegionId === region.id;

        // Calculate color based on progress (rough -> polished)
        const roughnessColor = progress > 0.8 ? '#99aacc' : progress > 0.4 ? '#889999' : '#667788';

        return (
          <group key={region.id}>
            {/* Region boundary indicator - rotated to lie flat on XZ plane (facing +Y) */}
            <mesh
              position={[region.center[0] * s, region.center[1] * s, region.center[2] * s]}
              rotation={[-Math.PI / 2, 0, region.rotation || 0]}
              onClick={(e) => {
                e.stopPropagation();
                onRegionClick?.(region.id);
              }}
            >
              <planeGeometry args={[region.size[0] * s, region.size[1] * s]} />
              <meshBasicMaterial
                color={isActive ? '#00ff88' : isHighlighted ? '#0088ff' : '#4488aa'}
                transparent
                opacity={isHighlighted || isActive ? 0.5 : 0.2}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Progress overlay */}
            {progress > 0 && (
              <mesh
                position={[region.center[0] * s, (region.center[1] + 0.001) * s, region.center[2] * s]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[region.size[0] * s * progress, region.size[1] * s]} />
                <meshStandardMaterial
                  color={roughnessColor}
                  metalness={0.9}
                  roughness={0.1 + (1 - progress) * 0.5}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Mounting holes */}
      {[
        [-0.12, -0.1],
        [0.12, -0.1],
        [-0.12, 0.1],
        [0.12, 0.1],
      ].map(([x, z], i) => (
        <mesh key={`hole-${i}`} position={[x * s, 0.076 * s, z * s]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008 * s, 0.008 * s, 0.02 * s, 12]} />
          <meshStandardMaterial color="#333333" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}

      {/* Fixture base */}
      <mesh position={[0, -0.015 * s, 0]}>
        <boxGeometry args={[0.35 * s, 0.03 * s, 0.3 * s]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
});

// ============================================================================
// Inspection Workpiece - Part with Defects
// ============================================================================

export interface DefectDefinition {
  id: string;
  position: Vector3Tuple;
  type: 'crack' | 'porosity' | 'inclusion' | 'surface';
  severity: 'critical' | 'warning' | 'minor';
  size?: number;
}

export interface IndustrialInspectionWorkpieceProps {
  /** Position offset */
  position?: Vector3Tuple;
  /** Scale factor */
  scale?: number;
  /** Mesh reference callback */
  onMeshRef?: (mesh: THREE.Mesh | null) => void;
  /** List of defects to display */
  defects?: DefectDefinition[];
  /** Selected defect ID */
  selectedDefectId?: string | null;
  /** Detected (scanned) defects */
  detectedDefectIds?: string[];
  /** Show defect markers */
  showDefects?: boolean;
  /** Callback when defect is clicked */
  onDefectClick?: (defectId: string) => void;
}

/**
 * Industrial inspection workpiece with simulated defects
 */
export const IndustrialInspectionWorkpiece = React.memo(function IndustrialInspectionWorkpiece({
  position = [0.5, 0, 0],
  scale = 1,
  onMeshRef,
  defects = [],
  selectedDefectId,
  detectedDefectIds = [],
  showDefects = true,
  onDefectClick,
}: IndustrialInspectionWorkpieceProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const s = scale;

  // Default defects if none provided
  const displayDefects = useMemo(() => {
    if (defects.length > 0) return defects;
    return [
      { id: 'def-1', position: [0.05, 0.051, 0.03] as Vector3Tuple, type: 'crack' as const, severity: 'critical' as const, size: 0.015 },
      { id: 'def-2', position: [-0.06, 0.051, -0.04] as Vector3Tuple, type: 'porosity' as const, severity: 'warning' as const, size: 0.008 },
      { id: 'def-3', position: [0.08, 0.051, -0.06] as Vector3Tuple, type: 'inclusion' as const, severity: 'minor' as const, size: 0.006 },
      { id: 'def-4', position: [-0.03, 0.051, 0.07] as Vector3Tuple, type: 'surface' as const, severity: 'warning' as const, size: 0.012 },
      { id: 'def-5', position: [0.02, 0.051, -0.08] as Vector3Tuple, type: 'crack' as const, severity: 'critical' as const, size: 0.02 },
    ];
  }, [defects]);

  // Get color based on defect severity
  const getDefectColor = (severity: string, detected: boolean) => {
    if (!detected) return '#888888';
    switch (severity) {
      case 'critical': return '#ff4444';
      case 'warning': return '#ffaa00';
      case 'minor': return '#44aaff';
      default: return '#ffffff';
    }
  };

  return (
    <group position={position}>
      {/* Main inspection part - machined aluminum block */}
      <mesh
        ref={(mesh) => {
          meshRef.current = mesh;
          onMeshRef?.(mesh);
        }}
        name="inspection_workpiece"
        position={[0, 0.025 * s, 0]}
        userData={{ workpieceId: 'inspection_workpiece' }}
      >
        <boxGeometry args={[0.25 * s, 0.05 * s, 0.2 * s]} />
        <meshStandardMaterial color="#a0a8b0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Machined pocket */}
      <mesh position={[0, 0.045 * s, 0]}>
        <boxGeometry args={[0.15 * s, 0.01 * s, 0.12 * s]} />
        <meshStandardMaterial color="#909098" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* Drilled holes */}
      {[
        [-0.08, 0],
        [0.08, 0],
        [0, -0.06],
        [0, 0.06],
      ].map(([x, z], i) => (
        <group key={`hole-${i}`}>
          <mesh position={[x * s, 0.051 * s, z * s]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012 * s, 0.012 * s, 0.03 * s, 16]} />
            <meshStandardMaterial color="#707078" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Chamfer */}
          <mesh position={[x * s, 0.052 * s, z * s]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015 * s, 0.012 * s, 0.004 * s, 16]} />
            <meshStandardMaterial color="#909098" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Raised boss */}
      <mesh position={[-0.08 * s, 0.058 * s, 0.06 * s]}>
        <cylinderGeometry args={[0.02 * s, 0.022 * s, 0.016 * s, 20]} />
        <meshStandardMaterial color="#a8b0b8" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Defect visualizations */}
      {showDefects && displayDefects.map((defect) => {
        const isDetected = detectedDefectIds.includes(defect.id);
        const isSelected = selectedDefectId === defect.id;
        const color = getDefectColor(defect.severity, isDetected);
        const size = (defect.size || 0.01) * s;

        return (
          <group
            key={defect.id}
            position={[defect.position[0] * s, defect.position[1] * s, defect.position[2] * s]}
          >
            {/* Defect marker */}
            {isDetected && (
              <>
                {/* Outer ring */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[size * 1.5, size * 0.15, 8, 24]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={isSelected ? 1 : 0.7}
                  />
                </mesh>

                {/* Center indicator */}
                <mesh
                  onClick={(e) => {
                    e.stopPropagation();
                    onDefectClick?.(defect.id);
                  }}
                >
                  <sphereGeometry args={[size * 0.5, 12, 12]} />
                  <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={isSelected ? 1 : 0.8}
                  />
                </mesh>

                {/* Selection highlight */}
                {isSelected && (
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[size * 2, size * 2.3, 24]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
                  </mesh>
                )}

                {/* Vertical indicator line */}
                <mesh position={[0, size * 2, 0]}>
                  <cylinderGeometry args={[size * 0.05, size * 0.05, size * 4, 8]} />
                  <meshBasicMaterial color={color} transparent opacity={0.5} />
                </mesh>
              </>
            )}

            {/* Actual defect visualization (subtle surface imperfection) */}
            {defect.type === 'crack' && (
              <mesh rotation={[Math.PI / 2, Math.random() * Math.PI, 0]}>
                <planeGeometry args={[size * 2, size * 0.2]} />
                <meshBasicMaterial color="#333333" transparent opacity={0.3} side={THREE.DoubleSide} />
              </mesh>
            )}
            {defect.type === 'porosity' && (
              <mesh>
                <sphereGeometry args={[size * 0.3, 8, 8]} />
                <meshStandardMaterial color="#555555" metalness={0.2} roughness={0.9} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Fixture plate */}
      <mesh position={[0, -0.01 * s, 0]}>
        <boxGeometry args={[0.3 * s, 0.02 * s, 0.25 * s]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.6} />
      </mesh>
    </group>
  );
});

// ============================================================================
// Exports
// ============================================================================

export default {
  IndustrialWeldingWorkpiece,
  IndustrialGrindingWorkpiece,
  IndustrialInspectionWorkpiece,
};
