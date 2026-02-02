use serde::{Deserialize, Serialize};

// =============================================================================
// Geometric Primitives
// =============================================================================

/// 3D vector.
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize)]
pub struct Vector3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vector3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    pub fn to_tuple(self) -> (f64, f64, f64) {
        (self.x, self.y, self.z)
    }

    pub fn from_tuple(t: (f64, f64, f64)) -> Self {
        Self { x: t.0, y: t.1, z: t.2 }
    }
}

/// Quaternion for rotation (w, x, y, z).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Quaternion {
    pub w: f64,
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Default for Quaternion {
    fn default() -> Self {
        Self { w: 1.0, x: 0.0, y: 0.0, z: 0.0 }
    }
}

impl Quaternion {
    pub fn new(w: f64, x: f64, y: f64, z: f64) -> Self {
        Self { w, x, y, z }
    }

    /// Identity quaternion (no rotation).
    pub fn identity() -> Self {
        Self::default()
    }
}

/// 3D transform (position + rotation).
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize)]
pub struct Transform {
    pub position: Vector3,
    pub rotation: Quaternion,
}

/// Robot pose (position + orientation).
#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize, Deserialize)]
pub struct Pose {
    pub position: Vector3,
    pub orientation: Quaternion,
}

impl Pose {
    pub fn new(position: Vector3, orientation: Quaternion) -> Self {
        Self { position, orientation }
    }
}

// =============================================================================
// Robot Types
// =============================================================================

/// Options for adding a robot to the scene.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RobotOptions {
    pub urdf_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<Vector3>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rotation: Option<Vector3>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub opacity: f64,
    pub show_axes: bool,
}

impl RobotOptions {
    pub fn new(urdf_path: impl Into<String>) -> Self {
        Self {
            urdf_path: urdf_path.into(),
            id: None,
            position: None,
            rotation: None,
            color: None,
            opacity: 1.0,
            show_axes: false,
        }
    }

    pub fn id(mut self, id: impl Into<String>) -> Self {
        self.id = Some(id.into());
        self
    }

    pub fn position(mut self, pos: Vector3) -> Self {
        self.position = Some(pos);
        self
    }

    pub fn rotation(mut self, rot: Vector3) -> Self {
        self.rotation = Some(rot);
        self
    }

    pub fn color(mut self, c: impl Into<String>) -> Self {
        self.color = Some(c.into());
        self
    }

    pub fn opacity(mut self, o: f64) -> Self {
        self.opacity = o;
        self
    }

    pub fn show_axes(mut self, v: bool) -> Self {
        self.show_axes = v;
        self
    }
}

/// Information about a loaded robot.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RobotInfo {
    pub id: String,
    #[serde(default)]
    pub joint_names: Vec<String>,
    #[serde(default)]
    pub joint_count: usize,
    #[serde(default)]
    pub link_names: Vec<String>,
}

// =============================================================================
// Trajectory Types
// =============================================================================

/// Trajectory data for playback.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrajectoryData {
    pub times: Vec<f64>,
    pub positions: Vec<Vec<f64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,
}

impl TrajectoryData {
    pub fn new(times: Vec<f64>, positions: Vec<Vec<f64>>) -> Self {
        let duration = if times.len() >= 2 {
            Some(times.last().unwrap() - times.first().unwrap())
        } else {
            None
        };
        Self { times, positions, duration }
    }
}

/// Waypoint data.
#[derive(Debug, Clone, Serialize)]
pub struct WaypointData {
    pub id: String,
    #[serde(rename = "tcpPose")]
    pub tcp_pose: Pose,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

impl WaypointData {
    pub fn new(id: impl Into<String>, position: Vector3) -> Self {
        Self {
            id: id.into(),
            tcp_pose: Pose::new(position, Quaternion::identity()),
            label: None,
            color: None,
        }
    }

    pub fn label(mut self, label: impl Into<String>) -> Self {
        self.label = Some(label.into());
        self
    }

    pub fn color(mut self, color: impl Into<String>) -> Self {
        self.color = Some(color.into());
        self
    }
}

// =============================================================================
// Obstacle Types
// =============================================================================

/// Obstacle shape types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ObstacleShape {
    Box,
    Sphere,
    Cylinder,
}

/// Obstacle data for the scene.
#[derive(Debug, Clone)]
pub struct ObstacleData {
    pub id: String,
    pub shape: ObstacleShape,
    pub dimensions: Vector3,
    pub position: Vector3,
    pub color: String,
    pub opacity: f64,
}

impl ObstacleData {
    pub fn new(id: impl Into<String>, shape: ObstacleShape, dimensions: Vector3) -> Self {
        Self {
            id: id.into(),
            shape,
            dimensions,
            position: Vector3::default(),
            color: "#ff4444".to_string(),
            opacity: 0.6,
        }
    }

