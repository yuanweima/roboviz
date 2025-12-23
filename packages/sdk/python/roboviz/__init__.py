"""
RoboViz Python SDK

A Python SDK for robot visualization. Provides a simple API to visualize
robots, trajectories, obstacles, and more.

Quick Start:
    >>> import roboviz as rv
    >>>
    >>> rv.init()  # Starts server and opens browser
    >>>
    >>> robot = rv.add_robot("/path/to/robot.urdf")
    >>> robot.set_joints([0, 0.5, 0.8, 0, 0, 0])
    >>>
    >>> rv.show()  # Keep running until Ctrl+C

For more control, use the RoboViz class directly:
    >>> from roboviz import RoboViz
    >>>
    >>> viz = RoboViz(port=9000, open_browser=False)
    >>> robot = viz.add_robot("/robot.urdf")
    >>> viz.show()
"""

# Module-level API (recommended)
from .core import (
    init,
    get_instance,
    add_robot,
    remove_robot,
    set_joints,
    play_trajectory,
    add_obstacle,
    add_box,
    add_sphere,
    clear_obstacles,
    add_safety_zone,
    remove_safety_zone,
    set_camera,
    clear,
    on,
    show,
    close,
    # Scene
    set_scene,
    # Coordinate Frames
    add_frame,
    remove_frame,
    update_frame,
    clear_frames,
    enable_frames,
    # Point Clouds
    add_point_cloud,
    update_point_cloud,
    remove_point_cloud,
    clear_point_clouds,
    enable_point_clouds,
    # Collision
    add_collision_geometry,
    remove_collision_geometry,
    clear_collision_geometries,
    enable_collision_detection,
    # Classes
    RoboViz,
    RobotHandle,
)

# Types
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

# Legacy client (for backwards compatibility)
from .client import RoboVizClient, RoboVizClientOptions

__version__ = "0.1.0"

__all__ = [
    # Module-level API
    "init",
    "get_instance",
    "add_robot",
    "remove_robot",
    "set_joints",
    "play_trajectory",
    "add_obstacle",
    "add_box",
    "add_sphere",
    "clear_obstacles",
    "add_safety_zone",
    "remove_safety_zone",
    "set_camera",
    "clear",
    "on",
    "show",
    "close",
    # Scene
    "set_scene",
    # Coordinate Frames
    "add_frame",
    "remove_frame",
    "update_frame",
    "clear_frames",
    "enable_frames",
    # Point Clouds
    "add_point_cloud",
    "update_point_cloud",
    "remove_point_cloud",
    "clear_point_clouds",
    "enable_point_clouds",
    # Collision
    "add_collision_geometry",
    "remove_collision_geometry",
    "clear_collision_geometries",
    "enable_collision_detection",
    # Classes
    "RoboViz",
    "RobotHandle",
    # Legacy
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
