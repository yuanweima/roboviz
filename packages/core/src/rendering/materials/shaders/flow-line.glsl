// Flow Line Shader for Trajectory Visualization
// Animated dashed line showing motion direction

// ============================================================================
// Vertex Shader
// ============================================================================

#ifdef VERTEX_SHADER

attribute float aLineProgress;  // 0-1 along the line

varying float vLineProgress;
varying vec3 vWorldPosition;

void main() {
  vLineProgress = aLineProgress;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
uniform float uSpeed;
uniform float uDashLength;
uniform float uGapLength;
uniform float uFlowDirection;  // 1.0 = forward, -1.0 = backward
uniform bool uGradient;
uniform float uGlowIntensity;

varying float vLineProgress;
varying vec3 vWorldPosition;

void main() {
  // Calculate dash pattern
  float totalLength = uDashLength + uGapLength;
  float animatedProgress = vLineProgress + uTime * uSpeed * uFlowDirection;
  float dashProgress = mod(animatedProgress, totalLength);

  // Dash visibility
  float dashAlpha = step(dashProgress, uDashLength);

  // Soft edges for dash
  float edgeSoftness = 0.05;
  float startFade = smoothstep(0.0, edgeSoftness, dashProgress);
  float endFade = smoothstep(uDashLength, uDashLength - edgeSoftness, dashProgress);
  dashAlpha *= startFade * endFade;

  // Color gradient along line
  vec3 color = uColor;
  if (uGradient) {
    color = mix(uSecondaryColor, uColor, vLineProgress);
  }

  // Glow effect
  float glow = uGlowIntensity * (0.5 + 0.5 * sin(uTime * 3.0 + vLineProgress * 6.28));
  color += color * glow;

  // Final alpha
  float alpha = uOpacity * dashAlpha;

  if (alpha < 0.01) discard;

  gl_FragColor = vec4(color, alpha);
}

#endif
