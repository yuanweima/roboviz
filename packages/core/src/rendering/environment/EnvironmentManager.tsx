/**
 * RoboViz Environment Manager
 *
 * Provides HDR environment maps, skybox presets, and atmospheric effects
 * for enhanced industrial visualization.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Environment, useEnvironment, Sky } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export type EnvironmentPreset =
  | 'apartment'
  | 'city'
  | 'dawn'
  | 'forest'
  | 'lobby'
  | 'night'
  | 'park'
  | 'studio'
  | 'sunset'
  | 'warehouse';

export type SkyboxPreset =
  | 'none'
  | 'industrial'
  | 'industrial2'
  | 'industrial3'
  | 'outdoor'
  | 'studio'
  | 'night'
  | 'custom';

export interface EnvironmentConfig {
  /** Whether environment is enabled */
  enabled: boolean;
  /** Environment preset (HDR-based) */
  preset?: EnvironmentPreset;
  /** Custom HDR path */
  hdrPath?: string;
  /** Background type */
  backgroundType: 'none' | 'environment' | 'sky' | 'color' | 'gradient';
  /** Background color (when type is 'color') */
  backgroundColor?: string;
  /** Gradient colors (when type is 'gradient') */
  gradientColors?: [string, string];
  /** Environment map intensity (affects reflections) */
  envMapIntensity: number;
  /** Background blur amount (0-1) */
  backgroundBlur: number;
  /** Ground projection for environment map */
  groundProjection: boolean;
  /** Ground projection height */
  groundHeight?: number;
  /** Ground projection radius */
  groundRadius?: number;
}

export interface SkyConfig {
  /** Whether sky is enabled */
  enabled: boolean;
  /** Sun position (azimuth, elevation) in degrees */
  sunPosition: [number, number];
  /** Turbidity (haziness) */
  turbidity: number;
  /** Rayleigh scattering coefficient */
  rayleigh: number;
  /** Mie coefficient */
  mieCoefficient: number;
  /** Mie directional g */
  mieDirectionalG: number;
  /** Distance to sky dome */
  distance: number;
}

export interface FogConfig {
  /** Whether fog is enabled */
  enabled: boolean;
  /** Fog type */
  type: 'linear' | 'exponential';
  /** Fog color */
  color: string;
  /** Near distance (linear fog) */
  near: number;
  /** Far distance (linear fog) */
  far: number;
  /** Density (exponential fog) */
  density: number;
}

export interface EnvironmentSystemConfig {
  environment: EnvironmentConfig;
  sky: SkyConfig;
  fog: FogConfig;
}

export interface EnvironmentContextValue {
  config: EnvironmentSystemConfig;
  setConfig: (config: Partial<EnvironmentSystemConfig>) => void;
  setEnvironment: (config: Partial<EnvironmentConfig>) => void;
  setSky: (config: Partial<SkyConfig>) => void;
  setFog: (config: Partial<FogConfig>) => void;
  applyPreset: (preset: SkyboxPreset) => void;
}

export interface EnvironmentSystemProps {
  /** Initial configuration */
  config?: Partial<EnvironmentSystemConfig>;
  /** Children to render */
  children?: React.ReactNode;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  enabled: true,
  preset: 'warehouse',
  backgroundType: 'environment',
  envMapIntensity: 1.0,
  backgroundBlur: 0,
  groundProjection: false,
};

const DEFAULT_SKY_CONFIG: SkyConfig = {
  enabled: false,
  sunPosition: [180, 45],
  turbidity: 10,
  rayleigh: 2,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  distance: 450000,
};

const DEFAULT_FOG_CONFIG: FogConfig = {
  enabled: false,
  type: 'linear',
  color: '#cccccc',
  near: 10,
  far: 100,
  density: 0.002,
};

const DEFAULT_SYSTEM_CONFIG: EnvironmentSystemConfig = {
  environment: DEFAULT_ENVIRONMENT_CONFIG,
  sky: DEFAULT_SKY_CONFIG,
  fog: DEFAULT_FOG_CONFIG,
};

// ============================================================================
// Skybox Presets
// ============================================================================

