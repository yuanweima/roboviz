/**
 * CollisionVisualizer Component
 *
 * Main component for visualizing collision detection results.
 * Integrates safety zones, collision geometries, and contact points.
 */

import * as React from 'react';
import { useMemo, useEffect, useState } from 'react';
import type {
  CollisionResult,
  CollisionPair,
  SafetyZone as SafetyZoneType,
  SafetyZoneTriggerState,
  CollisionVisualizationConfig,
  CollisionGeometry,
  SafetyLevel,
} from '../../collision/types';
import { DEFAULT_COLLISION_VISUALIZATION } from '../../collision/types';
import type { Transform } from '../../types';
import { SafetyZone, SafetyZoneList } from './SafetyZone';
import { CollisionGeometryVisual, CollisionGeometryList } from './CollisionGeometryVisual';
import { ContactPointList, CollisionIndicator } from './ContactPointVisual';

// ============================================================================
// Props
// ============================================================================

export interface CollisionVisualizerProps {
  /** Collision detection result */
  collisionResult?: CollisionResult;
  /** Safety zones to display */
  safetyZones?: SafetyZoneType[];
  /** Safety zone trigger states */
  safetyZoneTriggerStates?: SafetyZoneTriggerState[];
  /** Collision geometries to display */
  collisionGeometries?: Array<{
    geometry: CollisionGeometry;
    transform: Transform;
    enabled?: boolean;
  }>;
  /** Visualization configuration */
  config?: Partial<CollisionVisualizationConfig>;
  /** Whether collision visualization is enabled */
  enabled?: boolean;
  /** Callback when a safety zone is clicked */
  onSafetyZoneClick?: (zone: SafetyZoneType) => void;
  /** Callback when a collision geometry is clicked */
  onGeometryClick?: (geometry: CollisionGeometry) => void;
}

export interface CollisionOverlayProps {
  /** Whether there is an active collision */
  hasCollision: boolean;
  /** Current safety level (highest active) */
  safetyLevel?: SafetyLevel;
  /** Whether to show warning overlay */
  showOverlay?: boolean;
}

// ============================================================================
// CollisionVisualizer Component
// ============================================================================

/**
 * Main collision visualization component that integrates all collision-related visuals
 */
export function CollisionVisualizer({
  collisionResult,
  safetyZones = [],
  safetyZoneTriggerStates = [],
  collisionGeometries = [],
  config: configOverride,
  enabled = true,
  onSafetyZoneClick,
  onGeometryClick,
}: CollisionVisualizerProps): React.JSX.Element | null {
  // Merge config with defaults
  const config: CollisionVisualizationConfig = useMemo(
    () => ({
      ...DEFAULT_COLLISION_VISUALIZATION,
      ...configOverride,
    }),
    [configOverride]
  );

  // Build triggered zones map
  const triggeredZonesMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    safetyZoneTriggerStates.forEach((state) => {
      map[state.zoneId] = state.triggered;
    });
    return map;
  }, [safetyZoneTriggerStates]);

  // Build colliding geometry IDs set
  const collidingGeometryIds = useMemo(() => {
    const ids = new Set<string>();
    if (collisionResult?.pairs) {
      collisionResult.pairs.forEach((pair) => {
        ids.add(pair.objectA.id);
        ids.add(pair.objectB.id);
      });
    }
    return ids;
  }, [collisionResult]);

  if (!enabled) {
    return null;
  }

  return (
    <group name="collision-visualizer">
      {/* Safety Zones */}
      {config.showSafetyZones && safetyZones.length > 0 && (
        <SafetyZoneList
          zones={safetyZones}
          triggeredZones={triggeredZonesMap}
          levelColors={config.safetyLevelColors}
          onZoneClick={onSafetyZoneClick}
        />
      )}

      {/* Collision Geometries */}
      {config.showCollisionGeometry && collisionGeometries.length > 0 && (
        <CollisionGeometryList
          geometries={collisionGeometries}
          collidingIds={collidingGeometryIds}
          color={config.collisionGeometryColor}
          collidingColor={config.collisionHighlightColor}
          opacity={config.collisionGeometryOpacity}
          showWireframe={true}
          showFill={true}
        />
      )}

      {/* Contact Points */}
      {config.showContactPoints && collisionResult?.pairs && collisionResult.pairs.length > 0 && (
        <ContactPointList
          collisionPairs={collisionResult.pairs}
          pointSize={config.contactPointSize / 1000} // Convert from px-like to meters
          pointColor={config.contactPointColor}
          showPenetrationVectors={config.showPenetrationVectors}
          vectorColor={config.penetrationVectorColor}
          animate={config.collisionHighlightAnimation !== 'none'}
        />
      )}

      {/* Collision Indicators */}
      {config.highlightCollisions &&
        collisionResult?.pairs.map((pair, index) => {
          if (!pair.contactPoint) return null;
          return (
            <CollisionIndicator
              key={`collision-indicator-${index}`}
              position={pair.contactPoint}
              severity={pair.penetrationDepth && pair.penetrationDepth > 0.01 ? 'high' : 'medium'}
            />
          );
        })}
    </group>
  );
}

