"""
RoboViz Client

Python client for controlling RoboViz remotely via WebSocket.

Example:
    >>> from roboviz import RoboVizClient
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
    >>> viz.play_trajectory(robot.id, trajectory_data)
"""

import json
import threading
import time
from typing import List, Optional, Callable, Dict, Any
from dataclasses import dataclass

try:
    import websocket
    HAS_WEBSOCKET = True
except ImportError:
    HAS_WEBSOCKET = False

from .types import (
    Vector3,
    RobotOptions,
    RobotInfo,
    TrajectoryData,
    WaypointData,
    ObstacleData,
    SafetyZoneData,
    Pose,
)


@dataclass
class RoboVizClientOptions:
    """Client connection options"""
    url: str = "ws://localhost:8080"
    auto_connect: bool = True
    reconnect: bool = True
    reconnect_interval: float = 1.0
    timeout: float = 5.0


class RoboVizClient:
    """
    RoboViz Python Client

    Connects to a RoboViz WebSocket server and provides methods
    for controlling the visualization remotely.

    Example:
        >>> viz = RoboVizClient("ws://localhost:8080")
        >>> viz.connect()
        >>>
        >>> # Add robot
        >>> robot = viz.add_robot("/models/fanuc.urdf")
        >>>
        >>> # Control joints
        >>> viz.set_joints(robot.id, [0, -0.3, 0.6, 0, 0, 0])
        >>>
        >>> # Add safety zone
        >>> viz.add_safety_zone("zone1", radius=0.8)
    """

    def __init__(
        self,
        url: str = "ws://localhost:8080",
        auto_connect: bool = False,
        **kwargs
    ):
        """
        Initialize the RoboViz client.

        Args:
            url: WebSocket server URL
            auto_connect: Connect automatically on creation
            **kwargs: Additional options
        """
        if not HAS_WEBSOCKET:
            raise ImportError(
                "websocket-client is required. Install with: pip install websocket-client"
            )

        self.url = url
        self._ws: Optional[websocket.WebSocketApp] = None
        self._connected = False
        self._request_id = 0
        self._pending_requests: Dict[int, threading.Event] = {}
        self._responses: Dict[int, Any] = {}
        self._callbacks: Dict[str, List[Callable]] = {}
        self._ws_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        if auto_connect:
            self.connect()

    def connect(self, timeout: float = 5.0) -> bool:
        """
        Connect to the RoboViz server.

        Args:
            timeout: Connection timeout in seconds

        Returns:
            True if connected successfully
        """
        if self._connected:
            return True

        connected_event = threading.Event()

        def on_open(ws):
            self._connected = True
            connected_event.set()
            self._emit("connected")

        def on_message(ws, message):
            self._handle_message(message)

        def on_error(ws, error):
            self._emit("error", error)

        def on_close(ws, close_code, close_msg):
            self._connected = False
            self._emit("disconnected")

        self._ws = websocket.WebSocketApp(
            self.url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
        )

        # Run WebSocket in background thread
        self._ws_thread = threading.Thread(target=self._ws.run_forever, daemon=True)
        self._ws_thread.start()

        # Wait for connection
        if connected_event.wait(timeout):
            return True
        else:
            self.disconnect()
            raise ConnectionError(f"Failed to connect to {self.url}")

    def disconnect(self):
        """Disconnect from the server."""
        if self._ws:
            self._ws.close()
            self._ws = None
        self._connected = False

    def is_connected(self) -> bool:
        """Check if connected to server."""
        return self._connected

    # =========================================================================
    # Robot Control
    # =========================================================================

    def add_robot(
        self,
        urdf_path: str,
        id: Optional[str] = None,
        position: Optional[Vector3] = None,
        color: Optional[str] = None,
        **kwargs
    ) -> RobotInfo:
        """
        Add a robot to the visualization.

        Args:
            urdf_path: Path to URDF file
            id: Robot identifier (auto-generated if not provided)
            position: Initial position
            color: Robot color (hex string)

        Returns:
            RobotInfo with robot details

        Example:
            >>> robot = viz.add_robot("/models/fanuc.urdf", color="#4ecdc4")
            >>> print(f"Robot has {robot.joint_count} joints")
        """
        options = RobotOptions(
            urdf_path=urdf_path,
            id=id,
            position=position,
            color=color,
            **kwargs
        )

        result = self._call("robot.add", options.to_dict())
        return RobotInfo.from_dict(result)

    def remove_robot(self, robot_id: str):
        """Remove a robot from the visualization."""
        self._call("robot.remove", {"id": robot_id})

    def set_joints(self, robot_id: str, angles: List[float]):
        """
        Set robot joint angles.

        Args:
            robot_id: Robot identifier
            angles: Joint angles in radians

        Example:
            >>> viz.set_joints("robot1", [0, -0.3, 0.6, 0, -0.3, 0])
        """
        self._notify("robot.setJoints", {
            "id": robot_id,
            "angles": angles,
        })

    def get_joints(self, robot_id: str) -> List[float]:
        """Get current joint angles."""
        result = self._call("robot.getJoints", {"id": robot_id})
        return result.get("angles", [])

    def get_tcp_pose(self, robot_id: str) -> Pose:
        """Get current TCP (tool center point) pose."""
        result = self._call("robot.getTcpPose", {"id": robot_id})
        return Pose(
            position=Vector3(**result["position"]),
            orientation=result["orientation"],
        )

    # =========================================================================
    # Trajectory Control
    # =========================================================================

    def play_trajectory(
        self,
        robot_id: str,
        trajectory: TrajectoryData,
        speed: float = 1.0,
        loop: bool = False,
    ):
        """
        Play a trajectory on a robot.

        Args:
            robot_id: Robot identifier
            trajectory: Trajectory data
            speed: Playback speed multiplier
            loop: Whether to loop playback

        Example:
            >>> trajectory = TrajectoryData(
            ...     times=[0, 1, 2, 3],
            ...     positions=[[0,0,0,0,0,0], [0.1,0,0,0,0,0], ...]
            ... )
            >>> viz.play_trajectory("robot1", trajectory, speed=2.0)
        """
        self._notify("trajectory.play", {
            "robotId": robot_id,
            "trajectory": trajectory.to_dict(),
            "speed": speed,
            "loop": loop,
        })

    def pause_trajectory(self, robot_id: str):
        """Pause trajectory playback."""
        self._notify("trajectory.pause", {"robotId": robot_id})

    def stop_trajectory(self, robot_id: str):
        """Stop trajectory playback."""
        self._notify("trajectory.stop", {"robotId": robot_id})

    def seek_trajectory(self, robot_id: str, time: float):
        """Seek to a specific time in the trajectory."""
        self._notify("trajectory.seek", {
            "robotId": robot_id,
            "time": time,
        })

    # =========================================================================
    # Obstacles
    # =========================================================================

    def add_obstacle(self, obstacle: ObstacleData):
        """
        Add an obstacle to the scene.

        Example:
            >>> from roboviz import ObstacleData, ObstacleShape, Vector3
            >>> obstacle = ObstacleData(
            ...     id="box1",
            ...     shape=ObstacleShape.BOX,
            ...     dimensions=Vector3(0.2, 0.2, 0.2),
            ...     position=Vector3(0.5, 0.1, 0.3),
            ... )
            >>> viz.add_obstacle(obstacle)
        """
        self._notify("obstacle.add", obstacle.to_dict())

    def remove_obstacle(self, obstacle_id: str):
        """Remove an obstacle."""
        self._notify("obstacle.remove", {"id": obstacle_id})

    def clear_obstacles(self):
        """Remove all obstacles."""
        self._notify("obstacle.clear", {})

    # =========================================================================
    # Safety Zones
    # =========================================================================

    def add_safety_zone(
        self,
        id: str,
        radius: float,
        warning_radius: Optional[float] = None,
        danger_radius: Optional[float] = None,
        position: Optional[Vector3] = None,
    ):
        """
        Add a safety zone visualization.

        Args:
            id: Zone identifier
            radius: Safe zone radius
            warning_radius: Warning zone radius (default: radius * 1.5)
            danger_radius: Danger zone radius (default: warning * 1.2)
            position: Zone center position

        Example:
            >>> viz.add_safety_zone("zone1", radius=0.8)
        """
        zone = SafetyZoneData(
            id=id,
            radius=radius,
            warning_radius=warning_radius,
            danger_radius=danger_radius,
            position=position or Vector3(),
        )
        self._notify("safetyZone.add", zone.to_dict())

    def remove_safety_zone(self, zone_id: str):
        """Remove a safety zone."""
        self._notify("safetyZone.remove", {"id": zone_id})

    # =========================================================================
    # Waypoints
    # =========================================================================

    def add_waypoint(self, waypoint: WaypointData):
        """Add a waypoint marker."""
        self._notify("waypoint.add", waypoint.to_dict())

    def remove_waypoint(self, waypoint_id: str):
        """Remove a waypoint."""
        self._notify("waypoint.remove", {"id": waypoint_id})

    def clear_waypoints(self):
        """Remove all waypoints."""
        self._notify("waypoint.clear", {})

    # =========================================================================
    # Camera Control
    # =========================================================================

    def set_camera(
        self,
        position: Optional[Vector3] = None,
        target: Optional[Vector3] = None,
        fov: Optional[float] = None,
    ):
        """
        Set camera position and target.

        Example:
            >>> viz.set_camera(
            ...     position=Vector3(3, 2, 3),
            ...     target=Vector3(0, 0.5, 0)
            ... )
        """
        params: Dict[str, Any] = {}
        if position:
            params["position"] = position.to_dict()
        if target:
            params["target"] = target.to_dict()
        if fov:
            params["fov"] = fov
        self._notify("camera.set", params)

    def reset_camera(self):
        """Reset camera to default position."""
        self._notify("camera.reset", {})

    # =========================================================================
    # Events
    # =========================================================================

    def on(self, event: str, callback: Callable):
        """
        Register an event callback.

        Events:
            - connected: Connected to server
            - disconnected: Disconnected from server
            - error: Error occurred
            - tcp_moved: TCP position changed
            - collision: Collision detected

        Example:
            >>> viz.on("tcp_moved", lambda pose: print(f"TCP at {pose}"))
        """
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
    # Internal Methods
    # =========================================================================

    def _emit(self, event: str, *args):
        """Emit an event to registered callbacks."""
        if event in self._callbacks:
            for callback in self._callbacks[event]:
                try:
                    callback(*args)
                except Exception as e:
                    print(f"Error in callback: {e}")

    def _call(self, method: str, params: Dict[str, Any]) -> Any:
        """Make a JSON-RPC call and wait for response."""
        with self._lock:
            self._request_id += 1
            request_id = self._request_id

        request = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params,
        }

        event = threading.Event()
        self._pending_requests[request_id] = event

        self._ws.send(json.dumps(request))

        if event.wait(timeout=5.0):
            response = self._responses.pop(request_id, None)
            del self._pending_requests[request_id]

            if response and "error" in response:
                raise RuntimeError(response["error"].get("message", "Unknown error"))

            return response.get("result") if response else None
        else:
            del self._pending_requests[request_id]
            raise TimeoutError(f"Request {method} timed out")

    def _notify(self, method: str, params: Dict[str, Any]):
        """Send a JSON-RPC notification (no response expected)."""
        notification = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        }
        self._ws.send(json.dumps(notification))

    def _handle_message(self, message: str):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)

            # Handle response
            if "id" in data:
                request_id = data["id"]
                if request_id in self._pending_requests:
                    self._responses[request_id] = data
                    self._pending_requests[request_id].set()

            # Handle notification/event
            elif "method" in data:
                method = data["method"]
                params = data.get("params", {})

                # Map method to event
                event_map = {
                    "robot.tcpMoved": "tcp_moved",
                    "collision.detected": "collision",
                    "safetyZone.entered": "zone_entered",
                    "safetyZone.exited": "zone_exited",
                }

                event = event_map.get(method, method)
                self._emit(event, params)

        except json.JSONDecodeError:
            pass

    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()
