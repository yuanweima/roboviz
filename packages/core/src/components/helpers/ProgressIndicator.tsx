/**
 * ProgressIndicator Component
 *
 * Visualizes progress as a bar or radial indicator in 3D space.
 */

import * as React from 'react';
import * as THREE from 'three';
import type { Vector3Like } from '../../types';

export interface ProgressIndicatorProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Position of the indicator */
  position?: Vector3Like;
  /** Width of the progress bar (for bar mode) */
  width?: number;
  /** Height of the progress bar (for bar mode) */
  height?: number;
  /** Color of the progress fill */
  color?: string;
  /** Color of the background */
  backgroundColor?: string;
  /** Rotation of the indicator */
  rotation?: [number, number, number];
  /** Display mode: 'bar' (linear) or 'radial' (circular) */
  mode?: 'bar' | 'radial';
  /** Radius for radial mode */
  radius?: number;
  /** Whether to show the progress text */
  showText?: boolean;
  /** Text size (for showText) */
  textSize?: number;
}

/**
 * ProgressIndicator component for visualizing progress in 3D space
 */
export function ProgressIndicator({
  progress,
  position,
  width = 2,
  height = 0.05,
  color = '#00ff88',
  backgroundColor = '#333333',
  rotation,
  mode = 'bar',
  radius = 0.3,
  showText = false,
  textSize = 0.1,
}: ProgressIndicatorProps): React.JSX.Element {
  // Clamp progress to valid range
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Convert position to array
  const pos: [number, number, number] = position
    ? (Array.isArray(position)
        ? position
        : [position.x, position.y, position.z])
    : [0, 0, 0];

  // Default rotation for horizontal placement
  const rot: [number, number, number] = rotation ?? [-Math.PI / 2, 0, 0];

  if (mode === 'radial') {
    return (
      <RadialProgress
        progress={clampedProgress}
        position={pos}
        radius={radius}
        color={color}
        backgroundColor={backgroundColor}
        rotation={rot}
      />
    );
  }

  // Bar mode (default)
  return (
    <group position={pos} rotation={rot}>
      {/* Background bar */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={backgroundColor} transparent opacity={0.8} />
      </mesh>

      {/* Progress fill */}
      <mesh position={[(clampedProgress - 1) * width / 2, 0, 0.001]}>
        <planeGeometry args={[clampedProgress * width, height]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Border */}
      <ProgressBorder width={width} height={height} color={color} />
    </group>
  );
}

/**
 * Helper component for progress bar border
 */
function ProgressBorder({
  width,
  height,
  color,
}: {
  width: number;
  height: number;
  color: string;
}): React.JSX.Element {
  const geometry = React.useMemo(() => {
    const hw = width / 2;
    const hh = height / 2;
    const pts = [
      new THREE.Vector3(-hw, -hh, 0.002),
      new THREE.Vector3(hw, -hh, 0.002),
      new THREE.Vector3(hw, hh, 0.002),
      new THREE.Vector3(-hw, hh, 0.002),
      new THREE.Vector3(-hw, -hh, 0.002),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [width, height]);

  const material = React.useMemo(() => {
    return new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
  }, [color]);

  return (
    <primitive object={new THREE.Line(geometry, material)} />
  );
}

/**
 * Radial progress indicator
 */
function RadialProgress({
  progress,
  position,
  radius,
  color,
  backgroundColor,
  rotation,
}: {
  progress: number;
  position: [number, number, number];
  radius: number;
  color: string;
  backgroundColor: string;
  rotation: [number, number, number];
}): React.JSX.Element {
  const segments = 64;

  // Background ring geometry
  const bgGeometry = React.useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, radius * 0.8, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, segments);
  }, [radius]);

  // Progress arc geometry
  const progressGeometry = React.useMemo(() => {
    if (progress <= 0) return null;

    const angle = progress * Math.PI * 2;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius, 0, angle, false);
    shape.lineTo(Math.cos(angle) * radius * 0.8, Math.sin(angle) * radius * 0.8);
    shape.absarc(0, 0, radius * 0.8, angle, 0, true);
    shape.lineTo(radius, 0);
    return new THREE.ShapeGeometry(shape, Math.ceil(segments * progress));
  }, [radius, progress]);

  return (
    <group position={position} rotation={rotation}>
      {/* Background ring */}
      <mesh geometry={bgGeometry}>
        <meshBasicMaterial
          color={backgroundColor}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Progress arc */}
      {progressGeometry && (
        <mesh geometry={progressGeometry} position={[0, 0, 0.001]}>
          <meshBasicMaterial
            color={color}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Animated progress indicator with pulse effect
 */
export interface AnimatedProgressProps extends ProgressIndicatorProps {
  /** Whether to animate the progress */
  animate?: boolean;
  /** Animation speed multiplier */
  animationSpeed?: number;
}

export function AnimatedProgress({
  progress,
  animate = true,
  animationSpeed = 1,
  ...props
}: AnimatedProgressProps): React.JSX.Element {
  const [pulse, setPulse] = React.useState(0);

  React.useEffect(() => {
    if (!animate) return;

    let animationId: number;
    let startTime: number | null = null;

    const tick = (time: number) => {
      if (startTime === null) startTime = time;
      const elapsed = (time - startTime) / 1000;
      setPulse(Math.sin(elapsed * animationSpeed * 2) * 0.5 + 0.5);
      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [animate, animationSpeed]);

  // Slightly modify color brightness based on pulse
  const animatedOpacity = animate ? 0.7 + pulse * 0.3 : 1;

  return (
    <group>
      <ProgressIndicator {...props} progress={progress} />
      {/* Pulse overlay for active progress */}
      {animate && progress > 0 && progress < 1 && (
        <mesh
          position={
            props.position
              ? (Array.isArray(props.position)
                  ? [props.position[0], props.position[1], props.position[2] + 0.01]
                  : [props.position.x, props.position.y, props.position.z + 0.01])
              : [0, 0, 0.01]
          }
          rotation={props.rotation ?? [-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[(props.width ?? 2) * progress, props.height ?? 0.05]} />
          <meshBasicMaterial
            color={props.color ?? '#00ff88'}
            transparent
            opacity={animatedOpacity * 0.3}
          />
        </mesh>
      )}
    </group>
  );
}

export default ProgressIndicator;
