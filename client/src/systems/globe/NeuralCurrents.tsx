import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color, AdditiveBlending } from "three";
import vert from "@/shaders/neural/neural.vert.glsl";
import frag from "@/shaders/neural/neural.frag.glsl";
import { palette } from "@/config/colors";
import { EARTH_RADIUS } from "@/config/constants";
import { useWorldStore } from "@/state/useWorldStore";
import { useEventStore } from "@/state/useEventStore";
import { useUIStore } from "@/state/useUIStore";
import { profiles } from "@/config/quality";

/**
 * The "nervous system of humanity" layer. A single shell sphere whose
 * fragment shader paints flowing filaments + synaptic nodes over the
 * populated regions of the planet.
 *
 * Reactivity:
 *   - uEnergy ramps with each viral / meme / news event and decays
 *   - uTension comes from the world store (already accumulated by storms)
 *
 * Both push the network from "ambient blue hum" to "blazing magenta web".
 * No CPU per-frame work beyond two scalar updates.
 */
export function NeuralCurrents() {
  const energy = useRef(0);
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
          uTension: { value: 0 },
          uEnergy: { value: 0 },
          uColorCool: { value: new Color(palette.atmosphere) },
          uColorHot: { value: new Color(palette.rageHot) },
        },
      }),
    [],
  );

  useFrame((_, dt) => {
    const { elapsed, tension } = useWorldStore.getState();
    const { events, lastId } = useEventStore.getState();

    if (lastId && lastId !== lastSeen.current) {
      const last = events[events.length - 1];
      if (last) {
        const bump =
          last.kind === "viral" || last.kind === "meme" ? 0.45 :
          last.kind === "news" ? 0.6 :
          last.kind === "trend" ? 0.25 :
          0.05;
        energy.current = Math.min(1, energy.current + bump * last.intensity);
      }
      lastSeen.current = lastId;
    }
    energy.current = Math.max(0, energy.current - dt * 0.15);

    material.uniforms.uTime.value = elapsed;
    material.uniforms.uTension.value = tension;
    material.uniforms.uEnergy.value = energy.current;
  });

  return (
    <mesh material={material} renderOrder={3}>
      <sphereGeometry args={[EARTH_RADIUS * 1.005, detail, detail]} />
    </mesh>
  );
}
