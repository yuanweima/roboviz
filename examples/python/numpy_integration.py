"""
NumPy Integration Demo — converting between RoboViz types and numpy arrays.

Usage:
    pip install roboviz[numpy]
    python numpy_integration.py

Demonstrates:
  - Joint angle conversion (list ↔ ndarray)
  - Pose ↔ 4x4 homogeneous transform matrix
  - Trajectory ↔ numpy arrays
  - Point cloud ↔ numpy arrays
"""

import numpy as np
import roboviz as rv
from roboviz import Pose, Vector3, Quaternion, TrajectoryData
from roboviz.numpy_support import (
    joints_to_array,
    array_to_joints,
    pose_to_matrix,
    matrix_to_pose,
    trajectory_to_arrays,
    arrays_to_trajectory,
    point_cloud_from_array,
    point_cloud_to_array,
)

# =====================================================================
# 1. Joint Angles — list ↔ ndarray
# =====================================================================
print("=" * 60)
print("Joint Angles")
print("=" * 60)

joints_list = [0.0, -0.3, 0.6, 0.0, -0.3, 0.0]
joints_arr = joints_to_array(joints_list)
print(f"List → ndarray: {joints_arr}  (dtype={joints_arr.dtype})")

joints_back = array_to_joints(joints_arr)
print(f"ndarray → List: {joints_back}")

# numpy arrays can be passed directly to kinematics APIs:
#   solver.fk(joints_arr)       — works!
#   solver.ik(pose, seed=arr)   — works!

# =====================================================================
# 2. Pose ↔ 4×4 Homogeneous Transform
# =====================================================================
print(f"\n{'=' * 60}")
print("Pose ↔ 4x4 Matrix")
print("=" * 60)

pose = Pose(
    position=Vector3(0.4, 0.1, 0.3),
    orientation=Quaternion(w=0.707, x=0.0, y=0.707, z=0.0),
)
print(f"Original pose:")
print(f"  pos = ({pose.position.x}, {pose.position.y}, {pose.position.z})")
print(f"  ori = (w={pose.orientation.w}, x={pose.orientation.x}, "
      f"y={pose.orientation.y}, z={pose.orientation.z})")

# Pose → 4x4 matrix
matrix = pose_to_matrix(pose)
print(f"\n4x4 matrix:\n{matrix}")

# 4x4 matrix → Pose (round-trip)
pose_rt = matrix_to_pose(matrix)
print(f"\nRound-trip pose:")
print(f"  pos = ({pose_rt.position.x:.4f}, {pose_rt.position.y:.4f}, {pose_rt.position.z:.4f})")
print(f"  ori = (w={pose_rt.orientation.w:.4f}, x={pose_rt.orientation.x:.4f}, "
      f"y={pose_rt.orientation.y:.4f}, z={pose_rt.orientation.z:.4f})")

# Compose transforms via matrix multiplication
T1 = pose_to_matrix(Pose(Vector3(1, 0, 0), Quaternion(1, 0, 0, 0)))
T2 = pose_to_matrix(Pose(Vector3(0, 1, 0), Quaternion(1, 0, 0, 0)))
T_composed = T1 @ T2
composed_pose = matrix_to_pose(T_composed)
print(f"\nComposed transform: pos=({composed_pose.position.x}, "
      f"{composed_pose.position.y}, {composed_pose.position.z})")

# =====================================================================
# 3. Trajectory ↔ NumPy Arrays
# =====================================================================
print(f"\n{'=' * 60}")
print("Trajectory ↔ NumPy")
print("=" * 60)

# Create trajectory from numpy
times = np.linspace(0, 5, 100)
dof = 6
positions = np.zeros((100, dof))
for j in range(dof):
    positions[:, j] = 0.5 * np.sin(2 * np.pi * times / 5 + j * np.pi / 6)

traj = arrays_to_trajectory(times, positions, duration=5.0)
print(f"Created trajectory: {len(traj.times)} points, "
      f"{len(traj.positions[0])} DOF, duration={traj.duration}s")

# Convert back to numpy
times_out, pos_out = trajectory_to_arrays(traj)
print(f"Converted back: times shape={times_out.shape}, "
      f"positions shape={pos_out.shape}")
print(f"Max round-trip error: {np.max(np.abs(pos_out - positions)):.1e}")

# =====================================================================
# 4. Point Cloud ↔ NumPy Arrays
# =====================================================================
print(f"\n{'=' * 60}")
print("Point Cloud ↔ NumPy")
print("=" * 60)

# Generate random point cloud
n_points = 1000
points_3d = np.random.randn(n_points, 3).astype(np.float64) * 0.2
points_3d[:, 2] += 0.5  # offset Z up
colors_rgb = np.random.randint(0, 256, (n_points, 3), dtype=np.uint8)

# Convert to flat lists for RoboViz API
flat_pts, flat_cols = point_cloud_from_array(points_3d, colors_rgb)
print(f"Point cloud: {n_points} points")
print(f"  Flat points: {len(flat_pts)} floats")
print(f"  Flat colors:  {len(flat_cols)} ints")

# Convert flat lists back to numpy
pts_back, cols_back = point_cloud_to_array(flat_pts, flat_cols)
print(f"  Round-trip: points shape={pts_back.shape}, colors shape={cols_back.shape}")
print(f"  Max error: {np.max(np.abs(pts_back - points_3d)):.1e}")

# =====================================================================
# 5. Live Demo (optional — connect to viewer)
# =====================================================================
print(f"\n{'=' * 60}")
print("Live Demo (connect to viewer)")
print("=" * 60)

try:
    rv.init(open_browser=True)

    # Add robot
    robot = rv.add_robot("path/to/robot.urdf", id="arm")

    # Play the sine trajectory
    rv.play_trajectory("arm", traj, speed=1.0)
    print("Playing sine trajectory...")

    # Visualize the random point cloud
    rv.add_point_cloud(
        "cloud-1",
        points=flat_pts,
        colors=flat_cols,
        point_size=0.005,
        color_mode="rgb",
    )
    print("Added point cloud with 1000 points")

    rv.show()
except KeyboardInterrupt:
    rv.close()
    print("\nDone.")
