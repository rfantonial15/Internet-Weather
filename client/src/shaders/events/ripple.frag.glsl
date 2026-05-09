varying float vAge;
varying float vIntensity;
varying vec3 vColor;
varying vec2 vUv;

void main() {
  // Distance-from-center ring with feathered edge.
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;

  // Ring lives at this radius and thins as it expands.
  float ringR = 0.55 + vAge * 0.4;
  float thickness = mix(0.18, 0.04, vAge);
  float ring = smoothstep(thickness, 0.0, abs(r - ringR));

  // Fade out across lifetime.
  float fade = 1.0 - vAge;
  float a = ring * fade * (0.4 + vIntensity * 0.8);

  vec3 col = vColor * (1.5 + vIntensity);
  gl_FragColor = vec4(col, a);
}
