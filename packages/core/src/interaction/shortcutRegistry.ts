/**
 * Shortcut Registry
 *
 * Centralized management of keyboard shortcuts across the application.
 * Handles registration, conflict resolution, and matching.
 */

import { create } from 'zustand';
import type {
  RegisteredShortcut,
  ShortcutDefinition,
  ShortcutMatch,
  KeyEventInfo,
} from './types';

/**
 * Shortcut registry store
 */
interface ShortcutRegistryStore {
  /** All registered shortcuts by their full ID (scope:id) */
  shortcuts: Map<string, RegisteredShortcut>;
  /** Enabled scopes */
  enabledScopes: Set<string>;
  /** Global enabled state */
  globalEnabled: boolean;

  // Actions
  register: (shortcut: RegisteredShortcut) => void;
  unregister: (fullId: string) => void;
  unregisterScope: (scope: string) => void;
  enableScope: (scope: string) => void;
  disableScope: (scope: string) => void;
  setGlobalEnabled: (enabled: boolean) => void;
  matchShortcut: (event: KeyEventInfo) => ShortcutMatch | null;
  getShortcutsByScope: () => Map<string, RegisteredShortcut[]>;
  getAllShortcuts: () => RegisteredShortcut[];
}

/**
 * Check if two shortcuts match the same key combination
 */
function shortcutsConflict(a: ShortcutDefinition, b: ShortcutDefinition): boolean {
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    !!a.shift === !!b.shift &&
    !!a.ctrl === !!b.ctrl &&
    !!a.alt === !!b.alt
  );
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
function eventMatchesShortcut(event: KeyEventInfo, shortcut: ShortcutDefinition): boolean {
  // Check key match (case insensitive)
  const keyMatch =
    event.key.toLowerCase() === shortcut.key.toLowerCase() ||
    event.key === shortcut.key;

  if (!keyMatch) return false;

  // Check modifiers
  const shiftMatch = !!shortcut.shift === event.shift;
  const ctrlMatch = !!shortcut.ctrl === event.ctrl;
  const altMatch = !!shortcut.alt === event.alt;

  return shiftMatch && ctrlMatch && altMatch;
}

/**
 * Create full shortcut ID from scope and id
 */
export function createShortcutId(scope: string, id: string): string {
  return `${scope}:${id}`;
}

/**
 * Shortcut registry store
 */
export const useShortcutRegistry = create<ShortcutRegistryStore>((set, get) => ({
  shortcuts: new Map(),
  enabledScopes: new Set(),
  globalEnabled: true,

  register: (shortcut) => {
    set((state) => {
      const fullId = createShortcutId(shortcut.scope, shortcut.id);
      const newShortcuts = new Map(state.shortcuts);
      newShortcuts.set(fullId, shortcut);
      return { shortcuts: newShortcuts };
    });
  },

  unregister: (fullId) => {
    set((state) => {
      const newShortcuts = new Map(state.shortcuts);
      newShortcuts.delete(fullId);
      return { shortcuts: newShortcuts };
    });
  },

  unregisterScope: (scope) => {
    set((state) => {
      const newShortcuts = new Map(state.shortcuts);
      const prefix = `${scope}:`;
      for (const key of newShortcuts.keys()) {
        if (key.startsWith(prefix)) {
          newShortcuts.delete(key);
        }
      }
      return { shortcuts: newShortcuts };
    });
  },

  enableScope: (scope) => {
    set((state) => {
      const newScopes = new Set(state.enabledScopes);
      newScopes.add(scope);
      return { enabledScopes: newScopes };
    });
  },

  disableScope: (scope) => {
    set((state) => {
      const newScopes = new Set(state.enabledScopes);
      newScopes.delete(scope);
      return { enabledScopes: newScopes };
    });
  },

  setGlobalEnabled: (enabled) => {
    set({ globalEnabled: enabled });
  },

  matchShortcut: (event) => {
    const { shortcuts, enabledScopes, globalEnabled } = get();

    if (!globalEnabled) return null;

    // Find all matching shortcuts
    const matches: ShortcutMatch[] = [];

    for (const shortcut of shortcuts.values()) {
      // Skip if scope is not enabled
      if (!enabledScopes.has(shortcut.scope)) continue;

      // Skip if shortcut is disabled
      if (shortcut.enabled === false) continue;

      // Check if event matches
      if (eventMatchesShortcut(event, shortcut)) {
        // Calculate match score (higher priority wins)
        const score = shortcut.priority ?? 0;
        matches.push({ shortcut, score });
      }
    }

    if (matches.length === 0) return null;

    // Sort by score (descending) and return highest
    matches.sort((a, b) => b.score - a.score);
    return matches[0];
  },

  getShortcutsByScope: () => {
    const { shortcuts } = get();
    const byScope = new Map<string, RegisteredShortcut[]>();

    for (const shortcut of shortcuts.values()) {
      const existing = byScope.get(shortcut.scope) || [];
      existing.push(shortcut);
      byScope.set(shortcut.scope, existing);
    }

    return byScope;
  },

  getAllShortcuts: () => {
    return Array.from(get().shortcuts.values());
  },
}));

/**
 * Check for conflicts in registered shortcuts
 */
export function checkShortcutConflicts(): Array<{
  shortcut1: RegisteredShortcut;
  shortcut2: RegisteredShortcut;
}> {
  const conflicts: Array<{
    shortcut1: RegisteredShortcut;
    shortcut2: RegisteredShortcut;
  }> = [];

  const shortcuts = useShortcutRegistry.getState().getAllShortcuts();

  for (let i = 0; i < shortcuts.length; i++) {
    for (let j = i + 1; j < shortcuts.length; j++) {
      if (shortcutsConflict(shortcuts[i], shortcuts[j])) {
        conflicts.push({
          shortcut1: shortcuts[i],
          shortcut2: shortcuts[j],
        });
      }
    }
  }

  return conflicts;
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: ShortcutDefinition): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  // Format special keys
  let keyDisplay = shortcut.key;
  if (shortcut.key === ' ') keyDisplay = 'Space';
  if (shortcut.key === 'Enter') keyDisplay = '↵';
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  if (shortcut.key === 'Delete') keyDisplay = 'Del';
  if (shortcut.key === 'Backspace') keyDisplay = '⌫';
  if (shortcut.key === 'Tab') keyDisplay = 'Tab';
  if (shortcut.key === 'ArrowUp') keyDisplay = '↑';
  if (shortcut.key === 'ArrowDown') keyDisplay = '↓';
  if (shortcut.key === 'ArrowLeft') keyDisplay = '←';
  if (shortcut.key === 'ArrowRight') keyDisplay = '→';

  parts.push(keyDisplay.toUpperCase());

  return parts.join('+');
}
