/**
 * InspectionCamera Component
 *
 * Industrial inspection camera with structured light / laser line projection.
 * Designed to mount directly at flange coordinate system origin.
 *
 * Coordinate System:
 * - Origin (0,0,0) = Flange mounting surface (bracket back)
 * - +Z = Camera body extends outward from flange
 * - -X = Lens/optical axis points toward workpiece
 * - +Y = Up direction
 *
 * TCP is at the lens front, with rotation to orient Z-axis along -X.
 */

import * as React from 'react';
import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import { CameraVisualization } from './CameraVisualization';
import type { ToolMetadata, InspectionCameraProps } from './types';

/**
 * Tool metadata for InspectionCamera
 *
 * TCP is at the camera's lens front position.
 * The default TCP offset positions the TCP:
 * - At the lens front (-X direction from flange)
 * - Working distance is added dynamically by the scene
 */
export const INSPECTION_CAMERA_METADATA: ToolMetadata & { defaultWorkingDistance: number } = {
  id: 'inspection-camera',
  name: 'Inspection Camera',
  description: 'Industrial camera with structured light for surface inspection',
  category: 'inspection',
  /**
   * Default TCP offset: from flange origin to lens front
   * - Position: [-0.085, 0, 0.0075] (lens front position in flange coords)
   *   - X: bracketWidth/2 + bodyDepth + lensBarrelLength ≈ 0.015 + 0.06 + 0.025 = 0.085
   *   - Y: 0 (centered)
   *   - Z: bracketThickness/2 ≈ 0.0075
   * - Rotation: [0, -π/2, 0] to orient TCP Z-axis along -X (toward workpiece)
   */
  defaultTcpOffset: {
    position: [-0.085, 0, 0.0075],
    rotation: [0, -Math.PI / 2, 0],
  },
  defaultScale: 1.0,
  defaultWorkingDistance: 0.25,
};

/**
 * Extended props for InspectionCamera
 */
export interface InspectionCameraExtendedProps extends InspectionCameraProps {
  /** Show camera frustum (FOV visualization) */
  showFrustum?: boolean;
  /** Show camera preview panel */
  showPreview?: boolean;
  /** Show depth map (stereo mode only) */
  showDepthMap?: boolean;
  /** Camera type: monocular or stereo */
  cameraType?: 'monocular' | 'stereo';
  /** Stereo baseline in meters (default 0.065 = 65mm) */
  stereoBaseline?: number;
  /** Camera FOV in degrees (default 15) */
  fov?: number;
  /** Camera working distance in meters (default 0.25) */
  workingDistance?: number;
  /** Preview texture (for real camera feed) */
  previewTexture?: THREE.Texture | null;
  /** Depth texture (for stereo depth map) */
  depthTexture?: THREE.Texture | null;
}

/**
 * Internal camera geometry
 */
