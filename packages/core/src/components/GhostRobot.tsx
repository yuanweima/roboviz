/**
 * GhostRobot Component
 *
 * Renders a semi-transparent "ghost" version of a robot to preview
 * target poses, trajectories, or motion planning results.
 *
 * Features:
 * - Customizable transparency and color
 * - Optional trajectory line from current to target pose
 * - Support for multiple ghost states (e.g., trajectory keyframes)
 * - Status-based coloring (valid/warning/error)
 */

import * as React from 'react';
import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import URDFLoader, { URDFRobot, URDFJoint } from 'urdf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { Vector3Like } from '../types';

/** Euler angles tuple [x, y, z] in radians */
export type EulerTuple = [number, number, number];

/** Quaternion tuple [x, y, z, w] */
export type QuaternionTuple = [number, number, number, number];

/**
 * Mesh data for loading meshes from memory (base64 encoded)
 */
export type MeshDataMap = Record<string, string>;

/**
 * Ghost robot status for visual feedback
 */
export type GhostStatus = 'valid' | 'warning' | 'error' | 'neutral';

/**
 * Predefined colors for different ghost statuses
 */
export const GHOST_STATUS_COLORS: Record<GhostStatus, string> = {
  valid: '#00ff88',    // Green - reachable, no collision
  warning: '#ffaa00',  // Orange - near limits or singularity
  error: '#ff4444',    // Red - unreachable or collision
  neutral: '#88aaff',  // Blue - neutral preview
};

export interface GhostRobotProps {
  /** Unique identifier for this ghost */
  id?: string;
  /** URL path to URDF file */
  urdfPath?: string;
  /** URDF XML content as string (alternative to urdfPath) */
  urdfContent?: string;
  /** Mesh data for loading meshes from memory */
  meshData?: MeshDataMap;
  /** Joint angles for the ghost pose */
  jointAngles: number[];
  /** Position in world space */
  position?: Vector3Like;
  /** Rotation as Euler angles [x, y, z] in radians */
  rotation?: EulerTuple;
  /** Rotation as quaternion [x, y, z, w] */
  quaternion?: QuaternionTuple;
  /** Scale factor */
  scale?: number | [number, number, number];
  /** Opacity (0-1), default 0.4 */
  opacity?: number;
  /** Override color (hex string) */
  color?: string;
  /** Ghost status for automatic coloring */
  status?: GhostStatus;
  /** The up axis of the URDF model */
  upAxis?: 'Y' | 'Z';
  /** Whether to show a label */
  showLabel?: boolean;
  /** Label text */
  label?: string;
  /** Show axes at base */
  showAxes?: boolean;
  /**
   * End effector position of the "current" robot for trajectory line.
   * If provided, draws a line from this position to the ghost's end effector.
   */
  trajectoryFrom?: Vector3Like;
  /** Trajectory line color */
  trajectoryColor?: string;
  /** Trajectory line style */
  trajectoryStyle?: 'solid' | 'dashed';
  /** Callback when ghost robot is clicked */
  onClick?: (id: string) => void;
  /** Callback when ghost robot is hovered */
  onHover?: (id: string | null) => void;
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
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * Custom hook for loading URDF robot (shared logic)
 */
function useGhostURDFRobot(
  urdfPath: string | undefined,
  urdfContent?: string,
  meshData?: MeshDataMap
) {
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const [loading, setLoading] = useState(false);
  const [jointNames, setJointNames] = useState<string[]>([]);

  useEffect(() => {
    if (!urdfPath && !urdfContent) return;

    setLoading(true);

    const loader = new URDFLoader();

    // Configure mesh loader
    loader.loadMeshCb = (path, manager, onComplete) => {
      if (meshData) {
        const meshKey = getMeshKey(path);
        const base64Data = meshData[meshKey] || meshData[path];

        if (base64Data) {
          try {
            const arrayBuffer = base64ToArrayBuffer(base64Data);
            const stlLoader = new STLLoader(manager);
            const geometry = stlLoader.parse(arrayBuffer);
            geometry.computeBoundingBox();

            const material = new THREE.MeshStandardMaterial({
              color: 0xcccccc,
              metalness: 0.2,
              roughness: 0.8,
            });
            const mesh = new THREE.Mesh(geometry, material);
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
            metalness: 0.2,
            roughness: 0.8,
          });
          const mesh = new THREE.Mesh(geometry, material);
          onComplete(mesh);
        },
        undefined,
        () => {
          onComplete(new THREE.Group());
        }
      );
    };

    // Load from content or URL
    if (urdfContent) {
      try {
        const loadedRobot = loader.parse(urdfContent);
        const names = extractJointNames(loadedRobot);
        setRobot(loadedRobot);
        setJointNames(names);
        setLoading(false);
      } catch (err) {
        console.error('URDF parse error:', err);
        setLoading(false);
      }
    } else if (urdfPath) {
      loader.load(
        urdfPath,
        (loadedRobot) => {
          const names = extractJointNames(loadedRobot);
          setRobot(loadedRobot);
          setJointNames(names);
          setLoading(false);
        },
        undefined,
        (err) => {
          console.error('URDF load error:', err);
          setLoading(false);
        }
      );
    }
  }, [urdfPath, urdfContent, meshData]);

