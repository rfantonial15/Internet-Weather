import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useUIStore } from "@/state/useUIStore";
import { higherTier, lowerTier, TIER_ORDER } from "@/config/quality";
import { activeRecorder } from "@/cinematic/clipRecorder";

/**
 * FPS readout + adaptive quality.
 *
 *   - Reports a 0.5 s rolling FPS into the UI store for the HUD.
 *   - Averages a longer window (~6 s). Consistently below DOWNGRADE_FPS drops
 *     a tier; a cooldown stops one hitch from laddering all the way down.
 *   - Upgrades are allowed only up to one tier above the starting guess
 *     (detectTier deliberately guesses low), only after two straight windows
 *     at full frame rate, and never again once a downgrade has happened, so
 *     a marginal device settles instead of thrashing.
 *
 * Frames longer than MAX_FRAME_S (tab hidden, debugger pause) are ignored:
 * counting them made switching tabs look like a slow GPU and downgraded.
 * A warmup after mount and after every tier change skips shader-compile and
 * texture-upload hitches. A `?q=` URL override pins the tier for QA.
 */

const REPORT_WINDOW_S = 0.5;
const ADAPT_WINDOW_S = 6;
const WARMUP_S = 3;
const MAX_FRAME_S = 0.25;
const DOWNGRADE_FPS = 42;
const UPGRADE_FPS = 57;
const COOLDOWN_S = 12;

export function PerformanceProbe() {
  const setFps = useUIStore((s) => s.setFps);
  const quality = useUIStore((s) => s.quality);

  const report = useRef({ frames: 0, time: 0 });
  const adapt = useRef({ frames: 0, time: 0, warmup: WARMUP_S, lastChange: -COOLDOWN_S, goodWindows: 0 });
  const startTier = useRef(quality);
  const downgraded = useRef(false);
  const clock = useRef(0);

  // Every tier change re-arms the warmup and clears the windows.
  useEffect(() => {
    const a = adapt.current;
    a.frames = 0;
    a.time = 0;
    a.goodWindows = 0;
    a.warmup = WARMUP_S;
  }, [quality]);

  useFrame((_, dt) => {
    if (dt > MAX_FRAME_S) return;
    clock.current += dt;

    const r = report.current;
    r.frames++;
    r.time += dt;
    if (r.time >= REPORT_WINDOW_S) {
      setFps(Math.round(r.frames / r.time));
      r.frames = 0;
      r.time = 0;
    }

    const ui = useUIStore.getState();
    if (ui.qualityPinned) return;
    // A recording renders at a raised pixel ratio on purpose; don't judge the
    // device by it, and start a fresh window afterwards.
    if (activeRecorder()) {
      adapt.current.frames = 0;
      adapt.current.time = 0;
      adapt.current.warmup = WARMUP_S;
      return;
    }

    const a = adapt.current;
    if (a.warmup > 0) {
      a.warmup -= dt;
      return;
    }
    a.frames++;
    a.time += dt;
    if (a.time < ADAPT_WINDOW_S) return;

    const avg = a.frames / a.time;
    a.frames = 0;
    a.time = 0;
    if (clock.current - a.lastChange < COOLDOWN_S) return;

    if (avg < DOWNGRADE_FPS) {
      a.goodWindows = 0;
      const next = lowerTier(ui.quality);
      if (next !== ui.quality) {
        downgraded.current = true;
        a.lastChange = clock.current;
        console.info(`[render] quality ${ui.quality} -> ${next} (avg ${avg.toFixed(1)} fps)`);
        ui.setQuality(next);
      }
      return;
    }

    if (avg >= UPGRADE_FPS && !downgraded.current) {
      a.goodWindows++;
      const ceiling = higherTier(startTier.current);
      if (a.goodWindows >= 2 && TIER_ORDER.indexOf(ui.quality) < TIER_ORDER.indexOf(ceiling)) {
        const next = higherTier(ui.quality);
        a.lastChange = clock.current;
        a.goodWindows = 0;
        console.info(`[render] quality ${ui.quality} -> ${next} (avg ${avg.toFixed(1)} fps)`);
        ui.setQuality(next);
      }
    } else {
      a.goodWindows = 0;
    }
  });

  return null;
}
