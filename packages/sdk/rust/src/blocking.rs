//! Synchronous (blocking) wrapper around [`RoboVizClient`].
//!
//! Requires the `blocking` feature to be enabled.

use std::time::Duration;

use crate::client::RoboVizClient;
use crate::error::Result;
use crate::types::*;

/// Synchronous client that wraps [`RoboVizClient`] with an internal tokio runtime.
///
/// # Example
/// ```rust,no_run
/// use roboviz_sdk::BlockingClient;
/// use roboviz_sdk::RobotOptions;
///
/// let client = BlockingClient::connect("ws://localhost:8766").unwrap();
/// let robot = client.add_robot(RobotOptions::new("/path/to/robot.urdf").id("arm1")).unwrap();
/// client.set_joints("arm1", &[0.0, -0.3, 0.6, 0.0, 0.0, 0.0]).unwrap();
/// client.close().unwrap();
/// ```
pub struct BlockingClient {
    inner: RoboVizClient,
    runtime: tokio::runtime::Runtime,
}

impl BlockingClient {
    /// Connect to a RoboViz WebSocket server (blocking).
    pub fn connect(url: &str) -> Result<Self> {
        let runtime = tokio::runtime::Runtime::new()
            .expect("Failed to create tokio runtime");
        let inner = runtime.block_on(RoboVizClient::connect(url))?;
        Ok(Self { inner, runtime })
    }

    /// Connect with a custom request timeout.
    pub fn connect_with_timeout(url: &str, timeout: Duration) -> Result<Self> {
        let runtime = tokio::runtime::Runtime::new()
            .expect("Failed to create tokio runtime");
        let inner = runtime.block_on(RoboVizClient::connect_with_timeout(url, timeout))?;
        Ok(Self { inner, runtime })
    }

    /// Close the connection.
    pub fn close(&self) -> Result<()> {
        self.runtime.block_on(self.inner.close())
    }

    /// Add a robot to the scene.
    pub fn add_robot(&self, options: RobotOptions) -> Result<RobotInfo> {
        self.runtime.block_on(self.inner.add_robot(options))
    }

    /// Remove a robot.
    pub fn remove_robot(&self, robot_id: &str) -> Result<()> {
        self.runtime.block_on(self.inner.remove_robot(robot_id))
    }

    /// Set robot joint angles.
    pub fn set_joints(&self, robot_id: &str, angles: &[f64]) -> Result<()> {
        self.runtime.block_on(self.inner.set_joints(robot_id, angles))
    }

    /// Get current robot joint angles.
    pub fn get_joints(&self, robot_id: &str) -> Result<Vec<f64>> {
        self.runtime.block_on(self.inner.get_joints(robot_id))
    }

    /// Get current TCP pose.
    pub fn get_tcp_pose(&self, robot_id: &str) -> Result<Pose> {
        self.runtime.block_on(self.inner.get_tcp_pose(robot_id))
    }

    /// Play a trajectory.
    pub fn play_trajectory(
        &self,
        robot_id: &str,
        trajectory: &TrajectoryData,
        speed: f64,
        loop_playback: bool,
    ) -> Result<()> {
        self.runtime.block_on(self.inner.play_trajectory(robot_id, trajectory, speed, loop_playback))
    }

    /// Add an obstacle.
    pub fn add_obstacle(&self, obstacle: &ObstacleData) -> Result<()> {
        self.runtime.block_on(self.inner.add_obstacle(obstacle))
    }

    /// Remove an obstacle.
    pub fn remove_obstacle(&self, obstacle_id: &str) -> Result<()> {
        self.runtime.block_on(self.inner.remove_obstacle(obstacle_id))
    }

    /// Clear the scene.
    pub fn clear(&self) -> Result<()> {
        self.runtime.block_on(self.inner.clear())
    }

    /// Check collision.
    pub fn check_collision(&self, robot_id: &str, joints: &[f64]) -> Result<CollisionResult> {
        self.runtime.block_on(self.inner.check_collision(robot_id, joints))
    }

    /// Access the underlying async client (for advanced usage).
    pub fn async_client(&self) -> &RoboVizClient {
        &self.inner
    }

    /// Access the tokio runtime (for running custom async operations).
    pub fn runtime(&self) -> &tokio::runtime::Runtime {
        &self.runtime
    }
}
