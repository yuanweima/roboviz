/**
 * RoboViz Rendering System Types
 *
 * Type definitions for the advanced rendering pipeline including
 * post-processing, materials, and optimization features.
 */

import type * as THREE from 'three';

// ============================================================================
// Render Configuration
// ============================================================================

/**
 * Quality preset levels for rendering
 */
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra' | 'custom';

/**
 * Shadow mapping types
 */
export type ShadowMapType = 'basic' | 'pcf' | 'pcfsoft' | 'vsm';

/**
 * Tone mapping modes
 */
export type ToneMappingMode =
  | 'none'
  | 'linear'
  | 'reinhard'
  | 'cineon'
  | 'aces'
  | 'agx'
  | 'neutral';

/**
 * Post-processing configuration
 */
export interface PostProcessingConfig {
  /** Enable post-processing pipeline */
  enabled: boolean;

  /** Screen Space Ambient Occlusion */
  ssao: {
    enabled: boolean;
    /** AO intensity (0-1) */
    intensity: number;
    /** Sample radius in world units */
    radius: number;
    /** Number of samples (8-64) */
    samples: number;
    /** Distance falloff */
    distanceFalloff: number;
  };

  /** Bloom effect for emissive/bright areas */
  bloom: {
    enabled: boolean;
    /** Bloom intensity (0-2) */
    intensity: number;
    /** Luminance threshold for bloom */
    threshold: number;
    /** Smooth threshold transition */
    smoothing: number;
    /** Blur kernel size */
    kernelSize: number;
  };

  /** Outline effect for selection highlighting */
  outline: {
    enabled: boolean;
    /** Outline color */
    color: string;
    /** Outline thickness in pixels */
    thickness: number;
    /** Pulse animation for selected objects */
    pulse: boolean;
    /** Pulse speed */
    pulseSpeed: number;
    /** Hidden edge visibility (0-1) */
    hiddenEdgeColor: string;
  };

  /** Anti-aliasing mode */
  antialiasing: 'none' | 'fxaa' | 'smaa';

  /** Vignette effect */
  vignette: {
    enabled: boolean;
    /** Darkness of vignette edges */
    darkness: number;
    /** Offset from center */
    offset: number;
  };

  /** Depth of Field */
  depthOfField: {
    enabled: boolean;
    /** Focus distance */
    focusDistance: number;
    /** Focal length */
    focalLength: number;
    /** Bokeh scale */
    bokehScale: number;
  };
}

/**
 * Shadow configuration
 */
export interface ShadowConfig {
  enabled: boolean;
  type: ShadowMapType;
  /** Shadow map resolution */
  mapSize: number;
  /** Shadow camera near plane */
  near: number;
  /** Shadow camera far plane */
  far: number;
  /** Shadow bias to prevent acne */
  bias: number;
  /** Shadow normal bias */
  normalBias: number;
  /** Shadow blur radius (for soft shadows) */
  blurRadius: number;
}

/**
 * Performance optimization configuration
 */
export interface OptimizationConfig {
  /** Enable GPU instancing for repeated objects */
  instancing: boolean;

  /** Level of Detail system */
  lod: {
    enabled: boolean;
    /** Distance thresholds for LOD switching */
    distances: [number, number, number];
    /** Fade transition between LOD levels */
    fadeTransition: boolean;
  };

  /** View frustum culling */
  frustumCulling: boolean;

  /** Occlusion culling (experimental) */
  occlusionCulling: boolean;

  /** Maximum visible objects before culling */
  maxVisibleObjects: number;

  /** Target frame rate for adaptive quality */
  targetFPS: number;

  /** Enable adaptive quality based on performance */
  adaptiveQuality: boolean;
}

/**
 * Complete render configuration
 */
export interface RenderConfig {
  /** Quality preset (overrides individual settings if not 'custom') */
  qualityPreset: QualityPreset;

  /** Tone mapping mode */
  toneMapping: ToneMappingMode;

  /** Tone mapping exposure */
  toneMappingExposure: number;

  /** Post-processing settings */
  postProcessing: PostProcessingConfig;

  /** Shadow settings */
  shadows: ShadowConfig;

  /** Optimization settings */
  optimization: OptimizationConfig;

  /** Enable experimental WebGPU backend */
  experimental: {
    webgpu: boolean;
    /** Ray tracing for reflections (WebGPU only) */
    raytracing: boolean;
  };

