/**
 * RoboViz Kinematics Hooks
 *
 * React hooks for using trajx-wasm kinematics in components.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getKinematicsManager, RobotSolver, UrdfRobotSolver } from './kinematics-manager';
import type {
  IkResult,
  MultiIkResult,
  FkResult,
  FkChainResult,
  WorkspaceAnalysis,
  ReachabilityResult,
  RobotSolverConfig,
  IkSolverConfig,
} from './types';
import type { Pose } from '../types';
import { useSolverContextOptional } from './SolverContext';
import type { ISolverProvider } from './solver-provider-types';

// ============================================================================
// useTrajx - Main initialization hook
// ============================================================================

export interface UseTrajxState {
  /** Whether WASM is ready */
  ready: boolean;
  /** Whether currently loading */
  loading: boolean;
  /** Error if initialization failed */
  error: Error | null;
  /** Available robot names from database */
  availableRobots: string[];
  /** Solver version counter - increments when solvers are created/destroyed. Use as a dependency to re-render when solvers change. */
  solverVersion: number;
}

export interface UseTrajxActions {
  /** Retry initialization if failed */
  retry: () => Promise<void>;
  /** Create a solver from database */
  createSolver: (robotId: string, robotName: string) => RobotSolver;
  /** Create a solver directly from URDF content */
  createSolverFromUrdf: (robotId: string, urdfContent: string) => UrdfRobotSolver;
  /** Get existing solver */
  getSolver: (robotId: string) => RobotSolver | undefined;
  /** Get existing URDF solver */
  getUrdfSolver: (robotId: string) => UrdfRobotSolver | undefined;
  /** Check if solver exists */
  hasSolver: (robotId: string) => boolean;
  /** Dispose solver */
  disposeSolver: (robotId: string) => boolean;
}

export interface UseTrajxReturn extends UseTrajxState, UseTrajxActions {}

/**
 * Hook for initializing trajx-wasm
 *
 * @example
 * ```tsx
 * function App() {
 *   const { ready, loading, error, createSolver } = useTrajx();
 *
 *   useEffect(() => {
 *     if (ready) {
 *       const solver = createSolver('main-robot', 'fanuc_m20ia');
 *       console.log('Created solver with DOF:', solver.dof);
 *     }
 *   }, [ready]);
 *
 *   if (loading) return <div>Loading kinematics...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return <RobotViewer />;
 * }
 * ```
 */
export function useTrajx(): UseTrajxReturn {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [availableRobots, setAvailableRobots] = useState<string[]>([]);
  const [solverVersion, setSolverVersion] = useState(0);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const manager = getKinematicsManager();
      await manager.initialize();
      setAvailableRobots(manager.getAvailableRobots());
      setReady(true);
    } catch (e) {
      setError(e as Error);
      setReady(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const manager = getKinematicsManager();
    if (manager.isInitialized()) {
      setReady(true);
      setLoading(false);
      setAvailableRobots(manager.getAvailableRobots());
    } else {
      initialize();
    }
  }, [initialize]);

  const createSolver = useCallback((robotId: string, robotName: string): RobotSolver => {
    const manager = getKinematicsManager();
    const solver = manager.createSolverFromDatabase(robotId, robotName);
    setSolverVersion(manager.solverVersion);
    return solver;
  }, []);

  const createSolverFromUrdf = useCallback((robotId: string, urdfContent: string): UrdfRobotSolver => {
    const manager = getKinematicsManager();
    const solver = manager.createSolverFromUrdf(robotId, urdfContent);
    setSolverVersion(manager.solverVersion);
    return solver;
  }, []);

  const getSolver = useCallback((robotId: string): RobotSolver | undefined => {
    const manager = getKinematicsManager();
    return manager.getSolver(robotId);
  }, []);

  const getUrdfSolver = useCallback((robotId: string): UrdfRobotSolver | undefined => {
    const manager = getKinematicsManager();
    return manager.getUrdfSolver(robotId);
  }, []);

  const hasSolver = useCallback((robotId: string): boolean => {
    const manager = getKinematicsManager();
    return manager.hasSolver(robotId);
  }, []);

  const disposeSolver = useCallback((robotId: string): boolean => {
    const manager = getKinematicsManager();
    const result = manager.disposeSolver(robotId);
    if (result) {
      setSolverVersion(manager.solverVersion);
    }
    return result;
  }, []);

  return {
    ready,
    loading,
    error,
    availableRobots,
    solverVersion,
    retry: initialize,
    createSolver,
    createSolverFromUrdf,
    getSolver,
    getUrdfSolver,
    hasSolver,
    disposeSolver,
  };
}

// ============================================================================
// useRobotSolver - Hook for a specific robot solver
// ============================================================================

export interface UseRobotSolverOptions {
  /** Robot ID */
  robotId: string;
  /** Robot name from database (e.g., 'fanuc_m20ia', 'ur5') */
  robotName: string;
  /** Optional solver configuration */
  config?: Partial<RobotSolverConfig>;
  /** Auto-create solver if not exists */
  autoCreate?: boolean;
}

export interface UseRobotSolverState {
  /** The solver instance */
  solver: RobotSolver | null;
  /** Whether solver is ready */
  ready: boolean;
  /** Error if solver creation failed */
  error: Error | null;
}

export interface UseRobotSolverActions {
  /** Compute forward kinematics */
  fk: (jointAngles: number[]) => FkResult | null;
  /** Compute FK chain for all links */
  fkChain: (jointAngles: number[]) => FkChainResult | null;
  /** Compute inverse kinematics */
  ik: (targetPose: Pose, seed?: number[]) => IkResult | null;
  /** Compute all IK solutions */
  ikAll: (targetPose: Pose, seed?: number[]) => MultiIkResult | null;
  /** Analyze workspace at configuration */
  analyzeWorkspace: (jointAngles: number[]) => WorkspaceAnalysis | null;
  /** Check if pose is reachable */
  isReachable: (targetPose: Pose) => ReachabilityResult | null;
  /** Check if near singularity */
  isNearSingularity: (jointAngles: number[], threshold?: number) => boolean;
  /** Compute manipulability */
  computeManipulability: (jointAngles: number[]) => number;
  /** Check if configuration is valid */
  isValidConfig: (joints: number[]) => boolean;
  /** Attach tool */
  attachTool: (toolPose: Pose) => void;
  /** Detach tool */
  detachTool: () => void;
  /** Configure IK solver */
  configureIkSolver: (config: IkSolverConfig) => void;
}

export interface UseRobotSolverReturn extends UseRobotSolverState, UseRobotSolverActions {}

