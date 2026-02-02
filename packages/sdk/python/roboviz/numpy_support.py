"""
RoboViz NumPy Support

Conversion utilities between RoboViz types and NumPy arrays.
All functions gracefully handle the case where numpy is not installed.

Example:
    >>> import numpy as np
    >>> from roboviz.numpy_support import pose_to_matrix, matrix_to_pose, arrays_to_trajectory
    >>>
    >>> # Pose <-> 4x4 homogeneous transform
    >>> matrix = pose_to_matrix(pose)  # (4, 4) ndarray
    >>> pose = matrix_to_pose(matrix)
    >>>
    >>> # Trajectory <-> numpy arrays
    >>> times = np.linspace(0, 5, 100)
    >>> positions = np.random.randn(100, 6) * 0.5
    >>> traj = arrays_to_trajectory(times, positions)
"""

import math
from typing import List, Optional, Tuple, Any

from .types import (
    Pose,
    Vector3,
    Quaternion,
    TrajectoryData,
)

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def _require_numpy():
    if not HAS_NUMPY:
        raise ImportError(
            "numpy is required for this function. "
            "Install with: pip install roboviz[numpy]"
        )


# =============================================================================
# Joint Angles
# =============================================================================

def joints_to_array(joints: List[float]) -> "np.ndarray":
    """
    Convert a joint angle list to a numpy array.

    Args:
        joints: Joint angles as a list.

    Returns:
        1D numpy array of joint angles.
    """
    _require_numpy()
    return np.array(joints, dtype=np.float64)


def array_to_joints(arr: "np.ndarray") -> List[float]:
    """
    Convert a numpy array to a joint angle list.

    Args:
        arr: 1D numpy array of joint angles.

    Returns:
        List of joint angles.
    """
    return arr.tolist()


# =============================================================================
# Pose <-> 4x4 Homogeneous Transform
# =============================================================================

def pose_to_matrix(pose: Pose) -> "np.ndarray":
    """
    Convert a Pose (position + quaternion) to a 4x4 homogeneous transform matrix.

    Args:
        pose: Pose with position and orientation (quaternion).

    Returns:
        4x4 numpy array (homogeneous transform).
    """
    _require_numpy()

    p = pose.position
    q = pose.orientation

    # Quaternion to rotation matrix (w, x, y, z)
    w, x, y, z = q.w, q.x, q.y, q.z

    # Normalize quaternion
    n = math.sqrt(w * w + x * x + y * y + z * z)
    if n > 0:
        w, x, y, z = w / n, x / n, y / n, z / n

    matrix = np.eye(4, dtype=np.float64)

    # Rotation part
    matrix[0, 0] = 1 - 2 * (y * y + z * z)
    matrix[0, 1] = 2 * (x * y - w * z)
    matrix[0, 2] = 2 * (x * z + w * y)

    matrix[1, 0] = 2 * (x * y + w * z)
    matrix[1, 1] = 1 - 2 * (x * x + z * z)
    matrix[1, 2] = 2 * (y * z - w * x)

    matrix[2, 0] = 2 * (x * z - w * y)
    matrix[2, 1] = 2 * (y * z + w * x)
    matrix[2, 2] = 1 - 2 * (x * x + y * y)

    # Translation part
    matrix[0, 3] = p.x
    matrix[1, 3] = p.y
    matrix[2, 3] = p.z

    return matrix


