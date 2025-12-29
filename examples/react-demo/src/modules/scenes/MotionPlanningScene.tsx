/**
 * Motion Planning Scene - GPU-Accelerated Path Planning Demo
 *
 * 展示完整的 GPU 运动规划流水线：
 *
 * 核心功能:
 * 1. 多种规划算法 - BiRRT, RRT*, PRM, Task-Space RRT
 * 2. 实时碰撞检测 - 基于障碍物的碰撞回调
 * 3. 路径后处理 - Shortcutting + Smoothing
 * 4. 轨迹生成 - 时间参数化轨迹
 * 5. 3D 可视化 - 路径、障碍物、机器人动画
 *
 * 使用场景:
 * - 运动规划算法对比
 * - 碰撞避障演示
 * - 轨迹优化展示
 * - 工业路径规划
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RoboViz, PropertyEditor, type PropertySchema } from '@aspect/roboviz-react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  ProcessProvider,
  RobotProcessProvider,
  ProcessScene,
  EndEffector,
  useRobotProcessState,
  usePlanningPipeline,
  PathVisualizer,
  ObstacleVisualizer,
  PlanningControlPanel,
  type PlanningObstacle,
  type PathWaypoint,
  type PlannerType,
} from '@aspect/roboviz-core';
import { useAppStore } from '../../store';

// ============================================================================
// Theme & Constants
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

// Robot joint limits (Fanuc LR Mate 200iD/7L)
const JOINT_LIMITS = {
  lower: [-2.97, -1.57, -2.36, -3.49, -2.18, -6.28],
  upper: [2.97, 2.79, 4.54, 3.49, 2.18, 6.28],
};

// Default velocity/acceleration limits for trajectory generation
const TRAJECTORY_CONFIG = {
  maxVelocity: [2.0, 2.0, 2.0, 3.0, 3.0, 3.0],
  maxAcceleration: [4.0, 4.0, 4.0, 6.0, 6.0, 6.0],
  timeStep: 0.01,
};

// ============================================================================
// Default Obstacles
// ============================================================================

const DEFAULT_OBSTACLES: PlanningObstacle[] = [
  {
    id: 'table',
    name: 'Work Table',
    type: 'box',
    position: [0.5, 0, -0.15],
    dimensions: [0.6, 0.8, 0.02],
    enabled: true,
    color: '#555555',
  },
  {
    id: 'pillar1',
    name: 'Pillar 1',
    type: 'cylinder',
    position: [0.3, 0.3, 0.15],
    dimensions: [0.05, 0.3],
    enabled: true,
    color: '#666666',
  },
  {
    id: 'pillar2',
    name: 'Pillar 2',
    type: 'cylinder',
    position: [0.6, -0.2, 0.15],
    dimensions: [0.05, 0.3],
    enabled: true,
    color: '#666666',
  },
  {
    id: 'box1',
    name: 'Workpiece 1',
    type: 'box',
    position: [0.4, 0.15, 0.05],
    dimensions: [0.1, 0.1, 0.1],
    enabled: true,
    color: '#888888',
  },
  {
    id: 'sphere1',
    name: 'Obstacle Sphere',
    type: 'sphere',
    position: [0.5, -0.1, 0.2],
    dimensions: [0.08],
    enabled: true,
    color: '#777777',
  },
];

// Default start/goal configurations
const DEFAULT_START = [0, 0, 0, 0, 0, 0];
const DEFAULT_GOAL = [1.2, 0.5, -0.8, 0, 0.8, 0];

// ============================================================================
// PropertyEditor Schema
// ============================================================================

const SETTINGS_SCHEMA: PropertySchema = {
  groups: [
    {
      id: 'endpoints',
      label: 'Start / Goal Configuration',
      collapsible: true,
      fields: [
        {
          key: 'useInteractiveGoal',
          type: 'boolean',
          label: 'Interactive Goal',
          description: 'Click in 3D scene to set goal',
        },
        {
          key: 'showGhost',
          type: 'boolean',
          label: 'Show Goal Ghost',
        },
      ],
    },
    {
      id: 'obstacles',
      label: 'Obstacles',
      collapsible: true,
      fields: [
        {
          key: 'showObstacles',
          type: 'boolean',
          label: 'Show Obstacles',
        },
        {
          key: 'obstacleOpacity',
          type: 'number',
          label: 'Opacity',
          min: 0.1,
          max: 1,
          step: 0.1,
          showSlider: true,
        },
      ],
    },
    {
      id: 'visualization',
      label: 'Path Visualization',
      collapsible: true,
      fields: [
        {
          key: 'showPath',
          type: 'boolean',
          label: 'Show Path',
        },
        {
          key: 'showWaypoints',
          type: 'boolean',
          label: 'Show Waypoints',
        },
        {
          key: 'animatePath',
          type: 'boolean',
          label: 'Animate Robot',
        },
        {
          key: 'animationSpeed',
          type: 'number',
          label: 'Animation Speed',
          min: 0.1,
          max: 5,
          step: 0.1,
          showSlider: true,
        },
      ],
    },
    {
      id: 'pipeline',
      label: 'Pipeline Settings',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          key: 'enablePostProcessing',
          type: 'boolean',
          label: 'Enable Post-Processing',
        },
        {
          key: 'shortcutIterations',
          type: 'number',
          label: 'Shortcut Iterations',
          min: 0,
          max: 500,
          step: 10,
        },
        {
          key: 'smoothIterations',
          type: 'number',
          label: 'Smooth Iterations',
          min: 0,
          max: 200,
          step: 10,
        },
      ],
    },
  ],
};

const DEFAULT_SETTINGS = {
  useInteractiveGoal: false,
  showGhost: true,
  showObstacles: true,
  obstacleOpacity: 0.6,
  showPath: true,
  showWaypoints: true,
  animatePath: true,
  animationSpeed: 1.0,
  enablePostProcessing: true,
  shortcutIterations: 100,
  smoothIterations: 50,
};

// ============================================================================
// FK Computation Helper (simplified - in production use trajx)
// ============================================================================

/**
 * Simplified FK for visualization - computes approximate TCP position
 * In production, use the actual robot FK from trajx-wasm
 */