export const SKYBOX_PRESETS: Record<SkyboxPreset, Partial<EnvironmentSystemConfig>> = {
  none: {
    environment: {
      ...DEFAULT_ENVIRONMENT_CONFIG,
      enabled: false,
      backgroundType: 'color',
      backgroundColor: '#1a1a2e',
    },
    sky: { ...DEFAULT_SKY_CONFIG, enabled: false },
    fog: { ...DEFAULT_FOG_CONFIG, enabled: false },
  },
  industrial: {
    environment: {
      ...DEFAULT_ENVIRONMENT_CONFIG,
      enabled: true,
      preset: 'warehouse',
      backgroundType: 'environment',
      envMapIntensity: 1.0,
      backgroundBlur: 0,
    },
    sky: { ...DEFAULT_SKY_CONFIG, enabled: false },
    fog: { ...DEFAULT_FOG_CONFIG, enabled: false },
  },
  industrial2: {
    // Lobby-style industrial: modern factory with glass and open spaces
    environment: {
      ...DEFAULT_ENVIRONMENT_CONFIG,
      enabled: true,
      preset: 'lobby',
      backgroundType: 'environment',
      envMapIntensity: 0.9,
      backgroundBlur: 0,
    },
    sky: { ...DEFAULT_SKY_CONFIG, enabled: false },
    fog: { ...DEFAULT_FOG_CONFIG, enabled: false },
  },
  industrial3: {
    // City-style industrial: urban factory with skyline view
    environment: {
      ...DEFAULT_ENVIRONMENT_CONFIG,
      enabled: true,
      preset: 'city',
      backgroundType: 'environment',
      envMapIntensity: 0.8,
      backgroundBlur: 0.02,
    },
    sky: { ...DEFAULT_SKY_CONFIG, enabled: false },
    fog: { ...DEFAULT_FOG_CONFIG, enabled: false },
  },
  outdoor: {
    environment: {
      ...DEFAULT_ENVIRONMENT_CONFIG,
      enabled: true,
      preset: 'park',
      backgroundType: 'environment', // Show HDR environment as background
      envMapIntensity: 1.2, // Stronger reflections
      backgroundBlur: 0, // Sharp background
    },
    sky: {
      ...DEFAULT_SKY_CONFIG,
      enabled: false, // Disable procedural sky, use HDR instead
    },
    // Light fog for depth, much further distances
    fog: { ...DEFAULT_FOG_CONFIG, enabled: true, type: 'linear', color: '#87CEEB', near: 100, far: 500 },
  },
  studio: {
    environment: {
      ...DEFAULT_ENVIRONMENT_CONFIG,
      enabled: true,
      preset: 'studio',
      backgroundType: 'environment', // Show HDR studio background
      envMapIntensity: 1.5, // Strong reflections for polished look
      backgroundBlur: 0.05, // Slight blur for soft studio look
    },
    sky: { ...DEFAULT_SKY_CONFIG, enabled: false },
    fog: { ...DEFAULT_FOG_CONFIG, enabled: false },
  },
  night: {
    environment: {
      ...DEFAULT_ENVIRONMENT_CONFIG,
      enabled: true,
      preset: 'night',
      backgroundType: 'environment', // Show night HDR
      envMapIntensity: 0.5,
      backgroundBlur: 0,
    },
    sky: { ...DEFAULT_SKY_CONFIG, enabled: false },
    // Very subtle fog for atmosphere
    fog: { ...DEFAULT_FOG_CONFIG, enabled: true, type: 'exponential', color: '#0a0a1e', density: 0.005 },
  },
  custom: DEFAULT_SYSTEM_CONFIG,
};

// ============================================================================
// Context
// ============================================================================

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

export function useEnvironmentSystem(): EnvironmentContextValue {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error(
      'useEnvironmentSystem must be used within an EnvironmentSystem provider'
    );
  }
  return context;
}

// ============================================================================
// Internal Components
// ============================================================================

function GradientBackground({
  colors,
}: {
  colors: [string, string];
}): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.uColor1.value.set(colors[0]);
    material.uniforms.uColor2.value.set(colors[1]);
  }, [colors]);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor1: { value: new THREE.Color(colors[0]) },
          uColor2: { value: new THREE.Color(colors[1]) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor1;
          uniform vec3 uColor2;
          varying vec2 vUv;
          void main() {
            gl_FragColor = vec4(mix(uColor1, uColor2, vUv.y), 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    []
  );

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <sphereGeometry args={[500, 32, 32]} />
    </mesh>
  );
}

function FogEffect({ config }: { config: FogConfig }): null {
  const { scene } = useThree();

  useEffect(() => {
    if (!config.enabled) {
      scene.fog = null;
      return;
    }

    const color = new THREE.Color(config.color);

    if (config.type === 'linear') {
      scene.fog = new THREE.Fog(color, config.near, config.far);
    } else {
      scene.fog = new THREE.FogExp2(color, config.density);
    }

    return () => {
      scene.fog = null;
    };
  }, [scene, config]);

  return null;
}

function BackgroundColor({ color }: { color: string }): null {
  const { scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color(color);
    return () => {
      scene.background = null;
    };
  }, [scene, color]);

  return null;
}

