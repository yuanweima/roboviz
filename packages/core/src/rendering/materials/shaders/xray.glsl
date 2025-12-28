// X-Ray Shader for See-Through Visualization
// Shows internal structure with edge enhancement

// ============================================================================
// Vertex Shader
// ============================================================================

#ifdef VERTEX_SHADER

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

#endif

// ============================================================================
// Fragment Shader
// ============================================================================

#ifdef FRAGMENT_SHADER

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
  // Calculate Fresnel effect (edge glow)
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));
  fresnel = pow(fresnel, uFresnelPower);

  if (uInvertFresnel) {
    fresnel = 1.0 - fresnel;
  }

  // Mix base color with edge color
  vec3 color = mix(uColor, uEdgeColor, fresnel * uEdgeIntensity);

  // Animated pulse effect
  float alpha = uOpacity;
  if (uAnimated) {
    float pulse = 0.8 + 0.2 * sin(uTime * 2.0 + vUv.y * 10.0);
    alpha *= pulse;
    color *= pulse;
  }

  // Edge-based transparency (more transparent in center)
  float edgeAlpha = mix(0.2, 1.0, fresnel);
  alpha *= edgeAlpha;

  gl_FragColor = vec4(color, alpha);
}

#endif