/**
 * Hook for using a specific robot solver
 *
 * @example
 * ```tsx
 * function RobotController({ robotId }: { robotId: string }) {
 *   const { ready, solver, fk, ik } = useRobotSolver({
 *     robotId,
 *     robotName: 'fanuc_m20ia',
 *   });
 *
 *   const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);
 *
 *   const pose = useMemo(() => {
 *     if (!ready) return null;
 *     return fk(joints)?.pose;
 *   }, [ready, joints, fk]);
 *
 *   if (!ready) return <div>Loading solver...</div>;
 *
 *   return (
 *     <div>
 *       <h3>End Effector: {pose?.position.x.toFixed(3)}</h3>
 *       <JointSliders joints={joints} onChange={setJoints} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useRobotSolver(options: UseRobotSolverOptions): UseRobotSolverReturn {
  const { robotId, robotName, config, autoCreate = true } = options;
  const [solver, setSolver] = useState<RobotSolver | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { ready: wasmReady, createSolver, getSolver } = useTrajx();

  useEffect(() => {
    if (!wasmReady) {
      return;
    }

    try {
      // Check if solver already exists
      let existingSolver = getSolver(robotId);

      if (!existingSolver && autoCreate) {
        existingSolver = createSolver(robotId, robotName);
      }

      if (existingSolver) {
        setSolver(existingSolver);
        setReady(true);
        setError(null);
      } else {
        setError(new Error(`Solver for ${robotId} not found`));
      }
    } catch (e) {
      setError(e as Error);
      setSolver(null);
      setReady(false);
    }
  }, [wasmReady, robotId, robotName, autoCreate, createSolver, getSolver]);

  const fk = useCallback(
    (jointAngles: number[]): FkResult | null => {
      if (!solver) return null;
      return solver.forwardKinematics(jointAngles);
    },
    [solver]
  );

  const fkChain = useCallback(
    (jointAngles: number[]): FkChainResult | null => {
      if (!solver) return null;
      return solver.forwardKinematicsChain(jointAngles);
    },
    [solver]
  );

  const ik = useCallback(
    (targetPose: Pose, seed?: number[]): IkResult | null => {
      if (!solver) return null;
      return solver.inverseKinematics(targetPose, seed);
    },
    [solver]
  );

  const ikAll = useCallback(
    (targetPose: Pose, seed?: number[]): MultiIkResult | null => {
      if (!solver) return null;
      return solver.inverseKinematicsAll(targetPose, seed);
    },
    [solver]
  );

  const analyzeWorkspace = useCallback(
    (jointAngles: number[]): WorkspaceAnalysis | null => {
      if (!solver) return null;
      return solver.analyzeWorkspace(jointAngles);
    },
    [solver]
  );

  const isReachable = useCallback(
    (targetPose: Pose): ReachabilityResult | null => {
      if (!solver) return null;
      return solver.isReachable(targetPose);
    },
    [solver]
  );

  const isNearSingularity = useCallback(
    (jointAngles: number[], threshold?: number): boolean => {
      if (!solver) return false;
      return solver.isNearSingularity(jointAngles, threshold);
    },
    [solver]
  );

  const computeManipulability = useCallback(
    (jointAngles: number[]): number => {
      if (!solver) return 0;
      return solver.computeManipulability(jointAngles);
    },
    [solver]
  );

  const isValidConfig = useCallback(
    (joints: number[]): boolean => {
      if (!solver) return false;
      return solver.isValidConfig(joints);
    },
    [solver]
  );

  const attachTool = useCallback(
    (toolPose: Pose): void => {
      if (solver) {
        solver.attachTool(toolPose);
      }
    },
    [solver]
  );

  const detachTool = useCallback((): void => {
    if (solver) {
      solver.detachTool();
    }
  }, [solver]);

  const configureIkSolver = useCallback(
    (ikConfig: IkSolverConfig): void => {
      if (solver) {
        solver.configureIkSolver(ikConfig);
      }
    },
    [solver]
  );

  return {
    solver,
    ready,
    error,
    fk,
    fkChain,
    ik,
    ikAll,
    analyzeWorkspace,
    isReachable,
    isNearSingularity,
    computeManipulability,
    isValidConfig,
    attachTool,
    detachTool,
    configureIkSolver,
  };
}

// ============================================================================
// useIK - Focused IK hook with reactive updates
// ============================================================================

export interface UseIKOptions {
  /** Robot ID */
  robotId: string;
  /** Robot name from database */
  robotName: string;
  /** Target pose to solve for */
  targetPose: Pose | null;
  /** Seed joint configuration */
  seed?: number[];
  /** Get all solutions instead of just one */
  getAllSolutions?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
}

export interface UseIKReturn {
  /** Whether solver is ready */
  ready: boolean;
  /** Whether currently computing */
  computing: boolean;
  /** Single IK result */
  result: IkResult | null;
  /** All IK solutions (if getAllSolutions is true) */
  allResults: MultiIkResult | null;
  /** Error if failed */
  error: Error | null;
  /** Manually trigger recomputation */
  recompute: () => void;
}

/**
 * Reactive IK hook that automatically recomputes when target changes
 *
 * @example
 * ```tsx
 * function IKController() {
 *   const [target, setTarget] = useState<Pose | null>(null);
 *
 *   const { ready, computing, result, allResults } = useIK({
 *     robotId: 'main',
 *     robotName: 'fanuc_m20ia',
 *     targetPose: target,
 *     getAllSolutions: true,
 *   });
 *
 *   return (
 *     <div>
 *       <TargetPoseEditor onChange={setTarget} />
 *       {computing && <Spinner />}
 *       {result?.success && (
 *         <div>Solution: {result.solution?.map(j => j.toFixed(2)).join(', ')}</div>
 *       )}
 *       {allResults && (
 *         <div>Found {allResults.solutionCount} solutions</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIK(options: UseIKOptions): UseIKReturn {
  const {
    robotId,
    robotName,
    targetPose,
    seed,
    getAllSolutions = false,
    debounceMs = 16,
  } = options;

  const { solver, ready } = useRobotSolver({ robotId, robotName });
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<IkResult | null>(null);
  const [allResults, setAllResults] = useState<MultiIkResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const computeIdRef = useRef(0);

  const compute = useCallback(() => {
    if (!solver || !targetPose) {
      setResult(null);
      setAllResults(null);
      return;
    }

    const computeId = ++computeIdRef.current;
    setComputing(true);
    setError(null);

    // Use setTimeout to debounce rapid updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        if (computeId !== computeIdRef.current) return; // Stale computation

        if (getAllSolutions) {
          const multiResult = solver.inverseKinematicsAll(targetPose, seed);
          setAllResults(multiResult);
          // Also set single result for convenience
          if (multiResult.success && multiResult.solutions.length > 0) {
            setResult({
              success: true,
              solution: multiResult.solutions[0],
              positionError: multiResult.positionErrors[0],
            });
          } else {
            setResult({
              success: false,
              errorMessage: multiResult.errorMessage,
            });
          }
        } else {
          const singleResult = solver.inverseKinematics(targetPose, seed);
          setResult(singleResult);
          setAllResults(null);
        }
      } catch (e) {
        setError(e as Error);
        setResult(null);
        setAllResults(null);
      } finally {
        if (computeId === computeIdRef.current) {
          setComputing(false);
        }
      }
    }, debounceMs);
  }, [solver, targetPose, seed, getAllSolutions, debounceMs]);

  // Auto-compute when target changes
  useEffect(() => {
    if (ready && targetPose) {
      compute();
    }
  }, [ready, targetPose, compute]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ready,
    computing,
    result,
    allResults,
    error,
    recompute: compute,
  };
}

// ============================================================================
// useFK - Focused FK hook with reactive updates
// ============================================================================

export interface UseFKOptions {
  /** Robot ID */
  robotId: string;
  /** Robot name from database */
  robotName: string;
  /** Joint angles to compute FK for */
  jointAngles: number[] | null;
  /** Whether to compute full chain */
  computeChain?: boolean;
}

