/**
 * JogControlPanel - Industrial Robot Jog Control System
 *
 * A complete jog control panel for industrial robots with:
 * - Bidirectional joint/Cartesian synchronization
 * - Step-based and continuous jogging
 * - Precise numeric input
 * - Multi-solution IK selection
 * - Safety indicators
 * - Keyboard shortcuts (press ? for help)
 */

export { JogControlPanel, type JogControlPanelProps } from './JogControlPanel';
export { JogButton, type JogButtonProps } from './JogButton';
export { NumericDisplay, type NumericDisplayProps } from './NumericDisplay';
export { JointJogRow, type JointJogRowProps } from './JointJogRow';
export { CartesianJogRow, type CartesianJogRowProps } from './CartesianJogRow';
export { JogShortcutsHelp, type JogShortcutsHelpProps } from './JogShortcutsHelp';
export {
  useRobotJogControl,
  type UseRobotJogControlOptions,
  type JogControlState,
  type JogControlActions,
  type JogMode,
  type JogAxis,
  type StepSize,
} from './useRobotJogControl';
export {
  useJogShortcuts,
  formatJogShortcut,
  getJogShortcutsByCategory,
  getShortcutCategoryName,
  type UseJogShortcutsOptions,
  type UseJogShortcutsResult,
} from './useJogShortcuts';
export {
  DEFAULT_JOG_SHORTCUTS,
  SHORTCUT_CATEGORY_NAMES,
  JOINT_ACTION_MAP,
  AXIS_ACTION_MAP,
  CONFIG_ACTION_MAP,
  STEP_SIZES,
  type JogShortcutAction,
  type JogShortcutConfig,
  type JogShortcutCategory,
} from './types';
