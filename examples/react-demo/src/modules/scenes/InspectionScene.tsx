/**
 * Inspection Scene - 2D Visual Defect Detection Demo
 *
 * Optimized using new Process Architecture:
 * - RobotProcessProvider for unified kinematics + tool + ghost
 * - ProcessScene for robot/ghost/trajectory rendering
 * - useProcessPlayback for trajectory control
 * - useProcessGhost for IK preview
 *
 * Industrial Workflow (2D Vision Inspection):
 * 1. Select inspection surface/region (click on workpiece face)
 * 2. Configure camera parameters (FOV, exposure, resolution)
 * 3. Generate camera viewpoints covering the region
 *    - Auto mode: system generates optimal viewpoints
 *    - Manual mode: user places viewpoints
 * 4. Preview viewpoint path with ghost robot (IK validation)
 * 5. Execute inspection scan with real-time defect detection
 * 6. Review AI detection results with confidence scores
 *
 * Camera Visualization Features:
 * - FOV Frustum: Visual cone showing camera field of view
 * - Preview Panel: Real-time camera feed simulation
 * - Stereo Camera: Dual frustum with depth map visualization
 * - Interactive Controls: Toggle visibility of each element
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RoboViz } from '@aspect/roboviz-react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ProcessProvider,
  RobotProcessProvider,
  ProcessScene,
  useProcessPlayback,
  useProcessGhost,
  useRobotProcessState,
  EndEffector,
  type PoseTrajectory,
  // Tools from core library
  InspectionCamera,
  INSPECTION_CAMERA_METADATA,
  computeTcpFromMetadata,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';
import { IndustrialInspectionWorkpiece } from '../welding/components';
import {
  TcpDebugPanel,
  type TcpDebugState,
  computeTcpFromDebug,
  createDefaultTcpDebug,
} from '../../components/TcpDebugPanel';

// Default TCP debug state from tool metadata
const DEFAULT_TCP_DEBUG = createDefaultTcpDebug(INSPECTION_CAMERA_METADATA);

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';

/**
 * TCP Configuration
 *
 * The TCP (Tool Center Point) for the inspection camera is derived from:
 * 1. Tool's built-in TCP offset (from INSPECTION_CAMERA_METADATA) - offset from flange to lens front
 * 2. Working distance - additional offset from lens to inspection point
 *
 * Total TCP = tool TCP offset + working distance along tool Z-axis
 */

// ============================================================================
// Theme
// ============================================================================

const THEME = {
  primary: '#9933ff',
  secondary: '#cc66ff',
  accent: '#00ffcc',
  success: '#00ff88',
  warning: '#ffaa00',
  danger: '#ff3366',
  background: '#0a0812',
  surface: '#141020',
  panel: '#1e1830',
  text: '#ffffff',
  textSecondary: '#aa88cc',
  scan: '#00ffcc',
};

// ============================================================================
// Types
// ============================================================================

interface InspectionSettings {
  cameraFOV: number; // degrees
  cameraDistance: number; // meters
  resolution: '1080p' | '4K' | '8K';
  exposureTime: number; // ms
  lighting: 'ambient' | 'ring' | 'structured';
  aiModel: 'fast' | 'accurate' | 'ensemble';
  // Camera visualization settings
  showFrustum: boolean;
  showPreview: boolean;
  cameraType: 'monocular' | 'stereo';
  stereoBaseline: number; // meters
  showDepthMap: boolean;
  // TCP configuration (debug)
  tcpPositionX: number; // meters
  tcpPositionY: number;
  tcpPositionZ: number;
  tcpRotationX: number; // degrees (Euler angles)
  tcpRotationY: number;
  tcpRotationZ: number;
  cameraScale: number; // scale factor for camera model
  showDebugAxes: boolean;
}

interface InspectionRegion {
  id: string;
  center: [number, number, number]; // Z-up coordinates
  normal: [number, number, number];
  size: [number, number];
  name: string;
}

interface CameraViewpoint {
  id: string;
  position: [number, number, number]; // Z-up
  quaternion: [number, number, number, number];
  regionId: string;
  fov: number;
  distance: number;
}

interface Defect {
  id: string;
  position: [number, number, number];
  type: 'crack' | 'porosity' | 'inclusion' | 'surface' | 'scratch' | 'dent';
  severity: 'critical' | 'warning' | 'minor';
  size: number;
  confidence: number;
  detectedAt: number; // viewpoint index
}

const DEFAULT_INSPECTION_SETTINGS: InspectionSettings = {
  cameraFOV: 15, // Industrial camera with narrow FOV for precision
  cameraDistance: 0.25, // 250mm working distance
  resolution: '4K',
  exposureTime: 10,
  lighting: 'ring',
  aiModel: 'accurate',
  // Camera visualization defaults
  showFrustum: true,
  showPreview: false, // Disabled by default to prevent WebGL context loss
  cameraType: 'monocular',
  stereoBaseline: 0.065, // 65mm
  showDepthMap: false,
  // TCP configuration defaults (from tool metadata, displayed for debugging)
  // Note: These are now computed from INSPECTION_CAMERA_METADATA + working distance
  tcpPositionX: INSPECTION_CAMERA_METADATA.defaultTcpOffset!.position[0],
  tcpPositionY: INSPECTION_CAMERA_METADATA.defaultTcpOffset!.position[1],
  tcpPositionZ: INSPECTION_CAMERA_METADATA.defaultTcpOffset!.position[2],
  tcpRotationX: INSPECTION_CAMERA_METADATA.defaultTcpOffset!.rotation[0] * 180 / Math.PI,
  tcpRotationY: INSPECTION_CAMERA_METADATA.defaultTcpOffset!.rotation[1] * 180 / Math.PI,
  tcpRotationZ: INSPECTION_CAMERA_METADATA.defaultTcpOffset!.rotation[2] * 180 / Math.PI,
  cameraScale: 1.0,
  showDebugAxes: true,
};

// ============================================================================
// Camera Preview Overlay Component (2D UI)
// ============================================================================

