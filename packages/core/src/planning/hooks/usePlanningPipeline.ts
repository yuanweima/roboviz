/**
 * usePlanningPipeline Hook
 *
 * React hook for GPU-accelerated motion planning.
 * Provides a complete interface to the motion planning pipeline.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { getMotionPlanningManager } from '../planning-manager';
import type {
  PlanningRequest,
  PlanningResult,
  PathWaypoint,
  PathMetrics,
  PipelineProgress,
  PipelineStage,
  CollisionChecker,
  PlannerType,
  BiRRTConfig,
  RRTStarConfig,
  PRMConfig,
  TaskSpaceRRTConfig,
  PipelineConfig,
  TrajectoryGeneratorConfig,
  PlanningObstacle,
} from '../types';
import {
  DEFAULT_BIRRT_CONFIG,
  DEFAULT_RRT_STAR_CONFIG,
  DEFAULT_PRM_CONFIG,
  DEFAULT_TASK_SPACE_RRT_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
} from '../types';

// ============================================================================
// Types
// ============================================================================

export interface UsePlanningPipelineOptions {
  /** Joint limits for the robot */
  jointLimits?: {
    lower: number[];
    upper: number[];
  };
  /** Default planner type */
  defaultPlanner?: PlannerType;
  /** Auto-initialize on mount */
  autoInit?: boolean;
  /** Default trajectory config */
  trajectoryConfig?: TrajectoryGeneratorConfig;
  /** Default pipeline config */
  pipelineConfig?: PipelineConfig;
}

export interface PlanningState {
  /** Whether the planner is ready */
  ready: boolean;
  /** Whether planning is in progress */
  isPlanning: boolean;
  /** Current pipeline stage */
  stage: PipelineStage;
  /** Progress 0-1 */
  progress: number;
  /** Status message */
  message: string;
  /** Last result */
  result: PlanningResult | null;
  /** Last error */
  error: string | null;
}

export interface PlannerSettings {
  type: PlannerType;
  birrt: BiRRTConfig;
  rrtStar: RRTStarConfig;
  prm: PRMConfig;
  taskSpaceRrt: TaskSpaceRRTConfig;
  pipeline: PipelineConfig;
  enableCollisionCheck: boolean;
  enableTrajectory: boolean;
}

export interface UsePlanningPipelineReturn {
  /** Planning state */
  state: PlanningState;

  /** Planner settings */
  settings: PlannerSettings;

  /** Update planner settings */
  updateSettings: (updates: Partial<PlannerSettings>) => void;

  /** Plan a path */
  plan: (
    startJoints: number[],
    goalJoints: number[],
    collisionChecker?: CollisionChecker
  ) => Promise<PlanningResult>;

  /** Plan with full request */
  planWithRequest: (
    request: Omit<PlanningRequest, 'jointLimits'>,
    collisionChecker?: CollisionChecker
  ) => Promise<PlanningResult>;

  /** Abort current planning */
  abort: () => void;

  /** Clear last result */
  clearResult: () => void;

