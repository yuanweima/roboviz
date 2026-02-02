/**
 * Vision Stream Module Demo
 *
 * Demonstrates real-time camera image streaming and point cloud streaming.
 * Uses the new streaming APIs from @aspect/roboviz-core.
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls, button, folder } from 'leva';
import * as THREE from 'three';
import { RoboVizCore } from '@aspect/roboviz-core/rendering';
import { useAppStore } from '../store';

// ============================================================================
// Types
// ============================================================================

interface SimulatedFrame {
  width: number;
  height: number;
  data: Uint8Array;
  timestamp: number;
}

interface SimulatedPointCloud {
  points: Float32Array;
  colors: Uint8Array;
  pointCount: number;
  timestamp: number;
}

// ============================================================================
// Pre-loaded Sample Frames (simulates loading images from file)
// ============================================================================

/**
 * Pre-generated sample frames cache - avoids per-frame computation
 * Single static frame per resolution - maximum performance
 */
const sampleFramesCache: Map<string, Uint8Array> = new Map();

/**
 * Generate a single sample frame at initialization (called once per resolution)
 * Creates a static industrial camera-like image
 */
function initSampleFrame(width: number, height: number): Uint8Array {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Base industrial blue-gray background with gradient
      const gradientFactor = 1 - (y / height) * 0.25;
      let r = Math.floor(75 * gradientFactor);
      let g = Math.floor(95 * gradientFactor);
      let b = Math.floor(115 * gradientFactor);

      // Grid overlay (conveyor belt / work surface)
      const gridSize = 24;
      if ((x % gridSize < 1) || (y % gridSize < 1)) {
        r = Math.min(255, r + 25);
        g = Math.min(255, g + 25);
        b = Math.min(255, b + 30);
      }

      // Static red box (workpiece)
      const boxCenterX = width * 0.35;
      const boxCenterY = height * 0.5;
      const boxSize = 35;
      if (Math.abs(x - boxCenterX) < boxSize && Math.abs(y - boxCenterY) < boxSize) {
        r = 185;
        g = 65;
        b = 55;
      }

      // Static green cylinder
      const cylX = width * 0.65;
      const cylY = height * 0.45;
      const cylRadius = 22;
      const dx = x - cylX;
      const dy = y - cylY;
      if (dx * dx + dy * dy < cylRadius * cylRadius) {
        r = 60;
        g = 165;
        b = 80;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  return data;
}

/**
 * Get a sample frame - returns the cached static frame
 * This simulates receiving frames from a camera stream
 */
function getSampleFrame(
  width: number,
  height: number,
  _frameNumber: number
): SimulatedFrame {
  const key = `${width}x${height}`;

  // Initialize frame for this resolution if not already done
  if (!sampleFramesCache.has(key)) {
    sampleFramesCache.set(key, initSampleFrame(width, height));
  }

  return {
    width,
    height,
    data: sampleFramesCache.get(key)!,
    timestamp: performance.now(),
  };
}

/**
 * Generate a simulated point cloud with rotating points
 */
function generateSimulatedPointCloud(
  pointCount: number,
  frameNumber: number,
  pattern: 'box' | 'sphere' | 'spiral'
): SimulatedPointCloud {
  const points = new Float32Array(pointCount * 3);
  const colors = new Uint8Array(pointCount * 4); // RGBA

  const phase = frameNumber * 0.02;

  for (let i = 0; i < pointCount; i++) {
    let x: number, y: number, z: number;
    let r: number, g: number, b: number;

    switch (pattern) {
      case 'sphere': {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 0.3 + Math.random() * 0.1;
        x = radius * Math.sin(phi) * Math.cos(theta + phase);
        y = radius * Math.sin(phi) * Math.sin(theta + phase) + 0.5;
        z = radius * Math.cos(phi);
        // Rainbow color based on angle
        const hue = (theta + phase) / (Math.PI * 2);
        const rgb = hslToRgb(hue, 0.8, 0.5);
        r = rgb[0];
        g = rgb[1];
        b = rgb[2];
        break;
      }

      case 'spiral': {
        const t = i / pointCount;
        const angle = t * Math.PI * 10 + phase;
        const spiralRadius = 0.1 + t * 0.3;
        x = spiralRadius * Math.cos(angle);
        y = t * 0.8 + 0.1;
        z = spiralRadius * Math.sin(angle);
        // Color based on height
        r = Math.floor(255 * t);
        g = Math.floor(255 * (1 - t));
        b = 128;
        break;
      }

      case 'box':
      default: {
        // Rotating box surface
        const face = Math.floor(Math.random() * 6);
        const u = Math.random() - 0.5;
        const v = Math.random() - 0.5;
        const size = 0.3;

        switch (face) {
          case 0:
            x = size;
            y = u * size * 2 + 0.4;
            z = v * size * 2;
            break;
          case 1:
            x = -size;
            y = u * size * 2 + 0.4;
            z = v * size * 2;
            break;
          case 2:
            x = u * size * 2;
            y = size + 0.4;
            z = v * size * 2;
            break;
          case 3:
            x = u * size * 2;
            y = -size + 0.4;
            z = v * size * 2;
            break;
          case 4:
            x = u * size * 2;
            y = v * size * 2 + 0.4;
            z = size;
            break;
          default:
            x = u * size * 2;
            y = v * size * 2 + 0.4;
            z = -size;
        }

        // Rotate around Y axis
        const rotatedX = x * Math.cos(phase) - z * Math.sin(phase);
        const rotatedZ = x * Math.sin(phase) + z * Math.cos(phase);
        x = rotatedX;
        z = rotatedZ;

        // Color based on face
        const faceColors = [
          [255, 0, 0],
          [0, 255, 0],
          [0, 0, 255],
          [255, 255, 0],
          [255, 0, 255],
          [0, 255, 255],
        ];
        [r, g, b] = faceColors[face];
      }
    }

    points[i * 3] = x;
    points[i * 3 + 1] = y;
    points[i * 3 + 2] = z + 0.5;

    colors[i * 4] = r;
    colors[i * 4 + 1] = g;
    colors[i * 4 + 2] = b;
    colors[i * 4 + 3] = 255;
  }

  return {
    points,
    colors,
    pointCount,
    timestamp: Date.now(),
  };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ============================================================================
// Components
// ============================================================================

/**
 * Image Stream Display Component
 */
function ImageStreamDisplay({
  frame,
  width,
  height,
  fps,
  isStreaming,
}: {
  frame: SimulatedFrame | null;
  width: number;
  height: number;
  fps: number;
  isStreaming: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!frame || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const imageData = new ImageData(
      new Uint8ClampedArray(frame.data),
      frame.width,
      frame.height
    );
    ctx.putImageData(imageData, 0, 0);
  }, [frame]);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #333',
      }}
    >
      <canvas
        ref={canvasRef}
        width={frame?.width || 320}
        height={frame?.height || 240}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />

      {/* Overlay info */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 8px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        <span style={{ color: isStreaming ? '#4caf50' : '#f44336' }}>
          {isStreaming ? 'LIVE' : 'STOPPED'}
        </span>
        <span style={{ color: '#888', marginLeft: 8 }}>
          {fps.toFixed(1)} FPS
        </span>
      </div>

      {/* Camera label */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          padding: '4px 8px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: 4,
          fontSize: 11,
          color: '#aaa',
        }}
      >
        Camera: Pre-loaded Sample Frames
      </div>

      {!isStreaming && !frame && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#666',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
          <div>Click "Start Stream" to begin</div>
        </div>
      )}
    </div>
  );
}

