/**
 * Rendering Showcase Scene
 *
 * Comprehensive demonstration of all advanced rendering capabilities:
 *
 * POST-PROCESSING:
 * - SSAO (Screen Space Ambient Occlusion)
 * - Bloom (Glow effects)
 * - Outline (Selection highlighting)
 * - Vignette (Edge darkening)
 *
 * CUSTOM SHADER MATERIALS:
 * - X-Ray (See-through with edge highlighting)
 * - Hologram (Sci-fi holographic effect)
 * - Distance Field (Proximity visualization)
 * - Flow Line (Animated flow patterns)
 * - Heatmap (Data visualization with color maps)
 *
 * OPTIMIZATION:
 * - GPU Instancing (200+ robot arms)
 * - Level of Detail (LOD) for robots
 * - Adaptive Quality Control (auto FPS-based adjustment)
 *
 * DEBUG VISUALIZATION:
 * - Wireframe mode
 * - Bounding boxes
 * - Normal vectors
 * - Light helpers
 *
 * ENVIRONMENT SYSTEM:
 * - HDR environment maps
 * - Skybox presets (industrial, outdoor, studio, night)
 * - Fog effects (linear, exponential)
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { RoboViz, Robot } from '@aspect/roboviz-react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// All rendering components and types from the /rendering sub-entry point
import {
  RenderPipeline,
  InstancedRobotArms,
  getMaterialLibrary,
  PerformancePanel,
  usePerformanceIntegration,
  DebugOverlay,
  EnvironmentSystem,
  SKYBOX_PRESETS,
  type RenderConfig,
  type QualityPreset,
  type RobotLoadedInfo,
  type MeshQuality,
  type EnvironmentSystemConfig,
  type SkyboxPreset,
} from '@aspect/roboviz-core/rendering';

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
const ROBOT_ARM_COUNT = 200;

type ControlMode = 'worker-fk' | 'shared-buffer';
type DemoTab = 'rendering' | 'environment' | 'debug' | 'lod';

// ============================================================================
// Custom Material Demo Components
// ============================================================================

function HologramCube({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const lib = getMaterialLibrary();
    const mat = lib.createHologramMaterial({
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
    if (mat) setMaterial(mat);

    return () => {
      mat?.dispose();
    };
  }, []);

  useFrame(() => {
    if (material && meshRef.current) {
      getMaterialLibrary().updateTime(material);
      meshRef.current.rotation.z += 0.005; // Z-up: rotate around Z axis
    }
  });

  useEffect(() => {
    if (meshRef.current && material) {
      meshRef.current.material = material;
    }
  }, [material]);

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshBasicMaterial color="#003333" />
    </mesh>
  );
}

function XRaySphere({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const lib = getMaterialLibrary();
    const mat = lib.createXRayMaterial({
      color: '#0088ff',
      edgeColor: '#ffffff',
      opacity: 0.6,
      edgeIntensity: 1.2,
      fresnelPower: 2.5,
      animated: true,
    });
    if (mat) setMaterial(mat);

    return () => {
      mat?.dispose();
    };
  }, []);

  useFrame(() => {
    if (material) {
      getMaterialLibrary().updateTime(material);
    }
  });

  useEffect(() => {
    if (meshRef.current && material) {
      meshRef.current.material = material;
    }
  }, [material]);

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshBasicMaterial color="#003355" />
    </mesh>
  );
}

function DistanceFieldPlane({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const lib = getMaterialLibrary();
    const mat = lib.createDistanceFieldMaterial({
      minDistance: 0.2,
      maxDistance: 1.5,
      safeColor: '#00ff88',
      warningColor: '#ffaa00',
      dangerColor: '#ff4444',
      opacity: 0.8,
      pulseSpeed: 4,
    });
    if (mat) setMaterial(mat);

    return () => {
      mat?.dispose();
    };
  }, []);

  useFrame(() => {
    if (material) {
      getMaterialLibrary().updateTime(material);
    }
  });

  useEffect(() => {
    if (meshRef.current && material) {
      meshRef.current.material = material;
    }
  }, [material]);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[1, 1, 32, 32]} />
      <meshBasicMaterial color="#114422" />
    </mesh>
  );
}

// Heatmap visualization demo
function HeatmapSurface({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    const lib = getMaterialLibrary();
    const mat = lib.createHeatmapMaterial({
      colorMap: 'viridis',
      minValue: 0,
      maxValue: 1,
      opacity: 0.9,
    });
    if (mat) setMaterial(mat);

    // Cleanup on unmount
    return () => {
      mat?.dispose();
    };
  }, []);

  // Apply heatmap values once material and mesh are ready
  useEffect(() => {
    if (meshRef.current && material) {
      const lib = getMaterialLibrary();
      const geometry = meshRef.current.geometry;
      const positionAttr = geometry.getAttribute('position');
      const values: number[] = [];

      for (let i = 0; i < positionAttr.count; i++) {
        const x = positionAttr.getX(i);
        const y = positionAttr.getY(i);
        // Create radial gradient pattern
        const value = Math.sin(x * 5) * Math.cos(y * 5) * 0.5 + 0.5;
        values.push(value);
      }

      lib.applyHeatmapValues(geometry, values);
      meshRef.current.material = material;
    }
  }, [material]);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[1.5, 1.5, 32, 32]} />
      <meshBasicMaterial color="#333" /> {/* Placeholder until heatmap material is ready */}
    </mesh>
  );
}

