import type { WeatherEvent } from "@iw/shared";
import type { EventSource } from "../sources/source.js";
import { simulatedSource } from "../sources/simulatedSource.js";

/**
 * Composes the active set of sources and forwards every emitted event to a
 * single sink (the broadcaster). When real sources are added, register them
 * here — this stays the only place that knows what is "on".
 */
export function runEventPipeline(emit: (e: WeatherEvent) => void) {
  const sources: EventSource[] = [
    simulatedSource,
    // githubSource, newsSource, trendsSource — register when implemented.
  ];

  for (const s of sources) {
    void s.start((event) => emit({ ...event, source: s.key }));
  }
}
