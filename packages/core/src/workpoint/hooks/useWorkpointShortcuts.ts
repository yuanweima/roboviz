/**
 * useWorkpointShortcuts Hook
 *
 * Handles keyboard shortcuts for the workpoint system including
 * mode switching, workpoint creation, rotation, deletion, etc.
 */

import { useCallback, useEffect } from 'react';
import { useWorkpointStore } from '../store';
import type { WorkpointType, GizmoMode } from '../types';

/**
 * Shortcut action types
 */
export type WorkpointShortcutAction =
  | 'toggleMode'
  | 'confirmPoint'
  | 'rotatePreviewCW'
  | 'rotatePreviewCCW'
  | 'deleteSelected'
  | 'deselectOrExit'
  | 'setTypeNormal'
  | 'setTypeCamera'
  | 'setTypeWeld'
  | 'setTypeSpray'
  | 'setTypeMeasure'
  | 'gizmoTranslate'
  | 'gizmoRotate'
  | 'selectNext'
  | 'selectPrevious';

/**
 * Shortcut configuration
 */
export interface ShortcutConfig {
  key: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  action: WorkpointShortcutAction;
  description: string;
}

/**
 * Default shortcut configuration
 */
export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  { key: 'w', action: 'toggleMode', description: 'Toggle workpoint edit mode' },
  { key: 'Enter', action: 'confirmPoint', description: 'Create workpoint' },
  { key: ' ', action: 'confirmPoint', description: 'Create workpoint' },
  { key: 'r', action: 'rotatePreviewCW', description: 'Rotate preview clockwise' },
  {
    key: 'r',
    shift: true,
    action: 'rotatePreviewCCW',
    description: 'Rotate preview counter-clockwise',
  },
  { key: 'Delete', action: 'deleteSelected', description: 'Delete selected workpoint' },
  { key: 'Backspace', action: 'deleteSelected', description: 'Delete selected workpoint' },
  { key: 'Escape', action: 'deselectOrExit', description: 'Deselect or exit mode' },
  { key: '1', action: 'setTypeNormal', description: 'Set type: Normal' },
  { key: '2', action: 'setTypeCamera', description: 'Set type: Camera' },
  { key: '3', action: 'setTypeWeld', description: 'Set type: Weld' },
  { key: '4', action: 'setTypeSpray', description: 'Set type: Spray' },
  { key: '5', action: 'setTypeMeasure', description: 'Set type: Measure' },
  { key: 't', action: 'gizmoTranslate', description: 'Gizmo translate mode' },
  {
    key: 'r',
    ctrl: true,
    action: 'gizmoRotate',
    description: 'Gizmo rotate mode',
  },
  { key: 'Tab', action: 'selectNext', description: 'Select next workpoint' },
  {
    key: 'Tab',
    shift: true,
    action: 'selectPrevious',
    description: 'Select previous workpoint',
  },
];

/**
 * Options for the shortcuts hook
 */
export interface UseWorkpointShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Custom shortcut configuration */
  shortcuts?: ShortcutConfig[];
  /** Callback when workpoint should be confirmed/created */
  onConfirmPoint?: () => void;
  /** Callback when delete is triggered */
  onDeleteSelected?: () => void;
  /** Callback when any shortcut is triggered */
  onShortcut?: (action: WorkpointShortcutAction) => void;
}

/**
 * Hook for handling workpoint keyboard shortcuts
 */
