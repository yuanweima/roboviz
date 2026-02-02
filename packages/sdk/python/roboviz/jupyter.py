"""
RoboViz Jupyter Notebook Integration

Inline display support for Jupyter notebooks via iframe embedding.

Example:
    In a Jupyter cell:
        >>> from roboviz.jupyter import RoboVizWidget
        >>> widget = RoboVizWidget(width=800, height=500)
        >>> robot = widget.add_robot("path/to/robot.urdf")
        >>> robot.set_joints([0, -0.3, 0.6, 0, 0, 0])
        >>> widget  # Renders inline

    Or using the shortcut:
        >>> from roboviz.jupyter import show_inline
        >>> viz = show_inline()
"""

from typing import Optional, List, Any

from .core import RoboViz, RobotHandle
from .types import Vector3, TrajectoryData, ObstacleData


class RoboVizWidget:
    """
    RoboViz widget that renders inline in Jupyter notebooks.

    Uses an iframe pointing to the embedded HTTP server.

    Args:
        width: Widget width in pixels.
        height: Widget height in pixels.
        port: Server port (default: 8765).
        open_browser: Whether to also open a browser window (default: False).
    """

    def __init__(
        self,
        width: int = 800,
        height: int = 600,
        port: int = 8765,
        open_browser: bool = False,
    ):
        self._width = width
        self._height = height
        self._viz = RoboViz(
            host="localhost",
            port=port,
            open_browser=open_browser,
            wait_for_connection=False,
        )

    @property
    def viz(self) -> RoboViz:
        """Access the underlying RoboViz instance."""
        return self._viz

    @property
    def viewer_url(self) -> str:
        """URL to the embedded viewer."""
        return self._viz.viewer_url

    def _repr_html_(self) -> str:
        """Jupyter notebook HTML rendering via iframe."""
        return (
            f'<iframe src="{self._viz.viewer_url}" '
            f'width="{self._width}" height="{self._height}" '
            f'style="border: 1px solid #ccc; border-radius: 4px;" '
            f'allowfullscreen></iframe>'
        )

    # =========================================================================
    # Proxy methods — delegate to underlying RoboViz
    # =========================================================================

    def add_robot(
        self,
        urdf_path: str,
        id: Optional[str] = None,
        position: Optional[Vector3] = None,
        color: Optional[str] = None,
    ) -> RobotHandle:
        """Add a robot to the visualization."""
        return self._viz.add_robot(urdf_path, id, position, color)

    def remove_robot(self, robot_id: str):
        """Remove a robot."""
        self._viz.remove_robot(robot_id)

    def set_joints(self, robot_id: str, angles: List[float]):
        """Set joint angles."""
        self._viz.set_joints(robot_id, angles)

    def play_trajectory(
        self,
        robot_id: str,
        trajectory: TrajectoryData,
        speed: float = 1.0,
        loop: bool = False,
    ):
        """Play a trajectory."""
        self._viz.play_trajectory(robot_id, trajectory, speed, loop)

    def add_obstacle(self, obstacle: ObstacleData):
        """Add an obstacle."""
        self._viz.add_obstacle(obstacle)

    def clear(self):
        """Clear the scene."""
        self._viz.clear()

    def set_scene(self, **kwargs):
        """Configure scene settings."""
        self._viz.set_scene(**kwargs)

    def set_camera(self, **kwargs):
        """Set camera position."""
        self._viz.set_camera(**kwargs)

    def create_solver(self, robot_id: str, robot_name: str):
        """Create a kinematics solver."""
        return self._viz.create_solver(robot_id, robot_name)

    def create_planner(self, robot_id: str):
        """Create a motion planner."""
        return self._viz.create_planner(robot_id)

    def close(self):
        """Close the widget and server."""
        self._viz.close()

    def __del__(self):
        try:
            self.close()
        except Exception:
            pass

    def __repr__(self) -> str:
        return f"RoboVizWidget(url={self._viz.viewer_url!r}, {self._width}x{self._height})"


def show_inline(
    width: int = 800,
    height: int = 600,
    port: int = 8765,
) -> RoboVizWidget:
    """
    Create and display a RoboViz widget inline in Jupyter.

    Args:
        width: Widget width in pixels.
        height: Widget height in pixels.
        port: Server port.

    Returns:
        RoboVizWidget instance. Display it by making it the last expression
        in a cell, or use ``display(widget)``.
    """
    return RoboVizWidget(width=width, height=height, port=port)
