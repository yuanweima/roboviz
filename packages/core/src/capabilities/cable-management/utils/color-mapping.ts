/**
 * Color Mapping
 *
 * Utilities for mapping cable stress/twist values to colors.
 */

import type { CableWarningLevel } from '../types';
import { WARNING_LEVEL_COLORS } from '../constants';

/**
 * Get color for warning level
 */
export function getWarningLevelColor(level: CableWarningLevel): string {
  return WARNING_LEVEL_COLORS[level];
}

/**
 * Get gradient color based on twist percentage (0-100)
 */
export function getTwistGradientColor(percentage: number): string {
  const clamped = Math.max(0, Math.min(100, percentage));

  // Color stops:
  // 0-50%: green to yellow
  // 50-75%: yellow to orange
  // 75-100%: orange to red

  if (clamped < 50) {
    return lerpColor(
      WARNING_LEVEL_COLORS.safe,
      WARNING_LEVEL_COLORS.caution,
      clamped / 50
    );
  } else if (clamped < 75) {
    return lerpColor(
      WARNING_LEVEL_COLORS.caution,
      WARNING_LEVEL_COLORS.warning,
      (clamped - 50) / 25
    );
  } else {
    return lerpColor(
      WARNING_LEVEL_COLORS.warning,
      WARNING_LEVEL_COLORS.critical,
      (clamped - 75) / 25
    );
  }
}

/**
 * Get stress color based on normalized stress value (0-1)
 */
export function getStressColor(stress: number): string {
  return getTwistGradientColor(stress * 100);
}

/**
 * Linear interpolation between two hex colors
 */
export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return color1;

  const clampedT = Math.max(0, Math.min(1, t));

  const r = Math.round(c1.r + (c2.r - c1.r) * clampedT);
  const g = Math.round(c1.g + (c2.g - c1.g) * clampedT);
  const b = Math.round(c1.b + (c2.b - c1.b) * clampedT);

  return rgbToHex(r, g, b);
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  // Handle both #RRGGBB and RRGGBB formats
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, n)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate color array for stress profile visualization
 */
export function generateStressColorArray(
  stressProfile: number[],
  format: 'hex' | 'rgb' | 'normalized' = 'hex'
): string[] | number[][] {
  return stressProfile.map((stress) => {
    const color = getStressColor(stress);

    if (format === 'hex') {
      return color;
    }

    const rgb = hexToRgb(color);
    if (!rgb) return format === 'rgb' ? [0, 0, 0] : [0, 0, 0];

    if (format === 'normalized') {
      return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
    }

    return [rgb.r, rgb.g, rgb.b];
  }) as string[] | number[][];
}

/**
 * Create gradient texture data for cable visualization
 */
export function generateGradientTextureData(
  stressProfile: number[],
  width: number = 256
): Uint8Array {
  const data = new Uint8Array(width * 4); // RGBA

  for (let i = 0; i < width; i++) {
    // Map texture coordinate to stress profile
    const t = i / (width - 1);
    const profileIdx = Math.floor(t * (stressProfile.length - 1));
    const stress = stressProfile[profileIdx] ?? 0;

    const color = hexToRgb(getStressColor(stress));
    if (color) {
      data[i * 4] = color.r;
      data[i * 4 + 1] = color.g;
      data[i * 4 + 2] = color.b;
      data[i * 4 + 3] = 255;
    }
  }

  return data;
}

/**
 * Color palette for multiple cables
 */
export const CABLE_COLOR_PALETTE = [
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#9b59b6', // Purple
  '#f39c12', // Orange
  '#1abc9c', // Teal
  '#e91e63', // Pink
  '#00bcd4', // Cyan
  '#ff5722', // Deep Orange
  '#607d8b', // Blue Grey
];

/**
 * Get color for cable by index
 */
export function getCableColor(index: number): string {
  return CABLE_COLOR_PALETTE[index % CABLE_COLOR_PALETTE.length];
}

/**
 * Adjust color brightness
 */
export function adjustBrightness(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor)
  );
}

/**
 * Get contrasting text color (black or white) for background
 */
export function getContrastColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}
