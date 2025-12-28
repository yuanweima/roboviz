/**
 * RoboViz Material Library
 *
 * Provides a registry of custom shader materials and industrial material presets
 * for advanced visualization in robotics applications.
 */

import * as THREE from 'three';
import type {
  IndustrialMaterialType,
  IndustrialMaterialConfig,
  ShaderMaterialDefinition,
} from '../types';

// ============================================================================
// Shader Source Code (inlined for bundling)
// ============================================================================

const DISTANCE_FIELD_VERTEX = `
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DISTANCE_FIELD_FRAGMENT = `
uniform float uMinDistance;
uniform float uMaxDistance;
uniform vec3 uSafeColor;
uniform vec3 uWarningColor;
uniform vec3 uDangerColor;
uniform float uOpacity;
uniform float uPulseSpeed;
uniform float uTime;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

vec3 getDistanceColor(float distance) {
  float normalizedDist = clamp((distance - uMinDistance) / (uMaxDistance - uMinDistance), 0.0, 1.0);
  if (normalizedDist < 0.5) {
    return mix(uDangerColor, uWarningColor, normalizedDist * 2.0);
  } else {
    return mix(uWarningColor, uSafeColor, (normalizedDist - 0.5) * 2.0);
  }
}

void main() {
  float distance = length(vWorldPosition);
  vec3 color = getDistanceColor(distance);

  float pulse = 1.0;
  float normalizedDist = clamp((distance - uMinDistance) / (uMaxDistance - uMinDistance), 0.0, 1.0);
  if (normalizedDist < 0.5) {
    pulse = 0.8 + 0.2 * sin(uTime * uPulseSpeed * (1.0 - normalizedDist * 2.0));
  }

  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  vec3 finalColor = color * (0.5 + 0.5 * diffuse) * pulse;

  gl_FragColor = vec4(finalColor, uOpacity);
}
`;

const FLOW_LINE_VERTEX = `
attribute float aLineProgress;

varying float vLineProgress;
varying vec3 vWorldPosition;

