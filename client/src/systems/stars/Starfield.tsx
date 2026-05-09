import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial, AdditiveBlending, Color } from "three";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";
import { palette } from "@/config/colors";
import { randomOnSphere } from "@/utils/geo";
import { Vector3 } from "three";

/**
 * Backdrop starfield. Rendered as a single Points object so it costs one draw
 * call regardless of star count. Two color temperatures are interleaved to
 * keep it from looking flat.
 */
export function Starfield() {
  const quality = useUIStore((s) => s.quality);
  const count = profiles[quality].starCount;

  const points = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const tmp = new Vector3();
    const warm = new Color(palette.starWarm);
    const cool = new Color(palette.starCool);

    for (let i = 0; i < count; i++) {
      // Distribute on a sphere far behind the action.
      const r = 80 + Math.random() * 40;
      randomOnSphere(r, tmp);
      positions[i * 3 + 0] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      const c = Math.random() > 0.7 ? warm : cool;
      const dim = 0.4 + Math.random() * 0.6;
      colors[i * 3 + 0] = c.r * dim;
      colors[i * 3 + 1] = c.g * dim;
      colors[i * 3 + 2] = c.b * dim;

      sizes[i] = Math.random() * 0.8 + 0.2;
    }

    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geo.setAttribute("size", new Float32BufferAttribute(sizes, 1));

    const mat = new PointsMaterial({
      vertexColors: true,
      size: 0.06,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    return new Points(geo, mat);
  }, [count]);

  return <primitive object={points} />;
}