  return { robot, loading, jointNames };
}

/**
 * Extract joint names from loaded robot
 */
function extractJointNames(robot: URDFRobot): string[] {
  const names: string[] = [];
  robot.traverse((child) => {
    const joint = child as unknown as URDFJoint;
    if (joint.isURDFJoint && (joint.jointType === 'revolute' || joint.jointType === 'prismatic' || joint.jointType === 'continuous')) {
      names.push(joint.name);
    }
  });
  return names;
}

/**
 * Get end effector world position from robot
 */
function getEndEffectorPosition(robot: URDFRobot): THREE.Vector3 {
  let lastLink: THREE.Object3D | undefined;
  robot.traverse((child: THREE.Object3D) => {
    if ((child as any).isURDFLink) {
      lastLink = child;
    }
  });

  const pos = new THREE.Vector3();
  if (lastLink) {
    lastLink.getWorldPosition(pos);
  }
  return pos;
}

// Rotation to convert Z-up to Y-up
const Z_UP_TO_Y_UP_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);

/**
 * GhostRobot component
 */
export function GhostRobot({
  id = 'ghost',
  urdfPath,
  urdfContent,
  meshData,
  jointAngles,
  position: positionProp,
  rotation: rotationProp,
  quaternion: quaternionProp,
  scale: scaleProp,
  opacity = 0.4,
  color,
  status = 'neutral',
  upAxis = 'Z',
  showLabel = false,
  label,
  showAxes = false,
  trajectoryFrom,
  trajectoryColor,
  trajectoryStyle = 'dashed',
  onClick,
  onHover,
}: GhostRobotProps): React.JSX.Element | null {
  const groupRef = useRef<THREE.Group>(null);
  const [endEffectorPos, setEndEffectorPos] = useState<THREE.Vector3 | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const { robot, loading, jointNames } = useGhostURDFRobot(
    urdfContent ? undefined : urdfPath,
    urdfContent,
    meshData
  );

  // Determine ghost color
  const ghostColor = useMemo(() => {
    if (color) return color;
    return GHOST_STATUS_COLORS[status];
  }, [color, status]);

  // Apply joint angles
  useEffect(() => {
    if (!robot || jointAngles.length === 0) return;

    jointNames.forEach((name, index) => {
      if (index < jointAngles.length) {
        try {
          robot.setJointValue(name, jointAngles[index]);
        } catch (e) {
          // Joint may not exist
        }
      }
    });

    // Update end effector position after setting joints
    robot.updateMatrixWorld(true);
    setEndEffectorPos(getEndEffectorPosition(robot));
  }, [robot, jointAngles, jointNames]);

  // Apply ghost material (transparency and color)
  useEffect(() => {
    if (!robot) return;

    robot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Clone material to avoid affecting other instances
        if (!mesh.userData.isGhostMaterial) {
          const newMaterial = new THREE.MeshStandardMaterial({
            color: ghostColor,
            transparent: true,
            opacity: opacity,
            depthWrite: false, // Prevent z-fighting
            metalness: 0.1,
            roughness: 0.9,
          });
          mesh.material = newMaterial;
          mesh.userData.isGhostMaterial = true;
        } else {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.color.set(ghostColor);
          mat.opacity = isHovered ? Math.min(opacity + 0.2, 1) : opacity;
        }
      }
    });
  }, [robot, ghostColor, opacity, isHovered]);

  // Trajectory line points - must be before early returns to maintain hooks order
  const trajectoryPoints = useMemo(() => {
    if (!trajectoryFrom || !endEffectorPos) return null;

    const from = Array.isArray(trajectoryFrom)
      ? trajectoryFrom
      : [trajectoryFrom.x, trajectoryFrom.y, trajectoryFrom.z];

    return [
      from as [number, number, number],
      [endEffectorPos.x, endEffectorPos.y, endEffectorPos.z] as [number, number, number],
    ];
  }, [trajectoryFrom, endEffectorPos]);

  // Handle interactions
  const handleClick = (event: any) => {
    event.stopPropagation?.();
    onClick?.(id);
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
    onHover?.(id);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    onHover?.(null);
  };

  if (loading) {
    return null; // Don't show loading state for ghost
  }

  if (!robot) return null;

  // Compute transforms
  const needsRotation = upAxis === 'Z';

  const finalPosition = positionProp
    ? (Array.isArray(positionProp)
        ? positionProp
        : [positionProp.x, positionProp.y, positionProp.z])
    : [0, 0, 0];

  let finalQuaternion: THREE.Quaternion;
  if (quaternionProp) {
    finalQuaternion = new THREE.Quaternion(
      quaternionProp[0],
      quaternionProp[1],
      quaternionProp[2],
      quaternionProp[3]
    );
  } else if (rotationProp) {
    finalQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotationProp[0], rotationProp[1], rotationProp[2])
    );
  } else {
    finalQuaternion = new THREE.Quaternion();
  }

  const finalScale = scaleProp
    ? (typeof scaleProp === 'number'
        ? [scaleProp, scaleProp, scaleProp]
        : scaleProp)
    : undefined;

  return (
    <>
      <group
        ref={groupRef}
        position={finalPosition as [number, number, number]}
        quaternion={finalQuaternion}
        scale={finalScale as [number, number, number] | undefined}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {/* Robot model with coordinate conversion */}
        <group rotation={needsRotation ? Z_UP_TO_Y_UP_ROTATION : undefined}>
          <primitive object={robot} />
        </group>

        {/* Axes helper */}
        {showAxes && <axesHelper args={[0.2]} />}

        {/* Status indicator ring at base */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <ringGeometry args={[0.08, 0.1, 32]} />
          <meshBasicMaterial
            color={ghostColor}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* Trajectory line (rendered outside the group for proper world coordinates) */}
      {trajectoryPoints && (
        <Line
          points={trajectoryPoints}
          color={trajectoryColor || ghostColor}
          lineWidth={2}
          transparent
          opacity={0.6}
          dashed={trajectoryStyle === 'dashed'}
          dashSize={0.02}
          gapSize={0.01}
        />
      )}
    </>
  );
}

