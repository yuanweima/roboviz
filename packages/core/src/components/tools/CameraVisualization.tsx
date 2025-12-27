/**
 * CameraVisualization Component
 *
 * Core component for visualizing industrial camera FOV, preview images, and depth maps.
 * Supports monocular and stereo camera configurations.
 *
 * Features:
 * - FOV frustum visualization with configurable parameters
 * - Camera preview rendering (simulated or real)
 * - Stereo camera depth map visualization
 * - Integration with EndEffector for robot-mounted cameras
 *
 * @example
 * ```tsx
 * <EndEffector>
 *   <CameraVisualization
 *     fov={15}
 *     workingDistance={0.25}
 *     showFrustum={true}
 *     showPreview={true}
 *   />
 * </EndEffector>
 * ```
 */

import * as React from 'react';
import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// =============================================================================
// Types
// =============================================================================

export type CameraType = 'monocular' | 'stereo';

export interface CameraConfig {
  /** Camera type */
  type?: CameraType;
  /** Horizontal FOV in degrees */
  fovHorizontal: number;
  /** Vertical FOV in degrees (defaults to fovHorizontal * 0.75 for 4:3 aspect) */
  fovVertical?: number;
  /** Working distance in meters */
  workingDistance: number;
  /** Near plane distance (default: 0.01m) */
  nearPlane?: number;
  /** Image resolution [width, height] */
  resolution?: [number, number];
  /** Stereo baseline in meters (only for stereo cameras) */
  baseline?: number;
}

export interface FrustumStyle {
  /** Frustum line color */
  color?: string;
  /** Frustum line opacity */
  opacity?: number;
  /** Far plane fill color */
  fillColor?: string;
  /** Far plane fill opacity */
  fillOpacity?: number;
  /** Active state color override */
  activeColor?: string;
}

export interface CameraVisualizationProps {
  /** Camera configuration */
  config?: Partial<CameraConfig>;
  /** Whether to show the FOV frustum */
  showFrustum?: boolean;
  /** Whether to show camera preview panel */
  showPreview?: boolean;
  /** Whether to show depth map (stereo cameras only) */
  showDepthMap?: boolean;
  /** Whether camera is currently active/capturing */
  isActive?: boolean;
  /** Frustum visual style */
  frustumStyle?: FrustumStyle;
  /** Preview panel size in 3D space [width, height] */
  previewSize?: [number, number];
  /** Preview panel offset from camera */
  previewOffset?: [number, number, number];
  /** Custom preview texture (for real camera feed) */
  previewTexture?: THREE.Texture | null;
  /** Custom depth texture (for stereo cameras) */
  depthTexture?: THREE.Texture | null;
  /** Callback when frustum is clicked */
  onFrustumClick?: () => void;
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  type: 'monocular',
  fovHorizontal: 15,
  workingDistance: 0.25,
  nearPlane: 0.01,
  resolution: [1920, 1080],
};

const DEFAULT_FRUSTUM_STYLE: FrustumStyle = {
  color: '#00ffcc',
  opacity: 0.6,
  fillColor: '#00ffcc',
  fillOpacity: 0.15,
  activeColor: '#00ff88',
};

// =============================================================================
// CameraFrustum Component - Core frustum visualization
// =============================================================================

interface CameraFrustumProps {
  config: CameraConfig;
  style: FrustumStyle;
  isActive: boolean;
  onClick?: () => void;
}

