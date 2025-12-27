/**
 * EndEffector Component
 *
 * Provides a mounting point for tools attached to the robot's end-effector.
 * Supports TCP (Tool Center Point) offset for proper tool positioning and orientation.
 *
 * Usage:
 * ```tsx
 * <Robot ...>
 *   <EndEffector tcpOffset={{ position: [0, 0, 0.1], rotation: [0, 0, 0] }}>
 *     <WeldingTorch />
 *   </EndEffector>
 * </Robot>
 * ```
 */

import * as React from 'react';
import { createContext, useContext, useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Pose, Vector3, Quaternion } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface TCPOffset {
  /** Position offset from end-effector frame [x, y, z] in meters */
  position?: [number, number, number];
  /** Rotation offset as Euler angles [rx, ry, rz] in radians */
  rotation?: [number, number, number];
  /** Rotation offset as quaternion [x, y, z, w] (takes precedence over rotation) */
  quaternion?: [number, number, number, number];
}

export interface EndEffectorPose {
  /** World-space position */
  position: Vector3;
  /** World-space orientation as quaternion */
  orientation: Quaternion;
  /** The Three.js matrix representing the full transform */
  matrix: THREE.Matrix4;
}

export interface EndEffectorContextValue {
  /** Current end-effector pose in world space (before TCP offset) */
  pose: EndEffectorPose | null;
  /** Whether the end-effector data is available */
  isReady: boolean;
}

// =============================================================================
// Context
// =============================================================================

const EndEffectorContext = createContext<EndEffectorContextValue>({
  pose: null,
  isReady: false,
});

/**
 * Hook to access end-effector pose from within EndEffector children
 */
export function useEndEffector(): EndEffectorContextValue {
  return useContext(EndEffectorContext);
}

// =============================================================================
// Internal Context for Robot to provide data
// =============================================================================

export interface EndEffectorProviderValue {
  /** Reference to the end-effector Object3D (last URDF link) */
  endEffectorRef: React.MutableRefObject<THREE.Object3D | null>;
  /** Register a callback for pose updates */
  onPoseUpdate: (callback: (pose: EndEffectorPose) => void) => () => void;
}

const EndEffectorProviderContext = createContext<EndEffectorProviderValue | null>(null);

/**
 * Provider component that Robot uses internally to expose end-effector data
 */
export function EndEffectorProvider({
  children,
  endEffectorRef,
}: {
  children: React.ReactNode;
  endEffectorRef: React.MutableRefObject<THREE.Object3D | null>;
}): React.JSX.Element {
  const callbacksRef = useRef<Set<(pose: EndEffectorPose) => void>>(new Set());

  const value = useMemo<EndEffectorProviderValue>(
    () => ({
      endEffectorRef,
      onPoseUpdate: (callback) => {
        callbacksRef.current.add(callback);
        return () => {
          callbacksRef.current.delete(callback);
        };
      },
    }),
    [endEffectorRef]
  );

  // Update all registered callbacks each frame
  useFrame(() => {
    const ee = endEffectorRef.current;
    if (!ee || callbacksRef.current.size === 0) return;

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    ee.getWorldPosition(worldPos);
    ee.getWorldQuaternion(worldQuat);

    const matrix = new THREE.Matrix4();
    matrix.compose(worldPos, worldQuat, new THREE.Vector3(1, 1, 1));

    const pose: EndEffectorPose = {
      position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
      orientation: { w: worldQuat.w, x: worldQuat.x, y: worldQuat.y, z: worldQuat.z },
      matrix,
    };

    callbacksRef.current.forEach((cb) => cb(pose));
  });

  return (
    <EndEffectorProviderContext.Provider value={value}>
      {children}
    </EndEffectorProviderContext.Provider>
  );
}

// =============================================================================
// EndEffector Component
// =============================================================================

export interface EndEffectorProps {
  /** Children to render at the end-effector position */
  children?: React.ReactNode;
  /**
   * TCP (Tool Center Point) offset from end-effector frame.
   * Use this to properly position and orient tools.
   */
  tcpOffset?: TCPOffset;
  /** Show axes helper at the TCP frame */
  showAxes?: boolean;
  /** Size of axes helper */
  axesSize?: number;
  /** Callback when TCP pose updates */
  onPoseUpdate?: (pose: Pose) => void;
}

