/**
 * RoboViz Performance Module
 *
 * 性能优化模块
 */

// Types
export type {
  LODStrategy,
  PerformanceConfig,
  RenderStats,
  MemoryStats,
  NetworkStats,
  PerformanceMetrics,
  IPerformanceManager,
  PerformanceProfile,
  PerformanceBottleneck,
  WorkerMessageType,
  WorkerMessage,
  WorkerProgressMessage,
  WorkerErrorMessage,
} from './types';

// Constants
export { DEFAULT_PERFORMANCE_CONFIG } from './types';

// Performance Manager
export {
  PerformanceManager,
  createPerformanceManager,
  getPerformanceManager,
  resetPerformanceManager,
} from './performance-manager';

// Performance Panel Component
export {
  PerformancePanel,
  type PerformancePanelProps,
  type PanelPosition,
} from './PerformancePanel';

// Performance Integration Hook
export {
  usePerformanceIntegration,
  type UsePerformanceIntegrationOptions,
} from './usePerformanceIntegration';
