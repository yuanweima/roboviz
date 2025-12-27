/**
 * useGlobalShortcuts Hook
 *
 * Hook for registering and managing keyboard shortcuts within a component.
 * Shortcuts are automatically unregistered when the component unmounts.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useShortcutRegistry, createShortcutId } from './shortcutRegistry';
import type { ShortcutDefinition, ShortcutRegistrationOptions } from './types';

/**
 * Shortcut definition with handler
 */
export interface ShortcutWithHandler extends Omit<ShortcutDefinition, 'id'> {
  /** Action identifier (used as part of full ID) */
  action: string;
  /** Handler function */
  handler: () => void;
}

/**
 * Options for useGlobalShortcuts hook
 */
export interface UseGlobalShortcutsOptions extends ShortcutRegistrationOptions {
  /** Whether shortcuts are currently enabled */
  enabled?: boolean;
  /** Shortcuts to register */
  shortcuts: ShortcutWithHandler[];
}

/**
 * Hook for registering global keyboard shortcuts
 *
 * @example
 * ```tsx
 * useGlobalShortcuts({
 *   scope: 'camera',
 *   enabled: true,
 *   shortcuts: [
 *     {
 *       action: 'reset',
 *       key: 'r',
 *       ctrl: true,
 *       description: 'Reset camera',
 *       handler: () => resetCamera(),
 *     },
 *   ],
 * });
 * ```
 */
export function useGlobalShortcuts(options: UseGlobalShortcutsOptions): void {
  const { scope, enabled = true, priority = 0, shortcuts } = options;

  const { register, unregister, enableScope, disableScope } = useShortcutRegistry();

  // Track registered shortcut IDs for cleanup
  const registeredIds = useRef<string[]>([]);

  // Register/update shortcuts when they change
  useEffect(() => {
    // Unregister previous shortcuts
    for (const fullId of registeredIds.current) {
      unregister(fullId);
    }
    registeredIds.current = [];

    // Register new shortcuts
    for (const shortcut of shortcuts) {
      const fullId = createShortcutId(scope, shortcut.action);
      register({
        id: shortcut.action,
        key: shortcut.key,
        shift: shortcut.shift,
        ctrl: shortcut.ctrl,
        alt: shortcut.alt,
        description: shortcut.description,
        category: shortcut.category,
        priority: shortcut.priority ?? priority,
        enabled: shortcut.enabled ?? true,
        handler: shortcut.handler,
        scope,
      });
      registeredIds.current.push(fullId);
    }

    // Cleanup on unmount
    return () => {
      for (const fullId of registeredIds.current) {
        unregister(fullId);
      }
      registeredIds.current = [];
    };
  }, [scope, shortcuts, priority, register, unregister]);

  // Enable/disable scope based on enabled prop
  useEffect(() => {
    if (enabled) {
      enableScope(scope);
    } else {
      disableScope(scope);
    }

    return () => {
      disableScope(scope);
    };
  }, [scope, enabled, enableScope, disableScope]);
}

/**
 * Simple hook for a single shortcut
 */
export function useShortcut(
  scope: string,
  action: string,
  key: string,
  handler: () => void,
  options: {
    shift?: boolean;
    ctrl?: boolean;
    alt?: boolean;
    description?: string;
    enabled?: boolean;
    priority?: number;
  } = {}
): void {
  const { shift, ctrl, alt, description = '', enabled = true, priority = 0 } = options;

  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const stableHandler = useCallback(() => {
    handlerRef.current();
  }, []);

  useGlobalShortcuts({
    scope,
    enabled,
    priority,
    shortcuts: [
      {
        action,
        key,
        shift,
        ctrl,
        alt,
        description,
        handler: stableHandler,
      },
    ],
  });
}
