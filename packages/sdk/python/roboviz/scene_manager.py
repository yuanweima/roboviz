"""
RoboViz Scene Manager

High-level scene management: snapshots, export/import, undo/redo.

Example:
    >>> import roboviz as rv
    >>> rv.init()
    >>> manager = rv.SceneManager(rv.get_instance())
    >>> snap_id = manager.create_snapshot("before-change")
    >>> # ... make changes ...
    >>> manager.restore_snapshot(snap_id)
"""

from typing import List, Dict, Any, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .core import RoboViz


class SceneManager:
    """
    High-level scene management — snapshots, export/import, undo/redo.

    Args:
        viz: Active RoboViz instance.
    """

    def __init__(self, viz: "RoboViz"):
        self._viz = viz

    # =========================================================================
    # Snapshots
    # =========================================================================

    def create_snapshot(self, name: str) -> str:
        """
        Create a named snapshot of the current scene state.

        Args:
            name: Human-readable snapshot name.

        Returns:
            Snapshot ID.
        """
        result = self._viz._send_request("scene.createSnapshot", {"name": name})
        return result.get("snapshotId", "")

    def restore_snapshot(self, snapshot_id: str) -> None:
        """Restore scene to a previous snapshot."""
        self._viz._send_request("scene.restoreSnapshot", {"snapshotId": snapshot_id})

    def list_snapshots(self) -> List[Dict[str, Any]]:
        """
        List all available snapshots.

        Returns:
            List of dicts with 'id', 'name', 'timestamp' keys.
        """
        result = self._viz._send_request("scene.listSnapshots", {})
        return result.get("snapshots", [])

    def delete_snapshot(self, snapshot_id: str) -> None:
        """Delete a snapshot."""
        self._viz._send_request("scene.deleteSnapshot", {"snapshotId": snapshot_id})

    # =========================================================================
    # Export / Import
    # =========================================================================

    def export_scene(self, format: str = "json") -> Dict[str, Any]:
        """
        Export the current scene.

        Args:
            format: Export format ("json").

        Returns:
            Scene data as a dict.
        """
        result = self._viz._send_request("scene.export", {"format": format})
        return result

    def import_scene(self, data: Dict[str, Any]) -> None:
        """
        Import a scene from exported data.

        Args:
            data: Scene data dict (as returned by export_scene).
        """
        self._viz._send_request("scene.import", {"data": data})

    # =========================================================================
    # Undo / Redo
    # =========================================================================

    def undo(self) -> None:
        """Undo the last scene change."""
        self._viz._send_request("scene.undo", {})

    def redo(self) -> None:
        """Redo the last undone change."""
        self._viz._send_request("scene.redo", {})

    def can_undo(self) -> bool:
        """Check if undo is available."""
        result = self._viz._send_request("scene.canUndo", {})
        return result.get("canUndo", False)

    def can_redo(self) -> bool:
        """Check if redo is available."""
        result = self._viz._send_request("scene.canRedo", {})
        return result.get("canRedo", False)

    # =========================================================================
    # Scene Configuration (additional)
    # =========================================================================

    def get_config(self) -> Dict[str, Any]:
        """Get current scene configuration."""
        return self._viz._send_request("scene.getConfig", {})

    def set_environment(self, preset: str) -> None:
        """
        Set the environment preset.

        Args:
            preset: One of 'studio', 'sunset', 'dawn', 'night',
                    'warehouse', 'forest', 'apartment', 'city', 'park', 'lobby'.
        """
        self._viz._send_notification("scene.setConfig", {"environmentPreset": preset})

    def set_lighting(
        self,
        ambient_intensity: Optional[float] = None,
        directional_intensity: Optional[float] = None,
    ) -> None:
        """Configure scene lighting."""
        params: Dict[str, Any] = {}
        if ambient_intensity is not None:
            params["ambientIntensity"] = ambient_intensity
        if directional_intensity is not None:
            params["directionalIntensity"] = directional_intensity
        if params:
            self._viz._send_notification("scene.setConfig", params)

    def __repr__(self) -> str:
        return "SceneManager()"
