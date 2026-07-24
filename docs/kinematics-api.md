# RoboViz Kinematics API

This document describes the unified kinematics architecture for robot forward/inverse kinematics, ghost preview, and workspace analysis.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Type Layer                                   │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Pose3D (Z-up)              │  Pose (Legacy Y-up)               │ │
│  │  position: [x, y, z]        │  position: { x, y, z }            │ │
│  │  quaternion: [x, y, z, w]   │  orientation: { w, x, y, z }      │ │
│  │  Used by: IK Hooks          │  Used by: Visualization           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                      Kinematics Hooks                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  useIKComputation (Core)                                       │  │
│  │  - Unified IK computation with workspace analysis              │  │
│  │  - Returns UnifiedIKResult with GhostStatus                    │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                  │                                   │
│  ┌───────────────────────────────┼──────────────────────────────┐   │
│  │                               │                               │   │
│  ▼                               ▼                               ▼   │
│  ┌──────────────┐                       ┌──────────────────┐        │
│  │  usePoseIK   │                       │  useGhostPreview │        │
│  │  (Pose3D →   │                       │  (Interactive    │        │
│  │   IK Result) │                       │   Ghost Control) │        │
│  └──────────────┘                       └──────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                      High-Level Hooks                                │
│  ┌──────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  useRobotWithKinematics      │  │  useRobotKinematics         │  │
│  │  - URDF loading + FK/IK     │  │  - Pure FK/IK interface     │  │
│  │  - Joint state management    │  │  - Z-up coordinate API      │  │
│  │  - Tool attachment           │  │  - Workspace analysis       │  │
│  └──────────────────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Coordinate System

**All kinematics hooks use Z-up coordinates** (robotics standard):

