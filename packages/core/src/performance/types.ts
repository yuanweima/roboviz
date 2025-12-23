/**
 * RoboViz Performance Types
 *
 * 性能优化相关类型定义
 */

// ============================================================================
// Performance Configuration
// ============================================================================

/**
 * LOD 策略
 */
export type LODStrategy = 'distance' | 'screenSize' | 'manual' | 'none';

/**
 * 性能配置
 */
export interface PerformanceConfig {
  // Web Worker
  /** 是否使用 Worker 进行 URDF 解析 */
  useWorkerForParsing: boolean;

  /** 是否使用 Worker 进行点云处理 */
  useWorkerForPointCloud: boolean;

  /** 是否使用 Worker 进行轨迹计算 */
  useWorkerForTrajectory: boolean;

  // LOD (Level of Detail)
  /** 是否启用 LOD */
  lodEnabled: boolean;

  /** LOD 策略 */
  lodStrategy: LODStrategy;

  /** LOD 切换距离阈值 [近, 中, 远] (米) */
  lodDistances: [number, number, number];

  /** LOD 质量等级对应的三角形比例 */
  lodQualityLevels: [number, number, number, number];  // [高, 中, 低, 极低]

  // 渲染优化
  /** 最大可见机器人数量 */
  maxVisibleRobots: number;

  /** 最大可见点云点数 */
  maxVisiblePointCloudPoints: number;

  /** 是否启用视锥体剔除 */
  frustumCulling: boolean;

  /** 是否启用遮挡剔除 */
  occlusionCulling: boolean;

  /** 是否启用实例化渲染 */
  useInstancing: boolean;

  // 轨迹优化
  /** 轨迹降采样阈值 (点数) */
  trajectoryDownsampleThreshold: number;

  /** 轨迹降采样因子 */
  trajectoryDownsampleFactor: number;

  /** 轨迹线段最大数量 */
  maxTrajectorySegments: number;

  // 内存管理
  /** 最大缓存 URDF 数量 */
  maxCachedURDFs: number;

  /** 最大缓存点云数量 */
  maxCachedPointClouds: number;

  /** 是否自动释放未使用的几何体 */
  autoDisposeUnusedGeometry: boolean;

  /** 几何体缓存过期时间 (ms) */
  geometryCacheExpiry: number;

  // 帧率控制
  /** 目标帧率 */
  targetFPS: number;

  /** 是否启用自适应质量 */
  adaptiveQuality: boolean;

  /** 自适应质量的最低帧率阈值 */
  adaptiveMinFPS: number;

  /** 是否启用帧率限制 */
  enableFrameRateLimit: boolean;
}

/**
 * 默认性能配置
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  useWorkerForParsing: true,
  useWorkerForPointCloud: true,
  useWorkerForTrajectory: false,

  lodEnabled: true,
  lodStrategy: 'distance',
  lodDistances: [5, 15, 30],
  lodQualityLevels: [1.0, 0.5, 0.25, 0.1],

  maxVisibleRobots: 10,
  maxVisiblePointCloudPoints: 1000000,
  frustumCulling: true,
  occlusionCulling: false,
  useInstancing: true,

  trajectoryDownsampleThreshold: 10000,
  trajectoryDownsampleFactor: 4,
  maxTrajectorySegments: 5000,

  maxCachedURDFs: 10,
  maxCachedPointClouds: 5,
  autoDisposeUnusedGeometry: true,
  geometryCacheExpiry: 300000,  // 5 minutes

  targetFPS: 60,
  adaptiveQuality: true,
  adaptiveMinFPS: 30,
  enableFrameRateLimit: true,
};

// ============================================================================
// Performance Metrics
// ============================================================================

/**
 * 渲染统计
 */
export interface RenderStats {
  /** 帧率 */
  fps: number;

  /** 帧时间 (ms) */
  frameTime: number;

  /** 绘制调用次数 */
  drawCalls: number;

  /** 三角形数量 */
  triangles: number;

  /** 点数量 */
  points: number;

  /** 线段数量 */
  lines: number;

  /** 几何体数量 */
  geometries: number;

  /** 纹理数量 */
  textures: number;

  /** 着色器程序数量 */
  programs: number;
}

/**
 * 内存统计
 */
export interface MemoryStats {
  /** JS 堆已使用 (bytes) */
  usedJSHeapSize: number;

  /** JS 堆总大小 (bytes) */
  totalJSHeapSize: number;

  /** JS 堆限制 (bytes) */
  jsHeapSizeLimit: number;

