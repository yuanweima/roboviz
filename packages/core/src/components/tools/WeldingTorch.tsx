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
 */
export const WELDING_TORCH_METADATA: ToolMetadata = {
  id: 'welding-torch',
  name: 'Welding Torch',
  description: 'MIG/TIG welding torch for arc welding processes',
  category: 'welding',
  defaultTcpOffset: {
    position: [0, 0, -0.08], // Offset to wire tip
    rotation: [0, 0, 0],
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

  return (
    <>
      {/* Handle/Grip */}
      <mesh position={[0, 0, s * 0.8]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.25, s * 0.3, s * 1.2, 16]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0, s * 0.1]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.15, s * 0.2, s * 0.6, 12]} />
        <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Gas diffuser */}
      <mesh position={[0, 0, -s * 0.2]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.12, s * 0.15, s * 0.3, 12]} />
        <meshStandardMaterial color="#886644" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Contact tip holder */}
      <mesh position={[0, 0, -s * 0.4]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.1, s * 0.12, s * 0.15, 12]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Nozzle (copper) */}
      <mesh position={[0, 0, -s * 0.55]} rotation={ROT_Y_TO_Z}>
        <coneGeometry args={[s * 0.18, s * 0.25, 16]} />
        <meshStandardMaterial color="#b87333" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Wire tip */}
      <mesh position={[0, 0, -s * 0.72]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.015, s * 0.015, s * 0.1, 8]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Gas tube connection */}
      <mesh position={[s * 0.2, 0, s * 0.9]} rotation={[Math.PI / 2, 0, Math.PI / 6]}>
        <cylinderGeometry args={[s * 0.08, s * 0.08, s * 0.4, 8]} />
        <meshStandardMaterial color="#222222" roughness={0.8} />
      </mesh>

      {/* Active welding effects */}
      {isActive && (
        <group position={[0, 0, -s * 0.75]}>
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
