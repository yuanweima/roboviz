"""
RoboViz Multi-Robot Coordination

Multi-robot group management: synchronized trajectories, shared workspace,
coordination modes.

Example:
    >>> import roboviz as rv
    >>> rv.init()
    >>> group = rv.RobotGroup(rv.get_instance(), "cell-1", ["robot-a", "robot-b"])
    >>> group.set_coordination_type("synchronized")
    >>> group.play_sync_trajectory(trajectories)
"""

from typing import List, Dict, Any, Optional, TYPE_CHECKING

from .types import TrajectoryData

if TYPE_CHECKING:
    from .core import RoboViz


class RobotGroup:
    """
    Multi-robot coordination group.

    Args:
        viz: Active RoboViz instance.
        group_id: Unique group identifier.
        robot_ids: List of robot IDs in the group.
    """

    def __init__(self, viz: "RoboViz", group_id: str, robot_ids: Optional[List[str]] = None):
        self._viz = viz
        self._group_id = group_id
        self._robot_ids = list(robot_ids or [])

        # Create group on viewer side
        self._viz._send_request("multiRobot.createGroup", {
            "groupId": group_id,
            "robotIds": self._robot_ids,
        })

    @property
    def group_id(self) -> str:
        return self._group_id

    @property
    def robot_ids(self) -> List[str]:
        return list(self._robot_ids)

    # =========================================================================
    # Group Management
    # =========================================================================

    def add_robot(self, robot_id: str) -> None:
        """Add a robot to the group."""
        self._viz._send_notification("multiRobot.addToGroup", {
            "groupId": self._group_id,
            "robotId": robot_id,
        })
        self._robot_ids.append(robot_id)

    def remove_robot(self, robot_id: str) -> None:
        """Remove a robot from the group."""
        self._viz._send_notification("multiRobot.removeFromGroup", {
            "groupId": self._group_id,
            "robotId": robot_id,
        })
        if robot_id in self._robot_ids:
            self._robot_ids.remove(robot_id)

    def set_coordination_type(self, coord_type: str) -> None:
        """
        Set coordination mode.

        Args:
            coord_type: 'independent', 'synchronized', 'leader_follower',
                       'cooperative'.
        """
        self._viz._send_notification("multiRobot.setCoordinationType", {
            "groupId": self._group_id,
            "type": coord_type,
        })

    def set_master(self, robot_id: str) -> None:
        """Set the leader robot for leader-follower mode."""
        self._viz._send_notification("multiRobot.setMaster", {
            "groupId": self._group_id,
            "robotId": robot_id,
        })

    # =========================================================================
    # Synchronized Playback
    # =========================================================================

    def play_sync_trajectory(
        self,
        trajectories: Dict[str, TrajectoryData],
        speed: float = 1.0,
    ) -> None:
        """
        Play synchronized trajectories for all robots.

        Args:
            trajectories: Mapping of robot_id → TrajectoryData.
            speed: Playback speed multiplier.
        """
        traj_dict = {rid: t.to_dict() for rid, t in trajectories.items()}
        self._viz._send_notification("multiRobot.playSyncTrajectory", {
            "groupId": self._group_id,
            "trajectories": traj_dict,
            "speed": speed,
        })

    def pause(self) -> None:
        """Pause synchronized playback."""
        self._viz._send_notification("multiRobot.pause", {"groupId": self._group_id})

    def stop(self) -> None:
        """Stop synchronized playback."""
        self._viz._send_notification("multiRobot.stop", {"groupId": self._group_id})

    def resume(self) -> None:
        """Resume synchronized playback."""
        self._viz._send_notification("multiRobot.resume", {"groupId": self._group_id})

    # =========================================================================
    # Joint Control
    # =========================================================================

    def set_all_joints(self, joints_map: Dict[str, List[float]]) -> None:
        """
        Set joint angles for all robots simultaneously.

        Args:
            joints_map: Mapping of robot_id → joint angles.
        """
        self._viz._send_notification("multiRobot.setAllJoints", {
            "groupId": self._group_id,
            "joints": joints_map,
        })

    def get_all_joints(self) -> Dict[str, List[float]]:
        """
        Get joint angles for all robots.

        Returns:
            Mapping of robot_id → current joint angles.
        """
        result = self._viz._send_request("multiRobot.getAllJoints", {
            "groupId": self._group_id,
        })
        return result.get("joints", {})

    # =========================================================================
    # Workspace Analysis
    # =========================================================================

    def calculate_shared_workspace(
        self,
        resolution: int = 20,
    ) -> Dict[str, Any]:
        """
        Calculate the shared workspace between all robots in the group.

        Args:
            resolution: Sampling resolution per axis.

        Returns:
            Dict with 'overlapVolume', 'overlapPoints', 'robotWorkspaces'.
        """
        return self._viz._send_request("multiRobot.calculateSharedWorkspace", {
            "groupId": self._group_id,
            "resolution": resolution,
        })

    def check_inter_robot_collision(self) -> Dict[str, Any]:
        """
        Check for collisions between robots in the group.

        Returns:
            Dict with 'hasCollision', 'pairs'.
        """
        return self._viz._send_request("multiRobot.checkInterRobotCollision", {
            "groupId": self._group_id,
        })

    # =========================================================================
    # Lifecycle
    # =========================================================================

    def dispose(self) -> None:
        """Remove the group from the viewer."""
        self._viz._send_notification("multiRobot.removeGroup", {"groupId": self._group_id})

    def __repr__(self) -> str:
        return f"RobotGroup(id={self._group_id!r}, robots={self._robot_ids})"