void main() {
  vLineProgress = aLineProgress;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FLOW_LINE_FRAGMENT = `
uniform vec3 uColor;
uniform vec3 uSecondaryColor;
uniform float uOpacity;
uniform float uTime;
uniform float uSpeed;
uniform float uDashLength;
uniform float uGapLength;
uniform float uFlowDirection;
uniform bool uGradient;
uniform float uGlowIntensity;

varying float vLineProgress;
varying vec3 vWorldPosition;

void main() {
  float totalLength = uDashLength + uGapLength;
  float animatedProgress = vLineProgress + uTime * uSpeed * uFlowDirection;
  float dashProgress = mod(animatedProgress, totalLength);

  float dashAlpha = step(dashProgress, uDashLength);

  float edgeSoftness = 0.05;
  float startFade = smoothstep(0.0, edgeSoftness, dashProgress);
  float endFade = smoothstep(uDashLength, uDashLength - edgeSoftness, dashProgress);
  dashAlpha *= startFade * endFade;

  vec3 color = uColor;
  if (uGradient) {
    color = mix(uSecondaryColor, uColor, vLineProgress);
  }

  float glow = uGlowIntensity * (0.5 + 0.5 * sin(uTime * 3.0 + vLineProgress * 6.28));
  color += color * glow;

  float alpha = uOpacity * dashAlpha;

  if (alpha < 0.01) discard;

  gl_FragColor = vec4(color, alpha);
}
`;

const XRAY_VERTEX = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const XRAY_FRAGMENT = `
uniform vec3 uColor;
uniform vec3 uEdgeColor;
uniform float uOpacity;
uniform float uEdgeIntensity;
uniform float uFresnelPower;
uniform bool uInvertFresnel;
uniform float uTime;
uniform bool uAnimated;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));
  fresnel = pow(fresnel, uFresnelPower);

  if (uInvertFresnel) {
    fresnel = 1.0 - fresnel;
  }

  vec3 color = mix(uColor, uEdgeColor, fresnel * uEdgeIntensity);

  float alpha = uOpacity;
  if (uAnimated) {
    float pulse = 0.8 + 0.2 * sin(uTime * 2.0 + vUv.y * 10.0);
    alpha *= pulse;
    color *= pulse;
  }

  float edgeAlpha = mix(0.2, 1.0, fresnel);
  alpha *= edgeAlpha;

  gl_FragColor = vec4(color, alpha);
}
`;

const HOLOGRAM_VERTEX = `
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const HOLOGRAM_FRAGMENT = `
uniform vec3 uColor;
uniform vec3 uSecondaryColor;
uniform float uOpacity;
uniform float uTime;
uniform float uScanlineSpeed;
uniform float uScanlineCount;
uniform float uScanlineIntensity;
uniform float uFlickerSpeed;
uniform float uFlickerIntensity;
uniform float uGlitchIntensity;
uniform bool uShowGrid;
uniform float uGridSize;
uniform float uFresnelPower;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower);

  vec3 color = mix(uColor, uSecondaryColor, fresnel);

  float scanline = sin((vWorldPosition.y + uTime * uScanlineSpeed) * uScanlineCount * 6.28) * 0.5 + 0.5;
  scanline = pow(scanline, 2.0);
  color *= 1.0 - scanline * uScanlineIntensity;

  float flicker = 1.0 - uFlickerIntensity * 0.5 * (1.0 + sin(uTime * uFlickerSpeed * 20.0));
  color *= flicker;

  if (uGlitchIntensity > 0.0) {
    float glitchTime = floor(uTime * 10.0);
    float glitch = random(vec2(glitchTime, vUv.y));
    if (glitch > 1.0 - uGlitchIntensity * 0.1) {
      float offset = random(vec2(glitchTime, 0.0)) * 2.0 - 1.0;
      color = mix(color, uSecondaryColor, abs(offset));
    }
  }

  if (uShowGrid) {
    vec2 gridUv = fract(vUv * uGridSize);
    float gridLine = step(0.95, gridUv.x) + step(0.95, gridUv.y);
    color = mix(color, uSecondaryColor, gridLine * 0.3);
  }

  color += uSecondaryColor * fresnel * 0.5;

  float alpha = uOpacity * (0.3 + 0.7 * fresnel);

  gl_FragColor = vec4(color, alpha);
}
`;

// Heatmap shader for temperature/stress visualization
const HEATMAP_VERTEX = `
attribute float aValue;

