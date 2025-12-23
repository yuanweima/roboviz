# RoboViz Integration Guide

This guide covers how to integrate RoboViz into various host applications.

## Installation

### npm

```bash
# Core package (for custom integrations)
npm install @aspect/roboviz-core

# React integration
npm install @aspect/roboviz-react

# Web Component
npm install @aspect/roboviz-web-component

# SDK only (for remote control)
npm install @aspect/roboviz-sdk
```

### CDN

```html
<!-- Web Component -->
<script type="module" src="https://unpkg.com/@aspect/roboviz-web-component"></script>

<!-- SDK only -->
<script type="module" src="https://unpkg.com/@aspect/roboviz-sdk"></script>
```

---

## Integration Methods

### Method 1: React Component

Best for: React applications where you want tight integration.

```tsx
import { RoboViz, useRoboViz } from '@aspect/roboviz-react';

function RobotScene() {
  const vizRef = useRoboViz();

  useEffect(() => {
    // Load robot when component mounts
    vizRef.current?.loadRobot('/models/robot.urdf', {
      id: 'main-robot',
      transform: { position: [0, 0, 0], orientation: [1, 0, 0, 0] }
    });
  }, []);

  const handleJointChange = (angles: number[]) => {
    vizRef.current?.setJointAngles('main-robot', angles);
  };

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <RoboViz
        ref={vizRef}
        theme="dark"
        gridEnabled={true}
        onRobotClicked={(e) => console.log('Clicked:', e.robotId)}
        onJointChanged={(e) => console.log('Joints:', e.angles)}
      />
    </div>
  );
}
```

### Method 2: Web Component

Best for: Framework-agnostic embedding, Vue, Angular, vanilla JS.

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://unpkg.com/@aspect/roboviz-web-component"></script>
  <style>
    robo-viz {
      width: 100%;
      height: 500px;
      display: block;
    }
  </style>
</head>
<body>
  <robo-viz 
    id="viz"
    theme="dark"
    grid-enabled="true"
  ></robo-viz>

  <script type="module">
    const viz = document.getElementById('viz');
    
    // Wait for component to be ready
    viz.addEventListener('ready', async () => {
      // Load robot
      await viz.loadRobot('/models/robot.urdf', {
        id: 'main-robot'
      });
      
      // Set initial pose
      viz.setJointAngles('main-robot', [0, 0.5, -0.3, 0, 1.2, 0]);
    });
    
    // Listen for events
    viz.addEventListener('robot-clicked', (e) => {
      console.log('Robot clicked:', e.detail);
    });
  </script>
</body>
</html>
```

### Method 3: iframe Embedding

Best for: Complete isolation, cross-origin scenarios, simple integration.

```html
<!-- Host page -->
<iframe 
  id="roboviz-frame"
  src="https://roboviz.example.com/embed"
  style="width: 100%; height: 500px; border: none;"
  allow="fullscreen"
></iframe>

<script>
  const frame = document.getElementById('roboviz-frame');
  
  // Send commands via postMessage
  function sendCommand(method, params) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);
      
      const handler = (e) => {
        if (e.data.id === id) {
          window.removeEventListener('message', handler);
          if (e.data.error) {
            reject(e.data.error);
          } else {
            resolve(e.data.result);
          }
        }
      };
      
      window.addEventListener('message', handler);
      
      frame.contentWindow.postMessage({
        jsonrpc: '2.0',
        method,
        params,
        id
      }, '*');
    });
  }
  
  // Example usage
  async function init() {
    await sendCommand('robot.load', {
      urdf: '/models/robot.urdf',
      id: 'main-robot'
    });
    
    await sendCommand('robot.setJointAngles', {
      id: 'main-robot',
      angles: [0, 0.5, -0.3, 0, 1.2, 0]
    });
  }
  
  frame.onload = init;
</script>
```

---

## Tauri Integration

For Tauri applications, use the bridge pattern to connect RoboViz with your Rust backend.

### Setup

```tsx
// src/components/Scene3D.tsx
import { RoboViz, useRoboVizBridge } from '@aspect/roboviz-react';
import { invoke } from '@tauri-apps/api/core';

