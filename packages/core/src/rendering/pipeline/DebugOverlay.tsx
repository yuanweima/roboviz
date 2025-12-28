/**
 * RoboViz Debug Overlay
 *
 * Provides debug visualization features including:
 * - Wireframe overlay
 * - Bounding boxes
 * - Normal vectors
 * - Light helpers
 * - Shadow camera frustums
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js';
import type { RenderConfig } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface DebugOverlayProps {
  /** Debug configuration */
  config: RenderConfig['debug'];
  /** Whether debug overlay is enabled */
  enabled?: boolean;
}

interface DebugHelpers {
  boxHelpers: THREE.Box3Helper[];
  normalHelpers: VertexNormalsHelper[];
  lightHelpers: THREE.Object3D[];
  shadowHelpers: THREE.CameraHelper[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function createBoundingBoxHelper(object: THREE.Object3D): THREE.Box3Helper | null {
  const box = new THREE.Box3();

  // Only compute for meshes with geometry
  if (object instanceof THREE.Mesh && object.geometry) {
    object.geometry.computeBoundingBox();
    if (object.geometry.boundingBox) {
      box.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
      return new THREE.Box3Helper(box, new THREE.Color(0x00ff00));
    }
  }

  return null;
}

function createNormalHelper(mesh: THREE.Mesh, size: number = 0.1): VertexNormalsHelper | null {
  if (!mesh.geometry) return null;

  try {
    return new VertexNormalsHelper(mesh, size, 0xff0000);
  } catch {
    return null;
  }
}

function createLightHelper(light: THREE.Light): THREE.Object3D | null {
  if (light instanceof THREE.DirectionalLight) {
    return new THREE.DirectionalLightHelper(light, 1);
  }
  if (light instanceof THREE.PointLight) {
    return new THREE.PointLightHelper(light, 0.5);
  }
  if (light instanceof THREE.SpotLight) {
    return new THREE.SpotLightHelper(light);
  }
  if (light instanceof THREE.HemisphereLight) {
    return new THREE.HemisphereLightHelper(light, 0.5);
  }
  return null;
}

function createShadowCameraHelper(light: THREE.Light): THREE.CameraHelper | null {
  if (
    (light instanceof THREE.DirectionalLight ||
      light instanceof THREE.SpotLight ||
      light instanceof THREE.PointLight) &&
    light.shadow?.camera
  ) {
    return new THREE.CameraHelper(light.shadow.camera);
  }
  return null;
}

// ============================================================================
// Debug Context
// ============================================================================

interface DebugContextValue {
  config: RenderConfig['debug'];
  isDebugEnabled: boolean;
}

export const DebugContext = React.createContext<DebugContextValue | null>(null);

export function useDebug(): DebugContextValue {
  const context = React.useContext(DebugContext);
  if (!context) {
    return {
      config: {
        wireframe: false,
        boundingBoxes: false,
        normals: false,
        lightHelpers: false,
        shadowCameras: false,
      },
      isDebugEnabled: false,
    };
  }
  return context;
}

// ============================================================================
// Wireframe Manager Component
// ============================================================================

/**
 * WireframeManager - Manages wireframe overlay visualization
 *
 * Creates a separate wireframe overlay instead of modifying original materials.
 * This approach works with all material types including custom shaders.
 */
function WireframeManager({ enabled }: { enabled: boolean }): React.JSX.Element | null {
  const { scene } = useThree();
  const wireframeGroupRef = useRef<THREE.Group | null>(null);
  const wireframeMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Remove wireframe overlay when disabled
      if (wireframeGroupRef.current) {
        scene.remove(wireframeGroupRef.current);
        wireframeGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
          }
        });
        wireframeGroupRef.current = null;
      }
      return;
    }

    // Create wireframe group
    const wireframeGroup = new THREE.Group();
    wireframeGroup.name = 'debug-wireframe-overlay';

    // Create shared wireframe material
    if (!wireframeMaterialRef.current) {
      wireframeMaterialRef.current = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        wireframe: true,
        transparent: true,
        opacity: 0.6,
        depthTest: true,
        depthWrite: false,
      });
    }

    // Clone meshes with wireframe material
    scene.traverse((object) => {
      // Skip debug groups and non-meshes
      if (
        object instanceof THREE.Mesh &&
        object.visible &&
        object.geometry &&
        !object.name.startsWith('debug-') &&
        !object.parent?.name.startsWith('debug-')
      ) {
        try {
          // Create wireframe mesh at same world position
          const wireframeMesh = new THREE.Mesh(
            object.geometry.clone(),
            wireframeMaterialRef.current!
          );

          // Copy world transform
          object.updateWorldMatrix(true, false);
          wireframeMesh.matrix.copy(object.matrixWorld);
          wireframeMesh.matrixAutoUpdate = false;
          wireframeMesh.name = `debug-wireframe-${object.uuid}`;

          wireframeGroup.add(wireframeMesh);
        } catch {
          // Skip if geometry can't be cloned
        }
      }
    });

    scene.add(wireframeGroup);
    wireframeGroupRef.current = wireframeGroup;

    return () => {
      if (wireframeGroupRef.current) {
        scene.remove(wireframeGroupRef.current);
        wireframeGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            child.geometry.dispose();
          }
        });
        wireframeGroupRef.current = null;
      }
    };
  }, [enabled, scene]);

  // Update wireframe transforms each frame to follow animated meshes
  useFrame(() => {
    if (!enabled || !wireframeGroupRef.current) return;

    const wireframeMap = new Map<string, THREE.Mesh>();
    wireframeGroupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const originalUuid = child.name.replace('debug-wireframe-', '');
        wireframeMap.set(originalUuid, child);
      }
    });

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        const wireframeMesh = wireframeMap.get(object.uuid);
        if (wireframeMesh) {
          object.updateWorldMatrix(true, false);
          wireframeMesh.matrix.copy(object.matrixWorld);
        }
      }
    });
  });

  return null;
}

