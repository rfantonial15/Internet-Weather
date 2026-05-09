/**
 * Coarse geo → human region labels. Bounding-box matched in order; the first
 * box that contains the point wins. Boxes overlap deliberately so e.g.
 * Indonesia falls into "Southeast Asia" before "the Asia-Pacific corridor".
 *
 * These labels read aloud naturally in narrator voice ("over the North
 * Atlantic", "across South Asia"). Don't add country-level granularity —
 * narrations should feel planetary.
 */
interface Box {
  name: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

const BOXES: Box[] = [
  { name: "western Europe",         latMin: 36, latMax: 60, lonMin: -10, lonMax: 18 },
  { name: "eastern Europe",         latMin: 40, latMax: 70, lonMin: 18, lonMax: 60 },
  { name: "the British Isles",      latMin: 49, latMax: 60, lonMin: -10, lonMax: 2 },
  { name: "the Mediterranean",      latMin: 30, latMax: 46, lonMin: -6, lonMax: 36 },
  { name: "North America",          latMin: 25, latMax: 70, lonMin: -170, lonMax: -52 },
  { name: "Central America",        latMin: 8,  latMax: 32, lonMin: -120, lonMax: -60 },
  { name: "South America",          latMin: -56, latMax: 13, lonMin: -82, lonMax: -34 },
  { name: "the Middle East",        latMin: 12, latMax: 42, lonMin: 34, lonMax: 64 },
  { name: "North Africa",           latMin: 12, latMax: 36, lonMin: -18, lonMax: 38 },
  { name: "sub-Saharan Africa",     latMin: -36, latMax: 14, lonMin: -20, lonMax: 52 },
  { name: "South Asia",             latMin: 5,  latMax: 36, lonMin: 60, lonMax: 96 },
  { name: "East Asia",              latMin: 18, latMax: 53, lonMin: 96, lonMax: 146 },
  { name: "Southeast Asia",         latMin: -10, latMax: 24, lonMin: 92, lonMax: 142 },
  { name: "Oceania",                latMin: -50, latMax: -8, lonMin: 110, lonMax: 180 },
  { name: "the North Pacific",      latMin: 0,  latMax: 60, lonMin: 145, lonMax: 180 },
  { name: "the South Pacific",      latMin: -55, latMax: 0, lonMin: 145, lonMax: 180 },
  { name: "the North Atlantic",     latMin: 18, latMax: 65, lonMin: -52, lonMax: -10 },
  { name: "the South Atlantic",     latMin: -55, latMax: 18, lonMin: -34, lonMax: -10 },
  { name: "the Arctic",             latMin: 65, latMax: 90, lonMin: -180, lonMax: 180 },
  { name: "the Southern Ocean",     latMin: -90, latMax: -55, lonMin: -180, lonMax: 180 },
];

export function regionForGeo(lat: number, lon: number): string {
  for (const b of BOXES) {
    if (lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax) {
      return b.name;
    }
  }
  // Nothing matched — describe vaguely by hemisphere.
  return lat >= 0 ? "the northern hemisphere" : "the southern hemisphere";
}

/**
 * Centroid of a set of (lat, lon) points. Naive arithmetic mean — fine at
 * the regional resolution we're working at. (Doesn't wrap antimeridian; an
 * event cluster that straddles longitude ±180 will sit "in the middle of
 * the world" instead, which we don't currently care about for narration.)
 */
export function centroid(points: Array<{ lat: number; lon: number }>): { lat: number; lon: number } | undefined {
  if (points.length === 0) return undefined;
  let lat = 0;
  let lon = 0;
  for (const p of points) {
    lat += p.lat;
    lon += p.lon;
  }
  return { lat: lat / points.length, lon: lon / points.length };
}