interface CameraPreviewOverlayProps {
  isScanning: boolean;
  scanProgress: number;
  defectCount: number;
  cameraType: 'monocular' | 'stereo';
  showPreview: boolean;
  showDepthMap: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * 2D overlay for camera preview and depth map display
 * Renders in the top-right corner of the 3D viewport
 */
function CameraPreviewOverlay({
  isScanning,
  scanProgress,
  defectCount,
  cameraType,
  showPreview,
  showDepthMap,
  isCollapsed,
  onToggleCollapse,
}: CameraPreviewOverlayProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const depthCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animationRef = useRef<number>(0);

  // Update canvases
  useEffect(() => {
    if (!showPreview && !showDepthMap) return;
    if (isCollapsed) return;

    const updateCanvases = () => {
      frameRef.current++;

      // Update preview canvas
      if (showPreview && previewCanvasRef.current) {
        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Background - simulated workpiece surface
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#3a3a45');
          gradient.addColorStop(0.5, '#4a4a55');
          gradient.addColorStop(1, '#3a3a45');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Add surface texture pattern
          ctx.strokeStyle = '#50505a';
          ctx.lineWidth = 0.5;
          for (let i = 0; i < canvas.width; i += 15) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
          }
          for (let j = 0; j < canvas.height; j += 15) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(canvas.width, j);
            ctx.stroke();
          }

          if (isScanning) {
            // Scanning effect - moving line
            const scanY = (frameRef.current * 3) % canvas.height;
            ctx.strokeStyle = THEME.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, scanY);
            ctx.lineTo(canvas.width, scanY);
            ctx.stroke();

            // Glow effect
            const scanGradient = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
            scanGradient.addColorStop(0, 'transparent');
            scanGradient.addColorStop(0.5, `${THEME.accent}50`);
            scanGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = scanGradient;
            ctx.fillRect(0, scanY - 15, canvas.width, 30);

            // Simulated defect detection overlay
            if (defectCount > 0) {
              const defectX = 60 + Math.sin(frameRef.current * 0.1) * 8;
              ctx.fillStyle = `${THEME.danger}40`;
              ctx.fillRect(defectX, 45, 35, 25);
              ctx.strokeStyle = THEME.danger;
              ctx.lineWidth = 2;
              ctx.strokeRect(defectX, 45, 35, 25);
              ctx.fillStyle = THEME.danger;
              ctx.font = 'bold 9px monospace';
              ctx.fillText('DEFECT', defectX + 2, 40);
            }

            // Status overlay
            ctx.fillStyle = `${THEME.background}90`;
            ctx.fillRect(4, 4, 95, 28);
            ctx.fillStyle = THEME.accent;
            ctx.font = 'bold 10px monospace';
            ctx.fillText('● SCANNING', 8, 15);
            ctx.fillStyle = THEME.text;
            ctx.font = '9px monospace';
            ctx.fillText(`${Math.round(scanProgress * 100)}%`, 8, 27);
          } else {
            // Idle state - crosshair
            ctx.strokeStyle = `${THEME.accent}80`;
            ctx.lineWidth = 1;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            ctx.beginPath();
            ctx.moveTo(cx - 25, cy);
            ctx.lineTo(cx - 8, cy);
            ctx.moveTo(cx + 8, cy);
            ctx.lineTo(cx + 25, cy);
            ctx.moveTo(cx, cy - 25);
            ctx.lineTo(cx, cy - 8);
            ctx.moveTo(cx, cy + 8);
            ctx.lineTo(cx, cy + 25);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            ctx.stroke();

            // Status
            ctx.fillStyle = `${THEME.background}90`;
            ctx.fillRect(4, 4, 70, 16);
            ctx.fillStyle = THEME.textSecondary;
            ctx.font = '9px monospace';
            ctx.fillText('○ STANDBY', 8, 15);
          }

          // Timestamp
          ctx.fillStyle = `${THEME.background}90`;
          ctx.fillRect(canvas.width - 70, canvas.height - 16, 66, 12);
          ctx.fillStyle = THEME.textSecondary;
          ctx.font = '8px monospace';
          ctx.fillText(new Date().toLocaleTimeString(), canvas.width - 66, canvas.height - 6);
        }
      }

      // Update depth canvas (stereo only)
      if (showDepthMap && cameraType === 'stereo' && depthCanvasRef.current) {
        const canvas = depthCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.createImageData(canvas.width, canvas.height);
          const data = imageData.data;

          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
              const cx = canvas.width / 2;
              const cy = canvas.height / 2;
              const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
              const maxDist = Math.sqrt(cx ** 2 + cy ** 2);
              const depth = 1 - (dist / maxDist) * 0.7;
              const noise = Math.random() * 0.08;
              const scanEffect = isScanning ? Math.sin((y + frameRef.current * 2) * 0.1) * 0.04 : 0;
              const finalDepth = Math.min(1, Math.max(0, depth + noise + scanEffect));

              // Jet colormap
              let r, g, b;
              if (finalDepth < 0.25) {
                r = 0; g = finalDepth * 4 * 255; b = 255;
              } else if (finalDepth < 0.5) {
                r = 0; g = 255; b = (1 - (finalDepth - 0.25) * 4) * 255;
              } else if (finalDepth < 0.75) {
                r = (finalDepth - 0.5) * 4 * 255; g = 255; b = 0;
              } else {
                r = 255; g = (1 - (finalDepth - 0.75) * 4) * 255; b = 0;
              }

              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = 255;
            }
          }

          ctx.putImageData(imageData, 0, 0);

          // Legend
          const legendW = 12;
          const legendH = canvas.height - 30;
          const legendX = canvas.width - legendW - 8;
          const legendY = 15;

          for (let y = 0; y < legendH; y++) {
            const d = 1 - y / legendH;
            let r, g, b;
            if (d < 0.25) { r = 0; g = d * 4 * 255; b = 255; }
            else if (d < 0.5) { r = 0; g = 255; b = (1 - (d - 0.25) * 4) * 255; }
            else if (d < 0.75) { r = (d - 0.5) * 4 * 255; g = 255; b = 0; }
            else { r = 255; g = (1 - (d - 0.75) * 4) * 255; b = 0; }
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(legendX, legendY + y, legendW, 1);
          }

          ctx.fillStyle = THEME.text;
          ctx.font = '7px monospace';
          ctx.fillText('N', legendX + 2, legendY - 3);
          ctx.fillText('F', legendX + 2, legendY + legendH + 10);

          // Title
          ctx.fillStyle = `${THEME.background}90`;
          ctx.fillRect(4, 4, 50, 14);
          ctx.fillStyle = '#ffaa00';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('DEPTH', 8, 14);
        }
      }

      animationRef.current = requestAnimationFrame(updateCanvases);
    };

    animationRef.current = requestAnimationFrame(updateCanvases);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isScanning, scanProgress, defectCount, cameraType, showPreview, showDepthMap, isCollapsed]);

  if (!showPreview && !showDepthMap) return null;

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: `${THEME.panel}ee`,
    borderRadius: '8px',
    border: `1px solid ${THEME.primary}50`,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: `${THEME.primary}30`,
    borderBottom: isCollapsed ? 'none' : `1px solid ${THEME.primary}40`,
    cursor: 'pointer',
    userSelect: 'none',
  };

  const canvasContainerStyle: React.CSSProperties = {
    display: isCollapsed ? 'none' : 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px',
  };

  const canvasWrapperStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '4px',
    overflow: 'hidden',
    border: `1px solid ${THEME.primary}30`,
  };

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    background: `${THEME.background}cc`,
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '9px',
    color: THEME.textSecondary,
    fontWeight: 'bold',
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle} onClick={onToggleCollapse}>
        <span style={{ color: THEME.accent, fontSize: '11px', fontWeight: 'bold' }}>
          📷 Camera View
        </span>
        <span style={{ color: THEME.textSecondary, fontSize: '14px', marginLeft: '12px' }}>
          {isCollapsed ? '▼' : '▲'}
        </span>
      </div>

      <div style={canvasContainerStyle}>
        {showPreview && (
          <div style={canvasWrapperStyle}>
            <canvas
              ref={previewCanvasRef}
              width={240}
              height={180}
              style={{ display: 'block', width: '240px', height: '180px' }}
            />
            <div style={labelStyle}>RGB</div>
          </div>
        )}

        {showDepthMap && cameraType === 'stereo' && (
          <div style={canvasWrapperStyle}>
            <canvas
              ref={depthCanvasRef}
              width={240}
              height={180}
              style={{ display: 'block', width: '240px', height: '180px' }}
            />
            <div style={{ ...labelStyle, color: '#ffaa00' }}>DEPTH</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Camera Frustum Visualization
// ============================================================================

function CameraFrustum({
  position,
  quaternion,
  fov,
  distance,
  color,
  opacity,
  selected,
}: {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  fov: number;
  distance: number;
  color: string;
  opacity: number;
  selected?: boolean;
}) {
  const quatObj = useMemo(
    () => new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]),
    [quaternion]
  );

  // Convert Z-up to Y-up for Three.js
  const posYup: [number, number, number] = [position[0], position[2], -position[1]];

  // Calculate frustum dimensions
  const halfAngle = (fov / 2) * (Math.PI / 180);
  const farWidth = Math.tan(halfAngle) * distance * 2;
  const farHeight = farWidth * 0.75; // 4:3 aspect ratio

  // Convert quaternion from Z-up to Y-up
  const zUpToYUp = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const finalQuat = zUpToYUp.clone().multiply(quatObj);

  return (
    <group position={posYup} quaternion={finalQuat}>
      {/* Frustum lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                // Near plane corners to far plane corners
                0, 0, 0, -farWidth / 2, -farHeight / 2, distance,
                0, 0, 0, farWidth / 2, -farHeight / 2, distance,
                0, 0, 0, farWidth / 2, farHeight / 2, distance,
                0, 0, 0, -farWidth / 2, farHeight / 2, distance,
                // Far plane edges
                -farWidth / 2, -farHeight / 2, distance, farWidth / 2, -farHeight / 2, distance,
                farWidth / 2, -farHeight / 2, distance, farWidth / 2, farHeight / 2, distance,
                farWidth / 2, farHeight / 2, distance, -farWidth / 2, farHeight / 2, distance,
                -farWidth / 2, farHeight / 2, distance, -farWidth / 2, -farHeight / 2, distance,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </lineSegments>

      {/* Far plane fill */}
      <mesh position={[0, 0, distance]}>
        <planeGeometry args={[farWidth, farHeight]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.3 : 0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Camera indicator */}
      <mesh position={[0, 0, 0.01]}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color={selected ? THEME.accent : color} />
      </mesh>
    </group>
  );
}

