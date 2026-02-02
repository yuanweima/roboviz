"""
Motion Planning Demo — linear motion, path analysis, trajectory playback.

Usage:
    python motion_planning_demo.py

Requires a running RoboViz viewer (the SDK starts one automatically).
"""

import time
import roboviz as rv
from roboviz import (
    Pose, Vector3, Quaternion,
    LinearMotionConfig, TrajectoryData,
)

# ---------------------------------------------------------------------------
# 1. Setup
# ---------------------------------------------------------------------------
rv.init()
robot = rv.add_robot("path/to/fanuc_lr_mate_200id_7l.urdf", id="fanuc")

solver = robot.create_solver("Fanuc_LR_Mate_200iD_7L")
planner = robot.create_planner()
print(f"Solver:  {solver}")
print(f"Planner: {planner}")

# ---------------------------------------------------------------------------
# 2. Linear Motion — single target
# ---------------------------------------------------------------------------
start_joints = [0.0, -0.3, 0.6, 0.0, -0.3, 0.0]
robot.set_joints(start_joints)

target = Pose(
    position=Vector3(0.4, 0.15, 0.25),
    orientation=Quaternion(w=0.707, x=0.0, y=0.707, z=0.0),
)

# Quick feasibility check first
feasibility = planner.check_linear(start_joints, target)
print(f"\nFeasibility: {feasibility.feasible}")
if not feasibility.feasible:
    print(f"  Reason: {feasibility.reason}")

# Full planning
config = LinearMotionConfig(max_step=0.005, max_joint_step=0.02, timeout=10.0)
result = planner.linear(start_joints, target, config=config)
print(f"\nLinear motion: success={result.success}, waypoints={len(result.path)}")
if result.duration is not None:
    print(f"  Duration: {result.duration:.3f}s")

# ---------------------------------------------------------------------------
# 3. Play the planned path as a trajectory
# ---------------------------------------------------------------------------
if result.success and result.path:
    n = len(result.path)
    duration = result.duration or 3.0
    times = [i * duration / (n - 1) for i in range(n)]

    traj = TrajectoryData(times=times, positions=result.path, duration=duration)
    rv.play_trajectory("fanuc", traj, speed=0.5)
    print(f"\nPlaying trajectory ({n} waypoints, {duration:.1f}s)...")
    time.sleep(duration / 0.5 + 1.0)

# ---------------------------------------------------------------------------
# 4. Multi-waypoint linear path
# ---------------------------------------------------------------------------
waypoints = [
    Pose(Vector3(0.35, -0.1, 0.30), Quaternion(w=0.707, y=0.707)),
    Pose(Vector3(0.40,  0.0, 0.25), Quaternion(w=0.707, y=0.707)),
    Pose(Vector3(0.35,  0.1, 0.30), Quaternion(w=0.707, y=0.707)),
]

result2 = planner.linear_path(start_joints, waypoints)
print(f"\nLinear path: success={result2.success}, waypoints={len(result2.path)}")

# ---------------------------------------------------------------------------
# 5. Path Analysis
# ---------------------------------------------------------------------------
if result.success and result.path:
    analysis = planner.analyze_path(result.path)
    print(f"\nPath analysis:")
    print(f"  Total length:         {analysis.total_length:.4f} rad")
    print(f"  Singularity indices:  {analysis.singularity_indices}")
    print(f"  Joint limit warnings: {len(analysis.joint_limit_warnings)}")
    if analysis.manipulabilities:
        avg_m = sum(analysis.manipulabilities) / len(analysis.manipulabilities)
        min_m = min(analysis.manipulabilities)
        print(f"  Manipulability: avg={avg_m:.4f}, min={min_m:.4f}")

# ---------------------------------------------------------------------------
# 6. Path Validation
# ---------------------------------------------------------------------------
if result.success and result.path:
    validation = planner.validate_path(result.path, max_joint_velocity=2.0, time_step=0.01)
    print(f"\nPath validation: valid={validation.valid}")
    if validation.issues:
        for issue in validation.issues[:5]:
            print(f"  - {issue}")

# ---------------------------------------------------------------------------
# 7. Cartesian ↔ Joint conversion
# ---------------------------------------------------------------------------
if result.success and result.path:
    # Joint → Cartesian
    cart = planner.joint_to_cartesian(result.path[:5])
    print(f"\nJoint → Cartesian: {len(cart)} poses")
    for i, p in enumerate(cart):
        print(f"  [{i}] ({p.position.x:.3f}, {p.position.y:.3f}, {p.position.z:.3f})")

    # Cartesian → Joint
    joint_result = planner.cartesian_to_joint(cart, start_joints)
    print(f"\nCartesian → Joint: success={joint_result.success}, "
          f"points={len(joint_result.joint_path)}, "
          f"failures={len(joint_result.failed_indices)}")

# ---------------------------------------------------------------------------
# 8. Path Processing
# ---------------------------------------------------------------------------
if result.success and result.path:
    # Interpolate to higher resolution
    interp = planner.interpolate_path(result.path, resolution=200)
    print(f"\nInterpolated path: {len(interp)} waypoints (from {len(result.path)})")

    # Smooth the path
    smooth = planner.smooth_path(result.path, window_size=5)
    print(f"Smoothed path: {len(smooth)} waypoints")

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
solver.dispose()
rv.show()
