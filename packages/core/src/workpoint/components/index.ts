// Rename Workpoint component to WorkpointMarker to avoid conflict with Workpoint type
export { Workpoint as WorkpointMarker } from './Workpoint';
export type { WorkpointProps as WorkpointMarkerProps } from './Workpoint';

export { WorkpointPreview } from './WorkpointPreview';
export type { WorkpointPreviewProps } from './WorkpointPreview';

export { WorkpointGizmo } from './WorkpointGizmo';
export type { WorkpointGizmoProps } from './WorkpointGizmo';

export { CameraZone, getCameraZoneParams } from './CameraZone';
export type { CameraZoneProps } from './CameraZone';

export { WorkpointManager } from './WorkpointManager';

// Rename SurfaceRegion component to SurfaceRegionRenderer to avoid conflict with SurfaceRegion type
export { SurfaceRegion as SurfaceRegionRenderer } from './SurfaceRegion';
export type { SurfaceRegionProps as SurfaceRegionRendererProps } from './SurfaceRegion';

export { SurfaceRegionManager } from './SurfaceRegionManager';
export type { SurfaceRegionManagerProps } from './SurfaceRegionManager';