- X: Forward (towards the robot's front)
- Y: Left (perpendicular to forward)
- Z: Up (vertical)

This matches URDF conventions and typical robot manufacturer documentation.

## Core Types

### Pose3D (Kinematics Layer)

```typescript
// Used by all IK/FK hooks
interface Pose3D {
  position: [number, number, number];     // [x, y, z] in meters
  quaternion: [number, number, number, number];  // [x, y, z, w]
}
```

### TCPOffset (Tool Configuration)

```typescript
interface TCPOffset {
  position: [number, number, number];     // Tool offset from flange
  quaternion: [number, number, number, number];
  name?: string;                          // Optional tool name
}
```

### GhostStatus (Single Source of Truth)

```typescript
// Defined in: kinematics/unified-types.ts
type GhostStatus = 'valid' | 'warning' | 'error' | 'neutral';

// Status meanings:
// - 'valid':   Reachable, no collision, good workspace
// - 'warning': Near joint limits or singularity
// - 'error':   Unreachable or collision
// - 'neutral': Default/preview state (no computation done)
```

### UnifiedIKResult

```typescript
interface UnifiedIKResult {
  success: boolean;
  joints: number[] | null;
  status: GhostStatus;
  positionError: number;
  workspace: WorkspaceAnalysis | null;
  isNearSingular: boolean;
  errorMessage?: string;
}
```

### WorkspaceAnalysis

```typescript
interface WorkspaceAnalysis {
  isValid: boolean;            // Whether the configuration is valid
  manipulability: number;      // 0 = singular, higher is better
  conditionNumber: number;     // Lower is more stable (Infinity = singular)
  isNearSingular: boolean;     // True if close to singularity
  minSingularValue: number;    // Minimum singular value of Jacobian
}
```

---

## Hook Reference

### usePoseIK

Low-level hook for computing IK from a target pose.

```typescript
import { usePoseIK, type Pose3D } from '@yuanweima/roboviz-core';

function MyComponent() {
  const targetPose: Pose3D = {
    position: [0.4, 0.1, 0.3],
    quaternion: [0, 0.707, 0, 0.707],  // 90° rotation around Y
  };

  const {
    ready,
    computing,
    ghostJoints,      // number[] | null
    ghostStatus,      // GhostStatus
    workspace,        // WorkspaceAnalysis | null
    isNearSingular,   // boolean
    result,           // UnifiedIKResult | null
    recompute,        // () => void
  } = usePoseIK({
    robotId: 'main-robot',
    urdfContent,
    targetPose,
    seedJoints: currentJoints,  // Optional: prefer solutions near these
    toolOffset: {               // Optional: tool TCP offset
      position: [0, 0, 0.15],
      quaternion: [0, 0, 0, 1],
    },
    enabled: true,
    debounceMs: 16,
  });

  if (ready && ghostJoints) {
    return <GhostRobot jointAngles={ghostJoints} status={ghostStatus} />;
  }
}
```

### useGhostPreview

Interactive ghost preview with pose/joints input modes.

```typescript
import { useGhostPreview, type IKSolver } from '@yuanweima/roboviz-core';

function GhostPreviewDemo({ solver }: { solver: IKSolver }) {
  const {
    // Output
    jointAngles,
    status,
    workspace,
    isNearSingular,
    ikResult,

    // Input state
    inputMode,        // 'pose' | 'joints'
    targetPose,
    targetJoints,

    // Actions
    setTargetPose,
    setTargetJoints,
    clear,
    applyToRobot,

    // State
    computing,
  } = useGhostPreview({
    solver,
    currentJoints: robotJoints,
    enabled: true,
    standoffDistance: 0.05,  // Approach distance
  });

  // Set ghost target from a click
  const handleClick = (pose: Pose3D) => {
    setTargetPose(pose);
  };

  // Apply ghost position to robot
  const handleApply = () => {
    const joints = applyToRobot();
    if (joints) {
      setRobotJoints(joints);
    }
  };
}
```

### useRobotWithKinematics

High-level hook combining URDF loading, state management, and kinematics.

```typescript
import { useRobotWithKinematics } from '@yuanweima/roboviz-core';

function ReachDemo() {
  const {
    // State
    ready,
    loading,
    error,
    dof,
    urdfContent,

    // Joint State
    jointAngles,
    setJointAngles,

    // Tool State
    hasTool,
    attachTool,
    detachTool,

    // Current Poses (computed from jointAngles)
    tcpPose,         // Pose3D | null
    flangePose,      // Pose3D | null

    // FK Functions
    fk,              // (joints) => FkResult3D
    fkTcp,           // (joints) => FkResult3D
    fkPose,          // (joints) => Pose3D
    fkTcpPose,       // (joints) => Pose3D

    // IK Functions
    ik,              // (pose, seed?) => IkResult3D
    ikTcp,           // (pose, seed?) => IkResult3D

    // Workspace Analysis
    analyzeWorkspace, // (joints) => WorkspaceAnalysis
  } = useRobotWithKinematics({
    robotId: 'fanuc-arm',
    urdfPath: '/robots/fanuc.urdf',  // OR urdfContent
    tool: {
      position: [0, 0, 0.15],
      quaternion: [0, 0, 0, 1],
      name: 'gripper',
    },
    initialJoints: [0, -0.5, 0.5, 0, 0.5, 0],
    onJointChange: (joints) => console.log('Joints:', joints),
    onReady: (ready) => console.log('Ready:', ready),
  });

  if (!ready) return <LoadingSpinner />;

  return (
    <Robot urdfPath="/robots/fanuc.urdf" jointAngles={jointAngles} />
  );
}
```

### useRobotKinematics

Pure kinematics interface without state management.

```typescript
import { useRobotKinematics } from '@yuanweima/roboviz-core';

function KinematicsController({ urdfContent }) {
  const {
    ready,
    error,
    dof,
    jointNames,
    jointLimits,
    hasAnalyticalIk,

    // FK (returns Pose3D)
    fk,
    fkTcp,
    fkChain,

    // IK (accepts Pose3D)
    ik,
    ikTcp,
    ikAll,

    // Workspace
    analyzeWorkspace,

    // Tool
    attachTcp,
    detachTcp,
    hasTool,

    // Validation
    isValidConfig,
  } = useRobotKinematics({
    robotId: 'my-robot',
    urdfContent,
  });

  // Compute FK
  const pose = fk([0, 0, 0, 0, 0, 0]);
  console.log('End-effector height:', pose?.pose.position[2]);

  // Compute IK
  const target: Pose3D = {
    position: [0.4, 0.1, 0.3],
    quaternion: [0, 0, 0, 1],
  };
  const ikResult = ik(target);
  if (ikResult?.success) {
    console.log('Solution:', ikResult.solution);
  }
}
```

---

## Common Patterns

### Pattern 1: Interactive Ghost with Workspace Feedback

```tsx
function InteractiveTarget() {
  const [position, setPosition] = useState<[number, number, number]>([0.4, 0, 0.3]);

  const targetPose: Pose3D = useMemo(() => ({
    position,
    quaternion: [0, 0.707, 0, 0.707],  // Tool pointing down
  }), [position]);

  const { ghostJoints, ghostStatus, workspace, isNearSingular } = usePoseIK({
    robotId: 'robot',
    urdfContent,
    targetPose,
    toolOffset: TOOL_OFFSET,
  });

  // Color feedback based on workspace quality
  const getStatusColor = () => {
    if (ghostStatus === 'error') return 'red';
    if (isNearSingular) return 'orange';
    if (workspace && workspace.manipulability < 0.1) return 'yellow';
    return 'green';
  };

  return (
    <>
      <Robot jointAngles={homePosition} />
      {ghostJoints && (
        <GhostRobot jointAngles={ghostJoints} status={ghostStatus} />
      )}
      <DraggableMarker
        position={position}
        color={getStatusColor()}
        onDrag={setPosition}
      />
      <StatusPanel>
        <div>Status: {ghostStatus}</div>
        <div>Manipulability: {workspace?.manipulability?.toFixed(3) ?? 'N/A'}</div>
        <div>Condition: {workspace?.conditionNumber?.toFixed(1) ?? 'N/A'}</div>
      </StatusPanel>
    </>
  );
}
```

### Pattern 2: Motion Planning with IK Validation

```tsx
function MotionPlanner() {
  const { ik, analyzeWorkspace, isValidConfig } = useRobotKinematics({
    robotId: 'robot',
    urdfContent,
  });

  const planPath = (waypoints: Pose3D[]) => {
    const path: number[][] = [];

    for (const pose of waypoints) {
      const result = ik(pose, path[path.length - 1]);  // Use previous as seed

      if (!result?.success) {
        console.error('IK failed at:', pose);
        return null;
      }

      // Check workspace quality
      const workspace = analyzeWorkspace(result.solution);
      if (workspace?.isNearSingular) {
        console.warn('Near singularity at:', pose);
      }

      // Validate joint limits
      if (!isValidConfig(result.solution)) {
        console.error('Joint limits exceeded at:', pose);
        return null;
      }

      path.push(result.solution);
    }

    return path;
  };
}
```

### Pattern 3: Tool Change Workflow

```tsx
function ToolChangeDemo() {
  const robot = useRobotWithKinematics({
    robotId: 'robot',
    urdfPath: '/robots/fanuc.urdf',
  });

  const TOOLS = {
    pointer: { position: [0, 0, 0.15], quaternion: [0, 0, 0, 1] },
    gripper: { position: [0, 0, 0.08], quaternion: [0, 0, 0, 1] },
    camera: { position: [0.05, 0, 0.03], quaternion: [0, 0.707, 0, 0.707] },
  };

  const [currentTool, setCurrentTool] = useState<string | null>(null);

  const changeTool = (toolName: string | null) => {
    if (toolName && TOOLS[toolName]) {
      robot.attachTool(TOOLS[toolName]);
      setCurrentTool(toolName);
    } else {
      robot.detachTool();
      setCurrentTool(null);
    }
  };

  // tcpPose now reflects the active tool
  console.log('TCP Position:', robot.tcpPose?.position);
}
```

---

## Migration Guide

### From Legacy Pose to Pose3D

```typescript
// Before (legacy format)
const pose = {
  position: { x: 0.4, y: 0.1, z: 0.3 },
  orientation: { w: 1, x: 0, y: 0, z: 0 },
};

// After (Pose3D format)
const pose: Pose3D = {
  position: [0.4, 0.1, 0.3],
  quaternion: [0, 0, 0, 1],  // Note: [x, y, z, w] order
};
```

### From toolPose to toolOffset

```typescript
// Before
usePoseIK({
  toolPose: { position: { x: 0, y: 0, z: 0.15 }, orientation: { ... } },
});

// After
usePoseIK({
  toolOffset: {
    position: [0, 0, 0.15],
    quaternion: [0, 0, 0, 1],
  },
});
```

### Accessing Workspace in Process System

```typescript
// Before (workspace not available)
const { jointAngles, status } = useProcessGhost();

// After (workspace available)
const { jointAngles, status, workspace, isNearSingular, ikResult } = useProcessGhost();
console.log('Manipulability:', workspace?.manipulability);
```

---

## Best Practices

1. **Use Z-up coordinates consistently** - All kinematics hooks expect Z-up. Convert if your data uses Y-up.

2. **Provide seed joints** - IK solutions are more stable when you provide the current/nearby joint configuration as a seed.

3. **Check workspace before executing** - Use `analyzeWorkspace` or `isNearSingular` to warn users about poor configurations.

4. **Debounce high-frequency updates** - When tracking mouse movement or sliders, use the `debounceMs` option to prevent excessive computation.

5. **Handle IK failures gracefully** - Always check `success` or `ghostStatus` before using IK results.
