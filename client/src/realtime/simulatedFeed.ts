import type { EventKind, WeatherEvent } from "@iw/shared";
import { ingest } from "./eventMapper";

/**
 * Local procedural event generator. Used both as a fallback when the server
 * is unreachable and as the seed feed during the first second of boot.
 *
 * Distribution is intentionally hand-tuned: more "build" pulses than rage,
 * with rare large news shockwaves — gives the planet a calm-but-alive feel.
 */
const KINDS: { kind: EventKind; weight: number }[] = [
  { kind: "build", weight: 0.32 },
  { kind: "wholesome", weight: 0.18 },
  { kind: "trend", weight: 0.12 },
  { kind: "viral", weight: 0.10 },
  { kind: "rage", weight: 0.10 },
  { kind: "controversy", weight: 0.08 },
  { kind: "meme", weight: 0.07 },
  { kind: "news", weight: 0.03 },
];

const TOTAL_WEIGHT = KINDS.reduce((s, k) => s + k.weight, 0);

const LABELS: Record<EventKind, string[]> = {
  rage:        ["flame war", "thread meltdown", "quote-tweet pile-on", "discourse vortex"],
  wholesome:   ["happy news", "rescue story", "kindness chain", "milestone"],
  viral:       ["viral clip", "share spike", "trending video"],
  trend:       ["topic surge", "search spike", "hashtag wave"],
  news:        ["breaking story", "live update", "press alert"],
  build:       ["deploy", "merge to main", "release cut", "PR opened"],
  controversy: ["ratio incident", "split take", "factional split"],
  meme:        ["meme outbreak", "format remix", "ironic surge"],
};

function pickKind(): EventKind {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const k of KINDS) {
    r -= k.weight;
    if (r <= 0) return k.kind;
  }
  return "build";
}

function pickLabel(k: EventKind) {
  const arr = LABELS[k];
  return arr[Math.floor(Math.random() * arr.length)];
}

let timer: number | null = null;
let counter = 0;

function emit() {
  const kind = pickKind();
  // Bias geography toward populated bands.
  const lat = (Math.random() * 130 - 65) * 0.7;
  const lon = Math.random() * 360 - 180;
  const intensity =
    kind === "news" ? 0.7 + Math.random() * 0.3
    : kind === "viral" ? 0.5 + Math.random() * 0.4
    : 0.2 + Math.random() * 0.6;
  const e: WeatherEvent = {
    id: `sim_${Date.now()}_${counter++}`,
    kind,
    intensity,
    t: Date.now(),
    at: { lat, lon },
    label: pickLabel(kind),
    source: "sim",
  };
  ingest(e);
}

export function startSimulatedFeed() {
  if (timer != null) return;
  // Burst on start, then slow cadence.
  for (let i = 0; i < 6; i++) emit();
  timer = window.setInterval(() => {
    const burst = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < burst; i++) emit();
  }, 700);
}

export function stopSimulatedFeed() {
  if (timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
}
