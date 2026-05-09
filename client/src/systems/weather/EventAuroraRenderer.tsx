import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  Color,
  CylinderGeometry,
  ShaderMaterial,
  AdditiveBlending,
  Vector3,
  Quaternion,
  InstancedBufferAttribute,
  DynamicDrawUsage,
} from "three";
import { weather } from "@/simulation/WeatherSystem";
import { palette } from "@/config/colors";

/**
 * GPU consumer for `weather.auroraLocal`. Each pillar is a thin cylinder
 * pointing radially outward from the surface; the shader fades the cylinder
 * along its length (full at base, zero at top) so it reads as a soft
 * vertical ribbon rather than a hard column.
 *
 * Per-instance "swell" drives both the height and the alpha — they swell
 * together to produce the bell-shaped breath that's the visual signature
 * of wholesome events.
 */
export function EventAuroraRenderer() {
  const meshRef = useRef<InstancedMesh>(null!);
  const m = weather.auroraLocal;

  const { geometry, material, instData } = useMemo(() => {
    // Open-ended cylinder so we don't waste fillrate on caps.
    const geo = new CylinderGeometry(1, 1, 1, 16, 1, true);

    const arr = new Float32Array(m.capacity * 2); // [swell, intensity]
    const attr = new InstancedBufferAttribute(arr, 2);
    attr.setUsage(DynamicDrawUsage);
    geo.setAttribute("aData", attr);

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColor: { value: new Color(palette.wholesome) },
        uColorTip: { value: new Color(palette.atmosphere) },
      },
      vertexShader: /* glsl */ `
        attribute vec2 aData; // [swell, intensity]
        varying float vY;
        varying float vSwell;
        varying float vIntensity;
        void main() {
          vSwell = aData.x;
          vIntensity = aData.y;
          vY = uv.y; // 0 at base, 1 at tip
          gl_Position = projectionMatrix * modelViewMatrix *
                        instanceMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uColorTip;
        varying float vY;
        varying float vSwell;
        varying float vIntensity;
        void main() {
          if (vSwell < 0.001) discard;
          // Alpha falls off along the pillar: full base, zero tip.
          float vert = pow(1.0 - vY, 1.6);
          // Color cools at the tip — base warm-teal, tip cyan.
          vec3 col = mix(uColor, uColorTip, vY);
          float a = vert * vSwell * (0.5 + vIntensity * 0.6);
          gl_FragColor = vec4(col * (1.4 + vSwell), a);
        }
      `,
    });

    return { geometry: geo, material: mat, instData: attr };
  }, [m]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Instance scratch.
  const dummy = useMemo(() => new Object3D(), []);
  const q = useMemo(() => new Quaternion(), []);
  const upY = useMemo(() => new Vector3(0, 1, 0), []);
  const dir = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = performance.now() / 1000;
    const arr = instData.array as Float32Array;

    let i = 0;
    for (let s = 0; s < m.capacity; s++) {
      if (!m.alive[s]) continue;
      const swell = m.swell(s, t);
      const o = s * 3;
      dir.set(m.normals[o + 0], m.normals[o + 1], m.normals[o + 2]);

      const height = m.heightMax * (0.4 + swell * 0.9);
      const radius = m.baseRadius * (0.7 + m.intensities[s] * 0.7);

      // Center the cylinder halfway along its length, anchored to the
      // surface and pointing outward.
      dummy.position.set(
        m.positions[o + 0] * (1 + height * 0.5),
        m.positions[o + 1] * (1 + height * 0.5),
        m.positions[o + 2] * (1 + height * 0.5),
      );
      q.setFromUnitVectors(upY, dir);
      dummy.quaternion.copy(q);
      dummy.scale.set(radius, height, radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      arr[i * 2 + 0] = swell;
      arr[i * 2 + 1] = m.intensities[s];
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
