use std::sync::Arc;
use std::time::Duration;

use serde_json::json;

use crate::client::{send_request, ClientInner};
use crate::error::Result;
use crate::types::*;

/// High-level kinematics solver bound to a specific robot.
///
/// Created via [`KinematicsSolver::new`], which initialises the kinematics
/// subsystem and creates a solver instance on the server.
pub struct KinematicsSolver {
    inner: Arc<ClientInner>,
    timeout: Duration,
    robot_id: String,
}

impl KinematicsSolver {
    /// Initialise a kinematics solver for the given robot.
    ///
    /// This calls `kinematics.init` followed by `kinematics.createSolver` on
    /// the server, returning a ready-to-use solver handle.
    pub async fn new(
        client: &crate::client::RoboVizClient,
        robot_id: impl Into<String>,
        robot_name: impl Into<String>,
    ) -> Result<Self> {
        let inner = Arc::clone(client.inner());
        let timeout = client.default_timeout();
        let robot_id = robot_id.into();
        let robot_name = robot_name.into();

        // Initialise kinematics subsystem for this robot.
        send_request(
            &inner,
            timeout,
            "kinematics.init",
            json!({ "robotId": robot_id }),
        )
        .await?;

        // Create a solver instance.
        send_request(
            &inner,
            timeout,
            "kinematics.createSolver",
            json!({ "robotId": robot_id, "robotName": robot_name }),
        )
        .await?;

        Ok(Self { inner, timeout, robot_id })
    }

    /// Compute forward kinematics for the given joint values.
    ///
    /// Returns the TCP pose of the end-effector.
    pub async fn fk(&self, joints: &[f64]) -> Result<Pose> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.fk",
            json!({ "robotId": self.robot_id, "joints": joints }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Compute forward kinematics for every link in the chain.
    ///
    /// Returns a pose for each link from the base to the end-effector.
    pub async fn fk_chain(&self, joints: &[f64]) -> Result<Vec<Pose>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.fkChain",
            json!({ "robotId": self.robot_id, "joints": joints }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Compute inverse kinematics for a target pose.
    ///
    /// `seed` provides an initial joint configuration for the solver.
    pub async fn ik(&self, target_pose: &Pose, seed: &[f64]) -> Result<IKResult> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.ik",
            json!({
                "robotId": self.robot_id,
                "targetPose": target_pose,
                "seed": seed,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Compute all inverse kinematics solutions for a target pose.
    pub async fn ik_all(&self, target_pose: &Pose, seed: &[f64]) -> Result<Vec<IKResult>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.ikAll",
            json!({
                "robotId": self.robot_id,
                "targetPose": target_pose,
                "seed": seed,
            }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Analyse the workspace quality at the given joint configuration.
    pub async fn analyze_workspace(&self, joints: &[f64]) -> Result<WorkspaceAnalysis> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.analyzeWorkspace",
            json!({ "robotId": self.robot_id, "joints": joints }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Check whether a target pose is reachable.
    pub async fn is_reachable(&self, target_pose: &Pose) -> Result<ReachabilityResult> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.isReachable",
            json!({ "robotId": self.robot_id, "targetPose": target_pose }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Check whether the robot is near a kinematic singularity.
    pub async fn is_near_singularity(
        &self,
        joints: &[f64],
        threshold: f64,
    ) -> Result<bool> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.isNearSingularity",
            json!({
                "robotId": self.robot_id,
                "joints": joints,
                "threshold": threshold,
            }),
        )
        .await?;
        Ok(result.as_bool().unwrap_or(false))
    }

    /// Compute the manipulability measure at the given joint configuration.
    pub async fn compute_manipulability(&self, joints: &[f64]) -> Result<f64> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.computeManipulability",
            json!({ "robotId": self.robot_id, "joints": joints }),
        )
        .await?;
        Ok(result.as_f64().unwrap_or(0.0))
    }

    /// Compute the Jacobian matrix at the given joint configuration.
    ///
    /// Returns the Jacobian as a row-major 2D vector.
    pub async fn compute_jacobian(&self, joints: &[f64]) -> Result<Vec<Vec<f64>>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.computeJacobian",
            json!({ "robotId": self.robot_id, "joints": joints }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Attach a tool (end-effector offset) to the robot.
    pub async fn attach_tool(&self, tool_pose: &Pose) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "kinematics.attachTool",
            json!({ "robotId": self.robot_id, "toolPose": tool_pose }),
        )
        .await?;
        Ok(())
    }

    /// Detach the currently attached tool.
    pub async fn detach_tool(&self) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "kinematics.detachTool",
            json!({ "robotId": self.robot_id }),
        )
        .await?;
        Ok(())
    }

    /// Check whether the given joint configuration is valid (within limits).
    pub async fn is_valid_config(&self, joints: &[f64]) -> Result<bool> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.isValidConfig",
            json!({ "robotId": self.robot_id, "joints": joints }),
        )
        .await?;
        Ok(result.as_bool().unwrap_or(false))
    }

    /// Retrieve the Denavit-Hartenberg parameters for this robot.
    pub async fn get_dh_params(&self) -> Result<Vec<DHParam>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "kinematics.getDHParams",
            json!({ "robotId": self.robot_id }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Dispose of the solver, releasing server-side resources.
    pub async fn dispose(&self) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "kinematics.dispose",
            json!({ "robotId": self.robot_id }),
        )
        .await?;
        Ok(())
    }
}
