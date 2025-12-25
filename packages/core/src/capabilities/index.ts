/**
 * Capabilities System
 *
 * Composable capability modules that can be used by multiple processes.
 * Each capability provides focused functionality that processes can opt into.
 *
 * @example
 * ```tsx
 * // Use capabilities in a process
 * import {
 *   EdgeSelectionProvider,
 *   CollisionPreviewProvider,
 *   AngleLockProvider,
 * } from '@roboviz/core/capabilities';
 *
 * function WeldingProcess({ robotId, children }) {
 *   return (
 *     <EdgeSelectionProvider>
 *       <CollisionPreviewProvider robotId={robotId}>
 *         <AngleLockProvider constraints={weldingAngleConstraints}>
 *           {children}
 *         </AngleLockProvider>
 *       </CollisionPreviewProvider>
 *     </EdgeSelectionProvider>
 *   );
 * }
 * ```
 *
 * ## Available Capabilities
 *
 * - **edge-selection**: Edge detection and selection for seam-based processes
 * - **collision-preview**: Real-time collision detection visualization
 * - **angle-lock**: Tool angle constraints for welding/grinding
 *
 * ## Capability Guidelines
 *
 * 1. Capabilities should be self-contained and focused on one concern
 * 2. Capabilities expose a Provider component and hooks
 * 3. Capabilities can have optional 3D visualization components
 * 4. Capabilities should work independently but integrate well together
 */

// Edge Selection Capability
export * from './edge-selection';

// Collision Preview Capability
export * from './collision-preview';

// Angle Lock Capability
export * from './angle-lock';
