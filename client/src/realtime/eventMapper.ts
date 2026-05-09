import type { WeatherEvent } from "@iw/shared";
import { useEventStore } from "@/state/useEventStore";

/**
 * Single ingestion seam. Server messages land here; they are normalized
 * (sanity-checked + intensity clamped) and pushed into the global store.
 *
 * If we later add transforms (decay, dedupe, geo-jitter), they belong here —
 * not inside individual visual systems.
 */
export function ingest(e: WeatherEvent) {
  if (!e || typeof e.id !== "string" || typeof e.kind !== "string") return;
  const intensity = Math.max(0, Math.min(1, e.intensity ?? 0.5));
  const t = typeof e.t === "number" ? e.t : Date.now();
  useEventStore.getState().push({ ...e, intensity, t });
}
