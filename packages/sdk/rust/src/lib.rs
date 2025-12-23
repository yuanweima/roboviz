//! RoboViz Rust SDK
//! 
//! This crate provides a Rust client for controlling RoboViz remotely.

pub mod client;
pub mod types;

pub use client::RoboVizClient;
pub use types::*;
