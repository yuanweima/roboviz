/**
 * Solver Adapters
 *
 * Pre-built adapters for common solver sources:
 * - WasmSolverAdapter: wraps local trajx-wasm UrdfRobotSolver
 * - RemoteSolverAdapter: sends JSON-RPC calls to backend
 */

export { WasmSolverAdapter } from './WasmSolverAdapter';
export { WasmSolverProvider, type WasmSolverProviderProps } from './WasmSolverProvider';
export { RemoteSolverAdapter, type RemoteSolverConfig } from './RemoteSolverAdapter';
export { RemoteSolverProvider, type RemoteSolverProviderProps } from './RemoteSolverProvider';
