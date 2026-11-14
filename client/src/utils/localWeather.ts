import type { EventKind, GeoPoint, WeatherEvent } from "@iw/shared";
import { kmBetween } from "./places";

/** How far "near you" reaches, and how far back "now" looks. */
export const LOCAL_RADIUS_KM = 1500;
export const LOCAL_WINDOW_MS = 60_000;

/** What each kind looks like as weather, for the local headline. */
export const WEATHER_WORD: Record<EventKind, string> = {
  rage: "rage storms",
  controversy: "pressure fronts",
  viral: "viral flares",
  trend: "rising currents",
  news: "news shockwaves",
  meme: "meme swarms",
  build: "build lights",
  wholesome: "kindness aurora",
};

export interface LocalReport {
  total: number;
  /** Most common kind nearby, or null when it is quiet. */
  dominant: EventKind | null;
  /** "Clear skies", "Light meme swarms", "Heavy rage storms"... */
  headline: string;
  /** Activity in the newer half of the window against the older half. */
  trend: "building" | "easing" | "steady";
}

export function localReport(events: readonly WeatherEvent[], home: GeoPoint, now: number): LocalReport {
  const counts = new Map<EventKind, number>();
  let total = 0;
  let recent = 0;
  for (const e of events) {
    const age = now - e.t;
    if (!e.at || age < 0 || age > LOCAL_WINDOW_MS) continue;
    if (kmBetween(e.at, home) > LOCAL_RADIUS_KM) continue;
    total++;
    if (age < LOCAL_WINDOW_MS / 2) recent++;
    counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  }

  let dominant: EventKind | null = null;
  let best = 0;
  for (const [k, n] of counts) {
    if (n > best) {
      best = n;
      dominant = k;
    }
  }

  const older = total - recent;
  const trend = recent >= older + 2 ? "building" : older >= recent + 2 ? "easing" : "steady";

  if (!dominant) return { total, dominant, headline: "Clear skies", trend };
  const level = total <= 2 ? "Light" : total <= 5 ? "Moderate" : "Heavy";
  return { total, dominant, headline: `${level} ${WEATHER_WORD[dominant]}`, trend };
}
