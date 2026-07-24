/**
 * useInstancedRobotWorker Hook
 *
 * Manages Web Worker and SharedArrayBuffer for GPU Instancing + RL.
 * Uses trajx-wasm FK Worker for accurate batch FK computation.
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  type SharedBufferLayout,
  type SharedBufferViews,
  calculateBufferLayout,
  createBufferViews,
  CONTROL_FLAG,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface UseInstancedRobotWorkerOptions {
  /** Number of robot instances */
  robotCount: number;
  /** Robot name for DH database lookup (e.g., 'ur5', 'kuka_iiwa7') */
  robotName?: string;
  /** Number of joints per robot (auto-detected if robotName is provided) */
  jointCount?: number;
  /** Number of links per robot (auto-detected if robotName is provided) */
  linkCount?: number;
  /** Enable SharedArrayBuffer mode (requires COOP/COEP headers) */
  useSharedBuffer?: boolean;
  /** Use trajx-wasm FK Worker (recommended for accurate kinematics) */
  useTrajxWorker?: boolean;
  /**
   * URL to the FK Worker script. Required when useTrajxWorker is true.
   * Default: '/workers/fk-worker.js' (expects worker files in public/workers/)
   */
  workerUrl?: string;
  /** Callback when worker is ready */
  onReady?: (info: { jointCount: number; linkCount: number }) => void;
  /** Callback when FK computation completes */
  onFKComplete?: (transforms: Float32Array, computeTimeMs: number) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface InstancedRobotWorkerState {
  /** Whether worker is initialized and ready */
  ready: boolean;
  /** SharedArrayBuffer views for zero-copy access */
  buffers: SharedBufferViews | null;
  /** Buffer layout info */
  layout: SharedBufferLayout | null;
  /** Whether SharedArrayBuffer is supported and enabled */
  sharedBufferEnabled: boolean;
  /** Last FK computation time in ms */
  lastComputeTimeMs: number;
  /** Actual joint count from worker */
  jointCount: number;
  /** Actual link count from worker */
  linkCount: number;
}

export interface InstancedRobotWorkerActions {
  /** Update joint angles for all robots */
  setJointAngles: (angles: Float32Array) => void;
  /** Set joint angle for a single robot */
  setRobotJoints: (robotIndex: number, angles: number[]) => void;
  /** Set reward for a single robot */
  setReward: (robotIndex: number, value: number) => void;
  /** Trigger FK computation and return transforms */
  computeFK: () => Promise<Float32Array | null>;
  /** Terminate the worker */
  terminate: () => void;
}

export type UseInstancedRobotWorkerReturn = [InstancedRobotWorkerState, InstancedRobotWorkerActions];

// ============================================================================
// SharedArrayBuffer Support Check
// ============================================================================