// Emissive objects for bloom demo
function EmissiveRing({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
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
// LOD Demo Robot
// ============================================================================

interface LODDemoRobotProps {
  position: [number, number, number];
  onLodChange?: (level: number, distance: number) => void;
}

function LODDemoRobot({ position, onLodChange }: LODDemoRobotProps) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={position}>
      <Robot
        urdfPath={URDF_PATH}
        lodEnabled={true}
        lodDistances={[3, 8, 15]}
        onLodChange={onLodChange}
      />
    </group>
  );
}

// ============================================================================
// Control Panel Tabs
// ============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 12px',
        borderRadius: 6,
        border: 'none',
        background: active ? THEME.primary : THEME.surface,
        color: THEME.text,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: active ? 'bold' : 'normal',
      }}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Control Panel
// ============================================================================

interface ControlPanelProps {
  // Tab
  activeTab: DemoTab;
  onTabChange: (tab: DemoTab) => void;
  // Rendering
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
  // Instancing
  robotCount: number;
  robotsLoaded: boolean;
  jointCount: number;
  linkCount: number;
  controlMode: ControlMode;
  onControlModeChange: (mode: ControlMode) => void;
  updateTimeMs: number;
  fkTimeMs?: number;
  meshQuality: MeshQuality;
  onMeshQualityChange: (quality: MeshQuality) => void;
  // Environment
  skyboxPreset: SkyboxPreset;
  onSkyboxPresetChange: (preset: SkyboxPreset) => void;
  fogEnabled: boolean;
  onFogEnabledChange: (enabled: boolean) => void;
  // Debug
  debugEnabled: boolean;
  onDebugEnabledChange: (enabled: boolean) => void;
  showWireframe: boolean;
  onShowWireframeChange: (enabled: boolean) => void;
  showBoundingBoxes: boolean;
  onShowBoundingBoxesChange: (enabled: boolean) => void;
  showNormals: boolean;
  onShowNormalsChange: (enabled: boolean) => void;
  showLightHelpers: boolean;
  onShowLightHelpersChange: (enabled: boolean) => void;
  // LOD
  lodEnabled: boolean;
  onLodEnabledChange: (enabled: boolean) => void;
  currentLodLevel: number;
  lodDistance: number;
  // Adaptive Quality
  adaptiveQualityEnabled: boolean;
  onAdaptiveQualityEnabledChange: (enabled: boolean) => void;
  averageFPS: number;
}

