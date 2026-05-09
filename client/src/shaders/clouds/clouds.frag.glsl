#include ../shared/noise.glsl;

uniform float uTime;
uniform float uSunYaw;
uniform float uTension;
uniform vec3 uDayColor;
uniform vec3 uNightColor;
uniform vec3 uTenseColor;

varying vec3 vNormalW;
varying vec3 vViewDir;

/**
 * Subtle scrolling cloud band. Two octaves of fbm drift in opposite
 * directions to break up obvious tiling; the result is masked by latitude
 * (denser at low/mid latitudes, thin at the poles) and shaded by the same
 * sun direction as the planet so day/night reads consistently.
 *
 * Rendered additive over the surface — kept low-alpha on purpose. Clouds
 * should suggest atmosphere, never obscure the planet underneath.
 */
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);

  vec3 sunDir = normalize(vec3(cos(uSunYaw), 0.25, sin(uSunYaw)));
  float ndl = dot(N, sunDir);
  float dayMix = smoothstep(-0.05, 0.45, ndl);

  // Two scrolling octaves drifting in opposite directions.
  vec3 p1 = N * 2.4 + vec3(uTime * 0.018, 0.0, uTime * 0.011);
  vec3 p2 = N * 6.5 - vec3(uTime * 0.035, 0.0, uTime * 0.020);
  float n = fbm(p1) * 0.65 + fbm(p2) * 0.35;
  float density = smoothstep(0.05, 0.55, n);

  // Latitude mask: more cloud at equator, less at poles.
  float lat = abs(N.y);
  float latMask = smoothstep(0.95, 0.25, lat);
  density *= latMask;

  // Shading: bright on day side, deep blue on night side, slight magenta
  // tint when global tension rises — keeps the cloud system visually tied to
  // the rest of the world's mood.
  vec3 lit = mix(uNightColor, uDayColor, dayMix);
  vec3 col = mix(lit, uTenseColor, uTension * 0.35);

  // Soft limb darkening — clouds at the rim shouldn't punch through
  // atmosphere. Avoids a halo collision.
  float ndv = max(dot(N, V), 0.0);
  float limbFade = smoothstep(0.0, 0.35, ndv);

  float alpha = density * 0.55 * limbFade;
  gl_FragColor = vec4(col, alpha);
}
