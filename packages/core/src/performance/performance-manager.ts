/**
 * RoboViz Performance Manager
 *
 * 性能监控和优化管理器
 */

import type {
  PerformanceConfig,
  PerformanceMetrics,
  RenderStats,
  MemoryStats,
  NetworkStats,
  PerformanceProfile,
  PerformanceBottleneck,
  IPerformanceManager,
} from './types';
import { DEFAULT_PERFORMANCE_CONFIG } from './types';

// ============================================================================
// Types
// ============================================================================

type MetricsCallback = (metrics: PerformanceMetrics) => void;

interface FrameTimingSample {
  timestamp: number;
  frameTime: number;
  phase: {
    update: number;
    render: number;
    postProcess: number;
  };
}

// ============================================================================
// Performance Manager Implementation
// ============================================================================

/**
 * 性能管理器
 */
export class PerformanceManager implements IPerformanceManager {
  private config: PerformanceConfig;
  private readonly metricsCallbacks: Set<MetricsCallback> = new Set();
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;

  // Metrics tracking
  private lastFrameTime = 0;
  private frameTimeHistory: number[] = [];
  private readonly maxHistoryLength = 60;

  // Profiling
  private isProfiling = false;
  private profilingStart = 0;
  private profilingSamples: FrameTimingSample[] = [];

