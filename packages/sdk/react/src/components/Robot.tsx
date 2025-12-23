/**
 * Robot - Simple robot visualization component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Robot urdf="/models/robot.urdf" />
 *
 * // With position and joint control
 * <Robot
 *   urdf="/models/robot.urdf"
 *   position={[0, 0, 0]}
 *   joints={[0, -0.3, 0.6, 0, -0.3, 0]}
 *   color="#4ecdc4"
 * />
 *
 * // With TCP tracking
 * <Robot
 *   urdf="/models/robot.urdf"
 *   onTcpMove={(pose) => console.log('TCP:', pose)}
 * />
 * ```
 */

import * as React from 'react';
import {
  Robot as CoreRobot,
  type Pose,
} from '@aspect/roboviz-core';

export interface RobotProps {
  /** Unique identifier for the robot */
  id?: string;

  /** Path to URDF file */
  urdf: string;

  /** Robot position [x, y, z] */
  position?: [number, number, number];

  /** Robot rotation in radians [x, y, z] (Euler angles) */
  rotation?: [number, number, number];

  /** Joint angles array (radians) */
  joints?: number[];

  /** Robot color (hex string) */
  color?: string;

  /** Opacity (0-1) */
  opacity?: number;

  /** Show coordinate axes */
  showAxes?: boolean;

  /** Show joint labels */
  showLabels?: boolean;

  /** Show link frames */
  showFrames?: boolean;

  /** Called when robot is loaded */
  onLoad?: () => void;

  /** Called when TCP (tool center point) moves */
  onTcpMove?: (pose: Pose) => void;

  /** Called on load error */
  onError?: (error: Error) => void;
}

/**
 * Robot - Renders a robot from URDF with simple props
 */
export function Robot({
  id,
  urdf,
  position,
  rotation,
  joints,
  color,
  opacity,
  showAxes = false,
  showLabels = false,
  showFrames = false,
  onLoad,
  onTcpMove,
  onError,
}: RobotProps): React.JSX.Element {
  // Generate stable ID if not provided
  const robotId = React.useMemo(
    () => id || `robot_${Math.random().toString(36).slice(2, 9)}`,
    [id]
  );

  return (
    <CoreRobot
      id={robotId}
      urdfPath={urdf}
      jointAngles={joints}
      position={position}
      rotation={rotation}
      color={color}
      opacity={opacity}
      showAxes={showAxes}
      showLabels={showLabels}
      showFrames={showFrames}
      onLoad={onLoad}
      onEndEffectorUpdate={onTcpMove}
      onError={onError}
    />
  );
}

export default Robot;
