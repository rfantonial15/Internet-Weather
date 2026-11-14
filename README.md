# Internet Weather

A cinematic, realtime weather simulation of human civilization.

Rage becomes purple lightning. Memes migrate across continents in swarms.
Builds and deploys flare the city lights on the night side. Breaking news
sends shockwaves out from where it happened. The planet is the real Earth:
real coastlines, real cities, and a day/night terminator that follows the
actual sun.

This is not a dashboard. It's a living planet.

---

## Running

```bash
npm install
npm run dev
```

This starts:

- the **WebSocket server** on `:8787/ws` (simulated feed + narrator)
- the **Vite dev server** on `:5173`

Open http://localhost:5173. With no server running, the client runs the
same simulation and narrator locally, so the planet is never empty.

| Command | What it does |
|---|---|
| `npm run dev` | server + client with hot reload |
| `npm run build` | type-checks and builds `client/dist` and `server/dist` |
| `npm run typecheck` | type-checks client and server |
| `npm start -w server` | runs the built server (`server/dist/server/src/index.js`) |

## Controls

| Input | Action |
|---|---|
| Drag | orbit the globe |
| Scroll / pinch | zoom |
| Click a signal | lock on and show its details |
| Click empty globe | look at that spot |
| Double-click | reset zoom |
| Arrow keys, `+` / `-` | orbit and zoom from the keyboard |
| `Esc` | release the lock, close the clip reel |
| Ticker row | fly to that signal |

The camera drifts back into its idle orbit after a few quiet seconds.

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `VITE_WS_URL` | client build | same host (`wss://host/ws`) on https, `ws://host:8787/ws` on http | WebSocket endpoint. Set to an empty string for a static deploy with no server. |
| `PORT` / `HOST` | server | `8787` / `0.0.0.0` | where the WebSocket server listens |
| `ANTHROPIC_API_KEY` | server | unset | narrate with Claude instead of templates (also `npm i -w server @anthropic-ai/sdk`) |
| `IW_NARRATOR_MODEL` | server | `claude-haiku-5-5` | model for the Claude narrator |
| `?q=low\|medium\|high\|ultra` | URL | auto | pin the quality tier (turns off adaptive quality) |

## Architecture

```
client/src/
  config/        palette, scene constants, quality tiers
  core/
    engine/      Canvas, PostFX, adaptive quality probe
    camera/      CameraDirector (pure math) + CinematicCamera (input, R3F bridge)
    time/        WorldClock: writes the shared frame uniforms
    frameUniforms.ts   time, real sun direction, tension, point scale
  systems/
    globe/       Globe, CityLights, NeuralCurrents, CloudLayer, Atmosphere,
                 earthMap.ts (bakes land / coast / night-lights texture)
    weather/     ambient storms, auroral ovals, per-event renderers
    events/      markers, beams, shockwave rings
  simulation/    per-event phenomena (storm cells, lightning, heat, swarms)
  cinematic/     story detection, camera choreography, clip recorder
  realtime/      socket, ingest (validation), local feed + local narrator
  ui/            HUD, ticker, readouts, narration, clip reel
server/src/
  sources/       pluggable EventSource + simulated source
  pipeline/      composes active sources into one stream
  narration/     server wiring + optional Claude narrator
shared/
  types.ts       wire format used by both ends
  cities.ts      metro list (lat/lon/population)
  simulation.ts  simulated signal generator (server and browser)
  narration/     classifier, tone selector, engine, template narrator
```

### Design rules

- **One Canvas, many systems.** A new phenomenon is a component in
  `WorldScene.tsx`. Systems never reach across.
- **State has one home.** Events live in one ring buffer; per-frame values
  live in `frameUniforms` and never go through React state.
- **Geography is fixed.** The globe never rotates; the camera moves. Event
  coordinates, continents and city lights always agree.
- **Camera math is pure.** `CameraDirector` is plain TypeScript.
- **Shaders are files.** GLSL lives under `shaders/` (via `vite-plugin-glsl`).
- **Sources are pluggable.** Real signals implement `EventSource`; the client
  routes by `kind`, not by source.

## Adding real sources

Implement `server/src/sources/source.ts`:

```ts
export const githubSource: EventSource = {
  key: "github",
  start(emit) { /* poll the GitHub events API, call emit(...) */ },
  stop() { /* cleanup */ },
};
```

Register it in `server/src/pipeline/eventPipeline.ts`. The client needs no
changes. Incoming events are validated on ingest (unknown kinds, bad
coordinates and duplicate ids are dropped), so a misbehaving source can't
crash the renderer.

## Adding new phenomena

1. Add a kind to `shared/types.ts` and `client/src/systems/events/eventTypes.ts`.
2. Ride the existing marker / beam / ring pipeline, or build a system under
   `client/src/systems/` and mount it in `WorldScene.tsx`.
3. Add its colour to `client/src/config/colors.ts` and its label set to
   `shared/simulation.ts`.

## Clips

The reel (bottom right) films stories as they form (auto-capture) or on
demand. Clips are composited at the chosen aspect (9:16, 1:1, 16:9) with the
title card burned in, rendered at up to 2x pixel ratio while recording, and
saved as MP4 where the browser supports it (WebM otherwise).

## Performance

- Static planet data (land, coasts, night lights) is baked once into one
  texture at startup instead of being re-derived from noise every frame.
- Quality tiers gate pixel ratio, sphere detail, particle counts and the
  neural layer. The probe steps down on sustained low frame rates (ignoring
  hidden-tab frames), may step up once, and pauses while recording.
- Markers, beams and rings are instanced over one 256-event ring buffer.
- Point sprites are sized in world units from the real viewport and FOV.
- Post: FXAA, mipmapped bloom, vignette. (SMAA is avoided: it triggers a
  per-frame `glBlitFramebuffer` error in postprocessing 6.39.)

## Data

Land polygons: [Natural Earth](https://www.naturalearthdata.com/) 1:50m
(public domain), via [world-atlas](https://github.com/topojson/world-atlas)
(ISC), served from `client/public/data/land-50m.json`. City populations are
rounded metro estimates.