varying float vValue;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vValue = aValue;
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const HEATMAP_FRAGMENT = `
uniform float uMinValue;
uniform float uMaxValue;
uniform float uOpacity;
uniform int uColorMap;
uniform bool uShowContours;
uniform float uContourInterval;
uniform vec3 uContourColor;
uniform float uTime;
uniform bool uAnimated;

varying float vValue;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

// Jet colormap (blue -> cyan -> green -> yellow -> red)
vec3 jetColorMap(float t) {
  float r = clamp(1.5 - abs(4.0 * t - 3.0), 0.0, 1.0);
  float g = clamp(1.5 - abs(4.0 * t - 2.0), 0.0, 1.0);
  float b = clamp(1.5 - abs(4.0 * t - 1.0), 0.0, 1.0);
  return vec3(r, g, b);
}

// Viridis colormap (perceptually uniform)
vec3 viridisColorMap(float t) {
  const vec3 c0 = vec3(0.267004, 0.004874, 0.329415);
  const vec3 c1 = vec3(0.282327, 0.140926, 0.457517);
  const vec3 c2 = vec3(0.127568, 0.566949, 0.550556);
  const vec3 c3 = vec3(0.369214, 0.788888, 0.382914);
  const vec3 c4 = vec3(0.993248, 0.906157, 0.143936);

  if (t < 0.25) return mix(c0, c1, t * 4.0);
  if (t < 0.5) return mix(c1, c2, (t - 0.25) * 4.0);
  if (t < 0.75) return mix(c2, c3, (t - 0.5) * 4.0);
  return mix(c3, c4, (t - 0.75) * 4.0);
}

// Plasma colormap
vec3 plasmaColorMap(float t) {
  const vec3 c0 = vec3(0.050383, 0.029803, 0.527975);
  const vec3 c1 = vec3(0.494877, 0.012279, 0.657865);
  const vec3 c2 = vec3(0.798216, 0.280197, 0.469538);
  const vec3 c3 = vec3(0.973416, 0.585761, 0.254154);
  const vec3 c4 = vec3(0.940015, 0.975158, 0.131326);

  if (t < 0.25) return mix(c0, c1, t * 4.0);
  if (t < 0.5) return mix(c1, c2, (t - 0.25) * 4.0);
  if (t < 0.75) return mix(c2, c3, (t - 0.5) * 4.0);
  return mix(c3, c4, (t - 0.75) * 4.0);
}

// Turbo colormap
vec3 turboColorMap(float t) {
  const vec3 c0 = vec3(0.18995, 0.07176, 0.23217);
  const vec3 c1 = vec3(0.28549, 0.55959, 0.96663);
  const vec3 c2 = vec3(0.49544, 0.91066, 0.50488);
  const vec3 c3 = vec3(0.97274, 0.69478, 0.21122);
  const vec3 c4 = vec3(0.64362, 0.04309, 0.05761);

  if (t < 0.25) return mix(c0, c1, t * 4.0);
  if (t < 0.5) return mix(c1, c2, (t - 0.25) * 4.0);
  if (t < 0.75) return mix(c2, c3, (t - 0.5) * 4.0);
  return mix(c3, c4, (t - 0.75) * 4.0);
}

// Grayscale
vec3 grayscaleColorMap(float t) {
  return vec3(t);
}

// Thermal colormap (black -> red -> yellow -> white)
vec3 thermalColorMap(float t) {
  if (t < 0.33) return mix(vec3(0.0), vec3(1.0, 0.0, 0.0), t * 3.0);
  if (t < 0.66) return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), (t - 0.33) * 3.0);
  return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (t - 0.66) * 3.0);
}

vec3 getColor(float t) {
  if (uColorMap == 0) return jetColorMap(t);
  if (uColorMap == 1) return viridisColorMap(t);
  if (uColorMap == 2) return plasmaColorMap(t);
  if (uColorMap == 3) return turboColorMap(t);
  if (uColorMap == 4) return grayscaleColorMap(t);
  if (uColorMap == 5) return thermalColorMap(t);
  return jetColorMap(t);
}

void main() {
  // Normalize value to 0-1 range
  float normalizedValue = clamp((vValue - uMinValue) / (uMaxValue - uMinValue), 0.0, 1.0);

  // Animation effect
  float animOffset = 0.0;
  if (uAnimated) {
    animOffset = sin(uTime * 2.0 + vUv.x * 10.0 + vUv.y * 10.0) * 0.05;
  }

  // Get base color from colormap
  vec3 color = getColor(clamp(normalizedValue + animOffset, 0.0, 1.0));

  // Contour lines
  if (uShowContours && uContourInterval > 0.0) {
    float contourValue = mod(vValue, uContourInterval);
    float contourWidth = uContourInterval * 0.03;
    if (contourValue < contourWidth || contourValue > uContourInterval - contourWidth) {
      color = uContourColor;
    }
  }

  // Simple lighting
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  vec3 viewDir = normalize(vViewPosition);
  vec3 halfDir = normalize(lightDir + viewDir);
  float specular = pow(max(dot(vNormal, halfDir), 0.0), 32.0);

  vec3 finalColor = color * (0.4 + 0.5 * diffuse) + vec3(0.2) * specular;

  gl_FragColor = vec4(finalColor, uOpacity);
}
`;

// ============================================================================
// Industrial Material Presets
// ============================================================================

/**
 * Industrial material preset configurations
 */
export const INDUSTRIAL_MATERIAL_PRESETS: Record<
  IndustrialMaterialType,
  Omit<IndustrialMaterialConfig, 'type'>
