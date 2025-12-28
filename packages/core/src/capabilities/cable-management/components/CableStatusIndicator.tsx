/**
 * Cable Status Indicator
 *
 * Compact status indicator showing overall cable health.
 */

import React, { useMemo, useState } from 'react';
import {
  useCableManagement,
  useAllCableStates,
  useCableWarningLevel,
} from '../CableManagementContext';
import { WARNING_LEVEL_COLORS } from '../constants';
import type { CableWarningLevel } from '../types';

// ============================================================
// Types
// ============================================================

export interface CableStatusIndicatorProps {
  /** Show expanded details on hover/click */
  expandable?: boolean;

  /** Position in viewport */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  /** Custom style */
  style?: React.CSSProperties;

  /** On click callback */
  onClick?: () => void;
}

// ============================================================
// Main Component
// ============================================================

export function CableStatusIndicator({
  expandable = true,
  position = 'top-right',
  style,
  onClick,
}: CableStatusIndicatorProps) {
  const { state, actions } = useCableManagement();
  const cableStates = useAllCableStates();
  const maxWarningLevel = useCableWarningLevel();
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColor = WARNING_LEVEL_COLORS[maxWarningLevel];
  const cableCount = state.cables.size;

  // Calculate summary stats
  const stats = useMemo(() => {
    let totalTwist = 0;
    let maxTwist = 0;
    let criticalCount = 0;
    let warningCount = 0;

    cableStates.forEach((cableState) => {
      const absTwist = Math.abs(cableState.currentTwist);
      totalTwist += absTwist;
      maxTwist = Math.max(maxTwist, absTwist);

      if (cableState.warningLevel === 'critical') criticalCount++;
      else if (cableState.warningLevel === 'warning') warningCount++;
    });

    return {
      totalTwist,
      maxTwist,
      criticalCount,
      warningCount,
      avgTwist: cableCount > 0 ? totalTwist / cableCount : 0,
    };
  }, [cableStates, cableCount]);

  // Position styles
  const positionStyles: React.CSSProperties = {
    position: 'absolute',
    ...(position.includes('top') ? { top: 16 } : { bottom: 16 }),
    ...(position.includes('left') ? { left: 16 } : { right: 16 }),
  };

  const handleClick = () => {
    if (expandable) {
      setIsExpanded(!isExpanded);
    }
    onClick?.();
  };

  return (
    <div
      style={{
        ...positionStyles,
        zIndex: 1000,
        ...style,
      }}
    >
      {/* Main indicator button */}
      <button
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.85)',
          border: `2px solid ${statusColor}`,
          borderRadius: 8,
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 13,
          cursor: expandable ? 'pointer' : 'default',
          transition: 'all 0.2s',
          boxShadow: `0 2px 8px ${statusColor}40`,
        }}
      >
        {/* Status icon */}
        <StatusIcon level={maxWarningLevel} />

        {/* Cable info */}
        <span>
          Cable{cableCount !== 1 ? 's' : ''}: {cableCount}
        </span>

        {/* Max twist */}
        <span style={{ color: statusColor, fontWeight: 'bold' }}>
          {((stats.maxTwist * 180) / Math.PI).toFixed(0)}°
        </span>

        {/* Expand indicator */}
        {expandable && (
          <span style={{ opacity: 0.6, fontSize: 10 }}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <ExpandedPanel
          cableStates={cableStates}
          cables={state.cables}
          stats={stats}
          onResetAll={() => actions.resetAllTwists()}
        />
      )}
    </div>
  );
}

// ============================================================
// Status Icon
// ============================================================

interface StatusIconProps {
  level: CableWarningLevel;
  size?: number;
}

function StatusIcon({ level, size = 16 }: StatusIconProps) {
  const color = WARNING_LEVEL_COLORS[level];

  if (level === 'safe') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
        <path
          d="M8 12l3 3 5-5"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (level === 'caution') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
        <line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill={color} />
      </svg>
    );
  }

  // Warning or critical
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L2 22h20L12 2z"
        stroke={color}
        strokeWidth="2"
        fill={level === 'critical' ? color : 'none'}
        strokeLinejoin="round"
      />
      {level !== 'critical' && (
        <>
          <line x1="12" y1="10" x2="12" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1" fill={color} />
        </>
      )}
      {level === 'critical' && (
        <>
          <line x1="12" y1="10" x2="12" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1" fill="white" />
        </>
      )}
    </svg>
  );
}

// ============================================================
// Expanded Panel
// ============================================================

interface ExpandedPanelProps {
  cableStates: Map<string, { cableId: string; currentTwist: number; warningLevel: CableWarningLevel }>;
  cables: Map<string, { id: string; properties: { label?: string; color: string } }>;
  stats: {
    totalTwist: number;
    maxTwist: number;
    avgTwist: number;
    criticalCount: number;
    warningCount: number;
  };
  onResetAll: () => void;
}

function ExpandedPanel({
  cableStates,
  cables,
  stats,
  onResetAll,
}: ExpandedPanelProps) {
  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        background: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 8,
        color: 'white',
        fontFamily: 'monospace',
        fontSize: 12,
        minWidth: 200,
      }}
    >
      {/* Stats */}
      <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ opacity: 0.7 }}>Max Twist:</span>
          <span style={{ fontWeight: 'bold' }}>
            {((stats.maxTwist * 180) / Math.PI).toFixed(1)}°
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ opacity: 0.7 }}>Avg Twist:</span>
          <span>{((stats.avgTwist * 180) / Math.PI).toFixed(1)}°</span>
        </div>
        {stats.criticalCount > 0 && (
          <div style={{ color: WARNING_LEVEL_COLORS.critical }}>
            ⚠ {stats.criticalCount} critical
          </div>
        )}
        {stats.warningCount > 0 && (
          <div style={{ color: WARNING_LEVEL_COLORS.warning }}>
            ⚠ {stats.warningCount} warning
          </div>
        )}
      </div>

      {/* Individual cables */}
      <div style={{ marginBottom: 12 }}>
        {Array.from(cableStates.entries()).map(([id, state]) => {
          const cable = cables.get(id);
          const color = WARNING_LEVEL_COLORS[state.warningLevel];

          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: cable?.properties.color ?? '#888',
                  }}
                />
                <span>{cable?.properties.label ?? id}</span>
              </div>
              <span style={{ color, fontWeight: 'bold' }}>
                {((state.currentTwist * 180) / Math.PI).toFixed(0)}°
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <button
        onClick={onResetAll}
        style={{
          width: '100%',
          padding: '6px 12px',
          background: '#333',
          border: '1px solid #555',
          borderRadius: 4,
          color: 'white',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        Reset All Twists
      </button>
    </div>
  );
}

// ============================================================
// Inline Status Badge
// ============================================================

export interface CableStatusBadgeProps {
  cableId: string;
  style?: React.CSSProperties;
}

export function CableStatusBadge({ cableId, style }: CableStatusBadgeProps) {
  const { state } = useCableManagement();
  const cableState = state.cableStates.get(cableId);
  const cable = state.cables.get(cableId);

  if (!cableState || !cable) return null;

  const color = WARNING_LEVEL_COLORS[cableState.warningLevel];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        backgroundColor: `${color}20`,
        border: `1px solid ${color}`,
        borderRadius: 4,
        fontSize: 11,
        fontFamily: 'monospace',
        ...style,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      <span style={{ color }}>
        {((cableState.currentTwist * 180) / Math.PI).toFixed(0)}°
      </span>
    </span>
  );
}
