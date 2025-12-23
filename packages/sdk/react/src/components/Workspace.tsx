/**
 * Workspace - Robot workspace visualization
 *
 * Shows the reachable workspace area of a robot.
 *
 * @example
 * ```tsx
 * // Simple workspace
 * <Workspace radius={0.8} />
 *
 * // Positioned workspace with custom color
 * <Workspace
 *   radius={0.8}
 *   position={[1, 0, 0]}
 *   color="#4ecdc4"
 * />
 *
 * // Show reachability state
 * <Workspace radius={0.8} reachable={isReachable} />
 * ```
 */

import * as React from 'react';
import { WorkspaceVisual, SharedWorkspace as CoreSharedWorkspace } from '@aspect/roboviz-core';

export interface WorkspaceProps {
  /** Workspace radius */
  radius: number;

  /** Position [x, y, z] (default: [0, 0, 0]) */
  position?: [number, number, number];

  /** Workspace color (default: '#4ecdc4') */
  color?: string;

  /** Opacity (0-1, default: 0.1) */
  opacity?: number;

  /** Show boundary line (default: true) */
  showBoundary?: boolean;

  /** Show 3D sphere instead of 2D circle */
  use3D?: boolean;

  /** Reachability state (changes color automatically) */
  reachable?: boolean;
}

/**
 * Workspace - Visual workspace area indicator
 */
export function Workspace({
  radius,
  position = [0, 0, 0],
  color = '#4ecdc4',
  opacity = 0.1,
  showBoundary = true,
  use3D = false,
  reachable,
}: WorkspaceProps): React.JSX.Element {
  return (
    <WorkspaceVisual
      radius={radius}
      position={position}
      color={color}
      opacity={opacity}
      showBoundary={showBoundary}
      use3D={use3D}
      reachable={reachable}
    />
  );
}

export default Workspace;
