"""
RoboViz Core API

High-level API for controlling robot visualization.
This is the main entry point for users.

Example:
    >>> import roboviz as rv
    >>>
    >>> rv.init()  # Starts server and opens browser
    >>>
    >>> robot = rv.add_robot("/path/to/robot.urdf")
    >>> robot.set_joints([0, 0.5, 0.8, 0, 0, 0])
    >>>
    >>> rv.show()  # Keep running until Ctrl+C
"""

import time
import webbrowser
import base64
import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable, Tuple
from dataclasses import dataclass, field

from .server import EmbeddedServer
from .types import (
    Vector3,
    Pose,
    TrajectoryData,
    ObstacleData,
    ObstacleShape,
    WaypointData,
)
from .kinematics import KinematicsSolver
from .motion import MotionPlanner
from .scene_manager import SceneManager
from .diagnostic import DiagnosticVisualizer
from .performance import PerformanceMonitor


def _load_urdf_with_meshes(urdf_path: str) -> Tuple[str, Dict[str, str]]:
    """
    Load URDF file and all referenced mesh files.

    Args:
        urdf_path: Path to URDF file (local filesystem path)

    Returns:
        Tuple of (urdf_content, mesh_data_map)
        where mesh_data_map is {filename: base64_encoded_content}
    """
    urdf_path = Path(urdf_path).resolve()
    urdf_dir = urdf_path.parent

    # Read URDF content
    with open(urdf_path, 'r', encoding='utf-8') as f:
        urdf_content = f.read()

    # Parse URDF to find mesh references
    mesh_data: Dict[str, str] = {}

    try:
        root = ET.fromstring(urdf_content)

        # Find mesh elements only within <visual> tags (not <collision>)
        # Collision meshes are simplified and not suitable for display
        for visual_elem in root.iter('visual'):
            for mesh_elem in visual_elem.iter('mesh'):
                filename = mesh_elem.get('filename', '')
                if not filename:
                    continue

                # Resolve mesh path
                mesh_path: Path
                if filename.startswith('package://'):
                    # ROS package path - try to resolve relative to URDF directory
                    # package://pkg_name/path/to/mesh.stl -> relative to urdf_dir
                    package_path = filename.replace('package://', '')
                    # Skip package name and use rest of path
                    parts = package_path.split('/', 1)
                    if len(parts) > 1:
                        mesh_path = urdf_dir / parts[1]
                    else:
                        mesh_path = urdf_dir / package_path
                elif filename.startswith('file://'):
                    mesh_path = Path(filename.replace('file://', ''))
                elif filename.startswith('/'):
                    mesh_path = Path(filename)
                else:
                    # Relative path
                    mesh_path = urdf_dir / filename

                # Try to load mesh file
                if mesh_path.exists():
                    try:
                        with open(mesh_path, 'rb') as f:
                            mesh_bytes = f.read()
                        mesh_key = mesh_path.name  # Use filename as key
                        mesh_data[mesh_key] = base64.b64encode(mesh_bytes).decode('ascii')
                    except Exception as e:
                        print(f"Warning: Failed to load mesh {mesh_path}: {e}")
                else:
                    print(f"Warning: Mesh file not found: {mesh_path}")

    except ET.ParseError as e:
        print(f"Warning: Failed to parse URDF for mesh discovery: {e}")

    return urdf_content, mesh_data


def _is_local_path(path: str) -> bool:
    """Check if path is a local filesystem path (not a URL)."""
    if path.startswith('http://') or path.startswith('https://'):
        return False
    if path.startswith('/') or Path(path).exists():
        return True
    # Check if it's a relative path that exists
    if os.path.exists(path):
        return True
    return False


@dataclass
class RobotHandle:
    """Handle to a robot in the visualization."""

    id: str
    _viz: "RoboViz"

    def set_joints(self, angles: List[float]):
        """Set joint angles."""
        self._viz._send_notification("robot.setJoints", {
            "id": self.id,
            "angles": angles,
        })

    def get_joints(self) -> List[float]:
        """Get current joint angles."""
        result = self._viz._send_request("robot.getJoints", {"id": self.id})
        return result.get("angles", [])

    def get_tcp_pose(self) -> Optional[Dict[str, Any]]:
        """
        Get current TCP (end effector) pose.

        Returns:
            Dict with 'position' {x, y, z} and 'orientation' {w, x, y, z}
            or None if pose not available yet.
        """
        result = self._viz._send_request("robot.getTcpPose", {"id": self.id})
        return result.get("pose")

    def create_solver(self, robot_name: str) -> "KinematicsSolver":
        """
        Create a kinematics solver for this robot.

        Args:
            robot_name: Robot model name for DH parameter lookup
                        (e.g. "Fanuc_LR_Mate_200iD_7L").

        Returns:
            KinematicsSolver instance.
        """
        return KinematicsSolver(self._viz, self.id, robot_name)

    def create_planner(self) -> "MotionPlanner":
        """
        Create a motion planner for this robot.

        Requires a kinematics solver to be already created via
        ``create_solver()``.

        Returns:
            MotionPlanner instance.
        """
        return MotionPlanner(self._viz, self.id)

    def remove(self):
        """Remove this robot from the scene."""
        self._viz._send_notification("robot.remove", {"id": self.id})


