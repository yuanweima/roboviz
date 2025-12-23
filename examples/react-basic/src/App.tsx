/**
 * RoboViz React Basic Example
 *
 * Shows the simplest way to use RoboViz in a React application.
 * This uses the components directly without any remote control.
 */
import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { Robot } from '@aspect/roboviz-core';

function Scene() {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);

  // Simple animation
  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.02;
      setJoints([
        Math.sin(t) * 0.5,
        Math.cos(t) * 0.3,
        Math.sin(t * 0.7) * 0.5,
        Math.cos(t * 1.2) * 0.8,
        Math.sin(t * 0.9) * 0.4,
        t % (Math.PI * 2),
      ]);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Camera and controls */}
      <OrbitControls />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <Environment preset="studio" />

      {/* Grid */}
      <Grid
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#404060"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#404060"
        fadeDistance={30}
        infiniteGrid
      />

      {/* Robot */}
      <Robot
        id="robot1"
        urdfPath="/models/fanuc.urdf"
        jointAngles={joints}
        position={[0, 0, 0]}
        showAxes
      />

      {/* Simple obstacle */}
      <mesh position={[0.5, 0.1, 0.3]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="#ff4444" transparent opacity={0.8} />
      </mesh>
    </>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        shadows
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <Scene />
      </Canvas>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: 'white',
          fontFamily: 'system-ui',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>RoboViz React Basic</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.7, fontSize: 14 }}>
          Direct component usage without remote control
        </p>
      </div>
    </div>
  );
}