/**
 * Point Cloud Stream Renderer (3D)
 */
function PointCloudStreamRenderer({
  pointCloud,
  pointSize,
  visible,
}: {
  pointCloud: SimulatedPointCloud | null;
  pointSize: number;
  visible: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Update geometry when point cloud changes
  useEffect(() => {
    if (!pointCloud || !pointsRef.current) return;

    if (!geometryRef.current) {
      geometryRef.current = new THREE.BufferGeometry();
    }

    const geometry = geometryRef.current;
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(pointCloud.points, 3)
    );

    // Convert RGBA to RGB float colors
    const rgbColors = new Float32Array(pointCloud.pointCount * 3);
    for (let i = 0; i < pointCloud.pointCount; i++) {
      rgbColors[i * 3] = pointCloud.colors[i * 4] / 255;
      rgbColors[i * 3 + 1] = pointCloud.colors[i * 4 + 1] / 255;
      rgbColors[i * 3 + 2] = pointCloud.colors[i * 4 + 2] / 255;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(rgbColors, 3));

    geometry.computeBoundingSphere();
    pointsRef.current.geometry = geometry;
  }, [pointCloud]);

  if (!visible || !pointCloud) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        size={pointSize}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.9}
      />
    </points>
  );
}

/**
 * Stream Statistics Display
 */
