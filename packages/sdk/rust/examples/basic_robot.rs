//! Basic robot control example.
//!
//! Start the RoboViz viewer first: `pnpm dev`
//! Then run: `cargo run --example basic_robot`

use roboviz_sdk::{ObstacleData, RoboVizClient, RobotOptions, Vector3};

#[tokio::main]
async fn main() -> roboviz_sdk::Result<()> {
    tracing_subscriber::fmt::init();

    // Connect to the RoboViz viewer
    let client = RoboVizClient::connect("ws://localhost:8766").await?;
    println!("Connected to RoboViz");

    // Add a robot
    let robot = client
        .add_robot(RobotOptions::new("/models/fanuc.urdf").id("fanuc").color("#4ecdc4"))
        .await?;
    println!(
        "Added robot '{}' with {} joints",
        robot.id, robot.joint_count
    );

    // Set joint angles
    client
        .set_joints("fanuc", &[0.0, -0.3, 0.6, 0.0, -0.3, 0.0])
        .await?;
    println!("Joints set");

    // Read back joint values
    let joints = client.get_joints("fanuc").await?;
    println!("Current joints: {:?}", joints);

    // Add an obstacle
    let obstacle = ObstacleData::cube("box1", 0.2)
        .position(Vector3::new(0.5, 0.1, 0.3))
        .color("#ff4444");
    client.add_obstacle(&obstacle).await?;
    println!("Added obstacle");

    // Register an event callback
    client
        .on("robot.clicked", |params| {
            println!("Robot clicked: {:?}", params);
        })
        .await;

    // Keep running until Ctrl+C
    println!("Press Ctrl+C to exit...");
    tokio::signal::ctrl_c().await.unwrap();

    client.close().await?;
    println!("Disconnected");
    Ok(())
}
