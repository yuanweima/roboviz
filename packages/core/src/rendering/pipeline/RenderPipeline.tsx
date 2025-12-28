/**
 * RoboViz Render Pipeline
 *
 * Advanced post-processing pipeline for industrial robotics visualization.
 * Provides SSAO, Bloom, Outline, and other effects.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  SSAO,
  Outline,
  Vignette,
  DepthOfField,
  SMAA,
  ToneMapping,
} from '@react-three/postprocessing';
import {
  BlendFunction,
  KernelSize,
  ToneMappingMode as PMToneMappingMode,
} from 'postprocessing';
import * as THREE from 'three';
import type {
  RenderConfig,
  PostProcessingConfig,
  RenderState,
  QualityPreset,
} from '../types';
import { DEFAULT_RENDER_CONFIG, QUALITY_PRESETS } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface RenderPipelineProps {
  /** Render configuration */
  config?: Partial<RenderConfig>;
  /** Objects to apply outline effect to */
  outlineObjects?: THREE.Object3D[];
  /** Callback for render state updates */
  onRenderStateChange?: (state: RenderState) => void;
  /** Children to render */
  children?: React.ReactNode;
}

export interface RenderPipelineContextValue {
  config: RenderConfig;
  setConfig: (config: Partial<RenderConfig>) => void;
  addOutlineObject: (object: THREE.Object3D) => void;
  removeOutlineObject: (object: THREE.Object3D) => void;
  getRenderState: () => RenderState;
}

// ============================================================================
// Context
// ============================================================================

export const RenderPipelineContext = React.createContext<RenderPipelineContextValue | null>(null);

export function useRenderPipeline(): RenderPipelineContextValue {
  const context = React.useContext(RenderPipelineContext);
  if (!context) {
    throw new Error('useRenderPipeline must be used within a RenderPipeline');
  }
  return context;
}

// ============================================================================
// Helper Functions
// ============================================================================

function mergeConfig(
  base: RenderConfig,
  override: Partial<RenderConfig>
): RenderConfig {
  // If a quality preset is specified (not 'custom'), apply it first
  if (override.qualityPreset && override.qualityPreset !== 'custom') {
    const preset = QUALITY_PRESETS[override.qualityPreset];
    return {
      ...base,
      ...preset,
      ...override,
      postProcessing: {
        ...base.postProcessing,
        ...(preset.postProcessing || {}),
        ...(override.postProcessing || {}),
        ssao: {
          ...base.postProcessing.ssao,
          ...(preset.postProcessing?.ssao || {}),
          ...(override.postProcessing?.ssao || {}),
        },
        bloom: {
          ...base.postProcessing.bloom,
          ...(preset.postProcessing?.bloom || {}),
          ...(override.postProcessing?.bloom || {}),
        },
        outline: {
          ...base.postProcessing.outline,
          ...(preset.postProcessing?.outline || {}),
          ...(override.postProcessing?.outline || {}),
        },
        vignette: {
          ...base.postProcessing.vignette,
          ...(preset.postProcessing?.vignette || {}),
          ...(override.postProcessing?.vignette || {}),
        },
        depthOfField: {
          ...base.postProcessing.depthOfField,
          ...(preset.postProcessing?.depthOfField || {}),
          ...(override.postProcessing?.depthOfField || {}),
        },
      },
      shadows: {
        ...base.shadows,
        ...(preset.shadows || {}),
        ...(override.shadows || {}),
      },
      optimization: {
        ...base.optimization,
        ...(preset.optimization || {}),
        ...(override.optimization || {}),
        lod: {
          ...base.optimization.lod,
          ...(preset.optimization?.lod || {}),
          ...(override.optimization?.lod || {}),
        },
      },
      experimental: {
        ...base.experimental,
        ...(override.experimental || {}),
      },
      debug: {
        ...base.debug,
        ...(override.debug || {}),
      },
    };
  }

  // Custom configuration - deep merge
  return {
    ...base,
    ...override,
    postProcessing: {
      ...base.postProcessing,
      ...(override.postProcessing || {}),
      ssao: {
        ...base.postProcessing.ssao,
        ...(override.postProcessing?.ssao || {}),
      },
      bloom: {
        ...base.postProcessing.bloom,
        ...(override.postProcessing?.bloom || {}),
      },
      outline: {
        ...base.postProcessing.outline,
        ...(override.postProcessing?.outline || {}),
      },
      vignette: {
        ...base.postProcessing.vignette,
        ...(override.postProcessing?.vignette || {}),
      },
      depthOfField: {
        ...base.postProcessing.depthOfField,
        ...(override.postProcessing?.depthOfField || {}),
      },
    },
    shadows: {
      ...base.shadows,
      ...(override.shadows || {}),
    },
    optimization: {
      ...base.optimization,
      ...(override.optimization || {}),
      lod: {
        ...base.optimization.lod,
        ...(override.optimization?.lod || {}),
      },
    },
    experimental: {
      ...base.experimental,
      ...(override.experimental || {}),
    },
    debug: {
      ...base.debug,
      ...(override.debug || {}),
    },
  };
}

