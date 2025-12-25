/**
 * AngleLockContext
 *
 * React context for angle lock capability.
 * Manages tool angle constraints for welding and other processes.
 */

import * as React from 'react';
import { createContext, useContext, useMemo, useReducer, useEffect } from 'react';
import type {
  AngleLockState,
  AngleLockActions,
  AngleConstraint,
  AngleDisplaySettings,
  AngleLockProviderProps,
  AngleType,
  AngleViolation,
  AngleCorrection,
} from './types';

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_DISPLAY_SETTINGS: AngleDisplaySettings = {
  showCones: true,
  showLabels: true,
  showTargetGuides: true,
  coneOpacity: 0.4,
  coneSize: 0.05,
  colors: {
    valid: '#00ff88',
    warning: '#ffcc00',
    error: '#ff4444',
    target: '#4a9eff',
  },
};

const INITIAL_STATE: AngleLockState = {
  constraints: [],
  enabled: true,
  currentAngles: {
    work: 90,
    travel: 0,
    lead: 0,
    tilt: 0,
    rotation: 0,
  },
  constraintsSatisfied: true,
  violations: [],
  displaySettings: DEFAULT_DISPLAY_SETTINGS,
};

// ============================================================================
// Reducer
// ============================================================================

type Action =
  | { type: 'SET_ENABLED'; enabled: boolean }
  | { type: 'SET_CONSTRAINT'; constraint: AngleConstraint }
  | { type: 'UPDATE_CONSTRAINT'; angleType: AngleType; updates: Partial<AngleConstraint> }
  | { type: 'REMOVE_CONSTRAINT'; angleType: AngleType }
  | { type: 'TOGGLE_CONSTRAINT'; angleType: AngleType; enabled: boolean }
  | { type: 'SET_CONSTRAINTS'; constraints: AngleConstraint[] }
  | { type: 'CLEAR_CONSTRAINTS' }
  | { type: 'UPDATE_CURRENT_ANGLES'; angles: Record<AngleType, number> }
  | { type: 'SET_DISPLAY_SETTINGS'; settings: Partial<AngleDisplaySettings> };

function checkViolations(
  constraints: AngleConstraint[],
  currentAngles: Record<AngleType, number>
): { violations: AngleViolation[]; satisfied: boolean } {
  const violations: AngleViolation[] = [];

  for (const constraint of constraints) {
    if (!constraint.enabled) continue;

    const currentAngle = currentAngles[constraint.type] ?? 0;
    const deviation = Math.abs(currentAngle - constraint.targetAngle);
    const withinTolerance = deviation <= constraint.tolerance;

    if (!withinTolerance) {
      violations.push({
        constraintType: constraint.type,
        currentAngle,
        targetAngle: constraint.targetAngle,
        deviation,
        withinTolerance: false,
      });
    }
  }

  return {
    violations,
    satisfied: violations.length === 0,
  };
}