function ControlPanel({
  activeTab,
  onTabChange,
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
  skyboxPreset,
  onSkyboxPresetChange,
  fogEnabled,
  onFogEnabledChange,
  debugEnabled,
  onDebugEnabledChange,
  showWireframe,
  onShowWireframeChange,
  showBoundingBoxes,
  onShowBoundingBoxesChange,
  showNormals,
  onShowNormalsChange,
  showLightHelpers,
  onShowLightHelpersChange,
  lodEnabled,
  onLodEnabledChange,
  currentLodLevel,
  lodDistance,
  adaptiveQualityEnabled,
  onAdaptiveQualityEnabledChange,
  averageFPS,
}: ControlPanelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: THEME.panel,
        padding: 16,
        borderRadius: 12,
        color: THEME.text,
        minWidth: 320,
        maxWidth: 360,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', color: THEME.primary, fontSize: 16 }}>
        Rendering Showcase
      </h3>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <TabButton active={activeTab === 'rendering'} onClick={() => onTabChange('rendering')}>
          🎨 Render
        </TabButton>
        <TabButton active={activeTab === 'environment'} onClick={() => onTabChange('environment')}>
          🌍 Env
        </TabButton>
        <TabButton active={activeTab === 'debug'} onClick={() => onTabChange('debug')}>
          🔧 Debug
        </TabButton>
        <TabButton active={activeTab === 'lod'} onClick={() => onTabChange('lod')}>
          📊 LOD
        </TabButton>
      </div>

      {/* Rendering Tab */}
      {activeTab === 'rendering' && (
        <>
          {/* GPU Instancing Stats */}
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: `linear-gradient(135deg, ${THEME.success}22, ${THEME.primary}22)`,
            borderRadius: 8,
            border: `1px solid ${THEME.success}44`,
          }}>
            <div style={{ color: THEME.success, fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>
              GPU Instancing Demo
            </div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: THEME.text, marginBottom: 4 }}>
              {robotCount.toLocaleString()} Robot Arms
            </div>
            <div style={{ fontSize: 11, color: THEME.textSecondary }}>
              {robotsLoaded ? (
                <>
                  <span style={{ color: THEME.success }}>Loaded</span>
                  {' | '}
                  Draw calls: ~{linkCount} (vs {(robotCount * linkCount).toLocaleString()})
                  <br />
                  Update: <span style={{ color: updateTimeMs < 5 ? THEME.success : THEME.warning }}>
                    {updateTimeMs.toFixed(2)}ms
                  </span>
                  {fkTimeMs !== undefined && (
                    <> | FK: <span style={{ color: fkTimeMs < 2 ? THEME.success : THEME.warning }}>
                      {fkTimeMs.toFixed(2)}ms
                    </span></>
                  )}
                </>
              ) : (
                <span style={{ color: THEME.warning }}>Loading...</span>
              )}
            </div>
          </div>

          {/* Control Mode */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 11 }}>
              Control Mode
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => onControlModeChange('worker-fk')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 6,
                  border: 'none',
                  background: controlMode === 'worker-fk' ? THEME.success : THEME.surface,
                  color: THEME.text,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Worker FK
              </button>
              <button
                onClick={() => onControlModeChange('shared-buffer')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 6,
                  border: 'none',
                  background: controlMode === 'shared-buffer' ? THEME.accent : THEME.surface,
                  color: THEME.text,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                SharedBuffer
              </button>
            </div>
          </div>

          {/* Mesh Quality */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 11 }}>
              Mesh Quality
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['visual', 'collision', 'convex'] as MeshQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => onMeshQualityChange(q)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: 6,
                    border: 'none',
                    background: meshQuality === q
                      ? (q === 'visual' ? THEME.danger : q === 'collision' ? THEME.warning : THEME.success)
                      : THEME.surface,
                    color: THEME.text,
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Preset */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 11 }}>
              Quality Preset
            </label>
            <select
              value={qualityPreset}
              onChange={(e) => onQualityChange(e.target.value as QualityPreset)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 6,
                border: 'none',
                background: THEME.surface,
                color: THEME.text,
                fontSize: 12,
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>

          {/* Post-Processing Toggles */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 11 }}>
              Post-Processing
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'SSAO', checked: ssaoEnabled, onChange: onSsaoChange },
                { label: 'Bloom', checked: bloomEnabled, onChange: onBloomChange },
                { label: 'Outline', checked: outlineEnabled, onChange: onOutlineChange },
                { label: 'Vignette', checked: vignetteEnabled, onChange: onVignetteChange },
              ].map(({ label, checked, onChange }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {bloomEnabled && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 11 }}>
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
        </>
      )}

      {/* Environment Tab */}
      {activeTab === 'environment' && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, color: THEME.textSecondary, fontSize: 11 }}>
              Skybox Preset
            </label>
            <select
              value={skyboxPreset}
              onChange={(e) => onSkyboxPresetChange(e.target.value as SkyboxPreset)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 6,
                border: 'none',
                background: THEME.surface,
                color: THEME.text,
                fontSize: 12,
              }}
            >
              <option value="none">None (Dark)</option>
              <option value="industrial">Factory 1 - Warehouse</option>
              <option value="industrial2">Factory 2 - Modern</option>
              <option value="industrial3">Factory 3 - Urban</option>
              <option value="outdoor">Outdoor Park</option>
              <option value="studio">Studio</option>
              <option value="night">Night</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={fogEnabled}
                onChange={(e) => onFogEnabledChange(e.target.checked)}
              />
              Enable Fog
            </label>
          </div>

          <div style={{ padding: 12, background: THEME.surface, borderRadius: 8, fontSize: 11, color: THEME.textSecondary }}>
            <strong style={{ color: THEME.secondary }}>Environment System Features:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 16 }}>
              <li>HDR Environment Maps</li>
              <li>Skybox Presets (industrial, outdoor, studio, night)</li>
              <li>Linear/Exponential Fog</li>
              <li>Gradient Backgrounds</li>
              <li>Sky Component with Sun Position</li>
            </ul>
          </div>
        </>
      )}

      {/* Debug Tab */}
      {activeTab === 'debug' && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={debugEnabled}
                onChange={(e) => onDebugEnabledChange(e.target.checked)}
              />
              <strong>Enable Debug Overlay</strong>
            </label>
          </div>

          {debugEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Wireframe Mode', checked: showWireframe, onChange: onShowWireframeChange },
                { label: 'Bounding Boxes', checked: showBoundingBoxes, onChange: onShowBoundingBoxesChange },
                { label: 'Normal Vectors', checked: showNormals, onChange: onShowNormalsChange },
                { label: 'Light Helpers', checked: showLightHelpers, onChange: onShowLightHelpersChange },
              ].map(({ label, checked, onChange }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, paddingLeft: 20 }}>
                  <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          )}

          <div style={{ padding: 12, background: THEME.surface, borderRadius: 8, fontSize: 11, color: THEME.textSecondary }}>
            <strong style={{ color: THEME.warning }}>Debug Visualization:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 16 }}>
              <li>Wireframe: See mesh topology</li>
              <li>Bounding Boxes: Object bounds</li>
              <li>Normals: Surface orientation</li>
              <li>Light Helpers: Light visualization</li>
            </ul>
          </div>
        </>
      )}

      {/* LOD Tab */}
      {activeTab === 'lod' && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={lodEnabled}
                onChange={(e) => onLodEnabledChange(e.target.checked)}
              />
              <strong>Enable LOD System</strong>
            </label>
          </div>

          {lodEnabled && (
            <div style={{
              padding: 12,
              background: THEME.surface,
              borderRadius: 8,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: THEME.textSecondary, marginBottom: 8 }}>
                Current LOD Level
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 'bold',
                  color: currentLodLevel === 0 ? THEME.success : currentLodLevel === 1 ? THEME.warning : THEME.danger,
                }}>
                  {currentLodLevel}
                </div>
                <div style={{ fontSize: 11, color: THEME.textSecondary }}>
                  {currentLodLevel === 0 ? 'High Detail' : currentLodLevel === 1 ? 'Medium Detail' : 'Low Detail'}
                  <br />
                  Distance: {lodDistance.toFixed(1)}m
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={adaptiveQualityEnabled}
                onChange={(e) => onAdaptiveQualityEnabledChange(e.target.checked)}
              />
              <strong>Adaptive Quality Control</strong>
            </label>
          </div>

          {adaptiveQualityEnabled && (
            <div style={{
              padding: 12,
              background: THEME.surface,
              borderRadius: 8,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: THEME.textSecondary, marginBottom: 4 }}>
                Average FPS
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: averageFPS >= 55 ? THEME.success : averageFPS >= 45 ? THEME.warning : THEME.danger,
              }}>
                {averageFPS.toFixed(1)}
              </div>
              <div style={{ fontSize: 10, color: THEME.textSecondary, marginTop: 4 }}>
                Auto-adjusts quality to maintain 60 FPS
              </div>
            </div>
          )}

          <div style={{ padding: 12, background: THEME.surface, borderRadius: 8, fontSize: 11, color: THEME.textSecondary }}>
            <strong style={{ color: THEME.primary }}>Optimization Features:</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 16 }}>
              <li>LOD: Auto geometry simplification</li>
              <li>Adaptive Quality: FPS-based adjustment</li>
              <li>Distance thresholds: 3m / 8m / 15m</li>
            </ul>
          </div>
        </>
      )}

      {/* Instructions */}
      <div style={{ marginTop: 12, padding: 10, background: THEME.surface, borderRadius: 8, fontSize: 10, color: THEME.textSecondary }}>
        <strong style={{ color: THEME.accent }}>Demo Objects:</strong> Hologram cube, X-Ray sphere, Distance Field plane, Heatmap surface
        <br /><br />
        <strong style={{ color: THEME.primary }}>Click boxes</strong> to see outline effect
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
  onFrame: (stats: { updateTimeMs: number; fkTimeMs?: number }) => void;
  meshQuality: MeshQuality;
  debugConfig: {
    enabled: boolean;
    showWireframe: boolean;
    showBoundingBoxes: boolean;
    showNormals: boolean;
    showLightHelpers: boolean;
  };
  lodEnabled: boolean;
  onLodChange: (level: number, distance: number) => void;
}

