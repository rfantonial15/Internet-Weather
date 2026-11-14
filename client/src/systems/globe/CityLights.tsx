import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, AdditiveBlending } from "three";
import vert from "@/shaders/earth/cityLights.vert.glsl";
import frag from "@/shaders/earth/cityLights.frag.glsl";
import { palette } from "@/config/colors";
import { EARTH_RADIUS } from "@/config/constants";
import { frameUniforms } from "@/core/frameUniforms";
import { weather } from "@/simulation/WeatherSystem";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";

/**
 * Night lights over real population centres (blue channel of the baked
 * earth map). Build/deploy events flare the whole network via
 * `weather.ambient.buildPulse`.
 */
export function CityLights() {
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
          uBuildPulse: { value: 0 },
          uWarm: { value: new Color(palette.cityWarm) },
          uHot: { value: new Color(palette.cityHot) },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    material.uniforms.uBuildPulse.value = weather.ambient.buildPulse;
  });

  return (
    <mesh material={material} renderOrder={1}>
      <sphereGeometry args={[EARTH_RADIUS * 1.001, detail * 2, detail]} />
    </mesh>
  );
}