function getToneMappingMode(mode: string): PMToneMappingMode {
  switch (mode) {
    case 'none':
      return PMToneMappingMode.LINEAR;
    case 'linear':
      return PMToneMappingMode.LINEAR;
    case 'reinhard':
      return PMToneMappingMode.REINHARD;
    case 'aces':
      return PMToneMappingMode.ACES_FILMIC;
    case 'agx':
      return PMToneMappingMode.AGX;
    case 'neutral':
      return PMToneMappingMode.NEUTRAL;
    default:
      return PMToneMappingMode.ACES_FILMIC;
  }
}

function getKernelSize(size: number): KernelSize {
  if (size <= 2) return KernelSize.VERY_SMALL;
  if (size <= 3) return KernelSize.SMALL;
  if (size <= 4) return KernelSize.MEDIUM;
  if (size <= 5) return KernelSize.LARGE;
  if (size <= 6) return KernelSize.VERY_LARGE;
  return KernelSize.HUGE;
}

// ============================================================================
// Performance Monitor Hook
// ============================================================================

function usePerformanceMonitor(
  onStateChange?: (state: RenderState) => void
): React.MutableRefObject<RenderState> {
  const { gl } = useThree();
  const stateRef = useRef<RenderState>({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
    effectiveQuality: 'medium',
    adaptiveAdjusting: false,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Track frame times (rolling window of 60 frames)
    frameTimesRef.current.push(delta);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Calculate average FPS
    const avgFrameTime =
      frameTimesRef.current.reduce((a, b) => a + b, 0) /
      frameTimesRef.current.length;
    const fps = 1000 / avgFrameTime;

    // Get renderer info
    const info = gl.info;

    stateRef.current = {
      fps: Math.round(fps),
      frameTime: Math.round(avgFrameTime * 100) / 100,
      drawCalls: info.render?.calls || 0,
      triangles: info.render?.triangles || 0,
      geometries: info.memory?.geometries || 0,
      textures: info.memory?.textures || 0,
      programs: info.programs?.length || 0,
      effectiveQuality: stateRef.current.effectiveQuality,
      adaptiveAdjusting: stateRef.current.adaptiveAdjusting,
    };

    // Notify callback (throttled to every 500ms)
    if (onStateChange && frameTimesRef.current.length % 30 === 0) {
      onStateChange(stateRef.current);
    }
  });

  return stateRef;
}

// ============================================================================
// Post-Processing Effects Component
// ============================================================================

interface PostProcessingEffectsProps {
  config: PostProcessingConfig;
  outlineObjects: THREE.Object3D[];
}

function PostProcessingEffects({
  config,
  outlineObjects,
}: PostProcessingEffectsProps): React.JSX.Element | null {
  if (!config.enabled) {
    return null;
  }

  // Build effects array - only include enabled effects
  const effects: React.ReactNode[] = [];

  // SSAO - Ambient Occlusion
  if (config.ssao.enabled) {
    effects.push(
      <SSAO
        key="ssao"
        blendFunction={BlendFunction.MULTIPLY}
        samples={config.ssao.samples}
        radius={config.ssao.radius}
        intensity={config.ssao.intensity}
        luminanceInfluence={0.9}
        bias={0.025}
      />
    );
  }

  // Bloom - Glow for emissive materials
  if (config.bloom.enabled) {
    effects.push(
      <Bloom
        key="bloom"
        blendFunction={BlendFunction.ADD}
        intensity={config.bloom.intensity}
        luminanceThreshold={config.bloom.threshold}
        luminanceSmoothing={config.bloom.smoothing}
        kernelSize={getKernelSize(config.bloom.kernelSize)}
      />
    );
  }

  // Outline - Selection highlighting
  if (config.outline.enabled && outlineObjects.length > 0) {
    effects.push(
      <Outline
        key="outline"
        selection={outlineObjects}
        blendFunction={BlendFunction.SCREEN}
        edgeStrength={config.outline.thickness}
        pulseSpeed={config.outline.pulse ? config.outline.pulseSpeed : 0}
        visibleEdgeColor={new THREE.Color(config.outline.color).getHex()}
        hiddenEdgeColor={new THREE.Color(config.outline.hiddenEdgeColor).getHex()}
        blur
        xRay
      />
    );
  }

  // Vignette - Darkened edges
  if (config.vignette.enabled) {
    effects.push(
      <Vignette
        key="vignette"
        offset={config.vignette.offset}
        darkness={config.vignette.darkness}
        blendFunction={BlendFunction.NORMAL}
      />
    );
  }

  // Depth of Field
  if (config.depthOfField.enabled) {
    effects.push(
      <DepthOfField
        key="dof"
        focusDistance={config.depthOfField.focusDistance}
        focalLength={config.depthOfField.focalLength}
        bokehScale={config.depthOfField.bokehScale}
      />
    );
  }

  // Anti-aliasing
  if (config.antialiasing === 'smaa') {
    effects.push(<SMAA key="smaa" />);
  }

  // If no effects are enabled, return null
  if (effects.length === 0) {
    return null;
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={config.ssao.enabled}>
      {effects as React.ReactElement[]}
    </EffectComposer>
  );
}

