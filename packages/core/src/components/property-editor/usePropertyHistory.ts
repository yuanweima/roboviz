/**
 * usePropertyHistory Hook
 *
 * Provides undo/redo functionality for PropertyEditor.
 * Tracks value changes and allows navigating through history.
 *
 * @example
 * ```tsx
 * const history = usePropertyHistory(value, onChange, { maxHistory: 50 });
 *
 * // In your component
 * <PropertyEditor
 *   value={history.value}
 *   onChange={history.push}
 * />
 *
 * // Toolbar
 * <button onClick={history.undo} disabled={!history.canUndo}>Undo</button>
 * <button onClick={history.redo} disabled={!history.canRedo}>Redo</button>
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface PropertyHistoryOptions {
  /** Maximum number of history entries to keep (default: 50) */
  maxHistory?: number;
  /** Debounce delay in ms before creating a new history entry (default: 500) */
  debounceMs?: number;
}

export interface PropertyHistoryState<T> {
  /** Current value */
  value: T;
  /** Push a new value (creates history entry after debounce) */
  push: (value: T) => void;
  /** Undo to previous value */
  undo: () => void;
  /** Redo to next value */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;
  /** Clear all history */
  clear: () => void;
  /** Get history info for debugging */
  getHistoryInfo: () => { past: number; future: number };
}

export function usePropertyHistory<T>(
  initialValue: T,
  onChange?: (value: T) => void,
  options: PropertyHistoryOptions = {}
): PropertyHistoryState<T> {
  const { maxHistory = 50, debounceMs = 500 } = options;

  // History stacks
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialValue);
  const [future, setFuture] = useState<T[]>([]);

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if we're in the middle of an undo/redo operation
  const isUndoRedoRef = useRef(false);
  // Last committed value for debounce grouping
  const lastCommittedRef = useRef<T>(initialValue);

  // Sync with external value changes
  useEffect(() => {
    if (!isUndoRedoRef.current && !isEqual(initialValue, present)) {
      setPresent(initialValue);
      lastCommittedRef.current = initialValue;
    }
  }, [initialValue]);

  // Push a new value with debouncing
  const push = useCallback(
    (newValue: T) => {
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Update present immediately
      setPresent(newValue);
      onChange?.(newValue);

      // Debounce the history commit
      debounceRef.current = setTimeout(() => {
        const lastValue = lastCommittedRef.current;

        // Don't add to history if value hasn't changed since last commit
        if (isEqual(newValue, lastValue)) {
          return;
        }

        setPast((prevPast) => {
          const newPast = [...prevPast, lastValue];
          // Limit history size
          if (newPast.length > maxHistory) {
            return newPast.slice(-maxHistory);
          }
          return newPast;
        });

        // Clear future on new changes
        setFuture([]);

        // Update last committed
        lastCommittedRef.current = newValue;
      }, debounceMs);
    },
    [onChange, debounceMs, maxHistory]
  );

  // Undo
  const undo = useCallback(() => {
    if (past.length === 0) return;

    // Commit any pending changes first
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    isUndoRedoRef.current = true;

    const newPast = [...past];
    const previous = newPast.pop()!;

    setPast(newPast);
    setFuture([present, ...future]);
    setPresent(previous);
    lastCommittedRef.current = previous;
    onChange?.(previous);

    // Reset flag after state updates
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [past, present, future, onChange]);

  // Redo
  const redo = useCallback(() => {
    if (future.length === 0) return;

    isUndoRedoRef.current = true;

    const newFuture = [...future];
    const next = newFuture.shift()!;

    setPast([...past, present]);
    setFuture(newFuture);
    setPresent(next);
    lastCommittedRef.current = next;
    onChange?.(next);

    // Reset flag after state updates
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [past, present, future, onChange]);

  // Clear history
  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setPast([]);
    setFuture([]);
    lastCommittedRef.current = present;
  }, [present]);

  // Get history info
  const getHistoryInfo = useCallback(() => {
    return { past: past.length, future: future.length };
  }, [past.length, future.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    value: present,
    push,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undoCount: past.length,
    redoCount: future.length,
    clear,
    getHistoryInfo,
  };
}

// Simple deep equality check
function isEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual((a as any)[key], (b as any)[key])) return false;
  }

  return true;
}

export default usePropertyHistory;
