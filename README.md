# RoboViz

A cross-platform 3D robot visualization library with multi-language SDK support.

## Overview

RoboViz provides a simple, consistent API for visualizing robots across different programming languages. Whether you're using Python, C++, Rust, or building a React application, RoboViz offers a unified way to display robots, trajectories, obstacles, and more.

### Key Features

- **Zero-Config for SDK Users**: Python/C++ users can start with just `rv.init()`
- **Multi-Language SDKs**: Python, TypeScript, Rust, C++ (planned)
- **React Integration**: Direct component usage for web applications
- **Protocol-Driven**: JSON-RPC 2.0 for extensibility
- **Rich Visualization**:
  - URDF robots with mesh loading and joint control
  - Trajectory playback with animation
  - Waypoints and path visualization
  - Obstacles (box, sphere, cylinder, mesh)
  - Safety zones with transparency
  - Coordinate frames hierarchy
  - Point cloud rendering (uniform, height-based, intensity-based colors)
  - TCP pose display
  - Collision detection
- **Interactive Controls**:
  - Control panel UI for scene settings
  - Keyboard shortcuts
  - Camera controls
  - Robot interaction (click, drag)

## Quick Start

### Python (Recommended)

```python
import roboviz as rv

# Initialize - starts server, opens browser
rv.init()

# Add and control a robot
robot = rv.add_robot("/path/to/robot.urdf")
robot.set_joints([0, 0.5, 0.8, 0, 0, 0])

# Add obstacles
rv.add_box(size=[0.2, 0.2, 0.2], position=[0.5, 0.1, 0.3], color="#ff6b6b")
rv.add_sphere(radius=0.1, position=[0.3, 0.2, 0.1], color="#4ecdc4")

# Add coordinate frames
rv.add_frame("world", position=[0, 0, 0])
rv.add_frame("tool", position=[0.5, 0, 0.5], parent="world")

# Add point cloud
rv.add_point_cloud(
    points=[[x, y, z] for x in range(-10, 10) for y in range(-10, 10) for z in [0]],
    color_mode="height"
)

# Configure scene
rv.set_scene(background="#1a1a2e", shadows=True, ground_plane=True)

# Enable collision detection
rv.enable_collision_detection(True)

# Play trajectory
trajectory = [
    {"time": 0.0, "joints": [0, 0, 0, 0, 0, 0]},
    {"time": 1.0, "joints": [0.5, 0.3, 0.8, 0, 0, 0]},
    {"time": 2.0, "joints": [0, 0, 0, 0, 0, 0]},
]
rv.play_trajectory(robot.id, trajectory, speed=1.0, loop=True)

# Keep running
rv.show()
```

### React Direct Integration

```tsx
import { Canvas } from '@react-three/fiber';
import { Robot, Trajectory, PointCloud } from '@aspect/roboviz-core';

function App() {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);

  return (
    <Canvas>
      <Robot
        urdfPath="/models/robot.urdf"
        jointAngles={joints}
        position={[0, 0, 0]}
        showTcpFrame={true}
      />
      <Trajectory
        waypoints={trajectoryData}
        color="#4ecdc4"
        lineWidth={2}
      />
      <PointCloud
        points={pointData}
        colorMode="height"
        pointSize={0.02}
      />
    </Canvas>
  );
}
```

### Tauri/Electron Integration