function StreamStats({
  cameraFps,
  cloudUpdateRate,
  pointCount,
  isCameraStreaming,
  isCloudStreaming,
}: {
  cameraFps: number;
  cloudUpdateRate: number;
  pointCount: number;
  isCameraStreaming: boolean;
  isCloudStreaming: boolean;
}) {
  return (
    <div
      style={{
        padding: 12,
        backgroundColor: '#1a1a2e',
        borderRadius: 8,
        border: '1px solid #333',
      }}
    >
      <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>Stream Statistics</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Camera Stream</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isCameraStreaming ? '#4caf50' : '#666',
              }}
            />
            <span style={{ fontSize: 14 }}>{cameraFps.toFixed(1)} FPS</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Point Cloud Stream</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isCloudStreaming ? '#4caf50' : '#666',
              }}
            />
            <span style={{ fontSize: 14 }}>{cloudUpdateRate.toFixed(1)} Hz</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Point Count</div>
          <div style={{ fontSize: 14 }}>{pointCount.toLocaleString()}</div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Memory</div>
          <div style={{ fontSize: 14 }}>
            {((pointCount * 16) / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Scene Component
// ============================================================================

function VisionStreamScene({
  pointCloud,
  pointSize,
  showPointCloud,
}: {
  pointCloud: SimulatedPointCloud | null;
  pointSize: number;
  showPointCloud: boolean;
}) {
  return (
    <>
      {/* Point Cloud */}
      <PointCloudStreamRenderer
        pointCloud={pointCloud}
        pointSize={pointSize}
        visible={showPointCloud}
      />

      {/* Reference grid */}
      <gridHelper args={[2, 20, '#444', '#333']} />

      {/* Reference objects */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#666" />
      </mesh>
    </>
  );
}

// ============================================================================
// Main Module Export
// ============================================================================

export function VisionStreamModule() {
  const { addLog } = useAppStore();

  // Stream state
  const [isCameraStreaming, setIsCameraStreaming] = useState(false);
  const [isCloudStreaming, setIsCloudStreaming] = useState(false);
  const [cameraFrame, setCameraFrame] = useState<SimulatedFrame | null>(null);
  const [pointCloud, setPointCloud] = useState<SimulatedPointCloud | null>(null);
  const [cameraFps, setCameraFps] = useState(0);
  const [cloudUpdateRate, setCloudUpdateRate] = useState(0);

  // Animation refs
  const cameraFrameRef = useRef(0);
  const cloudFrameRef = useRef(0);
  const cameraAnimationRef = useRef<number | null>(null);
  const cloudAnimationRef = useRef<number | null>(null);
  const lastCameraFrameTimeRef = useRef(0);
  const lastCloudFrameTimeRef = useRef(0);
  const fpsTimestampsRef = useRef<number[]>([]);
  const cloudTimestampsRef = useRef<number[]>([]);

  // Controls
  const cameraControls = useControls('Camera Stream', {
    resolution: {
      value: '320x240',
      options: ['160x120', '320x240', '640x480'],
      label: 'Resolution',
    },
    targetFps: { value: 30, min: 5, max: 60, step: 5, label: 'Target FPS' },
  });

  const cloudControls = useControls('Point Cloud Stream', {
    pattern: {
      value: 'sphere',
      options: ['box', 'sphere', 'spiral'],
      label: 'Pattern',
    },
    pointCount: { value: 5000, min: 1000, max: 20000, step: 1000, label: 'Points' },
    pointSize: { value: 0.008, min: 0.002, max: 0.02, step: 0.002, label: 'Size' },
    updateRate: { value: 30, min: 5, max: 60, step: 5, label: 'Update Rate (Hz)' },
    visible: { value: true, label: 'Visible' },
  });

  // Parse resolution
  const [resWidth, resHeight] = useMemo(() => {
    const [w, h] = cameraControls.resolution.split('x').map(Number);
    return [w, h];
  }, [cameraControls.resolution]);

  // Start camera stream using requestAnimationFrame for smooth rendering
  const startCameraStream = useCallback(() => {
    if (cameraAnimationRef.current) return;

    addLog('info', `Starting camera stream at ${cameraControls.resolution} @ ${cameraControls.targetFps}fps`);
    setIsCameraStreaming(true);
    lastCameraFrameTimeRef.current = performance.now();

    const frameInterval = 1000 / cameraControls.targetFps;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastCameraFrameTimeRef.current;

      if (elapsed >= frameInterval) {
        lastCameraFrameTimeRef.current = currentTime - (elapsed % frameInterval);

        const frame = getSampleFrame(resWidth, resHeight, cameraFrameRef.current++);
        setCameraFrame(frame);

        // Update FPS calculation
        const now = performance.now();
        fpsTimestampsRef.current.push(now);
        fpsTimestampsRef.current = fpsTimestampsRef.current.filter((t) => t > now - 1000);
        setCameraFps(fpsTimestampsRef.current.length);
      }

      cameraAnimationRef.current = requestAnimationFrame(animate);
    };

    cameraAnimationRef.current = requestAnimationFrame(animate);
  }, [resWidth, resHeight, cameraControls.targetFps, cameraControls.resolution, addLog]);

  // Stop camera stream
  const stopCameraStream = useCallback(() => {
    if (cameraAnimationRef.current) {
      cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = null;
    }
    setIsCameraStreaming(false);
    setCameraFps(0);
    addLog('info', 'Camera stream stopped');
  }, [addLog]);

  // Start point cloud stream using requestAnimationFrame
  const startCloudStream = useCallback(() => {
    if (cloudAnimationRef.current) return;

    addLog('info', `Starting point cloud stream: ${cloudControls.pointCount} points @ ${cloudControls.updateRate}Hz`);
    setIsCloudStreaming(true);
    lastCloudFrameTimeRef.current = performance.now();

    const frameInterval = 1000 / cloudControls.updateRate;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastCloudFrameTimeRef.current;

      if (elapsed >= frameInterval) {
        lastCloudFrameTimeRef.current = currentTime - (elapsed % frameInterval);

        const cloud = generateSimulatedPointCloud(
          cloudControls.pointCount,
          cloudFrameRef.current++,
          cloudControls.pattern as 'box' | 'sphere' | 'spiral'
        );
        setPointCloud(cloud);

        // Update rate calculation
        const now = performance.now();
        cloudTimestampsRef.current.push(now);
        cloudTimestampsRef.current = cloudTimestampsRef.current.filter((t) => t > now - 1000);
        setCloudUpdateRate(cloudTimestampsRef.current.length);
      }

      cloudAnimationRef.current = requestAnimationFrame(animate);
    };

    cloudAnimationRef.current = requestAnimationFrame(animate);
  }, [cloudControls.pointCount, cloudControls.updateRate, cloudControls.pattern, addLog]);

  // Stop point cloud stream
  const stopCloudStream = useCallback(() => {
    if (cloudAnimationRef.current) {
      cancelAnimationFrame(cloudAnimationRef.current);
      cloudAnimationRef.current = null;
    }
    setIsCloudStreaming(false);
    setCloudUpdateRate(0);
    addLog('info', 'Point cloud stream stopped');
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraAnimationRef.current) cancelAnimationFrame(cameraAnimationRef.current);
      if (cloudAnimationRef.current) cancelAnimationFrame(cloudAnimationRef.current);
    };
  }, []);

  return (
    <div className="module-container">
      <div className="module-header">
        <h2>Vision Streaming Demo</h2>
        <p>
          Camera stream using pre-loaded sample frames and 3D point cloud visualization.
          Demonstrates the streaming APIs from @aspect/roboviz-core.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Camera Stream Panel */}
        <div
          style={{
            padding: 16,
            backgroundColor: '#16213e',
            borderRadius: 8,
            border: '1px solid #333',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#4ecdc4' }}>Camera Stream</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={isCameraStreaming ? stopCameraStream : startCameraStream}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isCameraStreaming ? '#d32f2f' : '#388e3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {isCameraStreaming ? 'Stop' : 'Start'} Stream
              </button>
            </div>
          </div>

          <ImageStreamDisplay
            frame={cameraFrame}
            width={320}
            height={240}
            fps={cameraFps}
            isStreaming={isCameraStreaming}
          />
        </div>

        {/* Point Cloud Stream Panel */}
        <div
          style={{
            padding: 16,
            backgroundColor: '#16213e',
            borderRadius: 8,
            border: '1px solid #333',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#4ecdc4' }}>Point Cloud Stream</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={isCloudStreaming ? stopCloudStream : startCloudStream}
                style={{
                  padding: '6px 12px',
                  backgroundColor: isCloudStreaming ? '#d32f2f' : '#388e3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {isCloudStreaming ? 'Stop' : 'Start'} Stream
              </button>
            </div>
          </div>

          {/* 3D Canvas for Point Cloud */}
          <div style={{ height: 240, borderRadius: 8, overflow: 'hidden' }}>
            <RoboVizCore
              camera={{
                position: { x: 1.2, y: 1, z: 1.2 },
                fov: 50,
              }}
            >
              <VisionStreamScene
                pointCloud={pointCloud}
                pointSize={cloudControls.pointSize}
                showPointCloud={cloudControls.visible}
              />
            </RoboVizCore>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <StreamStats
        cameraFps={cameraFps}
        cloudUpdateRate={cloudUpdateRate}
        pointCount={pointCloud?.pointCount || 0}
        isCameraStreaming={isCameraStreaming}
        isCloudStreaming={isCloudStreaming}
      />

      {/* API Usage Info */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: '#1a1a2e',
          borderRadius: 8,
          border: '1px solid #333',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', color: '#4ecdc4' }}>New Streaming APIs</h4>
        <pre
          style={{
            margin: 0,
            padding: 12,
            backgroundColor: '#0d1117',
            borderRadius: 4,
            fontSize: 11,
            overflow: 'auto',
          }}
        >
{`// Camera streaming
import { useCameraStream, CameraViewPanel } from '@aspect/roboviz-core';

const [state, controls] = useCameraStream('camera_1', {
  autoCreate: true,
  onFrame: (frame) => processFrame(frame)
});

// Point cloud streaming
import { usePointCloudStream, PointCloudStreamRenderer } from '@aspect/roboviz-core';

const [cloudState, cloudControls] = usePointCloudStream('depth_camera', {
  autoCreate: true,
  accumulate: true,  // For building up point clouds over time
  maxAccumulatedPoints: 1000000
});

// In JSX:
<CameraViewPanel cameraId="camera_1" autoStart showToolbar />
<PointCloudStreamRenderer cloudId="depth_camera" colorMode="height" />`}
        </pre>
      </div>
    </div>
  );
}

export default VisionStreamModule;