# Global instance
_instance: Optional["RoboViz"] = None


class RoboViz:
    """
    RoboViz controller.

    Manages the embedded server and provides API for visualization control.
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 8765,
        open_browser: bool = True,
        wait_for_connection: bool = True,
        connection_timeout: float = 30.0,
    ):
        self._server = EmbeddedServer(
            host=host,
            http_port=port,
            ws_port=port + 1,
        )
        self._request_id = 0
        self._pending_requests: Dict[int, Any] = {}
        self._callbacks: Dict[str, List[Callable]] = {}
        self._robots: Dict[str, RobotHandle] = {}

        # Set up message handler
        self._server.set_message_handler(self._handle_message)

        # Start server
        self._server.start()
        print(f"RoboViz server started")

        # Open browser
        if open_browser:
            url = self._server.viewer_url
            print(f"Opening viewer: {url}")
            webbrowser.open(url)

        # Wait for connection
        if wait_for_connection:
            print("Waiting for viewer to connect...")
            if self._server.wait_for_connection(connection_timeout):
                print("Viewer connected!")
            else:
                print("Warning: No viewer connected within timeout")

    @property
    def viewer_url(self) -> str:
        """URL to access the viewer."""
        return self._server.viewer_url

    def _handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle incoming message from viewer."""
        # Handle response
        if "id" in message and ("result" in message or "error" in message):
            request_id = message["id"]
            if request_id in self._pending_requests:
                self._pending_requests[request_id] = message
            return None

        # Handle notification/event
        if "method" in message:
            method = message["method"]
            params = message.get("params", {})
            self._emit(method, params)

        return None

    def _send_notification(self, method: str, params: Dict[str, Any]):
        """Send a notification (no response expected)."""
        self._server.send({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        })

    def _send_request(self, method: str, params: Dict[str, Any], timeout: float = 5.0) -> Any:
        """Send a request and wait for response."""
        self._request_id += 1
        request_id = self._request_id

        self._pending_requests[request_id] = None
        self._server.send({
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params,
        })

        # Wait for response
        start = time.time()
        while time.time() - start < timeout:
            if self._pending_requests.get(request_id) is not None:
                response = self._pending_requests.pop(request_id)
                if "error" in response:
                    raise RuntimeError(response["error"].get("message", "Unknown error"))
                return response.get("result")
            time.sleep(0.01)

        del self._pending_requests[request_id]
        raise TimeoutError(f"Request {method} timed out")

    def _emit(self, event: str, params: Dict[str, Any]):
        """Emit an event to registered callbacks."""
        if event in self._callbacks:
            for callback in self._callbacks[event]:
                try:
                    callback(params)
                except Exception as e:
                    print(f"Error in callback: {e}")

    # =========================================================================
    # Event API
    # =========================================================================

    def on(self, event: str, callback: Callable[[Dict[str, Any]], None]):
        """
        Register a callback for an event.

        Events:
            - 'robot.clicked': When robot is clicked (params: robotId, linkName)
            - 'robot.jointsChanged': When joints change via UI (params: robotId, angles)
            - 'trajectory.ended': When trajectory playback ends (params: trajectoryId)

        Args:
            event: Event name
            callback: Function to call with event params
        """
        if event not in self._callbacks:
            self._callbacks[event] = []
        self._callbacks[event].append(callback)

    def off(self, event: str, callback: Optional[Callable] = None):
        """
        Unregister a callback for an event.

        Args:
            event: Event name
            callback: Specific callback to remove, or None to remove all
        """
        if event in self._callbacks:
            if callback is None:
                del self._callbacks[event]
            else:
                self._callbacks[event] = [cb for cb in self._callbacks[event] if cb != callback]

    # =========================================================================
    # Robot API
    # =========================================================================

    def add_robot(
        self,
        urdf_path: str,
        id: Optional[str] = None,
        position: Optional[Vector3] = None,
        color: Optional[str] = None,
    ) -> RobotHandle:
        """
        Add a robot to the visualization.

        Args:
            urdf_path: Path to URDF file (local path or URL)
                      If a local path, the file content will be loaded and sent via WebSocket.
                      If a URL, it will be passed to the viewer to fetch.
            id: Robot identifier (auto-generated if not provided)
            position: Initial position
            color: Robot color (hex string)

        Returns:
            RobotHandle for controlling the robot
        """
        robot_id = id or f"robot-{len(self._robots)}"

        params: Dict[str, Any] = {
            "id": robot_id,
        }

        # Check if it's a local file path
        if _is_local_path(urdf_path):
            # Load URDF and mesh files, send content via WebSocket
            try:
                urdf_content, mesh_data = _load_urdf_with_meshes(urdf_path)
                params["urdfContent"] = urdf_content
                if mesh_data:
                    params["meshData"] = mesh_data
            except FileNotFoundError:
                print(f"Warning: URDF file not found: {urdf_path}, treating as URL")
                params["urdf"] = urdf_path
            except Exception as e:
                print(f"Warning: Failed to load URDF: {e}, treating as URL")
                params["urdf"] = urdf_path
        else:
            # Treat as URL - viewer will fetch it
            params["urdf"] = urdf_path

        if position:
            params["position"] = position.to_dict()
        if color:
            params["color"] = color

        self._send_notification("robot.add", params)

        handle = RobotHandle(id=robot_id, _viz=self)
        self._robots[robot_id] = handle
        return handle

    def remove_robot(self, robot_id: str):
        """Remove a robot from the visualization."""
        self._send_notification("robot.remove", {"id": robot_id})
        self._robots.pop(robot_id, None)

    def set_joints(self, robot_id: str, angles: List[float]):
        """Set robot joint angles."""
        self._send_notification("robot.setJoints", {
            "id": robot_id,
            "angles": angles,
        })

    # =========================================================================
    # Trajectory API
    # =========================================================================

    def play_trajectory(
        self,
        robot_id: str,
        trajectory: TrajectoryData,
        speed: float = 1.0,
        loop: bool = False,
    ):
        """Play a trajectory on a robot."""
        self._send_notification("trajectory.play", {
            "robotId": robot_id,
            "trajectory": trajectory.to_dict(),
            "speed": speed,
            "loop": loop,
        })

    def pause_trajectory(self, robot_id: str):
        """Pause trajectory playback."""
        self._send_notification("trajectory.pause", {"robotId": robot_id})

    def stop_trajectory(self, robot_id: str):
        """Stop trajectory playback."""
        self._send_notification("trajectory.stop", {"robotId": robot_id})

    # =========================================================================
    # Obstacle API
    # =========================================================================

    def add_obstacle(self, obstacle: ObstacleData):
        """Add an obstacle to the scene."""
        self._send_notification("obstacle.add", obstacle.to_dict())

    def add_box(
        self,
        size: List[float],
        position: List[float],
        color: str = "#ff4444",
        id: Optional[str] = None,
    ):
        """Add a box obstacle."""
        obstacle = ObstacleData(
            id=id or f"box-{time.time()}",
            shape=ObstacleShape.BOX,
            dimensions=Vector3(size[0], size[1], size[2]),
            position=Vector3(position[0], position[1], position[2]),
            color=color,
        )
        self.add_obstacle(obstacle)

    def add_sphere(
        self,
        radius: float,
        position: List[float],
        color: str = "#44ff44",
        id: Optional[str] = None,
    ):
        """Add a sphere obstacle."""
        obstacle = ObstacleData(
            id=id or f"sphere-{time.time()}",
            shape=ObstacleShape.SPHERE,
            dimensions=Vector3(radius * 2, radius * 2, radius * 2),
            position=Vector3(position[0], position[1], position[2]),
            color=color,
        )
        self.add_obstacle(obstacle)

    def remove_obstacle(self, obstacle_id: str):
        """Remove an obstacle."""
        self._send_notification("obstacle.remove", {"id": obstacle_id})

    def clear_obstacles(self):
        """Remove all obstacles."""
        self._send_notification("obstacle.clear", {})

    # =========================================================================
    # Safety Zone API
    # =========================================================================

    def add_safety_zone(
        self,
        id: str,
        radius: float,
        warning_radius: Optional[float] = None,
        danger_radius: Optional[float] = None,
        position: Optional[List[float]] = None,
    ):
        """Add a safety zone visualization."""
        self._send_notification("safetyZone.add", {
            "id": id,
            "radius": radius,
            "warningRadius": warning_radius or radius * 1.5,
            "dangerRadius": danger_radius or radius * 2.0,
            "position": {"x": position[0], "y": position[1], "z": position[2]} if position else {"x": 0, "y": 0, "z": 0},
        })

    def remove_safety_zone(self, zone_id: str):
        """Remove a safety zone."""
        self._send_notification("safetyZone.remove", {"id": zone_id})

    # =========================================================================
    # Camera API
    # =========================================================================

    def set_camera(
        self,
        position: Optional[Vector3] = None,
        target: Optional[Vector3] = None,
        fov: Optional[float] = None,
    ):
        """Set camera position and target."""
        params: Dict[str, Any] = {}
        if position:
            params["position"] = position.to_dict()
        if target:
            params["target"] = target.to_dict()
        if fov:
            params["fov"] = fov
        self._send_notification("camera.set", params)

    def reset_camera(self):
        """Reset camera to default position."""
        self._send_notification("camera.reset", {})

    # =========================================================================
    # Scene API
    # =========================================================================

    def clear(self):
        """Clear the entire scene."""
        self._send_notification("scene.clear", {})
        self._robots.clear()

    def set_scene(
        self,
        background: Optional[str] = None,
        shadows: Optional[bool] = None,
        ground_plane: Optional[bool] = None,
        ground_color: Optional[str] = None,
        environment: Optional[str] = None,
    ):
        """
        Configure scene visual settings.

        Args:
            background: Background color (hex string)
            shadows: Enable/disable shadows
            ground_plane: Enable/disable ground plane
            ground_color: Ground plane color (hex string)
            environment: Environment preset ('studio', 'sunset', 'dawn', 'night',
                        'warehouse', 'forest', 'apartment', 'city', 'park', 'lobby')
        """
        params: Dict[str, Any] = {}
        if background:
            params["background"] = background
        if shadows is not None:
            params["shadows"] = shadows
        if ground_plane is not None:
            params["groundPlane"] = ground_plane
        if ground_color:
            params["groundColor"] = ground_color
        if environment:
            params["environmentPreset"] = environment
        self._send_notification("scene.setConfig", params)

    # =========================================================================
    # Coordinate Frame API
    # =========================================================================

    def add_frame(
        self,
        id: str,
        name: str,
        position: List[float],
        rotation: Optional[List[float]] = None,
        frame_type: str = "custom",
        parent_frame_id: Optional[str] = None,
        axis_length: float = 0.1,
        show_label: bool = True,
    ):
        """
        Add a coordinate frame to the scene.

        Args:
            id: Unique frame identifier
            name: Display name
            position: [x, y, z] position
            rotation: [w, x, y, z] quaternion (default: identity)
            frame_type: Frame type ('world', 'base', 'flange', 'tool', 'user',
                       'workpiece', 'sensor', 'camera', 'fixture', 'custom')
            parent_frame_id: ID of parent frame (for hierarchy)
            axis_length: Length of axis arrows
            show_label: Whether to show the frame label
        """
        self._send_notification("frame.add", {
            "id": id,
            "name": name,
            "type": frame_type,
            "position": {"x": position[0], "y": position[1], "z": position[2]},
            "rotation": rotation or [1, 0, 0, 0],
            "parentFrameId": parent_frame_id,
            "visualization": {
                "axisLength": axis_length,
                "showLabel": show_label,
            },
        })

    def remove_frame(self, frame_id: str):
        """Remove a coordinate frame."""
        self._send_notification("frame.remove", {"id": frame_id})

    def update_frame(
        self,
        frame_id: str,
        position: Optional[List[float]] = None,
        rotation: Optional[List[float]] = None,
        name: Optional[str] = None,
    ):
        """Update a coordinate frame's position or rotation."""
        params: Dict[str, Any] = {"id": frame_id}
        if position:
            params["position"] = {"x": position[0], "y": position[1], "z": position[2]}
        if rotation:
            params["rotation"] = rotation
        if name:
            params["name"] = name
        self._send_notification("frame.update", params)

    def clear_frames(self):
        """Remove all coordinate frames."""
        self._send_notification("frame.clear", {})

    def enable_frames(self, enabled: bool = True):
        """Enable or disable coordinate frame display."""
        self._send_notification("frame.enable", {"enabled": enabled})

    # =========================================================================
    # Point Cloud API
    # =========================================================================

    def add_point_cloud(
        self,
        id: str,
        points: List[float],
        colors: Optional[List[int]] = None,
        position: Optional[List[float]] = None,
        point_size: float = 0.01,
        color_mode: str = "uniform",
        uniform_color: str = "#ffffff",
        opacity: float = 1.0,
    ):
        """
        Add a point cloud to the scene.

        Args:
            id: Unique point cloud identifier
            points: Flat list of point coordinates [x1,y1,z1, x2,y2,z2, ...]
            colors: Optional flat list of RGB colors (0-255) [r1,g1,b1, r2,g2,b2, ...]
            position: [x, y, z] position offset
            point_size: Size of each point
            color_mode: Color mode ('rgb', 'height', 'uniform', 'intensity', 'distance')
            uniform_color: Color when using 'uniform' mode (hex string)
            opacity: Point opacity (0-1)
        """
        params: Dict[str, Any] = {
            "id": id,
            "points": points,
            "pointCount": len(points) // 3,
            "visualization": {
                "pointSize": point_size,
                "colorMode": color_mode,
                "uniformColor": uniform_color,
                "opacity": opacity,
            },
        }
        if colors:
            params["colors"] = colors
        if position:
            params["position"] = {"x": position[0], "y": position[1], "z": position[2]}
        self._send_notification("pointCloud.add", params)

    def update_point_cloud(
        self,
        id: str,
        points: Optional[List[float]] = None,
        position: Optional[List[float]] = None,
    ):
        """Update point cloud data or position."""
        params: Dict[str, Any] = {"id": id}
        if points:
            params["points"] = points
            params["pointCount"] = len(points) // 3
        if position:
            params["position"] = {"x": position[0], "y": position[1], "z": position[2]}
        self._send_notification("pointCloud.update", params)

    def remove_point_cloud(self, id: str):
        """Remove a point cloud."""
        self._send_notification("pointCloud.remove", {"id": id})

    def clear_point_clouds(self):
        """Remove all point clouds."""
        self._send_notification("pointCloud.clear", {})

    def enable_point_clouds(self, enabled: bool = True):
        """Enable or disable point cloud display."""
        self._send_notification("pointCloud.enable", {"enabled": enabled})

    # =========================================================================
    # Collision API
    # =========================================================================

    def add_collision_geometry(
        self,
        id: str,
        geometry_type: str,
        position: List[float],
        params: Optional[Dict[str, float]] = None,
        rotation: Optional[List[float]] = None,
    ):
        """
        Add a collision geometry for collision detection.

        Args:
            id: Unique geometry identifier
            geometry_type: Type of geometry ('box', 'sphere', 'cylinder', 'capsule')
            position: [x, y, z] position
            params: Geometry parameters (e.g., {'radius': 0.1} for sphere,
                   {'width': 0.1, 'height': 0.2, 'depth': 0.1} for box)
            rotation: Optional [x, y, z] euler rotation in radians
        """
        self._send_notification("collision.addGeometry", {
            "id": id,
            "type": geometry_type,
            "position": {"x": position[0], "y": position[1], "z": position[2]},
            "params": params or {},
            "rotation": rotation,
        })

    def remove_collision_geometry(self, id: str):
        """Remove a collision geometry."""
        self._send_notification("collision.removeGeometry", {"id": id})

    def clear_collision_geometries(self):
        """Remove all collision geometries."""
        self._send_notification("collision.clearGeometries", {})

    def enable_collision_detection(self, enabled: bool = True):
        """Enable or disable collision detection."""
        self._send_notification("collision.enable", {"enabled": enabled})

    # =========================================================================
    # Events API
    # =========================================================================

    def on(self, event: str, callback: Callable):
        """Register an event callback."""
        if event not in self._callbacks:
            self._callbacks[event] = []
        self._callbacks[event].append(callback)

    def off(self, event: str, callback: Optional[Callable] = None):
        """Remove event callback."""
        if event in self._callbacks:
            if callback:
                self._callbacks[event] = [
                    cb for cb in self._callbacks[event] if cb != callback
                ]
            else:
                self._callbacks[event] = []

    # =========================================================================
    # Kinematics & Motion Planning Factory
    # =========================================================================

    def create_solver(self, robot_id: str, robot_name: str) -> KinematicsSolver:
        """
        Create a kinematics solver for a robot.

        Args:
            robot_id: Robot identifier (must match a loaded robot).
            robot_name: Robot model name for DH parameter lookup.

        Returns:
            KinematicsSolver instance.
        """
        return KinematicsSolver(self, robot_id, robot_name)

    def create_planner(self, robot_id: str) -> MotionPlanner:
        """
        Create a motion planner for a robot.

        Requires a kinematics solver to be already created for that robot.

        Args:
            robot_id: Robot identifier.

        Returns:
            MotionPlanner instance.
        """
        return MotionPlanner(self, robot_id)

    # =========================================================================
    # Advanced Collision API
    # =========================================================================

    def check_collision(self, robot_id: Optional[str] = None) -> Any:
        """
        Check for collisions in the scene.

        Args:
            robot_id: Optional — check only for this robot. If None, checks all.

        Returns:
            CollisionResult with collision pairs.
        """
        from .types import CollisionResult
        params: Dict[str, Any] = {}
        if robot_id:
            params["robotId"] = robot_id
        result = self._send_request("collision.check", params)
        return CollisionResult.from_dict(result)

    def check_path_collision(self, robot_id: str, path: List[List[float]]) -> Any:
        """
        Check a joint path for collisions.

        Args:
            robot_id: Robot identifier.
            path: Joint path (list of joint configurations).

        Returns:
            PathCollisionResult with collision indices.
        """
        from .types import PathCollisionResult
        result = self._send_request("collision.checkPath", {
            "robotId": robot_id,
            "path": path,
        })
        return PathCollisionResult.from_dict(result)

    def query_distance(self, object_a: str, object_b: str) -> float:
        """
        Query minimum distance between two objects.

        Args:
            object_a: First object ID.
            object_b: Second object ID.

        Returns:
            Minimum distance in meters.
        """
        result = self._send_request("collision.queryDistance", {
            "objectA": object_a,
            "objectB": object_b,
        })
        return result.get("distance", float("inf"))

    def start_continuous_collision_check(self, robot_id: str, interval_ms: int = 100) -> None:
        """Start continuous collision checking for a robot."""
        self._send_notification("collision.startContinuous", {
            "robotId": robot_id,
            "intervalMs": interval_ms,
        })

    def stop_continuous_collision_check(self, robot_id: str) -> None:
        """Stop continuous collision checking."""
        self._send_notification("collision.stopContinuous", {"robotId": robot_id})

    # =========================================================================
    # Advanced Frame Transform API
    # =========================================================================

    def get_frame_world_transform(self, frame_id: str) -> Dict[str, Any]:
        """
        Get a frame's transform in world coordinates.

        Args:
            frame_id: Frame identifier.

        Returns:
            Dict with 'position' and 'rotation' in world space.
        """
        return self._send_request("frame.getWorldTransform", {"id": frame_id})

    def get_relative_transform(self, from_frame: str, to_frame: str) -> Dict[str, Any]:
        """
        Get the transform from one frame to another.

        Args:
            from_frame: Source frame ID.
            to_frame: Target frame ID.

        Returns:
            Dict with 'position' and 'rotation' of to_frame relative to from_frame.
        """
        return self._send_request("frame.getRelativeTransform", {
            "fromFrame": from_frame,
            "toFrame": to_frame,
        })

    def transform_point(self, point: List[float], from_frame: str, to_frame: str) -> List[float]:
        """
        Transform a 3D point from one frame to another.

        Args:
            point: [x, y, z] in from_frame.
            from_frame: Source frame ID.
            to_frame: Target frame ID.

        Returns:
            [x, y, z] in to_frame.
        """
        result = self._send_request("frame.transformPoint", {
            "point": {"x": point[0], "y": point[1], "z": point[2]},
            "fromFrame": from_frame,
            "toFrame": to_frame,
        })
        p = result.get("point", {})
        return [p.get("x", 0), p.get("y", 0), p.get("z", 0)]

    def transform_pose(self, pose: Pose, from_frame: str, to_frame: str) -> Pose:
        """
        Transform a pose from one frame to another.

        Args:
            pose: Pose in from_frame.
            from_frame: Source frame ID.
            to_frame: Target frame ID.

        Returns:
            Pose in to_frame.
        """
        from .types import Vector3 as V3, Quaternion as Q
        result = self._send_request("frame.transformPose", {
            "pose": pose.to_dict(),
            "fromFrame": from_frame,
            "toFrame": to_frame,
        })
        pos = result.get("position", {})
        ori = result.get("orientation", {})
        return Pose(
            position=V3(pos.get("x", 0), pos.get("y", 0), pos.get("z", 0)),
            orientation=Q(ori.get("w", 1), ori.get("x", 0), ori.get("y", 0), ori.get("z", 0)),
        )

    def get_frame_children(self, frame_id: str) -> List[str]:
        """Get child frame IDs of a frame."""
        result = self._send_request("frame.getChildren", {"id": frame_id})
        return result.get("children", [])

    def set_active_tool_frame(self, frame_id: str) -> None:
        """Set the active tool frame."""
        self._send_notification("frame.setActiveTool", {"id": frame_id})

    def set_active_user_frame(self, frame_id: str) -> None:
        """Set the active user frame."""
        self._send_notification("frame.setActiveUser", {"id": frame_id})

    # =========================================================================
    # Manager Factories
    # =========================================================================

    def create_scene_manager(self) -> SceneManager:
        """Create a scene manager for snapshots, export/import, undo/redo."""
        return SceneManager(self)

    def create_diagnostic(self) -> DiagnosticVisualizer:
        """Create a diagnostic visualizer for workspace, singularity, etc."""
        return DiagnosticVisualizer(self)

    def create_performance_monitor(self) -> PerformanceMonitor:
        """Create a performance monitor."""
        return PerformanceMonitor(self)

    # =========================================================================
    # Lifecycle API
    # =========================================================================

    def show(self):
        """
        Block and keep the visualization running.
        Press Ctrl+C to exit.
        """
        print("\nVisualization running. Press Ctrl+C to exit.")
        try:
            while True:
                time.sleep(0.1)
        except KeyboardInterrupt:
            print("\nExiting...")
            self.close()

    def close(self):
        """Close the server and cleanup."""
        self._server.stop()


