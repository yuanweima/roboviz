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
import { RoboVizCore } from '@aspect/roboviz-core/rendering';
import { useAppStore } from '../store';

// Generate sample point cloud (Z-up coordinate system)
// X: forward/back, Y: left/right, Z: height
function generatePointCloud(type: 'box' | 'table' | 'random', count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number;
    let r: number, g: number, b: number;

    switch (type) {
      case 'box':
        // Box on a table (Z-up: table at z=0.8, box on top)
        if (i < count * 0.6) {
          // Table surface at z=0.8
          x = (Math.random() - 0.5) * 0.6;  // depth
          y = (Math.random() - 0.5) * 1.0;  // width
          z = 0.8;                           // table height
          r = 0.5;
          g = 0.3;
          b = 0.1;
        } else {
          // Box on table
          x = (Math.random() - 0.5) * 0.15;
          y = 0.2 + (Math.random() - 0.5) * 0.15;
          z = 0.8 + Math.random() * 0.15;  // on top of table
          r = 1;
          g = 0;
          b = 0;
        }
        break;

      case 'table':
        // Table surface at z=0.8
        x = (Math.random() - 0.5) * 0.8;
        y = (Math.random() - 0.5) * 1.2;
        z = 0.8 + Math.random() * 0.02;
        // Height-based coloring
        const h = (z - 0.8) / 0.02;
        r = h;
        g = 0.5;
        b = 1 - h;
        break;

      case 'random':
      default:
        x = (Math.random() - 0.5) * 2;
        y = (Math.random() - 0.5) * 2;
        z = Math.random() * 1;  // Z is height
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

  // Point cloud is generated in world coordinates, no offset needed
  return <points geometry={geometry} material={material} />;
}

// Camera frustum visualization (simplified, Z-up compatible)
function CameraFrustum({
  position,
  fov = 60,
  far = 1.0,
  color = '#ffff00',
  visible = true,
}: {
  position: [number, number, number];
  fov?: number;
  far?: number;
  color?: string;
  visible?: boolean;
}) {
  if (!visible) return null;

  // Calculate frustum corners for a camera looking down (-Z direction)
  const halfAngle = (fov / 2) * (Math.PI / 180);
  const halfWidth = Math.tan(halfAngle) * far;
  const halfHeight = halfWidth / 1.33; // aspect ratio

  // Frustum lines from camera to the four corners at 'far' distance
  const frustumGeometry = useMemo(() => {
    const points = [
      // Camera origin to corners
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-halfWidth, -halfHeight, -far),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(halfWidth, -halfHeight, -far),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(halfWidth, halfHeight, -far),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-halfWidth, halfHeight, -far),
      // Rectangle at far plane
      new THREE.Vector3(-halfWidth, -halfHeight, -far),
      new THREE.Vector3(halfWidth, -halfHeight, -far),
      new THREE.Vector3(halfWidth, -halfHeight, -far),
      new THREE.Vector3(halfWidth, halfHeight, -far),
      new THREE.Vector3(halfWidth, halfHeight, -far),
      new THREE.Vector3(-halfWidth, halfHeight, -far),
      new THREE.Vector3(-halfWidth, halfHeight, -far),
      new THREE.Vector3(-halfWidth, -halfHeight, -far),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [halfWidth, halfHeight, far]);

  return (
    <group position={position}>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[0.08, 0.06, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Lens - pointing down (-Z) */}
      <mesh position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.025, 0.02, 16]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Frustum lines */}
      <lineSegments geometry={frustumGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.6} />
      </lineSegments>
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

  // ROI controls (Z-up: Z is height)
  const roiControls = useControls('3D ROI', {
    showROI: { value: true, label: 'Show ROI' },
    roiMinX: { value: -0.4, min: -1, max: 0, step: 0.1, label: 'Min X' },
    roiMaxX: { value: 0.4, min: 0, max: 1, step: 0.1, label: 'Max X' },
    roiMinY: { value: -0.5, min: -1, max: 0, step: 0.1, label: 'Min Y' },
    roiMaxY: { value: 0.5, min: 0, max: 1, step: 0.1, label: 'Max Y' },
    roiMinZ: { value: 0.75, min: 0, max: 1, step: 0.05, label: 'Min Z' },
    roiMaxZ: { value: 1.0, min: 0.5, max: 1.5, step: 0.05, label: 'Max Z' },
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

      {/* Camera frustum - mounted above table, looking down (Z-up) */}
      <CameraFrustum
        position={[0, 0, 1.8]}
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

      {/* Reference objects on table (Z-up: table at z=0.8) */}
      {/* Red box on table */}
      <mesh position={[0, 0.2, 0.85]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#ff4444" />
      </mesh>

      {/* Green cylinder on table - rotated to stand upright in Z-up */}
      <mesh position={[0, -0.2, 0.84]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.08, 32]} />
        <meshStandardMaterial color="#44ff44" />
      </mesh>

      {/* Table surface (visual reference) */}
      <mesh position={[0, 0, 0.79]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.8, 1.2, 0.02]} />
        <meshStandardMaterial color="#8B4513" transparent opacity={0.5} />
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
