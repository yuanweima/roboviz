/**
 * useGpuPlanning Hook
 *
 * React hook for GPU-accelerated motion planning.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GpuPlanningEngine, createGpuPlanningEngine } from './GpuPlanningEngine';
import type {
  UseGpuPlanningOptions,
  UseGpuPlanningReturn,
  GpuPlanningProgress,
  GpuPlanningResult,
  PlannerParams,
} from './types';
import type { CollisionWorld } from '../../collision/world/types';
import { INITIAL_PLANNING_PROGRESS } from './types';
import type { PlanningWaypoint } from '../waypoint/types';

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGpuPlanning(options: UseGpuPlanningOptions): UseGpuPlanningReturn {
  const {
    robotUrdf,
    dof,
    jointLimits,
    collisionWorld,
    defaultPlanner = 'lazy-prm',
    defaultParams,
    autoInitialize = true,
  } = options;

  // State
  const [ready, setReady] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [progress, setProgress] = useState<GpuPlanningProgress>(INITIAL_PLANNING_PROGRESS);
  const [result, setResult] = useState<GpuPlanningResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Engine ref
  const engineRef = useRef<GpuPlanningEngine | null>(null);

  // Store collision world ref to avoid dependency issues
  const collisionWorldRef = useRef(collisionWorld);
  collisionWorldRef.current = collisionWorld;

  // Track if initialization has been attempted
  const initAttemptedRef = useRef(false);

  // Initialize engine - only depends on stable config values
  const initialize = useCallback(async () => {
    if (engineRef.current || initAttemptedRef.current) {
      return;
    }
    initAttemptedRef.current = true;

    try {
      setError(null);
      const engine = createGpuPlanningEngine({
        robotUrdf,
        dof,
        jointLimits,
        defaultPlanner,
        defaultParams,
      });

      // Subscribe to progress updates
      engine.onProgress((prog) => {
        setProgress(prog);
      });

      await engine.initialize();

      // Set collision world if provided (use ref for current value)
      if (collisionWorldRef.current) {
        engine.setCollisionWorld(collisionWorldRef.current);
      }

      engineRef.current = engine;
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize planning engine');
      setReady(false);
    }
  // Only include stable dependencies - exclude collisionWorld since it uses ref
  }, [robotUrdf, dof, jointLimits, defaultPlanner, defaultParams]);

  // Auto-initialize on mount (run only once)
  useEffect(() => {
    if (autoInitialize && !initAttemptedRef.current) {
      initialize();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInitialize]);

  // Update collision world when it changes (compare by reference)
  const prevCollisionWorldRef = useRef<CollisionWorld | undefined>(undefined);
  useEffect(() => {
    // Only update if engine is ready and collision world actually changed
    if (engineRef.current && collisionWorld && collisionWorld !== prevCollisionWorldRef.current) {
      engineRef.current.setCollisionWorld(collisionWorld);
      prevCollisionWorldRef.current = collisionWorld;
    }
  }, [collisionWorld]);

  // Plan to goal
  const planToGoal = useCallback(
    async (
      startJoints: number[],
      goalJoints: number[],
      params?: PlannerParams
    ): Promise<GpuPlanningResult> => {
      if (!engineRef.current) {
        throw new Error('Planning engine not initialized');
      }

      setIsPlanning(true);
      setError(null);
      setResult(null);

      try {
        const planResult = await engineRef.current.planPointToPoint({
          startJoints,
          goalJoints,
          params,
        });

        setResult(planResult);
        setIsPlanning(false);
        return planResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Planning failed';
        setError(errorMessage);
        setIsPlanning(false);
        throw err;
      }
    },
    []
  );

  // Plan through waypoints
  const planThroughWaypoints = useCallback(
    async (
      startJoints: number[],
      waypoints: PlanningWaypoint[],
      params?: PlannerParams
    ): Promise<GpuPlanningResult> => {
      if (!engineRef.current) {
        throw new Error('Planning engine not initialized');
      }

      setIsPlanning(true);
      setError(null);
      setResult(null);

      try {
        const planResult = await engineRef.current.planThroughWaypoints({
          startJoints,
          waypoints,
          params,
        });

        setResult(planResult);
        setIsPlanning(false);
        return planResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Planning failed';
        setError(errorMessage);
        setIsPlanning(false);
        throw err;
      }
    },
    []
  );

  // Abort planning
  const abort = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.abort();
      setIsPlanning(false);
    }
  }, []);

  // Clear result
  const clearResult = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.clearResult();
    }
    setResult(null);
    setError(null);
    setProgress(INITIAL_PLANNING_PROGRESS);
  }, []);

  // Set collision world
  const setCollisionWorld = useCallback((world: CollisionWorld) => {
    if (engineRef.current) {
      engineRef.current.setCollisionWorld(world);
    }
  }, []);

  return {
    ready,
    isPlanning,
    progress,
    result,
    error,
    initialize,
    planToGoal,
    planThroughWaypoints,
    abort,
    clearResult,
    setCollisionWorld,
  };
}

export default useGpuPlanning;
