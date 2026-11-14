import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, AdditiveBlending } from "three";
import vert from "@/shaders/neural/neural.vert.glsl";
import frag from "@/shaders/neural/neural.frag.glsl";
import { palette } from "@/config/colors";
import { EARTH_RADIUS } from "@/config/constants";
import { frameUniforms } from "@/core/frameUniforms";
import { weather } from "@/simulation/WeatherSystem";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";

/**
 * The "nervous system of humanity" layer: flowing filaments and synaptic
 * nodes over populated land. `uEnergy` follows `weather.ambient.network`
 * (viral / meme / news activity); tension recolours it cyan to magenta.
 */
export function NeuralCurrents() {
  const detail = profiles[useUIStore((s) => s.quality)].sphereDetail;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          ...frameUniforms,
          uEnergy: { value: 0 },
          uColorCool: { value: new Color(palette.atmosphere) },
          uColorHot: { value: new Color(palette.rageHot) },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    material.uniforms.uEnergy.value = weather.ambient.network;
  });

  return (
    <mesh material={material} renderOrder={3}>
      <sphereGeometry args={[EARTH_RADIUS * 1.005, detail * 2, detail]} />
    </mesh>
  );
}
