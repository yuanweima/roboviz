"""
RoboViz Basic Example

Demonstrates the simplest usage of the RoboViz Python SDK.
Just run this script - everything starts automatically!

Usage:
    python basic.py
"""

import roboviz as rv
import math
import time
import os

# Get the path to the example URDF file
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
URDF_PATH = os.path.join(
    PROJECT_ROOT,
    "packages/core/test/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf"
)


def main():
    # Initialize RoboViz - this starts the server and opens the browser
    print("Starting RoboViz...")
    rv.init()

    # Add a robot (local file - SDK will load and send via WebSocket)
    # Don't pass color - use URDF-defined materials/colors
    print(f"Adding robot from: {URDF_PATH}")
    robot = rv.add_robot(urdf_path=URDF_PATH)

    # Add some obstacles
    print("Adding obstacles...")
    rv.add_box(
        size=[0.2, 0.2, 0.2],
        position=[0.5, 0.1, 0.3],
        color="#ff4444"
    )

    rv.add_sphere(
        radius=0.1,
        position=[-0.3, 0.2, 0.4],
        color="#44ff44"
    )

    # Add safety zone
    print("Adding safety zone...")
    rv.add_safety_zone(
        id="zone1",
        radius=0.8,
        warning_radius=1.0,
        danger_radius=1.2
    )

    # Animate the robot
    print("Animating robot...")
    print("Press Ctrl+C to exit")

    try:
        t = 0
        while True:
            # Calculate joint angles
            angles = [
                0.5 * math.sin(t),
                -0.3 * math.cos(t),
                0.5 * math.sin(t * 0.7),
                0.8 * math.cos(t * 1.2),
                0.4 * math.sin(t * 0.9),
                t % (2 * math.pi)
            ]

            # Update robot
            robot.set_joints(angles)

            t += 0.05
            time.sleep(0.03)

    except KeyboardInterrupt:
        print("\nExiting...")

    rv.close()


if __name__ == "__main__":
    main()
