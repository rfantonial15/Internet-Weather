import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  Color,
  CircleGeometry,
  ShaderMaterial,
  AdditiveBlending,
  DoubleSide,
  Vector3,
  Quaternion,
  InstancedBufferAttribute,
  DynamicDrawUsage,
} from "three";
import { weather } from "@/simulation/WeatherSystem";
import { palette } from "@/config/colors";

/**
 * GPU consumer for `weather.heat`. Each zone is an instanced disc oriented
 * tangent to the surface; the disc's own fragment shader generates the
 * "molten core + soft outer halo" gradient procedurally so we never need a
 * texture lookup.
 *
 * Per-instance state passed via a custom InstancedBufferAttribute (radius +
 * alpha + hue) — these update every frame, but the underlying disc geometry
 * is static, so the GPU upload is small.
 */
export function HeatFieldRenderer() {
  const meshRef = useRef<InstancedMesh>(null!);
  const m = weather.heat;

  const { geometry, material, instData } = useMemo(() => {
    const geo = new CircleGeometry(1, 48);

    const arr = new Float32Array(m.capacity * 3); // alpha, hue, radius
    const attr = new InstancedBufferAttribute(arr, 3);
    attr.setUsage(DynamicDrawUsage);
    geo.setAttribute("aData", attr);

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      uniforms: {
        uColorWarm: { value: new Color(palette.viral) },
        uColorHot: { value: new Color(palette.rageHot) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aData;  // x=alpha, y=hue, z=radius
        varying vec2 vUv;
        varying float vAlpha;
        varying float vHue;
        void main() {
          vUv = uv;
          vAlpha = aData.x;
          vHue = aData.y;
          // Scale the disc by the per-instance radius (z component).
          vec3 scaled = position * aData.z;
          gl_Position = projectionMatrix * modelViewMatrix *
                        instanceMatrix * vec4(scaled, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorWarm;
        uniform vec3 uColorHot;
        varying vec2 vUv;
        varying float vAlpha;
        varying float vHue;
        void main() {
          if (vAlpha < 0.001) discard;
          vec2 c = vUv - 0.5;
          float r = length(c) * 2.0;
          if (r > 1.0) discard;

          // Soft core, halo, and a thin "ember rim" at the edge.
          float core = pow(1.0 - r, 2.5);
          float rim  = smoothstep(0.85, 1.0, r) * (1.0 - smoothstep(0.95, 1.05, r));
          float halo = pow(1.0 - r, 1.0) * 0.4;

          vec3 col = mix(uColorWarm, uColorHot, vHue);
          float energy = (core + rim * 1.6 + halo) * vAlpha;
          gl_FragColor = vec4(col * (1.4 + energy * 0.8), energy);
        }
      `,
    });

    return { geometry: geo, material: mat, instData: attr };
  }, [m]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Reusable instance positioning scratch.
  const dummy = useMemo(() => new Object3D(), []);
  const q = useMemo(() => new Quaternion(), []);
  const up = useMemo(() => new Vector3(0, 0, 1), []);
  const dir = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = performance.now() / 1000;
    const arr = instData.array as Float32Array;

    let i = 0;
    for (let s = 0; s < m.capacity; s++) {
      if (!m.alive[s]) continue;
      const o = s * 3;
      dir.set(m.normals[o + 0], m.normals[o + 1], m.normals[o + 2]);
      // Anchor disc just above surface so additive blending reads cleanly.
      dummy.position.set(m.positions[o + 0] * 1.003, m.positions[o + 1] * 1.003, m.positions[o + 2] * 1.003);
      q.setFromUnitVectors(up, dir);
      dummy.quaternion.copy(q);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const di = i * 3;
      arr[di + 0] = m.alpha(s, t);
      arr[di + 1] = m.hue[s];
      arr[di + 2] = m.radius(s, t);
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    instData.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, m.capacity]}
      frustumCulled={false}
    />
  );
}
