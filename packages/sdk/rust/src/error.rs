use std::time::Duration;
use thiserror::Error;

/// Errors that can occur when using the RoboViz SDK.
#[derive(Error, Debug)]
pub enum RoboVizError {
    /// WebSocket connection or transport error.
    #[error("WebSocket error: {0}")]
    WebSocket(#[from] tokio_tungstenite::tungstenite::Error),

    /// JSON serialization/deserialization error.
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    /// Request timed out waiting for a response.
    #[error("Request timed out after {0:?}")]
    Timeout(Duration),

    /// Server returned a JSON-RPC error response.
    #[error("JSON-RPC error (code {code}): {message}")]
    JsonRpc {
        /// JSON-RPC error code.
        code: i64,
        /// Error message from the server.
        message: String,
    },

    /// Client is not connected to a server.
    #[error("Not connected to server")]
    NotConnected,

    /// The connection was closed unexpectedly.
    #[error("Connection closed")]
    ConnectionClosed,

    /// The provided URL is invalid.
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}

/// A specialized `Result` type for RoboViz SDK operations.
pub type Result<T> = std::result::Result<T, RoboVizError>;