  /** Create collision checker from obstacles */
  createObstacleChecker: (
    obstacles: PlanningObstacle[],
    robotTransforms: (joints: number[]) => Array<{ position: [number, number, number]; radius: number }>
  ) => CollisionChecker;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePlanningPipeline(
  options: UsePlanningPipelineOptions = {}
): UsePlanningPipelineReturn {
  const {
    jointLimits,
    defaultPlanner = 'birrt',
    autoInit = true,
    trajectoryConfig,
    pipelineConfig,
  } = options;

  // Manager reference
  const managerRef = useRef(getMotionPlanningManager());

  // State
  const [ready, setReady] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<PlanningResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<PlannerSettings>({
    type: defaultPlanner,
    birrt: { ...DEFAULT_BIRRT_CONFIG },
    rrtStar: { ...DEFAULT_RRT_STAR_CONFIG },
    prm: { ...DEFAULT_PRM_CONFIG },
    taskSpaceRrt: { ...DEFAULT_TASK_SPACE_RRT_CONFIG },
    pipeline: pipelineConfig || { ...DEFAULT_PIPELINE_CONFIG },
    enableCollisionCheck: true,
    enableTrajectory: !!trajectoryConfig,
  });

  // Initialize on mount
  useEffect(() => {
    if (autoInit) {
      managerRef.current.initialize().then(() => {
        setReady(true);
      }).catch((err) => {
        setError(err.message);
      });
    }
  }, [autoInit]);

  // Progress callback
  const onProgress = useCallback((prog: PipelineProgress) => {
    setStage(prog.stage);
    setProgress(prog.progress);
    if (prog.message) {
      setMessage(prog.message);
    }
  }, []);

  // Get current planner config
  const getCurrentPlannerConfig = useCallback(() => {
    switch (settings.type) {
      case 'birrt':
        return settings.birrt;
      case 'rrt-star':
        return settings.rrtStar;
      case 'prm':
        return settings.prm;
      case 'task-space-rrt':
        return settings.taskSpaceRrt;
      default:
        return settings.birrt;
    }
  }, [settings]);

  // Plan function
  const plan = useCallback(
    async (
      startJoints: number[],
      goalJoints: number[],
      collisionChecker?: CollisionChecker
    ): Promise<PlanningResult> => {
      if (!jointLimits) {
        const err = { success: false, error: 'Joint limits not provided', path: [], totalTimeMs: 0, planningTimeMs: 0, collisionChecked: false } as PlanningResult;
        setResult(err);
        setError(err.error!);
        return err;
      }

      const request: PlanningRequest = {
        startJoints,
        goal: { type: 'joints', joints: goalJoints },
        jointLimits,
        planner: {
          type: settings.type,
          config: getCurrentPlannerConfig(),
        },
        pipeline: settings.pipeline,
        trajectory: settings.enableTrajectory ? trajectoryConfig : undefined,
        validateEndpoints: settings.enableCollisionCheck,
      };

      setIsPlanning(true);
      setError(null);
      setStage('validating');
      setProgress(0);
      setMessage('Starting planning...');

      try {
        const checker = settings.enableCollisionCheck ? collisionChecker : undefined;
        const planResult = await managerRef.current.plan(request, checker, onProgress);

        setResult(planResult);

        if (!planResult.success) {
          setError(planResult.error || 'Planning failed');
        }

        return planResult;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        const errResult: PlanningResult = {
          success: false,
          error: errorMsg,
          path: [],
          totalTimeMs: 0,
          planningTimeMs: 0,
          collisionChecked: false,
        };
        setResult(errResult);
        return errResult;
      } finally {
        setIsPlanning(false);
      }
    },
    [jointLimits, settings, getCurrentPlannerConfig, trajectoryConfig, onProgress]
  );

  // Plan with full request
  const planWithRequest = useCallback(
    async (
      request: Omit<PlanningRequest, 'jointLimits'>,
      collisionChecker?: CollisionChecker
    ): Promise<PlanningResult> => {
      if (!jointLimits) {
        const err = { success: false, error: 'Joint limits not provided', path: [], totalTimeMs: 0, planningTimeMs: 0, collisionChecked: false } as PlanningResult;
        setResult(err);
        setError(err.error!);
        return err;
      }

      const fullRequest: PlanningRequest = {
        ...request,
        jointLimits,
      };

      setIsPlanning(true);
      setError(null);
      setStage('validating');
      setProgress(0);
      setMessage('Starting planning...');

      try {
        const planResult = await managerRef.current.plan(fullRequest, collisionChecker, onProgress);

        setResult(planResult);

        if (!planResult.success) {
          setError(planResult.error || 'Planning failed');
        }

        return planResult;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        const errResult: PlanningResult = {
          success: false,
          error: errorMsg,
          path: [],
          totalTimeMs: 0,
          planningTimeMs: 0,
          collisionChecked: false,
        };
        setResult(errResult);
        return errResult;
      } finally {
        setIsPlanning(false);
      }
    },
    [jointLimits, onProgress]
  );

  // Abort
  const abort = useCallback(() => {
    managerRef.current.abort();
    setIsPlanning(false);
    setStage('idle');
    setMessage('Planning aborted');
  }, []);

  // Clear result
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setStage('idle');
    setProgress(0);
    setMessage('');
  }, []);

  // Update settings
  const updateSettings = useCallback((updates: Partial<PlannerSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // Create obstacle-based collision checker
  const createObstacleChecker = useCallback(
    (
      obstacles: PlanningObstacle[],
      robotTransforms: (joints: number[]) => Array<{ position: [number, number, number]; radius: number }>
    ): CollisionChecker => {
      return (joints: number[]) => {
        const robotSpheres = robotTransforms(joints);

        for (const sphere of robotSpheres) {
          for (const obstacle of obstacles) {
            if (!obstacle.enabled) continue;

            if (checkSphereObstacleCollision(sphere, obstacle)) {
              return false; // Collision detected
            }
          }
        }

        return true; // No collision
      };
    },
    []
  );

  // Memoized state
  const state = useMemo<PlanningState>(
    () => ({
      ready,
      isPlanning,
      stage,
      progress,
      message,
      result,
      error,
    }),
    [ready, isPlanning, stage, progress, message, result, error]
  );

  return {
    state,
    settings,
    updateSettings,
    plan,
    planWithRequest,
    abort,
    clearResult,
    createObstacleChecker,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check collision between robot sphere and obstacle
 */
function checkSphereObstacleCollision(
  sphere: { position: [number, number, number]; radius: number },
  obstacle: PlanningObstacle
): boolean {
  const [sx, sy, sz] = sphere.position;
  const [ox, oy, oz] = obstacle.position;

  switch (obstacle.type) {
    case 'sphere': {
      const obstacleRadius = obstacle.dimensions[0];
      const dx = sx - ox;
      const dy = sy - oy;
      const dz = sz - oz;
      const distSq = dx * dx + dy * dy + dz * dz;
      const minDist = sphere.radius + obstacleRadius;
      return distSq < minDist * minDist;
    }

    case 'box': {
      const [hw, hh, hd] = obstacle.dimensions.map((d) => d / 2);
      // Find closest point on box to sphere center
      const closestX = Math.max(ox - hw, Math.min(sx, ox + hw));
      const closestY = Math.max(oy - hh, Math.min(sy, oy + hh));
      const closestZ = Math.max(oz - hd, Math.min(sz, oz + hd));

      const dx = sx - closestX;
      const dy = sy - closestY;
      const dz = sz - closestZ;
      const distSq = dx * dx + dy * dy + dz * dz;

      return distSq < sphere.radius * sphere.radius;
    }

    case 'cylinder': {
      const [radius, height] = obstacle.dimensions;
      const halfHeight = height / 2;

      // Check if within vertical bounds
      if (sz < oz - halfHeight - sphere.radius || sz > oz + halfHeight + sphere.radius) {
        return false;
      }

      // Check horizontal distance
      const dx = sx - ox;
      const dy = sy - oy;
      const horizDistSq = dx * dx + dy * dy;
      const minHorizDist = sphere.radius + radius;

      return horizDistSq < minHorizDist * minHorizDist;
    }

    default:
      return false;
  }
}

export default usePlanningPipeline;
