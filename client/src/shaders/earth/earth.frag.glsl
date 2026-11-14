#include ../shared/noise.glsl;
#include ../shared/geo.glsl;

uniform float uTime;
uniform vec3 uSunDir;
uniform float uTension;
uniform sampler2D uEarthMap;
uniform float uLandReady;
uniform vec3 uOceanDeep;
uniform vec3 uOceanShallow;
uniform vec3 uLandNight;
uniform vec3 uLandDay;
uniform vec3 uIce;
uniform vec3 uRim;

varying vec3 vNormalW;
varying vec3 vViewDir;

/**
 * The planet surface. Geography comes from the baked map (real coastlines);
 * the shader only adds lighting and a single octave of fine grain.
 *
 * Lighting reads like an orbital photo graded for night: lit hemisphere
 * from the real subsolar point, ocean glint, a warm dusk tint near the
 * terminator, a cool fresnel rim against space.
 */
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);
  vec3 S = normalize(uSunDir);

  float ndl = dot(N, S);
  float dayMix = smoothstep(-0.06, 0.30, ndl);
  float lambert = 0.30 + 0.70 * clamp(ndl, 0.0, 1.0);

  vec4 map = texture2D(uEarthMap, earthUv(N));
  float land = map.r * uLandReady;
  float coast = map.g * uLandReady;

  float grain = snoise(N * 22.0) * 0.5 + 0.5;
  float absLat = abs(N.y);

  // Ocean: deep base brightening toward coastlines (continental shelves).
  float shelf = smoothstep(0.04, 0.55, coast) * (1.0 - land);
  vec3 ocean = mix(uOceanDeep, uOceanShallow, 0.12 + shelf * 0.7);

  // Land: grain + latitude grading, ice toward the poles.
  vec3 landCol = mix(uLandDay * 0.78, uLandDay * 1.12, grain);
  landCol = mix(landCol, uIce, smoothstep(0.80, 0.93, absLat));

  // A faint lit edge along shorelines so continents read at a glance.
  float shore = land * (1.0 - smoothstep(0.35, 0.8, coast));

  vec3 dayCol = mix(ocean, landCol, land) * lambert;
  dayCol += uRim * shore * 0.10;

  // Sunrise/sunset: warm the lit surface near the terminator (a tint, not a
  // glowing stripe, so close-ups don't get an orange band across them).
  float dusk = smoothstep(0.38, 0.0, ndl) * smoothstep(-0.06, 0.04, ndl);
  dayCol *= mix(vec3(1.0), vec3(1.25, 0.86, 0.66), dusk * 0.75);

  // Sun glint on open water (Blinn-Phong half vector).
  vec3 H = normalize(S + V);
  float glint = pow(max(dot(N, H), 0.0), 140.0) * (1.0 - land);
  dayCol += vec3(0.70, 0.82, 1.0) * glint * 0.8 * dayMix;

  vec3 nightCol = mix(uOceanDeep * 0.30, uLandNight, land) + uRim * shore * 0.05;

  vec3 surface = mix(nightCol, dayCol, dayMix);

  // Fresnel rim against space; tension warms it slightly.
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 rim = uRim * fres * (0.55 + 0.5 * uTension);

  // No additive line on the terminator: output is sRGB-encoded, so even a
  // 0.035 linear add reads as a ~20% bright orange stripe over the dark
  // night ocean. The dusk tint above carries sunrise and sunset.
  gl_FragColor = vec4(surface + rim, 1.0);
}
