/**
 * InstancedRobotArms Component
 *
 * Renders thousands of robot arms efficiently using GPU Instancing.
 * Supports external control via joint angles buffer for RL integration.
 *
 * Architecture for RL:
 * - jointAnglesBuffer: Float32Array of shape [count * jointCount]
 *   Each robot's joints are stored contiguously: [r0_j0, r0_j1, ..., r1_j0, r1_j1, ...]
 * - positionsBuffer: Float32Array of shape [count * 3] for custom positions (optional)
 * - rewardsBuffer: Float32Array of shape [count] for reward visualization (optional)
 */

import * as React from 'react';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import URDFLoader, { URDFRobot, URDFJoint, URDFLink } from 'urdf-loader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useInstancedRobotWorker, useSharedBufferWorker } from '../workers';

// ============================================================================
// Types
// ============================================================================

export interface RobotLoadedInfo {
  jointCount: number;
  linkCount: number;
  jointNames: string[];
  jointLimits: Array<{ min: number; max: number }>;
}

/**
 * Mesh quality level for instanced robot arms
 * - 'visual': High-fidelity meshes from visual geometry (~74K triangles/robot)
 * - 'collision': Simplified collision meshes (~4K triangles/robot)
 * - 'convex': Single convex hull per link (~3K triangles/robot)
 */
export type MeshQuality = 'visual' | 'collision' | 'convex';

export interface InstancedRobotArmsProps {
  /** Path to URDF file */
  urdfPath: string;
  /** Number of robot instances to render */
  count: number;

  // Layout
  /** Grid spacing when using auto-layout (default: 1.5) */
  gridSpacing?: number;
  /** Custom positions buffer: Float32Array[count * 3] - overrides grid layout */
  positionsBuffer?: Float32Array;

  // Appearance
  /** Base color for robots (default: #cccccc) */
  color?: string;
  /** Metalness (default: 0.4) */
  metalness?: number;
  /** Roughness (default: 0.6) */
  roughness?: number;
  /** Enable per-instance color variation */
  colorVariation?: boolean;
  /**
   * Mesh quality level (default: 'visual')
   * - 'visual': High-fidelity meshes (~74K triangles/robot)
   * - 'collision': Simplified meshes (~4K triangles/robot, ~17x faster)
   * - 'convex': Single convex hull per link (~3K triangles/robot, ~25x faster)
   */
  meshQuality?: MeshQuality;

  // Control modes
  /** Built-in animation (disabled when jointAnglesBuffer is provided) */
  animate?: boolean;
  /**
   * External joint angles buffer for RL control: Float32Array[count * jointCount]
   * Layout: [robot0_joint0, robot0_joint1, ..., robot1_joint0, robot1_joint1, ...]
   * When provided, overrides animate mode
   */
  jointAnglesBuffer?: Float32Array;

  // RL Visualization
  /**
   * Rewards buffer for visualization: Float32Array[count]
   * Values are normalized to [0, 1] and mapped to color (red=low, green=high)
   */
  rewardsBuffer?: Float32Array;
  /** Min reward value for normalization (default: 0) */
  rewardMin?: number;
  /** Max reward value for normalization (default: 1) */
  rewardMax?: number;

  // Worker Mode (for trajx-wasm batch FK)
  /**
   * Use Web Worker with trajx-wasm for FK computation
   * When enabled, FK is computed in a separate thread using WASM for better performance.
   * Uses DH parameters from trajx-wasm database for accurate kinematics.
   */
  useWorker?: boolean;
  /**
   * Use SharedArrayBuffer for zero-copy Worker communication
   * Requires cross-origin isolation headers. When enabled, the Worker also
   * computes joint angles internally (simulated RL policy), further reducing main thread work.
   * This is the highest performance mode.
   */
  useSharedBuffer?: boolean;
  /**
   * Robot name for trajx-wasm DH database lookup (e.g., 'ur5', 'ur5e', 'kuka_iiwa7')
   * Only used when useWorker is true. Defaults to 'ur5'.
   */
  robotName?: string;

