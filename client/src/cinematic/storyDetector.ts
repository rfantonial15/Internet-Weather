import type { EventKind, GeoPoint, WeatherEvent } from "@iw/shared";

/**
 * Detects "stories" worth filming. A story is a tight spatial cluster of
 * thematically related events inside a recent time window. We don't try to
 * be clever about co-occurring kinds — keeping the rule simple lets future
 * tuning happen in numbers, not branches.
 *
 * Output: a self-contained Story record with epicenter, magnitude (0..1),
 * dominant kind, dominant source, and the contributing event ids. The
 * capture director consumes this and choreographs everything from there.
 */

export interface Story {
  id: string;
  /** When the cluster crossed the trigger threshold. */
  t: number;
  /** Median lat/lon of contributing events; the camera focuses here. */
  epicenter: GeoPoint;
  /** Driving event kind (mode of the cluster). */
  kind: EventKind;
  /** Driving source slug (e.g. "github", "reddit", "sim", "news"). */
  source: string;
  /** 0..1 — combines event count, intensity, and tightness. */
  magnitude: number;
  /** Geographic spread, radians (cluster radius on unit sphere). */
  spread: number;
  /** Up to ~16 ids for replay / debugging / overlay refs. */
  refs: string[];
}

/** Tunables. Reasonable defaults for an active feed. */
export const DETECTOR = {
  /** Look-back window for cluster scans, ms. */
  windowMs: 6500,
  /** Minimum events required in a cluster. */
  minCount: 4,
  /** Maximum great-circle distance between cluster members, radians (~25°). */
  maxRadius: 0.44,
  /** Suppress repeat stories about the same epicenter for this long. */
  cooldownMs: 22_000,
  /** Suppress globally for this long after firing (one story at a time). */
  globalCooldownMs: 14_000,
  /** Magnitude floor — below this, the cluster isn't dramatic enough. */
  minMagnitude: 0.32,
} as const;

interface Recent {
  e: WeatherEvent;
  // Cached unit vector for fast great-circle math.
  x: number;
  y: number;
  z: number;
}

const FILM_KINDS: EventKind[] = [
  "rage",
  "wholesome",
  "viral",
  "trend",
  "news",
  "controversy",
  "meme",
  "build",
];

function unit(lat: number, lon: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ];
}

/** Inverse of unit() — vector → geo, used to recover the centroid. */
function vecToGeo(x: number, y: number, z: number): GeoPoint {
  const len = Math.hypot(x, y, z) || 1;
  const ny = y / len;
  const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, ny))) * 180) / Math.PI;
  const lon = (Math.atan2(z / len, -x / len) * 180) / Math.PI - 180;
  return { lat, lon: ((lon + 540) % 360) - 180 };
}

function angBetween(a: Recent, b: Recent): number {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  return Math.acos(dot);
}

function mode<T extends string>(items: T[]): T {
  const c = new Map<T, number>();
  for (const it of items) c.set(it, (c.get(it) ?? 0) + 1);
  let best: T = items[0];
  let bestN = 0;
  for (const [k, n] of c) if (n > bestN) ((best = k), (bestN = n));
  return best;
}

/**
 * Stateful detector. Call ingest() for every event; periodically call scan()
 * (e.g. every 500ms). scan() returns a Story when one fires, otherwise null.
 */
export class StoryDetector {
  private recent: Recent[] = [];
  private lastFireT = 0;
  private cooldownByCell = new Map<string, number>();
  private counter = 0;

  ingest(e: WeatherEvent) {
    if (!e.at) return;
    if (!FILM_KINDS.includes(e.kind)) return;
    const [x, y, z] = unit(e.at.lat, e.at.lon);
    this.recent.push({ e, x, y, z });
    // Cap memory; window-based pruning happens in scan().
    if (this.recent.length > 512) this.recent.splice(0, this.recent.length - 512);
  }

