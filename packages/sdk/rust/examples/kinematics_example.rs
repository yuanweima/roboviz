//! Kinematics (FK/IK) example.
//!
//! Start the RoboViz viewer first: `pnpm dev`
//! Then run: `cargo run --example kinematics_example`

use roboviz_sdk::{KinematicsSolver, Pose, Quaternion, RoboVizClient, RobotOptions, Vector3};

#[tokio::main]
async fn main() -> roboviz_sdk::Result<()> {
    tracing_subscriber::fmt::init();

    let client = RoboVizClient::connect("ws://localhost:8766").await?;

    // Add a robot
    client
        .add_robot(RobotOptions::new("/models/fanuc.urdf").id("fanuc"))
        .await?;

    // Create a kinematics solver
    let solver =
        KinematicsSolver::new(&client, "fanuc", "Fanuc_LR_Mate_200iD_7L").await?;
    println!("Solver created for robot: fanuc");

    // Forward kinematics
    let home = [0.0, -0.3, 0.6, 0.0, 0.0, 0.0];
    let pose = solver.fk(&home).await?;
    println!(
        "FK result: position ({:.3}, {:.3}, {:.3})",
        pose.position.x, pose.position.y, pose.position.z
    );

    // Inverse kinematics
    let target = Pose::new(
        Vector3::new(0.4, 0.1, 0.3),
        Quaternion::new(0.707, 0.0, 0.707, 0.0),
    );
    let ik_result = solver.ik(&target, &home).await?;
    if ik_result.success {
        println!("IK solution: {:?}", ik_result.joints);
        // Apply the IK solution
        client.set_joints("fanuc", &ik_result.joints).await?;
    } else {
        println!("IK failed");
    }

    // Workspace analysis
    let analysis = solver.analyze_workspace(&home).await?;
    println!(
        "Manipulability: {:.4}, near singularity: {}",
        analysis.manipulability, analysis.is_near_singularity
    );

    // Cleanup
    solver.dispose().await?;
    client.close().await?;
    Ok(())
}
