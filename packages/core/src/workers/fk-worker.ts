/**
 * FK Worker
 *
 * Web Worker for computing Forward Kinematics in a separate thread using trajx-wasm.
 * Supports SharedArrayBuffer for zero-copy communication with main thread.
 *
 * Architecture:
 * 1. Main thread sends joint angles via postMessage or SharedArrayBuffer
 * 2. Worker computes batch FK using trajx-wasm
 * 3. Worker sends back transform matrices
 */

import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  SharedBufferLayout,
  SharedBufferViews,
} from './types';
import { createBufferViews, CONTROL_FLAG } from './types';

// trajx-wasm imports - will be loaded dynamically
let trajxWasm: typeof import('../wasm/trajx_wasm') | null = null;
let DhParam: typeof import('../wasm/trajx_wasm').DhParam | null = null;
let WasmDhDatabase: typeof import('../wasm/trajx_wasm').WasmDhDatabase | null = null;
let batchForwardKinematicsF32: typeof import('../wasm/trajx_wasm').batchForwardKinematicsF32 | null = null;

// ============================================================================
// Worker State
// ============================================================================

interface WorkerState {
  initialized: boolean;
  wasmInitialized: boolean;
  robotCount: number;
  jointCount: number;
  linkCount: number;
  jointNames: string[];
  robotName: string;
  // DH parameters for batch FK
  dhParams: InstanceType<typeof import('../wasm/trajx_wasm').DhParam>[] | null;
  // Shared buffer mode
  sharedBuffer: SharedArrayBuffer | null;
  sharedViews: SharedBufferViews | null;
  layout: SharedBufferLayout | null;
  // Internal joint angles buffer (for non-shared mode)
  internalJointAngles: Float32Array | null;
}

const state: WorkerState = {
  initialized: false,
  wasmInitialized: false,
  robotCount: 0,
  jointCount: 0,
  linkCount: 0,
  jointNames: [],
  robotName: '',
  dhParams: null,
  sharedBuffer: null,
  sharedViews: null,
  layout: null,
  internalJointAngles: null,
};

// ============================================================================
// WASM Initialization
// ============================================================================

async function initWasm(): Promise<boolean> {
  if (state.wasmInitialized) return true;

  try {
    // Dynamic import of trajx-wasm
    // @ts-expect-error - Dynamic import in worker context
    trajxWasm = await import('../wasm/trajx_wasm.js');

    // Initialize WASM
    const wasmUrl = new URL('../wasm/trajx_wasm_bg.wasm', import.meta.url);
    await trajxWasm.default(wasmUrl);

    // Get exports
    DhParam = trajxWasm.DhParam;
    WasmDhDatabase = trajxWasm.WasmDhDatabase;
    batchForwardKinematicsF32 = trajxWasm.batchForwardKinematicsF32;

    // Initialize panic hook for better error messages
    trajxWasm.init();

    state.wasmInitialized = true;
    console.log('[FK Worker] trajx-wasm initialized, version:', trajxWasm.version());
    return true;
  } catch (error) {
    console.error('[FK Worker] Failed to initialize trajx-wasm:', error);
    return false;
  }
}

function loadDhParams(robotName: string): boolean {
  if (!WasmDhDatabase || !state.wasmInitialized) {
    console.warn('[FK Worker] WASM not initialized');
    return false;
  }

  try {
    const db = WasmDhDatabase.withDefaults();
    const robots = db.listRobots();
    console.log('[FK Worker] Available robots in DH database:', robots);

    // Try to find matching robot
    let matchedName = '';

    // Try exact match first
    if (robots.includes(robotName)) {
      matchedName = robotName;
    } else {
      // Try case-insensitive match
      const lowerName = robotName.toLowerCase();
      for (const robot of robots) {
        if (robot.toLowerCase() === lowerName) {
          matchedName = robot;
          break;
        }
      }
    }

    // Try partial match (e.g., "ur5" in "ur5e")
    if (!matchedName) {
      for (const robot of robots) {
        if (robot.toLowerCase().includes(robotName.toLowerCase()) ||
            robotName.toLowerCase().includes(robot.toLowerCase())) {
          matchedName = robot;
          break;
        }
      }
    }

    if (matchedName) {
      state.dhParams = db.getDhParams(matchedName);
      state.jointCount = state.dhParams.length;
      state.linkCount = state.jointCount + 1; // base + links
      console.log(`[FK Worker] Loaded DH params for ${matchedName}: ${state.jointCount} joints, ${state.linkCount} links`);
      db.free();
      return true;
    }

    console.warn(`[FK Worker] Robot '${robotName}' not found in DH database`);
    db.free();
    return false;
  } catch (error) {
    console.error('[FK Worker] Failed to load DH params:', error);
    return false;
  }
}

