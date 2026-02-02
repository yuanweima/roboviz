use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use serde_json::{json, Value};
use tokio::net::TcpStream;
use tokio::sync::{Mutex, RwLock, oneshot};
use tokio::task::JoinHandle;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, connect_async};
use tracing::{debug, warn};

use crate::error::{Result, RoboVizError};
use crate::types::*;

type WsSink = futures_util::stream::SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>;
type EventCallback = Box<dyn Fn(Value) + Send + Sync>;

pub(crate) struct ClientInner {
    sink: Mutex<WsSink>,
    pending: Mutex<HashMap<u64, oneshot::Sender<Result<Value>>>>,
    callbacks: RwLock<HashMap<String, Vec<EventCallback>>>,
    next_id: Mutex<u64>,
}

/// Async WebSocket client for controlling a RoboViz visualization server
/// via JSON-RPC 2.0.
///
/// # Example
/// ```rust,no_run
/// use roboviz_sdk::{RoboVizClient, RobotOptions};
///
/// # async fn example() -> roboviz_sdk::Result<()> {
/// let client = RoboVizClient::connect("ws://localhost:8766").await?;
/// let robot = client.add_robot(RobotOptions::new("/path/to/robot.urdf").id("arm1")).await?;
/// client.set_joints("arm1", &[0.0, -0.3, 0.6, 0.0, 0.0, 0.0]).await?;
/// client.close().await?;
/// # Ok(())
/// # }
/// ```
pub struct RoboVizClient {
    inner: Arc<ClientInner>,
    reader_handle: JoinHandle<()>,
    timeout: Duration,
}

impl RoboVizClient {
    /// Connect to a RoboViz WebSocket server.
    pub async fn connect(url: &str) -> Result<Self> {
        Self::connect_with_timeout(url, Duration::from_secs(10)).await
    }

    /// Connect with a custom request timeout.
    pub async fn connect_with_timeout(url: &str, timeout: Duration) -> Result<Self> {
        let parsed = url::Url::parse(url)
            .map_err(|e| RoboVizError::InvalidUrl(e.to_string()))?;
        debug!("Connecting to {}", parsed);

        let (ws_stream, _) = connect_async(parsed.as_str()).await?;
        let (sink, stream) = ws_stream.split();

        let inner = Arc::new(ClientInner {
            sink: Mutex::new(sink),
            pending: Mutex::new(HashMap::new()),
            callbacks: RwLock::new(HashMap::new()),
            next_id: Mutex::new(0),
        });

        let reader_inner = Arc::clone(&inner);
        let reader_handle = tokio::spawn(async move {
            Self::reader_loop(stream, reader_inner).await;
        });

        Ok(Self { inner, reader_handle, timeout })
    }

    async fn reader_loop(
        mut stream: futures_util::stream::SplitStream<WebSocketStream<MaybeTlsStream<TcpStream>>>,
        inner: Arc<ClientInner>,
    ) {
        while let Some(msg) = stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    let data: Value = match serde_json::from_str(&text) {
                        Ok(v) => v,
                        Err(e) => {
                            warn!("Failed to parse message: {}", e);
                            continue;
                        }
                    };

                    // Response: has "id" and ("result" or "error")
                    if let Some(id) = data.get("id").and_then(|v| v.as_u64()) {
                        let mut pending = inner.pending.lock().await;
                        if let Some(sender) = pending.remove(&id) {
                            if let Some(err) = data.get("error") {
                                let code = err.get("code").and_then(|c| c.as_i64()).unwrap_or(-1);
                                let message = err
                                    .get("message")
                                    .and_then(|m| m.as_str())
                                    .unwrap_or("Unknown error")
                                    .to_string();
                                let _ = sender.send(Err(RoboVizError::JsonRpc { code, message }));
                            } else {
                                let result = data.get("result").cloned().unwrap_or(Value::Null);
                                let _ = sender.send(Ok(result));
                            }
                        }
                    }
                    // Notification/event: has "method" but no "id"
                    else if let Some(method) = data.get("method").and_then(|m| m.as_str()) {
                        let params = data.get("params").cloned().unwrap_or(Value::Null);
                        let cbs = inner.callbacks.read().await;
                        if let Some(handlers) = cbs.get(method) {
                            for handler in handlers {
                                handler(params.clone());
                            }
                        }
                    }
                }
                Ok(Message::Close(_)) => {
                    debug!("WebSocket closed by server");
                    break;
                }
                Err(e) => {
                    warn!("WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }
    }

    /// Close the connection gracefully.
    pub async fn close(&self) -> Result<()> {
        let mut sink = self.inner.sink.lock().await;
        sink.close().await.map_err(RoboVizError::WebSocket)?;
        Ok(())
    }

    /// Send a JSON-RPC request and await the response.
    pub async fn request<P: Serialize>(&self, method: &str, params: P) -> Result<Value> {
        let id = {
            let mut next_id = self.inner.next_id.lock().await;
            *next_id += 1;
            *next_id
        };

        let (tx, rx) = oneshot::channel();
        {
            let mut pending = self.inner.pending.lock().await;
            pending.insert(id, tx);
        }

        let msg = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": serde_json::to_value(params)?,
        });

