import { Globe } from "@/systems/globe/Globe";
import { Atmosphere } from "@/systems/globe/Atmosphere";
import { Starfield } from "@/systems/stars/Starfield";
import { EventMarkers } from "@/systems/events/EventMarkers";
import { AuroraField } from "@/systems/weather/AuroraField";
import { StormSystem } from "@/systems/weather/StormSystem";
import { CityLights } from "@/systems/globe/CityLights";
import { CloudLayer } from "@/systems/globe/CloudLayer";
import { NeuralCurrents } from "@/systems/globe/NeuralCurrents";
import { WeatherSimulation } from "@/systems/weather/WeatherSimulation";

/**
 * The single live scene. Composed of independent systems, each managing
 * its own meshes/materials.
 *
 * Layer order (inner → outer):
 *   Globe surface         R = 1.000
 *   CityLights            R = 1.001  (additive over surface)
 *   HeatField             R = 1.003  (additive discs — viral/trend)
 *   NeuralCurrents        R = 1.005  (additive — nervous system)
 *   CloudLayer            R = 1.012  (alpha — diffuses everything below it)
 *   StormCells / Lightning / Swarm   R ≈ 1.012-1.015 (additive particles & lines)
 *   EventAurora pillars   R = 1.0..1.4 (radial cylinders)
 *   Atmosphere            R = 1.060  (back-side scattering halo)
 *   AuroraField (global)  R = 1.103  (back-side polar curtains)
 *
 * Two simulation tiers coexist here:
 *   - Globals (StormSystem, AuroraField, NeuralCurrents) → ambient mood
 *   - Locals  (WeatherSimulation modules)               → per-event drama
 *
 * Adding a new visual phenomenon = either a SimModule + renderer pair (for
 * event-driven phenomena) or a single shader-shell component here (for
 * ambient phenomena). Never reach across systems.
 */
export function WorldScene() {
  return (
    <group>
      {/* Lighting — kept minimal. Atmosphere & emissive layers do most of the work. */}
      <ambientLight intensity={0.08} color="#3a8bff" />
      <directionalLight position={[5, 2, 3]} intensity={1.4} color="#ffd9b0" />
      <pointLight position={[-6, -2, -4]} intensity={0.6} color="#5cf3ff" />

      <Starfield />

      {/* Inner planet stack */}
      <Globe />
      <CityLights />
      <NeuralCurrents />
      <CloudLayer />
      <Atmosphere />

      {/* Ambient global weather */}
      <AuroraField />
      <StormSystem />

      {/* Per-event simulation: storms, lightning, heat, swarms, local auroras */}
      <WeatherSimulation />

      {/* Event pings (kept for the high-information ticker correlation) */}
      <EventMarkers />
    </group>
  );
}
