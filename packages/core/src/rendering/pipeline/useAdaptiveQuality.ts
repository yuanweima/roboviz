/**
 * RoboViz Adaptive Quality Control
 *
 * Automatically adjusts rendering quality based on performance metrics.
 * Helps maintain smooth frame rates on varying hardware capabilities.
 */

import { useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RenderConfig, QualityPreset, RenderState } from '../types';
import { QUALITY_PRESETS } from '../types';

// ============================================================================
// Types
// ============================================================================

/** Quality presets that can be used for adaptive quality (excludes 'custom') */
export type AdaptableQualityPreset = Exclude<QualityPreset, 'custom'>;

export interface AdaptiveQualityConfig {
  /** Enable adaptive quality adjustment */
  enabled: boolean;
  /** Target frame rate in FPS (default: 60) */
  targetFPS: number;
  /** Minimum acceptable FPS before quality reduction (default: 45) */
  minFPS: number;
  /** FPS threshold for quality improvement (default: 55) */
  upgradeFPS: number;
  /** Time in ms to wait before quality changes (default: 2000) */
  stabilityPeriod: number;
  /** Minimum time between quality adjustments in ms (default: 5000) */
  adjustmentCooldown: number;
  /** Quality levels to cycle through (default: ['ultra', 'high', 'medium', 'low']) */
  qualityLevels: AdaptableQualityPreset[];
  /** Callback when quality is adjusted */
  onQualityChange?: (newPreset: AdaptableQualityPreset, reason: string) => void;
}

export interface AdaptiveQualityState {
  /** Current quality preset */
  currentPreset: AdaptableQualityPreset;
  /** Average FPS over measurement period */
  averageFPS: number;
  /** Whether adaptation is currently active */
  isAdapting: boolean;
  /** Time until next possible adjustment (ms) */
  cooldownRemaining: number;
  /** Number of quality adjustments made */
  adjustmentCount: number;
}

export interface UseAdaptiveQualityOptions {
  /** Adaptive quality configuration */
  config: Partial<AdaptiveQualityConfig>;
  /** Current render config */
  renderConfig: RenderConfig;
  /** Function to update render config */
  setRenderConfig: (config: Partial<RenderConfig>) => void;
  /** Function to get current render state */
  getRenderState: () => RenderState;
}

