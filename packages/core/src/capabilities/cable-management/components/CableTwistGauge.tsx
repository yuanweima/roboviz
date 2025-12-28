/**
 * Cable Twist Gauge
 *
 * Visual gauge component showing cable twist state.
 * Can be used in 2D overlay or 3D scene.
 */

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useCableState, useCableConfig } from '../CableManagementContext';
import { WARNING_LEVEL_COLORS, VISUALIZATION_CONSTANTS } from '../constants';
import type { CableWarningLevel } from '../types';

// ============================================================
// Types
// ============================================================

export interface CableTwistGaugeProps {
  /** Cable ID to display */
  cableId: string;

  /** 3D position (for 3D mode) */
  position?: [number, number, number];

  /** Display mode */
  mode?: '2d' | '3d';

  /** Gauge size */
  size?: 'small' | 'medium' | 'large';

  /** Show label */
  showLabel?: boolean;

  /** Custom style override */
  style?: React.CSSProperties;
}

// ============================================================
// Helper Functions
// ============================================================

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
}

// ============================================================
// Main Component
// ============================================================

export function CableTwistGauge({
  cableId,
  position = [0, 0, 0],
  mode = '2d',
  size = 'medium',
  showLabel = true,
  style,
}: CableTwistGaugeProps) {
  const cableState = useCableState(cableId);
  const cableConfig = useCableConfig(cableId);

  const { width, height } = VISUALIZATION_CONSTANTS.GAUGE_SIZES[size];

  const gaugeData = useMemo(() => {
    if (!cableState || !cableConfig) {
      return {
        angle: 0,
        percentage: 0,
        color: WARNING_LEVEL_COLORS.safe,
        twistDegrees: '0.0',
        direction: 0 as const,
        warningLevel: 'safe' as CableWarningLevel,
      };
    }

    const maxTwist = cableConfig.twistConstraints.maxTwist;
    const currentTwist = cableState.currentTwist;
    const percentage = Math.min(100, (Math.abs(currentTwist) / maxTwist) * 100);

    // Map twist to gauge angle (-135 to 135 degrees)
    const normalizedTwist = currentTwist / maxTwist;
    const angle = Math.max(-135, Math.min(135, normalizedTwist * 135));

    return {
      angle,
      percentage,
      color: WARNING_LEVEL_COLORS[cableState.warningLevel],
      twistDegrees: ((currentTwist * 180) / Math.PI).toFixed(1),
      direction: cableState.twistDirection,
      warningLevel: cableState.warningLevel,
    };
  }, [cableState, cableConfig]);

  const GaugeContent = (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '50%',
        border: `3px solid ${gaugeData.color}`,
        color: 'white',
        fontFamily: 'monospace',
        boxShadow: `0 0 10px ${gaugeData.color}40`,
        ...style,
      }}
    >
      {/* SVG Gauge */}
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Background arc */}
        <path
          d={describeArc(width / 2, height / 2, width / 2 - 12, -135, 135)}
          fill="none"
          stroke="#333"
          strokeWidth="6"
        />

        {/* Value arc */}
        <path
          d={describeArc(
            width / 2,
            height / 2,
            width / 2 - 12,
            -135,
            -135 + (gaugeData.angle + 135)
          )}
          fill="none"
          stroke={gaugeData.color}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Warning markers */}
        <WarningMarkers width={width} height={height} />

        {/* Needle */}
        <line
          x1={width / 2}
          y1={height / 2}
          x2={
            width / 2 +
            Math.cos(((gaugeData.angle - 90) * Math.PI) / 180) * (width / 2 - 25)
          }
          y2={
            height / 2 +
            Math.sin(((gaugeData.angle - 90) * Math.PI) / 180) * (height / 2 - 25)
          }
          stroke="white"
          strokeWidth="2"
        />

        {/* Center dot */}
        <circle cx={width / 2} cy={height / 2} r="4" fill="white" />
      </svg>

      {/* Center display */}
      <div
        style={{
          textAlign: 'center',
          zIndex: 1,
          marginTop: height * 0.15,
        }}
      >
        <div
          style={{
            fontSize: size === 'small' ? 14 : size === 'medium' ? 18 : 24,
            fontWeight: 'bold',
            color: gaugeData.color,
          }}
        >
          {gaugeData.twistDegrees}°
        </div>
        <div
          style={{
            fontSize: size === 'small' ? 9 : size === 'medium' ? 11 : 14,
            opacity: 0.7,
          }}
        >
          {gaugeData.percentage.toFixed(0)}%
        </div>
      </div>

      {/* Direction indicator */}
      {gaugeData.direction !== 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: size === 'small' ? 6 : 10,
            fontSize: size === 'small' ? 9 : 11,
            opacity: 0.8,
          }}
        >
          {gaugeData.direction === 1 ? '↻ CW' : '↺ CCW'}
        </div>
      )}

      {/* Label */}
      {showLabel && cableConfig && (
        <div
          style={{
            position: 'absolute',
            top: -22,
            fontSize: size === 'small' ? 9 : 11,
            whiteSpace: 'nowrap',
            opacity: 0.9,
          }}
        >
          {cableConfig.properties.label || cableId}
        </div>
      )}

      {/* Warning indicator */}
      {gaugeData.warningLevel !== 'safe' && (
        <div
          style={{
            position: 'absolute',
            top: size === 'small' ? 6 : 10,
            right: size === 'small' ? 6 : 10,
            width: size === 'small' ? 8 : 10,
            height: size === 'small' ? 8 : 10,
            borderRadius: '50%',
            backgroundColor: gaugeData.color,
            animation: 'pulse 1s infinite',
          }}
        />
      )}
    </div>
  );

  // Add pulse animation style
  const styleElement = (
    <style>
      {`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}
    </style>
  );

  if (mode === '3d') {
    return (
      <Html position={position} center>
        {styleElement}
        {GaugeContent}
      </Html>
    );
  }

  return (
    <>
      {styleElement}
      {GaugeContent}
    </>
  );
}

// ============================================================
// Warning Markers Sub-component
// ============================================================

interface WarningMarkersProps {
  width: number;
  height: number;
}

function WarningMarkers({ width, height }: WarningMarkersProps) {
  const radius = width / 2 - 5;
  const cx = width / 2;
  const cy = height / 2;

  // Warning threshold at ~55% (-135 + 270*0.55 = 13.5°)
  // Critical threshold at ~80% (-135 + 270*0.8 = 81°)
  const warningAngle = -135 + 270 * 0.55;
  const criticalAngle = -135 + 270 * 0.8;

  return (
    <>
      {/* Warning marker */}
      <circle
        cx={cx + Math.cos(((warningAngle - 90) * Math.PI) / 180) * radius}
        cy={cy + Math.sin(((warningAngle - 90) * Math.PI) / 180) * radius}
        r="3"
        fill={WARNING_LEVEL_COLORS.caution}
      />
      {/* Critical marker */}
      <circle
        cx={cx + Math.cos(((criticalAngle - 90) * Math.PI) / 180) * radius}
        cy={cy + Math.sin(((criticalAngle - 90) * Math.PI) / 180) * radius}
        r="3"
        fill={WARNING_LEVEL_COLORS.warning}
      />
      {/* Negative warning marker */}
      <circle
        cx={cx + Math.cos(((-warningAngle - 90) * Math.PI) / 180) * radius}
        cy={cy + Math.sin(((-warningAngle - 90) * Math.PI) / 180) * radius}
        r="3"
        fill={WARNING_LEVEL_COLORS.caution}
      />
      {/* Negative critical marker */}
      <circle
        cx={cx + Math.cos(((-criticalAngle - 90) * Math.PI) / 180) * radius}
        cy={cy + Math.sin(((-criticalAngle - 90) * Math.PI) / 180) * radius}
        r="3"
        fill={WARNING_LEVEL_COLORS.warning}
      />
    </>
  );
}

// ============================================================
// Mini Gauge (Compact version)
// ============================================================

export interface CableTwistMiniGaugeProps {
  cableId: string;
  style?: React.CSSProperties;
}

export function CableTwistMiniGauge({ cableId, style }: CableTwistMiniGaugeProps) {
  const cableState = useCableState(cableId);
  const cableConfig = useCableConfig(cableId);

  if (!cableState || !cableConfig) {
    return null;
  }

  const maxTwist = cableConfig.twistConstraints.maxTwist;
  const percentage = Math.min(100, (Math.abs(cableState.currentTwist) / maxTwist) * 100);
  const color = WARNING_LEVEL_COLORS[cableState.warningLevel];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 12,
        color: 'white',
        ...style,
      }}
    >
      {/* Status dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />

      {/* Label */}
      <span style={{ opacity: 0.8 }}>
        {cableConfig.properties.label || cableId}
      </span>

      {/* Value */}
      <span style={{ fontWeight: 'bold', color }}>
        {((cableState.currentTwist * 180) / Math.PI).toFixed(0)}°
      </span>

      {/* Progress bar */}
      <div
        style={{
          width: 40,
          height: 4,
          backgroundColor: '#333',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.2s',
          }}
        />
      </div>
    </div>
  );
}
