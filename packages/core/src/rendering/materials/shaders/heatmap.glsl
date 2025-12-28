// Heatmap Shader for Temperature/Stress Visualization
// Maps scalar values to color gradients

// ============================================================================
// Vertex Shader
// ============================================================================

#ifdef VERTEX_SHADER

attribute float aValue;  // Scalar value per vertex

varying float vValue;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vValue = aValue;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}

#endif

// ============================================================================
// Fragment Shader
// ============================================================================

#ifdef FRAGMENT_SHADER

uniform float uMinValue;
uniform float uMaxValue;
uniform float uOpacity;
uniform int uColorMap;  // 0=jet, 1=viridis, 2=plasma, 3=turbo, 4=grayscale
uniform bool uShowContours;
uniform float uContourInterval;
uniform vec3 uContourColor;

varying float vValue;
varying vec3 vNormal;
varying vec3 vViewPosition;

// Jet colormap
vec3 jetColorMap(float t) {
  float r = clamp(1.5 - abs(4.0 * t - 3.0), 0.0, 1.0);
  float g = clamp(1.5 - abs(4.0 * t - 2.0), 0.0, 1.0);
  float b = clamp(1.5 - abs(4.0 * t - 1.0), 0.0, 1.0);
  return vec3(r, g, b);
}

// Viridis colormap (approximation)
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

// Plasma colormap (approximation)
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

// Turbo colormap (approximation)
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

vec3 getColor(float t) {
  if (uColorMap == 0) return jetColorMap(t);
  if (uColorMap == 1) return viridisColorMap(t);
  if (uColorMap == 2) return plasmaColorMap(t);
  if (uColorMap == 3) return turboColorMap(t);
  return grayscaleColorMap(t);
}

void main() {
  // Normalize value to 0-1 range
  float normalizedValue = clamp((vValue - uMinValue) / (uMaxValue - uMinValue), 0.0, 1.0);

  // Get base color from colormap
  vec3 color = getColor(normalizedValue);

  // Contour lines
  if (uShowContours) {
    float contourValue = mod(vValue, uContourInterval);
    float contourWidth = uContourInterval * 0.02;
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

#endif
