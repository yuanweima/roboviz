/**
 * InteractionProvider Component
 *
 * Global provider for handling keyboard shortcuts and other interactions.
 * Should wrap the application or scene to enable shortcut handling.
 */

import * as React from 'react';
import { createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { useShortcutRegistry } from './shortcutRegistry';
import type { KeyEventInfo, RegisteredShortcut } from './types';

// =============================================================================
// Types
// =============================================================================

export interface InteractionContextValue {
  /** Whether global shortcuts are enabled */
  enabled: boolean;
  /** Set global enabled state */
  setEnabled: (enabled: boolean) => void;
  /** Get all registered shortcuts */
  getShortcuts: () => RegisteredShortcut[];
  /** Get shortcuts grouped by scope */
  getShortcutsByScope: () => Map<string, RegisteredShortcut[]>;
  /** Enable a specific scope */
  enableScope: (scope: string) => void;
  /** Disable a specific scope */
  disableScope: (scope: string) => void;
  /** Check if a scope is enabled */
  isScopeEnabled: (scope: string) => boolean;
}

// =============================================================================
// Context
// =============================================================================

const InteractionContext = createContext<InteractionContextValue | null>(null);

/**
 * Hook to access interaction context
 */
export function useInteraction(): InteractionContextValue {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteraction must be used within InteractionProvider');
  }
  return context;
}

/**
 * Hook to safely access interaction context (returns null if not in provider)
 */
export function useInteractionOptional(): InteractionContextValue | null {
  return useContext(InteractionContext);
}

// =============================================================================
// Provider Component
// =============================================================================

export interface InteractionProviderProps {
  children: React.ReactNode;
  /** Whether shortcuts are globally enabled (default: true) */
  enabled?: boolean;
  /** Callback when any shortcut is triggered */
  onShortcut?: (shortcut: RegisteredShortcut) => void;
  /** Elements to exclude from shortcut handling (e.g., input fields) */
  excludeElements?: string[];
}

/**
 * Provider component for global interaction handling
 *
 * @example
 * ```tsx
 * <InteractionProvider>
 *   <App />
 * </InteractionProvider>
 * ```
 */
export function InteractionProvider({
  children,
  enabled: enabledProp = true,
  onShortcut,
  excludeElements = ['INPUT', 'TEXTAREA', 'SELECT'],
}: InteractionProviderProps): React.JSX.Element {
  const {
    globalEnabled,
    setGlobalEnabled,
    enabledScopes,
    matchShortcut,
    getAllShortcuts,
    getShortcutsByScope,
    enableScope,
    disableScope,
  } = useShortcutRegistry();

  const onShortcutRef = useRef(onShortcut);
  useEffect(() => {
    onShortcutRef.current = onShortcut;
  }, [onShortcut]);

  // Sync enabled prop with store
  useEffect(() => {
    setGlobalEnabled(enabledProp);
  }, [enabledProp, setGlobalEnabled]);

  /**
   * Check if element should be excluded
   */
  const shouldExcludeElement = useCallback(
    (element: HTMLElement): boolean => {
      // Check tag name
      if (excludeElements.includes(element.tagName)) {
        return true;
      }

      // Check contenteditable
      if (element.isContentEditable) {
        return true;
      }

      // Check for custom exclusion attribute
      if (element.dataset.shortcutsDisabled === 'true') {
        return true;
      }

      return false;
    },
    [excludeElements]
  );

  /**
   * Keyboard event handler
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if typing in excluded element
      const target = event.target as HTMLElement;
      if (shouldExcludeElement(target)) {
        return;
      }

      // Normalize event info
      const eventInfo: KeyEventInfo = {
        key: event.key,
        shift: event.shiftKey,
        ctrl: event.ctrlKey || event.metaKey,
        alt: event.altKey,
        target,
      };

      // Try to match shortcut
      const match = matchShortcut(eventInfo);

      if (match) {
        event.preventDefault();
        event.stopPropagation();

        // Call handler
        match.shortcut.handler();

        // Notify callback
        onShortcutRef.current?.(match.shortcut);
      }
    },
    [matchShortcut, shouldExcludeElement]
  );

  /**
   * Register keyboard event listener
   */
  useEffect(() => {
    if (!globalEnabled) return;

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [globalEnabled, handleKeyDown]);

  /**
   * Check if scope is enabled
   */
  const isScopeEnabled = useCallback(
    (scope: string) => enabledScopes.has(scope),
    [enabledScopes]
  );

  /**
   * Context value
   */
  const contextValue = useMemo<InteractionContextValue>(
    () => ({
      enabled: globalEnabled,
      setEnabled: setGlobalEnabled,
      getShortcuts: getAllShortcuts,
      getShortcutsByScope,
      enableScope,
      disableScope,
      isScopeEnabled,
    }),
    [
      globalEnabled,
      setGlobalEnabled,
      getAllShortcuts,
      getShortcutsByScope,
      enableScope,
      disableScope,
      isScopeEnabled,
    ]
  );

  return (
    <InteractionContext.Provider value={contextValue}>
      {children}
    </InteractionContext.Provider>
  );
}

// =============================================================================
// Shortcut Help Component
// =============================================================================

export interface ShortcutHelpProps {
  /** Filter to specific scopes */
  scopes?: string[];
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Component to display available shortcuts
 */
export function ShortcutHelp({
  scopes,
  className,
  style,
}: ShortcutHelpProps): React.JSX.Element {
  const { getShortcutsByScope } = useInteraction();

  const shortcutsByScope = getShortcutsByScope();

  // Filter to requested scopes
  const filteredScopes = scopes
    ? Array.from(shortcutsByScope.entries()).filter(([scope]) =>
        scopes.includes(scope)
      )
    : Array.from(shortcutsByScope.entries());

  return (
    <div className={className} style={style}>
      {filteredScopes.map(([scope, shortcuts]) => (
        <div key={scope} style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
            {scope}
          </div>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {shortcuts.map((shortcut) => (
                <tr key={shortcut.id}>
                  <td style={{ padding: '0.25rem 0.5rem', fontFamily: 'monospace' }}>
                    {formatShortcutKey(shortcut)}
                  </td>
                  <td style={{ padding: '0.25rem 0.5rem' }}>
                    {shortcut.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/**
 * Format shortcut key for display
 */
function formatShortcutKey(shortcut: RegisteredShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  let keyDisplay = shortcut.key;
  if (shortcut.key === ' ') keyDisplay = 'Space';
  if (shortcut.key === 'Enter') keyDisplay = 'Enter';
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';

  parts.push(keyDisplay.toUpperCase());

  return parts.join(' + ');
}