  // Callbacks
  /** Callback when loading completes with robot info */
  onLoaded?: (info: RobotLoadedInfo) => void;
  /** Callback each frame with performance stats */
  onFrame?: (stats: { updateTimeMs: number; fkTimeMs?: number }) => void;
}

interface MeshData {
  geometry: THREE.BufferGeometry;
  linkName: string;
  meshIndex: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

// Reusable color object for reward visualization
const _rewardColor = new THREE.Color();

function getRewardColor(reward: number, min: number, max: number): THREE.Color {
  const normalized = Math.max(0, Math.min(1, (reward - min) / (max - min)));
  // Red (low) -> Yellow (mid) -> Green (high)
  if (normalized < 0.5) {
    _rewardColor.setHSL(0, 0.8, 0.4 + normalized * 0.2); // Red to Orange
  } else {
    _rewardColor.setHSL((normalized - 0.5) * 0.3, 0.8, 0.5); // Orange to Green
  }
  return _rewardColor;
}

// ============================================================================
// Main Component
// ============================================================================

export function InstancedRobotArms({
  urdfPath,
  count,
  gridSpacing = 1.5,
  positionsBuffer,
  color = '#cccccc',
  metalness = 0.4,
  roughness = 0.6,
  colorVariation = true,
  meshQuality = 'visual',
  animate = true,
  jointAnglesBuffer,
  rewardsBuffer,
  rewardMin = 0,
  rewardMax = 1,
  useWorker = false,
  useSharedBuffer = false,
  robotName = 'ur5',
  onLoaded,
  onFrame,
}: InstancedRobotArmsProps): React.JSX.Element | null {
  const groupRef = useRef<THREE.Group>(null);
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const [meshDataList, setMeshDataList] = useState<MeshData[]>([]);
  const [jointNames, setJointNames] = useState<string[]>([]);
  const [jointLimits, setJointLimits] = useState<Array<{ min: number; max: number }>>([]);
  const [isReady, setIsReady] = useState(false);
  const instancedMeshesRef = useRef<THREE.InstancedMesh[]>([]);
  const robotMeshesRef = useRef<THREE.Mesh[]>([]);

  // Track if we're using external control
  const useExternalControl = jointAnglesBuffer !== undefined;

  // Worker state for FK computation (when useWorker is true)
  const workerTransformsRef = useRef<Float32Array | null>(null);
  const [workerFkTimeMs, setWorkerFkTimeMs] = useState<number>(0);
  const frameCountRef = useRef(0);

  // Pre-computed position+rotation matrices for each robot (避免每帧重算)
  const positionMatricesRef = useRef<Float32Array | null>(null);

  // Setup Worker hook with trajx-wasm (only active when useWorker is true and not using SharedBuffer)
  const [workerState, workerActions] = useInstancedRobotWorker({
    robotCount: useWorker && !useSharedBuffer ? count : 0,
    robotName,
    useTrajxWorker: useWorker && !useSharedBuffer,
    onFKComplete: (transforms, computeTimeMs) => {
      workerTransformsRef.current = transforms;
      setWorkerFkTimeMs(computeTimeMs);
    },
    onError: (error) => {
      console.error('[InstancedRobotArms] Worker error:', error);
    },
  });

  // SharedBuffer Worker (highest performance mode)
  const [sharedState, sharedActions] = useSharedBufferWorker({
    robotCount: useSharedBuffer ? count : 0,
    meshCount: useSharedBuffer ? meshDataList.length || 7 : 0,
    robotName,
    workerUrl: '/workers/fk-worker-v2.js',
    onError: (error) => {
      console.error('[InstancedRobotArms] SharedBuffer Worker error:', error);
    },
  });

  // Temp objects for matrix computation (reused to avoid GC)
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempMatrix2 = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const baseRotation = useMemo(() => {
    const m = new THREE.Matrix4();
    m.makeRotationX(-Math.PI / 2); // Z-up to Y-up
    return m;
  }, []);

  // Grid dimensions for auto-layout
  const gridSize = useMemo(() => Math.ceil(Math.sqrt(count)), [count]);

  // Get position for robot instance
  const getPosition = useCallback(
    (robotIdx: number): [number, number, number] => {
      if (positionsBuffer && positionsBuffer.length >= (robotIdx + 1) * 3) {
        return [
          positionsBuffer[robotIdx * 3],
          positionsBuffer[robotIdx * 3 + 1],
          positionsBuffer[robotIdx * 3 + 2],
        ];
      }
      // Default grid layout
      const gridX = robotIdx % gridSize;
      const gridZ = Math.floor(robotIdx / gridSize);
      return [
        (gridX - gridSize / 2 + 0.5) * gridSpacing,
        0,
        (gridZ - gridSize / 2 + 0.5) * gridSpacing,
      ];
    },
    [positionsBuffer, gridSize, gridSpacing]
  );

  // Load URDF
  useEffect(() => {
    let cancelled = false;

    // Reset state when starting a new load (e.g., when meshQuality changes)
    setRobot(null);
    setIsReady(false);
    setMeshDataList([]);

    const loader = new URDFLoader();
    const loadingManager = new THREE.LoadingManager();

    loadingManager.onLoad = () => {
      if (cancelled) return;
      setIsReady(true);
    };

    loader.loadMeshCb = (path, manager, onComplete) => {
      const stlLoader = new STLLoader(loadingManager);

      // Transform path based on meshQuality
      let actualPath = path;
      if (meshQuality !== 'visual') {
        // Replace 'meshes/' with 'collision/' and optionally add '_cvx' suffix
        // e.g., 'meshes/link1.STL' -> 'collision/link1.STL' or 'collision/link1_cvx.STL'
        if (path.includes('/meshes/')) {
          if (meshQuality === 'convex') {
            // Use convex hull: link1.STL -> link1_cvx.STL
            actualPath = path
              .replace('/meshes/', '/collision/')
              .replace(/\.STL$/i, '_cvx.STL');
          } else {
            // Use collision mesh: link1.STL -> link1.STL (in collision folder)
            actualPath = path.replace('/meshes/', '/collision/');
          }
        }
      }

      stlLoader.load(
        actualPath,
        (geometry) => {
          geometry.computeBoundingBox();
          geometry.computeVertexNormals();

          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            metalness,
            roughness,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          onComplete(mesh);
        },
        undefined,
        (err) => {
          // If collision/convex mesh not found, fall back to visual mesh
          if (actualPath !== path) {
            console.warn(`[InstancedRobotArms] ${meshQuality} mesh not found, falling back to visual:`, actualPath);
            stlLoader.load(
              path,
              (geometry) => {
                geometry.computeBoundingBox();
                geometry.computeVertexNormals();
                const material = new THREE.MeshStandardMaterial({
                  color: new THREE.Color(color),
                  metalness,
                  roughness,
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                onComplete(mesh);
              },
              undefined,
              () => {
                console.warn('[InstancedRobotArms] Failed to load mesh:', path);
                onComplete(new THREE.Group());
              }
            );
          } else {
            console.warn('[InstancedRobotArms] Failed to load mesh:', path, err);
            onComplete(new THREE.Group());
          }
        }
      );
    };

    loader.load(
      urdfPath,
      (loadedRobot) => {
        if (cancelled) return;
        setRobot(loadedRobot);

        // Collect joint names and limits
        const movableJoints: string[] = [];
        const limits: Array<{ min: number; max: number }> = [];

        loadedRobot.traverse((child) => {
          const joint = child as unknown as URDFJoint;
          if (joint.isURDFJoint) {
            if (
              joint.jointType === 'revolute' ||
              joint.jointType === 'prismatic' ||
              joint.jointType === 'continuous'
            ) {
              movableJoints.push(joint.name);
              limits.push({
                min: joint.limit?.lower ?? -Math.PI,
                max: joint.limit?.upper ?? Math.PI,
              });
            }
          }
        });

        setJointNames(movableJoints);
        setJointLimits(limits);
      },
      undefined,
      (err) => {
        console.error('[InstancedRobotArms] Failed to load URDF:', err);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [urdfPath, color, metalness, roughness, meshQuality]);

  // Extract meshes after robot and all meshes are loaded
  useEffect(() => {
    if (!robot || !isReady) return;

    robot.updateMatrixWorld(true);

    const meshes: THREE.Mesh[] = [];
    const dataList: MeshData[] = [];
    const linkNames = new Set<string>();

    robot.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.geometry) return;

        let linkName = 'base_link';
        let parent: THREE.Object3D | null = mesh.parent;
        while (parent) {
          const link = parent as unknown as URDFLink;
          if (link.isURDFLink) {
            linkName = link.name;
            break;
          }
          parent = parent.parent;
        }
        linkNames.add(linkName);

        const meshIndex = meshes.length;
        meshes.push(mesh);

        dataList.push({
          geometry: mesh.geometry.clone(),
          linkName,
          meshIndex,
        });
      }
    });

    if (dataList.length === 0) {
      console.error('[InstancedRobotArms] No meshes found in URDF');
      return;
    }

    robotMeshesRef.current = meshes;
    setMeshDataList(dataList);

    onLoaded?.({
      jointCount: jointNames.length,
      linkCount: linkNames.size,
      jointNames: [...jointNames],
      jointLimits: [...jointLimits],
    });
  }, [robot, isReady, jointNames, jointLimits, onLoaded]);

  // Create instanced meshes
  useEffect(() => {
    if (meshDataList.length === 0 || !groupRef.current) return;

    const group = groupRef.current;

    // Clear previous
    instancedMeshesRef.current.forEach((mesh) => {
      group.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    });
    instancedMeshesRef.current = [];

    // Create instanced mesh for each geometry
    meshDataList.forEach((data, idx) => {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness,
        roughness,
      });

      const instancedMesh = new THREE.InstancedMesh(data.geometry, material, count);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      instancedMesh.frustumCulled = false;
      instancedMesh.name = `instanced_${data.linkName}_${idx}`;
      instancedMesh.userData.meshIndex = data.meshIndex;

      // Initialize colors
      if (colorVariation && !rewardsBuffer) {
        for (let i = 0; i < count; i++) {
          const hue = (i / count) * 0.25 + 0.55;
          const sat = 0.35 + Math.sin(i * 0.1) * 0.15;
          const light = 0.45 + Math.cos(i * 0.05) * 0.1;
          tempColor.setHSL(hue, sat, light);
          instancedMesh.setColorAt(i, tempColor);
        }
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
      }

      instancedMeshesRef.current.push(instancedMesh);
      group.add(instancedMesh);
    });
  }, [meshDataList, count, color, metalness, roughness, colorVariation, rewardsBuffer, tempColor]);

