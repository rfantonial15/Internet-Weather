import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useUIStore } from "@/state/useUIStore";
import { lowerTier } from "@/config/quality";

/**
 * FPS smoother + adaptive quality downgrade.
 *
 *   - Reports a 0.5s rolling FPS into the UI store for the HUD readout.
 *   - Watches a longer window (~6s) of frame times. If we're consistently
 *     below the downgrade threshold, drop the tier — once. Subsequent calls
 *     are gated by a cooldown so we don't ladder all the way to "low" off
 *     a single hitch.
 *
 * Upgrades are intentionally not automatic. A user-driven downgrade should
 * be sticky: thrashing back up if the user drops a heavy capture on a
 * marginal device produces worse perceived performance than a stable lower
 * tier.
 */

const REPORT_WINDOW_S = 0.5;
const ADAPT_WINDOW_S = 6;
const DOWNGRADE_FPS = 42;
const COOLDOWN_S = 12;

export function PerformanceProbe() {
  const setFps = useUIStore((s) => s.setFps);

  // Two windows: a short one for the HUD readout, a long one for adaptation.
  const report = useRef({ frames: 0, time: 0 });
  const adapt = useRef({ frames: 0, time: 0, lastChangeAt: -COOLDOWN_S });

  useFrame((_, dt) => {
    report.current.frames++;
    report.current.time += dt;
    adapt.current.frames++;
    adapt.current.time += dt;

    if (report.current.time >= REPORT_WINDOW_S) {
      const fps = report.current.frames / report.current.time;
      setFps(Math.round(fps));
      report.current.frames = 0;
      report.current.time = 0;
    }

    if (adapt.current.time >= ADAPT_WINDOW_S) {
      const avg = adapt.current.frames / adapt.current.time;
      adapt.current.frames = 0;
      adapt.current.time = 0;

      const now = performance.now() / 1000;
      const sinceChange = now - adapt.current.lastChangeAt;
      if (avg < DOWNGRADE_FPS && sinceChange > COOLDOWN_S) {
        const ui = useUIStore.getState();
        const next = lowerTier(ui.quality);
        if (next !== ui.quality) {
          ui.setQuality(next);
          adapt.current.lastChangeAt = now;
          // Console hint for power-users; not surfaced in the HUD to avoid
          // making the user feel their machine is being judged.
          console.info(`[render] adaptive quality: ${ui.quality} → ${next} (avg ${avg.toFixed(1)} fps)`);
        }
      }
    }
  });

  return null;
}