function computeApproximateTcpPosition(joints: number[]): [number, number, number] {
  // This is a simplified model - actual FK should come from trajx-wasm
  const [j1, j2, j3, j4, j5, j6] = joints;

  // Approximate link lengths (Fanuc LR Mate 200iD/7L)
  const L1 = 0.33; // base to shoulder
  const L2 = 0.26; // shoulder to elbow
  const L3 = 0.26; // elbow to wrist
  const L4 = 0.08; // wrist to tcp

  const c1 = Math.cos(j1);
  const s1 = Math.sin(j1);
  const c2 = Math.cos(j2);
  const s2 = Math.sin(j2);
  const c23 = Math.cos(j2 + j3);
  const s23 = Math.sin(j2 + j3);

  const x = c1 * (L2 * c2 + L3 * c23) + L4 * c1 * c23;
  const y = s1 * (L2 * c2 + L3 * c23) + L4 * s1 * c23;
  const z = L1 + L2 * s2 + L3 * s23 + L4 * s23;

  return [x, y, z];
}

/**
 * Get robot bounding spheres for collision checking
 */
function getRobotBoundingSpheres(
  joints: number[]
): Array<{ position: [number, number, number]; radius: number }> {
  const [j1, j2, j3] = joints;

  const L1 = 0.33;
  const L2 = 0.26;
  const L3 = 0.26;

  const c1 = Math.cos(j1);
  const s1 = Math.sin(j1);
  const c2 = Math.cos(j2);
  const s2 = Math.sin(j2);
  const c23 = Math.cos(j2 + j3);
  const s23 = Math.sin(j2 + j3);

  return [
    // Base
    { position: [0, 0, L1 * 0.5], radius: 0.08 },
    // Link 2
    {
      position: [
        c1 * L2 * 0.5 * c2,
        s1 * L2 * 0.5 * c2,
        L1 + L2 * 0.5 * s2,
      ] as [number, number, number],
      radius: 0.06,
    },
    // Link 3
    {
      position: [
        c1 * (L2 * c2 + L3 * 0.5 * c23),
        s1 * (L2 * c2 + L3 * 0.5 * c23),
        L1 + L2 * s2 + L3 * 0.5 * s23,
      ] as [number, number, number],
      radius: 0.05,
    },
    // TCP area
    {
      position: computeApproximateTcpPosition(joints),
      radius: 0.04,
    },
  ];
}