    /// Create a box obstacle.
    pub fn cube(id: impl Into<String>, size: f64) -> Self {
        Self::new(id, ObstacleShape::Box, Vector3::new(size, size, size))
    }

    /// Create a sphere obstacle.
    pub fn sphere(id: impl Into<String>, radius: f64) -> Self {
        Self::new(id, ObstacleShape::Sphere, Vector3::new(radius, radius, radius))
    }

    /// Create a cylinder obstacle.
    pub fn cylinder(id: impl Into<String>, radius: f64, height: f64) -> Self {
        Self::new(id, ObstacleShape::Cylinder, Vector3::new(radius, radius, height))
    }

    pub fn position(mut self, pos: Vector3) -> Self {
        self.position = pos;
        self
    }

    pub fn color(mut self, c: impl Into<String>) -> Self {
        self.color = c.into();
        self
    }

    pub fn opacity(mut self, o: f64) -> Self {
        self.opacity = o;
        self
    }
}

impl Serialize for ObstacleData {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("id", &self.id)?;
        map.serialize_entry("type", "primitive")?;
        map.serialize_entry("primitive", &serde_json::json!({
            "shape": self.shape,
            "dimensions": self.dimensions,
        }))?;
        map.serialize_entry("transform", &serde_json::json!({
            "position": self.position,
            "rotation": Quaternion::identity(),
        }))?;
        map.serialize_entry("color", &self.color)?;
        map.serialize_entry("opacity", &self.opacity)?;
        map.end()
    }
}

/// Safety zone configuration.
#[derive(Debug, Clone)]
pub struct SafetyZoneData {
    pub id: String,
    pub radius: f64,
    pub warning_radius: Option<f64>,
    pub danger_radius: Option<f64>,
    pub position: Vector3,
    pub opacity: f64,
}

impl SafetyZoneData {
    pub fn new(id: impl Into<String>, radius: f64) -> Self {
        Self {
            id: id.into(),
            radius,
            warning_radius: None,
            danger_radius: None,
            position: Vector3::default(),
            opacity: 0.2,
        }
    }

    pub fn position(mut self, pos: Vector3) -> Self {
        self.position = pos;
        self
    }
}

impl Serialize for SafetyZoneData {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        use serde::ser::SerializeMap;
        let outer = self.warning_radius.unwrap_or(self.radius * 1.5);
        let danger = self.danger_radius.unwrap_or(outer * 1.2);
        let mut map = serializer.serialize_map(None)?;
        map.serialize_entry("id", &self.id)?;
        map.serialize_entry("innerRadius", &self.radius)?;
        map.serialize_entry("outerRadius", &outer)?;
        map.serialize_entry("dangerRadius", &danger)?;
        map.serialize_entry("position", &self.position)?;
        map.serialize_entry("opacity", &self.opacity)?;
        map.end()
    }
}

// =============================================================================
// Kinematics Types
// =============================================================================

/// Result of inverse kinematics computation.
#[derive(Debug, Clone, Deserialize)]
pub struct IKResult {
    pub success: bool,
    #[serde(default)]
    pub joints: Vec<f64>,
    pub error: Option<f64>,
    pub iterations: Option<u32>,
}

/// Workspace quality analysis result.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceAnalysis {
    #[serde(default)]
    pub manipulability: f64,
    #[serde(default = "f64_inf")]
    pub condition_number: f64,
    #[serde(default)]
    pub is_near_singularity: bool,
}

fn f64_inf() -> f64 {
    f64::INFINITY
}

/// Result of reachability check.
#[derive(Debug, Clone, Deserialize)]
pub struct ReachabilityResult {
    #[serde(default)]
    pub reachable: bool,
    pub distance: Option<f64>,
}

/// Denavit-Hartenberg parameter for a single joint.
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct DHParam {
    #[serde(default)]
    pub a: f64,
    #[serde(default)]
    pub alpha: f64,
    #[serde(default)]
    pub d: f64,
    #[serde(default)]
    pub theta: f64,
}

/// Information about a created kinematics solver.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolverInfo {
    #[serde(default)]
    pub success: bool,
    #[serde(default)]
    pub dof: usize,
    #[serde(default)]
    pub supports_analytical_ik: bool,
}

// =============================================================================
// Motion Planning Types
// =============================================================================

/// Configuration for linear motion planning.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinearMotionConfig {
    pub max_step: f64,
    pub max_joint_step: f64,
    pub timeout: f64,
}

impl Default for LinearMotionConfig {
    fn default() -> Self {
        Self {
            max_step: 0.01,
            max_joint_step: 0.05,
            timeout: 5.0,
        }
    }
}

