import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, ShaderMaterial, Color } from "three";
import vert from "@/shaders/earth/earth.vert.glsl";
import frag from "@/shaders/earth/earth.frag.glsl";
import { palette } from "@/config/colors";
import { EARTH_RADIUS } from "@/config/constants";
import { useWorldStore } from "@/state/useWorldStore";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";

/**
 * The cinematic planet. Geometry is a single high-density icosphere; all
 * visual richness lives in the fragment shader (procedural continents, ocean
 * specular, day/night blending, fresnel rim, terminator glow, polar tint).
 */
export function Globe() {
  const meshRef = useRef<Mesh>(null!);
  const detail = profiles[useUIStore((s) => s.quality)].sphereDetail;

  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 },
        uSunYaw: { value: 0.6 },
        uTension: { value: 0.2 },
        uOceanDeep: { value: new Color(palette.oceanDeep) },
        uOceanShallow: { value: new Color(palette.oceanShallow) },
        uLandNight: { value: new Color(palette.landNight) },
        uLandDay: { value: new Color("#1d2c4a") },
        uRim: { value: new Color(palette.rim) },
        uTerminatorWarm: { value: new Color("#ff8a3d") },
      },
    });
  }, []);

  useFrame(() => {
    const { elapsed, sunYaw, tension } = useWorldStore.getState();
    material.uniforms.uTime.value = elapsed;
    material.uniforms.uSunYaw.value = sunYaw;
    material.uniforms.uTension.value = tension;
    if (meshRef.current) meshRef.current.rotation.y += 0.0005;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <icosahedronGeometry args={[EARTH_RADIUS, detail]} />
    </mesh>
  );
}