        debug!("Sending request {}: {}", id, method);
        {
            let mut sink = self.inner.sink.lock().await;
            sink.send(Message::Text(msg.to_string()))
                .await
                .map_err(RoboVizError::WebSocket)?;
        }

        match tokio::time::timeout(self.timeout, rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err(RoboVizError::ConnectionClosed),
            Err(_) => {
                // Clean up pending request
                let mut pending = self.inner.pending.lock().await;
                pending.remove(&id);
                Err(RoboVizError::Timeout(self.timeout))
            }
        }
    }

    /// Send a JSON-RPC notification (fire-and-forget, no response expected).
    pub async fn notify<P: Serialize>(&self, method: &str, params: P) -> Result<()> {
        let msg = json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": serde_json::to_value(params)?,
        });

        debug!("Sending notification: {}", method);
        let mut sink = self.inner.sink.lock().await;
        sink.send(Message::Text(msg.to_string()))
            .await
            .map_err(RoboVizError::WebSocket)?;
        Ok(())
    }

    /// Register an event callback.
    pub async fn on<F>(&self, event: &str, callback: F)
    where
        F: Fn(Value) + Send + Sync + 'static,
    {
        let mut cbs = self.inner.callbacks.write().await;
        cbs.entry(event.to_string())
            .or_default()
            .push(Box::new(callback));
    }

    /// Remove all callbacks for an event.
    pub async fn off(&self, event: &str) {
        let mut cbs = self.inner.callbacks.write().await;
        cbs.remove(event);
    }

    // =========================================================================
    // Robot API
    // =========================================================================

    /// Add a robot to the scene.
    pub async fn add_robot(&self, options: RobotOptions) -> Result<RobotInfo> {
        let result = self.request("robot.add", &options).await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Remove a robot from the scene.
    pub async fn remove_robot(&self, robot_id: &str) -> Result<()> {
        self.request("robot.remove", json!({"id": robot_id})).await?;
        Ok(())
    }

    /// Set robot joint angles.
    pub async fn set_joints(&self, robot_id: &str, angles: &[f64]) -> Result<()> {
        self.notify("robot.setJoints", json!({"id": robot_id, "angles": angles})).await
    }

    /// Get current robot joint angles.
    pub async fn get_joints(&self, robot_id: &str) -> Result<Vec<f64>> {
        let result = self.request("robot.getJoints", json!({"id": robot_id})).await?;
        Ok(result
            .get("angles")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default())
    }

    /// Get current TCP pose for a robot.
    pub async fn get_tcp_pose(&self, robot_id: &str) -> Result<Pose> {
        let result = self.request("robot.getTcpPose", json!({"id": robot_id})).await?;
        Ok(serde_json::from_value(result)?)
    }

    // =========================================================================
    // Trajectory
    // =========================================================================

    /// Play a trajectory on a robot.
    pub async fn play_trajectory(
        &self,
        robot_id: &str,
        trajectory: &TrajectoryData,
        speed: f64,
        loop_playback: bool,
    ) -> Result<()> {
        self.notify("trajectory.play", json!({
            "robotId": robot_id,
            "trajectory": trajectory,
            "speed": speed,
            "loop": loop_playback,
        }))
        .await
    }

    /// Pause trajectory playback.
    pub async fn pause_trajectory(&self, robot_id: &str) -> Result<()> {
        self.notify("trajectory.pause", json!({"robotId": robot_id})).await
    }

    /// Stop trajectory playback.
    pub async fn stop_trajectory(&self, robot_id: &str) -> Result<()> {
        self.notify("trajectory.stop", json!({"robotId": robot_id})).await
    }

    // =========================================================================
    // Obstacles
    // =========================================================================

    /// Add an obstacle to the scene.
    pub async fn add_obstacle(&self, obstacle: &ObstacleData) -> Result<()> {
        self.request("obstacle.add", obstacle).await?;
        Ok(())
    }

    /// Remove an obstacle.
    pub async fn remove_obstacle(&self, obstacle_id: &str) -> Result<()> {
        self.request("obstacle.remove", json!({"id": obstacle_id})).await?;
        Ok(())
    }

    /// Clear all obstacles.
    pub async fn clear_obstacles(&self) -> Result<()> {
        self.request("obstacle.clear", json!({})).await?;
        Ok(())
    }

    // =========================================================================
    // Safety Zones
    // =========================================================================

    /// Add a safety zone.
    pub async fn add_safety_zone(&self, zone: &SafetyZoneData) -> Result<()> {
        self.request("safetyZone.add", zone).await?;
        Ok(())
    }

    /// Remove a safety zone.
    pub async fn remove_safety_zone(&self, zone_id: &str) -> Result<()> {
        self.request("safetyZone.remove", json!({"id": zone_id})).await?;
        Ok(())
    }

    // =========================================================================
    // Coordinate Frames
    // =========================================================================

    /// Add a coordinate frame to the scene.
    pub async fn add_frame(
        &self,
        id: &str,
        transform: &Transform,
        parent: Option<&str>,
        label: Option<&str>,
    ) -> Result<()> {
        let mut params = json!({
            "id": id,
            "transform": transform,
        });
        if let Some(p) = parent {
            params["parentId"] = json!(p);
        }
        if let Some(l) = label {
            params["label"] = json!(l);
        }
        self.request("frame.add", params).await?;
        Ok(())
    }

    /// Remove a coordinate frame.
    pub async fn remove_frame(&self, id: &str) -> Result<()> {
        self.request("frame.remove", json!({"id": id})).await?;
        Ok(())
    }

    // =========================================================================
    // Collision
    // =========================================================================

    /// Check collision for a robot at given joint configuration.
    pub async fn check_collision(&self, robot_id: &str, joints: &[f64]) -> Result<CollisionResult> {
        let result = self
            .request("collision.check", json!({"robotId": robot_id, "joints": joints}))
            .await?;
        Ok(serde_json::from_value(result)?)
    }

    /// Check collision along a joint path.
    pub async fn check_path_collision(
        &self,
        robot_id: &str,
        path: &[Vec<f64>],
    ) -> Result<PathCollisionResult> {
        let result = self
            .request("collision.checkPath", json!({"robotId": robot_id, "path": path}))
            .await?;
        Ok(serde_json::from_value(result)?)
    }

    // =========================================================================
    // Scene
    // =========================================================================

    /// Clear the entire scene.
    pub async fn clear(&self) -> Result<()> {
        self.request("scene.clear", json!({})).await?;
        Ok(())
    }

    /// Get a handle for internal request/notify (used by sub-modules).
    pub(crate) fn inner(&self) -> &Arc<ClientInner> {
        &self.inner
    }

    pub(crate) fn default_timeout(&self) -> Duration {
        self.timeout
    }
}

