/**
 * Cable Planning Hook
 *
 * Hook for cable-aware motion planning integration with trajx.
 * Note: Full functionality requires trajx cable-aware planner implementation.
 */

import { useCallback, useState, useMemo } from 'react';
import { useCableManagement } from '../CableManagementContext';
import { analyzeTrajectoryTwist } from '../utils/twist-calculator';
import { getWarningLevelFromTwist } from '../constants';
import type {
  CableConfig,
  CableAwarePlanRequest,
  CableAwarePlanResult,
  CycleOptimizationRequest,
  CycleOptimizationResult,
  TrajectoryTwistAnalysis,
  TrajectoryWarningPoint,
  TwistProfilePoint,
} from '../types';

// ============================================================
// Types
// ============================================================

export interface UseCablePlanningOptions {
  robotId: string;
}

export interface UseCablePlanningReturn {
  /** Whether the planner is ready */
  ready: boolean;

  /** Whether planning is in progress */
  isPlanning: boolean;

  /** Cable-aware path planning */
  planPath: (request: CableAwarePlanRequest) => Promise<CableAwarePlanResult>;

  /** Analyze trajectory for cable twist */
  analyzeTrajectory: (
    trajectoryJoints: number[][],
    startTwist?: number,
    cableId?: string
  ) => TrajectoryTwistAnalysis;

  /** Cycle optimization */
  optimizeCycle: (request: CycleOptimizationRequest) => Promise<CycleOptimizationResult>;

  /** Check if trajectory is safe */
  isTrajectoryValid: (
    trajectoryJoints: number[][],
    cableId: string
  ) => { valid: boolean; reason?: string };

  /** Last error */
  error: Error | null;
}

// ============================================================
// Hook Implementation
// ============================================================

