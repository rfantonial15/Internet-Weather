import type { EventKind, WeatherEvent } from "../types.js";
import type { Phenomenon } from "./types.js";
import { regionForGeo, centroid } from "./regions.js";

const WINDOW_MS = 60_000;
/** Slow EWMA so baselines don't track momentary spikes — they're the "normal". */
const BASELINE_ALPHA = 0.05;
/** Classifier passes before a baseline is trusted (about 1.5 min at 8 s ticks). */
const BASELINE_WARMUP = 12;
/** Share of located events one region needs before a phenomenon is "over" it. */
const REGION_DOMINANCE = 0.4;

/**
 * Per-kind exponentially-weighted moving average of events-per-second.
 * Used as a baseline so we can phrase narrations as deltas ("240% above
 * baseline") rather than absolute counts.
 */
class RateBaseline {
  private rates: Map<EventKind, number> = new Map();
  private seen: Map<EventKind, number> = new Map();

  observe(kind: EventKind, ratePerSec: number) {
    const prev = this.rates.get(kind) ?? ratePerSec;
    this.rates.set(kind, prev + (ratePerSec - prev) * BASELINE_ALPHA);
    this.seen.set(kind, (this.seen.get(kind) ?? 0) + 1);
  }

  /**
   * The baseline rate, or 0 while it is still warming up. A young EWMA
   * starts from whatever the first (often near-empty) window held, so for
   * the first minutes every rate looked like "+1349%". Until it has seen
   * enough windows there is no honest "normal" to compare against.
   */
  get(kind: EventKind): number {
    if ((this.seen.get(kind) ?? 0) < BASELINE_WARMUP) return 0;
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

/**
 * Where a phenomenon is happening: the region holding most of its events.
 * Averaging every event's coordinates instead put worldwide activity in
 * "North Africa" (the mean of scattered points). When no region holds a
 * clear share, the phenomenon has no region and the narrator uses a
 * line that doesn't name one.
 */
function locate(es: WeatherEvent[]): Pick<Phenomenon, "centroid" | "region"> {
  const located = es.filter((e): e is WeatherEvent & { at: NonNullable<WeatherEvent["at"]> } => !!e.at);
  if (located.length === 0) return {};
  const byRegion = new Map<string, Array<{ lat: number; lon: number }>>();
  for (const e of located) {
    const r = regionForGeo(e.at.lat, e.at.lon);
    const arr = byRegion.get(r);
    if (arr) arr.push(e.at);
    else byRegion.set(r, [e.at]);
  }
  let region = "";
  let points: Array<{ lat: number; lon: number }> = [];
  for (const [r, pts] of byRegion) {
    if (pts.length > points.length) {
      region = r;
      points = pts;
    }
  }
  if (located.length > 1 && points.length / located.length < REGION_DOMINANCE) return {};
  const c = centroid(points);
  return c ? { centroid: c, region } : {};
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
