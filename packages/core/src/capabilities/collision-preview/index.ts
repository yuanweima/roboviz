/**
 * Collision Preview Capability
 *
 * Provides collision detection preview for robot trajectories.
 * Shows contact points and collision warnings in 3D.
 *
 * @example
 * ```tsx
 * import {
 *   CollisionPreviewProvider,
 *   CollisionIndicators,
 *   useCollisionPreview,
 *   useHasCollision,
 * } from '@roboviz/core/capabilities/collision-preview';
 *
 * function TrajectoryEditor({ robotId }) {
 *   return (
 *     <CollisionPreviewProvider
 *       robotId={robotId}
 *       onCollisionChange={(result) => {
 *         if (result?.hasCollision) {
 *           console.warn('Collision detected!');
 *         }
 *       }}
 *     >
 *       <Canvas>
 *         <Robot id={robotId} />
 *         <CollisionIndicators />
 *       </Canvas>
 *       <CollisionStatusPanel />
 *     </CollisionPreviewProvider>
 *   );
 * }
 * ```
 */

// Types
export * from './types';

// Context and hooks
export {
  CollisionPreviewProvider,
  useCollisionPreview,
  useCollisionPreviewState,
  useCollisionPreviewActions,
  useCollisionResult,
  useHasCollision,
  useCollisionCount,
} from './CollisionPreviewContext';

// Components
export { CollisionIndicators } from './CollisionIndicators';
export type { CollisionIndicatorsProps } from './CollisionIndicators';
