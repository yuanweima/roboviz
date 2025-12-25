/**
 * JogControlPanel Types
 *
 * Type definitions for keyboard shortcuts and jog control.
 */

import type { JogAxis, JogMode, StepSize } from './useRobotJogControl';

// ============================================================================
// Shortcut Action Types
// ============================================================================

/**
 * All available shortcut actions
 */
export type JogShortcutAction =
  // Mode switching
  | 'toggleMode'
  // Joint selection (joint mode)
  | 'selectJoint1'
  | 'selectJoint2'
  | 'selectJoint3'
  | 'selectJoint4'
  | 'selectJoint5'
  | 'selectJoint6'
  // Axis selection (cartesian mode)
  | 'selectAxisX'
  | 'selectAxisY'
  | 'selectAxisZ'
  | 'selectAxisRx'
  | 'selectAxisRy'
  | 'selectAxisRz'
  // Jog operations
  | 'jogPositive'
  | 'jogNegative'
  | 'jogPositiveCoarse'
  | 'jogNegativeCoarse'
  | 'jogPositiveFine'
  | 'jogNegativeFine'
  // Step size
  | 'stepIncrease'
  | 'stepDecrease'
  // IK config selection (cartesian mode)
  | 'selectConfig1'
  | 'selectConfig2'
  | 'selectConfig3'
  | 'selectConfig4'
  | 'selectConfig5'
  | 'selectConfig6'
  | 'selectConfig7'
  | 'selectConfig8'
  // Help
  | 'showHelp'
  | 'hideHelp';

/**
 * Shortcut category for grouping in help display
 */
export type JogShortcutCategory =
  | 'mode'
  | 'joint'
  | 'cartesian'
  | 'jog'
  | 'step'
  | 'config'
  | 'help';

/**
 * Single shortcut configuration
 */
export interface JogShortcutConfig {
  /** Key to press (e.g., 'ArrowUp', 'm', '1') */
  key: string;
  /** Requires Shift modifier */
  shift?: boolean;
  /** Requires Ctrl/Cmd modifier */
  ctrl?: boolean;
  /** Requires Alt modifier */
  alt?: boolean;
  /** Action to trigger */
  action: JogShortcutAction;
  /** Human-readable description */
  description: string;
  /** Category for grouping */
  category: JogShortcutCategory;
}

// ============================================================================
// Default Shortcuts
// ============================================================================

/**
 * Default keyboard shortcuts for JogControlPanel
 */
