/**
 * BaseWorkpiece Component
 *
 * Base wrapper component for workpiece visualizations.
 * Provides common functionality like positioning, feature rendering, and interaction.
 */

import * as React from 'react';
import { forwardRef, useCallback, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { WorkpieceBaseProps, WorkpieceProps, LinearFeature, SurfaceFeature, PointFeature } from './types';

// =============================================================================
// Base Workpiece Wrapper
// =============================================================================

export interface BaseWorkpieceWrapperProps extends WorkpieceBaseProps {
  /** Children to render inside the workpiece group */
  children: React.ReactNode;
  /** Unique name for the mesh */
  name?: string;
  /** User data to attach to the mesh */
  userData?: Record<string, unknown>;
}

/**
 * Base workpiece wrapper - handles common positioning and mesh reference
 */
export const BaseWorkpiece = forwardRef<THREE.Group, BaseWorkpieceWrapperProps>(
  function BaseWorkpiece(
    {
      position = [0, 0, 0],
      scale = 1,
      onMeshRef,
      opacity = 1,
      debug = false,
      name = 'workpiece',
      userData = {},
      children,
    },
    ref
  ) {
    const internalRef = useRef<THREE.Group>(null);

    // Combine refs
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(internalRef.current);
        } else {
          ref.current = internalRef.current;
        }
      }
    }, [ref]);

    return (
      <group
        ref={internalRef}
        position={position}
        scale={[scale, scale, scale]}
        name={name}
        userData={{ ...userData, workpieceId: name }}
      >
        {debug && <axesHelper args={[0.1 * scale]} />}
        {children}
      </group>
    );
  }
);

// =============================================================================
// Feature Renderers
// =============================================================================

/**
 * Props for rendering linear features
 */
export interface LinearFeatureRendererProps {
  features: LinearFeature[];
  highlightedId?: string | null;
  selectedId?: string | null;
  progress?: Record<string, number>;
  scale?: number;
  defaultColor?: string;
  highlightColor?: string;
  progressColor?: string;
  onClick?: (featureId: string) => void;
  onHover?: (featureId: string | null) => void;
}

/**
 * Renders linear features (seams, edges) on a workpiece
 */
