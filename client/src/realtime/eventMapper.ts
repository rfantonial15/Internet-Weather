import type { EventKind, WeatherEvent } from "@iw/shared";
import { useEventStore } from "@/state/useEventStore";

const KINDS: ReadonlySet<EventKind> = new Set<EventKind>([
  "rage",
  "wholesome",
  "viral",
  "trend",
  "news",
  "build",
  "controversy",
  "meme",
]);

const MAX_LABEL = 64;

/** Recently seen ids: a duplicate frame (reconnect overlap, replay) is dropped. */
const SEEN_KEEP = 1024;
const seen = new Set<string>();
const seenOrder: string[] = [];

function firstSighting(id: string): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  seenOrder.push(id);
  if (seenOrder.length > SEEN_KEEP) seen.delete(seenOrder.shift()!);
  return true;
}

/**
 * Single ingestion seam. Every event (server or local simulation) lands
 * here, is validated and normalized, and is pushed into the store.
 *
 *   - Duplicate ids are dropped (reconnect overlap, replays).
 *   - Unknown kinds are dropped: every visual system indexes tables by kind,
 *     so one bad frame from a server would otherwise crash the render loop.
 *   - Coordinates must be finite and are clamped to valid ranges.
 *   - `t` is restamped with the local receive time. Lifetimes and fades are
 *     computed against `Date.now()` on this machine, so a server whose clock
 *     is a few seconds off can't make events appear early or linger.
 */
export function ingest(raw: WeatherEvent) {
  if (!raw || typeof raw !== "object") return;
  if (typeof raw.id !== "string" || !KINDS.has(raw.kind)) return;
  const id = raw.id.slice(0, 96);
  if (!firstSighting(id)) return;

  const intensity = Number.isFinite(raw.intensity)
    ? Math.max(0, Math.min(1, raw.intensity))
    : 0.5;

  let at: WeatherEvent["at"];
  if (raw.at && Number.isFinite(raw.at.lat) && Number.isFinite(raw.at.lon)) {
    const lat = Math.max(-90, Math.min(90, raw.at.lat));
    const lon = ((((raw.at.lon + 180) % 360) + 360) % 360) - 180;
    at = { lat, lon };
  }

  const e: WeatherEvent = {
    id,
    kind: raw.kind,
    intensity,
    t: Date.now(),
    at,
    label: typeof raw.label === "string" ? raw.label.slice(0, MAX_LABEL) : undefined,
    source: typeof raw.source === "string" ? raw.source.slice(0, 32) : "unknown",
  };
  useEventStore.getState().push(e);
}
