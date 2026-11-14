import type { EventKind, WeatherEvent } from "./types.js";
import { pointNearCity } from "./cities.js";

/**
 * The simulated signal generator, shared by the server's default source and
 * the browser's offline fallback so both produce the same weather.
 *
 * Distribution is hand-tuned: more "build" pulses than rage, rare large news
 * shockwaves, which gives the planet a calm-but-alive feel. Locations come
 * from the metro list (weighted by population), so signals land where
 * people actually are instead of uniformly over the oceans.
 */
const KINDS: { kind: EventKind; weight: number }[] = [
  { kind: "build", weight: 0.3 },
  { kind: "wholesome", weight: 0.17 },
  { kind: "trend", weight: 0.12 },
  { kind: "viral", weight: 0.1 },
  { kind: "rage", weight: 0.1 },
  { kind: "controversy", weight: 0.08 },
  { kind: "meme", weight: 0.09 },
  { kind: "news", weight: 0.04 },
];

const TOTAL_WEIGHT = KINDS.reduce((s, k) => s + k.weight, 0);

const LABELS: Record<EventKind, string[]> = {
  rage: ["flame war", "thread meltdown", "quote-post pile-on", "discourse vortex"],
  wholesome: ["happy news", "rescue story", "kindness chain", "milestone"],
  viral: ["viral clip", "share spike", "trending video"],
  trend: ["topic surge", "search spike", "hashtag wave"],
  news: ["breaking story", "live update", "press alert"],
  build: ["deploy", "merge to main", "release cut", "PR opened"],
  controversy: ["ratio incident", "split take", "factional split"],
  meme: ["meme outbreak", "format remix", "ironic surge"],
};

function pickKind(rand: () => number): EventKind {
  let r = rand() * TOTAL_WEIGHT;
  for (const k of KINDS) {
    r -= k.weight;
    if (r <= 0) return k.kind;
  }
  return "build";
}

function intensityFor(kind: EventKind, rand: () => number): number {
  if (kind === "news") return 0.7 + rand() * 0.3;
  if (kind === "viral") return 0.5 + rand() * 0.4;
  return 0.2 + rand() * 0.6;
}

/** One simulated event. `seq` keeps ids unique within a source. */
export function makeSimEvent(seq: number, rand: () => number = Math.random): WeatherEvent {
  const kind = pickKind(rand);
  const labels = LABELS[kind];
  const { lat, lon } = pointNearCity(kind === "news" ? 0.8 : 1.6, rand);
  const now = Date.now();
  return {
    id: `sim_${now.toString(36)}_${seq}`,
    kind,
    intensity: intensityFor(kind, rand),
    t: now,
    at: { lat, lon },
    label: labels[Math.floor(rand() * labels.length)],
    source: "sim",
  };
}

/** Events per tick: 1 to 3, so the cadence feels organic. */
export function simBurstSize(rand: () => number = Math.random): number {
  return 1 + Math.floor(rand() * 3);
}