export interface UseFKReturn {
  /** Whether solver is ready */
  ready: boolean;
  /** End-effector pose */
  pose: Pose | null;
  /** All link poses (if computeChain is true) */
  chainPoses: Pose[] | null;
  /** Workspace analysis at current configuration */
  workspace: WorkspaceAnalysis | null;
  /** Error if failed */
  error: Error | null;
}

/**
 * Reactive FK hook that automatically recomputes when joints change
 *
 * @example
 * ```tsx
 * function FKDisplay({ joints }: { joints: number[] }) {
 *   const { ready, pose, workspace } = useFK({
 *     robotId: 'main',
 *     robotName: 'fanuc_m20ia',
 *     jointAngles: joints,
 *   });
 *
 *   if (!ready || !pose) return null;
 *
 *   return (
 *     <div>
 *       <h3>Position</h3>
 *       <p>X: {pose.position.x.toFixed(3)}m</p>
 *       <p>Y: {pose.position.y.toFixed(3)}m</p>
 *       <p>Z: {pose.position.z.toFixed(3)}m</p>
 *       {workspace && (
 *         <>
 *           <h3>Workspace</h3>
 *           <p>Manipulability: {workspace.manipulability.toFixed(4)}</p>
 *           <p>Near Singularity: {workspace.isNearSingular ? 'Yes' : 'No'}</p>
 *         </>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFK(options: UseFKOptions): UseFKReturn {
  const { robotId, robotName, jointAngles, computeChain = false } = options;

  const { solver, ready } = useRobotSolver({ robotId, robotName });
  const [pose, setPose] = useState<Pose | null>(null);
  const [chainPoses, setChainPoses] = useState<Pose[] | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceAnalysis | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!solver || !jointAngles) {
      setPose(null);
      setChainPoses(null);
      setWorkspace(null);
      return;
    }

    try {
      // Compute FK
      const fkResult = solver.forwardKinematics(jointAngles);
      setPose(fkResult.pose);

      // Compute chain if requested
      if (computeChain) {
        const chainResult = solver.forwardKinematicsChain(jointAngles);
        setChainPoses(chainResult.poses);
      } else {
        setChainPoses(null);
      }

      // Compute workspace analysis
      const workspaceResult = solver.analyzeWorkspace(jointAngles);
      setWorkspace(workspaceResult);

      setError(null);
    } catch (e) {
      setError(e as Error);
      setPose(null);
      setChainPoses(null);
      setWorkspace(null);
    }
  }, [solver, jointAngles, computeChain]);

  return {
    ready,
    pose,
    chainPoses,
    workspace,
    error,
  };
}

// ============================================================================
// useUrdfSolver - Hook for URDF-based solver (automatic from URDF content)
// ============================================================================

export interface UseUrdfSolverOptions {
  /** Robot ID */
  robotId: string;
  /** URDF content (XML string) */
  urdfContent: string | null;
  /** Auto-create solver when URDF content is available */
  autoCreate?: boolean;
}

export interface UseUrdfSolverState {
  /** The solver instance */
  solver: UrdfRobotSolver | null;
  /** Whether solver is ready */
  ready: boolean;
  /** Error if solver creation failed */
  error: Error | null;
  /** Joint names from URDF */
  jointNames: string[];
  /** Link names from URDF */
  linkNames: string[];
  /** Joint limits from URDF */
  jointLimits: { lower: number[]; upper: number[] } | null;
}

export interface UseUrdfSolverActions {
  /** Compute forward kinematics */
  fk: (jointAngles: number[]) => FkResult | null;
  /** Compute forward kinematics including tool offset (TCP pose) */
  fkTcp: (jointAngles: number[]) => FkResult | null;
  /** Compute FK chain for all links */
  fkChain: (jointAngles: number[]) => FkChainResult | null;
  /** Compute inverse kinematics */
  ik: (targetPose: Pose, seed?: number[]) => IkResult | null;
  /** Check if configuration is valid */
  isValidConfig: (joints: number[]) => boolean;
  /** Attach tool */
  attachTool: (toolPose: Pose) => void;
  /** Detach tool */
  detachTool: () => void;
  /** Check if tool is attached */
  hasTool: () => boolean;
}

export interface UseUrdfSolverReturn extends UseUrdfSolverState, UseUrdfSolverActions {}

