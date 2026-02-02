# RoboViz Python SDK

Python SDK for 3D robot visualization. Start a viewer, load URDF robots, compute kinematics, plan motions, and stream sensor data — all from Python.

## Installation

```bash
# Basic (visualization only)
pip install roboviz

# With NumPy support (Pose ↔ matrix, trajectory arrays)
pip install roboviz[numpy]

# With Jupyter Notebook inline display
pip install roboviz[jupyter]

# Everything
pip install roboviz[all]
```

## Quick Start

```python
import roboviz as rv

rv.init()  # Starts embedded server & opens browser viewer

robot = rv.add_robot("/path/to/robot.urdf", id="arm")
robot.set_joints([0, -0.3, 0.6, 0, 0, 0])

rv.show()  # Block until Ctrl+C
```

## Kinematics (IK/FK)

```python
solver = robot.create_solver("MyRobotModel")

# Forward kinematics
pose = solver.fk([0, -0.3, 0.6, 0, 0, 0])
print(f"TCP: ({pose.position.x:.3f}, {pose.position.y:.3f}, {pose.position.z:.3f})")

# Inverse kinematics
from roboviz import Pose, Vector3, Quaternion
target = Pose(Vector3(0.4, 0.1, 0.3), Quaternion(w=0.707, y=0.707))
result = solver.ik(target)
if result.success:
    robot.set_joints(result.joints)
```

## Motion Planning

```python
planner = robot.create_planner()
result = planner.linear([0]*6, target)
if result.success:
    print(f"Path: {len(result.path)} waypoints")
```

## NumPy Integration

```python
from roboviz.numpy_support import pose_to_matrix, matrix_to_pose
import numpy as np

T = pose_to_matrix(pose)          # Pose → 4×4 ndarray
T_new = T @ translation_matrix    # Matrix operations
pose2 = matrix_to_pose(T_new)     # 4×4 ndarray → Pose
```

## Key Features

| Module | Description |
|--------|-------------|
| `KinematicsSolver` | IK/FK, workspace analysis, Jacobian, singularity detection |
| `MotionPlanner` | Linear motion, path validation, Cartesian↔Joint conversion |
| `VisionManager` | Point cloud / camera / depth streaming, 2D/3D annotations |
| `RobotGroup` | Multi-robot coordination, synchronized trajectories |
| `SceneManager` | Snapshots, export/import, undo/redo |
| `DiagnosticVisualizer` | Workspace clouds, joint limits, velocity visualization |
| `PerformanceMonitor` | FPS monitoring, quality controls, profiling |
| `AsyncRoboViz` | Async WebSocket client for high-frequency streaming |
| `RoboVizWidget` | Jupyter Notebook inline display via iframe |

## Requirements

- Python ≥ 3.9
- `websockets ≥ 12.0` (installed automatically)

## License

MIT
