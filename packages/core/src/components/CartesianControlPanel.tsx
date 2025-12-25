/**
 * CartesianControlPanel Component
 *
 * A debug panel for controlling robot end-effector pose in Cartesian space.
 * Integrates with trajx-wasm for real-time IK computation.
 *
 * Features:
 * - Position sliders (X, Y, Z)
 * - Orientation controls (Euler angles or Quaternion)
 * - IK solution selection (when multiple solutions available)
 * - Real-time reachability feedback
 * - Analytical vs Numerical IK indicator
 */

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRobotSolver } from '../kinematics/useTrajx';
import type { Pose } from '../types';
import type { MultiIkResult, IkResult } from '../kinematics/types';

// ============================================================================
// Types
// ============================================================================

export interface CartesianControlPanelProps {
  /** Robot ID for kinematics solver */
  robotId: string;
  /** Robot name from database */
  robotName: string;

  /** Initial target pose */
  initialPose?: Pose;
  /** Current joint angles (for IK seed) */
  currentJoints?: number[];

  /** Position limits */
  positionLimits?: {
    x: [number, number];
    y: [number, number];
    z: [number, number];
  };

  /** Whether to show orientation controls */
  showOrientation?: boolean;
  /** Use Euler angles instead of quaternion */
  useEulerAngles?: boolean;

  /** Called when IK solution is computed */
  onSolutionChange?: (joints: number[] | null, allSolutions: number[][] | null) => void;
  /** Called when target pose changes */
  onPoseChange?: (pose: Pose) => void;

  /** Panel style */
  style?: React.CSSProperties;
  /** Compact mode */
  compact?: boolean;
}

export interface CartesianControlPanelState {
  targetPose: Pose;
  ikResult: IkResult | null;
  allSolutions: MultiIkResult | null;
  selectedSolution: number;
  isComputing: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_POSE: Pose = {
  position: { x: 0.4, y: 0.3, z: 0.2 },
  orientation: { x: 0, y: 0, z: 0, w: 1 },
};

const DEFAULT_POSITION_LIMITS = {
  x: [-1, 1] as [number, number],
  y: [-1, 1] as [number, number],
  z: [-0.5, 1.5] as [number, number],
};

// ============================================================================
// Helper Functions
// ============================================================================

function eulerToQuaternion(roll: number, pitch: number, yaw: number): { x: number; y: number; z: number; w: number } {
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);

  return {
    w: cr * cp * cy + sr * sp * sy,
    x: sr * cp * cy - cr * sp * sy,
    y: cr * sp * cy + sr * cp * sy,
    z: cr * cp * sy - sr * sp * cy,
  };
}

function quaternionToEuler(q: { x: number; y: number; z: number; w: number }): { roll: number; pitch: number; yaw: number } {
  // Roll (x-axis rotation)
  const sinrCosp = 2 * (q.w * q.x + q.y * q.z);
  const cosrCosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  // Pitch (y-axis rotation)
  const sinp = 2 * (q.w * q.y - q.z * q.x);
  let pitch: number;
  if (Math.abs(sinp) >= 1) {
    pitch = Math.sign(sinp) * (Math.PI / 2);
  } else {
    pitch = Math.asin(sinp);
  }

  // Yaw (z-axis rotation)
  const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
  const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return { roll, pitch, yaw };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  color?: string;
}

