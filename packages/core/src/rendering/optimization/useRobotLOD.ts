/**
 * RoboViz Robot LOD Hook
 *
 * Provides LOD (Level of Detail) support for robot components.
 * Automatically simplifies geometry based on camera distance.
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LODManager, generateSimplifiedGeometry, generateBoundingBoxMesh } from './LODManager';

// ============================================================================
// Types
// ============================================================================

export interface RobotLODConfig {
  /** Enable LOD system */
  enabled: boolean;
  /** Distance thresholds for LOD levels [high, medium, low] in world units */
  distances: [number, number, number];
  /** Whether to use bounding box for the lowest LOD level */
  useBoundingBox: boolean;
  /** Simplification ratios for medium and low detail [medium, low] */
  simplificationRatios: [number, number];
  /** Update frequency (0 = every frame, higher = less frequent updates) */
  updateFrequency: number;
}

export interface RobotLODState {
  /** Current LOD level (0 = highest detail, 2 = lowest) */
  currentLevel: number;
  /** Distance from camera */
  distance: number;
  /** Whether LOD is active */
  isActive: boolean;
}

export interface UseRobotLODOptions {
  /** LOD configuration */
  config: Partial<RobotLODConfig>;
  /** The robot's root object */
  robotObject: THREE.Object3D | null;
  /** Robot ID for LOD manager */
  robotId: string;
  /** Callback when LOD level changes */
  onLevelChange?: (level: number, distance: number) => void;
}

export interface UseRobotLODResult {
  /** Current LOD state */
  state: RobotLODState;
  /** Force a specific LOD level */
  forceLevel: (level: number) => void;
  /** Reset to automatic LOD */
  resetToAuto: () => void;
  /** Whether LOD is available */
  isAvailable: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_LOD_CONFIG: RobotLODConfig = {
  enabled: true,
  distances: [5, 15, 30],
  useBoundingBox: false,
  simplificationRatios: [0.5, 0.2],
  updateFrequency: 0,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clone and simplify all meshes in a robot object
 */
function createSimplifiedRobot(
  source: THREE.Object3D,
  ratio: number
): THREE.Object3D {
  const clone = source.clone(true);

  clone.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const simplified = generateSimplifiedGeometry(child.geometry, ratio);
      child.geometry.dispose();
      child.geometry = simplified;
    }
  });

  return clone;
}

// Store original geometries for LOD restoration
const originalGeometriesMap = new WeakMap<THREE.Object3D, Map<string, THREE.BufferGeometry>>();

/**
 * Apply LOD simplification directly to robot meshes
 * This modifies the geometry in-place for visible LOD changes
 */
function applyLODToRobot(
  robotObject: THREE.Object3D,
  level: number,
  simplificationRatios: [number, number]
): void {
  // Store original geometries on first call
  if (!originalGeometriesMap.has(robotObject)) {
    const originals = new Map<string, THREE.BufferGeometry>();
    robotObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        originals.set(child.uuid, child.geometry.clone());
      }
    });
    originalGeometriesMap.set(robotObject, originals);
  }

  const originals = originalGeometriesMap.get(robotObject)!;

  robotObject.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const originalGeometry = originals.get(child.uuid);
      if (!originalGeometry) return;

      // Determine the ratio based on LOD level
      let ratio = 1.0;
      if (level === 1) {
        ratio = simplificationRatios[0]; // medium
      } else if (level === 2) {
        ratio = simplificationRatios[1]; // low
      }

      if (level === 0) {
        // Restore original geometry
        if (child.geometry !== originalGeometry) {
          child.geometry.dispose();
          child.geometry = originalGeometry.clone();
        }
      } else {
        // Apply simplified geometry
        const simplified = generateSimplifiedGeometry(originalGeometry, ratio);
        child.geometry.dispose();
        child.geometry = simplified;
      }

      // Update material to visually indicate LOD level (optional visual feedback)
      if (child.material && 'color' in child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        // Slightly tint the material based on LOD level for visual feedback
        if (level === 0) {
          mat.emissive?.setHex(0x000000);
        } else if (level === 1) {
          mat.emissive?.setHex(0x001100); // Slight green tint
        } else {
          mat.emissive?.setHex(0x110000); // Slight red tint
        }
      }
    }
  });
}

/**
 * Create a bounding box representation of a robot
 */
function createBoundingBoxRobot(source: THREE.Object3D): THREE.Object3D {
  const group = new THREE.Group();
  group.name = `${source.name}_bbox_lod`;

  // Compute overall bounding box
  const box = new THREE.Box3();
  source.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox) {
        const worldBox = child.geometry.boundingBox.clone();
        worldBox.applyMatrix4(child.matrixWorld);
        box.union(worldBox);
      }
    }
  });

  if (box.isEmpty()) {
    return group;
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const boxMaterial = new THREE.MeshBasicMaterial({
    color: 0x888888,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });

  const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
  boxMesh.position.copy(center);
  group.add(boxMesh);

  return group;
}

// ============================================================================
// LOD Manager Singleton for Robots
// ============================================================================

let robotLODManager: LODManager | null = null;

