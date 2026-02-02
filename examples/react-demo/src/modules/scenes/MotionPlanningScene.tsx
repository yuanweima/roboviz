/**
 * Motion Planning Scene - Algorithm Comparison Demo
 *
 * 无 GPU 加速的运动规划演示场景，支持多算法对比：
 *
 * 核心功能:
 * 1. 多算法对比 - BiRRT, RRT*, PRM, Task-Space RRT 同时运行
 * 2. 碰撞世界管理 - 使用 useCollisionWorld 管理障碍物 + RobotCapsuleModel
 * 3. IK 驱动工作点 - 可拖拽的起点/终点
 * 4. TrajectoryFK 路径可视化 - 真实 FK 计算的末端轨迹
 * 5. 性能统计 - 时间、节点数、路径长度对比
 *
 * Z-up 坐标系: X=forward, Y=left, Z=up
 *
 * @see GPUMotionPlanningScene for GPU-accelerated version
 * @see docs/kinematics-api.md for API documentation
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { RoboViz } from '@aspect/roboviz-react';
import { TransformControls, Line } from '@react-three/drei';
// Rendering components (no kinematics dependency)
import {
  Robot,
  GhostRobot,
  type GhostStatus,
} from '@aspect/roboviz-core/rendering';
// Kinematics hooks and types
import {
  useTrajx,
  usePoseIK,
  useHybridSolver,
  SolverProvider,
  WasmSolverProvider,
  type WorkspaceAnalysis,
} from '@aspect/roboviz-core/kinematics';
// Planning hooks, collision, and planner provider
import {
  useCollisionWorld,
  CollisionWorldRenderer,
  usePlanningPipeline,
  PlannerProvider,
  WasmPlannerProvider,
  type PlannerType,
  type PlanningResult,
} from '@aspect/roboviz-core/planning';
// Components with mixed dependencies (main entry)
import {
  TrajectoryFK,
  type TrajectoryData,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';

// ============================================================================
// Constants
// ============================================================================

const THEME = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#a855f7',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#0f0f1a',
  surface: '#1a1a2e',
  panel: '#252540',
  text: '#e5e7eb',
  textSecondary: '#9ca3af',
};

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';
const ROBOT_ID = 'planning-robot';

// ============================================================================
// Types
// ============================================================================

interface Workpoint {
  id: string;
  name: string;
  type: 'start' | 'goal';
  position: [number, number, number];
  joints?: number[];
}

interface AlgorithmResult {
  planner: PlannerType;
  result: PlanningResult | null;
  isRunning: boolean;
  color: string;
  trajectoryData?: TrajectoryData;  // For TrajectoryFK visualization
}

// ============================================================================
// Robot Configuration
// ============================================================================

const ROBOT_DOF = 6;
// Joint limits from URDF (Fanuc LR Mate 200iD 7L)
// These must match the URDF limits exactly to avoid FK errors
const ROBOT_JOINT_LIMITS = {
  lower: [-2.9, -1.7, -2.4, -3.3, -2.1, -6.2],
  upper: [2.9, 2.5, 4.8, 3.3, 2.1, 6.2],
};

// Trajectory generation config - velocity and acceleration limits per joint
// Based on typical Fanuc LR Mate 200iD/7L specs (conservative values)
const TRAJECTORY_CONFIG = {
  maxVelocity: [3.0, 3.0, 3.5, 5.0, 5.0, 7.0],       // rad/s per joint
  maxAcceleration: [6.0, 6.0, 7.0, 10.0, 10.0, 14.0], // rad/s^2 per joint
  timeStep: 0.01,  // 10ms sampling interval for smooth playback
};

const HOME_JOINTS = [0, 0, 0, 0, 0, 0];

/**
 * Tool orientation - tool pointing down (-Z direction in world frame)
 * Quaternion: 90° rotation around Y axis [x, y, z, w]
 * This makes the tool point downward, which is the natural orientation for most tasks
 */
const TOOL_FORWARD_QUATERNION: [number, number, number, number] = [0, 0.707, 0, 0.707];

const TOOL_OFFSET = {
  position: [0, 0, 0] as [number, number, number],
  quaternion: [0, 0, 0, 1] as [number, number, number, number],
};

// ============================================================================
// Initial Data
// ============================================================================

const INITIAL_COLLISION_OBJECTS: Array<{
  name: string;
  position: [number, number, number];
  type: 'box' | 'sphere' | 'cylinder' | 'capsule';
  params: Record<string, number>;
  color: string;
}> = [
  {
    name: 'Table',
    position: [0.5, 0, -0.02],
    type: 'box',
    params: { width: 0.6, height: 0.02, depth: 0.8 },
    color: '#555555'
  },
  {
    name: 'Wall',
    position: [0.4, 0, 0.2],
    type: 'box',
    params: { width: 0.05, height: 0.3, depth: 0.4 },
    color: '#e53e3e'
  },
  {
    name: 'Pillar',
    position: [0.5, 0.25, 0.15],
    type: 'cylinder',
    params: { radius: 0.04, height: 0.3 },
    color: '#666666'
  },
  {
    name: 'Sphere',
    position: [0.45, -0.15, 0.25],
    type: 'sphere',
    params: { radius: 0.06 },
    color: '#3182ce'
  },
  // Ground plane to prevent paths going below floor level
  // In Z-up scene with Three.js boxGeometry: width=X, height=Y, depth=Z
  // So for a horizontal ground plane: large X and Y, thin Z
  {
    name: 'Ground',
    position: [0, 0, -0.05],
    type: 'box',
    params: { width: 3.0, height: 3.0, depth: 0.1 },  // 3x3m horizontal, 0.1m thick in Z
    color: '#1a1a2e'  // Match floor color, mostly invisible
  },
];

const INITIAL_WORKPOINTS: Workpoint[] = [
  { id: 'wp-start', name: 'Start', type: 'start', position: [0.35, 0.30, 0.35] },
  { id: 'wp-goal', name: 'Goal', type: 'goal', position: [0.35, -0.30, 0.35] },
];