# =============================================================================
# Module-level API
# =============================================================================

def init(
    host: str = "localhost",
    port: int = 8765,
    open_browser: bool = True,
) -> RoboViz:
    """
    Initialize RoboViz.

    This starts the embedded server and opens the viewer in a browser.

    Args:
        host: Server host (default: localhost)
        port: Server port (default: 8765)
        open_browser: Whether to automatically open the browser

    Returns:
        RoboViz instance

    Example:
        >>> import roboviz as rv
        >>> rv.init()
        >>> robot = rv.add_robot("/robot.urdf")
    """
    global _instance
    if _instance is not None:
        _instance.close()

    _instance = RoboViz(
        host=host,
        port=port,
        open_browser=open_browser,
    )
    return _instance


def get_instance() -> RoboViz:
    """Get the global RoboViz instance."""
    if _instance is None:
        raise RuntimeError("RoboViz not initialized. Call rv.init() first.")
    return _instance


def add_robot(
    urdf_path: str,
    id: Optional[str] = None,
    position: Optional[Vector3] = None,
    color: Optional[str] = None,
) -> RobotHandle:
    """Add a robot to the visualization."""
    return get_instance().add_robot(urdf_path, id, position, color)


def remove_robot(robot_id: str):
    """Remove a robot from the visualization."""
    get_instance().remove_robot(robot_id)


