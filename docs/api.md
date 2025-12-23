# RoboViz API Reference

Complete JSON-RPC 2.0 API documentation for RoboViz.

## Message Format

All messages follow the JSON-RPC 2.0 specification:

```typescript
// Request
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: object;
  id: string | number;
}

// Response
interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

// Notification (no response expected)
interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: object;
}
```

---

## Scene API

### scene.create

Create or reset the scene with configuration.

```typescript
// Request
{
  "jsonrpc": "2.0",
  "method": "scene.create",
  "params": {
    "background": "#0a0a0a",
    "grid": {
      "enabled": true,
      "size": 10,
      "divisions": 10,
      "color": "#4a4a4a"
    },
    "lighting": {
      "ambient": { "intensity": 0.4, "color": "#ffffff" },
      "directional": { "intensity": 0.8, "position": [10, 10, 5] }
    }
  },
  "id": 1
}

// Response
{
  "jsonrpc": "2.0",
  "result": { "success": true },
  "id": 1
}
```

### scene.reset

Reset scene to default state, removing all objects.

```typescript
{
  "jsonrpc": "2.0",
  "method": "scene.reset",
  "id": 2
}
```

### scene.getState

Get current scene state.

```typescript
// Request
{
  "jsonrpc": "2.0",
  "method": "scene.getState",
  "id": 3
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "robots": ["robot-1", "robot-2"],
    "obstacles": ["obstacle-1"],
    "trajectories": ["traj-1"],
    "activeTrajectory": "traj-1"
  },
  "id": 3
}
```

---

## Robot API

### robot.load

Load a robot from URDF.

```typescript
// Request
{
  "jsonrpc": "2.0",
  "method": "robot.load",
  "params": {
    "urdf": "/models/robot.urdf",
    "id": "robot-1",
    "transform": {
      "position": [0, 0, 0],
      "orientation": [1, 0, 0, 0]  // quaternion [w, x, y, z]
    },
    "options": {
      "showAxes": true,
      "showJoints": false,
      "showEndEffector": true
    }
  },
  "id": 4
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "id": "robot-1",
    "dof": 6,
    "jointNames": ["joint1", "joint2", "joint3", "joint4", "joint5", "joint6"],
    "jointLimits": [
      [-3.14, 3.14],
      [-2.0, 2.0],
      [-2.5, 2.5],
      [-3.14, 3.14],
      [-2.0, 2.0],
      [-3.14, 3.14]
    ]
  },
  "id": 4
}
```

### robot.unload

Remove a robot from the scene.

```typescript
{
  "jsonrpc": "2.0",
  "method": "robot.unload",
  "params": { "id": "robot-1" },
  "id": 5
}
```

### robot.setJointAngles

Set robot joint angles.

```typescript
{
  "jsonrpc": "2.0",
  "method": "robot.setJointAngles",
  "params": {
    "id": "robot-1",
    "angles": [0, 0.5, -0.3, 0, 1.2, 0]  // radians
  },
  "id": 6
}
```

### robot.getJointAngles

Get current joint angles.

```typescript
// Request
{
  "jsonrpc": "2.0",
  "method": "robot.getJointAngles",
  "params": { "id": "robot-1" },
  "id": 7
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "angles": [0, 0.5, -0.3, 0, 1.2, 0]
  },
  "id": 7
}
```

### robot.setTransform

Set robot base transform.

```typescript
{
  "jsonrpc": "2.0",
  "method": "robot.setTransform",
  "params": {
    "id": "robot-1",
    "transform": {
      "position": [1.0, 0, 0],
      "orientation": [1, 0, 0, 0]
    }
  },
  "id": 8
}
```

### robot.getTCPPose

Get current TCP (Tool Center Point) pose.

```typescript
// Request
{
  "jsonrpc": "2.0",
  "method": "robot.getTCPPose",
  "params": { "id": "robot-1" },
  "id": 9
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "position": [0.5, 0.3, 0.8],
    "orientation": [0.707, 0, 0.707, 0]
  },
  "id": 9
}
```

### robot.setVisualization

Configure robot visualization options.

```typescript
{
  "jsonrpc": "2.0",
  "method": "robot.setVisualization",
  "params": {
    "id": "robot-1",
    "options": {
      "showAxes": true,
      "showJoints": true,
      "showEndEffector": true,
      "showCollisionGeometry": false,
      "opacity": 1.0,
      "color": null  // null = original colors
    }
  },
  "id": 10
}
```

---

## Trajectory API

### trajectory.load

