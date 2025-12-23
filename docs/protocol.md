# RoboViz Protocol Specification

This document defines the communication protocol between RoboViz and host applications.

## Overview

RoboViz uses **JSON-RPC 2.0** over pluggable transports for all communication. This provides:

- Language-agnostic communication
- Request/response and notification patterns
- Standard error handling
- Batch requests (future)

## Transport Layer

### Transport Interface

```typescript
interface Transport {
  /**
   * Send a message to the other side
   */
  send(message: JsonRpcMessage): void;
  
  /**
   * Register message handler
   */
  onMessage(handler: (message: JsonRpcMessage) => void): void;
  
  /**
   * Connect to the remote endpoint
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from the remote endpoint
   */
  disconnect(): void;
  
  /**
   * Check connection status
   */
  isConnected(): boolean;
}
```

### Available Transports

#### 1. Direct Transport

For same-context integration (e.g., React component in the same app).

```typescript
import { createDirectTransport } from '@aspect/roboviz-core';

const transport = createDirectTransport();
```

#### 2. PostMessage Transport

For iframe embedding.

```typescript
// In host
import { createPostMessageTransport } from '@aspect/roboviz-sdk';

const iframe = document.getElementById('roboviz-frame');
const transport = createPostMessageTransport(iframe.contentWindow, '*');

// In iframe
import { createPostMessageTransport } from '@aspect/roboviz-core';

const transport = createPostMessageTransport(window.parent, '*');
```

#### 3. WebSocket Transport

For standalone server mode.

```typescript
import { createWebSocketTransport } from '@aspect/roboviz-sdk';

const transport = createWebSocketTransport('ws://localhost:8080');
await transport.connect();
```

#### 4. Tauri Transport

For Tauri applications.

```typescript
import { createTauriTransport } from '@aspect/roboviz-react';

const transport = createTauriTransport();
```

## Message Types

### Request

A request expects a response.

```typescript
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}
```

Example:
```json
{
  "jsonrpc": "2.0",
  "method": "robot.setJointAngles",
  "params": {
    "id": "robot-1",
    "angles": [0, 0.5, -0.3, 0, 1.2, 0]
  },
  "id": 1
}
```

### Response

A response to a request.

```typescript
interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: JsonRpcError;
  id: string | number;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}
```

Success example:
```json
{
  "jsonrpc": "2.0",
  "result": { "success": true },
  "id": 1
}
```

Error example:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Robot not found",
    "data": { "robotId": "robot-999" }
  },
  "id": 1
}
```

### Notification

A notification does not expect a response.

```typescript
interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  // No id field
}
```

Example:
```json
{
  "jsonrpc": "2.0",
  "method": "robot.clicked",
  "params": {
    "robotId": "robot-1",
    "linkName": "link_3"
  }
}
```

## Message Flow

### Command Flow (Host → RoboViz)

```
Host                              RoboViz
  │                                  │
  │  ──── Request ────────────────►  │
  │       robot.setJointAngles       │
  │                                  │
  │  ◄─── Response ───────────────   │
  │       { success: true }          │
  │                                  │
```

### Event Flow (RoboViz → Host)

```
Host                              RoboViz
  │                                  │
  │  ◄─── Notification ───────────   │
  │       robot.clicked              │
  │                                  │
  │  (no response required)          │
  │                                  │
```

### Bridge Flow (Bidirectional)

For operations that require backend computation (e.g., IK solving):

```
Host                   RoboViz                  Backend
  │                       │                        │
  │ ── robot.setTCP ───►  │                        │
  │                       │ ── ik.solve ─────────► │
  │                       │                        │
  │                       │ ◄── IK result ──────── │
  │                       │                        │
  │ ◄── Response ───────  │                        │
  │                       │                        │