def set_joints(robot_id: str, angles: List[float]):
    """Set robot joint angles."""
    get_instance().set_joints(robot_id, angles)


def play_trajectory(
    robot_id: str,
    trajectory: TrajectoryData,
    speed: float = 1.0,
    loop: bool = False,
):
    """Play a trajectory on a robot."""
    get_instance().play_trajectory(robot_id, trajectory, speed, loop)


def add_obstacle(obstacle: ObstacleData):
    """Add an obstacle to the scene."""
    get_instance().add_obstacle(obstacle)


def add_box(
    size: List[float],
    position: List[float],
    color: str = "#ff4444",
    id: Optional[str] = None,
):
    """Add a box obstacle."""
    get_instance().add_box(size, position, color, id)


def add_sphere(
    radius: float,
    position: List[float],
    color: str = "#44ff44",
    id: Optional[str] = None,
):
    """Add a sphere obstacle."""
    get_instance().add_sphere(radius, position, color, id)


def clear_obstacles():
    """Remove all obstacles."""
    get_instance().clear_obstacles()


def add_safety_zone(
    id: str,
    radius: float,
    warning_radius: Optional[float] = None,
    danger_radius: Optional[float] = None,
    position: Optional[List[float]] = None,
):
    """Add a safety zone visualization."""
    get_instance().add_safety_zone(id, radius, warning_radius, danger_radius, position)


