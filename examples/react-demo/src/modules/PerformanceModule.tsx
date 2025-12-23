/**
 * Performance Module Demo
 *
 * Demonstrates performance testing with @aspect/roboviz-core components.
 * This module shows how to:
 * - Stress test with many objects
 * - Use LOD (Level of Detail) for robots
 * - Monitor frame metrics
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { useControls, button } from 'leva';
import * as THREE from 'three';
import { RoboVizCore, Robot } from '@aspect/roboviz-core';
import { useAppStore } from '../store';

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

// Performance metrics tracker
function usePerformanceMetrics() {
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.67);
  const [drawCalls, setDrawCalls] = useState(0);
  const [triangles, setTriangles] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  const update = useCallback((renderer: THREE.WebGLRenderer) => {
    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= 1000) {
      setFps(Math.round((frameCount.current * 1000) / delta));
      setFrameTime(delta / frameCount.current);
      setDrawCalls(renderer.info.render.calls);
      setTriangles(renderer.info.render.triangles);
      frameCount.current = 0;
      lastTime.current = now;
    }
  }, []);

  return { fps, frameTime, drawCalls, triangles, update };
}

// Instanced point cloud for performance testing (demo-specific)
function InstancedPoints({ count, spread = 2 }: { count: number; spread?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useRef(new THREE.Object3D()).current;

  useEffect(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < count; i++) {
      tempObject.position.set(
        (Math.random() - 0.5) * spread,
        Math.random() * spread * 0.5,
        (Math.random() - 0.5) * spread
      );
      tempObject.scale.setScalar(0.01 + Math.random() * 0.02);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);

      const color = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
      meshRef.current.setColorAt(i, color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [count, spread, tempObject]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Animate a subset of points
    const animateCount = Math.min(1000, count);
    for (let i = 0; i < animateCount; i++) {
      meshRef.current.getMatrixAt(i, tempObject.matrix);
      tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);
      tempObject.position.y += Math.sin(performance.now() * 0.001 + i * 0.1) * delta * 0.1;
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  );
}

// LOD Robot component - uses simplified geometry for lower LOD levels
function LODRobot({
  position,
  jointAngles,
  lod,
}: {
  position: [number, number, number];
  jointAngles: number[];
  lod: 'high' | 'medium' | 'low';
}) {
  if (lod === 'low') {
    // Simple box representation for distant robots
    return (
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.2, 0.4, 0.2]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      </group>
    );
  }

  if (lod === 'medium') {
    // Simplified geometry
    return (
      <group position={position}>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.3, 8]} />
          <meshStandardMaterial color="#4488ff" />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.15, 0.2, 0.1]} />
          <meshStandardMaterial color="#4488ff" />
        </mesh>
      </group>
    );
  }

  // High LOD - full URDF robot from core
  return (
    <group position={position}>
      <Robot
        id={`lod_robot_${position.join('_')}`}
        urdfPath={URDF_PATH}
        jointAngles={jointAngles}
      />
    </group>
  );
}

// Performance monitor component
function PerformanceMonitor() {
  const { gl } = useThree();
  const metrics = usePerformanceMetrics();
  const { updatePerformance } = useAppStore();

  useFrame(() => {
    metrics.update(gl);
    updatePerformance({
      fps: metrics.fps,
      frameTime: metrics.frameTime,
      drawCalls: metrics.drawCalls,
      triangles: metrics.triangles,
    });
  });

  return null;
}

// Scene component
function PerformanceScene() {
  const [jointAngles, setJointAngles] = useState<number[]>([0, -0.3, 0.6, 0, -0.3, 0]);
  const [pointCount, setPointCount] = useState(10000);
  const [robotCount, setRobotCount] = useState(1);
  const [lodLevel, setLodLevel] = useState<'high' | 'medium' | 'low'>('high');
  const [isStressTest, setIsStressTest] = useState(false);
  const { addLog } = useAppStore();

  // Performance controls
  const perfControls = useControls('Performance', {
    showStats: { value: true, label: 'Show Stats' },
    showPointCloud: { value: true, label: 'Point Cloud' },
    pointCount: {
      value: 10000,
      min: 1000,
      max: 100000,
      step: 1000,
      label: 'Point Count',
      onChange: setPointCount,
    },
  });

  // LOD controls
  useControls('Level of Detail', {
    lodLevel: {
      value: 'high',
      options: ['high', 'medium', 'low'],
      label: 'LOD Level',
      onChange: (v) => setLodLevel(v as 'high' | 'medium' | 'low'),
    },
    robotCount: {
      value: 1,
      min: 1,
      max: 10,
      step: 1,
      label: 'Robot Count',
      onChange: setRobotCount,
    },
  });

  // Stress test
  useControls('Stress Test', {
    'Start Stress Test': button(() => {
      setIsStressTest(true);
      setPointCount(50000);
      setRobotCount(5);
      addLog('warning', 'Stress test started - monitoring performance');
    }),
    'Stop Stress Test': button(() => {
      setIsStressTest(false);
      setPointCount(10000);
      setRobotCount(1);
      addLog('info', 'Stress test stopped');
    }),
  });

  // Animation during stress test
  useFrame(() => {
    if (isStressTest) {
      const t = performance.now() * 0.001;
      setJointAngles([
        0.5 * Math.sin(t * 2),
        -0.3 + 0.2 * Math.cos(t * 1.5),
        0.6 + 0.2 * Math.sin(t * 1.8),
        t * 0.5,
        0.2 * Math.sin(t * 2.2),
        t,
      ]);
    }
  });

  // Generate robot positions
  const robotPositions: [number, number, number][] = [];
  for (let i = 0; i < robotCount; i++) {
    const angle = (i / robotCount) * Math.PI * 2;
    const radius = 1 + Math.floor(i / 4) * 0.8;
    robotPositions.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
  }

  return (
    <>
      {/* Robots with LOD */}
      {robotPositions.map((pos, i) => (
        <LODRobot key={i} position={pos} jointAngles={jointAngles} lod={lodLevel} />
      ))}

      {/* Instanced point cloud */}
      {perfControls.showPointCloud && (
        <group position={[0, 0.5, 0]}>
          <InstancedPoints count={pointCount} spread={3} />
        </group>
      )}

      <PerformanceMonitor />

      {perfControls.showStats && <Stats />}
    </>
  );
}

export function PerformanceModule() {
  const { performance } = useAppStore();

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Performance Testing</h2>
        <p>Stress testing with @aspect/roboviz-core components, LOD, instancing</p>
      </div>

      <div className="performance-stats">
        <div className="stat">
          <span className="stat-label">FPS</span>
          <span className="stat-value">{performance.fps}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Frame Time</span>
          <span className="stat-value">{performance.frameTime.toFixed(2)}ms</span>
        </div>
        <div className="stat">
          <span className="stat-label">Draw Calls</span>
          <span className="stat-value">{performance.drawCalls}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Triangles</span>
          <span className="stat-value">{(performance.triangles / 1000).toFixed(1)}k</span>
        </div>
      </div>

      <div className="canvas-wrapper">
        <RoboVizCore
          camera={{
            position: { x: 4, y: 3, z: 4 },
            fov: 50,
          }}
        >
          <PerformanceScene />
        </RoboVizCore>
      </div>
    </div>
  );
}