function getRobotLODManager(): LODManager {
  if (!robotLODManager) {
    robotLODManager = new LODManager({
      defaultDistances: DEFAULT_LOD_CONFIG.distances,
      fadeTransition: true,
      fadeDuration: 0.3,
      updateFrequency: 0,
    });
  }
  return robotLODManager;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * useRobotLOD - Hook for adding LOD support to Robot components
 *
 * @example
 * ```tsx
 * function RobotWithLOD({ urdfPath, ...props }: RobotProps) {
 *   const groupRef = useRef<THREE.Group>(null);
 *
 *   const { state, isAvailable } = useRobotLOD({
 *     config: { enabled: true, distances: [5, 15, 30] },
 *     robotObject: groupRef.current,
 *     robotId: 'robot-1',
 *   });
 *
 *   return (
 *     <group ref={groupRef}>
 *       <Robot urdfPath={urdfPath} {...props} />
 *       {isAvailable && <LODIndicator level={state.currentLevel} />}
 *     </group>
 *   );
 * }
 * ```
 */
export function useRobotLOD({
  config: configProp,
  robotObject,
  robotId,
  onLevelChange,
}: UseRobotLODOptions): UseRobotLODResult {
  const { camera } = useThree();
  const lodManagerRef = useRef<LODManager>(getRobotLODManager());
  const lodCreatedRef = useRef(false);
  const forcedLevelRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const onLevelChangeRef = useRef(onLevelChange);

  // Merge config with defaults
  const config = useMemo<RobotLODConfig>(
    () => ({
      ...DEFAULT_LOD_CONFIG,
      ...configProp,
    }),
    [configProp]
  );

  // Current state
  const stateRef = useRef<RobotLODState>({
    currentLevel: 0,
    distance: 0,
    isActive: false,
  });

  // Update callback ref
  useEffect(() => {
    onLevelChangeRef.current = onLevelChange;
  }, [onLevelChange]);

  // Create LOD levels when robot is loaded
  useEffect(() => {
    if (!config.enabled || !robotObject || lodCreatedRef.current) {
      return;
    }

    const manager = lodManagerRef.current;

    // Check if already exists
    if (manager.getLOD(robotId)) {
      lodCreatedRef.current = true;
      stateRef.current.isActive = true;
      return;
    }

    // Create LOD levels
    try {
      // High detail (original)
      const highDetail = robotObject.clone(true);

      // Medium detail (simplified)
      const mediumDetail = createSimplifiedRobot(
        robotObject,
        config.simplificationRatios[0]
      );

      // Low detail (more simplified or bounding box)
      const lowDetail = config.useBoundingBox
        ? createBoundingBoxRobot(robotObject)
        : createSimplifiedRobot(robotObject, config.simplificationRatios[1]);

      // Create LOD object
      manager.createLOD(robotId, [
        { distance: config.distances[0], object: highDetail },
        { distance: config.distances[1], object: mediumDetail },
        { distance: config.distances[2], object: lowDetail },
      ]);

      lodCreatedRef.current = true;
      stateRef.current.isActive = true;
    } catch (error) {
      console.warn(`Failed to create LOD for robot ${robotId}:`, error);
    }

    return () => {
      if (lodCreatedRef.current) {
        manager.removeLOD(robotId);
        lodCreatedRef.current = false;
        stateRef.current.isActive = false;
      }
    };
  }, [config, robotObject, robotId]);

  // Update LOD based on camera distance
  useFrame(() => {
    if (!config.enabled || !robotObject) {
      return;
    }

    // Throttle updates based on frequency
    if (config.updateFrequency > 0) {
      frameCountRef.current++;
      if (frameCountRef.current % config.updateFrequency !== 0) {
        return;
      }
    }

    // Calculate distance to camera
    const robotWorldPos = new THREE.Vector3();
    robotObject.getWorldPosition(robotWorldPos);
    const distance = camera.position.distanceTo(robotWorldPos);

    // Determine LOD level
    let newLevel = 0;
    if (forcedLevelRef.current !== null) {
      newLevel = forcedLevelRef.current;
    } else {
      if (distance >= config.distances[2]) {
        newLevel = 2;
      } else if (distance >= config.distances[1]) {
        newLevel = 1;
      } else {
        newLevel = 0;
      }
    }

    // Check if level changed
    if (newLevel !== stateRef.current.currentLevel) {
      stateRef.current.currentLevel = newLevel;

      // Apply LOD simplification directly to robot meshes
      applyLODToRobot(robotObject, newLevel, config.simplificationRatios);

      // Notify callback
      if (onLevelChangeRef.current) {
        onLevelChangeRef.current(newLevel, distance);
      }
    }

    stateRef.current.distance = distance;

    // Update the LOD manager if LOD was created
    if (lodCreatedRef.current) {
      const manager = lodManagerRef.current;
      manager.update(camera);
    }
  });

  // Force a specific LOD level
  const forceLevel = useCallback((level: number) => {
    forcedLevelRef.current = Math.max(0, Math.min(2, level));
    stateRef.current.currentLevel = forcedLevelRef.current;
  }, []);

  // Reset to automatic LOD
  const resetToAuto = useCallback(() => {
    forcedLevelRef.current = null;
  }, []);

  return {
    state: stateRef.current,
    forceLevel,
    resetToAuto,
    isAvailable: lodCreatedRef.current && config.enabled,
  };
}

