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

  return {
    solver,
    ready,
    error,
    jointNames,
    linkNames,
    jointLimits,
    fk,
    fkChain,
    ik,
    isValidConfig,
    attachTool,
    detachTool,
  };
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
  /** Compute FK chain for all links */
  fkChain: (jointAngles: number[]) => FkChainResult | null;
  /** Compute inverse kinematics (single best solution) */
  ik: (targetPose: Pose, seed?: number[]) => IkResult | null;
  /** Compute inverse kinematics (all solutions - uses analytical IK if available) */
  ikAll: (targetPose: Pose, seed?: number[]) => MultiIkResult | null;
  /** Check if configuration is valid */
  isValidConfig: (joints: number[]) => boolean;
  /** Attach tool */
  attachTool: (toolPose: Pose) => void;
  /** Detach tool */
  detachTool: () => void;
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
  const { robotId, urdfContent, dhRobotName: forcedDhName, autoCreate = true } = options;

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
    if (!wasmReady || !urdfContent) {
      return;
    }

    // If robotId changed and we had old solvers, dispose them
    if (prevRobotIdRef.current && prevRobotIdRef.current !== robotId) {
      disposeSolver(prevRobotIdRef.current);
      // Note: We no longer create separate DH solver, so no need to dispose ${robotId}-dh
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

      console.log(`[HybridSolver] URDF robot name: "${urdfRobotName}"`);
      console.log(`[HybridSolver] DH name from mapping: "${dhName}"`);
      console.log(`[HybridSolver] Available robots in DH database: ${availableRobots.join(', ')}`);

      // Check if robot already has DH params (auto-detected by trajx-wasm)
      if (existingUrdfSolver.hasDhParams()) {
        console.log(`[HybridSolver] ✓ Robot already has DH parameters (auto-detected)`);
        setHasAnalyticalIk(existingUrdfSolver.supportsAnalyticalIk());
        setResolvedDhName(urdfRobotName);
        setDhSolver(null); // Don't need separate DH solver
      } else if (dhName && availableRobots.includes(dhName)) {
        // Try to load DH params from database using new unified API
        console.log(`[HybridSolver] Loading DH parameters from database: ${dhName}`);
        const loaded = existingUrdfSolver.loadDhParamsFromDatabase(dhName);

        if (loaded && existingUrdfSolver.supportsAnalyticalIk()) {
          console.log(`[HybridSolver] ✓ DH parameters loaded - Analytical IK enabled`);
          console.log(`[HybridSolver]   Uses DH for FK: ${existingUrdfSolver.usesDhForFk()}`);
          setHasAnalyticalIk(true);
          setResolvedDhName(dhName);
          setDhSolver(null); // Don't need separate DH solver
        } else {
          console.log(`[HybridSolver] DH parameters loaded but analytical IK not supported`);
          setHasAnalyticalIk(false);
          setResolvedDhName(null);
          setDhSolver(null);
        }
      } else {
        setDhSolver(null);
        setHasAnalyticalIk(false);
        setResolvedDhName(null);

        if (dhName) {
          console.log(`[HybridSolver] DH robot ${dhName} not found in database. Available: ${availableRobots.join(', ')}`);
        } else {
          console.log(`[HybridSolver] No DH mapping for ${urdfRobotName}. Using numerical IK.`);
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
      if (prevRobotIdRef.current) {
        disposeSolver(prevRobotIdRef.current);
        // Note: We no longer create separate DH solver
      }
    };
  }, [disposeSolver]);

  // All kinematics now use the unified urdfSolver (which may have DH params loaded)
  const fk = useCallback(
    (jointAngles: number[]): FkResult | null => {
      if (urdfSolver) return urdfSolver.forwardKinematics(jointAngles);
      return null;
    },
    [urdfSolver]
  );

  const fkChain = useCallback(
    (jointAngles: number[]): FkChainResult | null => {
      if (urdfSolver) return urdfSolver.forwardKinematicsChain(jointAngles);
      return null;
    },
    [urdfSolver]
  );

  const ik = useCallback(
    (targetPose: Pose, seed?: number[]): IkResult | null => {
      // Unified solver handles analytical/numerical IK internally
      if (urdfSolver) return urdfSolver.inverseKinematics(targetPose, seed);
      return null;
    },
    [urdfSolver]
  );

  const ikAll = useCallback(
    (targetPose: Pose, seed?: number[]): MultiIkResult | null => {
      // Unified solver handles analytical/numerical IK internally
      // Returns all solutions (up to 8 for analytical, 1 for numerical)
      if (urdfSolver) {
        return urdfSolver.inverseKinematicsAll(targetPose, seed);
      }
      return null;
    },
    [urdfSolver]
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
      if (urdfSolver) urdfSolver.attachTool(toolPose);
    },
    [urdfSolver]
  );

  const detachTool = useCallback((): void => {
    if (urdfSolver) urdfSolver.detachTool();
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
    ikAll,
    isValidConfig,
    attachTool,
    detachTool,
  };
}