/**
 * Hook for creating a solver directly from URDF content
 *
 * This is the preferred approach when you have URDF content available,
 * as it automatically extracts kinematics parameters from the URDF file.
 * No DH database lookup or robot name matching is required.
 *
 * @example
 * ```tsx
 * function RobotController({ robotId, urdfContent }: Props) {
 *   const {
 *     ready,
 *     jointNames,
 *     jointLimits,
 *     fk,
 *     ik,
 *   } = useUrdfSolver({
 *     robotId,
 *     urdfContent,
 *   });
 *
 *   useEffect(() => {
 *     if (ready) {
 *       console.log('Robot has joints:', jointNames);
 *       console.log('Joint limits:', jointLimits);
 *     }
 *   }, [ready, jointNames, jointLimits]);
 *
 *   // FK/IK now uses parameters directly from URDF
 *   const pose = fk([0, 0, 0, 0, 0, 0]);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useUrdfSolver(options: UseUrdfSolverOptions): UseUrdfSolverReturn {
  const { robotId, urdfContent, autoCreate = true } = options;
  const [solver, setSolver] = useState<UrdfRobotSolver | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [jointNames, setJointNames] = useState<string[]>([]);
  const [linkNames, setLinkNames] = useState<string[]>([]);
  const [jointLimits, setJointLimits] = useState<{ lower: number[]; upper: number[] } | null>(null);

  const { ready: wasmReady, createSolverFromUrdf, getUrdfSolver, disposeSolver } = useTrajx();

  // Track previous robotId to detect changes
  const prevRobotIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!wasmReady || !urdfContent) {
      return;
    }

    // If robotId changed and we had an old solver, dispose it
    if (prevRobotIdRef.current && prevRobotIdRef.current !== robotId) {
      disposeSolver(prevRobotIdRef.current);
    }
    prevRobotIdRef.current = robotId;

    try {
      // Check if solver already exists
      let existingSolver = getUrdfSolver(robotId);

      if (!existingSolver && autoCreate) {
        existingSolver = createSolverFromUrdf(robotId, urdfContent);
      }

      if (existingSolver) {
        setSolver(existingSolver);
        setJointNames(existingSolver.jointNames);
        setLinkNames(existingSolver.linkNames);
        setJointLimits(existingSolver.getJointLimits());
        setReady(true);
        setError(null);
      } else {
        setError(new Error(`URDF solver for ${robotId} not found`));
      }
    } catch (e) {
      setError(e as Error);
      setSolver(null);
      setJointNames([]);
      setLinkNames([]);
      setJointLimits(null);
      setReady(false);
    }
  }, [wasmReady, robotId, urdfContent, autoCreate, createSolverFromUrdf, getUrdfSolver, disposeSolver]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevRobotIdRef.current) {
        disposeSolver(prevRobotIdRef.current);
      }
    };
  }, [disposeSolver]);

  const fk = useCallback(
    (jointAngles: number[]): FkResult | null => {
      if (!solver) return null;
      return solver.forwardKinematics(jointAngles);
    },
    [solver]
  );

  const fkTcp = useCallback(
    (jointAngles: number[]): FkResult | null => {
      if (!solver) return null;
      return solver.forwardKinematicsTcp(jointAngles);
    },
    [solver]
  );

  const fkChain = useCallback(
    (jointAngles: number[]): FkChainResult | null => {
      if (!solver) return null;
      return solver.forwardKinematicsChain(jointAngles);
    },
    [solver]
  );

  const ik = useCallback(
    (targetPose: Pose, seed?: number[]): IkResult | null => {
      if (!solver) return null;
      return solver.inverseKinematics(targetPose, seed);
    },
    [solver]
  );

  const isValidConfig = useCallback(
    (joints: number[]): boolean => {
      if (!solver) return false;
      return solver.isValidConfig(joints);
    },
    [solver]
  );

  const attachTool = useCallback(
    (toolPose: Pose): void => {
      if (solver) {
        solver.attachTool(toolPose);
      }
    },
    [solver]
  );

  const detachTool = useCallback((): void => {
    if (solver) {
      solver.detachTool();
    }
  }, [solver]);

  const hasTool = useCallback((): boolean => {
    if (!solver) return false;
    return solver.hasTool();
  }, [solver]);

  return {
    solver,
    ready,
    error,
    jointNames,
    linkNames,
    jointLimits,
    fk,
    fkTcp,
    fkChain,
    ik,
    isValidConfig,
    attachTool,
    detachTool,
    hasTool,
  };
}

// ============================================================================
// Coordinate System Conversion Utilities
// ============================================================================

/**
 * Coordinate system options for kinematics operations.
 *
 * - 'Z-up': URDF / ROS / RoboViz scene standard (Z is up, right-handed)
 *   This is the default since the RoboViz scene is configured as Z-up.
 * - 'Y-up': Legacy Three.js / WebGL standard (Y is up, right-handed)
 *   Only needed for external Y-up coordinate sources.
 *
 * Note: The RoboViz scene (Canvas, OrbitControls, camera) is configured as Z-up,
 * matching URDF/trajx-wasm. No coordinate conversion is needed in most cases.
 */
export type CoordinateSystem = 'Y-up' | 'Z-up';

/**
 * Convert a pose from Y-up (Three.js) to Z-up (URDF) coordinate system.
 *
 * The Robot component applies a -90° rotation around X to convert Z-up URDF to Y-up display.
 * This function performs the inverse transformation:
 *   URDF_x = ThreeJS_x
 *   URDF_y = -ThreeJS_z
 *   URDF_z = ThreeJS_y
 *
 * For orientation, we also need to transform the quaternion.
 */
export function poseYupToZup(pose: Pose): Pose {
  return {
    position: {
      x: pose.position.x,
      y: -pose.position.z,
      z: pose.position.y,
    },
    orientation: quaternionYupToZup(pose.orientation),
  };
}

/**
 * Convert a pose from Z-up (URDF) to Y-up (Three.js) coordinate system.
 *
 * This is the inverse of poseYupToZup:
 *   ThreeJS_x = URDF_x
 *   ThreeJS_y = URDF_z
 *   ThreeJS_z = -URDF_y
 */
export function poseZupToYup(pose: Pose): Pose {
  return {
    position: {
      x: pose.position.x,
      y: pose.position.z,
      z: -pose.position.y,
    },
    orientation: quaternionZupToYup(pose.orientation),
  };
}

/**
 * Convert a quaternion from Y-up (Three.js) to Z-up (URDF) coordinate system.
 *
 * The Robot component applies a -90° rotation around X to display URDF (Z-up) in Three.js (Y-up).
 * To convert an orientation from Three.js back to URDF, we use RIGHT-MULTIPLICATION:
 *   q_URDF = q_ThreeJS * R_display
 *
 * Where R_display is the rotation from URDF to Three.js (-90° around X).
 *
 * This ensures that "tool pointing down" in Three.js (tool +Z → world -Y)
 * correctly converts to "tool pointing down" in URDF (tool +Z → world -Z).
 *
 * Note: Conjugation (R * q * R^-1) is WRONG for this use case because it preserves
 * the rotation action but NOT the target direction in world space.
 */
export function quaternionYupToZup(q: Pose['orientation']): Pose['orientation'] {
  // R_display = -90° around X (rotation from URDF to Three.js)
  // R = {w: cos(-45°), x: sin(-45°), y: 0, z: 0} = {w: 0.707, x: -0.707, y: 0, z: 0}
  const r_w = Math.SQRT1_2;  // cos(-45°)
  const r_x = -Math.SQRT1_2; // sin(-45°)

  // Compute q * R (right-multiplication)
  // Quaternion multiplication: (a, b) -> a * b
  // (w1, x1, y1, z1) * (w2, x2, y2, z2) =
  //   w = w1*w2 - x1*x2 - y1*y2 - z1*z2
  //   x = w1*x2 + x1*w2 + y1*z2 - z1*y2
  //   y = w1*y2 - x1*z2 + y1*w2 + z1*x2
  //   z = w1*z2 + x1*y2 - y1*x2 + z1*w2

  const result_w = q.w * r_w - q.x * r_x; // q.y * 0 - q.z * 0
  const result_x = q.w * r_x + q.x * r_w; // + q.y * 0 - q.z * 0
  const result_y = -q.x * 0 + q.y * r_w + q.z * r_x; // q.w * 0 + q.z * r_x
  const result_z = q.w * 0 + q.x * 0 - q.y * r_x + q.z * r_w; // simplified

  return { w: result_w, x: result_x, y: result_y, z: result_z };
}

