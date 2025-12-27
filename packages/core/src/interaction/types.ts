/**
 * Interaction System Types
 *
 * Centralized keyboard shortcut and interaction management.
 */

/**
 * Keyboard shortcut definition
 */
export interface ShortcutDefinition {
  /** Unique identifier for this shortcut */
  id: string;
  /** The key to listen for (e.g., 'w', 'Enter', 'Escape') */
  key: string;
  /** Require Shift modifier */
  shift?: boolean;
  /** Require Ctrl/Cmd modifier */
  ctrl?: boolean;
  /** Require Alt/Option modifier */
  alt?: boolean;
  /** Human-readable description */
  description: string;
  /** Category for grouping in help displays */
  category?: string;
  /** Priority for conflict resolution (higher wins) */
  priority?: number;
  /** Whether this shortcut is currently enabled */
  enabled?: boolean;
}

/**
 * Registered shortcut with handler
 */
export interface RegisteredShortcut extends ShortcutDefinition {
  /** Handler function to call when shortcut is triggered */
  handler: () => void;
  /** Scope/namespace for the shortcut (e.g., 'workpoint', 'camera') */
  scope: string;
}

/**
 * Shortcut registration options
 */
export interface ShortcutRegistrationOptions {
  /** Scope/namespace for the shortcuts (e.g., 'workpoint', 'camera') */
  scope: string;
  /** Whether these shortcuts are currently active */
  enabled?: boolean;
  /** Priority for conflict resolution (higher wins) */
  priority?: number;
}

/**
 * Shortcut registry state
 */
export interface ShortcutRegistryState {
  /** All registered shortcuts by ID */
  shortcuts: Map<string, RegisteredShortcut>;
  /** Enabled scopes */
  enabledScopes: Set<string>;
  /** Global enabled state */
  globalEnabled: boolean;
}

/**
 * Shortcut match result
 */
export interface ShortcutMatch {
  shortcut: RegisteredShortcut;
  score: number;
}

/**
 * Keyboard event info (normalized)
 */
export interface KeyEventInfo {
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  target: HTMLElement;
}
