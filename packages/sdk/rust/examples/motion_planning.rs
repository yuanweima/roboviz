//! Motion planning example.
//!
//! Start the RoboViz viewer first: `pnpm dev`
//! Then run: `cargo run --example motion_planning`

use roboviz_sdk::{
    KinematicsSolver, LinearMotionConfig, MotionPlanner, Pose, Quaternion, RoboVizClient,
    RobotOptions, TrajectoryData, Vector3,
};

#[tokio::main]
async fn main() -> roboviz_sdk::Result<()> {
    tracing_subscriber::fmt::init();

    let client = RoboVizClient::connect("ws://localhost:8766").await?;

    // Add robot and create solver
    client
        .add_robot(RobotOptions::new("/models/fanuc.urdf").id("fanuc"))
        .await?;
    let _solver =
        KinematicsSolver::new(&client, "fanuc", "Fanuc_LR_Mate_200iD_7L").await?;

    // Create motion planner
    let planner = MotionPlanner::new(&client, "fanuc");

    // Plan a linear motion
    let start_joints = [0.0, -0.3, 0.6, 0.0, 0.0, 0.0];
    let target = Pose::new(
        Vector3::new(0.4, 0.1, 0.3),
        Quaternion::new(0.707, 0.0, 0.707, 0.0),
    );

    let config = LinearMotionConfig::new().max_step(0.005).timeout(10.0);

    let result = planner
        .linear(&start_joints, &target, &config)
        .await?;

    if result.success {
        println!("Motion plan: {} waypoints", result.path.len());

        // Analyze the path
        let analysis = planner.analyze_path(&result.path).await?;
        println!(
            "Path length: {:.3}, singularities: {}",
            analysis.total_length,
            analysis.singularity_indices.len()
        );

        // Convert to trajectory and play
        let times: Vec<f64> = (0..result.path.len())
            .map(|i| i as f64 * 0.05)
            .collect();
        let trajectory = TrajectoryData::new(times, result.path);

        client
            .play_trajectory("fanuc", &trajectory, 1.0, false)
            .await?;
        println!("Playing trajectory...");

        // Wait for trajectory to finish
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    } else {
        println!("Motion planning failed");
    }

    client.close().await?;
    Ok(())
}