/**
 * Convert a quaternion from Z-up (URDF) to Y-up (Three.js) coordinate system.
 *
 * This is the inverse of quaternionYupToZup.
 * We use LEFT-MULTIPLICATION by R_display^-1 (or equivalently, right-multiply by R_display^-1):
 *   q_ThreeJS = q_URDF * R_display^-1
 *
 * Where R_display^-1 is +90° around X (inverse of the -90° rotation from URDF to Three.js).
 */
export function quaternionZupToYup(q: Pose['orientation']): Pose['orientation'] {
  // R_display^-1 = +90° around X (inverse rotation)
  // R^-1 = {w: cos(45°), x: sin(45°), y: 0, z: 0} = {w: 0.707, x: 0.707, y: 0, z: 0}
  const r_w = Math.SQRT1_2;  // cos(45°)
  const r_x = Math.SQRT1_2;  // sin(45°)

  // Compute q * R^-1 (right-multiplication)
  const result_w = q.w * r_w - q.x * r_x;
  const result_x = q.w * r_x + q.x * r_w;
  const result_y = q.y * r_w + q.z * r_x;
  const result_z = -q.y * r_x + q.z * r_w;

  return { w: result_w, x: result_x, y: result_y, z: result_z };
}

// ============================================================================
// useHybridSolver - Hook combining URDF visualization with DH analytical IK
// ============================================================================

/**
 * Robot name mapping from URDF names to DH database names.
 * This mapping enables analytical IK for robots that are in the DH database.
 *
 * Available robots in trajx-wasm database (as of last check):
 * - Agilebot_GBT_C12A, Agilebot_GBT_C5A_850, Agilebot_GBT_P7A_700, Agilebot_GBT_P7A_900
 * - Fanuc_LR_Mate_200iD, Fanuc_LR_Mate_200iD_7L, Fanuc_M_20iB_25, Fanuc_M_20iD_25
 * - JAKA_A12L, JAKA_S12, JAKA_Zu7
 * - UR10, UR5
 */
export const URDF_TO_DH_MAPPING: Record<string, string> = {
  // Fanuc robots
  Fanuc_LR_Mate_200iD_7L: 'Fanuc_LR_Mate_200iD_7L',
  'Fanuc_LR_Mate_200iD-7L': 'Fanuc_LR_Mate_200iD_7L',
  Fanuc_LR_Mate_200iD: 'Fanuc_LR_Mate_200iD',
  Fanuc_M_20iB_25: 'Fanuc_M_20iB_25',
  Fanuc_M_20iD_25: 'Fanuc_M_20iD_25',
  // Universal Robots
  UR5: 'UR5',
  ur5: 'UR5',
  UR10: 'UR10',
  ur10: 'UR10',
  // JAKA robots
  JAKA_A12L: 'JAKA_A12L',
  JAKA_S12: 'JAKA_S12',
  JAKA_Zu7: 'JAKA_Zu7',
  // Agilebot robots
  Agilebot_GBT_C12A: 'Agilebot_GBT_C12A',
  Agilebot_GBT_C5A_850: 'Agilebot_GBT_C5A_850',
  Agilebot_GBT_P7A_700: 'Agilebot_GBT_P7A_700',
  Agilebot_GBT_P7A_900: 'Agilebot_GBT_P7A_900',
};

export interface UseHybridSolverOptions {
  /** Robot ID for the solver instance */
  robotId: string;
  /** URDF content (XML string) */
  urdfContent: string | null;
  /** Optional: Force a specific DH database name */
  dhRobotName?: string;
  /** Auto-create solver when URDF content is available */
  autoCreate?: boolean;
  /**
   * Coordinate system for input/output poses.
   *
   * - 'Z-up' (default): URDF / ROS / RoboViz scene standard. The scene is configured
   *   as Z-up, so no conversion is needed. Use this for most cases.
   *
   * - 'Y-up': Legacy Three.js / WebGL standard. Only use this if you're working with
   *   Y-up coordinates from external sources. The hook will automatically convert
   *   to/from URDF's Z-up internally.
   *
   * @default 'Z-up'
   */
  coordinateSystem?: CoordinateSystem;
}

export interface UseHybridSolverState {
  /** The URDF solver instance (for joint info) */
  urdfSolver: UrdfRobotSolver | null;
  /** The DH solver instance (for analytical IK, if available) */
  dhSolver: RobotSolver | null;
  /** Whether solver is ready */
  ready: boolean;
  /** Error if solver creation failed */
  error: Error | null;
  /** Joint names from URDF */
  jointNames: string[];
  /** Link names from URDF */
  linkNames: string[];
  /** Joint limits from URDF */
  jointLimits: { lower: number[]; upper: number[] } | null;
  /** Whether analytical IK is available (DH solver found) */
  hasAnalyticalIk: boolean;
  /** The DH robot name used (if any) */
  dhRobotName: string | null;
}

export interface UseHybridSolverActions {
  /** Compute forward kinematics */
  fk: (jointAngles: number[]) => FkResult | null;
  /** Compute forward kinematics including tool offset (TCP pose) */
  fkTcp: (jointAngles: number[]) => FkResult | null;
  /** Compute FK chain for all links */
  fkChain: (jointAngles: number[]) => FkChainResult | null;
  /** Compute inverse kinematics (single best solution) */
  ik: (targetPose: Pose, seed?: number[]) => IkResult | null;
  /**
   * Compute inverse kinematics for TCP position (single solution)
   *
   * This method directly solves IK for the Tool Center Point (TCP) position,
   * automatically accounting for the attached tool offset. Requires a tool
   * to be attached via attachTool() first.
   *
   * Unlike ik() which targets the flange position, this targets the TCP directly.
   */
  ikTcp: (targetTcpPose: Pose, seed?: number[]) => IkResult | null;
  /** Compute inverse kinematics (all solutions - uses analytical IK if available) */
  ikAll: (targetPose: Pose, seed?: number[]) => MultiIkResult | null;
  /** Check if configuration is valid */
  isValidConfig: (joints: number[]) => boolean;
  /** Attach tool */
  attachTool: (toolPose: Pose) => void;
  /** Detach tool */
  detachTool: () => void;
  /** Check if tool is attached */
  hasTool: () => boolean;
}

export interface UseHybridSolverReturn extends UseHybridSolverState, UseHybridSolverActions {}