> = {
  steel: {
    color: '#8c8c8c',
    roughness: 0.4,
    metalness: 0.9,
    envMapIntensity: 1.0,
  },
  aluminum: {
    color: '#d4d4d4',
    roughness: 0.3,
    metalness: 0.8,
    envMapIntensity: 0.8,
  },
  'carbon-fiber': {
    color: '#2a2a2a',
    roughness: 0.6,
    metalness: 0.2,
    envMapIntensity: 0.5,
  },
  rubber: {
    color: '#1a1a1a',
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0.1,
  },
  plastic: {
    color: '#e0e0e0',
    roughness: 0.5,
    metalness: 0.0,
    envMapIntensity: 0.3,
  },
  glass: {
    color: '#ffffff',
    roughness: 0.0,
    metalness: 0.0,
    envMapIntensity: 1.0,
  },
  copper: {
    color: '#b87333',
    roughness: 0.3,
    metalness: 0.95,
    envMapIntensity: 1.2,
  },
  brass: {
    color: '#d4af37',
    roughness: 0.35,
    metalness: 0.9,
    envMapIntensity: 1.0,
  },
  chrome: {
    color: '#e8e8e8',
    roughness: 0.1,
    metalness: 1.0,
    envMapIntensity: 1.5,
  },
  'painted-metal': {
    color: '#4a90d9',
    roughness: 0.5,
    metalness: 0.3,
    envMapIntensity: 0.5,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
  },
  anodized: {
    color: '#3a3a3a',
    roughness: 0.4,
    metalness: 0.6,
    envMapIntensity: 0.7,
  },
  galvanized: {
    color: '#9a9a9a',
    roughness: 0.5,
    metalness: 0.7,
    envMapIntensity: 0.6,
  },
};

// ============================================================================
// Material Library Class
// ============================================================================

/**
 * MaterialLibrary - Registry for custom shader materials
 *
 * Provides creation and management of custom materials for industrial
 * robotics visualization including distance fields, flow lines, heatmaps,
 * x-ray views, and holographic effects.
 */
export class MaterialLibrary {
  private static instance: MaterialLibrary;
  private shaderRegistry: Map<string, ShaderMaterialDefinition> = new Map();
  private materialCache: Map<string, THREE.ShaderMaterial> = new Map();
  private clock: THREE.Clock;

  private constructor() {
    this.clock = new THREE.Clock();
    this.registerBuiltInShaders();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MaterialLibrary {
    if (!MaterialLibrary.instance) {
      MaterialLibrary.instance = new MaterialLibrary();
    }
    return MaterialLibrary.instance;
  }

  /**
   * Register built-in shader definitions
   */
  private registerBuiltInShaders(): void {
    // Distance Field shader
    this.registerShader({
      id: 'distance-field',
      name: 'Distance Field',
      vertexShader: DISTANCE_FIELD_VERTEX,
      fragmentShader: DISTANCE_FIELD_FRAGMENT,
      uniforms: {
        uMinDistance: { value: 0.0 },
        uMaxDistance: { value: 1.0 },
        uSafeColor: { value: new THREE.Color('#00ff88') },
        uWarningColor: { value: new THREE.Color('#ffaa00') },
        uDangerColor: { value: new THREE.Color('#ff4444') },
        uOpacity: { value: 0.7 },
        uPulseSpeed: { value: 3.0 },
        uTime: { value: 0 },
      },
      transparent: true,
    });

    // Flow Line shader
    this.registerShader({
      id: 'flow-line',
      name: 'Flow Line',
      vertexShader: FLOW_LINE_VERTEX,
      fragmentShader: FLOW_LINE_FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color('#00ff88') },
        uSecondaryColor: { value: new THREE.Color('#0088ff') },
        uOpacity: { value: 1.0 },
        uTime: { value: 0 },
        uSpeed: { value: 0.5 },
        uDashLength: { value: 0.1 },
        uGapLength: { value: 0.05 },
        uFlowDirection: { value: 1.0 },
        uGradient: { value: false },
        uGlowIntensity: { value: 0.3 },
      },
      transparent: true,
    });