```tsx
import { RoboViz, useRoboVizBridge } from '@aspect/roboviz-react';
import { invoke } from '@tauri-apps/api/core';

function Scene3D() {
  const bridge = useRoboVizBridge({
    transport: 'tauri',
    handlers: {
      'ik.solve': (params) => invoke('solve_ik', params),
    }
  });

  return <RoboViz bridge={bridge} />;
}
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  User Application (Python / C++ / React / etc.)     │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────┐
│  SDK Layer                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │ Python  │ │  C++    │ │  Rust   │ │ TypeScript│ │
│  │  SDK    │ │  SDK    │ │  SDK    │ │   React   │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘ │
└───────┼───────────┼───────────┼─────────────┼───────┘
        │  Embedded │ Server    │             │ Direct
        └───────────┴───────────┘             │
                    │                         │
┌───────────────────┴─────────────────────────┴───────┐
│  Viewer (Browser)                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │  Protocol Handler → State Store → Renderer  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| `@aspect/roboviz-core` | Core rendering components (Robot, Scene, Trajectory, PointCloud, etc.) |
| `@aspect/roboviz-viewer` | Standalone viewer for SDK usage |
| `roboviz` (PyPI) | Python SDK |

## Installation

### Python

```bash
pip install roboviz
```

### npm (React)

```bash
npm install @aspect/roboviz-core
```

## Python SDK API Reference

### Initialization

```python
rv.init(host="127.0.0.1", ws_port=8766, http_port=8765, open_browser=True)
rv.show()  # Block and keep running
rv.close()  # Clean shutdown
```

### Robot

```python
robot = rv.add_robot(urdf_path, id=None, position=[0,0,0], color=None)
robot.set_joints([j1, j2, j3, j4, j5, j6])
robot.get_joints()  # Returns current joint angles
robot.get_tcp_pose()  # Returns TCP position and orientation
rv.remove_robot(robot_id)
```

### Obstacles

```python
rv.add_box(size=[w, h, d], position=[x, y, z], rotation=[rx, ry, rz], color="#hex", opacity=1.0)
rv.add_sphere(radius=r, position=[x, y, z], color="#hex", opacity=1.0)
rv.add_cylinder(radius=r, height=h, position=[x, y, z], color="#hex", opacity=1.0)
rv.add_mesh(mesh_path, position=[x, y, z], scale=[sx, sy, sz], color="#hex")
rv.remove_obstacle(obstacle_id)
```

### Coordinate Frames

```python
rv.add_frame(name, position=[x, y, z], rotation=[rx, ry, rz], parent=None, scale=1.0)
rv.remove_frame(name)
```

### Point Cloud

```python
rv.add_point_cloud(
    points=[[x, y, z], ...],
    colors=[[r, g, b], ...],  # Optional, 0-255 per channel
    intensities=[...],  # Optional, for intensity color mode
    point_size=0.02,
    color_mode="uniform" | "height" | "intensity",
    color="#hex",  # For uniform mode
    id=None
)
rv.remove_point_cloud(point_cloud_id)
```

### Trajectory

```python
trajectory = [
    {"time": 0.0, "joints": [j1, j2, j3, j4, j5, j6]},
    {"time": 1.0, "joints": [j1, j2, j3, j4, j5, j6]},
    ...
]
rv.play_trajectory(robot_id, trajectory, speed=1.0, loop=False)
rv.pause_trajectory(robot_id)
rv.stop_trajectory(robot_id)
```

### Scene Configuration

```python
rv.set_scene(
    background="#1a1a2e",
    shadows=True,
    ground_plane=True,
    ground_color="#303030",
    environment="warehouse" | "sunset" | "dawn" | "night" | "studio",
    ambient_intensity=0.5,
    directional_intensity=1.0
)
```

### Collision Detection

```python
rv.enable_collision_detection(True)
# Collision events are sent via WebSocket notifications
```

### Safety Zones

```python
rv.add_safety_zone(
    type="box" | "sphere" | "cylinder",
    position=[x, y, z],
    size=[w, h, d] | radius=r,  # Depending on type
    color="#ff0000",
    opacity=0.3,
    id=None
)
rv.remove_safety_zone(zone_id)
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Reset camera view |
| `G` | Toggle grid |
| `A` | Toggle axes helper |
| `Space` | Play/Pause trajectory |
| `Escape` | Stop trajectory |

## Documentation

- [Architecture](./docs/architecture-v2.md) - System design and integration patterns
- [Examples](./examples/README.md) - Usage examples

## Development

```bash
# Install dependencies
pnpm install

# Start viewer development
pnpm --filter @aspect/roboviz-viewer dev

# Start react-basic example
pnpm --filter roboviz-react-basic dev

# Build all packages
pnpm build

# Build viewer and copy to Python SDK
pnpm --filter @aspect/roboviz-viewer build
cp -r packages/viewer/dist/* packages/sdk/python/roboviz/_viewer/

# Run Python example
cd packages/sdk/python
uv venv && uv pip install -e .
python ../../examples/python/full_features_demo.py
```

## License

MIT
