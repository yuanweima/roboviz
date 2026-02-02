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

Kinematics & Motion Planning:
    >>> solver = robot.create_solver("MyRobot")
    >>> pose = solver.fk([0, 0, 0, 0, 0, 0])
    >>> planner = robot.create_planner()
    >>> result = planner.linear([0]*6, target_pose)
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
    # Kinematics & Motion Planning
    create_solver,
    create_planner,
    # Manager factories
    create_scene_manager,
    create_diagnostic,
    create_performance_monitor,
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
    # Kinematics types
    IKResult,
    WorkspaceAnalysis,
    ReachabilityResult,
    DHParam,
    SolverInfo,
    # Motion planning types
    LinearMotionConfig,
    MotionResult,
    FeasibilityResult,
    JointPathResult,
    PathAnalysis,
    ValidationResult,
    # Collision types
    CollisionResult,
    PathCollisionResult,
)

# Kinematics & Motion Planning classes
from .kinematics import KinematicsSolver
from .motion import MotionPlanner
from .scene_manager import SceneManager
from .diagnostic import DiagnosticVisualizer
from .performance import PerformanceMonitor
from .vision import VisionManager
from .multi_robot import RobotGroup
from .jupyter import RoboVizWidget, show_inline
from .async_client import AsyncRoboViz

# NumPy support (optional — available when numpy is installed)
from .numpy_support import (
    joints_to_array,
    array_to_joints,
    pose_to_matrix,
    matrix_to_pose,
    trajectory_to_arrays,
    arrays_to_trajectory,
    point_cloud_from_array,
    point_cloud_to_array,
)

# Legacy client (for backwards compatibility)
from .client import RoboVizClient, RoboVizClientOptions

__version__ = "0.2.0"

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
    # Kinematics & Motion Planning (module-level)
    "create_solver",
    "create_planner",
    # Classes
    "RoboViz",
    "RobotHandle",
    "KinematicsSolver",
    "MotionPlanner",
    "SceneManager",
    "DiagnosticVisualizer",
    "PerformanceMonitor",
    "VisionManager",
    "RobotGroup",
    "RoboVizWidget",
    "show_inline",
    "AsyncRoboViz",
    # Manager factories (module-level)
    "create_scene_manager",
    "create_diagnostic",
    "create_performance_monitor",
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
    # Kinematics types
    "IKResult",
    "WorkspaceAnalysis",
    "ReachabilityResult",
    "DHParam",
    "SolverInfo",
    # Motion planning types
    "LinearMotionConfig",
    "MotionResult",
    "FeasibilityResult",
    "JointPathResult",
    "PathAnalysis",
    "ValidationResult",
    # Collision types
    "CollisionResult",
    "PathCollisionResult",
    # NumPy support
    "joints_to_array",
    "array_to_joints",
    "pose_to_matrix",
    "matrix_to_pose",
    "trajectory_to_arrays",
    "arrays_to_trajectory",
    "point_cloud_from_array",
    "point_cloud_to_array",
]
