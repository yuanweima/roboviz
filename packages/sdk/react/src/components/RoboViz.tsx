/**
 * RoboViz - Main container component
 *
 * The root component that sets up the 3D scene for robot visualization.
 * All other RoboViz components must be children of this component.
 *
 * @example
 * ```tsx
 * <RoboViz width="100%" height="600px">
 *   <Robot urdf="/models/robot.urdf" />
 * </RoboViz>
 * ```
 */

import * as React from 'react';
import { RoboVizCore, type RoboVizCoreProps } from '@aspect/roboviz-core';

export interface RoboVizProps {
  /** Child components (Robot, Trajectory, SafetyZone, etc.) */
  children?: React.ReactNode;

  /** Width of the canvas (CSS value, default: '100%') */
  width?: string | number;

  /** Height of the canvas (CSS value, default: '100%') */
  height?: string | number;

  /** Background color (default: '#1a1a2e') */
  backgroundColor?: string;

  /** Camera position (default: { x: 2, y: 1.5, z: 2 }) */
  cameraPosition?: { x: number; y: number; z: number };

  /** Camera field of view in degrees (default: 50) */
  cameraFov?: number;

  /** Show grid floor (default: true) */
  showGrid?: boolean;

  /** Grid size (default: 10) */
  gridSize?: number;

  /** Enable orbit controls (default: true) */
  enableControls?: boolean;

  /** Called when scene is ready */
  onReady?: () => void;

  /** Called on each frame */
  onFrame?: (delta: number) => void;

  /** Additional class name for the container */
  className?: string;

  /** Additional inline styles for the container */
  style?: React.CSSProperties;
}

/**
 * RoboViz - The main 3D visualization container
 */
export function RoboViz({
  children,
  width = '100%',
  height = '100%',
  backgroundColor = '#1a1a2e',
  cameraPosition = { x: 2, y: 1.5, z: 2 },
  cameraFov = 50,
  showGrid = true,
  gridSize = 10,
  enableControls = true,
  onReady,
  onFrame,
  className,
  style,
}: RoboVizProps): React.JSX.Element {
  // Convert to core props
  const coreProps: RoboVizCoreProps = {
    camera: {
      position: cameraPosition,
      fov: cameraFov,
    },
    scene: {
      background: backgroundColor,
      grid: {
        enabled: showGrid,
        size: gridSize,
        divisions: gridSize * 2,
      },
    },
    controls: {
      enabled: enableControls,
    },
    onReady,
    onFrame,
  };

  // Combine styles
  const containerStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      <RoboVizCore {...coreProps}>{children}</RoboVizCore>
    </div>
  );
}

export default RoboViz;