// ============================================================================
// Main Render Pipeline Component
// ============================================================================

/**
 * RenderPipeline - Advanced post-processing pipeline for RoboViz
 *
 * Wraps the scene with post-processing effects including SSAO, Bloom,
 * Outline highlighting, and more. Provides a context for managing
 * render configuration and outline selection.
 *
 * @example
 * ```tsx
 * <RoboVizCore>
 *   <RenderPipeline
 *     config={{
 *       qualityPreset: 'high',
 *       postProcessing: {
 *         bloom: { enabled: true, intensity: 0.5 },
 *       },
 *     }}
 *   >
 *     <Robot urdfPath="/robot.urdf" />
 *   </RenderPipeline>
 * </RoboVizCore>
 * ```
 */
export function RenderPipeline({
  config: configProp,
  outlineObjects: outlineObjectsProp = [],
  onRenderStateChange,
  children,
}: RenderPipelineProps): React.JSX.Element {
  const { gl } = useThree();
  const [config, setConfigState] = React.useState<RenderConfig>(() =>
    mergeConfig(DEFAULT_RENDER_CONFIG, configProp || {})
  );
  const [outlineObjects, setOutlineObjects] = React.useState<THREE.Object3D[]>(
    outlineObjectsProp
  );

  // Performance monitoring
  const renderStateRef = usePerformanceMonitor(onRenderStateChange);

  // Update config when prop changes
  useEffect(() => {
    if (configProp) {
      setConfigState((prev) => mergeConfig(prev, configProp));
    }
  }, [configProp]);

  // Sync outline objects from props
  useEffect(() => {
    setOutlineObjects(outlineObjectsProp);
  }, [outlineObjectsProp]);

  // Apply renderer settings
  useEffect(() => {
    // Tone mapping
    switch (config.toneMapping) {
      case 'none':
        gl.toneMapping = THREE.NoToneMapping;
        break;
      case 'linear':
        gl.toneMapping = THREE.LinearToneMapping;
        break;
      case 'reinhard':
        gl.toneMapping = THREE.ReinhardToneMapping;
        break;
      case 'aces':
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        break;
      case 'agx':
        gl.toneMapping = THREE.AgXToneMapping;
        break;
      case 'neutral':
        gl.toneMapping = THREE.NeutralToneMapping;
        break;
      default:
        gl.toneMapping = THREE.ACESFilmicToneMapping;
    }
    gl.toneMappingExposure = config.toneMappingExposure;

    // Shadow map type
    if (config.shadows.enabled) {
      gl.shadowMap.enabled = true;
      switch (config.shadows.type) {
        case 'basic':
          gl.shadowMap.type = THREE.BasicShadowMap;
          break;
        case 'pcf':
          gl.shadowMap.type = THREE.PCFShadowMap;
          break;
        case 'pcfsoft':
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          break;
        case 'vsm':
          gl.shadowMap.type = THREE.VSMShadowMap;
          break;
      }
    } else {
      gl.shadowMap.enabled = false;
    }

    gl.shadowMap.needsUpdate = true;
  }, [
    gl,
    config.toneMapping,
    config.toneMappingExposure,
    config.shadows.enabled,
    config.shadows.type,
  ]);

  // Context value
  const contextValue = useMemo<RenderPipelineContextValue>(
    () => ({
      config,
      setConfig: (newConfig) => {
        setConfigState((prev) => mergeConfig(prev, newConfig));
      },
      addOutlineObject: (object) => {
        setOutlineObjects((prev) => {
          if (prev.includes(object)) return prev;
          return [...prev, object];
        });
      },
      removeOutlineObject: (object) => {
        setOutlineObjects((prev) => prev.filter((o) => o !== object));
      },
      getRenderState: () => renderStateRef.current,
    }),
    [config, renderStateRef]
  );

  return (
    <RenderPipelineContext.Provider value={contextValue}>
      {children}
      <PostProcessingEffects
        config={config.postProcessing}
        outlineObjects={outlineObjects}
      />
    </RenderPipelineContext.Provider>
  );
}

// ============================================================================
// Hooks for Effect Management
// ============================================================================

/**
 * Hook to add an object to the outline selection
 */
export function useOutlineSelection(
  object: THREE.Object3D | null,
  enabled: boolean = true
): void {
  const { addOutlineObject, removeOutlineObject } = useRenderPipeline();

  useEffect(() => {
    if (!object || !enabled) return;

    addOutlineObject(object);
    return () => {
      removeOutlineObject(object);
    };
  }, [object, enabled, addOutlineObject, removeOutlineObject]);
}

/**
 * Hook to get current render state
 */
export function useRenderState(): RenderState {
  const { getRenderState } = useRenderPipeline();
  return getRenderState();
}

export default RenderPipeline;
