/**
 * GrindingWheel Component
 *
 * Industrial angle grinder / polishing wheel visualization for robot end-effector.
 * Designed to mount directly at flange coordinate system origin.
 *
 * Coordinate System:
 * - Origin (0,0,0) = Flange mounting surface
 * - +Z = Tool extends outward (toward workpiece)
 * - Motor body behind, grinding disc in front
 *
 * TCP is at the grinding disc front edge along +Z axis.
 */

import * as React from 'react';
import { useRef, useMemo, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BaseTool } from './BaseTool';
import type { ToolMetadata, GrindingWheelProps } from './types';

/**
 * Tool metadata for GrindingWheel
 *
 * TCP is at the grinding contact point on the disc front edge.
 */
export const GRINDING_WHEEL_METADATA: ToolMetadata = {
  id: 'grinding-wheel',
  name: 'Grinding Wheel',
  description: 'Industrial angle grinder for surface finishing',
  category: 'grinding',
  /**
   * Default TCP offset: from flange origin to grinding contact point
   * - Position: [0, 0, 0.031] (disc front surface)
   *   - X: 0 (centered)
   *   - Y: 0 (centered for IK)
   *   - Z: 0.031 = disc front position (scale 1.0)
   * - Rotation: [0, 0, 0] (TCP Z-axis aligned with flange Z-axis)
   */
  defaultTcpOffset: {
    position: [0, 0, 0.031],
    rotation: [0, 0, 0],
  },
  defaultScale: 1.0,
};

/**
 * Internal grinding wheel geometry
 */
function GrindingWheelGeometry({
  color = '#0066cc',
  isActive = false,
  rpm = 3000,
  scale = 1,
}: {
  color?: string;
  isActive?: boolean;
  rpm?: number;
  scale?: number;
}) {
  const wheelRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Points>(null);

  // Animate wheel rotation and dust particles
  useFrame((_, delta) => {
    if (isActive && wheelRef.current) {
      wheelRef.current.rotation.y += delta * (rpm / 60) * Math.PI * 2 * 0.1;
    }
    if (isActive && dustRef.current) {
      dustRef.current.rotation.z += delta * 2;
    }
  });

  const s = scale * 0.1;

  // Dust particle positions
  const dustPositions = useMemo(() => {
    const positions = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = s * (0.5 + Math.random() * 0.3);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * s * 0.5;
    }
    return positions;
  }, [s]);

  // Rotation to align cylinder Y-axis to local Z-axis
  const ROT_Y_TO_Z: [number, number, number] = [Math.PI / 2, 0, 0];

  return (
    <>
      {/* Motor body - main cylindrical housing (behind, closer to robot) */}
      <mesh position={[0, 0, -s * 0.8]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.28, s * 0.32, s * 1.2, 16]} />
        <meshStandardMaterial color="#505560" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Motor vent rings */}
      <mesh position={[0, 0, -s * 0.5]} rotation={ROT_Y_TO_Z}>
        <torusGeometry args={[s * 0.3, s * 0.03, 8, 24]} />
        <meshStandardMaterial color="#404550" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Gear head - angled section */}
      <mesh position={[0, 0, -s * 0.1]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.25, s * 0.28, s * 0.3, 16]} />
        <meshStandardMaterial color="#606570" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Spindle shaft */}
      <mesh position={[0, 0, s * 0.1]} rotation={ROT_Y_TO_Z}>
        <cylinderGeometry args={[s * 0.06, s * 0.06, s * 0.25, 12]} />
        <meshStandardMaterial color="#909aa8" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Grinding disc - flat abrasive wheel (front, away from robot) */}
      <group position={[0, 0, s * 0.25]}>
        {/* Main disc */}
        <mesh ref={wheelRef} rotation={ROT_Y_TO_Z}>
          <cylinderGeometry args={[s * 0.7, s * 0.7, s * 0.06, 32]} />
          <meshStandardMaterial
            color={isActive ? '#c8b090' : '#a89878'}
            metalness={0.2}
            roughness={0.8}
            emissive={isActive ? '#442200' : '#000000'}
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Disc center flange */}
        <mesh rotation={ROT_Y_TO_Z}>
          <cylinderGeometry args={[s * 0.1, s * 0.1, s * 0.08, 16]} />
          <meshStandardMaterial color={color} metalness={0.85} roughness={0.15} />
        </mesh>
      </group>

      {/* Safety guard - half cover */}
      <mesh position={[0, s * 0.4, s * 0.25]}>
        <boxGeometry args={[s * 1.5, s * 0.04, s * 0.12]} />
        <meshStandardMaterial color="#353540" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[s * 0.72, s * 0.2, s * 0.25]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[s * 0.4, s * 0.04, s * 0.12]} />
        <meshStandardMaterial color="#353540" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Handle grip */}
      <mesh position={[s * 0.35, 0, -s * 0.6]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[s * 0.08, s * 0.08, s * 0.25, 12]} />
        <meshStandardMaterial color="#282830" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Dust particles when active */}
      {isActive && (
        <points ref={dustRef} position={[0, -s * 0.5, s * 0.25]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[dustPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial color="#cc9966" size={s * 0.04} transparent opacity={0.7} />
        </points>
      )}
    </>
  );
}

/**
 * GrindingWheel - Industrial angle grinder with rotating disc
 *
 * @example
 * ```tsx
 * <EndEffector>
 *   <GrindingWheel isActive={isGrinding} color="#0066cc" />
 * </EndEffector>
 * ```
 */
export const GrindingWheel = memo(function GrindingWheel({
  position,
  quaternion,
  scale = 1,
  isActive = false,
  showAxes = false,
  opacity = 1,
  color = '#0066cc',
  rpm = 3000,
}: GrindingWheelProps & { rpm?: number }) {
  return (
    <BaseTool
      position={position}
      quaternion={quaternion}
      scale={scale}
      showAxes={showAxes}
      opacity={opacity}
    >
      <GrindingWheelGeometry color={color} isActive={isActive} rpm={rpm} scale={1} />
    </BaseTool>
  );
});