  /** Debug visualization options */
  debug: {
    /** Show wireframe overlay */
    wireframe: boolean;
    /** Show bounding boxes */
    boundingBoxes: boolean;
    /** Show normals */
    normals: boolean;
    /** Show light helpers */
    lightHelpers: boolean;
    /** Show shadow camera frustums */
    shadowCameras: boolean;
  };
}

// ============================================================================
// Quality Presets
// ============================================================================

/**
 * Predefined quality presets
 */
export const QUALITY_PRESETS: Record<Exclude<QualityPreset, 'custom'>, Partial<RenderConfig>> = {
  low: {
    toneMapping: 'aces',
    toneMappingExposure: 1,
    postProcessing: {
      enabled: false,
      ssao: { enabled: false, intensity: 0.5, radius: 0.5, samples: 8, distanceFalloff: 1 },
      bloom: { enabled: false, intensity: 0.5, threshold: 0.9, smoothing: 0.3, kernelSize: 3 },
      outline: { enabled: true, color: '#00ff88', thickness: 1, pulse: false, pulseSpeed: 1, hiddenEdgeColor: '#004422' },
      antialiasing: 'none',
      vignette: { enabled: false, darkness: 0.5, offset: 0.5 },
      depthOfField: { enabled: false, focusDistance: 10, focalLength: 50, bokehScale: 2 },
    },
    shadows: {
      enabled: true,
      type: 'basic',
      mapSize: 1024,
      near: 0.1,
      far: 50,
      bias: -0.0001,
      normalBias: 0.02,
      blurRadius: 0,
    },
    optimization: {
      instancing: true,
      lod: { enabled: true, distances: [5, 15, 30], fadeTransition: false },
      frustumCulling: true,
      occlusionCulling: false,
      maxVisibleObjects: 100,
      targetFPS: 30,
      adaptiveQuality: true,
    },
  },

  medium: {
    toneMapping: 'aces',
    toneMappingExposure: 1,
    postProcessing: {
      enabled: true,
      ssao: { enabled: false, intensity: 0.5, radius: 0.5, samples: 16, distanceFalloff: 1 },
      bloom: { enabled: true, intensity: 0.3, threshold: 0.85, smoothing: 0.3, kernelSize: 4 },
      outline: { enabled: true, color: '#00ff88', thickness: 2, pulse: true, pulseSpeed: 2, hiddenEdgeColor: '#004422' },
      antialiasing: 'fxaa',
      vignette: { enabled: false, darkness: 0.5, offset: 0.5 },
      depthOfField: { enabled: false, focusDistance: 10, focalLength: 50, bokehScale: 2 },
    },
    shadows: {
      enabled: true,
      type: 'pcf',
      mapSize: 2048,
      near: 0.1,
      far: 50,
      bias: -0.0001,
      normalBias: 0.02,
      blurRadius: 1,
    },
    optimization: {
      instancing: true,
      lod: { enabled: true, distances: [10, 25, 50], fadeTransition: true },
      frustumCulling: true,
      occlusionCulling: false,
      maxVisibleObjects: 200,
      targetFPS: 60,
      adaptiveQuality: true,
    },
  },

  high: {
    toneMapping: 'aces',
    toneMappingExposure: 1,
    postProcessing: {
      enabled: true,
      ssao: { enabled: true, intensity: 0.5, radius: 0.5, samples: 32, distanceFalloff: 1 },
      bloom: { enabled: true, intensity: 0.4, threshold: 0.8, smoothing: 0.3, kernelSize: 5 },
      outline: { enabled: true, color: '#00ff88', thickness: 2, pulse: true, pulseSpeed: 2, hiddenEdgeColor: '#004422' },
      antialiasing: 'smaa',
      vignette: { enabled: true, darkness: 0.3, offset: 0.5 },
      depthOfField: { enabled: false, focusDistance: 10, focalLength: 50, bokehScale: 2 },
    },
    shadows: {
      enabled: true,
      type: 'pcfsoft',
      mapSize: 4096,
      near: 0.1,
      far: 50,
      bias: -0.0001,
      normalBias: 0.02,
      blurRadius: 2,
    },
    optimization: {
      instancing: true,
      lod: { enabled: true, distances: [15, 35, 70], fadeTransition: true },
      frustumCulling: true,
      occlusionCulling: true,
      maxVisibleObjects: 500,
      targetFPS: 60,
      adaptiveQuality: false,
    },
  },

  ultra: {
    toneMapping: 'aces',
    toneMappingExposure: 1,
    postProcessing: {
      enabled: true,
      ssao: { enabled: true, intensity: 0.6, radius: 0.8, samples: 64, distanceFalloff: 1.5 },
      bloom: { enabled: true, intensity: 0.5, threshold: 0.75, smoothing: 0.4, kernelSize: 6 },
      outline: { enabled: true, color: '#00ff88', thickness: 3, pulse: true, pulseSpeed: 2, hiddenEdgeColor: '#004422' },
      antialiasing: 'smaa',
      vignette: { enabled: true, darkness: 0.4, offset: 0.5 },
      depthOfField: { enabled: true, focusDistance: 10, focalLength: 50, bokehScale: 3 },
    },
    shadows: {
      enabled: true,
      type: 'pcfsoft',
      mapSize: 4096,
      near: 0.1,
      far: 50,
      bias: -0.00005,
      normalBias: 0.01,
      blurRadius: 3,
    },
    optimization: {
      instancing: true,
      lod: { enabled: true, distances: [20, 50, 100], fadeTransition: true },
      frustumCulling: true,
      occlusionCulling: true,
      maxVisibleObjects: 1000,
      targetFPS: 60,
      adaptiveQuality: false,
    },
  },
};