/**
 * Hybrid solver hook combining URDF visualization with DH analytical IK
 *
 * This hook provides the best of both worlds:
 * - Uses URDF for joint names, limits, and visualization parameters
 * - Uses DH database for analytical IK when the robot is recognized
 *
 * For 6-DOF spherical wrist robots like Fanuc LR Mate 200iD/7L, this enables
 * analytical IK solutions (up to 8) instead of slower numerical solutions.
 *
 * @example
 * ```tsx
 * function RobotController({ robotId, urdfContent }: Props) {
 *   const {
 *     ready,
 *     hasAnalyticalIk,
 *     jointNames,
 *     fk,
 *     ik,
 *     ikAll,
 *   } = useHybridSolver({
 *     robotId,
 *     urdfContent,
 *   });
 *
 *   if (ready) {
 *     console.log('Analytical IK available:', hasAnalyticalIk);
 *
 *     // Get all IK solutions (analytical if available)
 *     const allSolutions = ikAll(targetPose, seedJoints);
 *     if (allSolutions?.isAnalytical) {
 *       console.log(`Found ${allSolutions.solutionCount} analytical solutions`);
 *     }
 *   }
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useHybridSolver(options: UseHybridSolverOptions): UseHybridSolverReturn {
  // Check if a SolverProvider is available in the component tree
  const ctxOptional = useSolverContextOptional();
  const providerSolver = ctxOptional?.solver ?? null;

  // Determine if we should use the provider path:
  // Provider is available, ready, and matches the requested robotId
  const useProvider =
    providerSolver !== null &&
    ctxOptional?.ready === true &&
    providerSolver.robotId === options.robotId;

  // Always call both hooks (React rules of hooks) but only one will be active
  const legacyResult = useHybridSolverLegacy(options, !useProvider);
  const providerResult = useHybridSolverFromProvider(providerSolver, options, useProvider);

  return useProvider ? providerResult : legacyResult;
}

// ============================================================================
// Provider-based implementation (uses ISolverProvider from SolverContext)
// ============================================================================

/**
 * Extract a value that may be sync or async.
 *
 * Local WASM solvers return their result SYNCHRONOUSLY (see WasmSolverAdapter),
 * so we return it directly. Only a genuine Promise (remote solver) can't be
 * resolved synchronously — for that we return the fallback for this render.
 *
 * NOTE: a previous version did `promise.then((r) => value = r); return value;`
 * assuming a `Promise.resolve()` runs its `.then` synchronously. It does NOT —
 * `.then` callbacks always run in a later microtask, so that always returned the
 * fallback (null), which made every provider-path FK/IK silently "fail".
 */
function resolveSync<T>(value: T | Promise<T>, fallback: T): T {
  if (value != null && typeof (value as { then?: unknown }).then === 'function') {
    // Genuine promise (remote solver) — not available this synchronous tick.
    let out: T = fallback;
    void (value as Promise<T>).then((r) => {
      out = r;
    });
    return out;
  }
  return (value as T) ?? fallback;
}

/**
 * Internal hook that wraps an ISolverProvider (async) into the sync UseHybridSolverReturn API.
 *
 * Since ISolverProvider methods are async (to support remote solvers), but
 * UseHybridSolverReturn expects sync methods, we cache async results in state.
 * For local WASM solvers, the promises resolve immediately (Promise.resolve wrapper),
 * so the cached result is available on the next render cycle.
 */
function useHybridSolverFromProvider(
  solver: ISolverProvider | null,
  options: UseHybridSolverOptions,
  active: boolean
): UseHybridSolverReturn {
  const { coordinateSystem = 'Z-up' } = options;
  const needsCoordinateConversion = coordinateSystem === 'Y-up';

  const fk = useCallback(
    (jointAngles: number[]): FkResult | null => {
      if (!solver || !active) return null;
      const result = resolveSync<FkResult | null>(solver.forwardKinematics(jointAngles), null);
      if (needsCoordinateConversion && result) {
        return { ...result, pose: poseZupToYup(result.pose) };
      }
      return result;
    },
    [solver, active, needsCoordinateConversion]
  );

  const fkTcp = useCallback(
    (jointAngles: number[]): FkResult | null => {
      if (!solver || !active) return null;
      const result = resolveSync<FkResult | null>(solver.forwardKinematicsTcp(jointAngles), null);
      if (needsCoordinateConversion && result) {
        return { ...result, pose: poseZupToYup(result.pose) };
      }
      return result;
    },
    [solver, active, needsCoordinateConversion]
  );

  const fkChain = useCallback(
    (jointAngles: number[]): FkChainResult | null => {
      if (!solver || !active) return null;
      const result = resolveSync<FkChainResult | null>(solver.forwardKinematicsChain(jointAngles), null);
      if (needsCoordinateConversion && result) {
        return { poses: result.poses.map(poseZupToYup) };
      }
      return result;
    },
    [solver, active, needsCoordinateConversion]
  );

  const ik = useCallback(
    (targetPose: Pose, seed?: number[]): IkResult | null => {
      if (!solver || !active) return null;
      const solverPose = needsCoordinateConversion ? poseYupToZup(targetPose) : targetPose;
      return resolveSync<IkResult | null>(solver.inverseKinematics(solverPose, seed), null);
    },
    [solver, active, needsCoordinateConversion]
  );

  const ikTcp = useCallback(
    (targetTcpPose: Pose, seed?: number[]): IkResult | null => {
      if (!solver || !active) return null;
      const solverPose = needsCoordinateConversion ? poseYupToZup(targetTcpPose) : targetTcpPose;
      return resolveSync<IkResult | null>(solver.inverseKinematicsTcp(solverPose, seed), null);
    },
    [solver, active, needsCoordinateConversion]
  );

  const ikAll = useCallback(
    (targetPose: Pose, seed?: number[]): MultiIkResult | null => {
      if (!solver || !active) return null;
      const solverPose = needsCoordinateConversion ? poseYupToZup(targetPose) : targetPose;
      return resolveSync<MultiIkResult | null>(solver.inverseKinematicsAll(solverPose, seed), null);
    },
    [solver, active, needsCoordinateConversion]
  );

  const isValidConfig = useCallback(
    (joints: number[]): boolean => {
      if (!solver || !active) return false;
      return resolveSync<boolean>(solver.isValidConfig(joints), false);
    },
    [solver, active]
  );

  const attachTool = useCallback(
    (toolPose: Pose): void => {
      if (!solver || !active) return;
      solver.attachTool(toolPose);
    },
    [solver, active]
  );

  const detachTool = useCallback((): void => {
    if (!solver || !active) return;
    solver.detachTool();
  }, [solver, active]);

  const hasTool = useCallback((): boolean => {
    if (!solver || !active) return false;
    return solver.hasTool();
  }, [solver, active]);

  return {
    // Provider path doesn't expose raw solver instances
    urdfSolver: null,
    dhSolver: null,
    ready: active && solver !== null,
    error: null,
    jointNames: solver?.jointNames ?? [],
    linkNames: solver?.linkNames ?? [],
    jointLimits: solver?.jointLimits ?? null,
    hasAnalyticalIk: solver?.capabilities.isAnalytical ?? false,
    dhRobotName: null,
    fk,
    fkTcp,
    fkChain,
    ik,
    ikTcp,
    ikAll,
    isValidConfig,
    attachTool,
    detachTool,
    hasTool,
  };
}

