/**
 * RoboViz Rendering System
 *
 * Advanced rendering capabilities for industrial robotics visualization.
 *
 * Features:
 * - Post-processing pipeline (SSAO, Bloom, Outline, Vignette, DOF)
 * - Custom shader materials (Distance Field, Flow Line, X-Ray, Hologram)
 * - Industrial material presets (Steel, Aluminum, Chrome, etc.)
 * - GPU Instancing for multi-robot scenarios
 * - Level of Detail (LOD) management
 * - Quality presets (Low, Medium, High, Ultra)
 *
 * @example
 * ```tsx
 * import {
 *   RenderPipeline,
 *   MaterialLibrary,
 *   InstanceManager,
 *   LODManager,
 * } from '@aspect/roboviz-core/rendering';
 *
 * // Use render pipeline with post-processing
 * <RoboVizCore>
 *   <RenderPipeline config={{ qualityPreset: 'high' }}>
 *     <Robot urdfPath="/robot.urdf" />
 *   </RenderPipeline>
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
} from './pipeline';

export type {
  RenderPipelineProps,
  RenderPipelineContextValue,
} from './pipeline';

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
} from './optimization';

export type {
  InstanceData,
  InstanceGroup,
  LODObject,
  LODManagerConfig,
} from './optimization';
