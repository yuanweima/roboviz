// Distance Field Shader for Collision Proximity Visualization
// Shows gradient color based on distance to collision surfaces

// ============================================================================
// Vertex Shader
// ============================================================================

#ifdef VERTEX_SHADER

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

#endif

// ============================================================================
// Fragment Shader
// ============================================================================

#ifdef FRAGMENT_SHADER

uniform float uMinDistance;
uniform float uMaxDistance;
uniform vec3 uSafeColor;
uniform vec3 uWarningColor;
uniform vec3 uDangerColor;
uniform float uOpacity;
uniform float uPulseSpeed;
uniform float uTime;
uniform sampler2D uDistanceTexture;
uniform bool uUseTexture;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

// Color interpolation based on distance
vec3 getDistanceColor(float distance) {
  float normalizedDist = clamp((distance - uMinDistance) / (uMaxDistance - uMinDistance), 0.0, 1.0);

  // Three-way color blend: danger -> warning -> safe
  if (normalizedDist < 0.5) {
    return mix(uDangerColor, uWarningColor, normalizedDist * 2.0);
  } else {
    return mix(uWarningColor, uSafeColor, (normalizedDist - 0.5) * 2.0);
  }
}

void main() {
  float distance;

  if (uUseTexture) {
    // Sample distance from texture (for complex geometries)
    distance = texture2D(uDistanceTexture, vUv).r;
  } else {
    // Use world position Y as simple distance proxy
    // In real usage, this would be computed from actual collision geometry
    distance = length(vWorldPosition);
  }

  vec3 color = getDistanceColor(distance);

  // Pulse effect for warning/danger zones
  float pulse = 1.0;
  float normalizedDist = clamp((distance - uMinDistance) / (uMaxDistance - uMinDistance), 0.0, 1.0);
  if (normalizedDist < 0.5) {
    pulse = 0.8 + 0.2 * sin(uTime * uPulseSpeed * (1.0 - normalizedDist * 2.0));
  }

  // Basic lighting
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  vec3 finalColor = color * (0.5 + 0.5 * diffuse) * pulse;

  gl_FragColor = vec4(finalColor, uOpacity);
}

#endif
