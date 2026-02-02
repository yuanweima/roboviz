/**
 * @aspect/roboviz-core/protocol
 *
 * Protocol and transport entry point — JSON-RPC messaging, transport layers,
 * and real-time streaming. No WASM dependency.
 *
 * @packageDocumentation
 */

// =============================================================================
// Protocol
// =============================================================================
export { createMessageHandler } from './protocol/handler';
export { createDispatcher, type Dispatcher } from './protocol/dispatcher';
export type { JsonRpcMessage, JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from './protocol/types';

// =============================================================================
// Transport
// =============================================================================
export { createDirectTransport } from './transport/direct';
export { createPostMessageTransport } from './transport/postmessage';
export { createWebSocketTransport } from './transport/websocket';
export type { Transport } from './transport/base';

// =============================================================================
// Streaming
// =============================================================================
export * from './streaming';

// =============================================================================
// Vision (streaming-dependent)
// =============================================================================
export * from './vision';

// =============================================================================
// Server
// =============================================================================
export * from './server';