/**
 * EndEffector component for mounting tools at the robot's end-effector.
 *
 * Must be used as a child of Robot component (or within EndEffectorProvider).
 * Supports TCP offset for proper tool positioning.
 */
export function EndEffector({
  children,
  tcpOffset,
  showAxes = false,
  axesSize = 0.05,
  onPoseUpdate,
}: EndEffectorProps): React.JSX.Element | null {
  const provider = useContext(EndEffectorProviderContext);
  const groupRef = useRef<THREE.Group>(null);
  const [pose, setPose] = useState<EndEffectorPose | null>(null);
  const onPoseUpdateRef = useRef(onPoseUpdate);

  // Update callback ref
  useEffect(() => {
    onPoseUpdateRef.current = onPoseUpdate;
  }, [onPoseUpdate]);

  // Compute TCP offset matrix
  const tcpMatrix = useMemo(() => {
    if (!tcpOffset) return null;

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3(
      tcpOffset.position?.[0] ?? 0,
      tcpOffset.position?.[1] ?? 0,
      tcpOffset.position?.[2] ?? 0
    );

    let quat: THREE.Quaternion;
    if (tcpOffset.quaternion) {
      quat = new THREE.Quaternion(
        tcpOffset.quaternion[0],
        tcpOffset.quaternion[1],
        tcpOffset.quaternion[2],
        tcpOffset.quaternion[3]
      );
    } else if (tcpOffset.rotation) {
      quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          tcpOffset.rotation[0],
          tcpOffset.rotation[1],
          tcpOffset.rotation[2]
        )
      );
    } else {
      quat = new THREE.Quaternion();
    }

    matrix.compose(pos, quat, new THREE.Vector3(1, 1, 1));
    return matrix;
  }, [
    tcpOffset?.position?.[0],
    tcpOffset?.position?.[1],
    tcpOffset?.position?.[2],
    tcpOffset?.rotation?.[0],
    tcpOffset?.rotation?.[1],
    tcpOffset?.rotation?.[2],
    tcpOffset?.quaternion?.[0],
    tcpOffset?.quaternion?.[1],
    tcpOffset?.quaternion?.[2],
    tcpOffset?.quaternion?.[3],
  ]);

  // Subscribe to pose updates from provider
  useEffect(() => {
    if (!provider) return;

    const unsubscribe = provider.onPoseUpdate((eePose) => {
      setPose(eePose);

      // Apply TCP offset and notify callback
      if (onPoseUpdateRef.current) {
        let tcpPose: Pose;
        if (tcpMatrix) {
          const combinedMatrix = eePose.matrix.clone().multiply(tcpMatrix);
          const tcpPos = new THREE.Vector3();
          const tcpQuat = new THREE.Quaternion();
          combinedMatrix.decompose(tcpPos, tcpQuat, new THREE.Vector3());
          tcpPose = {
            position: { x: tcpPos.x, y: tcpPos.y, z: tcpPos.z },
            orientation: { w: tcpQuat.w, x: tcpQuat.x, y: tcpQuat.y, z: tcpQuat.z },
          };
        } else {
          tcpPose = {
            position: eePose.position,
            orientation: eePose.orientation,
          };
        }
        onPoseUpdateRef.current(tcpPose);
      }
    });

    return unsubscribe;
  }, [provider, tcpMatrix]);

  // Update group transform each frame
  useFrame(() => {
    if (!groupRef.current || !provider?.endEffectorRef.current) {
      return;
    }

    const ee = provider.endEffectorRef.current;

    // Get world transform of end-effector
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    ee.getWorldPosition(worldPos);
    ee.getWorldQuaternion(worldQuat);

    // Apply TCP offset if present
    if (tcpMatrix) {
      const eeMatrix = new THREE.Matrix4().compose(
        worldPos,
        worldQuat,
        new THREE.Vector3(1, 1, 1)
      );
      const combinedMatrix = eeMatrix.multiply(tcpMatrix);
      combinedMatrix.decompose(worldPos, worldQuat, new THREE.Vector3());
    }

    // Set world transform on group
    groupRef.current.position.copy(worldPos);
    groupRef.current.quaternion.copy(worldQuat);
  });

  // Context value for children
  const contextValue = useMemo<EndEffectorContextValue>(
    () => ({
      pose,
      isReady: pose !== null,
    }),
    [pose]
  );

  if (!provider) {
    console.warn('EndEffector must be used within a Robot component or EndEffectorProvider');
    return null;
  }

  return (
    <EndEffectorContext.Provider value={contextValue}>
      <group ref={groupRef}>
        {showAxes && <axesHelper args={[axesSize]} />}
        {children}
      </group>
    </EndEffectorContext.Provider>
  );
}