// Create default DH params for UR5e if not found in database
function createDefaultDhParams(): void {
  if (!DhParam) {
    console.error('[FK Worker] DhParam class not available');
    return;
  }

  // UR5e DH parameters (standard modified DH convention)
  // [a, alpha, d, theta]
  const ur5eDh = [
    [0, Math.PI / 2, 0.1625, 0],
    [-0.425, 0, 0, 0],
    [-0.3922, 0, 0, 0],
    [0, Math.PI / 2, 0.1333, 0],
    [0, -Math.PI / 2, 0.0997, 0],
    [0, 0, 0.0996, 0],
  ];

  state.dhParams = ur5eDh.map(([a, alpha, d, theta]) => new DhParam!(a, alpha, d, theta));
  state.jointCount = 6;
  state.linkCount = 7;
  console.log('[FK Worker] Using default UR5e DH parameters');
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<MainToWorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'init':
        await handleInit(message);
        break;
      case 'update-joints':
        handleUpdateJoints(message);
        break;
      case 'compute-fk':
        handleComputeFK(message);
        break;
      default:
        console.warn('[FK Worker] Unknown message type:', (message as { type: string }).type);
    }
  } catch (error) {
    postError(error instanceof Error ? error.message : String(error));
  }
};

// ============================================================================
// Handlers
// ============================================================================

async function handleInit(message: MainToWorkerMessage & { type: 'init' }) {
  const { robotCount, sharedBuffer, layout, urdfData } = message;

  // Initialize WASM first
  const wasmOk = await initWasm();
  if (!wasmOk) {
    postError('Failed to initialize trajx-wasm');
    return;
  }

  state.robotCount = robotCount;

  // Setup SharedArrayBuffer if provided
  if (sharedBuffer && layout) {
    state.sharedBuffer = sharedBuffer;
    state.layout = layout;
    state.sharedViews = createBufferViews(sharedBuffer, layout);
    state.jointCount = layout.jointCount;
    state.linkCount = layout.linkCount;
  }

  // Try to extract robot name from URDF if provided
  let robotName = 'ur5e'; // Default
  if (urdfData) {
    // Simple regex to extract robot name from URDF
    const nameMatch = urdfData.match(/<robot[^>]+name=["']([^"']+)["']/);
    if (nameMatch) {
      robotName = nameMatch[1];
    }
  }
  state.robotName = robotName;

  // Load DH parameters
  const dhLoaded = loadDhParams(robotName);
  if (!dhLoaded) {
    // Fall back to default params
    createDefaultDhParams();
  }

  // Create joint names
  state.jointNames = Array.from({ length: state.jointCount }, (_, i) => `joint_${i + 1}`);

  // Create internal joint angles buffer
  state.internalJointAngles = new Float32Array(robotCount * state.jointCount);

  state.initialized = true;

  const response: WorkerToMainMessage = {
    type: 'ready',
    jointCount: state.jointCount,
    linkCount: state.linkCount,
    jointNames: state.jointNames,
  };
  self.postMessage(response);
}

function handleUpdateJoints(message: MainToWorkerMessage & { type: 'update-joints' }) {
  if (!state.initialized) {
    postError('Worker not initialized');
    return;
  }

  const { jointAngles, useSharedBuffer } = message;

  if (useSharedBuffer && state.sharedViews) {
    // Data already in SharedArrayBuffer, nothing to copy
    // Just update control flag to indicate we're processing
    Atomics.store(state.sharedViews.control, 0, CONTROL_FLAG.PROCESSING);
  } else if (jointAngles && state.internalJointAngles) {
    // Copy to internal buffer
    state.internalJointAngles.set(jointAngles);
  }
}

function handleComputeFK(_message: MainToWorkerMessage & { type: 'compute-fk' }) {
  if (!state.initialized || !state.dhParams || !batchForwardKinematicsF32) {
    postError('Worker not initialized or DH params not loaded');
    return;
  }

  const startTime = performance.now();

  // Get joint angles from SharedArrayBuffer or internal buffer
  let jointAngles: Float32Array;
  if (state.sharedViews) {
    jointAngles = state.sharedViews.jointAngles;
  } else if (state.internalJointAngles) {
    jointAngles = state.internalJointAngles;
  } else {
    postError('No joint angles available');
    return;
  }

  // Call batch FK from trajx-wasm
  let transforms: Float32Array;
  try {
    transforms = batchForwardKinematicsF32(
      state.dhParams,
      jointAngles,
      state.robotCount,
      state.jointCount
    );
  } catch (error) {
    postError(`Batch FK failed: ${error}`);
    return;
  }

  const computeTimeMs = performance.now() - startTime;

  // If using SharedArrayBuffer, write directly and signal completion
  if (state.sharedViews && state.sharedBuffer) {
    state.sharedViews.transforms.set(transforms);
    Atomics.store(state.sharedViews.control, 0, CONTROL_FLAG.READY_FOR_READ);
    // Notify main thread
    Atomics.notify(state.sharedViews.control, 0);
  }

  // Send result via postMessage (with transfer for efficiency)
  const response: WorkerToMainMessage = {
    type: 'fk-result',
    transforms,
    computeTimeMs,
  };

  // Transfer the buffer for zero-copy
  self.postMessage(response, { transfer: [transforms.buffer] });
}

// ============================================================================
// Helpers
// ============================================================================

function postError(error: string) {
  const response: WorkerToMainMessage = {
    type: 'error',
    error,
  };
  self.postMessage(response);
}

// Export for type checking (not used at runtime)
export type { WorkerState };