```

## Event Subscription

Events use a pub/sub pattern:

### Subscribe

```json
{
  "jsonrpc": "2.0",
  "method": "events.subscribe",
  "params": {
    "events": ["robot.clicked", "trajectory.progress"]
  },
  "id": 1
}
```

### Unsubscribe

```json
{
  "jsonrpc": "2.0",
  "method": "events.unsubscribe",
  "params": {
    "events": ["trajectory.progress"]
  },
  "id": 2
}
```

### Receive Events

After subscribing, events are sent as notifications:

```json
{
  "jsonrpc": "2.0",
  "method": "robot.clicked",
  "params": {
    "robotId": "robot-1",
    "linkName": "link_3",
    "position": [0.3, 0.2, 0.5]
  }
}
```

## Bridge Pattern

The bridge pattern allows RoboViz to request computations from the host's backend.

### Configuration

```typescript
const bridge = useRoboVizBridge({
  transport: 'tauri',
  handlers: {
    // Handle IK requests from RoboViz
    'ik.solve': async (params) => {
      return await invoke('solve_ik', params);
    },
    
    // Handle trajectory generation requests
    'trajectory.generate': async (params) => {
      return await invoke('generate_trajectory', params);
    },
    
    // Handle collision checking
    'collision.check': async (params) => {
      return await invoke('check_collision', params);
    }
  }
});
```

### Bridge Methods

Methods that RoboViz may request from the host:

| Method | Description | Params | Returns |
|--------|-------------|--------|---------|
| `ik.solve` | Inverse kinematics | `{ robotId, targetPose }` | `{ angles, success }` |
| `fk.solve` | Forward kinematics | `{ robotId, angles }` | `{ pose }` |
| `trajectory.generate` | Generate trajectory | `{ robotId, waypoints, options }` | `{ trajectory }` |
| `collision.check` | Check for collisions | `{ robotId, angles }` | `{ colliding, details }` |
| `path.plan` | Plan collision-free path | `{ robotId, start, goal, obstacles }` | `{ path, success }` |

## Protocol Versioning

The protocol version is negotiated during connection:

### Version Handshake

```json
// Client → Server
{
  "jsonrpc": "2.0",
  "method": "protocol.hello",
  "params": {
    "version": "1.0.0",
    "capabilities": ["bridge", "batch"]
  },
  "id": 0
}

// Server → Client
{
  "jsonrpc": "2.0",
  "result": {
    "version": "1.0.0",
    "capabilities": ["bridge"]
  },
  "id": 0
}
```

## Error Handling

### Standard JSON-RPC Errors

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC format |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Invalid parameters |
| -32603 | Internal error | Internal error |

### Application Errors

| Code | Message | Description |
|------|---------|-------------|
| -32000 | Robot not found | Robot ID doesn't exist |
| -32001 | Trajectory not found | Trajectory ID doesn't exist |
| -32002 | URDF load failed | Failed to load URDF |
| -32003 | Invalid transform | Invalid transform data |
| -32004 | Playback error | Trajectory playback error |
| -32005 | Bridge timeout | Backend request timed out |
| -32006 | Bridge error | Backend request failed |

## Timeout and Retry

### Request Timeout

Default timeout: 10 seconds

```typescript
// SDK configuration
const client = new RoboVizClient({
  transport,
  timeout: 15000, // 15 seconds
});
```

### Retry Policy

For transient failures, the SDK retries with exponential backoff:

```typescript
const client = new RoboVizClient({
  transport,
  retry: {
    maxAttempts: 3,
    baseDelay: 100,  // ms
    maxDelay: 2000,  // ms
  }
});
```

## Batch Requests (Future)

Batch requests allow multiple operations in a single message:

```json
[
  {
    "jsonrpc": "2.0",
    "method": "robot.setJointAngles",
    "params": { "id": "robot-1", "angles": [0,0,0,0,0,0] },
    "id": 1
  },
  {
    "jsonrpc": "2.0",
    "method": "robot.setJointAngles",
    "params": { "id": "robot-2", "angles": [0,0,0,0,0,0] },
    "id": 2
  }
]
```

Response:
```json
[
  { "jsonrpc": "2.0", "result": { "success": true }, "id": 1 },
  { "jsonrpc": "2.0", "result": { "success": true }, "id": 2 }
]
```