export function useWorkpointShortcuts(
  options: UseWorkpointShortcutsOptions = {}
) {
  const {
    enabled = true,
    shortcuts = DEFAULT_SHORTCUTS,
    onConfirmPoint,
    onDeleteSelected,
    onShortcut,
  } = options;

  // Use store directly (not as hook) to access getState
  const store = useWorkpointStore;

  /**
   * Map action to type
   */
  const actionToType: Partial<Record<WorkpointShortcutAction, WorkpointType>> = {
    setTypeNormal: 'normal',
    setTypeCamera: 'camera',
    setTypeWeld: 'weld',
    setTypeSpray: 'spray',
    setTypeMeasure: 'measure',
  };

  /**
   * Map action to gizmo mode
   */
  const actionToGizmoMode: Partial<Record<WorkpointShortcutAction, GizmoMode>> = {
    gizmoTranslate: 'translate',
    gizmoRotate: 'rotate',
  };

  /**
   * Handle shortcut action
   */
  const handleAction = useCallback(
    (action: WorkpointShortcutAction) => {
      const { mode, config, selectedWorkpointId, workpoints } = store.getState();

      // Notify callback
      onShortcut?.(action);

      switch (action) {
        case 'toggleMode':
          store.getState().toggleMode();
          break;

        case 'confirmPoint':
          if (mode === 'edit') {
            onConfirmPoint?.();
          }
          break;

        case 'rotatePreviewCW':
          if (mode === 'edit') {
            const stepRad = (config.rotationStepDegrees * Math.PI) / 180;
            store.getState().rotatePreview(stepRad);
          }
          break;

        case 'rotatePreviewCCW':
          if (mode === 'edit') {
            const stepRad = (config.rotationStepDegrees * Math.PI) / 180;
            store.getState().rotatePreview(-stepRad);
          }
          break;

        case 'deleteSelected':
          if (selectedWorkpointId) {
            onDeleteSelected?.();
          }
          break;

        case 'deselectOrExit':
          if (selectedWorkpointId) {
            store.getState().selectWorkpoint(null);
          } else if (mode === 'edit') {
            store.getState().setMode('view');
          }
          break;

        case 'setTypeNormal':
        case 'setTypeCamera':
        case 'setTypeWeld':
        case 'setTypeSpray':
        case 'setTypeMeasure':
          if (mode === 'edit') {
            const type = actionToType[action];
            if (type) {
              store.getState().setCurrentType(type);
            }
          }
          break;

        case 'gizmoTranslate':
        case 'gizmoRotate':
          if (mode === 'edit') {
            const gizmoMode = actionToGizmoMode[action];
            if (gizmoMode) {
              store.getState().setGizmoMode(gizmoMode);
            }
          }
          break;

        case 'selectNext':
        case 'selectPrevious':
          if (mode === 'edit') {
            const ordered = store.getState().getWorkpointsOrdered();
            if (ordered.length === 0) break;

            const currentIndex = selectedWorkpointId
              ? ordered.findIndex((wp: { id: string }) => wp.id === selectedWorkpointId)
              : -1;

            let nextIndex: number;
            if (action === 'selectNext') {
              nextIndex = currentIndex < ordered.length - 1 ? currentIndex + 1 : 0;
            } else {
              nextIndex = currentIndex > 0 ? currentIndex - 1 : ordered.length - 1;
            }

            store.getState().selectWorkpoint(ordered[nextIndex].id);
          }
          break;
      }
    },
    [store, onConfirmPoint, onDeleteSelected, onShortcut]
  );

  /**
   * Match keyboard event to shortcut
   */
  const matchShortcut = useCallback(
    (event: KeyboardEvent): ShortcutConfig | undefined => {
      return shortcuts.find((shortcut) => {
        // Check key match (case insensitive)
        const keyMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase() ||
          event.key === shortcut.key;

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

  return {
    /** Manually trigger an action */
    triggerAction: handleAction,
    /** Get all available shortcuts */
    shortcuts,
    /** Check if a key combo matches a shortcut */
    matchShortcut,
  };
}

/**
 * Get shortcut description for display
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
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

  parts.push(keyDisplay);

  return parts.join('+');
}

/**
 * Get shortcuts grouped by category
 */
export function getShortcutsByCategory(
  shortcuts: ShortcutConfig[] = DEFAULT_SHORTCUTS
): Record<string, ShortcutConfig[]> {
  return {
    Mode: shortcuts.filter((s) =>
      ['toggleMode', 'deselectOrExit'].includes(s.action)
    ),
    Creation: shortcuts.filter((s) =>
      ['confirmPoint', 'rotatePreviewCW', 'rotatePreviewCCW'].includes(s.action)
    ),
    Type: shortcuts.filter((s) => s.action.startsWith('setType')),
    Editing: shortcuts.filter((s) =>
      ['deleteSelected', 'gizmoTranslate', 'gizmoRotate'].includes(s.action)
    ),
    Navigation: shortcuts.filter((s) =>
      ['selectNext', 'selectPrevious'].includes(s.action)
    ),
  };
}
