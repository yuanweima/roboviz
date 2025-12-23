/**
 * Waypoint component for Viewer
 */
import { Html } from '@react-three/drei';
import type { WaypointState } from '../types';

export interface WaypointProps {
  data: WaypointState;
}

export function Waypoint({ data }: WaypointProps) {
  const { position, label, color = '#4ecdc4' } = data;

  return (
    <group position={position}>
      {/* Marker sphere */}
      <mesh>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>

      {/* Axes */}
      <axesHelper args={[0.05]} />

      {/* Label */}
      {label && (
        <Html
          position={[0, 0.05, 0]}
          center
          style={{
            fontSize: '10px',
            color: 'white',
            background: 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Html>
      )}
    </group>
  );
}
