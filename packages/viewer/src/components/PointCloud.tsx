/**
 * PointCloud component
 * Renders point cloud data with configurable visualization options
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { PointCloudState, ColorMap } from '../types';

export interface PointCloudProps {
  data: PointCloudState;
  onClick?: (pointCloudId: string, pointIndex: number, position: THREE.Vector3) => void;
}

// Color maps for height/intensity visualization
const COLOR_MAPS: Record<ColorMap, (t: number) => [number, number, number]> = {
  jet: (t) => {
    // Classic jet colormap: blue -> cyan -> green -> yellow -> red
    if (t < 0.25) return [0, 4 * t, 1];
    if (t < 0.5) return [0, 1, 1 - 4 * (t - 0.25)];
    if (t < 0.75) return [4 * (t - 0.5), 1, 0];
    return [1, 1 - 4 * (t - 0.75), 0];
  },
  rainbow: (t) => {
    const h = (1 - t) * 0.8;
    return hslToRgb(h, 1, 0.5);
  },
  grayscale: (t) => [t, t, t],
  hot: (t) => {
    // black -> red -> yellow -> white
    if (t < 0.33) return [3 * t, 0, 0];
    if (t < 0.67) return [1, 3 * (t - 0.33), 0];
    return [1, 1, 3 * (t - 0.67)];
  },
  cool: (t) => [t, 1 - t, 1],
  viridis: (t) => {
    // Approximation of viridis colormap
    const r = Math.max(0, Math.min(1, 0.267 + 0.328 * t + 2.1 * t * t - 1.78 * t * t * t));
    const g = Math.max(0, Math.min(1, 0.004 + 1.0 * t + 0.5 * Math.sin(Math.PI * t)));
    const b = Math.max(0, Math.min(1, 0.329 + 0.76 * t - 0.8 * t * t));
    return [r, g, b];
  },
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
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
  return [r, g, b];
}

export function PointCloud({ data, onClick }: PointCloudProps) {
  const { data: pcData, visualization, position, rotation } = data;
  const pointsRef = useRef<THREE.Points>(null);

  // Compute point positions and colors
  const { positions, colors, pointCount } = useMemo(() => {
    const { points, colors: pcColors, intensities, pointCount: count } = pcData;
    const { colorMode, uniformColor, colorMap = 'jet', heightRange, intensityRange } = visualization;

    // Create position array
    const posArray = new Float32Array(points);
    const numPoints = count || Math.floor(points.length / 3);

    // Create color array
    const colorArray = new Float32Array(numPoints * 3);

    // Calculate height range if using height coloring
    let minZ = Infinity, maxZ = -Infinity;
    if (colorMode === 'height' || colorMode === 'distance') {
      if (heightRange) {
        [minZ, maxZ] = heightRange;
      } else {
        for (let i = 0; i < numPoints; i++) {
          const z = posArray[i * 3 + 2];
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
      }
    }

    // Calculate intensity range
    let minI = 0, maxI = 1;
    if (colorMode === 'intensity' && intensities) {
      if (intensityRange) {
        [minI, maxI] = intensityRange;
      } else {
        minI = Math.min(...intensities);
        maxI = Math.max(...intensities);
      }
    }

    // Color mapping function
    const mapColor = COLOR_MAPS[colorMap];

    for (let i = 0; i < numPoints; i++) {
      let r = 1, g = 1, b = 1;

      switch (colorMode) {
        case 'rgb':
          if (pcColors && pcColors.length >= (i + 1) * 3) {
            r = pcColors[i * 3] / 255;
            g = pcColors[i * 3 + 1] / 255;
            b = pcColors[i * 3 + 2] / 255;
          }
          break;

        case 'intensity':
          if (intensities && intensities.length > i) {
            const t = (intensities[i] - minI) / (maxI - minI || 1);
            [r, g, b] = mapColor(Math.max(0, Math.min(1, t)));
          }
          break;

        case 'height': {
          const z = posArray[i * 3 + 2];
          const t = (z - minZ) / (maxZ - minZ || 1);
          [r, g, b] = mapColor(Math.max(0, Math.min(1, t)));
          break;
        }

        case 'distance': {
          const x = posArray[i * 3];
          const y = posArray[i * 3 + 1];
          const z = posArray[i * 3 + 2];
          const dist = Math.sqrt(x * x + y * y + z * z);
          const t = (dist - minZ) / (maxZ - minZ || 1);
          [r, g, b] = mapColor(Math.max(0, Math.min(1, t)));
          break;
        }

        case 'uniform':
        default:
          if (uniformColor) {
            const color = new THREE.Color(uniformColor);
            r = color.r;
            g = color.g;
            b = color.b;
          }
          break;
      }

      colorArray[i * 3] = r;
      colorArray[i * 3 + 1] = g;
      colorArray[i * 3 + 2] = b;
    }

    return {
      positions: posArray,
      colors: colorArray,
      pointCount: numPoints,
    };
  }, [pcData, visualization]);

  // Apply decimation if needed
  const decimatedData = useMemo(() => {
    const { decimationFactor = 1, maxPoints } = visualization;

    if (decimationFactor <= 1 && (!maxPoints || pointCount <= maxPoints)) {
      return { positions, colors, count: pointCount };
    }

    // Calculate effective decimation
    let skip = decimationFactor;
    if (maxPoints && pointCount > maxPoints) {
      skip = Math.max(skip, Math.ceil(pointCount / maxPoints));
    }

    const resultCount = Math.ceil(pointCount / skip);
    const resultPositions = new Float32Array(resultCount * 3);
    const resultColors = new Float32Array(resultCount * 3);

    for (let i = 0, j = 0; i < pointCount && j < resultCount; i += skip, j++) {
      resultPositions[j * 3] = positions[i * 3];
      resultPositions[j * 3 + 1] = positions[i * 3 + 1];
      resultPositions[j * 3 + 2] = positions[i * 3 + 2];
      resultColors[j * 3] = colors[i * 3];
      resultColors[j * 3 + 1] = colors[i * 3 + 1];
      resultColors[j * 3 + 2] = colors[i * 3 + 2];
    }

    return { positions: resultPositions, colors: resultColors, count: resultCount };
  }, [positions, colors, pointCount, visualization]);

  // Update geometry when data changes
  useFrame(() => {
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }
  });

  // Handle click
  const handleClick = (event: { stopPropagation?: () => void }) => {
    if (onClick && event.stopPropagation) {
      event.stopPropagation();
      // For simplicity, report click on center point
      const center = new THREE.Vector3(position[0], position[1], position[2]);
      onClick(pcData.id, 0, center);
    }
  };

  if (!visualization.visible || decimatedData.count === 0) return null;

  const euler = rotation
    ? new THREE.Euler(rotation[0], rotation[1], rotation[2])
    : new THREE.Euler(0, 0, 0);

  // Create geometry with buffer attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(decimatedData.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(decimatedData.colors, 3));
    return geo;
  }, [decimatedData.positions, decimatedData.colors]);

  return (
    <group position={position} rotation={euler}>
      <points ref={pointsRef} onClick={handleClick} geometry={geometry}>
        <pointsMaterial
          size={visualization.pointSize}
          vertexColors
          transparent={visualization.opacity < 1}
          opacity={visualization.opacity}
          sizeAttenuation
        />
      </points>

      {/* Bounding box visualization */}
      {visualization.showBounds && pcData.bounds && (
        <lineSegments>
          <edgesGeometry
            args={[
              new THREE.BoxGeometry(
                pcData.bounds.max.x - pcData.bounds.min.x,
                pcData.bounds.max.y - pcData.bounds.min.y,
                pcData.bounds.max.z - pcData.bounds.min.z
              ),
            ]}
          />
          <lineBasicMaterial color={visualization.boundsColor || '#ffff00'} />
        </lineSegments>
      )}
    </group>
  );
}

/**
 * PointCloudRenderer - Renders all point clouds from the store
 */
import { useViewerStore } from '../store/viewerStore';

export interface PointCloudRendererProps {
  onPointCloudClick?: (pointCloudId: string, pointIndex: number, position: THREE.Vector3) => void;
}

export function PointCloudRenderer({ onPointCloudClick }: PointCloudRendererProps) {
  const { pointClouds, pointCloudsEnabled } = useViewerStore();

  if (!pointCloudsEnabled || pointClouds.size === 0) return null;

  return (
    <group>
      {Array.from(pointClouds.values()).map((pc) => (
        <PointCloud key={pc.data.id} data={pc} onClick={onPointCloudClick} />
      ))}
    </group>
  );
}
