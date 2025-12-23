/**
 * EventBus - Type-safe event system for RoboViz
 *
 * Provides a simple, type-safe event emitter that can be used both
 * within React components and in imperative JavaScript code.
 */

import type { RoboVizEventMap, RoboVizEventHandler } from '../types';

/**
 * Type-safe event bus for RoboViz events
 *
 * @example
 * ```typescript
 * const events = new EventBus();
 *
 * // Subscribe to events
 * const unsubscribe = events.on('robot:click', (data) => {
 *   console.log('Robot clicked:', data.robotId);
 * });
 *
 * // Emit events
 * events.emit('robot:click', { robotId: 'robot1', position: { x: 0, y: 0, z: 0 } });
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
export class EventBus {
  private handlers: Map<keyof RoboVizEventMap, Set<RoboVizEventHandler<any>>> = new Map();
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    this.debug = options.debug ?? false;
  }

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const handlers = this.handlers.get(event)!;
    handlers.add(handler as RoboVizEventHandler<any>);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to "${String(event)}", total handlers: ${handlers.size}`);
    }

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Event handler to remove
   */
  off<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler as RoboVizEventHandler<any>);

      if (this.debug) {
        console.log(`[EventBus] Unsubscribed from "${String(event)}", remaining handlers: ${handlers.size}`);
      }

      // Clean up empty sets
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param event - Event name
   * @param data - Event payload
   */
  emit<K extends keyof RoboVizEventMap>(
    event: K,
    data: RoboVizEventMap[K]
  ): void {
    const handlers = this.handlers.get(event);

    if (this.debug) {
      console.log(`[EventBus] Emit "${String(event)}"`, data);
    }

    if (handlers) {
      // Create a copy to avoid issues if handlers modify the set
      const handlersCopy = Array.from(handlers);
      for (const handler of handlersCopy) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EventBus] Error in handler for "${String(event)}":`, error);
        }
      }
    }
  }

  /**
   * Subscribe to an event, but only trigger once
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  once<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): () => void {
    const wrappedHandler: RoboVizEventHandler<K> = (data) => {
      this.off(event, wrappedHandler);
      handler(data);
    };

    return this.on(event, wrappedHandler);
  }

  /**
   * Check if there are any handlers for an event
   * @param event - Event name
   * @returns True if there are handlers
   */
  hasHandlers<K extends keyof RoboVizEventMap>(event: K): boolean {
    const handlers = this.handlers.get(event);
    return handlers !== undefined && handlers.size > 0;
  }

  /**
   * Get the number of handlers for an event
   * @param event - Event name
   * @returns Number of handlers
   */
  handlerCount<K extends keyof RoboVizEventMap>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * Remove all handlers for a specific event
   * @param event - Event name
   */
  removeAllHandlers<K extends keyof RoboVizEventMap>(event: K): void {
    this.handlers.delete(event);

    if (this.debug) {
      console.log(`[EventBus] Removed all handlers for "${String(event)}"`);
    }
  }

  /**
   * Clear all event handlers
   */
  clear(): void {
    this.handlers.clear();

    if (this.debug) {
      console.log('[EventBus] Cleared all handlers');
    }
  }

  /**
   * Get list of events with active handlers
   * @returns Array of event names
   */
  getActiveEvents(): (keyof RoboVizEventMap)[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Create a scoped event emitter that prefixes all events
   * Useful for creating isolated event namespaces
   */
  createScope(prefix: string): ScopedEventBus {
    return new ScopedEventBus(this, prefix);
  }
}

/**
 * Scoped event bus that prefixes all events
 * Useful for creating isolated event namespaces
 */
export class ScopedEventBus {
  constructor(
    private parent: EventBus,
    private prefix: string
  ) {}

  on<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): () => void {
    return this.parent.on(event, handler);
  }

  off<K extends keyof RoboVizEventMap>(
    event: K,
    handler: RoboVizEventHandler<K>
  ): void {
    this.parent.off(event, handler);
  }

  emit<K extends keyof RoboVizEventMap>(
    event: K,
    data: RoboVizEventMap[K]
  ): void {
    this.parent.emit(event, data);
  }
}

/**
 * Create a new EventBus instance
 * @param options - Configuration options
 * @returns EventBus instance
 */
export function createEventBus(options?: { debug?: boolean }): EventBus {
  return new EventBus(options);
}
