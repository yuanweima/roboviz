use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};

use crate::client::{send_request, send_notify, ClientInner};
use crate::error::Result;

/// A group of robots that can be controlled together.
///
/// Supports synchronised trajectory playback and bulk joint commands.
pub struct RobotGroup {
    inner: Arc<ClientInner>,
    timeout: Duration,
    group_id: String,
}

impl RobotGroup {
    /// Create a new robot group with the given member robots.
    ///
    /// This registers the group on the server.
    pub async fn new(
        client: &crate::client::RoboVizClient,
        group_id: impl Into<String>,
        robot_ids: &[&str],
    ) -> Result<Self> {
        let inner = Arc::clone(client.inner());
        let timeout = client.default_timeout();
        let group_id = group_id.into();

        send_request(
            &inner,
            timeout,
            "multiRobot.createGroup",
            json!({
                "groupId": group_id,
                "robotIds": robot_ids,
            }),
        )
        .await?;

        Ok(Self { inner, timeout, group_id })
    }

    /// Add a robot to this group.
    pub async fn add_robot(&self, robot_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "multiRobot.addRobot",
            json!({
                "groupId": self.group_id,
                "robotId": robot_id,
            }),
        )
        .await?;
        Ok(())
    }

    /// Remove a robot from this group.
    pub async fn remove_robot(&self, robot_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "multiRobot.removeRobot",
            json!({
                "groupId": self.group_id,
                "robotId": robot_id,
            }),
        )
        .await?;
        Ok(())
    }

    /// Set joint angles for every robot in the group at once.
    ///
    /// `joints_map` maps robot IDs to their joint-angle vectors.
    pub async fn set_all_joints(
        &self,
        joints_map: &HashMap<String, Vec<f64>>,
    ) -> Result<()> {
        send_notify(
            &self.inner,
            "multiRobot.setAllJoints",
            json!({
                "groupId": self.group_id,
                "jointsMap": joints_map,
            }),
        )
        .await
    }

    /// Get the current joint angles of every robot in the group.
    pub async fn get_all_joints(&self) -> Result<HashMap<String, Vec<f64>>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "multiRobot.getAllJoints",
            json!({ "groupId": self.group_id }),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Play synchronised trajectories across all robots.
    ///
    /// `trajectories` is a JSON value mapping robot IDs to trajectory data.
    pub async fn play_sync_trajectory(
        &self,
        trajectories: Value,
        speed: f64,
    ) -> Result<()> {
        send_notify(
            &self.inner,
            "multiRobot.playSyncTrajectory",
            json!({
                "groupId": self.group_id,
                "trajectories": trajectories,
                "speed": speed,
            }),
        )
        .await
    }

    /// Dispose of the group, releasing server-side resources.
    pub async fn dispose(&self) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "multiRobot.disposeGroup",
            json!({ "groupId": self.group_id }),
        )
        .await?;
        Ok(())
    }
}
