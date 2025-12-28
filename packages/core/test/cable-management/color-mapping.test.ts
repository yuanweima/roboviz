/**
 * Color Mapping Tests
 *
 * Unit tests for cable color utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  getWarningLevelColor,
  getTwistGradientColor,
  getStressColor,
  lerpColor,
  hexToRgb,
  rgbToHex,
  generateStressColorArray,
  generateGradientTextureData,
  CABLE_COLOR_PALETTE,
  getCableColor,
  adjustBrightness,
  getContrastColor,
} from '../../src/capabilities/cable-management/utils/color-mapping';
import { WARNING_LEVEL_COLORS } from '../../src/capabilities/cable-management/constants';

// ============================================================
// getWarningLevelColor Tests
// ============================================================

describe('getWarningLevelColor', () => {
  it('should return correct color for each warning level', () => {
    expect(getWarningLevelColor('safe')).toBe(WARNING_LEVEL_COLORS.safe);
    expect(getWarningLevelColor('caution')).toBe(WARNING_LEVEL_COLORS.caution);
    expect(getWarningLevelColor('warning')).toBe(WARNING_LEVEL_COLORS.warning);
    expect(getWarningLevelColor('critical')).toBe(WARNING_LEVEL_COLORS.critical);
  });

  it('should return valid hex colors', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    expect(getWarningLevelColor('safe')).toMatch(hexRegex);
    expect(getWarningLevelColor('critical')).toMatch(hexRegex);
  });
});

// ============================================================
// hexToRgb and rgbToHex Tests
// ============================================================

describe('hexToRgb', () => {
  it('should parse hex color with #', () => {
    const rgb = hexToRgb('#ff0000');
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('should parse hex color without #', () => {
    const rgb = hexToRgb('00ff00');
    expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('should handle lowercase and uppercase', () => {
    expect(hexToRgb('#aabbcc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(hexToRgb('#AABBCC')).toEqual({ r: 170, g: 187, b: 204 });
  });

  it('should return null for invalid hex', () => {
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('#ff')).toBeNull();
    expect(hexToRgb('')).toBeNull();
  });
});

describe('rgbToHex', () => {
  it('should convert RGB to hex', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
  });

  it('should handle intermediate values', () => {
    expect(rgbToHex(128, 128, 128)).toBe('#808080');
  });

  it('should clamp values to 0-255', () => {
    expect(rgbToHex(-10, 300, 128)).toBe('#00ff80');
  });

  it('should pad single digit hex values', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(15, 15, 15)).toBe('#0f0f0f');
  });
});

// ============================================================
// lerpColor Tests
// ============================================================

describe('lerpColor', () => {
  it('should return first color at t=0', () => {
    const result = lerpColor('#ff0000', '#0000ff', 0);
    expect(result).toBe('#ff0000');
  });

  it('should return second color at t=1', () => {
    const result = lerpColor('#ff0000', '#0000ff', 1);
    expect(result).toBe('#0000ff');
  });

  it('should interpolate at t=0.5', () => {
    const result = lerpColor('#ff0000', '#0000ff', 0.5);
    const rgb = hexToRgb(result);
    expect(rgb?.r).toBeCloseTo(128, 0);
    expect(rgb?.b).toBeCloseTo(128, 0);
  });

  it('should clamp t to 0-1 range', () => {
    const belowZero = lerpColor('#ff0000', '#0000ff', -0.5);
    expect(belowZero).toBe('#ff0000');

    const aboveOne = lerpColor('#ff0000', '#0000ff', 1.5);
    expect(aboveOne).toBe('#0000ff');
  });

  it('should return first color for invalid input', () => {
    const result = lerpColor('#ff0000', 'invalid', 0.5);
    expect(result).toBe('#ff0000');
  });
});

// ============================================================
// getTwistGradientColor Tests
// ============================================================

describe('getTwistGradientColor', () => {
  it('should return safe color at 0%', () => {
    const color = getTwistGradientColor(0);
    expect(color).toBe(WARNING_LEVEL_COLORS.safe);
  });

  it('should return critical color at 100%', () => {
    const color = getTwistGradientColor(100);
    expect(color).toBe(WARNING_LEVEL_COLORS.critical);
  });

  it('should return caution color at 50%', () => {
    const color = getTwistGradientColor(50);
    expect(color).toBe(WARNING_LEVEL_COLORS.caution);
  });

  it('should return warning color at 75%', () => {
    const color = getTwistGradientColor(75);
    expect(color).toBe(WARNING_LEVEL_COLORS.warning);
  });

  it('should clamp values outside 0-100', () => {
    const below = getTwistGradientColor(-50);
    const above = getTwistGradientColor(150);
    expect(below).toBe(WARNING_LEVEL_COLORS.safe);
    expect(above).toBe(WARNING_LEVEL_COLORS.critical);
  });

  it('should return interpolated colors', () => {
    const at25 = getTwistGradientColor(25);
    const rgb = hexToRgb(at25);
    // Should be between safe and caution
    expect(rgb).not.toBeNull();
    expect(rgb!.r).toBeGreaterThan(0);
  });
});

// ============================================================
// getStressColor Tests
// ============================================================

describe('getStressColor', () => {
  it('should convert 0-1 stress to gradient color', () => {
    expect(getStressColor(0)).toBe(getTwistGradientColor(0));
    expect(getStressColor(0.5)).toBe(getTwistGradientColor(50));
    expect(getStressColor(1)).toBe(getTwistGradientColor(100));
  });
});

// ============================================================
// generateStressColorArray Tests
// ============================================================

describe('generateStressColorArray', () => {
  it('should generate hex color array', () => {
    const stresses = [0, 0.5, 1];
    const colors = generateStressColorArray(stresses, 'hex') as string[];

    expect(colors.length).toBe(3);
    colors.forEach((c) => expect(c).toMatch(/^#[0-9a-fA-F]{6}$/));
  });

  it('should generate RGB array', () => {
    const stresses = [0, 0.5, 1];
    const colors = generateStressColorArray(stresses, 'rgb') as number[][];

    expect(colors.length).toBe(3);
    colors.forEach((c) => {
      expect(c.length).toBe(3);
      c.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      });
    });
  });

  it('should generate normalized RGB array', () => {
    const stresses = [0, 0.5, 1];
    const colors = generateStressColorArray(stresses, 'normalized') as number[][];

    expect(colors.length).toBe(3);
    colors.forEach((c) => {
      expect(c.length).toBe(3);
      c.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });
    });
  });
});

// ============================================================
// generateGradientTextureData Tests
// ============================================================

describe('generateGradientTextureData', () => {
  it('should generate RGBA texture data', () => {
    const stresses = [0, 0.5, 1];
    const data = generateGradientTextureData(stresses, 16);

    expect(data.length).toBe(16 * 4); // width * RGBA
  });

  it('should have full alpha channel', () => {
    const stresses = [0, 0.5, 1];
    const data = generateGradientTextureData(stresses, 8);

    // Check alpha values (every 4th byte starting at index 3)
    for (let i = 3; i < data.length; i += 4) {
      expect(data[i]).toBe(255);
    }
  });

  it('should use default width', () => {
    const stresses = [0, 1];
    const data = generateGradientTextureData(stresses);
    expect(data.length).toBe(256 * 4); // default width = 256
  });
});

// ============================================================
// CABLE_COLOR_PALETTE and getCableColor Tests
// ============================================================

describe('CABLE_COLOR_PALETTE', () => {
  it('should have multiple colors', () => {
    expect(CABLE_COLOR_PALETTE.length).toBeGreaterThan(5);
  });

  it('should contain valid hex colors', () => {
    CABLE_COLOR_PALETTE.forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('getCableColor', () => {
  it('should return colors from palette', () => {
    expect(getCableColor(0)).toBe(CABLE_COLOR_PALETTE[0]);
    expect(getCableColor(1)).toBe(CABLE_COLOR_PALETTE[1]);
  });

  it('should wrap around for large indices', () => {
    const paletteSize = CABLE_COLOR_PALETTE.length;
    expect(getCableColor(paletteSize)).toBe(CABLE_COLOR_PALETTE[0]);
    expect(getCableColor(paletteSize + 1)).toBe(CABLE_COLOR_PALETTE[1]);
  });
});

// ============================================================
// adjustBrightness Tests
// ============================================================

describe('adjustBrightness', () => {
  it('should darken with factor < 1', () => {
    const darkened = adjustBrightness('#ffffff', 0.5);
    const rgb = hexToRgb(darkened);
    expect(rgb?.r).toBe(128);
    expect(rgb?.g).toBe(128);
    expect(rgb?.b).toBe(128);
  });

  it('should brighten with factor > 1', () => {
    const brightened = adjustBrightness('#808080', 1.5);
    const rgb = hexToRgb(brightened);
    expect(rgb?.r).toBe(192);
  });

  it('should return original for invalid color', () => {
    expect(adjustBrightness('invalid', 1.5)).toBe('invalid');
  });

  it('should clamp to 255', () => {
    const result = adjustBrightness('#ffffff', 2);
    expect(result).toBe('#ffffff'); // Clamped to 255
  });
});

// ============================================================
// getContrastColor Tests
// ============================================================

describe('getContrastColor', () => {
  it('should return black for light backgrounds', () => {
    expect(getContrastColor('#ffffff')).toBe('#000000');
    expect(getContrastColor('#ffff00')).toBe('#000000'); // Yellow is light
  });

  it('should return white for dark backgrounds', () => {
    expect(getContrastColor('#000000')).toBe('#ffffff');
    expect(getContrastColor('#000080')).toBe('#ffffff'); // Navy is dark
  });

  it('should handle mid-tones', () => {
    // Gray at 50% luminance - could go either way
    const result = getContrastColor('#808080');
    expect(result === '#000000' || result === '#ffffff').toBe(true);
  });

  it('should return black for invalid input', () => {
    expect(getContrastColor('invalid')).toBe('#000000');
  });
});
