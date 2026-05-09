/**
 * GPU-tier driven quality settings. The renderer reads these once at startup;
 * systems can subscribe via useQualityStore for finer-grained gating.
 */
export type QualityTier = "low" | "medium" | "high" | "ultra";

export interface QualityProfile {
  dpr: [number, number];
  starCount: number;
  particleCount: number;
  bloomIntensity: number;
  bloomRadius: number;
  enableSSAO: false; // intentionally off — we lean on bloom + atmosphere
  shadowMaps: boolean;
}

export const profiles: Record<QualityTier, QualityProfile> = {
  low: {
    dpr: [1, 1],
    starCount: 1500,
    particleCount: 800,
    bloomIntensity: 0.6,
    bloomRadius: 0.6,
    enableSSAO: false,
    shadowMaps: false,
  },
  medium: {
    dpr: [1, 1.25],
    starCount: 3500,
    particleCount: 2400,
    bloomIntensity: 0.85,
    bloomRadius: 0.7,
    enableSSAO: false,
    shadowMaps: false,
  },
  high: {
    dpr: [1, 1.75],
    starCount: 6000,
    particleCount: 4800,
    bloomIntensity: 1.05,
    bloomRadius: 0.8,
    enableSSAO: false,
    shadowMaps: false,
  },
  ultra: {
    dpr: [1, 2],
    starCount: 9000,
    particleCount: 7200,
    bloomIntensity: 1.2,
    bloomRadius: 0.85,
    enableSSAO: false,
    shadowMaps: false,
  },
};

export function detectTier(): QualityTier {
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores >= 8 && mem >= 8) return "ultra";
  if (cores >= 6 && mem >= 4) return "high";
  if (cores >= 4) return "medium";
  return "low";
}