Load trajectory data.

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.load",
  "params": {
    "id": "traj-1",
    "robotId": "robot-1",
    "data": {
      "duration": 5.0,
      "times": [0, 0.1, 0.2, ...],
      "positions": [[0,0,0,0,0,0], [0.1,0,0,0,0,0], ...],
      "velocities": [[0,0,0,0,0,0], [0.5,0,0,0,0,0], ...],
      "accelerations": [[0,0,0,0,0,0], [1.0,0,0,0,0,0], ...]
    }
  },
  "id": 11
}
```

### trajectory.play

Start trajectory playback.

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.play",
  "params": {
    "id": "traj-1",
    "speed": 1.0,
    "loop": false,
    "startTime": 0
  },
  "id": 12
}
```

### trajectory.pause

Pause playback.

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.pause",
  "id": 13
}
```

### trajectory.stop

Stop playback and reset to start.

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.stop",
  "id": 14
}
```

### trajectory.seek

Seek to specific time.

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.seek",
  "params": { "time": 2.5 },
  "id": 15
}
```

### trajectory.setSpeed

Set playback speed multiplier.

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.setSpeed",
  "params": { "speed": 2.0 },
  "id": 16
}
```

### trajectory.setVisualization

Configure trajectory visualization.

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.setVisualization",
  "params": {
    "id": "traj-1",
    "options": {
      "showPath": true,
      "pathColor": "#00ff00",
      "pathWidth": 2,
      "showVelocityVectors": false,
      "showAccelerationIndicator": false
    }
  },
  "id": 17
}
```

---

## Waypoint API

### waypoint.add

Add a waypoint.

```typescript
{
  "jsonrpc": "2.0",
  "method": "waypoint.add",
  "params": {
    "id": "wp-1",
    "robotId": "robot-1",
    "jointAngles": [0, 0.5, -0.3, 0, 1.2, 0],
    "tcpPose": {
      "position": [0.5, 0.3, 0.8],
      "orientation": [0.707, 0, 0.707, 0]
    },
    "label": "Pick Position",
    "color": "#ff0000"
  },
  "id": 18
}
```

### waypoint.remove

Remove a waypoint.

```typescript
{
  "jsonrpc": "2.0",
  "method": "waypoint.remove",
  "params": { "id": "wp-1" },
  "id": 19
}
```

### waypoint.update

Update waypoint properties.

```typescript
{
  "jsonrpc": "2.0",
  "method": "waypoint.update",
  "params": {
    "id": "wp-1",
    "jointAngles": [0, 0.6, -0.4, 0, 1.3, 0],
    "label": "Pick Position (Updated)"
  },
  "id": 20
}
```

### waypoint.setSelected

Select a waypoint for editing.

```typescript
{
  "jsonrpc": "2.0",
  "method": "waypoint.setSelected",
  "params": { "id": "wp-1" },
  "id": 21
}
```

---

## Obstacle API

### obstacle.add

Add an obstacle to the scene.

```typescript
// Primitive obstacle
{
  "jsonrpc": "2.0",
  "method": "obstacle.add",
  "params": {
    "id": "obs-1",
    "type": "primitive",
    "primitive": {
      "shape": "box",  // "box" | "sphere" | "cylinder"
      "dimensions": [0.5, 0.5, 1.0]  // [width, depth, height]
    },
    "transform": {
      "position": [1.0, 0, 0.5],
      "orientation": [1, 0, 0, 0]
    },
    "color": "#ff6b6b",
    "opacity": 0.8
  },
  "id": 22
}

// URDF obstacle
{
  "jsonrpc": "2.0",
  "method": "obstacle.add",
  "params": {
    "id": "obs-2",
    "type": "urdf",
    "urdf": "/models/table.urdf",
    "transform": {
      "position": [0, 1.0, 0],
      "orientation": [1, 0, 0, 0]
    }
  },
  "id": 23
}
```

### obstacle.remove

Remove an obstacle.

```typescript
{
  "jsonrpc": "2.0",
  "method": "obstacle.remove",
  "params": { "id": "obs-1" },
  "id": 24
}
```

### obstacle.setTransform

Update obstacle transform.

```typescript
{
  "jsonrpc": "2.0",
  "method": "obstacle.setTransform",
  "params": {
    "id": "obs-1",
    "transform": {
      "position": [1.5, 0, 0.5],
      "orientation": [1, 0, 0, 0]
    }
  },
  "id": 25
}
```

---

## Camera API

### camera.setPosition

Set camera position.

```typescript
{
  "jsonrpc": "2.0",
  "method": "camera.setPosition",
  "params": {
    "position": [3, 3, 3]
  },
  "id": 26
}
```

### camera.lookAt

Set camera target.

```typescript
{
  "jsonrpc": "2.0",
  "method": "camera.lookAt",
  "params": {
    "target": [0, 0, 0.5]
  },
  "id": 27
}
```

### camera.setFOV

Set field of view.

```typescript
{
  "jsonrpc": "2.0",
  "method": "camera.setFOV",
  "params": { "fov": 50 },
  "id": 28
}
```

### camera.focusOn

Focus camera on an object.

```typescript
{
  "jsonrpc": "2.0",
  "method": "camera.focusOn",
  "params": {
    "objectId": "robot-1",
    "padding": 1.5  // multiplier for framing
  },
  "id": 29
}
```

### camera.setOrbitControls

Configure orbit controls.

```typescript
{
  "jsonrpc": "2.0",
  "method": "camera.setOrbitControls",
  "params": {
    "enabled": true,
    "enableDamping": true,
    "dampingFactor": 0.05,
    "minDistance": 0.5,
    "maxDistance": 20,
    "autoRotate": false
  },
  "id": 30
}
```

---

## Events API

### events.subscribe

Subscribe to events (notification-based).

```typescript
{
  "jsonrpc": "2.0",
  "method": "events.subscribe",
  "params": {
    "events": [
      "robot.clicked",
      "robot.jointChanged",
      "trajectory.progress",
      "trajectory.completed",
      "waypoint.selected",
      "camera.changed"
    ]
  },
  "id": 31
}
```

### events.unsubscribe

Unsubscribe from events.

```typescript
{
  "jsonrpc": "2.0",
  "method": "events.unsubscribe",
  "params": {
    "events": ["camera.changed"]
  },
  "id": 32
}
```

---

## Event Notifications

Events are sent as JSON-RPC notifications (no `id` field):

### robot.clicked

```typescript
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