function Slider({ label, value, min, max, step = 0.01, onChange, unit = '', color = '#4ecdc4' }: SliderProps) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#888', fontSize: '11px' }}>{label}</span>
        <span style={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace' }}>
          {value.toFixed(3)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          appearance: 'none',
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #333 ${((value - min) / (max - min)) * 100}%, #333 100%)`,
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

interface SolutionSelectorProps {
  solutions: number[][];
  selectedIndex: number;
  isAnalytical: boolean;
  onSelect: (index: number) => void;
}

function SolutionSelector({ solutions, selectedIndex, isAnalytical, onSelect }: SolutionSelectorProps) {
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: '#888', fontSize: '11px' }}>
          {solutions.length} Solution{solutions.length > 1 ? 's' : ''}
        </span>
        <span
          style={{
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '3px',
            background: isAnalytical ? '#00ff88' : '#ffaa00',
            color: '#000',
            fontWeight: 'bold',
          }}
        >
          {isAnalytical ? 'ANALYTICAL' : 'NUMERICAL'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {solutions.map((_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              padding: '4px 8px',
              border: 'none',
              borderRadius: '4px',
              background: i === selectedIndex ? '#4ecdc4' : '#333',
              color: i === selectedIndex ? '#000' : '#888',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: i === selectedIndex ? 'bold' : 'normal',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CartesianControlPanel({
  robotId,
  robotName,
  initialPose = DEFAULT_POSE,
  currentJoints,
  positionLimits = DEFAULT_POSITION_LIMITS,
  showOrientation = true,
  useEulerAngles = true,
  onSolutionChange,
  onPoseChange,
  style,
  compact = false,
}: CartesianControlPanelProps): React.JSX.Element {
  // State
  const [targetPose, setTargetPose] = useState<Pose>(initialPose);
  const [allSolutions, setAllSolutions] = useState<MultiIkResult | null>(null);
  const [selectedSolution, setSelectedSolution] = useState(0);
  const [isComputing, setIsComputing] = useState(false);

  // Euler angles for display
  const [euler, setEuler] = useState(() => quaternionToEuler(initialPose.orientation));

  // Solver
  const { ready, ik, ikAll } = useRobotSolver({
    robotId,
    robotName,
  });

  // Compute IK when target changes
  useEffect(() => {
    if (!ready || !ikAll) return;

    setIsComputing(true);
    const result = ikAll(targetPose, currentJoints);
    setIsComputing(false);

    if (result && result.success && result.solutions.length > 0) {
      setAllSolutions(result);
      // Keep selected index in bounds
      const newIndex = Math.min(selectedSolution, result.solutions.length - 1);
      setSelectedSolution(newIndex);
      onSolutionChange?.(result.solutions[newIndex], result.solutions);
    } else {
      setAllSolutions(null);
      onSolutionChange?.(null, null);
    }
  }, [ready, ikAll, targetPose, currentJoints, onSolutionChange]);

  // Update position
  const updatePosition = useCallback((axis: 'x' | 'y' | 'z', value: number) => {
    setTargetPose((prev) => ({
      ...prev,
      position: { ...prev.position, [axis]: value },
    }));
  }, []);

  // Update orientation from Euler
  const updateEuler = useCallback((axis: 'roll' | 'pitch' | 'yaw', value: number) => {
    setEuler((prev) => {
      const newEuler = { ...prev, [axis]: value };
      const quat = eulerToQuaternion(newEuler.roll, newEuler.pitch, newEuler.yaw);
      setTargetPose((prevPose) => ({
        ...prevPose,
        orientation: quat,
      }));
      return newEuler;
    });
  }, []);

  // Handle solution selection
  const handleSolutionSelect = useCallback((index: number) => {
    setSelectedSolution(index);
    if (allSolutions && allSolutions.solutions[index]) {
      onSolutionChange?.(allSolutions.solutions[index], allSolutions.solutions);
    }
  }, [allSolutions, onSolutionChange]);

  // Notify pose change
  useEffect(() => {
    onPoseChange?.(targetPose);
  }, [targetPose, onPoseChange]);

  // Status
  const status = useMemo(() => {
    if (!ready) return { text: 'Solver loading...', color: '#ffaa00' };
    if (isComputing) return { text: 'Computing...', color: '#ffaa00' };
    if (allSolutions && allSolutions.success) {
      return { text: 'Reachable', color: '#00ff88' };
    }
    return { text: 'Unreachable', color: '#ff4444' };
  }, [ready, isComputing, allSolutions]);

  return (
    <div
      style={{
        background: '#1a1a2e',
        borderRadius: '8px',
        padding: compact ? '12px' : '16px',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#4ecdc4', fontSize: compact ? '14px' : '16px' }}>
          Cartesian Control
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            background: '#252540',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: status.color,
            }}
          />
          <span style={{ color: status.color, fontSize: '11px', fontWeight: 'bold' }}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Position Controls */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: '#666', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}>
          Position (m)
        </div>
        <Slider
          label="X"
          value={targetPose.position.x}
          min={positionLimits.x[0]}
          max={positionLimits.x[1]}
          onChange={(v) => updatePosition('x', v)}
          color="#ff6b6b"
        />
        <Slider
          label="Y"
          value={targetPose.position.y}
          min={positionLimits.y[0]}
          max={positionLimits.y[1]}
          onChange={(v) => updatePosition('y', v)}
          color="#4ecdc4"
        />
        <Slider
          label="Z"
          value={targetPose.position.z}
          min={positionLimits.z[0]}
          max={positionLimits.z[1]}
          onChange={(v) => updatePosition('z', v)}
          color="#45b7d1"
        />
      </div>

      {/* Orientation Controls */}
      {showOrientation && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#666', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase' }}>
            Orientation (rad)
          </div>
          {useEulerAngles ? (
            <>
              <Slider
                label="Roll"
                value={euler.roll}
                min={-Math.PI}
                max={Math.PI}
                onChange={(v) => updateEuler('roll', v)}
                color="#ff9f43"
              />
              <Slider
                label="Pitch"
                value={euler.pitch}
                min={-Math.PI / 2}
                max={Math.PI / 2}
                onChange={(v) => updateEuler('pitch', v)}
                color="#a55eea"
              />
              <Slider
                label="Yaw"
                value={euler.yaw}
                min={-Math.PI}
                max={Math.PI}
                onChange={(v) => updateEuler('yaw', v)}
                color="#26de81"
              />
            </>
          ) : (
            <div style={{ color: '#888', fontSize: '11px', fontFamily: 'monospace' }}>
              q: [{targetPose.orientation.x.toFixed(3)}, {targetPose.orientation.y.toFixed(3)}, {targetPose.orientation.z.toFixed(3)}, {targetPose.orientation.w.toFixed(3)}]
            </div>
          )}
        </div>
      )}

      {/* Solution Selector */}
      {allSolutions && allSolutions.success && allSolutions.solutions.length > 0 && (
        <SolutionSelector
          solutions={allSolutions.solutions}
          selectedIndex={selectedSolution}
          isAnalytical={allSolutions.isAnalytical}
          onSelect={handleSolutionSelect}
        />
      )}

      {/* Current Solution Display */}
      {allSolutions && allSolutions.success && allSolutions.solutions[selectedSolution] && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ color: '#666', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>
            Joint Solution
          </div>
          <div style={{ color: '#aaa', fontSize: '10px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            [{allSolutions.solutions[selectedSolution].map((j) => j.toFixed(3)).join(', ')}]
          </div>
          {allSolutions.positionErrors[selectedSolution] !== undefined && (
            <div style={{ color: '#888', fontSize: '10px', marginTop: '4px' }}>
              Error: {(allSolutions.positionErrors[selectedSolution] * 1000).toFixed(3)}mm
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CartesianControlPanel;
