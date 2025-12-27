/**
 * Interaction System
 *
 * Centralized keyboard shortcut and interaction management for RoboViz.
 */

// Types
export * from './types';

// Registry
export {
  useShortcutRegistry,
  createShortcutId,
  checkShortcutConflicts,
  formatShortcut as formatGlobalShortcut,
} from './shortcutRegistry';

// Hooks
export {
  useGlobalShortcuts,
  useShortcut,
  type ShortcutWithHandler,
  type UseGlobalShortcutsOptions,
} from './useGlobalShortcuts';

// Provider
export {
  InteractionProvider,
  useInteraction,
  useInteractionOptional,
  ShortcutHelp,
  type InteractionProviderProps,
  type InteractionContextValue,
  type ShortcutHelpProps,
} from './InteractionProvider';
