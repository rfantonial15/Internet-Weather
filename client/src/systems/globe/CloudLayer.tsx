import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, ShaderMaterial, Color, NormalBlending } from "three";
import vert from "@/shaders/clouds/clouds.vert.glsl";
import frag from "@/shaders/clouds/clouds.frag.glsl";
import { EARTH_RADIUS } from "@/config/constants";
import { palette } from "@/config/colors";
import { useWorldStore } from "@/state/useWorldStore";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";

/**
 * Procedural cloud shell sitting just above the surface. One mesh, one
 * fragment shader pass; everything else (drift, day/night shading, tension
 * tint) is uniforms-driven. Slow counter-rotation against the planet sells
 * the wind without any per-frame CPU work.
 */
export function CloudLayer() {
  const meshRef = useRef<Mesh>(null!);
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
          uTime: { value: 0 },
          uSunYaw: { value: 0.6 },
          uTension: { value: 0.2 },
          uDayColor: { value: new Color("#dfeaff") },
          uNightColor: { value: new Color("#1c2545") },
          uTenseColor: { value: new Color(palette.rage) },
        },
      }),
    [],
  );

  useFrame(() => {
    const { elapsed, sunYaw, tension } = useWorldStore.getState();
    material.uniforms.uTime.value = elapsed;
    material.uniforms.uSunYaw.value = sunYaw;
    material.uniforms.uTension.value = tension;
    if (meshRef.current) meshRef.current.rotation.y -= 0.0002;
  });

  return (
    <mesh ref={meshRef} material={material} renderOrder={1}>
      <sphereGeometry args={[EARTH_RADIUS * 1.012, detail, detail]} />
    </mesh>
  );
}
