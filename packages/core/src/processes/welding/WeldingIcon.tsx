/**
 * WeldingIcon Component
 *
 * SVG icon for the welding process.
 */

import * as React from 'react';

export interface WeldingIconProps {
  size?: number;
  color?: string;
}

export function WeldingIcon({
  size = 24,
  color = 'currentColor',
}: WeldingIconProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Torch body */}
      <path d="M12 2L12 10" />
      <path d="M8 4L16 4" />
      <path d="M10 6L14 6" />

      {/* Torch tip */}
      <path d="M11 10L13 10L12 14L11 10Z" fill={color} />

      {/* Welding arc/sparks */}
      <path d="M12 14L12 16" strokeWidth="3" />
      <path d="M8 18L10 16" />
      <path d="M16 18L14 16" />
      <path d="M6 20L9 17" />
      <path d="M18 20L15 17" />

      {/* Weld bead */}
      <path d="M4 22C8 20 16 20 20 22" strokeWidth="3" />
    </svg>
  );
}

export default WeldingIcon;
