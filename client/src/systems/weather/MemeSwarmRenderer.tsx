import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  BufferAttribute,
  DynamicDrawUsage,
  ShaderMaterial,
  AdditiveBlending,
  Points,
} from "three";
import { weather } from "@/simulation/WeatherSystem";

/**
 * GPU consumer for `weather.swarm`. Per-particle positions are recomputed
 * every frame on the CPU (slerp from origin → destination), so this
 * renderer just keeps the position buffer flagged for re-upload.
 *
 * Color is per-particle (each swarm picks one); alpha is a small wave so
 * particles "shimmer" in transit. The shader scales gl_PointSize by depth
 * so swarms appear smaller as they wrap to the far side of the planet,
 * which strengthens the illusion that they're crossing a sphere.
 */
export function MemeSwarmRenderer() {
  const ref = useRef<Points>(null!);
  const m = weather.swarm;

  const { geometry, material } = useMemo(() => {
    const geo = new BufferGeometry();

    const posAttr = new BufferAttribute(m.positions, 3);
    const colAttr = new BufferAttribute(m.colors, 3);
    const birthAttr = new BufferAttribute(m.birthTimes, 1);
    const lifeAttr = new BufferAttribute(m.lives, 1);
    const phaseAttr = new BufferAttribute(m.phaseOffsets, 1);

    posAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("color", colAttr);
    geo.setAttribute("aBirth", birthAttr);
    geo.setAttribute("aLife", lifeAttr);
    geo.setAttribute("aPhase", phaseAttr);

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexColors: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aBirth;
        attribute float aLife;
        attribute float aPhase;
        uniform float uTime;
        varying vec3 vCol;
        varying float vAlpha;
        void main() {
          vCol = color;
          float age = clamp((uTime - aBirth) / aLife, 0.0, 1.0);
          // Bell-shaped fade: in by 8%, full till 80%, out by end.
          float fade =
            age < 0.08 ? age / 0.08
            : age > 0.80 ? 1.0 - (age - 0.80) / 0.20
            : 1.0;
          // Per-particle shimmer.
          float wob = 0.7 + 0.3 * sin(uTime * 3.0 + aPhase * 30.0);
          vAlpha = max(0.0, fade * wob);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (3.5 + 4.0 * vAlpha) * (220.0 / -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vCol;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float fall = pow(1.0 - d * 2.0, 2.0);
          gl_FragColor = vec4(vCol * fall * 1.7, fall * vAlpha);
        }
      `,
    });

    return { geometry: geo, material: mat };
  }, [m]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    material.uniforms.uTime.value = performance.now() / 1000;
    if (m.dirty) {
      (geometry.attributes.position as BufferAttribute).needsUpdate = true;
      (geometry.attributes.color as BufferAttribute).needsUpdate = true;
      (geometry.attributes.aBirth as BufferAttribute).needsUpdate = true;
      (geometry.attributes.aLife as BufferAttribute).needsUpdate = true;
      (geometry.attributes.aPhase as BufferAttribute).needsUpdate = true;
      m.dirty = false;
    } else {
      // Positions are slerped each frame even when no spawn happened.
      (geometry.attributes.position as BufferAttribute).needsUpdate = true;
    }
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}
