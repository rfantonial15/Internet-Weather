/**
 * GPU-tier driven quality settings. The renderer reads these once at startup;
 * systems can subscribe via useUIStore for finer-grained gating.
 *
 * Tuning notes (post-audit):
 *   - Caps DPR at 1.5x. Above that, render cost grows quadratically while
 *     perceived sharpness barely increases past the display's native pixel
 *     density on the size of glyphs/lines we render.
 *   - Halves star + particle counts vs. the old profile. The scene already
 *     has many high-emission additive layers — packing more particles in
 *     just feeds the bloom and reads as visual noise, not detail.
 *   - Bloom intensity is the single most visible knob. We bias toward
 *     restraint at every tier: a brighter bloom on a less-bright scene
 *     looks the same as a calmer bloom on a brighter scene, but the former
 *     loses detail to a milky wash.
 */
export type QualityTier = "low" | "medium" | "high" | "ultra";

export interface QualityProfile {
  /** [min, max] device-pixel-ratio range. Vite Canvas clamps within this. */
  dpr: [number, number];
  starCount: number;
  particleCount: number;
  bloomIntensity: number;
  bloomRadius: number;
  /** Sphere subdivision used by the stacked planet shells. */
  sphereDetail: number;
  /** Whether the optional NeuralCurrents shell mounts. */
  enableNeuralCurrents: boolean;
}

export const profiles: Record<QualityTier, QualityProfile> = {
  low: {
    dpr: [0.75, 1],
    starCount: 1200,
    particleCount: 600,
    bloomIntensity: 0.30,
    bloomRadius: 0.55,
    sphereDetail: 48,
    enableNeuralCurrents: false,
  },
  medium: {
    dpr: [1, 1],
    starCount: 2200,
    particleCount: 1400,
    bloomIntensity: 0.40,
    bloomRadius: 0.6,
    sphereDetail: 56,
    enableNeuralCurrents: true,
  },
  high: {
    dpr: [1, 1.25],
    starCount: 3200,
    particleCount: 2200,
    bloomIntensity: 0.48,
    bloomRadius: 0.65,
    sphereDetail: 64,
    enableNeuralCurrents: true,
  },
  ultra: {
    dpr: [1, 1.5],
    starCount: 4500,
    particleCount: 3000,
    bloomIntensity: 0.55,
    bloomRadius: 0.7,
    sphereDetail: 72,
    enableNeuralCurrents: true,
  },
};

/**
 * Conservative tier picker. Browser hints are coarse — we'd rather start
 * one tier *below* what the device claims and let the adaptive monitor
 * upgrade than chase frames downward after a stutter has already happened.
 */
export function detectTier(): QualityTier {
  if (typeof navigator === "undefined") return "medium";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  // Conservative bands: prior config promoted 8-core/8GB to "ultra" which
  // overshoots integrated GPUs.
  if (cores >= 12 && mem >= 8) return "ultra";
  if (cores >= 8 && mem >= 8) return "high";
  if (cores >= 4) return "medium";
  return "low";
}

/** Ordered list for adaptive downgrade/upgrade transitions. */
export const TIER_ORDER: QualityTier[] = ["low", "medium", "high", "ultra"];

export function lowerTier(t: QualityTier): QualityTier {
  const i = TIER_ORDER.indexOf(t);
  return i > 0 ? TIER_ORDER[i - 1] : t;
}

export function higherTier(t: QualityTier): QualityTier {
  const i = TIER_ORDER.indexOf(t);
  return i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : t;
}
