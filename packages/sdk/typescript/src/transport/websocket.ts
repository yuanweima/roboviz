/**
 * WebSocket Transport (Placeholder)
 *
 * TODO: Implement WebSocket transport for SDK
 */

export interface WebSocketTransportOptions {
  url: string;
  reconnect?: boolean;
}

export interface WebSocketTransport {
  connect(): Promise<void>;
  disconnect(): void;
  send(data: unknown): void;
  onMessage(callback: (data: unknown) => void): void;
}

/**
 * Create a WebSocket transport
 */
export function createWebSocketTransport(_options: WebSocketTransportOptions): WebSocketTransport {
  // TODO: Implement WebSocket transport
  return {
    connect: async () => { /* TODO */ },
    disconnect: () => { /* TODO */ },
    send: () => { /* TODO */ },
    onMessage: () => { /* TODO */ },
  };
}
