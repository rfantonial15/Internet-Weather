import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Points,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  AdditiveBlending,
  Color,
  Vector3,
} from "three";
import { useWorldStore } from "@/state/useWorldStore";
import { useEventStore } from "@/state/useEventStore";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";
import { palette } from "@/config/colors";
import { randomOnSphere } from "@/utils/geo";
import { ATMOSPHERE_RADIUS } from "@/config/constants";

/**
 * Drifting cloud-particle field above the planet. Tension (driven by rage /
 * controversy events) tints the field magenta and accelerates motion.
 *
 * Particles live on a unit sphere; the GPU applies the tangential drift each
 * frame in the vertex shader, so we only upload the geometry once and update
 * two scalar uniforms (uTime, uTension) per frame.
 *
 * Encoding:
 *   - position attribute: anchor point on the unit sphere (constant)
 *   - drift attribute:    tangent vector at that anchor (constant)
 *   - GPU computes p(t) = normalize(anchor + drift * uTime * speed) * R
 */
export function StormSystem() {
  const tier = useUIStore((s) => s.quality);
  const count = profiles[tier].particleCount;
  const tension = useRef(0);

  const { points, material } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);

    const tmp = new Vector3();
    for (let i = 0; i < count; i++) {
      randomOnSphere(1, tmp);
      positions[i * 3 + 0] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      // Tangent: a random vector projected onto the tangent plane at `tmp`.
      const t = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      t.sub(tmp.clone().multiplyScalar(t.dot(tmp))).normalize();
      drift[i * 3 + 0] = t.x;
      drift[i * 3 + 1] = t.y;
      drift[i * 3 + 2] = t.z;
    }
    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setAttribute("drift", new Float32BufferAttribute(drift, 3));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uTension: { value: 0 },
        uRadius: { value: ATMOSPHERE_RADIUS * 1.015 },
        uCalm: { value: new Color(palette.atmosphere) },
        uStorm: { value: new Color(palette.rage) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 drift;
        uniform float uTime;
        uniform float uTension;
        uniform float uRadius;
        varying float vAlpha;
        void main() {
          // Tangential advection on the unit sphere, then re-projected.
          float speed = 0.015 + uTension * 0.05;
          vec3 anchor = position;
          vec3 advected = normalize(anchor + drift * uTime * speed);
          vec3 worldPos = advected * uRadius;
          vec4 mv = modelViewMatrix * vec4(worldPos, 1.0);
          gl_Position = projectionMatrix * mv;
          float twinkle = 0.5 + 0.5 * sin(uTime * 1.3 + anchor.x * 12.0 + anchor.y * 7.0);
          vAlpha = (0.20 + 0.45 * twinkle) * (0.55 + uTension * 0.9);
          gl_PointSize = (1.4 + uTension * 2.2) * (260.0 / -mv.z);
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

    return { points: new Points(geo, mat), material: mat };
  }, [count]);

  useFrame((_, dt) => {
    const { elapsed } = useWorldStore.getState();
    const { events, lastId } = useEventStore.getState();

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
  });

  return <primitive object={points} />;
}