  // Pre-compute position+rotation matrices for Worker mode
  // 这个在初始化时计算一次，如果 positionsBuffer 变化需要手动刷新
  useEffect(() => {
    if ((!useWorker && !useSharedBuffer) || count === 0) return;

    // 每个机器人一个 4x4 矩阵 = 16 floats
    const matrices = new Float32Array(count * 16);
    const mat = new THREE.Matrix4();

    for (let i = 0; i < count; i++) {
      const [posX, posY, posZ] = getPosition(i);
      mat.identity();
      mat.setPosition(posX, posY, posZ);
      mat.multiply(baseRotation);
      mat.toArray(matrices, i * 16);
    }

    positionMatricesRef.current = matrices;
  }, [useWorker, useSharedBuffer, count, positionsBuffer, getPosition, baseRotation]);

  // Copy position matrices to SharedBuffer worker when ready and start worker
  useEffect(() => {
    if (!useSharedBuffer || !sharedState.ready || !positionMatricesRef.current) return;

    // Copy pre-computed position matrices to shared buffer
    if (sharedState.positionMatrices) {
      sharedState.positionMatrices.set(positionMatricesRef.current);
    }

    // Start the worker after copying matrices
    const timeoutId = setTimeout(() => {
      sharedActions.start();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      sharedActions.stop();
    };
  }, [useSharedBuffer, sharedState.ready, sharedState.positionMatrices, sharedActions]);

  // Internal joint angles buffer for Worker animation mode
  const internalJointAnglesRef = useRef<Float32Array | null>(null);

  // Send joint angles to worker when ready (Worker mode - not SharedBuffer)
  useEffect(() => {
    if (!useWorker || useSharedBuffer || !workerState.ready) return;

    const workerJointCount = workerState.jointCount || 6;

    // Create internal buffer if not using external control
    if (!jointAnglesBuffer) {
      internalJointAnglesRef.current = new Float32Array(count * workerJointCount);
    }

    // Set up periodic FK computation when using worker
    let animationFrameId: number | null = null;
    let isComputing = false;
    let startTime = performance.now();

    async function computeFrame() {
      if (isComputing) {
        animationFrameId = requestAnimationFrame(computeFrame);
        return;
      }

      // Update joint angles in worker
      if (jointAnglesBuffer) {
        // External control mode
        workerActions.setJointAngles(jointAnglesBuffer);
      } else if (animate && internalJointAnglesRef.current) {
        // Internal animation mode - generate joint angles with varied motion
        const time = (performance.now() - startTime) / 1000;
        const buffer = internalJointAnglesRef.current;

        for (let robotIdx = 0; robotIdx < count; robotIdx++) {
          // Generate pseudo-random phase based on robot index for varied animation
          const seed = robotIdx * 1.618033988749895; // Golden ratio for better distribution
          const phaseOffset = (seed % 1) * Math.PI * 2; // Random phase 0 to 2*PI
          const speedVariation = 0.7 + (((robotIdx * 7) % 13) / 13) * 0.6; // Speed 0.7x to 1.3x
          const baseOffset = robotIdx * workerJointCount;

          for (let jIdx = 0; jIdx < workerJointCount; jIdx++) {
            const jointPhase = jIdx * 0.8 + phaseOffset;
            const amplitude = 0.3 + (((robotIdx + jIdx) % 5) / 5) * 0.4; // Amplitude 0.3 to 0.7
            buffer[baseOffset + jIdx] = Math.sin(time * speedVariation + jointPhase) * amplitude;
          }
        }

        workerActions.setJointAngles(buffer);
      }

      isComputing = true;
      try {
        const transforms = await workerActions.computeFK();
        if (transforms) {
          workerTransformsRef.current = transforms;
        }
      } catch (error) {
        console.error('[InstancedRobotArms] FK computation error:', error);
      } finally {
        isComputing = false;
      }

      animationFrameId = requestAnimationFrame(computeFrame);
    }

    computeFrame();

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [useWorker, useSharedBuffer, workerState.ready, workerState.jointCount, jointAnglesBuffer, workerActions, animate, count]);

  // Update transforms each frame
  useFrame(({ clock }) => {
    if (!robot || instancedMeshesRef.current.length === 0 || robotMeshesRef.current.length === 0) {
      return;
    }

    const startTime = performance.now();
    const time = animate && !useExternalControl ? clock.getElapsedTime() : 0;
    const jointCount = jointNames.length;

    frameCountRef.current++;

    // Update rewards visualization if buffer provided (throttled to every 6 frames ~10Hz at 60fps)
    if (rewardsBuffer && rewardsBuffer.length >= count && frameCountRef.current % 6 === 0) {
      const meshCount = instancedMeshesRef.current.length;
      for (let i = 0; i < count; i++) {
        const rewardColor = getRewardColor(rewardsBuffer[i], rewardMin, rewardMax);
        for (let m = 0; m < meshCount; m++) {
          instancedMeshesRef.current[m].setColorAt(i, rewardColor);
        }
      }
      for (let m = 0; m < meshCount; m++) {
        const instancedMesh = instancedMeshesRef.current[m];
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
      }
    }

    // Determine which mode to use for this frame
    let matrixUpdated = false;

    // Mode 1: SharedBuffer mode (highest performance)
    if (useSharedBuffer && sharedState.ready && sharedState.running && sharedState.finalMatrices) {
      // Signal new frame to worker
      sharedActions.signalFrame(clock.getElapsedTime());

      // Check if worker has processed at least one frame
      const workerFrame = sharedActions.getWorkerFrame();
      if (workerFrame > 0) {
        const finalMatrices = sharedState.finalMatrices;
        const meshCount = instancedMeshesRef.current.length;

        // Direct copy from SharedArrayBuffer to InstancedMesh buffers
        for (let meshIdx = 0; meshIdx < meshCount; meshIdx++) {
          const instancedMesh = instancedMeshesRef.current[meshIdx];
          const matrixArray = instancedMesh.instanceMatrix.array as Float32Array;

          // Worker stores matrices as [mesh0_robot0, mesh0_robot1, ..., mesh1_robot0, ...]
          const srcOffset = meshIdx * count * 16;
          matrixArray.set(finalMatrices.subarray(srcOffset, srcOffset + count * 16));
        }
        matrixUpdated = true;
      }
    }

    // Mode 2: Worker FK mode (using trajx-wasm)
    if (!matrixUpdated && useWorker && !useSharedBuffer && workerState.ready && workerTransformsRef.current && positionMatricesRef.current) {
      const transforms = workerTransformsRef.current;
      const posMatrices = positionMatricesRef.current;
      const workerLinkCount = workerState.linkCount || meshDataList.length;
      const meshCount = instancedMeshesRef.current.length;

      // Direct buffer write for maximum performance
      for (let meshIdx = 0; meshIdx < meshCount; meshIdx++) {
        const instancedMesh = instancedMeshesRef.current[meshIdx];
        const matrixArray = instancedMesh.instanceMatrix.array as Float32Array;
        const linkIdx = Math.min(meshIdx, workerLinkCount - 1);

        for (let robotIdx = 0; robotIdx < count; robotIdx++) {
          // Read position matrix from pre-computed array
          tempMatrix2.fromArray(posMatrices, robotIdx * 16);

          // Read FK transform from worker result
          const fkOffset = (robotIdx * workerLinkCount + linkIdx) * 16;
          tempMatrix.fromArray(transforms, fkOffset);

          // Combine: position * baseRotation * FK
          tempMatrix.premultiply(tempMatrix2);

          // Write directly to instanceMatrix buffer (skip setMatrixAt overhead)
          const destOffset = robotIdx * 16;
          tempMatrix.toArray(matrixArray, destOffset);
        }
      }
      matrixUpdated = true;
    }

    // Mode 3: Main thread fallback (when worker modes not ready)
    if (!matrixUpdated) {
      // Main thread mode: compute FK using URDF robot
      for (let robotIdx = 0; robotIdx < count; robotIdx++) {
        const [posX, posY, posZ] = getPosition(robotIdx);

        // Set joint angles
        if (useExternalControl && jointAnglesBuffer) {
          // Use external buffer
          const bufferOffset = robotIdx * jointCount;
          jointNames.forEach((jointName, jIdx) => {
            const joint = robot.joints[jointName];
            if (joint && bufferOffset + jIdx < jointAnglesBuffer.length) {
              joint.setJointValue(jointAnglesBuffer[bufferOffset + jIdx]);
            }
          });
        } else if (animate) {
          // Built-in animation with varied motion per robot
          const seed = robotIdx * 1.618033988749895; // Golden ratio for better distribution
          const phaseOffset = (seed % 1) * Math.PI * 2; // Random phase 0 to 2*PI
          const speedVariation = 0.7 + (((robotIdx * 7) % 13) / 13) * 0.6; // Speed 0.7x to 1.3x
          jointNames.forEach((jointName, jIdx) => {
            const joint = robot.joints[jointName];
            if (joint) {
              const jointPhase = jIdx * 0.8 + phaseOffset;
              const amplitude = 0.3 + (((robotIdx + jIdx) % 5) / 5) * 0.4; // Amplitude 0.3 to 0.7
              const angle = Math.sin(time * speedVariation + jointPhase) * amplitude;
              joint.setJointValue(angle);
            }
          });
        }

        // Update robot matrices
        robot.updateMatrixWorld(true);

        // Update each instanced mesh
        instancedMeshesRef.current.forEach((instancedMesh) => {
          const meshIndex = instancedMesh.userData.meshIndex as number;
          const originalMesh = robotMeshesRef.current[meshIndex];

          if (originalMesh) {
            tempMatrix.identity();
            tempMatrix.setPosition(posX, posY, posZ);
            tempMatrix.multiply(baseRotation);
            tempMatrix.multiply(originalMesh.matrixWorld);

            instancedMesh.setMatrixAt(robotIdx, tempMatrix);
          }
        });
      }
    }

    // Mark matrices as needing update
    instancedMeshesRef.current.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });

    const updateTimeMs = performance.now() - startTime;
    onFrame?.({
      updateTimeMs,
      fkTimeMs: useWorker ? workerFkTimeMs : undefined,
    });
  });

