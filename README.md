# Internet Weather

A cinematic realtime weather simulation of human civilization.

Rage becomes purple lightning. Memes bloom across continents. GitHub commits glow as constellations on the night side. Breaking news shock-waves ripple outward from where they happened.

This is not a dashboard. It's a living planet.

---

## Stack

- **Vite + React 18 + TypeScript** — frontend shell
- **React Three Fiber + drei + postprocessing** — rendering
- **Custom GLSL shaders** — earth, atmosphere, city lights, ripples, auroras
- **Zustand** — global state (events, camera, world, UI)
- **Framer Motion + Tailwind** — UI overlay & boot sequence
- **Node.js + ws** — realtime backend (WebSocket)

## Architecture

```
client/
  src/
    config/        palette · scene constants · quality tiers
    core/
      engine/      Canvas + RenderPipeline + PostFX + perf probe
      camera/      CinematicCamera + pure-math CameraDirector
      time/        master clock bridged into world state
    scenes/        composition root for the live scene
    systems/
      globe/       Globe · Atmosphere · CityLights
      stars/       Starfield
      weather/     StormSystem · AuroraField
      events/      EventMarkers · EventBeam · EventRipple
    shaders/       earth · atmosphere · events · shared/noise
    realtime/      WebSocket client · simulated feed · ingestion seam
    state/         Zustand stores: events · world · camera · ui
    hooks/         useRealtime
    ui/            HUD · BootSequence · Reticle · TensionMeter · EventTicker
    utils/         geo · easing
server/
  src/
    sources/       pluggable EventSource interface + simulated source
    pipeline/      composes active sources into a single emit
    ws/            client fan-out
shared/
  types.ts         wire format used by both ends
```

### Design rules

- **One Canvas, many systems.** Adding a new visual phenomenon = adding a
  `<Component />` to `WorldScene.tsx`. Systems never reach across.
- **State has one home.** Visual systems read from Zustand stores; nothing
  duplicates the event ring buffer.
- **Camera math is pure.** `CameraDirector` is plain TypeScript; `CinematicCamera`
  just bridges it to R3F so it's trivially testable.
- **Shaders are files.** GLSL lives under `shaders/`, loaded via
  `vite-plugin-glsl`, not inlined as template strings.
- **Sources are pluggable.** Real signals (GitHub, RSS, Trends) implement
  `EventSource`. The simulated source is the default backstop so the planet is
  never empty.

## Running

```bash
npm install
npm run dev
```

This starts:
- the **WebSocket server** on `:8787/ws` (currently emits the simulated feed)
- the **Vite dev server** on `:5173` (proxies `/ws` to the server)

Open http://localhost:5173.

If the server is unreachable the client transparently falls back to a local
simulated feed — the boot sequence still completes and the planet stays alive.

## Adding real sources

Implement `server/src/sources/source.ts`:

```ts
export const githubSource: EventSource = {
  key: "github",
  start(emit) { /* poll the GitHub events API → call emit(...) */ },
  stop() { /* cleanup */ },
};
```

Then register it in `server/src/pipeline/eventPipeline.ts`. The client needs no
changes — events are routed by `kind`, not by source.

## Adding new phenomena

1. Add a kind to `shared/types.ts` and `client/src/systems/events/eventTypes.ts`.
2. Either let it ride the existing `EventMarkers / Beam / Ripple` pipeline (free)
   or build a dedicated system component under `client/src/systems/` and mount it
   in `WorldScene.tsx`.
3. Wire any per-event color into `client/src/config/colors.ts`.

## Performance

- DPR + particle/star counts gate on a tier picked at startup (`config/quality.ts`).
- Markers, beams, and ripples are `InstancedMesh`-backed — flat draw cost over
  the entire `EVENTS.poolSize` ring buffer.
- Postprocessing leans on bloom + SMAA; MSAA is intentionally off.
