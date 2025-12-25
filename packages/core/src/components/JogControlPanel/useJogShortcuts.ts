/**
 * useJogShortcuts Hook
 *
 * Provides keyboard shortcut support for JogControlPanel.
 * Features:
 * - Global keyboard listeners
 * - Configurable key mappings
 * - Joint/axis selection state
 * - Modifier key support (Shift for coarse, Alt for fine)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { JogControlActions, JogControlState, JogAxis, StepSize } from './useRobotJogControl';
import {
  DEFAULT_JOG_SHORTCUTS,
  JOINT_ACTION_MAP,
  AXIS_ACTION_MAP,
  CONFIG_ACTION_MAP,
  STEP_SIZES,
  SHORTCUT_CATEGORY_NAMES,
  type JogShortcutAction,
  type JogShortcutConfig,
  type JogShortcutCategory,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface UseJogShortcutsOptions {
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Custom shortcut configuration (defaults to DEFAULT_JOG_SHORTCUTS) */
  shortcuts?: JogShortcutConfig[];
  /** Actions from useRobotJogControl */
  actions: JogControlActions;
  /** State from useRobotJogControl */
  state: JogControlState;
  /** Callback when help should be shown */
  onShowHelp?: () => void;
  /** Callback when help should be hidden */
  onHideHelp?: () => void;
  /** Callback when any shortcut is triggered */
  onShortcut?: (action: JogShortcutAction) => void;
}

export interface UseJogShortcutsResult {
  /** Current shortcut configuration */
  shortcuts: JogShortcutConfig[];
  /** Currently selected joint index (joint mode) */
  selectedJoint: number | null;
  /** Currently selected axis (cartesian mode) */
  selectedAxis: JogAxis | null;
  /** Whether help panel is showing */
  showingHelp: boolean;
  /** Manually trigger an action */
  triggerAction: (action: JogShortcutAction) => void;
  /** Toggle help panel visibility */
  toggleHelp: () => void;
  /** Set help panel visibility */
  setShowingHelp: (show: boolean) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useJogShortcuts(options: UseJogShortcutsOptions): UseJogShortcutsResult {
  const {
    enabled = true,
    shortcuts = DEFAULT_JOG_SHORTCUTS,
    actions,
    state,
    onShowHelp,
    onHideHelp,
    onShortcut,
  } = options;

  // Local state for selection and help
  const [selectedJoint, setSelectedJoint] = useState<number | null>(0); // Default to first joint
  const [selectedAxis, setSelectedAxis] = useState<JogAxis | null>('x'); // Default to X axis
  const [showingHelp, setShowingHelp] = useState(false);

  /**
   * Get the next step size in sequence
   */
  const getNextStepSize = useCallback((current: StepSize, direction: 1 | -1): StepSize => {
    const currentIndex = STEP_SIZES.indexOf(current);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0) return STEP_SIZES[0];
    if (nextIndex >= STEP_SIZES.length) return STEP_SIZES[STEP_SIZES.length - 1];
    return STEP_SIZES[nextIndex];
  }, []);

  /**
   * Handle shortcut action
   */
  const handleAction = useCallback(
    (action: JogShortcutAction, multiplier: number = 1) => {
      // Notify callback
      onShortcut?.(action);

      switch (action) {
        // Mode switching
        case 'toggleMode':
          actions.setMode(state.mode === 'joint' ? 'cartesian' : 'joint');
          break;

        // Joint selection
        case 'selectJoint1':
        case 'selectJoint2':
        case 'selectJoint3':
        case 'selectJoint4':
        case 'selectJoint5':
        case 'selectJoint6': {
          const jointIndex = JOINT_ACTION_MAP[action];
          if (jointIndex !== undefined && jointIndex < (state.currentJoints?.length || 6)) {
            setSelectedJoint(jointIndex);
          }
          break;
        }

        // Axis selection
        case 'selectAxisX':
        case 'selectAxisY':
        case 'selectAxisZ':
        case 'selectAxisRx':
        case 'selectAxisRy':
        case 'selectAxisRz': {
          const axis = AXIS_ACTION_MAP[action];
          if (axis) {
            setSelectedAxis(axis);
          }
          break;
        }

        // Jog operations
        case 'jogPositive':
        case 'jogPositiveCoarse':
        case 'jogPositiveFine': {
          const jogMultiplier = action === 'jogPositiveCoarse' ? 10 : action === 'jogPositiveFine' ? 0.1 : 1;
          if (state.mode === 'joint' && selectedJoint !== null) {
            // Temporarily adjust step, jog, then restore
            const originalStep = state.stepJoint;
            const tempStep = Math.min(10, Math.max(0.1, originalStep * jogMultiplier)) as StepSize;
            if (tempStep !== originalStep) actions.setStepJoint(tempStep);
            actions.jogJoint(selectedJoint, 1);
            if (tempStep !== originalStep) actions.setStepJoint(originalStep);
          } else if (state.mode === 'cartesian' && selectedAxis !== null) {
            const originalStep = state.stepCartesian;
            const tempStep = Math.min(10, Math.max(0.1, originalStep * jogMultiplier)) as StepSize;
            if (tempStep !== originalStep) actions.setStepCartesian(tempStep);
            actions.jogCartesian(selectedAxis, 1);
            if (tempStep !== originalStep) actions.setStepCartesian(originalStep);
          }
          break;
        }

        case 'jogNegative':
        case 'jogNegativeCoarse':
        case 'jogNegativeFine': {
          const jogMultiplier = action === 'jogNegativeCoarse' ? 10 : action === 'jogNegativeFine' ? 0.1 : 1;
          if (state.mode === 'joint' && selectedJoint !== null) {
            const originalStep = state.stepJoint;
            const tempStep = Math.min(10, Math.max(0.1, originalStep * jogMultiplier)) as StepSize;
            if (tempStep !== originalStep) actions.setStepJoint(tempStep);
            actions.jogJoint(selectedJoint, -1);
            if (tempStep !== originalStep) actions.setStepJoint(originalStep);
          } else if (state.mode === 'cartesian' && selectedAxis !== null) {
            const originalStep = state.stepCartesian;
            const tempStep = Math.min(10, Math.max(0.1, originalStep * jogMultiplier)) as StepSize;
            if (tempStep !== originalStep) actions.setStepCartesian(tempStep);
            actions.jogCartesian(selectedAxis, -1);
            if (tempStep !== originalStep) actions.setStepCartesian(originalStep);
          }
          break;
        }

        // Step size
        case 'stepIncrease':
          if (state.mode === 'joint') {
            actions.setStepJoint(getNextStepSize(state.stepJoint, 1));
          } else {
            actions.setStepCartesian(getNextStepSize(state.stepCartesian, 1));
          }
          break;

        case 'stepDecrease':
          if (state.mode === 'joint') {
            actions.setStepJoint(getNextStepSize(state.stepJoint, -1));
          } else {
            actions.setStepCartesian(getNextStepSize(state.stepCartesian, -1));
          }
          break;

        // IK config selection
        case 'selectConfig1':
        case 'selectConfig2':
        case 'selectConfig3':
        case 'selectConfig4':
        case 'selectConfig5':
        case 'selectConfig6':
        case 'selectConfig7':
        case 'selectConfig8': {
          const configIndex = CONFIG_ACTION_MAP[action];
          if (configIndex !== undefined && configIndex < state.ikSolutions.length) {
            actions.setSelectedConfig(configIndex);
          }
          break;
        }

        // Help
        case 'showHelp':
          setShowingHelp(true);
          onShowHelp?.();
          break;

        case 'hideHelp':
          setShowingHelp(false);
          onHideHelp?.();
          break;
      }
    },
    [actions, state, selectedJoint, selectedAxis, getNextStepSize, onShowHelp, onHideHelp, onShortcut]
  );

