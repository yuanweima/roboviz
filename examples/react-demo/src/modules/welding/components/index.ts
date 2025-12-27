/**
 * Welding Module Components
 *
 * Shared components for industrial process simulation:
 * - Enhanced workpieces for each process type
 *
 * Note: End effector tools (WeldingTorch, GrindingWheel, InspectionCamera)
 * are now part of @aspect/roboviz-core. Import them from there instead.
 */

export {
  IndustrialWeldingWorkpiece,
  IndustrialGrindingWorkpiece,
  IndustrialInspectionWorkpiece,
  type IndustrialWeldingWorkpieceProps,
  type IndustrialGrindingWorkpieceProps,
  type IndustrialInspectionWorkpieceProps,
} from './Workpieces';

export {
  PolyhedronWorkpiece,
  createPolyhedronRegions,
  type PolyhedronWorkpieceProps,
  type GrindingSurfaceRegion,
} from './PolyhedronWorkpiece';
