import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  BufferAttribute,
  DynamicDrawUsage,
  ShaderMaterial,
  AdditiveBlending,
  LineSegments,
  Color,
} from "three";
import { weather } from "@/simulation/WeatherSystem";
import { palette } from "@/config/colors";

/**
 * GPU consumer for `weather.lightning`. Renders the arc pool as a single
 * `LineSegments` — every adjacent pair of vertices in `positions` forms a
 * segment via the pre-computed index buffer in the module.
 *
 * Brightness per arc is uploaded as an attribute (one float per vertex),
 * recomputed each frame so we get the strike-and-fade flicker without
 * touching the position buffer (avoids GPU re-upload in the common case).
 */
export function LightningRenderer() {
  const ref = useRef<LineSegments>(null!);
  const m = weather.lightning;

  const { geometry, material, brightnessAttr } = useMemo(() => {
    const geo = new BufferGeometry();
    const SEG = m.segments;
    const verts = m.capacity * SEG;

    const posAttr = new BufferAttribute(m.positions, 3);
    posAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("position", posAttr);

    // One brightness float per vertex.
    const bArr = new Float32Array(verts);
    const bAttr = new BufferAttribute(bArr, 1);
    bAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("aBrightness", bAttr);

    geo.setIndex(new BufferAttribute(m.indices, 1));

    const col = new Color(palette.controversy);
    const colHot = new Color("#ffffff");

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uColor: { value: col },
        uHot: { value: colHot },
      },
      vertexShader: /* glsl */ `
        attribute float aBrightness;
        varying float vBrightness;
        void main() {
          vBrightness = aBrightness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uHot;
        varying float vBrightness;
        void main() {
          float b = clamp(vBrightness, 0.0, 1.0);
          // Hot core that bleeds out into colored edges.
          vec3 col = mix(uColor, uHot, pow(b, 2.0));
          gl_FragColor = vec4(col * (0.5 + b * 1.8), b);
        }
      `,
    });

    return { geometry: geo, material: mat, brightnessAttr: bAttr };
  }, [m]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const t = performance.now() / 1000;
    const SEG = m.segments;
    const arr = brightnessAttr.array as Float32Array;
    for (let i = 0; i < m.capacity; i++) {
      const b = m.alive[i] ? m.brightness(i, t) : 0;
      const off = i * SEG;
      // Slight per-vertex jitter on top of arc brightness — gives lightning
      // its flickering "drawn-by-hand" feel without animating positions.
      for (let s = 0; s < SEG; s++) {
        const j = 0.5 + 0.5 * Math.sin(t * 60 + i * 7.3 + s * 1.7);
        arr[off + s] = b * (0.6 + 0.4 * j);
      }
    }
    brightnessAttr.needsUpdate = true;

    if (m.dirty) {
      (geometry.attributes.position as BufferAttribute).needsUpdate = true;
      m.dirty = false;
    }
  });

  return <lineSegments ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}
