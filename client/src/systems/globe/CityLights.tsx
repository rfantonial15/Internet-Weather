import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, AdditiveBlending } from "three";
import vert from "@/shaders/earth/cityLights.vert.glsl";
import frag from "@/shaders/earth/cityLights.frag.glsl";
import { palette } from "@/config/colors";
import { EARTH_RADIUS } from "@/config/constants";
import { useWorldStore } from "@/state/useWorldStore";
import { useEventStore } from "@/state/useEventStore";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";

/**
 * Glowing constellations on the night side. Subscribes to "build" events
 * to surge the global pulse — visualizing GitHub activity / deploys as
 * waves of light flickering across the dark hemisphere.
 */
export function CityLights() {
  const buildPulse = useRef(0);
  const lastSeen = useRef<string | null>(null);
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
          uTime: { value: 0 },
          uSunYaw: { value: 0.6 },
          uBuildPulse: { value: 0 },
          uWarm: { value: new Color(palette.cityWarm) },
          uHot: { value: new Color("#ff4dd2") },
        },
      }),
    [],
  );

  useFrame((_, dt) => {
    const { elapsed, sunYaw } = useWorldStore.getState();
    const { events, lastId } = useEventStore.getState();

    // If a new build event arrived, kick the pulse.
    if (lastId && lastId !== lastSeen.current) {
      const last = events[events.length - 1];
      if (last?.kind === "build") buildPulse.current += last.intensity * 0.6;
      lastSeen.current = lastId;
    }
    // Decay back to zero.
    buildPulse.current = Math.max(0, buildPulse.current - dt * 0.6);

    material.uniforms.uTime.value = elapsed;
    material.uniforms.uSunYaw.value = sunYaw;
    material.uniforms.uBuildPulse.value = buildPulse.current;
  });

  return (
    <mesh material={material}>
      <sphereGeometry args={[EARTH_RADIUS * 1.001, detail, detail]} />
    </mesh>
  );
}