  return <group ref={groupRef} />;
}

// ============================================================================
// Helper Hook for RL Integration
// ============================================================================

export interface UseRobotArmBuffersOptions {
  count: number;
  jointCount: number;
}

export interface RobotArmBuffers {
  jointAngles: Float32Array;
  positions: Float32Array;
  rewards: Float32Array;
  setJointAngle: (robotIdx: number, jointIdx: number, value: number) => void;
  setAllJoints: (robotIdx: number, values: number[]) => void;
  setPosition: (robotIdx: number, x: number, y: number, z: number) => void;
  setReward: (robotIdx: number, value: number) => void;
  resetAll: () => void;
}

/**
 * Helper hook to create and manage buffers for RL control
 */
export function useRobotArmBuffers({ count, jointCount }: UseRobotArmBuffersOptions): RobotArmBuffers {
  const jointAngles = useMemo(() => new Float32Array(count * jointCount), [count, jointCount]);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const rewards = useMemo(() => new Float32Array(count), [count]);

  const setJointAngle = useCallback(
    (robotIdx: number, jointIdx: number, value: number) => {
      const idx = robotIdx * jointCount + jointIdx;
      if (idx < jointAngles.length) {
        jointAngles[idx] = value;
      }
    },
    [jointAngles, jointCount]
  );

  const setAllJoints = useCallback(
    (robotIdx: number, values: number[]) => {
      const baseIdx = robotIdx * jointCount;
      values.forEach((v, i) => {
        if (baseIdx + i < jointAngles.length) {
          jointAngles[baseIdx + i] = v;
        }
      });
    },
    [jointAngles, jointCount]
  );

  const setPosition = useCallback(
    (robotIdx: number, x: number, y: number, z: number) => {
      const baseIdx = robotIdx * 3;
      if (baseIdx + 2 < positions.length) {
        positions[baseIdx] = x;
        positions[baseIdx + 1] = y;
        positions[baseIdx + 2] = z;
      }
    },
    [positions]
  );

  const setReward = useCallback(
    (robotIdx: number, value: number) => {
      if (robotIdx < rewards.length) {
        rewards[robotIdx] = value;
      }
    },
    [rewards]
  );

  const resetAll = useCallback(() => {
    jointAngles.fill(0);
    positions.fill(0);
    rewards.fill(0);
  }, [jointAngles, positions, rewards]);

  return {
    jointAngles,
    positions,
    rewards,
    setJointAngle,
    setAllJoints,
    setPosition,
    setReward,
    resetAll,
  };
}

export default InstancedRobotArms;
