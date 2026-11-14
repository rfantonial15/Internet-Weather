import type { WeatherEvent } from "@iw/shared";
import type { EventSource } from "../sources/source.js";
import { simulatedSource } from "../sources/simulatedSource.js";
import { wikimediaSource } from "../sources/wikimediaSource.js";

/** Every source the server knows, by the name used in IW_SOURCES. */
const REGISTRY: Record<string, EventSource> = {
  sim: simulatedSource,
  wikipedia: wikimediaSource,
};

/**
 * Sources to run, from IW_SOURCES (comma separated, default "sim").
 * Unknown names are reported and skipped; an empty result falls back to sim.
 */
export function selectSources(spec = process.env.IW_SOURCES ?? "sim"): EventSource[] {
  const picked: EventSource[] = [];
  for (const raw of spec.split(",")) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    const s = REGISTRY[name];
    if (!s) console.warn(`[pipeline] unknown source '${name}' (known: ${Object.keys(REGISTRY).join(", ")})`);
    else if (!picked.includes(s)) picked.push(s);
  }
  return picked.length ? picked : [simulatedSource];
}

/**
 * Composes the active sources and forwards every event to one sink (the
 * broadcaster). This stays the only place that knows what is switched on.
 * Returns the running source names and a handle that stops them all.
 */
export function runEventPipeline(emit: (e: WeatherEvent) => void): { sources: string[]; stop: () => void } {
  const sources = selectSources();

  for (const s of sources) {
    Promise.resolve(s.start((event) => emit({ ...event, source: s.key }))).catch((err) => {
      console.error(`[pipeline] source '${s.key}' failed to start:`, err);
    });
  }

  return {
    sources: sources.map((s) => s.key),
    stop: () => {
      for (const s of sources) void s.stop();
    },
  };
}
