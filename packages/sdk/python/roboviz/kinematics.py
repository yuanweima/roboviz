"""
RoboViz Kinematics Solver

Python wrapper for kinematics computation (IK/FK/workspace analysis)
via JSON-RPC protocol to the RoboViz viewer.

Example:
    >>> import roboviz as rv
    >>> rv.init()
    >>> robot = rv.add_robot("/path/to/robot.urdf", id="fanuc")
    >>> solver = rv.create_solver("fanuc", "Fanuc_LR_Mate_200iD_7L")
    >>>
    >>> # Forward kinematics
    >>> pose = solver.fk([0, -0.3, 0.6, 0, 0, 0])
    >>> print(f"TCP at: {pose.position.x}, {pose.position.y}, {pose.position.z}")
    >>>
    >>> # Inverse kinematics
    >>> result = solver.ik(pose)
    >>> if result.success:
    ...     print(f"IK solution: {result.joints}")
"""

from typing import List, Optional, Any, Union, TYPE_CHECKING

from .types import (
    Pose,
    Vector3,
    Quaternion,
    IKResult,
    WorkspaceAnalysis,
    ReachabilityResult,
    DHParam,
    SolverInfo,
)

if TYPE_CHECKING:
    from .core import RoboViz

# Accept numpy arrays if available
try:
    import numpy as np
    ArrayLike = Union[List[float], "np.ndarray"]
except ImportError:
    ArrayLike = List[float]


def _to_list(data: Any) -> List[float]:
    """Convert array-like to plain list for JSON serialization."""
    if hasattr(data, "tolist"):
        return data.tolist()
    return list(data)


def _pose_from_dict(data: dict) -> Pose:
    """Parse a Pose from JSON-RPC response dict."""
    pos = data.get("position", {})
    ori = data.get("orientation", {})
    return Pose(
        position=Vector3(pos.get("x", 0), pos.get("y", 0), pos.get("z", 0)),
        orientation=Quaternion(ori.get("w", 1), ori.get("x", 0), ori.get("y", 0), ori.get("z", 0)),
    )


