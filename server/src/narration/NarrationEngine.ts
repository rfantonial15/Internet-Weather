import type { Narration, WeatherEvent } from "@iw/shared";
import { EventClassifier } from "./EventClassifier.js";
import { selectTone } from "./ToneSelector.js";
import type { Narrator } from "./Narrator.js";
import type { Phenomenon } from "./types.js";

const DEFAULT_TICK_MS = 8_000;
const DEFAULT_MIN_GAP_MS = 4_000;
const DEFAULT_RECENT_TEXT_KEEP = 6;
const DEFAULT_RECENT_KIND_KEEP = 4;
/** Keep ~5 minutes of events in the rolling window (server-side). */
const EVENT_WINDOW_KEEP_MS = 5 * 60_000;

export interface NarrationEngineOptions {
  /** How often to attempt a narration. Default 8s. */
  tickMs?: number;
  /** Minimum gap between two emitted narrations. Default 4s. */
  minGapMs?: number;
  /** How many recent narrations are kept for anti-repetition (text). */
  recentTextKeep?: number;
  /** How many recent kinds are kept for anti-thrashing on phenomenon. */
  recentKindKeep?: number;
}

/**
 * Narration orchestrator.
 *
 *   1. Listens to the live event stream via `observe(event)`. Internally
 *      keeps a 5-minute rolling buffer; bigger windows are cheap because we
 *      only iterate them on classifier ticks (not per-event).
 *
 *   2. Every `tickMs` it asks the classifier for active phenomena, picks the
 *      most salient one (with anti-thrashing on recent kinds), selects a
 *      tone given current global tension, and asks the narrator to phrase
 *      it. The result is a Narration emitted via the `onNarration` callback.
 *
 *   3. Anti-repetition operates at two layers:
 *        - kind: don't narrate the same phenomenon twice in a row when an
 *          alternative of comparable salience exists
 *        - text: feed recent sentences back into the narrator so it avoids
 *          parroting itself (TemplateNarrator filters; ClaudeNarrator is
 *          told)
 *
 * Hot-swap a narrator at any time via `setNarrator()`. The engine keeps no
 * narrator-specific state.
 */
export class NarrationEngine {
  private classifier = new EventClassifier();
  private events: WeatherEvent[] = [];
  private narrator: Narrator;

  private timer: NodeJS.Timeout | null = null;
  private inflight = false;

  private lastEmitAt = 0;
  private recentText: string[] = [];
  private recentKinds: string[] = [];

  /** Live tension reading, fed externally. */
  tension = 0;

  private opts: Required<NarrationEngineOptions>;

  constructor(narrator: Narrator, opts: NarrationEngineOptions = {}) {
    this.narrator = narrator;
    this.opts = {
      tickMs: opts.tickMs ?? DEFAULT_TICK_MS,
      minGapMs: opts.minGapMs ?? DEFAULT_MIN_GAP_MS,
      recentTextKeep: opts.recentTextKeep ?? DEFAULT_RECENT_TEXT_KEEP,
      recentKindKeep: opts.recentKindKeep ?? DEFAULT_RECENT_KIND_KEEP,
    };
  }

  /** Drop a freshly observed event into the rolling buffer. */
  observe(event: WeatherEvent) {
    this.events.push(event);
    // Drop old events lazily — only when the buffer grows past a comfortable
    // size, so we don't iterate it on every push.
    if (this.events.length > 2048) this.compact();
  }

  /** Replace the narrator (e.g., template → Claude after API key arrives). */
  setNarrator(n: Narrator) {
    this.narrator = n;
  }

  /** Public hook the host wires up to broadcast narrations. */
  onNarration: (n: Narration) => void = () => {};

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.opts.tickMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Run one classification + narration cycle. Public so a caller can force
   * an immediate narration (e.g., as a debug poke or on a high-priority
   * news_shock outside the normal cadence).
   */
  async tick() {
    if (this.inflight) return;
    const now = Date.now();
    if (now - this.lastEmitAt < this.opts.minGapMs) return;

    this.inflight = true;
    try {
      this.compact();
      const phenomena = this.classifier.classify(this.events, now);
      const picked = this.pick(phenomena);
      if (!picked) return;

      const tone = selectTone(picked, this.tension);
      const ctx = {
        tension: this.tension,
        totalEventsInWindow: this.events.length,
        recentText: [...this.recentText],
      };

      let text: string;
      try {
        text = await this.narrator.narrate(picked, tone, ctx);
      } catch (err) {
        // Narrator failures should not crash the engine. Emit nothing this
        // tick; the next tick will retry against the latest state.
        console.warn(`[narration] narrator '${this.narrator.name}' failed:`, err);
        return;
      }
      if (!text) return;

      const narration: Narration = {
        id: `nar_${now}_${Math.random().toString(36).slice(2, 7)}`,
        t: now,
        text,
        tone,
        phenomenon: picked.kind,
        intensity: picked.intensity,
        refs: picked.refs,
        region: picked.region,
      };

      this.lastEmitAt = now;
      this.remember(text, picked.kind);
      this.onNarration(narration);
    } finally {
      this.inflight = false;
    }
  }

  /**
   * Pick a phenomenon from the (already-sorted) candidate list. Skips ones
   * that match recent kinds when a comparable-salience alternative exists.
   */
  private pick(phenomena: Phenomenon[]): Phenomenon | null {
    if (phenomena.length === 0) return null;
    const top = phenomena[0];

    if (!this.recentKinds.includes(top.kind)) return top;

    // Top is repeating — search down the list for a fresh kind whose salience
    // is at least 75% of the top's.
    const threshold = top.salience * 0.75;
    for (let i = 1; i < phenomena.length; i++) {
      const cand = phenomena[i];
      if (cand.salience < threshold) break;
      if (!this.recentKinds.includes(cand.kind)) return cand;
    }
    // No fresh alternative — narrate the repeat anyway (better than silence).
    return top;
  }

  private remember(text: string, kind: string) {
    this.recentText.push(text);
    if (this.recentText.length > this.opts.recentTextKeep) this.recentText.shift();

    this.recentKinds.push(kind);
    if (this.recentKinds.length > this.opts.recentKindKeep) this.recentKinds.shift();
  }

  private compact() {
    const cutoff = Date.now() - EVENT_WINDOW_KEEP_MS;
    if (this.events.length === 0 || this.events[0].t >= cutoff) return;
    // Most events are near the head; binary-search the cutoff.
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.events[mid].t < cutoff) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) this.events.splice(0, lo);
  }
}
