"""
RoboViz Python SDK

Python client for controlling RoboViz remotely.

Example:
    >>> from roboviz import RoboVizClient, Vector3, TrajectoryData
    >>>
    >>> # Connect to RoboViz
    >>> viz = RoboVizClient("ws://localhost:8080")
    >>> viz.connect()
    >>>
    >>> # Add a robot
    >>> robot = viz.add_robot("/path/to/robot.urdf")
    >>>
    >>> # Set joint angles
    >>> viz.set_joints(robot.id, [0, -0.3, 0.6, 0, -0.3, 0])
    >>>
    >>> # Play a trajectory
    >>> trajectory = TrajectoryData(
    ...     times=[0, 1, 2],
    ...     positions=[[0,0,0,0,0,0], [0.1,0,0,0,0,0], [0.2,0,0,0,0,0]]
    ... )
    >>> viz.play_trajectory(robot.id, trajectory)
"""

from .client import RoboVizClient, RoboVizClientOptions
from .types import (
    Vector3,
    Quaternion,
    Transform,
    Pose,
    RobotOptions,
    RobotInfo,
    TrajectoryData,
    WaypointData,
    ObstacleData,
    ObstacleShape,
    SafetyZoneData,
)

__version__ = "0.1.0"
__all__ = [
    # Client
    "RoboVizClient",
    "RoboVizClientOptions",
    # Types
    "Vector3",
    "Quaternion",
    "Transform",
    "Pose",
    "RobotOptions",
    "RobotInfo",
    "TrajectoryData",
    "WaypointData",
    "ObstacleData",
    "ObstacleShape",
    "SafetyZoneData",
]
