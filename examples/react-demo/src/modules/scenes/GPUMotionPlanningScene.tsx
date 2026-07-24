/**
 * GPU Motion Planning Scene - Full Implementation
 *
 * 完整的 GPU 加速运动规划演示场景：
 * - useCollisionWorld: 碰撞对象管理（box, sphere, cylinder, capsule）
 * - useGpuPlanning: GPU 加速的运动规划（Lazy-PRM, BiRRT, RRT*）
 * - usePoseIK: IK 计算和工作空间分析
 * - CollisionWorldRenderer: 碰撞对象可视化
 *
 * 工作流程:
 * 1. 选择工作点 → 自动计算 IK 显示 Ghost
 * 2. 点击 "Plan Path" → GPU 规划路径
 * 3. 点击 "Execute" → 播放路径动画
 *
 * Z-up 坐标系: X=forward, Y=left, Z=up
 *
 * @see docs/kinematics-api.md for API documentation
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { RoboViz } from '@yuanweima/roboviz-react';
import { TransformControls, Line } from '@react-three/drei';
// Rendering components (no kinematics dependency)
import {
  Robot,
  GhostRobot,
  type GhostStatus,
} from '@yuanweima/roboviz-core';
// Kinematics hooks and types
import {
  useTrajx,
  usePoseIK,
  useHybridSolver,
  SolverProvider,
  WasmSolverProvider,
  type WorkspaceAnalysis,
} from '@yuanweima/roboviz-core/kinematics';
// Planning hooks, collision, GPU planning, and planner provider
import {
  useCollisionWorld,
  useGpuPlanning,
  CollisionWorldRenderer,
  PlannerProvider,
  WasmPlannerProvider,
  type GpuPlanningProgress,
  type GpuPlanningResult,
  type PlanningWaypoint,
  type RobotCapsuleModel,
} from '@yuanweima/roboviz-core/planning';
// Components with mixed dependencies (main entry)
import {
  TrajectoryFK,
  type TrajectoryData,
} from '@yuanweima/roboviz-core';
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

const URDF_PATH = `${import.meta.env.BASE_URL}fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf`;
const ROBOT_ID = 'planning-robot';

// ============================================================================
// Types
// ============================================================================

interface Workpoint {
  id: string;
  name: string;
  type: 'start' | 'via' | 'goal';
  position: [number, number, number];
  order: number;
  joints?: number[];  // Cached IK solution
}

// ============================================================================
// Tool Configuration (Z-up coordinate system)
// ============================================================================

/**
 * Tool orientation - tool pointing down (-Z direction in world frame)
 * This is the natural orientation for most robot tasks.
 * Quaternion: 180° rotation around X axis
 */
const TOOL_FORWARD_QUATERNION: [number, number, number, number] = [1, 0, 0, 0];

/**
 * TCP offset - set to 0 per user request
 */
const TOOL_OFFSET = {
  position: [0, 0, 0] as [number, number, number],
  quaternion: [0, 0, 0, 1] as [number, number, number, number],
};

/**
 * Workspace quality thresholds
 */
const WORKSPACE_THRESHOLDS = {
  manipulabilityGood: 0.15,
  manipulabilityWarn: 0.05,
  conditionNumberWarn: 50,
  conditionNumberBad: 200,
};

// ============================================================================
// Robot Configuration
// ============================================================================

const ROBOT_DOF = 6;
const ROBOT_JOINT_LIMITS = {
  lower: [-2.97, -1.57, -2.36, -4.71, -2.44, -6.28],
  upper: [2.97, 2.62, 4.54, 4.71, 2.44, 6.28],
};

// Initial joint position (all zeros)
const HOME_JOINTS = [0, 0, 0, 0, 0, 0];

// Trajectory generation config - velocity and acceleration limits per joint
// Based on typical Fanuc LR Mate 200iD/7L specs (conservative values)
const TRAJECTORY_CONFIG = {
  maxVelocity: [3.0, 3.0, 3.5, 5.0, 5.0, 7.0],       // rad/s per joint
  maxAcceleration: [6.0, 6.0, 7.0, 10.0, 10.0, 14.0], // rad/s^2 per joint
  timeStep: 0.01,  // 10ms sampling interval for smooth playback
};

// Playback configuration
const PLAYBACK_DURATION = 3.0; // Total playback duration in seconds

// ============================================================================
// Robot Capsule Model for Collision Detection
// ============================================================================

/**
 * Simplified capsule model for Fanuc LR Mate 200iD/7L
 * Each link is represented as a capsule (cylinder with hemispherical caps)
 * Points are in local link coordinates (Z-up)
 */
