# RoboViz

A standalone, embeddable 3D robot visualization component for industrial robotics applications.

## Overview

RoboViz is a cross-platform, framework-agnostic 3D visualization library designed for robot debugging and simulation software. It provides a standardized JSON-RPC 2.0 interface for controlling robot visualization, trajectory playback, and user interaction.

### Key Features

- **Protocol-Driven**: JSON-RPC 2.0 standardized communication
- **Cross-Platform Embedding**: Web Component / React / iframe
- **Backend Agnostic**: Connect to any backend via pluggable Transport
- **Independent Release**: npm packages + CDN distribution
- **Rich Visualization**: URDF robots, trajectories, waypoints, obstacles

## Quick Start

### Web Component

```html
<script type="module" src="https://unpkg.com/@aspect/roboviz"></script>

<robo-viz id="viz" theme="dark" grid="true"></robo-viz>

<script type="module">
  const viz = document.getElementById('viz');
  await viz.loadRobot('/models/robot.urdf');
  viz.setJointAngles([0, 0.5, -0.3, 0, 0, 0]);
</script>
```

### React

```tsx
import { RoboViz, useRoboViz } from '@aspect/roboviz-react';

function App() {
  const viz = useRoboViz();

  useEffect(() => {
    viz.loadRobot('/models/robot.urdf');
  }, []);

  return <RoboViz ref={viz} onRobotClicked={handleClick} />;
}
```

### Tauri Integration

```tsx
import { RoboViz, useRoboVizBridge } from '@aspect/roboviz-react';
import { invoke } from '@tauri-apps/api/core';

function Scene3D() {
  const bridge = useRoboVizBridge({
    transport: 'tauri',
    handlers: {
      'ik.solve': (params) => invoke('solve_ik', params),
      'trajectory.generate': (params) => invoke('generate_trajectory', params),
    }
  });

  return <RoboViz bridge={bridge} theme="dark" />;
}
```

## Documentation

- [Architecture](./docs/architecture.md) - System design and components
- [API Reference](./docs/api.md) - Complete JSON-RPC API documentation
- [Integration Guide](./docs/integration.md) - How to embed RoboViz
- [Protocol Specification](./docs/protocol.md) - JSON-RPC message format

## Packages

| Package | Description |
|---------|-------------|
| `@aspect/roboviz-core` | Core rendering engine |
| `@aspect/roboviz-react` | React bindings |
| `@aspect/roboviz-web-component` | Web Component wrapper |
| `@aspect/roboviz-sdk` | TypeScript SDK |

## Development

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## License

MIT