// =============================================================================
// Standalone EndEffector (for use outside Robot)
// =============================================================================

export interface StandaloneEndEffectorProps extends EndEffectorProps {
  /** End-effector pose in world space */
  pose: Pose;
}

/**
 * Standalone EndEffector component for cases where you have the pose
 * but are not using the Robot component's context.
 */
export function StandaloneEndEffector({
  children,
  pose,
  tcpOffset,
  showAxes = false,
  axesSize = 0.05,
  onPoseUpdate,
}: StandaloneEndEffectorProps): React.JSX.Element {
  const groupRef = useRef<THREE.Group>(null);
  const onPoseUpdateRef = useRef(onPoseUpdate);

  // Update callback ref
  useEffect(() => {
    onPoseUpdateRef.current = onPoseUpdate;
  }, [onPoseUpdate]);

  // Compute final position and quaternion
  const [position, quaternion] = useMemo(() => {
    const pos = new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z);
    const quat = new THREE.Quaternion(
      pose.orientation.x,
      pose.orientation.y,
      pose.orientation.z,
      pose.orientation.w
    );

    // Apply TCP offset if present
    if (tcpOffset) {
      const tcpPos = new THREE.Vector3(
        tcpOffset.position?.[0] ?? 0,
        tcpOffset.position?.[1] ?? 0,
        tcpOffset.position?.[2] ?? 0
      );

      let tcpQuat: THREE.Quaternion;
      if (tcpOffset.quaternion) {
        tcpQuat = new THREE.Quaternion(
          tcpOffset.quaternion[0],
          tcpOffset.quaternion[1],
          tcpOffset.quaternion[2],
          tcpOffset.quaternion[3]
        );
      } else if (tcpOffset.rotation) {
        tcpQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            tcpOffset.rotation[0],
            tcpOffset.rotation[1],
            tcpOffset.rotation[2]
          )
        );
      } else {
        tcpQuat = new THREE.Quaternion();
      }

      // Transform TCP offset from local to world
      tcpPos.applyQuaternion(quat);
      pos.add(tcpPos);
      quat.multiply(tcpQuat);
    }

    return [pos, quat] as const;
  }, [
    pose.position.x,
    pose.position.y,
    pose.position.z,
    pose.orientation.x,
    pose.orientation.y,
    pose.orientation.z,
    pose.orientation.w,
    tcpOffset?.position?.[0],
    tcpOffset?.position?.[1],
    tcpOffset?.position?.[2],
    tcpOffset?.rotation?.[0],
    tcpOffset?.rotation?.[1],
    tcpOffset?.rotation?.[2],
    tcpOffset?.quaternion?.[0],
    tcpOffset?.quaternion?.[1],
    tcpOffset?.quaternion?.[2],
    tcpOffset?.quaternion?.[3],
  ]);

  // Notify callback of TCP pose
  useEffect(() => {
    if (onPoseUpdateRef.current) {
      onPoseUpdateRef.current({
        position: { x: position.x, y: position.y, z: position.z },
        orientation: { w: quaternion.w, x: quaternion.x, y: quaternion.y, z: quaternion.z },
      });
    }
  }, [position, quaternion]);

  // Context value for children
  const contextValue = useMemo<EndEffectorContextValue>(
    () => ({
      pose: {
        position: { x: position.x, y: position.y, z: position.z },
        orientation: { w: quaternion.w, x: quaternion.x, y: quaternion.y, z: quaternion.z },
        matrix: new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1)),
      },
      isReady: true,
    }),
    [position, quaternion]
  );

  return (
    <EndEffectorContext.Provider value={contextValue}>
      <group ref={groupRef} position={position} quaternion={quaternion}>
        {showAxes && <axesHelper args={[axesSize]} />}
        {children}
      </group>
    </EndEffectorContext.Provider>
  );
}
