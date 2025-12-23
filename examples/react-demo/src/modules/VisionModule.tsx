/**
 * Vision Module Demo
 *
 * Demonstrates point cloud visualization and camera views.
 * Uses RoboVizCore from @aspect/roboviz-core as the canvas wrapper.
 * Point cloud components are demo-specific as core doesn't have PointCloud yet.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls, button } from 'leva';
import * as THREE from 'three';
import { RoboVizCore } from '@aspect/roboviz-core';
import { useAppStore } from '../store';

// Generate sample point cloud
function generatePointCloud(type: 'box' | 'table' | 'random', count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number;
    let r: number, g: number, b: number;

    switch (type) {
      case 'box':
        // Box on a table
        if (i < count * 0.6) {
          // Table surface
          x = (Math.random() - 0.5) * 1.0;
          y = 0;
          z = (Math.random() - 0.5) * 0.6;
          r = 0.5;
          g = 0.3;
          b = 0.1;
        } else {
          // Box
          x = 0.2 + (Math.random() - 0.5) * 0.15;
          y = Math.random() * 0.15;
          z = (Math.random() - 0.5) * 0.15;
          r = 1;
          g = 0;
          b = 0;
        }
        break;

      case 'table':
        x = (Math.random() - 0.5) * 1.2;
        y = Math.random() * 0.02;
        z = (Math.random() - 0.5) * 0.8;
        // Height-based coloring
        const h = y / 0.02;
        r = h;
        g = 0.5;
        b = 1 - h;
        break;

      case 'random':
      default:
        x = (Math.random() - 0.5) * 2;
        y = Math.random() * 1;
        z = (Math.random() - 0.5) * 2;
        r = Math.random();
        g = Math.random();
        b = Math.random();
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return { positions, colors };
}

// Point cloud component (demo-specific)
function PointCloud({
  positions,
  colors,
  pointSize = 0.01,
  colorMode = 'rgb',
  visible = true,
}: {
  positions: Float32Array;
  colors: Float32Array;
  pointSize?: number;
  colorMode?: 'rgb' | 'height' | 'uniform';
  visible?: boolean;
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: colorMode === 'rgb',
      color: colorMode === 'uniform' ? '#00ffff' : undefined,
      sizeAttenuation: true,
    });
  }, [pointSize, colorMode]);

  if (!visible) return null;

  return <points geometry={geometry} material={material} position={[0, 0.3, 0.5]} />;
}

// Camera frustum visualization
function CameraFrustum({
  position,
  rotation,
  fov = 60,
  aspect = 1.33,
  near = 0.1,
  far = 1.5,
  color = '#ffff00',
  visible = true,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  fov?: number;
  aspect?: number;
  near?: number;
  far?: number;
  color?: string;
  visible?: boolean;
}) {
  if (!visible) return null;

  const camera = useMemo(() => {
    return new THREE.PerspectiveCamera(fov, aspect, near, far);
  }, [fov, aspect, near, far]);

  const helper = useMemo(() => {
    return new THREE.CameraHelper(camera);
  }, [camera]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={camera} />
      <primitive object={helper} />
      <mesh>
        <boxGeometry args={[0.05, 0.03, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// 3D ROI Box
function ROIBox({
  min,
  max,
  color = '#00ff00',
  opacity = 0.2,
  visible = true,
}: {
  min: [number, number, number];
  max: [number, number, number];
  color?: string;
  opacity?: number;
  visible?: boolean;
}) {
  if (!visible) return null;

  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];

  return (
    <group position={center}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
        <lineBasicMaterial color={color} />
      </lineSegments>
    </group>
  );
}

function VisionScene() {
  const [pointCloud, setPointCloud] = useState<{ positions: Float32Array; colors: Float32Array } | null>(
    null
  );
  const { addLog, addPointCloud } = useAppStore();

  // Point cloud controls
  const pcControls = useControls('Point Cloud', {
    type: {
      value: 'box',
      options: ['box', 'table', 'random'],
      label: 'Type',
    },
    pointCount: { value: 10000, min: 1000, max: 50000, step: 1000, label: 'Count' },
    pointSize: { value: 0.008, min: 0.001, max: 0.05, step: 0.001, label: 'Size' },
    colorMode: {
      value: 'rgb',
      options: ['rgb', 'height', 'uniform'],
      label: 'Color Mode',
    },
    visible: { value: true, label: 'Visible' },
    Generate: button(() => {
      const pc = generatePointCloud(pcControls.type as any, pcControls.pointCount);
      setPointCloud(pc);
      addLog('info', `Generated ${pcControls.pointCount} points (${pcControls.type})`);
      addPointCloud({
        id: 'main_pc',
        pointCount: pcControls.pointCount,
        visible: true,
        pointSize: pcControls.pointSize,
        colorMode: pcControls.colorMode as any,
      });
    }),
    Clear: button(() => {
      setPointCloud(null);
      addLog('info', 'Point cloud cleared');
    }),
  });

  // Camera view controls
  const camControls = useControls('Camera View', {
    showFrustum: { value: true, label: 'Show Frustum' },
    cameraFov: { value: 60, min: 30, max: 120, step: 5, label: 'FOV' },
    frustumDepth: { value: 1.5, min: 0.5, max: 3, step: 0.1, label: 'Depth' },
  });

  // ROI controls
  const roiControls = useControls('3D ROI', {
    showROI: { value: true, label: 'Show ROI' },
    roiMinX: { value: -0.2, min: -1, max: 0, step: 0.1, label: 'Min X' },
    roiMaxX: { value: 0.4, min: 0, max: 1, step: 0.1, label: 'Max X' },
    roiMinY: { value: 0, min: 0, max: 0.5, step: 0.05, label: 'Min Y' },
    roiMaxY: { value: 0.3, min: 0.1, max: 1, step: 0.05, label: 'Max Y' },
    roiMinZ: { value: 0.2, min: 0, max: 0.5, step: 0.1, label: 'Min Z' },
    roiMaxZ: { value: 0.8, min: 0.5, max: 1, step: 0.1, label: 'Max Z' },
    roiOpacity: { value: 0.15, min: 0, max: 0.5, step: 0.05, label: 'Opacity' },
  });

  return (
    <>
      {/* Point cloud */}
      {pointCloud && (
        <PointCloud
          positions={pointCloud.positions}
          colors={pointCloud.colors}
          pointSize={pcControls.pointSize}
          colorMode={pcControls.colorMode as any}
          visible={pcControls.visible}
        />
      )}

      {/* Camera frustum */}
      <CameraFrustum
        position={[0, 0.8, -0.5]}
        rotation={[0.5, 0, 0]}
        fov={camControls.cameraFov}
        far={camControls.frustumDepth}
        visible={camControls.showFrustum}
      />

      {/* 3D ROI */}
      <ROIBox
        min={[roiControls.roiMinX, roiControls.roiMinY, roiControls.roiMinZ]}
        max={[roiControls.roiMaxX, roiControls.roiMaxY, roiControls.roiMaxZ]}
        opacity={roiControls.roiOpacity}
        visible={roiControls.showROI}
      />

      {/* Reference objects */}
      <mesh position={[0.2, 0.05, 0.5]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>

      <mesh position={[-0.3, 0.04, 0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.08, 32]} />
        <meshStandardMaterial color="#44ff44" />
      </mesh>
    </>
  );
}

export function VisionModule() {
  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Vision & Point Cloud</h2>
        <p>Point cloud visualization, camera views, ROI using @aspect/roboviz-core</p>
      </div>

      <div className="canvas-wrapper">
        <RoboVizCore
          camera={{
            position: { x: 1.5, y: 1.5, z: 1.5 },
            fov: 50,
          }}
        >
          <VisionScene />
        </RoboVizCore>
      </div>
    </div>
  );
}