export function useCablePlanning({
  robotId,
}: UseCablePlanningOptions): UseCablePlanningReturn {
  const { state } = useCableManagement();
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if trajx cable-aware planner is available
  // TODO: Integrate with actual trajx-wasm when implemented
  const ready = true;

  /**
   * Plan a cable-aware path
   */
  const planPath = useCallback(
    async (request: CableAwarePlanRequest): Promise<CableAwarePlanResult> => {
      setIsPlanning(true);
      setError(null);

      try {
        // TODO: Call trajx-wasm CableAwareBiRRTPlanner when available
        // For now, use front-end fallback

        const { startJoints, goalJoints, startTwist, cableConfig, options } = request;

        // Simple linear interpolation path
        const numSteps = 20;
        const path: number[][] = [];

        for (let i = 0; i <= numSteps; i++) {
          const t = i / numSteps;
          const interpolated = startJoints.map(
            (start, j) => start + t * (goalJoints[j] - start)
          );
          path.push(interpolated);
        }

        // Analyze twist along path
        const analysis = analyzeTrajectoryTwist(path, startTwist);

        // Check if path exceeds limits
        const exceedsLimit =
          Math.abs(analysis.maxTwist) >= cableConfig.twistConstraints.maxTwist;

        if (exceedsLimit && options.enableAutoUnwind) {
          // TODO: Implement auto-unwind with trajx
          // For now, just return the result with a note
          return {
            success: true,
            path,
            twistProfile: analysis.profile,
            finalTwist: analysis.profile[analysis.profile.length - 1] ?? startTwist,
            hasUnwindMotion: false,
            planningTime: 0,
            errorMessage: 'Auto-unwind not implemented yet - requires trajx integration',
          };
        }

        return {
          success: true,
          path,
          twistProfile: analysis.profile,
          finalTwist: analysis.profile[analysis.profile.length - 1] ?? startTwist,
          hasUnwindMotion: false,
          planningTime: 0,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return {
          success: false,
          path: [],
          twistProfile: [],
          finalTwist: request.startTwist,
          hasUnwindMotion: false,
          planningTime: 0,
          errorMessage: error.message,
        };
      } finally {
        setIsPlanning(false);
      }
    },
    []
  );

  /**
   * Analyze a trajectory for cable twist
   */
  const analyzeTrajectory = useCallback(
    (
      trajectoryJoints: number[][],
      startTwist: number = 0,
      cableId?: string
    ): TrajectoryTwistAnalysis => {
      // Get cable config if specified
      const cableConfig = cableId ? state.cables.get(cableId) : undefined;
      const constraints = cableConfig?.twistConstraints ?? {
        maxTwist: Math.PI * 2,
        warningThreshold: Math.PI * 1.5,
        criticalThreshold: Math.PI * 1.8,
        enableAutoUnwindSuggestion: true,
      };

      // Calculate twist profile
      const analysis = analyzeTrajectoryTwist(trajectoryJoints, startTwist);

      // Generate warning points
      const warningPoints: TrajectoryWarningPoint[] = [];
      analysis.profile.forEach((twist, i) => {
        const level = getWarningLevelFromTwist(twist, constraints);
        if (level !== 'safe') {
          warningPoints.push({
            position: i / (analysis.profile.length - 1),
            waypointIndex: i,
            twist,
            level,
            message: `Twist ${((twist * 180) / Math.PI).toFixed(1)}° (${level})`,
          });
        }
      });

      // Generate twist profile points
      const twistProfile: TwistProfilePoint[] = analysis.profile.map((twist, i) => ({
        t: i / (analysis.profile.length - 1),
        twist,
        twistRate: i > 0 ? analysis.profile[i] - analysis.profile[i - 1] : 0,
      }));

      const endTwist = analysis.profile[analysis.profile.length - 1] ?? startTwist;

      return {
        trajectoryId: `analysis-${Date.now()}`,
        startTwist,
        endTwist,
        netTwistChange: analysis.netChange,
        maxTwist: analysis.maxTwist,
        maxTwistPosition: analysis.maxTwistIndex / (analysis.profile.length - 1),
        exceedsLimit: analysis.maxTwist >= constraints.maxTwist,
        warningPoints,
        twistProfile,
        optimization:
          analysis.maxTwist >= constraints.warningThreshold
            ? {
                type: 'add_unwind',
                description: 'Consider adding an unwind motion to reduce cable stress',
                estimatedImprovement: 50,
                details: {
                  suggestedUnwindPoint: analysis.maxTwistIndex,
                },
              }
            : undefined,
      };
    },
    [state.cables]
  );

  /**
   * Optimize cycle for minimum cable twist
   */
  const optimizeCycle = useCallback(
    async (request: CycleOptimizationRequest): Promise<CycleOptimizationResult> => {
      setIsPlanning(true);
      setError(null);

      try {
        // TODO: Implement with trajx cycle optimizer
        // For now, return original order

        const paths: CableAwarePlanResult[] = [];
        let currentJoints = request.startJoints;
        let currentTwist = request.startTwist;

        for (const task of request.tasks) {
          const result = await planPath({
            startJoints: currentJoints,
            startTwist: currentTwist,
            goalJoints: task.goalJoints,
            cableConfig: request.cableConfig,
            options: {
              enableAutoUnwind: false,
              maxPlanningTime: 1000,
              checkCollision: false,
              optimizationGoal: 'min_twist',
            },
          });

          paths.push(result);
          currentJoints = task.goalJoints;
          currentTwist = result.finalTwist;
        }

        const netTwist = currentTwist - request.startTwist;
        const maxTwist = Math.max(...paths.map((p) => Math.max(...p.twistProfile.map(Math.abs))));

        return {
          success: true,
          optimizedOrder: request.tasks.map((t) => t.id),
          paths,
          netTwist,
          maxTwist,
          improvement: 0, // No optimization without trajx
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return {
          success: false,
          optimizedOrder: [],
          paths: [],
          netTwist: 0,
          maxTwist: 0,
          improvement: 0,
        };
      } finally {
        setIsPlanning(false);
      }
    },
    [planPath]
  );

  /**
   * Quick check if trajectory is valid for cable
   */
  const isTrajectoryValid = useCallback(
    (
      trajectoryJoints: number[][],
      cableId: string
    ): { valid: boolean; reason?: string } => {
      const cable = state.cables.get(cableId);
      if (!cable) {
        return { valid: false, reason: 'Cable not found' };
      }

      const cableState = state.cableStates.get(cableId);
      const startTwist = cableState?.currentTwist ?? 0;

      const analysis = analyzeTrajectory(trajectoryJoints, startTwist, cableId);

      if (analysis.exceedsLimit) {
        return {
          valid: false,
          reason: `Maximum twist ${((analysis.maxTwist * 180) / Math.PI).toFixed(1)}° exceeds limit`,
        };
      }

      if (analysis.warningPoints.length > 0) {
        const criticalPoints = analysis.warningPoints.filter(
          (p) => p.level === 'critical' || p.level === 'warning'
        );
        if (criticalPoints.length > 0) {
          return {
            valid: false,
            reason: `${criticalPoints.length} critical points along trajectory`,
          };
        }
      }

      return { valid: true };
    },
    [state.cables, state.cableStates, analyzeTrajectory]
  );

  return useMemo(
    () => ({
      ready,
      isPlanning,
      planPath,
      analyzeTrajectory,
      optimizeCycle,
      isTrajectoryValid,
      error,
    }),
    [ready, isPlanning, planPath, analyzeTrajectory, optimizeCycle, isTrajectoryValid, error]
  );
}
