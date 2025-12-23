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
