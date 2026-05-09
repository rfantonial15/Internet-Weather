import type { EventKind, WeatherEvent } from "@iw/shared";
import type { Phenomenon } from "./types.js";
import { regionForGeo, centroid } from "./regions.js";

const WINDOW_MS = 60_000;
/** Slow EWMA so baselines don't track momentary spikes — they're the "normal". */
const BASELINE_ALPHA = 0.05;

/**
 * Per-kind exponentially-weighted moving average of events-per-second.
 * Used as a baseline so we can phrase narrations as deltas ("240% above
 * baseline") rather than absolute counts.
 */
class RateBaseline {
  private rates: Map<EventKind, number> = new Map();

  observe(kind: EventKind, ratePerSec: number) {
    const prev = this.rates.get(kind) ?? ratePerSec;
    this.rates.set(kind, prev + (ratePerSec - prev) * BASELINE_ALPHA);
  }

  get(kind: EventKind): number {
    return this.rates.get(kind) ?? 0;
  }
}

/**
 * Detects active phenomena from a sliding window of WeatherEvents.
 *
 * Design notes:
 *   - Detection is rule-based, not learned. Each phenomenon has a "trigger"
 *     condition (count threshold + rate spike) and produces a Phenomenon
 *     with intensity, salience, and supporting refs.
 *   - Salience is what the engine uses to *pick* which phenomenon to
 *     narrate; it's deliberately distinct from intensity. A news_shock
 *     with one event has high salience (rare → narratable) but moderate
 *     intensity (one event); a build_wave with twenty events has high
 *     intensity but lower salience (background pattern, narratable only
 *     above a sustained threshold).
 *   - Anti-thrashing: rate spikes are computed against EWMA baseline, not
 *     instant deltas, so a single quiet second doesn't reset everything.
 */
export class EventClassifier {
  private baseline = new RateBaseline();

  classify(events: WeatherEvent[], now: number): Phenomenon[] {
    const win = events.filter((e) => now - e.t < WINDOW_MS);

    const counts = new Map<EventKind, number>();
    const byKind = new Map<EventKind, WeatherEvent[]>();
    for (const e of win) {
      counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
      const arr = byKind.get(e.kind) ?? [];
      arr.push(e);
      byKind.set(e.kind, arr);
    }

    // Update baselines with the per-kind rate observed this window.
    const seconds = WINDOW_MS / 1000;
    const observedKinds: EventKind[] = [
      "rage", "wholesome", "viral", "trend", "news", "build", "controversy", "meme",
    ];
    for (const k of observedKinds) {
      this.baseline.observe(k, (counts.get(k) ?? 0) / seconds);
    }

    const phenomena: Phenomenon[] = [];

    // Each detector is a small pure function; add new ones below without
    // touching the others. Order doesn't matter — we re-rank by salience.
    this.detectControversyFront(byKind.get("controversy") ?? [], phenomena);
    this.detectRageStorm(byKind.get("rage") ?? [], phenomena);
    this.detectViralSurge(byKind.get("viral") ?? [], phenomena);
    this.detectMemeMigration(byKind.get("meme") ?? [], phenomena);
    this.detectBuildWave(byKind.get("build") ?? [], phenomena);
    this.detectWholesomeBloom(byKind.get("wholesome") ?? [], phenomena);
    this.detectNewsShock(byKind.get("news") ?? [], now, phenomena);
    this.detectTrendRising(byKind.get("trend") ?? [], phenomena);
    this.detectQuiet(win, phenomena);

    phenomena.sort((a, b) => b.salience - a.salience);
    return phenomena;
  }

  // ---------- detectors ----------------------------------------------------

  private detectControversyFront(es: WeatherEvent[], out: Phenomenon[]) {
    if (es.length < 3) return;
    const rate = es.length / (WINDOW_MS / 1000);
    const baseline = this.baseline.get("controversy");
    const delta = baselineDeltaPct(rate, baseline);
    out.push({
      kind: "controversy_front",
      count: es.length,
      intensity: clamp(es.length / 8 + avgIntensity(es) * 0.3, 0, 1),
      salience: 0.55 + Math.min(0.4, es.length / 15),
      deltaPct: delta,
      ...locate(es),
      refs: ids(es).slice(-6),
    });
  }

  private detectRageStorm(es: WeatherEvent[], out: Phenomenon[]) {
    if (es.length < 4) return;
    const rate = es.length / (WINDOW_MS / 1000);
    const baseline = this.baseline.get("rage");
    out.push({
      kind: "rage_storm",
      count: es.length,
      intensity: clamp(es.length / 10 + avgIntensity(es) * 0.4, 0, 1),
      salience: 0.6 + Math.min(0.35, es.length / 18),
      deltaPct: baselineDeltaPct(rate, baseline),
      ...locate(es),
      refs: ids(es).slice(-6),
    });
  }

