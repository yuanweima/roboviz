/**
 * Type declarations for trajx-wasm FK Worker factory
 */

export interface DhParam {
  a: number;
  alpha: number;
  d: number;
  theta: number;
}

export interface FKWorkerConfig {
  robotName?: string;
  dhParams?: DhParam[];
  robotCount: number;
  useSharedBuffer?: boolean;
  wasmUrl?: string;
}

export interface FKWorkerInstance {
  readonly worker: Worker;
  readonly jointCount: number;
  readonly linkCount: number;
  readonly robotCount: number;
  readonly useSharedBuffer: boolean;
  readonly sharedBuffer: SharedArrayBuffer | null;
  computeFK(jointAngles: Float32Array): Promise<{ transforms: Float32Array; computeTimeMs: number }>;
  computeFKShared(): Promise<{ computeTimeMs: number }>;
  updateConfig(config: Partial<FKWorkerConfig>): Promise<void>;
  terminate(): void;
  getBufferViews(): {
    controlFlags: Int32Array;
    jointAngles: Float32Array;
    transforms: Float32Array;
  } | null;
}

export function calculateSharedBufferSize(robotCount: number, jointCount: number): number;
export function createSharedBuffer(robotCount: number, jointCount: number): SharedArrayBuffer;
export function isSharedArrayBufferAvailable(): boolean;
export function createFKWorker(config: FKWorkerConfig): Promise<FKWorkerInstance>;
export function listSupportedRobots(): Promise<string[]>;

declare const _default: {
  createFKWorker: typeof createFKWorker;
  listSupportedRobots: typeof listSupportedRobots;
  isSharedArrayBufferAvailable: typeof isSharedArrayBufferAvailable;
  calculateSharedBufferSize: typeof calculateSharedBufferSize;
  createSharedBuffer: typeof createSharedBuffer;
};

export default _default;
