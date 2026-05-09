import type { WeatherEvent } from "@iw/shared";

/**
 * Sources are pluggable. Each implementation watches a real-world signal
 * (GitHub events, RSS, Trends API, etc.) and emits normalized WeatherEvents
 * via the provided callback. Sources own their own polling/streaming logic
 * and must call `stop()` cleanly.
 */
export interface EventSource {
  readonly key: string;
  start(emit: (event: WeatherEvent) => void): void | Promise<void>;
  stop(): void | Promise<void>;
}
