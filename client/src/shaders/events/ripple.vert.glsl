attribute float aBirth;
attribute float aIntensity;
attribute vec3 aColor;

varying float vAge;
varying float vIntensity;
varying vec3 vColor;
varying vec2 vUv;

uniform float uTime;
uniform float uLifespan;

void main() {
  vUv = uv;
  vColor = aColor;
  vIntensity = aIntensity;
  vAge = clamp((uTime - aBirth) / uLifespan, 0.0, 1.0);

  // Expand outward from center as the ripple ages.
  float scale = 0.05 + vAge * (0.6 + aIntensity * 0.8);
  vec3 p = position * scale;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
