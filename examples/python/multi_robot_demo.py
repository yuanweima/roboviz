"""
Multi-Robot Demo — synchronized trajectories, shared workspace analysis.

Usage:
    python multi_robot_demo.py

Demonstrates RobotGroup API for multi-robot coordination.
"""

import math
import time
import roboviz as rv
from roboviz import RobotGroup, TrajectoryData, Vector3

# ---------------------------------------------------------------------------
# 1. Setup — add two robots
# ---------------------------------------------------------------------------
rv.init()

robot_a = rv.add_robot(
    "path/to/robot.urdf",
    id="arm-left",
    position=Vector3(-0.5, 0, 0),
)
robot_b = rv.add_robot(
    "path/to/robot.urdf",
    id="arm-right",
    position=Vector3(0.5, 0, 0),
)

print("Added two robots: arm-left, arm-right")

# ---------------------------------------------------------------------------
# 2. Create a coordination group
# ---------------------------------------------------------------------------
group = RobotGroup(rv.get_instance(), "cell-1", ["arm-left", "arm-right"])
print(f"Group: {group}")

# Set synchronized coordination mode
group.set_coordination_type("synchronized")

# ---------------------------------------------------------------------------
# 3. Set all joints simultaneously
# ---------------------------------------------------------------------------
group.set_all_joints({
    "arm-left": [0.0, -0.3, 0.6, 0.0, 0.0, 0.0],
    "arm-right": [0.0, 0.3, -0.6, 0.0, 0.0, 0.0],
})

joints = group.get_all_joints()
print(f"Current joints: {list(joints.keys())}")

# ---------------------------------------------------------------------------
# 4. Generate synchronized trajectories
# ---------------------------------------------------------------------------
n_points = 100
duration = 5.0
times = [i * duration / (n_points - 1) for i in range(n_points)]

# Left arm moves in a circle
positions_left = []
for i in range(n_points):
    t = i / (n_points - 1) * 2 * math.pi
    positions_left.append([
        0.3 * math.sin(t),
        -0.3 + 0.1 * math.cos(t),
        0.6 + 0.1 * math.sin(t * 2),
        0.0,
        0.0,
        0.0,
    ])

# Right arm mirrors left
positions_right = []
for p in positions_left:
    positions_right.append([
        -p[0],  # mirror J1
        -p[1],
        -p[2] + 1.2,
        p[3],
        p[4],
        p[5],
    ])

traj_left = TrajectoryData(times=times, positions=positions_left, duration=duration)
traj_right = TrajectoryData(times=times, positions=positions_right, duration=duration)

# ---------------------------------------------------------------------------
# 5. Play synchronized trajectories
# ---------------------------------------------------------------------------
group.play_sync_trajectory(
    {"arm-left": traj_left, "arm-right": traj_right},
    speed=0.5,
)
print(f"Playing synchronized trajectories ({duration}s at 0.5x speed)...")
time.sleep(duration / 0.5 + 1)

# ---------------------------------------------------------------------------
# 6. Workspace analysis
# ---------------------------------------------------------------------------
shared = group.calculate_shared_workspace(resolution=15)
print(f"\nShared workspace analysis:")
print(f"  Overlap volume:  {shared.get('overlapVolume', 'N/A')}")
print(f"  Overlap points:  {len(shared.get('overlapPoints', []))}")

# ---------------------------------------------------------------------------
# 7. Inter-robot collision check
# ---------------------------------------------------------------------------
collision = group.check_inter_robot_collision()
print(f"\nInter-robot collision: {collision.get('hasCollision', False)}")

# ---------------------------------------------------------------------------
# 8. Leader-follower mode
# ---------------------------------------------------------------------------
group.set_coordination_type("leader_follower")
group.set_master("arm-left")
print("\nSwitched to leader-follower mode (arm-left is leader)")

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
group.dispose()
rv.show()