const WORKPOINT_COLORS = {
  start: '#22c55e',
  goal: '#ef4444',
};

// Algorithm colors for visualization
const ALGORITHM_COLORS: Record<PlannerType, string> = {
  'birrt': '#22c55e',      // Green
  'rrt-star': '#3b82f6',   // Blue
  'prm': '#f59e0b',        // Orange
  'task-space-rrt': '#a855f7', // Purple
};

const ALGORITHM_NAMES: Record<PlannerType, string> = {
  'birrt': 'BiRRT',
  'rrt-star': 'RRT*',
  'prm': 'PRM',
  'task-space-rrt': 'Task-Space RRT',
};

// ============================================================================
// Robot Bounding Spheres for Collision Checking
// ============================================================================

/**
 * Create a function that computes bounding spheres using FK
 * This uses the actual FK solver for accurate end-effector position
 */
function createFkBasedBoundingSpheres(
  fk: ((joints: number[]) => { pose: { position: { x: number; y: number; z: number } } } | null) | null
): (joints: number[]) => Array<{ position: [number, number, number]; radius: number }> {
  // Fanuc LR Mate 200iD/7L approximate link lengths (from DH parameters)
  const L1 = 0.330;  // Base height (d1)
  const L2 = 0.260;  // Upper arm length (a2)
  const L3 = 0.020;  // Elbow offset (a3)
  const L4 = 0.290;  // Forearm length (d4)
  const L5 = 0.072;  // Wrist length (d6)

  return (joints: number[]) => {
    const [j1, j2, j3, j4, j5, j6] = joints;

    const c1 = Math.cos(j1);
    const s1 = Math.sin(j1);
    const c2 = Math.cos(j2);
    const s2 = Math.sin(j2);
    const c23 = Math.cos(j2 + j3);
    const s23 = Math.sin(j2 + j3);

    const spheres: Array<{ position: [number, number, number]; radius: number }> = [
      // Base (fixed)
      { position: [0, 0, L1 * 0.5], radius: 0.10 },

      // Shoulder (joint 2 area)
      {
        position: [c1 * 0.05, s1 * 0.05, L1] as [number, number, number],
        radius: 0.08
      },

      // Upper arm middle
      {
        position: [
          c1 * L2 * 0.5 * c2,
          s1 * L2 * 0.5 * c2,
          L1 + L2 * 0.5 * s2
        ] as [number, number, number],
        radius: 0.06,
      },

      // Elbow (joint 3 area)
      {
        position: [
          c1 * L2 * c2,
          s1 * L2 * c2,
          L1 + L2 * s2
        ] as [number, number, number],
        radius: 0.07,
      },

      // Forearm middle
      {
        position: [
          c1 * (L2 * c2 + L4 * 0.5 * c23),
          s1 * (L2 * c2 + L4 * 0.5 * c23),
          L1 + L2 * s2 + L4 * 0.5 * s23
        ] as [number, number, number],
        radius: 0.05,
      },

      // Wrist (joint 5 area)
      {
        position: [
          c1 * (L2 * c2 + L4 * c23),
          s1 * (L2 * c2 + L4 * c23),
          L1 + L2 * s2 + L4 * s23
        ] as [number, number, number],
        radius: 0.05,
      },
    ];

    // If FK is available, add a sphere at the actual end-effector position
    if (fk) {
      const fkResult = fk(joints);
      if (fkResult) {
        const { x, y, z } = fkResult.pose.position;
        spheres.push({
          position: [x, y, z] as [number, number, number],
          radius: 0.06,  // End effector / tool
        });
      }
    }

    return spheres;
  };
}

/**
 * Fallback: Compute approximate bounding spheres without FK
 * Used when FK solver is not available
 */
function getRobotBoundingSpheres(
  joints: number[]
): Array<{ position: [number, number, number]; radius: number }> {
  return createFkBasedBoundingSpheres(null)(joints);
}

// ============================================================================
// Draggable Workpoint Component
// ============================================================================

interface DraggableWorkpointProps {
  position: [number, number, number];
  color: string;
  isSelected: boolean;
  onDragEnd: (pos: [number, number, number]) => void;
  onDrag?: (pos: [number, number, number]) => void;
  onClick: () => void;
}

function DraggableWorkpoint({ position, color, isSelected, onDragEnd, onDrag, onClick }: DraggableWorkpointProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const controlsRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...position);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (groupRef.current && !isDraggingRef.current) {
      groupRef.current.position.set(...position);
    }
  }, [position]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleDraggingChanged = (e: { value: boolean }) => {
      isDraggingRef.current = e.value;
      if (!e.value && groupRef.current) {
        onDragEnd(groupRef.current.position.toArray() as [number, number, number]);
      }
    };

    const handleObjectChange = () => {
      if (isDraggingRef.current && groupRef.current && onDrag) {
        onDrag(groupRef.current.position.toArray() as [number, number, number]);
      }
    };

    controls.addEventListener('dragging-changed', handleDraggingChanged);
    controls.addEventListener('objectChange', handleObjectChange);
    return () => {
      controls.removeEventListener('dragging-changed', handleDraggingChanged);
      controls.removeEventListener('objectChange', handleObjectChange);
    };
  }, [onDragEnd, onDrag]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const radius = isSelected ? 0.025 : 0.02;
  const emissiveIntensity = isSelected ? 0.5 : 0.2;

  // Validate position before rendering
  const isPositionValid = position.every(p => isFinite(p));
  if (!isPositionValid) return null;

  return (
    <>
      <group ref={groupRef} onClick={handleClick}>
        <mesh>
          <sphereGeometry args={[radius, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} />
        </mesh>
        {isSelected && ready && (
          <>
            <Line points={[[0, 0, 0], [0.06, 0, 0]]} color="#ff0000" lineWidth={2} />
            <Line points={[[0, 0, 0], [0, 0.06, 0]]} color="#00ff00" lineWidth={2} />
            <Line points={[[0, 0, 0], [0, 0, 0.06]]} color="#0000ff" lineWidth={2} />
          </>
        )}
      </group>
      {ready && isSelected && groupRef.current && (
        <TransformControls ref={controlsRef} object={groupRef.current} mode="translate" size={0.5} />
      )}
    </>
  );
}

