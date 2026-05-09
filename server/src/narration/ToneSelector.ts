import type { NarrationTone } from "@iw/shared";
import type { Phenomenon } from "./types.js";

/**
 * Tone selection.
 *
 * The narrator's voice should match the moment. Picking the wrong tone
 * (cheerful for grave events, urgent for quiet ones) is what makes
 * automated narration feel uncanny. Two inputs decide:
 *
 *   1. The phenomenon's *kind* — sets a default voice (controversy → tense,
 *      wholesome → warm, etc.)
 *   2. Global *tension* — globally pulls toward darker tones in unrest, and
 *      toward calmer/awed tones during peace
 *
 * Rule-based on purpose. The set of tones is small (six) and the mapping is
 * the kind of thing where a human reading the table can quickly fix bad
 * voice picks. A learned tone selector would be over-engineered here.
 */
export function selectTone(p: Phenomenon, tension: number): NarrationTone {
  switch (p.kind) {
    case "controversy_front":
      return tension > 0.55 ? "grave" : "concerned";
    case "rage_storm":
      return tension > 0.6 ? "grave" : tension > 0.3 ? "concerned" : "observational";
    case "viral_surge":
      return p.intensity > 0.75 ? "electric" : "observational";
    case "meme_migration":
      // Meme migrations are inherently observational; only escalate at peak.
      return p.count > 8 ? "electric" : "observational";
    case "build_wave":
      // Builds are calm progress — narrate them quietly unless tension is high
      // (then it reads as "they're building through the storm").
      return tension > 0.55 ? "contemplative" : "observational";
    case "wholesome_bloom":
      return tension > 0.5 ? "contemplative" : "awed";
    case "news_shock":
      // Shocks read graver in already-anxious conditions.
      return tension > 0.45 ? "grave" : "electric";
    case "trend_rising":
      return p.intensity > 0.7 ? "electric" : "observational";
    case "quiet":
      return "contemplative";
  }
}
