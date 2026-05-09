import type { EventKind, WeatherEvent } from "@iw/shared";
import type { EventSource } from "./source.js";

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
const TOTAL = KINDS.reduce((s, k) => s + k.weight, 0);

const LABELS: Record<EventKind, string[]> = {
  rage: ["flame war", "thread meltdown", "discourse vortex"],
  wholesome: ["happy news", "kindness chain", "milestone"],
  viral: ["viral clip", "share spike"],
  trend: ["topic surge", "hashtag wave"],
  news: ["breaking story", "live update"],
  build: ["deploy", "merge to main", "release cut"],
  controversy: ["ratio incident", "split take"],
  meme: ["meme outbreak", "format remix"],
};

function pickKind(): EventKind {
  let r = Math.random() * TOTAL;
  for (const k of KINDS) {
    r -= k.weight;
    if (r <= 0) return k.kind;
  }
  return "build";
}

/** Default backing source — keeps the planet alive without external APIs. */
export const simulatedSource: EventSource = {
  key: "sim",
  start(emit) {
    let counter = 0;
    const tick = () => {
      const burst = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < burst; i++) {
        const kind = pickKind();
        const e: WeatherEvent = {
          id: `sim_${Date.now()}_${counter++}`,
          kind,
          intensity:
            kind === "news" ? 0.7 + Math.random() * 0.3
            : kind === "viral" ? 0.5 + Math.random() * 0.4
            : 0.2 + Math.random() * 0.6,
          t: Date.now(),
          at: {
            lat: (Math.random() * 130 - 65) * 0.7,
            lon: Math.random() * 360 - 180,
          },
          label: LABELS[kind][Math.floor(Math.random() * LABELS[kind].length)],
          source: "sim",
        };
        emit(e);
      }
    };
    tick();
    (this as { _t?: NodeJS.Timeout })._t = setInterval(tick, 750);
  },
  stop() {
    const t = (this as { _t?: NodeJS.Timeout })._t;
    if (t) clearInterval(t);
  },
};
