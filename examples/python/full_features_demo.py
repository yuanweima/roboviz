"""
RoboViz Full Features Demo

This demo showcases all the features available in RoboViz:
- Robot visualization with URDF
- Trajectory playback
- Coordinate frames hierarchy
- Point cloud rendering
- Collision detection
- Obstacles and safety zones
- Scene customization (shadows, ground plane, environment)
- Interactive controls (keyboard shortcuts, control panel)

Run this demo:
    cd packages/sdk/python
    pip install -e .
    python ../../examples/python/full_features_demo.py

Keyboard shortcuts in viewer:
    Space   - Play/Pause trajectory
    Escape  - Stop trajectory
    G       - Toggle grid
    C       - Toggle collision detection
    F       - Toggle coordinate frames
    P       - Toggle point clouds
    S       - Toggle shadows
    R       - Reset camera
    1-6     - Camera presets (front, back, left, right, top, iso)
    +/-     - Adjust playback speed
"""

import math
import time
import random
import os
import roboviz as rv
from roboviz import Vector3, TrajectoryData

# Get the path to the example URDF file
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
URDF_PATH = os.path.join(
    PROJECT_ROOT,
    "packages/core/test/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf"
)


def generate_point_cloud_sphere(center, radius, num_points=1000):
    """Generate a spherical point cloud with height-based coloring."""
    points = []
    colors = []

    for _ in range(num_points):
        # Random point on sphere surface
        theta = random.uniform(0, 2 * math.pi)
        phi = random.uniform(0, math.pi)
        r = radius * (0.9 + 0.1 * random.random())  # Some variation

        x = center[0] + r * math.sin(phi) * math.cos(theta)
        y = center[1] + r * math.cos(phi)
        z = center[2] + r * math.sin(phi) * math.sin(theta)

        points.extend([x, y, z])

        # Height-based color (red->yellow->green->cyan->blue)
        height_normalized = (y - center[1] + radius) / (2 * radius)
        if height_normalized < 0.25:
            r_c, g_c, b_c = 255, int(height_normalized * 4 * 255), 0
        elif height_normalized < 0.5:
            r_c, g_c, b_c = int((0.5 - height_normalized) * 4 * 255), 255, 0
        elif height_normalized < 0.75:
            r_c, g_c, b_c = 0, 255, int((height_normalized - 0.5) * 4 * 255)
        else:
            r_c, g_c, b_c = 0, int((1.0 - height_normalized) * 4 * 255), 255

        colors.extend([r_c, g_c, b_c])

    return points, colors


def generate_simple_trajectory(num_joints=6, duration=5.0, num_waypoints=50):
    """Generate a simple sine wave trajectory for demonstration."""
    times = []
    positions = []

    for i in range(num_waypoints):
        t = i * duration / (num_waypoints - 1)
        times.append(t)

        # Each joint follows a sine wave with different phase
        joint_positions = []
        for j in range(num_joints):
            angle = 0.5 * math.sin(2 * math.pi * t / duration + j * math.pi / 3)
            joint_positions.append(angle)
        positions.append(joint_positions)

    return TrajectoryData(times=times, positions=positions)


