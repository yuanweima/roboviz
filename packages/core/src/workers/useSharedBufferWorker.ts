/**
 * useSharedBufferWorker - High-performance FK Worker with SharedArrayBuffer
 *
 * This hook manages a Web Worker that uses SharedArrayBuffer for zero-copy
 * communication. The worker handles:
 * 1. Joint angle computation (simulated RL policy)
 * 2. Batch FK computation (WASM)
 * 3. Matrix combination with positions
 *
 * The main thread only needs to:
 * 1. Update the frame counter
 * 2. Copy final matrices to InstancedMesh buffers
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface UseSharedBufferWorkerOptions {
  /** Number of robot instances */
  robotCount: number;
  /** Number of meshes per robot (typically linkCount from URDF) */
  meshCount: number;
  /** Robot name for DH database lookup */
  robotName?: string;
  /** Worker script URL */
  workerUrl?: string;
  /** Callback when worker is ready */
  onReady?: (info: { jointCount: number; linkCount: number }) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface SharedBufferWorkerState {
  ready: boolean;
  running: boolean;
  jointCount: number;
  linkCount: number;
  /** SharedArrayBuffer for communication */
  sharedBuffer: SharedArrayBuffer | null;
  /** View for policy states (write from main thread) */
  policyStates: Float32Array | null;
  /** View for position matrices (write from main thread) */
  positionMatrices: Float32Array | null;
  /** View for final matrices (read from main thread) */
  finalMatrices: Float32Array | null;
  /** Control flags for synchronization */
  controlFlags: Int32Array | null;
}

export interface SharedBufferWorkerActions {
  /** Start the worker computation loop */
  start: () => void;
  /** Stop the worker computation loop */
  stop: () => void;
  /** Signal a new frame (increments frame counter, sets time) */
  signalFrame: (time: number) => void;
  /** Get the current worker frame (for checking if data is ready) */
  getWorkerFrame: () => number;
  /** Terminate the worker */
  terminate: () => void;
}

/**
 * Calculate SharedArrayBuffer size
 */
function calculateBufferSize(robotCount: number, meshCount: number, jointCount: number): number {
  const controlSize = 4 * 4;  // 4 Int32s
  const policySize = robotCount * 4 * 4;  // 4 floats per robot
  const positionSize = robotCount * 16 * 4;  // 16 floats per robot (4x4 matrix)
  const finalSize = robotCount * meshCount * 16 * 4;  // 16 floats per mesh per robot
  return controlSize + policySize + positionSize + finalSize;
}

export function useSharedBufferWorker(
  options: UseSharedBufferWorkerOptions
): [SharedBufferWorkerState, SharedBufferWorkerActions] {
  const {
    robotCount,
    meshCount,
    robotName = 'ur5',
    workerUrl = '/workers/fk-worker-v2.js',
    onReady,
    onError,
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [jointCount, setJointCount] = useState(6);
  const [linkCount, setLinkCount] = useState(7);

  // SharedArrayBuffer and views
  const sharedBufferRef = useRef<SharedArrayBuffer | null>(null);
  const controlFlagsRef = useRef<Int32Array | null>(null);
  const policyStatesRef = useRef<Float32Array | null>(null);
  const positionMatricesRef = useRef<Float32Array | null>(null);
  const finalMatricesRef = useRef<Float32Array | null>(null);

  // Frame counter for main thread
  const frameCounterRef = useRef(0);

  // Initialize worker
  useEffect(() => {
    if (robotCount === 0 || meshCount === 0) return;

    // Check SharedArrayBuffer support
    if (typeof SharedArrayBuffer === 'undefined') {
      onError?.('SharedArrayBuffer not supported. Enable cross-origin isolation.');
      return;
    }

    let mounted = true;

    // Create worker
    const worker = new Worker(workerUrl, { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (!mounted) return;
      const { type, ...data } = e.data;

      switch (type) {
        case 'loaded':
          // Worker script loaded, now initialize
          // Estimate buffer size (will be adjusted after we know jointCount)
          const estimatedJointCount = 7; // Most robots have 6-7 joints
          const bufferSize = calculateBufferSize(robotCount, meshCount, estimatedJointCount);
          const buffer = new SharedArrayBuffer(bufferSize);
          sharedBufferRef.current = buffer;

          // Setup views
          let offset = 0;
          controlFlagsRef.current = new Int32Array(buffer, offset, 4);
          offset += 4 * 4;

          policyStatesRef.current = new Float32Array(buffer, offset, robotCount * 4);
          offset += robotCount * 4 * 4;

          positionMatricesRef.current = new Float32Array(buffer, offset, robotCount * 16);
          offset += robotCount * 16 * 4;

          finalMatricesRef.current = new Float32Array(buffer, offset, robotCount * meshCount * 16);

          // Initialize policy states with random values
          for (let i = 0; i < robotCount * 4; i++) {
            policyStatesRef.current[i] = Math.random() * Math.PI * 2;
          }

          // Send init message
          worker.postMessage({
            type: 'init',
            robotName,
            robotCount,
            meshCount,
            sharedBuffer: buffer,
          });
          break;

        case 'ready':
          setJointCount(data.jointCount);
          setLinkCount(data.linkCount);
          setReady(true);
          onReady?.({ jointCount: data.jointCount, linkCount: data.linkCount });
          break;

        case 'started':
          setRunning(true);
          break;

        case 'stopped':
          setRunning(false);
          break;

        case 'error':
          onError?.(data.message);
          break;
      }
    };

    worker.onerror = (e) => {
      onError?.(e.message);
    };

    return () => {
      mounted = false;
      worker.postMessage({ type: 'terminate' });
      worker.terminate();
      workerRef.current = null;
    };
  }, [robotCount, meshCount, robotName, workerUrl, onReady, onError]);

  // Actions
  const start = useCallback(() => {
    workerRef.current?.postMessage({ type: 'start' });
  }, []);

  const stop = useCallback(() => {
    workerRef.current?.postMessage({ type: 'stop' });
  }, []);

  const signalFrame = useCallback((time: number) => {
    if (!controlFlagsRef.current) return;

    // Increment frame counter
    frameCounterRef.current++;
    Atomics.store(controlFlagsRef.current, 0, frameCounterRef.current);

    // Store time as float bits
    const timeBits = new Int32Array(new Float32Array([time]).buffer)[0];
    Atomics.store(controlFlagsRef.current, 2, timeBits);
  }, []);

  const getWorkerFrame = useCallback(() => {
    if (!controlFlagsRef.current) return 0;
    return Atomics.load(controlFlagsRef.current, 1);
  }, []);

  const terminate = useCallback(() => {
    workerRef.current?.postMessage({ type: 'terminate' });
  }, []);

  const state: SharedBufferWorkerState = useMemo(() => ({
    ready,
    running,
    jointCount,
    linkCount,
    sharedBuffer: sharedBufferRef.current,
    policyStates: policyStatesRef.current,
    positionMatrices: positionMatricesRef.current,
    finalMatrices: finalMatricesRef.current,
    controlFlags: controlFlagsRef.current,
  }), [ready, running, jointCount, linkCount]);

  const actions: SharedBufferWorkerActions = useMemo(() => ({
    start,
    stop,
    signalFrame,
    getWorkerFrame,
    terminate,
  }), [start, stop, signalFrame, getWorkerFrame, terminate]);

  return [state, actions];
}
