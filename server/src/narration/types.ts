import type { PhenomenonKind } from "@iw/shared";

/**
 * A high-level pattern detected from a sliding window of events. This is the
 * unit the narrator works in — never raw events. Phenomena are scored by
 * `salience` and the engine narrates the highest-scoring one each tick.
 */
export interface Phenomenon {
  kind: PhenomenonKind;

  /** Aggregate intensity 0..1 — drives the rendered overlay's prominence. */
  intensity: number;

  /**
   * Salience (also 0..1) — used by the engine to pick which phenomenon to
   * narrate when several are active. Distinct from intensity because some
   * patterns are visually striking but rare (news_shock) while others are
   * always-on but only narratable above a threshold (build_wave).
   */
  salience: number;

  /** Number of supporting events. */
  count: number;

  /** % deviation from baseline rate. null if baseline isn't established yet. */
  deltaPct: number | null;

  /** Centroid of activity for location-meaningful phenomena. */
  centroid?: { lat: number; lon: number };

  /** Human region label (e.g., "the North Atlantic"). */
  region?: string;

  /** Supporting event ids — included on the wire for click-to-zoom. */
  refs: string[];
}

/**
 * Side data the narrator may want when generating text — current global
 * tension, time-of-day on the visualized planet, etc. Lets us write tone-
 * aware templates ("late-cycle calm", "post-news quiet") without coupling
 * the narrator to engine internals.
 */
export interface NarrationContext {
  tension: number;
  totalEventsInWindow: number;
  /** Last few narrations — used by anti-repetition. */
  recentText: string[];
}