// ============================================================================
// Defect Marker
// ============================================================================

function DefectMarker({
  defect,
  selected,
  onSelect,
}: {
  defect: Defect;
  selected: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.1);
    }
  });

  const severityColor = {
    critical: THEME.danger,
    warning: THEME.warning,
    minor: THEME.accent,
  };

  // Convert Z-up to Y-up
  const posYup: [number, number, number] = [
    defect.position[0],
    defect.position[2],
    -defect.position[1],
  ];

  return (
    <group position={posYup}>
      {/* Outer ring */}
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[defect.size * 1.2, defect.size * 1.5, 32]} />
        <meshBasicMaterial
          color={severityColor[defect.severity]}
          transparent
          opacity={selected ? 1 : 0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center dot */}
      <mesh onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[defect.size * 0.4, 12, 12]} />
        <meshBasicMaterial color={severityColor[defect.severity]} />
      </mesh>

      {/* Confidence indicator */}
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[defect.size * 1.6, defect.size * 1.8, 32, 1, 0, defect.confidence * Math.PI * 2]} />
        <meshBasicMaterial color={THEME.success} transparent opacity={0.5} />
      </mesh>

      {/* Vertical indicator */}
      {selected && (
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.002, 0.002, 0.08, 8]} />
          <meshBasicMaterial color={severityColor[defect.severity]} />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Inspection Region Overlay
// ============================================================================

