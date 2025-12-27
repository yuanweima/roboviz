/**
 * WeldingTorch Component
 *
 * Industrial MIG/TIG welding torch visualization for robot end-effector.
 */

import * as React from 'react';
import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import type { WeldingTorchProps, ToolMetadata } from './types';

/**
 * Tool metadata for registration
 *
 * Coordinate System (same as GrindingWheel):
 * - Origin (0,0,0) = Flange mounting surface
 * - +Z = Tool extends outward (toward workpiece)
 * - Handle/body behind (in -Z), wire tip in front (+Z)
 *
 * TCP is at the wire tip (the welding contact point).
 * Geometry layout (at scale=1.0, s=0.1):
 * - Handle: Z = -0.06 (center), extends behind flange
 * - Neck: Z = +0.025
 * - Diffuser: Z = +0.0625
 * - Tip holder: Z = +0.0825
 * - Nozzle: Z = +0.1025
 * - Wire: Z = +0.121
 * - Wire tip end: Z = +0.127m
 */
export const WELDING_TORCH_METADATA: ToolMetadata = {
  id: 'welding-torch',
  name: 'Welding Torch',
  description: 'MIG/TIG welding torch for arc welding processes',
  category: 'welding',
  defaultTcpOffset: {
    position: [0, 0, 0.127], // Offset to wire tip end (in +Z direction)
    rotation: [0, 0, 0], // TCP Z-axis aligned with flange Z-axis
  },
  defaultScale: 1.0,
};

/**
 * Internal torch geometry (without positioning)
 */
function TorchGeometry({
  color = '#ff6b35',
  isActive = false,
  scale = 1,
}: {
  color?: string;
  isActive?: boolean;
  scale?: number;
}) {
  const sparkRef = useRef<THREE.PointLight>(null);
  const timeRef = useRef(0);

  // Animate spark when active
  useFrame((_, delta) => {
    if (isActive && sparkRef.current) {
      timeRef.current += delta * 20;
      sparkRef.current.intensity = 2 + Math.sin(timeRef.current) * 1.5 + Math.random() * 0.5;
    }
  });

  const s = scale * 0.1; // Base scale factor
  // Rotation to align cylinders from Y-axis to Z-axis (tool forward direction)
  const ROT_Y_TO_Z: [number, number, number] = [Math.PI / 2, 0, 0];

  // Part dimensions (heights along Z-axis after rotation)
  const handleHeight = s * 1.2;
  const neckHeight = s * 0.5;
  const diffuserHeight = s * 0.25;
  const tipHolderHeight = s * 0.15;
  const nozzleHeight = s * 0.25;
  const wireHeight = s * 0.12;

  // Calculate Z positions so parts connect end-to-end
  // Coordinate system: +Z = toward workpiece, -Z = behind (toward robot)
  // Handle is behind the flange (in -Z direction)
  const handleZ = -handleHeight / 2;
  // Neck connects at handle front, extends in +Z direction
  const neckZ = neckHeight / 2;
  // Diffuser connects at neck end
  const diffuserZ = neckHeight + diffuserHeight / 2;
  // Tip holder connects at diffuser end
  const tipHolderZ = neckHeight + diffuserHeight + tipHolderHeight / 2;
  // Nozzle (cone) connects at tip holder end
  const nozzleZ = neckHeight + diffuserHeight + tipHolderHeight + nozzleHeight / 2;
  // Wire tip extends from nozzle (toward workpiece)
  const wireZ = neckHeight + diffuserHeight + tipHolderHeight + nozzleHeight + wireHeight / 2;

  return (
    <>
      {/* Handle/Grip - main body behind the flange */}
      <mesh position={[0, 0, handleZ]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.22, s * 0.28, handleHeight, 16]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Neck - tapers down from handle */}
      <mesh position={[0, 0, neckZ]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.12, s * 0.18, neckHeight, 12]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Gas diffuser */}
      <mesh position={[0, 0, diffuserZ]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.10, s * 0.12, diffuserHeight, 12]} />
        <meshStandardMaterial color="#886644" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Contact tip holder */}
      <mesh position={[0, 0, tipHolderZ]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.08, s * 0.10, tipHolderHeight, 12]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Nozzle (copper cone) - base (wide end) toward workpiece (+Z) */}
      <mesh position={[0, 0, nozzleZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[s * 0.14, nozzleHeight, 16]} />
        <meshStandardMaterial color="#b87333" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Wire tip - extends from nozzle */}
      <mesh position={[0, 0, wireZ]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.012, s * 0.012, wireHeight, 8]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Gas tube connection - on the side of handle (behind) */}
      <mesh position={[s * 0.25, 0, handleZ]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[s * 0.06, s * 0.06, s * 0.3, 8]} />
        <meshStandardMaterial color="#222222" roughness={0.8} />
      </mesh>

      {/* Active welding effects - at wire tip (front) */}
      {isActive && (
        <group position={[0, 0, wireZ + wireHeight / 2]}>
          {/* Arc light */}
          <pointLight
            ref={sparkRef}
            color="#00aaff"
            intensity={3}
            distance={s * 5}
            decay={2}
          />
          {/* Molten pool glow */}
          <mesh>
            <sphereGeometry args={[s * 0.08, 8, 8]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.9} />
          </mesh>
          {/* Spark emitter */}
          <mesh>
            <sphereGeometry args={[s * 0.03, 6, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      )}
    </>
  );
}

/**
 * WeldingTorch - Industrial MIG/TIG welding torch
 *
 * @example
 * ```tsx
 * <EndEffector tcpOffset={WELDING_TORCH_METADATA.defaultTcpOffset}>
 *   <WeldingTorch isActive={isWelding} color="#ff6600" />
 * </EndEffector>
 * ```
 */
export const WeldingTorch = memo(function WeldingTorch({
  position,
  quaternion,
  scale = 1,
  isActive = false,
  showAxes = false,
  opacity = 1,
  color = '#ff6b35',
}: WeldingTorchProps) {
  return (
    <BaseTool
      position={position}
      quaternion={quaternion}
      scale={scale}
      showAxes={showAxes}
      opacity={opacity}
    >
      <TorchGeometry color={color} isActive={isActive} scale={1} />
    </BaseTool>
  );
});