def remove_safety_zone(zone_id: str):
    """Remove a safety zone."""
    get_instance().remove_safety_zone(zone_id)


def set_camera(
    position: Optional[Vector3] = None,
    target: Optional[Vector3] = None,
    fov: Optional[float] = None,
):
    """Set camera position and target."""
    get_instance().set_camera(position, target, fov)


def clear():
    """Clear the entire scene."""
    get_instance().clear()


def on(event: str, callback: Callable):
    """Register an event callback."""
    get_instance().on(event, callback)


def show():
    """Block and keep the visualization running."""
    get_instance().show()


def close():
    """Close the visualization."""
    global _instance
    if _instance is not None:
        _instance.close()
        _instance = None


# =============================================================================
# Scene API (Module-level)
# =============================================================================

def set_scene(
    background: Optional[str] = None,
    shadows: Optional[bool] = None,
    ground_plane: Optional[bool] = None,
    ground_color: Optional[str] = None,
    environment: Optional[str] = None,
):
    """
    Configure scene visual settings.

    Args:
        background: Background color (hex string)
        shadows: Enable/disable shadows
        ground_plane: Enable/disable ground plane
        ground_color: Ground plane color (hex string)
        environment: Environment preset ('studio', 'sunset', 'dawn', 'night',
                    'warehouse', 'forest', 'apartment', 'city', 'park', 'lobby')
    """
    get_instance().set_scene(background, shadows, ground_plane, ground_color, environment)


