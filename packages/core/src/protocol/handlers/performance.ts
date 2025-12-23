/**
 * RoboViz Performance Protocol Handlers
 *
 * JSON-RPC 2.0 handlers for performance.* namespace
 */

import type { MethodHandler } from '../handler';
import type {
  PerformanceConfig,
  PerformanceMetrics,
  RenderStats,
  MemoryStats,
  NetworkStats,
  PerformanceProfile,
  PerformanceBottleneck,
} from '../../performance/types';
import { getPerformanceManager } from '../../performance/performance-manager';

// ============================================================================
// Configuration Handlers
// ============================================================================

/**
 * performance.setConfig - 设置性能配置
 */
export const performanceSetConfig: MethodHandler<
  Partial<PerformanceConfig>,
  { success: boolean }
> = (params) => {
  const manager = getPerformanceManager();
  manager.setConfig(params);
  return { success: true };
};

/**
 * performance.getConfig - 获取性能配置
 */
export const performanceGetConfig: MethodHandler<
  Record<string, never>,
  { config: PerformanceConfig }
> = () => {
  const manager = getPerformanceManager();
  return { config: manager.getConfig() };
};

/**
 * performance.resetConfig - 重置性能配置
 */
export const performanceResetConfig: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getPerformanceManager();
  manager.resetConfig();
  return { success: true };
};

// ============================================================================
// Metrics Handlers
// ============================================================================

/**
 * performance.getMetrics - 获取性能指标
 */
export const performanceGetMetrics: MethodHandler<
  Record<string, never>,
  { metrics: PerformanceMetrics }
> = () => {
  const manager = getPerformanceManager();
  return { metrics: manager.getMetrics() };
};

/**
 * performance.getRenderStats - 获取渲染统计
 */
export const performanceGetRenderStats: MethodHandler<
  Record<string, never>,
  { stats: RenderStats }
> = () => {
  const manager = getPerformanceManager();
  return { stats: manager.getRenderStats() };
};

/**
 * performance.getMemoryStats - 获取内存统计
 */
export const performanceGetMemoryStats: MethodHandler<
  Record<string, never>,
  { stats: MemoryStats }
> = () => {
  const manager = getPerformanceManager();
  return { stats: manager.getMemoryStats() };
};

/**
 * performance.getNetworkStats - 获取网络统计
 */
export const performanceGetNetworkStats: MethodHandler<
  Record<string, never>,
  { stats: NetworkStats }
> = () => {
  const manager = getPerformanceManager();
  return { stats: manager.getNetworkStats() };
};

// ============================================================================
// Monitoring Handlers
// ============================================================================

/**
 * performance.startMonitoring - 开始性能监控
 */
export const performanceStartMonitoring: MethodHandler<
  { interval?: number },
  { success: boolean }
> = (params) => {
  const manager = getPerformanceManager();
  manager.startMonitoring(params.interval);
  return { success: true };
};

/**
 * performance.stopMonitoring - 停止性能监控
 */
export const performanceStopMonitoring: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getPerformanceManager();
  manager.stopMonitoring();
  return { success: true };
};

// ============================================================================
// Resource Management Handlers
// ============================================================================

/**
 * performance.clearCache - 清理所有缓存
 */
export const performanceClearCache: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getPerformanceManager();
  manager.clearCache();
  return { success: true };
};

/**
 * performance.clearGeometryCache - 清理几何体缓存
 */
export const performanceClearGeometryCache: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getPerformanceManager();
  manager.clearGeometryCache();
  return { success: true };
};

/**
 * performance.clearTextureCache - 清理纹理缓存
 */
export const performanceClearTextureCache: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getPerformanceManager();
  manager.clearTextureCache();
  return { success: true };
};

/**
 * performance.preloadURDF - 预加载 URDF
 */
export const performancePreloadURDF: MethodHandler<
  { url: string },
  { success: boolean }
> = async (params) => {
  const manager = getPerformanceManager();
  await manager.preloadURDF(params.url);
  return { success: true };
};

/**
 * performance.preloadPointCloud - 预加载点云
 */
export const performancePreloadPointCloud: MethodHandler<
  { url: string },
  { success: boolean }
