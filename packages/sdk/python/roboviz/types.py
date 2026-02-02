"""
RoboViz Types

Type definitions for the Python SDK.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
from enum import Enum


@dataclass
class Vector3:
    """3D vector"""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    def to_tuple(self) -> Tuple[float, float, float]:
        return (self.x, self.y, self.z)

    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y, "z": self.z}

    @classmethod
    def from_tuple(cls, t: Tuple[float, float, float]) -> "Vector3":
        return cls(x=t[0], y=t[1], z=t[2])


@dataclass
class Quaternion:
    """Quaternion for rotation"""
    w: float = 1.0
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return {"w": self.w, "x": self.x, "y": self.y, "z": self.z}


@dataclass
class Transform:
    """3D transform (position + rotation)"""
    position: Vector3 = field(default_factory=Vector3)
    rotation: Quaternion = field(default_factory=Quaternion)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "position": self.position.to_dict(),
            "rotation": self.rotation.to_dict(),
        }


@dataclass
class Pose:
    """Robot pose (position + orientation)"""
    position: Vector3 = field(default_factory=Vector3)
    orientation: Quaternion = field(default_factory=Quaternion)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "position": self.position.to_dict(),
            "orientation": self.orientation.to_dict(),
        }


@dataclass
class RobotOptions:
    """Options for adding a robot"""
    urdf_path: str
    id: Optional[str] = None
    position: Optional[Vector3] = None
    rotation: Optional[Vector3] = None
    color: Optional[str] = None
    opacity: float = 1.0
    show_axes: bool = False

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {"urdfPath": self.urdf_path}
        if self.id:
            result["id"] = self.id
        if self.position:
            result["position"] = self.position.to_dict()
        if self.rotation:
            result["rotation"] = self.rotation.to_dict()
        if self.color:
            result["color"] = self.color
        result["opacity"] = self.opacity
        result["showAxes"] = self.show_axes
        return result


@dataclass
class RobotInfo:
    """Information about a loaded robot"""
    id: str
    joint_names: List[str]
    joint_count: int
    link_names: List[str]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RobotInfo":
        return cls(
            id=data["id"],
            joint_names=data.get("jointNames", []),
            joint_count=data.get("jointCount", 0),
            link_names=data.get("linkNames", []),
        )


@dataclass
class TrajectoryData:
    """Trajectory data for playback"""
    times: List[float]
    positions: List[List[float]]
    duration: Optional[float] = None

    def __post_init__(self):
        if self.duration is None and self.times:
            self.duration = self.times[-1] - self.times[0]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "times": self.times,
            "positions": self.positions,
            "duration": self.duration,
        }


@dataclass
class WaypointData:
    """Waypoint data"""
    id: str
    position: Vector3
    label: Optional[str] = None
    color: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {
            "id": self.id,
            "tcpPose": {
                "position": self.position.to_dict(),
                "orientation": {"w": 1, "x": 0, "y": 0, "z": 0},
            },
        }
        if self.label:
            result["label"] = self.label
        if self.color:
            result["color"] = self.color
        return result


class ObstacleShape(Enum):
    """Obstacle shape types"""
    BOX = "box"
    SPHERE = "sphere"
    CYLINDER = "cylinder"


@dataclass
class ObstacleData:
    """Obstacle data"""
    id: str
    shape: ObstacleShape
    dimensions: Vector3
    position: Vector3 = field(default_factory=Vector3)
    color: str = "#ff4444"
    opacity: float = 0.6

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": "primitive",
            "primitive": {
                "shape": self.shape.value,
                "dimensions": self.dimensions.to_dict(),
            },
            "transform": {
                "position": self.position.to_dict(),
                "rotation": {"w": 1, "x": 0, "y": 0, "z": 0},
            },
            "color": self.color,
            "opacity": self.opacity,
        }


@dataclass
class SafetyZoneData:
    """Safety zone configuration"""
    id: str
    radius: float
    warning_radius: Optional[float] = None
    danger_radius: Optional[float] = None
    position: Vector3 = field(default_factory=Vector3)
    opacity: float = 0.2

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "innerRadius": self.radius,
            "outerRadius": self.warning_radius or self.radius * 1.5,
            "dangerRadius": self.danger_radius or (self.warning_radius or self.radius * 1.5) * 1.2,
            "position": self.position.to_dict(),
            "opacity": self.opacity,
        }


# =============================================================================
# Kinematics Types
# =============================================================================


@dataclass
class IKResult:
    """Result of inverse kinematics computation."""
    success: bool
    joints: List[float]
    error: Optional[float] = None
    iterations: Optional[int] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "IKResult":
        return cls(
            success=data.get("success", False),
            joints=data.get("joints", []),
            error=data.get("error"),
            iterations=data.get("iterations"),
        )


@dataclass
class WorkspaceAnalysis:
    """Workspace quality analysis result."""
    manipulability: float
    condition_number: float
    is_near_singularity: bool

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkspaceAnalysis":
        return cls(
            manipulability=data.get("manipulability", 0.0),
            condition_number=data.get("conditionNumber", float("inf")),
            is_near_singularity=data.get("isNearSingularity", False),
        )


@dataclass
class ReachabilityResult:
    """Result of reachability check."""
    reachable: bool
    distance: Optional[float] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ReachabilityResult":
        return cls(
            reachable=data.get("reachable", False),
            distance=data.get("distance"),
        )


@dataclass
class DHParam:
    """Denavit-Hartenberg parameter for a single joint."""
    a: float
    alpha: float
    d: float
    theta: float

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DHParam":
        return cls(
            a=data.get("a", 0.0),
            alpha=data.get("alpha", 0.0),
            d=data.get("d", 0.0),
            theta=data.get("theta", 0.0),
        )


@dataclass
class SolverInfo:
    """Information about a created kinematics solver."""
    success: bool
    dof: int
    supports_analytical_ik: bool

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SolverInfo":
        return cls(
            success=data.get("success", False),
            dof=data.get("dof", 0),
            supports_analytical_ik=data.get("supportsAnalyticalIk", False),
        )


# =============================================================================
# Motion Planning Types
# =============================================================================


@dataclass
class LinearMotionConfig:
    """Configuration for linear motion planning."""
    max_step: float = 0.01
    max_joint_step: float = 0.05
    timeout: float = 5.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "maxStep": self.max_step,
            "maxJointStep": self.max_joint_step,
            "timeout": self.timeout,
        }


@dataclass
class MotionResult:
    """Result of motion planning."""
    success: bool
    path: List[List[float]]
    duration: Optional[float] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MotionResult":
        return cls(
            success=data.get("success", False),
            path=data.get("path", []),
            duration=data.get("duration"),
        )


@dataclass
class FeasibilityResult:
    """Result of motion feasibility check."""
    feasible: bool
    reason: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FeasibilityResult":
        return cls(
            feasible=data.get("feasible", False),
            reason=data.get("reason"),
        )


@dataclass
class JointPathResult:
    """Result of cartesian-to-joint path conversion."""
    success: bool
    joint_path: List[List[float]]
    failed_indices: List[int]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "JointPathResult":
        return cls(
            success=data.get("success", False),
            joint_path=data.get("jointPath", []),
            failed_indices=data.get("failedIndices", []),
        )


@dataclass
class PathAnalysis:
    """Result of path analysis."""
    total_length: float
    singularity_indices: List[int]
    joint_limit_warnings: List[Dict[str, Any]]
    manipulabilities: List[float]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PathAnalysis":
        return cls(
            total_length=data.get("totalLength", 0.0),
            singularity_indices=data.get("singularityIndices", []),
            joint_limit_warnings=data.get("jointLimitWarnings", []),
            manipulabilities=data.get("manipulabilities", []),
        )


@dataclass
class ValidationResult:
    """Result of path validation."""
    valid: bool
    issues: List[str]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ValidationResult":
        return cls(
            valid=data.get("valid", False),
            issues=data.get("issues", []),
        )


# =============================================================================
# Collision Types
# =============================================================================


@dataclass
class CollisionResult:
    """Result of collision check."""
    has_collision: bool
    pairs: List[Dict[str, Any]]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CollisionResult":
        return cls(
            has_collision=data.get("hasCollision", False),
            pairs=data.get("pairs", []),
        )


@dataclass
class PathCollisionResult:
    """Result of path collision check."""
    has_collision: bool
    first_collision_index: Optional[int] = None
    collision_indices: List[int] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PathCollisionResult":
        return cls(
            has_collision=data.get("hasCollision", False),
            first_collision_index=data.get("firstCollisionIndex"),
            collision_indices=data.get("collisionIndices", []),
        )