# =============================================================================
# Coordinate Frame API (Module-level)
# =============================================================================

def add_frame(
    id: str,
    name: str,
    position: List[float],
    rotation: Optional[List[float]] = None,
    frame_type: str = "custom",
    parent_frame_id: Optional[str] = None,
    axis_length: float = 0.1,
    show_label: bool = True,
):
    """
    Add a coordinate frame to the scene.

    Args:
        id: Unique frame identifier
        name: Display name
        position: [x, y, z] position
        rotation: [w, x, y, z] quaternion (default: identity)
        frame_type: Frame type ('world', 'base', 'flange', 'tool', 'user',
                   'workpiece', 'sensor', 'camera', 'fixture', 'custom')
        parent_frame_id: ID of parent frame (for hierarchy)
        axis_length: Length of axis arrows
        show_label: Whether to show the frame label
    """
    get_instance().add_frame(id, name, position, rotation, frame_type, parent_frame_id, axis_length, show_label)


def remove_frame(frame_id: str):
    """Remove a coordinate frame."""
    get_instance().remove_frame(frame_id)


def update_frame(
    frame_id: str,
    position: Optional[List[float]] = None,
    rotation: Optional[List[float]] = None,
    name: Optional[str] = None,
):
    """Update a coordinate frame's position or rotation."""
    get_instance().update_frame(frame_id, position, rotation, name)


