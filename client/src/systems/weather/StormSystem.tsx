import { useEffect, useMemo } from "react";
import {
  Points,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  AdditiveBlending,
  Color,
  Vector3,
} from "three";
import { frameUniforms } from "@/core/frameUniforms";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";
import { palette } from "@/config/colors";
import { randomOnSphere } from "@/utils/geo";
import { EARTH_RADIUS } from "@/config/constants";

/**
 * Drifting particle field above the planet. Global tension (the shared
 * uniform, fed by the weather simulation) tints it magenta and speeds it up.
 *
 * Particles live on a unit sphere; the GPU applies the tangential drift each
 * frame in the vertex shader, so the geometry uploads once and the only
 * per-frame inputs are the shared uTime / uTension uniforms.
 *
 * Encoding:
 *   - position attribute: anchor point on the unit sphere (constant)
 *   - drift attribute:    tangent vector at that anchor (constant)
 *   - GPU computes p(t) = normalize(anchor + drift * uTime * speed) * R
 */
export function StormSystem() {
  const tier = useUIStore((s) => s.quality);
  const count = profiles[tier].particleCount;

  const { points, material } = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);

    const tmp = new Vector3();
    const t = new Vector3();
    for (let i = 0; i < count; i++) {
      randomOnSphere(1, tmp);
      positions[i * 3 + 0] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      // Tangent: a random vector projected onto the tangent plane at `tmp`.
      t.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      t.addScaledVector(tmp, -t.dot(tmp)).normalize();
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
        uTime: frameUniforms.uTime,
        uTension: frameUniforms.uTension,
        uPointScale: frameUniforms.uPointScale,
        uRadius: { value: EARTH_RADIUS * 1.03 },
        uCalm: { value: new Color(palette.atmosphere) },
        uStorm: { value: new Color(palette.rage) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 drift;
        uniform float uTime;
        uniform float uTension;
        uniform float uRadius;
        uniform float uPointScale;
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
          vAlpha = (0.12 + 0.30 * twinkle) * (0.45 + uTension * 0.8);
          // World-space size (~0.0035 units, larger under tension), capped.
          gl_PointSize = min(24.0, (0.0035 + uTension * 0.004) * uPointScale / -mv.z);
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

  useEffect(
    () => () => {
      points.geometry.dispose();
      material.dispose();
    },
    [points, material],
  );

  return <primitive object={points} />;
}
