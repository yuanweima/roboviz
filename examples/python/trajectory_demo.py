"""
Trajectory Playback Demo

Demonstrates trajectory playback capabilities:
- Loading robot from local URDF
- Playing trajectory animation with speed control
- Loop playback
"""

import os
import sys
import math
import time

# Add SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../packages/sdk/python'))

import roboviz as rv
from roboviz.types import TrajectoryData

# Get URDF path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
URDF_PATH = os.path.join(
    PROJECT_ROOT,
    "packages/core/test/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf"
)


def generate_sine_trajectory(num_joints: int, duration: float, steps: int) -> TrajectoryData:
    """Generate a sine wave trajectory for testing."""
    times = []
    positions = []

    for i in range(steps):
        t = (i / (steps - 1)) * duration
        times.append(t)

        # Generate joint positions as sine waves with different phases
        joint_angles = []
        for j in range(num_joints):
            # Each joint moves in a sine wave with a phase offset
            phase = j * (2 * math.pi / num_joints)
            amplitude = 0.5 if j < 3 else 0.3  # Smaller amplitude for last joints
            angle = amplitude * math.sin(2 * math.pi * t / duration + phase)
            joint_angles.append(angle)

        positions.append(joint_angles)

    return TrajectoryData(
        times=times,
        positions=positions,
    )


def main():
    print("=== Trajectory Playback Demo ===")
    print(f"URDF: {URDF_PATH}")

    # Initialize RoboViz
    viz = rv.init()

    # Add robot
    print("Adding robot...")
    robot = viz.add_robot(URDF_PATH, id="fanuc")

    # Wait for robot to load
    time.sleep(2)

    # Generate trajectory
    print("Generating trajectory...")
    num_joints = 7  # Fanuc LR Mate has 6 joints + 1
    duration = 5.0  # 5 second trajectory
    steps = 100     # 100 keyframes

    trajectory = generate_sine_trajectory(num_joints, duration, steps)
    print(f"  Duration: {duration}s")
    print(f"  Keyframes: {steps}")

    # Play trajectory
    print("Playing trajectory (loop=True, speed=1.0)...")
    viz.play_trajectory(
        robot_id="fanuc",
        trajectory=trajectory,
        speed=1.0,
        loop=True,
    )

    # Keep running
    print("\nPress Ctrl+C to exit...")
    print("Use the playback controls in the browser to pause/stop/change speed.")

    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\nExiting...")


if __name__ == "__main__":
    main()
