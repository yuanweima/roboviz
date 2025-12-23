/**
 * WebSocket connection hook for Viewer
 * Connects to SDK server and handles protocol messages
 */
import { useEffect, useRef, useCallback } from 'react';
import { useViewerStore } from '../store/viewerStore';
import { createProtocolHandler } from '../protocol/handler';
import type { JsonRpcMessage } from '../protocol/types';

export interface UseWebSocketOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnect on disconnect (default: true) */
  reconnect?: boolean;
  /** Reconnect interval in ms (default: 2000) */
  reconnectInterval?: number;
  /** Debug logging (default: false) */
  debug?: boolean;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 2000,
    debug = false,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const handlerRef = useRef<ReturnType<typeof createProtocolHandler> | null>(null);

  const { setConnected, setClientCount } = useViewerStore();

  // Send message function
  const send = useCallback((message: JsonRpcMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(message);
      if (debug) {
        console.log('[WS] Sending:', data);
      }
      wsRef.current.send(data);
    }
  }, [debug]);

  // Send event (notification to SDK)
  const sendEvent = useCallback((eventName: string, params: Record<string, unknown>) => {
    send({
      jsonrpc: '2.0',
      method: eventName,
      params,
    });
  }, [send]);

  // Connect function
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (debug) {
      console.log('[WS] Connecting to:', url);
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    // Create protocol handler
    handlerRef.current = createProtocolHandler(send);

    ws.onopen = () => {
      if (debug) {
        console.log('[WS] Connected');
      }
      setConnected(true);
      setClientCount(1);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as JsonRpcMessage;
        if (debug) {
          console.log('[WS] Received:', message);
        }
        handlerRef.current?.handleMessage(message);
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    ws.onclose = () => {
      if (debug) {
        console.log('[WS] Disconnected');
      }
      setConnected(false);
      setClientCount(0);
      wsRef.current = null;

      // Reconnect
      if (reconnect) {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (debug) {
            console.log('[WS] Reconnecting...');
          }
          connect();
        }, reconnectInterval);
      }
    };
  }, [url, send, setConnected, setClientCount, reconnect, reconnectInterval, debug]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setClientCount(0);
  }, [setConnected, setClientCount]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connect,
    disconnect,
    send,
    sendEvent,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
