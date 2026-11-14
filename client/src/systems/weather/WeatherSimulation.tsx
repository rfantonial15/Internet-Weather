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

/** How often the HUD-facing tension value is pushed into React state. */
const UI_PUBLISH_S = 0.2;

/**
 * Mounts the WeatherSystem into the live scene:
 *   - subscribes to the event store via EventSpawner
 *   - ticks every simulation module each frame
 *   - publishes tension to the world store at 5 Hz for the HUD (shaders read
 *     it every frame through the shared uniform instead)
 *   - mounts every renderer
 */
export function WeatherSimulation() {
  const lastT = useRef(performance.now() / 1000);
  const sincePublish = useRef(0);

  useEffect(() => startEventSpawner(), []);

  useFrame(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - lastT.current); // clamp big dt (tab-switch)
    lastT.current = now;
    weather.update(dt, now);

    sincePublish.current += dt;
    if (sincePublish.current >= UI_PUBLISH_S) {
      sincePublish.current = 0;
      useWorldStore.getState().setTension(weather.tension());
    }
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