def clear_frames():
    """Remove all coordinate frames."""
    get_instance().clear_frames()


def enable_frames(enabled: bool = True):
    """Enable or disable coordinate frame display."""
    get_instance().enable_frames(enabled)


# =============================================================================
# Point Cloud API (Module-level)
# =============================================================================

def add_point_cloud(
    id: str,
    points: List[float],
    colors: Optional[List[int]] = None,
    position: Optional[List[float]] = None,
    point_size: float = 0.01,
    color_mode: str = "uniform",
    uniform_color: str = "#ffffff",
    opacity: float = 1.0,
):
    """
    Add a point cloud to the scene.

    Args:
        id: Unique point cloud identifier
        points: Flat list of point coordinates [x1,y1,z1, x2,y2,z2, ...]
        colors: Optional flat list of RGB colors (0-255) [r1,g1,b1, r2,g2,b2, ...]
        position: [x, y, z] position offset
        point_size: Size of each point
        color_mode: Color mode ('rgb', 'height', 'uniform', 'intensity', 'distance')
        uniform_color: Color when using 'uniform' mode (hex string)
        opacity: Point opacity (0-1)
    """
    get_instance().add_point_cloud(id, points, colors, position, point_size, color_mode, uniform_color, opacity)


def update_point_cloud(
    id: str,
    points: Optional[List[float]] = None,
    position: Optional[List[float]] = None,
):
    """Update point cloud data or position."""
    get_instance().update_point_cloud(id, points, position)