### robot.jointChanged

```typescript
{
  "jsonrpc": "2.0",
  "method": "robot.jointChanged",
  "params": {
    "robotId": "robot-1",
    "angles": [0, 0.5, -0.3, 0, 1.2, 0],
    "source": "user"  // "user" | "playback" | "api"
  }
}
```

### trajectory.progress

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.progress",
  "params": {
    "trajectoryId": "traj-1",
    "time": 2.5,
    "progress": 0.5  // 0-1
  }
}
```

### trajectory.completed

```typescript
{
  "jsonrpc": "2.0",
  "method": "trajectory.completed",
  "params": {
    "trajectoryId": "traj-1"
  }
}
```

### waypoint.selected

```typescript
{
  "jsonrpc": "2.0",
  "method": "waypoint.selected",
  "params": {
    "waypointId": "wp-1"
  }
}
```

### workpoint.created

```typescript
{
  "jsonrpc": "2.0",
  "method": "workpoint.created",
  "params": {
    "position": [0.5, 0.3, 0.1],
    "normal": [0, 0, 1],
    "objectId": "workpiece-1"
  }
}
```

### camera.changed

```typescript
{
  "jsonrpc": "2.0",
  "method": "camera.changed",
  "params": {
    "position": [3, 3, 3],
    "target": [0, 0, 0.5],
    "fov": 50
  }
}
```

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC format |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Invalid parameters |
| -32603 | Internal error | Internal error |
| -32000 | Robot not found | Robot ID doesn't exist |
| -32001 | Trajectory not found | Trajectory ID doesn't exist |
| -32002 | URDF load failed | Failed to load URDF |
| -32003 | Invalid transform | Invalid transform data |
| -32004 | Playback error | Trajectory playback error |

---

## TypeScript Types

```typescript
// Basic types
type Vector3 = [number, number, number];
type Quaternion = [number, number, number, number]; // [w, x, y, z]

interface Transform {
  position: Vector3;
  orientation: Quaternion;
}

interface Pose {
  position: Vector3;
  orientation: Quaternion;
}

// Robot types
interface RobotOptions {
  showAxes?: boolean;
  showJoints?: boolean;
  showEndEffector?: boolean;
  showCollisionGeometry?: boolean;
  opacity?: number;
  color?: string | null;
}

interface RobotInfo {
  id: string;
  dof: number;
  jointNames: string[];
  jointLimits: [number, number][];
}

// Trajectory types
interface TrajectoryData {
  duration: number;
  times: number[];
  positions: number[][];
  velocities?: number[][];
  accelerations?: number[][];
}

interface PlaybackOptions {
  speed?: number;
  loop?: boolean;
  startTime?: number;
}

// Waypoint types
interface WaypointData {
  id: string;
  robotId: string;
  jointAngles: number[];
  tcpPose?: Pose;
  label?: string;
  color?: string;
}

// Obstacle types
type PrimitiveShape = 'box' | 'sphere' | 'cylinder';

interface PrimitiveObstacle {
  type: 'primitive';
  primitive: {
    shape: PrimitiveShape;
    dimensions: Vector3;
  };
  transform: Transform;
  color?: string;
  opacity?: number;
}

interface UrdfObstacle {
  type: 'urdf';
  urdf: string;
  transform: Transform;
}

type Obstacle = PrimitiveObstacle | UrdfObstacle;
```
