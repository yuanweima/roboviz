use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};

use crate::client::{send_request, ClientInner};
use crate::error::Result;

/// Manager for scene-level operations such as snapshots and import/export.
pub struct SceneManager {
    inner: Arc<ClientInner>,
    timeout: Duration,
}

impl SceneManager {
    /// Create a scene manager from a connected client.
    pub fn new(client: &crate::client::RoboVizClient) -> Self {
        Self {
            inner: Arc::clone(client.inner()),
            timeout: client.default_timeout(),
        }
    }

    /// Create a named snapshot of the current scene state.
    ///
    /// Returns the server-assigned snapshot ID.
    pub async fn create_snapshot(&self, name: &str) -> Result<String> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "scene.createSnapshot",
            json!({ "name": name }),
        )
        .await?;
        Ok(result
            .as_str()
            .map(|s| s.to_string())
            .or_else(|| result.get("snapshotId").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or_default())
    }

    /// Restore a previously created snapshot.
    pub async fn restore_snapshot(&self, snapshot_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "scene.restoreSnapshot",
            json!({ "snapshotId": snapshot_id }),
        )
        .await?;
        Ok(())
    }

    /// List all available snapshots.
    pub async fn list_snapshots(&self) -> Result<Vec<Value>> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "scene.listSnapshots",
            json!({}),
        )
        .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Export the entire scene as a serialisable JSON value.
    pub async fn export_scene(&self) -> Result<Value> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "scene.export",
            json!({}),
        )
        .await?;
        Ok(result)
    }

    /// Import a scene from a previously exported JSON value.
    pub async fn import_scene(&self, data: Value) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "scene.import",
            json!({ "data": data }),
        )
        .await?;
        Ok(())
    }
}