  // Render stats (would be updated by renderer integration)
  private currentRenderStats: RenderStats = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    geometries: 0,
    textures: 0,
    programs: 0,
  };

  // Network stats (would be updated by transport integration)
  private currentNetworkStats: NetworkStats = {
    activeStreams: 0,
    pendingRequests: 0,
    bytesReceived: 0,
    bytesSent: 0,
    averageLatency: 0,
    packetLoss: 0,
  };

  // Cache tracking
  private cachedGeometries = 0;
  private cachedTextures = 0;
  private cachedURDFs = 0;
  private cachedPointClouds = 0;

  // Quality
  private currentQualityLevel = 1.0;
  private adaptiveQualityEnabled = false;
  private adaptiveTargetFPS = 60;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  setConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };

    // Apply immediate changes
    if (config.adaptiveQuality !== undefined) {
      this.adaptiveQualityEnabled = config.adaptiveQuality;
    }
    if (config.targetFPS !== undefined) {
      this.adaptiveTargetFPS = config.targetFPS;
    }
  }

  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  resetConfig(): void {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG };
    this.currentQualityLevel = 1.0;
    this.adaptiveQualityEnabled = this.config.adaptiveQuality;
    this.adaptiveTargetFPS = this.config.targetFPS;
  }

  // ==========================================================================
  // Metrics
  // ==========================================================================

  getMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      render: this.getRenderStats(),
      memory: this.getMemoryStats(),
      network: this.getNetworkStats(),
      currentLODLevel: this.calculateLODLevel(),
      adaptiveQualityLevel: this.currentQualityLevel,
      isDegraded: this.currentQualityLevel < 0.5,
    };
  }

  getRenderStats(): RenderStats {
    // Calculate FPS from frame time history
    const fps = this.calculateFPS();
    const avgFrameTime = this.calculateAverageFrameTime();

    return {
      ...this.currentRenderStats,
      fps,
      frameTime: avgFrameTime,
    };
  }

  getMemoryStats(): MemoryStats {
    // Use Performance API if available
    const performance = globalThis.performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };

    const memory = performance?.memory;

    return {
      usedJSHeapSize: memory?.usedJSHeapSize ?? 0,
      totalJSHeapSize: memory?.totalJSHeapSize ?? 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit ?? 0,
      estimatedGPUMemory: this.estimateGPUMemory(),
      cachedGeometries: this.cachedGeometries,
      cachedTextures: this.cachedTextures,
      cachedURDFs: this.cachedURDFs,
      cachedPointClouds: this.cachedPointClouds,
    };
  }

  getNetworkStats(): NetworkStats {
    return { ...this.currentNetworkStats };
  }

  // ==========================================================================
  // Monitoring
  // ==========================================================================

  startMonitoring(interval = 1000): void {
    this.stopMonitoring();

    this.monitoringInterval = setInterval(() => {
      const metrics = this.getMetrics();

      // Adaptive quality adjustment
      if (this.adaptiveQualityEnabled) {
        this.adjustQuality(metrics.render.fps);
      }

      // Notify callbacks
      for (const callback of this.metricsCallbacks) {
        try {
          callback(metrics);
        } catch (error) {
          console.error('Error in metrics callback:', error);
        }
      }
    }, interval);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  onMetricsUpdate(callback: MetricsCallback): () => void {
    this.metricsCallbacks.add(callback);
    return () => {
      this.metricsCallbacks.delete(callback);
    };
  }

  // ==========================================================================
  // Resource Management
  // ==========================================================================

  clearCache(): void {
    this.clearGeometryCache();
    this.clearTextureCache();
    // In real implementation, would notify renderer to clear caches
  }

  clearGeometryCache(): void {
    this.cachedGeometries = 0;
    // In real implementation, would clear Three.js geometry cache
  }

  clearTextureCache(): void {
    this.cachedTextures = 0;
    // In real implementation, would clear Three.js texture cache
  }

  async preloadURDF(_url: string): Promise<void> {
    // In real implementation, would preload and cache URDF
    this.cachedURDFs++;
    if (this.cachedURDFs > this.config.maxCachedURDFs) {
      // Would evict oldest entry
      this.cachedURDFs = this.config.maxCachedURDFs;
    }
  }

  async preloadPointCloud(_url: string): Promise<void> {
    // In real implementation, would preload and cache point cloud
    this.cachedPointClouds++;
    if (this.cachedPointClouds > this.config.maxCachedPointClouds) {
      // Would evict oldest entry
      this.cachedPointClouds = this.config.maxCachedPointClouds;
    }
  }

  disposeUnused(): void {
    // In real implementation, would track usage and dispose unused resources
  }

  // ==========================================================================
  // Adaptive Quality
  // ==========================================================================

  enableAdaptiveQuality(targetFPS?: number): void {
    this.adaptiveQualityEnabled = true;
    if (targetFPS !== undefined) {
      this.adaptiveTargetFPS = targetFPS;
    }
  }

  disableAdaptiveQuality(): void {
    this.adaptiveQualityEnabled = false;
    this.currentQualityLevel = 1.0;
  }

  setQualityLevel(level: number): void {
    this.currentQualityLevel = Math.max(0, Math.min(1, level));
  }

  getQualityLevel(): number {
    return this.currentQualityLevel;
  }

  // ==========================================================================
  // Profiling
  // ==========================================================================

  startProfiling(): void {
    this.isProfiling = true;
    this.profilingStart = performance.now();
    this.profilingSamples = [];
  }

  stopProfiling(): PerformanceProfile {
    this.isProfiling = false;
    const duration = performance.now() - this.profilingStart;

    if (this.profilingSamples.length === 0) {
      return {
        duration,
        frameCount: 0,
        averageFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: 0,
        frameTimeHistogram: [],
        phaseTimings: { update: 0, render: 0, postProcess: 0 },
        memoryDelta: 0,
      };
    }

    const frameTimes = this.profilingSamples.map((s) => s.frameTime);
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const maxFrameTime = Math.max(...frameTimes);
    const minFrameTime = Math.min(...frameTimes);

    // Build histogram (10 buckets)
    const histogram = new Array(10).fill(0);
    const bucketSize = (maxFrameTime - minFrameTime) / 10 || 1;
    for (const ft of frameTimes) {
      const bucket = Math.min(9, Math.floor((ft - minFrameTime) / bucketSize));
      histogram[bucket]++;
    }

    // Calculate phase averages
    const phaseTimings = {
      update:
        this.profilingSamples.reduce((a, s) => a + s.phase.update, 0) / this.profilingSamples.length,
      render:
        this.profilingSamples.reduce((a, s) => a + s.phase.render, 0) / this.profilingSamples.length,
      postProcess:
        this.profilingSamples.reduce((a, s) => a + s.phase.postProcess, 0) /
        this.profilingSamples.length,
    };

    return {
      duration,
      frameCount: this.profilingSamples.length,
      averageFrameTime: avgFrameTime,
      maxFrameTime,
      minFrameTime,
      frameTimeHistogram: histogram,
      phaseTimings,
      memoryDelta: 0, // Would need before/after memory snapshots
    };
  }

  getBottlenecks(): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const metrics = this.getMetrics();

    // Check FPS bottleneck
    if (metrics.render.fps < this.config.adaptiveMinFPS) {
      const severity = 1 - metrics.render.fps / this.config.targetFPS;
      bottlenecks.push({
        type: 'gpu',
        severity: Math.min(1, severity),
        description: `Frame rate (${metrics.render.fps.toFixed(1)} FPS) below target (${this.config.targetFPS} FPS)`,
        suggestion: 'Consider enabling LOD, reducing model complexity, or lowering quality settings',
        relatedMetrics: {
          fps: metrics.render.fps,
          targetFPS: this.config.targetFPS,
          drawCalls: metrics.render.drawCalls,
          triangles: metrics.render.triangles,
        },
      });
    }

    // Check memory pressure
    if (metrics.memory.usedJSHeapSize > metrics.memory.jsHeapSizeLimit * 0.8) {
      const severity = (metrics.memory.usedJSHeapSize - metrics.memory.jsHeapSizeLimit * 0.5) /
        (metrics.memory.jsHeapSizeLimit * 0.5);
      bottlenecks.push({
        type: 'memory',
        severity: Math.min(1, severity),
        description: 'High memory usage detected',
        suggestion: 'Clear unused caches, reduce cached resources, or dispose unused geometries',
        relatedMetrics: {
          usedHeap: metrics.memory.usedJSHeapSize,
          heapLimit: metrics.memory.jsHeapSizeLimit,
          cachedGeometries: metrics.memory.cachedGeometries,
        },
      });
    }

    // Check network latency
    if (metrics.network.averageLatency > 100) {
      const severity = Math.min(1, (metrics.network.averageLatency - 50) / 200);
      bottlenecks.push({
        type: 'network',
        severity,
        description: `High network latency (${metrics.network.averageLatency.toFixed(0)} ms)`,
        suggestion: 'Check network connection or reduce stream frequency',
        relatedMetrics: {
          latency: metrics.network.averageLatency,
          activeStreams: metrics.network.activeStreams,
          packetLoss: metrics.network.packetLoss,
        },
      });
    }

    // Check draw calls
    if (metrics.render.drawCalls > 500) {
      const severity = Math.min(1, (metrics.render.drawCalls - 200) / 800);
      bottlenecks.push({
        type: 'cpu',
        severity,
        description: `High draw call count (${metrics.render.drawCalls})`,
        suggestion: 'Enable instancing, merge geometries, or reduce visible objects',
        relatedMetrics: {
          drawCalls: metrics.render.drawCalls,
          geometries: metrics.render.geometries,
        },
      });
    }

    return bottlenecks.sort((a, b) => b.severity - a.severity);
  }

  // ==========================================================================
  // Frame Timing Integration
  // ==========================================================================

  /**
   * 记录帧开始 (由渲染器调用)
   */
  beginFrame(): void {
    this.lastFrameTime = performance.now();
  }

  /**
   * 记录帧结束 (由渲染器调用)
   */
  endFrame(phaseTimings?: { update: number; render: number; postProcess: number }): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;

    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxHistoryLength) {
      this.frameTimeHistory.shift();
    }

    if (this.isProfiling && phaseTimings) {
      this.profilingSamples.push({
        timestamp: now,
        frameTime,
        phase: phaseTimings,
      });
    }
  }

  /**
   * 更新渲染统计 (由渲染器调用)
   */
  updateRenderStats(stats: Partial<RenderStats>): void {
    this.currentRenderStats = { ...this.currentRenderStats, ...stats };
  }

  /**
   * 更新网络统计 (由传输层调用)
   */
  updateNetworkStats(stats: Partial<NetworkStats>): void {
    this.currentNetworkStats = { ...this.currentNetworkStats, ...stats };
  }

  /**
   * 更新缓存计数 (由资源管理器调用)
   */
  updateCacheCounts(counts: {
    geometries?: number;
    textures?: number;
    urdfs?: number;
    pointClouds?: number;
  }): void {
    if (counts.geometries !== undefined) this.cachedGeometries = counts.geometries;
    if (counts.textures !== undefined) this.cachedTextures = counts.textures;
    if (counts.urdfs !== undefined) this.cachedURDFs = counts.urdfs;
    if (counts.pointClouds !== undefined) this.cachedPointClouds = counts.pointClouds;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  dispose(): void {
    this.stopMonitoring();
    this.metricsCallbacks.clear();
    this.frameTimeHistory = [];
    this.profilingSamples = [];
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private calculateFPS(): number {
    if (this.frameTimeHistory.length < 2) {
      return 0;
    }
    const avgFrameTime = this.calculateAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  private calculateAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) {
      return 0;
    }
    return this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
  }

  private calculateLODLevel(): number {
    // Map quality level to LOD level (0-3)
    if (this.currentQualityLevel >= 0.75) return 0; // High
    if (this.currentQualityLevel >= 0.5) return 1; // Medium
    if (this.currentQualityLevel >= 0.25) return 2; // Low
    return 3; // Very Low
  }

  private estimateGPUMemory(): number {
    // Rough estimation based on tracked resources
    const avgGeometrySize = 100 * 1024; // 100KB average
    const avgTextureSize = 4 * 1024 * 1024; // 4MB average
    return (
      this.cachedGeometries * avgGeometrySize + this.cachedTextures * avgTextureSize
    );
  }

  private adjustQuality(currentFPS: number): void {
    const targetFPS = this.adaptiveTargetFPS;
    const minFPS = this.config.adaptiveMinFPS;

    if (currentFPS < minFPS) {
      // Decrease quality more aggressively
      this.currentQualityLevel = Math.max(0.1, this.currentQualityLevel - 0.1);
    } else if (currentFPS < targetFPS * 0.9) {
      // Gradually decrease quality
      this.currentQualityLevel = Math.max(0.1, this.currentQualityLevel - 0.02);
    } else if (currentFPS > targetFPS && this.currentQualityLevel < 1.0) {
      // Gradually increase quality
      this.currentQualityLevel = Math.min(1.0, this.currentQualityLevel + 0.01);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建性能管理器
 */
export function createPerformanceManager(
  config?: Partial<PerformanceConfig>
): PerformanceManager {
  return new PerformanceManager(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalPerformanceManager: PerformanceManager | null = null;

/**
 * 获取全局性能管理器
 */
export function getPerformanceManager(): PerformanceManager {
  if (!globalPerformanceManager) {
    globalPerformanceManager = createPerformanceManager();
  }
  return globalPerformanceManager;
}

/**
 * 重置全局性能管理器
 */
export function resetPerformanceManager(): void {
  if (globalPerformanceManager) {
    globalPerformanceManager.dispose();
    globalPerformanceManager = null;
  }
}