function SkyComponent({ config }: { config: SkyConfig }): React.JSX.Element | null {
  if (!config.enabled) return null;

  // Convert azimuth/elevation to cartesian
  const azimuthRad = (config.sunPosition[0] * Math.PI) / 180;
  const elevationRad = (config.sunPosition[1] * Math.PI) / 180;

  const sunPosition: [number, number, number] = [
    Math.cos(elevationRad) * Math.sin(azimuthRad) * config.distance,
    Math.sin(elevationRad) * config.distance,
    Math.cos(elevationRad) * Math.cos(azimuthRad) * config.distance,
  ];

  return (
    <Sky
      sunPosition={sunPosition}
      turbidity={config.turbidity}
      rayleigh={config.rayleigh}
      mieCoefficient={config.mieCoefficient}
      mieDirectionalG={config.mieDirectionalG}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * EnvironmentSystem - Comprehensive environment management
 *
 * @example
 * ```tsx
 * <RoboVizCore>
 *   <EnvironmentSystem config={{ environment: { preset: 'warehouse' } }}>
 *     <Robot urdfPath="/robot.urdf" />
 *   </EnvironmentSystem>
 * </RoboVizCore>
 * ```
 */
export function EnvironmentSystem({
  config: initialConfig,
  children,
}: EnvironmentSystemProps): React.JSX.Element {
  const [config, setConfigState] = useState<EnvironmentSystemConfig>(() => ({
    environment: { ...DEFAULT_ENVIRONMENT_CONFIG, ...initialConfig?.environment },
    sky: { ...DEFAULT_SKY_CONFIG, ...initialConfig?.sky },
    fog: { ...DEFAULT_FOG_CONFIG, ...initialConfig?.fog },
  }));

  // Track the initial config reference to avoid unnecessary updates
  const initialConfigRef = useRef(initialConfig);
  const isFirstRender = useRef(true);

  // Sync with external config changes (e.g., when skybox preset changes)
  // Only update if the config object reference actually changed after first render
  useEffect(() => {
    // Skip on first render - initial state is already set from initialConfig
    if (isFirstRender.current) {
      isFirstRender.current = false;
      initialConfigRef.current = initialConfig;
      return;
    }

    // Only update if the config reference actually changed
    if (initialConfig && initialConfig !== initialConfigRef.current) {
      initialConfigRef.current = initialConfig;
      setConfigState((prev) => ({
        environment: { ...prev.environment, ...initialConfig.environment },
        sky: { ...prev.sky, ...initialConfig.sky },
        fog: { ...prev.fog, ...initialConfig.fog },
      }));
    }
  }, [initialConfig]);

  const setConfig = (updates: Partial<EnvironmentSystemConfig>) => {
    setConfigState((prev) => ({
      environment: { ...prev.environment, ...updates.environment },
      sky: { ...prev.sky, ...updates.sky },
      fog: { ...prev.fog, ...updates.fog },
    }));
  };

  const setEnvironment = (updates: Partial<EnvironmentConfig>) => {
    setConfigState((prev) => ({
      ...prev,
      environment: { ...prev.environment, ...updates },
    }));
  };

  const setSky = (updates: Partial<SkyConfig>) => {
    setConfigState((prev) => ({
      ...prev,
      sky: { ...prev.sky, ...updates },
    }));
  };

  const setFog = (updates: Partial<FogConfig>) => {
    setConfigState((prev) => ({
      ...prev,
      fog: { ...prev.fog, ...updates },
    }));
  };

  const applyPreset = (preset: SkyboxPreset) => {
    const presetConfig = SKYBOX_PRESETS[preset];
    setConfigState((prev) => ({
      environment: { ...prev.environment, ...presetConfig.environment },
      sky: { ...prev.sky, ...presetConfig.sky },
      fog: { ...prev.fog, ...presetConfig.fog },
    }));
  };

  const contextValue = useMemo<EnvironmentContextValue>(
    () => ({
      config,
      setConfig,
      setEnvironment,
      setSky,
      setFog,
      applyPreset,
    }),
    [config]
  );

  const { environment, sky, fog } = config;

  return (
    <EnvironmentContext.Provider value={contextValue}>
      {/* Background handling */}
      {environment.backgroundType === 'color' && environment.backgroundColor && (
        <BackgroundColor color={environment.backgroundColor} />
      )}

      {environment.backgroundType === 'gradient' && environment.gradientColors && (
        <GradientBackground colors={environment.gradientColors} />
      )}

      {/* HDR Environment */}
      {environment.enabled && environment.preset && (
        <Environment
          preset={environment.preset}
          background={environment.backgroundType === 'environment'}
          blur={environment.backgroundBlur}
          ground={
            environment.groundProjection
              ? {
                  height: environment.groundHeight ?? 15,
                  radius: environment.groundRadius ?? 60,
                  scale: 1000,
                }
              : undefined
          }
        />
      )}

      {/* Custom HDR */}
      {environment.enabled && environment.hdrPath && !environment.preset && (
        <Environment
          files={environment.hdrPath}
          background={environment.backgroundType === 'environment'}
          blur={environment.backgroundBlur}
        />
      )}

      {/* Sky */}
      <SkyComponent config={sky} />

      {/* Fog */}
      <FogEffect config={fog} />

      {/* Children */}
      {children}
    </EnvironmentContext.Provider>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default EnvironmentSystem;