> = async (params) => {
  const manager = getPerformanceManager();
  await manager.preloadPointCloud(params.url);
  return { success: true };
};

/**
 * performance.disposeUnused - 释放未使用的资源
 */
export const performanceDisposeUnused: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getPerformanceManager();
  manager.disposeUnused();
  return { success: true };
};

// ============================================================================
// Quality Handlers
// ============================================================================

/**
 * performance.enableAdaptiveQuality - 启用自适应质量
 */
export const performanceEnableAdaptiveQuality: MethodHandler<
  { targetFPS?: number },
  { success: boolean }
> = (params) => {
  const manager = getPerformanceManager();
  manager.enableAdaptiveQuality(params.targetFPS);
  return { success: true };
};

/**
 * performance.disableAdaptiveQuality - 禁用自适应质量
 */
export const performanceDisableAdaptiveQuality: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getPerformanceManager();
  manager.disableAdaptiveQuality();
  return { success: true };
};

/**
 * performance.setQualityLevel - 设置质量等级
 */
export const performanceSetQualityLevel: MethodHandler<
  { level: number },
  { success: boolean }
> = (params) => {
  const manager = getPerformanceManager();
  manager.setQualityLevel(params.level);
  return { success: true };
};

/**
 * performance.getQualityLevel - 获取质量等级
 */
export const performanceGetQualityLevel: MethodHandler<
  Record<string, never>,
  { level: number }
> = () => {
  const manager = getPerformanceManager();
  return { level: manager.getQualityLevel() };
};

// ============================================================================
// Profiling Handlers
// ============================================================================

/**
 * performance.startProfiling - 开始性能分析
 */
export const performanceStartProfiling: MethodHandler<
  Record<string, never>,
  { success: boolean }
> = () => {
  const manager = getPerformanceManager();
  manager.startProfiling();
  return { success: true };
};

/**
 * performance.stopProfiling - 停止性能分析
 */
export const performanceStopProfiling: MethodHandler<
  Record<string, never>,
  { profile: PerformanceProfile }
> = () => {
  const manager = getPerformanceManager();
  return { profile: manager.stopProfiling() };
};

/**
 * performance.getBottlenecks - 获取性能瓶颈
 */
export const performanceGetBottlenecks: MethodHandler<
  Record<string, never>,
  { bottlenecks: PerformanceBottleneck[] }
> = () => {
  const manager = getPerformanceManager();
  return { bottlenecks: manager.getBottlenecks() };
};

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * 注册所有性能处理器到 dispatcher
 *
 * 使用类型安全的逐个注册方式
 */
export function registerPerformanceHandlers(
  register: <TParams, TResult>(method: string, handler: MethodHandler<TParams, TResult>) => void
): void {
  // Configuration
  register('performance.setConfig', performanceSetConfig);
  register('performance.getConfig', performanceGetConfig);
  register('performance.resetConfig', performanceResetConfig);

  // Metrics
  register('performance.getMetrics', performanceGetMetrics);
  register('performance.getRenderStats', performanceGetRenderStats);
  register('performance.getMemoryStats', performanceGetMemoryStats);
  register('performance.getNetworkStats', performanceGetNetworkStats);

  // Monitoring
  register('performance.startMonitoring', performanceStartMonitoring);
  register('performance.stopMonitoring', performanceStopMonitoring);

  // Resource management
  register('performance.clearCache', performanceClearCache);
  register('performance.clearGeometryCache', performanceClearGeometryCache);
  register('performance.clearTextureCache', performanceClearTextureCache);
  register('performance.preloadURDF', performancePreloadURDF);
  register('performance.preloadPointCloud', performancePreloadPointCloud);
  register('performance.disposeUnused', performanceDisposeUnused);

  // Quality
  register('performance.enableAdaptiveQuality', performanceEnableAdaptiveQuality);
  register('performance.disableAdaptiveQuality', performanceDisableAdaptiveQuality);
  register('performance.setQualityLevel', performanceSetQualityLevel);
  register('performance.getQualityLevel', performanceGetQualityLevel);

  // Profiling
  register('performance.startProfiling', performanceStartProfiling);
  register('performance.stopProfiling', performanceStopProfiling);
  register('performance.getBottlenecks', performanceGetBottlenecks);
}