  /** GPU 内存使用估计 (bytes) */
  estimatedGPUMemory: number;

  /** 缓存的几何体数量 */
  cachedGeometries: number;

  /** 缓存的纹理数量 */
  cachedTextures: number;

  /** 缓存的 URDF 数量 */
  cachedURDFs: number;

  /** 缓存的点云数量 */
  cachedPointClouds: number;
}

/**
 * 网络统计
 */
export interface NetworkStats {
  /** 活跃流数量 */
  activeStreams: number;

  /** 待处理请求数量 */
  pendingRequests: number;

  /** 接收字节数 */
  bytesReceived: number;

  /** 发送字节数 */
  bytesSent: number;

  /** 平均延迟 (ms) */
  averageLatency: number;

  /** 丢包率 */
  packetLoss: number;
}

/**
 * 性能指标汇总
 */
export interface PerformanceMetrics {
  /** 时间戳 */
  timestamp: number;

  /** 渲染统计 */
  render: RenderStats;

  /** 内存统计 */
  memory: MemoryStats;

  /** 网络统计 */
  network: NetworkStats;

  /** 当前 LOD 等级 */
  currentLODLevel: number;

  /** 自适应质量等级 (0-1) */
  adaptiveQualityLevel: number;

  /** 是否处于降级模式 */
  isDegraded: boolean;
}

// ============================================================================
// Performance Manager Types
// ============================================================================

/**
 * 性能管理器接口
 */
export interface IPerformanceManager {
  // 配置
  setConfig(config: Partial<PerformanceConfig>): void;
  getConfig(): PerformanceConfig;
  resetConfig(): void;

  // 监控
  getMetrics(): PerformanceMetrics;
  getRenderStats(): RenderStats;
  getMemoryStats(): MemoryStats;
  getNetworkStats(): NetworkStats;

  // 实时监控
  startMonitoring(interval?: number): void;
  stopMonitoring(): void;
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void;

  // 资源管理
  clearCache(): void;
  clearGeometryCache(): void;
  clearTextureCache(): void;
  preloadURDF(url: string): Promise<void>;
  preloadPointCloud(url: string): Promise<void>;
  disposeUnused(): void;

  // 自适应质量
  enableAdaptiveQuality(targetFPS?: number): void;
  disableAdaptiveQuality(): void;
  setQualityLevel(level: number): void;  // 0-1
  getQualityLevel(): number;

  // 性能分析
  startProfiling(): void;
  stopProfiling(): PerformanceProfile;
  getBottlenecks(): PerformanceBottleneck[];
}

/**
 * 性能分析结果
 */
export interface PerformanceProfile {
  /** 分析时长 (ms) */
  duration: number;

  /** 帧数 */
  frameCount: number;

  /** 平均帧时间 (ms) */
  averageFrameTime: number;

  /** 最大帧时间 (ms) */
  maxFrameTime: number;

  /** 最小帧时间 (ms) */
  minFrameTime: number;

  /** 帧时间分布 */
  frameTimeHistogram: number[];

  /** 各阶段耗时 */
  phaseTimings: {
    update: number;
    render: number;
    postProcess: number;
  };

  /** 内存变化 */
  memoryDelta: number;

  /** GC 次数 (如果可检测) */
  gcCount?: number;
}

/**
 * 性能瓶颈
 */
export interface PerformanceBottleneck {
  /** 瓶颈类型 */
  type: 'cpu' | 'gpu' | 'memory' | 'network' | 'gc';

  /** 严重程度 (0-1) */
  severity: number;

  /** 描述 */
  description: string;

  /** 建议 */
  suggestion: string;

  /** 相关指标 */
  relatedMetrics: Record<string, number>;
}

// ============================================================================
// Worker Types
// ============================================================================

/**
 * Worker 消息类型
 */
export type WorkerMessageType =
  | 'parse_urdf'
  | 'parse_pointcloud'
  | 'downsample_pointcloud'
  | 'compute_normals'
  | 'generate_lod'
  | 'result'
  | 'error'
  | 'progress';

/**
 * Worker 消息
 */
export interface WorkerMessage<T = unknown> {
  type: WorkerMessageType;
  id: string;
  data: T;
}

/**
 * Worker 进度消息
 */
export interface WorkerProgressMessage extends WorkerMessage {
  type: 'progress';
  data: {
    progress: number;  // 0-1
    stage: string;
  };
}

/**
 * Worker 错误消息
 */
export interface WorkerErrorMessage extends WorkerMessage {
  type: 'error';
  data: {
    code: string;
    message: string;
    stack?: string;
  };
}