  /**
   * Match keyboard event to shortcut
   */
  const matchShortcut = useCallback(
    (event: KeyboardEvent): JogShortcutConfig | undefined => {
      return shortcuts.find((shortcut) => {
        // Check key match (case insensitive for letters)
        const eventKey = event.key;
        const shortcutKey = shortcut.key;

        const keyMatch =
          eventKey.toLowerCase() === shortcutKey.toLowerCase() ||
          eventKey === shortcutKey;

        if (!keyMatch) return false;

        // Check modifiers
        const shiftMatch = !!shortcut.shift === event.shiftKey;
        const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
        const altMatch = !!shortcut.alt === event.altKey;

        return shiftMatch && ctrlMatch && altMatch;
      });
    },
    [shortcuts]
  );

  /**
   * Keyboard event handler
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const shortcut = matchShortcut(event);
      if (shortcut) {
        event.preventDefault();
        event.stopPropagation();
        handleAction(shortcut.action);
      }
    },
    [matchShortcut, handleAction]
  );

  /**
   * Register keyboard event listener
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  /**
   * Toggle help visibility
   */
  const toggleHelp = useCallback(() => {
    setShowingHelp((prev) => {
      const newValue = !prev;
      if (newValue) {
        onShowHelp?.();
      } else {
        onHideHelp?.();
      }
      return newValue;
    });
  }, [onShowHelp, onHideHelp]);

  return {
    shortcuts,
    selectedJoint,
    selectedAxis,
    showingHelp,
    triggerAction: handleAction,
    toggleHelp,
    setShowingHelp,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format shortcut for display
 */
export function formatJogShortcut(shortcut: JogShortcutConfig): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  // Format special keys
  let keyDisplay = shortcut.key;
  switch (shortcut.key) {
    case ' ':
      keyDisplay = 'Space';
      break;
    case 'ArrowUp':
      keyDisplay = '↑';
      break;
    case 'ArrowDown':
      keyDisplay = '↓';
      break;
    case 'ArrowLeft':
      keyDisplay = '←';
      break;
    case 'ArrowRight':
      keyDisplay = '→';
      break;
    case 'Enter':
      keyDisplay = '↵';
      break;
    case 'Escape':
      keyDisplay = 'Esc';
      break;
    case 'Delete':
      keyDisplay = 'Del';
      break;
    case 'Backspace':
      keyDisplay = '⌫';
      break;
    case 'Tab':
      keyDisplay = 'Tab';
      break;
    default:
      // Capitalize single letters
      if (keyDisplay.length === 1) {
        keyDisplay = keyDisplay.toUpperCase();
      }
  }

  parts.push(keyDisplay);

  return parts.join('+');
}

/**
 * Get shortcuts grouped by category
 */
export function getJogShortcutsByCategory(
  shortcuts: JogShortcutConfig[] = DEFAULT_JOG_SHORTCUTS
): Record<JogShortcutCategory, JogShortcutConfig[]> {
  const result: Record<JogShortcutCategory, JogShortcutConfig[]> = {
    mode: [],
    joint: [],
    cartesian: [],
    jog: [],
    step: [],
    config: [],
    help: [],
  };

  for (const shortcut of shortcuts) {
    result[shortcut.category].push(shortcut);
  }

  return result;
}

/**
 * Get category display name
 */
export function getShortcutCategoryName(category: JogShortcutCategory): string {
  return SHORTCUT_CATEGORY_NAMES[category];
}

export default useJogShortcuts;