def matrix_to_pose(matrix: "np.ndarray") -> Pose:
    """
    Convert a 4x4 homogeneous transform matrix to a Pose.

    Args:
        matrix: 4x4 numpy array (homogeneous transform).

    Returns:
        Pose with position and orientation (quaternion).
    """
    _require_numpy()

    # Extract translation
    px, py, pz = float(matrix[0, 3]), float(matrix[1, 3]), float(matrix[2, 3])

    # Extract rotation matrix and convert to quaternion
    R = matrix[:3, :3]
    trace = R[0, 0] + R[1, 1] + R[2, 2]

    if trace > 0:
        s = 0.5 / math.sqrt(trace + 1.0)
        w = 0.25 / s
        x = (R[2, 1] - R[1, 2]) * s
        y = (R[0, 2] - R[2, 0]) * s
        z = (R[1, 0] - R[0, 1]) * s
    elif R[0, 0] > R[1, 1] and R[0, 0] > R[2, 2]:
        s = 2.0 * math.sqrt(1.0 + R[0, 0] - R[1, 1] - R[2, 2])
        w = (R[2, 1] - R[1, 2]) / s
        x = 0.25 * s
        y = (R[0, 1] + R[1, 0]) / s
        z = (R[0, 2] + R[2, 0]) / s
    elif R[1, 1] > R[2, 2]:
        s = 2.0 * math.sqrt(1.0 + R[1, 1] - R[0, 0] - R[2, 2])
        w = (R[0, 2] - R[2, 0]) / s
        x = (R[0, 1] + R[1, 0]) / s
        y = 0.25 * s
        z = (R[1, 2] + R[2, 1]) / s
    else:
        s = 2.0 * math.sqrt(1.0 + R[2, 2] - R[0, 0] - R[1, 1])
        w = (R[1, 0] - R[0, 1]) / s
        x = (R[0, 2] + R[2, 0]) / s
        y = (R[1, 2] + R[2, 1]) / s
        z = 0.25 * s

    return Pose(
        position=Vector3(px, py, pz),
        orientation=Quaternion(float(w), float(x), float(y), float(z)),
    )


# =============================================================================
# Trajectory <-> NumPy Arrays
# =============================================================================

def trajectory_to_arrays(traj: TrajectoryData) -> Tuple["np.ndarray", "np.ndarray"]:
    """
    Convert TrajectoryData to numpy arrays.

    Args:
        traj: Trajectory with times and positions.

    Returns:
        Tuple of (times_array, positions_array).
        times_array: shape (N,)
        positions_array: shape (N, dof)
    """
    _require_numpy()
    times = np.array(traj.times, dtype=np.float64)
    positions = np.array(traj.positions, dtype=np.float64)
    return times, positions


def arrays_to_trajectory(
    times: "np.ndarray",
    positions: "np.ndarray",
    duration: Optional[float] = None,
) -> TrajectoryData:
    """
    Convert numpy arrays to TrajectoryData.

    Args:
        times: 1D array of timestamps, shape (N,).
        positions: 2D array of joint positions, shape (N, dof).
        duration: Optional explicit duration.

    Returns:
        TrajectoryData ready for playback.
    """
    return TrajectoryData(
        times=times.tolist(),
        positions=positions.tolist(),
        duration=duration,
    )


# =============================================================================
# Point Cloud
# =============================================================================

def point_cloud_from_array(
    points: "np.ndarray",
    colors: Optional["np.ndarray"] = None,
) -> Tuple[List[float], Optional[List[int]]]:
    """
    Convert numpy point cloud arrays to flat lists for RoboViz.

    Args:
        points: (N, 3) array of XYZ coordinates.
        colors: Optional (N, 3) array of RGB values (0-255).

    Returns:
        Tuple of (flat_points, flat_colors).
        flat_points: [x1, y1, z1, x2, y2, z2, ...]
        flat_colors: [r1, g1, b1, r2, g2, b2, ...] or None
    """
    _require_numpy()
    flat_points = points.flatten().tolist()
    flat_colors = colors.flatten().astype(int).tolist() if colors is not None else None
    return flat_points, flat_colors


def point_cloud_to_array(
    points: List[float],
    colors: Optional[List[int]] = None,
) -> Tuple["np.ndarray", Optional["np.ndarray"]]:
    """
    Convert flat point cloud lists to numpy arrays.

    Args:
        points: Flat list [x1, y1, z1, x2, y2, z2, ...].
        colors: Optional flat list [r1, g1, b1, ...].

    Returns:
        Tuple of (points_array, colors_array).
        points_array: shape (N, 3)
        colors_array: shape (N, 3) or None
    """
    _require_numpy()
    pts = np.array(points, dtype=np.float64).reshape(-1, 3)
    cols = np.array(colors, dtype=np.uint8).reshape(-1, 3) if colors else None
    return pts, cols