  scan(now = Date.now()): Story | null {
    // Drop stale entries.
    const cutoff = now - DETECTOR.windowMs;
    while (this.recent.length && this.recent[0].e.t < cutoff) this.recent.shift();

    if (now - this.lastFireT < DETECTOR.globalCooldownMs) return null;
    if (this.recent.length < DETECTOR.minCount) return null;

    // Greedy: pick the event whose neighborhood (kind-matched, within radius)
    // has the highest weighted score. O(n²) is fine for n ≤ ~256.
    let bestSeed = -1;
    let bestScore = 0;
    let bestMembers: number[] = [];

    for (let i = 0; i < this.recent.length; i++) {
      const seed = this.recent[i];
      const members: number[] = [];
      let intensitySum = 0;
      for (let j = 0; j < this.recent.length; j++) {
        const cand = this.recent[j];
        if (cand.e.kind !== seed.e.kind) continue;
        if (angBetween(seed, cand) > DETECTOR.maxRadius) continue;
        members.push(j);
        intensitySum += cand.e.intensity;
      }
      if (members.length < DETECTOR.minCount) continue;
      // Recency bias: events closer to "now" carry more weight.
      const recencyBoost =
        members.reduce((s, idx) => {
          const age = now - this.recent[idx].e.t;
          return s + (1 - age / DETECTOR.windowMs);
        }, 0) / members.length;

      const score = intensitySum * (0.6 + 0.4 * recencyBoost);
      if (score > bestScore) {
        bestScore = score;
        bestSeed = i;
        bestMembers = members;
      }
    }

    if (bestSeed < 0) return null;

    // Centroid in 3-space, normalized — robust to longitude wraparound.
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const idx of bestMembers) {
      cx += this.recent[idx].x;
      cy += this.recent[idx].y;
      cz += this.recent[idx].z;
    }
    const epicenter = vecToGeo(cx, cy, cz);

    // Spread = mean distance to centroid.
    const cLen = Math.hypot(cx, cy, cz) || 1;
    const cnx = cx / cLen;
    const cny = cy / cLen;
    const cnz = cz / cLen;
    let spread = 0;
    for (const idx of bestMembers) {
      const r = this.recent[idx];
      const dot = Math.max(-1, Math.min(1, r.x * cnx + r.y * cny + r.z * cnz));
      spread += Math.acos(dot);
    }
    spread /= bestMembers.length;

    const meanIntensity = bestMembers.reduce(
      (s, idx) => s + this.recent[idx].e.intensity, 0,
    ) / bestMembers.length;

    // Magnitude: blends count, intensity, and tightness of the cluster.
    const tightness = 1 - Math.min(1, spread / DETECTOR.maxRadius);
    const countTerm = Math.min(1, (bestMembers.length - DETECTOR.minCount) / 8 + 0.5);
    const magnitude = Math.min(1, 0.45 * countTerm + 0.35 * meanIntensity + 0.20 * tightness);
    if (magnitude < DETECTOR.minMagnitude) return null;

    // Per-cell cooldown — quantize the epicenter to a coarse grid so a
    // re-flare in the same area doesn't immediately retrigger.
    const cellKey = cellOf(epicenter);
    const lastCell = this.cooldownByCell.get(cellKey) ?? 0;
    if (now - lastCell < DETECTOR.cooldownMs) return null;

    const kinds = bestMembers.map((idx) => this.recent[idx].e.kind);
    const sources = bestMembers.map((idx) => this.recent[idx].e.source);
    const refs = bestMembers.slice(-16).map((idx) => this.recent[idx].e.id);

    const story: Story = {
      id: `story_${now}_${this.counter++}`,
      t: now,
      epicenter,
      kind: mode(kinds),
      source: mode(sources),
      magnitude,
      spread,
      refs,
    };

    this.lastFireT = now;
    this.cooldownByCell.set(cellKey, now);
    return story;
  }
}

function cellOf(p: GeoPoint): string {
  // 12° cells — coarse enough that "the same area" really is the same area.
  const a = Math.floor((p.lat + 90) / 12);
  const b = Math.floor((((p.lon + 180) % 360) + 360) % 360 / 12);
  return `${a}:${b}`;
}