function CameraFrustum({
  config,
  style,
  isActive,
  onClick,
}: CameraFrustumProps): React.JSX.Element {
  const { fovHorizontal, fovVertical, workingDistance, nearPlane = 0.01 } = config;

  // Calculate frustum dimensions
  const frustumGeometry = useMemo(() => {
    const fovH = fovHorizontal * (Math.PI / 180);
    const fovV = (fovVertical ?? fovHorizontal * 0.75) * (Math.PI / 180);

    // Near plane dimensions
    const nearHalfWidth = Math.tan(fovH / 2) * nearPlane;
    const nearHalfHeight = Math.tan(fovV / 2) * nearPlane;

    // Far plane dimensions at working distance
    const farHalfWidth = Math.tan(fovH / 2) * workingDistance;
    const farHalfHeight = Math.tan(fovV / 2) * workingDistance;

    // Frustum extends along +Z axis (camera looks along +Z)
    const near = nearPlane;
    const far = workingDistance;

    // Line segments for frustum edges
    const positions = new Float32Array([
      // Near plane corners to far plane corners (4 edges)
      -nearHalfWidth, -nearHalfHeight, near, -farHalfWidth, -farHalfHeight, far,
      nearHalfWidth, -nearHalfHeight, near, farHalfWidth, -farHalfHeight, far,
      nearHalfWidth, nearHalfHeight, near, farHalfWidth, farHalfHeight, far,
      -nearHalfWidth, nearHalfHeight, near, -farHalfWidth, farHalfHeight, far,
      // Near plane rectangle
      -nearHalfWidth, -nearHalfHeight, near, nearHalfWidth, -nearHalfHeight, near,
      nearHalfWidth, -nearHalfHeight, near, nearHalfWidth, nearHalfHeight, near,
      nearHalfWidth, nearHalfHeight, near, -nearHalfWidth, nearHalfHeight, near,
      -nearHalfWidth, nearHalfHeight, near, -nearHalfWidth, -nearHalfHeight, near,
      // Far plane rectangle
      -farHalfWidth, -farHalfHeight, far, farHalfWidth, -farHalfHeight, far,
      farHalfWidth, -farHalfHeight, far, farHalfWidth, farHalfHeight, far,
      farHalfWidth, farHalfHeight, far, -farHalfWidth, farHalfHeight, far,
      -farHalfWidth, farHalfHeight, far, -farHalfWidth, -farHalfHeight, far,
    ]);

    return {
      positions,
      farWidth: farHalfWidth * 2,
      farHeight: farHalfHeight * 2,
      far,
    };
  }, [fovHorizontal, fovVertical, workingDistance, nearPlane]);

  const color = isActive ? (style.activeColor ?? style.color) : style.color;

  return (
    <group onClick={onClick}>
      {/* Frustum edge lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[frustumGeometry.positions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={isActive ? style.opacity! * 1.2 : style.opacity}
        />
      </lineSegments>

      {/* Far plane fill (scan area indicator) */}
      <mesh position={[0, 0, frustumGeometry.far]}>
        <planeGeometry args={[frustumGeometry.farWidth, frustumGeometry.farHeight]} />
        <meshBasicMaterial
          color={isActive ? style.activeColor : style.fillColor}
          transparent
          opacity={isActive ? style.fillOpacity! * 1.5 : style.fillOpacity}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center crosshair at working distance */}
      <group position={[0, 0, frustumGeometry.far]}>
        <mesh rotation={[0, 0, 0]}>
          <ringGeometry args={[0.003, 0.005, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
        {/* Cross lines */}
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([
                -0.008, 0, 0, 0.008, 0, 0,
                0, -0.008, 0, 0, 0.008, 0,
              ]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={color} />
        </lineSegments>
      </group>
    </group>
  );
}

// =============================================================================
// CameraPreviewPanel Component - Preview/depth display
// =============================================================================

interface CameraPreviewPanelProps {
  texture: THREE.Texture | null;
  size: [number, number];
  offset: [number, number, number];
  label?: string;
  borderColor?: string;
}

function CameraPreviewPanel({
  texture,
  size,
  offset,
  label = 'Preview',
  borderColor = '#00ffcc',
}: CameraPreviewPanelProps): React.JSX.Element {
  // Create a simple gradient texture if no texture provided
  const fallbackTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark gradient to simulate no signal
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#0a0a15');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add "No Signal" text
      ctx.fillStyle = '#333355';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO SIGNAL', canvas.width / 2, canvas.height / 2);

      // Add scan lines effect
      ctx.strokeStyle = '#222240';
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      fallbackTexture.dispose();
    };
  }, [fallbackTexture]);

  const displayTexture = texture ?? fallbackTexture;

  return (
    <group position={offset}>
      {/* Preview plane */}
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial map={displayTexture} side={THREE.DoubleSide} />
      </mesh>

      {/* Border frame */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([
              -size[0] / 2, -size[1] / 2, 0.001, size[0] / 2, -size[1] / 2, 0.001,
              size[0] / 2, -size[1] / 2, 0.001, size[0] / 2, size[1] / 2, 0.001,
              size[0] / 2, size[1] / 2, 0.001, -size[0] / 2, size[1] / 2, 0.001,
              -size[0] / 2, size[1] / 2, 0.001, -size[0] / 2, -size[1] / 2, 0.001,
            ]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={borderColor} />
      </lineSegments>

      {/* Label - positioned above the preview */}
      {/* Note: Text rendering would require additional setup, skipping for now */}
    </group>
  );
}

// =============================================================================
// StereoFrustum Component - Dual frustum for stereo cameras
// =============================================================================

interface StereoFrustumProps {
  config: CameraConfig;
  style: FrustumStyle;
  isActive: boolean;
}

function StereoFrustum({
  config,
  style,
  isActive,
}: StereoFrustumProps): React.JSX.Element {
  const baseline = config.baseline ?? 0.065; // Default 65mm baseline
  const halfBaseline = baseline / 2;

  return (
    <group>
      {/* Left camera frustum */}
      <group position={[-halfBaseline, 0, 0]}>
        <CameraFrustum
          config={config}
          style={{ ...style, color: '#ff6688', activeColor: '#ff8899' }}
          isActive={isActive}
        />
      </group>

      {/* Right camera frustum */}
      <group position={[halfBaseline, 0, 0]}>
        <CameraFrustum
          config={config}
          style={{ ...style, color: '#6688ff', activeColor: '#8899ff' }}
          isActive={isActive}
        />
      </group>

      {/* Overlap region indicator (depth valid area) */}
      <mesh position={[0, 0, config.workingDistance]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.01, 0.015, 32]} />
        <meshBasicMaterial
          color={isActive ? '#00ff00' : '#888888'}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

// =============================================================================
// Main CameraVisualization Component
// =============================================================================

export function CameraVisualization({
  config: configProp,
  showFrustum = true,
  showPreview = false,
  showDepthMap = false,
  isActive = false,
  frustumStyle: styleProp,
  previewSize = [0.15, 0.1125],
  previewOffset = [0.2, 0.1, 0],
  previewTexture = null,
  depthTexture = null,
  onFrustumClick,
}: CameraVisualizationProps): React.JSX.Element {
  // Merge with defaults
  const config: CameraConfig = { ...DEFAULT_CAMERA_CONFIG, ...configProp };
  const style: FrustumStyle = { ...DEFAULT_FRUSTUM_STYLE, ...styleProp };

  const isStereo = config.type === 'stereo';

  return (
    <group>
      {/* Frustum visualization */}
      {showFrustum && (
        isStereo ? (
          <StereoFrustum
            config={config}
            style={style}
            isActive={isActive}
          />
        ) : (
          <CameraFrustum
            config={config}
            style={style}
            isActive={isActive}
            onClick={onFrustumClick}
          />
        )
      )}

      {/* Camera preview panel */}
      {showPreview && (
        <CameraPreviewPanel
          texture={previewTexture}
          size={previewSize}
          offset={previewOffset}
          label="RGB Preview"
          borderColor={style.color}
        />
      )}

      {/* Depth map panel (stereo cameras) */}
      {showDepthMap && isStereo && (
        <CameraPreviewPanel
          texture={depthTexture}
          size={previewSize}
          offset={[previewOffset[0] + previewSize[0] + 0.02, previewOffset[1], previewOffset[2]]}
          label="Depth Map"
          borderColor="#ffaa00"
        />
      )}
    </group>
  );
}

export default CameraVisualization;
