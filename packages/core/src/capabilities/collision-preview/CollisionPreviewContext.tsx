/**
 * CollisionPreviewContext
 *
 * React context for collision preview capability.
 * Provides collision detection and visualization state.
 */

import * as React from 'react';
import { createContext, useContext, useCallback, useMemo, useReducer, useEffect } from 'react';
import type {
  CollisionPreviewState,
  CollisionPreviewActions,
  CollisionDisplaySettings,
  CollisionPreviewProviderProps,
  PreviewCollisionResult,
  CollisionCheckOptions,
} from './types';

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_DISPLAY_SETTINGS: CollisionDisplaySettings = {
  showIndicators: true,
  showContactPoints: true,
  highlightCollisions: true,
  indicatorSize: 0.02,
  colors: {
    info: '#4a9eff',
    warning: '#ffcc00',
    error: '#ff4444',
    critical: '#ff0000',
  },
  highlightOpacity: 0.5,
};

const DEFAULT_CHECK_OPTIONS: CollisionCheckOptions = {
  safetyMargin: 0.01, // 1cm
  checkSelfCollision: true,
  checkAgainst: ['workpiece', 'fixture', 'environment'],
  stopOnFirst: false,
  nearMissThreshold: 0.05, // 5cm
};

const INITIAL_STATE: CollisionPreviewState = {
  enabled: true,
  result: null,
  isChecking: false,
  autoCheck: true,
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
  checkOptions: DEFAULT_CHECK_OPTIONS,
};

// ============================================================================
// Reducer
// ============================================================================

type Action =
  | { type: 'SET_ENABLED'; enabled: boolean }
  | { type: 'SET_CHECKING'; isChecking: boolean }
  | { type: 'SET_RESULT'; result: PreviewCollisionResult | null }
  | { type: 'SET_AUTO_CHECK'; autoCheck: boolean }
  | { type: 'SET_CHECK_OPTIONS'; options: Partial<CollisionCheckOptions> }
  | { type: 'SET_DISPLAY_SETTINGS'; settings: Partial<CollisionDisplaySettings> }
  | { type: 'CLEAR_RESULT' };

