import { useEffect, useMemo } from "react";
import { ShaderMaterial, Color, NormalBlending } from "three";
import vert from "@/shaders/clouds/clouds.vert.glsl";
import frag from "@/shaders/clouds/clouds.frag.glsl";
import { EARTH_RADIUS } from "@/config/constants";
import { palette } from "@/config/colors";
import { frameUniforms } from "@/core/frameUniforms";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";

/**
 * Procedural cloud shell just above the surface. Drift, day/night shading
 * and the tension tint are all uniform-driven (time, sun and tension are the
 * shared frame uniforms), so there is no per-frame CPU work at all.
 */
export function CloudLayer() {
  const detail = profiles[useUIStore((s) => s.quality)].sphereDetail;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: NormalBlending,
        uniforms: {
          ...frameUniforms,
          uDayColor: { value: new Color("#dfeaff") },
          uNightColor: { value: new Color("#1c2545") },
          uTenseColor: { value: new Color(palette.rage) },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={2}>
      <sphereGeometry args={[EARTH_RADIUS * 1.012, detail * 2, detail]} />
    </mesh>
  );
}
