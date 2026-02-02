"""
RoboViz Motion Planner

Python wrapper for motion planning (linear motion, path analysis, validation)
via JSON-RPC protocol to the RoboViz viewer.

Example:
    >>> import roboviz as rv
    >>> from roboviz import Pose, Vector3, Quaternion
    >>>
    >>> rv.init()
    >>> robot = rv.add_robot("/path/to/robot.urdf", id="fanuc")
    >>> solver = rv.create_solver("fanuc", "Fanuc_LR_Mate_200iD_7L")
    >>> planner = rv.create_planner("fanuc")
    >>>
    >>> # Plan linear motion
    >>> target = Pose(Vector3(0.4, 0.1, 0.3), Quaternion(w=0.707, y=0.707))
    >>> result = planner.linear([0, -0.3, 0.6, 0, 0, 0], target)
    >>> if result.success:
    ...     print(f"Path has {len(result.path)} waypoints")
"""

from typing import List, Optional, Any, Union, TYPE_CHECKING

from .types import (
    Pose,
    Vector3,
    Quaternion,
    LinearMotionConfig,
    MotionResult,
    FeasibilityResult,
    JointPathResult,
    PathAnalysis,
    ValidationResult,
)

if TYPE_CHECKING:
    from .core import RoboViz

try:
    import numpy as np
    ArrayLike = Union[List[float], "np.ndarray"]
    PathLike = Union[List[List[float]], "np.ndarray"]
except ImportError:
    ArrayLike = List[float]
    PathLike = List[List[float]]


def _to_list(data: Any) -> List[float]:
    """Convert array-like to plain list."""
    if hasattr(data, "tolist"):
        return data.tolist()
    return list(data)


def _path_to_lists(data: Any) -> List[List[float]]:
    """Convert path (2D array-like) to list of lists."""
    if hasattr(data, "tolist"):
        return data.tolist()
    return [list(row) for row in data]


def _pose_from_dict(data: dict) -> Pose:
    """Parse a Pose from JSON-RPC response dict."""
    pos = data.get("position", {})
    ori = data.get("orientation", {})
    return Pose(
        position=Vector3(pos.get("x", 0), pos.get("y", 0), pos.get("z", 0)),
        orientation=Quaternion(ori.get("w", 1), ori.get("x", 0), ori.get("y", 0), ori.get("z", 0)),
    )


