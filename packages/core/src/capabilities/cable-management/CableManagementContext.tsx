/**
 * Cable Management Context
 *
 * Provides cable management state and actions throughout the component tree.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type {
  CableConfig,
  CableState,
  CableManagementState,
  CableDisplaySettings,
  CableManagementProviderProps,
  CableWarningLevel,
  TwistHistoryPoint,
  CableEvent,
  CableEventHandler,
  CableManagementActions,
} from './types';
import {
  DEFAULT_DISPLAY_SETTINGS,
  UPDATE_CONSTANTS,
  getWarningLevelFromTwist,
  getMostSevereLevel,
} from './constants';
import { TwistTracker } from './utils/twist-calculator';

// ============================================================
// Reducer
// ============================================================

type CableAction =
  | { type: 'ADD_CABLE'; payload: CableConfig }
  | { type: 'REMOVE_CABLE'; payload: string }
  | {
      type: 'UPDATE_CABLE';
      payload: { id: string; updates: Partial<CableConfig> };
    }
  | {
      type: 'UPDATE_CABLE_STATE';
      payload: { id: string; state: Partial<CableState> };
    }
  | { type: 'SET_REFERENCE_JOINTS'; payload: number[] }
  | { type: 'RESET_TWIST'; payload: { cableId: string } }
  | { type: 'RESET_ALL_TWISTS' }
  | { type: 'ADD_HISTORY_POINT'; payload: TwistHistoryPoint }
  | { type: 'SET_ENABLED'; payload: boolean }
  | { type: 'UPDATE_DISPLAY_SETTINGS'; payload: Partial<CableDisplaySettings> }
  | { type: 'BATCH_UPDATE_STATES'; payload: Map<string, CableState> };

function cableReducer(
  state: CableManagementState,
  action: CableAction
): CableManagementState {
  switch (action.type) {
    case 'ADD_CABLE': {
      const newCables = new Map(state.cables);
      newCables.set(action.payload.id, action.payload);

      // Initialize cable state
      const newStates = new Map(state.cableStates);
      newStates.set(action.payload.id, {
        cableId: action.payload.id,
        currentTwist: 0,
        twistDirection: 0,
        warningLevel: 'safe',
        pathPoints: [],
        timestamp: Date.now(),
      });

      return { ...state, cables: newCables, cableStates: newStates };
    }

    case 'REMOVE_CABLE': {
      const newCables = new Map(state.cables);
      const newStates = new Map(state.cableStates);
      newCables.delete(action.payload);
      newStates.delete(action.payload);
      return { ...state, cables: newCables, cableStates: newStates };
    }

    case 'UPDATE_CABLE': {
      const existing = state.cables.get(action.payload.id);
      if (!existing) return state;
      const newCables = new Map(state.cables);
      newCables.set(action.payload.id, {
        ...existing,
        ...action.payload.updates,
      });
      return { ...state, cables: newCables };
    }

    case 'UPDATE_CABLE_STATE': {
      const existing = state.cableStates.get(action.payload.id);
      if (!existing) return state;
      const newStates = new Map(state.cableStates);
      newStates.set(action.payload.id, {
        ...existing,
        ...action.payload.state,
      });
      return { ...state, cableStates: newStates };
    }

    case 'SET_REFERENCE_JOINTS':
      return { ...state, referenceJoints: action.payload };

    case 'RESET_TWIST': {
      const newStates = new Map(state.cableStates);
      const existing = newStates.get(action.payload.cableId);
      if (existing) {
        newStates.set(action.payload.cableId, {
          ...existing,
          currentTwist: 0,
          twistDirection: 0,
          warningLevel: 'safe',
          timestamp: Date.now(),
        });
      }
      return { ...state, cableStates: newStates };
    }

    case 'RESET_ALL_TWISTS': {
      const newStates = new Map<string, CableState>();
      state.cableStates.forEach((cableState, id) => {
        newStates.set(id, {
          ...cableState,
          currentTwist: 0,
          twistDirection: 0,
          warningLevel: 'safe',
          timestamp: Date.now(),
        });
      });
      return { ...state, cableStates: newStates };
    }

    case 'ADD_HISTORY_POINT': {
      const newHistory = [...state.twistHistory, action.payload];
      // Trim history if too long
      while (newHistory.length > state.historyMaxLength) {
        newHistory.shift();
      }
      return { ...state, twistHistory: newHistory };
    }

    case 'SET_ENABLED':
      return { ...state, enabled: action.payload };

    case 'UPDATE_DISPLAY_SETTINGS':
      return {
        ...state,
        displaySettings: { ...state.displaySettings, ...action.payload },
      };

    case 'BATCH_UPDATE_STATES':
      return { ...state, cableStates: action.payload };

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

interface CableManagementContextValue {
  state: CableManagementState;
  actions: CableManagementActions;
}

const CableManagementContext =
  createContext<CableManagementContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

const createInitialState = (
  initialCables: CableConfig[] = [],
  initialDisplaySettings?: Partial<CableDisplaySettings>
): CableManagementState => {
  const cables = new Map<string, CableConfig>();
  const cableStates = new Map<string, CableState>();

  initialCables.forEach((cable) => {
    cables.set(cable.id, cable);
    cableStates.set(cable.id, {
      cableId: cable.id,
      currentTwist: 0,
      twistDirection: 0,
      warningLevel: 'safe',
      pathPoints: [],
      timestamp: Date.now(),
    });
  });

  return {
    cables,
    cableStates,
    twistHistory: [],
    historyMaxLength: UPDATE_CONSTANTS.MAX_HISTORY_LENGTH,
    referenceJoints: null,
    enabled: true,
    displaySettings: { ...DEFAULT_DISPLAY_SETTINGS, ...initialDisplaySettings },
  };
};

export function CableManagementProvider({
  children,
  robotId,
  initialCables = [],
  initialDisplaySettings,
  onCableEvent,
}: CableManagementProviderProps) {
  const [state, dispatch] = useReducer(
    cableReducer,
    { initialCables, initialDisplaySettings },
    ({ initialCables, initialDisplaySettings }) =>
      createInitialState(initialCables, initialDisplaySettings)
  );

  // Event handlers ref
  const eventHandlersRef = useRef<Set<CableEventHandler>>(new Set());

  // Twist trackers for each cable
  const twistTrackersRef = useRef<Map<string, TwistTracker>>(new Map());

  // Previous joints ref for delta calculation
  const previousJointsRef = useRef<number[] | null>(null);

  // Last update time for throttling
  const lastUpdateRef = useRef<number>(0);

  // Debounce refs for warnings
  const warningDebounceRef = useRef<Map<string, number>>(new Map());

  // Emit event helper
  const emitEvent = useCallback(
    (event: CableEvent) => {
      onCableEvent?.(event);
      eventHandlersRef.current.forEach((handler) => handler(event));
    },
    [onCableEvent]
  );

  // Initialize twist trackers when cables change
  useEffect(() => {
    state.cables.forEach((cable, id) => {
      if (!twistTrackersRef.current.has(id)) {
        // Assume 6-DOF robot for now, could be made configurable
        twistTrackersRef.current.set(id, new TwistTracker(6));
      }
    });

    // Remove trackers for deleted cables
    twistTrackersRef.current.forEach((_, id) => {
      if (!state.cables.has(id)) {
        twistTrackersRef.current.delete(id);
      }
    });
  }, [state.cables]);

  // Update from joints
  const updateFromJoints = useCallback(
    (joints: number[]) => {
      if (!state.enabled) return;

      // Throttle updates
      const now = Date.now();
      if (now - lastUpdateRef.current < UPDATE_CONSTANTS.MIN_UPDATE_INTERVAL) {
        return;
      }
      lastUpdateRef.current = now;

      const newStates = new Map<string, CableState>();
      let hasChanges = false;

      state.cables.forEach((cable, id) => {
        const tracker = twistTrackersRef.current.get(id);
        const prevState = state.cableStates.get(id);

        if (!tracker || !prevState) return;

        // Update tracker
        const newTwist = tracker.updateJoints(joints);
        const warningLevel = getWarningLevelFromTwist(
          newTwist,
          cable.twistConstraints
        );

        // Check for warning level changes (with debounce)
        const lastWarningTime = warningDebounceRef.current.get(id) ?? 0;
        if (
          warningLevel !== prevState.warningLevel &&
          now - lastWarningTime > UPDATE_CONSTANTS.WARNING_DEBOUNCE
        ) {
          warningDebounceRef.current.set(id, now);
          emitEvent({
            type: 'twist_warning',
            cableId: id,
            level: warningLevel,
            twist: newTwist,
          });
        }

        // Check for limit reached
        if (Math.abs(newTwist) >= cable.twistConstraints.maxTwist * 0.99) {
          emitEvent({
            type: 'twist_limit_reached',
            cableId: id,
            twist: newTwist,
          });
        }

        const newState: CableState = {
          cableId: id,
          currentTwist: newTwist,
          twistDirection: tracker.direction,
          warningLevel,
          pathPoints: prevState.pathPoints, // Will be updated separately
          stressProfile: prevState.stressProfile,
          timestamp: now,
        };

        newStates.set(id, newState);
        hasChanges = true;
      });

      if (hasChanges) {
        dispatch({ type: 'BATCH_UPDATE_STATES', payload: newStates });

        // Add to history (sample rate: every ~100ms)
        const primaryState = newStates.values().next().value;
        if (primaryState && state.twistHistory.length === 0) {
          dispatch({
            type: 'ADD_HISTORY_POINT',
            payload: {
              timestamp: now,
              twist: primaryState.currentTwist,
              jointAngles: joints,
            },
          });
        } else if (
          primaryState &&
          now - (state.twistHistory[state.twistHistory.length - 1]?.timestamp ?? 0) > 100
        ) {
          dispatch({
            type: 'ADD_HISTORY_POINT',
            payload: {
              timestamp: now,
              twist: primaryState.currentTwist,
              jointAngles: joints,
            },
          });
        }
      }

      previousJointsRef.current = joints;
    },
    [state.enabled, state.cables, state.cableStates, state.twistHistory, emitEvent]
  );

  // Actions
  const actions = useMemo<CableManagementActions>(
    () => ({
      addCable: (config) => {
        dispatch({ type: 'ADD_CABLE', payload: config });
        emitEvent({
          type: 'cable_config_changed',
          cableId: config.id,
          config,
        });
      },

      removeCable: (id) => {
        dispatch({ type: 'REMOVE_CABLE', payload: id });
        twistTrackersRef.current.delete(id);
      },

      updateCable: (id, updates) => {
        dispatch({ type: 'UPDATE_CABLE', payload: { id, updates } });
        const cable = state.cables.get(id);
        if (cable) {
          emitEvent({
            type: 'cable_config_changed',
            cableId: id,
            config: { ...cable, ...updates },
          });
        }
      },

      getCable: (id) => state.cables.get(id),

      setReferenceJoints: (joints) => {
        const prevTwist =
          state.cableStates.values().next().value?.currentTwist ?? 0;

        dispatch({ type: 'SET_REFERENCE_JOINTS', payload: joints });
        previousJointsRef.current = joints;

        // Reset all trackers' reference
        twistTrackersRef.current.forEach((tracker) => {
          tracker.setReference(joints);
        });

        emitEvent({ type: 'reference_reset', previousTwist: prevTwist });
      },

      resetTwist: (cableId) => {
        dispatch({ type: 'RESET_TWIST', payload: { cableId } });
        const tracker = twistTrackersRef.current.get(cableId);
        if (tracker) {
          tracker.reset();
        }
      },

      resetAllTwists: () => {
        dispatch({ type: 'RESET_ALL_TWISTS' });
        twistTrackersRef.current.forEach((tracker) => {
          tracker.reset();
        });
      },

      setEnabled: (enabled) => {
        dispatch({ type: 'SET_ENABLED', payload: enabled });
      },

      updateDisplaySettings: (settings) => {
        dispatch({ type: 'UPDATE_DISPLAY_SETTINGS', payload: settings });
      },

      getMaxWarningLevel: () => {
        const levels: CableWarningLevel[] = [];
        state.cableStates.forEach((cableState) => {
          levels.push(cableState.warningLevel);
        });
        return getMostSevereLevel(levels);
      },

      getCriticalCables: () => {
        const critical: string[] = [];
        state.cableStates.forEach((cableState, id) => {
          if (
            cableState.warningLevel === 'critical' ||
            cableState.warningLevel === 'warning'
          ) {
            critical.push(id);
          }
        });
        return critical;
      },

      subscribeToEvents: (handler) => {
        eventHandlersRef.current.add(handler);
        return () => {
          eventHandlersRef.current.delete(handler);
        };
      },

      updateFromJoints,
    }),
    [state.cables, state.cableStates, updateFromJoints, emitEvent]
  );

  const value = useMemo<CableManagementContextValue>(
    () => ({ state, actions }),
    [state, actions]
  );

  return (
    <CableManagementContext.Provider value={value}>
      {children}
    </CableManagementContext.Provider>
  );
}

// ============================================================
// Hooks
// ============================================================

/**
 * Use full cable management context
 */