function reducer(state: CollisionPreviewState, action: Action): CollisionPreviewState {
  switch (action.type) {
    case 'SET_ENABLED':
      return { ...state, enabled: action.enabled };

    case 'SET_CHECKING':
      return { ...state, isChecking: action.isChecking };

    case 'SET_RESULT':
      return { ...state, result: action.result };

    case 'SET_AUTO_CHECK':
      return { ...state, autoCheck: action.autoCheck };

    case 'SET_CHECK_OPTIONS':
      return {
        ...state,
        checkOptions: { ...state.checkOptions, ...action.options },
      };

    case 'SET_DISPLAY_SETTINGS':
      return {
        ...state,
        displaySettings: { ...state.displaySettings, ...action.settings },
      };

    case 'CLEAR_RESULT':
      return { ...state, result: null };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface CollisionPreviewContextValue {
  state: CollisionPreviewState;
  actions: CollisionPreviewActions;
}

const CollisionPreviewContext = createContext<CollisionPreviewContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

/**
 * Default collision checker (mock implementation)
 * In real usage, this would call backend API
 */
async function defaultCollisionChecker(
  _robotId: string,
  _joints: number[],
  _options: CollisionCheckOptions
): Promise<PreviewCollisionResult> {
  // Mock implementation - returns no collision
  console.warn('[CollisionPreview] No collision checker provided, using mock');
  return {
    hasCollision: false,
    collisions: [],
    detectionTimeMs: 0,
    timestamp: Date.now(),
  };
}

export function CollisionPreviewProvider({
  children,
  robotId,
  enabled = true,
  checkOptions: initialCheckOptions,
  displaySettings: initialDisplaySettings,
  onCollisionChange,
  collisionChecker = defaultCollisionChecker,
}: CollisionPreviewProviderProps): React.JSX.Element {
  const initialState = useMemo(
    () => ({
      ...INITIAL_STATE,
      enabled,
      checkOptions: { ...DEFAULT_CHECK_OPTIONS, ...initialCheckOptions },
      displaySettings: { ...DEFAULT_DISPLAY_SETTINGS, ...initialDisplaySettings },
    }),
    [] // Only on mount
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  // Actions
  const actions = useMemo<CollisionPreviewActions>(() => {
    const setEnabled = (enabled: boolean) => {
      dispatch({ type: 'SET_ENABLED', enabled });
    };

    const checkCollisions = async (): Promise<PreviewCollisionResult> => {
      dispatch({ type: 'SET_CHECKING', isChecking: true });

      try {
        // In real implementation, get current joints from robot state
        const currentJoints: number[] = [0, 0, 0, 0, 0, 0];
        const result = await collisionChecker(robotId, currentJoints, state.checkOptions);
        dispatch({ type: 'SET_RESULT', result });
        return result;
      } finally {
        dispatch({ type: 'SET_CHECKING', isChecking: false });
      }
    };

    const checkJointConfig = async (joints: number[]): Promise<PreviewCollisionResult> => {
      dispatch({ type: 'SET_CHECKING', isChecking: true });

      try {
        const result = await collisionChecker(robotId, joints, state.checkOptions);
        dispatch({ type: 'SET_RESULT', result });
        return result;
      } finally {
        dispatch({ type: 'SET_CHECKING', isChecking: false });
      }
    };

    const checkTrajectory = async (
      waypoints: Array<{ joints: number[] }>
    ): Promise<PreviewCollisionResult[]> => {
      dispatch({ type: 'SET_CHECKING', isChecking: true });

      try {
        const results: PreviewCollisionResult[] = [];
        for (const wp of waypoints) {
          const result = await collisionChecker(robotId, wp.joints, {
            ...state.checkOptions,
            stopOnFirst: true, // Faster for trajectory checking
          });
          results.push(result);
        }
        return results;
      } finally {
        dispatch({ type: 'SET_CHECKING', isChecking: false });
      }
    };

    const setCheckOptions = (options: Partial<CollisionCheckOptions>) => {
      dispatch({ type: 'SET_CHECK_OPTIONS', options });
    };

    const setDisplaySettings = (settings: Partial<CollisionDisplaySettings>) => {
      dispatch({ type: 'SET_DISPLAY_SETTINGS', settings });
    };

    const setAutoCheck = (autoCheck: boolean) => {
      dispatch({ type: 'SET_AUTO_CHECK', autoCheck });
    };

    const clearResult = () => {
      dispatch({ type: 'CLEAR_RESULT' });
    };

    return {
      setEnabled,
      checkCollisions,
      checkJointConfig,
      checkTrajectory,
      setCheckOptions,
      setDisplaySettings,
      setAutoCheck,
      clearResult,
    };
  }, [robotId, collisionChecker, state.checkOptions]);

  // Notify on collision change
  useEffect(() => {
    onCollisionChange?.(state.result);
  }, [state.result, onCollisionChange]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return (
    <CollisionPreviewContext.Provider value={value}>
      {children}
    </CollisionPreviewContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access collision preview context
 */
export function useCollisionPreview(): CollisionPreviewContextValue {
  const context = useContext(CollisionPreviewContext);
  if (!context) {
    throw new Error('useCollisionPreview must be used within CollisionPreviewProvider');
  }
  return context;
}

/**
 * Get collision preview state only
 */
export function useCollisionPreviewState(): CollisionPreviewState {
  return useCollisionPreview().state;
}

/**
 * Get collision preview actions only
 */
export function useCollisionPreviewActions(): CollisionPreviewActions {
  return useCollisionPreview().actions;
}

/**
 * Get current collision result
 */
export function useCollisionResult(): PreviewCollisionResult | null {
  return useCollisionPreview().state.result;
}

/**
 * Check if there are any collisions
 */
export function useHasCollision(): boolean {
  return useCollisionPreview().state.result?.hasCollision ?? false;
}

/**
 * Get collision count
 */
export function useCollisionCount(): number {
  return useCollisionPreview().state.result?.collisions.length ?? 0;
}
