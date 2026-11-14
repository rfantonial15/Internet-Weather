import { motion } from "framer-motion";
import { useUIStore } from "@/state/useUIStore";
import { useWorldStore } from "@/state/useWorldStore";
import { EventTicker } from "./EventTicker";
import { Reticle } from "./Reticle";
import { TensionMeter } from "./TensionMeter";
import { Chrono } from "./components/Chrono";
import { CoordReadout } from "./components/CoordReadout";

/**
 * The HUD layer. Layout principles:
 *
 *   - Reserved zones, never panels. Identity top-left, chrono top-right,
 *     reticle dead-centre, dial right-middle, ticker bottom. The centre stays
 *     uncluttered so the planet has room.
 *   - One unit of motion at a time. The reticle sweep is the only moving
 *     element; everything else animates on entry/exit.
 *   - Restraint over information: if the visualization already shows it,
 *     it doesn't get a readout.
 *
 * Responsive: below `md` the dial collapses into a one-line tension readout
 * in the status block, the reticle shrinks, and the ticker drops its
 * coordinate column and sits above the reel button.
 */
export function HUD() {
  const fps = useUIStore((s) => s.fps);
  const connected = useUIStore((s) => s.connected);
  const quality = useUIStore((s) => s.quality);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 2.6 }}
    >
      <FrameRules />

      {/* Top-left: identity */}
      <div className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top))] flex flex-col gap-1.5 sm:left-10 sm:top-7">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-accent" />
          <h1 className="hud-label hud-label--strong">Internet Weather</h1>
        </div>
        <span className="hud-label hud-label--mute">obs · planetary uplink</span>
        <span className="hud-label hud-label--faint hidden sm:block">spec · v.0.2.0</span>
      </div>

      {/* Top-right: chrono + status */}
      <div className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex flex-col items-end gap-2 sm:right-10 sm:top-7">
        <Chrono />
        <div className="flex flex-col items-end gap-1">
          <span className="hud-label" role="status">
            {connected ? "uplink · live" : "uplink · simulated"}
          </span>
          <span className="hud-label hud-label--faint">
            q.{quality} · {String(fps).padStart(2, "0")}fps
          </span>
          <CompactTension />
        </div>
      </div>

      <Reticle />
      <CoordReadout />
      <TensionMeter />

      {/* Bottom: signal log. Below lg it sits above the reel button. */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:px-10 lg:pb-7">
        <div className="mx-auto max-w-[640px]">
          <EventTicker />
        </div>
      </div>
    </motion.div>
  );
}

/** One-line tension readout for narrow screens, where the dial is hidden. */
function CompactTension() {
  const tension = useWorldStore((s) => Math.round(s.tension * 100));
  return (
    <span className="hud-label hud-label--mute md:hidden">
      tension · {String(tension).padStart(2, "0")}
    </span>
  );
}

function FrameRules() {
  const grad =
    "linear-gradient(to right, transparent 0%, rgba(140,200,255,0.22) 30%, rgba(140,200,255,0.22) 70%, transparent 100%)";
  return (
    <>
      <span aria-hidden className="absolute left-4 right-4 top-2 h-px sm:left-10 sm:right-10 sm:top-4" style={{ background: grad }} />
      <span aria-hidden className="absolute bottom-2 left-4 right-4 h-px sm:bottom-4 sm:left-10 sm:right-10" style={{ background: grad }} />
    </>
  );
}