function SceneContent({
  onSelectObject,
  selectedIds,
  onRobotsLoaded,
  controlMode,
  onFrame,
  meshQuality,
  debugConfig,
  lodEnabled,
  onLodChange,
}: SceneContentProps) {
  const isWorkerMode = controlMode === 'worker-fk';
  const isSharedBufferMode = controlMode === 'shared-buffer';

  usePerformanceIntegration();

  return (
    <>
      {/* Debug Overlay */}
      {debugConfig.enabled && (
        <DebugOverlay
          enabled={true}
          config={{
            wireframe: debugConfig.showWireframe,
            boundingBoxes: debugConfig.showBoundingBoxes,
            normals: debugConfig.showNormals,
            lightHelpers: debugConfig.showLightHelpers,
            shadowCameras: false,
          }}
        />
      )}

      {/* Instanced Robot Arms */}
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

      {/* LOD Demo Robot - separate from instanced */}
      {lodEnabled && (
        <LODDemoRobot
          position={[0, 0, 5]}
          onLodChange={onLodChange}
        />
      )}

      {/* Selectable Boxes - Z-up: height is Z coordinate */}
      <SelectableBox position={[0, 0, 2]} color="#4488ff" onSelect={onSelectObject} isSelected={selectedIds.has('box-0')} />
      <SelectableBox position={[1, 0, 2]} color="#ff8844" onSelect={onSelectObject} isSelected={selectedIds.has('box-1')} />
      <SelectableBox position={[-1, 0, 2]} color="#44ff88" onSelect={onSelectObject} isSelected={selectedIds.has('box-2')} />

      {/* Emissive Rings for Bloom - Z-up: height is Z coordinate */}
      <EmissiveRing position={[0.5, 0.5, 2.5]} color="#ff0088" />
      <EmissiveRing position={[-0.5, 0.5, 2.5]} color="#00ff88" />
      <EmissiveRing position={[0, -0.5, 2.5]} color="#8800ff" />

      {/* Custom Shader Demos - Z-up: height is Z coordinate */}
      <HologramCube position={[2, 0, 2]} />
      <XRaySphere position={[-2, 0, 2]} />
      <DistanceFieldPlane position={[0, 0, 0.01]} />
      <HeatmapSurface position={[3, 0, 0.02]} />

      {/* Ground plane - Z-up: PlaneGeometry is already on XY plane, no rotation needed */}
      <mesh position={[0, 0, -0.01]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#2a2a3a"
          metalness={0.4}
          roughness={0.6}
          envMapIntensity={1.0}
        />
      </mesh>

      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.3} />

      {/* Key light - main directional light - Z-up: height is Z coordinate */}
      <directionalLight
        position={[10, 10, 15]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* Fill light - Z-up: height is Z coordinate */}
      <directionalLight
        position={[-5, -5, 5]}
        intensity={0.5}
        color="#aaccff"
      />

      {/* Point lights for local illumination - Z-up: height is Z coordinate */}
      <pointLight position={[5, 5, 5]} intensity={50} color="#ffffff" />
      <spotLight position={[-5, 0, 8]} intensity={100} angle={0.5} penumbra={0.5} castShadow />
    </>
  );
}

