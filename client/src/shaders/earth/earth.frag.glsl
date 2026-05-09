#include ../shared/noise.glsl;

uniform float uTime;
uniform float uSunYaw;
uniform float uTension;
uniform vec3 uOceanDeep;
uniform vec3 uOceanShallow;
uniform vec3 uLandNight;
uniform vec3 uLandDay;
uniform vec3 uRim;
uniform vec3 uTerminatorWarm;

varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vViewDir;
varying vec2 vUv;

/**
 * Procedural continents — fbm thresholded into a continent mask, plus a finer
 * detail octave that gives the surface micro-variation under bloom. Stylized,
 * not geographic; reads as "a planet with land" at orbital distances.
 */
float continentMask(vec3 p) {
  float n = fbm(p * 1.6);
  n += 0.4 * fbm(p * 4.2);
  return smoothstep(0.05, 0.35, n);
}

float surfaceDetail(vec3 p) {
  return fbm(p * 12.0) * 0.5 + 0.5;
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);

  vec3 sunDir = normalize(vec3(cos(uSunYaw), 0.25, sin(uSunYaw)));
  float ndl = dot(N, sunDir);
  float dayMix = smoothstep(-0.05, 0.45, ndl);

  float land = continentMask(N * 1.3);
  float detail = surfaceDetail(N);

  // Ocean: deep base + shallow shimmer + faint specular highlight where the
  // sun reflects toward the camera. Ocean is what sells "this is a planet".
  float shimmer = fbm(N * 8.0 + vec3(uTime * 0.05));
  vec3 oceanBase = mix(uOceanDeep, uOceanShallow, 0.35 + shimmer * 0.25);

  vec3 R = reflect(-sunDir, N);
  float spec = pow(max(dot(R, V), 0.0), 80.0);
  float oceanMask = 1.0 - land;
  vec3 oceanCol = oceanBase + vec3(0.7, 0.85, 1.0) * spec * 1.2 * oceanMask * dayMix;

  // Land: warm-tinted near sunlit areas, sliding toward muted blue at night.
  vec3 landDay = mix(uLandDay * 0.6, uLandDay, detail);
  vec3 landCol = mix(uLandNight * 0.5, landDay, dayMix);

  vec3 dayCol = mix(oceanCol, landCol, land);
  vec3 nightCol = mix(uOceanDeep * 0.35, uLandNight * 0.55, land);

  vec3 surface = mix(nightCol, dayCol, dayMix);

  // Latitude shading: faint cool tint at the poles.
  float polar = smoothstep(0.6, 0.95, abs(N.y));
  surface = mix(surface, surface * 1.2 + vec3(0.05, 0.1, 0.18), polar * dayMix * 0.4);

  // Fresnel rim — defines the planet silhouette against space.
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 rim = uRim * fres * (0.6 + 0.6 * uTension);

  // Terminator: warm sliver where day meets night. Slightly stronger now —
  // this is the line that cinematic Earth shots are famous for.
  float term = exp(-pow((ndl - 0.0) * 5.0, 2.0));
  vec3 terminator = uTerminatorWarm * term * 0.55;

  vec3 color = surface + rim + terminator;
  gl_FragColor = vec4(color, 1.0);
}
