/**
 * Cable Visualizer
 *
 * 3D visualization component for cables in the scene.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Line, Sphere } from '@react-three/drei';
import {
  useCableManagement,
  useAllCableStates,
  useAllCableConfigs,
} from '../CableManagementContext';
import {
  generateCableSpline,
  generateCatenaryPath,
  sampleCurvePoints,
} from '../utils/spline-generator';
import { getWarningLevelColor } from '../utils/color-mapping';
import { VISUALIZATION_CONSTANTS } from '../constants';
import type { CableConfig, CableState, CableDisplaySettings } from '../types';

// ============================================================
// Types
// ============================================================

export interface CableVisualizerProps {
  /** Robot ID for kinematics */
  robotId: string;

  /** Only show specific cables */
  cableIds?: string[];

  /** Override display settings */
  displaySettingsOverride?: Partial<CableDisplaySettings>;
}

interface SingleCableProps {
  cable: CableConfig;
  cableState?: CableState;
  displaySettings: CableDisplaySettings;
}

// ============================================================
// Main Component
// ============================================================

export function CableVisualizer({
  robotId,
  cableIds,
  displaySettingsOverride,
}: CableVisualizerProps) {
  const { state } = useCableManagement();
  const cableStates = useAllCableStates();
  const cables = useAllCableConfigs();

  const displaySettings = useMemo(
    () => ({ ...state.displaySettings, ...displaySettingsOverride }),
    [state.displaySettings, displaySettingsOverride]
  );

  if (!displaySettings.showCables) {
    return null;
  }

  // Filter cables if specific IDs provided
  const cablesToRender = useMemo(() => {
    const allCables = Array.from(cables.values());
    if (cableIds && cableIds.length > 0) {
      return allCables.filter((c) => cableIds.includes(c.id));
    }
    return allCables;
  }, [cables, cableIds]);

  return (
    <group name="cable-visualizer">
      {cablesToRender.map((cable) => (
        <SingleCable
          key={cable.id}
          cable={cable}
          cableState={cableStates.get(cable.id)}
          displaySettings={displaySettings}
        />
      ))}
    </group>
  );
}

// ============================================================
// Single Cable Renderer
// ============================================================

function SingleCable({ cable, cableState, displaySettings }: SingleCableProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate cable path points
  const pathPoints = useMemo(() => {
    // If we have path points from state, use them
    if (cableState?.pathPoints && cableState.pathPoints.length >= 2) {
      return cableState.pathPoints.map((p) => new THREE.Vector3(...p));
    }

    // Otherwise generate default catenary path
    const start = new THREE.Vector3(...cable.anchorPoint.offset);
    const end = new THREE.Vector3(...cable.attachmentPoint.offset);

    return generateCatenaryPath(start, end, {
      sagFactor: VISUALIZATION_CONSTANTS.DEFAULT_SAG_FACTOR,
      segments: 20,
    });
  }, [cable, cableState?.pathPoints]);

  // Generate smooth spline curve
  const curve = useMemo(() => {
    if (pathPoints.length < 2) return null;
    return generateCableSpline(pathPoints);
  }, [pathPoints]);

  // Sample points from curve for rendering
  const curvePoints = useMemo(() => {
    if (!curve) return pathPoints;
    return sampleCurvePoints(curve, VISUALIZATION_CONSTANTS.SPLINE_SEGMENTS);
  }, [curve, pathPoints]);

  // Determine cable color
  const cableColor = useMemo(() => {
    if (displaySettings.colorByStress && cableState) {
      return getWarningLevelColor(cableState.warningLevel);
    }
    return cable.properties.color;
  }, [displaySettings.colorByStress, cableState, cable.properties.color]);

  if (curvePoints.length < 2) {
    return null;
  }

  return (
    <group ref={groupRef} name={`cable-${cable.id}`}>
      {/* Cable line/tube */}
      <CableGeometry
        points={curvePoints}
        color={cableColor}
        radius={cable.properties.diameter * VISUALIZATION_CONSTANTS.TUBE_RADIUS_SCALE / 2}
        renderMode={displaySettings.renderMode}
        lineWidth={displaySettings.lineWidth}
        segments={displaySettings.tubeSegments}
      />

      {/* Attachment markers */}
      {displaySettings.showAttachmentMarkers && (
        <>
          <AttachmentMarker
            position={pathPoints[0]}
            type="anchor"
            size={VISUALIZATION_CONSTANTS.ATTACHMENT_MARKER_SIZE}
          />
          <AttachmentMarker
            position={pathPoints[pathPoints.length - 1]}
            type="attachment"
            size={VISUALIZATION_CONSTANTS.ATTACHMENT_MARKER_SIZE}
          />
        </>
      )}
    </group>
  );
}

// ============================================================
// Cable Geometry Component
// ============================================================

interface CableGeometryProps {
  points: THREE.Vector3[];
  color: string;
  radius: number;
  renderMode: 'line' | 'tube' | 'ribbon';
  lineWidth: number;
  segments: number;
}

function CableGeometry({
  points,
  color,
  radius,
  renderMode,
  lineWidth,
  segments,
}: CableGeometryProps) {
  switch (renderMode) {
    case 'tube':
      return (
        <TubeCable
          points={points}
          color={color}
          radius={radius}
          segments={segments}
        />
      );

    case 'ribbon':
      return (
        <Line
          points={points}
          color={color}
          lineWidth={lineWidth * 3}
        />
      );

    case 'line':
    default:
      return (
        <Line
          points={points}
          color={color}
          lineWidth={lineWidth}
        />
      );
  }
}

// ============================================================
// Tube Cable Component
// ============================================================

interface TubeCableProps {
  points: THREE.Vector3[];
  color: string;
  radius: number;
  segments: number;
}

function TubeCable({ points, color, radius, segments }: TubeCableProps) {
  const geometry = useMemo(() => {
    if (points.length < 2) return null;

    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(
      curve,
      segments,
      radius,
      8, // Radial segments
      false // Closed
    );
  }, [points, radius, segments]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
  );
}

// ============================================================
// Attachment Marker Component
// ============================================================

interface AttachmentMarkerProps {
  position: THREE.Vector3;
  type: 'anchor' | 'attachment';
  size: number;
}

function AttachmentMarker({ position, type, size }: AttachmentMarkerProps) {
  const color = type === 'anchor' ? '#4a90d9' : '#d94a4a';

  return (
    <Sphere
      position={position}
      args={[size, 16, 16]}
    >
      <meshStandardMaterial color={color} />
    </Sphere>
  );
}

// ============================================================
// Cable Path Overlay (for trajectory visualization)
// ============================================================

export interface CablePathOverlayProps {
  /** Twist profile along the path (0-1 normalized stress) */
  twistProfile: number[];

  /** Path points */
  pathPoints: THREE.Vector3[];

  /** Line width */
  lineWidth?: number;
}

export function CablePathOverlay({
  twistProfile,
  pathPoints,
  lineWidth = 4,
}: CablePathOverlayProps) {
  // Generate vertex colors based on twist profile
  const vertexColors = useMemo(() => {
    return pathPoints.map((_, i) => {
      const stress = twistProfile[i] ?? 0;
      const color = getWarningLevelColor(
        stress > 0.95
          ? 'critical'
          : stress > 0.75
            ? 'warning'
            : stress > 0.5
              ? 'caution'
              : 'safe'
      );
      return new THREE.Color(color);
    });
  }, [pathPoints, twistProfile]);

  if (pathPoints.length < 2) return null;

  return (
    <Line
      points={pathPoints}
      vertexColors={vertexColors}
      lineWidth={lineWidth}
    />
  );
}
