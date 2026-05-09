import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { weather } from "@/simulation/WeatherSystem";
import { startEventSpawner } from "@/simulation/EventSpawner";
import { useWorldStore } from "@/state/useWorldStore";
import { StormCellsRenderer } from "./StormCellsRenderer";
import { LightningRenderer } from "./LightningRenderer";
import { HeatFieldRenderer } from "./HeatFieldRenderer";
import { MemeSwarmRenderer } from "./MemeSwarmRenderer";
import { EventAuroraRenderer } from "./EventAuroraRenderer";

/**
 * Mounts the WeatherSystem into the live scene:
 *   - subscribes to the event store via EventSpawner
 *   - ticks all simulation modules every frame
 *   - exposes the aggregate tension reading into the world store, so
 *     unrelated visual layers (atmosphere shader, neural currents) can
 *     all read from a single source of "how stressed is the planet"
 *   - mounts every renderer
 *
 * Keeping the tick + spawner here means the simulation is dormant until
 * this component mounts and ceases instantly on unmount — useful for
 * development hot-reload and for any future "pause" affordance.
 */
export function WeatherSimulation() {
  const lastT = useRef(performance.now() / 1000);

  useEffect(() => startEventSpawner(), []);

  useFrame(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - lastT.current); // clamp big dt (tab-switch)
    lastT.current = now;
    weather.update(dt, now);
    useWorldStore.getState().setTension(weather.tension());
  });

  return (
    <group>
      <HeatFieldRenderer />
      <StormCellsRenderer />
      <LightningRenderer />
      <MemeSwarmRenderer />
      <EventAuroraRenderer />
    </group>
  );
}
