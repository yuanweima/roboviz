"""
RoboViz Performance Monitor

Performance monitoring, quality controls, and profiling.

Example:
    >>> import roboviz as rv
    >>> rv.init()
    >>> perf = rv.PerformanceMonitor(rv.get_instance())
    >>> perf.start_monitoring()
    >>> stats = perf.get_render_stats()
    >>> print(f"FPS: {stats.get('fps', 0)}")
"""

from typing import Dict, Any, Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .core import RoboViz


class PerformanceMonitor:
    """
    Performance monitoring and optimization controls.

    Args:
        viz: Active RoboViz instance.
    """

    def __init__(self, viz: "RoboViz"):
        self._viz = viz

    # =========================================================================
    # Monitoring
    # =========================================================================

    def start_monitoring(self, interval_ms: int = 1000) -> None:
        """
        Start performance monitoring.

        Args:
            interval_ms: Metrics collection interval in milliseconds.
        """
        self._viz._send_notification("performance.startMonitoring", {
            "intervalMs": interval_ms,
        })

    def stop_monitoring(self) -> None:
        """Stop performance monitoring."""
        self._viz._send_notification("performance.stopMonitoring", {})

    def get_metrics(self) -> Dict[str, Any]:
        """
        Get current performance metrics.

        Returns:
            Dict with keys like 'fps', 'frameTime', 'drawCalls',
            'triangles', 'memoryUsage', etc.
        """
        return self._viz._send_request("performance.getMetrics", {})

    def get_render_stats(self) -> Dict[str, Any]:
        """
        Get renderer statistics.

        Returns:
            Dict with keys like 'fps', 'drawCalls', 'triangles',
            'textures', 'geometries', 'programs'.
        """
        return self._viz._send_request("performance.getRenderStats", {})

    # =========================================================================
    # Quality Controls
    # =========================================================================

    def set_quality_level(self, level: str) -> None:
        """
        Set rendering quality level.

        Args:
            level: Quality preset ('low', 'medium', 'high', 'ultra').
        """
        self._viz._send_notification("performance.setQualityLevel", {"level": level})

    def set_shadows(self, enabled: bool) -> None:
        """Enable or disable shadow rendering."""
        self._viz._send_notification("performance.setShadows", {"enabled": enabled})

    def set_anti_aliasing(self, enabled: bool) -> None:
        """Enable or disable anti-aliasing."""
        self._viz._send_notification("performance.setAntiAliasing", {"enabled": enabled})

    def set_post_processing(self, enabled: bool) -> None:
        """Enable or disable post-processing effects."""
        self._viz._send_notification("performance.setPostProcessing", {"enabled": enabled})

    # =========================================================================
    # LOD / Optimization
    # =========================================================================

    def set_max_fps(self, fps: int) -> None:
        """
        Set maximum frame rate.

        Args:
            fps: Target FPS (0 for unlimited).
        """
        self._viz._send_notification("performance.setMaxFps", {"fps": fps})

    def set_pixel_ratio(self, ratio: float) -> None:
        """
        Set device pixel ratio for rendering.

        Args:
            ratio: Pixel ratio (1.0 = standard, 2.0 = retina).
        """
        self._viz._send_notification("performance.setPixelRatio", {"ratio": ratio})

    def preload_urdf(self, urdf_content: str) -> None:
        """
        Pre-load and cache a URDF for faster subsequent use.

        Args:
            urdf_content: URDF XML content string.
        """
        self._viz._send_request("performance.preloadUrdf", {
            "urdfContent": urdf_content,
        })

    # =========================================================================
    # Profiling
    # =========================================================================

    def start_profiling(self) -> None:
        """Start a profiling session."""
        self._viz._send_notification("performance.startProfiling", {})

    def stop_profiling(self) -> Dict[str, Any]:
        """
        Stop profiling and return results.

        Returns:
            Dict with profiling data (timings, call counts, etc.).
        """
        return self._viz._send_request("performance.stopProfiling", {})

    # =========================================================================
    # Memory
    # =========================================================================

    def get_memory_usage(self) -> Dict[str, Any]:
        """
        Get memory usage statistics.

        Returns:
            Dict with 'geometries', 'textures', 'totalBytes', etc.
        """
        return self._viz._send_request("performance.getMemoryUsage", {})

    def dispose_unused(self) -> None:
        """Dispose unused geometries and textures from the cache."""
        self._viz._send_notification("performance.disposeUnused", {})

    def __repr__(self) -> str:
        return "PerformanceMonitor()"
