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