class MotionPlanner:
    """
    Motion planner for a specific robot.

    Wraps the JSON-RPC ``motion.*`` methods. Requires a kinematics solver
    to be already created for the robot (via ``create_solver``).

    Args:
        viz: Active RoboViz instance.
        robot_id: Robot identifier.

    Example:
        >>> planner = MotionPlanner(viz, "fanuc")
        >>> result = planner.linear(start_joints, target_pose)
    """

    def __init__(self, viz: "RoboViz", robot_id: str):
        self._viz = viz
        self._robot_id = robot_id

    @property
    def robot_id(self) -> str:
        return self._robot_id

    # =========================================================================
    # Linear Motion
    # =========================================================================

    def linear(
        self,
        start_joints: ArrayLike,
        target_pose: Pose,
        config: Optional[LinearMotionConfig] = None,
    ) -> MotionResult:
        """
        Plan a linear (Cartesian) motion from start joints to target pose.

        Args:
            start_joints: Starting joint configuration.
            target_pose: Target end-effector pose.
            config: Optional motion configuration.

        Returns:
            MotionResult with the planned joint path.
        """
        params: dict = {
            "robotId": self._robot_id,
            "startJoints": _to_list(start_joints),
            "targetPose": target_pose.to_dict(),
        }
        if config:
            params["config"] = config.to_dict()

        result = self._viz._send_request("motion.linear", params)
        return MotionResult.from_dict(result)

    def linear_path(
        self,
        start_joints: ArrayLike,
        waypoints: List[Pose],
        config: Optional[LinearMotionConfig] = None,
    ) -> MotionResult:
        """
        Plan a linear motion through multiple Cartesian waypoints.

        Args:
            start_joints: Starting joint configuration.
            waypoints: List of target poses to pass through.
            config: Optional motion configuration.

        Returns:
            MotionResult with the planned joint path.
        """
        params: dict = {
            "robotId": self._robot_id,
            "startJoints": _to_list(start_joints),
            "waypoints": [wp.to_dict() for wp in waypoints],
        }
        if config:
            params["config"] = config.to_dict()

        result = self._viz._send_request("motion.linearPath", params)
        return MotionResult.from_dict(result)

    def check_linear(
        self,
        start_joints: ArrayLike,
        target_pose: Pose,
        num_samples: int = 10,
    ) -> FeasibilityResult:
        """
        Check if a linear motion is feasible without full planning.

        Args:
            start_joints: Starting joint configuration.
            target_pose: Target end-effector pose.
            num_samples: Number of samples to check along the path.

        Returns:
            FeasibilityResult indicating whether the motion is feasible.
        """
        result = self._viz._send_request("motion.checkLinear", {
            "robotId": self._robot_id,
            "startJoints": _to_list(start_joints),
            "targetPose": target_pose.to_dict(),
            "numSamples": num_samples,
        })
        return FeasibilityResult.from_dict(result)

    def linear_from_current(
        self,
        target_pose: Pose,
        config: Optional[LinearMotionConfig] = None,
    ) -> MotionResult:
        """
        Plan a linear motion from the robot's current configuration.

        Args:
            target_pose: Target end-effector pose.
            config: Optional motion configuration.

        Returns:
            MotionResult with the planned joint path.
        """
        params: dict = {
            "robotId": self._robot_id,
            "targetPose": target_pose.to_dict(),
        }
        if config:
            params["config"] = config.to_dict()

        result = self._viz._send_request("motion.linearFromCurrent", params)
        return MotionResult.from_dict(result)

    # =========================================================================
    # Path Processing
    # =========================================================================

    def interpolate_path(self, path: PathLike, resolution: int) -> List[List[float]]:
        """
        Interpolate a joint path to higher resolution.

        Args:
            path: Joint path (list of joint configurations).
            resolution: Number of points in the interpolated path.

        Returns:
            Interpolated joint path.
        """
        result = self._viz._send_request("motion.interpolatePath", {
            "path": _path_to_lists(path),
            "resolution": resolution,
        })
        return result.get("path", [])

    def smooth_path(self, path: PathLike, window_size: int = 5) -> List[List[float]]:
        """
        Smooth a joint path using a moving average filter.

        Args:
            path: Joint path to smooth.
            window_size: Smoothing window size.

        Returns:
            Smoothed joint path.
        """
        result = self._viz._send_request("motion.smoothPath", {
            "path": _path_to_lists(path),
            "windowSize": window_size,
        })
        return result.get("path", [])

    # =========================================================================
    # Cartesian Conversion
    # =========================================================================

    def cartesian_to_joint(
        self,
        cartesian_path: List[Pose],
        seed_joints: ArrayLike,
    ) -> JointPathResult:
        """
        Convert a Cartesian path to joint space.

        Args:
            cartesian_path: List of Cartesian poses.
            seed_joints: Seed joint configuration for IK.

        Returns:
            JointPathResult with the converted path and any failures.
        """
        result = self._viz._send_request("motion.cartesianToJoint", {
            "robotId": self._robot_id,
            "cartesianPath": [p.to_dict() for p in cartesian_path],
            "seedJoints": _to_list(seed_joints),
        })
        return JointPathResult.from_dict(result)

    def joint_to_cartesian(self, joint_path: PathLike) -> List[Pose]:
        """
        Convert a joint path to Cartesian poses.

        Args:
            joint_path: List of joint configurations.

        Returns:
            List of Cartesian poses for each waypoint.
        """
        result = self._viz._send_request("motion.jointToCartesian", {
            "robotId": self._robot_id,
            "jointPath": _path_to_lists(joint_path),
        })
        return [_pose_from_dict(p) for p in result.get("cartesianPath", [])]

    # =========================================================================
    # Path Analysis
    # =========================================================================

    def analyze_path(self, path: PathLike) -> PathAnalysis:
        """
        Analyze a joint path for quality metrics.

        Args:
            path: Joint path to analyze.

        Returns:
            PathAnalysis with length, singularity indices, joint limit
            warnings, and manipulability values along the path.
        """
        result = self._viz._send_request("motion.analyzePath", {
            "robotId": self._robot_id,
            "path": _path_to_lists(path),
        })
        return PathAnalysis.from_dict(result)

    def validate_path(
        self,
        path: PathLike,
        max_joint_velocity: Optional[float] = None,
        time_step: Optional[float] = None,
    ) -> ValidationResult:
        """
        Validate a joint path for feasibility.

        Args:
            path: Joint path to validate.
            max_joint_velocity: Maximum allowed joint velocity (rad/s).
            time_step: Time step between waypoints (seconds).

        Returns:
            ValidationResult with valid flag and list of issues.
        """
        params: dict = {
            "robotId": self._robot_id,
            "path": _path_to_lists(path),
        }
        if max_joint_velocity is not None:
            params["maxJointVelocity"] = max_joint_velocity
        if time_step is not None:
            params["timeStep"] = time_step

        result = self._viz._send_request("motion.validatePath", params)
        return ValidationResult.from_dict(result)

    def __repr__(self) -> str:
        return f"MotionPlanner(robot_id={self._robot_id!r})"