// ============================================================================
// Legacy WASM-based implementation (original useHybridSolver logic)
// ============================================================================

/**
 * Internal hook implementing the original WASM-based solver logic.
 * Used when no SolverProvider context is available.
 *
 * @param active - When false, skips initialization (used when provider path is active)
 */
function useHybridSolverLegacy(
  options: UseHybridSolverOptions,
  active: boolean
): UseHybridSolverReturn {
  const {
    robotId,
    urdfContent,
    dhRobotName: forcedDhName,
    autoCreate = true,
    coordinateSystem = 'Z-up',
  } = options;

  // Whether to convert coordinates (Y-up input needs conversion to Z-up for solver)
  // Note: Scene is Z-up, so default is no conversion needed
  const needsCoordinateConversion = coordinateSystem === 'Y-up';

  const [urdfSolver, setUrdfSolver] = useState<UrdfRobotSolver | null>(null);
  const [dhSolver, setDhSolver] = useState<RobotSolver | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [jointNames, setJointNames] = useState<string[]>([]);
  const [linkNames, setLinkNames] = useState<string[]>([]);
  const [jointLimits, setJointLimits] = useState<{ lower: number[]; upper: number[] } | null>(null);
  const [hasAnalyticalIk, setHasAnalyticalIk] = useState(false);
  const [resolvedDhName, setResolvedDhName] = useState<string | null>(null);

  const {
    ready: wasmReady,
    availableRobots,
    createSolver,
    createSolverFromUrdf,
    getUrdfSolver,
    getSolver,
    disposeSolver,
  } = useTrajx();

  // Track previous robotId to detect changes
  const prevRobotIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !wasmReady || !urdfContent) {
      return;
    }

    // If robotId changed and we had old solvers, dispose them
    if (prevRobotIdRef.current && prevRobotIdRef.current !== robotId) {
      disposeSolver(prevRobotIdRef.current);
    }
    prevRobotIdRef.current = robotId;

    try {
      // Step 1: Create URDF solver (unified Robot API)
      let existingUrdfSolver = getUrdfSolver(robotId);

      if (!existingUrdfSolver && autoCreate) {
        existingUrdfSolver = createSolverFromUrdf(robotId, urdfContent);
      }

      if (!existingUrdfSolver) {
        setError(new Error(`Failed to create URDF solver for ${robotId}`));
        return;
      }

      setUrdfSolver(existingUrdfSolver);
      setJointNames(existingUrdfSolver.jointNames);
      setLinkNames(existingUrdfSolver.linkNames);
      setJointLimits(existingUrdfSolver.getJointLimits());

      // Step 2: Try to load DH parameters using new unified Robot API
      const urdfRobotName = existingUrdfSolver.name;
      const dhName = forcedDhName || URDF_TO_DH_MAPPING[urdfRobotName];


      // Check if robot already has DH params (auto-detected by trajx-wasm)
      if (existingUrdfSolver.hasDhParams()) {
        setHasAnalyticalIk(existingUrdfSolver.supportsAnalyticalIk());
        setResolvedDhName(urdfRobotName);
        setDhSolver(null);
      } else if (dhName && availableRobots.includes(dhName)) {
        const loaded = existingUrdfSolver.loadDhParamsFromDatabase(dhName);

        if (loaded && existingUrdfSolver.supportsAnalyticalIk()) {
          setHasAnalyticalIk(true);
          setResolvedDhName(dhName);
          setDhSolver(null);
        } else {
          setHasAnalyticalIk(false);
          setResolvedDhName(null);
          setDhSolver(null);
        }
      } else {
        setDhSolver(null);
        setHasAnalyticalIk(false);
        setResolvedDhName(null);

        if (dhName) {
        } else {
        }
      }

      setReady(true);
      setError(null);
    } catch (e) {
      setError(e as Error);
      setUrdfSolver(null);
      setDhSolver(null);
      setJointNames([]);
      setLinkNames([]);
      setJointLimits(null);
      setHasAnalyticalIk(false);
      setResolvedDhName(null);
      setReady(false);
    }
  }, [
    active,
    wasmReady,
    robotId,
    urdfContent,
    forcedDhName,
    autoCreate,
    availableRobots,
    createSolver,
    createSolverFromUrdf,
    getSolver,
    getUrdfSolver,
    disposeSolver,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (active && prevRobotIdRef.current) {
        disposeSolver(prevRobotIdRef.current);
      }
    };
  }, [active, disposeSolver]);

  // All kinematics now use the unified urdfSolver (which may have DH params loaded)
  // When coordinateSystem is 'Y-up', we convert input poses to Z-up before solving
  // and convert output poses back to Y-up.

  const fk = useCallback(
    (jointAngles: number[]): FkResult | null => {
      if (!urdfSolver) return null;
      const result = urdfSolver.forwardKinematics(jointAngles);
      if (needsCoordinateConversion && result) {
        return {
          ...result,
          pose: poseZupToYup(result.pose),
        };
      }
      return result;
    },
    [urdfSolver, needsCoordinateConversion]
  );

  const fkChain = useCallback(
    (jointAngles: number[]): FkChainResult | null => {
      if (!urdfSolver) return null;
      const result = urdfSolver.forwardKinematicsChain(jointAngles);
      if (needsCoordinateConversion && result) {
        return {
          poses: result.poses.map(poseZupToYup),
        };
      }
      return result;
    },
    [urdfSolver, needsCoordinateConversion]
  );

  const ik = useCallback(
    (targetPose: Pose, seed?: number[]): IkResult | null => {
      if (!urdfSolver) return null;
      const solverPose = needsCoordinateConversion ? poseYupToZup(targetPose) : targetPose;
      return urdfSolver.inverseKinematics(solverPose, seed);
    },
    [urdfSolver, needsCoordinateConversion]
  );

  const ikTcp = useCallback(
    (targetTcpPose: Pose, seed?: number[]): IkResult | null => {
      if (!urdfSolver) return null;
      const solverPose = needsCoordinateConversion ? poseYupToZup(targetTcpPose) : targetTcpPose;
      return urdfSolver.inverseKinematicsTcp(solverPose, seed);
    },
    [urdfSolver, needsCoordinateConversion]
  );

  const ikAll = useCallback(
    (targetPose: Pose, seed?: number[]): MultiIkResult | null => {
      if (!urdfSolver) return null;
      const solverPose = needsCoordinateConversion ? poseYupToZup(targetPose) : targetPose;
      return urdfSolver.inverseKinematicsAll(solverPose, seed);
    },
    [urdfSolver, needsCoordinateConversion]
  );

  const isValidConfig = useCallback(
    (joints: number[]): boolean => {
      if (urdfSolver) return urdfSolver.isValidConfig(joints);
      return false;
    },
    [urdfSolver]
  );

  const attachTool = useCallback(
    (toolPose: Pose): void => {
      if (!urdfSolver) return;
      urdfSolver.attachTool(toolPose);
    },
    [urdfSolver]
  );

  const detachTool = useCallback((): void => {
    if (urdfSolver) urdfSolver.detachTool();
  }, [urdfSolver]);

  const fkTcp = useCallback(
    (jointAngles: number[]): FkResult | null => {
      if (!urdfSolver) return null;
      const result = urdfSolver.forwardKinematicsTcp(jointAngles);
      if (needsCoordinateConversion && result) {
        return {
          ...result,
          pose: poseZupToYup(result.pose),
        };
      }
      return result;
    },
    [urdfSolver, needsCoordinateConversion]
  );

  const hasTool = useCallback((): boolean => {
    if (urdfSolver) return urdfSolver.hasTool();
    return false;
  }, [urdfSolver]);

  return {
    urdfSolver,
    dhSolver,
    ready,
    error,
    jointNames,
    linkNames,
    jointLimits,
    hasAnalyticalIk,
    dhRobotName: resolvedDhName,
    fk,
    fkChain,
    ik,
    ikTcp,
    ikAll,
    isValidConfig,
    attachTool,
    detachTool,
    fkTcp,
    hasTool,
  };
}

