/**
 * RoboViz Scene Component
 *
 * Provides 3D scene setup with lighting, grid, and environment
 */

import * as React from 'react';
import * as THREE from 'three';
import { useVizStore } from '../store/vizStore';
import type { SceneConfig } from '../types';

export interface SceneProps {
  config?: Partial<SceneConfig>;
  children?: React.ReactNode;
}

/**
 * Grid floor component
 */
function GridFloor() {
  const { scene } = useVizStore();
  const { grid } = scene;

  if (!grid.enabled) return null;

  return (
    <gridHelper
      args={[grid.size, grid.divisions, grid.color, grid.color]}
      rotation={[0, 0, 0]}
    />
  );
}

/**
 * Scene lighting setup
 */
function Lighting() {
  const { scene } = useVizStore();
  const { lighting } = scene;

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

/**
 * Ground plane for shadows
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
export function Scene({ config, children }: SceneProps): React.JSX.Element {
  const { scene, setScene } = useVizStore();

  // Apply config updates
  React.useEffect(() => {
    if (config) {
      setScene(config);
    }
  }, [config, setScene]);

  return (
    <group>
      <Lighting />
      <GridFloor />
      <Ground />
      {children}
    </group>
  );
}