// ============================================================================
// Bounding Box Visualizer Component
// ============================================================================

function BoundingBoxVisualizer({ enabled }: { enabled: boolean }): React.JSX.Element | null {
  const { scene } = useThree();
  const helpersRef = useRef<THREE.Box3Helper[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!enabled || !groupRef.current) {
      // Clear existing helpers
      helpersRef.current.forEach((helper) => {
        helper.parent?.remove(helper);
        helper.dispose();
      });
      helpersRef.current = [];
      return;
    }

    // Create bounding box helpers for all meshes
    const helpers: THREE.Box3Helper[] = [];

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        const helper = createBoundingBoxHelper(object);
        if (helper) {
          helpers.push(helper);
          groupRef.current?.add(helper);
        }
      }
    });

    helpersRef.current = helpers;

    return () => {
      helpers.forEach((helper) => {
        helper.parent?.remove(helper);
        helper.dispose();
      });
    };
  }, [enabled, scene]);

  // Update bounding boxes each frame
  useFrame(() => {
    if (!enabled) return;

    helpersRef.current.forEach((helper) => {
      helper.updateMatrixWorld(true);
    });
  });

  if (!enabled) return null;

  return <group ref={groupRef} name="debug-bounding-boxes" />;
}

// ============================================================================
// Normal Visualizer Component
// ============================================================================

function NormalVisualizer({ enabled, size = 0.1 }: { enabled: boolean; size?: number }): React.JSX.Element | null {
  const { scene } = useThree();
  const helpersRef = useRef<VertexNormalsHelper[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!enabled || !groupRef.current) {
      helpersRef.current.forEach((helper) => {
        helper.parent?.remove(helper);
        helper.dispose();
      });
      helpersRef.current = [];
      return;
    }

    const helpers: VertexNormalsHelper[] = [];

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible && object.geometry) {
        const helper = createNormalHelper(object, size);
        if (helper) {
          helpers.push(helper);
          groupRef.current?.add(helper);
        }
      }
    });

    helpersRef.current = helpers;

    return () => {
      helpers.forEach((helper) => {
        helper.parent?.remove(helper);
        helper.dispose();
      });
    };
  }, [enabled, scene, size]);

  // Update normals each frame
  useFrame(() => {
    if (!enabled) return;

    helpersRef.current.forEach((helper) => {
      helper.update();
    });
  });

  if (!enabled) return null;

  return <group ref={groupRef} name="debug-normals" />;
}

