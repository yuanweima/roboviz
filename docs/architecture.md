# RoboViz Architecture

## System Overview

RoboViz is designed as a modular, embeddable 3D visualization component with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────────┐
│                       Host Application                          │
│        (Tauri / Electron / Web / Native + WebView)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │  JSON-RPC 2.0 Protocol
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                        SDK Layer                                │
│   ┌─────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────────┐   │
│   │  Rust   │  │ TypeScript  │  │  Python  │  │    C++      │   │
│   │  SDK    │  │    SDK      │  │   SDK    │  │    SDK      │   │
│   └─────────┘  └─────────────┘  └──────────┘  └─────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │  Transport Layer
                           │  (WebSocket / postMessage / IPC)
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                       RoboViz Core                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Protocol Handler (JSON-RPC 2.0)                           │ │
│  │  ├── scene.*      Scene management                         │ │
│  │  ├── robot.*      Robot operations                         │ │
│  │  ├── trajectory.* Trajectory control                       │ │
│  │  ├── camera.*     Camera control                           │ │
│  │  ├── waypoint.*   Waypoint management                      │ │
│  │  └── events.*     Event subscription                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Internal State Store (Zustand)                            │ │
│  │  - Fully internal, not exposed directly                    │ │
│  │  - State changes trigger events                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  3D Renderer (React Three Fiber + Three.js)                │ │
│  │  - Scene, Lighting, Camera                                 │ │
│  │  - Robot Visualizers (URDF)                                │ │
│  │  - Trajectory/Waypoint Visualizers                         │ │
│  │  - Obstacle Visualizers                                    │ │
│  │  - Interaction Handlers                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Protocol-First Design

All communication happens through JSON-RPC 2.0 messages. This ensures:
- Language-agnostic integration
- Clear API contracts
- Easy testing and debugging
- Versioning support

### 2. Transport Abstraction

The transport layer is pluggable, supporting:
- **WebSocket**: For standalone server mode
- **postMessage**: For iframe embedding
- **Direct calls**: For same-context integration
- **Tauri IPC**: For Tauri applications
- **Custom**: User-defined transports

### 3. Renderer Abstraction

While internally using Three.js, the API never exposes Three.js internals:
- All 3D concepts are abstracted (Transform, Pose, etc.)
- Future renderer swaps are possible
- Consistent API regardless of implementation

### 4. Event-Driven Architecture

Bidirectional event system:
- Host can subscribe to visualization events
- RoboViz can request backend operations
- All state changes emit events

## Package Structure

```
roboviz/
├── packages/
│   ├── core/                    # Core rendering engine
│   │   ├── src/
│   │   │   ├── components/      # React Three Fiber components
│   │   │   │   ├── Scene.tsx
│   │   │   │   ├── Robot.tsx
│   │   │   │   ├── Trajectory.tsx
│   │   │   │   ├── Waypoint.tsx
│   │   │   │   ├── Obstacle.tsx
│   │   │   │   └── Camera.tsx
│   │   │   ├── store/           # Internal state management
│   │   │   │   └── vizStore.ts
│   │   │   ├── protocol/        # JSON-RPC handling
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── scene.ts
│   │   │   │   │   ├── robot.ts
│   │   │   │   │   ├── trajectory.ts
│   │   │   │   │   └── camera.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── dispatcher.ts
│   │   │   ├── transport/       # Transport implementations
│   │   │   │   ├── base.ts
│   │   │   │   ├── websocket.ts
│   │   │   │   ├── postmessage.ts
│   │   │   │   └── direct.ts
│   │   │   ├── utils/
│   │   │   │   ├── urdfLoader.ts
│   │   │   │   └── transforms.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── web-component/           # Web Component wrapper
│   │   ├── src/
│   │   │   ├── robo-viz.ts      # Custom Element definition
│   │   │   └── styles.ts
│   │   └── package.json
│   │
│   ├── react/                   # React adapter
│   │   ├── src/
│   │   │   ├── RoboViz.tsx      # Main React component
│   │   │   ├── useRoboViz.ts    # Hook for imperative control
│   │   │   ├── useRoboVizBridge.ts  # Bridge hook for backend
│   │   │   └── context.tsx
│   │   └── package.json
│   │
│   └── sdk/                     # Language SDKs
│       ├── typescript/
│       │   ├── src/
│       │   │   ├── client.ts
│       │   │   ├── types.ts
│       │   │   └── index.ts
│       │   └── package.json
│       ├── rust/
│       │   ├── src/
│       │   │   ├── lib.rs
│       │   │   ├── client.rs
│       │   │   └── types.rs
│       │   └── Cargo.toml
│       └── python/
│           ├── roboviz/
│           │   ├── __init__.py
│           │   ├── client.py
│           │   └── types.py
│           └── pyproject.toml
│
├── apps/
│   ├── standalone/              # Standalone web application
│   │   ├── src/
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   └── package.json
│   └── demo/                    # Demo application
│       └── ...
│
└── docs/
    ├── architecture.md          # This file
    ├── api.md                   # API reference
    ├── protocol.md              # Protocol specification
    └── integration.md           # Integration guide
```

