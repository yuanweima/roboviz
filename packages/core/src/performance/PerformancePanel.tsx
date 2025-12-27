/**
 * PerformancePanel Component
 *
 * Real-time performance monitoring panel for RoboViz.
 * Displays FPS, frame time, draw calls, memory usage, and bottleneck warnings.
 *
 * Features:
 * - Real-time metrics display (FPS, frame time, draw calls, triangles)
 * - Memory usage statistics (JS heap, GPU estimate)
 * - Current LOD level and quality indicator
 * - Bottleneck detection with warnings
 * - Collapsible panel with corner positioning
 * - Cache clearing button
 * - Hidden by default (opt-in via showPerformancePanel prop)
 */

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPerformanceManager } from './performance-manager';
import type { PerformanceMetrics, PerformanceBottleneck } from './types';

// ============================================================================
// Types
// ============================================================================

export type PanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface PerformancePanelProps {
  /** Whether to show the panel (default: false) */
  visible?: boolean;

  /** Panel position (default: 'top-right') */
  position?: PanelPosition;

  /** Update interval in milliseconds (default: 1000) */
  updateInterval?: number;

  /** Whether the panel is initially collapsed (default: false) */
  initiallyCollapsed?: boolean;

  /** Custom styles to override default panel styles */
  style?: React.CSSProperties;

  /** Custom class name for the panel */
  className?: string;

  /** Callback when metrics update */
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

function getLODLabel(level: number): string {
  switch (level) {
    case 0: return 'High';
    case 1: return 'Medium';
    case 2: return 'Low';
    case 3: return 'Very Low';
    default: return 'Unknown';
  }
}

function getFPSColor(fps: number, targetFPS: number): string {
  const ratio = fps / targetFPS;
  if (ratio >= 0.9) return '#4ade80'; // green
  if (ratio >= 0.6) return '#fbbf24'; // yellow
  return '#ef4444'; // red
}

function getQualityColor(quality: number): string {
  if (quality >= 0.75) return '#4ade80'; // green
  if (quality >= 0.5) return '#fbbf24'; // yellow
  return '#ef4444'; // red
}

function getSeverityColor(severity: number): string {
  if (severity >= 0.7) return '#ef4444'; // red
  if (severity >= 0.4) return '#fbbf24'; // yellow
  return '#60a5fa'; // blue
}

// ============================================================================
// Styles
// ============================================================================

const getPositionStyles = (position: PanelPosition): React.CSSProperties => {
  const base: React.CSSProperties = { position: 'absolute' };
  switch (position) {
    case 'top-left':
      return { ...base, top: 8, left: 8 };
    case 'top-right':
      return { ...base, top: 8, right: 8 };
    case 'bottom-left':
      return { ...base, bottom: 8, left: 8 };
    case 'bottom-right':
      return { ...base, bottom: 8, right: 8 };
  }
};

const panelStyles: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  color: '#e2e8f0',
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  fontSize: '11px',
  lineHeight: 1.4,
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  zIndex: 9999,
  minWidth: 200,
  maxWidth: 280,
  userSelect: 'none',
  overflow: 'hidden',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 10px',
  backgroundColor: 'rgba(30, 41, 59, 0.8)',
  borderBottom: '1px solid rgba(71, 85, 105, 0.5)',
  cursor: 'pointer',
};

const contentStyles: React.CSSProperties = {
  padding: '8px 10px',
};

const sectionStyles: React.CSSProperties = {
  marginBottom: 8,
};

const sectionTitleStyles: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 4,
};

const rowStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '2px 0',
};

const labelStyles: React.CSSProperties = {
  color: '#94a3b8',
};

const valueStyles: React.CSSProperties = {
  fontWeight: 500,
};

const buttonStyles: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: 'rgba(59, 130, 246, 0.3)',
  color: '#60a5fa',
  border: '1px solid rgba(59, 130, 246, 0.5)',
  borderRadius: 4,
  fontSize: '10px',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const warningStyles: React.CSSProperties = {
  padding: '6px 8px',
  marginTop: 4,
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: 4,
  fontSize: '10px',
};

// ============================================================================
// Component
// ============================================================================

/**
 * PerformancePanel - Real-time performance monitoring overlay
 *
 * @example
 * ```tsx
 * <RoboVizCore>
 *   <PerformancePanel visible={showDebug} position="top-right" />
 * </RoboVizCore>
 * ```
 */
