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
import { isURDFLink, findLastURDFLink } from '../types/urdf';
import { EndEffectorProvider } from './EndEffector';
import type { Pose3D } from '../coordinates';
import { useRobotLOD } from '../rendering/optimization/useRobotLOD';

/** Euler angles tuple [x, y, z] in radians */
export type EulerTuple = [number, number, number];

/** Quaternion tuple [x, y, z, w] */
export type QuaternionTuple = [number, number, number, number];

/**
 * Mesh data for loading meshes from memory (base64 encoded)
 * Key is the mesh filename (e.g., "link1.stl"), value is base64 encoded content
 */
export type MeshDataMap = Record<string, string>;

export interface RobotProps {
  /** Robot state from store or directly provided */
  state?: RobotState;
  /** Robot ID (used to get state from store if state prop not provided) */
  robotId?: string;
  /** Alternative props for direct usage without store */
  id?: string;
  /** URL path to URDF file (mutually exclusive with urdfContent) */
  urdfPath?: string;
  /**
   * URDF XML content as string (mutually exclusive with urdfPath)
   * Use this to load URDF directly from memory without HTTP fetch
   */
  urdfContent?: string;
  /**
   * Mesh data for loading meshes from memory (base64 encoded)
   * Key is the mesh path as referenced in URDF, value is base64 encoded content
   * Required when using urdfContent if the URDF references external meshes
   */
  meshData?: MeshDataMap;
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
   * Base pose in Z-up coordinates (robotics standard).
   * When provided, automatically converts to Y-up for Three.js rendering.
   * Takes precedence over position/rotation/quaternion props.
   *
   * @example
   * ```tsx
   * // Position robot at X=1m, Y=0.5m, Z=0m (Z-up)
   * <Robot
   *   basePoseZup={{
   *     position: [1, 0.5, 0],
   *     quaternion: [0, 0, 0, 1],
   *   }}
   * />
   * ```
   */
  basePoseZup?: Pose3D;
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
  /** Callback when end effector pose updates (called every frame if enabled) - Y-up coordinates */
  onEndEffectorUpdate?: (pose: Pose) => void;
  /**
   * Callback when end effector pose updates in Z-up coordinates (robotics standard).
   * Called every frame if provided. Useful for IK/FK operations.
   */
  onEndEffectorUpdateZup?: (pose: Pose3D) => void;
  /**
   * Enable LOD (Level of Detail) for performance optimization.
   * When enabled, geometry is simplified based on camera distance.
   */
  lodEnabled?: boolean;
  /**
   * LOD distance thresholds [high, medium, low] in world units.
   * Default: [5, 15, 30]
   */
  lodDistances?: [number, number, number];
  /**
   * Callback when LOD level changes.
   * Level 0 = highest detail, 2 = lowest detail.
   */
  onLodChange?: (level: number, distance: number) => void;
  /**
   * Children to render. If you include EndEffector components as children,
   * they will automatically receive the end-effector pose from this robot.
   */
  children?: React.ReactNode;
}

/**
 * Helper to decode base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Helper to extract mesh filename from path
 */
