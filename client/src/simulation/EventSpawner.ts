import type { EventKind, WeatherEvent } from "@iw/shared";
import { useEventStore } from "@/state/useEventStore";
import { weather } from "./WeatherSystem";

/**
 * Bridge between the global event store and the WeatherSystem.
 *
 * Subscribes to `lastId` only — Zustand calls back only when a new event
 * arrives, no diffing needed. The handler reaches into `events` for the
 * full payload and routes to weather.spawn().
 *
 * Also exposes a manual spawnAt() for designers / debug overlays — useful
 * for staging a "demo run" that fires controlled bursts of each kind to
 * inspect each phenomenon in isolation.
 */
export function startEventSpawner(): () => void {
  let lastSeen: string | null = null;

  const unsub = useEventStore.subscribe((state) => {
    if (state.lastId === lastSeen) return;
    lastSeen = state.lastId;
    const last = state.events[state.events.length - 1];
    if (last) weather.spawn(last);
  });

  return unsub;
}

/**
 * Manually spawn an event at a given location. Doesn't go through the
 * event store — fires directly into the simulation. Use for testing or
 * for in-app "inject demo event" affordances.
 */
export function spawnAt(
  kind: EventKind,
  lat: number,
  lon: number,
  intensity = 0.7,
  label = "manual",
) {
  const e: WeatherEvent = {
    id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind,
    intensity: Math.max(0, Math.min(1, intensity)),
    t: Date.now(),
    at: { lat, lon },
    label,
    source: "manual",
  };
  weather.spawn(e);
}

/**
 * Fire a coordinated burst — useful as a demo trigger ("show me everything
 * happening at once"). Each kind lands at a different latitude/longitude
 * so all phenomena are simultaneously visible without overlap.
 */
export function spawnDemoBurst() {
  const samples: Array<[EventKind, number, number, number]> = [
    ["rage", 40, -74, 0.9],
    ["controversy", 51, -0.1, 0.85],
    ["controversy", 35, 139, 0.8],
    ["viral", -34, -58, 0.95],
    ["trend", 13, 100, 0.7],
    ["meme", 48, 2, 0.8],
    ["wholesome", -33, 151, 0.9],
    ["wholesome", 1, 103, 0.7],
  ];
  let i = 0;
  for (const [kind, lat, lon, intensity] of samples) {
    setTimeout(() => spawnAt(kind, lat, lon, intensity, `demo:${kind}`), i++ * 220);
  }
}
