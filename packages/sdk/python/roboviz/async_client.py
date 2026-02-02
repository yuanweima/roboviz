"""
RoboViz Async Client

Asyncio-based client for high-frequency streaming and concurrent operations.

Example:
    >>> import asyncio
    >>> from roboviz.async_client import AsyncRoboViz
    >>>
    >>> async def main():
    ...     viz = AsyncRoboViz()
    ...     await viz.connect("ws://localhost:8766")
    ...     await viz.set_joints("arm", [0, -0.3, 0.6, 0, 0, 0])
    ...     await viz.close()
    >>>
    >>> asyncio.run(main())
"""

import json
import asyncio
from typing import Optional, List, Dict, Any, AsyncIterator, Callable

from .types import (
    Pose,
    Vector3,
    Quaternion,
    TrajectoryData,
    IKResult,
)


class AsyncRoboViz:
    """
    Asynchronous RoboViz client using websockets.

    Suitable for high-frequency streaming, concurrent operations, and
    integration with async frameworks (FastAPI, etc.).
    """

    def __init__(self):
        self._ws = None
        self._request_id = 0
        self._pending: Dict[int, asyncio.Future] = {}
        self._callbacks: Dict[str, List[Callable]] = {}
        self._reader_task: Optional[asyncio.Task] = None

    # =========================================================================
    # Connection
    # =========================================================================

    async def connect(self, url: str = "ws://localhost:8766") -> None:
        """
        Connect to a RoboViz WebSocket server.

        Args:
            url: WebSocket URL (default: ws://localhost:8766).
        """
        try:
            import websockets
        except ImportError:
            raise ImportError(
                "websockets is required for AsyncRoboViz. "
                "Install with: pip install websockets"
            )

        self._ws = await websockets.connect(url)
        self._reader_task = asyncio.create_task(self._reader_loop())

    async def close(self) -> None:
        """Close the connection."""
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
        if self._ws:
            await self._ws.close()
            self._ws = None

    async def _reader_loop(self) -> None:
        """Background task that reads messages from the WebSocket."""
        try:
            async for raw in self._ws:
                msg = json.loads(raw)
                # Response to a request
                if "id" in msg and ("result" in msg or "error" in msg):
                    req_id = msg["id"]
                    if req_id in self._pending:
                        future = self._pending.pop(req_id)
                        if "error" in msg:
                            future.set_exception(
                                RuntimeError(msg["error"].get("message", "Unknown"))
                            )
                        else:
                            future.set_result(msg.get("result"))
                # Event/notification
                elif "method" in msg:
                    method = msg["method"]
                    params = msg.get("params", {})
                    for cb in self._callbacks.get(method, []):
                        try:
                            result = cb(params)
                            if asyncio.iscoroutine(result):
                                await result
                        except Exception:
                            pass
        except asyncio.CancelledError:
            pass

    # =========================================================================
    # Low-level
    # =========================================================================

    async def _send_notification(self, method: str, params: Dict[str, Any]) -> None:
        """Send a notification (no response expected)."""
        await self._ws.send(json.dumps({
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        }))

    async def _send_request(
        self,
        method: str,
        params: Dict[str, Any],
        timeout: float = 10.0,
    ) -> Any:
        """Send a request and await the response."""
        self._request_id += 1
        req_id = self._request_id

        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[req_id] = future

        await self._ws.send(json.dumps({
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params,
        }))

        return await asyncio.wait_for(future, timeout=timeout)

    def on(self, event: str, callback: Callable) -> None:
        """Register an event callback (can be sync or async)."""
        if event not in self._callbacks:
            self._callbacks[event] = []
        self._callbacks[event].append(callback)

    # =========================================================================
    # Robot API
    # =========================================================================

    async def set_joints(self, robot_id: str, angles: List[float]) -> None:
        """Set robot joint angles."""
        await self._send_notification("robot.setJoints", {
            "id": robot_id,
            "angles": angles,
        })

    async def get_joints(self, robot_id: str) -> List[float]:
        """Get current joint angles."""
        result = await self._send_request("robot.getJoints", {"id": robot_id})
        return result.get("angles", [])

    # =========================================================================
    # Kinematics (async)
    # =========================================================================

    async def fk(self, robot_id: str, joint_angles: List[float]) -> Pose:
        """Compute forward kinematics."""
        result = await self._send_request("kinematics.fk", {
            "robotId": robot_id,
            "jointAngles": joint_angles,
        })
        pose = result.get("pose", result)
        pos = pose.get("position", {})
        ori = pose.get("orientation", {})
        return Pose(
            position=Vector3(pos.get("x", 0), pos.get("y", 0), pos.get("z", 0)),
            orientation=Quaternion(ori.get("w", 1), ori.get("x", 0), ori.get("y", 0), ori.get("z", 0)),
        )

    async def ik(
        self,
        robot_id: str,
        target_pose: Pose,
        seed: Optional[List[float]] = None,
    ) -> IKResult:
        """Compute inverse kinematics."""
        params: Dict[str, Any] = {
            "robotId": robot_id,
            "targetPose": target_pose.to_dict(),
        }
        if seed is not None:
            params["seed"] = seed
        result = await self._send_request("kinematics.ik", params)
        return IKResult.from_dict(result)

    # =========================================================================
    # Streaming
    # =========================================================================

    async def stream_joints(
        self,
        robot_id: str,
        joint_generator: AsyncIterator[List[float]],
        fps: int = 60,
    ) -> None:
        """
        Stream joint angles from an async generator.

        Args:
            robot_id: Robot identifier.
            joint_generator: Async iterator yielding joint angle lists.
            fps: Target frame rate.
        """
        interval = 1.0 / fps
        async for angles in joint_generator:
            await self.set_joints(robot_id, angles)
            await asyncio.sleep(interval)

    async def stream_point_cloud(
        self,
        stream_id: str,
        frame_generator: AsyncIterator[Dict[str, Any]],
        fps: int = 30,
    ) -> None:
        """
        Stream point cloud frames from an async generator.

        Args:
            stream_id: Point cloud stream ID.
            frame_generator: Async iterator yielding dicts with
                            'points' (flat list) and optional 'colors'.
            fps: Target frame rate.
        """
        interval = 1.0 / fps
        async for frame in frame_generator:
            points = frame["points"]
            params: Dict[str, Any] = {
                "streamId": stream_id,
                "points": points,
                "pointCount": len(points) // 3,
            }
            if "colors" in frame:
                params["colors"] = frame["colors"]
            await self._send_notification("vision.pushPointCloudFrame", params)
            await asyncio.sleep(interval)

    # =========================================================================
    # Trajectory
    # =========================================================================

    async def play_trajectory(
        self,
        robot_id: str,
        trajectory: TrajectoryData,
        speed: float = 1.0,
        loop: bool = False,
    ) -> None:
        """Play a trajectory on a robot."""
        await self._send_notification("trajectory.play", {
            "robotId": robot_id,
            "trajectory": trajectory.to_dict(),
            "speed": speed,
            "loop": loop,
        })

    def __repr__(self) -> str:
        state = "connected" if self._ws else "disconnected"
        return f"AsyncRoboViz({state})"