export interface UseAdaptiveQualityResult {
  /** Current adaptive quality state */
  state: AdaptiveQualityState;
  /** Force a specific quality level */
  forceQuality: (preset: AdaptableQualityPreset) => void;
  /** Reset to automatic adaptation */
  resetToAuto: () => void;
  /** Pause adaptation */
  pause: () => void;
  /** Resume adaptation */
  resume: () => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_ADAPTIVE_CONFIG: AdaptiveQualityConfig = {
  enabled: true,
  targetFPS: 60,
  minFPS: 45,
  upgradeFPS: 55,
  stabilityPeriod: 2000,
  adjustmentCooldown: 5000,
  qualityLevels: ['ultra', 'high', 'medium', 'low'],
  onQualityChange: undefined,
};

// ============================================================================
// Helper Functions
// ============================================================================

function getPresetIndex(
  preset: AdaptableQualityPreset,
  levels: AdaptableQualityPreset[]
): number {
  return levels.indexOf(preset);
}

function canDowngrade(
  currentPreset: AdaptableQualityPreset,
  levels: AdaptableQualityPreset[]
): boolean {
  const index = getPresetIndex(currentPreset, levels);
  return index < levels.length - 1;
}

function canUpgrade(
  currentPreset: AdaptableQualityPreset,
  levels: AdaptableQualityPreset[]
): boolean {
  const index = getPresetIndex(currentPreset, levels);
  return index > 0;
}

function getDowngradedPreset(
  currentPreset: AdaptableQualityPreset,
  levels: AdaptableQualityPreset[]
): AdaptableQualityPreset {
  const index = getPresetIndex(currentPreset, levels);
  if (index < levels.length - 1) {
    return levels[index + 1];
  }
  return currentPreset;
}

function getUpgradedPreset(
  currentPreset: AdaptableQualityPreset,
  levels: AdaptableQualityPreset[]
): AdaptableQualityPreset {
  const index = getPresetIndex(currentPreset, levels);
  if (index > 0) {
    return levels[index - 1];
  }
  return currentPreset;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * useAdaptiveQuality - Automatically adjusts rendering quality based on performance
 *
 * @example
 * ```tsx
 * function MyScene() {
 *   const { state } = useAdaptiveQuality({
 *     config: { enabled: true, targetFPS: 60 },
 *     renderConfig: config,
 *     setRenderConfig: setConfig,
 *     getRenderState: () => renderStateRef.current,
 *   });
 *
 *   return (
 *     <group>
 *       <PerformanceIndicator fps={state.averageFPS} quality={state.currentPreset} />
 *     </group>
 *   );
 * }
 * ```
 */
export function useAdaptiveQuality({
  config: configProp,
  renderConfig,
  setRenderConfig,
  getRenderState,
}: UseAdaptiveQualityOptions): UseAdaptiveQualityResult {
  // Merge config with defaults
  const config: AdaptiveQualityConfig = {
    ...DEFAULT_ADAPTIVE_CONFIG,
    ...configProp,
  };

  // State refs
  // Convert 'custom' to 'high' since adaptive quality only works with preset levels
  const initialPreset: AdaptableQualityPreset =
    renderConfig.qualityPreset === 'custom' ? 'high' : (renderConfig.qualityPreset || 'high');

  const stateRef = useRef<AdaptiveQualityState>({
    currentPreset: initialPreset,
    averageFPS: 60,
    isAdapting: config.enabled,
    cooldownRemaining: 0,
    adjustmentCount: 0,
  });

  const fpsHistoryRef = useRef<number[]>([]);
  const lastAdjustmentTimeRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const forcedPresetRef = useRef<AdaptableQualityPreset | null>(null);
  const stableStartTimeRef = useRef<number>(Date.now());
  const onQualityChangeRef = useRef(config.onQualityChange);

  // Update callback ref
  useEffect(() => {
    onQualityChangeRef.current = config.onQualityChange;
  }, [config.onQualityChange]);

  // Sync current preset with render config
  useEffect(() => {
    if (renderConfig.qualityPreset && renderConfig.qualityPreset !== 'custom') {
      stateRef.current.currentPreset = renderConfig.qualityPreset;
    }
  }, [renderConfig.qualityPreset]);

  // Main adaptation loop
  useFrame(() => {
    if (!config.enabled || isPausedRef.current || forcedPresetRef.current) {
      return;
    }

    const now = Date.now();
    const renderState = getRenderState();

    // Add current FPS to history
    fpsHistoryRef.current.push(renderState.fps);

    // Keep only last 60 samples (about 1 second at 60fps)
    if (fpsHistoryRef.current.length > 60) {
      fpsHistoryRef.current.shift();
    }

    // Calculate average FPS
    const avgFPS =
      fpsHistoryRef.current.reduce((a, b) => a + b, 0) /
      fpsHistoryRef.current.length;
    stateRef.current.averageFPS = avgFPS;

    // Check cooldown
    const timeSinceLastAdjustment = now - lastAdjustmentTimeRef.current;
    stateRef.current.cooldownRemaining = Math.max(
      0,
      config.adjustmentCooldown - timeSinceLastAdjustment
    );

    if (timeSinceLastAdjustment < config.adjustmentCooldown) {
      return;
    }

    // Check if we've been stable long enough to make a decision
    const stableTime = now - stableStartTimeRef.current;
    if (stableTime < config.stabilityPeriod) {
      return;
    }

    const currentPreset = stateRef.current.currentPreset;

    // Downgrade quality if FPS is too low
    if (avgFPS < config.minFPS && canDowngrade(currentPreset, config.qualityLevels)) {
      const newPreset = getDowngradedPreset(currentPreset, config.qualityLevels);

      stateRef.current.currentPreset = newPreset;
      stateRef.current.adjustmentCount++;
      lastAdjustmentTimeRef.current = now;
      stableStartTimeRef.current = now;
      fpsHistoryRef.current = [];

      // Apply new quality
      const presetConfig = QUALITY_PRESETS[newPreset];
      setRenderConfig({
        qualityPreset: newPreset,
        ...presetConfig,
      });

      // Notify callback
      if (onQualityChangeRef.current) {
        onQualityChangeRef.current(
          newPreset,
          `FPS dropped to ${avgFPS.toFixed(1)}, downgrading quality`
        );
      }

      return;
    }

    // Upgrade quality if FPS is consistently high
    if (avgFPS > config.upgradeFPS && canUpgrade(currentPreset, config.qualityLevels)) {
      const newPreset = getUpgradedPreset(currentPreset, config.qualityLevels);

      stateRef.current.currentPreset = newPreset;
      stateRef.current.adjustmentCount++;
      lastAdjustmentTimeRef.current = now;
      stableStartTimeRef.current = now;
      fpsHistoryRef.current = [];

      // Apply new quality
      const presetConfig = QUALITY_PRESETS[newPreset];
      setRenderConfig({
        qualityPreset: newPreset,
        ...presetConfig,
      });

      // Notify callback
      if (onQualityChangeRef.current) {
        onQualityChangeRef.current(
          newPreset,
          `FPS stable at ${avgFPS.toFixed(1)}, upgrading quality`
        );
      }
    }
  });

  // Force a specific quality level
  const forceQuality = useCallback(
    (preset: AdaptableQualityPreset) => {
      forcedPresetRef.current = preset;
      stateRef.current.currentPreset = preset;
      stateRef.current.isAdapting = false;

      const presetConfig = QUALITY_PRESETS[preset];
      setRenderConfig({
        qualityPreset: preset,
        ...presetConfig,
      });
    },
    [setRenderConfig]
  );

  // Reset to automatic adaptation
  const resetToAuto = useCallback(() => {
    forcedPresetRef.current = null;
    stateRef.current.isAdapting = config.enabled;
    stableStartTimeRef.current = Date.now();
    fpsHistoryRef.current = [];
  }, [config.enabled]);

  // Pause adaptation
  const pause = useCallback(() => {
    isPausedRef.current = true;
    stateRef.current.isAdapting = false;
  }, []);

  // Resume adaptation
  const resume = useCallback(() => {
    isPausedRef.current = false;
    stateRef.current.isAdapting = config.enabled && !forcedPresetRef.current;
    stableStartTimeRef.current = Date.now();
    fpsHistoryRef.current = [];
  }, [config.enabled]);

  return {
    state: stateRef.current,
    forceQuality,
    resetToAuto,
    pause,
    resume,
  };
}
