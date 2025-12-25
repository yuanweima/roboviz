/**
 * Edge Selection Capability
 *
 * Provides edge detection and selection for welding, grinding,
 * and other processes that operate on workpiece edges.
 *
 * @example
 * ```tsx
 * import {
 *   EdgeSelectionProvider,
 *   EdgeVisualization,
 *   useEdgeSelection,
 *   useSelectedEdges,
 * } from '@roboviz/core/capabilities/edge-selection';
 *
 * function WeldingEditor() {
 *   return (
 *     <EdgeSelectionProvider
 *       onSelectionChange={(edges) => console.log('Selected:', edges)}
 *     >
 *       <Canvas>
 *         <EdgeVisualization />
 *       </Canvas>
 *       <EdgeSelectionPanel />
 *     </EdgeSelectionProvider>
 *   );
 * }
 * ```
 */

// Types
export * from './types';

// Context and hooks
export {
  EdgeSelectionProvider,
  useEdgeSelection,
  useEdgeSelectionState,
  useEdgeSelectionActions,
  useDetectedEdges,
  useSelectedEdges,
  useIsEdgeSelected,
} from './EdgeSelectionContext';

// Components
export { EdgeVisualization } from './EdgeVisualization';
export type { EdgeVisualizationProps } from './EdgeVisualization';
