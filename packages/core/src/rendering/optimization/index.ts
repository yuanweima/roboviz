/**
 * Optimization Module Exports
 */

export {
  InstanceManager,
  getInstanceManager,
} from './InstanceManager';

export type { InstanceData, InstanceGroup } from './InstanceManager';

export {
  LODManager,
  getLODManager,
  generateSimplifiedGeometry,
  generateBoundingBoxMesh,
} from './LODManager';

export type { LODObject, LODManagerConfig } from './LODManager';
