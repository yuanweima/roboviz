/**
 * RoboViz Robot Component
 *
 * Renders a URDF robot model with joint control
 */

import * as React from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import URDFLoader, { URDFRobot, URDFJoint } from 'urdf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useVizStore } from '../store/vizStore';
import type { RobotState, RobotInfo, Vector3Like, Pose } from '../types';
import { toVector3 } from '../types';

/** Euler angles tuple [x, y, z] in radians */
export type EulerTuple = [number, number, number];

/** Quaternion tuple [x, y, z, w] */
export type QuaternionTuple = [number, number, number, number];

export interface RobotProps {
  /** Robot state from store or directly provided */
  state?: RobotState;
  /** Robot ID (used to get state from store if state prop not provided) */
  robotId?: string;
  /** Alternative props for direct usage without store */
  id?: string;
  urdfPath?: string;
  jointAngles?: number[];
  showAxes?: boolean;
  opacity?: number;
  color?: string | null;
  /**
   * Position in world space.
   * Accepts either object format { x, y, z } or tuple [x, y, z].
   * Takes precedence over transform.position from state.
   */
  position?: Vector3Like;
  /**
   * Rotation as Euler angles [x, y, z] in radians.
   * Takes precedence over transform.rotation from state.
   * Mutually exclusive with quaternion prop.
   */
  rotation?: EulerTuple;
  /**
   * Rotation as quaternion [x, y, z, w].
   * Takes precedence over transform.rotation from state.
   * Mutually exclusive with rotation prop.
   */
  quaternion?: QuaternionTuple;
  /**
   * Scale factor. Can be a single number for uniform scale
   * or a tuple [x, y, z] for non-uniform scale.
   */
  scale?: number | [number, number, number];
  /**
   * The up axis of the URDF model.
   * URDF/ROS uses Z-up by default, Three.js uses Y-up.
   * Set to 'Z' (default) to automatically rotate the model to Y-up for Three.js.
   * Set to 'Y' if your URDF is already in Y-up orientation.
   */
  upAxis?: 'Y' | 'Z';
  /** Callback when robot is clicked */
  onSelect?: (id: string, linkName?: string) => void;
  /** Callback when robot is loaded */
  onLoaded?: (info: RobotInfo) => void;
  /** Callback when joint angles change (e.g., from dragging) */
  onJointChange?: (id: string, angles: number[]) => void;
  /** Callback when end effector pose updates (called every frame if enabled) */
  onEndEffectorUpdate?: (pose: Pose) => void;
}

/**
 * Custom hook for loading URDF robot
 */
function useURDFRobot(urdfPath: string | undefined) {
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [jointInfo, setJointInfo] = useState<{
    names: string[];
    limits: Map<string, { lower: number; upper: number }>;
  }>({ names: [], limits: new Map() });

  useEffect(() => {
    if (!urdfPath) return;

    setLoading(true);
    setError(null);

    const loader = new URDFLoader();

    // Configure mesh loader for STL files
    loader.loadMeshCb = (path, manager, onComplete) => {
      const stlLoader = new STLLoader(manager);
      stlLoader.load(
        path,
        (geometry) => {
          geometry.computeBoundingBox();

          const material = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.4,
            roughness: 0.6,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          onComplete(mesh);
        },
        undefined,
        (err) => {
          console.warn('Failed to load mesh:', path, err);
          onComplete(new THREE.Group());
        }
      );
    };

    loader.load(
      urdfPath,
      (loadedRobot) => {
        // Extract joint info
        const names: string[] = [];
        const limits = new Map<string, { lower: number; upper: number }>();

        loadedRobot.traverse((child) => {
          const joint = child as unknown as URDFJoint;
          if (joint.isURDFJoint && (joint.jointType === 'revolute' || joint.jointType === 'prismatic' || joint.jointType === 'continuous')) {
            names.push(joint.name);
            limits.set(joint.name, {
              lower: joint.limit?.lower ?? -Math.PI,
              upper: joint.limit?.upper ?? Math.PI,
            });
          }
        });

        // Apply materials
        loadedRobot.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.metalness = 0.4;
              mat.roughness = 0.6;
            }
          }
        });

        setRobot(loadedRobot);
        setJointInfo({ names, limits });
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('URDF load error:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      // Cleanup will be handled by React
    };
  }, [urdfPath]);

  return { robot, loading, error, jointInfo };
}

