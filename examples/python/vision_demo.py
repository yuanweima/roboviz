"""
Vision Demo — point cloud streaming, camera views, 2D/3D annotations.

Usage:
    python vision_demo.py

Demonstrates the VisionManager API for sensor data visualization.
"""

import time
import math
import roboviz as rv
from roboviz import VisionManager

# ---------------------------------------------------------------------------
# 1. Setup
# ---------------------------------------------------------------------------
rv.init()
robot = rv.add_robot("path/to/robot.urdf", id="arm")
vision = VisionManager(rv.get_instance())

# ---------------------------------------------------------------------------
# 2. Camera Views
# ---------------------------------------------------------------------------
vision.add_camera_view(
    "top-down",
    "Top View",
    position=[0, 0, 2],
    target=[0, 0, 0],
    fov=50,
)
vision.add_camera_view(
    "side",
    "Side View",
    position=[2, 0, 1],
    target=[0, 0, 0.5],
    fov=60,
)
print("Added camera views: 'top-down', 'side'")

# Switch to top-down view
vision.activate_camera_view("top-down")
time.sleep(1.0)
vision.activate_camera_view("side")

# ---------------------------------------------------------------------------
# 3. Point Cloud Streaming
# ---------------------------------------------------------------------------
vision.start_point_cloud_stream(
    "lidar-1",
    point_size=0.005,
    color_mode="height",
    max_points=10000,
)
print("Started point cloud stream 'lidar-1'")

# Simulate point cloud frames
for frame_idx in range(10):
    n_points = 1000
    points = []
    for i in range(n_points):
        angle = (i / n_points) * 2 * math.pi + frame_idx * 0.2
        r = 0.3 + 0.1 * math.sin(angle * 3)
        x = r * math.cos(angle)
        y = r * math.sin(angle)
        z = 0.3 + 0.1 * math.sin(angle * 2 + frame_idx * 0.3)
        points.extend([x, y, z])

    vision.push_point_cloud_frame(
        "lidar-1",
        points=points,
        timestamp=frame_idx * 0.1,
    )
    time.sleep(0.1)

print("Streamed 10 point cloud frames")

# ---------------------------------------------------------------------------
# 4. 2D Annotations
# ---------------------------------------------------------------------------
vision.add_marker_2d("marker-1", 0.5, 0.5, label="Center", color="#ff0000", size=15)
vision.add_roi_2d("roi-1", 0.2, 0.2, 0.3, 0.3, label="Detection", color="#00ff00")
print("Added 2D annotations")

# ---------------------------------------------------------------------------
# 5. 3D Annotations
# ---------------------------------------------------------------------------
vision.add_roi_3d(
    "box-1",
    center=[0.4, 0, 0.3],
    size=[0.1, 0.1, 0.1],
    label="Object",
    color="#ffaa00",
    opacity=0.4,
)
print("Added 3D bounding box annotation")

# ---------------------------------------------------------------------------
# 6. Cleanup demo
# ---------------------------------------------------------------------------
time.sleep(2.0)

vision.stop_point_cloud_stream("lidar-1")
vision.clear_annotations()
vision.remove_camera_view("top-down")
vision.remove_camera_view("side")
print("Cleaned up vision resources")

rv.show()