export function useCableManagement(): CableManagementContextValue {
  const context = useContext(CableManagementContext);
  if (!context) {
    throw new Error(
      'useCableManagement must be used within CableManagementProvider'
    );
  }
  return context;
}

/**
 * Use cable management state only
 */
export function useCableManagementState(): CableManagementState {
  const { state } = useCableManagement();
  return state;
}

/**
 * Use cable management actions only
 */
export function useCableManagementActions(): CableManagementActions {
  const { actions } = useCableManagement();
  return actions;
}

/**
 * Use specific cable state
 */
export function useCableState(cableId: string): CableState | undefined {
  const { state } = useCableManagement();
  return state.cableStates.get(cableId);
}

/**
 * Use specific cable config
 */
export function useCableConfig(cableId: string): CableConfig | undefined {
  const { actions } = useCableManagement();
  return actions.getCable(cableId);
}

/**
 * Use all cable states
 */
export function useAllCableStates(): Map<string, CableState> {
  const { state } = useCableManagement();
  return state.cableStates;
}

/**
 * Use all cable configs
 */
export function useAllCableConfigs(): Map<string, CableConfig> {
  const { state } = useCableManagement();
  return state.cables;
}

/**
 * Use maximum warning level
 */
export function useCableWarningLevel(): CableWarningLevel {
  const { actions } = useCableManagement();
  return actions.getMaxWarningLevel();
}

/**
 * Use display settings
 */
export function useCableDisplaySettings(): [
  CableDisplaySettings,
  (settings: Partial<CableDisplaySettings>) => void,
] {
  const { state, actions } = useCableManagement();
  return [state.displaySettings, actions.updateDisplaySettings];
}

/**
 * Use twist history
 */
export function useTwistHistory(): TwistHistoryPoint[] {
  const { state } = useCableManagement();
  return state.twistHistory;
}

/**
 * Use cable event subscription
 */
export function useCableEvents(handler: CableEventHandler): void {
  const { actions } = useCableManagement();

  useEffect(() => {
    return actions.subscribeToEvents(handler);
  }, [actions, handler]);
}