function isSharedArrayBufferSupported(): boolean {
  try {
    if (typeof SharedArrayBuffer === 'undefined') return false;
    if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) return false;
    new SharedArrayBuffer(1);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Worker Message Types
// ============================================================================

interface WorkerReadyMessage {
  type: 'ready';
  jointCount: number;
  linkCount: number;
  robotCount: number;
  supportedRobots?: string[];
}

interface WorkerFKResultMessage {
  type: 'fk-result';
  transforms: Float32Array;
  computeTimeMs: number;
}

interface WorkerErrorMessage {
  type: 'error';
  message: string;
}

interface WorkerLoadedMessage {
  type: 'loaded';
}

type WorkerMessage = WorkerReadyMessage | WorkerFKResultMessage | WorkerErrorMessage | WorkerLoadedMessage;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useInstancedRobotWorker(
  options: UseInstancedRobotWorkerOptions
): UseInstancedRobotWorkerReturn {
  const {
    robotCount,
    robotName = 'ur5',
    jointCount: initialJointCount = 6,
    linkCount: initialLinkCount = 7,
    useSharedBuffer = false,
    useTrajxWorker = true,
    workerUrl = '/workers/fk-worker.js',
    onReady,
    onFKComplete,
    onError,
  } = options;

  // Worker ref
  const workerRef = useRef<Worker | null>(null);
  const jointAnglesRef = useRef<Float32Array | null>(null);
  const pendingComputeRef = useRef<{
    resolve: (result: { transforms: Float32Array; computeTimeMs: number }) => void;
    reject: (error: Error) => void;
  } | null>(null);

  // State
  const [ready, setReady] = useState(false);
  const [lastComputeTimeMs, setLastComputeTimeMs] = useState(0);
  const [actualJointCount, setActualJointCount] = useState(initialJointCount);
  const [actualLinkCount, setActualLinkCount] = useState(initialLinkCount);

  // SharedArrayBuffer setup
  const sharedBufferSupported = useMemo(() => isSharedArrayBufferSupported(), []);
  const sharedBufferEnabled = useSharedBuffer && sharedBufferSupported;

  // Calculate buffer layout (used for our own buffer management)
  const layout = useMemo(
    () => calculateBufferLayout(robotCount, actualJointCount, actualLinkCount),
    [robotCount, actualJointCount, actualLinkCount]
  );

  // Create our own SharedArrayBuffer and views for rewards (trajx worker doesn't have rewards)
  const sharedBuffer = useMemo(() => {
    if (!sharedBufferEnabled) return null;
    try {
      return new SharedArrayBuffer(layout.totalSize);
    } catch (e) {
      console.warn('[useInstancedRobotWorker] Failed to create SharedArrayBuffer:', e);
      return null;
    }
  }, [sharedBufferEnabled, layout.totalSize]);

  const bufferViews = useMemo(() => {
    if (!sharedBuffer) return null;
    return createBufferViews(sharedBuffer, layout);
  }, [sharedBuffer, layout]);

  // Initialize internal joint angles buffer
  useEffect(() => {
    jointAnglesRef.current = new Float32Array(robotCount * actualJointCount);
  }, [robotCount, actualJointCount]);

  // Initialize trajx-wasm FK Worker
  useEffect(() => {
    if (robotCount === 0) {
      return undefined;
    }

    if (!useTrajxWorker) {
      // Fallback: mark as ready without worker
      setReady(true);
      onReady?.({ jointCount: initialJointCount, linkCount: initialLinkCount });
      return undefined;
    }

    let mounted = true;
    let worker: Worker | null = null;

    function handleMessage(e: MessageEvent<WorkerMessage>) {
      const message = e.data;

      switch (message.type) {
        case 'loaded':
          // Worker script loaded, send init message
          if (worker && mounted) {
            worker.postMessage({
              type: 'init',
              robotName,
              robotCount,
            });
          }
          break;

        case 'ready':
          if (mounted) {
            setActualJointCount(message.jointCount);
            setActualLinkCount(message.linkCount);
            setReady(true);

            // Recreate joint angles buffer with correct size
            jointAnglesRef.current = new Float32Array(robotCount * message.jointCount);

            onReady?.({
              jointCount: message.jointCount,
              linkCount: message.linkCount,
            });

          }
          break;

        case 'fk-result':
          if (pendingComputeRef.current) {
            setLastComputeTimeMs(message.computeTimeMs);
            pendingComputeRef.current.resolve({
              transforms: message.transforms,
              computeTimeMs: message.computeTimeMs,
            });
            pendingComputeRef.current = null;
          }
          break;

        case 'error':
          console.error('[useInstancedRobotWorker] Worker error:', message.message);
          onError?.(message.message);
          if (pendingComputeRef.current) {
            pendingComputeRef.current.reject(new Error(message.message));
            pendingComputeRef.current = null;
          }
          break;
      }
    }

    function handleError(e: ErrorEvent) {
      console.error('[useInstancedRobotWorker] Worker load error:', e);
      onError?.(`Worker error: ${e.message}`);

      // Fallback: mark as ready without accurate FK
      if (mounted) {
        setReady(true);
        onReady?.({ jointCount: initialJointCount, linkCount: initialLinkCount });
      }
    }

    try {
      // Create worker from URL
      worker = new Worker(workerUrl, { type: 'module' });
      worker.onmessage = handleMessage;
      worker.onerror = handleError;
      workerRef.current = worker;
    } catch (error) {
      console.error('[useInstancedRobotWorker] Failed to create worker:', error);
      onError?.(error instanceof Error ? error.message : String(error));

      // Fallback: mark as ready without accurate FK
      if (mounted) {
        setReady(true);
        onReady?.({ jointCount: initialJointCount, linkCount: initialLinkCount });
      }
    }

    return () => {
      mounted = false;
      if (worker) {
        worker.terminate();
      }
      workerRef.current = null;
      setReady(false);
    };
  }, [robotCount, robotName, useTrajxWorker, workerUrl, initialJointCount, initialLinkCount, onReady, onError]);

  // Actions
  const setJointAngles = useCallback(
    (angles: Float32Array) => {
      // Store in our internal buffer
      if (jointAnglesRef.current && angles.length <= jointAnglesRef.current.length) {
        jointAnglesRef.current.set(angles);
      }

      // Also update SharedArrayBuffer views if available
      if (bufferViews) {
        bufferViews.jointAngles.set(angles);
        Atomics.store(bufferViews.control, 0, CONTROL_FLAG.READY_FOR_WRITE);
      }
    },
    [bufferViews]
  );

  const setRobotJoints = useCallback(
    (robotIndex: number, angles: number[]) => {
      if (jointAnglesRef.current) {
        const offset = robotIndex * actualJointCount;
        for (let i = 0; i < angles.length && i < actualJointCount; i++) {
          jointAnglesRef.current[offset + i] = angles[i];
        }
      }

      if (bufferViews) {
        const offset = robotIndex * actualJointCount;
        for (let i = 0; i < angles.length && i < actualJointCount; i++) {
          bufferViews.jointAngles[offset + i] = angles[i];
        }
      }
    },
    [bufferViews, actualJointCount]
  );

  const setReward = useCallback(
    (robotIndex: number, value: number) => {
      if (bufferViews && robotIndex < robotCount) {
        bufferViews.rewards[robotIndex] = value;
      }
    },
    [bufferViews, robotCount]
  );

  const computeFK = useCallback(async (): Promise<Float32Array | null> => {
    if (!workerRef.current || !jointAnglesRef.current) {
      return null;
    }

    // If there's already a pending computation, wait for it
    if (pendingComputeRef.current) {
      return null;
    }

    try {
      // Copy joint angles to avoid transfer issues
      const jointAnglesCopy = new Float32Array(jointAnglesRef.current);

      const result = await new Promise<{ transforms: Float32Array; computeTimeMs: number }>(
        (resolve, reject) => {
          pendingComputeRef.current = { resolve, reject };
          workerRef.current!.postMessage(
            { type: 'compute-fk', jointAngles: jointAnglesCopy },
            [jointAnglesCopy.buffer]
          );
        }
      );

      onFKComplete?.(result.transforms, result.computeTimeMs);
      return result.transforms;
    } catch (error) {
      console.error('[useInstancedRobotWorker] FK computation failed:', error);
      onError?.(error instanceof Error ? error.message : String(error));
      return null;
    }
  }, [onFKComplete, onError]);

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setReady(false);
    }
  }, []);

  // Return state and actions
  const state: InstancedRobotWorkerState = {
    ready,
    buffers: bufferViews,
    layout,
    sharedBufferEnabled: !!sharedBuffer,
    lastComputeTimeMs,
    jointCount: actualJointCount,
    linkCount: actualLinkCount,
  };

  const actions: InstancedRobotWorkerActions = {
    setJointAngles,
    setRobotJoints,
    setReward,
    computeFK,
    terminate,
  };

  return [state, actions];
}

export default useInstancedRobotWorker;