// ============================================================================
// Animation Component
// ============================================================================

function PathAnimator({
  path,
  isPlaying,
  speed,
  onPositionChange,
}: {
  path: PathWaypoint[];
  isPlaying: boolean;
  speed: number;
  onPositionChange: (position: number, joints: number[]) => void;
}) {
  const positionRef = useRef(0);
  const lastTimeRef = useRef(0);

  useFrame((state, delta) => {
    if (!isPlaying || path.length < 2) return;

    // Calculate total duration from path timing or estimate
    const totalDuration = path[path.length - 1].time || path.length * 0.1;

    positionRef.current += (delta * speed) / totalDuration;

    if (positionRef.current >= 1) {
      positionRef.current = 0;
    }

    // Find current waypoint
    const idx = Math.min(
      Math.floor(positionRef.current * (path.length - 1)),
      path.length - 2
    );
    const t = (positionRef.current * (path.length - 1)) % 1;

    // Interpolate joints
    const joints = path[idx].joints.map(
      (j, i) => j + t * (path[idx + 1].joints[i] - j)
    );

    // Throttle updates
    if (state.clock.elapsedTime - lastTimeRef.current > 0.016) {
      onPositionChange(positionRef.current, joints);
      lastTimeRef.current = state.clock.elapsedTime;
    }
  });

  return null;
}

// ============================================================================
// Scene Content Component
// ============================================================================

function SceneContent({
  obstacles,
  path,
  pathPositions,
  settings,
  playbackPosition,
  selectedObstacleId,
  onObstacleClick,
}: {
  obstacles: PlanningObstacle[];
  path: PathWaypoint[];
  pathPositions: Array<[number, number, number]>;
  settings: typeof DEFAULT_SETTINGS;
  playbackPosition: number;
  selectedObstacleId: string | null;
  onObstacleClick: (obs: PlanningObstacle) => void;
}) {
  return (
    <>
      <ProcessScene
        urdfPath={URDF_PATH}
        showGhost={settings.showGhost}
        showTrajectory={false}
      >
        <EndEffector showAxes={true}>
          <mesh>
            <coneGeometry args={[0.015, 0.04, 8]} />
            <meshStandardMaterial color={THEME.accent} />
          </mesh>
        </EndEffector>
      </ProcessScene>

      {/* Obstacles */}
      <ObstacleVisualizer
        obstacles={obstacles}
        options={{
          showObstacles: settings.showObstacles,
          opacity: settings.obstacleOpacity,
          wireframe: false,
          collisionColor: THEME.danger,
        }}
        selectedId={selectedObstacleId}
        onObstacleClick={onObstacleClick}
      />

      {/* Planned Path */}
      {path.length > 0 && (
        <PathVisualizer
          pathPositions={pathPositions}
          options={{
            showPath: settings.showPath,
            pathColor: THEME.primary,
            pathWidth: 2,
            showWaypoints: settings.showWaypoints,
            waypointSize: 0.008,
            showEndpoints: true,
            animatePath: settings.animatePath,
            animationSpeed: settings.animationSpeed,
            showVelocityProfile: false,
          }}
          playbackPosition={playbackPosition}
        />
      )}

      {/* Lighting - Z-up: height is Z coordinate */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[-2, 2, 3]} intensity={0.3} color="#e0e0ff" />

      {/* Ground plane - Z-up: PlaneGeometry is already on XY plane, no rotation needed */}
      <mesh position={[0, 0, -0.16]} receiveShadow>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.1} roughness={0.9} />
      </mesh>
    </>
  );
}

