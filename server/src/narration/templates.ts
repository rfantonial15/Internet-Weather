import type { NarrationTone, PhenomenonKind } from "@iw/shared";

/**
 * Narrative templates.
 *
 * Indexed by [phenomenon][tone] → array of sentence templates. Placeholders
 * are bare {name} tokens; the formatter substitutes from the Phenomenon's
 * fields. If a template uses {pct} but deltaPct is null, that template is
 * skipped — keeps narrations from emitting "increased by null %".
 *
 * Authoring rules (reading these as a writer, not a programmer):
 *   - one sentence, ≤ 18 words
 *   - present tense or recent past
 *   - no exclamation marks, no second person, no first person
 *   - no idioms that don't read aloud well
 *   - tone-correct verbs: storms "consolidate", looks "drift", booms "settle"
 */
export const TEMPLATES: Record<PhenomenonKind, Partial<Record<NarrationTone, string[]>>> = {
  controversy_front: {
    grave: [
      "A controversy front is consolidating over {region}. Conditions are deteriorating.",
      "Multiple fault lines have opened across {region} simultaneously.",
      "The discourse is fracturing. Sustained pressure observed over {region}.",
    ],
    concerned: [
      "A controversy system is forming over {region}.",
      "Tension is converging across {count} contested points.",
      "Disagreement is gathering shape over {region}.",
    ],
    electric: [
      "Conflict signals are surging — {pct}% above baseline.",
      "Friction across {region} is accelerating sharply.",
    ],
    observational: [
      "Controversy is concentrating in {region}.",
      "Disagreement is gathering across {count} sites.",
    ],
  },

  rage_storm: {
    grave: [
      "A rage storm has formed over {region}. The pressure gradient is steep.",
      "Anger is consolidating across {region}. Stand by.",
      "An emotional low is deepening over {region}.",
    ],
    concerned: [
      "A rage cell is intensifying over {region}.",
      "A wave of frustration is moving through {region}.",
    ],
    electric: [
      "Anger is propagating quickly — {pct}% above baseline.",
      "A surge of outrage is sweeping {region}.",
    ],
    observational: [
      "Frustration is gathering in {region}.",
    ],
  },

  viral_surge: {
    electric: [
      "A viral surge is unfolding across {region}. Propagation has accelerated by {pct}%.",
      "Velocity is climbing. A viral wave is taking shape over {region}.",
      "A breakout is in progress. {count} active vectors detected.",
    ],
    awed: [
      "A viral wave is crossing continents in real time.",
      "Watch carefully — something is spreading.",
    ],
    observational: [
      "Viral activity is spreading from {region}.",
      "{count} viral vectors have surfaced in the last minute.",
    ],
    contemplative: [
      "A quiet contagion of attention is moving across {region}.",
    ],
  },

  meme_migration: {
    observational: [
      "A meme migration is underway, drifting across {region}.",
      "Cultural drift detected — {count} new vectors emerging.",
      "Meme propagation velocity has increased by {pct}%.",
      "A flock of references is migrating from {region}.",
    ],
    awed: [
      "Watch as humor migrates across the continents.",
      "A wave of in-jokes is finding new ground.",
    ],
    electric: [
      "Memetic activity is surging — {pct}% above baseline.",
      "A meme cascade is propagating rapidly.",
    ],
    contemplative: [
      "Quietly, a joke is finding its second home.",
    ],
  },

  build_wave: {
    observational: [
      "A build wave is rolling across {region}. Sustained activity.",
      "A migration toward open-source tooling has accelerated.",
      "Construction signals are converging — {count} active sites.",
      "Engineering activity is climbing — {pct}% above baseline.",
      "The substrate is being rebuilt. {count} active sites.",
    ],
    contemplative: [
      "Quietly, the network is being rebuilt.",
      "Beneath the surface, infrastructure is shifting.",
      "Through the noise, the planet is still being shaped.",
    ],
  },

  wholesome_bloom: {
    awed: [
      "A wholesome bloom has opened over {region}.",
      "Beneath the noise, a current of kindness is forming.",
      "A small constellation of warmth is lighting {region}.",
    ],
    contemplative: [
      "A bloom of warmth, briefly, in {region}.",
      "Calm signals are gathering quietly across {region}.",
    ],
    observational: [
      "Wholesome activity is concentrating in {region}.",
    ],
  },

  news_shock: {
    grave: [
      "A news shockwave has originated in {region}. Propagation in progress.",
      "A high-intensity event has registered. Stand by.",
      "Significant signal detected over {region}.",
    ],
    electric: [
      "Breaking signal over {region}. Propagation in progress.",
      "A news shock is radiating outward from {region}.",
    ],
    observational: [
      "A news event has surfaced over {region}.",
    ],
  },

  trend_rising: {
    observational: [
      "A trend is rising over {region}. Trajectory is upward.",
      "Topical pressure is building across {count} sites.",
      "A new trend line has appeared over {region}.",
    ],
    electric: [
      "Topical pressure is climbing — {pct}% above baseline.",
      "A trend is accelerating across {region}.",
    ],
    contemplative: [
      "Slowly, attention is gathering somewhere new.",
    ],
  },

  quiet: {
    contemplative: [
      "The network has gone briefly quiet. Listen.",
      "Activity is settling. Baseline conditions resuming.",
      "A stillness settles across the planet.",
      "The signal is low. The world is breathing in.",
      "Background traffic only. Nothing is moving.",
    ],
  },
};
