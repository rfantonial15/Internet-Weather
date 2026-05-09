import { useMemo, useRef, useEffect } from "react";
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
 * GPU consumer for `weather.storms`. Reads its three typed arrays directly
 * into BufferAttributes — zero-copy from sim → GPU. The vertex shader
 * derives per-particle alpha from age (uTime - aBirth), so no CPU pass is
 * needed to fade points.
 */
export function StormCellsRenderer() {
  const ref = useRef<Points>(null!);
  const m = weather.storms;

  const { geometry, material } = useMemo(() => {
    const geo = new BufferGeometry();

    const posAttr = new BufferAttribute(m.positions, 3);
    const colAttr = new BufferAttribute(m.colors, 3);
    const birthAttr = new BufferAttribute(m.birthTimes, 1);
    const lifeAttr = new BufferAttribute(m.lives, 1);

    posAttr.setUsage(DynamicDrawUsage);
    colAttr.setUsage(DynamicDrawUsage);
    birthAttr.setUsage(DynamicDrawUsage);
    lifeAttr.setUsage(DynamicDrawUsage);

    geo.setAttribute("position", posAttr);
    geo.setAttribute("color", colAttr);
    geo.setAttribute("aBirth", birthAttr);
    geo.setAttribute("aLife", lifeAttr);

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aBirth;
        attribute float aLife;
        uniform float uTime;
        varying vec3 vCol;
        varying float vAlpha;
        void main() {
          vCol = color;
          float age = clamp((uTime - aBirth) / aLife, 0.0, 1.0);
          // Quick rise, slow tail.
          float fade = age < 0.12 ? age / 0.12 : 1.0 - (age - 0.12) / 0.88;
          vAlpha = max(0.0, fade);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (4.0 + 6.0 * vAlpha) * (240.0 / -mv.z);
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
          gl_FragColor = vec4(vCol * fall * 1.6, fall * vAlpha);
        }
      `,
      vertexColors: true,
    });

    return { geometry: geo, material: mat };
  }, [m]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    // Modules timestamp particles with performance.now()/1000; the shader
    // must match that reference frame.
    material.uniforms.uTime.value = performance.now() / 1000;
    if (m.dirty) {
      (geometry.attributes.position as BufferAttribute).needsUpdate = true;
      (geometry.attributes.color as BufferAttribute).needsUpdate = true;
      (geometry.attributes.aBirth as BufferAttribute).needsUpdate = true;
      (geometry.attributes.aLife as BufferAttribute).needsUpdate = true;
      geometry.setDrawRange(0, m.capacity);
      m.dirty = false;
    }
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}
