/**
 * @aspect/roboviz-core
 *
 * Core rendering engine for RoboViz - a standalone 3D robot visualization component.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================
export * from './types';

// =============================================================================
// Store
// =============================================================================
export { useVizStore, type VizState } from './store/vizStore';

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
// Streaming (Phase 1: Real-time Data)
// =============================================================================
export * from './streaming';

// =============================================================================
// Vision (Phase 2: Machine Vision Integration)
// =============================================================================
export * from './vision';

// =============================================================================
// Frames (Phase 3: Coordinate Frame Management)
// =============================================================================
export * from './frames';

// =============================================================================
// Collision (Phase 4: Collision Detection Visualization)
// =============================================================================
export * from './collision';

// =============================================================================
// Multi-Robot (Phase 5: Multi-Robot Coordination)
// =============================================================================
export * from './multi-robot';

// =============================================================================
// Performance (Phase 6: Performance Optimization)
// =============================================================================
export * from './performance';

// =============================================================================
// Diagnostic (Phase 7: Debugging & Diagnostics)
// =============================================================================
export * from './diagnostic';

// =============================================================================
// Scene Management (Phase 7: Scene Persistence)
// =============================================================================
export * from './scene-management';

// =============================================================================
// Components (internal, exposed for advanced use)
// =============================================================================
export { Scene } from './components/Scene';
export { Robot } from './components/Robot';
export { Trajectory } from './components/Trajectory';
export { Waypoint } from './components/Waypoint';
export { Obstacle } from './components/Obstacle';

// =============================================================================
// Main Component
// =============================================================================
export { RoboVizCore, type RoboVizCoreProps } from './RoboVizCore';
