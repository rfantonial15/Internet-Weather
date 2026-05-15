import type { CinematicShot } from "@/core/camera/cameraDirector";
import { geoToVec3 } from "@/utils/geo";
import type { Story } from "./storyDetector";

/**
 * Translates a Story into the keyframed shot the CameraDirector will run.
 *
 * The shape we want:
 *
 *   reveal  (0.00–0.20): pulled-back wide, slow drift to set the scene
 *   push    (0.20–0.65): aggressive dolly-in toward the epicenter, FOV tightens
 *   climax  (0.65–0.85): held tight, slight orbit + shake on intense kinds
 *   outro   (0.85–1.00): subtle pull-back, FOV releases — leaves room for a CTA
 *
 * Because the director runs a single keyframed shot rather than four, we map
 * the four-act plan onto matched start/end values that produce that arc:
 *
 *   distFrom = wide,  distTo = tight     (push-in dominates)
 *   fovFrom  = wide,  fovTo  = narrow    (subtle dolly-zoom)
 *   shake    = scaled by kind danger     (rage/news jitter, wholesome doesn't)
 *   orbitDelta scales with magnitude     (more drama = more swing)
 */

const CHOREO_DEFAULTS = {
  durationMs: 11_000,
  /** Distance the camera starts at (relative to globe radius 1.0). */
  wideDist: 3.6,
  /** Distance at the climax. */
  tightDist: 1.78,
  /** FOV at start, degrees. */
  wideFov: 38,
  /** FOV at climax. */
  tightFov: 24,
} as const;

interface KindFlavor {
  shake: number;
  orbitDelta: number;
  pitchDelta: number;
  /** Multiplier on tightDist — some kinds want a bit more breathing room. */
  tightenScale: number;
}

const FLAVOR: Record<Story["kind"], KindFlavor> = {
  rage:        { shake: 0.85, orbitDelta:  0.50, pitchDelta:  0.06, tightenScale: 0.96 },
  controversy: { shake: 0.55, orbitDelta:  0.65, pitchDelta:  0.04, tightenScale: 1.00 },
  viral:       { shake: 0.45, orbitDelta:  0.35, pitchDelta: -0.04, tightenScale: 0.92 },
  meme:        { shake: 0.30, orbitDelta:  0.55, pitchDelta:  0.02, tightenScale: 1.04 },
  trend:       { shake: 0.25, orbitDelta:  0.40, pitchDelta:  0.02, tightenScale: 1.02 },
  news:        { shake: 0.95, orbitDelta:  0.20, pitchDelta:  0.10, tightenScale: 0.90 },
  build:       { shake: 0.10, orbitDelta:  0.30, pitchDelta: -0.02, tightenScale: 1.08 },
  wholesome:   { shake: 0.05, orbitDelta:  0.45, pitchDelta:  0.06, tightenScale: 1.06 },
};

/** The 3-act schedule; downstream consumers (overlay) read these to time titles. */
export const SHOT_SCHEDULE = {
  revealEndU:  0.20,
  pushEndU:    0.65,
  climaxEndU:  0.85,
  // outro runs to 1.0
  /** When to bring the title in / out, normalized to shot duration. */
  titleInU:  0.10,
  titleOutU: 0.78,
} as const;

export function shotForStory(story: Story): CinematicShot {
  const flavor = FLAVOR[story.kind];
  // Scale dramatic ranges by magnitude so a moderate cluster doesn't feel
  // identical to a once-an-hour shock.
  const drama = 0.6 + 0.4 * story.magnitude;
  const tightDist = CHOREO_DEFAULTS.tightDist * flavor.tightenScale * (1.06 - 0.12 * story.magnitude);

  return {
    anchor: geoToVec3(story.epicenter, 1),
    durationMs: CHOREO_DEFAULTS.durationMs,
    distFrom: CHOREO_DEFAULTS.wideDist,
    distTo: tightDist,
    orbitDelta: flavor.orbitDelta * drama,
    pitchDelta: flavor.pitchDelta,
    fovFrom: CHOREO_DEFAULTS.wideFov,
    fovTo: CHOREO_DEFAULTS.tightFov,
    shake: flavor.shake * (0.5 + 0.5 * story.magnitude),
    curve: "easeInOut",
  };
}

/** Map normalized shot progress (0..1) to a discrete capture phase. */
export function phaseForU(u: number): "reveal" | "push" | "climax" | "outro" {
  if (u < SHOT_SCHEDULE.revealEndU) return "reveal";
  if (u < SHOT_SCHEDULE.pushEndU) return "push";
  if (u < SHOT_SCHEDULE.climaxEndU) return "climax";
  return "outro";
}
