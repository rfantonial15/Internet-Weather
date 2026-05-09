#include ../shared/noise.glsl;

uniform float uTime;
uniform float uTension;
uniform float uEnergy;
uniform vec3 uColorCool;
uniform vec3 uColorHot;

varying vec3 vNormalW;
varying vec3 vViewDir;

/**
 * "Nervous system of humanity."
 *
 * A flowing energy field laid over the populated regions of the planet.
 * Construction, top-down:
 *   1. A continent mask gates the entire effect to land — no neurons over
 *      open ocean (the network mirrors human density).
 *   2. A slow-drifting fbm field defines underlying flow direction.
 *   3. Two interfering sine bands sliced through that field produce thin
 *      filaments that read like axon bundles. Powering them sharpens the
 *      filaments into crisp neon traces.
 *   4. Brighter "node" hotspots emerge where high-frequency noise spikes —
 *      the synapses between filaments.
 *   5. uEnergy (driven by viral / news activity) thickens the filaments;
 *      uTension recolors them from cool cyan to hot magenta.
 *
 * Cost: one shell sphere, one fragment shader pass, no textures, no CPU.
 */

float continentMask(vec3 p) {
  float n = fbm(p * 1.6);
  n += 0.4 * fbm(p * 4.2);
  return smoothstep(0.05, 0.35, n);
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);

  float mask = continentMask(N * 1.3);
  if (mask < 0.02) discard;

  // Slow drifting flow field — defines the "grain" of the nervous system.
  float flow = fbm(N * 4.5 + vec3(0.0, uTime * 0.12, 0.0));

  // Two interfering bands → thin filaments along the flow.
  float band1 = sin(flow * 14.0 + uTime * 1.1);
  float band2 = sin(flow * 22.0 - uTime * 0.7);
  float filaments = pow(max(band1 * band2, 0.0), 5.0 - uEnergy * 1.5);

  // Synaptic nodes — bright sparks at high-frequency noise peaks.
  float nodeField = pow(snoise(N * 28.0) * 0.5 + 0.5, 16.0);
  float nodeFlicker = 0.5 + 0.5 * sin(uTime * 4.0 + dot(N, vec3(33.0, 71.0, 19.0)));
  float nodes = nodeField * nodeFlicker;

  float intensity = (filaments * 0.85 + nodes * 1.5) * mask;

  // Color: cool cyan at rest → hot magenta as tension rises.
  vec3 col = mix(uColorCool, uColorHot, uTension * 0.85);

  // Limb fade — don't bleed the network past the planet silhouette.
  float ndv = max(dot(N, V), 0.0);
  float limbFade = smoothstep(0.0, 0.25, ndv);

  float alpha = intensity * limbFade * (0.5 + uEnergy * 0.6);
  vec3 final = col * intensity * (1.4 + uEnergy * 0.8);

  gl_FragColor = vec4(final, alpha);
}
