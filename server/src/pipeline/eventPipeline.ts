import type { WeatherEvent } from "@iw/shared";
import type { EventSource } from "../sources/source.js";
import { simulatedSource } from "../sources/simulatedSource.js";

/**
 * Composes the active sources and forwards every event to one sink (the
 * broadcaster). Register real sources here; this stays the only place that
 * knows what is switched on. Returns a handle that stops every source.
 */
export function runEventPipeline(emit: (e: WeatherEvent) => void): { stop: () => void } {
  const sources: EventSource[] = [
    simulatedSource,
    // githubSource, newsSource, trendsSource: register when implemented.
  ];

  for (const s of sources) {
    Promise.resolve(s.start((event) => emit({ ...event, source: s.key }))).catch((err) => {
      console.error(`[pipeline] source '${s.key}' failed to start:`, err);
    });
  }

  return {
    stop: () => {
      for (const s of sources) void s.stop();
    },
  };
}