## Component Architecture

### Core Components

#### Scene
Top-level container managing:
- Lighting setup
- Grid/floor
- Background
- Global transformations

#### Robot
URDF-based robot visualization:
- Joint angle control
- TCP pose display
- Visual/collision geometry toggle
- Multi-robot support

#### Trajectory
Time-based path visualization:
- Position/velocity/acceleration curves
- Playback control
- Progress indication

#### Waypoint
Discrete position markers:
- Interactive editing
- Grouping support
- IK preview

#### Obstacle
Environment objects:
- Primitives (box, sphere, cylinder)
- URDF models
- Collision visualization

### State Management

Internal Zustand store manages:
```typescript
interface VizState {
  // Scene
  scene: SceneConfig;
  
  // Robots
  robots: Map<RobotId, RobotState>;
  
  // Trajectories
  trajectories: Map<TrajectoryId, TrajectoryData>;
  activeTrajectory: TrajectoryId | null;
  playback: PlaybackState;
  
  // Waypoints
  waypoints: Map<WaypointId, WaypointData>;
  selectedWaypoint: WaypointId | null;
  
  // Obstacles
  obstacles: Map<ObstacleId, ObstacleData>;
  
  // Camera
  camera: CameraState;
  
  // Interaction
  selectedObject: ObjectId | null;
  hoveredObject: ObjectId | null;
}
```

### Transport Layer

```typescript
interface Transport {
  // Send message to host
  send(message: JsonRpcMessage): void;
  
  // Receive message from host
  onMessage(handler: (message: JsonRpcMessage) => void): void;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): void;
  
  // Status
  isConnected(): boolean;
}
```

## Integration Patterns

### Pattern 1: Direct Embedding (React)

```tsx
import { RoboViz } from '@aspect/roboviz-react';

function App() {
  return (
    <RoboViz
      robots={[{ urdf: '/robot.urdf', id: 'arm1' }]}
      onRobotClicked={(id) => console.log('Clicked:', id)}
    />
  );
}
```

### Pattern 2: Bridge Pattern (Tauri/Electron)

```tsx
import { RoboViz, useRoboVizBridge } from '@aspect/roboviz-react';
import { invoke } from '@tauri-apps/api/core';

function Scene() {
  const bridge = useRoboVizBridge({
    transport: 'tauri',
    handlers: {
      'ik.solve': async (params) => invoke('solve_ik', params),
      'trajectory.generate': async (params) => invoke('generate_trajectory', params),
    }
  });

  return <RoboViz bridge={bridge} />;
}
```

### Pattern 3: Standalone Server

```typescript
// Server
import { createRoboVizServer } from '@aspect/roboviz-server';

const server = createRoboVizServer({ port: 8080 });
server.start();

// Client
import { RoboVizClient } from '@aspect/roboviz-sdk';

const client = new RoboVizClient('ws://localhost:8080');
await client.connect();
await client.loadRobot('/robot.urdf');
```

### Pattern 4: iframe Embedding

```html
<iframe id="viz" src="https://roboviz.example.com/embed"></iframe>

<script>
const viz = document.getElementById('viz').contentWindow;

// Send command
viz.postMessage({
  jsonrpc: '2.0',
  method: 'robot.load',
  params: { urdf: '/robot.urdf' },
  id: 1
}, '*');

// Receive events
window.addEventListener('message', (e) => {
  if (e.data.method === 'robot.clicked') {
    console.log('Robot clicked:', e.data.params);
  }
});
</script>
```

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Rendering | Three.js + React Three Fiber | Mature, performant, declarative |
| State | Zustand | Simple, TypeScript-friendly |
| Protocol | JSON-RPC 2.0 | Standard, language-agnostic |
| Build | Vite + tsup | Fast, modern bundling |
| Package Manager | pnpm | Efficient monorepo support |
| Types | TypeScript | Type safety, documentation |

## Performance Considerations

1. **Lazy Loading**: URDF models loaded on demand
2. **Instancing**: Multiple identical meshes share geometry
3. **LOD**: Level-of-detail for complex scenes
4. **Culling**: Frustum and occlusion culling
5. **Web Workers**: Heavy computations off main thread
6. **Streaming**: Large trajectories streamed incrementally