class KinematicsSolver:
    """
    Kinematics solver for a specific robot.

    Wraps the JSON-RPC ``kinematics.*`` methods. The solver is created on
    the viewer side when this object is instantiated.

    Args:
        viz: Active RoboViz instance.
        robot_id: Robot identifier (must match a loaded robot).
        robot_name: Robot model name used to look up DH parameters
                    (e.g. ``"Fanuc_LR_Mate_200iD_7L"``).

    Example:
        >>> solver = KinematicsSolver(viz, "fanuc", "Fanuc_LR_Mate_200iD_7L")
        >>> pose = solver.fk([0, 0, 0, 0, 0, 0])
    """

    def __init__(self, viz: "RoboViz", robot_id: str, robot_name: str):
        self._viz = viz
        self._robot_id = robot_id
        self._robot_name = robot_name
        self._disposed = False

        # Initialize kinematics engine if needed
        self._viz._send_request("kinematics.init", {})

        # Create solver on the viewer side
        result = self._viz._send_request("kinematics.createSolver", {
            "robotId": robot_id,
            "robotName": robot_name,
        })
        self._info = SolverInfo.from_dict(result) if result else SolverInfo(False, 0, False)

    @property
    def robot_id(self) -> str:
        return self._robot_id

    @property
    def dof(self) -> int:
        return self._info.dof

    @property
    def supports_analytical_ik(self) -> bool:
        return self._info.supports_analytical_ik

    # =========================================================================
    # Forward Kinematics
    # =========================================================================

    def fk(self, joint_angles: ArrayLike) -> Pose:
        """
        Compute forward kinematics for the given joint angles.

        Args:
            joint_angles: Joint angles in radians (list or numpy array).

        Returns:
            End-effector pose (position + orientation).
        """
        result = self._viz._send_request("kinematics.fk", {
            "robotId": self._robot_id,
            "jointAngles": _to_list(joint_angles),
        })
        return _pose_from_dict(result.get("pose", result))

    def fk_chain(self, joint_angles: ArrayLike) -> List[Pose]:
        """
        Compute forward kinematics for all links in the chain.

        Args:
            joint_angles: Joint angles in radians.

        Returns:
            List of poses for each link in the kinematic chain.
        """
        result = self._viz._send_request("kinematics.fkChain", {
            "robotId": self._robot_id,
            "jointAngles": _to_list(joint_angles),
        })
        poses_data = result.get("poses", [])
        return [_pose_from_dict(p) for p in poses_data]

    # =========================================================================
    # Inverse Kinematics
    # =========================================================================

    def ik(self, target_pose: Pose, seed: Optional[ArrayLike] = None) -> IKResult:
        """
        Compute inverse kinematics for a target pose.

        Args:
            target_pose: Desired end-effector pose.
            seed: Optional seed joint angles for iterative solvers.

        Returns:
            IKResult with success flag and joint angles.
        """
        params: dict = {
            "robotId": self._robot_id,
            "targetPose": target_pose.to_dict(),
        }
        if seed is not None:
            params["seed"] = _to_list(seed)

        result = self._viz._send_request("kinematics.ik", params)
        return IKResult.from_dict(result)

    def ik_all(self, target_pose: Pose, seed: Optional[ArrayLike] = None) -> List[IKResult]:
        """
        Compute all inverse kinematics solutions for a target pose.

        Args:
            target_pose: Desired end-effector pose.
            seed: Optional seed joint angles.

        Returns:
            List of all valid IK solutions.
        """
        params: dict = {
            "robotId": self._robot_id,
            "targetPose": target_pose.to_dict(),
        }
        if seed is not None:
            params["seed"] = _to_list(seed)

        result = self._viz._send_request("kinematics.ikAll", params)
        solutions = result.get("solutions", [])
        return [IKResult.from_dict(s) for s in solutions]

    def configure_ik(self, config: dict) -> None:
        """
        Configure the IK solver parameters.

        Args:
            config: IK solver configuration dict (keys depend on solver type).
        """
        self._viz._send_request("kinematics.configureIk", {
            "robotId": self._robot_id,
            "config": config,
        })

    # =========================================================================
    # Workspace Analysis
    # =========================================================================

    def analyze_workspace(self, joint_angles: ArrayLike) -> WorkspaceAnalysis:
        """
        Analyze workspace quality at a given configuration.

        Args:
            joint_angles: Current joint configuration.

        Returns:
            WorkspaceAnalysis with manipulability and condition number.
        """
        result = self._viz._send_request("kinematics.analyzeWorkspace", {
            "robotId": self._robot_id,
            "jointAngles": _to_list(joint_angles),
        })
        return WorkspaceAnalysis.from_dict(result)

    def is_reachable(self, target_pose: Pose) -> ReachabilityResult:
        """
        Check if a target pose is reachable.

        Args:
            target_pose: Target end-effector pose.

        Returns:
            ReachabilityResult with reachable flag and distance.
        """
        result = self._viz._send_request("kinematics.isReachable", {
            "robotId": self._robot_id,
            "targetPose": target_pose.to_dict(),
        })
        return ReachabilityResult.from_dict(result)

    def is_near_singularity(self, joint_angles: ArrayLike, threshold: float = 0.01) -> bool:
        """
        Check if the configuration is near a singularity.

        Args:
            joint_angles: Current joint configuration.
            threshold: Singularity detection threshold.

        Returns:
            True if near singularity.
        """
        result = self._viz._send_request("kinematics.isNearSingularity", {
            "robotId": self._robot_id,
            "jointAngles": _to_list(joint_angles),
            "threshold": threshold,
        })
        return result.get("isNearSingularity", False)

    def compute_manipulability(self, joint_angles: ArrayLike) -> float:
        """
        Compute the manipulability measure at a configuration.

        Args:
            joint_angles: Current joint configuration.

        Returns:
            Manipulability value (higher is better, 0 at singularity).
        """
        result = self._viz._send_request("kinematics.computeManipulability", {
            "robotId": self._robot_id,
            "jointAngles": _to_list(joint_angles),
        })
        return result.get("manipulability", 0.0)

    def compute_jacobian(self, joint_angles: ArrayLike):
        """
        Compute the Jacobian matrix at a configuration.

        Args:
            joint_angles: Current joint configuration.

        Returns:
            numpy ndarray if numpy is available, otherwise a nested list.
            Shape: (6, dof) for a standard 6-DOF robot.
        """
        result = self._viz._send_request("kinematics.computeJacobian", {
            "robotId": self._robot_id,
            "jointAngles": _to_list(joint_angles),
        })
        rows = result.get("rows", 6)
        cols = result.get("cols", self._info.dof)
        data = result.get("data", [])

        try:
            import numpy as np
            return np.array(data).reshape(rows, cols)
        except ImportError:
            # Return as nested list
            matrix = []
            for i in range(rows):
                matrix.append(data[i * cols:(i + 1) * cols])
            return matrix

    # =========================================================================
    # Tool Management
    # =========================================================================

    def attach_tool(self, tool_pose: Pose) -> None:
        """
        Attach a tool with the given TCP offset.

        Args:
            tool_pose: Tool center point offset relative to flange.
        """
        self._viz._send_request("kinematics.attachTool", {
            "robotId": self._robot_id,
            "toolPose": tool_pose.to_dict(),
        })

    def detach_tool(self) -> None:
        """Detach the current tool."""
        self._viz._send_request("kinematics.detachTool", {
            "robotId": self._robot_id,
        })

    def has_tool(self) -> bool:
        """Check if a tool is attached."""
        result = self._viz._send_request("kinematics.hasTool", {
            "robotId": self._robot_id,
        })
        return result.get("hasTool", False)

    # =========================================================================
    # Validation
    # =========================================================================

    def is_valid_config(self, joints: ArrayLike) -> bool:
        """
        Check if joint angles are within limits.

        Args:
            joints: Joint angles to validate.

        Returns:
            True if all joints are within their limits.
        """
        result = self._viz._send_request("kinematics.isValidConfig", {
            "robotId": self._robot_id,
            "joints": _to_list(joints),
        })
        return result.get("valid", False)

    def get_dh_params(self) -> List[DHParam]:
        """
        Get the DH parameters for this robot.

        Returns:
            List of DHParam for each joint.
        """
        result = self._viz._send_request("kinematics.getDhParams", {
            "robotId": self._robot_id,
        })
        return [DHParam.from_dict(p) for p in result.get("params", [])]

    # =========================================================================
    # Lifecycle
    # =========================================================================

    def dispose(self) -> None:
        """Release solver resources on the viewer side."""
        if not self._disposed:
            self._viz._send_request("kinematics.disposeSolver", {
                "robotId": self._robot_id,
            })
            self._disposed = True

    def __del__(self):
        try:
            self.dispose()
        except Exception:
            pass

    def __repr__(self) -> str:
        return (
            f"KinematicsSolver(robot_id={self._robot_id!r}, "
            f"dof={self._info.dof}, "
            f"analytical_ik={self._info.supports_analytical_ik})"
        )