const ROBOT_CAPSULES: RobotCapsuleModel = {
  robotId: ROBOT_ID,
  linkNames: ['link_0', 'link_1', 'link_2', 'link_3', 'link_4', 'link_5', 'link_6'],
  capsules: [
    // Link 0 (base) - usually ignored for environment collision
    { linkIndex: 0, linkName: 'link_0', radius: 0.08, point1: [0, 0, 0], point2: [0, 0, 0.1] },
    // Link 1 (shoulder) - vertical
    { linkIndex: 1, linkName: 'link_1', radius: 0.06, point1: [0, 0, 0], point2: [0, 0, 0.15] },
    // Link 2 (upper arm) - main arm segment, ~330mm
    { linkIndex: 2, linkName: 'link_2', radius: 0.05, point1: [0, 0, 0], point2: [0.33, 0, 0] },
    // Link 3 (forearm) - ~260mm
    { linkIndex: 3, linkName: 'link_3', radius: 0.04, point1: [0, 0, 0], point2: [0.26, 0, 0] },
    // Link 4 (wrist 1)
    { linkIndex: 4, linkName: 'link_4', radius: 0.035, point1: [0, 0, 0], point2: [0, 0, 0.05] },
    // Link 5 (wrist 2)
    { linkIndex: 5, linkName: 'link_5', radius: 0.03, point1: [0, 0, 0], point2: [0, 0, 0.05] },
    // Link 6 (flange)
    { linkIndex: 6, linkName: 'link_6', radius: 0.025, point1: [0, 0, 0], point2: [0, 0, 0.03] },
  ],
  // Self-collision pairs: check non-adjacent links
  selfCollisionPairs: [
    [1, 4], [1, 5], [1, 6],  // Link 1 vs wrist
    [2, 5], [2, 6],          // Link 2 vs wrist
  ],
  ignoredLinksForEnv: [0], // Ignore base for environment collision
};

// ============================================================================
// Initial Data (Z-up coordinates)
// ============================================================================

// Simple obstacles: one large wall (rotated 90°) + one sphere
// Wall blocks direct path, sphere creates additional constraint
const INITIAL_COLLISION_OBJECTS: Array<{
  name: string;
  position: [number, number, number];
  type: 'box' | 'sphere' | 'cylinder' | 'capsule';
  params: Record<string, number>;
  color: string;
}> = [
  // Large wall - standing vertically, blocking left-right path
  // Thin in X, very wide in Y (extends beyond workpoints to force going over/around)
  {
    name: 'Wall',
    position: [0.4, 0, 0.2],   // Centered, slightly lower to block more effectively
    type: 'box',
    params: { width: 0.05, height: 0.35, depth: 0.6 }, // Thin in X, tall in Z, very wide in Y (spans Y=-0.3 to Y=+0.3)
    color: '#e53e3e'
  },
  // Sphere obstacle - front area, forces path to go around
  {
    name: 'Sphere',
    position: [0.45, 0.2, 0.35],  // Front-left area
    type: 'sphere',
    params: { radius: 0.08 },     // 8cm radius
    color: '#3182ce'
  },
];

// Three workpoints: Left → Near Sphere → Right
// User-specified positions for clear collision avoidance demo
const INITIAL_WORKPOINTS: Workpoint[] = [
  // Start: Left side (Y positive)
  { id: 'wp-start', name: 'Left', type: 'start', position: [0.324, 0.325, 0.350], order: 0 },
  // Via: Near the sphere
  { id: 'wp-via', name: 'Near Sphere', type: 'via', position: [0.602, 0.150, 0.397], order: 1 },
  // Goal: Right side (Y negative)
  { id: 'wp-goal', name: 'Right', type: 'goal', position: [0.269, -0.347, 0.350], order: 2 },
];

const WORKPOINT_COLORS = {
  start: '#22c55e',
  via: '#3b82f6',
  goal: '#ef4444',
};

// ============================================================================
// Workspace Metrics Panel
// ============================================================================

interface WorkspaceMetricsPanelProps {
  workspace: WorkspaceAnalysis | null;
  isNearSingular: boolean;
  ghostStatus: GhostStatus;
  computing: boolean;
}

