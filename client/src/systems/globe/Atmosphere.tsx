import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, BackSide, AdditiveBlending } from "three";
import vert from "@/shaders/atmosphere/atmosphere.vert.glsl";
import frag from "@/shaders/atmosphere/atmosphere.frag.glsl";
import { palette } from "@/config/colors";
import { ATMOSPHERE_RADIUS } from "@/config/constants";
import { useWorldStore } from "@/state/useWorldStore";

/**
 * Cinematic atmospheric scattering. Two-shell volumetric feel built from a
 * single back-side sphere — the multi-band gradient inside the shader is
 * cheaper than rendering an actual second mesh and reads identically at the
 * distances we orbit at.
 */
export function Atmosphere() {
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
          uColorInner: { value: new Color(palette.atmosphere) },
          uColorOuter: { value: new Color(palette.rim) },
          uColorWarm: { value: new Color("#ff8a3d") },
          uColorTense: { value: new Color(palette.rageHot) },
          uTension: { value: 0.2 },
          uTime: { value: 0 },
          uSunYaw: { value: 0.6 },
        },
      }),
    [],
  );

  useFrame(() => {
    const { elapsed, tension, sunYaw } = useWorldStore.getState();
    material.uniforms.uTime.value = elapsed;
    material.uniforms.uTension.value = tension;
    material.uniforms.uSunYaw.value = sunYaw;
  });

  return (
    <mesh material={material} renderOrder={2}>
      <sphereGeometry args={[ATMOSPHERE_RADIUS, 96, 96]} />
    </mesh>
  );
}
