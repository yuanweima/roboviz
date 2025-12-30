/**
 * useRobotWithKinematics Hook
 *
 * Unified hook that combines:
 * - URDF loading (from URL or content)
 * - Kinematics (FK/IK)
 * - Tool/TCP management
 *
 * This hook simplifies robot setup for demos and applications by
 * handling all the low-level details automatically.
 *
 * All coordinates use Z-up convention (robotics standard).
 *
 * @example
 * ```tsx
 * function WeldingDemo() {
 *   const {
 *     ready,
 *     jointAngles,
 *     setJointAngles,
 *     tcpPose,
 *     fk,
 *     fkTcp,
 *     ik,
 *     ikTcp,
 *   } = useRobotWithKinematics({
 *     urdfPath: '/robots/fanuc.urdf',
 *     tool: { position: [0, 0, 0.12], quaternion: [0, 0, 0, 1] },
 *   });
 *
 *   if (!ready) return <LoadingSpinner />;
 *
 *   return (
 *     <Robot
 *       urdfPath="/robots/fanuc.urdf"
 *       jointAngles={jointAngles}
 *     />
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRobotKinematics } from '../coordinates/useRobotKinematics';
import type {
  Pose3D,
  TCPOffset,
  JointAngles,
} from '../coordinates/types';
import type {
  FkResult3D,
  IkResult3D,
} from '../coordinates/useRobotKinematics';
import type { WorkspaceAnalysis } from '../kinematics/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Tool configuration
 */
export interface ToolConfig {
  /** Position offset from flange [x, y, z] in meters (Z-up) */
  position: [number, number, number];
  /** Rotation offset as quaternion [x, y, z, w] */
  quaternion: [number, number, number, number];
  /** Optional tool name for identification */
  name?: string;
}

/**
 * Options for useRobotWithKinematics hook
 */
export interface UseRobotWithKinematicsOptions {
  /** Unique robot identifier */
  robotId: string;
  /** URL path to URDF file (mutually exclusive with urdfContent) */
  urdfPath?: string;
  /** URDF content as XML string (mutually exclusive with urdfPath) */
  urdfContent?: string | null;
  /** Force specific DH database robot name for analytical IK */
  dhRobotName?: string;
  /** Tool TCP offset configuration */
  tool?: ToolConfig | TCPOffset;
  /** Automatically attach tool when ready */
  autoAttachTool?: boolean;
  /** Initial joint angles */
  initialJoints?: JointAngles;
  /** Callback when joint angles change */
  onJointChange?: (angles: JointAngles) => void;
  /** Callback when ready state changes */
  onReady?: (ready: boolean) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useRobotWithKinematics hook
 */
export interface UseRobotWithKinematicsResult {
  // State
  /** Whether kinematics is ready (URDF loaded, solver initialized) */
  ready: boolean;
  /** Loading state */
  loading: boolean;
  /** Error if any */
  error: Error | null;
  /** Degrees of freedom */
  dof: number;
  /** URDF content (loaded from URL or provided directly) */
  urdfContent: string | null;

  // Joint State
  /** Current joint angles */
  jointAngles: JointAngles;
  /** Set joint angles */
  setJointAngles: (angles: JointAngles) => void;

  // Tool State
  /** Whether tool is attached */
  hasTool: boolean;
  /** Attach a tool */
  attachTool: (tool: ToolConfig | TCPOffset) => void;
  /** Detach current tool */
  detachTool: () => void;

  // Kinematics (Z-up)
  /** Current TCP pose (computed from jointAngles + tool offset) */
  tcpPose: Pose3D | null;
  /** Current flange pose (computed from jointAngles, no tool) */
  flangePose: Pose3D | null;

  // FK Functions
  /** Compute FK for flange (no tool) */
  fk: (joints: JointAngles) => FkResult3D | null;
  /** Compute FK for TCP (with tool) */
  fkTcp: (joints: JointAngles) => FkResult3D | null;
  /** Compute FK and return pose only */
  fkPose: (joints: JointAngles) => Pose3D | null;
  /** Compute FK TCP and return pose only */
  fkTcpPose: (joints: JointAngles) => Pose3D | null;

  // IK Functions
  /** Compute IK for flange pose */
  ik: (target: Pose3D, seed?: JointAngles) => IkResult3D | null;
  /** Compute IK for TCP pose */
  ikTcp: (target: Pose3D, seed?: JointAngles) => IkResult3D | null;

  // Workspace Analysis
  /** Analyze workspace properties at joint configuration */
  analyzeWorkspace: (joints: JointAngles) => WorkspaceAnalysis | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize tool config to TCPOffset
 */
function normalizeToolConfig(tool: ToolConfig | TCPOffset): TCPOffset {
  if ('position' in tool && Array.isArray(tool.position)) {
    return {
      position: tool.position,
      quaternion: tool.quaternion,
    };
  }
  return tool as TCPOffset;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useRobotWithKinematics - Unified robot kinematics hook
 */
export function useRobotWithKinematics(
  options: UseRobotWithKinematicsOptions
): UseRobotWithKinematicsResult {
  const {
    robotId,
    urdfPath,
    urdfContent: providedUrdfContent,
    dhRobotName,
    tool,
    autoAttachTool = true,
    initialJoints,
    onJointChange,
    onReady,
    onError,
  } = options;

  // Refs for callbacks
  const onJointChangeRef = useRef(onJointChange);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onJointChangeRef.current = onJointChange;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onJointChange, onReady, onError]);

