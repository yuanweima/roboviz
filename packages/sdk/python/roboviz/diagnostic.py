"""
RoboViz Diagnostic Visualizer

Diagnostic overlays: workspace clouds, singularity maps, joint limits,
velocity vectors, and force/torque visualization.

Example:
    >>> import roboviz as rv
    >>> rv.init()
    >>> diag = rv.DiagnosticVisualizer(rv.get_instance())
    >>> diag.show_workspace("fanuc")
"""

from typing import Dict, Any, Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .core import RoboViz


class DiagnosticVisualizer:
    """
    Diagnostic visualization overlays.

    Args:
        viz: Active RoboViz instance.
    """

    def __init__(self, viz: "RoboViz"):
        self._viz = viz

    # =========================================================================
    # Workspace Visualization
    # =========================================================================

    def show_workspace(
        self,
        robot_id: str,
        resolution: int = 20,
        color_by: str = "manipulability",
    ) -> None:
        """
        Show the reachable workspace as a point cloud.

        Args:
            robot_id: Robot identifier.
            resolution: Sampling resolution per axis.
            color_by: Coloring mode ('manipulability', 'distance', 'reachable').
        """
        self._viz._send_request("diagnostic.showWorkspace", {
            "robotId": robot_id,
            "resolution": resolution,
            "colorBy": color_by,
        })

    def hide_workspace(self, robot_id: str) -> None:
        """Hide workspace visualization."""
        self._viz._send_notification("diagnostic.hideWorkspace", {"robotId": robot_id})

    # =========================================================================
    # Singularity Visualization
    # =========================================================================

    def show_singularity(self, robot_id: str, threshold: float = 0.01) -> None:
        """
        Highlight singularity regions.

        Args:
            robot_id: Robot identifier.
            threshold: Singularity detection threshold.
        """
        self._viz._send_request("diagnostic.showSingularity", {
            "robotId": robot_id,
            "threshold": threshold,
        })

    def hide_singularity(self, robot_id: str) -> None:
        """Hide singularity visualization."""
        self._viz._send_notification("diagnostic.hideSingularity", {"robotId": robot_id})

    # =========================================================================
    # Joint Limits
    # =========================================================================

    def show_joint_limits(self, robot_id: str) -> None:
        """Show joint limit indicators on each joint."""
        self._viz._send_notification("diagnostic.showJointLimits", {"robotId": robot_id})

    def hide_joint_limits(self, robot_id: str) -> None:
        """Hide joint limit indicators."""
        self._viz._send_notification("diagnostic.hideJointLimits", {"robotId": robot_id})

    # =========================================================================
    # Velocity
    # =========================================================================

    def show_velocity(self, robot_id: str, scale: float = 1.0) -> None:
        """
        Show velocity vectors on joints/links.

        Args:
            robot_id: Robot identifier.
            scale: Arrow scale factor.
        """
        self._viz._send_notification("diagnostic.showVelocity", {
            "robotId": robot_id,
            "scale": scale,
        })

    def hide_velocity(self, robot_id: str) -> None:
        """Hide velocity visualization."""
        self._viz._send_notification("diagnostic.hideVelocity", {"robotId": robot_id})

    # =========================================================================
    # Force / Torque
    # =========================================================================

    def show_force_torque(
        self,
        robot_id: str,
        forces: Optional[List[float]] = None,
        torques: Optional[List[float]] = None,
        scale: float = 0.01,
    ) -> None:
        """
        Visualize forces and torques at the end effector.

        Args:
            robot_id: Robot identifier.
            forces: [fx, fy, fz] force vector in Newtons.
            torques: [tx, ty, tz] torque vector in Nm.
            scale: Arrow scale factor.
        """
        params: Dict[str, Any] = {"robotId": robot_id, "scale": scale}
        if forces is not None:
            params["forces"] = forces
        if torques is not None:
            params["torques"] = torques
        self._viz._send_notification("diagnostic.showForceTorque", params)

    def hide_force_torque(self, robot_id: str) -> None:
        """Hide force/torque visualization."""
        self._viz._send_notification("diagnostic.hideForceTorque", {"robotId": robot_id})

    # =========================================================================
    # Trajectory Debugging
    # =========================================================================

    def show_path_trace(
        self,
        robot_id: str,
        path: List[List[float]],
        color: str = "#00ff88",
        width: float = 2.0,
    ) -> None:
        """
        Show a path trace line through Cartesian space.

        Args:
            robot_id: Robot identifier.
            path: Joint path (list of joint configurations).
            color: Line color (hex string).
            width: Line width.
        """
        self._viz._send_notification("diagnostic.showPathTrace", {
            "robotId": robot_id,
            "path": path,
            "color": color,
            "width": width,
        })

    def hide_path_trace(self, robot_id: str) -> None:
        """Hide path trace."""
        self._viz._send_notification("diagnostic.hidePathTrace", {"robotId": robot_id})

    # =========================================================================
    # Global
    # =========================================================================

    def hide_all(self) -> None:
        """Hide all diagnostic visualizations."""
        self._viz._send_notification("diagnostic.hideAll", {})

    def __repr__(self) -> str:
        return "DiagnosticVisualizer()"