def main():
    print("=" * 60)
    print("RoboViz Full Features Demo")
    print("=" * 60)

    # Initialize RoboViz
    print("\n[1/8] Initializing RoboViz...")
    rv.init()

    # Configure scene
    print("[2/9] Configuring scene (shadows, environment)...")
    rv.set_scene(
        shadows=True,
        ground_plane=True,
        ground_color="#303030",
        environment="warehouse"
    )

    # Add robot
    print("[3/9] Adding robot...")
    robot = None
    if os.path.exists(URDF_PATH):
        # Don't pass color - use URDF-defined materials/colors
        robot = rv.add_robot(URDF_PATH, id="fanuc")
        time.sleep(0.5)
    else:
        print(f"  Warning: URDF not found at {URDF_PATH}")

    # Add coordinate frames hierarchy
    print("[4/9] Adding coordinate frames...")

    # World frame at origin
    rv.add_frame(
        id="world",
        name="World",
        position=[0, 0, 0],
        frame_type="world",
        axis_length=0.2,
        show_label=True
    )

    # Base frame (robot base)
    rv.add_frame(
        id="base",
        name="Robot Base",
        position=[0, 0, 0.1],
        frame_type="base",
        parent_frame_id="world",
        axis_length=0.15,
        show_label=True
    )

    # Tool frame
    rv.add_frame(
        id="tool",
        name="Tool",
        position=[0.3, 0.5, 0.2],
        frame_type="tool",
        axis_length=0.1,
        show_label=True
    )

    # Workpiece frame
    rv.add_frame(
        id="workpiece",
        name="Workpiece",
        position=[0.5, 0, 0.2],
        frame_type="workpiece",
        axis_length=0.1,
        show_label=True
    )

    # Camera/sensor frame
    rv.add_frame(
        id="camera",
        name="Camera",
        position=[-0.5, 0.8, 0.3],
        frame_type="camera",
        axis_length=0.08,
        show_label=True
    )

    time.sleep(0.5)  # Let frames render

    # Add point cloud
    print("[5/9] Adding point cloud...")
    points, colors = generate_point_cloud_sphere(
        center=[1.0, 0.3, 0],
        radius=0.25,
        num_points=2000
    )

    rv.add_point_cloud(
        id="sensor_data",
        points=points,
        colors=colors,
        point_size=0.008,
        color_mode="rgb",  # Use the colors we generated
        opacity=0.9
    )

    time.sleep(0.5)

    # Add obstacles
    print("[6/9] Adding obstacles...")
    rv.add_box(
        id="box_obstacle",
        size=[0.2, 0.3, 0.2],
        position=[-0.5, 0.15, 0.3],
        color="#ff6b6b"
    )

    rv.add_sphere(
        id="sphere_obstacle",
        radius=0.1,
        position=[0.4, 0.1, -0.3],
        color="#4ecdc4"
    )

    # Add safety zone
    print("[7/9] Adding safety zone...")
    rv.add_safety_zone(
        id="robot_zone",
        radius=0.8,
        warning_radius=1.0,
        danger_radius=1.2,
        position=[0, 0, 0]
    )

    time.sleep(0.5)

    # Enable collision detection
    print("[8/9] Enabling collision detection...")
    rv.enable_collision_detection(True)

    # Register event handlers
    print("[9/9] Setting up event handlers...")

    def on_robot_clicked(params):
        robot_id = params.get("robotId")
        link_name = params.get("linkName", "unknown")
        print(f"Robot clicked: {robot_id}, link: {link_name}")

    def on_collision_detected(params):
        pairs = params.get("pairs", [])
        print(f"Collision detected! {len(pairs)} collision pair(s)")
        for pair in pairs:
            print(f"  - {pair.get('objectA')} <-> {pair.get('objectB')}")

    def on_trajectory_ended(params):
        trajectory_id = params.get("trajectoryId")
        print(f"Trajectory playback ended: {trajectory_id}")

    rv.on("robot.clicked", on_robot_clicked)
    rv.on("collision.detected", on_collision_detected)
    rv.on("trajectory.ended", on_trajectory_ended)

    # Play trajectory if robot was loaded
    if robot:
        print("\nStarting robot animation...")
        trajectory = generate_simple_trajectory(num_joints=6, duration=5.0, num_waypoints=50)
        rv.play_trajectory(robot.id, trajectory, speed=1.0, loop=True)

    # Print instructions
    print("\n" + "=" * 60)
    print("Demo ready!")
    print("=" * 60)
    print("""
Features to explore in the viewer:

1. ROBOT (if loaded):
   - Watch the animated trajectory
   - Use control panel sliders to move joints
   - Press Space to pause/resume

2. CONTROL PANEL (right side):
   - Camera presets
   - Toggle grid, shadows, collision detection
   - Joint sliders for robot control
   - Environment presets

3. KEYBOARD SHORTCUTS (click '? Shortcuts' button):
   - Space: Play/Pause trajectory
   - G: Toggle grid
   - C: Toggle collision detection
   - F: Toggle coordinate frames
   - P: Toggle point clouds
   - S: Toggle shadows
   - 1-6: Camera views

4. MOUSE CONTROLS:
   - Left drag: Rotate camera
   - Right drag: Pan camera
   - Scroll: Zoom

5. STATUS BAR (bottom):
   - Connection status
   - Object counts
   - Collision status
""")
    print("=" * 60)
    print("Press Ctrl+C to exit")
    print("=" * 60)

    # Keep running
    rv.show()


if __name__ == "__main__":
    main()