function getMeshKey(path: string): string {
  // Handle various path formats: package://..., file://..., relative paths
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * Process loaded robot: extract joint info and apply materials
 */
function processLoadedRobot(loadedRobot: URDFRobot): {
  names: string[];
  limits: Map<string, { lower: number; upper: number }>;
} {
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

  return { names, limits };
}

/**
 * Custom hook for loading URDF robot
 * Supports both URL loading (urdfPath) and content loading (urdfContent + meshData)
 */
function useURDFRobot(
  urdfPath: string | undefined,
  urdfContent?: string,
  meshData?: MeshDataMap
) {
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [jointInfo, setJointInfo] = useState<{
    names: string[];
    limits: Map<string, { lower: number; upper: number }>;
  }>({ names: [], limits: new Map() });

  useEffect(() => {
    // Need either urdfPath or urdfContent
    if (!urdfPath && !urdfContent) return;

    setLoading(true);
    setError(null);

    const loader = new URDFLoader();

    // Configure mesh loader
    loader.loadMeshCb = (path, manager, onComplete) => {
      // If we have mesh data, try to load from memory first
      if (meshData) {
        const meshKey = getMeshKey(path);
        const base64Data = meshData[meshKey] || meshData[path];

        if (base64Data) {
          try {
            const arrayBuffer = base64ToArrayBuffer(base64Data);
            const stlLoader = new STLLoader(manager);

            // Parse from ArrayBuffer
            const geometry = stlLoader.parse(arrayBuffer);
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
            return;
          } catch (e) {
            console.warn('Failed to parse mesh from memory:', meshKey, e);
          }
        }
      }

      // Fallback to loading from URL
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

    // Load from content (in-memory) or URL
    if (urdfContent) {
      try {
        // Parse URDF from string content
        const loadedRobot = loader.parse(urdfContent);
        const { names, limits } = processLoadedRobot(loadedRobot);

        setRobot(loadedRobot);
        setJointInfo({ names, limits });
        setLoading(false);
      } catch (err) {
        console.error('URDF parse error:', err);
        setError(err as Error);
        setLoading(false);
      }
    } else if (urdfPath) {
      // Load from URL
      loader.load(
        urdfPath,
        (loadedRobot) => {
          const { names, limits } = processLoadedRobot(loadedRobot);

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
    }

    return () => {
      // Cleanup will be handled by React
    };
  }, [urdfPath, urdfContent, meshData]);

  return { robot, loading, error, jointInfo };
}

/**
 * End effector marker component
 */
function EndEffectorMarker({ robot }: { robot: URDFRobot }) {
  const markerRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!markerRef.current || !robot) return;

    // Find the last link (end effector) using type guard
    const lastLink = findLastURDFLink(robot);

    if (lastLink) {
      const worldPos = new THREE.Vector3();
      lastLink.getWorldPosition(worldPos);

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
// Rotation to convert Y-up URDF models to Z-up scene
// (Only needed if upAxis='Y' is specified for rare Y-up URDF models)
const Y_UP_TO_Z_UP_ROTATION = new THREE.Euler(Math.PI / 2, 0, 0);

export function Robot({
  state: propState,
  robotId,
  // Direct props
  id,
  urdfPath,
  urdfContent,
  meshData,
  jointAngles,
  showAxes,
  opacity,
  color,
  // Transform props
  position: positionProp,
  rotation: rotationProp,
  quaternion: quaternionProp,
  scale: scaleProp,
  basePoseZup, // Z-up base pose (robotics standard)
  upAxis = 'Z', // Default to Z-up (URDF/ROS standard)
  // LOD props
  lodEnabled = false,
  lodDistances,
  onLodChange,
  // Callbacks
  onSelect,
  onLoaded,
  onJointChange,
  onEndEffectorUpdate,
  onEndEffectorUpdateZup,
  // Children
  children,
}: RobotProps): React.JSX.Element | null {
  const groupRef = useRef<THREE.Group>(null);
  const endEffectorRef = useRef<THREE.Object3D | null>(null);
  const { robots, updateRobot } = useVizStore();
  const onEndEffectorUpdateRef = useRef(onEndEffectorUpdate);
  const onEndEffectorUpdateZupRef = useRef(onEndEffectorUpdateZup);

  // Update refs when callbacks change
  useEffect(() => {
    onEndEffectorUpdateRef.current = onEndEffectorUpdate;
  }, [onEndEffectorUpdate]);

  useEffect(() => {
    onEndEffectorUpdateZupRef.current = onEndEffectorUpdateZup;
  }, [onEndEffectorUpdateZup]);

  // Build state from direct props if provided
  // Support both urdfPath and urdfContent modes
  const hasUrdf = urdfPath || urdfContent;
  const directState: RobotState | undefined = (id && hasUrdf) ? {
    id,
    urdf: urdfPath || '', // For content mode, urdf path may be empty
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

  // Load URDF - support both URL and content modes
  const { robot, loading, error, jointInfo } = useURDFRobot(
    urdfContent ? undefined : state?.urdf, // Only use URL if no content provided
    urdfContent,
    meshData
  );

  // LOD (Level of Detail) support for performance optimization
  const lodConfig = React.useMemo(
    () => ({
      enabled: lodEnabled,
      distances: lodDistances || [5, 15, 30] as [number, number, number],
    }),
    [lodEnabled, lodDistances]
  );

  useRobotLOD({
    config: lodConfig,
    robotObject: robot,
    robotId: state?.id || id || 'robot',
    onLevelChange: onLodChange,
  });

  // Cleanup THREE.js resources when robot changes or component unmounts
  useEffect(() => {
    return () => {
      if (robot) {
        robot.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.geometry) {
              mesh.geometry.dispose();
            }
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => {
                if ((mat as THREE.MeshStandardMaterial).map) {
                  (mat as THREE.MeshStandardMaterial).map?.dispose();
                }
                mat.dispose();
              });
            }
          }
        });
      }
    };
  }, [robot]);

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

  // Track the end effector (last link) reference
  useEffect(() => {
    if (!robot) {
      endEffectorRef.current = null;
      return;
    }

    // Find the last link (end effector) using type guard
    const lastLink = findLastURDFLink(robot);
    endEffectorRef.current = lastLink || null;
  }, [robot]);

  // Update end effector pose continuously (for both Y-up and Z-up callbacks)
  useFrame(() => {
    const hasYUpCallback = onEndEffectorUpdateRef.current;
    const hasZUpCallback = onEndEffectorUpdateZupRef.current;

    if (!robot || (!hasYUpCallback && !hasZUpCallback)) return;

    const lastLink = endEffectorRef.current;
    if (lastLink) {
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      lastLink.getWorldPosition(worldPos);
      lastLink.getWorldQuaternion(worldQuat);

      // Call Y-up callback (legacy - now scene is Z-up, so this is actually Z-up coordinates)
      if (hasYUpCallback) {
        onEndEffectorUpdateRef.current!({
          position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
          orientation: { w: worldQuat.w, x: worldQuat.x, y: worldQuat.y, z: worldQuat.z },
        });
      }

      // Call Z-up callback (scene is now Z-up, so no conversion needed)
      if (hasZUpCallback) {
        onEndEffectorUpdateZupRef.current!({
          position: [worldPos.x, worldPos.y, worldPos.z],
          quaternion: [worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w],
        });
      }
    }
  });

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

  // Scene is Z-up. URDF models are typically Z-up, so no rotation needed when upAxis='Z'.
  // Only rotate if upAxis='Y' (rare Y-up URDF models need rotation to fit Z-up scene).
  const needsRotation = upAxis === 'Y';

  // Compute final position and quaternion
  // Priority: basePoseZup > position/rotation/quaternion props > state
  let finalPosition: [number, number, number];
  let finalQuaternion: THREE.Quaternion;

  if (basePoseZup) {
    // Scene is Z-up, use basePoseZup directly
    finalPosition = basePoseZup.position;
    finalQuaternion = new THREE.Quaternion(
      basePoseZup.quaternion[0],
      basePoseZup.quaternion[1],
      basePoseZup.quaternion[2],
      basePoseZup.quaternion[3]
    );
  } else if (positionProp || quaternionProp || rotationProp) {
    // Use props directly (scene is Z-up)
    finalPosition = positionProp
      ? (Array.isArray(positionProp)
          ? positionProp as [number, number, number]
          : [positionProp.x, positionProp.y, positionProp.z])
      : [state.transform.position.x, state.transform.position.y, state.transform.position.z];

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
  } else {
    // From state transform
    finalPosition = [state.transform.position.x, state.transform.position.y, state.transform.position.z];
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
    <EndEffectorProvider endEffectorRef={endEffectorRef}>
      <group
        ref={groupRef}
        position={finalPosition as [number, number, number]}
        quaternion={finalQuaternion}
        scale={finalScale as [number, number, number] | undefined}
        onClick={handleClick}
      >
        {/* Robot model - scene is Z-up, URDF is typically Z-up, so no rotation needed */}
        <group rotation={needsRotation ? Y_UP_TO_Z_UP_ROTATION : undefined}>
          <primitive object={robot} />
        </group>

        {/* Axes helper */}
        {state.options.showAxes && <axesHelper args={[0.3]} />}

        {/* End effector marker */}
        {state.options.showEndEffector && robot && (
          <EndEffectorMarker robot={robot} />
        )}

        {/* Children (EndEffector components, tools, etc.) */}
        {children}
      </group>
    </EndEffectorProvider>
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

    // Find the last link (end effector) using type guard
    const lastLink = findLastURDFLink(robot);

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
