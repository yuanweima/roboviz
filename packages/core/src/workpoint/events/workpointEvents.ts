/**
 * Workpoint Events
 *
 * Event definitions for the workpoint system.
 * These can be used to extend RoboVizEventMap or used standalone.
 */

import type {
  Workpoint,
  WorkpointMode,
  WorkpointType,
  WorkpointPreviewState,
} from '../types';

/**
 * Workpoint event map
 * Can be merged with RoboVizEventMap
 */
export interface WorkpointEventMap {
  // Workpoint CRUD events
  'workpoint:added': { workpoint: Workpoint };
  'workpoint:removed': { workpointId: string };
  'workpoint:changed': { workpoint: Workpoint };

  // Selection and preview
  'workpoint:selected': { workpointId: string | null };
  'workpoint:hovered': { workpointId: string | null };
  'workpoint:preview': { preview: WorkpointPreviewState | null };

  // Mode changes
  'workpoint:mode-changed': { mode: WorkpointMode };
  'workpoint:type-changed': { type: WorkpointType };

  // Execution events (for robot driving)
  'workpoint:execute': { workpointId: string; robotId: string };
  'workpoint:execute-sequence': { workpointIds: string[]; robotId: string };
  'workpoint:execute-started': { workpointId: string; robotId: string };
  'workpoint:execute-completed': { workpointId: string; robotId: string };
  'workpoint:execute-failed': { workpointId: string; robotId: string; error: string };

  // Batch operations
  'workpoint:cleared': { workpieceId?: string };
  'workpoint:imported': { workpoints: Workpoint[] };
  'workpoint:exported': { workpoints: Workpoint[] };

  // Order changes
  'workpoint:order-changed': { workpointIds: string[] };
}

/**
 * Event handler type for workpoint events
 */
export type WorkpointEventHandler<K extends keyof WorkpointEventMap> = (
  data: WorkpointEventMap[K]
) => void;

/**
 * Simple event emitter for workpoint events
 * Can be used standalone or integrated with main EventBus
 */
export class WorkpointEventEmitter {
  private handlers: Map<
    keyof WorkpointEventMap,
    Set<WorkpointEventHandler<any>>
  > = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof WorkpointEventMap>(
    event: K,
    handler: WorkpointEventHandler<K>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof WorkpointEventMap>(
    event: K,
    handler: WorkpointEventHandler<K>
  ): void {
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Emit an event
   */
  emit<K extends keyof WorkpointEventMap>(
    event: K,
    data: WorkpointEventMap[K]
  ): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WorkpointEvents] Error in handler for "${event}":`, error);
        }
      }
    }
  }

  /**
   * Subscribe to an event once
   */
  once<K extends keyof WorkpointEventMap>(
    event: K,
    handler: WorkpointEventHandler<K>
  ): () => void {
    const wrappedHandler: WorkpointEventHandler<K> = (data) => {
      this.off(event, wrappedHandler);
      handler(data);
    };
    return this.on(event, wrappedHandler);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Global workpoint event emitter instance
 */
export const workpointEvents = new WorkpointEventEmitter();

/**
 * Hook for subscribing to workpoint events in React components
 */
export function useWorkpointEvent<K extends keyof WorkpointEventMap>(
  event: K,
  handler: WorkpointEventHandler<K>,
  deps: React.DependencyList = []
): void {
  // Note: This would need to be imported in a React context
  // Implementation would use useEffect to subscribe/unsubscribe
}
