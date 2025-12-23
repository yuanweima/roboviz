/**
 * useEvents - Hook for RoboViz event subscription
 *
 * Provides a convenient way to subscribe to RoboViz events within React components.
 */

import * as React from 'react';
import { useRoboVizInstance, useRoboVizEventBus } from '../context/RoboVizProvider';
import type { RoboVizEventMap, RoboVizEventHandler, UseEventsReturn } from '../types';

/**
 * Hook for subscribing to RoboViz events
 *
 * @returns Event subscription functions
 *
 * @example
 * ```tsx
 * function EventLogger() {
 *   const { on, emit } = useEvents();
 *   const [events, setEvents] = React.useState<string[]>([]);
 *
 *   React.useEffect(() => {
 *     const unsubRobotClick = on('robot:click', (e) => {
 *       setEvents((prev) => [...prev, `Robot clicked: ${e.robotId}`]);
 *     });
 *
 *     const unsubTrajectory = on('trajectory:completed', (e) => {
 *       setEvents((prev) => [...prev, `Trajectory completed: ${e.trajectoryId}`]);
 *     });
 *
 *     return () => {
 *       unsubRobotClick();
 *       unsubTrajectory();
 *     };
 *   }, [on]);
 *
 *   return (
 *     <div>
 *       <h3>Events</h3>
 *       <ul>
 *         {events.map((event, i) => (
 *           <li key={i}>{event}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEvents(): UseEventsReturn {
  const instance = useRoboVizInstance();

  // Subscribe to an event
  const on = React.useCallback(
    <K extends keyof RoboVizEventMap>(
      event: K,
      handler: RoboVizEventHandler<K>
    ): (() => void) => {
      return instance.on(event, handler);
    },
    [instance]
  );

  // Emit an event
  const emit = React.useCallback(
    <K extends keyof RoboVizEventMap>(
      event: K,
      data: RoboVizEventMap[K]
    ): void => {
      instance.emit(event, data);
    },
    [instance]
  );

  return { on, emit };
}

/**
 * Hook that subscribes to a specific event and returns the latest value
 *
 * @param event - Event name to subscribe to
 * @param initialValue - Initial value before any events
 * @returns Latest event data
 *
 * @example
 * ```tsx
 * function RobotClickIndicator() {
 *   const lastClick = useEventValue('robot:click', null);
 *
 *   if (!lastClick) return <p>Click a robot...</p>;
 *
 *   return (
 *     <p>
 *       Last clicked: {lastClick.robotId} at
 *       ({lastClick.position.x.toFixed(2)}, {lastClick.position.y.toFixed(2)}, {lastClick.position.z.toFixed(2)})
 *     </p>
 *   );
 * }
 * ```
 */
export function useEventValue<K extends keyof RoboVizEventMap>(
  event: K,
  initialValue: RoboVizEventMap[K] | null
): RoboVizEventMap[K] | null {
  const instance = useRoboVizInstance();
  const [value, setValue] = React.useState<RoboVizEventMap[K] | null>(initialValue);

  React.useEffect(() => {
    const unsubscribe = instance.on(event, (data) => {
      setValue(data);
    });

    return unsubscribe;
  }, [instance, event]);

  return value;
}

/**
 * Hook that calls a callback when an event occurs
 *
 * Automatically cleans up on unmount.
 *
 * @param event - Event name to subscribe to
 * @param callback - Callback to call when event occurs
 *
 * @example
 * ```tsx
 * function TrajectoryCompletionToast() {
 *   const [toast, setToast] = React.useState<string | null>(null);
 *
 *   useEventCallback('trajectory:completed', (e) => {
 *     setToast(`Trajectory ${e.trajectoryId} completed!`);
 *     setTimeout(() => setToast(null), 3000);
 *   });
 *
 *   if (!toast) return null;
 *
 *   return <div className="toast">{toast}</div>;
 * }
 * ```
 */
export function useEventCallback<K extends keyof RoboVizEventMap>(
  event: K,
  callback: RoboVizEventHandler<K>
): void {
  const instance = useRoboVizInstance();

  // Use ref to avoid recreating subscription on callback change
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => {
    const handler: RoboVizEventHandler<K> = (data) => {
      callbackRef.current(data);
    };

    const unsubscribe = instance.on(event, handler);
    return unsubscribe;
  }, [instance, event]);
}

/**
 * Hook that subscribes to multiple events at once
 *
 * @param handlers - Map of event names to handlers
 *
 * @example
 * ```tsx
 * function MultiEventHandler() {
 *   useMultipleEvents({
 *     'robot:click': (e) => console.log('Robot clicked:', e.robotId),
 *     'trajectory:started': (e) => console.log('Trajectory started:', e.trajectoryId),
 *     'trajectory:completed': (e) => console.log('Trajectory completed:', e.trajectoryId),
 *   });
 *
 *   return <div>Listening for events...</div>;
 * }
 * ```
 */
export function useMultipleEvents(
  handlers: {
    [K in keyof RoboVizEventMap]?: RoboVizEventHandler<K>;
  }
): void {
  const instance = useRoboVizInstance();

  // Store handlers in ref to avoid recreation
  const handlersRef = React.useRef(handlers);
  handlersRef.current = handlers;

  React.useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    for (const [event, handler] of Object.entries(handlersRef.current)) {
      if (handler !== undefined && handler !== null) {
        const wrappedHandler = (data: unknown) => {
          handlersRef.current[event as keyof RoboVizEventMap]?.(data as never);
        };
        const unsub = instance.on(event as keyof RoboVizEventMap, wrappedHandler as never);
        unsubscribers.push(unsub);
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [instance]);
}

/**
 * Hook that provides connection status with events
 *
 * @example
 * ```tsx
 * function ConnectionStatus() {
 *   const { isConnected, error, connect, disconnect } = useConnection();
 *
 *   return (
 *     <div>
 *       <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
 *       {error && <span className="error">{error.message}</span>}
 *       <button onClick={isConnected ? disconnect : connect}>
 *         {isConnected ? 'Disconnect' : 'Connect'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useConnection() {
  const instance = useRoboVizInstance();
  const [isConnected, setIsConnected] = React.useState(instance.isConnected);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const unsubConnect = instance.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    const unsubDisconnect = instance.on('disconnect', () => {
      setIsConnected(false);
    });

    const unsubError = instance.on('error', (e) => {
      setError(e.error);
    });

    // Sync initial state
    setIsConnected(instance.isConnected);

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubError();
    };
  }, [instance]);

  const connect = React.useCallback(() => {
    instance.connect().catch((e) => setError(e));
  }, [instance]);

  const disconnect = React.useCallback(() => {
    instance.disconnect();
  }, [instance]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
}
