use std::sync::Arc;
use std::time::Duration;

use serde_json::json;

use crate::client::{send_request, ClientInner};
use crate::error::Result;
use crate::types::*;

/// Motion planner bound to a specific robot.
///
/// Provides linear motion planning, path interpolation, smoothing,
/// and path analysis utilities.
pub struct MotionPlanner {
    inner: Arc<ClientInner>,
    timeout: Duration,
    robot_id: String,
}

impl MotionPlanner {
    /// Create a motion planner for the given robot.
    pub fn new(client: &crate::client::RoboVizClient, robot_id: impl Into<String>) -> Self {
        Self {
            inner: Arc::clone(client.inner()),
            timeout: client.default_timeout(),
            robot_id: robot_id.into(),
        }
    }

    /// Plan a linear (Cartesian straight-line) motion from `start_joints` to
    /// `target_pose`.
    pub async fn linear(
        &self,
        start_joints: &[f64],
        target_pose: &Pose,
        config: &LinearMotionConfig,
    ) -> Result<MotionResult> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.linear",
            json!({
                "robotId": self.robot_id,
                "startJoints": start_joints,
                "targetPose": target_pose,
                "config": config,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Plan a linear motion through a series of Cartesian waypoints.
    pub async fn linear_path(
        &self,
        start_joints: &[f64],
        waypoints: &[Pose],
        config: &LinearMotionConfig,
    ) -> Result<MotionResult> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.linearPath",
            json!({
                "robotId": self.robot_id,
                "startJoints": start_joints,
                "waypoints": waypoints,
                "config": config,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Check whether a linear motion is feasible without fully planning it.
    pub async fn check_linear(
        &self,
        start_joints: &[f64],
        target_pose: &Pose,
        num_samples: u32,
    ) -> Result<FeasibilityResult> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.checkLinear",
            json!({
                "robotId": self.robot_id,
                "startJoints": start_joints,
                "targetPose": target_pose,
                "numSamples": num_samples,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Interpolate a joint path to a finer resolution.
    pub async fn interpolate_path(
        &self,
        path: &[Vec<f64>],
        resolution: f64,
    ) -> Result<Vec<Vec<f64>>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.interpolatePath",
            json!({
                "robotId": self.robot_id,
                "path": path,
                "resolution": resolution,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Smooth a joint path using a moving-average window.
    pub async fn smooth_path(
        &self,
        path: &[Vec<f64>],
        window_size: u32,
    ) -> Result<Vec<Vec<f64>>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.smoothPath",
            json!({
                "robotId": self.robot_id,
                "path": path,
                "windowSize": window_size,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Convert a Cartesian path to a joint-space path via IK.
    pub async fn cartesian_to_joint(
        &self,
        cartesian_path: &[Pose],
        seed_joints: &[f64],
    ) -> Result<JointPathResult> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.cartesianToJoint",
            json!({
                "robotId": self.robot_id,
                "cartesianPath": cartesian_path,
                "seedJoints": seed_joints,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Convert a joint-space path to Cartesian poses via FK.
    pub async fn joint_to_cartesian(&self, joint_path: &[Vec<f64>]) -> Result<Vec<Pose>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.jointToCartesian",
            json!({
                "robotId": self.robot_id,
                "jointPath": joint_path,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Analyse a joint path for singularities, joint-limit warnings, etc.
    pub async fn analyze_path(&self, path: &[Vec<f64>]) -> Result<PathAnalysis> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.analyzePath",
            json!({
                "robotId": self.robot_id,
                "path": path,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Validate a joint path against velocity constraints.
    pub async fn validate_path(
        &self,
        path: &[Vec<f64>],
        max_joint_velocity: f64,
        time_step: f64,
    ) -> Result<ValidationResult> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "motion.validatePath",
            json!({
                "robotId": self.robot_id,
                "path": path,
                "maxJointVelocity": max_joint_velocity,
                "timeStep": time_step,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }
}
