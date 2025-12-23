/**
 * SafetyZone - Robot safety zone visualization
 *
 * Displays concentric safety zones around a point (typically robot base).
 * Can automatically detect when objects enter danger zones.
 *
 * @example
 * ```tsx
 * // Simple usage
 * <SafetyZone radius={0.8} />
 *
 * // With warning and danger zones
 * <SafetyZone
 *   radius={0.5}
 *   warningRadius={0.8}
 *   dangerRadius={1.2}
 * />
 *
 * // With collision detection
 * <SafetyZone
 *   radius={0.8}
 *   onEnter={(zone) => console.log(`Entered ${zone} zone`)}
 *   onExit={(zone) => console.log(`Exited ${zone} zone`)}
 * />
 * ```
 */

import * as React from 'react';
import { SafetyZoneVisual } from '@aspect/roboviz-core';

export interface SafetyZoneProps {
  /** Safe zone radius (green) */
  radius: number;

  /** Warning zone radius (yellow, default: radius * 1.5) */
  warningRadius?: number;

  /** Danger zone radius (red, default: warningRadius * 1.2) */
  dangerRadius?: number;

  /** Position [x, y, z] (default: [0, 0, 0]) */
  position?: [number, number, number];

  /** Opacity (0-1, default: 0.2) */
  opacity?: number;

  /** Show 3D cylinder instead of 2D rings */
  use3D?: boolean;

  /** Height for 3D mode */
  height?: number;

  /** Safe zone color (default: '#00ff00') */
  safeColor?: string;

  /** Warning zone color (default: '#ffff00') */
  warningColor?: string;

  /** Danger zone color (default: '#ff4444') */
  dangerColor?: string;

  /** Show boundary lines (default: true) */
  showBoundary?: boolean;

  /** Called when object enters a zone */
  onEnter?: (zone: 'safe' | 'warning' | 'danger', objectId: string) => void;

  /** Called when object exits a zone */
  onExit?: (zone: 'safe' | 'warning' | 'danger', objectId: string) => void;
}

/**
 * SafetyZone - Visual safety zone with optional collision detection
 */
export function SafetyZone({
  radius,
  warningRadius,
  dangerRadius,
  position = [0, 0, 0],
  opacity = 0.2,
  use3D = false,
  height = 0,
  safeColor = '#00ff00',
  warningColor = '#ffff00',
  dangerColor = '#ff4444',
  showBoundary = true,
  onEnter,
  onExit,
}: SafetyZoneProps): React.JSX.Element {
  // Calculate default radii
  const effectiveWarningRadius = warningRadius ?? radius * 1.5;
  const effectiveDangerRadius = dangerRadius ?? effectiveWarningRadius * 1.2;

  // TODO: Connect to collision detection when onEnter/onExit are provided
  // This will be implemented when we add collision detection integration

  return (
    <SafetyZoneVisual
      innerRadius={radius}
      outerRadius={effectiveWarningRadius}
      dangerRadius={effectiveDangerRadius}
      position={position}
      opacity={opacity}
      use3D={use3D}
      height={height}
      innerColor={safeColor}
      warningColor={warningColor}
      dangerColor={dangerColor}
      showBoundary={showBoundary}
    />
  );
}

export default SafetyZone;