function Scene3D() {
  // Create bridge with backend handlers
  const bridge = useRoboVizBridge({
    transport: 'tauri',
    handlers: {
      // Handle IK requests
      'ik.solve': async ({ robotId, targetPose }) => {
        return await invoke('solve_ik', { robotId, targetPose });
      },
      
      // Handle trajectory generation
      'trajectory.generate': async ({ robotId, waypoints, options }) => {
        return await invoke('generate_trajectory', { 
          robotId, 
          waypoints, 
          options 
        });
      },
      
      // Handle collision checking
      'collision.check': async ({ robotId, angles }) => {
        return await invoke('check_collision', { robotId, angles });
      },
      
      // Handle path planning
      'path.plan': async ({ robotId, start, goal }) => {
        return await invoke('plan_path', { robotId, start, goal });
      }
    }
  });

  // Listen for events from RoboViz
  useEffect(() => {
    bridge.on('robot.jointChanged', (e) => {
      // Sync with your application state
      useAppStore.getState().setJointAngles(e.robotId, e.angles);
    });
    
    bridge.on('waypoint.selected', (e) => {
      useAppStore.getState().selectWaypoint(e.waypointId);
    });
  }, [bridge]);

  return (
    <RoboViz 
      bridge={bridge}
      theme="dark"
    />
  );
}
```

### Backend Commands (Rust)

```rust
// src-tauri/src/commands/roboviz_commands.rs
use tauri::State;
use crate::trajx_adapter::{TrajxRobot, TrajxTrajectory};

#[tauri::command]
pub async fn solve_ik(
    robot_id: String,
    target_pose: PoseData,
    state: State<'_, AppState>,
) -> Result<IKResult, String> {
    let robot = state.get_robot(&robot_id)?;
    let angles = robot.solve_ik(&target_pose)?;
    Ok(IKResult { angles, success: true })
}

#[tauri::command]
pub async fn generate_trajectory(
    robot_id: String,
    waypoints: Vec<Vec<f64>>,
    options: TrajectoryOptions,
    state: State<'_, AppState>,
) -> Result<TrajectoryData, String> {
    let robot = state.get_robot(&robot_id)?;
    let trajectory = TrajxTrajectory::generate(
        &robot,
        &waypoints,
        &options,
    )?;
    Ok(trajectory.into())
}

#[tauri::command]
pub async fn check_collision(
    robot_id: String,
    angles: Vec<f64>,
    state: State<'_, AppState>,
) -> Result<CollisionResult, String> {
    let robot = state.get_robot(&robot_id)?;
    let result = robot.check_collision(&angles)?;
    Ok(result)
}
```

---

## Electron Integration

Similar to Tauri, use the bridge pattern with Electron's IPC.

```tsx
// renderer/components/Scene3D.tsx
import { RoboViz, useRoboVizBridge } from '@aspect/roboviz-react';

function Scene3D() {
  const bridge = useRoboVizBridge({
    transport: 'electron',
    handlers: {
      'ik.solve': async (params) => {
        return await window.electronAPI.solveIK(params);
      },
      'trajectory.generate': async (params) => {
        return await window.electronAPI.generateTrajectory(params);
      }
    }
  });

  return <RoboViz bridge={bridge} />;
}
```

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  solveIK: (params) => ipcRenderer.invoke('solve-ik', params),
  generateTrajectory: (params) => ipcRenderer.invoke('generate-trajectory', params),
});
```

---

## Remote Control via SDK

Control RoboViz from any language using the SDK.

### TypeScript

```typescript
import { RoboVizClient } from '@aspect/roboviz-sdk';

async function main() {
  // Connect to RoboViz server
  const client = new RoboVizClient('ws://localhost:8080');
  await client.connect();

  // Load robot
  const robot = await client.loadRobot('/models/robot.urdf', {
    id: 'arm-1'
  });
  console.log(`Loaded robot with ${robot.dof} DOF`);

  // Set joint angles
  await client.setJointAngles('arm-1', [0, 0.5, -0.3, 0, 1.2, 0]);

  // Subscribe to events
  client.on('robot.clicked', (e) => {
    console.log('Robot clicked:', e.robotId, e.linkName);
  });

  // Load and play trajectory
  await client.loadTrajectory('traj-1', 'arm-1', trajectoryData);
  await client.playTrajectory('traj-1', { speed: 1.0, loop: true });
}
```

### Python

```python
from roboviz import RoboVizClient
import asyncio

async def main():
    # Connect to RoboViz server
    client = RoboVizClient('ws://localhost:8080')
    await client.connect()

    # Load robot
    robot = await client.load_robot('/models/robot.urdf', id='arm-1')
    print(f'Loaded robot with {robot.dof} DOF')

    # Set joint angles
    await client.set_joint_angles('arm-1', [0, 0.5, -0.3, 0, 1.2, 0])

    # Subscribe to events
    @client.on('robot.clicked')
    def on_click(event):
        print(f'Robot clicked: {event.robot_id}')

    # Keep running
    await asyncio.sleep(3600)

asyncio.run(main())
```

