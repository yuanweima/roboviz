use std::sync::Arc;
use std::time::Duration;

use serde_json::json;

use crate::client::{send_request, send_notify, ClientInner};
use crate::error::Result;

/// Manager for vision-related data streams (point clouds and camera feeds).
pub struct VisionManager {
    inner: Arc<ClientInner>,
    timeout: Duration,
}

impl VisionManager {
    /// Create a new vision manager from a connected client.
    pub fn new(client: &crate::client::RoboVizClient) -> Self {
        Self {
            inner: Arc::clone(client.inner()),
            timeout: client.default_timeout(),
        }
    }

    // =========================================================================
    // Point Cloud Streams
    // =========================================================================

    /// Start a point cloud stream with the given display parameters.
    pub async fn start_point_cloud_stream(
        &self,
        stream_id: &str,
        point_size: f64,
        color_mode: &str,
        max_points: u32,
    ) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "vision.startPointCloudStream",
            json!({
                "streamId": stream_id,
                "pointSize": point_size,
                "colorMode": color_mode,
                "maxPoints": max_points,
            }),
        )
        .await?;
        Ok(())
    }

    /// Push a single frame of point cloud data.
    ///
    /// * `points` -- flat array of XYZ coordinates (`[x0, y0, z0, x1, y1, z1, ...]`).
    /// * `colors` -- optional flat array of RGB values matching the points.
    /// * `timestamp` -- optional frame timestamp in seconds.
    pub async fn push_point_cloud_frame(
        &self,
        stream_id: &str,
        points: &[f64],
        colors: Option<&[f64]>,
        timestamp: Option<f64>,
    ) -> Result<()> {
        let mut params = json!({
            "streamId": stream_id,
            "points": points,
        });
        if let Some(c) = colors {
            params["colors"] = json!(c);
        }
        if let Some(t) = timestamp {
            params["timestamp"] = json!(t);
        }
        send_notify(&self.inner, "vision.pushPointCloudFrame", params).await
    }

    /// Stop and remove a point cloud stream.
    pub async fn stop_point_cloud_stream(&self, stream_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "vision.stopPointCloudStream",
            json!({ "streamId": stream_id }),
        )
        .await?;
        Ok(())
    }

    // =========================================================================
    // Camera Streams
    // =========================================================================

    /// Start a camera image stream.
    pub async fn start_camera_stream(
        &self,
        stream_id: &str,
        width: u32,
        height: u32,
        fps: u32,
    ) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "vision.startCameraStream",
            json!({
                "streamId": stream_id,
                "width": width,
                "height": height,
                "fps": fps,
            }),
        )
        .await?;
        Ok(())
    }

    /// Push a single camera frame.
    ///
    /// * `image_data` -- raw image bytes (typically base64-encoded on the wire).
    /// * `format` -- image format string, e.g. `"rgb8"`, `"jpeg"`, `"png"`.
    pub async fn push_camera_frame(
        &self,
        stream_id: &str,
        image_data: &[u8],
        width: u32,
        height: u32,
        format: &str,
    ) -> Result<()> {
        send_notify(
            &self.inner,
            "vision.pushCameraFrame",
            json!({
                "streamId": stream_id,
                "imageData": image_data,
                "width": width,
                "height": height,
                "format": format,
            }),
        )
        .await
    }

    /// Stop and remove a camera stream.
    pub async fn stop_camera_stream(&self, stream_id: &str) -> Result<()> {
        send_request(
            &self.inner,
            self.timeout,
            "vision.stopCameraStream",
            json!({ "streamId": stream_id }),
        )
        .await?;
        Ok(())
    }
}
