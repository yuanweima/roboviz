/**
 * Scene component for Viewer
 * Sets up the 3D scene with lighting, grid, and camera controls
 */
import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import type { SceneConfig, CameraConfig } from '../types';

export interface SceneProps {
  config: SceneConfig;
  camera: CameraConfig;
  children?: React.ReactNode;
}

function GroundPlane({ color = '#303030' }: { color?: string }) {
  // Z-up: PlaneGeometry is on XY plane by default, no rotation needed
  return (
    <mesh position={[0, 0, -0.001]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} />
    </mesh>
  );
}

function SceneContent({ config, camera, children }: SceneProps) {
  const {
    shadows = true,
    groundPlane = false,
    groundColor = '#303030',
    ambientIntensity = 0.4,
    directionalIntensity = 0.8,
    environmentPreset = 'studio',
  } = config;

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={camera.position}
        fov={camera.fov || 50}
      />

      {/* Controls */}
      <OrbitControls
        target={camera.target || [0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Lighting - Z-up: height is Z coordinate */}
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={[10, 5, 10]}
        intensity={directionalIntensity}
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      {/* Secondary fill light */}
      <directionalLight
        position={[-5, -5, 5]}
        intensity={directionalIntensity * 0.3}
      />
      {/* Rim light */}
      <pointLight
        position={[0, -5, 5]}
        intensity={directionalIntensity * 0.5}
        color="#ffffff"
      />

      {/* Environment for reflections - rotated for Z-up */}
      <Environment
        preset={environmentPreset}
        backgroundRotation={[Math.PI / 2, 0, 0]}
        environmentRotation={[Math.PI / 2, 0, 0]}
      />

      {/* Ground plane with shadow */}
      {groundPlane && <GroundPlane color={groundColor} />}

      {/* Contact shadows for soft shadows on ground - Z-up */}
      {shadows && !groundPlane && (
        <ContactShadows
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
          resolution={256}
          color="#000000"
        />
      )}

      {/* Grid - rotate from XZ plane (Y-up) to XY plane (Z-up) */}
      {config.grid.enabled && (
        <Grid
          args={[config.grid.size, config.grid.size]}
          rotation={[Math.PI / 2, 0, 0]}
          cellSize={config.grid.size / config.grid.divisions}
          cellThickness={0.5}
          cellColor={config.grid.color}
          sectionSize={config.grid.size / 4}
          sectionThickness={1}
          sectionColor={config.grid.color}
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />
      )}

      {/* Scene children */}
      {children}
    </>
  );
}

export function Scene({ config, camera, children }: SceneProps) {
  return (
    <Canvas
      shadows
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={[config.background]} />
      <SceneContent config={config} camera={camera}>
        {children}
      </SceneContent>
    </Canvas>
  );
}
