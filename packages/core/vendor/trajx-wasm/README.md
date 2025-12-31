# trajx-wasm

WebAssembly bindings for the [trajx](https://github.com/yuanweima/trajx) robotics library.

Provides high-performance FK/IK and path planning in the browser.

> **中文文档**: 详细的中文使用指南请参阅 [GUIDE.md](./GUIDE.md)

## Features

- **Forward Kinematics (FK)**: Compute end-effector pose from joint angles
- **Inverse Kinematics (IK)**: Numerical IK solver with joint limits
- **Multi-Solution IK**: Get ALL possible IK solutions (up to 8 for 6-DOF spherical wrist robots)
- **Analytical IK**: Fast closed-form solutions for PUMA-type robots (Fanuc, KUKA, etc.)
- **Workspace Analysis**: Manipulability, singularity detection, joint limit margins
- **Reachability Check**: Verify if a pose is within robot workspace
- **Path Planning**: BiRRT planner with optional collision checking
- **Tool System**: TCP definition, multi-TCP tools, tool library management
- **Collision System**: Composite obstacles, Allowed Collision Matrix (ACM)
- **Pre-built robots**: Fanuc M-20iA, UR5, KUKA KR6
- **Three.js compatible**: Matrix output for direct mesh transforms
- **Motion-Centric API**: Fluent API for motion planning (`WasmMotion.to(goal).run(robot)`)
- **Cable-Aware Planning**: Track and constrain cable twist during robot motion
- **GPU-Accelerated Planning**: Lazy-PRM planner with batch collision checking for high-performance planning
- **RobotContext API (NEW)**: Unified API for GPU-accelerated planning with automatic capsule approximation

## Installation

### Local Reference (Recommended for Development)

In your `package.json`:

```json
{
  "dependencies": {
    "@trajx/wasm": "file:../trajx/packages/trajx-wasm"
  }
}
```

### npm

```bash
npm install @trajx/wasm
```

## Quick Start

```typescript
import init, { createRobot, BiRRTPlanner, JointLimits } from 'trajx-wasm';

// Example URDF for a 6-DOF robot
const URDF = `<?xml version="1.0"?>
<robot name="my_robot">
  <link name="base_link"/><link name="link1"/>...
  <joint name="joint1" type="revolute">...</joint>
  ...
</robot>`;

async function main() {
  // Initialize WASM module
  await init();

  // Create robot from URDF
  const robot = createRobot(URDF);

  // Forward kinematics
  const joints = [0, 0.5, -0.5, 0, 0.5, 0];
  const pose = robot.forwardKinematics(joints);
  console.log('Position:', pose.position);
  console.log('Orientation:', pose.orientation);

  // Inverse kinematics
  const ikResult = robot.inverseKinematics(pose, joints);
  if (ikResult.success) {
    console.log('IK solution:', ikResult.getSolution());
  }

  // Path planning
  const limits = robot.getJointLimits();
  const planner = new BiRRTPlanner(limits);
  const result = planner.plan([0, 0, 0, 0, 0, 0], [1, 0.5, 0.3, 0, 0.5, 0]);

  if (result.success) {
    console.log(`Found path with ${result.waypointCount} waypoints`);
  }
}

main();
```

### GPU-Accelerated Planning (Recommended)

For high-performance planning with collision checking, use the `RobotContext` API:

```typescript
import init, { RobotContext, CollisionEnvironment, Pose, Position, Quaternion } from 'trajx-wasm';

async function gpuPlanning() {
  await init();

  // One-line setup from URDF with automatic capsule approximation
  const ctx = RobotContext.fromUrdf(URDF);
  console.log(`Robot: ${ctx.name}, DOF: ${ctx.dof}, GPU Compatible: ${ctx.isGpuCompatible}`);

  // Create environment with obstacles
  const env = new CollisionEnvironment();
  env.addBox("obstacle", [0.2, 0.2, 0.2], new Pose(new Position(0.5, 0, 0.3), new Quaternion(0, 0, 0, 1)));

  // Quick collision check
  const isFree = ctx.isConfigCollisionFree([0, 0, 0, 0, 0, 0], env);

  // Create planner and find path
  const planner = ctx.createPlanner();
  planner.buildRoadmap();

  const result = planner.query(
    [0, 0, 0, 0, 0, 0],           // start
    [1, 0.5, 0.3, 0, 0.5, 0],     // goal
    (edges) => ctx.checkEdgesBatch(edges, env, 5)  // batch collision callback
  );

  if (result.success) {
    console.log(`Path found: ${result.waypointCount} waypoints in ${result.planningTimeMs.toFixed(1)}ms`);
  }
}
```

## React Integration

```tsx
import { useState, useEffect } from 'react';
import init, { Robot, createRobot } from 'trajx-wasm';

// Your robot URDF (load from file or embed)
const ROBOT_URDF = `...`;

// Custom hook for trajx initialization
export function useTrajx() {
  const [ready, setReady] = useState(false);
  const [robot, setRobot] = useState<Robot | null>(null);

  useEffect(() => {
    init().then(() => {
      setReady(true);
      setRobot(createRobot(ROBOT_URDF));
    });
  }, []);

  return { ready, robot };
}

// Component using the hook
function RobotController() {
  const { ready, robot } = useTrajx();
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);
  const [position, setPosition] = useState<{x: number, y: number, z: number} | null>(null);

  useEffect(() => {
    if (ready && robot) {
      const pose = robot.forwardKinematics(joints);
      setPosition(pose.position);
    }
  }, [ready, robot, joints]);

  if (!ready) return <div>Loading WASM...</div>;

  return (
    <div>
      <h2>End Effector Position</h2>
      <p>X: {position?.x.toFixed(3)}</p>
      <p>Y: {position?.y.toFixed(3)}</p>
      <p>Z: {position?.z.toFixed(3)}</p>

      {joints.map((value, i) => (
        <div key={i}>
          <label>Joint {i + 1}</label>
          <input
            type="range"
            min={-3.14}
            max={3.14}
            step={0.01}
            value={value}
            onChange={(e) => {
              const newJoints = [...joints];
              newJoints[i] = parseFloat(e.target.value);
              setJoints(newJoints);
            }}
          />
          <span>{value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
```

## Three.js Integration

```typescript
import * as THREE from 'three';
import init, { createRobot } from 'trajx-wasm';

const ROBOT_URDF = `...`;  // Your URDF

async function setupRobot(scene: THREE.Scene) {
  await init();

  const robot = createRobot(ROBOT_URDF);
  const joints = [0, 0.5, -0.5, 0, 0.5, 0];

  // Get all link poses for visualization
  const linkPoses = robot.forwardKinematicsChain(joints);

  // Create meshes for each link
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
  const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });

  linkPoses.forEach((pose, i) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pose.position.x, pose.position.y, pose.position.z);
    const q = pose.orientation;
    mesh.quaternion.set(q.x, q.y, q.z, q.w);
    scene.add(mesh);
  });
}
```

## Multi-Solution IK (NEW)

Get ALL possible IK solutions for 6-DOF spherical wrist robots:

```typescript
import init, { createRobot, Pose } from '@trajx/wasm';

const ROBOT_URDF = `...`;  // Your URDF

async function getAllIkSolutions() {
  await init();

  const robot = createRobot(ROBOT_URDF);

  // Create target pose
  const targetPose = Pose.fromPositionQuaternion(0.5, 0.3, 0.4, 1, 0, 0, 0);
  const seedJoints = [0, 0, 0, 0, 0, 0];

  const result = robot.inverseKinematicsAll(targetPose, seedJoints);

  if (result.success) {
    console.log(`Found ${result.solutionCount} solutions`);
    console.log(`Used analytical IK: ${result.isAnalytical}`);

    for (let i = 0; i < result.solutionCount; i++) {
      const solution = result.getSolution(i);  // Float64Array
      const error = result.getPositionError(i);  // number in meters
      console.log(`Solution ${i + 1}: error = ${error * 1000}mm`);
    }
  }
}
```

## Workspace Analysis (NEW)

Analyze manipulability, singularity, and joint limit margins:

```typescript
async function analyzeConfiguration() {
  await init();

  const robot = createRobot(ROBOT_URDF);
  const joints = [0, 0, 0, 0, 0, 0];

  const analysis = robot.analyzeWorkspace(joints);

  console.log('Manipulability:', analysis.manipulability);
  console.log('Condition number:', analysis.conditionNumber);
  console.log('Min singular value:', analysis.minSingularValue);
  console.log('Near singularity:', analysis.isNearSingular);

  // Joint limit margins (0-1, where 1 = centered between limits)
  const margins = Array.from(analysis.jointLimitMargins);
  margins.forEach((m, i) => console.log(`J${i + 1}: ${(m * 100).toFixed(1)}%`));
}
```

## Reachability Check (NEW)

```typescript
const pose = Pose.fromPositionEuler(0.5, 0.3, 0.4, 0, 0, 0);
const isReachable = robot.isReachable(pose);
console.log('Reachable:', isReachable);
```

## Singularity Detection (NEW)

```typescript
// Check if near singularity (arm extended)
const joints = [0, -Math.PI/2, 0, 0, 0, 0];
const isNearSingular = robot.isNearSingularity(joints, 0.001);
console.log('Near singularity:', isNearSingular);
```

## Motion-Centric API (NEW)

A fluent, high-level API for robot motion planning. Four levels of progressive disclosure:

### Level 1: Simple Motion (one line)

```typescript
import init, { createRobot, WasmMotion } from 'trajx-wasm';

await init();
const robot = createRobot(URDF);
robot.setJointPositions([0, 0, 0, 0, 0, 0]);

// Simple point-to-point motion
const result = WasmMotion.to([1.0, 0.5, -0.5, 0, 0.5, 0]).run(robot);

console.log('Duration:', result.trajectoryDuration, 's');
console.log('Points:', result.numPoints);
```

### Level 2: Motion with Constraints

```typescript
// Fast joint motion
const result = WasmMotion.to(goal).fast().run(robot);

// Slow precise motion
const result = WasmMotion.to(goal).precise().run(robot);  // = .slow().verySmooth()

// Linear Cartesian motion at 50mm/s
const result = WasmMotion.to(goal).linearAt(50.0).run(robot);

// With collision avoidance
const result = WasmMotion.to(goal).safe().run(robot);
```

### Level 3: Path Through Waypoints

```typescript
import { WasmPath } from 'trajx-wasm';

// Create waypoints (flattened array)
const waypoints = [
  0.5, 0.3, -0.3, 0, 0.3, 0,  // wp1
  1.0, 0.5, -0.5, 0, 0.5, 0,  // wp2
  0.8, 0.4, -0.4, 0, 0.4, 0   // wp3
];

const result = WasmPath.through(waypoints, 6)  // 6 = DOF
  .linear()
  .speed(0.8)
  .run(robot);
```

### Level 4: Motion Sequences

```typescript
import { WasmMotion, WasmSequence } from 'trajx-wasm';

// Pick and place sequence
const pickApproach = WasmMotion.to(approachPos).fast();
const pick = WasmMotion.to(pickPos).linear().slow();
const pickRetreat = WasmMotion.to(retreatPos).linear();
const placeApproach = WasmMotion.to(placeApproachPos).fast();
const place = WasmMotion.to(placePos).linear().slow();
const placeRetreat = WasmMotion.to(placeRetreatPos).linear();

const result = WasmSequence.start(pickApproach)
  .then(pick)
  .then(pickRetreat)
  .then(placeApproach)
  .then(place)
  .then(placeRetreat)
  .run(robot);

console.log('Total duration:', result.trajectoryDuration, 's');
console.log('Total path length:', result.pathLength, 'rad');
```

### Inspecting Results

```typescript
const result = WasmMotion.to(goal).run(robot);

// Result properties
console.log('Executed:', result.executed);
console.log('DOF:', result.dof);
console.log('Points:', result.numPoints);
console.log('Duration:', result.trajectoryDuration, 's');
console.log('Path length:', result.pathLength, 'rad');
console.log('Planning time:', result.planningTimeMs, 'ms');
console.log('Collision-free:', result.collisionFree);

// Get positions at specific index
const firstPos = result.getPositionsAt(0);
const lastPos = result.getPositionsAt(result.numPoints - 1);

// Get time at index
const t0 = result.getTimeAt(0);
const tf = result.getTimeAt(result.numPoints - 1);

// Get raw trajectory [t0, j0..jn, t1, j0..jn, ...]
const trajectory = result.getTrajectory();
```

### WasmMotion API Reference

| Method | Description |
|--------|-------------|
| `WasmMotion.to(joints)` | Create motion to target joint positions |
| `.from(joints)` | Set start position (default: robot's current) |
| `.joint()` | Use joint-space interpolation (fastest) |
| `.linear()` | Use linear Cartesian interpolation |
| `.linearAt(speed)` | Linear at specified TCP speed (mm/s) |
| `.spline()` | Use spline interpolation |
| `.speed(scale)` | Set speed scale (0.01-1.0) |
| `.fast()` | Maximum speed (1.0) |
| `.slow()` | Slow speed (0.3) |
| `.smooth()` | High smoothness |
| `.verySmooth()` | Very high smoothness |
| `.precise()` | Precision mode (slow + verySmooth) |
| `.safe()` | Enable collision avoidance |
| `.verified()` | Verify collision-free (fail if collision) |
| `.adaptive()` | Enable adaptive replanning |
| `.dwellMs(ms)` | Add dwell time at end |
| `.cableAware()` | Enable cable twist tracking (standard preset) |
| `.cableAwareWith(config)` | Enable with custom CableConfig |
| `.cableTrack()` | Track-only mode (no constraint) |
| `.withCableTwist(rad)` | Set initial twist for multi-segment |
| `.run(robot)` | Execute on robot |
| `.runWithCollision(robot, checker)` | Execute with collision avoidance |
| `.plan(robot)` | Plan without executing |

### Collision-Aware Motion (runWithCollision)

Use `runWithCollision()` to enable BiRRT planning with collision checking:

```typescript
// Define collision checker: returns true if configuration is VALID (no collision)
const collisionChecker = (joints: number[]) => {
    // Your collision detection logic
    return !isColliding(joints);  // true = collision-free
};

// Motion with collision avoidance
const result = WasmMotion.to(goal)
    .safe()  // Enable collision avoidance mode
    .runWithCollision(robot, collisionChecker);

console.log('Collision-free:', result.collisionFree);

// Path with collision avoidance
const path = WasmPath.through(waypoints, 6)
    .safe()
    .runWithCollision(robot, collisionChecker);

// Sequence with collision avoidance
const seq = WasmSequence.start(motion1.safe())
    .then(motion2.safe())
    .runWithCollision(robot, collisionChecker);
```

**Important**: The collision checker callback should return:
- `true` if the configuration is **valid** (no collision)
- `false` if the configuration is **invalid** (collision detected)

### Result Properties (Cable)

When cable tracking is enabled, `WasmMotionResult` includes:

| Property | Description |
|----------|-------------|
| `.cableTwist` | Final accumulated twist (radians) |
| `.cableMaxTwist` | Maximum twist during motion |
| `.cableWarning` | True if entered warning zone |
| `.cableExceeded` | True if exceeded limit |
| `.hasCableTracking` | True if cable tracking enabled |

## Cable-Aware Motion Planning

Track and constrain cable twist during robot motion to prevent cable damage.

### Basic Usage

```typescript
import { WasmMotion, WasmSequence, CableConfig } from 'trajx-wasm';

// Simple cable-aware motion (standard 4π/720° limit)
const result = WasmMotion.to(goal)
    .cableAware()
    .run(robot);

console.log('Twist:', result.cableTwist);
console.log('Warning:', result.cableWarning);
```

### Custom Configuration

```typescript
// With custom configuration
const config = new CableConfig()
    .withMaxTotalTwist(2 * Math.PI)    // 360° limit
    .withWarningThreshold(0.5);         // Warn at 50%

const result = WasmMotion.to(goal)
    .cableAwareWith(config)
    .run(robot);
```

### Multi-Segment Tracking

```typescript
// Track accumulated twist across multiple motions
let twist = 0;
for (const goal of goals) {
    const result = WasmMotion.to(goal)
        .cableAware()
        .withCableTwist(twist)
        .run(robot);
    twist = result.cableTwist;
    console.log(`Accumulated: ${(twist * 180 / Math.PI).toFixed(1)}°`);
}
```

### Cable-Aware Sequence

```typescript
// Track cable twist across an entire sequence
const result = WasmSequence.start(WasmMotion.to(goal1))
    .then(WasmMotion.to(goal2))
    .then(WasmMotion.to(goal3))
    .cableAware()
    .run(robot);

console.log('Final twist:', result.cableTwist);
console.log('Max twist:', result.cableMaxTwist);
```

### Cable Presets

| Preset | Limit | Description |
|--------|-------|-------------|
| `cablePresetStandard()` | 4π (720°) | Default, most cables |
| `cablePresetHeavyDuty()` | 2π (360°) | Thick, stiff cables |
| `cablePresetLight()` | 8π (1440°) | Thin, flexible cables |
| `cablePresetPrecision()` | 2π + auto-unwind | Minimal stress |

### CableConfig API

| Method | Description |
|--------|-------------|
| `new CableConfig()` | Create default config (4π limit) |
| `.withMaxTotalTwist(rad)` | Set maximum total twist |
| `.withWarningThreshold(0-1)` | Set warning threshold |
| `.withAutoUnwind(bool)` | Enable auto-unwind |
| `.isTwistValid(rad)` | Check if twist is within limit |
| `.isTwistWarning(rad)` | Check if in warning zone |

## GPU-Accelerated Planning (NEW)

High-performance motion planning using Lazy-PRM (Probabilistic Roadmap) with batch collision checking. Designed for GPU acceleration but works with any collision backend.

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     GpuPlanningContext                          │
├─────────────────────────────────────────────────────────────────┤
│  Robot Joint Limits  │  Lazy-PRM Planner  │  Edge Cache        │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                   JavaScript Callback
                   (batch edge checking)
                             │
             ┌───────────────┼───────────────┐
             ▼               ▼               ▼
        WebGPU           CPU Parry     Custom Checker
        (fast)           (accurate)    (user-defined)
```

### Basic Usage

```typescript
import init, {
    createRobot,
    GpuPlanningContext,
    GpuPlanningContextConfig,
    WasmRobotCollisionModel,
    CollisionEnvironment,
} from 'trajx-wasm';

await init();

// 1. Create robot
const robot = createRobot(urdfContent);

// 2. Create collision model and environment
const robotCollision = WasmRobotCollisionModel.fromUrdf(urdfContent);
const env = new CollisionEnvironment();
env.addBox("table", [0.5, 0.3, 0.02], tablePose);

// 3. Create GPU planning context
const config = GpuPlanningContextConfig.balanced();
const planner = new GpuPlanningContext(robot, config);

// 4. Build roadmap (fast, no collision checking)
planner.buildRoadmap();
console.log(`Roadmap: ${planner.nodeCount} nodes, ${planner.edgeCount} edges`);

// 5. Define batch collision checker callback
function checkEdgesBatch(edges) {
    return edges.map(([startJoints, endJoints]) => {
        // Sample along edge
        for (let t = 0; t <= 1; t += 0.2) {
            const joints = startJoints.map((s, i) => s + t * (endJoints[i] - s));
            const linkPoses = robot.getLinkTransforms(joints);

            // Check self-collision
            if (robotCollision.isSelfCollidingFast(linkPoses)) {
                return false;
            }

            // Check environment collision
            if (!robotCollision.isConfigCollisionFree(env, linkPoses)) {
                return false;
            }
        }
        return true; // Edge is collision-free
    });
}

// 6. Plan path
const start = [0, 0, 0, 0, 0, 0];
const goal = [1.57, -0.5, 0.5, 0, 1.0, 0];

const result = planner.planPath(start, goal, checkEdgesBatch);

if (result.success) {
    console.log(`Path found: ${result.waypointCount} waypoints`);
    console.log(`Path length: ${result.pathLength.toFixed(2)} rad`);
    console.log(`Planning time: ${result.planningTimeMs.toFixed(1)} ms`);
    console.log(`GPU batches: ${result.gpuBatches}`);

    // Get waypoints
    const waypoints = result.waypoints;
    for (const wp of waypoints) {
        console.log('Waypoint:', wp);
    }
} else {
    console.error('Planning failed:', result.error);
}

// 7. If environment changes, reset edge cache
planner.resetValidations();
```

### Using with WasmMotion API

```typescript
import { WasmMotion, GpuPlanningContext, GpuPlanningContextConfig } from 'trajx-wasm';

// Create GPU planning context
const config = GpuPlanningContextConfig.fast();
const gpuCtx = new GpuPlanningContext(robot, config);
gpuCtx.buildRoadmap();

// Define collision checker
function checkEdges(edges) {
    return edges.map(([start, end]) => {
        // Your collision checking logic
        return robotCollision.isEdgeCollisionFree(env, robot, start, end, 5);
    });
}

// Create motion with GPU batch mode
const result = WasmMotion.to(goal)
    .gpuBatch()
    .runWithGpuCollision(robot, gpuCtx, checkEdges);

console.log('Trajectory points:', result.trajectoryLength);
console.log('Collision-free:', result.collisionFree);
```

### Configuration Presets

| Preset | Samples | K-Neighbors | Best For |
|--------|---------|-------------|----------|
| `GpuPlanningContextConfig.fast()` | 200 | 10 | Quick planning, simple environments |
| `GpuPlanningContextConfig.balanced()` | 500 | 15 | General use (default) |
| `GpuPlanningContextConfig.quality()` | 1000 | 20 | Complex environments, optimal paths |

### GpuPlanningContext API

| Method | Description |
|--------|-------------|
| `new GpuPlanningContext(robot, config?)` | Create planner with robot and optional config |
| `.buildRoadmap()` | Build roadmap graph (call once before queries) |
| `.isRoadmapBuilt()` | Check if roadmap is ready |
| `.nodeCount` | Number of nodes in roadmap |
| `.edgeCount` | Number of edges in roadmap |
| `.planPath(start, goal, checkEdges)` | Plan path with batch collision callback |
| `.resetValidations()` | Reset edge cache (call when environment changes) |

### GpuPlanningResult Properties

| Property | Description |
|----------|-------------|
| `.success` | Whether planning succeeded |
| `.waypoints` | Array of joint configurations |
| `.waypointCount` | Number of waypoints |
| `.pathLength` | Total path length in joint space (radians) |
| `.edgesValidated` | Number of edges checked |
| `.gpuBatches` | Number of batch collision calls |
| `.planningTimeMs` | Total planning time |
| `.error` | Error message if failed |

### Edge Collision Checking

For validating individual edges:

```typescript
// Check if an edge is collision-free
const start = [0, 0, 0, 0, 0, 0];
const end = [1.0, 0.5, -0.5, 0, 0.5, 0];
const samples = 5;  // Number of samples along edge

const isFree = robotCollision.isEdgeCollisionFree(env, robot, start, end, samples);
console.log('Edge collision-free:', isFree);
```

### Capsule Approximation for GPU

Convert complex geometries to GPU-friendly capsules:

```typescript
import { WasmEnvironmentCapsuleOptions } from 'trajx-wasm';

// Create environment with mixed shapes
const env = new CollisionEnvironment();
env.addBox("table", [0.3, 0.2, 0.02], tablePose);
env.addCylinder("pole", 0.05, 0.2, polePose);
env.addSphere("ball", 0.05, [0.3, 0.3, 0.3]);

console.log('GPU compatible:', env.isGpuCompatible());
console.log('Incompatible count:', env.countGpuIncompatible());

// Convert to capsule approximation
const options = WasmEnvironmentCapsuleOptions.gpuOptimized();
const { env: capsuleEnv, stats } = env.toCapsuleApproximation(options);

console.log('Obstacles converted:', stats.obstacles_converted);
console.log('Capsules generated:', stats.capsules_generated);
console.log('Coverage ratio:', stats.avg_coverage_ratio);
console.log('New env GPU compatible:', capsuleEnv.isGpuCompatible());
```

### GPU Planning Feature

GPU planning is now enabled by default. To build without it (smaller size):

```bash
# Collision only (no GPU planning)
./build.sh collision

# Or manually
wasm-pack build --target web --no-default-features --features "console_error_panic_hook,collision"
```

## Tool System

Define TCP (Tool Center Point) configurations and manage tool libraries:

```typescript
import init, { WasmTcpPoint, WasmTool, WasmToolLibrary } from '@trajx/wasm';

async function setupTools() {
  await init();

  // Create a TCP point (Tool Center Point)
  const cameraTcp = WasmTcpPoint.simple("camera", 0.02, 0.0, 0.05);
  cameraTcp.setStandoff(0.2);           // Set default standoff distance
  cameraTcp.setStandoffRange(0.1, 0.5); // Set standoff range
  cameraTcp.setApproachAxis(0, 0, 1);   // Set approach direction

  // Or use builder pattern for chained construction
  const laserTcp = WasmTcpPoint.simple("laser", 0.0, 0.0, 0.1)
    .withStandoff(0.15)
    .withApproachAxis(0, 0, 1);

  // Create a tool with multiple TCPs
  const tool = WasmTool.withName("inspection_tool");
  tool.addTcpPoint(cameraTcp);
  tool.addTcpPoint(laserTcp);
  console.log('Tool TCPs:', tool.tcpNames());

  // Manage tools in a library
  const library = new WasmToolLibrary();
  library.addTool(tool);
  console.log('Library tools:', library.toolNames());

  // Retrieve and use tools
  const retrievedTool = library.getTool("inspection_tool");
  const tcp = retrievedTool.getTcp("camera");
  console.log('TCP offset:', tcp.offset());
}
```

### TCP Properties

- **offset**: Position offset from flange to TCP
- **standoff**: Default approach distance for path planning
- **standoff_range**: Min/max standoff distances
- **approach_axis**: Direction of approach (typically Z-axis)

### Using TCP with Forward Kinematics

```typescript
const robot = createRobot(ROBOT_URDF);
robot.attachTool(tcp.getOffset());  // Attach TCP to robot

// FK now returns TCP pose, not flange pose
const tcpPose = robot.forwardKinematicsTcp([0, 0.5, -0.5, 0, 0.5, 0]);
console.log('TCP Position:', tcpPose.position);
```

### Integrated Tool Library API (NEW)

The robot object now has built-in tool library management:

```typescript
const robot = createRobot(ROBOT_URDF);

// Create identity pose for flange offset
const flangeOffset = Pose.fromPositionQuaternion(0, 0, 0, 1, 0, 0, 0);

// Add a tool with multiple TCPs
robot.addTool("inspection_tool", flangeOffset);

// Add TCP points to the tool
const cameraTcpOffset = Pose.fromPositionQuaternion(0.02, 0, 0.05, 1, 0, 0, 0);
robot.addTcpToTool("inspection_tool", "camera", cameraTcpOffset);

// Add TCP with standoff (working distance)
const welderTcpOffset = Pose.fromPositionQuaternion(0, 0, 0.15, 1, 0, 0, 0);
robot.addTcpWithStandoff("inspection_tool", "welder", welderTcpOffset, 0.01);

// Activate a tool
robot.activateTool("inspection_tool", "camera");  // Optionally specify TCP
console.log('Active tool:', robot.getActiveToolName());
console.log('Active TCP:', robot.getActiveTcpName());

// Switch TCP
robot.setActiveTcp("welder");

// Get tool offset
const offset = robot.getToolOffset();
console.log('Tool offset:', offset?.position);

// Get standoff distance
const standoff = robot.getTcpStandoff("inspection_tool", "welder");
console.log('Welder standoff:', standoff, 'meters');

// List tools and TCPs
console.log('All tools:', robot.listTools());
console.log('TCPs on tool:', robot.listTcps("inspection_tool"));

// FK/IK with specific tool/TCP (without changing active selection)
const joints = [0, 0.5, -0.5, 0, 0.5, 0];
const pose = robot.forwardKinematicsNamedTcp(joints, "inspection_tool", "camera");
const ikResult = robot.inverseKinematicsNamedTcp(pose, "inspection_tool", "camera", joints);
```

## Path Planning with Collision Checking

```typescript
import init, { BiRRTPlanner, JointLimits, BiRRTConfig } from 'trajx-wasm';

async function planWithCollision() {
  await init();

  const limits = new JointLimits(
    [-3.14, -1.5, -2.0, -3.14, -2.0, -6.28],
    [3.14, 2.5, 4.0, 3.14, 2.0, 6.28]
  );

  const config = BiRRTConfig.withParams(
    10000,  // max iterations
    0.1,    // goal bias
    0.3     // max extension
  );

  const planner = new BiRRTPlanner(limits, config);

  // Collision checker callback
  const isCollisionFree = (joints: number[]): boolean => {
    // Your collision checking logic here
    // Return true if configuration is valid (no collision)
    return true;
  };

  const result = planner.planWithCollisionCheck(
    [0, 0, 0, 0, 0, 0],
    [1, 0.5, 0.3, 0, 0.5, 0],
    isCollisionFree
  );

  if (result.success) {
    // Get interpolated path for smooth animation
    const path = [];
    for (let i = 0; i < result.waypointCount; i++) {
      path.push(result.getWaypoint(i));
    }
    return path;
  }

  return null;
}
```

## API Reference

### Types

- `Position` - 3D position (x, y, z)
- `Quaternion` - Rotation quaternion (x, y, z, w)
- `Pose` - 6-DOF pose (position + orientation)
- `DhParam` - Denavit-Hartenberg parameter
- `JointLimits` - Joint angle limits
- `IkResult` - Single IK solution result
- `MultiIkResult` - **NEW** Multiple IK solutions result
- `WorkspaceAnalysis` - **NEW** Workspace analysis result

### Robot Class (URDF-based)

- `Robot.fromString(urdfContent)` - Create robot from URDF string
- `createRobot(urdfContent)` - Convenience function
- `robot.name` - Robot name (getter)
- `robot.dof` - Degrees of freedom (getter)
- `robot.jointNames()` - Get joint names
- `robot.linkNames()` - Get link names
- `robot.getJointLimits()` - Get joint limits
- `robot.getVelocityLimits()` - Get velocity limits (if available)
- `robot.getAccelerationLimits()` - Get acceleration limits (if available)
- `robot.forwardKinematics(joints)` - Forward kinematics (flange pose)
- `robot.forwardKinematicsTcp(joints)` - FK with tool offset (TCP pose)
- `robot.forwardKinematicsChain(joints)` - FK for all links (for visualization)
- `robot.inverseKinematics(target, seed?)` - Single IK solution (solves for flange pose)
- `robot.inverseKinematicsTcp(target, seed?)` - IK solving for TCP position (accounts for tool offset)
- `robot.inverseKinematicsAll(target, seed?)` - Get ALL IK solutions
- `robot.supportsAnalyticalIk()` - Check if analytical IK is available
- `robot.computeJacobian(joints)` - Compute 6×n Jacobian matrix
- `robot.analyzeWorkspace(joints)` - Get workspace analysis (manipulability, singularity)
- `robot.isReachable(pose)` - Check if pose is reachable
- `robot.isNearSingularity(joints, threshold?)` - Check singularity
- `robot.computeManipulability(joints)` - Get manipulability measure
- `robot.isValidConfig(joints)` - Check joint limits
- `robot.attachTool(pose)` - Attach tool offset
- `robot.detachTool()` - Remove tool
- `robot.hasTool()` - Check if tool is attached
- `robot.getToolOffset()` - **NEW** Get current tool offset (flange to TCP transform)
- `robot.getLinkTransforms(joints)` - Get transforms for all links
- `robot.hasDhParams()` - Check if DH parameters are available
- `robot.loadDhParamsFromDatabase(name)` - Load DH params from database

#### Tool Library Management (NEW)

- `robot.addTool(name, flangeOffset)` - Add a named tool to the library
- `robot.addTcpToTool(toolName, tcpName, offset)` - Add TCP point to a tool
- `robot.addTcpWithStandoff(toolName, tcpName, offset, standoff)` - Add TCP with standoff distance
- `robot.activateTool(toolName, tcpName?)` - Activate a tool (optional specific TCP)
- `robot.deactivateTool()` - Deactivate current tool
- `robot.getActiveToolName()` - Get name of active tool
- `robot.listTools()` - List all tools in library
- `robot.listTcps(toolName)` - List all TCPs on a tool
- `robot.setActiveTcp(tcpName)` - Set active TCP on current tool
- `robot.getActiveTcpName()` - Get name of active TCP
- `robot.getTcpStandoff(toolName, tcpName)` - Get TCP standoff distance

#### Named TCP FK/IK (NEW)

- `robot.forwardKinematicsNamedTcp(joints, toolName, tcpName?)` - FK using specific tool/TCP
- `robot.inverseKinematicsNamedTcp(pose, toolName, tcpName?, seed?)` - IK using specific tool/TCP

### WasmDhDatabase Class

- `WasmDhDatabase.withDefaults()` - Database with built-in robot configs
- `db.listRobots()` - List available robot names
- `listDhDatabase()` - Convenience function to list available robots

### Planning

- `BiRRTPlanner` - Bidirectional RRT planner (fastest for simple planning)
  - `new BiRRTPlanner(jointLimits, config?)` - Create planner
  - `.plan(start, goal)` - Plan with joint limits only
  - `.planWithCollisionCheck(start, goal, checker)` - Plan with collision callback
- `BiRRTConfig` - BiRRT configuration
  - `.withMaxIterations(n)` - Set max iterations
  - `.withGoalBias(p)` - Set goal sampling probability
  - `.withMaxExtension(d)` - Set max step size
  - `.withConnectionThreshold(d)` - Set tree connection threshold
- `RRTStarPlanner` - Asymptotically optimal RRT*
  - `new RRTStarPlanner(jointLimits, config?)` - Create planner
  - `.plan(start, goal)` - Plan with joint limits only
  - `.planWithCollisionCheck(start, goal, checker)` - Plan with collision callback
- `RRTStarConfig` - RRT* configuration
  - `.withMaxIterations(n)` - Set max iterations
  - `.withGoalBias(p)` - Set goal sampling probability
  - `.withMaxExtension(d)` - Set max step size
  - `.withGoalRadius(r)` - Set goal reaching threshold
  - `.withRewireFactor(f)` - Set rewiring radius multiplier
- `PRMPlanner` - Probabilistic Roadmap planner (best for multi-query)
  - `new PRMPlanner(jointLimits, config?)` - Create planner
  - `.buildRoadmap()` - Build roadmap (one-time, no collision check)
  - `.buildRoadmapWithCollisionCheck(checker)` - Build with collision
  - `.query(start, goal)` - Query path
  - `.queryWithCollisionCheck(start, goal, checker)` - Query with collision
  - `.isRoadmapBuilt` - Check if roadmap is ready
  - `.nodeCount` / `.edgeCount` - Roadmap statistics
- `PRMConfig` - PRM configuration
  - `.withNumSamples(n)` - Set number of roadmap samples
  - `.withKNeighbors(k)` - Set k-nearest neighbors
- `PathOptimizer` - Path post-processing (shortcutting)
- `interpolatePathFlat(path, resolution)` - Interpolate waypoints

### GPU Planning (optional `gpu-planning` feature)

- `GpuPlanningContext` - Lazy-PRM planner with batch collision checking
  - `new GpuPlanningContext(robot, config?)` - Create planner
  - `.buildRoadmap()` - Build roadmap graph
  - `.isRoadmapBuilt()` - Check if roadmap is ready
  - `.nodeCount` - Number of nodes
  - `.edgeCount` - Number of edges
  - `.planPath(start, goal, checkEdges)` - Plan with batch callback
  - `.resetValidations()` - Reset edge cache
- `GpuPlanningContextConfig` - Configuration for GPU planning
  - `GpuPlanningContextConfig.fast()` - Quick planning preset
  - `GpuPlanningContextConfig.balanced()` - Default preset
  - `GpuPlanningContextConfig.quality()` - High-quality preset
  - `.withNumSamples(n)` - Set roadmap samples
  - `.withKNeighbors(k)` - Set k-nearest neighbors
  - `.withBatchSize(size)` - Set validation batch size
- `GpuPlanningResult` - Planning result
  - `.success` - Whether planning succeeded
  - `.waypoints` - Array of joint configurations
  - `.waypointCount` - Number of waypoints
  - `.pathLength` - Path length in joint space
  - `.edgesValidated` - Edges checked
  - `.gpuBatches` - Number of batch calls
  - `.planningTimeMs` - Planning time
  - `.error` - Error message if failed
- `LazyPrmPlanner` - Low-level Lazy-PRM planner
- `LazyPrmConfig` - Low-level planner configuration
- `LazyPrmResult` - Low-level planning result

### RobotContext - Unified GPU Planning API (Recommended)

`RobotContext` is the **recommended API** for GPU-accelerated motion planning. It provides a unified interface that combines URDF loading, capsule approximation for GPU collision, and batch edge checking.

```typescript
import { RobotContext, RobotContextConfig, CollisionEnvironment } from 'trajx-wasm';

// One-line setup from URDF (uses GPU-optimized defaults)
const ctx = RobotContext.fromUrdf(urdfContent);

// Or with custom config
const config = RobotContextConfig.gpuOptimized();
const ctx = RobotContext.fromUrdfWithConfig(urdfContent, config);

// Quick collision check
const joints = [0, 0, 0, 0, 0, 0];
const isFree = ctx.isConfigCollisionFree(joints, env);

// GPU-friendly batch edge checking (for Lazy-PRM)
const edges = [
    [[0,0,0,0,0,0], [1,0,0,0,0,0]],
    [[1,0,0,0,0,0], [1,1,0,0,0,0]],
];
const results = ctx.checkEdgesBatch(edges, env, 5);  // 5 samples per edge

// Create planner directly from context
const planner = ctx.createPlanner();
planner.buildRoadmap();
const result = planner.query(start, goal, (edges) => ctx.checkEdgesBatch(edges, env, 5));
```

- `RobotContext` - Unified context for GPU planning
  - `RobotContext.fromUrdf(urdf)` - Create with default GPU-optimized config
  - `RobotContext.fromUrdfWithConfig(urdf, config)` - Create with custom config
  - `.name` - Robot name
  - `.dof` - Degrees of freedom
  - `.isGpuCompatible` - Whether collision model uses only GPU-friendly shapes
  - `.stats` - Creation statistics (shapes converted, capsules generated)
  - `.isConfigCollisionFree(joints, env)` - Check single configuration
  - `.isEdgeCollisionFree(start, end, env, samples?)` - Check single edge
  - `.checkEdgesBatch(edges, env, samples?)` - Batch edge checking for planning
  - `.createPlanner()` - Create LazyPrmPlanner
  - `.forwardKinematics(joints)` - Compute end-effector pose
  - `.getLinkTransforms(joints)` - Get all link transforms
  - `.getJointLimitsFlat()` - Get joint limits as flat array
  - `.summary()` - Get human-readable summary
- `RobotContextConfig` - Configuration presets
  - `RobotContextConfig.gpuOptimized()` - Default: capsule approximation, 5 samples/edge
  - `RobotContextConfig.fast()` - Quick planning: 3 samples/edge, 200 roadmap samples
  - `RobotContextConfig.quality()` - Thorough: 10 samples/edge, 1000 roadmap samples
  - `RobotContextConfig.cpuOnly()` - No capsule approximation
  - `.samplesPerEdge` - Get/set edge samples
  - `.roadmapSamples` - Get/set roadmap samples
- `RobotContextStats` - Creation statistics
  - `.shapesConverted` - Number of shapes converted to capsules
  - `.capsulesGenerated` - Number of capsules generated
  - `.shapesUnchanged` - Number of shapes kept as-is
  - `.avgCoverageRatio` - Average capsule coverage
  - `.summary()` - Get formatted summary

### GPU Collision (enabled by default)

GPU-accelerated collision detection using WebGPU. This feature is **enabled by default** and provides significant speedup for batch collision checking.

> **Note**: Requires WebGPU support in the browser. Check availability with `isWebGpuAvailable()`.

- `isWebGpuAvailable()` - Check if WebGPU is available (async)
- `isIntegratedGpuPlanningAvailable()` - Check GPU planning availability (async)
- `GpuCollisionContext` - Low-level GPU collision context
  - `GpuCollisionContext.init()` - Initialize GPU context (async)
  - `.deviceInfo()` - Get GPU device info
  - `.gpuThreshold()` - Get batch size threshold for GPU to be faster
  - `.preferredBatchSize()` - Get optimal batch size
  - `.checkSphereSphereAsync(...)` - Batch sphere-sphere collision (async)
  - `.checkBoxBoxAsync(...)` - Batch box-box collision (async)
  - `.checkMixedAsync(...)` - Batch mixed shape collision (async)
- `benchmarkGpuVsCpu(numPairs)` - Run GPU vs CPU performance comparison
- `benchmarkGpuBatchSizes(sizes)` - Run benchmarks at multiple batch sizes
- `getGpuCollisionCheckerTemplate(samplesPerEdge)` - Get template code for GPU collision checker
- `GpuVsCpuComparison` - Benchmark result
  - `.gpuTimeMs` - GPU time in milliseconds
  - `.cpuTimeMs` - CPU time in milliseconds
  - `.collisionPairs` - Number of pairs tested
  - `.speedup` - Speedup factor (cpu_time / gpu_time)
  - `.gpuFaster` - Whether GPU was faster
  - `.summary()` - Get formatted summary string
- `IntegratedGpuPlannerConfig` - Configuration presets
  - `IntegratedGpuPlannerConfig.fast()` - Fast preset
  - `IntegratedGpuPlannerConfig.balanced()` - Balanced preset
  - `IntegratedGpuPlannerConfig.quality()` - Quality preset
  - `IntegratedGpuPlannerConfig.cpuOnly()` - CPU-only preset

### Task-Space Planning

- `TaskSpaceRRTPlanner` - Plan in Cartesian space with IK
- `TaskSpaceRRTConfig` - Configuration (max_iterations, goal_bias, position/orientation tolerance)
- `TaskSpacePlanningResult` - Planning result with joint-space path
- Supports workspace bounds for sampling

### Trajectory Generation

- `TrajectoryGenerator` - Generate time-parameterized trajectories from paths
- `TrajectoryConfig` - Configuration (velocity/acceleration/jerk limits, time step)
- `WasmTrajectory` - Trajectory with positions, velocities, accelerations at each timestep
- `WasmTrajectoryPoint` - Single trajectory point
- `createSimpleTrajectory(waypoints, dof, maxVel, maxAccel)` - Quick trajectory generation

### Tool System (NEW)

- `WasmTcpPoint` - Tool Center Point definition
  - `WasmTcpPoint.simple(name, x, y, z)` - Create simple TCP with position offset
  - `WasmTcpPoint.withOrientation(name, x, y, z, qw, qx, qy, qz)` - Create TCP with orientation
  - `tcp.setStandoff(distance)` - Set default standoff distance (mutating)
  - `tcp.setStandoffRange(min, max)` - Set standoff range (mutating)
  - `tcp.setApproachAxis(x, y, z)` - Set approach direction (mutating)
  - `tcp.withStandoff(distance)` - Set standoff (builder pattern)
  - `tcp.withStandoffRange(min, max)` - Set range (builder pattern)
  - `tcp.withApproachAxis(x, y, z)` - Set axis (builder pattern)
  - `tcp.offset()` - Get position offset as Float64Array
  - `tcp.toPose()` - Convert to Pose for robot.attachTool()
- `WasmTool` - Tool with multiple TCPs
  - `WasmTool.withName(name)` - Create empty tool
  - `tool.addTcpPoint(tcp)` - Add TCP to tool
  - `tool.getTcp(name)` - Get TCP by name
  - `tool.tcpNames()` - List all TCP names
  - `tool.setActiveTcp(name)` - Set active TCP
- `WasmToolLibrary` - Manage multiple tools
  - `new WasmToolLibrary()` - Create empty library
  - `library.addTool(tool)` - Add tool to library
  - `library.getTool(name)` - Get tool by name
  - `library.toolNames()` - List all tool names

### Collision Environment (optional `collision` feature)

- `CollisionEnvironment` - Manage collision obstacles
- `CollisionEnvironment.addBox(id, halfExtents, pose)` - Add box obstacle
- `CollisionEnvironment.addSphere(id, radius, position)` - Add sphere obstacle
- `CollisionEnvironment.addCylinder(id, radius, halfHeight, pose)` - Add cylinder obstacle
- `CollisionEnvironment.removeObstacle(id)` - Remove obstacle
- `CollisionEnvironment.checkShapeCollision(shapeType, params, pose)` - Check collision
- `CollisionEnvironment.isCollisionFree(position, radius?)` - Quick point collision check
- `WasmObstacle` - Simple obstacle helper (works without collision feature)
- `WasmCompositeObstacle` - **NEW** Composite obstacle from multiple shapes
  - `new WasmCompositeObstacle(id)` - Create composite obstacle
  - `composite.addBox(localPose, halfExtents)` - Add box shape
  - `composite.addSphere(localPosition, radius)` - Add sphere shape
  - `composite.addCylinder(localPose, radius, halfHeight)` - Add cylinder shape
  - `composite.shapeCount()` - Get number of shapes
  - `env.addCompositeObstacle(composite, worldPose)` - Add to environment
- **Allowed Collision Matrix (ACM)**:
  - `env.allowCollision(id1, id2)` - Allow collision between two objects
  - `env.disallowCollision(id1, id2)` - Disallow collision
  - `env.isCollisionAllowed(id1, id2)` - Check if collision is allowed
  - `env.setDefaultCollisionAllowed(allowed)` - Set default behavior
  - `env.clearAcm()` - Clear all ACM entries

## Performance

| Operation | Time (typical) |
|-----------|----------------|
| FK (6-DOF) | ~5 µs |
| IK (numerical) | ~100 µs |
| BiRRT (no collision) | ~10 ms |
| BiRRT (with collision) | ~100 ms |

## Building from Source

Requires:
- Rust 1.75+
- wasm-pack

### Using build script (recommended)

```bash
cd crates/trajx-wasm

# Default build (web target, release, includes collision + gpu-planning)
./build.sh

# Development build (faster, with debug info)
./build.sh dev

# Build and start local server
./build.sh serve

# Collision only (no GPU planning, smaller size)
./build.sh collision

# Build without collision (minimal size)
./build.sh no-collision

# Clean build artifacts
./build.sh clean
```

### Manual build

```bash
# Default build (includes collision + gpu-planning)
wasm-pack build --target web

# Collision only (no GPU planning)
wasm-pack build --target web --no-default-features --features "console_error_panic_hook,collision"

# Without collision (minimal size)
wasm-pack build --target web --no-default-features --features console_error_panic_hook
```

## Examples

See the `demo/` and `examples/` directories for complete usage examples.
Both directories are automatically copied to `pkg/` during build.

### Demo (included in pkg after build)

- **`demo/index.html`** - Comprehensive browser demo with all features (Tool, Collision, GPU Planning, FK/IK)
- **`demo/test_node.mjs`** - Node.js test suite (45 tests)

### Interactive Examples (included in pkg after build)

These standalone HTML demos showcase specific features with interactive UI:

| Demo | Description |
|------|-------------|
| **`examples/index.html`** | Navigation page - Links to all demos |
| **`examples/robot-context-demo.html`** | **RobotContext API (NEW)** - Unified GPU planning with capsule approximation |
| **`examples/motion-centric-demo.html`** | Motion-Centric API - WasmMotion, WasmPath, WasmSequence with collision-aware planning |
| **`examples/motion-collision-demo.html`** | Collision-Aware Motion - Detailed collision checking workflow and API warnings |
| **`examples/motion-cable-demo.html`** | Motion + Cable Integration - WasmMotion.cableAware(), WasmSequence cable tracking |
| **`examples/advanced-planners-demo.html`** | BiRRT, RRT*, PRM - Compare planning algorithms with 2D visualization |
| **`examples/gpu-batch-planning-demo.html`** | GPU Batch Planning - Lazy-PRM with batch collision checking |
| **`examples/gpu-vs-cpu-benchmark.html`** | GPU vs CPU Benchmark - Performance comparison with WebGPU |
| **`examples/collision-demo.html`** | CollisionEnvironment API - Add/remove obstacles, check collisions |
| **`examples/batch-collision-demo.html`** | BatchCollisionChecker - Multi-configuration checking (1000+ in ~3ms) |
| **`examples/motion-validator-demo.html`** | WasmConfigurationSpace & WasmDiscreteMotionValidator |
| **`examples/pipeline-demo.html`** | WasmPlanningPipeline - Path planning with optimization |
| **`examples/urdf-cartesian-demo.html`** | URDF loading, FK/IK verification |

### Running the Browser Demos

```bash
# Build WASM (demo and examples are automatically copied to pkg/)
./build.sh collision

# Serve with a local HTTP server
npx serve pkg

# Open demos:
# - http://localhost:3000/demo/index.html
# - http://localhost:3000/examples/collision-demo.html
# - http://localhost:3000/examples/advanced-planners-demo.html
```

Or use the build script:

```bash
# Build and start server on port 8088
./build.sh serve

# Then open http://localhost:8088/examples/collision-demo.html
```

### Quick Start Example

```typescript
import init, { createRobot, BiRRTPlanner } from 'trajx-wasm';

const ROBOT_URDF = `...`;  // Your URDF

async function main() {
  await init();

  // Create robot from URDF
  const robot = createRobot(ROBOT_URDF);

  // Forward kinematics
  const pose = robot.forwardKinematics([0, -1.57, 1.57, 0, 0, 0]);
  console.log('End-effector:', pose.position);

  // Path planning
  const limits = robot.getJointLimits();
  const planner = new BiRRTPlanner(limits);
  const result = planner.plan([0, 0, 0, 0, 0, 0], [1, 0.5, -0.5, 0, 0.5, 0]);

  if (result.success) {
    console.log(`Found path with ${result.waypointCount} waypoints`);
  }
}
```

## License

MIT OR Apache-2.0
