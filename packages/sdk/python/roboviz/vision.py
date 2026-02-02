"""
RoboViz Vision Manager

Vision and sensor data management: point cloud streams, camera streams,
camera views, and 2D/3D annotations.

Example:
    >>> import roboviz as rv
    >>> rv.init()
    >>> vision = rv.VisionManager(rv.get_instance())
    >>> vision.start_point_cloud_stream("lidar-1")
    >>> vision.push_point_cloud_frame("lidar-1", points, colors)
"""

from typing import List, Dict, Any, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .core import RoboViz


class VisionManager:
    """
    Vision and sensor data management.

    Args:
        viz: Active RoboViz instance.
    """

    def __init__(self, viz: "RoboViz"):
        self._viz = viz

    # =========================================================================
    # Point Cloud Streaming
    # =========================================================================

    def start_point_cloud_stream(
        self,
        stream_id: str,
        point_size: float = 0.01,
        color_mode: str = "rgb",
        max_points: Optional[int] = None,
    ) -> None:
        """
        Start a point cloud stream.

        Args:
            stream_id: Unique stream identifier.
            point_size: Point rendering size.
            color_mode: Color mode ('rgb', 'height', 'uniform', 'intensity').
            max_points: Maximum point count per frame.
        """
        params: Dict[str, Any] = {
            "streamId": stream_id,
            "pointSize": point_size,
            "colorMode": color_mode,
        }
        if max_points is not None:
            params["maxPoints"] = max_points
        self._viz._send_notification("vision.startPointCloudStream", params)

    def push_point_cloud_frame(
        self,
        stream_id: str,
        points: List[float],
        colors: Optional[List[int]] = None,
        timestamp: Optional[float] = None,
    ) -> None:
        """
        Push a point cloud frame to the stream.

        Args:
            stream_id: Stream identifier.
            points: Flat [x1,y1,z1, x2,y2,z2, ...] coordinates.
            colors: Optional flat [r1,g1,b1, ...] colors (0-255).
            timestamp: Optional timestamp in seconds.
        """
        params: Dict[str, Any] = {
            "streamId": stream_id,
            "points": points,
            "pointCount": len(points) // 3,
        }
        if colors is not None:
            params["colors"] = colors
        if timestamp is not None:
            params["timestamp"] = timestamp
        self._viz._send_notification("vision.pushPointCloudFrame", params)

    def stop_point_cloud_stream(self, stream_id: str) -> None:
        """Stop a point cloud stream."""
        self._viz._send_notification("vision.stopPointCloudStream", {"streamId": stream_id})

    # =========================================================================
    # Camera Streaming
    # =========================================================================

    def start_camera_stream(
        self,
        stream_id: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        fps: int = 30,
    ) -> None:
        """
        Start a camera image stream.

        Args:
            stream_id: Unique stream identifier.
            width: Image width in pixels.
            height: Image height in pixels.
            fps: Target frame rate.
        """
        params: Dict[str, Any] = {"streamId": stream_id, "fps": fps}
        if width is not None:
            params["width"] = width
        if height is not None:
            params["height"] = height
        self._viz._send_notification("vision.startCameraStream", params)

    def push_camera_frame(
        self,
        stream_id: str,
        image_data: str,
        width: int,
        height: int,
        format: str = "jpeg",
    ) -> None:
        """
        Push a camera image frame to the stream.

        Args:
            stream_id: Stream identifier.
            image_data: Base64-encoded image data.
            width: Image width in pixels.
            height: Image height in pixels.
            format: Image format ('jpeg', 'png').
        """
        self._viz._send_notification("vision.pushCameraFrame", {
            "streamId": stream_id,
            "imageData": image_data,
            "width": width,
            "height": height,
            "format": format,
        })

    def stop_camera_stream(self, stream_id: str) -> None:
        """Stop a camera stream."""
        self._viz._send_notification("vision.stopCameraStream", {"streamId": stream_id})

    # =========================================================================
    # Camera Views
    # =========================================================================

    def add_camera_view(
        self,
        id: str,
        name: str,
        position: List[float],
        target: List[float],
        fov: float = 60,
        near: float = 0.01,
        far: float = 100,
    ) -> None:
        """
        Add a named camera view.

        Args:
            id: Unique view identifier.
            name: Display name.
            position: [x, y, z] camera position.
            target: [x, y, z] look-at target.
            fov: Field of view in degrees.
            near: Near clipping plane.
            far: Far clipping plane.
        """
        self._viz._send_notification("vision.addCameraView", {
            "id": id,
            "name": name,
            "position": {"x": position[0], "y": position[1], "z": position[2]},
            "target": {"x": target[0], "y": target[1], "z": target[2]},
            "fov": fov,
            "near": near,
            "far": far,
        })

    def remove_camera_view(self, id: str) -> None:
        """Remove a camera view."""
        self._viz._send_notification("vision.removeCameraView", {"id": id})

    def activate_camera_view(self, id: str) -> None:
        """Switch to a named camera view."""
        self._viz._send_notification("vision.activateCameraView", {"id": id})

    # =========================================================================
    # Depth Cloud
    # =========================================================================

    def start_depth_cloud(
        self,
        stream_id: str,
        intrinsics: Optional[Dict[str, float]] = None,
    ) -> None:
        """
        Start a depth cloud renderer.

        Args:
            stream_id: Unique stream identifier.
            intrinsics: Camera intrinsics {fx, fy, cx, cy}.
        """
        params: Dict[str, Any] = {"streamId": stream_id}
        if intrinsics is not None:
            params["intrinsics"] = intrinsics
        self._viz._send_notification("vision.startDepthCloud", params)

    def push_depth_frame(
        self,
        stream_id: str,
        depth_data: str,
        width: int,
        height: int,
    ) -> None:
        """
        Push a depth frame.

        Args:
            stream_id: Stream identifier.
            depth_data: Base64-encoded depth data (uint16 or float32).
            width: Image width.
            height: Image height.
        """
        self._viz._send_notification("vision.pushDepthFrame", {
            "streamId": stream_id,
            "depthData": depth_data,
            "width": width,
            "height": height,
        })

    def stop_depth_cloud(self, stream_id: str) -> None:
        """Stop a depth cloud stream."""
        self._viz._send_notification("vision.stopDepthCloud", {"streamId": stream_id})

    # =========================================================================
    # 2D / 3D Annotations
    # =========================================================================

    def add_marker_2d(
        self,
        id: str,
        x: float,
        y: float,
        label: str = "",
        color: str = "#ffffff",
        size: float = 10,
    ) -> None:
        """
        Add a 2D marker overlay.

        Args:
            id: Unique marker identifier.
            x: X position (normalized 0-1 or pixel).
            y: Y position (normalized 0-1 or pixel).
            label: Text label.
            color: Marker color (hex string).
            size: Marker size.
        """
        self._viz._send_notification("vision.addMarker2D", {
            "id": id, "x": x, "y": y, "label": label, "color": color, "size": size,
        })

    def add_roi_2d(
        self,
        id: str,
        x: float,
        y: float,
        width: float,
        height: float,
        label: Optional[str] = None,
        color: str = "#00ff00",
    ) -> None:
        """
        Add a 2D region-of-interest rectangle.

        Args:
            id: Unique ROI identifier.
            x: Top-left X.
            y: Top-left Y.
            width: Width.
            height: Height.
            label: Optional label.
            color: Border color.
        """
        params: Dict[str, Any] = {
            "id": id, "x": x, "y": y, "width": width, "height": height, "color": color,
        }
        if label:
            params["label"] = label
        self._viz._send_notification("vision.addRoi2D", params)

    def add_roi_3d(
        self,
        id: str,
        center: List[float],
        size: List[float],
        label: Optional[str] = None,
        color: str = "#00ff00",
        opacity: float = 0.3,
    ) -> None:
        """
        Add a 3D bounding box.

        Args:
            id: Unique ROI identifier.
            center: [x, y, z] center position.
            size: [w, h, d] box dimensions.
            label: Optional label.
            color: Box color.
            opacity: Box opacity.
        """
        params: Dict[str, Any] = {
            "id": id,
            "center": {"x": center[0], "y": center[1], "z": center[2]},
            "size": {"x": size[0], "y": size[1], "z": size[2]},
            "color": color,
            "opacity": opacity,
        }
        if label:
            params["label"] = label
        self._viz._send_notification("vision.addRoi3D", params)

    def remove_annotation(self, id: str) -> None:
        """Remove a 2D/3D annotation by ID."""
        self._viz._send_notification("vision.removeAnnotation", {"id": id})

    def clear_annotations(self) -> None:
        """Remove all annotations."""
        self._viz._send_notification("vision.clearAnnotations", {})

    def __repr__(self) -> str:
        return "VisionManager()"
