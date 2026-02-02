use std::sync::Arc;
use std::time::Duration;

use serde_json::json;

use crate::client::{send_request, ClientInner};
use crate::error::Result;

/// Diagnostic visualisation overlays for workspace and joint limits.
pub struct DiagnosticVisualizer {
    inner: Arc<ClientInner>,
    timeout: Duration,
}

impl DiagnosticVisualizer {
    /// Create a diagnostic visualiser from a connected client.
    pub fn new(client: &crate::client::RoboVizClient) -> Self {
        Self {
            inner: Arc::clone(client.inner()),
            timeout: client.default_timeout(),
        }
    }

    /// Show a workspace reachability cloud for the given robot.
    ///
    /// `resolution` controls the sampling density (lower = finer).
    pub async fn show_workspace(&self, robot_id: &str, resolution: f64) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "diagnostic.showWorkspace",
            json!({ "robotId": robot_id, "resolution": resolution }),
        )
        .await?;
        Ok(())
    }

    /// Hide the workspace visualisation for the given robot.
    pub async fn hide_workspace(&self, robot_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "diagnostic.hideWorkspace",
            json!({ "robotId": robot_id }),
        )
        .await?;
        Ok(())
    }

    /// Show joint-limit indicators for the given robot.
    pub async fn show_joint_limits(&self, robot_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "diagnostic.showJointLimits",
            json!({ "robotId": robot_id }),
        )
        .await?;
        Ok(())
    }

    /// Hide joint-limit indicators for the given robot.
    pub async fn hide_joint_limits(&self, robot_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "diagnostic.hideJointLimits",
            json!({ "robotId": robot_id }),
        )
        .await?;
        Ok(())
    }

    /// Hide all diagnostic overlays for the given robot.
    pub async fn hide_all(&self, robot_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "diagnostic.hideAll",
            json!({ "robotId": robot_id }),
        )
        .await?;
        Ok(())
    }
}
