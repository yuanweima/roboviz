/**
 * Constants Tests
 *
 * Unit tests for cable management constants and utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_TWIST_CONSTRAINTS,
  WARNING_LEVEL_COLORS,
  WARNING_LEVEL_PRIORITY,
  CABLE_PRESETS,
  getWarningLevelFromTwist,
  isMoreSevere,
  getMostSevereLevel,
  createDefaultCableConfig,
} from '../../src/capabilities/cable-management/constants';
import type { CableWarningLevel } from '../../src/capabilities/cable-management/types';

// ============================================================
// Constants Validation Tests
// ============================================================

describe('DEFAULT_DISPLAY_SETTINGS', () => {
  it('should have all required properties', () => {
    expect(DEFAULT_DISPLAY_SETTINGS.showCables).toBe(true);
    expect(DEFAULT_DISPLAY_SETTINGS.showTwistGauge).toBe(true);
    expect(DEFAULT_DISPLAY_SETTINGS.showWarnings).toBe(true);
    expect(DEFAULT_DISPLAY_SETTINGS.renderMode).toBe('tube');
    expect(DEFAULT_DISPLAY_SETTINGS.lineWidth).toBeGreaterThan(0);
    expect(DEFAULT_DISPLAY_SETTINGS.tubeSegments).toBeGreaterThan(0);
  });
});

describe('DEFAULT_TWIST_CONSTRAINTS', () => {
  it('should have valid threshold ordering', () => {
    expect(DEFAULT_TWIST_CONSTRAINTS.warningThreshold).toBeLessThan(
      DEFAULT_TWIST_CONSTRAINTS.criticalThreshold
    );
    expect(DEFAULT_TWIST_CONSTRAINTS.criticalThreshold).toBeLessThan(
      DEFAULT_TWIST_CONSTRAINTS.maxTwist
    );
  });

  it('should default to 360 degrees max twist', () => {
    expect(DEFAULT_TWIST_CONSTRAINTS.maxTwist).toBeCloseTo(Math.PI * 2, 5);
  });
});

describe('WARNING_LEVEL_COLORS', () => {
  it('should have colors for all warning levels', () => {
    const levels: CableWarningLevel[] = ['safe', 'caution', 'warning', 'critical'];
    levels.forEach((level) => {
      expect(WARNING_LEVEL_COLORS[level]).toBeDefined();
      expect(WARNING_LEVEL_COLORS[level]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

describe('WARNING_LEVEL_PRIORITY', () => {
  it('should have increasing priority for more severe levels', () => {
    expect(WARNING_LEVEL_PRIORITY.safe).toBeLessThan(WARNING_LEVEL_PRIORITY.caution);
    expect(WARNING_LEVEL_PRIORITY.caution).toBeLessThan(WARNING_LEVEL_PRIORITY.warning);
    expect(WARNING_LEVEL_PRIORITY.warning).toBeLessThan(WARNING_LEVEL_PRIORITY.critical);
  });
});

describe('CABLE_PRESETS', () => {
  it('should have welding preset with correct properties', () => {
    expect(CABLE_PRESETS.welding).toBeDefined();
    expect(CABLE_PRESETS.welding.type).toBe('welding');
    expect(CABLE_PRESETS.welding.diameter).toBeGreaterThan(0);
    expect(CABLE_PRESETS.welding.minBendRadius).toBeGreaterThan(0);
  });

  it('should have all expected presets', () => {
    const expectedPresets = [
      'welding',
      'wireFeeder',
      'gas',
      'signal',
      'fiber',
      'power',
      'coolant',
      'composite',
    ];
    expectedPresets.forEach((preset) => {
      expect(CABLE_PRESETS[preset]).toBeDefined();
    });
  });
});

// ============================================================
// getWarningLevelFromTwist Tests
// ============================================================

describe('getWarningLevelFromTwist', () => {
  const constraints = DEFAULT_TWIST_CONSTRAINTS;

  it('should return safe for zero twist', () => {
    const level = getWarningLevelFromTwist(0, constraints);
    expect(level).toBe('safe');
  });

  it('should return safe for small twist', () => {
    const level = getWarningLevelFromTwist(Math.PI * 0.5, constraints);
    expect(level).toBe('safe');
  });

  it('should return caution at warning threshold', () => {
    const level = getWarningLevelFromTwist(constraints.warningThreshold, constraints);
    expect(level).toBe('caution');
  });

  it('should return warning at critical threshold', () => {
    const level = getWarningLevelFromTwist(constraints.criticalThreshold, constraints);
    expect(level).toBe('warning');
  });

  it('should return critical near max twist', () => {
    const level = getWarningLevelFromTwist(constraints.maxTwist * 0.96, constraints);
    expect(level).toBe('critical');
  });

  it('should handle negative twist values', () => {
    const level = getWarningLevelFromTwist(-constraints.warningThreshold, constraints);
    expect(level).toBe('caution');
  });
});

// ============================================================
// isMoreSevere Tests
// ============================================================

describe('isMoreSevere', () => {
  it('should return true when first level is more severe', () => {
    expect(isMoreSevere('critical', 'safe')).toBe(true);
    expect(isMoreSevere('warning', 'caution')).toBe(true);
    expect(isMoreSevere('caution', 'safe')).toBe(true);
  });

  it('should return false when first level is less severe', () => {
    expect(isMoreSevere('safe', 'critical')).toBe(false);
    expect(isMoreSevere('caution', 'warning')).toBe(false);
  });

  it('should return false for equal levels', () => {
    expect(isMoreSevere('safe', 'safe')).toBe(false);
    expect(isMoreSevere('critical', 'critical')).toBe(false);
  });
});

// ============================================================
// getMostSevereLevel Tests
// ============================================================

describe('getMostSevereLevel', () => {
  it('should return safe for empty array', () => {
    const level = getMostSevereLevel([]);
    expect(level).toBe('safe');
  });

  it('should return the most severe level', () => {
    const levels: CableWarningLevel[] = ['safe', 'warning', 'caution'];
    const level = getMostSevereLevel(levels);
    expect(level).toBe('warning');
  });

  it('should handle single element', () => {
    expect(getMostSevereLevel(['critical'])).toBe('critical');
    expect(getMostSevereLevel(['safe'])).toBe('safe');
  });

  it('should handle all same levels', () => {
    const levels: CableWarningLevel[] = ['caution', 'caution', 'caution'];
    expect(getMostSevereLevel(levels)).toBe('caution');
  });
});

// ============================================================
// createDefaultCableConfig Tests
// ============================================================

describe('createDefaultCableConfig', () => {
  it('should create config with specified id', () => {
    const config = createDefaultCableConfig('test-cable');
    expect(config.id).toBe('test-cable');
  });

  it('should use default preset when not specified', () => {
    const config = createDefaultCableConfig('test');
    expect(config.properties.type).toBe('composite');
  });

  it('should use specified preset', () => {
    const config = createDefaultCableConfig('test', 'welding');
    expect(config.properties.type).toBe('welding');
  });

  it('should set label to id', () => {
    const config = createDefaultCableConfig('my-cable');
    expect(config.properties.label).toBe('my-cable');
  });

  it('should include default twist constraints', () => {
    const config = createDefaultCableConfig('test');
    expect(config.twistConstraints).toEqual(DEFAULT_TWIST_CONSTRAINTS);
  });
});