/**
 * Props for GhostRobotTrajectory - renders multiple ghost robots along a path
 */
export interface GhostRobotTrajectoryProps {
  /** URDF path */
  urdfPath?: string;
  /** URDF content */
  urdfContent?: string;
  /** Mesh data */
  meshData?: MeshDataMap;
  /** Array of joint angle configurations along the trajectory */
  keyframes: {
    jointAngles: number[];
    status?: GhostStatus;
    label?: string;
  }[];
  /** Position of the robot base */
  position?: Vector3Like;
  /** Rotation of the robot base */
  rotation?: EulerTuple;
  /** Quaternion of the robot base */
  quaternion?: QuaternionTuple;
  /** Scale */
  scale?: number | [number, number, number];
  /** Base opacity (will fade for intermediate frames) */
  opacity?: number;
  /** Up axis */
  upAxis?: 'Y' | 'Z';
  /** Show trajectory lines between keyframes */
  showTrajectoryLines?: boolean;
  /** Trajectory line color */
  trajectoryColor?: string;
  /** Callback when a keyframe ghost is clicked */
  onKeyframeClick?: (index: number) => void;
}

/**
 * Renders multiple ghost robots along a trajectory
 */
export function GhostRobotTrajectory({
  urdfPath,
  urdfContent,
  meshData,
  keyframes,
  position,
  rotation,
  quaternion,
  scale,
  opacity = 0.3,
  upAxis = 'Z',
  showTrajectoryLines = true,
  trajectoryColor = '#88aaff',
  onKeyframeClick,
}: GhostRobotTrajectoryProps): React.JSX.Element {
  if (keyframes.length === 0) {
    return <></>;
  }

  // Calculate opacity for each keyframe (first and last are more visible)
  const getKeyframeOpacity = (index: number, total: number): number => {
    if (total === 1) return opacity;
    if (index === 0 || index === total - 1) return opacity;
    // Intermediate frames are more transparent
    return opacity * 0.5;
  };

  return (
    <group>
      {keyframes.map((keyframe, index) => (
        <GhostRobot
          key={`trajectory-ghost-${index}`}
          id={`trajectory-${index}`}
          urdfPath={urdfPath}
          urdfContent={urdfContent}
          meshData={meshData}
          jointAngles={keyframe.jointAngles}
          position={position}
          rotation={rotation}
          quaternion={quaternion}
          scale={scale}
          opacity={getKeyframeOpacity(index, keyframes.length)}
          status={keyframe.status}
          upAxis={upAxis}
          showLabel={!!keyframe.label}
          label={keyframe.label}
          onClick={() => onKeyframeClick?.(index)}
        />
      ))}
    </group>
  );
}

export default GhostRobot;