// ============================================================================
// Main Scene Component
// ============================================================================

export default function RenderingShowcaseScene() {
  // Tab state
  const [activeTab, setActiveTab] = useState<DemoTab>('rendering');

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

  // Control mode state
  const [controlMode, setControlMode] = useState<ControlMode>('worker-fk');
  const [updateTimeMs, setUpdateTimeMs] = useState(0);
  const [fkTimeMs, setFkTimeMs] = useState<number | undefined>(undefined);
  const [meshQuality, setMeshQuality] = useState<MeshQuality>('collision');

  // Selection state
  const [selectedObjects, setSelectedObjects] = useState<THREE.Object3D[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Environment state
  const [skyboxPreset, setSkyboxPreset] = useState<SkyboxPreset>('none');
  const [fogEnabled, setFogEnabled] = useState(false);

  // Debug state
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [showLightHelpers, setShowLightHelpers] = useState(false);

  // LOD state
  const [lodEnabled, setLodEnabled] = useState(false);
  const [currentLodLevel, setCurrentLodLevel] = useState(0);
  const [lodDistance, setLodDistance] = useState(0);

  // Adaptive Quality state
  const [adaptiveQualityEnabled, setAdaptiveQualityEnabled] = useState(false);
  const [averageFPS, setAverageFPS] = useState(60);

  // Handlers
  const handleRobotsLoaded = useCallback((info: RobotLoadedInfo) => {
    setRobotsLoaded(true);
    setJointCount(info.jointCount);
    setLinkCount(info.linkCount);
  }, []);

  const handleFrame = useCallback((stats: { updateTimeMs: number; fkTimeMs?: number }) => {
    setUpdateTimeMs(stats.updateTimeMs);
    if (stats.fkTimeMs !== undefined) {
      setFkTimeMs(stats.fkTimeMs);
    }
  }, []);

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
      const pos = mesh.position;
      let boxId = '';
      // Z-up: boxes are at Z=2, not Y=2
      if (Math.abs(pos.x) < 0.1 && Math.abs(pos.z - 2) < 0.1) boxId = 'box-0';
      else if (Math.abs(pos.x - 1) < 0.1 && Math.abs(pos.z - 2) < 0.1) boxId = 'box-1';
      else if (Math.abs(pos.x + 1) < 0.1 && Math.abs(pos.z - 2) < 0.1) boxId = 'box-2';

      if (boxId) {
        if (newSet.has(boxId)) newSet.delete(boxId);
        else newSet.add(boxId);
      }
      return newSet;
    });
  }, []);

  const handleLodChange = useCallback((level: number, distance: number) => {
    setCurrentLodLevel(level);
    setLodDistance(distance);
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

  // Build environment config
  const environmentConfig = useMemo<Partial<EnvironmentSystemConfig>>(() => {
    const preset = SKYBOX_PRESETS[skyboxPreset];
    const baseFog = preset.fog ?? {
      type: 'linear' as const,
      color: '#aabbcc',
      near: 10,
      far: 100,
      density: 0.01,
    };
    return {
      ...preset,
      fog: {
        ...baseFog,
        enabled: fogEnabled,
      },
    };
  }, [skyboxPreset, fogEnabled]);

  // Debug config
  const debugConfig = useMemo(() => ({
    enabled: debugEnabled,
    showWireframe,
    showBoundingBoxes,
    showNormals,
    showLightHelpers,
  }), [debugEnabled, showWireframe, showBoundingBoxes, showNormals, showLightHelpers]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <RoboViz
        config={{ scene: { background: THEME.background } }}
        style={{ width: '100%', height: '100%' }}
      >
        <EnvironmentSystem config={environmentConfig}>
          <RenderPipeline config={renderConfig} outlineObjects={selectedObjects}>
            <SceneContent
              onSelectObject={handleSelectObject}
              selectedIds={selectedIds}
              onRobotsLoaded={handleRobotsLoaded}
              controlMode={controlMode}
              onFrame={handleFrame}
              meshQuality={meshQuality}
              debugConfig={debugConfig}
              lodEnabled={lodEnabled}
              onLodChange={handleLodChange}
            />
          </RenderPipeline>
        </EnvironmentSystem>
      </RoboViz>

      <ControlPanel
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
        skyboxPreset={skyboxPreset}
        onSkyboxPresetChange={setSkyboxPreset}
        fogEnabled={fogEnabled}
        onFogEnabledChange={setFogEnabled}
        debugEnabled={debugEnabled}
        onDebugEnabledChange={setDebugEnabled}
        showWireframe={showWireframe}
        onShowWireframeChange={setShowWireframe}
        showBoundingBoxes={showBoundingBoxes}
        onShowBoundingBoxesChange={setShowBoundingBoxes}
        showNormals={showNormals}
        onShowNormalsChange={setShowNormals}
        showLightHelpers={showLightHelpers}
        onShowLightHelpersChange={setShowLightHelpers}
        lodEnabled={lodEnabled}
        onLodEnabledChange={setLodEnabled}
        currentLodLevel={currentLodLevel}
        lodDistance={lodDistance}
        adaptiveQualityEnabled={adaptiveQualityEnabled}
        onAdaptiveQualityEnabledChange={setAdaptiveQualityEnabled}
        averageFPS={averageFPS}
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
        <p style={{ margin: '8px 0 0 0', color: THEME.textSecondary, fontSize: 13 }}>
          Post-Processing • Custom Shaders • GPU Instancing • LOD • Environment • Debug
        </p>
      </div>
    </div>
  );
}
