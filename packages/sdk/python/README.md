# RoboViz Python SDK

Python SDK for remote control of RoboViz visualization.

## Installation

```bash
pip install roboviz
```

## Usage

```python
from roboviz import RoboVizClient

client = RoboVizClient("ws://localhost:8080")
client.connect()

# Add a robot
robot = client.add_robot(urdf_path="/models/robot.urdf", id="robot1")

# Set joint angles
client.set_joints("robot1", [0, 0.5, 0.8, 0, 0, 0])

client.disconnect()
```
