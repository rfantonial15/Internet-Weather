uniform vec3 uColorInner;
uniform vec3 uColorOuter;
uniform vec3 uColorWarm;
uniform vec3 uColorTense;
uniform float uTension;
uniform float uTime;
uniform vec3 uSunDir;
uniform float uShellRadius;

varying vec3 vPosW;

/**
 * Limb glow, rendered on the back faces of a shell around the planet.
 *
 * For each fragment we take the view ray and find how close it passes to the
 * planet centre (impact parameter b). Rays that skim the surface (b near 1)
 * travel through the most air and glow brightest; the glow falls to zero at
 * the shell radius. Rays with b < 1 hit the planet, and the planet's depth
 * hides them. This gives a soft halo hugging the limb instead of a flat band.
 *
 * Colour: deep blue outside, cyan near the limb, warm where the limb faces
 * the sun, and a magenta cast on the day side as global tension rises.
 */
void main() {
  vec3 rayDir = normalize(vPosW - cameraPosition);
  float b = length(cross(cameraPosition, rayDir));
  float t = clamp((b - 1.0) / (uShellRadius - 1.0), 0.0, 1.0);

  float glow = pow(1.0 - t, 2.6);
  float core = pow(1.0 - t, 9.0);

  // Sun side of the limb: use the direction of the closest-approach point.
  vec3 closest = normalize(cameraPosition + rayDir * dot(-cameraPosition, rayDir));
  float sunDot = dot(closest, normalize(uSunDir));
  float day = smoothstep(-0.35, 0.5, sunDot);
  float warm = smoothstep(-0.15, 0.25, sunDot) * (1.0 - smoothstep(0.25, 0.75, sunDot));

  vec3 col = mix(uColorOuter, uColorInner, glow);
  col = mix(col, uColorInner * 1.4, core);
  col = mix(col, uColorWarm, warm * 0.55);
  col = mix(col, uColorTense, uTension * 0.45 * day * glow);

  float breath = 0.94 + 0.06 * sin(uTime * 0.45);
  float alpha = glow * (0.22 + 0.78 * day) * breath;

  gl_FragColor = vec4(col, alpha);
}