  private detectViralSurge(es: WeatherEvent[], out: Phenomenon[]) {
    if (es.length < 3) return;
    const rate = es.length / (WINDOW_MS / 1000);
    const baseline = this.baseline.get("viral");
    const delta = baselineDeltaPct(rate, baseline);
    if (delta !== null && delta < 30 && es.length < 5) return; // not really surging
    out.push({
      kind: "viral_surge",
      count: es.length,
      intensity: clamp(es.length / 8 + avgIntensity(es) * 0.5, 0, 1),
      salience: 0.65 + Math.min(0.3, es.length / 12),
      deltaPct: delta,
      ...locate(es),
      refs: ids(es).slice(-6),
    });
  }

  private detectMemeMigration(es: WeatherEvent[], out: Phenomenon[]) {
    if (es.length < 3) return;
    const rate = es.length / (WINDOW_MS / 1000);
    const baseline = this.baseline.get("meme");
    out.push({
      kind: "meme_migration",
      count: es.length,
      intensity: clamp(es.length / 8 + avgIntensity(es) * 0.3, 0, 1),
      salience: 0.45 + Math.min(0.35, es.length / 16),
      deltaPct: baselineDeltaPct(rate, baseline),
      ...locate(es),
      refs: ids(es).slice(-6),
    });
  }

  private detectBuildWave(es: WeatherEvent[], out: Phenomenon[]) {
    if (es.length < 8) return;
    const rate = es.length / (WINDOW_MS / 1000);
    const baseline = this.baseline.get("build");
    out.push({
      kind: "build_wave",
      count: es.length,
      intensity: clamp(es.length / 25, 0, 1),
      salience: 0.4 + Math.min(0.3, es.length / 30),
      deltaPct: baselineDeltaPct(rate, baseline),
      ...locate(es),
      refs: ids(es).slice(-6),
    });
  }

  private detectWholesomeBloom(es: WeatherEvent[], out: Phenomenon[]) {
    if (es.length < 3) return;
    const rate = es.length / (WINDOW_MS / 1000);
    const baseline = this.baseline.get("wholesome");
    out.push({
      kind: "wholesome_bloom",
      count: es.length,
      intensity: clamp(es.length / 7 + avgIntensity(es) * 0.4, 0, 1),
      salience: 0.5 + Math.min(0.3, es.length / 12),
      deltaPct: baselineDeltaPct(rate, baseline),
      ...locate(es),
      refs: ids(es).slice(-6),
    });
  }

  /** Single high-intensity news event in the recent past — always salient. */
  private detectNewsShock(es: WeatherEvent[], now: number, out: Phenomenon[]) {
    const recent = es.filter((e) => now - e.t < 18_000 && e.intensity > 0.82);
    if (recent.length === 0) return;
    const peak = recent.reduce((a, b) => (a.intensity > b.intensity ? a : b));
    out.push({
      kind: "news_shock",
      count: recent.length,
      intensity: peak.intensity,
      salience: 0.85, // always near the top
      deltaPct: null,
      ...locate(recent),
      refs: recent.map((e) => e.id),
    });
  }

  private detectTrendRising(es: WeatherEvent[], out: Phenomenon[]) {
    if (es.length < 3) return;
    const rate = es.length / (WINDOW_MS / 1000);
    const baseline = this.baseline.get("trend");
    const delta = baselineDeltaPct(rate, baseline);
    out.push({
      kind: "trend_rising",
      count: es.length,
      intensity: clamp(es.length / 8, 0, 1),
      salience: 0.4 + Math.min(0.25, es.length / 14),
      deltaPct: delta,
      ...locate(es),
      refs: ids(es).slice(-6),
    });
  }

  /** Low overall activity → narrate the silence. */
  private detectQuiet(win: WeatherEvent[], out: Phenomenon[]) {
    if (win.length >= 12) return;
    out.push({
      kind: "quiet",
      count: win.length,
      intensity: 0.2,
      salience: 0.35, // low — only narrate when nothing else is interesting
      deltaPct: null,
      refs: [],
    });
  }
}

// ---------- helpers --------------------------------------------------------

function avgIntensity(es: WeatherEvent[]): number {
  if (es.length === 0) return 0;
  let s = 0;
  for (const e of es) s += e.intensity;
  return s / es.length;
}

function ids(es: WeatherEvent[]): string[] {
  return es.map((e) => e.id);
}

function locate(es: WeatherEvent[]): Pick<Phenomenon, "centroid" | "region"> {
  const located = es.filter((e): e is WeatherEvent & { at: NonNullable<WeatherEvent["at"]> } => !!e.at);
  if (located.length === 0) return {};
  const c = centroid(located.map((e) => e.at));
  if (!c) return {};
  return { centroid: c, region: regionForGeo(c.lat, c.lon) };
}

function clamp(v: number, mn: number, mx: number): number {
  return v < mn ? mn : v > mx ? mx : v;
}

/**
 * % deviation of `current` from `baseline`. Returns null if the baseline is
 * effectively zero — a delta of "infinity %" would be technically true but
 * narratively useless.
 */
function baselineDeltaPct(current: number, baseline: number): number | null {
  if (baseline < 0.005) return null;
  return Math.round(((current - baseline) / baseline) * 100);
}