// ============================================================================
// useTrajxCableConfig - Cable configuration hook (NEW in melbourne)
// Uses 'Trajx' prefix to avoid conflict with cable-management module's useCableConfig
// ============================================================================

export type CablePresetType = 'standard' | 'heavy-duty' | 'precision' | 'light' | 'custom';

export interface UseTrajxCableConfigOptions {
  /** Cable preset to use */
  preset?: CablePresetType;
  /** Custom max total twist in radians (only for 'custom' preset) */
  maxTotalTwist?: number;
  /** Custom warning threshold (0.0-1.0) */
  warningThreshold?: number;
  /** Enable auto-unwind strategy */
  autoUnwind?: boolean;
}

export interface UseTrajxCableConfigReturn {
  /** Whether the config is ready */
  ready: boolean;
  /** Cable config instance for use with WasmMotion.cableAwareWith() */
  config: ReturnType<typeof getKinematicsManager>['getCablePresetStandard'] extends () => infer R ? R : never;
  /** Max total twist from config */
  maxTotalTwist: number;
  /** Warning threshold from config */
  warningThreshold: number;
  /** Check if a twist value is valid */
  isTwistValid: (twist: number) => boolean;
  /** Check if a twist value is in warning zone */
  isTwistWarning: (twist: number) => boolean;
}

/**
 * Hook for creating cable configuration for use with cable-aware motion planning
 *
 * Cable tracking in melbourne is now integrated into WasmMotion directly:
 * - Use `.cableAware()` for standard preset
 * - Use `.cableAwareWith(config)` for custom config
 * - Use `.withCableTwist(twist)` to set initial twist for multi-segment tracking
 *
 * @example
 * ```tsx
 * function CableAwarePlanning() {
 *   const { ready, config } = useTrajxCableConfig({ preset: 'heavy-duty' });
 *   const { solver } = useHybridSolver({ robotId: 'main', urdfContent });
 *
 *   const planMotion = useCallback(() => {
 *     if (!ready || !solver) return;
 *
 *     // Cable-aware motion planning
 *     const result = WasmMotion.to(goalJoints)
 *       .from(startJoints)
 *       .cableAwareWith(config)
 *       .run(solver.robot);
 *
 *     console.log('Final twist:', result.cableTwist);
 *     console.log('Warning triggered:', result.cableWarning);
 *     console.log('Limit exceeded:', result.cableExceeded);
 *   }, [ready, config, solver]);
 *
 *   return <button onClick={planMotion}>Plan Motion</button>;
 * }
 * ```
 */
export function useTrajxCableConfig(options: UseTrajxCableConfigOptions = {}): UseTrajxCableConfigReturn {
  const {
    preset = 'standard',
    maxTotalTwist: customMaxTwist,
    warningThreshold: customWarningThreshold,
    autoUnwind,
  } = options;

  const { ready: wasmReady } = useTrajx();
  type CableConfigType = ReturnType<typeof getKinematicsManager>['getCablePresetStandard'] extends () => infer R ? R : never;
  const [config, setConfig] = useState<CableConfigType | null>(null);
  const [ready, setReady] = useState(false);
  const [maxTotalTwist, setMaxTotalTwist] = useState(4 * Math.PI);
  const [warningThreshold, setWarningThreshold] = useState(0.75);

  // Initialize config
  useEffect(() => {
    if (!wasmReady) return;

    try {
      const manager = getKinematicsManager();

      // Get or create cable config based on preset
      let newConfig: CableConfigType;
      switch (preset) {
        case 'heavy-duty':
          newConfig = manager.getCablePresetHeavyDuty();
          break;
        case 'precision':
          newConfig = manager.getCablePresetPrecision();
          break;
        case 'light':
          newConfig = manager.getCablePresetLight();
          break;
        case 'custom':
          newConfig = manager.createCableConfig();
          if (customMaxTwist !== undefined) {
            newConfig = newConfig.withMaxTotalTwist(customMaxTwist);
          }
          break;
        case 'standard':
        default:
          newConfig = manager.getCablePresetStandard();
          break;
      }

      // Apply custom settings
      if (customWarningThreshold !== undefined) {
        newConfig = newConfig.withWarningThreshold(customWarningThreshold);
      }
      if (autoUnwind !== undefined) {
        newConfig = newConfig.withAutoUnwind(autoUnwind);
      }

      setConfig(newConfig);
      setMaxTotalTwist(newConfig.maxTotalTwist);
      setWarningThreshold(newConfig.warningThreshold);
      setReady(true);
    } catch (e) {
      console.error('[useTrajxCableConfig] Failed to initialize:', e);
      setReady(false);
    }

    return () => {
      // Config cleanup is handled by WASM GC
    };
  }, [wasmReady, preset, customMaxTwist, customWarningThreshold, autoUnwind]);

  const isTwistValid = useCallback((twist: number): boolean => {
    if (!config) return true;
    return config.isTwistValid(twist);
  }, [config]);

  const isTwistWarning = useCallback((twist: number): boolean => {
    if (!config) return false;
    return config.isTwistWarning(twist);
  }, [config]);

  return {
    ready,
    config: config!,
    maxTotalTwist,
    warningThreshold,
    isTwistValid,
    isTwistWarning,
  };
}