### Rust

```rust
use roboviz_sdk::{RoboVizClient, RobotOptions};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to RoboViz server
    let client = RoboVizClient::connect("ws://localhost:8080").await?;

    // Load robot
    let robot = client.load_robot(
        "/models/robot.urdf",
        RobotOptions {
            id: "arm-1".to_string(),
            ..Default::default()
        }
    ).await?;
    println!("Loaded robot with {} DOF", robot.dof);

    // Set joint angles
    client.set_joint_angles("arm-1", &[0.0, 0.5, -0.3, 0.0, 1.2, 0.0]).await?;

    // Subscribe to events
    client.on("robot.clicked", |event| {
        println!("Robot clicked: {}", event.robot_id);
    });

    Ok(())
}
```

---

## Migrating from Current Implementation

If you're migrating from the current `Scene3D.tsx` implementation:

### Before (Current)

```tsx
// Current implementation in Orchestrator
import { Canvas } from '@react-three/fiber';
import { useRobotStore } from '../store/robotStore';
import URDFRobot from './URDFRobot';
import TrajectoryVisualizer from './TrajectoryVisualizer';
// ... many more imports

function Scene3D() {
  const {
    robots,
    currentRobotId,
    trajectory,
    playbackTime,
    // ... many more state items
  } = useRobotStore();

  return (
    <Canvas>
      {/* Complex scene setup */}
      {robots.map(robot => (
        <URDFRobot key={robot.id} {...props} />
      ))}
      <TrajectoryVisualizer />
      {/* ... many more components */}
    </Canvas>
  );
}
```

### After (With RoboViz)

```tsx
// New implementation with RoboViz
import { RoboViz, useRoboVizBridge } from '@aspect/roboviz-react';
import { invoke } from '@tauri-apps/api/core';
import { useRobotStore } from '../store/robotStore';

function Scene3D() {
  const bridge = useRoboVizBridge({
    transport: 'tauri',
    handlers: {
      'ik.solve': (p) => invoke('solve_ik', p),
      'trajectory.generate': (p) => invoke('generate_trajectory', p),
    }
  });

  // Sync RoboViz events with app state
  useEffect(() => {
    bridge.on('robot.jointChanged', ({ robotId, angles }) => {
      useRobotStore.getState().setJointAngles(robotId, angles);
    });
  }, [bridge]);

  // Sync app state to RoboViz
  const { robots, trajectory } = useRobotStore();
  
  useEffect(() => {
    robots.forEach(robot => {
      bridge.send('robot.load', {
        urdf: robot.urdf_path,
        id: robot.id,
        transform: robot.transform
      });
    });
  }, [robots]);

  return <RoboViz bridge={bridge} theme="dark" />;
}
```

### Migration Checklist

1. **Install RoboViz packages**
   ```bash
   npm install @aspect/roboviz-react
   ```

2. **Create bridge configuration**
   - Map your existing Tauri commands to bridge handlers
   - `solve_ik` → `ik.solve`
   - `generate_trajectory` → `trajectory.generate`

3. **Replace Scene3D component**
   - Remove all React Three Fiber imports
   - Use `RoboViz` component with bridge

4. **Update state synchronization**
   - Subscribe to RoboViz events
   - Push state changes to RoboViz via bridge

5. **Test thoroughly**
   - Verify robot loading
   - Verify joint control
   - Verify trajectory playback
   - Verify user interactions

---

## Configuration Options

### RoboViz Props

```typescript
interface RoboVizProps {
  // Theme
  theme?: 'light' | 'dark';
  
  // Grid
  gridEnabled?: boolean;
  gridSize?: number;
  gridDivisions?: number;
  
  // Background
  backgroundColor?: string;
  
  // Camera
  cameraPosition?: [number, number, number];
  cameraFOV?: number;
  orbitControlsEnabled?: boolean;
  
  // Bridge (for backend integration)
  bridge?: RoboVizBridge;
  
  // Event handlers
  onReady?: () => void;
  onRobotClicked?: (e: RobotClickEvent) => void;
  onRobotJointChanged?: (e: JointChangeEvent) => void;
  onTrajectoryProgress?: (e: TrajectoryProgressEvent) => void;
  onWaypointSelected?: (e: WaypointSelectEvent) => void;
  onCameraChanged?: (e: CameraChangeEvent) => void;
}
```

### Web Component Attributes

```html
<robo-viz
  theme="dark"
  grid-enabled="true"
  grid-size="10"
  grid-divisions="10"
  background-color="#0a0a0a"
  camera-position="3,3,3"
  camera-fov="50"
></robo-viz>
```
