/**
 * @aspect/roboviz-core
 * 
 * Core rendering engine for RoboViz - a standalone 3D robot visualization component.
 * 
 * @packageDocumentation
 */

// Types
export * from './types';

// Store
export { useVizStore, type VizState } from './store/vizStore';

// Protocol
export { createMessageHandler } from './protocol/handler';
export { createDispatcher, type Dispatcher } from './protocol/dispatcher';
export type { JsonRpcMessage, JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from './protocol/types';

// Transport
export { createDirectTransport } from './transport/direct';
export { createPostMessageTransport } from './transport/postmessage';
export { createWebSocketTransport } from './transport/websocket';
export type { Transport } from './transport/base';

// Components (internal, exposed for advanced use)
export { Scene } from './components/Scene';
export { Robot } from './components/Robot';
export { Trajectory } from './components/Trajectory';
export { Waypoint } from './components/Waypoint';
export { Obstacle } from './components/Obstacle';

// Main component
export { RoboVizCore, type RoboVizCoreProps } from './RoboVizCore';