    // X-Ray shader
    this.registerShader({
      id: 'xray',
      name: 'X-Ray',
      vertexShader: XRAY_VERTEX,
      fragmentShader: XRAY_FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color('#00aaff') },
        uEdgeColor: { value: new THREE.Color('#ffffff') },
        uOpacity: { value: 0.6 },
        uEdgeIntensity: { value: 1.0 },
        uFresnelPower: { value: 2.0 },
        uInvertFresnel: { value: false },
        uTime: { value: 0 },
        uAnimated: { value: false },
      },
      transparent: true,
      depthWrite: false,
    });

    // Hologram shader
    this.registerShader({
      id: 'hologram',
      name: 'Hologram',
      vertexShader: HOLOGRAM_VERTEX,
      fragmentShader: HOLOGRAM_FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color('#00ffff') },
        uSecondaryColor: { value: new THREE.Color('#ffffff') },
        uOpacity: { value: 0.7 },
        uTime: { value: 0 },
        uScanlineSpeed: { value: 0.5 },
        uScanlineCount: { value: 50 },
        uScanlineIntensity: { value: 0.3 },
        uFlickerSpeed: { value: 1.0 },
        uFlickerIntensity: { value: 0.1 },
        uGlitchIntensity: { value: 0.05 },
        uShowGrid: { value: true },
        uGridSize: { value: 20 },
        uFresnelPower: { value: 2.0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Heatmap shader for temperature/stress visualization
    this.registerShader({
      id: 'heatmap',
      name: 'Heatmap',
      vertexShader: HEATMAP_VERTEX,
      fragmentShader: HEATMAP_FRAGMENT,
      uniforms: {
        uMinValue: { value: 0.0 },
        uMaxValue: { value: 1.0 },
        uOpacity: { value: 1.0 },
        uColorMap: { value: 0 }, // 0=jet, 1=viridis, 2=plasma, 3=turbo, 4=grayscale, 5=thermal
        uShowContours: { value: false },
        uContourInterval: { value: 0.1 },
        uContourColor: { value: new THREE.Color('#000000') },
        uTime: { value: 0 },
        uAnimated: { value: false },
      },
      transparent: true,
    });
  }

  /**
   * Register a custom shader
   */
  registerShader(definition: ShaderMaterialDefinition): void {
    this.shaderRegistry.set(definition.id, definition);
  }

  /**
   * Get a shader definition by ID
   */
  getShaderDefinition(id: string): ShaderMaterialDefinition | undefined {
    return this.shaderRegistry.get(id);
  }

  /**
   * Create a shader material instance
   */
  createShaderMaterial(
    shaderId: string,
    params?: Record<string, unknown>
  ): THREE.ShaderMaterial | null {
    const definition = this.shaderRegistry.get(shaderId);
    if (!definition) {
      console.warn(`Shader not found: ${shaderId}`);
      return null;
    }

    // Clone uniforms to avoid shared state
    const uniforms: Record<string, THREE.IUniform> = {};
    for (const [key, uniform] of Object.entries(definition.uniforms)) {
      if (uniform.value instanceof THREE.Color) {
        uniforms[key] = { value: uniform.value.clone() };
      } else if (uniform.value instanceof THREE.Vector2) {
        uniforms[key] = { value: uniform.value.clone() };
      } else if (uniform.value instanceof THREE.Vector3) {
        uniforms[key] = { value: uniform.value.clone() };
      } else if (uniform.value instanceof THREE.Vector4) {
        uniforms[key] = { value: uniform.value.clone() };
      } else if (uniform.value instanceof THREE.Matrix3) {
        uniforms[key] = { value: uniform.value.clone() };
      } else if (uniform.value instanceof THREE.Matrix4) {
        uniforms[key] = { value: uniform.value.clone() };
      } else {
        uniforms[key] = { value: uniform.value };
      }
    }

    // Apply custom parameters
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (uniforms[key]) {
          if (typeof value === 'string' && uniforms[key].value instanceof THREE.Color) {
            uniforms[key].value = new THREE.Color(value);
          } else {
            uniforms[key].value = value;
          }
        }
      }
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: definition.vertexShader,
      fragmentShader: definition.fragmentShader,
      uniforms,
      defines: definition.defines ?? {},
      transparent: definition.transparent ?? false,
      depthWrite: definition.depthWrite ?? true,
      depthTest: definition.depthTest ?? true,
      side: definition.side ?? THREE.FrontSide,
    });

    return material;
  }

  /**
   * Create an industrial material based on preset
   */
  createIndustrialMaterial(
    config: IndustrialMaterialConfig
  ): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
    const preset = INDUSTRIAL_MATERIAL_PRESETS[config.type];

    // Use MeshPhysicalMaterial if clearcoat is needed
    if (preset.clearcoat || config.clearcoat) {
      return new THREE.MeshPhysicalMaterial({
        color: config.color ?? preset.color,
        roughness: config.roughness ?? preset.roughness ?? 0.5,
        metalness: config.metalness ?? preset.metalness ?? 0.5,
        envMapIntensity: config.envMapIntensity ?? preset.envMapIntensity ?? 1.0,
        clearcoat: config.clearcoat ?? preset.clearcoat ?? 0,
        clearcoatRoughness:
          config.clearcoatRoughness ?? preset.clearcoatRoughness ?? 0,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: config.color ?? preset.color,
      roughness: config.roughness ?? preset.roughness ?? 0.5,
      metalness: config.metalness ?? preset.metalness ?? 0.5,
      envMapIntensity: config.envMapIntensity ?? preset.envMapIntensity ?? 1.0,
    });
  }

  /**
   * Create a distance field material for collision visualization
   */
  createDistanceFieldMaterial(params?: {
    minDistance?: number;
    maxDistance?: number;
    safeColor?: string;
    warningColor?: string;
    dangerColor?: string;
    opacity?: number;
    pulseSpeed?: number;
  }): THREE.ShaderMaterial | null {
    return this.createShaderMaterial('distance-field', {
      uMinDistance: params?.minDistance ?? 0,
      uMaxDistance: params?.maxDistance ?? 1,
      uSafeColor: params?.safeColor ?? '#00ff88',
      uWarningColor: params?.warningColor ?? '#ffaa00',
      uDangerColor: params?.dangerColor ?? '#ff4444',
      uOpacity: params?.opacity ?? 0.7,
      uPulseSpeed: params?.pulseSpeed ?? 3,
    });
  }

  /**
   * Create a flow line material for trajectory visualization
   */
  createFlowLineMaterial(params?: {
    color?: string;
    secondaryColor?: string;
    opacity?: number;
    speed?: number;
    dashLength?: number;
    gapLength?: number;
    flowDirection?: number;
    gradient?: boolean;
    glowIntensity?: number;
  }): THREE.ShaderMaterial | null {
    return this.createShaderMaterial('flow-line', {
      uColor: params?.color ?? '#00ff88',
      uSecondaryColor: params?.secondaryColor ?? '#0088ff',
      uOpacity: params?.opacity ?? 1,
      uSpeed: params?.speed ?? 0.5,
      uDashLength: params?.dashLength ?? 0.1,
      uGapLength: params?.gapLength ?? 0.05,
      uFlowDirection: params?.flowDirection ?? 1,
      uGradient: params?.gradient ?? false,
      uGlowIntensity: params?.glowIntensity ?? 0.3,
    });
  }

  /**
   * Create an X-Ray material for see-through visualization
   */
  createXRayMaterial(params?: {
    color?: string;
    edgeColor?: string;
    opacity?: number;
    edgeIntensity?: number;
    fresnelPower?: number;
    animated?: boolean;
  }): THREE.ShaderMaterial | null {
    return this.createShaderMaterial('xray', {
      uColor: params?.color ?? '#00aaff',
      uEdgeColor: params?.edgeColor ?? '#ffffff',
      uOpacity: params?.opacity ?? 0.6,
      uEdgeIntensity: params?.edgeIntensity ?? 1,
      uFresnelPower: params?.fresnelPower ?? 2,
      uAnimated: params?.animated ?? false,
    });
  }

  /**
   * Create a hologram material for futuristic visualization
   */
  createHologramMaterial(params?: {
    color?: string;
    secondaryColor?: string;
    opacity?: number;
    scanlineSpeed?: number;
    scanlineCount?: number;
    scanlineIntensity?: number;
    flickerIntensity?: number;
    glitchIntensity?: number;
    showGrid?: boolean;
    gridSize?: number;
  }): THREE.ShaderMaterial | null {
    return this.createShaderMaterial('hologram', {
      uColor: params?.color ?? '#00ffff',
      uSecondaryColor: params?.secondaryColor ?? '#ffffff',
      uOpacity: params?.opacity ?? 0.7,
      uScanlineSpeed: params?.scanlineSpeed ?? 0.5,
      uScanlineCount: params?.scanlineCount ?? 50,
      uScanlineIntensity: params?.scanlineIntensity ?? 0.3,
      uFlickerIntensity: params?.flickerIntensity ?? 0.1,
      uGlitchIntensity: params?.glitchIntensity ?? 0.05,
      uShowGrid: params?.showGrid ?? true,
      uGridSize: params?.gridSize ?? 20,
    });
  }

  /**
   * Create a heatmap material for temperature/stress visualization
   *
   * @example
   * ```typescript
   * const material = getMaterialLibrary().createHeatmapMaterial({
   *   minValue: 0,
   *   maxValue: 100,
   *   colorMap: 'thermal',
   *   showContours: true,
   *   contourInterval: 10,
   * });
   * ```
   */
  createHeatmapMaterial(params?: {
    /** Minimum value in the data range */
    minValue?: number;
    /** Maximum value in the data range */
    maxValue?: number;
    /** Opacity of the material (0-1) */
    opacity?: number;
    /** Color map preset: 'jet' | 'viridis' | 'plasma' | 'turbo' | 'grayscale' | 'thermal' */
    colorMap?: 'jet' | 'viridis' | 'plasma' | 'turbo' | 'grayscale' | 'thermal';
    /** Whether to show contour lines */
    showContours?: boolean;
    /** Interval between contour lines (in data units) */
    contourInterval?: number;
    /** Color of contour lines */
    contourColor?: string;
    /** Whether to animate the heatmap */
    animated?: boolean;
  }): THREE.ShaderMaterial | null {
    const colorMapIndex: Record<string, number> = {
      jet: 0,
      viridis: 1,
      plasma: 2,
      turbo: 3,
      grayscale: 4,
      thermal: 5,
    };

    return this.createShaderMaterial('heatmap', {
      uMinValue: params?.minValue ?? 0,
      uMaxValue: params?.maxValue ?? 1,
      uOpacity: params?.opacity ?? 1,
      uColorMap: colorMapIndex[params?.colorMap ?? 'jet'] ?? 0,
      uShowContours: params?.showContours ?? false,
      uContourInterval: params?.contourInterval ?? 0.1,
      uContourColor: params?.contourColor ?? '#000000',
      uAnimated: params?.animated ?? false,
    });
  }

  /**
   * Apply heatmap values to a geometry
   * Creates or updates the 'aValue' attribute on the geometry
   */
  applyHeatmapValues(
    geometry: THREE.BufferGeometry,
    values: Float32Array | number[]
  ): void {
    const valueArray = values instanceof Float32Array ? values : new Float32Array(values);
    geometry.setAttribute('aValue', new THREE.BufferAttribute(valueArray, 1));
  }

  /**
   * Generate heatmap values based on a function
   * Useful for creating procedural heatmaps
   */
  generateHeatmapValues(
    geometry: THREE.BufferGeometry,
    valueFn: (x: number, y: number, z: number, index: number) => number
  ): Float32Array {
    const positions = geometry.getAttribute('position');
    const values = new Float32Array(positions.count);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      values[i] = valueFn(x, y, z, i);
    }

    this.applyHeatmapValues(geometry, values);
    return values;
  }

  /**
   * Update time-based uniforms for animated materials
   */
  updateTime(material: THREE.ShaderMaterial): void {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = this.clock.getElapsedTime();
    }
  }

  /**
   * Get all registered shader IDs
   */
  getRegisteredShaders(): string[] {
    return Array.from(this.shaderRegistry.keys());
  }

  /**
   * Clear material cache
   */
  clearCache(): void {
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();
  }
}

// Export singleton accessor
export function getMaterialLibrary(): MaterialLibrary {
  return MaterialLibrary.getInstance();
}

export default MaterialLibrary;
