#include ../shared/noise.glsl;

uniform float uTime;
uniform float uSunYaw;
uniform float uBuildPulse;
uniform vec3 uWarm;
uniform vec3 uHot;

varying vec3 vNormalW;
varying vec3 vPosW;

/**
 * Constellations of warm pinpricks on the night side, threaded with
 * traveling waves of light — the "synapses fire across the network" effect.
 *
 * Three layered animations:
 *   1. Per-pixel hash flicker  → individual cities pulse asynchronously
 *   2. Slow latitudinal pulse  → bands of activity sweep east→west
 *   3. uBuildPulse global flash → every city brightens on a build event
 *
 * uHot is mixed in for the brightest peaks so high-energy moments shift
 * the city color from amber toward neon — supports the "nervous system"
 * read at peak load.
 */
void main() {
  vec3 N = normalize(vNormalW);
  vec3 sunDir = normalize(vec3(cos(uSunYaw), 0.25, sin(uSunYaw)));
  float ndl = dot(N, sunDir);
  float night = smoothstep(0.05, -0.2, ndl);
  if (night < 0.001) discard;

  // Population density: continents are noisy; cities are noisier.
  float continent = smoothstep(0.05, 0.35, fbm(N * 1.6) + 0.4 * fbm(N * 4.2));
  float density = pow(snoise(N * 60.0) * 0.5 + 0.5, 8.0);
  float cities = continent * density;

  // Per-city flicker — high-frequency hash so adjacent pixels desync.
  float flicker = 0.65 + 0.35 * sin(uTime * 2.0 + dot(N, vec3(123.4, 311.2, 91.7)));

  // Traveling longitudinal pulse — waves of activity sweeping the surface.
  float lon = atan(N.z, N.x);
  float wave = 0.5 + 0.5 * sin(lon * 3.0 + uTime * 0.35);
  wave *= 0.5 + 0.5 * sin(N.y * 4.0 - uTime * 0.22);
  float pulse = pow(wave, 3.0);

  // Composite intensity.
  float base = cities * flicker;
  float energetic = base * (1.0 + pulse * 1.4 + uBuildPulse * 1.8);

  // Color shifts toward hot/neon at peaks; cool amber at rest.
  float heat = clamp(pulse * 0.6 + uBuildPulse * 0.7, 0.0, 1.0);
  vec3 col = mix(uWarm, uHot, heat * 0.55);
  col *= energetic;

  gl_FragColor = vec4(col * night, energetic * night);
}