function CameraGeometry({
  color = '#9b59b6',
  isActive = false,
  showLaser = true,
  showFrustum = true,
  showPreview = false,
  showDepthMap = false,
  cameraType = 'monocular',
  stereoBaseline = 0.065,
  fov = 15,
  workingDistance = 0.25,
  previewTexture = null,
  depthTexture = null,
  scale = 1,
}: {
  color?: string;
  isActive?: boolean;
  showLaser?: boolean;
  showFrustum?: boolean;
  showPreview?: boolean;
  showDepthMap?: boolean;
  cameraType?: 'monocular' | 'stereo';
  stereoBaseline?: number;
  fov?: number;
  workingDistance?: number;
  previewTexture?: THREE.Texture | null;
  depthTexture?: THREE.Texture | null;
  scale?: number;
}) {
  const laserRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.PointLight>(null);
  const timeRef = useRef(0);

  // Animate laser and LEDs when active
  useFrame((_, delta) => {
    if (isActive) {
      timeRef.current += delta;
      if (laserRef.current) {
        const mat = laserRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 + Math.sin(timeRef.current * 10) * 0.2;
      }
      if (ledRef.current) {
        ledRef.current.intensity = 1 + Math.sin(timeRef.current * 5) * 0.3;
      }
    }
  });

  const s = scale * 0.1;

  // Dimensions
  const bracketThickness = s * 0.15;
  const bracketHeight = s * 0.5;
  const bracketWidth = s * 0.3;

  const bodyDepth = s * 0.6;
  const bodyHeight = s * 0.5;
  const bodyWidth = s * 0.4;

  const lensBarrelLength = s * 0.25;
  const lensRadius = s * 0.15;

  // Position calculations
  const bracketCenterZ = bracketThickness / 2;
  const bodyCenterX = -bracketWidth / 2 - bodyDepth / 2;
  const bodyZ = bracketCenterZ;
  const lensCenterX = bodyCenterX - bodyDepth / 2 - lensBarrelLength / 2;
  const lensFrontX = lensCenterX - lensBarrelLength / 2 - s * 0.02;

  return (
    <>
      {/* ====== MOUNTING BRACKET ====== */}
      <mesh position={[0, 0, bracketCenterZ]}>
        <boxGeometry args={[bracketWidth, bracketHeight, bracketThickness]} />
        <meshStandardMaterial color={color} metalness={0.75} roughness={0.2} />
      </mesh>

      {/* ====== CAMERA BODY ====== */}
      <mesh position={[bodyCenterX, 0, bodyZ]}>
        <boxGeometry args={[bodyDepth, bodyHeight, bodyWidth]} />
        <meshStandardMaterial color="#454550" metalness={0.65} roughness={0.3} />
      </mesh>

      {/* Body accent stripe */}
      <mesh position={[bodyCenterX, bodyHeight / 2 - s * 0.02, bodyZ]}>
        <boxGeometry args={[bodyDepth + 0.002, s * 0.04, bodyWidth + 0.002]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
      </mesh>

      {/* ====== LENS ASSEMBLY ====== */}
      <mesh position={[lensCenterX, 0, bodyZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lensRadius * 0.9, lensRadius, lensBarrelLength, 24]} />
        <meshStandardMaterial color="#353540" metalness={0.75} roughness={0.2} />
      </mesh>

      {/* Lens ring */}
      <mesh position={[lensFrontX, 0, bodyZ]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[lensRadius * 0.85, s * 0.015, 12, 24]} />
        <meshStandardMaterial color="#606570" metalness={0.8} roughness={0.15} />
      </mesh>

      {/* Lens glass */}
      <mesh position={[lensFrontX - s * 0.01, 0, bodyZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[lensRadius * 0.7, lensRadius * 0.7, s * 0.015, 24]} />
        <meshStandardMaterial
          color="#1a3060"
          metalness={0.95}
          roughness={0.02}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* ====== LED RING LIGHTS ====== */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = lensRadius * 1.1;
        return (
          <mesh
            key={i}
            position={[
              lensFrontX,
              Math.cos(angle) * r,
              bodyZ + Math.sin(angle) * r,
            ]}
          >
            <sphereGeometry args={[s * 0.018, 8, 8]} />
            <meshBasicMaterial
              color={isActive ? '#ffffff' : '#444444'}
              transparent
              opacity={isActive ? 1 : 0.5}
            />
          </mesh>
        );
      })}

      {/* LED light emission */}
      {isActive && (
        <pointLight
          ref={ledRef}
          position={[lensFrontX - s * 0.03, 0, bodyZ]}
          color="#ffffff"
          intensity={1}
          distance={s * 3}
          decay={2}
        />
      )}

      {/* ====== CABLE CONNECTION ====== */}
      <mesh
        position={[bodyCenterX + bodyDepth / 2 + s * 0.05, bodyHeight / 3, bodyZ]}
        rotation={[0, 0, -Math.PI / 6]}
      >
        <cylinderGeometry args={[s * 0.04, s * 0.04, s * 0.15, 8]} />
        <meshStandardMaterial color="#2a2a30" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* ====== LASER LINE PROJECTION ====== */}
      {isActive && showLaser && (
        <group position={[lensFrontX - s * 0.02, 0, bodyZ]}>
          <mesh
            ref={laserRef}
            position={[-s * 10, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <planeGeometry args={[s * 2, s * 0.012]} />
            <meshBasicMaterial
              color="#ff0000"
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[s * 0.012, 8, 8]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        </group>
      )}

      {/* ====== CAMERA FRUSTUM ====== */}
      {(showFrustum || showPreview || showDepthMap) && (
        <group position={[lensFrontX - s * 0.02, 0, bodyZ]} rotation={[Math.PI, -Math.PI / 2, 0]}>
          <CameraVisualization
            config={{
              type: cameraType,
              fovHorizontal: fov,
              workingDistance: workingDistance,
              nearPlane: 0.01,
              baseline: stereoBaseline,
            }}
            showFrustum={showFrustum}
            showPreview={showPreview}
            showDepthMap={showDepthMap && cameraType === 'stereo'}
            isActive={isActive}
            previewTexture={previewTexture}
            depthTexture={depthTexture}
            previewSize={[0.12, 0.09]}
            previewOffset={[0.15, 0.08, 0]}
            frustumStyle={{
              color: color,
              activeColor: '#00ffcc',
              opacity: 0.6,
              fillOpacity: 0.15,
            }}
          />
        </group>
      )}
    </>
  );
}

/**
 * InspectionCamera - Industrial inspection camera with structured light
 *
 * @example
 * ```tsx
 * <EndEffector>
 *   <InspectionCamera isActive={isScanning} showFrustum showLaser />
 * </EndEffector>
 * ```
 */
export const InspectionCamera = memo(function InspectionCamera({
  position,
  quaternion,
  scale = 1,
  isActive = false,
  showAxes = false,
  opacity = 1,
  color = '#9b59b6',
  showLaser = true,
  showFrustum = true,
  showPreview = false,
  showDepthMap = false,
  cameraType = 'monocular',
  stereoBaseline = 0.065,
  fov = 15,
  workingDistance = 0.25,
  previewTexture = null,
  depthTexture = null,
}: InspectionCameraExtendedProps) {
  return (
    <BaseTool
      position={position}
      quaternion={quaternion}
      scale={scale}
      showAxes={showAxes}
      opacity={opacity}
    >
      <CameraGeometry
        color={color}
        isActive={isActive}
        showLaser={showLaser}
        showFrustum={showFrustum}
        showPreview={showPreview}
        showDepthMap={showDepthMap}
        cameraType={cameraType}
        stereoBaseline={stereoBaseline}
        fov={fov}
        workingDistance={workingDistance}
        previewTexture={previewTexture}
        depthTexture={depthTexture}
        scale={1}
      />
    </BaseTool>
  );
});
