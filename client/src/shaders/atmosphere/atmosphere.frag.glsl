uniform vec3 uColorInner;
uniform vec3 uColorOuter;
uniform vec3 uColorWarm;
uniform vec3 uColorTense;
uniform float uTension;
uniform float uTime;
uniform float uSunYaw;

varying vec3 vNormalW;
varying vec3 vViewDir;

/**
 * Cinematic atmospheric scattering, fake-volumetric.
 *
 * We render the back faces of a sphere slightly larger than the planet and
 * blend three view-angle bands:
 *   - far rim       → deep cyan/blue (Rayleigh-ish)
 *   - mid altitude  → soft inner blue
 *   - near limb     → bright halo (Mie-ish forward-scatter)
 *
 * The sun direction modulates the whole thing: where the limb faces the sun,
 * we blend a warm orange (the "Earth-from-ISS" sunlit edge). Tension shifts
 * the inner band toward magenta without ever fully losing the cyan rim, so
 * the planet always reads as a planet — never as pure light.
 */
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);

  // Inverted because we're inside-out (BackSide rendering).
  float ndv = max(dot(N, -V), 0.0);
  float fres = pow(1.0 - ndv, 2.0);
  float halo = pow(fres, 1.5);
  float limb = pow(fres, 5.0);

  // Sun direction must match the earth shader so terminator scattering aligns.
  vec3 sunDir = normalize(vec3(cos(uSunYaw), 0.25, sin(uSunYaw)));
  float sunDot = dot(N, sunDir);
  float sunFactor = smoothstep(-0.35, 0.55, sunDot);

  // Three-stop view-angle gradient.
  vec3 col = mix(uColorOuter, uColorInner, fres);
  col = mix(col, uColorInner * 1.6, limb);

  // Warm sunlit rim — strongest where the sun grazes the limb.
  float warm = limb * smoothstep(-0.05, 0.45, sunDot);
  col = mix(col, uColorWarm, warm * 0.75);

  // Tension drips magenta into the inner band on the day side only.
  vec3 tenseCol = mix(col, uColorTense, uTension * 0.55);
  col = mix(col, tenseCol, halo * sunFactor);

  // Slow planetary breathing — barely perceptible but reads alive.
  float breath = 0.92 + 0.08 * sin(uTime * 0.45);

  // Alpha: thicker at the limb, day-side biased so the night side fades.
  float alpha = halo * (0.35 + sunFactor * 0.85);
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(col * breath, alpha);
}
