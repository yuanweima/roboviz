/**
 * PostMessage Transport (Placeholder)
 *
 * TODO: Implement PostMessage transport for iframe communication
 */

export interface PostMessageTransportOptions {
  targetWindow: Window;
  targetOrigin?: string;
}

export interface PostMessageTransport {
  connect(): Promise<void>;
  disconnect(): void;
  send(data: unknown): void;
  onMessage(callback: (data: unknown) => void): void;
}

/**
 * Create a PostMessage transport for iframe communication
 */
export function createPostMessageTransport(_options: PostMessageTransportOptions): PostMessageTransport {
  // TODO: Implement PostMessage transport
  return {
    connect: async () => { /* TODO */ },
    disconnect: () => { /* TODO */ },
    send: () => { /* TODO */ },
    onMessage: () => { /* TODO */ },
  };
}
