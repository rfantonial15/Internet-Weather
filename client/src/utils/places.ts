import type { GeoPoint } from "@iw/shared";
import { CITIES, type City } from "@iw/shared/cities";

const RAD = Math.PI / 180;

const EARTH_KM = 6371;

/** Nearest metro from the shared city list, with great-circle distance. */
export function nearestCity(p: GeoPoint): City & { km: number } {
  const lat1 = p.lat * RAD;
  let best = CITIES[0];
  let bestCos = -2;
  for (const c of CITIES) {
    const lat2 = c.lat * RAD;
    const cos =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos((p.lon - c.lon) * RAD);
    if (cos > bestCos) {
      bestCos = cos;
      best = c;
    }
  }
  return { ...best, km: Math.acos(Math.max(-1, Math.min(1, bestCos))) * EARTH_KM };
}

/** "near Lima", or "1,400 km from Lima" when the nearest metro is far. */
export function placeLabel(p: GeoPoint): string {
  const c = nearestCity(p);
  if (c.km < 600) return `near ${c.name}`;
  const km = Math.round(c.km / 100) * 100;
  return `${km.toLocaleString("en-US")} km from ${c.name}`;
}