/**
 * End effector marker component
 */
function EndEffectorMarker({ robot }: { robot: URDFRobot }) {
  const markerRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!markerRef.current || !robot) return;

    // Find the last link (end effector)
    let lastLink: THREE.Object3D | undefined;
    robot.traverse((child: THREE.Object3D) => {
      if ((child as any).isURDFLink) {
        lastLink = child;
      }
    });

    if (lastLink) {
      const worldPos = new THREE.Vector3();
      (lastLink as THREE.Object3D).getWorldPosition(worldPos);

      const localPos = markerRef.current.parent?.worldToLocal(worldPos.clone());
      if (localPos) {
        markerRef.current.position.copy(localPos);
      }
    }
  });

  return (
    <group ref={markerRef}>
      <mesh>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} />
      </mesh>
      <axesHelper args={[0.08]} />
    </group>
  );
}

/**
 * Robot component
 */
// Rotation to convert Z-up to Y-up (rotate -90 degrees around X axis)
const Z_UP_TO_Y_UP_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);

export function Robot({
  state: propState,
  robotId,
  // Direct props
  id,
  urdfPath,
  jointAngles,
  showAxes,
  opacity,
  color,
  // Transform props
  position: positionProp,
  rotation: rotationProp,
  quaternion: quaternionProp,
  scale: scaleProp,
  upAxis = 'Z', // Default to Z-up (URDF/ROS standard)
  // Callbacks
  onSelect,
  onLoaded,
  onJointChange,
  onEndEffectorUpdate,
}: RobotProps): React.JSX.Element | null {
  const groupRef = useRef<THREE.Group>(null);
  const { robots, updateRobot } = useVizStore();
  const onEndEffectorUpdateRef = useRef(onEndEffectorUpdate);

  // Update ref when callback changes
  useEffect(() => {
    onEndEffectorUpdateRef.current = onEndEffectorUpdate;
  }, [onEndEffectorUpdate]);

  // Build state from direct props if provided
  const directState: RobotState | undefined = (id && urdfPath) ? {
    id,
    urdf: urdfPath,
    jointAngles: jointAngles || [],
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { w: 1, x: 0, y: 0, z: 0 },
    },
    options: {
      showAxes: showAxes ?? false,
      opacity: opacity ?? 1,
      color: color ?? null,
    },
  } : undefined;

  // Get state from props, direct props, or store
  const state = propState ?? directState ?? (robotId ? robots.get(robotId) : undefined);

  const { robot, loading, error, jointInfo } = useURDFRobot(state?.urdf);

  // Notify when loaded
  useEffect(() => {
    if (robot && jointInfo.names.length > 0 && onLoaded && state) {
      const limits: [number, number][] = jointInfo.names.map((name) => {
        const limit = jointInfo.limits.get(name);
        return [limit?.lower ?? -Math.PI, limit?.upper ?? Math.PI];
      });

      onLoaded({
        id: state.id,
        dof: jointInfo.names.length,
        jointNames: jointInfo.names,
        jointLimits: limits,
      });

      // Update store with robot info
      updateRobot(state.id, {
        info: {
          id: state.id,
          dof: jointInfo.names.length,
          jointNames: jointInfo.names,
          jointLimits: limits,
        },
      });
    }
  }, [robot, jointInfo, onLoaded, state?.id, updateRobot]);

  // Update joint angles
  useEffect(() => {
    if (!robot || !state || state.jointAngles.length === 0) return;

    jointInfo.names.forEach((name, index) => {
      if (index < state.jointAngles.length) {
        try {
          robot.setJointValue(name, state.jointAngles[index]);
        } catch (e) {
          // Joint may not exist
        }
      }
    });
  }, [robot, state?.jointAngles, jointInfo.names]);

  // Update opacity and color
  useEffect(() => {
    if (!robot || !state) return;

    robot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshStandardMaterial;

        if (material) {
          material.transparent = (state.options.opacity ?? 1) < 1;
          material.opacity = state.options.opacity ?? 1;

          if (state.options.color) {
            material.color.set(state.options.color);
          }
        }
      }
    });
  }, [robot, state?.options.opacity, state?.options.color]);

  // Handle click
  const handleClick = useCallback((event: any) => {
    event.stopPropagation?.();
    if (onSelect && state) {
      const intersection = event.intersections?.[0];
      const linkName = intersection?.object?.parent?.name || '';
      onSelect(state.id, linkName);
    }
  }, [onSelect, state?.id]);

  if (!state) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <group
        position={[state.transform.position.x, state.transform.position.y, state.transform.position.z]}
      >
        <mesh>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#666" wireframe />
        </mesh>
      </group>
    );
  }

  // Error state
  if (error) {
    return (
      <group
        position={[state.transform.position.x, state.transform.position.y, state.transform.position.z]}
      >
        <mesh>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial color="#ff4444" />
        </mesh>
      </group>
    );
  }

  if (!robot) return null;

  // Apply coordinate system conversion if needed (Z-up to Y-up)
  const needsRotation = upAxis === 'Z';

  // Compute final position - prop takes precedence over state
  const finalPosition = positionProp
    ? (Array.isArray(positionProp)
        ? positionProp
        : [positionProp.x, positionProp.y, positionProp.z])
    : [state.transform.position.x, state.transform.position.y, state.transform.position.z];

  // Compute final rotation/quaternion - props take precedence over state
  let finalQuaternion: THREE.Quaternion;
  if (quaternionProp) {
    // Direct quaternion prop [x, y, z, w]
    finalQuaternion = new THREE.Quaternion(
      quaternionProp[0],
      quaternionProp[1],
      quaternionProp[2],
      quaternionProp[3]
    );
  } else if (rotationProp) {
    // Euler angles [x, y, z]
    finalQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotationProp[0], rotationProp[1], rotationProp[2])
    );
  } else {
    // From state transform
    finalQuaternion = new THREE.Quaternion(
      state.transform.rotation.x,
      state.transform.rotation.y,
      state.transform.rotation.z,
      state.transform.rotation.w
    );
  }

  // Compute final scale
  const finalScale = scaleProp
    ? (typeof scaleProp === 'number'
        ? [scaleProp, scaleProp, scaleProp]
        : scaleProp)
    : undefined;

  return (
    <group
      ref={groupRef}
      position={finalPosition as [number, number, number]}
      quaternion={finalQuaternion}
      scale={finalScale as [number, number, number] | undefined}
      onClick={handleClick}
    >
      {/* Apply Z-up to Y-up rotation if needed */}
      <group rotation={needsRotation ? Z_UP_TO_Y_UP_ROTATION : undefined}>
        <primitive object={robot} />
      </group>

      {/* Axes helper */}
      {state.options.showAxes && <axesHelper args={[0.3]} />}

      {/* End effector marker */}
      {state.options.showEndEffector && robot && (
        <EndEffectorMarker robot={robot} />
      )}
    </group>
  );
}

/**
 * Hook to get end effector world position from a robot
 */
export function useEndEffectorPose(robot: URDFRobot | null): Pose | null {
  const [pose, setPose] = useState<Pose | null>(null);

  useFrame(() => {
    if (!robot) {
      setPose(null);
      return;
    }

    // Find the last link (end effector)
    let lastLink: THREE.Object3D | undefined;
    robot.traverse((child: THREE.Object3D) => {
      if ((child as any).isURDFLink) {
        lastLink = child;
      }
    });

    if (lastLink) {
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      lastLink.getWorldPosition(worldPos);
      lastLink.getWorldQuaternion(worldQuat);

      setPose({
        position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
        orientation: { w: worldQuat.w, x: worldQuat.x, y: worldQuat.y, z: worldQuat.z },
      });
    }
  });

  return pose;
}
