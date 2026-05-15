import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  ShaderMaterial,
  AdditiveBlending,
  Color,
  BackSide,
  Mesh,
} from "three";
import { useWorldStore } from "@/state/useWorldStore";
import { useEventStore } from "@/state/useEventStore";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";
import { palette } from "@/config/colors";
import { ATMOSPHERE_RADIUS } from "@/config/constants";

/**
 * Soft auroral bands at the poles, modulated by the rolling count of recent
 * "wholesome" events. Lives just above the atmosphere shell.
 *
 * Inline shader because the pattern is simple and being able to read
 * everything in one place beats the dependency hop here.
 */
export function AuroraField() {
  const meshRef = useRef<Mesh>(null!);
  const wholesomeEnergy = useRef(0);
  const detail = profiles[useUIStore((s) => s.quality)].sphereDetail;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: BackSide,
        uniforms: {
          uTime: { value: 0 },
          uEnergy: { value: 0 },
          uColorA: { value: new Color(palette.wholesome) },
          uColorB: { value: new Color(palette.atmosphere) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormalW;
          varying vec3 vViewDir;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vViewDir = normalize(cameraPosition - wp.xyz);
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uEnergy;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying vec3 vNormalW;
          varying vec3 vViewDir;

          // Polar mask: bright near +/-Y, dark at equator.
          float polarMask(vec3 n) {
            float y = abs(n.y);
            return smoothstep(0.55, 0.95, y);
          }

          // Sinusoidal "curtain" pattern in longitude, slowly drifting.
          float curtains(vec3 n, float t) {
            float lon = atan(n.z, n.x);
            float w = sin(lon * 6.0 + t * 0.3) * 0.5 + 0.5;
            w *= 0.5 + 0.5 * sin(lon * 13.0 - t * 0.7);
            return w;
          }

          void main() {
            vec3 N = normalize(vNormalW);
            vec3 V = normalize(vViewDir);
            float fres = pow(1.0 - max(dot(N, -V), 0.0), 2.0);
            float mask = polarMask(N) * fres;
            float c = curtains(N, uTime);
            float a = mask * c * (0.2 + uEnergy);
            vec3 col = mix(uColorA, uColorB, c) * (0.6 + uEnergy * 0.8);
            gl_FragColor = vec4(col * a, a);
          }
        `,
      }),
    [],
  );

  useFrame((_, dt) => {
    const { elapsed } = useWorldStore.getState();
    const { events, lastId } = useEventStore.getState();

    // Ride the most recent wholesome event into the energy bucket.
    if (lastId) {
      const last = events[events.length - 1];
      if (last?.kind === "wholesome")
        wholesomeEnergy.current = Math.min(1.5, wholesomeEnergy.current + last.intensity * 0.3);
    }
    wholesomeEnergy.current = Math.max(0, wholesomeEnergy.current - dt * 0.15);

    material.uniforms.uTime.value = elapsed;
    material.uniforms.uEnergy.value = wholesomeEnergy.current;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[ATMOSPHERE_RADIUS * 1.04, detail, detail]} />
    </mesh>
  );
}