export function LinearFeatureRenderer({
  features,
  highlightedId,
  selectedId,
  progress = {},
  scale = 1,
  defaultColor = '#ff9500',
  highlightColor = '#ff6b35',
  progressColor = '#8B7355',
  onClick,
  onHover,
}: LinearFeatureRendererProps): React.JSX.Element {
  return (
    <>
      {features.map((feature) => {
        const featureProgress = progress[feature.id] || 0;
        const isHighlighted = highlightedId === feature.id;
        const isSelected = selectedId === feature.id;

        const start = new THREE.Vector3(...feature.start).multiplyScalar(scale);
        const end = new THREE.Vector3(...feature.end).multiplyScalar(scale);
        const length = start.distanceTo(end);
        const center = start.clone().add(end).multiplyScalar(0.5);
        const direction = end.clone().sub(start).normalize();
        const angle = Math.atan2(direction.x, direction.z);

        const lineWidth = 0.008 * scale;
        const lineHeight = 0.003 * scale;

        return (
          <group key={feature.id}>
            {/* Feature line indicator */}
            <mesh
              position={[center.x, center.y + lineHeight / 2, center.z]}
              rotation={[0, angle, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(feature.id);
              }}
              onPointerEnter={() => onHover?.(feature.id)}
              onPointerLeave={() => onHover?.(null)}
            >
              <boxGeometry args={[lineWidth, lineHeight, length]} />
              <meshBasicMaterial
                color={isHighlighted || isSelected ? highlightColor : defaultColor}
                transparent
                opacity={isHighlighted || isSelected ? 1 : 0.7}
              />
            </mesh>

            {/* Progress overlay */}
            {featureProgress > 0 && (
              <mesh
                position={[
                  start.x + direction.x * length * featureProgress * 0.5,
                  center.y + lineHeight,
                  start.z + direction.z * length * featureProgress * 0.5,
                ]}
                rotation={[0, angle, 0]}
              >
                <boxGeometry args={[lineWidth * 1.5, lineHeight * 2, length * featureProgress]} />
                <meshStandardMaterial
                  color={progressColor}
                  metalness={0.4}
                  roughness={0.6}
                  emissive={featureProgress < 1 ? '#ff4400' : '#000000'}
                  emissiveIntensity={featureProgress < 1 ? 0.3 : 0}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

/**
 * Props for rendering surface features
 */
export interface SurfaceFeatureRendererProps {
  features: SurfaceFeature[];
  highlightedId?: string | null;
  selectedId?: string | null;
  activeId?: string | null;
  progress?: Record<string, number>;
  scale?: number;
  defaultColor?: string;
  highlightColor?: string;
  activeColor?: string;
  onClick?: (featureId: string) => void;
  onHover?: (featureId: string | null) => void;
}

/**
 * Renders surface features (regions) on a workpiece
 */
export function SurfaceFeatureRenderer({
  features,
  highlightedId,
  selectedId,
  activeId,
  progress = {},
  scale = 1,
  defaultColor = '#4488aa',
  highlightColor = '#0088ff',
  activeColor = '#00ff88',
  onClick,
  onHover,
}: SurfaceFeatureRendererProps): React.JSX.Element {
  return (
    <>
      {features.map((feature) => {
        const featureProgress = progress[feature.id] || 0;
        const isHighlighted = highlightedId === feature.id;
        const isSelected = selectedId === feature.id;
        const isActive = activeId === feature.id;

        const center = new THREE.Vector3(...feature.center).multiplyScalar(scale);
        const width = (feature.size[0] || 0.1) * scale;
        const depth = (feature.size[1] || 0.1) * scale;

        let color = defaultColor;
        if (isActive) color = activeColor;
        else if (isHighlighted || isSelected) color = highlightColor;

        const opacity = isHighlighted || isActive || isSelected ? 0.5 : 0.2;

        return (
          <group key={feature.id}>
            {/* Region boundary indicator */}
            <mesh
              position={[center.x, center.y, center.z]}
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(feature.id);
              }}
              onPointerEnter={() => onHover?.(feature.id)}
              onPointerLeave={() => onHover?.(null)}
            >
              <planeGeometry args={[width, depth]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Progress overlay */}
            {featureProgress > 0 && (
              <mesh position={[center.x, center.y + 0.001 * scale, center.z]}>
                <planeGeometry args={[width * featureProgress, depth]} />
                <meshStandardMaterial
                  color="#99aacc"
                  metalness={0.9}
                  roughness={0.1 + (1 - featureProgress) * 0.5}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

/**
 * Props for rendering point features
 */
export interface PointFeatureRendererProps {
  features: PointFeature[];
  highlightedId?: string | null;
  selectedId?: string | null;
  detectedIds?: string[];
  scale?: number;
  showMarkers?: boolean;
  onClick?: (featureId: string) => void;
  onHover?: (featureId: string | null) => void;
}

/**
 * Get color for point feature based on severity
 */
function getPointFeatureColor(severity: string, detected: boolean): string {
  if (!detected) return '#888888';
  switch (severity) {
    case 'critical': return '#ff4444';
    case 'warning': return '#ffaa00';
    case 'minor': return '#44aaff';
    case 'info': return '#44ff44';
    default: return '#ffffff';
  }
}

/**
 * Renders point features (defects, markers) on a workpiece
 */
export function PointFeatureRenderer({
  features,
  highlightedId,
  selectedId,
  detectedIds = [],
  scale = 1,
  showMarkers = true,
  onClick,
  onHover,
}: PointFeatureRendererProps): React.JSX.Element {
  return (
    <>
      {features.map((feature) => {
        const isDetected = detectedIds.includes(feature.id);
        const isHighlighted = highlightedId === feature.id;
        const isSelected = selectedId === feature.id;
        const color = getPointFeatureColor(feature.severity || 'info', isDetected);
        const size = (feature.size || 0.01) * scale;

        const pos = new THREE.Vector3(...feature.position).multiplyScalar(scale);

        if (!showMarkers && !isDetected) return null;

        return (
          <group key={feature.id} position={pos}>
            {/* Detection marker (shown when detected) */}
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
                    onClick?.(feature.id);
                  }}
                  onPointerEnter={() => onHover?.(feature.id)}
                  onPointerLeave={() => onHover?.(null)}
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
              </>
            )}

            {/* Undetected marker (subtle) */}
            {!isDetected && showMarkers && (
              <mesh>
                <sphereGeometry args={[size * 0.3, 8, 8]} />
                <meshBasicMaterial color="#666666" transparent opacity={0.3} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}
