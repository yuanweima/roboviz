/**
 * Safety Zone component for Viewer
 */
import * as THREE from 'three';
import type { SafetyZoneState } from '../types';

export interface SafetyZoneProps {
  data: SafetyZoneState;
}

export function SafetyZone({ data }: SafetyZoneProps) {
  const { position, radius, warningRadius, dangerRadius } = data;

  return (
    <group position={position}>
      {/* Safe zone (innermost) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, radius, 64]} />
        <meshBasicMaterial
          color="#00ff00"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Warning zone */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, warningRadius, 64]} />
        <meshBasicMaterial
          color="#ffff00"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Danger zone (outermost) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[warningRadius, dangerRadius, 64]} />
        <meshBasicMaterial
          color="#ff0000"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Borders */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.RingGeometry(radius - 0.001, radius + 0.001, 64)]} />
        <lineBasicMaterial color="#00ff00" transparent opacity={0.5} />
      </lineSegments>

      <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.RingGeometry(warningRadius - 0.001, warningRadius + 0.001, 64)]} />
        <lineBasicMaterial color="#ffff00" transparent opacity={0.5} />
      </lineSegments>

      <lineSegments rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.RingGeometry(dangerRadius - 0.001, dangerRadius + 0.001, 64)]} />
        <lineBasicMaterial color="#ff0000" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}