function reducer(state: AngleLockState, action: Action): AngleLockState {
  switch (action.type) {
    case 'SET_ENABLED':
      return { ...state, enabled: action.enabled };

    case 'SET_CONSTRAINT': {
      const existing = state.constraints.findIndex((c) => c.type === action.constraint.type);
      let newConstraints: AngleConstraint[];

      if (existing >= 0) {
        newConstraints = [...state.constraints];
        newConstraints[existing] = action.constraint;
      } else {
        newConstraints = [...state.constraints, action.constraint];
      }

      const { violations, satisfied } = checkViolations(newConstraints, state.currentAngles);
      return {
        ...state,
        constraints: newConstraints,
        violations,
        constraintsSatisfied: satisfied,
      };
    }

    case 'UPDATE_CONSTRAINT': {
      const index = state.constraints.findIndex((c) => c.type === action.angleType);
      if (index < 0) return state;

      const newConstraints = [...state.constraints];
      newConstraints[index] = { ...newConstraints[index], ...action.updates };

      const { violations, satisfied } = checkViolations(newConstraints, state.currentAngles);
      return {
        ...state,
        constraints: newConstraints,
        violations,
        constraintsSatisfied: satisfied,
      };
    }

    case 'REMOVE_CONSTRAINT': {
      const newConstraints = state.constraints.filter((c) => c.type !== action.angleType);
      const { violations, satisfied } = checkViolations(newConstraints, state.currentAngles);
      return {
        ...state,
        constraints: newConstraints,
        violations,
        constraintsSatisfied: satisfied,
      };
    }

    case 'TOGGLE_CONSTRAINT': {
      const index = state.constraints.findIndex((c) => c.type === action.angleType);
      if (index < 0) return state;

      const newConstraints = [...state.constraints];
      newConstraints[index] = { ...newConstraints[index], enabled: action.enabled };

      const { violations, satisfied } = checkViolations(newConstraints, state.currentAngles);
      return {
        ...state,
        constraints: newConstraints,
        violations,
        constraintsSatisfied: satisfied,
      };
    }

    case 'SET_CONSTRAINTS': {
      const { violations, satisfied } = checkViolations(action.constraints, state.currentAngles);
      return {
        ...state,
        constraints: action.constraints,
        violations,
        constraintsSatisfied: satisfied,
      };
    }

    case 'CLEAR_CONSTRAINTS':
      return {
        ...state,
        constraints: [],
        violations: [],
        constraintsSatisfied: true,
      };

    case 'UPDATE_CURRENT_ANGLES': {
      const { violations, satisfied } = checkViolations(state.constraints, action.angles);
      return {
        ...state,
        currentAngles: action.angles,
        violations,
        constraintsSatisfied: satisfied,
      };
    }

    case 'SET_DISPLAY_SETTINGS':
      return {
        ...state,
        displaySettings: { ...state.displaySettings, ...action.settings },
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface AngleLockContextValue {
  state: AngleLockState;
  actions: AngleLockActions;
}

const AngleLockContext = createContext<AngleLockContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function AngleLockProvider({
  children,
  constraints: initialConstraints = [],
  enabled = true,
  displaySettings: initialDisplaySettings,
  onConstraintsChange,
  onViolationChange,
}: AngleLockProviderProps): React.JSX.Element {
  const initialState = useMemo(
    () => ({
      ...INITIAL_STATE,
      constraints: initialConstraints,
      enabled,
      displaySettings: { ...DEFAULT_DISPLAY_SETTINGS, ...initialDisplaySettings },
    }),
    [] // Only on mount
  );

  const [state, dispatch] = useReducer(reducer, initialState);

  // Actions
  const actions = useMemo<AngleLockActions>(() => {
    const setEnabled = (enabled: boolean) => {
      dispatch({ type: 'SET_ENABLED', enabled });
    };

    const setConstraint = (constraint: AngleConstraint) => {
      dispatch({ type: 'SET_CONSTRAINT', constraint });
    };

    const updateConstraint = (type: AngleType, updates: Partial<AngleConstraint>) => {
      dispatch({ type: 'UPDATE_CONSTRAINT', angleType: type, updates });
    };

    const removeConstraint = (type: AngleType) => {
      dispatch({ type: 'REMOVE_CONSTRAINT', angleType: type });
    };

    const toggleConstraint = (type: AngleType, enabled: boolean) => {
      dispatch({ type: 'TOGGLE_CONSTRAINT', angleType: type, enabled });
    };

    const setConstraints = (constraints: AngleConstraint[]) => {
      dispatch({ type: 'SET_CONSTRAINTS', constraints });
    };

    const clearConstraints = () => {
      dispatch({ type: 'CLEAR_CONSTRAINTS' });
    };

    const updateCurrentAngles = (angles: Record<AngleType, number>) => {
      dispatch({ type: 'UPDATE_CURRENT_ANGLES', angles });
    };

    const setDisplaySettings = (settings: Partial<AngleDisplaySettings>) => {
      dispatch({ type: 'SET_DISPLAY_SETTINGS', settings });
    };

    const getSuggestedCorrection = (): AngleCorrection | null => {
      // Simple correction suggestion based on violations
      // In real implementation, this would use IK to compute actual corrections
      if (state.violations.length === 0) return null;

      let rx = 0;
      let ry = 0;
      let rz = 0;

      for (const violation of state.violations) {
        const correction = violation.targetAngle - violation.currentAngle;

        switch (violation.constraintType) {
          case 'work':
            ry += correction;
            break;
          case 'travel':
          case 'lead':
            rx += correction;
            break;
          case 'tilt':
            rx += correction * 0.5;
            ry += correction * 0.5;
            break;
          case 'rotation':
            rz += correction;
            break;
        }
      }

      const magnitude = Math.sqrt(rx * rx + ry * ry + rz * rz);

      return { rx, ry, rz, magnitude };
    };

    return {
      setEnabled,
      setConstraint,
      updateConstraint,
      removeConstraint,
      toggleConstraint,
      setConstraints,
      clearConstraints,
      updateCurrentAngles,
      setDisplaySettings,
      getSuggestedCorrection,
    };
  }, [state.violations]);

  // Notify on constraints change
  useEffect(() => {
    onConstraintsChange?.(state.constraints);
  }, [state.constraints, onConstraintsChange]);

  // Notify on violation change
  useEffect(() => {
    onViolationChange?.(state.violations);
  }, [state.violations, onViolationChange]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <AngleLockContext.Provider value={value}>{children}</AngleLockContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access angle lock context
 */
export function useAngleLock(): AngleLockContextValue {
  const context = useContext(AngleLockContext);
  if (!context) {
    throw new Error('useAngleLock must be used within AngleLockProvider');
  }
  return context;
}

/**
 * Get angle lock state only
 */
export function useAngleLockState(): AngleLockState {
  return useAngleLock().state;
}

/**
 * Get angle lock actions only
 */
export function useAngleLockActions(): AngleLockActions {
  return useAngleLock().actions;
}

/**
 * Get current constraints
 */
export function useAngleConstraints(): AngleConstraint[] {
  return useAngleLock().state.constraints;
}

/**
 * Check if all constraints are satisfied
 */
export function useConstraintsSatisfied(): boolean {
  return useAngleLock().state.constraintsSatisfied;
}

/**
 * Get current violations
 */
export function useAngleViolations(): AngleViolation[] {
  return useAngleLock().state.violations;
}

/**
 * Get a specific angle constraint
 */
export function useAngleConstraint(type: AngleType): AngleConstraint | undefined {
  const constraints = useAngleLock().state.constraints;
  return useMemo(() => constraints.find((c) => c.type === type), [constraints, type]);
}