export const DEFAULT_JOG_SHORTCUTS: JogShortcutConfig[] = [
  // Mode switching
  { key: 'm', action: 'toggleMode', description: 'Toggle Joint/Cartesian mode', category: 'mode' },

  // Joint selection (works in joint mode)
  { key: '1', action: 'selectJoint1', description: 'Select Joint 1', category: 'joint' },
  { key: '2', action: 'selectJoint2', description: 'Select Joint 2', category: 'joint' },
  { key: '3', action: 'selectJoint3', description: 'Select Joint 3', category: 'joint' },
  { key: '4', action: 'selectJoint4', description: 'Select Joint 4', category: 'joint' },
  { key: '5', action: 'selectJoint5', description: 'Select Joint 5', category: 'joint' },
  { key: '6', action: 'selectJoint6', description: 'Select Joint 6', category: 'joint' },

  // Axis selection (works in cartesian mode)
  { key: 'x', action: 'selectAxisX', description: 'Select X axis', category: 'cartesian' },
  { key: 'y', action: 'selectAxisY', description: 'Select Y axis', category: 'cartesian' },
  { key: 'z', action: 'selectAxisZ', description: 'Select Z axis', category: 'cartesian' },
  { key: 'x', shift: true, action: 'selectAxisRx', description: 'Select Rx axis', category: 'cartesian' },
  { key: 'y', shift: true, action: 'selectAxisRy', description: 'Select Ry axis', category: 'cartesian' },
  { key: 'z', shift: true, action: 'selectAxisRz', description: 'Select Rz axis', category: 'cartesian' },

  // Jog operations
  { key: 'ArrowUp', action: 'jogPositive', description: 'Jog positive (+step)', category: 'jog' },
  { key: 'ArrowDown', action: 'jogNegative', description: 'Jog negative (-step)', category: 'jog' },
  { key: 'ArrowUp', shift: true, action: 'jogPositiveCoarse', description: 'Jog positive (10x step)', category: 'jog' },
  { key: 'ArrowDown', shift: true, action: 'jogNegativeCoarse', description: 'Jog negative (10x step)', category: 'jog' },
  { key: 'ArrowUp', alt: true, action: 'jogPositiveFine', description: 'Jog positive (0.1x step)', category: 'jog' },
  { key: 'ArrowDown', alt: true, action: 'jogNegativeFine', description: 'Jog negative (0.1x step)', category: 'jog' },

  // Step size
  { key: '[', action: 'stepDecrease', description: 'Decrease step size', category: 'step' },
  { key: ']', action: 'stepIncrease', description: 'Increase step size', category: 'step' },

  // IK config selection (cartesian mode, uses Ctrl+number to avoid conflict with joint selection)
  { key: '1', ctrl: true, action: 'selectConfig1', description: 'Select IK config 1', category: 'config' },
  { key: '2', ctrl: true, action: 'selectConfig2', description: 'Select IK config 2', category: 'config' },
  { key: '3', ctrl: true, action: 'selectConfig3', description: 'Select IK config 3', category: 'config' },
  { key: '4', ctrl: true, action: 'selectConfig4', description: 'Select IK config 4', category: 'config' },
  { key: '5', ctrl: true, action: 'selectConfig5', description: 'Select IK config 5', category: 'config' },
  { key: '6', ctrl: true, action: 'selectConfig6', description: 'Select IK config 6', category: 'config' },
  { key: '7', ctrl: true, action: 'selectConfig7', description: 'Select IK config 7', category: 'config' },
  { key: '8', ctrl: true, action: 'selectConfig8', description: 'Select IK config 8', category: 'config' },

  // Help
  { key: '?', action: 'showHelp', description: 'Show keyboard shortcuts', category: 'help' },
  { key: 'h', action: 'showHelp', description: 'Show keyboard shortcuts', category: 'help' },
  { key: 'Escape', action: 'hideHelp', description: 'Close help panel', category: 'help' },
];

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Category display names
 */
export const SHORTCUT_CATEGORY_NAMES: Record<JogShortcutCategory, string> = {
  mode: 'Mode',
  joint: 'Joint Selection',
  cartesian: 'Axis Selection',
  jog: 'Jog Control',
  step: 'Step Size',
  config: 'IK Configuration',
  help: 'Help',
};

/**
 * Map joint selection actions to joint index
 */
export const JOINT_ACTION_MAP: Partial<Record<JogShortcutAction, number>> = {
  selectJoint1: 0,
  selectJoint2: 1,
  selectJoint3: 2,
  selectJoint4: 3,
  selectJoint5: 4,
  selectJoint6: 5,
};

/**
 * Map axis selection actions to axis
 */
export const AXIS_ACTION_MAP: Partial<Record<JogShortcutAction, JogAxis>> = {
  selectAxisX: 'x',
  selectAxisY: 'y',
  selectAxisZ: 'z',
  selectAxisRx: 'rx',
  selectAxisRy: 'ry',
  selectAxisRz: 'rz',
};

/**
 * Map config selection actions to config index
 */
export const CONFIG_ACTION_MAP: Partial<Record<JogShortcutAction, number>> = {
  selectConfig1: 0,
  selectConfig2: 1,
  selectConfig3: 2,
  selectConfig4: 3,
  selectConfig5: 4,
  selectConfig6: 5,
  selectConfig7: 6,
  selectConfig8: 7,
};

/**
 * Step size order for cycling
 */
export const STEP_SIZES: StepSize[] = [0.1, 1, 10];
