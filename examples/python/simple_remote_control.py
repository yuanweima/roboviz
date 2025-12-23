"""
RoboViz Python SDK 示例
Simple Remote Control Example

展示如何使用 Python SDK 远程控制 React 可视化。

使用方法:
1. 启动 React 应用 (带有 WebSocket 服务器)
2. 运行此脚本: python simple_remote_control.py

要求:
    pip install websocket-client
"""

import time
import math
from roboviz import (
    RoboVizClient,
    TrajectoryData,
    ObstacleData,
    ObstacleShape,
    Vector3,
)


def main():
    # 创建客户端
    viz = RoboVizClient("ws://localhost:8080")

    print("Connecting to RoboViz...")
    try:
        viz.connect()
        print("Connected!")
    except Exception as e:
        print(f"Connection failed: {e}")
        print("\nMake sure the React app with WebSocket server is running.")
        print("You can start it with: pnpm --filter react-demo dev")
        return

    try:
        # ========================================
        # 1. 添加机器人
        # ========================================
        print("\n[1] Adding robot...")
        robot = viz.add_robot(
            urdf_path="/models/fanuc.urdf",
            id="robot1",
            color="#4ecdc4"
        )
        print(f"Robot added: {robot.id}")
        time.sleep(1)

        # ========================================
        # 2. 设置关节角度
        # ========================================
        print("\n[2] Setting joint angles...")

        # 逐步移动关节
        positions = [
            [0, 0, 0, 0, 0, 0],
            [0.5, 0, 0, 0, 0, 0],
            [0.5, -0.5, 0, 0, 0, 0],
            [0.5, -0.5, 0.8, 0, 0, 0],
            [0.5, -0.5, 0.8, 1.0, 0, 0],
            [0.5, -0.5, 0.8, 1.0, -0.5, 0],
        ]

        for i, angles in enumerate(positions):
            viz.set_joints(robot.id, angles)
            print(f"  Position {i + 1}: {angles}")
            time.sleep(0.3)

        # ========================================
        # 3. 添加安全区域
        # ========================================
        print("\n[3] Adding safety zone...")
        viz.add_safety_zone(
            id="zone1",
            radius=0.8,
            warning_radius=1.0,
            danger_radius=1.2
        )
        print("Safety zone added")
        time.sleep(1)

        # ========================================
        # 4. 添加障碍物
        # ========================================
        print("\n[4] Adding obstacles...")

        obstacle1 = ObstacleData(
            id="box1",
            shape=ObstacleShape.BOX,
            dimensions=Vector3(0.2, 0.2, 0.2),
            position=Vector3(0.5, 0.1, 0.3),
            color="#ff4444"
        )
        viz.add_obstacle(obstacle1)
        print("Box obstacle added")

        obstacle2 = ObstacleData(
            id="sphere1",
            shape=ObstacleShape.SPHERE,
            dimensions=Vector3(0.1, 0.1, 0.1),
            position=Vector3(-0.3, 0.2, 0.4),
            color="#44ff44"
        )
        viz.add_obstacle(obstacle2)
        print("Sphere obstacle added")
        time.sleep(1)

        # ========================================
        # 5. 平滑动画
        # ========================================
        print("\n[5] Running smooth animation...")

        for t in range(100):
            phase = t * 0.1
            angles = [
                0.5 * math.sin(phase),
                -0.3 * math.cos(phase),
                0.5 * math.sin(phase * 0.7),
                0.8 * math.cos(phase * 1.2),
                0.4 * math.sin(phase * 0.9),
                phase % (2 * math.pi)
            ]
            viz.set_joints(robot.id, angles)
            time.sleep(0.03)

        print("Animation completed")

        # ========================================
        # 6. 播放轨迹
        # ========================================
        print("\n[6] Playing trajectory...")

        # 创建简单轨迹
        trajectory = TrajectoryData(
            times=[0, 1, 2, 3, 4],
            positions=[
                [0, 0, 0, 0, 0, 0],
                [0.5, -0.3, 0.5, 0, 0, 0],
                [0, -0.5, 0.8, 0.5, 0, 0],
                [-0.5, -0.3, 0.5, 0, 0.5, 0],
                [0, 0, 0, 0, 0, 0],
            ]
        )

        viz.play_trajectory(robot.id, trajectory, speed=2.0, loop=False)
        print("Trajectory playing...")
        time.sleep(3)

        # ========================================
        # 7. 设置相机
        # ========================================
        print("\n[7] Setting camera position...")
        viz.set_camera(
            position=Vector3(3, 2, 3),
            target=Vector3(0, 0.5, 0)
        )
        print("Camera positioned")
        time.sleep(1)

        # ========================================
        # 8. 清理
        # ========================================
        print("\n[8] Cleaning up...")
        viz.clear_obstacles()
        viz.remove_safety_zone("zone1")
        viz.set_joints(robot.id, [0, 0, 0, 0, 0, 0])
        print("Scene cleaned")

        # ========================================
        # 9. 事件监听示例
        # ========================================
        print("\n[9] Event handling demo...")

        # 注册事件回调
        def on_tcp_moved(pose):
            print(f"  TCP moved: position=({pose['position']['x']:.3f}, {pose['position']['y']:.3f}, {pose['position']['z']:.3f})")

        viz.on("tcp_moved", on_tcp_moved)

        # 移动关节触发事件
        for i in range(5):
            viz.set_joints(robot.id, [i * 0.1, -i * 0.1, i * 0.15, 0, 0, 0])
            time.sleep(0.5)

        # 注销事件
        viz.off("tcp_moved", on_tcp_moved)

        print("\n" + "=" * 50)
        print("Demo completed successfully!")
        print("=" * 50)

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

    finally:
        viz.disconnect()
        print("\nDisconnected from RoboViz")


if __name__ == "__main__":
    main()