export function PerformancePanel({
  visible = false,
  position = 'top-right',
  updateInterval = 1000,
  initiallyCollapsed = false,
  style,
  className,
  onMetricsUpdate,
}: PerformancePanelProps): React.JSX.Element | null {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<PerformanceBottleneck[]>([]);

  const performanceManager = useMemo(() => getPerformanceManager(), []);

  // Subscribe to metrics updates
  useEffect(() => {
    if (!visible) return;

    performanceManager.startMonitoring(updateInterval);

    const unsubscribe = performanceManager.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
      setBottlenecks(performanceManager.getBottlenecks());
      onMetricsUpdate?.(newMetrics);
    });

    // Initial metrics fetch
    setMetrics(performanceManager.getMetrics());
    setBottlenecks(performanceManager.getBottlenecks());

    return () => {
      unsubscribe();
      performanceManager.stopMonitoring();
    };
  }, [visible, updateInterval, performanceManager, onMetricsUpdate]);

  const handleClearCache = useCallback(() => {
    performanceManager.clearCache();
  }, [performanceManager]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  const targetFPS = 60;

  return (
    <div
      style={{
        ...panelStyles,
        ...getPositionStyles(position),
        ...style,
      }}
      className={className}
    >
      {/* Header */}
      <div style={headerStyles} onClick={handleToggleCollapse}>
        <span style={{ fontWeight: 600, fontSize: '12px' }}>Performance</span>
        <span style={{ color: '#64748b', fontSize: '10px' }}>
          {collapsed ? '+' : '-'}
        </span>
      </div>

      {/* Content */}
      {!collapsed && metrics && (
        <div style={contentStyles}>
          {/* Render Stats */}
          <div style={sectionStyles}>
            <div style={sectionTitleStyles}>Render</div>
            <div style={rowStyles}>
              <span style={labelStyles}>FPS</span>
              <span
                style={{
                  ...valueStyles,
                  color: getFPSColor(metrics.render.fps, targetFPS),
                }}
              >
                {metrics.render.fps.toFixed(1)}
              </span>
            </div>
            <div style={rowStyles}>
              <span style={labelStyles}>Frame Time</span>
              <span style={valueStyles}>{metrics.render.frameTime.toFixed(1)} ms</span>
            </div>
            <div style={rowStyles}>
              <span style={labelStyles}>Draw Calls</span>
              <span style={valueStyles}>{formatNumber(metrics.render.drawCalls)}</span>
            </div>
            <div style={rowStyles}>
              <span style={labelStyles}>Triangles</span>
              <span style={valueStyles}>{formatNumber(metrics.render.triangles)}</span>
            </div>
          </div>

          {/* Memory Stats */}
          <div style={sectionStyles}>
            <div style={sectionTitleStyles}>Memory</div>
            <div style={rowStyles}>
              <span style={labelStyles}>JS Heap</span>
              <span style={valueStyles}>
                {formatBytes(metrics.memory.usedJSHeapSize)} /{' '}
                {formatBytes(metrics.memory.totalJSHeapSize)}
              </span>
            </div>
            <div style={rowStyles}>
              <span style={labelStyles}>GPU (est.)</span>
              <span style={valueStyles}>
                {formatBytes(metrics.memory.estimatedGPUMemory)}
              </span>
            </div>
            <div style={rowStyles}>
              <span style={labelStyles}>Cached</span>
              <span style={valueStyles}>
                {metrics.memory.cachedGeometries}G / {metrics.memory.cachedTextures}T
              </span>
            </div>
          </div>

          {/* Quality Stats */}
          <div style={sectionStyles}>
            <div style={sectionTitleStyles}>Quality</div>
            <div style={rowStyles}>
              <span style={labelStyles}>LOD Level</span>
              <span style={valueStyles}>{getLODLabel(metrics.currentLODLevel)}</span>
            </div>
            <div style={rowStyles}>
              <span style={labelStyles}>Quality</span>
              <span
                style={{
                  ...valueStyles,
                  color: getQualityColor(metrics.adaptiveQualityLevel),
                }}
              >
                {(metrics.adaptiveQualityLevel * 100).toFixed(0)}%
              </span>
            </div>
            {metrics.isDegraded && (
              <div
                style={{
                  color: '#fbbf24',
                  fontSize: '10px',
                  marginTop: 2,
                }}
              >
                Degraded mode active
              </div>
            )}
          </div>

          {/* Bottleneck Warnings */}
          {bottlenecks.length > 0 && (
            <div style={sectionStyles}>
              <div style={sectionTitleStyles}>Warnings</div>
              {bottlenecks.slice(0, 2).map((bottleneck, index) => (
                <div
                  key={index}
                  style={{
                    ...warningStyles,
                    borderColor: getSeverityColor(bottleneck.severity),
                    backgroundColor: `${getSeverityColor(bottleneck.severity)}15`,
                  }}
                >
                  <div
                    style={{
                      color: getSeverityColor(bottleneck.severity),
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {bottleneck.type.toUpperCase()}
                  </div>
                  <div style={{ color: '#94a3b8' }}>{bottleneck.suggestion}</div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: 8 }}>
            <button
              style={buttonStyles}
              onClick={handleClearCache}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
              }}
            >
              Clear Cache
            </button>
          </div>
        </div>
      )}

      {/* Collapsed summary */}
      {collapsed && metrics && (
        <div style={{ padding: '6px 10px' }}>
          <span
            style={{
              color: getFPSColor(metrics.render.fps, targetFPS),
              fontWeight: 600,
            }}
          >
            {metrics.render.fps.toFixed(0)} FPS
          </span>
          <span style={{ color: '#64748b', marginLeft: 8 }}>
            {formatNumber(metrics.render.triangles)}
          </span>
        </div>
      )}
    </div>
  );
}

export default PerformancePanel;
