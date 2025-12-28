// Hologram Shader for Futuristic HMI Visualization
// Creates a sci-fi holographic appearance

// ============================================================================
// Vertex Shader
// ============================================================================

#ifdef VERTEX_SHADER

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

#endif

// ============================================================================
// Fragment Shader
// ============================================================================

#ifdef FRAGMENT_SHADER

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

// Pseudo-random function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  // Base Fresnel edge glow
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower);

  // Base color with fresnel rim
  vec3 color = mix(uColor, uSecondaryColor, fresnel);

  // Scanlines
  float scanline = sin((vWorldPosition.y + uTime * uScanlineSpeed) * uScanlineCount * 6.28) * 0.5 + 0.5;
  scanline = pow(scanline, 2.0);
  color *= 1.0 - scanline * uScanlineIntensity;

  // Flicker effect
  float flicker = 1.0 - uFlickerIntensity * 0.5 * (1.0 + sin(uTime * uFlickerSpeed * 20.0));
  color *= flicker;

  // Glitch effect
  if (uGlitchIntensity > 0.0) {
    float glitchTime = floor(uTime * 10.0);
    float glitch = random(vec2(glitchTime, vUv.y));
    if (glitch > 1.0 - uGlitchIntensity * 0.1) {
      float offset = random(vec2(glitchTime, 0.0)) * 2.0 - 1.0;
      color = mix(color, uSecondaryColor, abs(offset));
    }
  }

  // Grid overlay
  if (uShowGrid) {
    vec2 gridUv = fract(vUv * uGridSize);
    float gridLine = step(0.95, gridUv.x) + step(0.95, gridUv.y);
    color = mix(color, uSecondaryColor, gridLine * 0.3);
  }

  // Add glow
  color += uSecondaryColor * fresnel * 0.5;

  // Alpha based on fresnel and base opacity
  float alpha = uOpacity * (0.3 + 0.7 * fresnel);

  gl_FragColor = vec4(color, alpha);
}

#endif