def remove_point_cloud(id: str):
    """Remove a point cloud."""
    get_instance().remove_point_cloud(id)


def clear_point_clouds():
    """Remove all point clouds."""
    get_instance().clear_point_clouds()


def enable_point_clouds(enabled: bool = True):
    """Enable or disable point cloud display."""
    get_instance().enable_point_clouds(enabled)


# =============================================================================
# Collision API (Module-level)
# =============================================================================

def add_collision_geometry(
    id: str,
    geometry_type: str,
    position: List[float],
    params: Optional[Dict[str, float]] = None,
    rotation: Optional[List[float]] = None,
):
    """
    Add a collision geometry for collision detection.

    Args:
        id: Unique geometry identifier
        geometry_type: Type of geometry ('box', 'sphere', 'cylinder', 'capsule')
        position: [x, y, z] position
        params: Geometry parameters (e.g., {'radius': 0.1} for sphere,
               {'width': 0.1, 'height': 0.2, 'depth': 0.1} for box)
        rotation: Optional [x, y, z] euler rotation in radians
    """
    get_instance().add_collision_geometry(id, geometry_type, position, params, rotation)


def remove_collision_geometry(id: str):
    """Remove a collision geometry."""
    get_instance().remove_collision_geometry(id)


def clear_collision_geometries():
    """Remove all collision geometries."""
    get_instance().clear_collision_geometries()


def enable_collision_detection(enabled: bool = True):
    """Enable or disable collision detection."""
    get_instance().enable_collision_detection(enabled)


# =============================================================================
# Kinematics & Motion Planning API (Module-level)
# =============================================================================

def create_solver(robot_id: str, robot_name: str) -> KinematicsSolver:
    """
    Create a kinematics solver for a robot.

    Args:
        robot_id: Robot identifier (must match a loaded robot).
        robot_name: Robot model name for DH parameter lookup
                    (e.g. "Fanuc_LR_Mate_200iD_7L").

    Returns:
        KinematicsSolver instance.

    Example:
        >>> import roboviz as rv
        >>> rv.init()
        >>> robot = rv.add_robot("robot.urdf", id="arm")
        >>> solver = rv.create_solver("arm", "MyRobot")
        >>> pose = solver.fk([0, 0, 0, 0, 0, 0])
    """
    return get_instance().create_solver(robot_id, robot_name)


def create_planner(robot_id: str) -> MotionPlanner:
    """
    Create a motion planner for a robot.

    Requires a kinematics solver to be already created for that robot.

    Args:
        robot_id: Robot identifier.

    Returns:
        MotionPlanner instance.

    Example:
        >>> solver = rv.create_solver("arm", "MyRobot")
        >>> planner = rv.create_planner("arm")
        >>> result = planner.linear([0]*6, target_pose)
    """
    return get_instance().create_planner(robot_id)


# =============================================================================
# Manager Factories (Module-level)
# =============================================================================

def create_scene_manager() -> SceneManager:
    """Create a scene manager for the global instance."""
    return get_instance().create_scene_manager()


def create_diagnostic() -> DiagnosticVisualizer:
    """Create a diagnostic visualizer for the global instance."""
    return get_instance().create_diagnostic()


def create_performance_monitor() -> PerformanceMonitor:
    """Create a performance monitor for the global instance."""
    return get_instance().create_performance_monitor()
