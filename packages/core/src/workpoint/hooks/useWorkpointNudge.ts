/**
 * useWorkpointNudge Hook
 *
 * Provides keyboard-based precise adjustment (nudging) for workpoint
 * position and rotation. Supports fine/coarse adjustment with modifiers.
 *
 * Usage:
 * - Arrow keys: X/Y axis adjustment
 * - PageUp/PageDown: Z axis adjustment
 * - Shift modifier: 10x step (coarse)
 * - Alt modifier: 0.1x step (fine)
 *
 * In translate mode: adjusts position
 * In rotate mode: adjusts rotation around axes
 */

import { useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useWorkpointStore } from '../store';
import type { Vector3Tuple, QuaternionTuple } from '../../types';

/**
 * Nudge direction for each axis
 */
export type NudgeAxis = 'x' | 'y' | 'z';
export type NudgeDirection = 1 | -1;

/**
 * Options for the nudge hook
 */
export interface UseWorkpointNudgeOptions {
  /** Whether nudging is enabled */
  enabled?: boolean;
  /** Position step in meters (default: 0.001 = 1mm) */
  positionStep?: number;
  /** Rotation step in degrees (default: 1) */
  rotationStep?: number;
  /** Fine adjustment multiplier (Alt key, default: 0.1) */
  fineMultiplier?: number;
  /** Coarse adjustment multiplier (Shift key, default: 10) */
  coarseMultiplier?: number;
  /** Callback when workpoint is nudged */
  onNudge?: (workpointId: string, axis: NudgeAxis, delta: number, isRotation: boolean) => void;
}

/**
 * Hook for keyboard-based precise workpoint adjustment
 */
export function useWorkpointNudge(options: UseWorkpointNudgeOptions = {}) {
  const {
    enabled = true,
    positionStep = 0.001, // 1mm default
    rotationStep = 1, // 1 degree default
    fineMultiplier = 0.1,
    coarseMultiplier = 10,
    onNudge,
  } = options;

  const store = useWorkpointStore;

  /**
   * Calculate effective step based on modifiers
   */
  const getEffectiveStep = useCallback(
    (baseStep: number, event: KeyboardEvent): number => {
      if (event.shiftKey) {
        return baseStep * coarseMultiplier;
      }
      if (event.altKey) {
        return baseStep * fineMultiplier;
      }
      return baseStep;
    },
    [coarseMultiplier, fineMultiplier]
  );

  /**
   * Nudge position along an axis
   */
  const nudgePosition = useCallback(
    (workpointId: string, axis: NudgeAxis, delta: number) => {
      const state = store.getState();
      const workpoint = state.getWorkpoint(workpointId);
      if (!workpoint) return;

      const newPosition: Vector3Tuple = [...workpoint.position];
      const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      newPosition[axisIndex] += delta;

      state.updateWorkpoint({
        id: workpointId,
        position: newPosition,
      });

      onNudge?.(workpointId, axis, delta, false);
    },
    [store, onNudge]
  );

  /**
   * Nudge rotation around an axis
   */
  const nudgeRotation = useCallback(
    (workpointId: string, axis: NudgeAxis, deltaDegrees: number) => {
      const state = store.getState();
      const workpoint = state.getWorkpoint(workpointId);
      if (!workpoint) return;

      const deltaRad = (deltaDegrees * Math.PI) / 180;

      // Create rotation quaternion around the specified axis
      const axisVec = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      );

      const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, deltaRad);
      const currentQuat = new THREE.Quaternion(...workpoint.quaternion);

      // Apply rotation: new = delta * current (pre-multiply for local rotation)
      currentQuat.premultiply(deltaQuat);
      currentQuat.normalize();

      const newQuaternion: QuaternionTuple = [
        currentQuat.x,
        currentQuat.y,
        currentQuat.z,
        currentQuat.w,
      ];

      state.updateWorkpoint({
        id: workpointId,
        quaternion: newQuaternion,
      });

      onNudge?.(workpointId, axis, deltaDegrees, true);
    },
    [store, onNudge]
  );

  /**
   * Handle keyboard events for nudging
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const state = store.getState();
      const { mode, gizmoMode, selectedWorkpointId } = state;

      // Only work in edit mode with a selected workpoint
      if (mode !== 'edit' || !selectedWorkpointId) {
        return;
      }

      // Determine axis and direction from key
      let axis: NudgeAxis | null = null;
      let direction: NudgeDirection = 1;

      switch (event.key) {
        case 'ArrowLeft':
          axis = 'x';
          direction = -1;
          break;
        case 'ArrowRight':
          axis = 'x';
          direction = 1;
          break;
        case 'ArrowUp':
          axis = 'y';
          direction = 1;
          break;
        case 'ArrowDown':
          axis = 'y';
          direction = -1;
          break;
        case 'PageUp':
          axis = 'z';
          direction = 1;
          break;
        case 'PageDown':
          axis = 'z';
          direction = -1;
          break;
        default:
          return; // Not a nudge key
      }

      // Prevent default behavior (scrolling, etc.)
      event.preventDefault();
      event.stopPropagation();

      if (gizmoMode === 'translate') {
        const step = getEffectiveStep(positionStep, event);
        nudgePosition(selectedWorkpointId, axis, direction * step);
      } else if (gizmoMode === 'rotate') {
        const step = getEffectiveStep(rotationStep, event);
        nudgeRotation(selectedWorkpointId, axis, direction * step);
      }
    },
    [store, positionStep, rotationStep, getEffectiveStep, nudgePosition, nudgeRotation]
  );

  /**
   * Register keyboard event listener
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  return {
    /** Manually nudge position */
    nudgePosition,
    /** Manually nudge rotation */
    nudgeRotation,
    /** Current step values for display */
    steps: {
      position: positionStep,
      rotation: rotationStep,
      fineMultiplier,
      coarseMultiplier,
    },
  };
}

/**
 * Format step value for display
 */
export function formatPositionStep(stepMeters: number): string {
  if (stepMeters >= 0.001) {
    return `${(stepMeters * 1000).toFixed(1)}mm`;
  }
  return `${(stepMeters * 1000000).toFixed(0)}μm`;
}

export function formatRotationStep(stepDegrees: number): string {
  return `${stepDegrees.toFixed(1)}°`;
}