// ============================================================================
// useCollisionVisualization Hook
// ============================================================================

export interface UseCollisionVisualizationOptions {
  /** Initial configuration */
  initialConfig?: Partial<CollisionVisualizationConfig>;
  /** Whether initially enabled */
  initialEnabled?: boolean;
}

export interface UseCollisionVisualizationReturn {
  /** Current configuration */
  config: CollisionVisualizationConfig;
  /** Whether visualization is enabled */
  enabled: boolean;
  /** Update configuration */
  setConfig: (config: Partial<CollisionVisualizationConfig>) => void;
  /** Toggle enabled state */
  setEnabled: (enabled: boolean) => void;
  /** Reset to defaults */
  reset: () => void;
}

/**
 * Hook for managing collision visualization state
 */
export function useCollisionVisualization(
  options: UseCollisionVisualizationOptions = {}
): UseCollisionVisualizationReturn {
  const { initialConfig, initialEnabled = true } = options;

  const [config, setConfigState] = useState<CollisionVisualizationConfig>({
    ...DEFAULT_COLLISION_VISUALIZATION,
    ...initialConfig,
  });
  const [enabled, setEnabled] = useState(initialEnabled);

  const setConfig = (updates: Partial<CollisionVisualizationConfig>) => {
    setConfigState((prev) => ({ ...prev, ...updates }));
  };

  const reset = () => {
    setConfigState({ ...DEFAULT_COLLISION_VISUALIZATION, ...initialConfig });
    setEnabled(initialEnabled);
  };

  return {
    config,
    enabled,
    setConfig,
    setEnabled,
    reset,
  };
}

// ============================================================================
// CollisionStatusBadge Component (HTML overlay)
// ============================================================================

export interface CollisionStatusBadgeProps {
  /** Whether there is an active collision */
  hasCollision: boolean;
  /** Number of collision pairs */
  collisionCount?: number;
  /** Highest triggered safety level */
  highestSafetyLevel?: SafetyLevel;
  /** Custom class name */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

/**
 * HTML overlay badge showing collision status
 * Should be rendered outside the Canvas
 */
export function CollisionStatusBadge({
  hasCollision,
  collisionCount = 0,
  highestSafetyLevel,
  className,
  style,
}: CollisionStatusBadgeProps): React.JSX.Element {
  const levelColors: Record<SafetyLevel, string> = {
    info: '#00bfff',
    warning: '#ffa500',
    danger: '#ff4500',
    stop: '#ff0000',
  };

  const backgroundColor = hasCollision
    ? highestSafetyLevel
      ? levelColors[highestSafetyLevel]
      : '#ff4500'
    : '#00ff00';

  const defaultStyle: React.CSSProperties = {
    position: 'fixed',
    top: 10,
    right: 10,
    padding: '8px 16px',
    borderRadius: 4,
    backgroundColor,
    color: 'white',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    zIndex: 1000,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    ...style,
  };

  return (
    <div className={className} style={defaultStyle}>
      {hasCollision ? (
        <>
          ⚠️ COLLISION ({collisionCount})
          {highestSafetyLevel && ` - ${highestSafetyLevel.toUpperCase()}`}
        </>
      ) : (
        '✓ NO COLLISION'
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default CollisionVisualizer;