// ============================================================================
// Inner Component with Context Access
// ============================================================================

function MotionPlanningInner() {
  const { addLog } = useAppStore();

  // State
  const [obstacles, setObstacles] = useState<PlanningObstacle[]>(DEFAULT_OBSTACLES);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [startJoints, setStartJoints] = useState<number[]>(DEFAULT_START);
  const [goalJoints, setGoalJoints] = useState<number[]>(DEFAULT_GOAL);
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentJoints, setCurrentJoints] = useState<number[]>(DEFAULT_START);

  // Refs
  const addLogRef = useRef(addLog);
  addLogRef.current = addLog;

  // Planning hook
  const {
    state: planningState,
    settings: plannerSettings,
    updateSettings: updatePlannerSettings,
    plan,
    abort,
    clearResult,
    createObstacleChecker,
  } = usePlanningPipeline({
    jointLimits: JOINT_LIMITS,
    defaultPlanner: 'birrt',
    autoInit: true,
    trajectoryConfig: TRAJECTORY_CONFIG,
    pipelineConfig: {
      enablePostProcessing: settings.enablePostProcessing,
      shortcutIterations: settings.shortcutIterations,
      smoothIterations: settings.smoothIterations,
      smoothingFactor: 0.5,
      calculateMetrics: true,
    },
  });

  // Compute path positions for visualization
  const pathPositions = useMemo<Array<[number, number, number]>>(() => {
    if (!planningState.result?.path) return [];
    return planningState.result.path.map((wp) => computeApproximateTcpPosition(wp.joints));
  }, [planningState.result?.path]);

  // Create collision checker from obstacles
  const collisionChecker = useMemo(() => {
    return createObstacleChecker(
      obstacles.filter((o) => o.enabled),
      getRobotBoundingSpheres
    );
  }, [obstacles, createObstacleChecker]);

  // Handle planning
  const handlePlan = useCallback(async () => {
    addLogRef.current('info', `Starting ${plannerSettings.type.toUpperCase()} planning...`);

    const result = await plan(startJoints, goalJoints, collisionChecker);

    if (result.success) {
      addLogRef.current(
        'info',
        `Path found: ${result.path.length} waypoints in ${result.totalTimeMs.toFixed(0)}ms`
      );
      setIsAnimating(settings.animatePath);
      setPlaybackPosition(0);
    } else {
      addLogRef.current('error', `Planning failed: ${result.error}`);
    }
  }, [plan, startJoints, goalJoints, collisionChecker, plannerSettings.type, settings.animatePath]);

  // Handle abort
  const handleAbort = useCallback(() => {
    abort();
    addLogRef.current('warning', 'Planning aborted');
  }, [abort]);

  // Handle clear
  const handleClear = useCallback(() => {
    clearResult();
    setIsAnimating(false);
    setPlaybackPosition(0);
    addLogRef.current('info', 'Results cleared');
  }, [clearResult]);

  // Handle obstacle click
  const handleObstacleClick = useCallback((obs: PlanningObstacle) => {
    setSelectedObstacleId((prev) => (prev === obs.id ? null : obs.id));
    addLogRef.current('info', `Selected obstacle: ${obs.name}`);
  }, []);

  // Handle animation position change
  const handleAnimationPosition = useCallback((position: number, joints: number[]) => {
    setPlaybackPosition(position);
    setCurrentJoints(joints);
  }, []);

  // Toggle obstacle
  const toggleObstacle = useCallback((id: string) => {
    setObstacles((prev) =>
      prev.map((obs) =>
        obs.id === id ? { ...obs, enabled: !obs.enabled } : obs
      )
    );
  }, []);

  // Reset start to current
  const resetStartToCurrent = useCallback(() => {
    setStartJoints(currentJoints);
    addLogRef.current('info', 'Start set to current position');
  }, [currentJoints]);

  // Set goal from preset
  const setGoalPreset = useCallback((preset: 'home' | 'extended' | 'custom') => {
    switch (preset) {
      case 'home':
        setGoalJoints([0, 0, 0, 0, 0, 0]);
        break;
      case 'extended':
        setGoalJoints([1.5, 0.8, -1.2, 0, 1.0, 0]);
        break;
      case 'custom':
        setGoalJoints(DEFAULT_GOAL);
        break;
    }
    addLogRef.current('info', `Goal preset: ${preset}`);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const result = planningState.result;
    if (!result?.success) return null;

    return {
      waypoints: result.path.length,
      planTime: result.planningTimeMs,
      totalTime: result.totalTimeMs,
      pathLength: result.metrics?.pathLength,
      improvement: result.metrics?.improvementRatio,
    };
  }, [planningState.result]);

  return (
    <div className="module-container" style={{ background: THEME.background, maxHeight: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div className="module-header" style={{ borderBottom: `1px solid ${THEME.primary}40` }}>
        <h2 style={{ color: THEME.primary }}>Motion Planning</h2>
        <p style={{ color: THEME.textSecondary }}>
          GPU-accelerated path planning with collision avoidance
        </p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '12px 16px',
            background: THEME.surface,
            borderRadius: 8,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <StatBadge label="Waypoints" value={stats.waypoints} color={THEME.primary} />
          <StatBadge label="Plan Time" value={`${stats.planTime.toFixed(0)}ms`} color={THEME.success} />
          <StatBadge label="Total Time" value={`${stats.totalTime.toFixed(0)}ms`} color={THEME.secondary} />
          {stats.pathLength && (
            <StatBadge label="Path Length" value={stats.pathLength.toFixed(3)} color={THEME.textSecondary} />
          )}
          {stats.improvement !== undefined && stats.improvement > 0 && (
            <StatBadge
              label="Optimized"
              value={`${(stats.improvement * 100).toFixed(1)}%`}
              color={THEME.success}
            />
          )}
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left Panel */}
        <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Planning Control */}
          <PlanningControlPanel
            state={planningState}
            settings={plannerSettings}
            onUpdateSettings={updatePlannerSettings}
            onPlan={handlePlan}
            onAbort={handleAbort}
            onClearResult={handleClear}
            theme={THEME}
          />

          {/* Goal Presets */}
          <div
            style={{
              background: THEME.panel,
              borderRadius: 8,
              border: `1px solid ${THEME.primary}40`,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: THEME.textSecondary, marginBottom: 8 }}>
              Goal Presets
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={presetButtonStyle} onClick={() => setGoalPreset('home')}>
                Home
              </button>
              <button style={presetButtonStyle} onClick={() => setGoalPreset('extended')}>
                Extended
              </button>
              <button style={presetButtonStyle} onClick={() => setGoalPreset('custom')}>
                Custom
              </button>
              <button style={presetButtonStyle} onClick={resetStartToCurrent}>
                Set Start
              </button>
            </div>
          </div>

          {/* Obstacles List */}
          <div
            style={{
              background: THEME.panel,
              borderRadius: 8,
              border: `1px solid ${THEME.primary}40`,
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, color: THEME.textSecondary, marginBottom: 8 }}>
              Obstacles ({obstacles.filter((o) => o.enabled).length}/{obstacles.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {obstacles.map((obs) => (
                <div
                  key={obs.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 8px',
                    background: selectedObstacleId === obs.id ? `${THEME.primary}20` : 'transparent',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedObstacleId(obs.id)}
                >
                  <input
                    type="checkbox"
                    checked={obs.enabled}
                    onChange={() => toggleObstacle(obs.id)}
                    style={{ accentColor: THEME.primary }}
                  />
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: obs.color,
                    }}
                  />
                  <span style={{ fontSize: 11, color: THEME.text, flex: 1 }}>{obs.name}</span>
                  <span style={{ fontSize: 10, color: THEME.textSecondary }}>{obs.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visualization Settings */}
          <div
            style={{
              background: THEME.panel,
              borderRadius: 8,
              border: `1px solid ${THEME.primary}40`,
              overflow: 'hidden',
            }}
          >
            <PropertyEditor
              schema={SETTINGS_SCHEMA}
              value={settings as unknown as Record<string, unknown>}
              onChange={(v) => setSettings(v as unknown as typeof DEFAULT_SETTINGS)}
              theme="dark"
              compact={true}
              hideActions={true}
              autoSave={true}
            />
          </div>
        </div>

        {/* Right Panel - 3D View */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              height: 550,
              borderRadius: 8,
              overflow: 'hidden',
              border: `1px solid ${THEME.primary}30`,
            }}
          >
            <RoboViz
              config={{
                scene: { background: THEME.background },
                camera: { position: { x: 1.2, y: 0.8, z: 1.2 } },
              }}
            >
              <SceneContent
                obstacles={obstacles}
                path={planningState.result?.path || []}
                pathPositions={pathPositions}
                settings={settings}
                playbackPosition={playbackPosition}
                selectedObstacleId={selectedObstacleId}
                onObstacleClick={handleObstacleClick}
              />

              {/* Animation controller */}
              {isAnimating && planningState.result?.path && (
                <PathAnimator
                  path={planningState.result.path}
                  isPlaying={isAnimating}
                  speed={settings.animationSpeed}
                  onPositionChange={handleAnimationPosition}
                />
              )}
            </RoboViz>
          </div>

          {/* Playback Controls */}
          {planningState.result?.success && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: THEME.surface,
                borderRadius: 8,
              }}
            >
              <button
                style={{
                  ...presetButtonStyle,
                  background: isAnimating ? THEME.danger : THEME.primary,
                }}
                onClick={() => setIsAnimating(!isAnimating)}
              >
                {isAnimating ? 'Stop' : 'Play'}
              </button>

              <div style={{ flex: 1 }}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={playbackPosition}
                  onChange={(e) => {
                    const pos = parseFloat(e.target.value);
                    setPlaybackPosition(pos);

                    const path = planningState.result?.path;
                    if (path && path.length > 1) {
                      const idx = Math.floor(pos * (path.length - 1));
                      setCurrentJoints(path[idx].joints);
                    }
                  }}
                  style={{ width: '100%', accentColor: THEME.primary }}
                />
              </div>

              <span style={{ fontSize: 11, color: THEME.textSecondary, minWidth: 40 }}>
                {Math.round(playbackPosition * 100)}%
              </span>
            </div>
          )}

          {/* Keyboard Shortcuts */}
          <div
            style={{
              padding: 10,
              background: `${THEME.surface}80`,
              borderRadius: 6,
              fontSize: 11,
              color: THEME.textSecondary,
            }}
          >
            <strong>Tips:</strong>
            <span style={{ marginLeft: 12 }}>
              Click obstacles to select • Toggle checkboxes to enable/disable • Use presets for quick goal setting
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const presetButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 500,
  background: '#333',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

// ============================================================================
// Helper Components
// ============================================================================

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        backgroundColor: `${color}15`,
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      <span style={{ color: THEME.textSecondary }}>{label}:</span>
      <span style={{ fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export function MotionPlanningScene() {
  return (
    <ProcessProvider>
      <RobotProcessProvider urdfPath={URDF_PATH} robotId="motion-planning-robot">
        <MotionPlanningInner />
      </RobotProcessProvider>
    </ProcessProvider>
  );
}

export default MotionPlanningScene;
