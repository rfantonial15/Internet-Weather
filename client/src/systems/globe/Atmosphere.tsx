import { useEffect, useMemo } from "react";
import { ShaderMaterial, Color, BackSide, AdditiveBlending } from "three";
import vert from "@/shaders/atmosphere/atmosphere.vert.glsl";
import frag from "@/shaders/atmosphere/atmosphere.frag.glsl";
import { palette } from "@/config/colors";
import { ATMOSPHERE_RADIUS } from "@/config/constants";
import { frameUniforms } from "@/core/frameUniforms";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";

/**
 * Limb glow from one back-side shell: brightness follows how closely each
 * view ray skims the planet, so the halo hugs the limb and fades outward.
 * Sun direction and tension come from the shared uniforms.
 */
export function Atmosphere() {
  const detail = profiles[useUIStore((s) => s.quality)].sphereDetail;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          ...frameUniforms,
          uColorInner: { value: new Color(palette.atmosphere) },
          uColorOuter: { value: new Color(palette.rim) },
          uColorWarm: { value: new Color(palette.terminator) },
          uColorTense: { value: new Color(palette.rageHot) },
          uShellRadius: { value: ATMOSPHERE_RADIUS },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh material={material} renderOrder={4}>
      <sphereGeometry args={[ATMOSPHERE_RADIUS, detail, detail]} />
    </mesh>
  );
}
