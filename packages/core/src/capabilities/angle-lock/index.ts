/**
 * Angle Lock Capability
 *
 * Provides tool angle constraints for welding, grinding, and other processes.
 * Ensures tool maintains proper work and travel angles relative to workpiece.
 *
 * @example
 * ```tsx
 * import {
 *   AngleLockProvider,
 *   AngleIndicator,
 *   useAngleLock,
 *   WELDING_ANGLE_PRESETS,
 * } from '@roboviz/core/capabilities/angle-lock';
 *
 * function WeldingEditor() {
 *   return (
 *     <AngleLockProvider
 *       constraints={[
 *         WELDING_ANGLE_PRESETS.flat.work,
 *         WELDING_ANGLE_PRESETS.flat.travel,
 *       ]}
 *       onViolationChange={(violations) => {
 *         if (violations.length > 0) {
 *           console.warn('Angle constraints violated!');
 *         }
 *       }}
 *     >
 *       <Canvas>
 *         <AngleIndicator
 *           position={toolPosition}
 *           quaternion={toolQuaternion}
 *         />
 *       </Canvas>
 *       <AngleControlPanel />
 *     </AngleLockProvider>
 *   );
 * }
 * ```
 */

// Types
export * from './types';

// Context and hooks
export {
  AngleLockProvider,
  useAngleLock,
  useAngleLockState,
  useAngleLockActions,
  useAngleConstraints,
  useConstraintsSatisfied,
  useAngleViolations,
  useAngleConstraint,
} from './AngleLockContext';

// Components
export { AngleIndicator } from './AngleIndicator';
export type { AngleIndicatorProps } from './AngleIndicator';