// ============================================================================
// Light Helper Visualizer Component
// ============================================================================

function LightHelperVisualizer({ enabled }: { enabled: boolean }): React.JSX.Element | null {
  const { scene } = useThree();
  const helpersRef = useRef<THREE.Object3D[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!enabled || !groupRef.current) {
      helpersRef.current.forEach((helper) => {
        helper.parent?.remove(helper);
        if ('dispose' in helper) {
          (helper as { dispose: () => void }).dispose();
        }
      });
      helpersRef.current = [];
      return;
    }

    const helpers: THREE.Object3D[] = [];

    scene.traverse((object) => {
      if (object instanceof THREE.Light) {
        const helper = createLightHelper(object);
        if (helper) {
          helpers.push(helper);
          groupRef.current?.add(helper);
        }
      }
    });

    helpersRef.current = helpers;

    return () => {
      helpers.forEach((helper) => {
        helper.parent?.remove(helper);
        if ('dispose' in helper) {
          (helper as { dispose: () => void }).dispose();
        }
      });
    };
  }, [enabled, scene]);

  // Update light helpers each frame
  useFrame(() => {
    if (!enabled) return;

    helpersRef.current.forEach((helper) => {
      if ('update' in helper) {
        (helper as { update: () => void }).update();
      }
    });
  });

  if (!enabled) return null;

  return <group ref={groupRef} name="debug-light-helpers" />;
}

// ============================================================================
// Shadow Camera Visualizer Component
// ============================================================================

function ShadowCameraVisualizer({ enabled }: { enabled: boolean }): React.JSX.Element | null {
  const { scene } = useThree();
  const helpersRef = useRef<THREE.CameraHelper[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!enabled || !groupRef.current) {
      helpersRef.current.forEach((helper) => {
        helper.parent?.remove(helper);
        helper.dispose();
      });
      helpersRef.current = [];
      return;
    }

    const helpers: THREE.CameraHelper[] = [];

    scene.traverse((object) => {
      if (object instanceof THREE.Light) {
        const helper = createShadowCameraHelper(object);
        if (helper) {
          helpers.push(helper);
          groupRef.current?.add(helper);
        }
      }
    });

    helpersRef.current = helpers;

    return () => {
      helpers.forEach((helper) => {
        helper.parent?.remove(helper);
        helper.dispose();
      });
    };
  }, [enabled, scene]);

  // Update shadow camera helpers each frame
  useFrame(() => {
    if (!enabled) return;

    helpersRef.current.forEach((helper) => {
      helper.update();
    });
  });

  if (!enabled) return null;

  return <group ref={groupRef} name="debug-shadow-cameras" />;
}

// ============================================================================
// Main Debug Overlay Component
// ============================================================================

/**
 * DebugOverlay - Provides debug visualization for the scene
 *
 * @example
 * ```tsx
 * <RoboVizCore>
 *   <RenderPipeline config={{ debug: { wireframe: true, boundingBoxes: true } }}>
 *     <DebugOverlay config={config.debug} enabled />
 *     <Robot urdfPath="/robot.urdf" />
 *   </RenderPipeline>
 * </RoboVizCore>
 * ```
 */
export function DebugOverlay({
  config,
  enabled = true,
}: DebugOverlayProps): React.JSX.Element | null {
  const isAnyDebugEnabled = useMemo(() => {
    return (
      config.wireframe ||
      config.boundingBoxes ||
      config.normals ||
      config.lightHelpers ||
      config.shadowCameras
    );
  }, [config]);

  const contextValue = useMemo<DebugContextValue>(
    () => ({
      config,
      isDebugEnabled: enabled && isAnyDebugEnabled,
    }),
    [config, enabled, isAnyDebugEnabled]
  );

  if (!enabled) return null;

  return (
    <DebugContext.Provider value={contextValue}>
      <WireframeManager enabled={config.wireframe} />
      <BoundingBoxVisualizer enabled={config.boundingBoxes} />
      <NormalVisualizer enabled={config.normals} />
      <LightHelperVisualizer enabled={config.lightHelpers} />
      <ShadowCameraVisualizer enabled={config.shadowCameras} />
    </DebugContext.Provider>
  );
}

export default DebugOverlay;
