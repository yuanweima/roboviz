/**
 * CoordinationLine Component
 *
 * Visualizes coordination/communication lines between robots or points.
 */

import * as React from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import type { Vector3Like } from '../../types';

export interface CoordinationLineProps {
  /** Start point of the line */
  start: Vector3Like;
  /** End point of the line */
  end: Vector3Like;
  /** Color of the line */
  color?: string;
  /** Line width */
  lineWidth?: number;
  /** Whether to use dashed line style */
  dashed?: boolean;
  /** Dash size (for dashed lines) */
  dashSize?: number;
  /** Gap size between dashes (for dashed lines) */
  gapSize?: number;
  /** Opacity of the line */
  opacity?: number;
}

/**
 * CoordinationLine component for visualizing connections between robots
 */
export function CoordinationLine({
  start,
  end,
  color = '#00ffff',
  lineWidth = 2,
  dashed = true,
  dashSize = 0.05,
  gapSize = 0.02,
  opacity = 0.8,
}: CoordinationLineProps): React.JSX.Element {
  const startPoint = Array.isArray(start)
    ? new THREE.Vector3(start[0], start[1], start[2])
    : new THREE.Vector3(start.x, start.y, start.z);

  const endPoint = Array.isArray(end)
    ? new THREE.Vector3(end[0], end[1], end[2])
    : new THREE.Vector3(end.x, end.y, end.z);

  return (
    <Line
      points={[startPoint, endPoint]}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={dashSize}
      gapSize={gapSize}
      transparent
      opacity={opacity}
    />
  );
}

/**
 * Multi-point coordination lines
 */
export interface CoordinationLinesProps {
  /** Array of points to connect */
  points: Vector3Like[];
  /** Whether to close the loop (connect last point to first) */
  closed?: boolean;
  /** Color of the lines */
  color?: string;
  /** Line width */
  lineWidth?: number;
  /** Whether to use dashed line style */
  dashed?: boolean;
  /** Dash size (for dashed lines) */
  dashSize?: number;
  /** Gap size between dashes (for dashed lines) */
  gapSize?: number;
  /** Opacity of the lines */
  opacity?: number;
}

export function CoordinationLines({
  points,
  closed = false,
  color = '#00ffff',
  lineWidth = 2,
  dashed = true,
  dashSize = 0.05,
  gapSize = 0.02,
  opacity = 0.8,
}: CoordinationLinesProps): React.JSX.Element | null {
  if (points.length < 2) return null;

  const threePoints = React.useMemo(() => {
    const pts = points.map((p) =>
      Array.isArray(p)
        ? new THREE.Vector3(p[0], p[1], p[2])
        : new THREE.Vector3(p.x, p.y, p.z)
    );

    if (closed && pts.length > 2) {
      pts.push(pts[0].clone());
    }

    return pts;
  }, [points, closed]);

  return (
    <Line
      points={threePoints}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={dashSize}
      gapSize={gapSize}
      transparent
      opacity={opacity}
    />
  );
}

/**
 * Animated coordination line with flowing effect
 */
export interface AnimatedCoordinationLineProps extends CoordinationLineProps {
  /** Whether to animate the line */
  animate?: boolean;
  /** Animation speed */
  speed?: number;
}

export function AnimatedCoordinationLine({
  start,
  end,
  color = '#00ffff',
  lineWidth = 2,
  dashed = true,
  dashSize = 0.05,
  gapSize = 0.02,
  opacity = 0.8,
  animate = true,
  speed = 1,
}: AnimatedCoordinationLineProps): React.JSX.Element {
  const [dashOffset, setDashOffset] = React.useState(0);

  React.useEffect(() => {
    if (!animate) return;

    let animationId: number;
    let lastTime = 0;

    const tick = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      setDashOffset((prev) => (prev + delta * speed * 0.1) % (dashSize + gapSize));
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [animate, speed, dashSize, gapSize]);

  const startPoint = Array.isArray(start)
    ? new THREE.Vector3(start[0], start[1], start[2])
    : new THREE.Vector3(start.x, start.y, start.z);

  const endPoint = Array.isArray(end)
    ? new THREE.Vector3(end[0], end[1], end[2])
    : new THREE.Vector3(end.x, end.y, end.z);

  return (
    <Line
      points={[startPoint, endPoint]}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={dashSize}
      gapSize={gapSize}
      dashOffset={dashOffset}
      transparent
      opacity={opacity}
    />
  );
}

/**
 * Bidirectional coordination line with arrows
 */
export interface BidirectionalLineProps extends CoordinationLineProps {
  /** Whether to show arrows */
  showArrows?: boolean;
  /** Arrow size */
  arrowSize?: number;
}

export function BidirectionalLine({
  start,
  end,
  color = '#00ffff',
  lineWidth = 2,
  dashed = true,
  dashSize = 0.05,
  gapSize = 0.02,
  opacity = 0.8,
  showArrows = true,
  arrowSize = 0.03,
}: BidirectionalLineProps): React.JSX.Element {
  const startPoint = Array.isArray(start)
    ? new THREE.Vector3(start[0], start[1], start[2])
    : new THREE.Vector3(start.x, start.y, start.z);

  const endPoint = Array.isArray(end)
    ? new THREE.Vector3(end[0], end[1], end[2])
    : new THREE.Vector3(end.x, end.y, end.z);

  const midPoint = startPoint.clone().add(endPoint).multiplyScalar(0.5);
  const direction = endPoint.clone().sub(startPoint).normalize();

  return (
    <group>
      {/* Main line */}
      <Line
        points={[startPoint, endPoint]}
        color={color}
        lineWidth={lineWidth}
        dashed={dashed}
        dashSize={dashSize}
        gapSize={gapSize}
        transparent
        opacity={opacity}
      />

      {/* Arrows at midpoint */}
      {showArrows && (
        <group position={midPoint}>
          {/* Arrow pointing to end */}
          <mesh
            position={direction.clone().multiplyScalar(arrowSize)}
            rotation={[
              0,
              Math.atan2(direction.x, direction.z),
              Math.asin(-direction.y),
            ]}
          >
            <coneGeometry args={[arrowSize * 0.5, arrowSize, 8]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>

          {/* Arrow pointing to start */}
          <mesh
            position={direction.clone().multiplyScalar(-arrowSize)}
            rotation={[
              0,
              Math.atan2(-direction.x, -direction.z),
              Math.asin(direction.y),
            ]}
          >
            <coneGeometry args={[arrowSize * 0.5, arrowSize, 8]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default CoordinationLine;
