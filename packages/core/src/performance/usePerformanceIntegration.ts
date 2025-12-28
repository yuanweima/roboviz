/**
 * usePerformanceIntegration Hook
 *
 * Bridges PerformanceManager with React Three Fiber renderer.
 * Automatically tracks frame timing and render statistics.
 *
 * Usage:
 * ```tsx
 * function MyScene() {
 *   usePerformanceIntegration();
 *   return <mesh>...</mesh>;
 * }
 * ```
 */

import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { getPerformanceManager } from './performance-manager';

export interface UsePerformanceIntegrationOptions {
  /** Whether to track performance (default: true) */
  enabled?: boolean;
  /** Whether to reset render info after each frame (default: true) */
  resetInfoOnFrame?: boolean;
}

/**
 * Hook to integrate PerformanceManager with Three.js renderer.
 * Must be used inside a Canvas component.
 */
export function usePerformanceIntegration(
  options: UsePerformanceIntegrationOptions = {}
): void {
  const { enabled = true, resetInfoOnFrame = true } = options;
  const { gl } = useThree();
  const performanceManager = useRef(getPerformanceManager());

  // Track whether we should update this frame
  const isFirstFrame = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    // Auto-reset render info is typically done by Three.js after render
    // but we can control it if needed
    if (resetInfoOnFrame) {
      gl.info.autoReset = false;
    }

    return () => {
      // Restore auto-reset
      gl.info.autoReset = true;
    };
  }, [enabled, gl, resetInfoOnFrame]);

  useFrame(() => {
    if (!enabled) return;

    const pm = performanceManager.current;

    // End the previous frame (if not first frame)
    if (!isFirstFrame.current) {
      pm.endFrame();
    }
    isFirstFrame.current = false;

    // Begin new frame timing
    pm.beginFrame();

    // Update render statistics from WebGLRenderer
    const info = gl.info;
    pm.updateRenderStats({
      drawCalls: info.render?.calls ?? 0,
      triangles: info.render?.triangles ?? 0,
      points: info.render?.points ?? 0,
      lines: info.render?.lines ?? 0,
      geometries: info.memory?.geometries ?? 0,
      textures: info.memory?.textures ?? 0,
      programs: info.programs?.length ?? 0,
    });

    // Reset render info for next frame
    if (resetInfoOnFrame) {
      gl.info.reset();
    }
  });
}

export default usePerformanceIntegration;
