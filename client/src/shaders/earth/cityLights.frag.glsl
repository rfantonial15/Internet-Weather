#include ../shared/geo.glsl;

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

  float shimmer = 0.82 + 0.18 * sin(uTime * 1.3 + dot(N, vec3(41.3, 77.1, 23.9)));

  float lon = atan(N.z, N.x);
  float wave = 0.5 + 0.5 * sin(lon * 3.0 + uTime * 0.35);
  wave *= 0.5 + 0.5 * sin(N.y * 4.0 - uTime * 0.22);
  float pulse = wave * wave * wave;

  float energy = lights * shimmer * (1.0 + pulse * 0.9 + uBuildPulse * 1.6);
  float heat = clamp(pulse * 0.45 + uBuildPulse * 0.6, 0.0, 1.0);
  vec3 col = mix(uWarm, uHot, heat * 0.5) * energy;

  gl_FragColor = vec4(col * night, clamp(energy * night, 0.0, 1.0));
}
