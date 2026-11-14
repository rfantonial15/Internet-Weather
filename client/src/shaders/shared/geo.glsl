// Equirectangular lookup for the baked earth map (see systems/globe/earthMap.ts).
// u = (lon + 180) / 360, v = (lat + 90) / 180, matching utils/geo.ts.
//
// The atan seam at the antimeridian makes fwidth(u) jump to ~1 for one pixel
// column, which drags the sampler to the smallest mip and draws a visible
// line. Tarini's fix: compute u two ways (seam at 180 and seam at 0) and use
// whichever has the smaller screen-space derivative.
vec2 earthUv(vec3 n) {
  float a = atan(n.z, -n.x) * 0.15915494309189535; // 1 / (2 pi)
  float u1 = fract(a);
  float u2 = fract(a + 0.5) - 0.5;
  float u = fwidth(u1) <= fwidth(u2) + 1e-5 ? u1 : u2;
  float v = asin(clamp(n.y, -1.0, 1.0)) * 0.3183098861837907 + 0.5; // 1 / pi
  return vec2(u, v);
}