// ============================================================================
// Algorithm Comparison Panel
// ============================================================================

interface AlgorithmComparisonPanelProps {
  results: AlgorithmResult[];
  selectedAlgorithms: PlannerType[];
  onToggleAlgorithm: (planner: PlannerType) => void;
  onRunComparison: () => void;
  onClearResults: () => void;
  isRunning: boolean;
  canRun: boolean;
}

function AlgorithmComparisonPanel({
  results,
  selectedAlgorithms,
  onToggleAlgorithm,
  onRunComparison,
  onClearResults,
  isRunning,
  canRun,
}: AlgorithmComparisonPanelProps) {
  const allPlanners: PlannerType[] = ['birrt', 'rrt-star', 'prm', 'task-space-rrt'];

  return (
    <div style={{ background: THEME.panel, borderRadius: 8, padding: 12, fontSize: 11 }}>
      <div style={{ fontWeight: 600, color: THEME.text, marginBottom: 10 }}>
        Algorithm Comparison
      </div>

      {/* Algorithm selection */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: THEME.textSecondary, marginBottom: 6 }}>
          Select algorithms to compare:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {allPlanners.map(planner => (
            <label
              key={planner}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 4,
                background: selectedAlgorithms.includes(planner) ? `${ALGORITHM_COLORS[planner]}20` : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selectedAlgorithms.includes(planner)}
                onChange={() => onToggleAlgorithm(planner)}
                disabled={isRunning}
                style={{ accentColor: ALGORITHM_COLORS[planner] }}
              />
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: ALGORITHM_COLORS[planner],
              }} />
              <span style={{ color: THEME.text }}>{ALGORITHM_NAMES[planner]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          onClick={onRunComparison}
          disabled={!canRun || isRunning || selectedAlgorithms.length === 0}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 4,
            border: 'none',
            background: canRun && !isRunning && selectedAlgorithms.length > 0 ? THEME.primary : THEME.surface,
            color: canRun && !isRunning && selectedAlgorithms.length > 0 ? 'white' : THEME.textSecondary,
            cursor: canRun && !isRunning && selectedAlgorithms.length > 0 ? 'pointer' : 'not-allowed',
            fontWeight: 600,
          }}
        >
          {isRunning ? 'Running...' : 'Run Comparison'}
        </button>
        <button
          onClick={onClearResults}
          disabled={isRunning}
          style={{
            padding: '8px 12px',
            borderRadius: 4,
            border: `1px solid ${THEME.primary}40`,
            background: 'transparent',
            color: THEME.text,
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Results table */}
      {results.some(r => r.result) && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: THEME.textSecondary, marginBottom: 6 }}>
            Results:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: 4,
            fontSize: 10,
          }}>
            {/* Header */}
            <div style={{ color: THEME.textSecondary, fontWeight: 600 }}>Algorithm</div>
            <div style={{ color: THEME.textSecondary, fontWeight: 600, textAlign: 'right' }}>Time</div>
            <div style={{ color: THEME.textSecondary, fontWeight: 600, textAlign: 'right' }}>Points</div>
            <div style={{ color: THEME.textSecondary, fontWeight: 600, textAlign: 'right' }}>Status</div>

            {/* Data rows */}
            {results.map(({ planner, result, isRunning: running }) => (
              <React.Fragment key={planner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: ALGORITHM_COLORS[planner],
                  }} />
                  <span style={{ color: THEME.text }}>{ALGORITHM_NAMES[planner]}</span>
                </div>
                <div style={{ textAlign: 'right', color: THEME.text }}>
                  {running ? '...' : result?.success ? `${result.totalTimeMs.toFixed(0)}ms` : '-'}
                </div>
                <div style={{ textAlign: 'right', color: THEME.text }}>
                  {running ? '...' : result?.success ? result.path.length : '-'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {running ? (
                    <span style={{ color: THEME.warning }}>Running</span>
                  ) : result?.success ? (
                    <span style={{ color: THEME.success }}>OK</span>
                  ) : result ? (
                    <span style={{ color: THEME.danger }}>Failed</span>
                  ) : (
                    <span style={{ color: THEME.textSecondary }}>-</span>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Best algorithm highlight */}
          {(() => {
            const successResults = results.filter(r => r.result?.success);
            if (successResults.length === 0) return null;

            const fastest = successResults.reduce((a, b) =>
              (a.result?.totalTimeMs || Infinity) < (b.result?.totalTimeMs || Infinity) ? a : b
            );
            const shortest = successResults.reduce((a, b) =>
              (a.result?.path.length || Infinity) < (b.result?.path.length || Infinity) ? a : b
            );

            return (
              <div style={{ marginTop: 8, padding: 8, background: THEME.surface, borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: THEME.textSecondary, marginBottom: 4 }}>Summary:</div>
                <div style={{ fontSize: 10, color: THEME.text }}>
                  Fastest: <span style={{ color: ALGORITHM_COLORS[fastest.planner], fontWeight: 600 }}>
                    {ALGORITHM_NAMES[fastest.planner]}
                  </span> ({fastest.result?.totalTimeMs.toFixed(0)}ms)
                </div>
                <div style={{ fontSize: 10, color: THEME.text }}>
                  Shortest path: <span style={{ color: ALGORITHM_COLORS[shortest.planner], fontWeight: 600 }}>
                    {ALGORITHM_NAMES[shortest.planner]}
                  </span> ({shortest.result?.path.length} pts)
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Workspace Metrics Panel
// ============================================================================

interface WorkspaceMetricsPanelProps {
  workspace: WorkspaceAnalysis | null;
  isNearSingular: boolean;
  ghostStatus: GhostStatus;
  computing: boolean;
  selectedWp: Workpoint | null;
}

function WorkspaceMetricsPanel({ workspace, isNearSingular, ghostStatus, computing, selectedWp }: WorkspaceMetricsPanelProps) {
  const getManipulabilityColor = (value: number) => {
    if (value >= 0.15) return THEME.success;
    if (value >= 0.05) return THEME.warning;
    return THEME.danger;
  };

  const statusColors: Record<GhostStatus, string> = {
    valid: THEME.success,
    warning: THEME.warning,
    error: THEME.danger,
    neutral: THEME.textSecondary,
  };

  return (
    <div style={{ background: THEME.panel, borderRadius: 8, padding: 12, fontSize: 11 }}>
      <div style={{ fontWeight: 600, color: THEME.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        {selectedWp ? `${selectedWp.name} Workspace` : 'Workspace Analysis'}
        {computing && <span style={{ color: THEME.textSecondary, fontSize: 10, fontWeight: 400 }}>(computing...)</span>}
      </div>

      {selectedWp && (
        <div style={{ marginBottom: 8, padding: 6, background: THEME.surface, borderRadius: 4 }}>
          <div style={{ fontSize: 10, color: THEME.textSecondary }}>Position:</div>
          <div style={{ color: THEME.text }}>
            [{selectedWp.position.map(p => p.toFixed(3)).join(', ')}]
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: THEME.textSecondary }}>IK Status:</span>
        <span style={{ color: statusColors[ghostStatus], fontWeight: 600 }}>{ghostStatus.toUpperCase()}</span>
      </div>

      {isNearSingular && (
        <div style={{
          background: `${THEME.warning}20`,
          border: `1px solid ${THEME.warning}`,
          borderRadius: 4,
          padding: '4px 8px',
          marginBottom: 8,
          color: THEME.warning,
          fontSize: 10,
          fontWeight: 600,
        }}>
          Near Singularity
        </div>
      )}

      {workspace && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: THEME.textSecondary }}>Manipulability:</span>
            <span style={{ color: getManipulabilityColor(workspace.manipulability), fontWeight: 600 }}>
              {workspace.manipulability.toFixed(4)}
            </span>
          </div>
          <div style={{ height: 4, background: THEME.surface, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(workspace.manipulability * 200, 100)}%`,
              background: getManipulabilityColor(workspace.manipulability),
              borderRadius: 2,
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Scene Content
// ============================================================================

interface SceneContentProps {
  workpoints: Workpoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdatePosition: (id: string, pos: [number, number, number]) => void;
  onDragPosition?: (id: string, pos: [number, number, number]) => void;
  ghostJoints: number[] | null;
  ghostStatus: GhostStatus;
  robotJoints: number[];
  collisionObjects: ReturnType<typeof useCollisionWorld>['objects'];
  algorithmResults: AlgorithmResult[];
  showPaths: boolean;
  playbackTime?: number;  // Current playback time for TrajectoryFK
  selectedPlaybackPlanner?: PlannerType | null;  // Which algorithm's path is being played
  urdfContent?: string | null;  // URDF content for TrajectoryFK
}

function SceneContent({
  workpoints,
  selectedId,
  onSelect,
  onUpdatePosition,
  onDragPosition,
  ghostJoints,
  ghostStatus,
  robotJoints,
  collisionObjects,
  algorithmResults,
  showPaths,
  playbackTime,
  selectedPlaybackPlanner,
  urdfContent,
}: SceneContentProps) {
  // Connection line between workpoints
  const connectionPoints = useMemo(() => {
    return workpoints
      .filter(wp => wp.position.every(p => isFinite(p)))
      .map(wp => new THREE.Vector3(...wp.position));
  }, [workpoints]);

  const handleBackgroundClick = useCallback(() => onSelect(null), [onSelect]);

  return (
    <>
      {/* Robot */}
      <Robot id={ROBOT_ID} urdfPath={URDF_PATH} jointAngles={robotJoints} showAxes={false} />

      {/* Ghost Robot for selected workpoint */}
      {ghostJoints && (
        <GhostRobot
          id="ghost"
          urdfPath={URDF_PATH}
          jointAngles={ghostJoints}
          opacity={0.4}
          status={ghostStatus}
          upAxis="Z"
        />
      )}

      {/* Collision Objects */}
      <CollisionWorldRenderer
        objects={collisionObjects}
        selectedId={null}
        editingEnabled={false}
        onSelect={() => {}}
      />

      {/* Workpoints */}
      {workpoints.map(wp => {
        const isSelected = wp.id === selectedId;
        const color = isSelected ? '#ffffff' : WORKPOINT_COLORS[wp.type];

        return (
          <DraggableWorkpoint
            key={wp.id}
            position={wp.position}
            color={color}
            isSelected={isSelected}
            onDragEnd={pos => onUpdatePosition(wp.id, pos)}
            onDrag={isSelected && onDragPosition ? pos => onDragPosition(wp.id, pos) : undefined}
            onClick={() => onSelect(wp.id)}
          />
        );
      })}

      {/* Connection line between workpoints */}
      {connectionPoints.length >= 2 && (
        <Line points={connectionPoints} color={THEME.primary} lineWidth={2} dashed dashSize={0.04} gapSize={0.02} />
      )}

      {/* Algorithm paths - using TrajectoryFK for real FK-based path visualization */}
      {showPaths && urdfContent && algorithmResults.map(({ planner, result, trajectoryData, color }) => {
        if (!result?.success || !trajectoryData || trajectoryData.positions.length < 2) return null;

        // Determine if this is the currently playing path
        const isPlayingThis = selectedPlaybackPlanner === planner;

        return (
          <TrajectoryFK
            key={planner}
            robotId={`${ROBOT_ID}-traj-${planner}`}
            urdfContent={urdfContent}
            trajectoryData={trajectoryData}
            showPath={true}
            pathWidth={isPlayingThis ? 4 : 2}
            showWaypoints={false}  // Don't show individual waypoints for cleaner visualization
            colorByStatus={false}
            pathColor={color}
            showManipulability={false}
            currentTime={isPlayingThis ? playbackTime : undefined}
            showCurrentPosition={isPlayingThis}
          />
        );
      })}

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, 3]} intensity={0.4} />

      {/* Ground */}
      <mesh position={[0, 0, -0.03]} rotation={[0, 0, 0]} onClick={handleBackgroundClick}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </>
  );
}

// ============================================================================
// Playback Controller
// ============================================================================

const PLAYBACK_DURATION = 3.0;  // Total playback duration in seconds

interface PlaybackControllerProps {
  trajectoryData: TrajectoryData | null;
  onJointsUpdate: (joints: number[]) => void;
  onTimeUpdate: (time: number) => void;  // Report current time for TrajectoryFK
  onComplete?: () => void;  // Called when playback finishes
  playbackState: {
    setIsPlaying: (v: boolean) => void;
    setIndex: (v: number) => void;
    reset: () => void;
  };
}

function PlaybackController({
  trajectoryData,
  onJointsUpdate,
  onTimeUpdate,
  onComplete,
  playbackState,
}: PlaybackControllerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeRef = useRef(0);

  useEffect(() => {
    playbackState.setIsPlaying = setIsPlaying;
    playbackState.setIndex = setCurrentIndex;
    playbackState.reset = () => {
      timeRef.current = 0;
      setCurrentIndex(0);
      onTimeUpdate(0);
    };
  }, [playbackState, onTimeUpdate]);

  useFrame((_, delta) => {
    if (!isPlaying || !trajectoryData || trajectoryData.positions.length === 0) return;

    const duration = trajectoryData.duration > 0 ? trajectoryData.duration : PLAYBACK_DURATION;
    timeRef.current += delta;

    // Clamp to duration
    const currentTime = Math.min(timeRef.current, duration);
    const progress = currentTime / duration;

    // Update time for TrajectoryFK current position indicator
    onTimeUpdate(currentTime);

    // Calculate index in positions array
    const exactIndex = progress * (trajectoryData.positions.length - 1);
    const newIndex = Math.min(Math.floor(exactIndex), trajectoryData.positions.length - 1);

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }

    // Interpolate between waypoints
    const lowerIndex = Math.floor(exactIndex);
    const upperIndex = Math.min(lowerIndex + 1, trajectoryData.positions.length - 1);
    const t = exactIndex - lowerIndex;

    const lowerJoints = trajectoryData.positions[lowerIndex];
    const upperJoints = trajectoryData.positions[upperIndex];

    // Interpolate and clamp to joint limits
    const interpolatedJoints = lowerJoints.map((v, i) => {
      const interpolated = v + t * (upperJoints[i] - v);
      const lower = ROBOT_JOINT_LIMITS.lower[i] ?? -Math.PI;
      const upper = ROBOT_JOINT_LIMITS.upper[i] ?? Math.PI;
      return Math.max(lower, Math.min(upper, interpolated));
    });

    onJointsUpdate(interpolatedJoints);

    if (currentTime >= duration) {
      setIsPlaying(false);
      timeRef.current = 0;
      onTimeUpdate(0);
      onComplete?.();  // Notify parent that playback finished
    }
  });

  return null;
}

// ============================================================================
// Main Component
// ============================================================================

export function MotionPlanningScene() {
  const { addLog } = useAppStore();

  // ========== State ==========
  const [workpoints, setWorkpoints] = useState<Workpoint[]>(INITIAL_WORKPOINTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<[number, number, number] | null>(null);
  const [urdfContent, setUrdfContent] = useState<string | null>(null);
  const [robotJoints, setRobotJoints] = useState<number[]>(HOME_JOINTS);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<PlannerType[]>(['birrt', 'rrt-star']);
  const [algorithmResults, setAlgorithmResults] = useState<AlgorithmResult[]>([]);
  const [isRunningComparison, setIsRunningComparison] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [selectedPathForPlayback, setSelectedPathForPlayback] = useState<PlannerType | null>(null);
  const [isPlayingPath, setIsPlayingPath] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);  // Current playback time for TrajectoryFK
  const playbackStateRef = useRef({
    setIsPlaying: (_: boolean) => {},
    setIndex: (_: number) => {},
    reset: () => {},
  });

  // ========== WASM Init ==========
  const { ready: wasmReady } = useTrajx();

  // ========== Collision World ==========
  const collisionWorld = useCollisionWorld({
    onEvent: (event) => {
      if (event.type === 'object-added') {
        addLog('info', `Added collision object: ${event.objectId}`);
      }
    },
  });

  const { addBox, addSphere, addCylinder, objects: collisionObjects } = collisionWorld;

  // Initialize collision objects (only once)
  const collisionInitializedRef = useRef(false);
  useEffect(() => {
    if (collisionInitializedRef.current) return;
    collisionInitializedRef.current = true;

    for (const obj of INITIAL_COLLISION_OBJECTS) {
      if (obj.type === 'box') {
        addBox({
          name: obj.name,
          position: obj.position,
          dimensions: { width: obj.params.width, height: obj.params.height, depth: obj.params.depth },
          color: obj.color,
        });
      } else if (obj.type === 'sphere') {
        addSphere({
          name: obj.name,
          position: obj.position,
          radius: obj.params.radius,
          color: obj.color,
        });
      } else if (obj.type === 'cylinder') {
        addCylinder({
          name: obj.name,
          position: obj.position,
          radius: obj.params.radius,
          height: obj.params.height,
          color: obj.color,
        });
      }
    }

    addLog('info', `Initialized ${INITIAL_COLLISION_OBJECTS.length} collision objects`);
  }, [addBox, addSphere, addCylinder, addLog]);

  // ========== Load URDF ==========
  useEffect(() => {
    fetch(URDF_PATH)
      .then(r => r.text())
      .then(content => {
        setUrdfContent(content);
        addLog('info', 'URDF loaded');
      })
      .catch(err => addLog('error', `Failed to load URDF: ${err.message}`));
  }, [addLog]);

  // ========== Planning Pipeline ==========
  const planning = usePlanningPipeline({
    jointLimits: ROBOT_JOINT_LIMITS,
    defaultPlanner: 'birrt',
    autoInit: true,
    pipelineConfig: {
      enablePostProcessing: true,
      shortcutIterations: 100,
      smoothIterations: 50,
      smoothingFactor: 0.5,
      calculateMetrics: true,
    },
    trajectoryConfig: TRAJECTORY_CONFIG,  // Enable trajectory generation with velocity/acceleration limits
  });

  const { state: planningState, updateSettings, plan, createObstacleChecker } = planning;

  // ========== Selected Workpoint ==========
  const selectedWorkpoint = useMemo(() => {
    return workpoints.find(wp => wp.id === selectedId);
  }, [workpoints, selectedId]);

  const effectivePosition = useMemo(() => {
    if (dragPosition) return dragPosition;
    if (selectedWorkpoint) return selectedWorkpoint.position;
    return null;
  }, [dragPosition, selectedWorkpoint]);

  const targetPose = useMemo(() => {
    if (!effectivePosition) return null;
    return {
      position: effectivePosition as [number, number, number],
      quaternion: TOOL_FORWARD_QUATERNION,
    };
  }, [effectivePosition]);

  // ========== IK for selected workpoint ==========
  const {
    ready: solverReady,
    computing,
    ghostJoints,
    ghostStatus,
    workspace,
    isNearSingular,
    hasAnalyticalIk,
  } = usePoseIK({
    robotId: ROBOT_ID,
    urdfContent: wasmReady ? urdfContent : null,
    targetPose,
    toolOffset: TOOL_OFFSET,
    debounceMs: 8,
    // Workspace metrics only trigger warnings, not errors (if IK succeeds, pose is reachable)
    statusThresholds: {
      manipulabilityWarning: 0.01,   // Low manipulability triggers warning
      positionError: 0.02,           // 20mm position error threshold
      positionWarning: 0.005,        // 5mm warning threshold
    },
  });

  // ========== Hybrid Solver for IK computation ==========
  const solver = useHybridSolver({
    robotId: ROBOT_ID,
    urdfContent: wasmReady ? urdfContent : null,
    coordinateSystem: 'Z-up',
  });

  // Log solver status
  useEffect(() => {
    if (solverReady) {
      addLog('info', `Solver ready, analytical IK: ${hasAnalyticalIk ? 'yes' : 'no'}`);
    }
  }, [solverReady, hasAnalyticalIk, addLog]);

  // ========== Helper: Convert PlanningResult path to TrajectoryData ==========
  const pathToTrajectoryData = useCallback((path: Array<{ joints: number[]; time?: number; velocity?: number[] }>): TrajectoryData => {
    // Validate joint counts - all waypoints should have ROBOT_DOF joints
    const expectedDOF = ROBOT_DOF;
    const invalidWaypoints = path.filter((p) => p.joints.length !== expectedDOF);
    if (invalidWaypoints.length > 0) {
      console.error(`[pathToTrajectoryData] Invalid waypoints detected: ${invalidWaypoints.length} waypoints have incorrect joint count.`);
      path.forEach((p, i) => {
        if (p.joints.length !== expectedDOF) {
          console.error(`  Waypoint ${i}: expected ${expectedDOF} joints, got ${p.joints.length}`, p.joints);
        }
      });
    }

    // Filter out invalid waypoints to prevent FK errors
    const validPath = path.filter(p => p.joints.length === expectedDOF);
    if (validPath.length < 2) {
      console.error('[pathToTrajectoryData] Not enough valid waypoints after filtering!');
      return { times: [], positions: [], velocities: [], duration: 0 };
    }

    const validNumPoints = validPath.length;

    // Check if we have real trajectory data (time-parameterized from WASM)
    const hasTrajectoryData = validPath[0].time !== undefined && validPath[validPath.length - 1].time !== undefined;

    if (hasTrajectoryData) {
      // Use actual trajectory timing from WASM trajectory generation
      const times = validPath.map(p => p.time!);
      const positions = validPath.map(p => p.joints);
      const velocities = validPath.map(p => p.velocity ?? p.joints.map(() => 0));
      const duration = times[times.length - 1] - times[0];

      return { times, positions, velocities, duration };
    }

    // Fallback: Generate evenly spaced time stamps (path-only data)
    const duration = PLAYBACK_DURATION;
    const times = validPath.map((_, i) => (i / (validNumPoints - 1)) * duration);
    const positions = validPath.map(p => p.joints);

    // Simple velocity estimation (finite differences)
    const velocities: number[][] = [];
    for (let i = 0; i < validNumPoints; i++) {
      if (i === 0) {
        const dt = times[1] - times[0];
        velocities.push(positions[1].map((p, j) => (p - positions[0][j]) / dt));
      } else if (i === validNumPoints - 1) {
        const dt = times[i] - times[i - 1];
        velocities.push(positions[i].map((p, j) => (p - positions[i - 1][j]) / dt));
      } else {
        const dt = times[i + 1] - times[i - 1];
        velocities.push(positions[i + 1].map((p, j) => (p - positions[i - 1][j]) / dt));
      }
    }

    return { times, positions, velocities, duration };
  }, []);

  // ========== Collision Checker ==========
  // Create FK-based bounding spheres function using actual solver
  const fkBasedBoundingSpheres = useMemo(() => {
    if (!solver.ready || !solver.fk) {
      return getRobotBoundingSpheres;
    }
    return createFkBasedBoundingSpheres(solver.fk);
  }, [solver.ready, solver.fk]);

  const collisionChecker = useMemo(() => {
    const obstacles = collisionObjects.map(obj => {
      const params = obj.params;
      let dimensions: number[];

      if (params.type === 'box') {
        dimensions = [params.width, params.height, params.depth];
      } else if (params.type === 'sphere') {
        dimensions = [params.radius];
      } else if (params.type === 'cylinder' || params.type === 'capsule') {
        dimensions = [params.radius, params.height];
      } else {
        dimensions = [0.1]; // Default fallback
      }

      return {
        id: obj.id,
        name: obj.name,
        type: obj.type as 'box' | 'sphere' | 'cylinder' | 'mesh',
        position: obj.transform.position,
        dimensions,
        enabled: obj.enabled,
      };
    });

    return createObstacleChecker(obstacles, fkBasedBoundingSpheres);
  }, [collisionObjects, createObstacleChecker, fkBasedBoundingSpheres]);

  // ========== Compute IK for workpoints ==========
  const computeWorkpointIK = useCallback((wp: Workpoint): number[] | null => {
    if (!solver.ready) return null;

    const pose = {
      position: { x: wp.position[0], y: wp.position[1], z: wp.position[2] },
      orientation: {
        x: TOOL_FORWARD_QUATERNION[0],
        y: TOOL_FORWARD_QUATERNION[1],
        z: TOOL_FORWARD_QUATERNION[2],
        w: TOOL_FORWARD_QUATERNION[3],
      },
    };

    const ikResult = solver.ik(pose, robotJoints);

    return ikResult?.success && ikResult.solution ? ikResult.solution : null;
  }, [solver.ready, solver.ik, solver.fk, robotJoints]);

  // ========== Run Algorithm Comparison ==========
  const runComparison = useCallback(async () => {
    if (!solver.ready || !planningState.ready) {
      addLog('error', 'Solver or planner not ready');
      return;
    }

    const startWp = workpoints.find(wp => wp.type === 'start');
    const goalWp = workpoints.find(wp => wp.type === 'goal');

    if (!startWp || !goalWp) {
      addLog('error', 'Need both start and goal workpoints');
      return;
    }

    // Compute IK for start and goal
    const startJoints = computeWorkpointIK(startWp);
    const goalJoints = computeWorkpointIK(goalWp);

    if (!startJoints || !goalJoints) {
      addLog('error', 'IK failed for start or goal position');
      return;
    }

    setIsRunningComparison(true);

    // Initialize results
    const initialResults: AlgorithmResult[] = selectedAlgorithms.map(planner => ({
      planner,
      result: null,
      isRunning: true,
      color: ALGORITHM_COLORS[planner],
    }));
    setAlgorithmResults(initialResults);

    addLog('info', `Running comparison with ${selectedAlgorithms.length} algorithms...`);

    // Run each algorithm sequentially (to get accurate timing)
    const results: AlgorithmResult[] = [];
    for (const planner of selectedAlgorithms) {
      addLog('info', `Running ${ALGORITHM_NAMES[planner]}...`);

      // Update settings for this planner
      updateSettings({ type: planner });

      // Small delay to ensure settings are applied
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        const result = await plan(startJoints, goalJoints, collisionChecker);

        // Generate TrajectoryData for TrajectoryFK visualization
        const trajectoryData = result.success && result.path.length > 0
          ? pathToTrajectoryData(result.path)
          : undefined;

        results.push({
          planner,
          result,
          isRunning: false,
          color: ALGORITHM_COLORS[planner],
          trajectoryData,
        });

        if (result.success) {
          addLog('info', `${ALGORITHM_NAMES[planner]}: Success - ${result.path.length} pts in ${result.totalTimeMs.toFixed(0)}ms`);
        } else {
          addLog('warning', `${ALGORITHM_NAMES[planner]}: Failed - ${result.error}`);
        }
      } catch (err) {
        results.push({
          planner,
          result: {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            path: [],
            totalTimeMs: 0,
            planningTimeMs: 0,
            collisionChecked: true,
          },
          isRunning: false,
          color: ALGORITHM_COLORS[planner],
        });
        addLog('error', `${ALGORITHM_NAMES[planner]}: Error - ${err instanceof Error ? err.message : 'Unknown'}`);
      }

      // Update results incrementally
      setAlgorithmResults([...results, ...selectedAlgorithms.slice(results.length).map(p => ({
        planner: p,
        result: null,
        isRunning: selectedAlgorithms.indexOf(p) === results.length,
        color: ALGORITHM_COLORS[p],
      }))]);
    }

    setAlgorithmResults(results);
    setIsRunningComparison(false);
    addLog('info', 'Comparison complete');
  }, [solver.ready, planningState.ready, workpoints, computeWorkpointIK, selectedAlgorithms, updateSettings, plan, collisionChecker, pathToTrajectoryData, addLog]);

  // ========== Toggle Algorithm ==========
  const toggleAlgorithm = useCallback((planner: PlannerType) => {
    setSelectedAlgorithms(prev =>
      prev.includes(planner)
        ? prev.filter(p => p !== planner)
        : [...prev, planner]
    );
  }, []);

  // ========== Clear Results ==========
  const clearResults = useCallback(() => {
    setAlgorithmResults([]);
    setSelectedPathForPlayback(null);
    addLog('info', 'Results cleared');
  }, [addLog]);

  // ========== Handlers ==========
  const handleDragPosition = useCallback((id: string, pos: [number, number, number]) => {
    if (workpoints.some(w => w.id === id)) {
      setDragPosition(pos);
    }
  }, [workpoints]);

  const handleUpdatePosition = useCallback((id: string, pos: [number, number, number]) => {
    setDragPosition(null);
    setWorkpoints(prev => prev.map(w => w.id === id ? { ...w, position: pos } : w));
    addLog('info', `Updated ${id} position`);
  }, [addLog]);

  const handleJointsUpdate = useCallback((joints: number[]) => {
    setRobotJoints(joints);
  }, []);

  // ========== Execute Path ==========
  const executePath = useCallback((planner: PlannerType) => {
    const result = algorithmResults.find(r => r.planner === planner);
    if (!result?.result?.success || !result.trajectoryData) {
      addLog('warning', 'No valid path to execute');
      return;
    }
    setSelectedPathForPlayback(planner);
    setPlaybackTime(0);
    playbackStateRef.current.reset();
    playbackStateRef.current.setIsPlaying(true);
    setIsPlayingPath(true);
    addLog('info', `Executing ${ALGORITHM_NAMES[planner]} path (${result.trajectoryData.positions.length} pts)...`);
  }, [algorithmResults, addLog]);

  // ========== Get Playback TrajectoryData ==========
  const playbackTrajectoryData = useMemo(() => {
    if (!selectedPathForPlayback) return null;
    const result = algorithmResults.find(r => r.planner === selectedPathForPlayback);
    return result?.trajectoryData ?? null;
  }, [selectedPathForPlayback, algorithmResults]);

  // ========== Playback Time Update Handler ==========
  const handlePlaybackTimeUpdate = useCallback((time: number) => {
    setPlaybackTime(time);
  }, []);

  // ========== Playback Complete Handler ==========
  const handlePlaybackComplete = useCallback(() => {
    setIsPlayingPath(false);
    setSelectedPathForPlayback(null);
    addLog('info', 'Playback complete');
  }, [addLog]);

  // ========== Loading State ==========
  if (!wasmReady) {
    return (
      <div style={{ padding: 20, color: THEME.text }}>
        <h3>Loading WASM kinematics...</h3>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: THEME.background }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary, margin: 0 }}>Motion Planning - Algorithm Comparison</h2>
        <p style={{ color: THEME.textSecondary, margin: '4px 0 0', fontSize: 12 }}>
          {collisionObjects.length} obstacles • IK: {solverReady ? (hasAnalyticalIk ? 'Analytical' : 'Numerical') : 'Loading...'} • Planner: {planningState.ready ? 'Ready' : 'Initializing...'}
        </p>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: 12, padding: 12, minHeight: 0 }}>
        {/* Left panel */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
          {/* Algorithm Comparison */}
          <AlgorithmComparisonPanel
            results={algorithmResults}
            selectedAlgorithms={selectedAlgorithms}
            onToggleAlgorithm={toggleAlgorithm}
            onRunComparison={runComparison}
            onClearResults={clearResults}
            isRunning={isRunningComparison}
            canRun={solver.ready && planningState.ready && ghostStatus !== 'error'}
          />

          {/* Workspace Analysis */}
          <WorkspaceMetricsPanel
            workspace={workspace}
            isNearSingular={isNearSingular}
            ghostStatus={ghostStatus}
            computing={computing}
            selectedWp={selectedWorkpoint || null}
          />

          {/* Visualization Controls */}
          <div style={{ background: THEME.panel, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: THEME.text, marginBottom: 8 }}>
              Visualization
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={showPaths}
                onChange={(e) => setShowPaths(e.target.checked)}
                style={{ accentColor: THEME.primary }}
              />
              <span style={{ fontSize: 11, color: THEME.text }}>Show Paths</span>
            </label>

            {/* Path execution buttons */}
            {algorithmResults.some(r => r.result?.success) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: THEME.textSecondary, marginBottom: 6 }}>
                  Execute path:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {algorithmResults.filter(r => r.result?.success).map(({ planner }) => (
                    <button
                      key={planner}
                      onClick={() => executePath(planner)}
                      disabled={isPlayingPath}
                      style={{
                        padding: '4px 8px',
                        fontSize: 10,
                        borderRadius: 4,
                        border: 'none',
                        background: ALGORITHM_COLORS[planner],
                        color: 'white',
                        cursor: isPlayingPath ? 'not-allowed' : 'pointer',
                        opacity: isPlayingPath ? 0.5 : 1,
                      }}
                    >
                      {ALGORITHM_NAMES[planner]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Workpoints list */}
          <div style={{ background: THEME.panel, borderRadius: 8, padding: 12, flex: 1, overflow: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: THEME.textSecondary, marginBottom: 8 }}>
              Workpoints
            </div>
            {workpoints.map(wp => (
              <div
                key={wp.id}
                onClick={() => setSelectedId(wp.id)}
                style={{
                  padding: '6px 8px',
                  fontSize: 11,
                  cursor: 'pointer',
                  borderRadius: 4,
                  color: wp.id === selectedId ? WORKPOINT_COLORS[wp.type] : THEME.text,
                  background: wp.id === selectedId ? `${WORKPOINT_COLORS[wp.type]}20` : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <span>{wp.name}</span>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: WORKPOINT_COLORS[wp.type],
                }} />
              </div>
            ))}

            <button
              onClick={() => { setRobotJoints(HOME_JOINTS); clearResults(); }}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 4,
                border: `1px solid ${THEME.primary}40`,
                background: 'transparent',
                color: THEME.text,
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Reset Robot
            </button>
          </div>
        </div>

        {/* 3D View - wrapped with Solver + Planner Providers for kinematics + planning injection */}
        <SolverProvider>
          <WasmSolverProvider robotId={ROBOT_ID} urdfContent={urdfContent}>
            <PlannerProvider>
              <WasmPlannerProvider robotId={ROBOT_ID}>
        <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: `1px solid ${THEME.primary}30` }}>
          <RoboViz config={{ scene: { background: THEME.background }, camera: { position: { x: 1.2, y: 0.8, z: 1 } } }}>
            <SceneContent
              workpoints={workpoints}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdatePosition={handleUpdatePosition}
              onDragPosition={handleDragPosition}
              ghostJoints={ghostJoints}
              ghostStatus={ghostStatus}
              robotJoints={robotJoints}
              collisionObjects={collisionObjects}
              algorithmResults={algorithmResults}
              showPaths={showPaths}
              playbackTime={playbackTime}
              selectedPlaybackPlanner={selectedPathForPlayback}
              urdfContent={urdfContent}
            />
            <PlaybackController
              trajectoryData={playbackTrajectoryData}
              onJointsUpdate={handleJointsUpdate}
              onTimeUpdate={handlePlaybackTimeUpdate}
              onComplete={handlePlaybackComplete}
              playbackState={playbackStateRef.current}
            />
          </RoboViz>
        </div>
              </WasmPlannerProvider>
            </PlannerProvider>
          </WasmSolverProvider>
        </SolverProvider>
      </div>
    </div>
  );
}

export default MotionPlanningScene;