function InspectionRegionOverlay({
  regions,
  selectedRegionId,
  scannedRegionIds,
  onRegionSelect,
}: {
  regions: InspectionRegion[];
  selectedRegionId: string | null;
  scannedRegionIds: string[];
  onRegionSelect: (id: string) => void;
}) {
  return (
    // Position above all workpiece elements including raised boss (top at 0.066)
    // to ensure click detection works properly
    // Using renderOrder to ensure regions are rendered on top
    <group position={[0.5, 0.08, 0]}>
      {regions.map((region) => {
        const isSelected = selectedRegionId === region.id;
        const isScanned = scannedRegionIds.includes(region.id);

        return (
          <group key={region.id}>
            <mesh
              position={[region.center[0], 0.002, -region.center[1]]}
              rotation={[-Math.PI / 2, 0, 0]}
              renderOrder={999}
              onPointerDown={(e) => {
                console.log('[InspectionRegionOverlay] mesh onPointerDown:', region.id);
                e.stopPropagation();
                onRegionSelect(region.id);
              }}
              onPointerOver={(e) => {
                console.log('[InspectionRegionOverlay] mesh onPointerOver:', region.id);
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'default';
              }}
            >
              <planeGeometry args={region.size} />
              <meshBasicMaterial
                color={isScanned ? THEME.success : isSelected ? THEME.accent : THEME.primary}
                transparent
                opacity={isSelected ? 0.5 : isScanned ? 0.35 : 0.3}
                side={THREE.DoubleSide}
                depthTest={false}
              />
            </mesh>

            {/* Selection ring */}
            {isSelected && (
              <mesh position={[region.center[0], 0.002, -region.center[1]]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[Math.max(...region.size) * 0.55, Math.max(...region.size) * 0.58, 32]} />
                <meshBasicMaterial color={THEME.accent} transparent opacity={0.9} />
              </mesh>
            )}

            {/* Scan complete indicator */}
            {isScanned && (
              <mesh position={[region.center[0], 0.003, -region.center[1]]}>
                <sphereGeometry args={[0.008, 12, 12]} />
                <meshBasicMaterial color={THEME.success} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// Inspection Parameters Panel
// ============================================================================

function InspectionPanel({
  settings,
  onChange,
}: {
  settings: InspectionSettings;
  onChange: (s: Partial<InspectionSettings>) => void;
}) {
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', color: THEME.textSecondary };
  const inputStyle: React.CSSProperties = { width: '90px', padding: '6px 10px', background: THEME.background, border: `1px solid ${THEME.primary}40`, borderRadius: '4px', color: THEME.text, fontSize: '12px', textAlign: 'right' };
  const checkboxStyle: React.CSSProperties = { width: '18px', height: '18px', accentColor: THEME.primary };
  const sectionStyle: React.CSSProperties = { borderTop: `1px solid ${THEME.primary}30`, paddingTop: '12px', marginTop: '12px' };

  return (
    <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
      <h4 style={{ margin: '0 0 16px 0', color: THEME.primary }}>Camera Settings</h4>

      {/* Camera Type */}
      <div style={rowStyle}>
        <span style={labelStyle}>Camera Type</span>
        <select
          value={settings.cameraType}
          onChange={(e) => onChange({
            cameraType: e.target.value as 'monocular' | 'stereo',
            // Auto-enable depth map for stereo
            showDepthMap: e.target.value === 'stereo' ? settings.showDepthMap : false,
          })}
          style={{ ...inputStyle, width: '100px' }}
        >
          <option value="monocular">Monocular</option>
          <option value="stereo">Stereo</option>
        </select>
      </div>

      {/* Stereo Baseline (only for stereo) */}
      {settings.cameraType === 'stereo' && (
        <div style={rowStyle}>
          <span style={labelStyle}>Baseline (mm)</span>
          <input
            type="number"
            value={Math.round(settings.stereoBaseline * 1000)}
            onChange={(e) => onChange({ stereoBaseline: Number(e.target.value) / 1000 })}
            style={inputStyle}
          />
        </div>
      )}

      <div style={rowStyle}>
        <span style={labelStyle}>Resolution</span>
        <select
          value={settings.resolution}
          onChange={(e) => onChange({ resolution: e.target.value as InspectionSettings['resolution'] })}
          style={{ ...inputStyle, width: '100px' }}
        >
          <option value="1080p">1080p HD</option>
          <option value="4K">4K UHD</option>
          <option value="8K">8K UHD</option>
        </select>
      </div>
      <div style={rowStyle}><span style={labelStyle}>FOV (deg)</span><input type="number" value={settings.cameraFOV} onChange={(e) => onChange({ cameraFOV: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Distance (mm)</span><input type="number" value={Math.round(settings.cameraDistance * 1000)} onChange={(e) => onChange({ cameraDistance: Number(e.target.value) / 1000 })} style={inputStyle} /></div>
      <div style={rowStyle}><span style={labelStyle}>Exposure (ms)</span><input type="number" value={settings.exposureTime} onChange={(e) => onChange({ exposureTime: Number(e.target.value) })} style={inputStyle} /></div>
      <div style={rowStyle}>
        <span style={labelStyle}>Lighting</span>
        <select
          value={settings.lighting}
          onChange={(e) => onChange({ lighting: e.target.value as InspectionSettings['lighting'] })}
          style={{ ...inputStyle, width: '100px' }}
        >
          <option value="ambient">Ambient</option>
          <option value="ring">Ring Light</option>
          <option value="structured">Structured</option>
        </select>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>AI Model</span>
        <select
          value={settings.aiModel}
          onChange={(e) => onChange({ aiModel: e.target.value as InspectionSettings['aiModel'] })}
          style={{ ...inputStyle, width: '100px' }}
        >
          <option value="fast">Fast</option>
          <option value="accurate">Accurate</option>
          <option value="ensemble">Ensemble</option>
        </select>
      </div>

      {/* Visualization Options */}
      <div style={sectionStyle}>
        <h5 style={{ margin: '0 0 12px 0', color: THEME.secondary, fontSize: '12px' }}>3D Visualization</h5>
        <div style={rowStyle}>
          <span style={labelStyle}>Show FOV Frustum</span>
          <input
            type="checkbox"
            checked={settings.showFrustum}
            onChange={(e) => onChange({ showFrustum: e.target.checked })}
            style={checkboxStyle}
          />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Show Preview Panel</span>
          <input
            type="checkbox"
            checked={settings.showPreview}
            onChange={(e) => onChange({ showPreview: e.target.checked })}
            style={checkboxStyle}
          />
        </div>
        {settings.cameraType === 'stereo' && (
          <div style={rowStyle}>
            <span style={labelStyle}>Show Depth Map</span>
            <input
              type="checkbox"
              checked={settings.showDepthMap}
              onChange={(e) => onChange({ showDepthMap: e.target.checked })}
              style={checkboxStyle}
            />
          </div>
        )}
      </div>

      {/* TCP Debug Section */}
      <div style={sectionStyle}>
        <h5 style={{ margin: '0 0 12px 0', color: THEME.warning, fontSize: '12px' }}>🔧 TCP Debug</h5>

        <div style={rowStyle}>
          <span style={labelStyle}>Show Axes</span>
          <input
            type="checkbox"
            checked={settings.showDebugAxes}
            onChange={(e) => onChange({ showDebugAxes: e.target.checked })}
            style={checkboxStyle}
          />
        </div>

        <div style={{ marginBottom: '8px', fontSize: '11px', color: THEME.textSecondary }}>Position (mm)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '10px' }}>
          <div>
            <label style={{ fontSize: '10px', color: '#ff6666' }}>X</label>
            <input
              type="number"
              value={Math.round(settings.tcpPositionX * 1000)}
              onChange={(e) => onChange({ tcpPositionX: Number(e.target.value) / 1000 })}
              style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: '#66ff66' }}>Y</label>
            <input
              type="number"
              value={Math.round(settings.tcpPositionY * 1000)}
              onChange={(e) => onChange({ tcpPositionY: Number(e.target.value) / 1000 })}
              style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: '#6666ff' }}>Z</label>
            <input
              type="number"
              value={Math.round(settings.tcpPositionZ * 1000)}
              onChange={(e) => onChange({ tcpPositionZ: Number(e.target.value) / 1000 })}
              style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '8px', fontSize: '11px', color: THEME.textSecondary }}>Rotation (deg)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '10px' }}>
          <div>
            <label style={{ fontSize: '10px', color: '#ff6666' }}>RX</label>
            <input
              type="number"
              value={settings.tcpRotationX}
              onChange={(e) => onChange({ tcpRotationX: Number(e.target.value) })}
              style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: '#66ff66' }}>RY</label>
            <input
              type="number"
              value={settings.tcpRotationY}
              onChange={(e) => onChange({ tcpRotationY: Number(e.target.value) })}
              style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: '#6666ff' }}>RZ</label>
            <input
              type="number"
              value={settings.tcpRotationZ}
              onChange={(e) => onChange({ tcpRotationZ: Number(e.target.value) })}
              style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
            />
          </div>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>Camera Scale</span>
          <input
            type="number"
            step="0.1"
            value={settings.cameraScale}
            onChange={(e) => onChange({ cameraScale: Number(e.target.value) })}
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Defect Report Panel
// ============================================================================

