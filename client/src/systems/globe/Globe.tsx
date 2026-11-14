import { useEffect, useMemo } from "react";
import { ShaderMaterial, Color } from "three";
import vert from "@/shaders/earth/earth.vert.glsl";
import frag from "@/shaders/earth/earth.frag.glsl";
import { palette } from "@/config/colors";
import { EARTH_RADIUS } from "@/config/constants";
import { frameUniforms } from "@/core/frameUniforms";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";
import { ensureEarthMap } from "./earthMap";

/**
 * The planet surface. Real coastlines come from the baked earth map; the
 * fragment shader adds lighting (real subsolar point), glint, rim and the
 * terminator. The mesh never rotates: geography is fixed in world space so
 * event coordinates and continents always agree. The camera does the moving.
 */
export function Globe() {
  const detail = profiles[useUIStore((s) => s.quality)].sphereDetail;

  useEffect(() => ensureEarthMap(), []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          ...frameUniforms,
          uOceanDeep: { value: new Color(palette.oceanDeep) },
          uOceanShallow: { value: new Color(palette.oceanShallow) },
          uLandNight: { value: new Color(palette.landNight) },
          uLandDay: { value: new Color(palette.landDay) },
          uIce: { value: new Color(palette.ice) },
          uRim: { value: new Color(palette.rim) },
          uTerminatorWarm: { value: new Color(palette.terminator) },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material}>
      <sphereGeometry args={[EARTH_RADIUS, detail * 2, detail]} />
    </mesh>
  );
}