/**
 * Default render configuration (medium quality)
 */
export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  qualityPreset: 'medium',
  ...QUALITY_PRESETS.medium,
  experimental: {
    webgpu: false,
    raytracing: false,
  },
  debug: {
    wireframe: false,
    boundingBoxes: false,
    normals: false,
    lightHelpers: false,
    shadowCameras: false,
  },
} as RenderConfig;

// ============================================================================
// Material Types
// ============================================================================

/**
 * Industrial material presets
 */
export type IndustrialMaterialType =
  | 'steel'
  | 'aluminum'
  | 'carbon-fiber'
  | 'rubber'
  | 'plastic'
  | 'glass'
  | 'copper'
  | 'brass'
  | 'chrome'
  | 'painted-metal'
  | 'anodized'
  | 'galvanized';

/**
 * Custom shader material definition
 */
export interface ShaderMaterialDefinition {
  id: string;
  name: string;
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, THREE.IUniform>;
  defines?: Record<string, string | number | boolean>;
  transparent?: boolean;
  depthWrite?: boolean;
  depthTest?: boolean;
  side?: THREE.Side;
}

/**
 * Material with industrial properties
 */
export interface IndustrialMaterialConfig {
  type: IndustrialMaterialType;
  color?: string;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

// ============================================================================
// Effect Types
// ============================================================================

/**
 * Selectable object for outline effect
 */
export interface SelectableObject {
  object: THREE.Object3D;
  color?: string;
  thickness?: number;
}

/**
 * Glow effect configuration for emissive objects
 */
export interface GlowConfig {
  color: string;
  intensity: number;
  size: number;
  opacity: number;
}

/**
 * Heat map visualization configuration
 */
export interface HeatmapConfig {
  minValue: number;
  maxValue: number;
  colorMap: 'jet' | 'viridis' | 'plasma' | 'turbo' | 'grayscale';
  opacity: number;
}

// ============================================================================
// Optimization Types
// ============================================================================

/**
 * LOD level definition
 */
export interface LODLevel {
  distance: number;
  object: THREE.Object3D;
}

/**
 * Instanced object configuration
 */
export interface InstanceConfig {
  /** Base geometry/mesh to instance */
  source: THREE.Mesh | THREE.Group;
  /** Maximum number of instances */
  maxInstances: number;
  /** Whether instances can be dynamically added/removed */
  dynamic: boolean;
}

/**
 * Instance transform data
 */
export interface InstanceTransform {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  scale: [number, number, number];
  color?: string;
  visible?: boolean;
}

// ============================================================================
// Render State
// ============================================================================

/**
 * Current render state for monitoring
 */
export interface RenderState {
  /** Current FPS */
  fps: number;
  /** Frame time in ms */
  frameTime: number;
  /** Number of draw calls */
  drawCalls: number;
  /** Number of triangles rendered */
  triangles: number;
  /** Number of active geometries */
  geometries: number;
  /** Number of active textures */
  textures: number;
  /** Number of active shader programs */
  programs: number;
  /** GPU memory usage (if available) */
  gpuMemory?: number;
  /** Current quality preset in effect */
  effectiveQuality: QualityPreset;
  /** Whether adaptive quality is adjusting settings */
  adaptiveAdjusting: boolean;
}
