/**
 * RoboViz Scene Component
 *
 * Provides 3D scene setup with professional lighting, grid, and environment
 * for industrial robotics visualization.
 */

import * as React from 'react';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useVizStore } from '../store/vizStore';
import type { SceneConfig } from '../types';

export interface SceneProps {
  config?: Partial<SceneConfig>;
  children?: React.ReactNode;
  /** Enable enhanced industrial lighting (default: true) */
  enhancedLighting?: boolean;
  /** Enable reflective floor (default: true) */
  reflectiveFloor?: boolean;
}

/**
 * Grid floor component with industrial styling
 */
function GridFloor() {
  const { scene } = useVizStore();
  const { grid } = scene;

  if (!grid.enabled) return null;

  // Create a more subtle secondary grid color
  const secondaryColor = useMemo(() => {
    const color = new THREE.Color(grid.color);
    color.multiplyScalar(0.5);
    return '#' + color.getHexString();
  }, [grid.color]);

  return (
    <group>
      {/* Primary grid */}
      <gridHelper
        args={[grid.size, grid.divisions, grid.color, secondaryColor]}
        rotation={[0, 0, 0]}
      />
      {/* Finer secondary grid for detail */}
      <gridHelper
        args={[grid.size, grid.divisions * 5, secondaryColor, secondaryColor]}
        rotation={[0, 0, 0]}
        position={[0, -0.0005, 0]}
      />
    </group>
  );
}

/**
 * Enhanced scene lighting setup for industrial environments
 */
function Lighting({ enhanced = true }: { enhanced?: boolean }) {
  const { scene } = useVizStore();
  const { lighting } = scene;

  if (!enhanced) {
    // Basic lighting fallback
    return (
      <>
        <ambientLight
          intensity={lighting.ambient.intensity}
          color={lighting.ambient.color}
        />
        <directionalLight
          position={[
            lighting.directional.position.x,
            lighting.directional.position.y,
            lighting.directional.position.z,
          ]}
          intensity={lighting.directional.intensity}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
      </>
    );
  }

  // Enhanced industrial lighting setup
  return (
    <>
      {/* Ambient fill - slightly warm for industrial feel */}
      <ambientLight
        intensity={lighting.ambient.intensity * 1.2}
        color="#f8f4f0"
      />

      {/* Hemisphere light for natural sky/ground gradient */}
      <hemisphereLight
        color="#87ceeb"
        groundColor="#444444"
        intensity={0.4}
      />

      {/* Main key light - slightly warm */}
      <directionalLight
        position={[8, 12, 6]}
        intensity={lighting.directional.intensity * 1.1}
        color="#fffaf0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={50}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0001}
      />

      {/* Fill light from opposite side - cooler */}
      <directionalLight
        position={[-6, 8, -4]}
        intensity={0.3}
        color="#e0f0ff"
      />

      {/* Rim light for edge definition */}
      <directionalLight
        position={[-2, 6, -8]}
        intensity={0.25}
        color="#ffffff"
      />

      {/* Front fill for robot face visibility */}
      <pointLight
        position={[0, 3, 4]}
        intensity={0.4}
        color="#ffffff"
        distance={10}
        decay={2}
      />

      {/* Subtle accent lights at corners */}
      <pointLight
        position={[3, 1, 3]}
        intensity={0.15}
        color="#80a0ff"
        distance={6}
        decay={2}
      />
      <pointLight
        position={[-3, 1, -3]}
        intensity={0.15}
        color="#ffa080"
        distance={6}
        decay={2}
      />
    </>
  );
}

/**
 * Industrial floor with subtle reflection and texture
 */
function IndustrialFloor({ reflective = true }: { reflective?: boolean }) {
  const floorMaterial = useMemo(() => {
    if (reflective) {
      return (
        <meshStandardMaterial
          color="#1a1a1e"
          metalness={0.3}
          roughness={0.7}
          envMapIntensity={0.5}
        />
      );
    }
    return <shadowMaterial opacity={0.4} />;
  }, [reflective]);

  return (
    <group>
      {/* Main floor plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        {floorMaterial}
      </mesh>

      {/* Floor border/edge accent */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.003, 0]}
      >
        <ringGeometry args={[3.8, 4, 64]} />
        <meshStandardMaterial
          color="#303040"
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Center work area indicator */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
      >
        <ringGeometry args={[0.95, 1, 64]} />
        <meshStandardMaterial
          color="#2a3a4a"
          metalness={0.4}
          roughness={0.6}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Safety zone markers (subtle) */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, angle]}
          position={[Math.cos(angle) * 2, -0.001, Math.sin(angle) * 2]}
        >
          <planeGeometry args={[0.3, 0.02]} />
          <meshStandardMaterial
            color="#4a5a6a"
            metalness={0.3}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Legacy ground plane for backwards compatibility
 */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <shadowMaterial opacity={0.3} />
    </mesh>
  );
}

/**
 * Scene component - sets up 3D environment
 */
export function Scene({
  config,
  children,
  enhancedLighting = true,
  reflectiveFloor = true,
}: SceneProps): React.JSX.Element {
  const { setScene } = useVizStore();

  // Apply config updates
  React.useEffect(() => {
    if (config) {
      setScene(config);
    }
  }, [config, setScene]);

  return (
    <group>
      <Lighting enhanced={enhancedLighting} />
      <GridFloor />
      {reflectiveFloor ? <IndustrialFloor reflective={true} /> : <Ground />}
      {children}
    </group>
  );
}
