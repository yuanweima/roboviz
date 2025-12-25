/**
 * EdgeSelectionContext
 *
 * React context for edge selection capability.
 * Provides edge detection, selection, and display state.
 */

import * as React from 'react';
import { createContext, useContext, useCallback, useMemo, useReducer } from 'react';
import type {
  EdgeSelectionState,
  EdgeSelectionActions,
  EdgeDisplaySettings,
  EdgeSelectionProviderProps,
  DetectedEdge,
  EdgeDetectionOptions,
} from './types';

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_DISPLAY_SETTINGS: EdgeDisplaySettings = {
  showAllEdges: true,
  lineWidth: 2,
  defaultColor: '#4a9eff',
  selectedColor: '#00ff88',
  hoverColor: '#ffcc00',
  opacity: 0.6,
  showDirectionArrows: false,
  showLabels: false,
};

const INITIAL_STATE: EdgeSelectionState = {
  detectedEdges: [],
  selectedEdgeIds: [],
  hoveredEdgeId: null,
  isDetecting: false,
  detectionError: null,
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
};

// ============================================================================
// Reducer
// ============================================================================

type Action =
  | { type: 'SET_DETECTED_EDGES'; edges: DetectedEdge[] }
  | { type: 'SET_DETECTING'; isDetecting: boolean }
  | { type: 'SET_DETECTION_ERROR'; error: string | null }
  | { type: 'SELECT_EDGE'; edgeId: string }
  | { type: 'DESELECT_EDGE'; edgeId: string }
  | { type: 'TOGGLE_SELECTION'; edgeId: string }
  | { type: 'SELECT_EDGES'; edgeIds: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_HOVERED'; edgeId: string | null }
  | { type: 'SET_DISPLAY_SETTINGS'; settings: Partial<EdgeDisplaySettings> }
  | { type: 'CLEAR_EDGES' };

function reducer(state: EdgeSelectionState, action: Action): EdgeSelectionState {
  switch (action.type) {
    case 'SET_DETECTED_EDGES':
      return { ...state, detectedEdges: action.edges, detectionError: null };

    case 'SET_DETECTING':
      return { ...state, isDetecting: action.isDetecting };

    case 'SET_DETECTION_ERROR':
      return { ...state, detectionError: action.error, isDetecting: false };

    case 'SELECT_EDGE':
      if (state.selectedEdgeIds.includes(action.edgeId)) return state;
      return { ...state, selectedEdgeIds: [...state.selectedEdgeIds, action.edgeId] };

    case 'DESELECT_EDGE':
      return {
        ...state,
        selectedEdgeIds: state.selectedEdgeIds.filter((id) => id !== action.edgeId),
      };

    case 'TOGGLE_SELECTION':
      if (state.selectedEdgeIds.includes(action.edgeId)) {
        return {
          ...state,
          selectedEdgeIds: state.selectedEdgeIds.filter((id) => id !== action.edgeId),
        };
      }
      return { ...state, selectedEdgeIds: [...state.selectedEdgeIds, action.edgeId] };

    case 'SELECT_EDGES':
      return { ...state, selectedEdgeIds: action.edgeIds };

    case 'CLEAR_SELECTION':
      return { ...state, selectedEdgeIds: [] };

    case 'SET_HOVERED':
      return { ...state, hoveredEdgeId: action.edgeId };

    case 'SET_DISPLAY_SETTINGS':
      return {
        ...state,
        displaySettings: { ...state.displaySettings, ...action.settings },
      };

    case 'CLEAR_EDGES':
      return { ...state, detectedEdges: [], selectedEdgeIds: [], hoveredEdgeId: null };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface EdgeSelectionContextValue {
  state: EdgeSelectionState;
  actions: EdgeSelectionActions;
}

const EdgeSelectionContext = createContext<EdgeSelectionContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

/**
 * Default edge detector (mock implementation)
 * In real usage, this would call backend API
 */
async function defaultEdgeDetector(
  _workpieceIds: string[],
  _options: EdgeDetectionOptions
): Promise<DetectedEdge[]> {
  // Mock implementation - returns empty
  // Real implementation would call backend
  console.warn('[EdgeSelection] No edge detector provided, using mock');
  return [];
}

export function EdgeSelectionProvider({
  children,
  displaySettings: initialDisplaySettings,
  onSelectionChange,
  onHoverChange,
  edgeDetector = defaultEdgeDetector,
}: EdgeSelectionProviderProps): React.JSX.Element {
  const initialState = useMemo(
    () => ({
      ...INITIAL_STATE,
      displaySettings: { ...DEFAULT_DISPLAY_SETTINGS, ...initialDisplaySettings },
    }),
    [] // Only on mount
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  // Actions
  const actions = useMemo<EdgeSelectionActions>(() => {
    const detectEdges = async (workpieceIds: string[]) => {
      dispatch({ type: 'SET_DETECTING', isDetecting: true });

      try {
        const edges = await edgeDetector(workpieceIds, {});
        dispatch({ type: 'SET_DETECTED_EDGES', edges });
      } catch (error) {
        dispatch({
          type: 'SET_DETECTION_ERROR',
          error: error instanceof Error ? error.message : 'Edge detection failed',
        });
      } finally {
        dispatch({ type: 'SET_DETECTING', isDetecting: false });
      }
    };

    const selectEdge = (edgeId: string) => {
      dispatch({ type: 'SELECT_EDGE', edgeId });
    };

    const deselectEdge = (edgeId: string) => {
      dispatch({ type: 'DESELECT_EDGE', edgeId });
    };

    const toggleEdgeSelection = (edgeId: string) => {
      dispatch({ type: 'TOGGLE_SELECTION', edgeId });
    };

    const selectEdges = (edgeIds: string[]) => {
      dispatch({ type: 'SELECT_EDGES', edgeIds });
    };

    const clearSelection = () => {
      dispatch({ type: 'CLEAR_SELECTION' });
    };

    const setHoveredEdge = (edgeId: string | null) => {
      dispatch({ type: 'SET_HOVERED', edgeId });
    };

    const setDisplaySettings = (settings: Partial<EdgeDisplaySettings>) => {
      dispatch({ type: 'SET_DISPLAY_SETTINGS', settings });
    };

    const clearDetectedEdges = () => {
      dispatch({ type: 'CLEAR_EDGES' });
    };

    return {
      detectEdges,
      selectEdge,
      deselectEdge,
      toggleEdgeSelection,
      selectEdges,
      clearSelection,
      setHoveredEdge,
      setDisplaySettings,
      clearDetectedEdges,
    };
  }, [edgeDetector]);

  // Notify on selection change
  React.useEffect(() => {
    onSelectionChange?.(state.selectedEdgeIds);
  }, [state.selectedEdgeIds, onSelectionChange]);

  // Notify on hover change
  React.useEffect(() => {
    onHoverChange?.(state.hoveredEdgeId);
  }, [state.hoveredEdgeId, onHoverChange]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <EdgeSelectionContext.Provider value={value}>{children}</EdgeSelectionContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access edge selection context
 */
export function useEdgeSelection(): EdgeSelectionContextValue {
  const context = useContext(EdgeSelectionContext);
  if (!context) {
    throw new Error('useEdgeSelection must be used within EdgeSelectionProvider');
  }
  return context;
}

/**
 * Get edge selection state only
 */
export function useEdgeSelectionState(): EdgeSelectionState {
  return useEdgeSelection().state;
}

/**
 * Get edge selection actions only
 */
export function useEdgeSelectionActions(): EdgeSelectionActions {
  return useEdgeSelection().actions;
}

/**
 * Get detected edges
 */
export function useDetectedEdges(): DetectedEdge[] {
  return useEdgeSelection().state.detectedEdges;
}

/**
 * Get selected edges
 */
export function useSelectedEdges(): DetectedEdge[] {
  const { detectedEdges, selectedEdgeIds } = useEdgeSelection().state;
  return useMemo(
    () => detectedEdges.filter((e) => selectedEdgeIds.includes(e.id)),
    [detectedEdges, selectedEdgeIds]
  );
}

/**
 * Check if a specific edge is selected
 */
export function useIsEdgeSelected(edgeId: string): boolean {
  const { selectedEdgeIds } = useEdgeSelection().state;
  return selectedEdgeIds.includes(edgeId);
}