function DefectReportPanel({
  defects,
  selectedDefect,
  scanComplete,
}: {
  defects: Defect[];
  selectedDefect: Defect | null;
  scanComplete: boolean;
}) {
  const counts = {
    critical: defects.filter((d) => d.severity === 'critical').length,
    warning: defects.filter((d) => d.severity === 'warning').length,
    minor: defects.filter((d) => d.severity === 'minor').length,
  };

  return (
    <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
      <h4 style={{ margin: '0 0 16px 0', color: THEME.primary }}>Inspection Report</h4>

      {!scanComplete && defects.length === 0 ? (
        <div style={{ color: THEME.textSecondary, textAlign: 'center', padding: '20px 0' }}>
          Select a region and start scanning to detect defects...
        </div>
      ) : (
        <>
          {/* Summary counts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <div style={{ padding: '12px 8px', background: THEME.background, borderRadius: '6px', textAlign: 'center', borderLeft: `3px solid ${THEME.danger}` }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: THEME.danger }}>{counts.critical}</div>
              <div style={{ fontSize: '10px', color: THEME.textSecondary }}>CRITICAL</div>
            </div>
            <div style={{ padding: '12px 8px', background: THEME.background, borderRadius: '6px', textAlign: 'center', borderLeft: `3px solid ${THEME.warning}` }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: THEME.warning }}>{counts.warning}</div>
              <div style={{ fontSize: '10px', color: THEME.textSecondary }}>WARNING</div>
            </div>
            <div style={{ padding: '12px 8px', background: THEME.background, borderRadius: '6px', textAlign: 'center', borderLeft: `3px solid ${THEME.accent}` }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: THEME.accent }}>{counts.minor}</div>
              <div style={{ fontSize: '10px', color: THEME.textSecondary }}>MINOR</div>
            </div>
          </div>

          {/* Selected defect details */}
          {selectedDefect && (
            <div style={{ padding: '12px', background: THEME.background, borderRadius: '6px', border: `1px solid ${THEME.accent}40` }}>
              <div style={{ fontSize: '12px', color: THEME.accent, marginBottom: '8px', fontWeight: 'bold' }}>
                {selectedDefect.id}
              </div>
              <div style={{ fontSize: '11px', color: THEME.textSecondary, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div>Type: <span style={{ color: THEME.text, textTransform: 'capitalize' }}>{selectedDefect.type}</span></div>
                <div>Severity: <span style={{ color: THEME.text, textTransform: 'capitalize' }}>{selectedDefect.severity}</span></div>
                <div>Size: <span style={{ color: THEME.text }}>{(selectedDefect.size * 1000).toFixed(1)} mm</span></div>
                <div>Confidence: <span style={{ color: THEME.accent }}>{(selectedDefect.confidence * 100).toFixed(1)}%</span></div>
              </div>
            </div>
          )}

          {/* Quality verdict */}
          {scanComplete && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: counts.critical > 0 ? `${THEME.danger}20` : counts.warning > 0 ? `${THEME.warning}20` : `${THEME.success}20`,
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{
                color: counts.critical > 0 ? THEME.danger : counts.warning > 0 ? THEME.warning : THEME.success,
                fontWeight: 'bold',
                fontSize: '14px',
              }}>
                {counts.critical > 0 ? 'REJECT' : counts.warning > 0 ? 'REVIEW REQUIRED' : 'PASS'}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// 3D Scene Content
// ============================================================================

function InspectionSceneContent({
  regions,
  selectedRegionId,
  scannedRegionIds,
  onRegionSelect,
  viewpoints,
  selectedViewpointId,
  defects,
  detectedDefectIds,
  selectedDefectId,
  onDefectSelect,
  isScanning,
  inspectionSettings,
}: {
  regions: InspectionRegion[];
  selectedRegionId: string | null;
  scannedRegionIds: string[];
  onRegionSelect: (id: string) => void;
  viewpoints: CameraViewpoint[];
  selectedViewpointId: string | null;
  defects: Defect[];
  detectedDefectIds: string[];
  selectedDefectId: string | null;
  onDefectSelect: (id: string) => void;
  isScanning: boolean;
  inspectionSettings: InspectionSettings;
}) {
  // Note: TCP is now computed in InspectionScene using INSPECTION_CAMERA_METADATA
  // The InspectionCamera tool is designed to mount directly at flange (tcpOffset not needed)

  return (
    <>
      <ProcessScene
        urdfPath={URDF_PATH}
        showGhost={true}
        showTrajectory={true}
        trajectoryColor={THEME.primary}
      >
        {/* EndEffector without tcpOffset - tool is designed to mount directly at flange */}
        <EndEffector showAxes={inspectionSettings.showDebugAxes}>
          <InspectionCamera
            color={THEME.accent}
            isActive={isScanning}
            showLaser={true}
            showFrustum={inspectionSettings.showFrustum}
            showPreview={false}
            showDepthMap={false}
            cameraType={inspectionSettings.cameraType}
            stereoBaseline={inspectionSettings.stereoBaseline}
            fov={inspectionSettings.cameraFOV}
            workingDistance={inspectionSettings.cameraDistance}
            scale={inspectionSettings.cameraScale}
          />
        </EndEffector>
      </ProcessScene>

      {/* Workpiece */}
      <IndustrialInspectionWorkpiece
        position={[0.5, 0, 0]}
        defects={defects.map(d => ({
          id: d.id,
          position: [d.position[0] - 0.5, d.position[1], d.position[2]] as [number, number, number],
          type: d.type as 'crack' | 'porosity' | 'inclusion' | 'surface',
          severity: d.severity,
          size: d.size,
        }))}
        selectedDefectId={selectedDefectId}
        detectedDefectIds={detectedDefectIds}
        showDefects={true}
      />

      {/* Region overlay */}
      <InspectionRegionOverlay
        regions={regions}
        selectedRegionId={selectedRegionId}
        scannedRegionIds={scannedRegionIds}
        onRegionSelect={onRegionSelect}
      />

      {/* Camera viewpoints */}
      {viewpoints.map((vp) => (
        <CameraFrustum
          key={vp.id}
          position={vp.position}
          quaternion={vp.quaternion}
          fov={vp.fov}
          distance={vp.distance}
          color={THEME.primary}
          opacity={selectedViewpointId === vp.id ? 0.6 : 0.3}
          selected={selectedViewpointId === vp.id}
        />
      ))}

      {/* Defect markers (only for detected defects not shown by workpiece) */}
      {defects
        .filter((d) => detectedDefectIds.includes(d.id))
        .map((defect) => (
          <DefectMarker
            key={defect.id}
            defect={defect}
            selected={selectedDefectId === defect.id}
            onSelect={() => onDefectSelect(defect.id)}
          />
        ))}

      {/* Enhanced workpiece lighting */}
      <pointLight position={[0.5, 1.5, 0.5]} intensity={0.6} color="#ffffff" distance={5} decay={2} />
      <pointLight position={[-0.5, 1, -0.5]} intensity={0.3} color="#e0f0ff" distance={4} decay={2} />
      <spotLight position={[0.5, 0.8, 0]} angle={0.6} intensity={0.4} color="#ffffff" />
    </>
  );
}

// ============================================================================
// Demo Inner Component (with context access)
// ============================================================================

interface TcpSettings {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

interface InspectionDemoInnerProps {
  tcpSettings: TcpSettings;
  onTcpSettingsChange: (settings: TcpSettings) => void;
}

function InspectionDemoInner({ tcpSettings, onTcpSettingsChange }: InspectionDemoInnerProps) {
  const { addLog } = useAppStore();

  // State - sync TCP settings with inspectionSettings
  const [inspectionSettings, setInspectionSettings] = useState<InspectionSettings>({
    ...DEFAULT_INSPECTION_SETTINGS,
    tcpPositionX: tcpSettings.positionX,
    tcpPositionY: tcpSettings.positionY,
    tcpPositionZ: tcpSettings.positionZ,
    tcpRotationX: tcpSettings.rotationX,
    tcpRotationY: tcpSettings.rotationY,
    tcpRotationZ: tcpSettings.rotationZ,
  });

  // When TCP settings change in the panel, propagate up
  const handleSettingsChange = useCallback((partial: Partial<InspectionSettings>) => {
    setInspectionSettings(prev => {
      const newSettings = { ...prev, ...partial };

      // If TCP settings changed, propagate to parent
      if (
        partial.tcpPositionX !== undefined ||
        partial.tcpPositionY !== undefined ||
        partial.tcpPositionZ !== undefined ||
        partial.tcpRotationX !== undefined ||
        partial.tcpRotationY !== undefined ||
        partial.tcpRotationZ !== undefined
      ) {
        onTcpSettingsChange({
          positionX: newSettings.tcpPositionX,
          positionY: newSettings.tcpPositionY,
          positionZ: newSettings.tcpPositionZ,
          rotationX: newSettings.tcpRotationX,
          rotationY: newSettings.tcpRotationY,
          rotationZ: newSettings.tcpRotationZ,
        });
      }

      return newSettings;
    });
  }, [onTcpSettingsChange]);
  const [inputMode, setInputMode] = useState<'auto' | 'manual'>('auto');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [scannedRegionIds, setScannedRegionIds] = useState<string[]>([]);
  const [viewpoints, setViewpoints] = useState<CameraViewpoint[]>([]);
  const [selectedViewpointId, setSelectedViewpointId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [detectedDefectIds, setDetectedDefectIds] = useState<string[]>([]);
  const [selectedDefectId, setSelectedDefectId] = useState<string | null>(null);

  // Playback from context
  const playback = useProcessPlayback();
  const ghost = useProcessGhost();
  const state = useRobotProcessState();

  // State for camera preview panel collapse
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  // Define inspection regions (Z-up coordinates relative to workpiece)
  const inspectionRegions = useMemo<InspectionRegion[]>(() => [
    { id: 'region-top-left', center: [-0.06, 0.05, 0], normal: [0, 0, 1], size: [0.08, 0.06], name: 'Top Left' },
    { id: 'region-top-right', center: [0.06, 0.05, 0], normal: [0, 0, 1], size: [0.08, 0.06], name: 'Top Right' },
    { id: 'region-bottom-left', center: [-0.06, -0.05, 0], normal: [0, 0, 1], size: [0.08, 0.06], name: 'Bottom Left' },
    { id: 'region-bottom-right', center: [0.06, -0.05, 0], normal: [0, 0, 1], size: [0.08, 0.06], name: 'Bottom Right' },
    { id: 'region-center', center: [0, 0, 0], normal: [0, 0, 1], size: [0.1, 0.08], name: 'Center' },
  ], []);

  // Simulated defects (positions in Z-up, relative to workpiece center at 0.5,0,0)
  const simulatedDefects = useMemo<Defect[]>(() => [
    { id: 'DEF-001', position: [0.44, 0.03, 0.052], type: 'crack', severity: 'critical', size: 0.015, confidence: 0.95, detectedAt: 0 },
    { id: 'DEF-002', position: [0.55, 0.06, 0.052], type: 'porosity', severity: 'warning', size: 0.008, confidence: 0.87, detectedAt: 1 },
    { id: 'DEF-003', position: [0.58, -0.04, 0.052], type: 'scratch', severity: 'minor', size: 0.012, confidence: 0.92, detectedAt: 2 },
    { id: 'DEF-004', position: [0.48, -0.06, 0.052], type: 'dent', severity: 'warning', size: 0.01, confidence: 0.81, detectedAt: 3 },
    { id: 'DEF-005', position: [0.52, 0, 0.052], type: 'inclusion', severity: 'minor', size: 0.006, confidence: 0.78, detectedAt: 4 },
  ], []);

  // Generate camera viewpoints from selected region
  const generateViewpoints = useCallback(() => {
    if (!selectedRegionId) {
      addLog('warning', 'Please select an inspection region first');
      return;
    }

    const region = inspectionRegions.find(r => r.id === selectedRegionId);
    if (!region) return;

    const { cameraFOV, cameraDistance } = inspectionSettings;
    const newViewpoints: CameraViewpoint[] = [];

    // Camera pointing down (-Z in Z-up frame)
    // 180° around X to flip TCP Z-axis from +Z to -Z (pointing down toward workpiece)
    const downQuat: [number, number, number, number] = [1, 0, 0, 0];

    // Calculate how many viewpoints needed to cover the region
    const fovRad = (cameraFOV / 2) * (Math.PI / 180);
    const coverage = Math.tan(fovRad) * cameraDistance * 2 * 0.7; // 70% overlap

    const gridX = Math.max(1, Math.ceil(region.size[0] / coverage));
    const gridY = Math.max(1, Math.ceil(region.size[1] / coverage));

    const baseX = 0.5; // Workpiece X position
    const baseZ = 0.052 + cameraDistance; // Surface height + camera distance

    for (let i = 0; i < gridX; i++) {
      for (let j = 0; j < gridY; j++) {
        const offsetX = region.size[0] * ((i + 0.5) / gridX - 0.5);
        const offsetY = region.size[1] * ((j + 0.5) / gridY - 0.5);

        newViewpoints.push({
          id: `vp-${selectedRegionId}-${i}-${j}`,
          position: [
            baseX + region.center[0] + offsetX,
            region.center[1] + offsetY,
            baseZ,
          ],
          quaternion: downQuat,
          regionId: selectedRegionId,
          fov: cameraFOV,
          distance: cameraDistance,
        });
      }
    }

    setViewpoints(newViewpoints);
    addLog('info', `Generated ${newViewpoints.length} viewpoints for ${region.name}`);

    // Generate trajectory
    const waypoints = newViewpoints.map((vp, idx) => ({
      position: vp.position,
      quaternion: vp.quaternion,
      time: idx * 2, // 2 seconds per viewpoint (capture + move)
    }));

    const trajectory: PoseTrajectory = {
      id: `inspect-${selectedRegionId}-${Date.now()}`,
      name: `Inspect ${region.name}`,
      waypoints,
      duration: waypoints.length * 2,
    };

    playback.load(trajectory);
  }, [selectedRegionId, inspectionRegions, inspectionSettings, playback, addLog]);

  // Add manual viewpoint
  const addManualViewpoint = useCallback(() => {
    if (!selectedRegionId) {
      addLog('warning', 'Select a region first');
      return;
    }

    const region = inspectionRegions.find(r => r.id === selectedRegionId);
    if (!region) return;

    const { cameraFOV, cameraDistance } = inspectionSettings;

    const newVp: CameraViewpoint = {
      id: `vp-manual-${Date.now()}`,
      position: [
        0.5 + region.center[0],
        region.center[1],
        0.052 + cameraDistance,
      ],
      quaternion: [1, 0, 0, 0], // 180° around X to point down
      regionId: selectedRegionId,
      fov: cameraFOV,
      distance: cameraDistance,
    };

    setViewpoints(prev => [...prev, newVp]);
    setSelectedViewpointId(newVp.id);
    addLog('info', 'Added manual viewpoint');
  }, [selectedRegionId, inspectionRegions, inspectionSettings, addLog]);

  // Start inspection scan
  const startInspection = useCallback(() => {
    if (!state.trajectory || viewpoints.length === 0) {
      addLog('warning', 'Generate viewpoints first');
      return;
    }
    setIsScanning(true);
    setScanComplete(false);
    setDefects([]);
    setDetectedDefectIds([]);
    playback.play();
    addLog('info', 'Inspection scan started');
  }, [state.trajectory, viewpoints, playback, addLog]);

  // Update during playback - detect defects at viewpoints
  useEffect(() => {
    if (state.isPlaying && state.playbackPose) {
      // Check which viewpoint we're at
      const currentVpIdx = Math.floor(state.playbackPosition * viewpoints.length);
      setSelectedViewpointId(viewpoints[currentVpIdx]?.id || null);

      // Simulate defect detection at each viewpoint
      simulatedDefects.forEach((defect) => {
        if (defect.detectedAt === currentVpIdx && !detectedDefectIds.includes(defect.id)) {
          setDefects(prev => [...prev, defect]);
          setDetectedDefectIds(prev => [...prev, defect.id]);
          addLog(
            defect.severity === 'critical' ? 'error' : defect.severity === 'warning' ? 'warning' : 'info',
            `Detected ${defect.type}: ${defect.id} (${(defect.confidence * 100).toFixed(0)}% confidence)`
          );
        }
      });
    }

    if (state.playbackPosition >= 1 && isScanning) {
      setIsScanning(false);
      setScanComplete(true);
      if (selectedRegionId) {
        setScannedRegionIds(prev => [...prev, selectedRegionId]);
      }
      addLog('info', `Scan complete - ${defects.length} defects found`);
    }
  }, [state.isPlaying, state.playbackPose, state.playbackPosition, isScanning, viewpoints, simulatedDefects, detectedDefectIds, selectedRegionId, defects.length, addLog]);

  // Ghost preview on region selection
  const handleRegionSelect = useCallback((id: string) => {
    console.log('[InspectionScene] handleRegionSelect called:', id);
    console.log('[InspectionScene] ghost state:', { status: ghost.status, targetPose: ghost.targetPose });
    console.log('[InspectionScene] state.robotReady:', state.robotReady);
    setSelectedRegionId(id);
    const region = inspectionRegions.find(r => r.id === id);
    if (region) {
      // 180° around X to point TCP Z-axis down toward workpiece
      const targetPose = {
        position: [0.5 + region.center[0], region.center[1], 0.052 + inspectionSettings.cameraDistance] as [number, number, number],
        quaternion: [1, 0, 0, 0] as [number, number, number, number],
      };
      console.log('[InspectionScene] Setting ghost target:', targetPose);
      ghost.setTarget(targetPose);
    }
    addLog('info', `Selected region: ${inspectionRegions.find(r => r.id === id)?.name || id}`);
  }, [inspectionRegions, inspectionSettings.cameraDistance, ghost, addLog, state.robotReady]);

  const handleStop = useCallback(() => {
    setIsScanning(false);
    playback.pause();
  }, [playback]);

  const handleReset = useCallback(() => {
    setIsScanning(false);
    setScanComplete(false);
    setViewpoints([]);
    setSelectedViewpointId(null);
    setDefects([]);
    setDetectedDefectIds([]);
    setScannedRegionIds([]);
    playback.stop();
    ghost.clear();
  }, [playback, ghost]);

  const selectedDefect = defects.find(d => d.id === selectedDefectId) || null;

  const btnStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: '8px 16px',
    background: active ? color : '#666',
    border: 'none',
    borderRadius: '4px',
    color: active ? (color === THEME.warning || color === THEME.accent ? '#000' : '#fff') : '#fff',
    fontWeight: 'bold',
    cursor: active ? 'pointer' : 'not-allowed',
    opacity: active ? 1 : 0.5,
    fontSize: '12px',
  });

  return (
    <div className="module-container" style={{ background: THEME.background, overflowY: 'auto', maxHeight: '100%' }}>
      <div className="module-header" style={{ borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary }}>Visual Defect Inspection</h2>
        <p style={{ color: THEME.textSecondary }}>AI-powered 2D surface inspection with automated viewpoint planning</p>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', background: THEME.surface, borderRadius: '8px', padding: '4px', border: `1px solid ${THEME.primary}30`, marginBottom: '12px' }}>
        <button
          onClick={() => setInputMode('auto')}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: inputMode === 'auto' ? THEME.primary : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: inputMode === 'auto' ? THEME.text : THEME.textSecondary,
            cursor: 'pointer',
            fontWeight: inputMode === 'auto' ? 'bold' : 'normal',
            fontSize: '12px',
          }}
        >
          Auto Viewpoints
        </button>
        <button
          onClick={() => setInputMode('manual')}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: inputMode === 'manual' ? THEME.primary : 'transparent',
            border: 'none',
            borderRadius: '6px',
            color: inputMode === 'manual' ? THEME.text : THEME.textSecondary,
            cursor: 'pointer',
            fontWeight: inputMode === 'manual' ? 'bold' : 'normal',
            fontSize: '12px',
          }}
        >
          Manual Placement
        </button>
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', gap: '24px', padding: '12px 16px', background: THEME.surface, borderRadius: '8px', marginBottom: '12px', border: `1px solid ${THEME.primary}30`, alignItems: 'center' }}>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>STATUS</span><div style={{ color: isScanning ? THEME.accent : scanComplete ? THEME.success : THEME.text, fontWeight: 'bold' }}>{isScanning ? 'SCANNING' : scanComplete ? 'COMPLETE' : 'READY'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>REGION</span><div style={{ color: selectedRegionId ? THEME.success : '#666', fontWeight: 'bold' }}>{inspectionRegions.find(r => r.id === selectedRegionId)?.name || 'None'}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>VIEWPOINTS</span><div style={{ color: THEME.accent, fontWeight: 'bold' }}>{viewpoints.length}</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>PROGRESS</span><div style={{ color: THEME.accent, fontWeight: 'bold' }}>{(state.playbackPosition * 100).toFixed(0)}%</div></div>
        <div><span style={{ color: THEME.textSecondary, fontSize: '11px' }}>DEFECTS</span><div style={{ color: defects.length > 0 ? THEME.warning : THEME.success, fontWeight: 'bold' }}>{defects.length}</div></div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {inputMode === 'auto' ? (
            <button onClick={generateViewpoints} disabled={isScanning} style={btnStyle(!!selectedRegionId && !isScanning, THEME.primary)}>Generate Viewpoints</button>
          ) : (
            <button onClick={addManualViewpoint} disabled={isScanning} style={btnStyle(!!selectedRegionId && !isScanning, THEME.secondary)}>Add Viewpoint</button>
          )}
          <button onClick={startInspection} disabled={!state.trajectory || isScanning || viewpoints.length === 0} style={btnStyle(!!state.trajectory && !isScanning && viewpoints.length > 0, THEME.accent)}>Start Scan</button>
          <button onClick={handleStop} disabled={!isScanning} style={btnStyle(isScanning, THEME.warning)}>Stop</button>
          <button onClick={handleReset} style={btnStyle(true, THEME.danger)}>Reset</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Left Panel */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <InspectionPanel settings={inspectionSettings} onChange={handleSettingsChange} />
          <DefectReportPanel defects={defects} selectedDefect={selectedDefect} scanComplete={scanComplete} />

          {state.trajectory && (
            <div style={{ padding: '16px', background: THEME.panel, borderRadius: '8px', border: `1px solid ${THEME.primary}40` }}>
              <h4 style={{ margin: '0 0 12px 0', color: THEME.secondary }}>Scan Progress</h4>
              <div style={{ height: '8px', background: THEME.background, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${state.playbackPosition * 100}%`, height: '100%', background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.accent})`, transition: 'width 0.1s linear' }} />
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: THEME.textSecondary }}>
                Viewpoint {Math.min(Math.ceil(state.playbackPosition * viewpoints.length), viewpoints.length)} / {viewpoints.length}
              </div>
            </div>
          )}
        </div>

        {/* 3D View */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div className="canvas-wrapper" style={{ height: '600px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${THEME.primary}30` }}>
            <RoboViz config={{ scene: { background: THEME.background, grid: { enabled: true, size: 10, divisions: 20, color: '#2a1840' } }, camera: { position: { x: 1.5, y: 1.0, z: 1.5 } } }}>
              <InspectionSceneContent
                regions={inspectionRegions}
                selectedRegionId={selectedRegionId}
                scannedRegionIds={scannedRegionIds}
                onRegionSelect={handleRegionSelect}
                viewpoints={viewpoints}
                selectedViewpointId={selectedViewpointId}
                defects={simulatedDefects}
                detectedDefectIds={detectedDefectIds}
                selectedDefectId={selectedDefectId}
                onDefectSelect={setSelectedDefectId}
                isScanning={isScanning}
                inspectionSettings={inspectionSettings}
              />
            </RoboViz>
          </div>

          {/* Camera Preview Overlay (2D UI) */}
          <CameraPreviewOverlay
            isScanning={isScanning}
            scanProgress={state.playbackPosition}
            defectCount={defects.length}
            cameraType={inspectionSettings.cameraType}
            showPreview={inspectionSettings.showPreview}
            showDepthMap={inspectionSettings.showDepthMap}
            isCollapsed={previewCollapsed}
            onToggleCollapse={() => setPreviewCollapsed(prev => !prev)}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper: Euler to Quaternion
// ============================================================================

function eulerToQuaternion(rx: number, ry: number, rz: number): [number, number, number, number] {
  const euler = new THREE.Euler(
    rx * Math.PI / 180,
    ry * Math.PI / 180,
    rz * Math.PI / 180,
    'XYZ'
  );
  const quat = new THREE.Quaternion().setFromEuler(euler);
  return [quat.x, quat.y, quat.z, quat.w];
}

// ============================================================================
// Export - Full Version with ProcessProvider
// ============================================================================

export function InspectionScene() {
  // TCP settings for debug panel (shows computed values)
  const [tcpSettings, setTcpSettings] = useState({
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
  });

  // Compute TCP from tool metadata WITHOUT working distance
  // Working distance is handled by the scene's viewpoint positioning (0.052 + cameraDistance)
  // TCP should only represent the lens front position
  const tcp = useMemo(
    () => computeTcpFromMetadata(INSPECTION_CAMERA_METADATA, 0),
    []
  );

  // Sync computed TCP to settings for display in debug panel
  useEffect(() => {
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(tcp.quaternion[0], tcp.quaternion[1], tcp.quaternion[2], tcp.quaternion[3]),
      'XYZ'
    );
    setTcpSettings({
      positionX: tcp.position[0],
      positionY: tcp.position[1],
      positionZ: tcp.position[2],
      rotationX: euler.x * 180 / Math.PI,
      rotationY: euler.y * 180 / Math.PI,
      rotationZ: euler.z * 180 / Math.PI,
    });
  }, [tcp.position, tcp.quaternion]);

  return (
    <ProcessProvider>
      <RobotProcessProvider
        urdfPath={URDF_PATH}
        robotId="inspection-robot"
        tool={{ position: tcp.position, quaternion: tcp.quaternion }}
      >
        <InspectionDemoInner tcpSettings={tcpSettings} onTcpSettingsChange={setTcpSettings} />
      </RobotProcessProvider>
    </ProcessProvider>
  );
}

export default InspectionScene;
