/**
 * RoboViz WebSocket Server
 *
 * Browser-based WebSocket server emulation using a relay approach.
 * Since browsers cannot host WebSocket servers directly, this provides
 * a message handling interface that can be connected to external servers.
 */

import type { JsonRpcMessage, JsonRpcResponse } from '../protocol/types';
import { createMessageHandler, type MessageHandler, type MethodHandler, type NotificationHandler } from '../protocol/handler';

// ============================================================================
// Types
// ============================================================================

/**
 * WebSocket server configuration
 */
export interface WebSocketServerConfig {
  /** Port number (for documentation purposes in browser) */
  port?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Client connection interface
 */
export interface ClientConnection {
  id: string;
  send: (message: JsonRpcMessage) => void;
  close: () => void;
}

/**
 * Server event callbacks
 */
export interface ServerCallbacks {
  onClientConnect?: (client: ClientConnection) => void;
  onClientDisconnect?: (clientId: string) => void;
  onMessage?: (clientId: string, message: JsonRpcMessage) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// WebSocket Server (Browser-compatible)
// ============================================================================

/**
 * Browser-compatible WebSocket server interface
 *
 * This doesn't create an actual server (impossible in browser),
 * but provides a message handling interface that can be used with
 * various transport mechanisms (e.g., WebRTC, relay server).
 */
export class WebSocketServer {
  private handler: MessageHandler;
  private clients = new Map<string, ClientConnection>();
  private callbacks: ServerCallbacks;
  private config: WebSocketServerConfig;
  private clientIdCounter = 0;

  constructor(config: WebSocketServerConfig = {}, callbacks: ServerCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    this.handler = createMessageHandler({
      onError: (error) => {
        this.log('Handler error:', error);
        callbacks.onError?.(error);
      },
    });
  }

  // ==========================================================================
  // Method Registration
  // ==========================================================================

  /**
   * Register a method handler
   */
  registerMethod<TParams = Record<string, unknown>, TResult = unknown>(
    method: string,
    handler: MethodHandler<TParams, TResult>
  ): void {
    this.handler.registerMethod(method, handler);
    this.log(`Registered method: ${method}`);
  }

  /**
   * Register a notification handler
   */
  registerNotification<TParams = Record<string, unknown>>(
    method: string,
    handler: NotificationHandler<TParams>
  ): void {
    this.handler.registerNotification(method, handler);
    this.log(`Registered notification: ${method}`);
  }

  /**
   * Unregister a method
   */
  unregisterMethod(method: string): boolean {
    return this.handler.unregisterMethod(method);
  }

  /**
   * Unregister a notification handler
   */
  unregisterNotification(method: string): boolean {
    return this.handler.unregisterNotification(method);
  }

  /**
   * Check if a method is registered
   */
  hasMethod(method: string): boolean {
    return this.handler.hasMethod(method);
  }

  /**
   * Get all registered methods
   */
  getRegisteredMethods(): string[] {
    return this.handler.getRegisteredMethods();
  }

  // ==========================================================================
  // Client Management
  // ==========================================================================

  /**
   * Add a client connection
   */
  addClient(sendFn: (message: JsonRpcMessage) => void, closeFn?: () => void): ClientConnection {
    const id = `client_${++this.clientIdCounter}`;
    const client: ClientConnection = {
      id,
      send: sendFn,
      close: closeFn || (() => this.removeClient(id)),
    };

    this.clients.set(id, client);
    this.log(`Client connected: ${id}`);
    this.callbacks.onClientConnect?.(client);

    return client;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    if (this.clients.delete(clientId)) {
      this.log(`Client disconnected: ${clientId}`);
      this.callbacks.onClientDisconnect?.(clientId);
    }
  }

  /**
   * Get all connected clients
   */
  getClients(): ClientConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  // ==========================================================================
  // Message Handling
  // ==========================================================================

  /**
   * Handle incoming message from a client
   */
  async handleMessage(clientId: string, message: JsonRpcMessage): Promise<void> {
    this.log(`Message from ${clientId}:`, message);
    this.callbacks.onMessage?.(clientId, message);

    const response = await this.handler.handle(message);

    if (response) {
      const client = this.clients.get(clientId);
      if (client) {
        client.send(response);
        this.log(`Response to ${clientId}:`, response);
      }
    }
  }

  /**
   * Handle raw JSON string message
   */
  async handleRawMessage(clientId: string, rawMessage: string): Promise<void> {
    try {
      const message = JSON.parse(rawMessage) as JsonRpcMessage;
      await this.handleMessage(clientId, message);
    } catch (error) {
      this.log('Failed to parse message:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  // ==========================================================================
  // Broadcasting
  // ==========================================================================

  /**
   * Broadcast message to all clients
   */
  broadcast(message: JsonRpcMessage): void {
    for (const client of this.clients.values()) {
      try {
        client.send(message);
      } catch (error) {
        this.log(`Failed to send to ${client.id}:`, error);
      }
    }
  }

  /**
   * Send message to a specific client
   */
  sendTo(clientId: string, message: JsonRpcMessage): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.send(message);
      return true;
    }
    return false;
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Close all connections
   */
  close(): void {
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
    this.log('Server closed');
  }

  // ==========================================================================
  // Private
  // ==========================================================================

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[WebSocketServer]', ...args);
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a WebSocket server instance
 */
export function createWebSocketServer(
  config?: WebSocketServerConfig,
  callbacks?: ServerCallbacks
): WebSocketServer {
  return new WebSocketServer(config, callbacks);
}
