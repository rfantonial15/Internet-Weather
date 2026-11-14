#include ../shared/geo.glsl;
#include ../shared/noise.glsl;

uniform float uTime;
uniform vec3 uSunDir;
uniform float uBuildPulse;
uniform sampler2D uEarthMap;
uniform float uLandReady;
uniform vec3 uWarm;
uniform vec3 uHot;

varying vec3 vNormalW;

/**
 * Night lights from the baked population map (blue channel), on the dark
 * hemisphere only. Three layers of motion on top:
 *   1. slow per-region shimmer      cities breathe out of phase
 *   2. travelling activity bands    waves sweep across the network
 *   3. uBuildPulse                  every city flares on a build/deploy event
 */
void main() {
  vec3 N = normalize(vNormalW);
  float ndl = dot(N, normalize(uSunDir));
  float night = smoothstep(0.10, -0.16, ndl);
  if (night < 0.002) discard;

  float raw = texture2D(uEarthMap, earthUv(N)).b * uLandReady;
  if (raw < 0.004) discard;
  // Lift faint countryside specks without blowing out the metro cores.
  float lights = pow(raw, 0.7);

  // Close-up detail: the 2048 px map turns a metro into one soft patch
  // when zoomed in, so break it into clusters of light. Faded out once a
  // noise cell is smaller than a pixel, where it would only shimmer.
  vec3 q = N * 150.0; // ~40 km cells
  float detail = 1.0 - smoothstep(0.2, 0.45, length(fwidth(q)));
  if (detail > 0.0) {
    float n = snoise(q) * 0.6 + snoise(q * 2.3) * 0.4;
    lights *= mix(1.0, 0.2 + smoothstep(-0.15, 0.55, n) * 1.15, detail);
  }

  float shimmer = 0.82 + 0.18 * sin(uTime * 1.3 + dot(N, vec3(41.3, 77.1, 23.9)));

  float lon = atan(N.z, N.x);
  float wave = 0.5 + 0.5 * sin(lon * 3.0 + uTime * 0.35);
  wave *= 0.5 + 0.5 * sin(N.y * 4.0 - uTime * 0.22);
  float pulse = wave * wave * wave;

  float energy = lights * shimmer * (1.0 + pulse * 0.9 + uBuildPulse * 1.6);
  // Soft ceiling. The target is a half-float buffer, so nothing clamps, and
  // additive blending squares the value (rgb * alpha): dense metro cores
  // reached 6-7x white and bloomed into flat orange blobs. 1 - exp(-x)
  // keeps faint lights linear and rolls the bright ones off smoothly.
  float e = 1.0 - exp(-energy * 1.4);
  float heat = clamp(pulse * 0.45 + uBuildPulse * 0.6, 0.0, 1.0);
  vec3 col = mix(uWarm, uHot, heat * 0.5) * e * 1.25;

  gl_FragColor = vec4(col * night, e * night);
}
