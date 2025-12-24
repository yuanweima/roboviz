/**
 * Workpoint System
 *
 * A complete system for defining and managing work points on workpiece
 * surfaces for robotic operations.
 *
 * @example
 * ```tsx
 * import { WorkpointManager, useWorkpointStore } from '@roboviz/core/workpoint';
 *
 * function App() {
 *   return (
 *     <Canvas>
 *       <WorkpointManager
 *         workpieceIds={['workpiece_1']}
 *         callbacks={{
 *           onWorkpointAdded: (wp) => console.log('Added:', wp),
 *           onWorkpointChanged: (wp) => console.log('Changed:', wp),
 *         }}
 *       />
 *     </Canvas>
 *   );
 * }
 * ```
 *
 * ## Keyboard Shortcuts
 *
 * | Key | Action |
 * |-----|--------|
 * | W | Toggle workpoint edit mode |
 * | Space/Enter | Create workpoint at preview |
 * | R | Rotate preview clockwise |
 * | Shift+R | Rotate preview counter-clockwise |
 * | 1-5 | Set workpoint type |
 * | T | Gizmo translate mode |
 * | Ctrl+R | Gizmo rotate mode |
 * | Delete | Delete selected workpoint |
 * | Escape | Deselect or exit mode |
 * | Tab | Select next workpoint |
 * | Shift+Tab | Select previous workpoint |
 */

// Types
export * from './types';

// Store
export * from './store';

// Hooks
export * from './hooks';

// Components
export * from './components';

// Events
export * from './events';

// Protocol
export * from './protocol';

// Utils
export * from './utils';