  // URDF loading state
  const [loadedUrdfContent, setLoadedUrdfContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!urdfPath && !providedUrdfContent);
  const [loadError, setLoadError] = useState<Error | null>(null);

  // Load URDF from URL if needed
  useEffect(() => {
    // If content is provided directly, use it
    if (providedUrdfContent) {
      setLoadedUrdfContent(providedUrdfContent);
      setLoading(false);
      setLoadError(null);
      return;
    }

    // If URL is provided, fetch it
    if (urdfPath) {
      setLoading(true);
      setLoadError(null);

      fetch(urdfPath)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load URDF: ${res.status} ${res.statusText}`);
          }
          return res.text();
        })
        .then((content) => {
          setLoadedUrdfContent(content);
          setLoading(false);
        })
        .catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          setLoadError(error);
          setLoading(false);
          onErrorRef.current?.(error);
        });
    }
  }, [urdfPath, providedUrdfContent]);

  // Effective URDF content
  const urdfContent = providedUrdfContent || loadedUrdfContent;

  // Kinematics
  const kinematics = useRobotKinematics({
    robotId,
    urdfContent,
    dhRobotName,
    autoCreate: true,
  });

  const {
    ready: kinematicsReady,
    error: kinematicsError,
    dof,
    fk,
    fkTcp,
    ik,
    ikTcp,
    attachTcp,
    detachTcp,
    hasTool: kinematicsHasTool,
    analyzeWorkspace,
  } = kinematics;

  // Overall ready state
  const ready = kinematicsReady && !loading && !loadError;

  // Joint state
  const [jointAngles, setJointAnglesInternal] = useState<JointAngles>(initialJoints || []);

  // Initialize joints when ready
  useEffect(() => {
    if (ready && jointAngles.length === 0 && dof > 0) {
      setJointAnglesInternal(new Array(dof).fill(0));
    }
  }, [ready, dof, jointAngles.length]);

  // Notify ready state changes
  const prevReadyRef = useRef(ready);
  useEffect(() => {
    if (ready !== prevReadyRef.current) {
      prevReadyRef.current = ready;
      onReadyRef.current?.(ready);
    }
  }, [ready]);

  // Set joint angles with callback
  const setJointAngles = useCallback((angles: JointAngles) => {
    setJointAnglesInternal(angles);
    onJointChangeRef.current?.(angles);
  }, []);

  // Tool management
  const [hasToolAttached, setHasToolAttached] = useState(false);

  // Auto-attach tool when ready
  useEffect(() => {
    if (ready && tool && autoAttachTool && !hasToolAttached) {
      const tcpOffset = normalizeToolConfig(tool);
      attachTcp(tcpOffset);
      setHasToolAttached(true);
    }
  }, [ready, tool, autoAttachTool, hasToolAttached, attachTcp]);

  // Cleanup tool on unmount
  useEffect(() => {
    return () => {
      if (hasToolAttached) {
        detachTcp();
      }
    };
  }, [hasToolAttached, detachTcp]);

  // Attach tool manually
  const attachTool = useCallback((newTool: ToolConfig | TCPOffset) => {
    if (!ready) return;
    const tcpOffset = normalizeToolConfig(newTool);
    attachTcp(tcpOffset);
    setHasToolAttached(true);
  }, [ready, attachTcp]);

  // Detach tool manually
  const detachTool = useCallback(() => {
    if (!ready || !hasToolAttached) return;
    detachTcp();
    setHasToolAttached(false);
  }, [ready, hasToolAttached, detachTcp]);

  // Pose-only FK wrappers
  const fkPose = useCallback(
    (joints: JointAngles): Pose3D | null => {
      const result = fk(joints);
      return result?.pose || null;
    },
    [fk]
  );

  const fkTcpPose = useCallback(
    (joints: JointAngles): Pose3D | null => {
      const result = fkTcp(joints);
      return result?.pose || null;
    },
    [fkTcp]
  );

  // Current poses
  const tcpPose = useMemo(() => {
    if (!ready || jointAngles.length === 0) return null;
    return fkTcpPose(jointAngles);
  }, [ready, jointAngles, fkTcpPose]);

  const flangePose = useMemo(() => {
    if (!ready || jointAngles.length === 0) return null;
    return fkPose(jointAngles);
  }, [ready, jointAngles, fkPose]);

  // Combined error
  const error = loadError || kinematicsError;

  return {
    // State
    ready,
    loading,
    error,
    dof,
    urdfContent,

    // Joint State
    jointAngles,
    setJointAngles,

    // Tool State
    hasTool: hasToolAttached,
    attachTool,
    detachTool,

    // Kinematics (Z-up)
    tcpPose,
    flangePose,

    // FK Functions
    fk,
    fkTcp,
    fkPose,
    fkTcpPose,

    // IK Functions
    ik,
    ikTcp,

    // Workspace Analysis
    analyzeWorkspace,
  };
}
