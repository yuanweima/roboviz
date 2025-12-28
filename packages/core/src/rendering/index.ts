/**
 * RoboViz Rendering System
 *
 * Advanced rendering capabilities for industrial robotics visualization.
 *
 * Features:
 * - Post-processing pipeline (SSAO, Bloom, Outline, Vignette, DOF)
 * - Custom shader materials (Distance Field, Flow Line, X-Ray, Hologram, Heatmap)
 * - Industrial material presets (Steel, Aluminum, Chrome, etc.)
 * - GPU Instancing for multi-robot scenarios
 * - Level of Detail (LOD) management
 * - Quality presets (Low, Medium, High, Ultra)
 * - Adaptive quality control for performance optimization
 * - Debug visualization (wireframe, bounding boxes, normals, light helpers)
 * - Environment system (HDR maps, skybox presets, fog effects)
 *
 * @example
 * ```tsx
 * import {
 *   RenderPipeline,
 *   MaterialLibrary,
 *   InstanceManager,
 *   LODManager,
 *   EnvironmentSystem,
 * } from '@aspect/roboviz-core/rendering';
 *
 * // Use render pipeline with post-processing and environment
 * <RoboVizCore>
 *   <EnvironmentSystem config={{ environment: { preset: 'warehouse' } }}>
 *     <RenderPipeline config={{ qualityPreset: 'high' }}>
 *       <Robot urdfPath="/robot.urdf" lodEnabled />
 *     </RenderPipeline>
 *   </EnvironmentSystem>
 * </RoboVizCore>
 * ```
 */

// Types
export * from './types';

// Pipeline
export {
  RenderPipeline,
  RenderPipelineContext,
  useRenderPipeline,
  useOutlineSelection,
  useRenderState,
  DebugOverlay,
  DebugContext,
  useDebug,
} from './pipeline';

export type {
  RenderPipelineProps,
  RenderPipelineContextValue,
  DebugOverlayProps,
  AdaptiveQualityConfig,
  AdaptiveQualityState,
  UseAdaptiveQualityOptions,
  UseAdaptiveQualityResult,
} from './pipeline';

export { useAdaptiveQuality } from './pipeline';

// Materials
export {
  MaterialLibrary,
  getMaterialLibrary,
  INDUSTRIAL_MATERIAL_PRESETS,
} from './materials';

// Optimization
export {
  InstanceManager,
  getInstanceManager,
  LODManager,
  getLODManager,
  generateSimplifiedGeometry,
  generateBoundingBoxMesh,
  useRobotLOD,
} from './optimization';

export type {
  InstanceData,
  InstanceGroup,
  LODObject,
  LODManagerConfig,
  RobotLODConfig,
  RobotLODState,
  UseRobotLODOptions,
  UseRobotLODResult,
} from './optimization';

// Environment
export {
  EnvironmentSystem,
  useEnvironmentSystem,
  SKYBOX_PRESETS,
} from './environment';

export type {
  EnvironmentPreset,
  SkyboxPreset,
  EnvironmentConfig,
  SkyConfig,
  FogConfig,
  EnvironmentSystemConfig,
  EnvironmentContextValue,
  EnvironmentSystemProps,
} from './environment';
