/**
 * Rendering Showcase Scene
 *
 * Demonstrates the new advanced rendering capabilities:
 * - Post-Processing: SSAO, Bloom, Outline, Vignette
 * - Custom Shader Materials: X-Ray, Hologram, Distance Field, Flow Line
 * - GPU Instancing: 1000 robot arms rendered efficiently
 * - Quality Presets: Low, Medium, High, Ultra
 * - Real-time quality adjustment
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { RoboViz } from '@aspect/roboviz-react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  RenderPipeline,
  InstancedRobotArms,
  getMaterialLibrary,
  PerformancePanel,
  usePerformanceIntegration,
  type RenderConfig,
  type QualityPreset,
  type RobotLoadedInfo,
  type MeshQuality,
} from '@aspect/roboviz-core';

// ============================================================================
// Theme
// ============================================================================

const THEME = {
  primary: '#00aaff',
  secondary: '#00ffff',
  accent: '#ff00ff',
  success: '#00ff88',
  warning: '#ffaa00',
  danger: '#ff4444',
  background: '#0a0a1a',
  surface: '#1a1a2a',
  panel: '#2a2a3a',
  text: '#fff',
  textSecondary: '#88aacc',
};

// ============================================================================
// Constants
// ============================================================================

const URDF_PATH = '/fixtures/models/Fanuc_LR_Mate_200iD_7L/robot_link.urdf';
const ROBOT_ARM_COUNT = 200; // Number of instanced robot arms

// Control modes - simplified to just Worker FK and SharedBuffer
type ControlMode = 'worker-fk' | 'shared-buffer';

// ============================================================================
// Custom Material Demo Components
// ============================================================================

function HologramCube({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const lib = getMaterialLibrary();
    materialRef.current = lib.createHologramMaterial({
      color: '#00ffff',
      secondaryColor: '#ffffff',
      opacity: 0.7,
      scanlineCount: 30,
      scanlineIntensity: 0.4,
      flickerIntensity: 0.1,
      glitchIntensity: 0.03,
      showGrid: true,
      gridSize: 15,
    });
  }, []);

  useFrame(() => {
    if (materialRef.current && meshRef.current) {
      getMaterialLibrary().updateTime(materialRef.current);
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      {materialRef.current && <primitive object={materialRef.current} attach="material" />}
    </mesh>
  );
}

function XRaySphere({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const lib = getMaterialLibrary();
    materialRef.current = lib.createXRayMaterial({
      color: '#0088ff',
      edgeColor: '#ffffff',
      opacity: 0.6,
      edgeIntensity: 1.2,
      fresnelPower: 2.5,
      animated: true,
    });
  }, []);

  useFrame(() => {
    if (materialRef.current) {
      getMaterialLibrary().updateTime(materialRef.current);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.2, 32, 32]} />
      {materialRef.current && <primitive object={materialRef.current} attach="material" />}
    </mesh>
  );
}

function DistanceFieldPlane({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const lib = getMaterialLibrary();
    materialRef.current = lib.createDistanceFieldMaterial({
      minDistance: 0.2,
      maxDistance: 1.5,
      safeColor: '#00ff88',
      warningColor: '#ffaa00',
      dangerColor: '#ff4444',
      opacity: 0.8,
      pulseSpeed: 4,
    });
  }, []);

  useFrame(() => {
    if (materialRef.current) {
      getMaterialLibrary().updateTime(materialRef.current);
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1, 1, 32, 32]} />
      {materialRef.current && <primitive object={materialRef.current} attach="material" />}
    </mesh>
  );
}

// Emissive objects for bloom demo
function EmissiveRing({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.15, 0.02, 16, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        toneMapped={false}
      />
    </mesh>
  );
}

// ============================================================================
// Selectable Object for Outline Demo
// ============================================================================

interface SelectableBoxProps {
  position: [number, number, number];
  color: string;
  onSelect: (mesh: THREE.Mesh) => void;
  isSelected: boolean;
}

function SelectableBox({ position, color, onSelect, isSelected }: SelectableBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const handleClick = useCallback((e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    if (meshRef.current) {
      onSelect(meshRef.current);
    }
  }, [onSelect]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={handleClick}
    >
      <boxGeometry args={[0.25, 0.25, 0.25]} />
      <meshStandardMaterial
        color={isSelected ? '#ffffff' : color}
        metalness={0.6}
        roughness={0.3}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  );
}

// ============================================================================
// Control Panel
// ============================================================================

interface ControlPanelProps {
  qualityPreset: QualityPreset;
  onQualityChange: (preset: QualityPreset) => void;
  ssaoEnabled: boolean;
  onSsaoChange: (enabled: boolean) => void;
  bloomEnabled: boolean;
  onBloomChange: (enabled: boolean) => void;
  outlineEnabled: boolean;
  onOutlineChange: (enabled: boolean) => void;
  vignetteEnabled: boolean;
  onVignetteChange: (enabled: boolean) => void;
  bloomIntensity: number;
  onBloomIntensityChange: (value: number) => void;
  robotCount: number;
  robotsLoaded: boolean;
  jointCount: number;
  linkCount: number;
  // RL Mode
  controlMode: ControlMode;
  onControlModeChange: (mode: ControlMode) => void;
  updateTimeMs: number;
  fkTimeMs?: number;
  // Mesh Quality
  meshQuality: MeshQuality;
  onMeshQualityChange: (quality: MeshQuality) => void;
}

function ControlPanel({
  qualityPreset,
  onQualityChange,
  ssaoEnabled,
  onSsaoChange,
  bloomEnabled,
  onBloomChange,
  outlineEnabled,
  onOutlineChange,
  vignetteEnabled,
  onVignetteChange,
  bloomIntensity,
  onBloomIntensityChange,
  robotCount,
  robotsLoaded,
  jointCount,
  linkCount,
  controlMode,
  onControlModeChange,
  updateTimeMs,
  fkTimeMs,
  meshQuality,
  onMeshQualityChange,
}: ControlPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: THEME.panel,
        padding: 20,
        borderRadius: 12,
        color: THEME.text,
        minWidth: 300,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', color: THEME.primary }}>
        Rendering Settings
      </h3>

      {/* GPU Instancing Stats - Highlight! */}
      <div style={{
        marginBottom: 16,
        padding: 16,
        background: `linear-gradient(135deg, ${THEME.success}22, ${THEME.primary}22)`,
        borderRadius: 8,
        border: `1px solid ${THEME.success}44`,
      }}>
        <div style={{ color: THEME.success, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
          GPU Instancing + RL Demo
        </div>
        <div style={{ fontSize: 32, fontWeight: 'bold', color: THEME.text, marginBottom: 4 }}>
          {robotCount.toLocaleString()} Robot Arms
        </div>
        <div style={{ fontSize: 12, color: THEME.textSecondary }}>
          {robotsLoaded ? (
            <>
              <span style={{ color: THEME.success }}>Loaded</span>
              {' | '}
              {jointCount} joints × {linkCount} links per robot
              <br />
              Total: {(robotCount * linkCount).toLocaleString()} meshes
              <br />
              Draw calls: ~{linkCount} (instead of {(robotCount * linkCount).toLocaleString()})
              <br />
              Update time: <span style={{ color: updateTimeMs < 5 ? THEME.success : updateTimeMs < 10 ? THEME.warning : THEME.danger }}>
                {updateTimeMs.toFixed(2)}ms
              </span>
              {fkTimeMs !== undefined && (
                <>
                  <br />
                  FK time (Worker): <span style={{ color: fkTimeMs < 2 ? THEME.success : fkTimeMs < 5 ? THEME.warning : THEME.danger }}>
                    {fkTimeMs.toFixed(2)}ms
                  </span>
                </>
              )}
            </>
          ) : (
            <span style={{ color: THEME.warning }}>Loading URDF...</span>
          )}
        </div>
      </div>

      {/* Control Mode - Only Worker FK and SharedBuffer */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, color: THEME.textSecondary }}>
          Control Mode
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onControlModeChange('worker-fk')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 6,
              border: 'none',
              background: controlMode === 'worker-fk' ? THEME.success : THEME.surface,
              color: THEME.text,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: controlMode === 'worker-fk' ? 'bold' : 'normal',
            }}
          >
            Worker FK
          </button>
          <button
            onClick={() => onControlModeChange('shared-buffer')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 6,
              border: 'none',
              background: controlMode === 'shared-buffer' ? THEME.accent : THEME.surface,
              color: THEME.text,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: controlMode === 'shared-buffer' ? 'bold' : 'normal',
            }}
          >
            SharedBuffer
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: THEME.textSecondary }}>
          {controlMode === 'worker-fk' ? (
            <>
              <span style={{ color: THEME.success }}>trajx-wasm FK Worker</span>: Batch FK in Web Worker (WASM).
              <br />
              Joint angles generated in main thread, FK computed in Worker.
            </>
          ) : (
            <>
              <span style={{ color: THEME.accent }}>SharedArrayBuffer</span>: Zero-copy Worker communication.
              <br />
              Joint angles + FK + matrix combine all in Worker. Fastest mode!
            </>
          )}
        </div>
      </div>

      {/* Mesh Quality - Key for performance! */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, color: THEME.textSecondary }}>
          Mesh Quality
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onMeshQualityChange('visual')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: meshQuality === 'visual' ? THEME.danger : THEME.surface,
              color: THEME.text,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: meshQuality === 'visual' ? 'bold' : 'normal',
            }}
          >
            Visual
            <br />
            <span style={{ fontSize: 10, opacity: 0.7 }}>74K tri</span>
          </button>
          <button
            onClick={() => onMeshQualityChange('collision')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: meshQuality === 'collision' ? THEME.warning : THEME.surface,
              color: THEME.text,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: meshQuality === 'collision' ? 'bold' : 'normal',
            }}
          >
            Collision
            <br />
            <span style={{ fontSize: 10, opacity: 0.7 }}>4K tri</span>
          </button>
          <button
            onClick={() => onMeshQualityChange('convex')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: 'none',
              background: meshQuality === 'convex' ? THEME.success : THEME.surface,
              color: THEME.text,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: meshQuality === 'convex' ? 'bold' : 'normal',
            }}
          >
            Convex
            <br />
            <span style={{ fontSize: 10, opacity: 0.7 }}>3K tri</span>
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: THEME.textSecondary }}>
          {meshQuality === 'visual' ? (
            <span style={{ color: THEME.danger }}>High-fidelity</span>
          ) : meshQuality === 'collision' ? (
            <span style={{ color: THEME.warning }}>Simplified (~17x faster)</span>
          ) : (
            <span style={{ color: THEME.success }}>Convex hull (~25x faster)</span>
          )}
        </div>
      </div>

      {/* Quality Preset */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, color: THEME.textSecondary }}>
          Quality Preset
        </label>
        <select
          value={qualityPreset}
          onChange={(e) => onQualityChange(e.target.value as QualityPreset)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            background: THEME.surface,
            color: THEME.text,
            fontSize: 14,
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="ultra">Ultra</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Post-Processing Toggles */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, color: THEME.textSecondary }}>
          Post-Processing Effects
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={ssaoEnabled}
              onChange={(e) => onSsaoChange(e.target.checked)}
            />
            SSAO (Ambient Occlusion)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={bloomEnabled}
              onChange={(e) => onBloomChange(e.target.checked)}
            />
            Bloom (Glow)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={outlineEnabled}
              onChange={(e) => onOutlineChange(e.target.checked)}
            />
            Outline (Selection)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={vignetteEnabled}
              onChange={(e) => onVignetteChange(e.target.checked)}
            />
            Vignette
          </label>
        </div>
      </div>

      {/* Bloom Intensity Slider */}
      {bloomEnabled && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, color: THEME.textSecondary }}>
            Bloom Intensity: {bloomIntensity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={bloomIntensity}
            onChange={(e) => onBloomIntensityChange(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Instructions */}
      <div style={{ padding: 12, background: THEME.surface, borderRadius: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: THEME.textSecondary }}>
          <strong style={{ color: THEME.accent }}>Click boxes</strong> to select them and see the outline effect.
          <br /><br />
          <strong style={{ color: THEME.secondary }}>Emissive rings</strong> demonstrate bloom glow.
          <br /><br />
          <strong style={{ color: THEME.primary }}>Custom shaders:</strong> Hologram cube, X-Ray sphere, Distance field plane.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Scene Content
// ============================================================================

interface SceneContentProps {
  onSelectObject: (mesh: THREE.Mesh) => void;
  selectedIds: Set<string>;
  onRobotsLoaded: (info: RobotLoadedInfo) => void;
  controlMode: ControlMode;
  onFrame: (stats: { updateTimeMs: number }) => void;
  meshQuality: MeshQuality;
}

function SceneContent({
  onSelectObject,
  selectedIds,
  onRobotsLoaded,
  controlMode,
  onFrame,
  meshQuality,
}: SceneContentProps) {
  const isWorkerMode = controlMode === 'worker-fk';
  const isSharedBufferMode = controlMode === 'shared-buffer';

  // Integrate with PerformanceManager for real-time metrics
  usePerformanceIntegration();

  return (
    <>
      {/* Instanced Robot Arms - The main showcase! */}
      {/* meshQuality controls visual/collision/convex mesh loading */}
      <InstancedRobotArms
        urdfPath={URDF_PATH}
        count={ROBOT_ARM_COUNT}
        gridSpacing={1.2}
        colorVariation={true}
        animate={true}
        useWorker={isWorkerMode}
        useSharedBuffer={isSharedBufferMode}
        robotName="Fanuc_LR_Mate_200iD_7L"
        meshQuality={meshQuality}
        onLoaded={onRobotsLoaded}
        onFrame={onFrame}
      />

      {/* Selectable Boxes (click to toggle outline) - positioned above the robot grid */}
      <SelectableBox
        position={[0, 2, 0]}
        color="#4488ff"
        onSelect={onSelectObject}
        isSelected={selectedIds.has('box-0')}
      />
      <SelectableBox
        position={[1, 2, 0]}
        color="#ff8844"
        onSelect={onSelectObject}
        isSelected={selectedIds.has('box-1')}
      />
      <SelectableBox
        position={[-1, 2, 0]}
        color="#44ff88"
        onSelect={onSelectObject}
        isSelected={selectedIds.has('box-2')}
      />

      {/* Emissive Rings for Bloom Demo */}
      <EmissiveRing position={[0.5, 2.5, 0.5]} color="#ff0088" />
      <EmissiveRing position={[-0.5, 2.5, 0.5]} color="#00ff88" />
      <EmissiveRing position={[0, 2.5, -0.5]} color="#8800ff" />

      {/* Custom Shader Material Demos */}
      <HologramCube position={[2, 2, 0]} />
      <XRaySphere position={[-2, 2, 0]} />
      <DistanceFieldPlane position={[0, 0.01, 0]} />

      {/* Ground plane for context */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a2a" metalness={0.2} roughness={0.8} />
      </mesh>
    </>
  );
}

// ============================================================================
// Main Scene Component
// ============================================================================

export default function RenderingShowcaseScene() {
  // Render config state
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('high');
  const [ssaoEnabled, setSsaoEnabled] = useState(true);
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [outlineEnabled, setOutlineEnabled] = useState(true);
  const [vignetteEnabled, setVignetteEnabled] = useState(true);
  const [bloomIntensity, setBloomIntensity] = useState(0.5);

  // Robot loading state
  const [robotsLoaded, setRobotsLoaded] = useState(false);
  const [jointCount, setJointCount] = useState(6);
  const [linkCount, setLinkCount] = useState(0);

  // Control mode state - default to Worker FK
  const [controlMode, setControlMode] = useState<ControlMode>('worker-fk');
  const [updateTimeMs, setUpdateTimeMs] = useState(0);
  const [fkTimeMs, setFkTimeMs] = useState<number | undefined>(undefined);

  // Mesh quality state - default to 'collision' for better performance
  const [meshQuality, setMeshQuality] = useState<MeshQuality>('collision');

  // Selection state - manage outline objects at parent level
  const [selectedObjects, setSelectedObjects] = useState<THREE.Object3D[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Handle robots loaded
  const handleRobotsLoaded = useCallback((info: RobotLoadedInfo) => {
    setRobotsLoaded(true);
    setJointCount(info.jointCount);
    setLinkCount(info.linkCount);
  }, []);

  // Handle frame stats
  const handleFrame = useCallback((stats: { updateTimeMs: number; fkTimeMs?: number }) => {
    setUpdateTimeMs(stats.updateTimeMs);
    if (stats.fkTimeMs !== undefined) {
      setFkTimeMs(stats.fkTimeMs);
    }
  }, []);

  // Handle object selection
  const handleSelectObject = useCallback((mesh: THREE.Mesh) => {
    const meshId = mesh.uuid;
    setSelectedObjects((prev) => {
      const isSelected = prev.some((o) => o.uuid === meshId);
      if (isSelected) {
        return prev.filter((o) => o.uuid !== meshId);
      }
      return [...prev, mesh];
    });
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      // Use position to determine which box was clicked
      const pos = mesh.position;
      let boxId = '';
      if (Math.abs(pos.x) < 0.1 && Math.abs(pos.y - 2) < 0.1) boxId = 'box-0';
      else if (Math.abs(pos.x - 1) < 0.1 && Math.abs(pos.y - 2) < 0.1) boxId = 'box-1';
      else if (Math.abs(pos.x + 1) < 0.1 && Math.abs(pos.y - 2) < 0.1) boxId = 'box-2';

      if (boxId) {
        if (newSet.has(boxId)) {
          newSet.delete(boxId);
        } else {
          newSet.add(boxId);
        }
      }
      return newSet;
    });
  }, []);

  // Build render config
  const renderConfig = useMemo<Partial<RenderConfig>>(() => ({
    qualityPreset,
    postProcessing: {
      enabled: true,
      ssao: {
        enabled: ssaoEnabled,
        intensity: 0.5,
        radius: 0.5,
        samples: 32,
        distanceFalloff: 1,
      },
      bloom: {
        enabled: bloomEnabled,
        intensity: bloomIntensity,
        threshold: 0.8,
        smoothing: 0.3,
        kernelSize: 5,
      },
      outline: {
        enabled: outlineEnabled,
        color: '#00ff88',
        thickness: 2,
        pulse: true,
        pulseSpeed: 2,
        hiddenEdgeColor: '#004422',
      },
      vignette: {
        enabled: vignetteEnabled,
        darkness: 0.4,
        offset: 0.5,
      },
      antialiasing: 'smaa',
      depthOfField: {
        enabled: false,
        focusDistance: 5,
        focalLength: 50,
        bokehScale: 2,
      },
    },
  }), [qualityPreset, ssaoEnabled, bloomEnabled, outlineEnabled, vignetteEnabled, bloomIntensity]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <RoboViz
        config={{ scene: { background: THEME.background } }}
        style={{ width: '100%', height: '100%' }}
      >
        <RenderPipeline config={renderConfig} outlineObjects={selectedObjects}>
          <SceneContent
            onSelectObject={handleSelectObject}
            selectedIds={selectedIds}
            onRobotsLoaded={handleRobotsLoaded}
            controlMode={controlMode}
            onFrame={handleFrame}
            meshQuality={meshQuality}
          />
        </RenderPipeline>
      </RoboViz>

      <ControlPanel
        qualityPreset={qualityPreset}
        onQualityChange={setQualityPreset}
        ssaoEnabled={ssaoEnabled}
        onSsaoChange={setSsaoEnabled}
        bloomEnabled={bloomEnabled}
        onBloomChange={setBloomEnabled}
        outlineEnabled={outlineEnabled}
        onOutlineChange={setOutlineEnabled}
        vignetteEnabled={vignetteEnabled}
        onVignetteChange={setVignetteEnabled}
        bloomIntensity={bloomIntensity}
        onBloomIntensityChange={setBloomIntensity}
        robotCount={ROBOT_ARM_COUNT}
        robotsLoaded={robotsLoaded}
        jointCount={jointCount}
        linkCount={linkCount}
        controlMode={controlMode}
        onControlModeChange={setControlMode}
        updateTimeMs={updateTimeMs}
        fkTimeMs={controlMode === 'worker-fk' ? fkTimeMs : undefined}
        meshQuality={meshQuality}
        onMeshQualityChange={setMeshQuality}
      />

      {/* Performance Panel */}
      <PerformancePanel
        visible={true}
        position="bottom-left"
        initiallyCollapsed={false}
        updateInterval={500}
      />

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: THEME.text,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h2 style={{ margin: 0, color: THEME.primary }}>
          Advanced Rendering Showcase
        </h2>
        <p style={{ margin: '8px 0 0 0', color: THEME.textSecondary }}>
          {ROBOT_ARM_COUNT.toLocaleString()} Robot Arms &bull; GPU Instancing &bull; Post-Processing
        </p>
      </div>
    </div>
  );
}