function WorkspaceMetricsPanel({ workspace, isNearSingular, ghostStatus, computing }: WorkspaceMetricsPanelProps) {
  const getManipulabilityColor = (value: number) => {
    if (value >= WORKSPACE_THRESHOLDS.manipulabilityGood) return THEME.success;
    if (value >= WORKSPACE_THRESHOLDS.manipulabilityWarn) return THEME.warning;
    return THEME.danger;
  };

  const getConditionColor = (value: number) => {
    if (value < WORKSPACE_THRESHOLDS.conditionNumberWarn) return THEME.success;
    if (value < WORKSPACE_THRESHOLDS.conditionNumberBad) return THEME.warning;
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
        Workspace Analysis
        {computing && <span style={{ color: THEME.textSecondary, fontSize: 10, fontWeight: 400 }}>(computing...)</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: THEME.textSecondary }}>Status:</span>
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

      {workspace ? (
        <>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
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
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ color: THEME.textSecondary }}>Condition #:</span>
              <span style={{ color: getConditionColor(workspace.conditionNumber), fontWeight: 600 }}>
                {workspace.conditionNumber.toFixed(1)}
              </span>
            </div>
            <div style={{ height: 4, background: THEME.surface, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min((1 - workspace.conditionNumber / 300) * 100, 100)}%`,
                background: getConditionColor(workspace.conditionNumber),
                borderRadius: 2,
                transition: 'width 0.2s ease',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: THEME.textSecondary }}>Min σ:</span>
            <span style={{ color: workspace.minSingularValue > 0.01 ? THEME.success : THEME.warning, fontWeight: 600 }}>
              {workspace.minSingularValue.toFixed(4)}
            </span>
          </div>
        </>
      ) : (
        <div style={{ color: THEME.textSecondary, fontStyle: 'italic' }}>
          Select a workpoint to see analysis
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Planning Progress Panel
// ============================================================================

interface PlanningProgressPanelProps {
  progress: GpuPlanningProgress;
  result: GpuPlanningResult | null;
  error: string | null;
}

function PlanningProgressPanel({ progress, result, error }: PlanningProgressPanelProps) {
  const phaseColors: Record<string, string> = {
    idle: THEME.textSecondary,
    initializing: THEME.primary,
    'building-roadmap': THEME.secondary,
    searching: THEME.accent,
    'validating-edges': THEME.warning,
    optimizing: THEME.primary,
    smoothing: THEME.secondary,
    completed: THEME.success,
    failed: THEME.danger,
    aborted: THEME.warning,
  };

  return (
    <div style={{ background: THEME.panel, borderRadius: 8, padding: 12, fontSize: 11 }}>
      <div style={{ fontWeight: 600, color: THEME.text, marginBottom: 8 }}>
        Planning Status
      </div>

      {/* Phase */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: THEME.textSecondary }}>Phase:</span>
        <span style={{ color: phaseColors[progress.phase] || THEME.text, fontWeight: 600 }}>
          {progress.phase.replace(/-/g, ' ').toUpperCase()}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ color: THEME.textSecondary }}>Progress:</span>
          <span style={{ color: THEME.text }}>{(progress.overallProgress * 100).toFixed(0)}%</span>
        </div>
        <div style={{ height: 6, background: THEME.surface, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress.overallProgress * 100}%`,
            background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.accent})`,
            borderRadius: 3,
            transition: 'width 0.2s ease',
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
        <div><span style={{ color: THEME.textSecondary }}>Nodes:</span> {progress.nodesCount}</div>
        <div><span style={{ color: THEME.textSecondary }}>Iterations:</span> {progress.currentIteration}</div>
        <div><span style={{ color: THEME.textSecondary }}>Collisions:</span> {progress.collisionsFound}</div>
        <div><span style={{ color: THEME.textSecondary }}>Time:</span> {progress.elapsedMs}ms</div>
      </div>

      {/* Result */}
      {result && (
        <div style={{ marginTop: 8, padding: 8, background: result.success ? `${THEME.success}20` : `${THEME.danger}20`, borderRadius: 4 }}>
          {result.success ? (
            <>
              <div style={{ color: THEME.success, fontWeight: 600, marginBottom: 4 }}>Path Found!</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: THEME.success }}>
                  {result.planningTimeMs.toFixed(1)}ms
                </span>
                <span style={{ fontSize: 10, color: THEME.textSecondary }}>
                  GPU plan · {result.path.length} waypoints
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: THEME.danger }}>{result.error || 'Planning failed'}</div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 8, padding: 8, background: `${THEME.danger}20`, borderRadius: 4, color: THEME.danger }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Draggable Workpoint
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

  return (
    <>
      <group ref={groupRef} onClick={handleClick}>
        <mesh>
          <sphereGeometry args={[radius, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} />
        </mesh>
        {isSelected && (
          <>
            {/* Coordinate axes */}
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
// Path Visualization
// ============================================================================

interface PathVisualizationProps {
  path: Array<{ joints: number[] }>;
  currentIndex: number;
}

function PathVisualization({ path, currentIndex }: PathVisualizationProps) {
  // For now, just show a simple indicator of path progress
  if (path.length < 2) return null;

  return (
    <group>
      {/* Path progress indicator could be added here */}
    </group>
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
  plannedPath: Array<{ joints: number[] }>;
  pathIndex: number;
  trajectoryData: TrajectoryData | null;
  urdfContent: string | null;
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
  plannedPath,
  pathIndex,
  trajectoryData,
  urdfContent,
}: SceneContentProps) {
  // Connection line between workpoints
  const connectionPoints = useMemo(() => {
    const sorted = [...workpoints].sort((a, b) => a.order - b.order);
    return sorted.map(wp => new THREE.Vector3(...wp.position));
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
        <Line points={connectionPoints} color="#6366f1" lineWidth={2} dashed dashSize={0.04} gapSize={0.02} />
      )}

      {/* Trajectory visualization using TrajectoryFK (end-effector path computed via FK) */}
      {trajectoryData && urdfContent && trajectoryData.positions.length > 0 && (
        <TrajectoryFK
          robotId={ROBOT_ID}
          urdfContent={urdfContent}
          trajectoryData={trajectoryData}
          showPath={true}
          pathWidth={3}
          showWaypoints={true}
          pathColor="#a855f7"
          colorByStatus={false}
        />
      )}

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, 3]} intensity={0.4} />

      {/* Ground */}
      <mesh position={[0, 0, -0.001]} rotation={[0, 0, 0]} onClick={handleBackgroundClick}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </>
  );
}

// ============================================================================
// Path Playback Hook
// ============================================================================

function usePathPlayback(path: Array<{ joints: number[] }> | null, onJointsUpdate: (joints: number[]) => void) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (!isPlaying || !path || path.length === 0) return;

    timeRef.current += delta * speed * 2;  // 2 waypoints per second base speed

    const newIndex = Math.min(Math.floor(timeRef.current), path.length - 1);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      onJointsUpdate(path[newIndex].joints);
    }

    if (newIndex >= path.length - 1) {
      setIsPlaying(false);
    }
  });

  const play = useCallback(() => {
    if (!path || path.length === 0) return;
    timeRef.current = 0;
    setCurrentIndex(0);
    setIsPlaying(true);
    if (path.length > 0) {
      onJointsUpdate(path[0].joints);
    }
  }, [path, onJointsUpdate]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    timeRef.current = 0;
    setCurrentIndex(0);
  }, []);

  return { isPlaying, currentIndex, speed, setSpeed, play, pause, reset };
}

// ============================================================================
// Playback Controller Component (inside Canvas)
// ============================================================================

function PlaybackController({
  path,
  onJointsUpdate,
  playbackState,
  trajectoryData,
}: {
  path: Array<{ joints: number[] }> | null;
  onJointsUpdate: (joints: number[]) => void;
  playbackState: { setIsPlaying: (v: boolean) => void; setIndex: (v: number) => void; onComplete: () => void };
  trajectoryData: TrajectoryData | null;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    playbackState.setIsPlaying = setIsPlaying;
    playbackState.setIndex = setCurrentIndex;
  }, [playbackState]);

  // Reset completed flag when playback starts
  useEffect(() => {
    if (isPlaying) {
      completedRef.current = false;
    }
  }, [isPlaying]);

  useFrame((_, delta) => {
    if (!isPlaying || !path || path.length === 0) return;

    // Use trajectory duration if available, otherwise use default
    const duration = trajectoryData?.duration || PLAYBACK_DURATION;

    // Time-based playback using actual trajectory timing
    timeRef.current += delta / duration;

    // Calculate progress (0 to 1)
    const progress = Math.min(timeRef.current, 1);

    // Map progress to path index with smooth interpolation
    const exactIndex = progress * (path.length - 1);
    const newIndex = Math.min(Math.floor(exactIndex), path.length - 1);

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }

    // Interpolate between waypoints for smooth motion
    const lowerIndex = Math.floor(exactIndex);
    const upperIndex = Math.min(lowerIndex + 1, path.length - 1);
    const t = exactIndex - lowerIndex; // Interpolation factor (0 to 1)

    const lowerJoints = path[lowerIndex].joints;
    const upperJoints = path[upperIndex].joints;
    const interpolatedJoints = lowerJoints.map((v, i) =>
      v + t * (upperJoints[i] - v)
    );

    onJointsUpdate(interpolatedJoints);

    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      setIsPlaying(false);
      timeRef.current = 0;
      // Call completion callback
      if (playbackState.onComplete) {
        playbackState.onComplete();
      }
    }
  });

  return null;
}

// ============================================================================
// Main Component
// ============================================================================

export function GPUMotionPlanningScene() {
  const { addLog } = useAppStore();

  // ========== State ==========
  const [workpoints, setWorkpoints] = useState<Workpoint[]>(INITIAL_WORKPOINTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<[number, number, number] | null>(null);
  const [urdfContent, setUrdfContent] = useState<string | null>(null);
  const [robotJoints, setRobotJoints] = useState<number[]>(HOME_JOINTS);
  const [plannedPath, setPlannedPath] = useState<Array<{ joints: number[] }>>([]);
  const [trajectoryData, setTrajectoryData] = useState<TrajectoryData | null>(null);
  const [pathIndex, setPathIndex] = useState(0);
  const [isPlayingPath, setIsPlayingPath] = useState(false);
  const playbackStateRef = useRef({ setIsPlaying: (_: boolean) => {}, setIndex: (_: number) => {}, onComplete: () => {} });

  // ========== GPU vs CPU Benchmark State ==========
  const [webGpuAvailable, setWebGpuAvailable] = useState<boolean | null>(null);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    cpuTimeMs: number;
    gpuTimeMs: number;
    speedup: number;
    collisionPairs: number;
  } | null>(null);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

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

  // Extract stable functions from collision world
  const { addBox, addSphere, addCylinder, addCapsule, setRobotCapsules, objects: collisionObjects, world: collisionWorldData } = collisionWorld;

  // Track if collision objects have been initialized
  const collisionInitializedRef = useRef(false);

  // Initialize collision objects (only once)
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
      } else if (obj.type === 'capsule') {
        addCapsule({
          name: obj.name,
          position: obj.position,
          radius: obj.params.radius,
          height: obj.params.height,
          color: obj.color,
        });
      }
    }

    // Set robot capsule model for collision checking
    setRobotCapsules(ROBOT_CAPSULES);

    addLog('info', `Initialized ${INITIAL_COLLISION_OBJECTS.length} collision objects and robot capsules`);
  }, [addBox, addSphere, addCylinder, addCapsule, setRobotCapsules, addLog]);

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

  // ========== WebGPU Detection ==========
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const wasm = await import('@yuanweima/trajx-wasm');
        const available = await wasm.isWebGpuAvailable();
        if (!cancelled) {
          setWebGpuAvailable(available);
          addLog('info', `WebGPU ${available ? 'available' : 'unavailable (CPU fallback)'}`);
        }
      } catch (err) {
        if (!cancelled) {
          setWebGpuAvailable(false);
          addLog('warning', `WebGPU probe failed: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [addLog]);

  // ========== GPU vs CPU Benchmark ==========
  const BENCHMARK_PAIRS = 4096;
  const runBenchmark = useCallback(async () => {
    setBenchmarkRunning(true);
    setBenchmarkError(null);
    setBenchmarkResult(null);
    addLog('info', `Running GPU vs CPU benchmark (${BENCHMARK_PAIRS} collision pairs)...`);
    try {
      const wasm = await import('@yuanweima/trajx-wasm');
      const cmp = await wasm.benchmarkGpuVsCpu(BENCHMARK_PAIRS);
      const result = {
        cpuTimeMs: cmp.cpuTimeMs,
        gpuTimeMs: cmp.gpuTimeMs,
        speedup: cmp.speedup,
        collisionPairs: cmp.collisionPairs,
      };
      setBenchmarkResult(result);
      addLog('info', cmp.summary());
      // Free the WASM-owned object to avoid leaks
      cmp.free();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setBenchmarkError(msg);
      addLog('error', `Benchmark failed: ${msg}`);
    } finally {
      setBenchmarkRunning(false);
    }
  }, [addLog]);

  // ========== GPU Planning ==========
  const gpuPlanning = useGpuPlanning({
    robotUrdf: urdfContent || '',
    dof: ROBOT_DOF,
    jointLimits: ROBOT_JOINT_LIMITS,
    collisionWorld: collisionWorldData,
    defaultPlanner: 'lazy-prm',
    autoInitialize: false,
  });

  // Extract stable properties and functions from gpuPlanning
  const {
    ready: gpuPlanningReady,
    initialize: initializeGpuPlanning,
    setCollisionWorld: setGpuCollisionWorld,
    isPlanning,
    progress: planningProgress,
    result: planningResult,
    error: planningError,
    planToGoal,
    planThroughWaypoints,
    abort: abortPlanning,
    clearResult: clearPlanningResult,
  } = gpuPlanning;

  // Track if GPU planning initialization has been attempted
  const gpuInitAttemptedRef = useRef(false);

  // Initialize GPU planning when URDF is loaded
  useEffect(() => {
    if (urdfContent && wasmReady && !gpuPlanningReady && !gpuInitAttemptedRef.current) {
      gpuInitAttemptedRef.current = true;
      initializeGpuPlanning().then(() => {
        addLog('info', 'GPU planning engine initialized');
      }).catch(err => {
        addLog('error', `GPU planning init failed: ${err.message}`);
      });
    }
  }, [urdfContent, wasmReady, gpuPlanningReady, initializeGpuPlanning, addLog]);

  // Update collision world in GPU planner when world changes
  const prevCollisionWorldRef = useRef<typeof collisionWorldData | null>(null);
  useEffect(() => {
    if (gpuPlanningReady && collisionWorldData && collisionWorldData !== prevCollisionWorldRef.current) {
      setGpuCollisionWorld(collisionWorldData);
      prevCollisionWorldRef.current = collisionWorldData;
    }
  }, [gpuPlanningReady, collisionWorldData, setGpuCollisionWorld]);

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

  // ========== IK for selected workpoint (preview) ==========
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
  });

  // ========== Hybrid Solver for multi-waypoint IK ==========
  // NOTE: Our coordinates are Z-up, so disable Y-up to Z-up conversion
  const solver = useHybridSolver({
    robotId: ROBOT_ID,
    urdfContent: wasmReady ? urdfContent : null,
    coordinateSystem: 'Z-up', // Our positions are already in Z-up format
  });

  // Log solver status
  useEffect(() => {
    if (solverReady) {
      addLog('info', `Solver ready, analytical IK: ${hasAnalyticalIk ? 'yes' : 'no'}`);
    }
  }, [solverReady, hasAnalyticalIk, addLog]);

  // ========== Compute IK for all workpoints ==========
  const computeAllIK = useCallback((): Array<{ wp: Workpoint; joints: number[] | null; error?: string }> => {
    if (!solver.ready) return [];

    const results: Array<{ wp: Workpoint; joints: number[] | null; error?: string }> = [];

    for (const wp of workpoints) {
      // Convert tuple format to Pose object format for solver.ik()
      const pose = {
        position: {
          x: wp.position[0],
          y: wp.position[1],
          z: wp.position[2],
        },
        orientation: {
          x: TOOL_FORWARD_QUATERNION[0],
          y: TOOL_FORWARD_QUATERNION[1],
          z: TOOL_FORWARD_QUATERNION[2],
          w: TOOL_FORWARD_QUATERNION[3],
        },
      };

      const ikResult = solver.ik(pose, robotJoints);

      if (ikResult && ikResult.success && ikResult.solution) {
        results.push({ wp, joints: ikResult.solution });
      } else {
        results.push({ wp, joints: null, error: ikResult?.errorMessage || 'IK failed' });
      }
    }

    return results;
  }, [solver.ready, solver.ik, workpoints, robotJoints]);

  // ========== Planning Functions ==========
  const planPath = useCallback(async () => {
    if (!gpuPlanningReady) {
      addLog('error', 'GPU planning not ready');
      return;
    }

    if (!solver.ready) {
      addLog('error', 'IK solver not ready');
      return;
    }

    // Sort workpoints by order
    const sortedWorkpoints = [...workpoints].sort((a, b) => a.order - b.order);

    if (sortedWorkpoints.length === 0) {
      addLog('warning', 'No workpoints defined');
      return;
    }

    try {
      // Step 1: Compute IK for ALL workpoints
      addLog('info', 'Computing IK for all workpoints...');
      const ikResults = computeAllIK();

      // Check for IK failures
      const failedWps = ikResults.filter(r => !r.joints);
      if (failedWps.length > 0) {
        for (const f of failedWps) {
          addLog('error', `IK failed for ${f.wp.name}: ${f.error}`);
        }
        return;
      }

      // Step 2: Convert to PlanningWaypoint format
      // WaypointType is: 'start' | 'via' | 'goal' | 'approach' | 'retract'
      const planningWaypoints: PlanningWaypoint[] = sortedWorkpoints.map((wp, index) => {
        const ikResult = ikResults.find(r => r.wp.id === wp.id);
        return {
          id: wp.id,
          name: wp.name,
          type: wp.type as 'start' | 'via' | 'goal', // Direct mapping - same values
          pose: {
            position: wp.position,
            orientation: TOOL_FORWARD_QUATERNION, // Use 'orientation' not 'quaternion'
          },
          joints: ikResult?.joints || undefined,
          ikStatus: ikResult?.joints ? 'solved' : 'failed',
          enabled: true,
          order: index,
        };
      });

      addLog('info', `IK computed for ${planningWaypoints.length} waypoints. Starting GPU planning...`);

      // Step 3: Plan through ALL waypoints using planThroughWaypoints
      const result = await planThroughWaypoints(
        robotJoints, // Start from current robot position
        planningWaypoints,
        {
          maxPlanningTime: 30,
          maxIterations: 10000,
          numSamples: 3000,      // More samples for better roadmap coverage
          numNeighbors: 25,      // More neighbors for better connectivity
          connectionRadius: 3.0,
          stepSize: 0.1,         // Larger step for path densification
          smoothPath: true,
          shortcutPath: true,
          shortcutIterations: 100, // More shortcut iterations for smoother path
          smoothingIterations: 20, // More smoothing iterations
        }
      );

      if (result.success) {
        setPlannedPath(result.path);

        // Convert to TrajectoryData for visualization with proper timing
        const trajData = pathToTrajectoryData(result.path);
        setTrajectoryData(trajData);

        addLog('info', `Path found through ${sortedWorkpoints.length} waypoints: ${result.path.length} total waypoints in ${result.planningTimeMs.toFixed(0)}ms`);
      } else {
        setTrajectoryData(null);
        addLog('error', `Planning failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setTrajectoryData(null);
      addLog('error', `Planning error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }, [gpuPlanningReady, solver.ready, workpoints, robotJoints, computeAllIK, planThroughWaypoints, addLog]);

  // Convert planned path to TrajectoryData format for TrajectoryFK visualization
  // TrajectoryData uses: { duration, times, positions }
  const pathToTrajectoryData = useCallback((path: Array<{ joints: number[] }>): TrajectoryData => {
    if (path.length === 0) {
      return { duration: 0, times: [], positions: [] };
    }

    // Compute timing using velocity limits
    const { maxVelocity, timeStep } = TRAJECTORY_CONFIG;
    const times: number[] = [];
    const positions: number[][] = [];
    let cumulativeTime = 0;

    for (let i = 0; i < path.length; i++) {
      const joints = path[i].joints;

      if (i > 0) {
        const prevJoints = path[i - 1].joints;
        // Find maximum joint movement and divide by velocity to get segment time
        let maxMoveTime = 0;
        for (let j = 0; j < joints.length; j++) {
          const delta = Math.abs(joints[j] - prevJoints[j]);
          const moveTime = delta / maxVelocity[j];
          maxMoveTime = Math.max(maxMoveTime, moveTime);
        }
        // Ensure minimum time step
        cumulativeTime += Math.max(maxMoveTime, timeStep);
      }

      times.push(cumulativeTime);
      positions.push(joints);
    }

    return {
      duration: cumulativeTime,
      times,
      positions,
    };
  }, []);

  const executePath = useCallback(() => {
    if (plannedPath.length === 0) {
      addLog('warning', 'No path to execute');
      return;
    }
    setPathIndex(0);
    playbackStateRef.current.setIndex(0);
    playbackStateRef.current.setIsPlaying(true);
    // Set completion callback
    playbackStateRef.current.onComplete = () => {
      setIsPlayingPath(false);
      addLog('info', 'Path execution completed');
    };
    setIsPlayingPath(true);
    const durationStr = trajectoryData?.duration?.toFixed(2) || PLAYBACK_DURATION.toFixed(2);
    addLog('info', `Executing planned path (${durationStr}s)...`);
  }, [plannedPath, trajectoryData, addLog]);

  const stopExecution = useCallback(() => {
    playbackStateRef.current.setIsPlaying(false);
    setIsPlayingPath(false);
  }, []);

  // ========== Handlers ==========
  const handleDragPosition = useCallback((id: string, pos: [number, number, number]) => {
    if (workpoints.some(w => w.id === id)) {
      setDragPosition(pos);
    }
  }, [workpoints]);

  const handleUpdatePosition = useCallback((id: string, pos: [number, number, number]) => {
    setDragPosition(null);
    const wpIndex = workpoints.findIndex(w => w.id === id);
    if (wpIndex >= 0) {
      setWorkpoints(prev => prev.map(w => w.id === id ? { ...w, position: pos } : w));
      addLog('info', `Updated ${id} position`);
    }
  }, [workpoints, addLog]);

  const handleJointsUpdate = useCallback((joints: number[]) => {
    setRobotJoints(joints);
  }, []);

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
        <h2 style={{ color: THEME.primary, margin: 0 }}>GPU Motion Planning Pro</h2>
        <p style={{ color: THEME.textSecondary, margin: '4px 0 0', fontSize: 12 }}>
          {collisionObjects.length} obstacles • IK: {solverReady ? (hasAnalyticalIk ? 'Analytical' : 'Numerical') : 'Loading...'} • GPU: {gpuPlanningReady ? 'Ready' : 'Initializing...'}
        </p>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: 12, padding: 12, minHeight: 0 }}>
        {/* Left panel */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
          {/* GPU vs CPU Benchmark */}
          <div style={{
            background: `linear-gradient(135deg, ${THEME.panel}, ${THEME.surface})`,
            borderRadius: 8,
            padding: 12,
            border: `1px solid ${THEME.accent}40`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text, marginBottom: 4 }}>
              GPU Collision Benchmark
            </div>
            <div style={{ fontSize: 10, color: THEME.textSecondary, marginBottom: 8 }}>
              WebGPU:{' '}
              {webGpuAvailable === null ? (
                <span style={{ color: THEME.textSecondary }}>detecting…</span>
              ) : webGpuAvailable ? (
                <span style={{ color: THEME.success, fontWeight: 600 }}>available</span>
              ) : (
                <span style={{ color: THEME.warning, fontWeight: 600 }}>unavailable (CPU fallback)</span>
              )}
            </div>

            <button
              onClick={runBenchmark}
              disabled={benchmarkRunning}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: 'none',
                background: benchmarkRunning
                  ? THEME.surface
                  : `linear-gradient(90deg, ${THEME.primary}, ${THEME.accent})`,
                color: benchmarkRunning ? THEME.textSecondary : 'white',
                cursor: benchmarkRunning ? 'wait' : 'pointer',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              {benchmarkRunning ? 'Benchmarking…' : `Benchmark GPU vs CPU (${BENCHMARK_PAIRS} pairs)`}
            </button>

            {webGpuAvailable === false && !benchmarkResult && !benchmarkError && (
              <div style={{
                marginTop: 8,
                fontSize: 10,
                color: THEME.warning,
                background: `${THEME.warning}15`,
                borderRadius: 4,
                padding: '6px 8px',
              }}>
                WebGPU not detected. The benchmark will still run on CPU; open in a
                WebGPU-capable browser to see GPU acceleration.
              </div>
            )}

            {benchmarkResult && (
              <div style={{ marginTop: 10 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: THEME.text,
                  marginBottom: 6,
                }}>
                  <span style={{ color: THEME.textSecondary }}>CPU</span>
                  <span style={{ fontWeight: 700 }}>{benchmarkResult.cpuTimeMs.toFixed(1)}ms</span>
                  <span style={{ color: THEME.accent }}>→</span>
                  <span style={{ color: THEME.textSecondary }}>GPU</span>
                  <span style={{ fontWeight: 700, color: THEME.success }}>{benchmarkResult.gpuTimeMs.toFixed(1)}ms</span>
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: 28,
                  fontWeight: 800,
                  lineHeight: 1,
                  background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.accent})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {benchmarkResult.speedup.toFixed(1)}× faster
                </div>
                <div style={{ textAlign: 'center', fontSize: 10, color: THEME.textSecondary, marginTop: 4 }}>
                  {benchmarkResult.collisionPairs.toLocaleString()} collision pairs tested
                </div>
              </div>
            )}

            {benchmarkError && (
              <div style={{
                marginTop: 8,
                fontSize: 10,
                color: THEME.danger,
                background: `${THEME.danger}15`,
                borderRadius: 4,
                padding: '6px 8px',
              }}>
                {benchmarkError}
              </div>
            )}
          </div>

          {/* Selected info */}
          <div style={{ background: THEME.panel, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
              {selectedId ? `Selected: ${selectedWorkpoint?.name || selectedId}` : 'Click a workpoint to select'}
            </div>
            {selectedWorkpoint && effectivePosition && (
              <div style={{ fontSize: 10, color: THEME.textSecondary, marginTop: 4 }}>
                Position: [{effectivePosition.map(p => p.toFixed(3)).join(', ')}]
              </div>
            )}
          </div>

          {/* Workspace Analysis */}
          {selectedWorkpoint && (
            <WorkspaceMetricsPanel
              workspace={workspace}
              isNearSingular={isNearSingular}
              ghostStatus={ghostStatus}
              computing={computing}
            />
          )}

          {/* Planning Progress */}
          <PlanningProgressPanel
            progress={planningProgress}
            result={planningResult}
            error={planningError}
          />

          {/* Planning Controls */}
          <div style={{ background: THEME.panel, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: THEME.textSecondary, marginBottom: 8 }}>
              Planning Controls
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={planPath}
                disabled={!gpuPlanningReady || isPlanning || !ghostJoints}
                style={{
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: gpuPlanningReady && ghostJoints ? THEME.primary : THEME.surface,
                  color: gpuPlanningReady && ghostJoints ? 'white' : THEME.textSecondary,
                  cursor: gpuPlanningReady && ghostJoints ? 'pointer' : 'not-allowed',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {isPlanning ? 'Planning...' : 'Plan Path'}
              </button>
              <button
                onClick={isPlayingPath ? stopExecution : executePath}
                disabled={plannedPath.length === 0}
                style={{
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: 'none',
                  background: plannedPath.length > 0 ? THEME.success : THEME.surface,
                  color: plannedPath.length > 0 ? 'white' : THEME.textSecondary,
                  cursor: plannedPath.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {isPlayingPath ? 'Stop' : `Execute Path (${plannedPath.length} pts)`}
              </button>
              <button
                onClick={() => { setRobotJoints(HOME_JOINTS); setPlannedPath([]); setTrajectoryData(null); }}
                style={{
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

          {/* Workpoints list */}
          <div style={{ background: THEME.panel, borderRadius: 8, padding: 12, flex: 1, overflow: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: THEME.textSecondary, marginBottom: 8 }}>
              Workpoints ({workpoints.length})
            </div>
            {workpoints.sort((a, b) => a.order - b.order).map(wp => (
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
                }}
              >
                <span>{wp.order + 1}. {wp.name}</span>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: WORKPOINT_COLORS[wp.type],
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* 3D View - wrapped with Solver + Planner Providers */}
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
              plannedPath={plannedPath}
              pathIndex={pathIndex}
              trajectoryData={trajectoryData}
              urdfContent={urdfContent}
            />
            <PlaybackController
              path={plannedPath.length > 0 ? plannedPath : null}
              onJointsUpdate={handleJointsUpdate}
              playbackState={playbackStateRef.current}
              trajectoryData={trajectoryData}
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

export default GPUMotionPlanningScene;
