use std::sync::Arc;
use std::time::Duration;

use serde_json::{json, Value};

use crate::client::{send_request, ClientInner};
use crate::error::Result;

/// Monitor and control rendering performance.
pub struct PerformanceMonitor {
    inner: Arc<ClientInner>,
    timeout: Duration,
}

impl PerformanceMonitor {
    /// Create a performance monitor from a connected client.
    pub fn new(client: &crate::client::RoboVizClient) -> Self {
        Self {
            inner: Arc::clone(client.inner()),
            timeout: client.default_timeout(),
        }
    }

    /// Retrieve current performance metrics from the server.
    pub async fn get_metrics(&self) -> Result<Value> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "performance.getMetrics",
            json!({}),
        )
        .await?;
        Ok(result)
    }

    /// Retrieve renderer statistics (draw calls, triangles, etc.).
    pub async fn get_render_stats(&self) -> Result<Value> {
        let result = send_request(
            &self.inner,
            self.timeout,
            "performance.getRenderStats",
            json!({}),
        )
        .await?;
        Ok(result)
    }

    /// Set the rendering quality level.
    ///
    /// Typical values: `"low"`, `"medium"`, `"high"`, `"ultra"`.
    pub async fn set_quality_level(&self, level: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "performance.setQualityLevel",
            json!({ "level": level }),
        )
        .await?;
        Ok(())
    }

    /// Cap the maximum frames per second.
    pub async fn set_max_fps(&self, fps: u32) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "performance.setMaxFps",
            json!({ "fps": fps }),
        )
        .await?;
        Ok(())
    }
}
