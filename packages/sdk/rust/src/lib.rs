//! # RoboViz Rust SDK
//!
//! Async-first Rust client for controlling RoboViz visualization remotely
//! via JSON-RPC 2.0 over WebSocket.
//!
//! ## Quick Start
//!
//! ```rust,no_run
//! use roboviz_sdk::{RoboVizClient, RobotOptions, Vector3};
//!
//! #[tokio::main]
//! async fn main() -> roboviz_sdk::Result<()> {
//!     let client = RoboVizClient::connect("ws://localhost:8766").await?;
//!
//!     let robot = client.add_robot(
//!         RobotOptions::new("/path/to/robot.urdf").id("arm1")
//!     ).await?;
//!
//!     client.set_joints("arm1", &[0.0, -0.3, 0.6, 0.0, 0.0, 0.0]).await?;
//!     client.close().await?;
//!     Ok(())
//! }
//! ```

pub mod error;
pub mod types;
pub mod client;
pub mod kinematics;
pub mod motion;
pub mod vision;
pub mod multi_robot;
pub mod scene;
pub mod diagnostic;
pub mod performance;

#[cfg(feature = "blocking")]
pub mod blocking;

// Re-exports
pub use error::{RoboVizError, Result};
pub use types::*;
pub use client::RoboVizClient;
pub use kinematics::KinematicsSolver;
pub use motion::MotionPlanner;
pub use vision::VisionManager;
pub use multi_robot::RobotGroup;
pub use scene::SceneManager;
pub use diagnostic::DiagnosticVisualizer;
pub use performance::PerformanceMonitor;

#[cfg(feature = "blocking")]
pub use blocking::BlockingClient;
