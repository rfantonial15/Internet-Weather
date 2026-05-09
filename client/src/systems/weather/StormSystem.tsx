import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Points,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  AdditiveBlending,
  Color,
} from "three";
import { useWorldStore } from "@/state/useWorldStore";
import { useEventStore } from "@/state/useEventStore";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";
import { palette } from "@/config/colors";
import { randomOnSphere } from "@/utils/geo";
import { Vector3 } from "three";
import { ATMOSPHERE_RADIUS } from "@/config/constants";

/**
 * Drifting cloud-particle field above the planet. Tension (driven by rage /
 * controversy events) tints the field magenta and accelerates motion.
 *
 * Particles live on a sphere above the atmosphere; their positions drift
 * along tangent vectors so they appear to move with the wind.
 */
export function StormSystem() {
  const tier = useUIStore((s) => s.quality);
  const count = profiles[tier].particleCount;
  const tension = useRef(0);

  const { points, material, drift } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);

    const tmp = new Vector3();
    for (let i = 0; i < count; i++) {
      randomOnSphere(ATMOSPHERE_RADIUS * 1.015, tmp);
      positions[i * 3 + 0] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      // Random tangent vector for drift direction.
      const t = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      t.sub(tmp.clone().multiplyScalar(t.dot(tmp) / tmp.lengthSq())).normalize();
      drift[i * 3 + 0] = t.x;
      drift[i * 3 + 1] = t.y;
      drift[i * 3 + 2] = t.z;
    }
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uTension: { value: 0 },
        uCalm: { value: new Color(palette.atmosphere) },
        uStorm: { value: new Color(palette.rage) },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uTension;
        varying float vAlpha;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float twinkle = 0.5 + 0.5 * sin(uTime * 1.3 + position.x * 12.0 + position.y * 7.0);
          vAlpha = (0.25 + 0.5 * twinkle) * (0.6 + uTension);
          gl_PointSize = (1.5 + uTension * 2.5) * (260.0 / -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uCalm;
        uniform vec3 uStorm;
        uniform float uTension;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float fall = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uCalm, uStorm, uTension);
          gl_FragColor = vec4(col * fall, fall * vAlpha);
        }
      `,
    });

    return { points: new Points(geo, mat), material: mat, drift };
  }, [count]);

  useFrame((_, dt) => {
    const { elapsed } = useWorldStore.getState();
    const { events, lastId } = useEventStore.getState();

    // Aggregate tension from recent storm-class events.
    if (lastId) {
      const last = events[events.length - 1];
      if (last?.kind === "rage" || last?.kind === "controversy") {
        tension.current = Math.min(1, tension.current + last.intensity * 0.25);
      }
    }
    tension.current = Math.max(0, tension.current - dt * 0.08);
    material.uniforms.uTime.value = elapsed;
    material.uniforms.uTension.value = tension.current;
    useWorldStore.getState().setTension(tension.current);

    // Drift particles tangentially. Cheap CPU pass — count is bounded.
    const pos = points.geometry.getAttribute("position") as Float32BufferAttribute;
    const arr = pos.array as Float32Array;
    const speed = 0.015 + tension.current * 0.05;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 0] += drift[i + 0] * dt * speed;
      arr[i + 1] += drift[i + 1] * dt * speed;
      arr[i + 2] += drift[i + 2] * dt * speed;
      // Re-project onto sphere — keeps drift on the shell.
      const x = arr[i], y = arr[i + 1], z = arr[i + 2];
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const k = (ATMOSPHERE_RADIUS * 1.015) / len;
      arr[i + 0] = x * k;
      arr[i + 1] = y * k;
      arr[i + 2] = z * k;
    }
    pos.needsUpdate = true;
  });

  return <primitive object={points} />;
}