impl LinearMotionConfig {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn max_step(mut self, v: f64) -> Self {
        self.max_step = v;
        self
    }

    pub fn max_joint_step(mut self, v: f64) -> Self {
        self.max_joint_step = v;
        self
    }

    pub fn timeout(mut self, v: f64) -> Self {
        self.timeout = v;
        self
    }
}

/// Result of motion planning.
#[derive(Debug, Clone, Deserialize)]
pub struct MotionResult {
    #[serde(default)]
    pub success: bool,
    #[serde(default)]
    pub path: Vec<Vec<f64>>,
    pub duration: Option<f64>,
}

/// Result of motion feasibility check.
#[derive(Debug, Clone, Deserialize)]
pub struct FeasibilityResult {
    #[serde(default)]
    pub feasible: bool,
    pub reason: Option<String>,
}

/// Result of cartesian-to-joint path conversion.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JointPathResult {
    #[serde(default)]
    pub success: bool,
    #[serde(default)]
    pub joint_path: Vec<Vec<f64>>,
    #[serde(default)]
    pub failed_indices: Vec<usize>,
}

/// Result of path analysis.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathAnalysis {
    #[serde(default)]
    pub total_length: f64,
    #[serde(default)]
    pub singularity_indices: Vec<usize>,
    #[serde(default)]
    pub joint_limit_warnings: Vec<serde_json::Value>,
    #[serde(default)]
    pub manipulabilities: Vec<f64>,
}

/// Result of path validation.
#[derive(Debug, Clone, Deserialize)]
pub struct ValidationResult {
    #[serde(default)]
    pub valid: bool,
    #[serde(default)]
    pub issues: Vec<String>,
}

// =============================================================================
// Collision Types
// =============================================================================

/// Result of collision check.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollisionResult {
    #[serde(default)]
    pub has_collision: bool,
    #[serde(default)]
    pub pairs: Vec<serde_json::Value>,
}

/// Result of path collision check.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathCollisionResult {
    #[serde(default)]
    pub has_collision: bool,
    pub first_collision_index: Option<usize>,
    #[serde(default)]
    pub collision_indices: Vec<usize>,
}

// =============================================================================
// Multi-Robot Types
// =============================================================================

/// Coordination type for robot groups.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CoordinationType {
    Independent,
    Synchronized,
    LeaderFollower,
    Cooperative,
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vector3_serialize() {
        let v = Vector3::new(1.0, 2.0, 3.0);
        let json = serde_json::to_string(&v).unwrap();
        assert_eq!(json, r#"{"x":1.0,"y":2.0,"z":3.0}"#);
    }

    #[test]
    fn test_quaternion_default() {
        let q = Quaternion::default();
        assert_eq!(q.w, 1.0);
        assert_eq!(q.x, 0.0);
    }

    #[test]
    fn test_robot_options_serialize() {
        let opts = RobotOptions::new("/robot.urdf").id("arm1").color("#4ecdc4");
        let json = serde_json::to_value(&opts).unwrap();
        assert_eq!(json["urdfPath"], "/robot.urdf");
        assert_eq!(json["id"], "arm1");
        assert_eq!(json["color"], "#4ecdc4");
        assert_eq!(json["opacity"], 1.0);
        assert!(json.get("position").is_none());
    }

    #[test]
    fn test_obstacle_data_serialize() {
        let obs = ObstacleData::cube("box1", 0.2)
            .position(Vector3::new(0.5, 0.0, 0.3))
            .color("#ff0000");
        let json = serde_json::to_value(&obs).unwrap();
        assert_eq!(json["id"], "box1");
        assert_eq!(json["type"], "primitive");
        assert_eq!(json["primitive"]["shape"], "box");
        assert_eq!(json["transform"]["position"]["x"], 0.5);
    }

    #[test]
    fn test_ik_result_deserialize() {
        let json = r#"{"success":true,"joints":[0.1,0.2,0.3],"error":0.001,"iterations":15}"#;
        let result: IKResult = serde_json::from_str(json).unwrap();
        assert!(result.success);
        assert_eq!(result.joints.len(), 3);
        assert_eq!(result.iterations, Some(15));
    }

    #[test]
    fn test_linear_motion_config_defaults() {
        let cfg = LinearMotionConfig::new();
        assert_eq!(cfg.max_step, 0.01);
        assert_eq!(cfg.max_joint_step, 0.05);
        assert_eq!(cfg.timeout, 5.0);
    }

    #[test]
    fn test_trajectory_data() {
        let traj = TrajectoryData::new(
            vec![0.0, 0.5, 1.0],
            vec![vec![0.0; 6], vec![0.1; 6], vec![0.2; 6]],
        );
        assert_eq!(traj.duration, Some(1.0));
    }
}
