/**
 * RoboViz Core Component
 *
 * Main entry point component that provides the Three.js canvas
 * and orchestrates all visualization components.
 */

import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneConfig, CameraState, OrbitControlsOptions, Vector3, Vector3Like } from './types';
import { toVector3 } from './types';
import { Scene } from './components/Scene';
import { useVizStore } from './store/vizStore';

export interface RoboVizCoreProps {
  /** Scene configuration (background, grid, lighting) */
  config?: Partial<SceneConfig>;
  /** Initial camera state */
  camera?: Partial<CameraState>;
  /** OrbitControls options */
  controls?: Partial<OrbitControlsOptions>;
  /** Enable performance stats */
  showStats?: boolean;
  /** Custom canvas style */
  style?: React.CSSProperties;
  /** Custom canvas className */
  className?: string;
  /** Callback when camera changes */
  onCameraChange?: (camera: CameraState) => void;
  /** Callback when an object is clicked */
  onObjectClick?: (objectId: string | null, position: Vector3) => void;
  /** Callback when an object is hovered */
  onObjectHover?: (objectId: string | null) => void;
  /** Children components (Robot, Trajectory, Obstacle, Waypoint, etc.) */
  children?: React.ReactNode;
}

// Convert Vector3Like to array for R3F
function vec3ToArray(v: Vector3Like): [number, number, number] {
  if (Array.isArray(v)) {
    return v;
  }
  return [v.x, v.y, v.z];
}

// Default camera state (Z-up coordinate system)
// Position is in Z-up: x=forward, y=left, z=up
const defaultCamera: CameraState = {
  position: { x: 3, y: -3, z: 3 },  // View from front-right-above in Z-up
  target: { x: 0, y: 0, z: 0 },
  fov: 50,
};

// Z-up vector for camera and controls
const Z_UP: [number, number, number] = [0, 0, 1];

// Default orbit controls options
const defaultControls: OrbitControlsOptions = {
  enabled: true,
  enableDamping: true,
  dampingFactor: 0.05,
  minDistance: 0.5,
  maxDistance: 50,
  autoRotate: false,
};

/**
 * Inner scene component that handles controls and callbacks
 */
function InnerScene({
  config,
  controls = {},
  onCameraChange,
  onObjectClick,
  onObjectHover,
  children,
}: {
  config?: Partial<SceneConfig>;
  controls?: Partial<OrbitControlsOptions>;
  onCameraChange?: (camera: CameraState) => void;
  onObjectClick?: (objectId: string | null, position: Vector3) => void;
  onObjectHover?: (objectId: string | null) => void;
  children?: React.ReactNode;
}): React.JSX.Element {
  const controlsRef = React.useRef<any>(null);
  const { setCamera, selectObject, hoverObject } = useVizStore();

  const shouldDisableOrbitRotate = false;

  const mergedControls = { ...defaultControls, ...controls };

  // Handle control changes
  const handleControlsChange = React.useCallback(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const position = controls.object.position;
    const target = controls.target;

    const cameraState: CameraState = {
      position: { x: position.x, y: position.y, z: position.z },
      target: { x: target.x, y: target.y, z: target.z },
      fov: controls.object.fov || 50,
    };

    setCamera(cameraState);
    onCameraChange?.(cameraState);
  }, [setCamera, onCameraChange]);

  // Handle click on background (deselect)
  const handlePointerMissed = React.useCallback(() => {
    selectObject(null);
    onObjectClick?.(null, { x: 0, y: 0, z: 0 });
  }, [selectObject, onObjectClick]);

  return (
    <>
      <Scene config={config}>
        {children}
      </Scene>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={mergedControls.enabled}
        enableDamping={mergedControls.enableDamping}
        dampingFactor={mergedControls.dampingFactor}
        minDistance={mergedControls.minDistance}
        maxDistance={mergedControls.maxDistance}
        autoRotate={mergedControls.autoRotate}
        enableRotate={!shouldDisableOrbitRotate}
        onChange={handleControlsChange}
        up={Z_UP}
      />
    </>
  );
}

/**
 * RoboVizCore - Main visualization container component
 *
 * This component creates a Three.js canvas and provides the infrastructure
 * for all visualization components. It should wrap Robot, Trajectory,
 * Obstacle, and Waypoint components.
 *
 * @example
 * ```tsx
 * import { RoboVizCore, Robot, Obstacle } from '@roboviz/core';
 *
 * function App() {
 *   return (
 *     <RoboVizCore
 *       config={{ background: '#1a1a2e' }}
 *       camera={{ position: { x: 2, y: 2, z: 2 } }}
 *     >
 *       <Robot urdfPath="/robot.urdf" jointAngles={[0, 0, 0, 0, 0, 0]} />
 *       <Obstacle data={boxObstacle} />
 *     </RoboVizCore>
 *   );
 * }
 * ```
 */
export function RoboVizCore({
  config,
  camera = {},
  controls,
  showStats = false,
  style,
  className,
  onCameraChange,
  onObjectClick,
  onObjectHover,
  children,
}: RoboVizCoreProps): React.JSX.Element {
  const mergedCamera = { ...defaultCamera, ...camera };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    ...style,
  };

  return (
    <div style={containerStyle} className={className}>
      <Canvas
        camera={{
          position: vec3ToArray(mergedCamera.position),
          fov: mergedCamera.fov,
          up: Z_UP,
        }}
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(config?.background || '#0a0a0a');

          // Handle WebGL context loss
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('[RoboVizCore] WebGL context lost. Waiting for restore...');
          });
          canvas.addEventListener('webglcontextrestored', () => {
            console.log('[RoboVizCore] WebGL context restored.');
          });

          // Cleanup on unmount - dispose all scene resources
          return () => {
            scene.traverse((object) => {
              if ((object as THREE.Mesh).isMesh) {
                const mesh = object as THREE.Mesh;
                if (mesh.geometry) {
                  mesh.geometry.dispose();
                }
                if (mesh.material) {
                  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  materials.forEach((mat) => {
                    // Dispose textures
                    const stdMat = mat as THREE.MeshStandardMaterial;
                    if (stdMat.map) stdMat.map.dispose();
                    if (stdMat.normalMap) stdMat.normalMap.dispose();
                    if (stdMat.roughnessMap) stdMat.roughnessMap.dispose();
                    if (stdMat.metalnessMap) stdMat.metalnessMap.dispose();
                    if (stdMat.aoMap) stdMat.aoMap.dispose();
                    if (stdMat.emissiveMap) stdMat.emissiveMap.dispose();
                    mat.dispose();
                  });
                }
              }
            });
            gl.dispose();
            console.log('[RoboVizCore] Canvas disposed');
          };
        }}
      >
        <React.Suspense fallback={null}>
          <InnerScene
            config={config}
            controls={controls}
            onCameraChange={onCameraChange}
            onObjectClick={onObjectClick}
            onObjectHover={onObjectHover}
          >
            {children}
          </InnerScene>
        </React.Suspense>

        {showStats && <Stats />}
      </Canvas>
    </div>
  );
}

/**
 * Provider component for using RoboViz store outside of RoboVizCore
 * Useful for building custom UIs that interact with the visualization state
 */
export function RoboVizProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}

// Re-export store hook for external use
export { useVizStore };