// Helper for sub-modules to send requests via the shared inner.
pub(crate) async fn send_request(inner: &Arc<ClientInner>, timeout: Duration, method: &str, params: Value) -> Result<Value> {
    let id = {
        let mut next_id = inner.next_id.lock().await;
        *next_id += 1;
        *next_id
    };

    let (tx, rx) = oneshot::channel();
    {
        let mut pending = inner.pending.lock().await;
        pending.insert(id, tx);
    }

    let msg = json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params,
    });

    {
        let mut sink = inner.sink.lock().await;
        sink.send(Message::Text(msg.to_string()))
            .await
            .map_err(RoboVizError::WebSocket)?;
    }

    match tokio::time::timeout(timeout, rx).await {
        Ok(Ok(result)) => result,
        Ok(Err(_)) => Err(RoboVizError::ConnectionClosed),
        Err(_) => {
            let mut pending = inner.pending.lock().await;
            pending.remove(&id);
            Err(RoboVizError::Timeout(timeout))
        }
    }
}

pub(crate) async fn send_notify(inner: &Arc<ClientInner>, method: &str, params: Value) -> Result<()> {
    let msg = json!({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
    });

    let mut sink = inner.sink.lock().await;
    sink.send(Message::Text(msg.to_string()))
        .await
        .map_err(RoboVizError::WebSocket)?;
    Ok(())
}

impl Drop for RoboVizClient {
    fn drop(&mut self) {
        self.reader_handle.abort();
    }
}
